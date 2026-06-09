// Main entry point — bootstraps clock, views, sidebar, controls, and runs the animation loop.

import { GeoClock } from './engine/clock.js';
import { getPolygonsAtTime } from './engine/interpolator.js';
import { getBoundariesAtTime } from './engine/plateBoundaryInterpolator.js';
import { View2D } from './views/view2d.js';
import { Sidebar } from './ui/sidebar.js';
import { Controls } from './ui/controls.js';
import { ExtinctionOverlay } from './ui/extinctionOverlay.js';
import { MilestoneOverlay } from './ui/milestoneOverlay.js';
import { SpeciesPopup } from './ui/speciesPopup.js';
import { SpeciesModal } from './ui/speciesModal.js';
import { Legend } from './ui/legend.js';
import { HistoryExplorer } from './ui/historyExplorer.js';
import { initCapture } from './capture.js';
import {
  getTemperatureAtTime,
  getOxygenAtTime,
  getCO2AtTime,
} from './data/atmosphere.js';
import { species as allSpecies, getSpeciesAtTime } from './data/species.js';
import { loadSettings, saveSetting, readUrlState, writeUrlState, buildShareUrl } from './util/settings.js';

// --- Initialize ---

const clock = new GeoClock();
const vizContainer = document.getElementById('viz-container');
const view2d = new View2D(vizContainer);
let view3d = null; // Lazy-loaded
let activeView = view2d;
let currentMode = '2d';
let showBoundaries = true; // default on; applyInitialState() reconciles with stored/URL prefs
let loadingView3d = false; // guards against double-import when 3D is clicked rapidly

const sidebar = new Sidebar();
const controls = new Controls(clock);
clock.onPlayingChange = () => controls.syncPlayButton();
clock.subscribe(() => scheduleFrame());
const extinctionOverlay = new ExtinctionOverlay();
const milestoneOverlay = new MilestoneOverlay();
const popup = new SpeciesPopup();
const speciesModal = new SpeciesModal(clock, controls);
const legend = new Legend();
const historyExplorer = new HistoryExplorer(clock, controls);
sidebar.attachPopup(popup);
sidebar.attachModal(speciesModal);
legend.attachPopup(popup);
legend.attachModal(speciesModal);
legend.attachAllSpecies(allSpecies);

// Wire hover from views into popup. view3d hooks up after lazy load.
view2d.onSpeciesHover((sp, x, y) => {
  if (sp) popup.show(sp, x, y);
  else popup.hide();
});

// Initialize 2D view
view2d.init();

// Respect the OS "reduce motion" preference (no auto-rotate, no marker pulse).
const reduceMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
function applyReducedMotion() {
  const r = reduceMotionMq.matches;
  view2d.setReducedMotion(r);
  if (view3d) view3d.setReducedMotion(r);
  scheduleFrame();
}
reduceMotionMq.addEventListener('change', applyReducedMotion);
view2d.setReducedMotion(reduceMotionMq.matches); // flag only at boot; initial render follows

// Keep pan/zoom (mouse + touch) responsive even while the clock is paused.
view2d.onInteraction(() => scheduleFrame());

// Resize handling
const resizeObserver = new ResizeObserver(() => {
  activeView.resize();
});
resizeObserver.observe(vizContainer);

// --- View Switching ---

const btn2d = document.getElementById('btn-2d');
const btn3d = document.getElementById('btn-3d');

btn2d.addEventListener('click', () => switchView('2d'));
btn3d.addEventListener('click', () => switchView('3d'));

// --- Plate Boundary Toggle ---

const btnPlates = document.getElementById('btn-plates');
btnPlates.addEventListener('click', () => {
  showBoundaries = !showBoundaries;
  btnPlates.classList.toggle('active', showBoundaries);
  saveSetting({ plates: showBoundaries });
  syncUrl();
  scheduleFrame();
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'p') {
    showBoundaries = !showBoundaries;
    btnPlates.classList.toggle('active', showBoundaries);
    saveSetting({ plates: showBoundaries });
    syncUrl();
    scheduleFrame();
  }
});

