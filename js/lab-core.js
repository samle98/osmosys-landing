// lab-core.js — gestión central del laboratorio:
// cambio de modo, descarga PNG, guardado en Supabase Storage.
// Debe cargarse antes que los motores de canvas.

const LAB = {
  active: 'particula',
  canvases: {},

  register(mode, canvas) {
    this.canvases[mode] = canvas;
  },

  switch(mode) {
    this.active = mode;

    // Toolbar tabs
    document.querySelectorAll('.lab-toolbar span[data-mode]').forEach(el => {
      el.classList.toggle('on', el.dataset.mode === mode);
    });

    // Canvases: mostrar solo el activo
    Object.entries(this.canvases).forEach(([k, c]) => {
      c.style.display = k === mode ? 'block' : 'none';
    });

    // HUD panels
    ['sintetizador', 'particula', 'tinta'].forEach(k => {
      const el = document.getElementById('hud-' + k);
      if (el) el.style.display = k === mode ? 'flex' : 'none';
    });
  },

  showStatus(msg, isOk = false) {
    const el = document.getElementById('labStatus');
    if (!el) return;
    el.textContent = msg;
    el.style.color  = isOk ? 'var(--neon)' : 'var(--rec)';
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.style.opacity = '0'), 3500);
  },

  async saveAndDownload() {
    const canvas = this.canvases[this.active];
    if (!canvas) return;

    canvas.toBlob(async blob => {
      // 1. Descarga local
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `osmosys-${this.active}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);

      // 2. Guardar en Supabase (requiere auth)
      const { data: { user } } = await supa.auth.getUser();
      if (!user) {
        this.showStatus('Inicia sesión para guardar en el archivo colectivo.');
        return;
      }

      this.showStatus('▸ subiendo…');

      const filename = `${user.id}/${Date.now()}-${this.active}.png`;
      const { error: upErr } = await supa.storage
        .from('creaciones')
        .upload(filename, blob, { contentType: 'image/png' });

      if (upErr) { this.showStatus('Error: ' + upErr.message); return; }

      const { data: { publicUrl } } = supa.storage
        .from('creaciones')
        .getPublicUrl(filename);

      const uname = user.user_metadata?.username ?? user.email.split('@')[0];
      const { error: insErr } = await supa.from('creaciones').insert({
        modo:        this.active,
        imagen_url:  publicUrl,
        autor_id:    user.id,
        autor_nombre: uname,
      });

      if (insErr) { this.showStatus('Error al guardar: ' + insErr.message); return; }
      this.showStatus('✓ Guardado en el archivo colectivo.', true);
    }, 'image/png');
  },
};

// Wiring — DOM ya está listo porque este script es defer
document.querySelectorAll('.lab-toolbar span[data-mode]').forEach(el => {
  el.addEventListener('click', () => LAB.switch(el.dataset.mode));
});

document.getElementById('btnSave')?.addEventListener('click', () => LAB.saveAndDownload());
