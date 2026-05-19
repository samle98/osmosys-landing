// particles.js — siembra 24 motas flotantes en el hero.

(() => {
  const particles = document.getElementById('particles');
  if (!particles) return;

  for (let i = 0; i < 24; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.bottom = '-2px';
    s.style.animationDelay = (Math.random() * 20) + 's';
    s.style.animationDuration = (16 + Math.random() * 12) + 's';
    particles.appendChild(s);
  }
})();
