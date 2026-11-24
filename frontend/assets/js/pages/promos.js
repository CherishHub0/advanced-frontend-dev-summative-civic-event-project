// Promos list (video). The backend paginates promos (?page=&limit=), so paging is server-side here.
// ROLE GUARD 1: signed-in users only.
if (Auth.requireLogin()) {
  $(function () {
    Layout.init({ active: 'promos' });
    const admin = Auth.isAdmin();
    const LIMIT = 9;
    let page = +(Shared.param('page') || 1);

    function card(p) {
      return `
      <article class="fade-in group overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-900/5">
        <a href="promo-detail.html?id=${encodeURIComponent(p.id)}" class="block">
          <div class="relative aspect-video bg-stone-900">
            <!-- preload="metadata" + #t=1 shows a frame as the thumbnail without downloading the whole video -->
            <video src="${UI.esc(p.video_url)}#t=1" preload="metadata" muted playsinline class="h-full w-full object-cover opacity-90" aria-hidden="true" tabindex="-1"></video>
            <span class="absolute inset-0 grid place-items-center">
              <span class="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-stone-900 shadow transition group-hover:scale-105">
                <svg class="ml-0.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6 4.5v11a1 1 0 0 0 1.5.86l9-5.5a1 1 0 0 0 0-1.72l-9-5.5A1 1 0 0 0 6 4.5Z"/></svg>
              </span>
            </span>
            <span class="absolute bottom-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">CC</span>
            ${admin && !p.published ? '<span class="absolute right-2 top-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">Hidden</span>' : ''}
          </div>
          <div class="p-4">
            <h2 class="font-display font-semibold text-stone-900 group-hover:text-sage-700">${UI.esc(p.title)}</h2>
            <p class="mt-1 line-clamp-2 text-sm text-stone-500">${UI.esc(p.description || '')}</p>
            <p class="mt-2 text-xs text-stone-400">${UI.fmtDate(p.created_at)}</p>
          </div>
        </a>
      </article>`;
    }

    function pager(pg) {
      if (!pg || pg.pages <= 1) return $('#pager').empty();
      const btn = (label, p, o = {}) => `<button type="button" data-page="${p}" ${o.disabled ? 'disabled' : ''} ${o.current ? 'aria-current="page"' : ''} ${o.aria ? `aria-label="${o.aria}"` : ''}
        class="min-w-[2.25rem] rounded-xl px-3 py-2 text-sm font-medium ${o.current ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'} disabled:opacity-40">${label}</button>`;
      let html = btn('‹', page - 1, { disabled: page <= 1, aria: 'Previous page' });
      for (let i = 1; i <= pg.pages; i++) html += btn(i, i, { current: i === page, aria: 'Page ' + i });
      html += btn('›', page + 1, { disabled: page >= pg.pages, aria: 'Next page' });
      $('#pager').html(html);
    }

    async function load() {
      const key = 'promos_p' + page;
      const cached = Shared.cache.get(key);
      const show = (res) => {
        // Normal users only see published promos.
        const list = (res.data || []).filter((p) => admin || p.published);
        $('#promo-grid').attr('aria-busy', 'false').html(list.length ? list.map(card).join('') : UI.empty('No promos yet', 'Promo videos will show up here.'));
        pager(res.pagination);
      };
      if (cached) show(cached); else $('#promo-grid').attr('aria-busy', 'true').html(UI.skeletonCards(6));
      try {
        const res = await Api.get('/promos', { page, limit: LIMIT });
        Shared.cache.set(key, res);
        show(res);
      } catch (err) {
        if (!cached) $('#promo-grid').html(UI.errorBox(err.message));
      }
    }

    $('#pager').on('click', 'button[data-page]', function () {
      page = +$(this).data('page');
      history.replaceState(null, '', '?page=' + page);
      load();
      document.getElementById('main').scrollIntoView({ behavior: 'smooth' });
    });
    $(document).on('click', '#promo-grid .js-retry', load);
    load();
  });
}