// --- Elevation Exaggeration Slider (3D globe relief) ---

let elevationExaggeration = 1.0;
const elevationSlider = document.getElementById('elevation-slider');
const elevationValue = document.getElementById('elevation-value');
const reliefControl = document.getElementById('relief-control');

elevationSlider.addEventListener('input', () => {
  elevationExaggeration = parseFloat(elevationSlider.value);
  elevationValue.textContent = elevationExaggeration.toFixed(1) + '×';
  if (view3d) view3d.setElevationExaggeration(elevationExaggeration);
  scheduleFrame(); // re-render one frame even while paused
  saveSetting({ elevation: elevationExaggeration });
  syncUrl();
});

// --- Keyboard shortcuts help overlay ---

const helpOverlay = document.getElementById('help-overlay');
const btnHelp = document.getElementById('btn-help');
const helpClose = document.getElementById('help-close');
let helpLastFocus = null;
function toggleHelp(force) {
  const show = typeof force === 'boolean' ? force : helpOverlay.classList.contains('hidden');
  helpOverlay.classList.toggle('hidden', !show);
  // Focus management mirrors the species modal (a11y).
  if (show) {
    helpLastFocus = document.activeElement;
    helpClose.focus();
  } else if (helpLastFocus && typeof helpLastFocus.focus === 'function') {
    helpLastFocus.focus();
    helpLastFocus = null;
  }
}
btnHelp.addEventListener('click', () => toggleHelp());
helpClose.addEventListener('click', () => toggleHelp(false));
helpOverlay.addEventListener('click', (e) => { if (e.target === helpOverlay) toggleHelp(false); });
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === '?') { e.preventDefault(); toggleHelp(); }
  else if (e.key === 'Escape' && !helpOverlay.classList.contains('hidden')) {
    toggleHelp(false);
    // One layer per press — keep the history/drawer handler from also firing.
    e.preventDefault();
    e.stopImmediatePropagation();
  }
});

// --- Share link + jump-to-moment ---

const btnShare = document.getElementById('btn-share');
btnShare.addEventListener('click', async () => {
  const url = buildShareUrl(currentState());
  try {
    await navigator.clipboard.writeText(url);
    btnShare.textContent = 'Copied!';
    btnShare.classList.add('copied');
  } catch {
    window.prompt('Copy this link:', url); // clipboard blocked (insecure context)
  }
  setTimeout(() => { btnShare.textContent = 'Share'; btnShare.classList.remove('copied'); }, 1500);
});

// --- History of Life explorer (left-docked chapter panel) ---

historyExplorer.onJump = () => syncUrl();
document.getElementById('btn-history').addEventListener('click', () => historyExplorer.toggle());
// Era-strip period clicks use scrub semantics; reflect them in the URL too.
controls.onTimeJump = () => syncUrl();

// --- Mobile sidebar drawer (the off-canvas CSS only engages ≤768px) ---

const sidebarEl = document.getElementById('sidebar');
const btnSidebar = document.getElementById('btn-sidebar');
const sidebarScrim = document.getElementById('sidebar-scrim');
function setSidebarOpen(open) {
  sidebarEl.classList.toggle('open', open);
  sidebarScrim.classList.toggle('hidden', !open);
  btnSidebar.setAttribute('aria-expanded', String(open));
}
btnSidebar.addEventListener('click', () => setSidebarOpen(!sidebarEl.classList.contains('open')));
sidebarScrim.addEventListener('click', () => setSidebarOpen(false));
// Returning to the desktop layout puts the sidebar back in the grid — drop drawer state.
window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => {
  if (e.matches) setSidebarOpen(false);
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'h') {
    historyExplorer.toggle();
  } else if (e.key === 'Escape') {
    // Close only the top-most layer: the species modal and help overlay have
    // their own Escape handlers, so stand down while either is open.
    if (speciesModal.isOpen()) return;
    if (!helpOverlay.classList.contains('hidden')) return;
    if (sidebarEl.classList.contains('open')) setSidebarOpen(false);
    else if (historyExplorer.isOpen()) historyExplorer.close();
  }
});

