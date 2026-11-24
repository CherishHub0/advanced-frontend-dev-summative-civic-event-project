// Profile: view and edit name + email (never role). Activity stats from /dashboard/me.
// ROLE GUARD 1: signed-in users only.
if (Auth.requireLogin()) {
  $(function () {
    Layout.init({ active: '' });
    let me = null;

    function fieldError(name, msg) {
      $('#' + name).toggleClass('border-red-400', !!msg).attr('aria-invalid', !!msg);
      $('#' + name + '-err').text(msg || '').toggleClass('hidden', !msg);
    }
    function fill(u) {
      me = u;
      $('#full_name').val(u.full_name);
      $('#email').val(u.email);
      $('#role').text(u.role);
      $('#p-name').text(u.full_name);
      $('#p-meta').text('Member since ' + UI.fmtDate(u.created_at));
      $('#avatar').text((u.full_name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase());
      $('#profile-form').attr('aria-busy', 'false');
    }

    async function load() {
      try {
        const [p, d] = await Promise.all([Api.get('/users/profile/me'), Api.get('/dashboard/me').catch(() => null)]);
        fill(p.data);
        if (d && d.data) {
          const s = d.data;
          const stat = (label, val, href) => `<a href="${href}" class="rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-sage-300"><p class="font-display text-2xl font-bold text-stone-900">${Number(val) || 0}</p><p class="text-sm text-stone-500">${label}</p></a>`;
          $('#stats').html(
            stat('Events registered', s.registrations && s.registrations.total_registered_events, 'my-registrations.html') +
            stat('Feedback given', s.feedbacks && s.feedbacks.total_feedbacks, 'my-registrations.html') +
            stat('Announcements', s.announcements && s.announcements.total_announcements, 'announcements.html') +
            stat('Promos', s.promos && s.promos.total_promos, 'promos.html'));
        }
      } catch (err) { UI.toast(err.message, 'error'); }
    }

    $('#reset-btn').on('click', () => { if (me) fill(me); fieldError('full_name', null); fieldError('email', null); });

    $('#profile-form').on('submit', async function (e) {
      e.preventDefault();
      const full_name = $('#full_name').val().trim();
      const email = $('#email').val().trim();
      fieldError('full_name', null); fieldError('email', null);
      let ok = true;
      if (full_name.length < 2) { fieldError('full_name', 'Please enter your full name.'); ok = false; }
      if (!/^\S+@\S+\.\S+$/.test(email)) { fieldError('email', 'Enter a valid email address.'); ok = false; }
      if (!ok) return;
      if (me && full_name === me.full_name && email === me.email) return UI.toast('Nothing to save. No changes were made.', 'info');

      const $btn = $('#save-btn');
      UI.btnLoading($btn, true, 'Saving…');
      try {
        // Only name and email are sent. The backend rejects role / is_active anyway.
        const res = await Api.patch('/users/profile/me', { full_name, email });
        const updated = res.data || { ...me, full_name, email };
        fill(updated);
        Auth.setUser({ ...Auth.user(), full_name: updated.full_name, email: updated.email });
        // Refresh the name shown in the navbar and profile menu.
        $('#profile-btn span').last().text(updated.full_name.split(' ')[0]);
        $('#profile-menu p').eq(0).text(updated.full_name);
        $('#profile-menu p').eq(1).text(updated.email);
        UI.toast('Profile updated.', 'success');
      } catch (err) {
        if (err.status === 409) fieldError('email', 'That email is already used by another account.');
        else if (err.errors && err.errors.length) err.errors.forEach((f) => fieldError(f.field, f.message));
        else UI.toast(err.message, 'error');
      } finally { UI.btnLoading($btn, false); }
    });

    load();
  });
}
