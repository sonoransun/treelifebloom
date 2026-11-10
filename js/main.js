// Composition root — builds the clock, views and UI components, then runs the single
// requestAnimationFrame loop that drives everything.
//
// Per frame:
//   1. clock.tick(dt)                      advance geological time (or sit in an extinction hold)
//   2. buildFrame()                        compute everything about this moment ONCE (see below)
//   3. activeView.render(polygons, timeMa, boundaries, atmo, frame)
//   4. component.update(frame)             for every UI component
//
// Components never reference each other: they receive `app` (clock, bus, state, actions) in their
// constructor and talk through the event bus (js/engine/bus.js).
//
// Nothing that fails in one part may freeze the show: a component or view that throws while
// starting, a frame input that throws, a view that throws in render/resize/destroy — each is
// isolated, logged once, and everything else carries on.

import { ATMOSPHERE, TIMING } from './config.js';
import { GeoClock, staticCrisisIntensity } from './engine/clock.js';
import { bus } from './engine/bus.js';
import { getPolygonsAtTime } from './engine/interpolator.js';
import { getBoundariesAtTime } from './engine/plateBoundaryInterpolator.js';
import { placeSpecies } from './engine/geo.js';
import { readUrlState, resetTitle, scheduleUrlUpdate } from './engine/urlState.js';
import { getPeriodAtTime } from './data/timeline.js';
import { getActiveExtinction } from './data/extinctions.js';
import { getActiveMilestone } from './data/milestones.js';
import { getSpeciesAtTime, speciesById } from './data/species.js';
import { getTemperatureAtTime, getOxygenAtTime, getCO2AtTime } from './data/atmosphere.js';
import { getPlanetLook } from './util/planetLook.js';
import { View2D } from './views/view2d.js';
import { Toolbar } from './ui/toolbar.js';
import { Shortcuts } from './ui/shortcuts.js';
import { Controls } from './ui/controls.js';
import { Sidebar } from './ui/sidebar.js';
import { ContextCard } from './ui/contextCard.js';
import { ExtinctionOverlay } from './ui/extinctionOverlay.js';
import { MilestoneOverlay } from './ui/milestoneOverlay.js';
import { SpeciesPopup } from './ui/speciesPopup.js';
import { SpeciesModal } from './ui/speciesModal.js';
import { Legend } from './ui/legend.js';
import { Chapters } from './ui/chapters.js';
import { Help } from './ui/help.js';
import { Intro } from './ui/intro.js';
import { initCapture, isCaptureMode } from './capture.js';

// ---------------------------------------------------------------------------------------------
// Failure isolation (one console line per failing part, however often it fails)
// ---------------------------------------------------------------------------------------------

const reportedFailures = new Set();
function reportFailure(label, err) {
  if (reportedFailures.has(label)) return;
  reportedFailures.add(label);
  console.error(`${label} failed:`, err);
}
function guarded(label, fn) {
  try {
    fn();
  } catch (err) {
    reportFailure(label, err);
  }
}

// ---------------------------------------------------------------------------------------------
// App context shared with every component
// ---------------------------------------------------------------------------------------------

const clock = new GeoClock();
const vizContainer = document.getElementById('viz-container');
const appEl = document.getElementById('app');
const noticeEl = document.getElementById('view-notice');
const liveEl = document.getElementById('live-region');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

// Motion preference: the OS setting, unless the viewer overrode it in Help (persisted).
const MOTION_KEY = 'ltb:motion';
function storedMotion() {
  try {
    const v = localStorage.getItem(MOTION_KEY);
    return v === 'reduced' || v === 'full' ? v : null;
  } catch {
    return null;
  }
}
function resolveReducedMotion() {
  const override = storedMotion();
  return override ? override === 'reduced' : reducedMotionQuery.matches;
}

const state = {
  view: 'map',                 // 'map' | 'globe' | 'tree'
  layers: { plates: false, labels: true },
  hoverId: null,               // species under the pointer (any surface)
  focusId: null,               // species shown in the dialog
  reducedMotion: resolveReducedMotion(),
  captureMode: isCaptureMode(),
};
function applyMotion() {
  state.reducedMotion = resolveReducedMotion();
  // css/styles.css switches transitions off under [data-motion="reduced"].
  document.documentElement.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
  bus.emit('motion:changed', { reduced: state.reducedMotion, override: storedMotion() });
}
reducedMotionQuery.addEventListener('change', applyMotion);
applyMotion();

const VIEW_ALIASES = { '2d': 'map', '3d': 'globe', map: 'map', globe: 'globe', tree: 'tree' };

