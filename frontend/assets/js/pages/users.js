// Admin user management: list, search, enable/disable. Roles are never changed.
// ROLE GUARD 2: admins only.
if (Auth.requireAdmin()) {
  $(function () {
    Layout.init({ active: 'admin', admin: 'users' });
    const PER_PAGE = 10;
    const meId = Auth.user()?.id;
    let users = [], page = 1;

    function row(u) {
      const active = u.is_active !== false;
      const self = u.id === meId;
      return `<tr class="fade-in">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full ${active ? 'bg-sage-50 text-sage-700' : 'bg-stone-100 text-stone-400'} text-xs font-semibold">${UI.esc((u.full_name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase())}</span>
            <div class="min-w-0"><p class="truncate font-medium text-stone-900">${UI.esc(u.full_name)}${self ? ' <span class="text-xs font-normal text-stone-400">(you)</span>' : ''}</p><p class="truncate text-xs text-stone-500">${UI.esc(u.email)}</p></div>
          </div>
        </td>
        <td class="hidden px-4 py-3 capitalize text-stone-600 md:table-cell">${UI.esc(u.role)}</td>
        <td class="hidden px-4 py-3 text-stone-500 sm:table-cell">${UI.fmtDate(u.created_at)}</td>
        <td class="px-4 py-3"><span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-sage-50 text-sage-700' : 'bg-red-50 text-red-700'}"><span class="h-1.5 w-1.5 rounded-full ${active ? 'bg-sage-500' : 'bg-red-500'}"></span>${active ? 'Active' : 'Disabled'}</span></td>
        <td class="px-4 py-3 text-right">
          <button type="button" class="js-view mr-1 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100" data-id="${UI.esc(u.id)}" aria-label="View ${UI.esc(u.full_name)}">View</button>
          ${self ? '' : `<button type="button" class="js-toggle rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium ${active ? 'text-red-700 hover:bg-red-50' : 'text-sage-700 hover:bg-sage-50'}" data-id="${UI.esc(u.id)}">${active ? 'Disable' : 'Enable'}</button>`}
        </td></tr>`;
    }

    function render() {
      const q = $('#u-q').val().trim().toLowerCase();
      const st = $('#u-status').val();
      const list = users.filter((u) => (!q || (u.full_name + ' ' + u.email).toLowerCase().includes(q))
        && (!st || (st === 'active' ? u.is_active !== false : u.is_active === false)));
      const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
      page = Math.min(page, pages);
      const slice = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
      $('#u-body').html(slice.length ? slice.map(row).join('') : `<tr><td colspan="5" class="px-4 py-12 text-center text-sm text-stone-500">No users match.</td></tr>`);
      if (pages <= 1) return $('#pager').empty();
      let html = '';
      for (let i = 1; i <= pages; i++) html += `<button type="button" data-page="${i}" ${i === page ? 'aria-current="page"' : ''} class="min-w-[2.25rem] rounded-xl px-3 py-2 text-sm font-medium ${i === page ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}" aria-label="Page ${i}">${i}</button>`;
      $('#pager').html(html);
    }

    async function load() {
      $('#u-body').html(Array.from({ length: 5 }, () => '<tr><td colspan="5" class="px-4 py-3"><div class="skeleton h-9 w-full"></div></td></tr>').join(''));
      try {
        // The API pages users but doesn't return a total, so we fetch a large page once and page locally.
        const res = await Api.get('/users', { page: 1, limit: 500 });
        users = res.data || [];
        render();
      } catch (err) {
        $('#u-body').html(`<tr><td colspan="5" class="p-4">${UI.errorBox(err.message)}</td></tr>`);
      }
    }

    // Enable / disable with optimistic update.
    $('#u-body').on('click', '.js-toggle', async function () {
      const u = users.find((x) => x.id === $(this).data('id'));
      const disabling = u.is_active !== false;
      if (disabling && !(await UI.confirm({ title: `Disable ${u.full_name}?`, message: 'They won\'t be able to sign in until you enable them again.', confirmText: 'Disable', danger: true }))) return;
      u.is_active = !disabling; render();
      try {
        await Api.patch(`/users/${u.id}/${disabling ? 'disable' : 'enable'}`);
        UI.toast(`${u.full_name} ${disabling ? 'disabled' : 'enabled'}.`, 'success');
      } catch (err) { u.is_active = disabling; render(); UI.toast(err.message, 'error'); }
    });

    // View a single user's profile (GET /users/:id) in a dialog.
    $('#u-body').on('click', '.js-view', async function () {
      const prev = this;
      const $wrap = $(`<div class="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/40 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="uv-title" class="fade-in w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <div id="uv-body"><div class="skeleton h-6 w-1/2"></div><div class="skeleton mt-4 h-24 w-full"></div></div>
          <div class="mt-6 flex justify-end"><button type="button" class="js-close rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Close</button></div>
        </div></div>`).appendTo('body');
      const close = () => { $wrap.remove(); $(document).off('keydown.uv'); prev.focus(); };
      $wrap.on('click', (e) => { if (e.target === $wrap[0] || $(e.target).closest('.js-close').length) close(); });
      $(document).on('keydown.uv', (e) => { if (e.key === 'Escape') close(); });
      $wrap.find('.js-close').trigger('focus');
      try {
        const { data: u } = await Api.get('/users/' + $(this).data('id'));
        const row = (k, v) => `<div class="flex justify-between gap-4 border-b border-stone-100 py-2.5 text-sm"><dt class="text-stone-500">${k}</dt><dd class="text-right font-medium text-stone-800">${v}</dd></div>`;
        $('#uv-body').html(`
          <h2 id="uv-title" class="font-display text-xl font-semibold text-stone-900">${UI.esc(u.full_name)}</h2>
          <p class="text-sm text-stone-500">${UI.esc(u.email)}</p>
          <dl class="mt-4">
            ${row('Role', `<span class="capitalize">${UI.esc(u.role)}</span>`)}
            ${row('Status', u.is_active === false ? '<span class="text-red-700">Disabled</span>' : '<span class="text-sage-700">Active</span>')}
            ${row('Joined', UI.fmtDateTime(u.created_at))}
            ${row('Last updated', UI.fmtDateTime(u.updated_at))}
          </dl>
          <p class="mt-3 text-xs text-stone-400">Roles can't be changed from the admin panel.</p>`);
      } catch (err) {
        $('#uv-body').html(`<p id="uv-title" class="text-sm text-red-700">${UI.esc(err.message)}</p>`);
      }
    });

    let t;
    $('#u-q').on('input', () => { clearTimeout(t); t = setTimeout(() => { page = 1; render(); }, 150); });
    $('#u-status').on('change', () => { page = 1; render(); });
    $('#pager').on('click', 'button[data-page]', function () { page = +$(this).data('page'); render(); });
    $(document).on('click', '#u-body .js-retry', load);
    load();
  });
}
