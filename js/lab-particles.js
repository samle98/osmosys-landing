// lab-particles.js — campo de flujo Perlin, modo partícula.
// Fix: lazy-init al hacerse visible (canvas oculto → offsetWidth=0 al arranque).
// Forma: círculo fijo. Modos: flujo y caos. Mirror 4-way toggle.

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
    const A = _P[X] + Y, AA = _P[A] + Z, AB = _P[A+1] + Z;
    const B = _P[X+1]+Y, BA = _P[B]+Z, BB = _P[B+1]+Z;
    const lr = (a, b, t) => a + t * (b - a);
    return lr(
      lr(lr(_g(_P[AA],x,y,z), _g(_P[BA],x-1,y,z), u),
         lr(_g(_P[AB],x,y-1,z), _g(_P[BB],x-1,y-1,z), u), v),
      lr(lr(_g(_P[AA+1],x,y,z-1), _g(_P[BA+1],x-1,y,z-1), u),
         lr(_g(_P[AB+1],x,y-1,z-1), _g(_P[BB+1],x-1,y-1,z-1), u), v), w);
  }

  // ── Estado ────────────────────────────────────────────────
  let W = 0, H = 0, frame = 0, zOff = 0;
  const CELL = 20;
  let cols = 0, rows = 0;
  let field; // Float32Array(cols*rows*2)
  let particles = [];
  let mouseX = -1, mouseY = -1;
  let mode      = 'flow'; // 'flow' | 'chaos'
  let mirrorMode = false;

  const P = { count: 200, speed: 3, scale: 12, hue: 80 };

  // ── Campo de flujo ────────────────────────────────────────
  function initField() {
    cols  = Math.ceil(W / CELL) + 1;
    rows  = Math.ceil(H / CELL) + 1;
    field = new Float32Array(cols * rows * 2);
  }

  function updateField() {
    const sc = P.scale * 0.003, spd = P.speed * 0.45;
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const idx = (x + y * cols) * 2;
        const angle = mode === 'flow'
          ? noise(x * sc, y * sc, zOff) * Math.PI * 4.5
          : noise(x * sc * 2.2, y * sc * 2.2, zOff * 1.8) * Math.PI * 9;
        field[idx]     = Math.cos(angle) * spd;
        field[idx + 1] = Math.sin(angle) * spd;
      }
    }
    zOff += 0.003;
  }

  // ── Partícula ─────────────────────────────────────────────
  class Particle {
    constructor() {
      this.x  = Math.random() * W; this.y  = Math.random() * H;
      this.vx = (Math.random() - .5) * 2; this.vy = (Math.random() - .5) * 2;
      this.px = this.x; this.py = this.y;
      this.hs = (Math.random() - .5) * 50;
      this.sz = 0.8 + Math.random() * 1.4;
      this.ms = 2.5 + Math.random() * 2;
      this.ca = Math.floor(Math.random() * 15);
      this.col = '';
    }
    update() {
      const cx = Math.min(cols-1, Math.max(0, this.x / CELL | 0));
      const cy = Math.min(rows-1, Math.max(0, this.y / CELL | 0));
      const fi = (cx + cy * cols) * 2;
      this.vx += field[fi]; this.vy += field[fi+1];
      if (mouseX >= 0) {
        const dx = this.x - mouseX, dy = this.y - mouseY;
        const d2 = dx*dx + dy*dy;
        if (d2 < 7200 && d2 > 1) {
          const d = Math.sqrt(d2);
          this.vx += dx/d * (2.2/(d*0.025+0.5));
          this.vy += dy/d * (2.2/(d*0.025+0.5));
        }
      }
      const spd = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
      if (spd > this.ms) { this.vx = this.vx/spd*this.ms; this.vy = this.vy/spd*this.ms; }
      this.px = this.x; this.py = this.y;
      this.x += this.vx; this.y += this.vy;
      if (this.x > W) { this.x = 0; this.px = 0; }
      else if (this.x < 0) { this.x = W; this.px = W; }
      if (this.y > H) { this.y = 0; this.py = 0; }
      else if (this.y < 0) { this.y = H; this.py = H; }
    }
    draw() {
      if (++this.ca % 15 === 0 || !this.col) {
        const h = ((P.hue + this.hs + 30 * Math.sin(frame*0.008+this.hs*0.1)) % 360 + 360) % 360;
        this.col = `hsla(${h|0},62%,74%,0.5)`;
      }
      ctx.fillStyle = this.col;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.sz * 0.75, 0, Math.PI * 2);
      ctx.fill();
      // Mirror
      if (mirrorMode) {
        ctx.beginPath(); ctx.arc(W - this.x, this.y, this.sz*0.75, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.x, H - this.y, this.sz*0.75, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(W - this.x, H - this.y, this.sz*0.75, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  // ── Resize (lazy-safe) ────────────────────────────────────
  function resize() {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    if (!w || !h) return;
    W = w; H = h;
    canvas.width = W; canvas.height = H;
    initField();
    particles = Array.from({ length: P.count }, () => new Particle());
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, W, H);
  }

  // ── Bucle de render ───────────────────────────────────────
  function draw() {
    if (canvas.style.display === 'none') { requestAnimationFrame(draw); return; }
    // Lazy-init: el canvas estaba oculto cuando se llamó resize() inicialmente
    if (!W || canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      resize();
      if (!W) { requestAnimationFrame(draw); return; }
    }
    frame++;

    P.count = parseInt(document.getElementById('slider-cantidad')?.value  ?? P.count);
    P.speed = parseFloat(document.getElementById('slider-velocidad')?.value ?? P.speed);
    P.scale = parseFloat(document.getElementById('slider-dispersion')?.value ?? P.scale);
    P.hue   = parseFloat(document.getElementById('slider-hue')?.value  ?? P.hue);

    while (particles.length < P.count) particles.push(new Particle());
    while (particles.length > P.count) particles.pop();

    if (frame % 2 === 0) updateField();

    ctx.fillStyle = 'rgba(6,6,6,0.032)';
    ctx.fillRect(0, 0, W, H);

    for (const p of particles) { p.update(); p.draw(); }

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

  // ── Eventos ───────────────────────────────────────────────
  canvas.addEventListener('mousemove',  e => { mouseX = e.offsetX; mouseY = e.offsetY; });
  canvas.addEventListener('mouseleave', () => { mouseX = -1; mouseY = -1; });

  document.querySelectorAll('[data-field-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.fieldMode;
      zOff = Math.random() * 100;
      document.querySelectorAll('[data-field-mode]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  document.getElementById('btnMirror')?.addEventListener('click', () => {
    mirrorMode = !mirrorMode;
    document.getElementById('btnMirror')?.classList.toggle('active', mirrorMode);
  });

  [['slider-cantidad','slider-cantidad-val'],
   ['slider-velocidad','slider-velocidad-val'],
   ['slider-dispersion','slider-dispersion-val'],
   ['slider-hue','slider-hue-val']].forEach(([slId, valId]) => {
    const sl = document.getElementById(slId), val = document.getElementById(valId);
    if (sl && val) sl.addEventListener('input', () => { val.textContent = sl.value; });
  });

  window.addEventListener('resize', () => { W = 0; resize(); });
  draw(); // no resize() aquí: canvas está oculto, se iniciará en el primer frame visible

  if (typeof LAB !== 'undefined') LAB.register('particula', canvas);
})();
