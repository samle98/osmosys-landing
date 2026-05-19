// lab-tinta.js — tinta orgánica con comportamiento de fluido.
// Fix: lazy-init al hacerse visible (canvas oculto → offsetWidth=0 al arranque).
// Comportamiento: presión variable por velocidad, splines suaves,
// acumulación de tinta en reposo, goteo espontáneo y dispersión anisotrópica.

(() => {
  const canvas = document.getElementById('canvas-tinta');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  let painting = false;
  let lastT = 0;
  let hueShift = 0;

  // Historial de puntos para spline
  const history = [];
  const MAX_HIST = 8;

  // Goteos activos: {x, y, vy, len, h, op}
  const drips = [];

  function resize() {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    if (!w || !h) return;
    W = w; H = h;
    canvas.width = W; canvas.height = H;
    clear();
  }

  function neon() {
    return getComputedStyle(document.documentElement).getPropertyValue('--neon').trim() || '#3693C8';
  }

  function hexToHue(hex) {
    hex = hex.replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
    const n = parseInt(hex, 16);
    let r = ((n>>16)&255)/255, g = ((n>>8)&255)/255, b = (n&255)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    if (max === min) return 0;
    const d = max - min;
    let h = max === r ? (g-b)/d + (g<b?6:0)
          : max === g ? (b-r)/d + 2
                      : (r-g)/d + 4;
    return (h/6) * 360;
  }

  function clear() {
    if (!W || !H) return;
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, W, H);
    history.length = 0;
    drips.length   = 0;
    hueShift = 0;
  }

  // ── Animación idle: goteos ────────────────────────────────
  function animateDrips() {
    for (let i = drips.length - 1; i >= 0; i--) {
      const d = drips[i];
      d.y  += d.vy;
      d.vy  = Math.min(d.vy * 1.04 + 0.06, 4); // aceleración por gravedad
      d.len *= 0.985;
      d.op  *= 0.972;
      if (d.op < 0.01 || d.len < 1) { drips.splice(i, 1); continue; }

      const g = ctx.createLinearGradient(d.x, d.y - d.len, d.x, d.y);
      g.addColorStop(0, `hsla(${d.h|0},65%,68%,${d.op})`);
      g.addColorStop(1, `hsla(${d.h|0},65%,68%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y - d.len/2, Math.max(0.5, d.len*0.08), d.len/2, 0, 0, Math.PI*2);
      ctx.fill();
    }
    if (drips.length > 0) requestAnimationFrame(animateDrips);
  }

  // ── Trazo spline suavizado ────────────────────────────────
  function drawSpline(pressure, h, opacity) {
    if (history.length < 2) return;

    // Capa principal
    ctx.save();
    ctx.strokeStyle = `hsla(${h|0},65%,70%,${opacity})`;
    ctx.lineWidth   = 3 + pressure * 20;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.shadowBlur  = 18;
    ctx.shadowColor = `hsla(${h|0},80%,60%,0.35)`;
    ctx.beginPath();
    ctx.moveTo(history[0].x, history[0].y);
    for (let i = 1; i < history.length - 1; i++) {
      const mx = (history[i].x + history[i+1].x) * 0.5;
      const my = (history[i].y + history[i+1].y) * 0.5;
      ctx.quadraticCurveTo(history[i].x, history[i].y, mx, my);
    }
    ctx.lineTo(history[history.length-1].x, history[history.length-1].y);
    ctx.stroke();
    ctx.restore();

    // Borde húmedo: línea fina y brillante
    if (history.length >= 3) {
      const last = history[history.length-1];
      const prev = history[history.length-2];
      const dx = last.x - prev.x, dy = last.y - prev.y;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      const off = (3 + pressure * 20) * 0.35;
      ctx.save();
      ctx.strokeStyle = `hsla(${h|0},30%,92%,${opacity * 0.18})`;
      ctx.lineWidth   = Math.max(0.5, (3 + pressure * 20) * 0.1);
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x - dy/len*off, prev.y + dx/len*off);
      ctx.lineTo(last.x - dy/len*off, last.y + dx/len*off);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Blob de tinta en el punto de contacto ─────────────────
  function drawBlob(x, y, pressure, h, opacity) {
    const r = 2 + pressure * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,    `hsla(${h|0},68%,68%,${opacity})`);
    g.addColorStop(0.45, `hsla(${h|0},68%,60%,${opacity * 0.5})`);
    g.addColorStop(1,    `hsla(${h|0},68%,55%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();

    // Acumulación de tinta en reposo (presión alta)
    if (pressure > 0.65) {
      const poolR = r * 1.5;
      const pg = ctx.createRadialGradient(x, y, r*0.4, x, y, poolR);
      pg.addColorStop(0, `hsla(${h|0},70%,55%,${opacity * 0.25})`);
      pg.addColorStop(1, `hsla(${h|0},70%,45%,0)`);
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(x, y, poolR, 0, Math.PI*2); ctx.fill();
    }
  }

  // ── Salpicaduras orgánicas ────────────────────────────────
  function drawSplatter(x, y, pressure, h, opacity) {
    if (pressure < 0.5 || Math.random() > 0.5) return;
    const r = 2 + pressure * 22;
    ctx.save();
    const drops = Math.floor(pressure * 8);
    for (let i = 0; i < drops; i++) {
      const ang  = Math.random() * Math.PI * 2;
      const dist = r * (0.8 + Math.random() * 1.6);
      const sr   = 0.3 + Math.random() * 2.5;
      ctx.globalAlpha = (0.08 + pressure * 0.25) * Math.random();
      ctx.fillStyle   = `hsl(${h|0},62%,68%)`;
      ctx.beginPath(); ctx.arc(x + Math.cos(ang)*dist, y + Math.sin(ang)*dist, sr, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // ── Generar goteo ─────────────────────────────────────────
  function spawnDrip(x, y, pressure, h, opacity) {
    if (pressure < 0.6 || Math.random() > 0.18) return;
    drips.push({ x: x + (Math.random()-0.5)*8, y, vy: 0.4, len: 8 + pressure*25, h, op: opacity * 0.7 });
    if (drips.length === 1) requestAnimationFrame(animateDrips);
  }

  // ── Evento de trazo ───────────────────────────────────────
  function stroke(x, y) {
    const now = performance.now();
    const dt  = Math.max(1, now - lastT);
    const prev = history[history.length-1] ?? { x, y };
    const spd  = Math.hypot(x - prev.x, y - prev.y) / dt;
    lastT = now;

    const pressure = Math.max(0.04, Math.min(1, 1 - spd * 0.055));
    const baseHue  = hexToHue(neon());
    hueShift += (Math.random()-0.5) * 2.8;
    hueShift   = Math.max(-55, Math.min(55, hueShift));
    const h    = ((baseHue + hueShift) % 360 + 360) % 360;
    const opacity = 0.10 + pressure * 0.58;

    history.push({ x, y });
    if (history.length > MAX_HIST) history.shift();

    drawBlob(x, y, pressure, h, opacity);
    drawSpline(pressure, h, opacity);
    drawSplatter(x, y, pressure, h, opacity);
    spawnDrip(x, y, pressure, h, opacity);
  }

  // ── Eventos del canvas ────────────────────────────────────
  function ensureReady() {
    if (!W || canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      resize();
    }
    return !!W;
  }

  canvas.addEventListener('mousedown', e => {
    if (!ensureReady()) return;
    painting = true; lastT = performance.now();
    history.length = 0; hueShift = 0;
    stroke(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('mousemove', e => {
    if (painting) stroke(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('mouseup',    () => { painting = false; history.length = 0; });
  canvas.addEventListener('mouseleave', () => { painting = false; history.length = 0; });

  document.getElementById('btnClearTinta')?.addEventListener('click', clear);

  window.addEventListener('resize', () => { W = 0; });
  // No llamar resize() aquí: el canvas está oculto, lazy-init en ensureReady()

  if (typeof LAB !== 'undefined') LAB.register('tinta', canvas);
})();
