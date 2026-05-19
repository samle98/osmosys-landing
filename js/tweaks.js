// tweaks.js — panel de ajustes flotante.
// - Cambio en vivo del color de acento (escribe variables CSS --neon*).
// - Selección del color de las barras de audio.
// - Protocolo edit-mode con el host (postMessage).

(() => {
  const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accentColor": "#E8E4DC",
    "barColor": "accent"
  }/*EDITMODE-END*/;

  const tweaksEl    = document.getElementById('tweaks');
  const colorInput  = document.getElementById('colorInput');
  const swatchEl    = document.getElementById('swatch');
  const hexLabel    = document.getElementById('hexLabel');
  const presetsEl   = document.getElementById('presets');
  const tweaksClose = document.getElementById('tweaksClose');

  function hexToRgb(hex){
    const h = hex.replace('#','');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
  }

  function darken(hex, amt){
    const { r, g, b } = hexToRgb(hex);
    const f = 1 - amt;
    const to2 = v => Math.max(0, Math.min(255, Math.round(v*f))).toString(16).padStart(2,'0');
    return '#' + to2(r) + to2(g) + to2(b);
  }

  function applyAccent(hex){
    const { r, g, b } = hexToRgb(hex);
    const root = document.documentElement.style;
    root.setProperty('--neon', hex);
    root.setProperty('--neon-deep', darken(hex, 0.35));
    root.setProperty('--neon-soft',  `rgba(${r},${g},${b},.18)`);
    root.setProperty('--neon-glow',  `rgba(${r},${g},${b},.30)`);
    root.setProperty('--neon-hover', `rgba(${r},${g},${b},.10)`);

    swatchEl.style.background = hex;
    swatchEl.style.boxShadow  = `0 0 18px rgba(${r},${g},${b},.45)`;
    colorInput.value     = hex.toUpperCase();
    hexLabel.textContent = hex.toUpperCase();

    presetsEl.querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', b.dataset.color.toUpperCase() === hex.toUpperCase());
    });
  }

  applyAccent(TWEAKS_DEFAULTS.accentColor);

  colorInput.addEventListener('input', e => applyAccent(e.target.value));
  colorInput.addEventListener('change', e => {
    window.parent.postMessage({ type:'__edit_mode_set_keys', edits:{ accentColor: e.target.value } }, '*');
  });

  presetsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-color]');
    if (!btn) return;
    const v = btn.dataset.color;
    applyAccent(v);
    window.parent.postMessage({ type:'__edit_mode_set_keys', edits:{ accentColor: v } }, '*');
  });

  window.addEventListener('message', ev => {
    const d = ev && ev.data;
    if (!d || !d.type) return;
    if (d.type === '__activate_edit_mode')   tweaksEl.classList.add('on');
    if (d.type === '__deactivate_edit_mode') tweaksEl.classList.remove('on');
  });

  tweaksClose.addEventListener('click', () => {
    tweaksEl.classList.remove('on');
    window.parent.postMessage({ type:'__edit_mode_dismissed' }, '*');
  });

  window.parent.postMessage({ type:'__edit_mode_available' }, '*');

  // ---- Bar color ----
  const BAR_BLUE = '#3693C8';
  const barBtn0 = document.getElementById('barBtn0');
  const barBtn1 = document.getElementById('barBtn1');

  function applyBarColor(val){
    const color = val === 'blue' ? BAR_BLUE : 'var(--neon)';
    document.documentElement.style.setProperty('--bar-color', color);
    barBtn0.style.borderColor = val === 'accent' ? 'var(--neon)' : '';
    barBtn0.style.color       = val === 'accent' ? 'var(--neon)' : '';
    barBtn1.style.borderColor = val === 'blue'   ? 'var(--neon)' : '';
    barBtn1.style.color       = val === 'blue'   ? 'var(--neon)' : '';
  }

  applyBarColor(TWEAKS_DEFAULTS.barColor || 'accent');

  barBtn0.addEventListener('click', () => {
    applyBarColor('accent');
    window.parent.postMessage({ type:'__edit_mode_set_keys', edits:{ barColor:'accent' } }, '*');
  });
  barBtn1.addEventListener('click', () => {
    applyBarColor('blue');
    window.parent.postMessage({ type:'__edit_mode_set_keys', edits:{ barColor:'blue' } }, '*');
  });
})();
