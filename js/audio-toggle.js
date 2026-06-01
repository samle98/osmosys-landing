// audio-toggle.js — audio del nav con persistencia entre páginas.
// Landing: empieza silenciado, el usuario lo activa manualmente.
// Laboratorio / Galería (data-audio-autoplay="true"): siempre arranca,
// independientemente del estado guardado.

(() => {
  const audioBtn  = document.getElementById('audioBtn');
  const audio     = document.getElementById('siteAudio');
  const KEY       = 'osm_audio_active';
  const autoplay  = document.body.dataset.audioAutoplay === 'true';

  function setActive(active) {
    if (active) {
      audioBtn?.classList.remove('muted');
      audio?.play().catch(() => {
        // Navegador bloqueó el autoplay sin gesto previo
        audioBtn?.classList.add('muted');
        localStorage.setItem(KEY, '0');
      });
    } else {
      audioBtn?.classList.add('muted');
      audio?.pause();
    }
    localStorage.setItem(KEY, active ? '1' : '0');
  }

  // ── Init ─────────────────────────────────────────────────
  if (autoplay) {
    // Laboratorio y Galería: activar siempre (era silenciado o no)
    setActive(true);
  } else if (localStorage.getItem(KEY) === '1') {
    // Otras páginas: respetar estado guardado
    setActive(true);
  } else {
    // Por defecto: silenciado
    audioBtn?.classList.add('muted');
  }

  // ── Click del botón ───────────────────────────────────────
  audioBtn?.addEventListener('click', e => {
    e.preventDefault();
    const isMuted = audioBtn.classList.contains('muted');
    setActive(isMuted);
  });
})();
