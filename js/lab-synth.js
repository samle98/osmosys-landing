// lab-synth.js — modo sintetizador.
// Onda animada controlada por 3 puntos arrastrables.
// Punto 0 → frecuencia · Punto 1 → amplitud/ganancia · Punto 2 → modulación.

(() => {
  const canvas = document.getElementById('canvas-sintetizador');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, t = 0;

  // Puntos de control (posición normalizada 0..1)
  const pts = [
    { x: 0.20, y: 0.50, dragging: false },
    { x: 0.50, y: 0.28, dragging: false },
    { x: 0.80, y: 0.50, dragging: false },
  ];

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;
  }

  function neon() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--neon').trim() || '#3693C8';
  }

  // Parámetros derivados de la posición de los puntos
  function params() {
    const freq  = pts[0].x * 7 + 0.8;          // 0.8 – 7.8 ciclos
    const gain  = (0.5 - pts[1].y) * 1.6;      // -0.8 – 0.8
    const modul = pts[2].x;                     // 0 – 1
    return { freq, gain, modul };
  }

  function waveY(x, time) {
    const { freq, gain, modul } = params();
    const norm = x / W;
    const base = Math.sin(norm * Math.PI * 2 * freq + time * 1.8) * gain;
    const mod  = Math.sin(norm * Math.PI * 4 * modul * 3 + time * 2.6) * 0.12 * modul;
    return H * 0.5 + (base + mod) * H * 0.34;
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(232,228,220,0.035)';
    ctx.lineWidth   = 1;
    for (let x = 0; x < W; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 48) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // Centro
    ctx.strokeStyle = 'rgba(232,228,220,0.08)';
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  }

  function drawWave(c, time) {
    // Glow grueso
    ctx.save();
    ctx.shadowBlur  = 28;
    ctx.shadowColor = c;
    ctx.strokeStyle = c + '33';
    ctx.lineWidth   = 10;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 3) {
      x === 0 ? ctx.moveTo(x, waveY(x, time)) : ctx.lineTo(x, waveY(x, time));
    }
    ctx.stroke();
    ctx.restore();

    // Línea nítida
    ctx.save();
    ctx.shadowBlur  = 6;
    ctx.shadowColor = c;
    ctx.strokeStyle = c;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 2) {
      x === 0 ? ctx.moveTo(x, waveY(x, time)) : ctx.lineTo(x, waveY(x, time));
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawPoints(c) {
    pts.forEach(p => {
      const px = p.x * W;
      const py = p.y * H;

      // Guía vertical
      ctx.save();
      ctx.strokeStyle = c + '22';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Punto
      ctx.save();
      ctx.fillStyle   = c;
      ctx.shadowBlur  = p.dragging ? 20 : 10;
      ctx.shadowColor = c;
      ctx.beginPath();
      ctx.arc(px, py, p.dragging ? 9 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Anillo exterior
      ctx.save();
      ctx.strokeStyle = c + '55';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  function updateReadout() {
    const { freq, gain, modul } = params();
    const fEl = document.getElementById('readout-freq');
    const gEl = document.getElementById('readout-gain');
    const mEl = document.getElementById('readout-modul');
    if (fEl) fEl.textContent = (freq * 110).toFixed(1) + ' hz';
    if (gEl) gEl.textContent = (gain * 12).toFixed(1)  + ' db';
    if (mEl) mEl.textContent = modul.toFixed(2);
  }

  function draw() {
    if (canvas.style.display === 'none') { requestAnimationFrame(draw); return; }
    if (!W || !H) resize();

    t += 0.016;
    const c = neon();

    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawWave(c, t);
    drawPoints(c);
    updateReadout();

    requestAnimationFrame(draw);
  }

  // Drag interaction
  function ptAt(x, y) {
    return pts.find(p => Math.hypot(p.x * W - x, p.y * H - y) < 18);
  }

  canvas.addEventListener('mousedown', e => {
    const p = ptAt(e.offsetX, e.offsetY);
    if (p) { p.dragging = true; e.preventDefault(); }
  });
  canvas.addEventListener('mousemove', e => {
    const dragging = pts.find(p => p.dragging);
    if (dragging) {
      dragging.x = Math.max(0.04, Math.min(0.96, e.offsetX / W));
      dragging.y = Math.max(0.04, Math.min(0.96, e.offsetY / H));
    }
  });
  canvas.addEventListener('mouseup',    () => pts.forEach(p => p.dragging = false));
  canvas.addEventListener('mouseleave', () => pts.forEach(p => p.dragging = false));

  window.addEventListener('resize', resize);
  resize();
  draw();

  if (typeof LAB !== 'undefined') LAB.register('sintetizador', canvas);
})();
