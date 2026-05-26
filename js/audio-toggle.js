// audio-toggle.js — botón de audio del nav conectado al archivo de audio real.
// Por defecto inicia silenciado (browser autoplay restrictions).

(() => {
  const audioBtn = document.getElementById('audioBtn');
  const audio    = document.getElementById('siteAudio');

  // Iniciar en estado muted (barras estáticas)
  audioBtn?.classList.add('muted');

  audioBtn?.addEventListener('click', e => {
    e.preventDefault();
    const wasMuted = audioBtn.classList.toggle('muted');
    if (!audio) return;
    if (wasMuted) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        // Si el navegador bloquea la reproducción, volver a estado muted
        audioBtn.classList.add('muted');
      });
    }
  });
})();
