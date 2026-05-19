// lab-synth.js — modo sintetizador: Chladni / Cymatics.
// Partículas migran hacia las líneas nodales de una función de onda
// estacionaria bidimensional (patrón de Chladni sobre placa cuadrada).
// pt[0].x → m  (1–8, entero): simetría del patrón
// pt[1].y → energía (0–1):    fuerza de atracción y brillo
// pt[2].x → n  (1–8, entero): complejidad / interacción de armónicos

(() => {
  const canvas = document.getElementById('canvas-sintetizador');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, frame = 0;
  const N = 4000; // partículas

  const pts = [
    { x: 0.28, y: 0.50, dragging: false },
    { x: 0.50, y: 0.22, dragging: false },
    { x: 0.72, y: 0.50, dragging: false },
  ];

  function resize() {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    if (!w || !h) return;
    W = w; H = h;
    canvas.width = W; canvas.height = H;
    initParticles();
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, W, H);
  }

  function neon() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--neon').trim() || '#3693C8';
  }

  function params() {
    return {
      m:    Math.max(1, Math.round(pts[0].x * 8.4)),
      gain: Math.max(0.08, Math.min(1, 1 - pts[1].y)),
      n:    Math.max(1, Math.round(pts[2].x * 8.4)),
    };
  }

  // ── Función de Chladni: f(x,y) = cos(mπx)cos(nπy) + cos(nπx)cos(mπy) ──
  // Coordenadas normalizadas al cuadrado centrado en el canvas.
  function halfPlate() { return Math.min(W, H) * 0.44; }

  function chladniFieldAndGrad(x, y, m, n) {
    const S  = halfPlate();
    const nx = (x - W/2) / S;
    const ny = (y - H/2) / S;
    const A  = Math.PI;
    const cmx = Math.cos(m*A*nx), cnx = Math.cos(n*A*nx);
    const cmy = Math.cos(m*A*ny), cny = Math.cos(n*A*ny);
    const smx = Math.sin(m*A*nx), snx = Math.sin(n*A*nx);
    const smy = Math.sin(m*A*ny), sny = Math.sin(n*A*ny);

    const f = cmx*cny + cnx*cmy;

    // grad(f) analítico → luego -f*grad(f) = -grad(f²/2) empuja al cero
    const dfdnx = (-m*A*smx*cny) + (-n*A*snx*cmy);
    const dfdny = (cmx*(-n*A*sny)) + (cnx*(-m*A*smy));
    const sc = 1 / S;
    return { f, fx: -f * dfdnx * sc, fy: -f * dfdny * sc };
  }

  // ── Partículas ────────────────────────────────────────────
  let particles = [];

  function initParticles() {
    const cx = W/2, cy = H/2, S = halfPlate();
    particles = Array.from({ length: N }, () => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * S * 0.95;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      return { x, y, px: x, py: y, vx: 0, vy: 0, f: 0 };
    });
  }

  // ── Render ────────────────────────────────────────────────
  const LEVELS = 12;
  const groups = Array.from({ length: LEVELS }, () => []);

  function draw() {
    if (canvas.style.display === 'none') { requestAnimationFrame(draw); return; }
    if (!W || canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      resize(); if (!W) { requestAnimationFrame(draw); return; }
    }
    frame++;

    const { m, n, gain } = params();
    const S        = halfPlate();
    const strength = 0.15 + gain * 0.6;
    const damping  = 0.80 + gain * 0.14; // alto gain → más amortiguación → más precisión
    const jitter   = (1 - gain) * 0.5 + 0.06;

    // ── Paso 1: actualizar partículas ──────────────────────
    for (let i = 0; i < LEVELS; i++) groups[i].length = 0;

    for (const p of particles) {
      p.px = p.x; p.py = p.y;
      const { f, fx, fy } = chladniFieldAndGrad(p.x, p.y, m, n);
      p.f = f;

      p.vx = (p.vx + fx * strength + (Math.random() - 0.5) * jitter) * damping;
      p.vy = (p.vy + fy * strength + (Math.random() - 0.5) * jitter) * damping;

      p.x += p.vx; p.y += p.vy;

      // Rebote suave en el borde de la placa
      const ex = Math.abs(p.x - W/2) - S;
      const ey = Math.abs(p.y - H/2) - S;
      if (ex > 0) { p.x = W/2 + Math.sign(p.x - W/2) * (S - ex * 0.4); p.vx *= -0.45; }
      if (ey > 0) { p.y = H/2 + Math.sign(p.y - H/2) * (S - ey * 0.4); p.vy *= -0.45; }

      // Agrupar por cercanía al nodo para dibujo eficiente
      const nearNode = 1 - Math.min(1, Math.abs(f) * 1.9);
      const lvl = Math.min(LEVELS - 1, nearNode * LEVELS | 0);
      groups[lvl].push(p);
    }

    // ── Paso 2: fade persistente ───────────────────────────
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(6,6,6,${0.055 + gain * 0.025})`;
    ctx.fillRect(0, 0, W, H);

    // ── Paso 3: dibujar por grupos (batched) ───────────────
    const c = neon();
    ctx.globalCompositeOperation = 'screen';

    for (let lvl = 0; lvl < LEVELS; lvl++) {
      const nearNode = lvl / (LEVELS - 1);
      const a  = (0.06 + nearNode * 0.72) * (0.4 + gain * 0.6);
      const lw = 0.4 + nearNode * 1.4;
      ctx.strokeStyle = `${c}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth   = lw;
      ctx.beginPath();
      for (const p of groups[lvl]) {
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x,  p.y);
      }
      ctx.stroke();
    }

    // ── Paso 4: puntos de control ──────────────────────────
    ctx.globalCompositeOperation = 'source-over';
    drawPoints(neon(), m, n, gain);
    updateReadout(m, n, gain);

    requestAnimationFrame(draw);
  }

  // ── Puntos de control ─────────────────────────────────────
  function drawPoints(c, m, n, gain) {
    const labels = [`m:${m}`, `e:${gain.toFixed(2)}`, `n:${n}`];
    pts.forEach((p, i) => {
      const px = p.x * W, py = p.y * H;
      const pulse = 0.55 + 0.45 * Math.sin(frame * 0.04 + i * 1.3);

      // Guía punteada
      const isHoriz = (i === 0 || i === 2);
      ctx.save();
      ctx.strokeStyle = c + '1a';
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 7]);
      ctx.beginPath();
      if (isHoriz) { ctx.moveTo(px, 0); ctx.lineTo(px, H); }
      else          { ctx.moveTo(0, py); ctx.lineTo(W, py); }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Anillo exterior pulsante
      ctx.save();
      ctx.strokeStyle = c + Math.round(pulse * 0x30).toString(16).padStart(2,'0');
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI*2); ctx.stroke();
      ctx.restore();

      // Punto central
      ctx.save();
      ctx.fillStyle   = c;
      ctx.shadowBlur  = p.dragging ? 20 : 8;
      ctx.shadowColor = c;
      ctx.beginPath(); ctx.arc(px, py, p.dragging ? 8 : 5, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Etiqueta
      ctx.save();
      ctx.font      = `400 10px var(--font-mono, monospace)`;
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.75;
      ctx.fillText(labels[i], px + 12, py - 8);
      ctx.restore();
    });
  }

  function updateReadout(m, n, gain) {
    const fEl = document.getElementById('readout-freq');
    const gEl = document.getElementById('readout-gain');
    const mEl = document.getElementById('readout-modul');
    if (fEl) fEl.textContent = `${m}`;
    if (gEl) gEl.textContent = `${gain.toFixed(2)}`;
    if (mEl) mEl.textContent = `${n}`;
  }

  // ── Drag ──────────────────────────────────────────────────
  function ptAt(x, y) { return pts.find(p => Math.hypot(p.x*W-x, p.y*H-y) < 22); }

  canvas.addEventListener('mousedown', e => {
    const p = ptAt(e.offsetX, e.offsetY);
    if (p) { p.dragging = true; e.preventDefault(); }
  });
  canvas.addEventListener('mousemove', e => {
    const d = pts.find(p => p.dragging);
    if (d) {
      d.x = Math.max(0.03, Math.min(0.97, e.offsetX / W));
      d.y = Math.max(0.03, Math.min(0.97, e.offsetY / H));
    }
  });
  canvas.addEventListener('mouseup',    () => pts.forEach(p => p.dragging = false));
  canvas.addEventListener('mouseleave', () => pts.forEach(p => p.dragging = false));

  window.addEventListener('resize', resize);
  resize();
  draw();

  if (typeof LAB !== 'undefined') LAB.register('sintetizador', canvas);
})();