const app = {
  clock,
  bus,
  state,
  /** Jump to a time (Ma); optionally start playing. */
  seek(ma, { play = false } = {}) {
    clock.setTime(ma);
    if (play) clock.play();
    broadcastPlaying();
  },
  play() { clock.play(); broadcastPlaying(); },
  pause() { clock.pause(); broadcastPlaying(); },
  togglePlay() { clock.togglePlay(); broadcastPlaying(); },
  /** Back to the beginning; keeps playing if it was playing. */
  restart() {
    const wasPlaying = clock.playing;
    clock.restart();
    if (wasPlaying) clock.play();
    broadcastPlaying();
  },
  setSpeed(multiplier) {
    clock.setSpeed(multiplier);
    bus.emit('clock:speed', { speed: clock.speedMultiplier });
    scheduleUrlUpdate(app);
  },
  setView: (mode) => switchView(mode),
  setLayer(name, on) {
    if (!Object.hasOwn(state.layers, name)) return; // not 'constructor' & co. either
    state.layers[name] = !!on;
    bus.emit('layer:changed', { name, on: state.layers[name] });
    scheduleUrlUpdate(app);
  },
  toggleLayer(name) { app.setLayer(name, !state.layers[name]); },
  /** Brief status pill at the bottom of the visualization (hints, loading). */
  notice(text, ms = 2600) { showNotice(text, ms); },
  announce(text) { announce(text); },
  /** 'reduced' | 'full' to override the OS motion preference, or null to follow it again. */
  setMotionPreference(value) {
    try {
      if (value === 'reduced' || value === 'full') localStorage.setItem(MOTION_KEY, value);
      else localStorage.removeItem(MOTION_KEY);
    } catch {
      /* storage unavailable — the override simply will not persist */
    }
    applyMotion();
  },
  getMotionPreference: () => storedMotion(),
  speciesById,
};

function broadcastPlaying() {
  bus.emit('clock:playing', { playing: clock.playing });
  if (clock.playing) resetTitle(app);
  else scheduleUrlUpdate(app);
}

clock.onPlayingChange = broadcastPlaying;
clock.onHoldChange = (hold) => bus.emit('clock:hold', { hold });
clock.onEnd = () => bus.emit('clock:end', {});

// Screen-reader announcements made during one task are written together (the live region is
// aria-atomic, so all of them are read): a component announcing on the frame where the period
// changes is no longer overwritten by the period name.
let pendingAnnouncements = null;
function announce(text) {
  if (text == null || text === '') return;
  if (!pendingAnnouncements) {
    pendingAnnouncements = [];
    queueMicrotask(flushAnnouncements);
  }
  const line = String(text);
  if (!pendingAnnouncements.includes(line)) pendingAnnouncements.push(line);
}
function flushAnnouncements() {
  const lines = pendingAnnouncements;
  pendingAnnouncements = null;
  if (lines.length === 1) {
    liveEl.textContent = lines[0];
    return;
  }
  liveEl.replaceChildren(...lines.map((text) => {
    const el = document.createElement('div');
    el.textContent = text;
    return el;
  }));
}

// ---------------------------------------------------------------------------------------------
// Views (the globe and tree are lazy-loaded on first use and kept alive afterwards)
// ---------------------------------------------------------------------------------------------

// Stand-in for a map view that could not be constructed: the chrome keeps working around an
// empty stage instead of the whole app failing to boot.
const INERT_VIEW = { init() {}, render() {}, resize() {}, destroy() {} };
function createMapView() {
  try {
    return new View2D(vizContainer);
  } catch (err) {
    reportFailure('The map view', err);
    return INERT_VIEW;
  }
}

const views = {
  map: createMapView(),
  globe: null,
  tree: null,
};
// Lazy views: download the module once (shared by every request), construct when first shown.
const LAZY_VIEWS = {
  globe: { load: () => import('./views/view3d.js'), create: (m) => new m.View3D(vizContainer) },
  tree: { load: () => import('./views/viewTree.js'), create: (m) => new m.ViewTree(vizContainer) },
};
const VIEW_LABELS = { map: 'world map', globe: 'globe', tree: 'tree of life' };

function wireView(view, source) {
  if (view.onSpeciesHover) {
    view.onSpeciesHover((sp, x, y) => {
      bus.emit('species:hover', { id: sp ? sp.id : null, x, y, source });
    });
  }
  if (view.onSpeciesClick) {
    view.onSpeciesClick((sp) => { if (sp) bus.emit('species:open', { id: sp.id }); });
  }
}

let activeView = views.map;
wireView(views.map, 'map');
guarded('map view init', () => activeView.init());

