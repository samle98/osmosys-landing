// foro.js — lógica completa del foro:
// hash-routing, autenticación, listado de hilos,
// detalle + respuestas en tiempo real, y creación de contenido.

(() => {
  // ── Estado ────────────────────────────────────────────────
  let user        = null;
  let replyChannel = null;

  // ── Iconos SVG para el toggle de contraseña ───────────────
  const EYE_OPEN  = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  const EYE_SLASH = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;

  function resetPwToggle() {
    const input = document.getElementById('authPassword');
    const icon  = document.getElementById('eyeIcon');
    const btn   = document.getElementById('togglePw');
    if (input) input.type = 'password';
    if (icon)  icon.innerHTML = EYE_OPEN;
    if (btn)   btn.setAttribute('aria-label', 'Mostrar contraseña');
  }

  // ── Utilidades ────────────────────────────────────────────
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

  function showEl(el, show = true) { if (el) el.hidden = !show }

  function setMsg(el, msg, isError = true) {
    el.textContent = msg ?? '';
    el.hidden      = !msg;
    el.className   = isError ? 'form-error' : 'form-success';
  }

  function attachHover(els) {
    const ring = document.getElementById('cursorRing');
    if (!ring) return;
    els.forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
    });
  }

  // ── Vistas ────────────────────────────────────────────────
  const VIEW = {
    list:   document.getElementById('view-list'),
    thread: document.getElementById('view-thread'),
    nuevo:  document.getElementById('view-nuevo'),
  };

  function showView(name) {
    Object.entries(VIEW).forEach(([k, el]) => showEl(el, k === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Auth bar ──────────────────────────────────────────────
  function updateAuthBar() {
    const bar = document.getElementById('authBar');
    if (!bar) return;

    if (user) {
      const uname = esc(user.user_metadata?.username ?? user.email.split('@')[0]);
      bar.innerHTML = `
        <div class="user-info">
          <span>conectado como</span>
          <span class="username">@${uname}</span>
        </div>
        <button id="logoutBtn" class="btn">Cerrar sesión</button>`;
      document.getElementById('logoutBtn').onclick = logout;
      attachHover([document.getElementById('logoutBtn')]);
    } else {
      bar.innerHTML = `
        <span>Inicia sesión para participar en el foro</span>
        <button id="loginBarBtn" class="btn btn--neon">
          Entrar / Registrarse <span class="arrow">→</span>
        </button>`;
      document.getElementById('loginBarBtn').onclick = () => openAuth('login');
      attachHover([document.getElementById('loginBarBtn')]);
    }
  }

  // ── Modal de autenticación ────────────────────────────────
  let authMode = 'login';

  function openAuth(mode = 'login') {
    authMode = mode;
    syncAuthModal();
    document.getElementById('authModal').classList.add('on');
    document.getElementById('authEmail').focus();
  }

  function closeAuth() {
    document.getElementById('authModal').classList.remove('on');
    document.getElementById('authForm').reset();
    setMsg(document.getElementById('authMsg'), null);
    resetPwToggle(); // restaurar campo de contraseña al cerrar
  }

  function syncAuthModal() {
    const login = authMode === 'login';
    document.getElementById('authBoxTitle').textContent = login ? 'Entrar.' : 'Unirse.';
    document.getElementById('authBtnLabel').textContent = login ? 'Entrar' : 'Registrarme';
    showEl(document.getElementById('usernameGroup'), !login);
    document.getElementById('authToggleText').textContent =
      login ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
    document.getElementById('authToggleBtn').textContent =
      login ? 'Regístrate' : 'Inicia sesión';
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const msgEl   = document.getElementById('authMsg');
    const email   = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    setMsg(msgEl, null);

    if (authMode === 'login') {
      const { error } = await supa.auth.signInWithPassword({ email, password });
      if (error) { setMsg(msgEl, error.message); return; }
      closeAuth();

    } else {
      const username = document.getElementById('authUsername').value.trim();
      if (!username) { setMsg(msgEl, 'El nombre de usuario es obligatorio.'); return; }
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        setMsg(msgEl, 'Solo minúsculas, números y _ (3–20 caracteres).');
        return;
      }
      const { error } = await supa.auth.signUp({
        email, password,
        options: { data: { username } },
      });
      if (error) { setMsg(msgEl, error.message); return; }
      setMsg(msgEl, 'Revisa tu email para confirmar el registro.', false);
    }
  }

  async function logout() {
    await supa.auth.signOut();
  }

  // ── Vista: lista de hilos ─────────────────────────────────
  async function showList() {
    showView('list');
    const listEl  = document.getElementById('threadsList');
    const countEl = document.getElementById('threadsCount');
    listEl.innerHTML = '<div class="loading-line">cargando hilos…</div>';

    const { data, error } = await supa
      .from('threads')
      .select('id, title, badge, reply_count, updated_at, author_name, profiles(username)')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      listEl.innerHTML = `<div class="loading-line">error: ${esc(error.message)}</div>`;
      return;
    }

    if (countEl) countEl.textContent = `${data.length} hilo${data.length !== 1 ? 's' : ''}`;

    if (!data.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">01</div>
          <p>Todavía no hay hilos. ¡Crea el primero!</p>
        </div>`;
      return;
    }

    listEl.innerHTML = data.map(t => `
      <article class="thread" data-tid="${esc(t.id)}">
        <div class="top">
          <span class="badge">// ${esc(t.badge)}</span>
          <span class="time">${timeAgo(t.updated_at)}</span>
        </div>
        <h3>${esc(t.title)}</h3>
        <div class="meta">
          <span class="user">@${esc(t.profiles?.username ?? t.author_name ?? 'anon')}</span>
          <span class="replies">${t.reply_count} respuesta${t.reply_count !== 1 ? 's' : ''}</span>
        </div>
      </article>`).join('');

    const cards = listEl.querySelectorAll('.thread');
    cards.forEach(el => {
      el.addEventListener('click', () => { location.hash = '#/hilo/' + el.dataset.tid; });
    });
    attachHover(cards);
  }

  // ── Vista: detalle de hilo ────────────────────────────────
  async function showThread(id) {
    showView('thread');

    if (replyChannel) { supa.removeChannel(replyChannel); replyChannel = null; }

    const detailEl       = document.getElementById('threadDetail');
    const repliesEl      = document.getElementById('repliesList');
    const repliesHeaderEl = document.getElementById('repliesHeader');
    const replyForm      = document.getElementById('replyForm');
    const loginPrompt    = document.getElementById('replyLoginPrompt');

    detailEl.innerHTML  = '<div class="loading-line">cargando…</div>';
    repliesEl.innerHTML = '';

    // Hilo
    const { data: thread, error: tErr } = await supa
      .from('threads')
      .select('id, title, body, badge, reply_count, created_at, author_name, profiles(username)')
      .eq('id', id)
      .single();

    if (tErr || !thread) {
      detailEl.innerHTML = '<div class="loading-line">hilo no encontrado.</div>';
      return;
    }

    detailEl.innerHTML = `
      <div class="thread-body-card">
        <div class="thread-badge-row">
          <span class="badge">// ${esc(thread.badge)}</span>
        </div>
        <h2 class="thread-title">${esc(thread.title)}</h2>
        <div class="thread-body-text">${esc(thread.body)}</div>
        <div class="thread-meta-row">
          <span class="author">@${esc(thread.profiles?.username ?? thread.author_name ?? 'anon')}</span>
          <span>${timeAgo(thread.created_at)}</span>
        </div>
      </div>`;

    // Respuestas
    const { data: replies } = await supa
      .from('replies')
      .select('id, body, created_at, author_name, profiles(username)')
      .eq('thread_id', id)
      .order('created_at', { ascending: true });

    const count = replies?.length ?? 0;
    repliesHeaderEl.textContent = `// ${count} respuesta${count !== 1 ? 's' : ''}`;

    if (replies?.length) {
      repliesEl.innerHTML = replies.map(renderReplyCard).join('');
    }

    // Formulario de respuesta: siempre visible, sin requisito de cuenta
    showEl(replyForm, true);
    replyForm.dataset.threadId = id;
    const replyNombreGroup = document.getElementById('replyNombreGroup');
    showEl(replyNombreGroup, !user); // campo nombre solo si no está logueado
    if (!user) {
      const saved = localStorage.getItem('osm_guest_name');
      const replyNombreEl = document.getElementById('replyNombre');
      if (replyNombreEl && saved) replyNombreEl.value = saved;
    }

    // Realtime: nuevas respuestas
    replyChannel = supa.channel('replies-' + id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'replies',
        filter: `thread_id=eq.${id}`,
      }, async payload => {
        let profile = null;
        if (payload.new.author_id) {
          const { data } = await supa
            .from('profiles').select('username').eq('id', payload.new.author_id).single();
          profile = data;
        }
        repliesEl.insertAdjacentHTML(
          'beforeend',
          renderReplyCard({ ...payload.new, profiles: profile }),
        );
        const n = repliesEl.querySelectorAll('.reply-card').length;
        repliesHeaderEl.textContent = `// ${n} respuesta${n !== 1 ? 's' : ''}`;
        repliesEl.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      })
      .subscribe();
  }

  function renderReplyCard(r) {
    const name = r.profiles?.username ?? r.author_name ?? 'anon';
    return `
      <div class="reply-card">
        <div class="reply-meta">
          <span class="reply-author">@${esc(name)}</span>
          <span>${timeAgo(r.created_at)}</span>
        </div>
        <div class="reply-body">${esc(r.body)}</div>
      </div>`;
  }

  async function handleReplySubmit(e) {
    e.preventDefault();
    const threadId = e.target.dataset.threadId;
    const bodyEl   = document.getElementById('replyBody');
    const msgEl    = document.getElementById('replyMsg');
    const body     = bodyEl.value.trim();
    setMsg(msgEl, null);

    if (!body) { setMsg(msgEl, 'La respuesta no puede estar vacía.'); return; }

    // Nombre: del perfil si está logueado, del campo si no
    const nombre = user
      ? (user.user_metadata?.username ?? user.email.split('@')[0])
      : document.getElementById('replyNombre')?.value.trim() ?? '';
    if (!nombre) { setMsg(msgEl, 'Por favor ingresá tu nombre.'); return; }
    if (!user) localStorage.setItem('osm_guest_name', nombre);

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    const { error } = await supa.from('replies').insert({
      thread_id:   threadId,
      body,
      author_id:   user?.id ?? null,
      author_name: nombre,
    });
    btn.disabled = false;

    if (error) { setMsg(msgEl, error.message); return; }
    bodyEl.value = '';
  }

  // ── Vista: nuevo hilo ─────────────────────────────────────
  function showNuevo() {
    showView('nuevo');
    // Mostrar campo de nombre solo si no está logueado
    const nuevoNombreGroup = document.getElementById('nuevoNombreGroup');
    showEl(nuevoNombreGroup, !user);
    const nuevoNombreEl = document.getElementById('nuevoNombre');
    if (nuevoNombreEl) {
      if (user) nuevoNombreEl.value = user.user_metadata?.username ?? '';
      else {
        const saved = localStorage.getItem('osm_guest_name');
        if (saved) nuevoNombreEl.value = saved;
      }
    }
  }

  async function handleNuevoSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('nuevoTitle').value.trim();
    const badge = document.getElementById('nuevoBadge').value;
    const body  = document.getElementById('nuevoBody').value.trim();
    const msgEl = document.getElementById('nuevoMsg');
    setMsg(msgEl, null);

    if (!title) { setMsg(msgEl, 'El título es obligatorio.'); return; }
    if (!body)  { setMsg(msgEl, 'El mensaje es obligatorio.'); return; }

    // Nombre: del perfil si está logueado, del campo si no
    const nombre = user
      ? (user.user_metadata?.username ?? user.email.split('@')[0])
      : document.getElementById('nuevoNombre')?.value.trim() ?? '';
    if (!nombre) { setMsg(msgEl, 'Por favor ingresá tu nombre.'); return; }
    if (!user) localStorage.setItem('osm_guest_name', nombre);

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    const { data, error } = await supa
      .from('threads')
      .insert({ title, body, badge, author_id: user?.id ?? null, author_name: nombre })
      .select('id')
      .single();
    btn.disabled = false;

    if (error) { setMsg(msgEl, error.message); return; }
    location.hash = '#/hilo/' + data.id;
  }

  // ── Router ────────────────────────────────────────────────
  function route() {
    const hash = location.hash || '#/';
    if (hash.startsWith('#/hilo/')) {
      showThread(hash.replace('#/hilo/', '').trim());
    } else if (hash === '#/nuevo') {
      showNuevo();
    } else {
      showList();
    }
  }

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    const { data: { session } } = await supa.auth.getSession();
    user = session?.user ?? null;
    updateAuthBar();

    supa.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
      updateAuthBar();
      route();
    });

    // Auth modal
    document.getElementById('authClose').onclick    = closeAuth;
    document.getElementById('authModal').onclick    = e => { if (e.target.id === 'authModal') closeAuth(); };
    document.getElementById('authToggleBtn').onclick = () => {
      authMode = authMode === 'login' ? 'register' : 'login';
      syncAuthModal();
      setMsg(document.getElementById('authMsg'), null);
      resetPwToggle(); // resetear visibilidad al cambiar entre login/registro
    };

    // Toggle mostrar/ocultar contraseña
    const togglePwBtn = document.getElementById('togglePw');
    const pwInput     = document.getElementById('authPassword');
    if (togglePwBtn && pwInput) {
      togglePwBtn.addEventListener('click', () => {
        const show = pwInput.type === 'password';
        pwInput.type = show ? 'text' : 'password';
        document.getElementById('eyeIcon').innerHTML = show ? EYE_SLASH : EYE_OPEN;
        togglePwBtn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
        pwInput.focus(); // mantener foco en el campo
      });
      attachHover([togglePwBtn]);
    }
    document.getElementById('authForm').onsubmit    = handleAuthSubmit;

    // Botones principales
    document.getElementById('btnNuevo').onclick = () => {
      location.hash = '#/nuevo';
    };

    // Reply form
    document.getElementById('replyForm').onsubmit = handleReplySubmit;

    // Nuevo form
    document.getElementById('nuevoForm').onsubmit = handleNuevoSubmit;

    // Hover en botones estáticos
    attachHover(document.querySelectorAll('.auth-close, #btnNuevo, #authToggleBtn, .form-input, .form-textarea'));

    // Router
    window.addEventListener('hashchange', route);
    route();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
