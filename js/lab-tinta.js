// lab-tinta.js — modo tinta.
// Pintura orgánica con splines suaves, presión por velocidad,
// variación de tono progresiva y borde "húmedo" de realce.

(() => {
  const canvas = document.getElementById('canvas-tinta');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  let painting = false;
  let lastT = 0;

  // Historial para spline suavizado (Catmull-Rom / midpoint)
  const history = [];
  const MAX_HIST = 6;

  // Variación de tono acumulativa a lo largo del trazo
  let hueShift = 0;

  function resize() {
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;
    clear();
  }

  function neon() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--neon').trim() || '#3693C8';
  }

  function hexToHsl(hex) {
    hex = hex.replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    let r = ((n >> 16) & 255) / 255;
    let g = ((n >> 8)  & 255) / 255;
    let b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = d / (l > 0.5 ? 2 - max - min : max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function clear() {
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, W, H);
    history.length = 0;
    hueShift = 0;
  }

  // ── Trazo suavizado con spline de puntos medios ───────────
  function drawSmooth(pressure, baseHue) {
    if (history.length < 2) return;

    const h = ((baseHue + hueShift) % 360 + 360) % 360;
    const radius  = 3 + pressure * 22;
    const opacity = 0.10 + pressure * 0.55;

    // Construir path spline: moveTo al primer punto,
    // quadraticCurveTo a través de puntos medios
    ctx.save();
    ctx.strokeStyle = `hsla(${h | 0},65%,72%,${opacity})`;
    ctx.lineWidth   = radius * 0.65;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.shadowBlur  = 16;
    ctx.shadowColor = `hsla(${h | 0},80%,65%,0.4)`;

    ctx.beginPath();
    ctx.moveTo(history[0].x, history[0].y);
    for (let i = 1; i < history.length - 1; i++) {
      const mx = (history[i].x + history[i + 1].x) * 0.5;
      const my = (history[i].y + history[i + 1].y) * 0.5;
      ctx.quadraticCurveTo(history[i].x, history[i].y, mx, my);
    }
    ctx.lineTo(history[history.length - 1].x, history[history.length - 1].y);
    ctx.stroke();
    ctx.restore();

    // Borde húmedo: trazo fino y brillante encima
    ctx.save();
    ctx.strokeStyle = `hsla(${h | 0},40%,90%,${opacity * 0.22})`;
    ctx.lineWidth   = Math.max(0.5, radius * 0.12);
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    const dx = last.x - prev.x, dy = last.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Desplazar perpendicular al trazo para el borde
    const ox = -dy / len * radius * 0.4;
    const oy =  dx / len * radius * 0.4;

    ctx.beginPath();
    ctx.moveTo(prev.x + ox, prev.y + oy);
    ctx.lineTo(last.x + ox, last.y + oy);
    ctx.stroke();
    ctx.restore();
  }

  function drawBlob(x, y, pressure, baseHue) {
    const h = ((baseHue + hueShift) % 360 + 360) % 360;
    const radius  = 3 + pressure * 22;
    const opacity = 0.10 + pressure * 0.52;

    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0,    `hsla(${h | 0},65%,72%,${opacity})`);
    g.addColorStop(0.45, `hsla(${h | 0},65%,65%,${opacity * 0.55})`);
    g.addColorStop(1,    `hsla(${h | 0},65%,65%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSplatter(x, y, pressure, baseHue) {
    if (pressure < 0.45 || Math.random() > 0.55) return;
    const h = ((baseHue + hueShift) % 360 + 360) % 360;
    const radius = 3 + pressure * 22;
    const drops = Math.floor(pressure * 7);
    ctx.save();
    for (let i = 0; i < drops; i++) {
      const ang  = Math.random() * Math.PI * 2;
      const dist = radius * (0.7 + Math.random() * 1.5);
      const sx   = x + Math.cos(ang) * dist;
      const sy   = y + Math.sin(ang) * dist;
      const sr   = 0.4 + Math.random() * 2.2;
      ctx.globalAlpha = (0.10 + pressure * 0.28) * Math.random();
      ctx.fillStyle   = `hsl(${h | 0},60%,70%)`;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ── Evento de trazo ───────────────────────────────────────
  function stroke(x, y) {
    const now = performance.now();
    const dt  = Math.max(1, now - lastT);
    const spd = Math.hypot(
      x - (history[history.length - 1]?.x ?? x),
      y - (history[history.length - 1]?.y ?? y)
    ) / dt;
    lastT = now;

    const pressure = Math.max(0.04, Math.min(1, 1 - spd * 0.05));
    const baseHue  = hexToHsl(neon()).h;

    // Avanzar tono ligeramente con cada segmento
    hueShift += (Math.random() - 0.5) * 2.5;
    hueShift  = Math.max(-50, Math.min(50, hueShift));

    history.push({ x, y });
    if (history.length > MAX_HIST) history.shift();

    drawBlob(x, y, pressure, baseHue);
    drawSmooth(pressure, baseHue);
    drawSplatter(x, y, pressure, baseHue);
  }

  // ── Eventos del canvas ────────────────────────────────────
  canvas.addEventListener('mousedown', e => {
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

  window.addEventListener('resize', resize);
  resize();

  if (typeof LAB !== 'undefined') LAB.register('tinta', canvas);
})();
