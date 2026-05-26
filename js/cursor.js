// cursor.js — cursor personalizado: punto y anillo se mueven juntos,
// sin lerp. Hover en elementos interactivos agranda el anillo.

(() => {
  const ring = document.getElementById('cursorRing');
  const dot  = document.getElementById('cursorDot');

  window.addEventListener('mousemove', e => {
    const x = e.clientX + 'px';
    const y = e.clientY + 'px';
    dot.style.left  = x;  dot.style.top  = y;
    ring.style.left = x;  ring.style.top = y;
  });

  const hoverables = 'a, button, .node, .thread, .dropzone, .preview-frame, .form-input, .form-textarea, .form-select';
  document.querySelectorAll(hoverables).forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });
})();
