// lab-tinta.js — modo tinta.
// El usuario pinta con el mouse. Velocidad baja = trazo grueso y opaco.
// Velocidad alta = trazo fino y transparente. Salpicaduras orgánicas en pausa.

(() => {
  const canvas = document.getElementById('canvas-tinta');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  let painting = false;
  let lastX = 0, lastY = 0, lastT = 0;

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;
    clear();
  }

  function neon() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--neon').trim() || '#3693C8';
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '').trim();
    const n = parseInt(h.length === 3
      ? h.split('').map(c => c + c).join('') : h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function clear() {
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, W, H);
  }

  function stroke(x, y) {
    const now = performance.now();
    const dt  = Math.max(1, now - lastT);
    const spd = Math.hypot(x - lastX, y - lastY) / dt;
    lastT = now;

    // Lento → grueso + opaco; rápido → fino + transparente
    const pressure = Math.max(0.04, Math.min(1, 1 - spd * 0.05));
    const radius   = 3 + pressure * 20;
    const opacity  = 0.12 + pressure * 0.55;

    const c   = neon();
    const rgb = hexToRgb(c);
    const col = `rgba(${rgb.r},${rgb.g},${rgb.b},`;

    // Blob radial
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0,   col + (opacity) + ')');
    g.addColorStop(0.45, col + (opacity * 0.55) + ')');
    g.addColorStop(1,   col + '0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Línea desde el punto anterior
    if (painting) {
      ctx.save();
      ctx.globalAlpha  = opacity * 0.65;
      ctx.strokeStyle  = c;
      ctx.lineWidth    = radius * 0.55;
      ctx.lineCap      = 'round';
      ctx.lineJoin     = 'round';
      ctx.shadowBlur   = 14;
      ctx.shadowColor  = c;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
    }

    // Salpicaduras orgánicas a baja velocidad
    if (pressure > 0.45 && Math.random() > 0.6) {
      const drops = Math.floor(pressure * 6);
      ctx.save();
      for (let i = 0; i < drops; i++) {
        const ang  = Math.random() * Math.PI * 2;
        const dist = radius * (0.6 + Math.random() * 1.4);
        const sx   = x + Math.cos(ang) * dist;
        const sy   = y + Math.sin(ang) * dist;
        const sr   = 0.4 + Math.random() * 2;
        ctx.globalAlpha = opacity * 0.35 * Math.random();
        ctx.fillStyle   = c;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    lastX = x; lastY = y;
  }

  canvas.addEventListener('mousedown', e => {
    painting = true;
    lastX = e.offsetX; lastY = e.offsetY;
    lastT = performance.now();
    stroke(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('mousemove', e => {
    if (painting) stroke(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('mouseup',    () => { painting = false; });
  canvas.addEventListener('mouseleave', () => { painting = false; });

  document.getElementById('btnClearTinta')
    ?.addEventListener('click', clear);

  window.addEventListener('resize', resize);
  resize();

  if (typeof LAB !== 'undefined') LAB.register('tinta', canvas);
})();
