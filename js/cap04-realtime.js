// cap04-realtime.js — reemplaza los hilos estáticos de la cápsula 04
// con datos en tiempo real desde Supabase.

(() => {
  const container = document.querySelector('[data-cap-body="04"] .threads');
  if (!container) return;

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

  function renderThread(t) {
    return `
      <article class="thread" data-href="foro.html#/hilo/${esc(t.id)}">
        <div class="top">
          <span class="badge">// ${esc(t.badge)}</span>
          <span class="time">${timeAgo(t.updated_at)}</span>
        </div>
        <h3>${esc(t.title)}</h3>
        <div class="meta">
          <span class="user">@${esc(t.profiles?.username ?? 'anon')}</span>
          <span class="replies">${t.reply_count} respuesta${t.reply_count !== 1 ? 's' : ''}</span>
        </div>
      </article>`;
  }

  function attachListeners() {
    const ring = document.getElementById('cursorRing');
    container.querySelectorAll('.thread[data-href]').forEach(el => {
      el.onclick = () => (location.href = el.dataset.href);
      if (ring) {
        el.addEventListener('mouseenter', () => ring.classList.add('hover'));
        el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
      }
    });
  }

  async function load() {
    const { data } = await supa
      .from('threads')
      .select('id, title, badge, reply_count, updated_at, profiles(username)')
      .order('updated_at', { ascending: false })
      .limit(4);

    if (!data || data.length === 0) return;
    container.innerHTML = data.map(renderThread).join('');
    attachListeners();
  }

  load();

  supa.channel('landing-cap04')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'threads' }, load)
    .subscribe();
})();
