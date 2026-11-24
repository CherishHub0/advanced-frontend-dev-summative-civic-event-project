// Login page.
// ROLE GUARD 3: already signed in? Skip this page and go home.
if (Auth.guestOnly()) {
  $(function () {
    const $form = $('#login-form');
    const params = new URLSearchParams(location.search);
    if (params.get('email')) $('#email').val(params.get('email'));

    // Show/hide password (shared with signup).
    $(document).on('click', '.js-toggle-pw', function () {
      const $input = $('#' + $(this).data('target'));
      const show = $input.attr('type') === 'password';
      $input.attr('type', show ? 'text' : 'password');
      $(this).text(show ? 'Hide' : 'Show').attr('aria-label', show ? 'Hide password' : 'Show password');
    });

    function fieldError(name, msg) {
      $('#' + name).toggleClass('border-red-400', !!msg).attr('aria-invalid', !!msg);
      $('#' + name + '-err').text(msg || '').toggleClass('hidden', !msg);
    }
    function alertBox(msg) { $('#form-alert').text(msg || '').toggleClass('hidden', !msg); }

    // Validate before sending, so we don't waste a request on obvious mistakes.
    function validate(email, password) {
      let ok = true;
      fieldError('email', null); fieldError('password', null);
      if (!/^\S+@\S+\.\S+$/.test(email)) { fieldError('email', 'Enter a valid email address.'); ok = false; }
      if (!password) { fieldError('password', 'Enter your password.'); ok = false; }
      return ok;
    }

    $form.on('submit', async function (e) {
      e.preventDefault();
      alertBox(null);
      const email = $('#email').val().trim();
      const password = $('#password').val();
      if (!validate(email, password)) return;

      const $btn = $('#login-btn');
      UI.btnLoading($btn, true, 'Signing in…');
      try {
        // auth:false -> a 401 here means "wrong password", not "session expired".
        const res = await Api.post('/auth/login', { email, password }, { auth: false });
        const { token, user } = res.data;
        Auth.save(token, user, $('#remember').is(':checked'));

        // The backend lets disabled accounts log in, so we check is_active ourselves.
        const me = await Api.get('/users/profile/me');
        if (me.data && me.data.is_active === false) {
          Auth.clear();
          UI.btnLoading($btn, false);
          return alertBox('This account has been disabled. Please contact an administrator.');
        }
        Auth.setUser({ ...user, ...me.data });

        UI.flash(`Welcome back, ${(user.full_name || '').split(' ')[0]}!`, 'success');
        location.href = user.role === 'admin' ? 'admin/dashboard.html' : 'events.html';
      } catch (err) {
        UI.btnLoading($btn, false);
        if (err.status === 401) alertBox('That email and password don\'t match. Please try again.');
        else if (err.errors && err.errors.length) err.errors.forEach((f) => fieldError(f.field, f.message));
        else alertBox(err.message);
      }
    });
  });
}