async function switchView(mode) {
  if (mode === currentMode) return;

  if (mode === '3d') {
    // Lazy load 3D view
    if (!view3d) {
      if (loadingView3d) return; // import already in flight from a prior click
      loadingView3d = true;
      try {
        const { View3D } = await import('./views/view3d.js');
        view3d = new View3D(vizContainer);
        view3d.onSpeciesHover((sp, x, y) => {
          if (sp) popup.show(sp, x, y);
          else popup.hide();
        });
        view3d.onInteraction(() => scheduleFrame()); // live drag/zoom while paused
        view3d.setReducedMotion(reduceMotionMq.matches);
      } catch (err) {
        console.error('Failed to load 3D view:', err);
        alert('3D Globe requires WebGL support. Please use a modern browser.');
        return;
      } finally {
        loadingView3d = false;
      }
    }

    activeView.destroy();
    activeView = view3d;
    activeView.init();

    document.getElementById('canvas2d').style.display = 'none';
    document.getElementById('globe-container').style.display = 'block';

    btn2d.classList.remove('active');
    btn3d.classList.add('active');

    // Re-apply current relief setting (instance may have been re-init'd) + reveal slider.
    view3d.setElevationExaggeration(elevationExaggeration);
    view3d.setReducedMotion(reduceMotionMq.matches);
    reliefControl.style.display = 'flex';
  } else {
    activeView.destroy();
    activeView = view2d;
    activeView.init();

    document.getElementById('globe-container').style.display = 'none';
    document.getElementById('canvas2d').style.display = 'block';

    btn3d.classList.remove('active');
    btn2d.classList.add('active');

    reliefControl.style.display = 'none';
  }

  activeView.resize();
  currentMode = mode;
  saveSetting({ view: mode });
  syncUrl();
  scheduleFrame(); // render the newly-active view at least once, even while paused
}

// --- Animation Loop ---

// The loop only runs while `clock.playing` is true. `scheduleFrame()` re-arms it
// when the clock wakes (play/restart/scrub/extinction-resume/capture-API). This
// keeps CPU near idle once the timeline auto-pauses at t = 0 Ma.
let lastTimestamp = 0;
let rafId = null;
let inFrame = false; // true while animate() runs; blocks tick()'s notify from re-arming

function scheduleFrame() {
  // While a frame is executing, animate() re-arms itself at the end — so ignore the
  // re-entrant call that clock.tick()'s _notify() makes mid-frame. Without this guard
  // that call both resets lastTimestamp (corrupting delta) and queues a second RAF,
  // doubling the callback count every frame until the page hangs.
  if (rafId === null && !inFrame) {
    lastTimestamp = 0;
    rafId = requestAnimationFrame(animate);
  }
}

// Sun longitude rotates once per ~12 real seconds — drives day/night terminator on the 3D globe.
const SUN_PERIOD_SEC = 12;
function buildAtmoSnapshot(timeMa, nowMs) {
  return {
    tempC: getTemperatureAtTime(timeMa),
    o2Pct: getOxygenAtTime(timeMa),
    co2Ppm: getCO2AtTime(timeMa),
    sunLon: ((nowMs / 1000) % SUN_PERIOD_SEC) / SUN_PERIOD_SEC * 360 - 180,
  };
}

function animate(timestamp) {
  inFrame = true;
  rafId = null;
  const delta = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0;
  lastTimestamp = timestamp;

  // Cap delta to prevent huge jumps when tab is backgrounded
  const clampedDelta = Math.min(delta, 0.1);

  // 1. Advance clock
  clock.tick(clampedDelta);
  const t = clock.currentTimeMa;

  // 2. Get interpolated continental polygons
  const polygons = getPolygonsAtTime(t);

  // 2.5. Get plate boundaries if toggled on
  const boundaries = showBoundaries ? getBoundariesAtTime(t) : null;

  // 2.75. Build atmosphere snapshot for visual effects
  const atmo = buildAtmoSnapshot(t, timestamp);

  // 3. Render active view
  activeView.render(polygons, t, boundaries, atmo);

  // 4. Update UI
  sidebar.update(t);
  controls.updateDisplay(t);
  extinctionOverlay.update(t);
  milestoneOverlay.update(t);
  legend.update(t);
  historyExplorer.update(t);

  if (clock.playing) {
    rafId = requestAnimationFrame(animate);
  }
  inFrame = false;
}

