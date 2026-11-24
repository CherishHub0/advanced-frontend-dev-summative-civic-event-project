// Promo detail: video player + captions built in the browser from caption_text.
// The backend stores captions as plain text (no .vtt file), so we turn each sentence into a
// WebVTT cue, spread evenly over the video's length, and attach it as a <track>.
// ROLE GUARD 1: signed-in users only.
if (Auth.requireLogin()) {
  $(function () {
    Layout.init({ active: 'promos' });
    const id = Shared.param('id');
    const admin = Auth.isAdmin();
    const $root = $('#promo');
    if (!id) return $root.html(UI.errorBox('No promo was selected.'));

    const sentences = (text) => String(text || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const vttTime = (s) => {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = (s % 60).toFixed(3);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${sec.padStart(6, '0')}`;
    };
    function buildCaptions(video, text) {
      const lines = sentences(text);
      if (!lines.length || !isFinite(video.duration)) return;
      const step = video.duration / lines.length;
      const vtt = 'WEBVTT\n\n' + lines.map((l, i) => `${i + 1}\n${vttTime(i * step)} --> ${vttTime((i + 1) * step)}\n${l}\n`).join('\n');
      const track = document.createElement('track');
      track.kind = 'captions'; track.label = 'English'; track.srclang = 'en'; track.default = true;
      track.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
      video.appendChild(track);
      track.addEventListener('load', () => { video.textTracks[0].mode = 'showing'; });
      // Highlight the current transcript line while the video plays.
      video.addEventListener('timeupdate', () => {
        const i = Math.min(lines.length - 1, Math.floor(video.currentTime / step));
        $('#transcript li').removeClass('bg-sage-50 text-stone-900').eq(i).addClass('bg-sage-50 text-stone-900');
      });
    }

    function render(p) {
      document.title = p.title + ' · CivicEvents+';
      const lines = sentences(p.caption_text);
      $root.attr('aria-busy', 'false').html(`
        <div class="fade-in grid gap-8 lg:grid-cols-[1fr_300px]">
          <div class="min-w-0">
            <div class="overflow-hidden rounded-3xl bg-black">
              <video id="player" controls playsinline preload="metadata" class="aspect-video w-full" src="${UI.esc(p.video_url)}" aria-label="${UI.esc(p.title)}">
                Your browser can't play this video. <a href="${UI.esc(p.video_url)}">Download it</a>.
              </video>
            </div>
            ${!p.published ? '<p class="mt-4 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">Hidden: only admins can see this promo.</p>' : ''}
            <h1 class="mt-6 font-display text-3xl font-bold tracking-tight text-stone-900">${UI.esc(p.title)}</h1>
            <p class="mt-1 text-sm text-stone-500">${UI.fmtDate(p.created_at)}</p>
            <p class="mt-4 whitespace-pre-line leading-relaxed text-stone-600">${UI.esc(p.description || '')}</p>
            ${admin ? `
            <!-- ROLE GUARD: admin-only actions -->
            <div class="mt-8 flex flex-wrap gap-2 border-t border-stone-100 pt-6">
              <a href="admin/promo-form.html?id=${encodeURIComponent(p.id)}" class="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Edit</a>
              <button id="toggle-btn" type="button" class="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">${p.published ? 'Unpublish' : 'Publish'}</button>
              <button id="delete-btn" type="button" class="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Delete</button>
            </div>` : ''}
          </div>
          <aside class="lg:sticky lg:top-24 lg:self-start">
            <div class="rounded-2xl border border-stone-200 bg-white p-5">
              <h2 class="text-sm font-semibold text-stone-800">Transcript</h2>
              <ol id="transcript" class="mt-3 space-y-1 text-sm leading-relaxed text-stone-500">
                ${lines.length ? lines.map((l) => `<li class="rounded-lg px-2 py-1 transition">${UI.esc(l)}</li>`).join('') : '<li>No captions for this video.</li>'}
              </ol>
            </div>
          </aside>
        </div>`);
      const video = document.getElementById('player');
      video.addEventListener('loadedmetadata', () => buildCaptions(video, p.caption_text), { once: true });
      video.addEventListener('error', () => UI.toast('This video could not be played in your browser. MP4 works best.', 'error'));

      $('#toggle-btn').on('click', async function () {
        UI.btnLoading(this, true, 'Saving…');
        try {
          const res = await Api.patch(`/promos/${p.id}/${p.published ? 'unpublish' : 'publish'}`);
          Shared.cache.drop('promos');
          UI.toast(p.published ? 'Hidden from users.' : 'Published. Users have been notified.', 'success');
          render(res.data || { ...p, published: !p.published });
        } catch (err) { UI.btnLoading(this, false); UI.toast(err.message, 'error'); }
      });
      $('#delete-btn').on('click', async function () {
        if (!(await UI.confirm({ title: 'Delete this promo?', message: 'The video will be removed for everyone.', confirmText: 'Delete', danger: true }))) return;
        try { await Api.del('/promos/' + p.id); Shared.cache.drop('promos'); UI.flash('Promo deleted.', 'success'); location.href = 'promos.html'; }
        catch (err) { UI.toast(err.message, 'error'); }
      });
    }

    async function load() {
      try {
        const res = await Api.get('/promos/' + id);
        if (!res.data.published && !admin) return $root.attr('aria-busy', 'false').html(UI.empty('Not available', 'This promo is no longer available.'));
        render(res.data);
      } catch (err) {
        $root.attr('aria-busy', 'false').html(err.status === 404 ? UI.empty('Promo not found', 'It may have been removed.') : UI.errorBox(err.message));
      }
    }
    $(document).on('click', '#promo .js-retry', load);
    load();
  });
}
