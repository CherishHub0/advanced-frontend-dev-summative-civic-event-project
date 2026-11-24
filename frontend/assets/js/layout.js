// Shared layout: navbar, footer, notification drawer and admin sidebar.
// Every protected page has <header id="site-header">, <footer id="site-footer"> and
// calls Layout.init({ active: 'events' }) once. We write the layout once, here.
const Layout = (() => {
  const R = () => APP.ROOT;
  const esc = (s) => UI.esc(s);

  // ---------- "Seen" notifications ----------
  // The backend has no "mark as read" endpoint and its read flag is shared by everyone,
  // so we remember which notification IDs THIS user has opened, in the browser.
  const seenKey = () => 'ce_seen_' + (Auth.user()?.id || 'anon');
  const seen = {
    all() { try { return new Set(JSON.parse(localStorage.getItem(seenKey())) || []); } catch (e) { return new Set(); } },
    has(id) { return this.all().has(id); },
    add(ids) {
      const s = this.all();
      [].concat(ids).forEach((id) => s.add(id));
      try { localStorage.setItem(seenKey(), JSON.stringify([...s])); } catch (e) {}
    },
  };

  // Where a notification should take you, based on what the backend put in metadata.
  function notifLink(n) {
    const m = n.metadata || {};
    if (m.event_id) return R() + 'event-detail.html?id=' + m.event_id;
    if (m.promo_id) return R() + 'promo-detail.html?id=' + m.promo_id;
    if (m.announcement_id) return R() + 'announcement-detail.html?id=' + m.announcement_id;
    return R() + 'notifications.html?id=' + n.id;
  }

  const ICONS = {
    bell: '<path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/>',
    search: '<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/>',
    menu: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>',
    close: '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>',
  };
  const icon = (name, cls = 'h-5 w-5') =>
    `<svg class="${cls}" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" aria-hidden="true">${ICONS[name]}</svg>`;

  // Small logo mark: two overlapping rounded shapes = people coming together.
  const logo = () => `
    <a href="${R()}events.html" class="flex items-center gap-2.5 rounded-lg" aria-label="CivicEvents+ home">
      <span class="relative grid h-8 w-8 place-items-center rounded-xl bg-sage-600 text-white">
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/></svg>
      </span>
      <span class="font-display text-[17px] font-bold tracking-tight text-stone-900">CivicEvents<span class="text-sage-600">+</span></span>
    </a>`;

  const LINKS = [
    { key: 'events', label: 'Events', href: 'events.html' },
    { key: 'announcements', label: 'Announcements', href: 'announcements.html' },
    { key: 'promos', label: 'Promos', href: 'promos.html' },
    { key: 'registrations', label: 'My registrations', href: 'my-registrations.html' },
  ];

  function header(active) {
    const u = Auth.user() || {};
    const initials = (u.full_name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    const link = (l, mobile) => {
      const on = l.key === active;
      return mobile
        ? `<a href="${R()}${l.href}" class="block rounded-xl px-3 py-2.5 text-sm font-medium ${on ? 'bg-sage-50 text-sage-700' : 'text-stone-700 hover:bg-stone-100'}" ${on ? 'aria-current="page"' : ''}>${l.label}</a>`
        : `<a href="${R()}${l.href}" class="rounded-lg px-3 py-2 text-sm font-medium transition ${on ? 'text-sage-700' : 'text-stone-600 hover:text-stone-900'}" ${on ? 'aria-current="page"' : ''}>${l.label}</a>`;
    };
    // ROLE GUARD (element-level): the Dashboard link carries data-role="admin" and is
    // removed for normal users by Auth.applyRoleVisibility().
    const adminLink = (mobile) => `<a data-role="admin" href="${R()}admin/dashboard.html" class="${mobile
      ? 'block rounded-xl px-3 py-2.5 text-sm font-medium ' + (active === 'admin' ? 'bg-sage-50 text-sage-700' : 'text-stone-700 hover:bg-stone-100')
      : 'rounded-lg px-3 py-2 text-sm font-medium transition ' + (active === 'admin' ? 'text-sage-700' : 'text-stone-600 hover:text-stone-900')}">Dashboard</a>`;

    return `
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">Skip to content</a>
    <div class="sticky top-0 z-40 border-b border-stone-200/80 bg-[#FAFAF9]/85 backdrop-blur">
      <nav class="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6" aria-label="Main">
        ${logo()}
        <div class="ml-4 hidden items-center lg:flex">${LINKS.map((l) => link(l)).join('')}${adminLink(false)}</div>

        <form id="nav-search" role="search" class="ml-auto hidden md:block">
          <label for="nav-q" class="sr-only">Search events</label>
          <div class="relative">
            <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">${icon('search', 'h-4 w-4')}</span>
            <input id="nav-q" type="search" placeholder="Search events…" autocomplete="off"
              class="w-56 rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-stone-400 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-100 xl:w-64">
          </div>
        </form>

        <div class="ml-auto flex items-center gap-1 md:ml-0">
          <button id="bell-btn" type="button" class="relative rounded-xl p-2 text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
            aria-label="Notifications" aria-haspopup="dialog" aria-controls="notif-drawer">
            ${icon('bell')}
            <span id="bell-count" class="absolute -right-0.5 -top-0.5 hidden min-w-[18px] rounded-full bg-sage-600 px-1 text-center text-[11px] font-semibold leading-[18px] text-white"></span>
          </button>

          <div class="relative">
            <button id="profile-btn" type="button" class="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-stone-100"
              aria-haspopup="menu" aria-expanded="false" aria-controls="profile-menu">
              <span class="grid h-8 w-8 place-items-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700">${esc(initials)}</span>
              <span class="hidden text-sm font-medium text-stone-700 sm:block">${esc((u.full_name || '').split(' ')[0])}</span>
            </button>
            <div id="profile-menu" role="menu" class="fade-in absolute right-0 mt-2 hidden w-60 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5">
              <div class="border-b border-stone-100 px-4 py-3">
                <p class="truncate text-sm font-semibold text-stone-900">${esc(u.full_name)}</p>
                <p class="truncate text-xs text-stone-500">${esc(u.email)}</p>
                <span class="mt-2 inline-block rounded-full ${u.role === 'admin' ? 'bg-sage-50 text-sage-700' : 'bg-stone-100 text-stone-600'} px-2 py-0.5 text-[11px] font-medium capitalize">${esc(u.role)}</span>
              </div>
              <div class="p-1.5">
                <a role="menuitem" href="${R()}profile.html" class="block rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100">My profile</a>
                <a role="menuitem" href="${R()}my-registrations.html" class="block rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100">My registrations</a>
                <a role="menuitem" data-role="admin" href="${R()}admin/dashboard.html" class="block rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100">Admin dashboard</a>
                <button role="menuitem" id="logout-btn" type="button" class="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Sign out</button>
              </div>
            </div>
          </div>

          <button id="menu-btn" type="button" class="rounded-xl p-2 text-stone-600 hover:bg-stone-100 lg:hidden" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">${icon('menu')}</button>
        </div>
      </nav>

      <div id="mobile-menu" class="hidden border-t border-stone-200 bg-white px-4 py-3 lg:hidden">
        <form id="nav-search-m" role="search" class="mb-2 md:hidden">
          <label for="nav-q-m" class="sr-only">Search events</label>
          <input id="nav-q-m" type="search" placeholder="Search events…" class="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-100">
        </form>
        ${LINKS.map((l) => link(l, true)).join('')}${adminLink(true)}
      </div>
    </div>

    <!-- Notification drawer -->
    <div id="notif-overlay" class="fixed inset-0 z-50 hidden bg-stone-900/30"></div>
    <aside id="notif-drawer" role="dialog" aria-modal="true" aria-labelledby="notif-title" aria-hidden="true"
      class="invisible fixed inset-y-0 right-0 z-50 flex w-full max-w-sm translate-x-full flex-col bg-white shadow-2xl transition-[transform,visibility] duration-300">
      <div class="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <h2 id="notif-title" class="font-display text-lg font-semibold text-stone-900">Notifications</h2>
        <button id="notif-close" type="button" class="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Close notifications">${icon('close')}</button>
      </div>
      <div id="notif-list" class="flex-1 overflow-y-auto p-3"></div>
      <div class="flex items-center justify-between border-t border-stone-100 px-5 py-3 text-sm">
        <button id="notif-markall" type="button" class="font-medium text-stone-500 hover:text-stone-800">Mark all as read</button>
        <a href="${R()}notifications.html" class="font-medium text-sage-700 hover:text-sage-800">View all</a>
      </div>
    </aside>`;
  }

  function footer() {
    return `
    <div class="mt-16 border-t border-stone-200">
      <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p><span class="font-display font-semibold text-stone-700">CivicEvents<span class="text-sage-600">+</span></span> · Bringing the community together.</p>
        <nav aria-label="Footer" class="flex gap-5">
          <a href="${R()}events.html" class="hover:text-stone-800">Events</a>
          <a href="${R()}announcements.html" class="hover:text-stone-800">Announcements</a>
          <a href="${R()}promos.html" class="hover:text-stone-800">Promos</a>
          <a href="${R()}profile.html" class="hover:text-stone-800">Profile</a>
        </nav>
      </div>
    </div>`;
  }

  // Admin sidebar, used on pages inside /admin/ (ROLE GUARD: those pages call Auth.requireAdmin()).
  function sidebar(activeAdmin) {
    const items = [
      ['dashboard', 'Overview', 'admin/dashboard.html'],
      ['users', 'Users', 'admin/users.html'],
      ['event-form', 'New event', 'admin/event-form.html'],
      ['announcement-form', 'New announcement', 'admin/announcement-form.html'],
      ['promo-form', 'New promo', 'admin/promo-form.html'],
    ];
    return `
    <nav aria-label="Admin" class="rounded-2xl border border-stone-200 bg-white p-2 lg:sticky lg:top-24">
      <p class="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">Admin</p>
      <div class="flex gap-1 overflow-x-auto lg:flex-col">
        ${items.map(([k, label, href]) => `<a href="${R()}${href}" class="whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium ${k === activeAdmin ? 'bg-sage-50 text-sage-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}" ${k === activeAdmin ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
      </div>
    </nav>`;
  }

  // ---------- Notifications in the drawer ----------
  let cache = [];
  async function loadNotifications() {
    try {
      const res = await Api.get('/notifications');
      cache = res.data || [];
    } catch (e) { cache = null; }
    renderBell();
    return cache;
  }
  function unreadCount() { const s = seen.all(); return (cache || []).filter((n) => !s.has(n.id)).length; }
  function renderBell() {
    const n = unreadCount();
    $('#bell-count').text(n > 9 ? '9+' : n).toggleClass('hidden', n === 0);
    $('#bell-btn').attr('aria-label', n ? `Notifications, ${n} unread` : 'Notifications');
  }
  function renderDrawer() {
    const $l = $('#notif-list');
    if (cache === null) return $l.html(UI.errorBox('Could not load notifications.'));
    if (!cache.length) return $l.html(UI.empty('All caught up', 'New events and updates will show up here.'));
    const s = seen.all();
    $l.html(cache.slice(0, 15).map((n) => `
      <a href="${notifLink(n)}" data-id="${esc(n.id)}" class="js-notif mb-1 flex gap-3 rounded-xl p-3 transition hover:bg-stone-50">
        <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.has(n.id) ? 'bg-transparent' : 'bg-sage-500'}" aria-hidden="true"></span>
        <span class="min-w-0">
          <span class="block text-sm ${s.has(n.id) ? 'text-stone-600' : 'font-semibold text-stone-900'}">${esc(n.title)}${s.has(n.id) ? '' : '<span class="sr-only"> (unread)</span>'}</span>
          <span class="mt-0.5 block text-sm text-stone-500 line-clamp-2">${esc(n.message)}</span>
          <span class="mt-1 block text-xs text-stone-400">${UI.fmtDateTime(n.created_at)}</span>
        </span>
      </a>`).join(''));
  }

  let lastFocus;
  function openDrawer() {
    lastFocus = document.activeElement;
    $('#notif-overlay').removeClass('hidden');
    $('#notif-drawer').removeClass('translate-x-full invisible').attr('aria-hidden', 'false');
    renderDrawer();
    loadNotifications().then(renderDrawer);
    setTimeout(() => $('#notif-close').trigger('focus'), 50);
  }
  function closeDrawer() {
    $('#notif-overlay').addClass('hidden');
    $('#notif-drawer').addClass('translate-x-full invisible').attr('aria-hidden', 'true');
    if (lastFocus) lastFocus.focus();
  }

  function wire() {
    const goSearch = (q) => { location.href = R() + 'events.html' + (q ? '?q=' + encodeURIComponent(q) : ''); };
    $('#nav-search').on('submit', (e) => { e.preventDefault(); goSearch($('#nav-q').val().trim()); });
    $('#nav-search-m').on('submit', (e) => { e.preventDefault(); goSearch($('#nav-q-m').val().trim()); });
    const q = new URLSearchParams(location.search).get('q');
    if (q) $('#nav-q, #nav-q-m').val(q);

    $('#profile-btn').on('click', (e) => {
      e.stopPropagation();
      const open = $('#profile-menu').toggleClass('hidden').is(':visible');
      $('#profile-btn').attr('aria-expanded', open);
    });
    $(document).on('click', (e) => {
      if (!$(e.target).closest('#profile-menu').length) { $('#profile-menu').addClass('hidden'); $('#profile-btn').attr('aria-expanded', 'false'); }
    });
    $('#menu-btn').on('click', () => {
      const open = $('#mobile-menu').toggleClass('hidden').is(':visible');
      $('#menu-btn').attr('aria-expanded', open);
    });
    $('#logout-btn').on('click', () => Auth.logout('You have been signed out.'));

    $('#bell-btn').on('click', openDrawer);
    $('#notif-close, #notif-overlay').on('click', closeDrawer);
    $(document).on('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!$('#notif-drawer').hasClass('translate-x-full')) closeDrawer();
      $('#profile-menu').addClass('hidden');
    });
    $(document).on('click', '.js-notif', function () { seen.add($(this).data('id')); });
    $('#notif-markall').on('click', () => { seen.add((cache || []).map((n) => n.id)); renderBell(); renderDrawer(); });
    $(document).on('click', '#notif-list .js-retry', () => loadNotifications().then(renderDrawer));
  }

  // Call once per protected page: Layout.init({ active: 'events', admin: 'users' })
  function init({ active = '', admin = '' } = {}) {
    $('#site-header').html(header(active));
    $('#site-footer').html(footer());
    if ($('#admin-sidebar').length) $('#admin-sidebar').html(sidebar(admin));
    Auth.applyRoleVisibility();
    wire();
    loadNotifications();
  }

  return { init, seen, notifLink, loadNotifications, renderBell, icon };
})();
