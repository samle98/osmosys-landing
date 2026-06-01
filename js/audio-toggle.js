// audio-toggle.js — botón de audio del nav con persistencia entre páginas.
// Guarda el estado en localStorage; si estaba activo al navegar, reanuda solo.

(() => {
  const audioBtn = document.getElementById('audioBtn');
  const audio    = document.getElementById('siteAudio');
  const KEY      = 'osm_audio_active';

  function setActive(active) {
    if (active) {
      audioBtn?.classList.remove('muted');
      audio?.play().catch(() => {
        // El navegador rechazó el autoplay (sin gesto previo): volver a muted
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
  // Si el usuario ya lo había activado en otra página, reanudar
  if (localStorage.getItem(KEY) === '1') {
    setActive(true);
  } else {
    audioBtn?.classList.add('muted'); // por defecto: silenciado
  }

  // ── Click del botón ───────────────────────────────────────
  audioBtn?.addEventListener('click', e => {
    e.preventDefault();
    const isMuted = audioBtn.classList.contains('muted');
    setActive(isMuted); // si estaba muted → activar, y viceversa
  });
})();
