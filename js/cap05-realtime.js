// cap05-realtime.js — carga en tiempo real las piezas del
// laboratorio para el grid de la cápsula 05 en la landing.

(() => {
  const grid  = document.getElementById('cap05-grid');
  const count = document.getElementById('cap05-count');
  if (!grid) return;

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function timeAgo(d) {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 2)  return 'ahora';
    if (m < 60) return `hace ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
  }

  function renderItem(c) {
    return `
      <div class="archivo-item">
        <div class="archivo-thumb" style="background-image:url('${esc(c.imagen_url)}')"></div>
        <div class="archivo-meta">
          <span class="archivo-modo">// ${esc(c.modo)}</span>
          <span class="archivo-time">${timeAgo(c.created_at)}</span>
        </div>
      </div>`;
  }

  async function load() {
    const { data } = await supa
      .from('creaciones')
      .select('id, modo, imagen_url, created_at')
      .order('created_at', { ascending: false })
      .limit(8);

    if (!data || data.length === 0) {
      grid.innerHTML = `
        <p class="cap05-empty">
          Todavía no hay piezas.
          <a href="laboratorio.html">Crea la primera →</a>
        </p>`;
      if (count) count.textContent = '0 piezas';
      return;
    }

    if (count) count.textContent = `${data.length} pieza${data.length !== 1 ? 's' : ''}`;
    grid.innerHTML = data.map(renderItem).join('');
  }

  load();

  supa.channel('landing-cap05')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'creaciones',
    }, load)
    .subscribe();
})();