// --- Persisted preferences + shareable URL state ---

function currentState() {
  return {
    time: clock.currentTimeMa,
    view: currentMode,
    plates: showBoundaries,
    elevation: elevationExaggeration,
  };
}
// Reflect the live view in the address bar so it's copy-paste shareable.
function syncUrl() {
  writeUrlState(currentState());
}

legend.onToggle = (open) => saveSetting({ legend: open });

const speedSelectEl = document.getElementById('speed-select');
speedSelectEl.addEventListener('change', () => {
  saveSetting({ speed: parseFloat(speedSelectEl.value) });
  syncUrl();
});
// Scrubber drag-end (controls.js owns the live 'input'); update URL on release.
document.getElementById('scrubber').addEventListener('change', syncUrl);

// Restore on boot. URL params win over stored prefs so shared links are exact.
(function applyInitialState() {
  const init = { ...loadSettings(), ...readUrlState() };

  if (typeof init.speed === 'number') {
    clock.setSpeed(init.speed);
    speedSelectEl.value = String(init.speed);
  }
  if (typeof init.elevation === 'number') {
    elevationExaggeration = init.elevation;
    elevationSlider.value = String(init.elevation);
    elevationValue.textContent = init.elevation.toFixed(1) + '×';
  }
  // Plates default on; an explicit stored/URL `false` turns them back off.
  showBoundaries = init.plates !== false;
  btnPlates.classList.toggle('active', showBoundaries);
  btnPlates.setAttribute('aria-pressed', String(showBoundaries));
  // Legend defaults open on desktop but closed on small screens (it overlays
  // most of the map there). A stored preference always wins.
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  legend.setOpen(init.legend === undefined ? !smallScreen : init.legend !== false);
  if (typeof init.time === 'number') clock.setTime(init.time);
  if (init.view === '3d') switchView('3d'); // async; re-applies elevation + schedules a frame
})();

// Initial render
const initialPolygons = getPolygonsAtTime(clock.currentTimeMa);
const initialBoundaries = showBoundaries ? getBoundariesAtTime(clock.currentTimeMa) : null;
const initialAtmo = buildAtmoSnapshot(clock.currentTimeMa, performance.now());
activeView.render(initialPolygons, clock.currentTimeMa, initialBoundaries, initialAtmo);
sidebar.update(clock.currentTimeMa);
controls.updateDisplay(clock.currentTimeMa);

// Auto-start playback on load so the animation begins immediately.
// clock.play() notifies subscribers (arming the RAF loop); sync the play button to match.
// Skip if a shared link already lands at the present (t = 0) — there's nothing left to play,
// and the natural end-of-timeline stop wouldn't re-sync the button.
if (clock.currentTimeMa > 0) {
  clock.play();
  controls.syncPlayButton();
}
scheduleFrame();

// Capture mode (no-op without `?capture=1`). Exposes window.__capture for headless
// recording scripts; see scripts/capture/.
initCapture({
  clock,
  controls,
  switchView,
  getViewMode: () => currentMode,
  setBoundaries: (on) => {
    showBoundaries = !!on;
    btnPlates.classList.toggle('active', showBoundaries);
  },
  setElevation: (v) => {
    elevationExaggeration = Number(v);
    elevationSlider.value = String(elevationExaggeration);
    elevationValue.textContent = elevationExaggeration.toFixed(1) + '×';
    if (view3d) view3d.setElevationExaggeration(elevationExaggeration);
    scheduleFrame();
  },
  openSpeciesModal: (speciesId) => {
    const sp = allSpecies.find((s) => s.id === speciesId);
    if (!sp) return;
    speciesModal.open(sp, getSpeciesAtTime(clock.currentTimeMa));
  },
  closeSpeciesModal: () => speciesModal.close(),
});
