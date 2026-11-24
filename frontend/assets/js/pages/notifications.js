// Notifications page: list, detail view, "seen" tracking, admin delete.
// The backend can't mark notifications as read, so "unread" = not yet opened by this user
// in this browser (see Layout.seen in layout.js).
// ROLE GUARD 1: signed-in users only.
if (Auth.requireLogin()) {
  $(function () {
    Layout.init({ active: '' });
    const admin = Auth.isAdmin();
    let items = [], filter = 'all', openId = Shared.param('id');

    const TYPE = {
      event: ['Event', 'bg-sage-50 text-sage-700'],
      promo: ['Promo', 'bg-stone-100 text-stone-700'],
      announcement: ['Announcement', 'bg-amber-50 text-amber-800'],
    };
    const typeBadge = (t) => { const [l, c] = TYPE[t] || [t || 'System', 'bg-stone-100 text-stone-600']; return `<span class="rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${c}">${UI.esc(l)}</span>`; };

    function renderList() {
      const seen = Layout.seen.all();
      const unread = items.filter((n) => !seen.has(n.id)).length;
      $('#n-sub').text(items.length ? `${items.length} total · ${unread} unread` : '');
      $('.js-f').each(function () {
        const on = $(this).data('f') === filter;
        $(this).attr('aria-pressed', on).toggleClass('bg-stone-900 text-white', on).toggleClass('text-stone-600', !on);
      });
      const list = filter === 'unread' ? items.filter((n) => !seen.has(n.id)) : items;
      $('#n-list').attr('aria-busy', 'false').html(list.length ? list.map((n) => {
        const isSeen = seen.has(n.id), on = n.id === openId;
        return `<li>
          <button type="button" data-id="${UI.esc(n.id)}" class="js-open flex w-full gap-3 rounded-2xl border p-4 text-left transition ${on ? 'border-sage-300 bg-sage-50/50' : 'border-stone-200 bg-white hover:border-stone-300'}" aria-current="${on}">
            <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full ${isSeen ? 'bg-transparent' : 'bg-sage-500'}" aria-hidden="true"></span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">${typeBadge(n.type)}<span class="text-xs text-stone-400">${UI.fmtDateTime(n.created_at)}</span></span>
              <span class="mt-1 block text-sm ${isSeen ? 'text-stone-700' : 'font-semibold text-stone-900'}">${UI.esc(n.title)}${isSeen ? '' : '<span class="sr-only"> (unread)</span>'}</span>
              <span class="mt-0.5 block truncate text-sm text-stone-500">${UI.esc(n.message)}</span>
            </span>
          </button></li>`;
      }).join('') : `<li>${UI.empty(filter === 'unread' ? 'All caught up' : 'No notifications', filter === 'unread' ? 'You have no unread notifications.' : 'New events and updates will appear here.')}</li>`);
    }

    async function openDetail(nid) {
      openId = nid;
      history.replaceState(null, '', '?id=' + encodeURIComponent(nid));
      Layout.seen.add(nid);
      Layout.renderBell();
      renderList();
      const $d = $('#n-detail').removeClass('hidden').html('<div class="skeleton h-6 w-1/2"></div><div class="skeleton mt-4 h-4 w-full"></div>');
      try {
        // Detail view uses GET /notifications/:id.
        const { data: n } = await Api.get('/notifications/' + nid);
        const link = Layout.notifLink(n);
        const hasTarget = !link.includes('notifications.html');
        $d.html(`
          <div class="fade-in">
            <div class="flex items-center gap-2">${typeBadge(n.type)}<span class="text-xs text-stone-400">${UI.fmtDateTime(n.created_at)}</span></div>
            <h2 class="mt-3 font-display text-xl font-semibold text-stone-900">${UI.esc(n.title)}</h2>
            <p class="mt-2 leading-relaxed text-stone-600">${UI.esc(n.message)}</p>
            <div class="mt-6 flex flex-wrap gap-2">
              ${hasTarget ? `<a href="${link}" class="rounded-xl bg-sage-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-700">Open ${UI.esc((TYPE[n.type] || ['item'])[0].toLowerCase())}</a>` : ''}
              ${admin ? `<!-- ROLE GUARD: delete is admin-only -->
              <button id="n-del" type="button" class="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Delete notification</button>` : ''}
            </div>
          </div>`);
        if (window.innerWidth < 1024) $d[0].scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        $d.html(err.status === 404 ? UI.empty('Notification not found', 'It may have been deleted.') : `<p class="text-sm text-red-700">${UI.esc(err.message)}</p>`);
      }
    }

    async function load() {
      $('#n-list').html(Array.from({ length: 4 }, () => '<li class="skeleton h-20 w-full"></li>').join(''));
      try {
        const res = await Api.get('/notifications');
        items = res.data || [];
        renderList();
        if (openId) openDetail(openId);
      } catch (err) { $('#n-list').html(`<li>${UI.errorBox(err.message)}</li>`); }
    }

    $('#n-list').on('click', '.js-open', function () { openDetail($(this).data('id')); });
    $('.js-f').on('click', function () { filter = $(this).data('f'); renderList(); });
    $('#mark-all').on('click', () => { Layout.seen.add(items.map((n) => n.id)); Layout.renderBell(); renderList(); UI.toast('All notifications marked as read.', 'success'); });

    // Admin delete with optimistic removal.
    $('#n-detail').on('click', '#n-del', async function () {
      if (!(await UI.confirm({ title: 'Delete this notification?', message: 'It will disappear for every user.', confirmText: 'Delete', danger: true }))) return;
      const before = items;
      items = items.filter((n) => n.id !== openId);
      $('#n-detail').addClass('hidden'); renderList();
      try {
        await Api.del('/notifications/' + openId);
        UI.toast('Notification deleted.', 'success');
        openId = null; history.replaceState(null, '', 'notifications.html');
        Layout.loadNotifications();
      } catch (err) { items = before; renderList(); UI.toast(err.message, 'error'); }
    });
    $(document).on('click', '#n-list .js-retry', load);
    load();
  });
}
