// gallery-360.js — paralaje horizontal de la imagen panorámica
// según la posición del ratón sobre #pano.

(() => {
  const pano = document.getElementById('pano');
  if (!pano) return;

  pano.addEventListener('mousemove', e => {
    const r = pano.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5; // rango -0.5 .. 0.5
    const img = pano.querySelector('.pano-image');
    if (!img) return;
    img.style.transform = `translate(calc(-50% + ${x * -30}px), -50%) perspective(800px) rotateY(${x * -6}deg)`;
  });

  pano.addEventListener('mouseleave', () => {
    const img = pano.querySelector('.pano-image');
    if (!img) return;
    img.style.transform = '';
  });
})();
