// lab-synth.js — Chromafield: visualización sinestésica.
// Cada parámetro controla 3+ canales visuales simultáneamente.
// Punto 0 → frecuencia (hue, velocidad, conteo de anillos)
// Punto 1 → ganancia  (tamaño, brillo, amplitud de ondulación)
// Punto 2 → modulación (complejidad, saturación, forma Lissajous)

(() => {
  const canvas = document.getElementById('canvas-sintetizador');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, t = 0;
  let prevLX, prevLY; // posición anterior del trazo Lissajous

  const pts = [
    { x: 0.20, y: 0.50, dragging: false },
    { x: 0.50, y: 0.24, dragging: false },
    { x: 0.78, y: 0.50, dragging: false },
  ];

  function resize() {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    if (!w || !h) return;
    W = w; H = h;
    canvas.width = W; canvas.height = H;
    prevLX = undefined; prevLY = undefined;
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, W, H);
  }

  function neon() {
    return getComputedStyle(document.documentElement).getPropertyValue('--neon').trim() || '#3693C8';
  }

  function params() {
    return {
      freq:  pts[0].x * 7.5 + 0.8,
      gain:  Math.max(0.05, (0.5 - pts[1].y) * 2),
      modul: pts[2].x,
    };
  }

  // ── Núcleo central pulsante ───────────────────────────────
  function drawCore(cx, cy, freq, gain, hue, time) {
    const r = 18 + gain * 65 * (0.85 + 0.15 * Math.sin(time * 3.5));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0,   `hsla(${hue},80%,80%,${gain * 0.9})`);
    g.addColorStop(0.4, `hsla(${hue},70%,55%,${gain * 0.45})`);
    g.addColorStop(1,   `hsla(${hue},70%,40%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Anillos cromáticos modulados ──────────────────────────
  // El número de anillos varía con freq; la ondulación con gain y modul.
  function drawRings(cx, cy, freq, gain, modul, hue, time) {
    const numRings = Math.round(freq * 1.4 + 4);   // 5–16 anillos
    const maxR     = Math.min(W, H) * 0.46;
    const wobbleCycles = Math.round(freq * 2) * 2 + 2; // siempre par → simetría
    const tSpeed   = 1 + freq * 0.4;               // freq → velocidad de animación

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < numRings; i++) {
      const phase   = (i + 1) / numRings;
      const baseR   = phase * maxR;
      const ringHue = (hue + i * (25 + modul * 20)) % 360;
      const alpha   = (1 - phase * 0.65) * (0.28 + gain * 0.55);
      const wobbleA = gain * baseR * 0.28;

      ctx.beginPath();
      const steps = 90;
      for (let s = 0; s <= steps; s++) {
        const angle   = (s / steps) * Math.PI * 2;
        const wobble  = wobbleA * Math.sin(wobbleCycles * angle + time * tSpeed + phase * Math.PI * 2);
        const extra   = wobbleA * 0.3 * Math.sin((wobbleCycles + 2) * angle - time * (tSpeed * 0.7) + modul * Math.PI);
        const r       = baseR + wobble + extra;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `hsla(${ringHue|0},${55 + modul*30}%,68%,${alpha})`;
      ctx.lineWidth   = 0.4 + (1 - phase) * gain * 3.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Figura Lissajous (trazo acumulativo + persistencia) ───
  // Dibuja un segmento por frame; la persistencia del fade crea el trail.
  function updateLissajous(cx, cy, freq, gain, modul, hue, time) {
    const ax = Math.min(W, H) * 0.32 * gain;
    const ay = Math.min(W, H) * 0.32 * gain;
    const fx = freq * 3;
    const fy = Math.round(freq * modul * 2 + 0.5) + 0.5; // ratio racionalizado
    const phase = modul * Math.PI * 2;

    const x = cx + Math.cos(fx * time) * ax;
    const y = cy + Math.sin(fy * time + phase) * ay;

    if (prevLX !== undefined) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `hsla(${(hue + 60) % 360},90%,80%,0.85)`;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 6;
      ctx.shadowColor = `hsla(${(hue+60)%360},90%,70%,0.6)`;
      ctx.beginPath();
      ctx.moveTo(prevLX, prevLY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
    }

    // Punto brillante en la posición actual
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `hsla(${hue},100%,90%,0.9)`;
    ctx.shadowBlur = 12;
    ctx.shadowColor = `hsla(${hue},100%,80%,0.7)`;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    prevLX = x; prevLY = y;
  }

  // ── Puntos de control ─────────────────────────────────────
  function drawPoints(c) {
    pts.forEach((p, i) => {
      const px = p.x * W, py = p.y * H;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.5 + i * 1.2);

      ctx.save();
      ctx.strokeStyle = `${c}${Math.round(pulse*0x28).toString(16).padStart(2,'0')}`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = `${c}${Math.round(pulse*0x44).toString(16).padStart(2,'0')}`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI*2); ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = c;
      ctx.shadowBlur  = p.dragging ? 24 : 10;
      ctx.shadowColor = c;
      ctx.beginPath(); ctx.arc(px, py, p.dragging ? 8 : 5, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  // ── Readout ───────────────────────────────────────────────
  function updateReadout(freq, gain, modul) {
    const fEl = document.getElementById('readout-freq');
    const gEl = document.getElementById('readout-gain');
    const mEl = document.getElementById('readout-modul');
    if (fEl) fEl.textContent = (freq * 110).toFixed(1) + ' hz';
    if (gEl) gEl.textContent = (gain * 12).toFixed(1)  + ' db';
    if (mEl) mEl.textContent = modul.toFixed(2);
  }

  // ── Bucle de render ───────────────────────────────────────
  function draw() {
    if (canvas.style.display === 'none') { requestAnimationFrame(draw); return; }
    if (!W || canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      resize(); if (!W) { requestAnimationFrame(draw); return; }
    }

    t += 0.016;
    const { freq, gain, modul } = params();
    const cx = W / 2, cy = H / 2;

    // Hue sinestésico: frecuencia baja = cálido, alta = frío
    const hue = ((1 - pts[0].x) * 60 + t * (freq * 3)) % 360;

    // Fade persistente (crea el efecto de trail sin borrar)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(6,6,6,0.042)';
    ctx.fillRect(0, 0, W, H);

    drawCore(cx, cy, freq, gain, hue, t);
    drawRings(cx, cy, freq, gain, modul, hue, t);
    updateLissajous(cx, cy, freq, gain, modul, hue, t);

    // Puntos de control encima de todo
    ctx.globalCompositeOperation = 'source-over';
    const c = neon();
    drawPoints(c);
    updateReadout(freq, gain, modul);

    requestAnimationFrame(draw);
  }

  // ── Drag ──────────────────────────────────────────────────
  function ptAt(x, y) { return pts.find(p => Math.hypot(p.x*W-x, p.y*H-y) < 20); }

  canvas.addEventListener('mousedown', e => {
    const p = ptAt(e.offsetX, e.offsetY);
    if (p) { p.dragging = true; e.preventDefault(); }
  });
  canvas.addEventListener('mousemove', e => {
    const d = pts.find(p => p.dragging);
    if (d) {
      d.x = Math.max(0.04, Math.min(0.96, e.offsetX / W));
      d.y = Math.max(0.04, Math.min(0.96, e.offsetY / H));
      prevLX = undefined; // reset Lissajous al mover
    }
  });
  canvas.addEventListener('mouseup',    () => pts.forEach(p => p.dragging = false));
  canvas.addEventListener('mouseleave', () => pts.forEach(p => p.dragging = false));

  window.addEventListener('resize', resize);
  resize();
  draw();

  if (typeof LAB !== 'undefined') LAB.register('sintetizador', canvas);
})();
