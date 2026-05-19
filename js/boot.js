// boot.js — descarta el overlay de arranque tras 2.4s o al clic.

(() => {
  const boot = document.getElementById('boot');
  const dismissBoot = () => boot.classList.add('done');
  setTimeout(dismissBoot, 2400);
  boot.addEventListener('click', dismissBoot);
})();
