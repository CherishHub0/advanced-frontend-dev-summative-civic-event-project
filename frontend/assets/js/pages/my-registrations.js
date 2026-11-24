// My registrations: upcoming / past / cancelled, with each event's feedback status.
// ROLE GUARD 1: signed-in users only.
if (Auth.requireLogin()) {
  $(function () {
    Layout.init({ active: 'registrations' });
    let regs = [], feedback = {}, tab = 'upcoming';

    function inTab(r) {
      if (tab === 'cancelled') return r.status === 'cancelled';
      if (r.status === 'cancelled') return false;
      return tab === 'past' ? Shared.isPast(r) : !Shared.isPast(r);
    }

    function row(r) {
      const fb = feedback[r.event_id];
      const link = 'event-detail.html?id=' + encodeURIComponent(r.event_id);
      let right = '';
      if (r.status === 'cancelled') right = '<span class="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-500">Cancelled</span>';
      else {
        const starsHtml = fb ? `<span class="flex" title="Your rating: ${fb.rating} of 5" aria-label="Your rating: ${fb.rating} of 5">${Shared.stars(fb.rating, 'h-3.5 w-3.5')}</span>` : '';
        if (Shared.isPast(r)) right = starsHtml || `<a href="${link}#fb-mine" class="rounded-lg px-3 py-1.5 text-sm font-medium text-sage-700 hover:bg-sage-50">Leave feedback</a>`;
        else right = `<span class="flex items-center gap-3">${starsHtml}<button type="button" class="js-cancel rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800" data-id="${UI.esc(r.event_id)}">Cancel</button></span>`;
      }
      return `
      <div class="fade-in flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition hover:shadow-md hover:shadow-stone-900/5">
        ${Shared.dateBlock(r.starts_at)}
        <a href="${link}" class="min-w-0 flex-1">
          <p class="truncate font-display font-semibold text-stone-900 hover:text-sage-700">${UI.esc(r.title)}</p>
          <p class="truncate text-sm text-stone-500">${UI.esc(r.location || 'Location to be confirmed')} · ${Shared.timeRange(r.starts_at, r.ends_at)}</p>
        </a>
        <div class="shrink-0">${right}</div>
      </div>`;
    }

    function render() {
      $('.js-tab').each(function () {
        const on = $(this).data('tab') === tab;
        $(this).attr('aria-selected', on).toggleClass('bg-stone-900 text-white', on).toggleClass('text-stone-600 hover:text-stone-900', !on);
      });
      const list = regs.filter(inTab).sort((a, b) => (tab === 'upcoming' ? 1 : -1) * (new Date(a.starts_at) - new Date(b.starts_at)));
      const empties = {
        upcoming: ['Nothing planned yet', 'Browse events and register for something that interests you.'],
        past: ['No past events', 'Events you attended will show up here.'],
        cancelled: ['No cancellations', 'Registrations you cancel will appear here.'],
      };
      $('#reg-list').attr('aria-busy', 'false').html(list.length ? list.map(row).join('') :
        UI.empty(...empties[tab]) + (tab === 'upcoming' ? '<div class="mt-4 text-center"><a href="events.html" class="inline-block rounded-xl bg-sage-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sage-700">Browse events</a></div>' : ''));
    }

    async function load() {
      $('#reg-list').attr('aria-busy', 'true').html(Array.from({ length: 3 }, () => '<div class="skeleton h-20 w-full"></div>').join(''));
      try {
        const [r, f] = await Promise.all([
          Api.get('/event-registrations/my-registrations'),
          Api.get('/event-feedback/my-feedback').catch(() => ({ data: [] })),
        ]);
        regs = r.data || [];
        feedback = {};
        (f.data || []).forEach((x) => { feedback[x.event_id] = x; });
        render();
      } catch (err) {
        $('#reg-list').attr('aria-busy', 'false').html(UI.errorBox(err.message));
      }
    }

    $('.js-tab').on('click', function () { tab = $(this).data('tab'); render(); });
    // Arrow keys move between tabs (accessibility).
    $('[role="tablist"]').on('keydown', '.js-tab', function (e) {
      const tabs = $('.js-tab'); const i = tabs.index(this);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const next = tabs.eq((i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length);
        next.trigger('focus').trigger('click');
      }
    });

    // Cancel with optimistic update.
    $('#reg-list').on('click', '.js-cancel', async function () {
      const eventId = $(this).data('id');
      const ok = await UI.confirm({ title: 'Cancel this registration?', message: 'You won\'t be able to register for this event again afterwards.', confirmText: 'Yes, cancel', danger: true });
      if (!ok) return;
      const r = regs.find((x) => x.event_id === eventId);
      r.status = 'cancelled'; render();
      try {
        await Api.post('/event-registrations/cancel', { event_id: eventId });
        Shared.cache.drop('events');
        UI.toast('Registration cancelled.', 'info');
      } catch (err) {
        r.status = 'registered'; render();
        UI.toast(err.message, 'error');
      }
    });
    $(document).on('click', '#reg-list .js-retry', load);

    load();
  });
}
