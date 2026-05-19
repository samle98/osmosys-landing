// capsule-switch.js — cambio entre cápsulas 01–05 con
// flicker de escaneo y actualización de los textos del hero.

(() => {
  const CAP = {
    '01': { title:'arte',    kicker:'MANIFIESTO',  lead:'Osmosys es un colectivo donde el <strong>arte</strong> y la <strong>tecnología</strong> se filtran entre sí. Cinco cápsulas para entrar a nuestro proceso — manifiesto, obras, laboratorio, comunidad, invitación.' },
    '02': { title:'obras',   kicker:'CREACIONES',  lead:'Doce piezas habitan un espacio panorámico de 360°. Entra, escucha, vuelve. Cada obra vive en su propio nicho dentro de la sala.' },
    '03': { title:'proceso', kicker:'LABORATORIO', lead:'Tres instrumentos abiertos en el navegador. Mueve, escucha, exporta. Lo que hagas queda guardado en el archivo del colectivo.' },
    '04': { title:'voces',   kicker:'COMUNIDAD',   lead:'Foro y archivo vivo de 142 voces. 38 hilos activos sobre arte, código, errores y obsesiones compartidas.' },
    '05': { title:'archivo', kicker:'ARCHIVO',     lead:'Todo lo que se crea aquí queda. El archivo colectivo de procesos, errores y experimentos del laboratorio.' },
  };

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
    }, 100);
  }

  nodes.forEach(n => n.addEventListener('click', () => setCap(n.dataset.cap)));
})();
