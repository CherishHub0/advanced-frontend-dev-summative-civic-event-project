// API helper: attaches the token, normalises errors, handles 401/403/network failures.
const Api = (() => {
  const qs = (obj = {}) => {
    const p = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.append(k, v); });
    const s = p.toString();
    return s ? '?' + s : '';
  };

  // opts: { data: {json body}, form: FormData (file uploads), auth: false for login/signup }
  function request(method, path, { data, form, auth = true } = {}) {
    return new Promise((resolve, reject) => {
      const opts = { url: APP.API_URL + path, method, headers: {}, timeout: 30000 };
      if (auth && Auth.token()) opts.headers.Authorization = 'Bearer ' + Auth.token();
      if (form) { opts.data = form; opts.processData = false; opts.contentType = false; }
      else if (data) { opts.data = JSON.stringify(data); opts.contentType = 'application/json'; }

      $.ajax(opts).done(resolve).fail((xhr) => {
        const body = xhr.responseJSON || {};
        const err = { status: xhr.status, network: xhr.status === 0, errors: body.errors || [], message: body.message };

        if (err.network) err.message = 'Cannot reach the server. Check your connection and that the backend is running.';
        else if (xhr.status === 401 && auth) {
          // Token expired or invalid: sign out and go to login.
          Auth.logout('Your session has expired. Please sign in again.');
        } else if (xhr.status === 403) err.message = "You don't have permission to do that. Contact an administrator if you think this is a mistake.";
        else if (err.errors.length) err.message = err.errors.map((e) => e.message).join(' ');
        else if (!err.message) err.message = 'Something went wrong. Please try again.';
        reject(err);
      });
    });
  }

  return {
    qs,
    get: (path, query) => request('GET', path + qs(query)),
    post: (path, data, opts) => request('POST', path, { data, ...opts }),
    put: (path, data) => request('PUT', path, { data }),
    patch: (path, data) => request('PATCH', path, { data }),
    del: (path) => request('DELETE', path),
    upload: (method, path, form) => request(method, path, { form }),
  };
})();