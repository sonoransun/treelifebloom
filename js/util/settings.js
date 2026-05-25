// Persisted UI preferences (localStorage) + shareable URL state.
//
// Two concerns, kept together because they serialize the same handful of view
// settings: localStorage remembers prefs across sessions; the URL (?t=&view=&
// plates=&ex=) makes a moment shareable. On boot, URL values win over stored
// ones (a shared link should show exactly what was shared).

const KEY = 'tlb.settings.v1';

let _cache = null;

/** Read the persisted settings object. Returns {} if storage is unavailable. */
export function loadSettings() {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(KEY);
    _cache = raw ? JSON.parse(raw) : {};
  } catch {
    _cache = {};
  }
  return _cache;
}

/** Merge a patch into the persisted settings. Silently no-ops if storage fails. */
export function saveSetting(patch) {
  try {
    const cache = loadSettings();
    Object.assign(cache, patch);
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* private mode / disabled storage — ignore */
  }
}

// --- Shareable URL state ---

/** Parse the current location's query into a partial state object. */
export function readUrlState() {
  const out = {};
  try {
    const p = new URLSearchParams(location.search);
    if (p.has('t')) { const t = Number(p.get('t')); if (Number.isFinite(t)) out.time = t; }
    if (p.has('view')) { const v = p.get('view'); if (v === '2d' || v === '3d') out.view = v; }
    if (p.has('plates')) out.plates = p.get('plates') === '1';
    if (p.has('ex')) { const e = Number(p.get('ex')); if (Number.isFinite(e)) out.elevation = e; }
  } catch { /* ignore malformed URL */ }
  return out;
}

/** Build an absolute shareable URL from a {time, view, plates, elevation} state. */
export function buildShareUrl({ time, view, plates, elevation } = {}) {
  const p = new URLSearchParams();
  if (time != null) p.set('t', String(Math.round(time)));
  if (view) p.set('view', view);
  if (plates) p.set('plates', '1');
  if (elevation != null && elevation !== 1) p.set('ex', String(elevation));
  const qs = p.toString();
  return `${location.origin}${location.pathname}${qs ? '?' + qs : ''}`;
}

/** Replace the URL in place (no history entry) to reflect the current state. */
export function writeUrlState(state) {
  try {
    history.replaceState(null, '', buildShareUrl(state));
  } catch { /* ignore */ }
}
