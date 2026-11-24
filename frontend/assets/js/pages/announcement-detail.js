// Announcement detail with an accessible audio player.
// ROLE GUARD 1: signed-in users only.
if (Auth.requireLogin()) {
  $(function () {
    Layout.init({ active: 'announcements' });
    const id = Shared.param('id');
    const admin = Auth.isAdmin();
    const $root = $('#ann');
    if (!id) return $root.html(UI.errorBox('No announcement was selected.'));

    function render(a) {
      document.title = a.title + ' · CivicEvents+';
      $root.attr('aria-busy', 'false').html(`
        <article class="fade-in overflow-hidden rounded-3xl border border-stone-200 bg-white">
          <div class="relative bg-sage-800 px-6 py-10 text-sage-50 sm:px-10">
            <div class="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-sage-700/60" aria-hidden="true"></div>
            <!-- Calm "waveform" decoration -->
            <div class="relative flex h-10 items-end gap-1 opacity-60" aria-hidden="true">
              ${Array.from({ length: 40 }, (_, i) => `<span class="w-1 rounded-full bg-sage-200" style="height:${20 + Math.abs(Math.sin(i * 0.7)) * 80}%"></span>`).join('')}
            </div>
            <p class="relative mt-6 text-sm text-sage-200">Announcement · ${UI.fmtDate(a.created_at)}</p>
            <h1 class="relative mt-1 font-display text-3xl font-bold tracking-tight">${UI.esc(a.title)}</h1>
          </div>
          <div class="p-6 sm:p-10">
            ${!a.published ? '<p class="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">Hidden: only admins can see this announcement.</p>' : ''}
            <audio id="player" controls preload="metadata" class="w-full" src="${UI.esc(a.audio_url)}">
              Your browser doesn't support audio playback. <a href="${UI.esc(a.audio_url)}">Download the file</a>.
            </audio>
            <dl class="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div class="rounded-xl bg-stone-100/70 p-3"><dt class="text-xs text-stone-500">Length</dt><dd id="dur" class="font-medium text-stone-800">…</dd></div>
              <div class="rounded-xl bg-stone-100/70 p-3"><dt class="text-xs text-stone-500">Posted</dt><dd class="font-medium text-stone-800">${UI.fmtDateTime(a.created_at)}</dd></div>
              <div class="col-span-2 rounded-xl bg-stone-100/70 p-3 sm:col-span-1"><dt class="text-xs text-stone-500">Format</dt><dd class="font-medium uppercase text-stone-800">${UI.esc((a.audio_url.split('.').pop() || '').slice(0, 4))}</dd></div>
            </dl>
            <p class="mt-4 text-xs text-stone-400">No written transcript is available for this recording.</p>
            ${admin ? `
            <!-- ROLE GUARD: admin-only actions -->
            <div class="mt-8 flex flex-wrap gap-2 border-t border-stone-100 pt-6">
              <a href="admin/announcement-form.html?id=${encodeURIComponent(a.id)}" class="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Edit</a>
              <button id="toggle-btn" type="button" class="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">${a.published ? 'Unpublish' : 'Publish'}</button>
              <button id="delete-btn" type="button" class="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Delete</button>
            </div>` : ''}
          </div>
        </article>`);
      // Duration comes from the audio file (the backend doesn't store it).
      $('#player').on('loadedmetadata', function () {
        const s = this.duration;
        $('#dur').text(isFinite(s) ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} sec` : 'Unknown');
      }).on('error', () => { $('#dur').text('Unavailable'); UI.toast('The audio file could not be loaded.', 'error'); });

      $('#toggle-btn').on('click', async function () {
        UI.btnLoading(this, true, 'Saving…');
        try {
          const res = await Api.patch(`/announcements/${a.id}/${a.published ? 'unpublish' : 'publish'}`);
          Shared.cache.drop('announcements');
          UI.toast(a.published ? 'Hidden from users.' : 'Published.', 'success');
          render(res.data || { ...a, published: !a.published });
        } catch (err) { UI.btnLoading(this, false); UI.toast(err.message, 'error'); }
      });
      $('#delete-btn').on('click', async function () {
        if (!(await UI.confirm({ title: 'Delete this announcement?', message: 'It will be removed for everyone.', confirmText: 'Delete', danger: true }))) return;
        try { await Api.del('/announcements/' + a.id); Shared.cache.drop('announcements'); UI.flash('Announcement deleted.', 'success'); location.href = 'announcements.html'; }
        catch (err) { UI.toast(err.message, 'error'); }
      });
    }

    async function load() {
      try {
        const res = await Api.get('/announcements/' + id);
        const a = res.data;
        if (!a.published && !admin) return $root.attr('aria-busy', 'false').html(UI.empty('Not available', 'This announcement is no longer available.'));
        render(a);
      } catch (err) {
        $root.attr('aria-busy', 'false').html(err.status === 404 ? UI.empty('Announcement not found', 'It may have been removed.') : UI.errorBox(err.message));
      }
    }
    $(document).on('click', '#ann .js-retry', load);
    load();
  });
}
