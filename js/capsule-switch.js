// capsule-switch.js — cambio entre cápsulas 01–05 con
// flicker de escaneo y actualización de los textos del hero.

(() => {
  const CAP = {
    '01': { title:'arte',    kicker:'MANIFIESTO',  lead:'Osmosys es un colectivo donde el <strong>arte</strong> y la <strong>tecnología</strong> se filtran entre sí. Cinco cápsulas para entrar a nuestro proceso — manifiesto, obras, laboratorio, comunidad, invitación.',
            thumb: 'https://img.youtube.com/vi/NNCn_22HpJw/hqdefault.jpg', duration: '00:00' },
    '02': { title:'obras',   kicker:'CREACIONES',  lead:'Doce piezas habitan un espacio panorámico de 360°. Entra, escucha, vuelve. Cada obra vive en su propio nicho dentro de la sala.',
            thumb: '', duration: '' },
    '03': { title:'proceso', kicker:'LABORATORIO', lead:'Tres instrumentos abiertos en el navegador. Mueve, escucha, exporta. Lo que hagas queda guardado en el archivo del colectivo.',
            thumb: '', duration: '' },
    '04': { title:'voces',   kicker:'COMUNIDAD',   lead:'Foro y archivo vivo de 142 voces. 38 hilos activos sobre arte, código, errores y obsesiones compartidas.',
            thumb: '', duration: '' },
    '05': { title:'archivo', kicker:'ARCHIVO',     lead:'Todo lo que se crea aquí queda. El archivo colectivo de procesos, errores y experimentos del laboratorio.',
            thumb: '', duration: '' },
  };

  const previewFrame = document.querySelector('.preview-frame');
  const previewBr    = document.querySelector('.preview-br');

  function updatePreview(n) {
    if (previewFrame) {
      const t = CAP[n].thumb;
      previewFrame.style.backgroundImage    = t ? `url('${t}')` : '';
      previewFrame.style.backgroundSize     = t ? 'cover' : '';
      previewFrame.style.backgroundPosition = t ? 'center' : '';
    }
    if (previewBr) previewBr.textContent = CAP[n].duration || '';
  }

  // Estado inicial: cap-01 activa
  updatePreview('01');

  const scanFx = document.getElementById('scanFx');
  const nodes  = document.querySelectorAll('.node');
  const bodies = document.querySelectorAll('.cap-body');

  function setCap(n){
    scanFx.classList.remove('on');
    void scanFx.offsetWidth;
    scanFx.classList.add('on');
    setTimeout(() => scanFx.classList.remove('on'), 220);

    setTimeout(() => {
      nodes.forEach(node => node.setAttribute('data-active', node.dataset.cap === n ? 'true' : 'false'));
      bodies.forEach(b => {
        if (b.dataset.capBody === n) b.setAttribute('data-active', '');
        else b.removeAttribute('data-active');
      });
      document.querySelectorAll('[data-cap-num]').forEach(el => el.textContent = n);
      document.querySelectorAll('[data-cap-title]').forEach(el => el.textContent = CAP[n].title);
      document.querySelectorAll('[data-cap-kicker]').forEach(el => el.textContent = CAP[n].kicker);
      document.querySelectorAll('[data-cap-lead]').forEach(el => el.innerHTML = CAP[n].lead);
      updatePreview(n);
    }, 100);
  }

  nodes.forEach(n => n.addEventListener('click', () => setCap(n.dataset.cap)));

  // ── Modal YouTube ─────────────────────────────────────────
  const YT_EMBED = 'https://www.youtube.com/embed/NNCn_22HpJw?autoplay=1&rel=0';
  const ytModal  = document.getElementById('ytModal');
  const ytFrame  = document.getElementById('ytFrame');
  const ytClose  = document.getElementById('ytModalClose');

  function openVideo() {
    if (!ytModal) return;
    ytFrame.src = YT_EMBED;      // autoplay al asignar src
    ytModal.classList.add('on');
  }

  function closeVideo() {
    ytFrame.src = '';             // vaciar src detiene el video sin recargar nada
    ytModal.classList.remove('on');
  }

  ytClose?.addEventListener('click', closeVideo);
  ytModal?.addEventListener('click', e => { if (e.target === ytModal) closeVideo(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeVideo(); });

  // Botón "Reproducir cápsula" del hero
  document.querySelector('.hero-cta .btn--neon')
    ?.addEventListener('click', openVideo);

  // Tarjeta de preview del hero (click en la imagen de la derecha)
  document.querySelector('.preview-frame')
    ?.addEventListener('click', openVideo);
})();
