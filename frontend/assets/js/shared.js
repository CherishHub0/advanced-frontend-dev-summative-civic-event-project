// Small helpers shared by several pages: URL params, a tiny cache, upload checks, event art.
const Shared = (() => {
  const param = (name) => new URLSearchParams(location.search).get(name);

  // ---------- Simple caching ----------
  // Lists are cached in sessionStorage for a short time. Pages show the cached copy
  // instantly, then refresh it from the API in the background ("stale-while-revalidate").
  const cache = {
    get(key, maxAgeMs = 60000) {
      try {
        const hit = JSON.parse(sessionStorage.getItem('ce_cache_' + key));
        return hit && Date.now() - hit.t < maxAgeMs ? hit.v : null;
      } catch (e) { return null; }
    },
    set(key, value) { try { sessionStorage.setItem('ce_cache_' + key, JSON.stringify({ t: Date.now(), v: value })); } catch (e) {} },
    drop(prefix) {
      try { Object.keys(sessionStorage).filter((k) => k.startsWith('ce_cache_' + prefix)).forEach((k) => sessionStorage.removeItem(k)); } catch (e) {}
    },
  };

  // ---------- Upload checks (match backend/src/middlewares/upload.middleware.js) ----------
  const LIMITS = {
    image: { exts: ['jpg', 'jpeg', 'png', 'gif'], maxMB: 2, label: 'JPG, PNG or GIF' },
    video: { exts: ['mp4', 'mov', 'avi', 'mkv'], maxMB: 8, label: 'MP4, MOV, AVI or MKV' },
    audio: { exts: ['mp3', 'wav', 'm4a', 'ogg'], maxMB: 5, label: 'MP3, WAV, M4A or OGG' },
  };
  // Returns an error message, or null if the file is fine.
  function checkFile(file, kind) {
    const rule = LIMITS[kind];
    if (!file) return null;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!rule.exts.includes(ext)) return `That file type isn't supported. Please use ${rule.label}.`;
    if (file.size > rule.maxMB * 1024 * 1024) return `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${rule.maxMB} MB.`;
    return null;
  }
  const fmtSize = (bytes) => bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';

  // ---------- Event visuals ----------
  // Events without an image get a calm generated cover (soft tone picked from the title).
  const TONES = [
    ['#E3EBE6', '#436652'], ['#EFE9E1', '#7A5C3E'], ['#E6E9EE', '#44546A'],
    ['#EEE6E6', '#7A4A4A'], ['#E9E8F0', '#55507A'], ['#E8EEE9', '#3F6B57'],
  ];
  function tone(text) {
    let h = 0;
    for (const c of String(text || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return TONES[h % TONES.length];
  }
  function eventCover(ev, cls = 'h-44') {
    const img = ev.metadata && ev.metadata.image_url;
    if (img) {
      return `<img src="${UI.esc(img)}" alt="" loading="lazy" class="${cls} w-full object-cover" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls} w-full bg-stone-100'}))">`;
    }
    const [bg, fg] = tone(ev.title);
    const letter = UI.esc((ev.title || '?').trim()[0] || '?').toUpperCase();
    return `<div class="${cls} relative w-full overflow-hidden" style="background:${bg}" aria-hidden="true">
      <div class="absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-20" style="background:${fg}"></div>
      <div class="absolute -bottom-12 left-6 h-32 w-32 rounded-full opacity-10" style="background:${fg}"></div>
      <span class="absolute bottom-4 left-5 font-display text-5xl font-bold opacity-80" style="color:${fg}">${letter}</span>
    </div>`;
  }
  function dateBlock(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `<div class="w-14 shrink-0 rounded-xl border border-stone-200 bg-white py-1.5 text-center">
      <p class="text-[11px] font-semibold uppercase tracking-wide text-sage-700">${d.toLocaleString(undefined, { month: 'short' })}</p>
      <p class="font-display text-xl font-bold leading-tight text-stone-900">${d.getDate()}</p>
    </div>`;
  }
  const timeRange = (a, b) => {
    if (!a) return '';
    const t = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return t(a) + (b ? ' – ' + t(b) : '');
  };
  const isPast = (ev) => new Date(ev.ends_at || ev.starts_at) < new Date();

  function stars(rating, size = 'h-4 w-4') {
    return Array.from({ length: 5 }, (_, i) =>
      `<svg class="${size} ${i < Math.round(rating) ? 'text-amber-400' : 'text-stone-200'}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 0 0 .95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 0 0-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 0 0-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 0 0-.36-1.12L2.98 8.72c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 0 0 .95-.69l1.07-3.29Z"/></svg>`).join('');
  }

  // ISO <-> <input type="datetime-local"> value (local time).
  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  return { param, cache, checkFile, fmtSize, LIMITS, eventCover, dateBlock, timeRange, isPast, stars, toLocalInput, tone };
})();
