// Events list. The backend returns ALL events in one array (no server-side search,
// filters or paging), so searching, filtering and pagination happen here in the browser.
// ROLE GUARD 1: signed-in users only.
if (Auth.requireLogin()) {
  $(function () {
    Layout.init({ active: 'events' });

    const PER_PAGE = 9;
    let all = [];
    let myRegs = {};          // event_id -> registration status
    let page = 1;

    // Pick up ?q= from the navbar search.
    $('#f-q').val(Shared.param('q') || '');

    function card(ev) {
      const status = myRegs[ev.id];
      const badge = status === 'registered'
        ? '<span class="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-sage-700 shadow-sm">✓ Registered</span>'
        : Shared.isPast(ev) ? '<span class="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-stone-600 shadow-sm">Past event</span>' : '';
      return `
      <article class="fade-in group overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-900/5">
        <a href="event-detail.html?id=${encodeURIComponent(ev.id)}" class="block focus:outline-none" aria-label="${UI.esc(ev.title)}">
          <div class="relative">${Shared.eventCover(ev)}${badge}</div>
          <div class="flex gap-4 p-4">
            ${Shared.dateBlock(ev.starts_at)}
            <div class="min-w-0">
              <h2 class="font-display text-base font-semibold leading-snug text-stone-900 group-hover:text-sage-700">${UI.esc(ev.title)}</h2>
              <p class="mt-1 truncate text-sm text-stone-500">${UI.esc(ev.location || 'Location to be confirmed')}</p>
              <p class="mt-0.5 text-xs text-stone-400">${Shared.timeRange(ev.starts_at, ev.ends_at)}</p>
            </div>
          </div>
        </a>
      </article>`;
    }

    function filtered() {
      const q = $('#f-q').val().trim().toLowerCase();
      const when = $('#f-when').val();
      const loc = $('#f-loc').val();
      const day = $('#f-date').val();
      const now = Date.now(), DAY = 86400000;
      let list = all.filter((ev) => ev.published !== false);
      if (q) list = list.filter((ev) => (ev.title + ' ' + (ev.description || '') + ' ' + (ev.location || '')).toLowerCase().includes(q));
      if (loc) list = list.filter((ev) => (ev.location || '') === loc);
      if (day) {
        list = list.filter((ev) => Shared.toLocalInput(ev.starts_at).slice(0, 10) === day);
      } else if (when !== 'all') {
        list = list.filter((ev) => {
          const start = new Date(ev.starts_at).getTime();
          const end = new Date(ev.ends_at || ev.starts_at).getTime();
          if (when === 'past') return end < now;
          if (end < now) return false;
          if (when === 'week') return start <= now + 7 * DAY;
          if (when === 'month') return start <= now + 30 * DAY;
          return true;
        });
      }
      // Past events: newest first. Everything else: soonest first.
      list.sort((a, b) => (when === 'past' ? -1 : 1) * (new Date(a.starts_at) - new Date(b.starts_at)));
      return list;
    }

    function render() {
      const list = filtered();
      const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
      page = Math.min(page, pages);
      const slice = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

      $('#events-grid').attr('aria-busy', 'false').html(
        slice.length ? slice.map(card).join('') :
        all.length ? UI.empty('No events match', 'Try a different search or clear the filters.') :
        UI.empty('No events yet', 'When events are planned, they will appear here.'));
      $('#results-count').text(list.length === 1 ? '1 event' : `${list.length} events`);

      // Pager
      if (pages <= 1) return $('#pager').empty();
      const btn = (label, p, opts = {}) => `<button type="button" data-page="${p}" ${opts.disabled ? 'disabled' : ''} ${opts.current ? 'aria-current="page"' : ''}
        class="min-w-[2.25rem] rounded-xl px-3 py-2 text-sm font-medium transition ${opts.current ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'} disabled:opacity-40" ${opts.aria ? `aria-label="${opts.aria}"` : ''}>${label}</button>`;
      let html = btn('‹', page - 1, { disabled: page === 1, aria: 'Previous page' });
      for (let i = 1; i <= pages; i++) html += btn(i, i, { current: i === page, aria: 'Page ' + i });
      html += btn('›', page + 1, { disabled: page === pages, aria: 'Next page' });
      $('#pager').html(html);
    }

    function fillLocations() {
      const locs = [...new Set(all.map((e) => e.location).filter(Boolean))].sort();
      const cur = $('#f-loc').val();
      $('#f-loc').html('<option value="">All locations</option>' + locs.map((l) => `<option ${l === cur ? 'selected' : ''}>${UI.esc(l)}</option>`).join(''));
    }

    async function load() {
      // Show cached data instantly (if any), otherwise skeletons.
      const cached = Shared.cache.get('events');
      if (cached) { all = cached; fillLocations(); render(); }
      else $('#events-grid').attr('aria-busy', 'true').html(UI.skeletonCards(6));

      try {
        const [evRes, regRes] = await Promise.all([
          Api.get('/events'),
          Api.get('/event-registrations/my-registrations').catch(() => ({ data: [] })),
        ]);
        all = evRes.data || [];
        myRegs = {};
        (regRes.data || []).forEach((r) => { myRegs[r.event_id] = r.status; });
        Shared.cache.set('events', all);
        fillLocations();
        render();
      } catch (err) {
        if (!cached) { $('#events-grid').html(UI.errorBox(err.message)); $('#results-count').text(''); }
        else UI.toast('Showing saved events. ' + err.message, 'error');
      }
    }

    // Filters re-render instantly; typing is debounced a little.
    let t;
    $('#f-q').on('input', () => { clearTimeout(t); t = setTimeout(() => { page = 1; render(); }, 200); });
    $('#f-when, #f-loc').on('change', () => { page = 1; render(); });
    $('#f-date').on('change', () => { page = 1; render(); });
    $('#filters').on('submit', (e) => e.preventDefault());
    $('#pager').on('click', 'button[data-page]', function () {
      page = +$(this).data('page'); render();
      document.getElementById('main').scrollIntoView({ behavior: 'smooth' });
    });
    $(document).on('click', '#events-grid .js-retry', load);

    load();
  });
}
