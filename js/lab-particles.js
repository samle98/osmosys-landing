// lab-particles.js — modo partícula.
// Sistema de partículas que emana desde el mouse (o el centro si no hay mouse).
// Parámetros ajustables: cantidad, velocidad, dispersión.

(() => {
  const canvas = document.getElementById('canvas-particula');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  let particles = [];
  let mouseX = null, mouseY = null;

  const params = { cantidad: 80, velocidad: 4, dispersion: 3 };

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

  class Particle {
    constructor(x, y) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = (Math.random() * 0.6 + 0.4) * params.velocidad;
      const spr   = params.dispersion;
      this.x     = x + (Math.random() - 0.5) * spr * 0.5;
      this.y     = y + (Math.random() - 0.5) * spr * 0.5;
      this.vx    = Math.cos(angle) * spd * 0.4 + (Math.random() - 0.5) * spr * 0.08;
      this.vy    = Math.sin(angle) * spd - params.velocidad * 0.25;
      this.life  = 1;
      this.decay = 0.007 + Math.random() * 0.010;
      this.size  = 0.8 + Math.random() * 2.2;
    }
    update() {
      this.x   += this.vx;
      this.y   += this.vy;
      this.vy  += 0.035;
      this.vx  *= 0.985;
      this.life -= this.decay;
    }
    draw(c) {
      ctx.save();
      ctx.globalAlpha = Math.pow(Math.max(this.life, 0), 1.4);
      ctx.shadowBlur  = 14;
      ctx.shadowColor = c;
      ctx.fillStyle   = c;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * Math.max(this.life, 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function emit(x, y) {
    const perFrame = Math.max(1, Math.ceil(params.cantidad / 40));
    const cap = params.cantidad * 4;
    for (let i = 0; i < perFrame && particles.length < cap; i++) {
      particles.push(new Particle(x, y));
    }
  }

  function updateReadout() {
    const cEl = document.getElementById('readout-count');
    const vEl = document.getElementById('readout-vel');
    const dEl = document.getElementById('readout-disp');
    if (cEl) cEl.textContent = particles.length;
    if (vEl) vEl.textContent = params.velocidad.toFixed(1);
    if (dEl) dEl.textContent = params.dispersion.toFixed(1);
  }

  function draw() {
    if (canvas.style.display === 'none') { requestAnimationFrame(draw); return; }
    if (!W || !H) resize();

    const c = neon();

    // Trail fade
    ctx.fillStyle = 'rgba(6,6,6,0.14)';
    ctx.fillRect(0, 0, W, H);

    // Emit
    emit(mouseX ?? W / 2, mouseY ?? H / 2);

    // Update + draw
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => { p.update(); p.draw(c); });

    updateReadout();
    requestAnimationFrame(draw);
  }

  canvas.addEventListener('mousemove', e => { mouseX = e.offsetX; mouseY = e.offsetY; });
  canvas.addEventListener('mouseleave', () => { mouseX = null; mouseY = null; });

  // Sliders
  ['cantidad', 'velocidad', 'dispersion'].forEach(key => {
    const el  = document.getElementById('slider-' + key);
    const val = document.getElementById('slider-' + key + '-val');
    if (!el) return;
    el.addEventListener('input', () => {
      params[key] = parseFloat(el.value);
      if (val) val.textContent = el.value;
    });
  });

  window.addEventListener('resize', resize);
  resize();
  draw();

  if (typeof LAB !== 'undefined') LAB.register('particula', canvas);
})();
