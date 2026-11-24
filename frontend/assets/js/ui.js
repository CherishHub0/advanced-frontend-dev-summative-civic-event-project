// Shared UI helpers: toasts, confirm dialog, skeletons, formatting.
const UI = (() => {
  const FLASH_KEY = 'ce_flash';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined,
    { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString(undefined,
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  function toastBox() {
    let box = document.getElementById('toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast-box';
      box.setAttribute('aria-live', 'polite');
      box.className = 'fixed top-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2';
      document.body.appendChild(box);
    }
    return box;
  }

  const DOTS = { success: 'bg-sage-600', error: 'bg-red-600', info: 'bg-stone-400' };

  function toast(message, type = 'info', ms = 4500) {
    const el = document.createElement('div');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.className = 'fade-in flex items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-lg shadow-stone-900/5';
    el.innerHTML = `<span class="mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOTS[type] || DOTS.info}"></span>
      <p class="text-sm leading-snug text-stone-800">${esc(message)}</p>`;
    toastBox().appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, ms);
  }

  // A "flash" is a toast that survives a page redirect (e.g. "Account created").
  function flash(message, type = 'info') {
    try { sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, type })); } catch (e) {}
  }
  function showFlash() {
    try {
      const raw = sessionStorage.getItem(FLASH_KEY);
      if (!raw) return;
      sessionStorage.removeItem(FLASH_KEY);
      const f = JSON.parse(raw);
      toast(f.message, f.type);
    } catch (e) {}
  }
  document.addEventListener('DOMContentLoaded', showFlash);

  // Button spinner: UI.btnLoading(btn, true, 'Saving…') then UI.btnLoading(btn, false)
  function btnLoading(btn, on, text) {
    const $b = $(btn);
    if (on) {
      $b.data('label', $b.html()).prop('disabled', true).attr('aria-busy', 'true').html(
        `<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
         <span class="ml-2">${esc(text || 'Please wait…')}</span>`);
    } else {
      $b.prop('disabled', false).removeAttr('aria-busy').html($b.data('label'));
    }
  }

  const skeletonCards = (n = 6) => Array.from({ length: n }, () =>
    `<div class="rounded-2xl border border-stone-200 bg-white p-4">
       <div class="skeleton h-40 w-full"></div>
       <div class="skeleton mt-4 h-4 w-3/4"></div>
       <div class="skeleton mt-2 h-3 w-1/2"></div>
     </div>`).join('');

  const empty = (title, text) =>
    `<div class="col-span-full rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-14 text-center">
       <p class="font-display text-lg font-semibold text-stone-800">${esc(title)}</p>
       <p class="mt-1 text-sm text-stone-500">${esc(text || '')}</p>
     </div>`;

  // Error box with a "Try again" button (class js-retry): wire it up with $(document).on('click','.js-retry', load)
  const errorBox = (message) =>
    `<div class="col-span-full rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center" role="alert">
       <p class="font-medium text-red-800">${esc(message)}</p>
       <button type="button" class="js-retry mt-4 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">Try again</button>
     </div>`;

  // Promise-based confirm dialog: if (await UI.confirm({...})) { ... }
  function confirm({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = false } = {}) {
    return new Promise((resolve) => {
      const prev = document.activeElement;
      const wrap = document.createElement('div');
      wrap.className = 'fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/40 p-4';
      wrap.innerHTML = `
        <div role="dialog" aria-modal="true" aria-labelledby="cf-title" class="fade-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
          <h2 id="cf-title" class="font-display text-lg font-semibold text-stone-900">${esc(title)}</h2>
          <p class="mt-2 text-sm text-stone-600">${esc(message)}</p>
          <div class="mt-6 flex justify-end gap-2">
            <button type="button" data-r="0" class="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Cancel</button>
            <button type="button" data-r="1" class="rounded-xl px-4 py-2 text-sm font-medium text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-sage-600 hover:bg-sage-700'}">${esc(confirmText)}</button>
          </div>
        </div>`;
      const onKey = (e) => { if (e.key === 'Escape') done(false); };
      const done = (v) => { document.removeEventListener('keydown', onKey); wrap.remove(); if (prev && prev.focus) prev.focus(); resolve(v); };
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap) return done(false);
        const r = e.target.closest('[data-r]');
        if (r) done(r.dataset.r === '1');
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      wrap.querySelector('[data-r="1"]').focus();
    });
  }

  return { toast, flash, showFlash, esc, fmtDate, fmtDateTime, btnLoading, skeletonCards, empty, errorBox, confirm };
})();