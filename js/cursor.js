// cursor.js — cursor personalizado (anillo con lerp + punto fijo)
// y estado :hover para elementos interactivos.

(() => {
  const ring = document.getElementById('cursorRing');
  const dot = document.getElementById('cursorDot');

  let cx = window.innerWidth / 2;
  let cy = window.innerHeight / 2;
  let rx = cx, ry = cy;

  window.addEventListener('mousemove', e => {
    cx = e.clientX;
    cy = e.clientY;
    dot.style.left = cx + 'px';
    dot.style.top = cy + 'px';
  });

  function tick(){
    rx += (cx - rx) * 0.22;
    ry += (cy - ry) * 0.22;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(tick);
  }
  tick();

  const hoverables = 'a, button, .node, .thread, .dropzone, .preview-frame';
  document.querySelectorAll(hoverables).forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });
})();
