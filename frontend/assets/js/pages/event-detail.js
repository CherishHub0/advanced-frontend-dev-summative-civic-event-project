// Event detail: info, register/cancel, the user's own feedback, and admin-only extras
// (average rating, all feedback, attendees, edit, delete).
// ROLE GUARD 1: signed-in users only.
if (Auth.requireLogin()) {
  $(function () {
    Layout.init({ active: 'events' });
    const id = Shared.param('id');
    const $root = $('#event');
    let ev, reg = null, myFb = null, rating = 0;

    if (!id) { $root.html(UI.errorBox('No event was selected.')); return; }

    // ---------- Registration card ----------
    function regCard() {
      const past = Shared.isPast(ev);
      let body;
      if (reg && reg.status === 'registered') {
        body = `<p class="flex items-center gap-2 text-sm font-semibold text-sage-700"><span class="h-2 w-2 rounded-full bg-sage-500"></span>You're registered</p>
          <p class="mt-1 text-sm text-stone-500">We'll see you there.</p>
          ${past ? '' : '<button id="cancel-btn" type="button" class="mt-4 w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50">Cancel registration</button>'}`;
      } else if (reg && reg.status === 'cancelled') {
        // Backend limit: a cancelled registration can't be re-activated (register returns 409).
        body = `<p class="text-sm font-semibold text-stone-700">Registration cancelled</p>
          <p class="mt-1 text-sm text-stone-500">You cancelled your spot for this event. The system doesn't allow registering again after cancelling.</p>`;
      } else if (past) {
        body = `<p class="text-sm font-semibold text-stone-700">This event has ended</p><p class="mt-1 text-sm text-stone-500">Registration is closed.</p>`;
      } else {
        body = `<p class="text-sm font-semibold text-stone-800">Want to attend?</p>
          <p class="mt-1 text-sm text-stone-500">Save your spot in one click.</p>
          <button id="register-btn" type="button" class="mt-4 w-full rounded-xl bg-sage-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-700">Register for this event</button>`;
      }
      return body;
    }

    // ---------- Feedback (own) ----------
    function starInput(value) {
      return `<div class="flex gap-1" role="radiogroup" aria-label="Your rating">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="js-star rounded p-0.5 transition hover:scale-110" data-v="${n}" role="radio" aria-checked="${n === value}" aria-label="${n} star${n > 1 ? 's' : ''}">
          <svg class="h-7 w-7 ${n <= value ? 'text-amber-400' : 'text-stone-200'}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 0 0 .95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 0 0-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 0 0-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 0 0-.36-1.12L2.98 8.72c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 0 0 .95-.69l1.07-3.29Z"/></svg>
        </button>`).join('')}
      </div>`;
    }
    function feedbackSection(editing) {
      if (myFb && !editing) {
        return `<div class="rounded-2xl border border-stone-200 bg-white p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-stone-800">Your feedback</p>
              <div class="mt-2 flex">${Shared.stars(myFb.rating)}</div>
              ${myFb.comment ? `<p class="mt-2 text-sm leading-relaxed text-stone-600">${UI.esc(myFb.comment)}</p>` : ''}
            </div>
            <button id="fb-edit" type="button" class="rounded-lg px-3 py-1.5 text-sm font-medium text-sage-700 hover:bg-sage-50">Edit</button>
          </div>
        </div>`;
      }
      rating = myFb ? myFb.rating : 0;
      return `<form id="fb-form" class="rounded-2xl border border-stone-200 bg-white p-5" novalidate>
        <p class="text-sm font-semibold text-stone-800">${myFb ? 'Edit your feedback' : 'How was it? Leave feedback'}</p>
        <p class="mt-0.5 text-xs text-stone-500">One review per person. You can edit it later.</p>
        <div class="mt-3" id="star-wrap">${starInput(rating)}</div>
        <p id="rating-err" class="mt-1 hidden text-xs text-red-700"></p>
        <label for="fb-comment" class="mt-3 block text-sm font-medium text-stone-700">Comment <span class="font-normal text-stone-400">(optional)</span></label>
        <textarea id="fb-comment" rows="3" maxlength="1000" class="mt-1.5 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-100" placeholder="What did you enjoy? What could be better?">${UI.esc(myFb ? myFb.comment || '' : '')}</textarea>
        <div class="mt-3 flex justify-end gap-2">
          ${myFb ? '<button id="fb-cancel" type="button" class="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100">Cancel</button>' : ''}
          <button id="fb-submit" type="submit" class="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">${myFb ? 'Save changes' : 'Submit feedback'}</button>
        </div>
      </form>`;
    }

    function render() {
      const d = new Date(ev.starts_at);
      $root.attr('aria-busy', 'false').html(`
        <div class="fade-in overflow-hidden rounded-3xl border border-stone-200">${Shared.eventCover(ev, 'h-56 sm:h-80')}</div>
        <div class="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div class="min-w-0">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">${UI.esc(ev.title)}</h1>
              <!-- ROLE GUARD (element-level): admin actions, removed for normal users -->
              <div data-role="admin" class="flex gap-2">
                <a href="admin/event-form.html?id=${encodeURIComponent(ev.id)}" class="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Edit</a>
                <button id="delete-btn" type="button" class="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Delete</button>
              </div>
            </div>
            <dl class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl bg-stone-100/70 p-4"><dt class="text-xs font-medium uppercase tracking-wide text-stone-500">When</dt>
                <dd class="mt-1 text-sm font-medium text-stone-800">${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<br><span class="font-normal text-stone-600">${Shared.timeRange(ev.starts_at, ev.ends_at)}</span></dd></div>
              <div class="rounded-2xl bg-stone-100/70 p-4"><dt class="text-xs font-medium uppercase tracking-wide text-stone-500">Where</dt>
                <dd class="mt-1 text-sm font-medium text-stone-800">${UI.esc(ev.location || 'To be confirmed')}</dd></div>
            </dl>
            <h2 class="mt-8 font-display text-lg font-semibold text-stone-900">About this event</h2>
            <p class="mt-2 whitespace-pre-line leading-relaxed text-stone-600">${UI.esc(ev.description || 'No description yet.')}</p>

            <h2 class="mt-10 font-display text-lg font-semibold text-stone-900">Feedback</h2>
            <div id="fb-mine" class="mt-3">${feedbackSection(false)}</div>

            <!-- ROLE GUARD (element-level): only admins can list all feedback (backend route is admin-only) -->
            <section data-role="admin" class="mt-6">
              <div class="flex items-center justify-between"><h3 class="text-sm font-semibold text-stone-800">All feedback</h3><div id="fb-avg" class="text-sm text-stone-500"></div></div>
              <div id="fb-all" class="mt-3 space-y-3"><div class="skeleton h-20 w-full"></div></div>
            </section>
          </div>

          <aside class="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div id="reg-card" class="rounded-2xl border border-stone-200 bg-white p-5" aria-live="polite">${regCard()}</div>
            <!-- ROLE GUARD (element-level): attendee list is admin-only -->
            <div data-role="admin" class="rounded-2xl border border-stone-200 bg-white p-5">
              <p class="text-sm font-semibold text-stone-800">Attendees <span id="att-count" class="font-normal text-stone-400"></span></p>
              <ul id="attendees" class="mt-3 max-h-72 space-y-2 overflow-y-auto"><li class="skeleton h-8 w-full"></li></ul>
            </div>
          </aside>
        </div>`);
      document.title = ev.title + ' · CivicEvents+';
      Auth.applyRoleVisibility();
      if (Auth.isAdmin()) loadAdminExtras();
    }

    async function loadAdminExtras() {
      try {
        const [fb, att] = await Promise.all([
          Api.get('/event-feedback/event/' + id),
          Api.get('/event-registrations/event/' + id + '/attendees'),
        ]);
        const list = fb.data || [];
        if (list.length) {
          const avg = list.reduce((s, f) => s + (+f.rating || 0), 0) / list.length;
          $('#fb-avg').html(`<span class="inline-flex items-center gap-2"><span class="flex">${Shared.stars(avg)}</span><span class="font-medium text-stone-700">${avg.toFixed(1)}</span> · ${list.length} review${list.length > 1 ? 's' : ''}</span>`);
        }
        $('#fb-all').html(list.length ? list.map((f) => `
          <div class="rounded-2xl border border-stone-200 bg-white p-4">
            <div class="flex items-center justify-between gap-3"><p class="text-sm font-medium text-stone-800">${UI.esc(f.full_name)}</p><span class="flex">${Shared.stars(f.rating, 'h-3.5 w-3.5')}</span></div>
            ${f.comment ? `<p class="mt-1.5 text-sm text-stone-600">${UI.esc(f.comment)}</p>` : ''}
            <p class="mt-1 text-xs text-stone-400">${UI.fmtDate(f.created_at)}</p>
          </div>`).join('') : '<p class="text-sm text-stone-500">No feedback yet.</p>');
        const people = att.data || [];
        $('#att-count').text('(' + people.length + ')');
        $('#attendees').html(people.length ? people.map((p) => `
          <li class="flex items-center gap-3"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">${UI.esc((p.full_name || '?')[0])}</span>
          <span class="min-w-0"><span class="block truncate text-sm text-stone-800">${UI.esc(p.full_name)}</span><span class="block truncate text-xs text-stone-500">${UI.esc(p.email)}</span></span></li>`).join('')
          : '<li class="text-sm text-stone-500">No one has registered yet.</li>');
      } catch (err) {
        $('#fb-all').html(`<p class="text-sm text-red-700">${UI.esc(err.message)}</p>`);
        $('#attendees').html('');
      }
    }

    async function load() {
      try {
        const [evRes, regs, fbs] = await Promise.all([
          Api.get('/events/' + id),
          Api.get('/event-registrations/my-registrations').catch(() => ({ data: [] })),
          Api.get('/event-feedback/my-feedback').catch(() => ({ data: [] })),
        ]);
        ev = evRes.data;
        reg = (regs.data || []).find((r) => r.event_id === id) || null;
        myFb = (fbs.data || []).find((f) => f.event_id === id) || null;
        render();
      } catch (err) {
        $root.attr('aria-busy', 'false').html(err.status === 404 ? UI.empty('Event not found', 'It may have been removed.') : UI.errorBox(err.message));
      }
    }

    // Register: optimistic update, roll back if the server says no.
    $root.on('click', '#register-btn', async function () {
      const before = reg;
      reg = { status: 'registered', event_id: id };
      $('#reg-card').html(regCard());
      try {
        const res = await Api.post('/event-registrations/register', { event_id: id });
        reg = res.data;
        Shared.cache.drop('events');
        UI.toast('You\'re registered. See you there!', 'success');
        if (Auth.isAdmin()) loadAdminExtras();
      } catch (err) {
        reg = before; $('#reg-card').html(regCard());
        UI.toast(err.status === 409 ? 'You\'re already registered (or cancelled earlier) for this event.' : err.message, 'error');
      }
    });

    $root.on('click', '#cancel-btn', async function () {
      const ok = await UI.confirm({ title: 'Cancel your registration?', message: 'Heads up: the system won\'t let you register for this event again after cancelling.', confirmText: 'Yes, cancel', danger: true });
      if (!ok) return;
      const before = reg;
      reg = { ...reg, status: 'cancelled' };
      $('#reg-card').html(regCard());
      try {
        await Api.post('/event-registrations/cancel', { event_id: id });
        Shared.cache.drop('events');
        UI.toast('Your registration was cancelled.', 'info');
        if (Auth.isAdmin()) loadAdminExtras();
      } catch (err) {
        reg = before; $('#reg-card').html(regCard());
        UI.toast(err.message, 'error');
      }
    });

    // Feedback: star picker, create or update.
    $root.on('click', '.js-star', function () {
      rating = +$(this).data('v');
      $('#star-wrap').html(starInput(rating));
      $('#rating-err').addClass('hidden');
      $(`.js-star[data-v="${rating}"]`).trigger('focus');
    });
    $root.on('click', '#fb-edit', () => { $('#fb-mine').html(feedbackSection(true)); $('#fb-comment').trigger('focus'); });
    $root.on('click', '#fb-cancel', () => $('#fb-mine').html(feedbackSection(false)));
    $root.on('submit', '#fb-form', async function (e) {
      e.preventDefault();
      if (!rating) { $('#rating-err').text('Please pick a rating from 1 to 5 stars.').removeClass('hidden'); return; }
      const comment = $('#fb-comment').val().trim();
      const $btn = $('#fb-submit');
      UI.btnLoading($btn, true, 'Saving…');
      try {
        const res = myFb
          ? await Api.put('/event-feedback/' + myFb.id, { rating, comment })
          : await Api.post('/event-feedback', { event_id: id, rating, comment });
        const wasEdit = !!myFb;
        myFb = res.data;
        $('#fb-mine').html(feedbackSection(false));
        UI.toast(wasEdit ? 'Feedback updated.' : 'Thanks for your feedback!', 'success');
        if (Auth.isAdmin()) loadAdminExtras();
      } catch (err) {
        UI.btnLoading($btn, false);
        UI.toast(err.status === 409 ? 'You\'ve already left feedback for this event.' : err.message, 'error');
      }
    });

    // ROLE GUARD: delete is admin-only (button only exists for admins; backend checks too).
    $root.on('click', '#delete-btn', async function () {
      const ok = await UI.confirm({ title: 'Delete this event?', message: 'This removes the event for everyone. It can\'t be undone.', confirmText: 'Delete event', danger: true });
      if (!ok) return;
      UI.btnLoading(this, true, 'Deleting…');
      try {
        await Api.del('/events/' + id);
        Shared.cache.drop('events');
        UI.flash('Event deleted.', 'success');
        location.href = 'events.html';
      } catch (err) {
        UI.btnLoading(this, false);
        // The database blocks deleting events that people registered for.
        const blocked = /foreign key|registrations/i.test(err.message || '');
        UI.toast(blocked ? 'This event has registrations, so it can\'t be deleted. You can edit it instead.' : err.message, 'error');
      }
    });

    $(document).on('click', '#event .js-retry', load);
    load();
  });
}
