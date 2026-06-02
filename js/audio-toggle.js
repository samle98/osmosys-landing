// audio-toggle.js — botón de audio + slider de volumen, con persistencia entre páginas.

(() => {
  const audioBtn     = document.getElementById('audioBtn');
  const audio        = document.getElementById('siteAudio');
  const volumeSlider = document.getElementById('volumeSlider');
  const KEY     = 'osm_audio_active';
  const VOL_KEY = 'osm_audio_volume';
  const autoplay = document.body.dataset.audioAutoplay === 'true';

  // Restaurar volumen guardado (default 0.7)
  const savedVol = parseFloat(localStorage.getItem(VOL_KEY) ?? '0.7');
  if (audio)        audio.volume = savedVol;
  if (volumeSlider) volumeSlider.value = savedVol.toString();

  function setActive(active) {
    if (active) {
      audioBtn?.classList.remove('muted');
      audio?.play().catch(() => {
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
    setActive(true);
  } else if (localStorage.getItem(KEY) === '1') {
    setActive(true);
  } else {
    audioBtn?.classList.add('muted');
  }

  // ── Click del botón (mute / unmute) ───────────────────────
  audioBtn?.addEventListener('click', e => {
    e.preventDefault();
    const isMuted = audioBtn.classList.contains('muted');
    if (isMuted && volumeSlider) {
      // Si el slider estaba en 0, restaurar a 0.7 al reactivar
      const vol = parseFloat(volumeSlider.value) || 0.7;
      volumeSlider.value = vol.toString();
      if (audio) audio.volume = vol;
    }
    setActive(isMuted);
  });

  // ── Slider de volumen ─────────────────────────────────────
  volumeSlider?.addEventListener('input', () => {
    const vol = parseFloat(volumeSlider.value);
    if (audio) audio.volume = vol;
    localStorage.setItem(VOL_KEY, vol.toString());

    if (vol === 0) {
      audioBtn?.classList.add('muted');
      audio?.pause();
      localStorage.setItem(KEY, '0');
    } else if (audioBtn?.classList.contains('muted')) {
      setActive(true);
    }
  });

  // ── Scroll hint (solo en index) ───────────────────────────
  const hint = document.getElementById('scrollHint');
  if (hint) {
    window.addEventListener('scroll', () => {
      hint.classList.toggle('hidden', window.scrollY > 140);
    }, { passive: true });
  }
})();
