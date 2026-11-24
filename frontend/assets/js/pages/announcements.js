// Announcements list (audio). Quick-play right from the list with one shared player.
// ROLE GUARD 1: signed-in users only.
if (Auth.requireLogin()) {
  $(function () {
    Layout.init({ active: 'announcements' });
    const admin = Auth.isAdmin();
    let items = [];
    const player = new Audio();
    let playingId = null;

    const fmtDur = (s) => (!s || !isFinite(s)) ? '' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

    function row(a) {
      const playing = playingId === a.id && !player.paused;
      return `
      <div class="fade-in flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition hover:shadow-md hover:shadow-stone-900/5">
        <button type="button" class="js-play grid h-11 w-11 shrink-0 place-items-center rounded-full ${playing ? 'bg-sage-600 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'} transition"
          data-id="${UI.esc(a.id)}" aria-label="${playing ? 'Pause' : 'Play'} ${UI.esc(a.title)}">
          ${playing ? '<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="3.5" height="12" rx="1"/><rect x="11.5" y="4" width="3.5" height="12" rx="1"/></svg>'
                    : '<svg class="ml-0.5 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6 4.5v11a1 1 0 0 0 1.5.86l9-5.5a1 1 0 0 0 0-1.72l-9-5.5A1 1 0 0 0 6 4.5Z"/></svg>'}
        </button>
        <a href="announcement-detail.html?id=${encodeURIComponent(a.id)}" class="min-w-0 flex-1">
          <p class="truncate font-display font-semibold text-stone-900 hover:text-sage-700">${UI.esc(a.title)}</p>
          <p class="text-sm text-stone-500">${UI.fmtDate(a.created_at)}<span class="js-dur" data-src="${UI.esc(a.audio_url)}"></span></p>
        </a>
        ${admin ? `
        <!-- ROLE GUARD: admin-only controls (only rendered when Auth.isAdmin()) -->
        <div class="flex shrink-0 items-center gap-1">
          <button type="button" class="js-toggle rounded-full px-2.5 py-1 text-xs font-medium ${a.published ? 'bg-sage-50 text-sage-700' : 'bg-amber-50 text-amber-800'}" data-id="${UI.esc(a.id)}"
            aria-label="${a.published ? 'Published. Click to unpublish' : 'Hidden. Click to publish'}">${a.published ? 'Published' : 'Hidden'}</button>
          <button type="button" class="js-del rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-700" data-id="${UI.esc(a.id)}" aria-label="Delete ${UI.esc(a.title)}">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.35 9m-4.78 0-.35-9m9.97-3.21c.34.05.68.1 1.02.17M4.77 5.79a48 48 0 0 1 3.48-.4m11.27.4L18.16 19.67A2.25 2.25 0 0 1 15.92 21.75H8.08a2.25 2.25 0 0 1-2.24-2.08L4.77 5.79m14.46 0a48.1 48.1 0 0 0-3.48-.4m-12 .4c.34-.06.68-.11 1.02-.17m10.98-.23V4.48c0-1.18-.91-2.16-2.09-2.2a51.96 51.96 0 0 0-3.32 0c-1.18.04-2.09 1.02-2.09 2.2v.91"/></svg>
          </button>
        </div>` : ''}
      </div>`;
    }

    function render() {
      const q = $('#a-q').val().trim().toLowerCase();
      // Normal users only see published announcements (the API returns hidden ones too).
      const list = items.filter((a) => (admin || a.published) && (!q || a.title.toLowerCase().includes(q)));
      $('#ann-list').attr('aria-busy', 'false').html(list.length ? list.map(row).join('') :
        UI.empty(items.length ? 'No matches' : 'No announcements yet', items.length ? 'Try another search.' : 'Audio updates will appear here.'));
      // Read each clip's duration from the audio file itself (the backend doesn't store it).
      $('.js-dur').each(function () {
        const span = this, a = new Audio();
        a.preload = 'metadata';
        a.onloadedmetadata = () => { if (fmtDur(a.duration)) span.textContent = ' · ' + fmtDur(a.duration); };
        a.src = $(span).data('src');
      });
    }

    async function load() {
      const cached = Shared.cache.get('announcements');
      if (cached) { items = cached; render(); }
      else $('#ann-list').html(Array.from({ length: 4 }, () => '<div class="skeleton h-20 w-full"></div>').join(''));
      try {
        const res = await Api.get('/announcements', { limit: 100 });
        items = res.data || [];
        Shared.cache.set('announcements', items);
        render();
      } catch (err) {
        if (!cached) $('#ann-list').html(UI.errorBox(err.message));
      }
    }

    $('#ann-list').on('click', '.js-play', function () {
      const a = items.find((x) => x.id === $(this).data('id'));
      if (playingId === a.id && !player.paused) player.pause();
      else {
        if (playingId !== a.id) { player.src = a.audio_url; playingId = a.id; }
        player.play().catch(() => UI.toast('This audio file could not be played.', 'error'));
      }
    });
    $(player).on('play pause ended', render);

    // Admin: publish / unpublish with optimistic update.
    $('#ann-list').on('click', '.js-toggle', async function () {
      const a = items.find((x) => x.id === $(this).data('id'));
      const was = a.published;
      a.published = !was; render();
      try {
        await Api.patch(`/announcements/${a.id}/${was ? 'unpublish' : 'publish'}`);
        Shared.cache.drop('announcements');
        UI.toast(was ? 'Announcement hidden from users.' : 'Announcement published.', 'success');
      } catch (err) { a.published = was; render(); UI.toast(err.message, 'error'); }
    });
    $('#ann-list').on('click', '.js-del', async function () {
      const a = items.find((x) => x.id === $(this).data('id'));
      if (!(await UI.confirm({ title: 'Delete this announcement?', message: `"${a.title}" will be removed for everyone.`, confirmText: 'Delete', danger: true }))) return;
      const before = items;
      items = items.filter((x) => x.id !== a.id); render();
      try { await Api.del('/announcements/' + a.id); Shared.cache.drop('announcements'); UI.toast('Announcement deleted.', 'success'); }
      catch (err) { items = before; render(); UI.toast(err.message, 'error'); }
    });

    let t;
    $('#a-q').on('input', () => { clearTimeout(t); t = setTimeout(render, 150); });
    $(document).on('click', '#ann-list .js-retry', load);
    load();
  });
}
