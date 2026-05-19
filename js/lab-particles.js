// lab-particles.js — modo partícula: campo de flujo Perlin.
// Base: flujo inspirado en el sistema original. Reescrito en Canvas 2D
// vanilla (sin p5.js). Optimizaciones: Float32Array para el campo,
// caché de color por partícula, campo actualizado cada 2 frames.

(() => {
  const canvas = document.getElementById('canvas-particula');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ── Perlin noise compacto ─────────────────────────────────
  const _P = new Uint8Array(512);
  (() => {
    const t = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    for (let i = 0; i < 256; i++) _P[i] = _P[256 + i] = t[i];
  })();
  function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function _g(h, x, y, z) {
    const H = h & 15, u = H < 8 ? x : y, v = H < 4 ? y : (H === 12 || H === 14 ? x : z);
    return ((H & 1) ? -u : u) + ((H & 2) ? -v : v);
  }
  function noise(x, y, z = 0) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = _fade(x), v = _fade(y), w = _fade(z);
    const A = _P[X] + Y, AA = _P[A] + Z, AB = _P[A + 1] + Z;
    const B = _P[X + 1] + Y, BA = _P[B] + Z, BB = _P[B + 1] + Z;
    const lr = (a, b, t) => a + t * (b - a);
    return lr(
      lr(lr(_g(_P[AA],x,y,z),   _g(_P[BA],x-1,y,z),  u),
         lr(_g(_P[AB],x,y-1,z), _g(_P[BB],x-1,y-1,z),u), v),
      lr(lr(_g(_P[AA+1],x,y,z-1),   _g(_P[BA+1],x-1,y,z-1),  u),
         lr(_g(_P[AB+1],x,y-1,z-1), _g(_P[BB+1],x-1,y-1,z-1),u), v), w);
  }

  // ── Estado ────────────────────────────────────────────────
  let W = 0, H = 0, frame = 0, zOff = 0;
  const CELL = 20;
  let cols = 0, rows = 0;
  let field; // Float32Array(cols*rows*2): [vx, vy, …]
  let particles = [];
  let mouseX = -1, mouseY = -1;

  let shape = 'line'; // 'circle' | 'line' | 'cross'
  let mode  = 'flow'; // 'flow' | 'radial' | 'chaos'

  // Parámetros leídos de sliders + constantes internas
  const P = { count: 200, speed: 3, scale: 12, hue: 80, alpha: 50, hueVar: 30, fade: 8 };

  // ── Campo de flujo ────────────────────────────────────────
  function initField() {
    cols  = Math.ceil(W / CELL) + 1;
    rows  = Math.ceil(H / CELL) + 1;
    field = new Float32Array(cols * rows * 2);
  }

  function updateField() {
    const sc  = P.scale * 0.003;
    const spd = P.speed * 0.45;
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const idx = (x + y * cols) * 2;
        let angle;
        if      (mode === 'flow')   angle = noise(x * sc, y * sc, zOff) * Math.PI * 4.5;
        else if (mode === 'radial') angle = Math.atan2(y - rows / 2, x - cols / 2) + noise(x * sc, y * sc, zOff) * 1.4;
        else                        angle = noise(x * sc * 2.2, y * sc * 2.2, zOff * 1.8) * Math.PI * 9;
        field[idx]     = Math.cos(angle) * spd;
        field[idx + 1] = Math.sin(angle) * spd;
      }
    }
    zOff += 0.003;
  }

  // ── Clase Partícula ───────────────────────────────────────
  class Particle {
    constructor() {
      this.x  = Math.random() * W;  this.y  = Math.random() * H;
      this.vx = (Math.random() - .5) * 2; this.vy = (Math.random() - .5) * 2;
      this.px = this.x; this.py = this.y;
      this.hs  = (Math.random() - .5) * 50; // hue shift personal
      this.sz  = 0.6 + Math.random() * 1.6;
      this.ms  = 2.5 + Math.random() * 2;   // maxSpeed
      this.ca  = Math.floor(Math.random() * 15); // color age (stagger)
      this.col = '';
    }

    update() {
      const cx = Math.min(cols - 1, Math.max(0, this.x / CELL | 0));
      const cy = Math.min(rows - 1, Math.max(0, this.y / CELL | 0));
      const fi = (cx + cy * cols) * 2;
      this.vx += field[fi]; this.vy += field[fi + 1];

      // Influencia del mouse: repulsión suave
      if (mouseX >= 0) {
        const dx = this.x - mouseX, dy = this.y - mouseY;
        const d2 = dx * dx + dy * dy;
        if (d2 < 7200 && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = 2.2 / (d * 0.025 + 0.5);
          this.vx += dx / d * f; this.vy += dy / d * f;
        }
      }

      // Límite de velocidad
      const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (spd > this.ms) { this.vx = this.vx / spd * this.ms; this.vy = this.vy / spd * this.ms; }

      this.px = this.x; this.py = this.y;
      this.x += this.vx; this.y += this.vy;

      // Wrap edges
      if (this.x > W) { this.x = 0; this.px = 0; }
      else if (this.x < 0) { this.x = W; this.px = W; }
      if (this.y > H) { this.y = 0; this.py = 0; }
      else if (this.y < 0) { this.y = H; this.py = H; }
    }

    draw() {
      // Caché de color: recalcular cada 15 frames (staggered)
      if (++this.ca % 15 === 0 || !this.col) {
        const h = ((P.hue + this.hs + P.hueVar * Math.sin(frame * 0.008 + this.hs * 0.1)) % 360 + 360) % 360;
        this.col = `hsla(${h | 0},60%,74%,${P.alpha / 100})`;
      }
      ctx.strokeStyle = this.col;
      ctx.fillStyle   = this.col;
      ctx.lineWidth   = this.sz;

      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.sz * 0.75, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'line') {
        ctx.beginPath();
        ctx.moveTo(this.px, this.py);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
      } else {
        const s = this.sz * 3;
        ctx.beginPath();
        ctx.moveTo(this.x - s, this.y); ctx.lineTo(this.x + s, this.y);
        ctx.moveTo(this.x, this.y - s); ctx.lineTo(this.x, this.y + s);
        ctx.stroke();
      }
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────
  function resize() {
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;
    initField();
    particles = Array.from({ length: P.count }, () => new Particle());
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, W, H);
  }

  // ── Bucle de render ───────────────────────────────────────
  function draw() {
    if (canvas.style.display === 'none') { requestAnimationFrame(draw); return; }
    frame++;

    // Leer sliders
    const newCount = parseInt(document.getElementById('slider-cantidad')?.value ?? P.count);
    P.speed = parseFloat(document.getElementById('slider-velocidad')?.value ?? P.speed);
    P.scale = parseFloat(document.getElementById('slider-dispersion')?.value ?? P.scale);
    P.hue   = parseFloat(document.getElementById('slider-hue')?.value ?? P.hue);

    // Ajustar número de partículas
    while (particles.length < newCount) particles.push(new Particle());
    while (particles.length > newCount) particles.pop();
    P.count = newCount;

    // Actualizar campo cada 2 frames
    if (frame % 2 === 0) updateField();

    // Fade de fondo (trail)
    ctx.fillStyle = `rgba(6,6,6,${P.fade / 250})`;
    ctx.fillRect(0, 0, W, H);

    // Dibujar todas las partículas
    for (const p of particles) { p.update(); p.draw(); }

    // Readout
    if (frame % 30 === 0) {
      const cEl = document.getElementById('readout-count');
      const vEl = document.getElementById('readout-vel');
      const dEl = document.getElementById('readout-disp');
      if (cEl) cEl.textContent = particles.length;
      if (vEl) vEl.textContent = P.speed.toFixed(1);
      if (dEl) dEl.textContent = P.scale.toFixed(0);
    }

    requestAnimationFrame(draw);
  }

  // ── Interacción ───────────────────────────────────────────
  canvas.addEventListener('mousemove',  e => { mouseX = e.offsetX; mouseY = e.offsetY; });
  canvas.addEventListener('mouseleave', () => { mouseX = -1; mouseY = -1; });

  // Toggles de forma
  document.querySelectorAll('[data-shape]').forEach(btn => {
    btn.addEventListener('click', () => {
      shape = btn.dataset.shape;
      document.querySelectorAll('[data-shape]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Toggles de modo de campo
  document.querySelectorAll('[data-field-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.fieldMode;
      zOff = Math.random() * 100; // transición limpia
      document.querySelectorAll('[data-field-mode]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Actualizar spans de valor al mover sliders
  [['slider-cantidad','slider-cantidad-val'],
   ['slider-velocidad','slider-velocidad-val'],
   ['slider-dispersion','slider-dispersion-val'],
   ['slider-hue','slider-hue-val']].forEach(([slId, valId]) => {
    const sl  = document.getElementById(slId);
    const val = document.getElementById(valId);
    if (sl && val) sl.addEventListener('input', () => { val.textContent = sl.value; });
  });

  window.addEventListener('resize', resize);
  resize();
  draw();

  if (typeof LAB !== 'undefined') LAB.register('particula', canvas);
})();
