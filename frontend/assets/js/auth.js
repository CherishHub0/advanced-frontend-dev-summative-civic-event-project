// Auth: token storage, session expiry and ROLE GUARDS.
// Remember me ticked -> localStorage (survives closing the browser; XSS can read it).
// Not ticked        -> sessionStorage (cleared when the tab closes; safer).
const Auth = (() => {
  const T = 'ce_token', U = 'ce_user';
  const read = (k) => localStorage.getItem(k) ?? sessionStorage.getItem(k);
  let timer;

  function clear() {
    [localStorage, sessionStorage].forEach((s) => { s.removeItem(T); s.removeItem(U); });
    clearTimeout(timer);
  }
  function save(token, user, remember) {
    clear();
    const s = remember ? localStorage : sessionStorage;
    s.setItem(T, token);
    s.setItem(U, JSON.stringify(user));
    watchExpiry();
  }
  const token = () => read(T);
  function user() { try { return JSON.parse(read(U)); } catch (e) { return null; } }
  function setUser(u) { (localStorage.getItem(T) ? localStorage : sessionStorage).setItem(U, JSON.stringify(u)); }

  // The backend token lasts 1 hour. Read its expiry time from the JWT payload.
  function expiresAt() {
    const t = token();
    if (!t) return 0;
    try { return (JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp || 0) * 1000; }
    catch (e) { return 0; }
  }
  const isLoggedIn = () => !!token() && expiresAt() > Date.now();
  const isAdmin = () => isLoggedIn() && user()?.role === 'admin';

  function logout(message) {
    clear();
    if (message) UI.flash(message, 'info');
    location.href = APP.ROOT + 'login.html';
  }
  // Auto sign-out the moment the token expires, even if the user is idle.
  function watchExpiry() {
    clearTimeout(timer);
    const ms = expiresAt() - Date.now();
    if (ms > 0 && ms < 2147483647) {
      timer = setTimeout(() => logout('Your session has expired. Please sign in again.'), ms);
    }
  }

  // ===================== ROLE GUARDS (client-side, UX only) =====================
  // The backend enforces the real security. These guards just keep people out of pages
  // and hide controls that would fail anyway.

  // GUARD 1: any signed-in user. Call at the top of every protected page.
  function requireLogin() {
    if (isLoggedIn()) { watchExpiry(); return true; }
    logout(token() ? 'Your session has expired. Please sign in again.' : null);
    return false;
  }
  // GUARD 2: admins only. Normal users are redirected to Events with a message.
  function requireAdmin() {
    if (!requireLogin()) return false;
    if (!isAdmin()) {
      UI.flash('That area is for administrators only.', 'error');
      location.href = APP.ROOT + 'events.html';
      return false;
    }
    return true;
  }
  // GUARD 3: login/signup pages. Signed-in users are sent on to their home page.
  function guestOnly() {
    if (isLoggedIn()) {
      location.href = APP.ROOT + (isAdmin() ? 'admin/dashboard.html' : 'events.html');
      return false;
    }
    return true;
  }
  // GUARD 4: element-level. Anything marked data-role="admin" is REMOVED from the page
  // for non-admins (not just hidden), e.g. the "Create event" button.
  function applyRoleVisibility() {
    if (!isAdmin()) $('[data-role="admin"]').remove();
  }

  return { save, clear, token, user, setUser, isLoggedIn, isAdmin, logout, watchExpiry,
           requireLogin, requireAdmin, guestOnly, applyRoleVisibility };
})();
