// cap04-realtime.js — hilos recientes y estadísticas reales del foro
// en la cápsula 04 de la landing, desde Supabase en tiempo real.

(() => {
  const container = document.querySelector('[data-cap-body="04"] .threads');
  if (!container) return;

  // ── Utilidades ───────────────────────────────────────────
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

  function fmt(n) {
    if (n == null) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    return String(n);
  }

  // ── Hilos recientes ──────────────────────────────────────
  function renderThread(t) {
    return `
      <article class="thread" data-href="foro.html#/hilo/${esc(t.id)}">
        <div class="top">
          <span class="badge">// ${esc(t.badge)}</span>
          <span class="time">${timeAgo(t.updated_at)}</span>
        </div>
        <h3>${esc(t.title)}</h3>
        <div class="meta">
          <span class="user">@${esc(t.profiles?.username ?? t.author_name ?? 'anon')}</span>
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
      .select('id, title, badge, reply_count, updated_at, author_name, profiles(username)')
      .order('updated_at', { ascending: false })
      .limit(4);

    if (data && data.length > 0) {
      container.innerHTML = data.map(renderThread).join('');
      attachListeners();
    }
  }

  // ── Estadísticas reales del foro ─────────────────────────
  async function loadStats() {
    const [
      { count: threads },
      { count: members },
      { count: replies },
    ] = await Promise.all([
      supa.from('threads').select('*', { count: 'exact', head: true }),
      supa.from('profiles').select('*', { count: 'exact', head: true }),
      supa.from('replies').select('*',  { count: 'exact', head: true }),
    ]);

    // Meta del encabezado de la cápsula
    const memStat  = document.getElementById('cap04-members-stat');
    const thrStat  = document.getElementById('cap04-threads-stat');
    if (memStat) memStat.textContent = fmt(members);
    if (thrStat) thrStat.textContent = fmt(threads);

    // Bloque de estadísticas inferior
    const memEl = document.getElementById('cap04-stat-mem');
    const thrEl = document.getElementById('cap04-stat-thr');
    const repEl = document.getElementById('cap04-stat-rep');
    if (memEl) memEl.textContent = fmt(members);
    if (thrEl) thrEl.textContent = fmt(threads);
    if (repEl) repEl.textContent = fmt(replies);
  }

  // ── Init ─────────────────────────────────────────────────
  load();
  loadStats();

  // Actualizar hilos y stats en tiempo real
  supa.channel('landing-cap04')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'threads' }, () => {
      load();
      loadStats();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, loadStats)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadStats)
    .subscribe();
})();
