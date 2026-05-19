// lab-synth.js — modo sintetizador.
// Onda multi-armónica con efecto de brillo fósforo CRT.
// 3 puntos de control: frecuencia, ganancia, modulación.

(() => {
  const canvas = document.getElementById('canvas-sintetizador');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, t = 0;

  // Puntos de control normalizados (0..1)
  const pts = [
    { x: 0.20, y: 0.50, dragging: false }, // freq
    { x: 0.50, y: 0.26, dragging: false }, // gain
    { x: 0.80, y: 0.50, dragging: false }, // modul
  ];

  function resize() {
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;
  }

  function neon() {
    return getComputedStyle(document.documentElement).getPropertyValue('--neon').trim() || '#3693C8';
  }

  function params() {
    return {
      freq:  pts[0].x * 7.5 + 0.8,      // 0.8 – 8.3 ciclos
      gain:  (0.5 - pts[1].y) * 1.7,     // -0.85 – 0.85
      modul: pts[2].x,                   // 0 – 1
    };
  }

  // ── Forma de onda multi-armónica ──────────────────────────
  function waveY(x, time) {
    const { freq, gain, modul } = params();
    const n = x / W;
    // Fundamental
    const f1 = Math.sin(n * Math.PI * 2 * freq + time * 1.8) * gain;
    // 2.º armónico (enriquece la forma)
    const f2 = Math.sin(n * Math.PI * 4 * freq + time * 2.2 + modul * Math.PI) * gain * 0.30;
    // Onda de modulación (micro-ondulación)
    const fm = Math.sin(n * Math.PI * 5 * modul + time * 1.5) * 0.10 * modul;
    return H * 0.5 + (f1 + f2 + fm) * H * 0.31;
  }

  // ── Onda secundaria (portadora) ───────────────────────────
  function carrierY(x, time) {
    const { freq, modul } = params();
    const n = x / W;
    return H * 0.5 + Math.sin(n * Math.PI * 2 * (modul * 3 + 0.5) + time * 2.8) * H * 0.06;
  }

  // ── Fondo: pantalla osciloscópica ─────────────────────────
  function drawBackground(c) {
    ctx.clearRect(0, 0, W, H);

    // Scanlines suaves
    ctx.strokeStyle = 'rgba(232,228,220,0.025)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 6) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Grid menor
    ctx.strokeStyle = c + '09';
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Línea central
    ctx.strokeStyle = c + '18';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  }

  // ── Dibuja una onda con N pasadas (efecto fósforo CRT) ────
  function drawWavePasses(fn, c, time, passes) {
    for (const { width, alpha, blur } of passes) {
      ctx.save();
      ctx.shadowBlur  = blur;
      ctx.shadowColor = c;
      ctx.strokeStyle = c + alpha;
      ctx.lineWidth   = width;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const y = fn(x, time);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Puntos de control ─────────────────────────────────────
  function drawPoints(c) {
    pts.forEach(p => {
      const px = p.x * W, py = p.y * H;

      // Guía punteada vertical
      ctx.save();
      ctx.strokeStyle = c + '20';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 7]);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Anillo exterior pulsante
      const pulse = 0.6 + 0.4 * Math.sin(t * 2 + pts.indexOf(p));
      ctx.save();
      ctx.strokeStyle = c + Math.round(pulse * 0x33).toString(16).padStart(2,'0');
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      // Punto sólido
      ctx.save();
      ctx.fillStyle   = c;
      ctx.shadowBlur  = p.dragging ? 22 : 12;
      ctx.shadowColor = c;
      ctx.beginPath(); ctx.arc(px, py, p.dragging ? 8 : 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  // ── Barras de espectro decorativas ────────────────────────
  function drawSpectrum(c, time) {
    const { freq, gain } = params();
    const barW = 3, gap = 2, n = 32;
    const startX = (W - n * (barW + gap)) / 2;
    const maxH   = H * 0.06;
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < n; i++) {
      const h = maxH * Math.abs(Math.sin(i * 0.4 + freq + time * 0.8)) * (0.5 + Math.abs(gain) * 0.8);
      const x = startX + i * (barW + gap);
      const y = H - 12 - h;
      ctx.fillStyle = c;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = c;
      ctx.fillRect(x, y, barW, h);
    }
    ctx.restore();
  }

  // ── Readout ───────────────────────────────────────────────
  function updateReadout() {
    const { freq, gain, modul } = params();
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
    if (!W || !H) resize();
    t += 0.016;

    const c = neon();

    drawBackground(c);

    // Onda portadora (fondo, muy sutil)
    drawWavePasses(carrierY, c, t, [
      { width: 1, alpha: '11', blur: 4 },
    ]);

    // Onda principal — 3 pasadas (efecto fósforo)
    drawWavePasses(waveY, c, t, [
      { width: 14, alpha: '08', blur: 40 }, // halo exterior
      { width: 5,  alpha: '22', blur: 18 }, // brillo medio
      { width: 1.5,alpha: 'ff', blur: 6  }, // núcleo nítido
    ]);

    drawSpectrum(c, t);
    drawPoints(c);
    updateReadout();

    requestAnimationFrame(draw);
  }

  // ── Drag de puntos de control ─────────────────────────────
  function ptAt(x, y) {
    return pts.find(p => Math.hypot(p.x * W - x, p.y * H - y) < 20);
  }

  canvas.addEventListener('mousedown', e => {
    const p = ptAt(e.offsetX, e.offsetY);
    if (p) { p.dragging = true; e.preventDefault(); }
  });
  canvas.addEventListener('mousemove', e => {
    const d = pts.find(p => p.dragging);
    if (d) {
      d.x = Math.max(0.04, Math.min(0.96, e.offsetX / W));
      d.y = Math.max(0.04, Math.min(0.96, e.offsetY / H));
    }
  });
  canvas.addEventListener('mouseup',    () => pts.forEach(p => p.dragging = false));
  canvas.addEventListener('mouseleave', () => pts.forEach(p => p.dragging = false));

  window.addEventListener('resize', resize);
  resize();
  draw();

  if (typeof LAB !== 'undefined') LAB.register('sintetizador', canvas);
})();