const moduleLoads = {};
function loadViewModule(mode) {
  if (!moduleLoads[mode]) {
    moduleLoads[mode] = LAZY_VIEWS[mode].load().catch((err) => {
      moduleLoads[mode] = null;
      console.error(`Failed to load the ${mode} view:`, err);
      throw err;
    });
  }
  return moduleLoads[mode];
}

// View switches: the latest request wins. A view that still has to be downloaded (the globe pulls
// three.js from a CDN) loads outside any queue, so asking for another view meanwhile never waits
// behind it, and an abandoned download is never shown. The swap itself is synchronous, so two
// switches cannot interleave their destroy()/init(). Every returned promise settles once the app
// has settled on the newest request.
let switchSeq = 0;
let switchSettled = Promise.resolve();
let overtakePending = null;    // wakes the request that is waiting for a download, if any

function switchView(requested) {
  const mode = Object.hasOwn(VIEW_ALIASES, requested) ? VIEW_ALIASES[requested] : null;
  if (!mode) return switchSettled;
  const id = ++switchSeq;
  if (overtakePending) overtakePending();
  const overtaken = new Promise((resolve) => { overtakePending = resolve; });
  switchSettled = carryOutSwitch(id, mode, overtaken)
    .catch((err) => console.error('View switch failed:', err));
  return switchSettled;
}

async function carryOutSwitch(id, mode, overtaken) {
  await null; // a burst of synchronous requests collapses onto the last one
  if (id !== switchSeq) return switchSettled;
  if (mode === state.view) {
    hideNotice('loading'); // e.g. back to the map while the globe was still loading
    return undefined;
  }
  if (!views[mode]) {
    showNotice(`Loading the ${VIEW_LABELS[mode]}…`, 0, 'loading');
    let module;
    try {
      module = await Promise.race([loadViewModule(mode), overtaken]);
    } catch {
      if (id !== switchSeq) return switchSettled;
      // The browser keeps a failed module fetch failed for the life of the page: only a reload
      // can help, so say so.
      const why = mode === 'globe' ? ' (it fetches three.js over the network)' : '';
      showNotice(`Sorry — the ${VIEW_LABELS[mode]} could not be loaded${why}. Reload the page to try again.`, 7000);
      return undefined;
    }
    if (id !== switchSeq) return switchSettled; // a newer request took over during the download
    try {
      views[mode] = LAZY_VIEWS[mode].create(module);
      wireView(views[mode], mode);
    } catch (err) {
      reportFailure(`Creating the ${mode} view`, err);
      showNotice(`Sorry — the ${VIEW_LABELS[mode]} is not available in this browser.`, 6000);
      return undefined;
    }
  }
  swapTo(mode, views[mode]);
  return undefined;
}

/** The synchronous part of a switch: hand the stage from the active view to `next`. */
function swapTo(mode, next) {
  hideNotice('loading');
  bus.emit('species:hover', { id: null, x: 0, y: 0, source: state.view });
  try {
    activeView.destroy();
  } catch (err) {
    // Carry on: a view that cannot be left would trap the viewer on it.
    console.error(`The ${state.view} view failed to close:`, err);
  }
  activeView = next;
  let shown = mode;
  try {
    next.init();
  } catch (err) {
    // e.g. WebGL context creation failed: fall back to the map rather than a dead stage.
    console.error(`Failed to start the ${mode} view:`, err);
    if (next !== views.map) {
      try {
        next.destroy(); // it may have shown its element before throwing
      } catch {
        /* it never fully started */
      }
      views[mode] = null; // a later request starts a fresh instance
      activeView = views.map;
      guarded('map view init', () => activeView.init());
      shown = 'map';
    }
  }
  guarded(`${shown} view resize`, () => activeView.resize());
  state.view = shown;
  appEl.dataset.view = shown;
  bus.emit('view:changed', { mode: shown });
  scheduleUrlUpdate(app);
  if (shown !== mode) showNotice(`Sorry — the ${VIEW_LABELS[mode]} is not available in this browser.`, 6000);
}

const resizeObserver = new ResizeObserver(() => guarded(`${state.view} view resize`, () => activeView.resize()));
resizeObserver.observe(vizContainer);

// ---------------------------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------------------------

let noticeTimer = null;
let noticeKind = null;         // 'loading' while a view-download notice is up
function showNotice(text, ms, kind = null) {
  clearTimeout(noticeTimer);
  noticeKind = kind;
  noticeEl.textContent = text;
  noticeEl.classList.remove('hidden');
  if (ms > 0) noticeTimer = setTimeout(hideNotice, ms);
}
/** Hide the notice; with `kind`, only if that kind of notice is still the one showing. */
function hideNotice(kind) {
  if (kind && kind !== noticeKind) return;
  clearTimeout(noticeTimer);
  noticeKind = null;
  noticeEl.classList.add('hidden');
}

