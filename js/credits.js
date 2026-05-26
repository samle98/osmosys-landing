// credits.js — modal de créditos del proyecto (abre desde el footer).

(() => {
  const modal = document.getElementById('creditsModal');
  const closeBtn = document.getElementById('creditsClose');
  const openBtn  = document.getElementById('btnCredits');

  function open()  { modal?.classList.add('on'); }
  function close() { modal?.classList.remove('on'); }

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  modal?.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();
