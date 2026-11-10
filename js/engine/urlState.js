// Deep links — read the starting state from the URL and keep it up to date while paused, so any
// moment can be shared or bookmarked:
//
//   ?t=66.02          time in Ma (millions of years ago)
//   &view=globe       map | globe | tree
//   &plates=1         plate-boundary layer on
//   &labels=0         place names off
//   &speed=2          playback speed
//   &play=1           start playing immediately
//
// Rewrites keep any other parameters the page was opened with (they follow ours). Capture-mode
// parameters (?capture=1&panel=…) are left untouched: nothing is rewritten in capture mode.

import { TIMING } from '../config.js';
import { getPeriodAtTime } from '../data/timeline.js';
import { getActiveExtinction } from '../data/extinctions.js';
import { getActiveMilestone } from '../data/milestones.js';
import { formatMa } from '../util/format.js';

const BASE_TITLE = globalThis.document?.title || "Life's Tree Blooms";

const VIEWS = new Set(['map', 'globe', 'tree']);
const VIEW_ALIASES = { '2d': 'map', '3d': 'globe' };
const OFF_VALUES = new Set(['0', 'false', 'off', 'no']);
const OWN_PARAMS = new Set(['t', 'view', 'plates', 'labels', 'speed', 'play']);

/** A finite number, or null when the parameter is absent, empty ('?t=', '?t') or junk. */
function numberParam(params, name) {
  const raw = (params.get(name) ?? '').trim();
  if (raw === '') return null; // Number('') is 0, which would mean "the present"
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function readUrlState(search = globalThis.location?.search || '') {
  const params = new URLSearchParams(search);
  const out = {};

  const t = numberParam(params, 't');
  if (t != null) out.timeMa = Math.max(TIMING.endTimeMa, Math.min(TIMING.startTimeMa, t));
  if (params.has('view')) {
    const raw = params.get('view').toLowerCase();
    const view = VIEW_ALIASES[raw] || raw;
    if (VIEWS.has(view)) out.view = view;
  }
  const layers = {};
  for (const name of ['plates', 'labels']) {
    // A bare flag ('?plates') turns the layer on; 0 / false / off / no (any case) turn it off.
    if (params.has(name)) layers[name] = !OFF_VALUES.has(params.get(name).trim().toLowerCase());
  }
  if (Object.keys(layers).length) out.layers = layers;
  const speed = numberParam(params, 'speed');
  if (speed != null && speed > 0) out.speed = speed;
  if (params.get('play') === '1') out.play = true;
  return out;
}

function trimNumber(n) {
  if (n >= 100) return String(Math.round(n * 10) / 10);
  if (n >= 1) return String(Math.round(n * 100) / 100);
  return String(Number(n.toPrecision(3)));
}

/** Same period row, same mass extinction (if any) and same milestone (if any). */
function sameMoment(a, b) {
  return getPeriodAtTime(a) === getPeriodAtTime(b)
    && (getActiveExtinction(a)?.id ?? null) === (getActiveExtinction(b)?.id ?? null)
    && (getActiveMilestone(a)?.id ?? null) === (getActiveMilestone(b)?.id ?? null);
}

/**
 * The shortest tidy decimal for `ma` that reopens on the same moment. Usually the short form
 * (252.3, 66.05); near an edge it gets the digits it needs — a link written while paused on the
 * end-Permian hold must not round to 252.2, which lies before the extinction window.
 */
function timeParam(ma) {
  const short = trimNumber(ma);
  if (sameMoment(Number(short), ma)) return short;
  for (let digits = 4; digits < 17; digits++) {
    const s = String(Number(ma.toPrecision(digits)));
    if (sameMoment(Number(s), ma)) return s;
  }
  return String(ma); // shortest exact round trip
}

/**
 * Build the query string for the current state (without capture params). Our parameters come
 * first; anything else in `search` (the URL the page was opened with) is kept after them.
 */
export function buildQuery(app, search = globalThis.location?.search || '') {
  const { clock, state } = app;
  const params = new URLSearchParams();
  const atStart = clock.currentTimeMa >= TIMING.startTimeMa;
  if (!atStart) params.set('t', timeParam(clock.currentTimeMa));
  if (state.view !== 'map') params.set('view', state.view);
  if (state.layers.plates) params.set('plates', '1');
  if (!state.layers.labels) params.set('labels', '0');
  if (clock.speedMultiplier !== 1) params.set('speed', String(clock.speedMultiplier));
  for (const [key, value] of new URLSearchParams(search)) {
    if (!OWN_PARAMS.has(key)) params.append(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Back to the plain title while the story plays (a moving moment cannot be bookmarked). */
export function resetTitle(app) {
  if (app.state.captureMode || !globalThis.document) return;
  if (document.title !== BASE_TITLE) document.title = BASE_TITLE;
}

let timer = null;

/** Debounced history.replaceState; never fires while playing or in capture mode. */
export function scheduleUrlUpdate(app) {
  if (app.state.captureMode || !globalThis.history?.replaceState) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (app.clock.playing) return;
    const query = buildQuery(app);
    const url = `${location.pathname}${query}${location.hash}`;
    try {
      history.replaceState(null, '', url);
    } catch {
      /* file:// and sandboxed frames may refuse — deep links are a nicety, not a requirement */
    }
    // A bookmark-friendly title: "Cretaceous · 66 Ma — Life's Tree Blooms".
    const period = getPeriodAtTime(app.clock.currentTimeMa);
    const atStart = app.clock.currentTimeMa >= TIMING.startTimeMa;
    document.title = atStart || !period
      ? BASE_TITLE
      : `${period.label || period.period} · ${formatMa(app.clock.currentTimeMa)} — Life's Tree Blooms`;
  }, 400);
}