// ---------------------------------------------------------------------------------------------
// UI components
// ---------------------------------------------------------------------------------------------

// A component that throws while starting is left out (and logged) instead of taking the whole
// app down with it.
function start(Component) {
  try {
    return new Component(app);
  } catch (err) {
    reportFailure(`Starting ${Component.name}`, err);
    return null;
  }
}

const components = [
  Toolbar,
  Controls,
  Sidebar,
  ContextCard,
  ExtinctionOverlay,
  MilestoneOverlay,
  SpeciesPopup,
  SpeciesModal,
  Legend,
  Chapters,
  Help,
  Intro,
].map(start).filter(Boolean);
start(Shortcuts);

// Cross-cutting bus wiring that belongs to the root.
bus.on('species:hover', ({ id }) => { state.hoverId = id; });
bus.on('species:focus', ({ id }) => { state.focusId = id; });
bus.on('time:seek', ({ ma, play }) => app.seek(ma, { play: !!play }));
bus.on('time:nudge', ({ seconds }) => { clock.nudge(seconds); scheduleUrlUpdate(app); });
bus.on('clock:toggle', () => app.togglePlay());
bus.on('view:set', ({ mode }) => switchView(mode));
bus.on('layer:set', ({ name, on }) => app.setLayer(name, on));
bus.on('ui:announce', ({ text }) => app.announce(text));

// ---------------------------------------------------------------------------------------------
// Frame context
// ---------------------------------------------------------------------------------------------

// Sun longitude sweeps once per minute — a slow terminator drift for the globe.
const SUN_PERIOD_SEC = 60;
const MODERN_ATMO = { tempC: ATMOSPHERE.modernTempC, o2Pct: ATMOSPHERE.modernO2Pct, co2Ppm: ATMOSPHERE.modernCo2Ppm };

let lastTimestamp = 0;
let prevAliveIds = new Set();
let prevJumps = clock.jumps;
let prevPeriod = null;
// Last good value of each replaceable frame input (see frameInput).
const lastGood = { atmo: null, polygons: [], alive: [], period: null, look: null };

/**
 * One frame input. If it throws (data and engine modules are being rewritten), log it once and
 * use `fallback` (a value, or a function returning one) so the frame — and with it every view
 * and component — still goes out.
 */
