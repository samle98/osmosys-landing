// audio-toggle.js — alterna el estado mute del botón de audio del nav.

(() => {
  const audioBtn = document.getElementById('audioBtn');
  audioBtn.addEventListener('click', e => {
    e.preventDefault();
    audioBtn.classList.toggle('muted');
  });
})();
