// Signup page.
// ROLE GUARD 3: signed-in users don't need this page.
if (Auth.guestOnly()) {
  $(function () {
    // The same rule the backend enforces (auth.controller.js PASSWORD_REGEX).
    const RULES = {
      len: (p) => p.length >= 8,
      upper: (p) => /[A-Z]/.test(p),
      lower: (p) => /[a-z]/.test(p),
      num: (p) => /\d/.test(p),
      special: (p) => /[\W_]/.test(p),
    };
    const LEVELS = [
      { label: 'Too weak', bar: 'bg-red-500' },
      { label: 'Weak', bar: 'bg-red-500' },
      { label: 'Fair', bar: 'bg-amber-500' },
      { label: 'Good', bar: 'bg-sage-400' },
      { label: 'Strong', bar: 'bg-sage-600' },
    ];
    const passes = (p) => Object.values(RULES).every((fn) => fn(p));

    $(document).on('click', '.js-toggle-pw', function () {
      const $input = $('#' + $(this).data('target'));
      const show = $input.attr('type') === 'password';
      $input.attr('type', show ? 'text' : 'password');
      $(this).text(show ? 'Hide' : 'Show').attr('aria-label', show ? 'Hide password' : 'Show password');
    });

    // Live strength meter: one point per rule met, Strong only when ALL rules pass.
    $('#password').on('input', function () {
      const p = $(this).val();
      let met = 0;
      $.each(RULES, (key, fn) => {
        const ok = fn(p);
        if (ok) met++;
        $(`#pw-rules [data-rule="${key}"]`).toggleClass('text-sage-700 font-medium', ok).toggleClass('text-stone-500', !ok);
      });
      const level = !p ? null : passes(p) ? 4 : Math.min(3, Math.max(0, met - 1));
      $('.pw-bar').each(function (i) {
        this.className = 'pw-bar h-1.5 flex-1 rounded-full transition ' + (level !== null && i < Math.max(1, level) ? LEVELS[level].bar : 'bg-stone-200');
      });
      $('#pw-strength').text(level === null ? 'Use 8+ characters with a mix of letters, numbers and symbols.' : 'Strength: ' + LEVELS[level].label);
    });

    function fieldError(name, msg) {
      $('#' + name).toggleClass('border-red-400', !!msg).attr('aria-invalid', !!msg);
      $('#' + name + '-err').text(msg || '').toggleClass('hidden', !msg);
    }
    function alertBox(msg) { $('#form-alert').text(msg || '').toggleClass('hidden', !msg); }

    function validate(v) {
      let ok = true;
      ['full_name', 'email', 'password', 'confirm'].forEach((f) => fieldError(f, null));
      if (v.full_name.length < 2) { fieldError('full_name', 'Please enter your full name.'); ok = false; }
      if (!/^\S+@\S+\.\S+$/.test(v.email)) { fieldError('email', 'Enter a valid email address.'); ok = false; }
      if (!passes(v.password)) { fieldError('password', 'Your password needs to meet all the rules above.'); ok = false; }
      if (v.password !== v.confirm) { fieldError('confirm', 'Passwords don\'t match.'); ok = false; }
      return ok;
    }

    $('#signup-form').on('submit', async function (e) {
      e.preventDefault();
      alertBox(null);
      const v = {
        full_name: $('#full_name').val().trim(),
        email: $('#email').val().trim(),
        password: $('#password').val(),
        confirm: $('#confirm').val(),
      };
      if (!validate(v)) return;

      const $btn = $('#signup-btn');
      UI.btnLoading($btn, true, 'Creating account…');
      try {
        // We never send "role": the backend would accept it, so the UI must not offer it.
        await Api.post('/auth/signup', { full_name: v.full_name, email: v.email, password: v.password }, { auth: false });
        UI.flash('Account created. Please sign in.', 'success');
        location.href = 'login.html?email=' + encodeURIComponent(v.email);
      } catch (err) {
        UI.btnLoading($btn, false);
        if (err.status === 409) fieldError('email', 'An account with this email already exists.');
        else if (err.errors && err.errors.length) err.errors.forEach((f) => fieldError(f.field, f.message));
        else alertBox(err.message);
      }
    });
  });
}
