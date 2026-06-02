// capsule-switch.js — cambio entre cápsulas 01–05 con
// flicker de escaneo, actualización del hero y modal de YouTube por cápsula.

(() => {
  // ── Datos por cápsula ─────────────────────────────────────
  const CAP = {
    '01': { title:'arte',    kicker:'MANIFIESTO',  lead:'Osmosys es un colectivo donde el arte y la tecnología se filtran entre sí. Cinco cápsulas para entrar a nuestro proceso — manifiesto, obras, laboratorio, comunidad, invitación.',
            thumb: 'https://img.youtube.com/vi/9IiqtHUWKgw/hqdefault.jpg', duration: '2:46' },
    '02': { title:'obras',   kicker:'CREACIONES',  lead:'Cuatro piezas habitan un espacio panorámico de 360°. Entra, escucha, vuelve. Cada obra aborda una técnica diferente del colectivo.',
            thumb: 'https://img.youtube.com/vi/nwRIBQsJpb4/hqdefault.jpg', duration: '' },
    '03': { title:'proceso', kicker:'LABORATORIO', lead:'Tres instrumentos visuales abiertos en el navegador. Mueve, escucha, exporta. Lo que hagas queda guardado en el archivo del colectivo.',
            thumb: 'https://img.youtube.com/vi/2u3JWmbytHI/hqdefault.jpg', duration: '' },
    '04': { title:'voces',   kicker:'COMUNIDAD',   lead:'Foro y archivo vivo de voces activas. Hilos abiertos sobre arte, código, errores y obsesiones compartidas.',
            thumb: '', duration: '' },
    '05': { title:'archivo', kicker:'ARCHIVO',     lead:'Todo lo que se crea aquí queda. El archivo colectivo de procesos, errores y experimentos del laboratorio.',
            thumb: 'https://img.youtube.com/vi/MqV8-YvxxGg/hqdefault.jpg', duration: '' },
  };

  // ── Video IDs de YouTube por cápsula (null = aún no disponible) ──
  const CAP_YT = {
    '01': '9IiqtHUWKgw',
    '02': 'nwRIBQsJpb4',
    '03': '2u3JWmbytHI',
    '04': null,
    '05': 'MqV8-YvxxGg',
  };

  // Parámetros del embed: mínimo de UI de YouTube
  // modestbranding + rel=0 + sin anotaciones/subtítulos automáticos
  const YT_PARAMS = '?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0';

  // ── Preview hero ──────────────────────────────────────────
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

  updatePreview('01'); // estado inicial

  // ── Cambio de cápsula ─────────────────────────────────────
  const scanFx = document.getElementById('scanFx');
  const nodes  = document.querySelectorAll('.node');
  const bodies = document.querySelectorAll('.cap-body');

  function setCap(n) {
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
  const ytModal = document.getElementById('ytModal');
  const ytFrame = document.getElementById('ytFrame');
  const ytClose = document.getElementById('ytModalClose');

  function openVideo() {
    const activeCapNum = document.querySelector('.node[data-active="true"]')?.dataset.cap ?? '01';
    const videoId = CAP_YT[activeCapNum];
    if (!videoId || !ytModal) return;   // cap sin video aún → no hacer nada
    ytFrame.src = `https://www.youtube.com/embed/${videoId}${YT_PARAMS}`;
    ytModal.classList.add('on');
  }

  function closeVideo() {
    ytFrame.src = '';                   // vaciar src detiene el video
    ytModal.classList.remove('on');
  }

  ytClose?.addEventListener('click', closeVideo);
  ytModal?.addEventListener('click', e => { if (e.target === ytModal) closeVideo(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeVideo(); });

  // Botón "Reproducir cápsula" del hero
  document.querySelector('.hero-cta .btn--neon')
    ?.addEventListener('click', openVideo);

  // Tarjeta de preview (click en la imagen lateral del hero)
  document.querySelector('.preview-frame')
    ?.addEventListener('click', openVideo);
})();