function frameInput(label, fn, fallback) {
  try {
    return fn();
  } catch (err) {
    reportFailure(`Frame input "${label}"`, err);
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

/** Marker positions straight from the data, for when placeSpecies() throws. */
function positionsFromData(alive) {
  const out = new Map();
  for (const sp of alive) if (sp.location) out.set(sp.id, { lon: sp.location.lon, lat: sp.location.lat });
  return out;
}

function buildFrame(timestamp, dtSec, advanced) {
  const timeMa = clock.currentTimeMa;
  const nowSec = timestamp / 1000;
  const sunLon = ((nowSec % SUN_PERIOD_SEC) / SUN_PERIOD_SEC) * 360 - 180;

  const atmo = (lastGood.atmo = frameInput('atmosphere', () => ({
    tempC: getTemperatureAtTime(timeMa),
    o2Pct: getOxygenAtTime(timeMa),
    co2Ppm: getCO2AtTime(timeMa),
    sunLon,
  }), () => ({ ...(lastGood.atmo || MODERN_ATMO), sunLon })));

  const polygons = (lastGood.polygons = frameInput('continents', () => getPolygonsAtTime(timeMa), lastGood.polygons));
  const boundaries = state.layers.plates ? frameInput('plate boundaries', () => getBoundariesAtTime(timeMa), null) : null;
  const freshAlive = frameInput('species', () => getSpeciesAtTime(timeMa), null);
  if (freshAlive) lastGood.alive = freshAlive;
  const alive = lastGood.alive;
  const period = (lastGood.period = frameInput('period', () => getPeriodAtTime(timeMa), lastGood.period));
  const extinction = frameInput('extinction', () => getActiveExtinction(timeMa), null);

  // Who arrived / departed since the previous frame — only meaningful during continuous playback.
  const jumped = clock.jumps !== prevJumps;
  prevJumps = clock.jumps;
  const arrivals = [];
  const departures = [];
  if (freshAlive) {
    const aliveIds = new Set();
    for (const s of alive) aliveIds.add(s.id);
    if (advanced && !jumped && prevAliveIds) {
      for (const id of aliveIds) if (!prevAliveIds.has(id)) arrivals.push(id);
      for (const id of prevAliveIds) if (!aliveIds.has(id)) departures.push(id);
    }
    prevAliveIds = aliveIds;
  } else if (jumped) {
    prevAliveIds = null; // jumped while the list was failing: no diff when it comes back
  }

  // One envelope for "how much crisis should the visuals show": the real-time staged event during
  // playback, or a static bell over the window when the user scrubbed into it.
  let crisis = null;
  const ev = clock.event;
  if (ev) {
    crisis = {
      extinction: ev.extinction,
      intensity: ev.intensity,
      elapsedSec: ev.elapsedSec,
      phase: ev.phase,
      progress: extinction ? extinction.progress : 1,
    };
  } else if (extinction) {
    crisis = {
      extinction,
      intensity: staticCrisisIntensity(extinction.progress),
      elapsedSec: null,
      phase: 'static',
      progress: extinction.progress,
    };
  }

  return {
    timeMa,
    fraction: clock.getFraction(),
    nowSec,
    dtSec,
    playing: clock.playing,
    speed: clock.speedMultiplier,
    hold: clock.hold,
    atEnd: clock.atEnd(),
    jumped,
    period,
    periodChanged: period !== prevPeriod,
    polygons,
    boundaries,
    atmo,
    look: (lastGood.look = frameInput('planet look', () => getPlanetLook(timeMa, atmo), lastGood.look)),
    alive,
    positions: frameInput('species placement', () => placeSpecies(alive, polygons, timeMa), () => positionsFromData(alive)),
    arrivals,
    departures,
    extinction,
    crisis,
    milestone: frameInput('milestone', () => getActiveMilestone(timeMa), null),
    layers: state.layers,
    hoverId: state.hoverId,
    focusId: state.focusId,
    view: state.view,
    reducedMotion: state.reducedMotion,
  };
}

// ---------------------------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------------------------

// Longest frame the clock is advanced by. It keeps a tab that comes back from the background from
// leaping through time, without turning a slow device (under 10 fps) into slow motion, holds
// included. The clock stays exact for much longer frames.
const MAX_FRAME_SEC = 0.5;

function animate(timestamp) {
  requestAnimationFrame(animate);

  const delta = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0;
  lastTimestamp = timestamp;
  const dt = Math.min(delta, MAX_FRAME_SEC);

  const advanced = clock.tick(dt);
  let frame = null;
  guarded('frame build', () => { frame = buildFrame(timestamp, dt, advanced); });
  if (!frame) return;

  // Announced before the components update, and in the same batch as anything they announce.
  if (frame.periodChanged) {
    if (prevPeriod && frame.period) app.announce(`${frame.period.label || frame.period.period}`);
    prevPeriod = frame.period;
  }

  guarded(`${state.view} view render`, () => {
    activeView.render(frame.polygons, frame.timeMa, frame.boundaries, frame.atmo, frame);
  });

  for (const component of components) {
    if (component.update) guarded(`${component.constructor.name}.update`, () => component.update(frame));
  }
}

// One-time interaction hints per view (per page load).
const VIEW_HINTS = {
  map: 'Drag to pan · scroll or pinch to zoom · click a marker for its story',
  globe: 'Drag to rotate · scroll or pinch to zoom · click a marker for its story',
  tree: 'Every living tip is on the glowing rim · hover a branch to trace its lineage',
};
const hintedViews = new Set();
function hintView(mode) {
  if (state.captureMode || hintedViews.has(mode)) return;
  hintedViews.add(mode);
  showNotice(VIEW_HINTS[mode], 5200);
}
bus.on('view:changed', ({ mode }) => hintView(mode));
bus.on('intro:dismiss', () => hintView(state.view));

// ---------------------------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------------------------

const urlState = readUrlState();
if (urlState.layers) {
  for (const [name, on] of Object.entries(urlState.layers)) app.setLayer(name, on);
}
if (urlState.speed != null) app.setSpeed(urlState.speed);
if (urlState.timeMa != null) clock.setTime(urlState.timeMa);

// Capture mode (no-op without `?capture=1`). Exposes window.__capture for headless recording
// scripts; see scripts/capture/.
initCapture({ app, getActiveView: () => activeView });

requestAnimationFrame(animate);

(async () => {
  if (urlState.view && urlState.view !== 'map') await switchView(urlState.view);
  if (urlState.play) app.play();
  // A deep link (a time, or play=1) or a capture run goes straight to the scene; everyone else
  // gets the intro card. ?play=1 counts: the story is already running, so no card over it.
  const direct = state.captureMode || urlState.timeMa != null || !!urlState.play;
  bus.emit('app:ready', { direct });
})();
