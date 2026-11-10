// Capture mode — activated via `?capture=1` URL parameter.
// Hides UI chrome and exposes `window.__capture` so an external script (Playwright,
// browser console, etc.) can deterministically drive the visualization for screen
// recording. No-op when the parameter is absent.
//
// Optional `panel` modifier:
//   ?capture=1                — clean: hide everything but the visualization
//   ?capture=1&panel=sidebar  — keep the life & planet panel visible
//   ?capture=1&panel=clock    — keep the context card (period + age) visible
//   ?capture=1&panel=full     — keep both
// Optional `hold` modifier (seconds): override the mass-extinction hold, e.g. &hold=2.
//
// `window.__captureReady` turns true (and `__capture.ready` resolves) on the bus 'app:ready'
// event, i.e. only once a deep-linked view switch and play=1 have been applied. Methods throw
// (async ones reject) on input they cannot honour — an unknown view or species, a time that is
// not a number — so a script fails loudly instead of recording the wrong scene.

import { TIMING } from './config.js';
import { maToFraction } from './engine/timeScale.js';
import { getActiveExtinction } from './data/extinctions.js';

const params = new URLSearchParams(globalThis.location?.search || '');
const enabled = params.get('capture') === '1';
const panel = params.get('panel') || 'clean';

const VIEW_ALIASES = { '2d': 'map', '3d': 'globe', map: 'map', globe: 'globe', tree: 'tree' };
// Panels whose root element css/styles.css hides in capture mode (panel name → root id).
const PANEL_ROOTS = { legend: 'legend-panel', chapters: 'chapters-panel', help: 'help-root' };
// sweep() lands this far (one year) past the edge of a mass-extinction window it steps over.
const EDGE_EPS_MA = 1e-6;

const describe = (value) => (typeof value === 'string' ? JSON.stringify(value) : String(value));

/** A finite number from a number or numeric string; anything else throws (no NaN clock). */
function finite(value, what) {
  const n = typeof value === 'number' ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value)
      : NaN;
  if (!Number.isFinite(n)) {
    throw new TypeError(`__capture.${what}: expected a finite number, got ${describe(value)}`);
  }
  return n;
}

export function isCaptureMode() {
  return enabled;
}

export function initCapture({ app, getActiveView }) {
  if (!enabled) return;

  const { clock, bus, state } = app;

  document.body.classList.add('capture-mode');
  if (panel === 'sidebar' || panel === 'full') {
    document.body.classList.add('capture-mode-with-sidebar');
  }
  if (panel === 'clock' || panel === 'full') {
    document.body.classList.add('capture-mode-with-clock');
  }
  // An empty value is ignored: Number('') is 0, which would silently switch the holds off.
  const holdParam = params.get('hold');
  if (holdParam != null && holdParam.trim() !== '') {
    const hold = Number(holdParam);
    if (Number.isFinite(hold) && hold >= 0) TIMING.extinctionPauseSeconds = hold;
    else console.warn(`capture: ignoring hold=${holdParam} (expected seconds ≥ 0)`);
  }

  // main.js calls initCapture before the boot tail, which emits 'app:ready' after the
  // deep-linked view switch and play=1 — so nobody can start scripting before those land.
  let markReady;
  const ready = new Promise((resolve) => { markReady = resolve; });
  bus.on('app:ready', () => {
    globalThis.__captureReady = true;
    markReady();
  });

  // ---- panels --------------------------------------------------------------------------------
  // css/styles.css hides the legend, chapters and help roots in capture mode. openPanel() sets
  // body.capture-show-<name> (before asking the panel to open, so the panel can see it too) for a
  // rule there to exempt the panel; until one does, the root's own (non-capture) display is pinned
  // inline while the panel reports itself open, and dropped again when it closes.
  const openPanels = new Set(); // panels that report themselves open ('panel:changed')
  const shown = new Set();      // panels a script asked to show (openPanel)
  const pinned = new Set();

  function request(name) {
    shown.add(name);
    document.body.classList.add(`capture-show-${name}`);
  }

  function pin(name) {
    if (!shown.has(name) || !openPanels.has(name) || pinned.has(name)) return;
    const root = PANEL_ROOTS[name] ? document.getElementById(PANEL_ROOTS[name]) : null;
    if (!root || getComputedStyle(root).display !== 'none') return;
    // Style is recomputed synchronously and nothing is painted in between.
    document.body.classList.remove('capture-mode');
    const natural = getComputedStyle(root).display;
    document.body.classList.add('capture-mode');
    if (natural === 'none') return;
    root.style.setProperty('display', natural, 'important');
    pinned.add(name);
  }

  function unshow(name) {
    shown.delete(name);
    document.body.classList.remove(`capture-show-${name}`);
    if (pinned.delete(name)) document.getElementById(PANEL_ROOTS[name])?.style.removeProperty('display');
  }

  bus.on('panel:changed', ({ name, open }) => {
    if (open) {
      openPanels.add(name);
      pin(name);
    } else {
      openPanels.delete(name);
      unshow(name);
    }
  });

  const api = {
    /** Resolves once boot has finished (the bus 'app:ready' event); same moment as __captureReady. */
    ready,
    /**
     * 'map' | 'globe' | 'tree' (legacy '2d' / '3d' still accepted). Resolves once the view is
     * live; rejects on an unknown name, or when the view could not be loaded or started (the app
     * then stays on the previous view — recording on would capture the wrong one).
     */
    async setView(mode) {
      const key = String(mode).toLowerCase();
      const want = Object.hasOwn(VIEW_ALIASES, key) ? VIEW_ALIASES[key] : null;
      if (!want) throw new Error(`__capture.setView: unknown view ${describe(mode)} (map, globe or tree)`);
      await app.setView(want);
      if (state.view !== want) {
        throw new Error(`__capture.setView: the ${want} view did not come up (still showing ${state.view})`);
      }
    },
    setTime(ma) {
      clock.setTime(finite(ma, 'setTime'));
    },
    /** Jump to a 0..1 position on the story axis (0 = formation, 1 = present). */
    seekFraction(fraction) {
      clock.seekFraction(finite(fraction, 'seekFraction'));
    },
    /** Story-axis position (0..1) of a time in Ma. */
    fractionOf(ma) {
      return maToFraction(finite(ma, 'fractionOf'));
    },
    setSpeed(mult) {
      app.setSpeed(finite(mult, 'setSpeed'));
    },
    /** Plate-boundary layer (kept for older scripts; same as setLayer('plates', on)). */
    setBoundaries(on) {
      app.setLayer('plates', !!on);
    },
    setLayer(name, on) {
      app.setLayer(name, !!on);
    },
    /** Seconds the clock holds on a mass extinction (0 disables the hold; negatives count as 0). */
    setHoldSeconds(seconds) {
      TIMING.extinctionPauseSeconds = Math.max(0, finite(seconds, 'setHoldSeconds'));
    },
    skipHold() {
      clock.skipHold();
    },
    openSpeciesModal(speciesId) {
      if (!app.speciesById.has(speciesId)) {
        throw new Error(`__capture.openSpeciesModal: unknown species id ${describe(speciesId)}`);
      }
      bus.emit('species:open', { id: speciesId });
    },
    closeSpeciesModal() {
      // The dialog closes on 'panel:close-all' (there is no species-only close request), which
      // closes every other panel too — reopen the ones that were open before.
      const reopen = [...openPanels].filter((name) => name in PANEL_ROOTS);
      const reshow = [...shown];
      bus.emit('panel:close-all', {});
      for (const name of reshow) request(name);
      for (const name of reopen) bus.emit('panel:toggle', { name, open: true });
      for (const name of reshow) pin(name);
    },
    /**
     * Open a panel ('legend' | 'chapters' | 'help' | 'sidebar') and show it in capture mode. The
     * help dialog currently declines to open in capture mode (js/ui/help.js).
     */
    openPanel(name) {
      request(name);
      bus.emit('panel:toggle', { name, open: true });
      pin(name);
    },
    closePanel(name) {
      unshow(name);
      bus.emit('panel:toggle', { name, open: false });
    },
    play() {
      app.play();
    },
    pause() {
      app.pause();
    },
    /**
     * Play until the clock reaches `ma` — and, unless `aftermath` is false, until the fade-out of
     * a mass extinction crossed on the way has finished — then pause on that very frame.
     * Resolves { reason, events, state }: reason is 'reached', 'end' (the story ended first),
     * 'stopped' (something else paused playback) or 'timeout'; events lists the extinctions
     * staged on the way.
     */
    playUntil(ma, { timeoutMs = 30000, aftermath = true } = {}) {
      const target = finite(ma, 'playUntil');
      const limitMs = finite(timeoutMs, 'playUntil timeoutMs');
      return new Promise((resolve) => {
        const events = [];
        const t0 = performance.now();
        const finish = (reason) => {
          app.pause();
          resolve({ reason, events, state: api.state() });
        };
        // Runs after the app's own frame callback, so the pause lands on the frame just drawn.
        const check = () => {
          const ev = clock.event;
          if (ev && !events.includes(ev.id)) events.push(ev.id);
          const reached = clock.currentTimeMa <= target;
          const fading = aftermath && ev && ev.phase === 'aftermath';
          if (reached && !fading) finish('reached');
          else if (clock.atEnd()) finish(reached ? 'reached' : 'end');
          else if (!clock.playing) finish('stopped');
          else if (performance.now() - t0 > limitMs) finish('timeout');
          else requestAnimationFrame(check);
        };
        app.play();
        requestAnimationFrame(check);
      });
    },
    /**
     * Time-lapse: glide the clock evenly along the story axis from `fromMa` to `toMa` over
     * `durationMs`, one seek per animation frame; resolves with state() when done. Mass-extinction
     * windows are stepped over — scrubbing into one shows its full crisis look at once, which in a
     * time-lapse flashes for a single frame. body.capture-sweeping is set meanwhile.
     */
    sweep(fromMa, toMa, durationMs) {
      const from = finite(fromMa, 'sweep');
      const to = finite(toMa, 'sweep');
      const ms = Math.max(0, finite(durationMs, 'sweep'));
      const f0 = maToFraction(from);
      const f1 = maToFraction(to);
      const towardPresent = to < from;
      app.pause();
      document.body.classList.add('capture-sweeping');
      return new Promise((resolve, reject) => {
        const t0 = performance.now();
        const step = () => {
          try {
            const k = ms > 0 ? Math.min(1, (performance.now() - t0) / ms) : 1;
            clock.seekFraction(f0 + (f1 - f0) * k);
            // Land just past the far edge (a few rounds in case two windows ever touch).
            for (let i = 0; i < 8; i++) {
              const ext = getActiveExtinction(clock.currentTimeMa);
              if (!ext) break;
              const half = ext.durationMa / 2;
              clock.setTime(towardPresent ? ext.timeMa - half - EDGE_EPS_MA : ext.timeMa + half + EDGE_EPS_MA);
            }
            if (k < 1) {
              requestAnimationFrame(step);
              return;
            }
            document.body.classList.remove('capture-sweeping');
            resolve(api.state());
          } catch (err) {
            document.body.classList.remove('capture-sweeping');
            reject(err);
          }
        };
        requestAnimationFrame(step);
      });
    },
    state() {
      const { hold, event } = clock;
      return {
        timeMa: clock.currentTimeMa,
        fraction: clock.getFraction(),
        playing: clock.playing,
        holding: !!hold,
        hold: hold ? { id: hold.id, elapsed: hold.elapsed, duration: hold.duration } : null,
        // The staged extinction during playback: phase 'hold' | 'window' | 'aftermath'.
        event: event ? { id: event.id, phase: event.phase, intensity: event.intensity } : null,
        // The mass-extinction window the clock sits in (also when scrubbed there), or null.
        extinctionId: getActiveExtinction(clock.currentTimeMa)?.id ?? null,
        atEnd: clock.atEnd(),
        speed: clock.speedMultiplier,
        view: state.view,
        layers: { ...state.layers },
        focusId: state.focusId,
        holdSeconds: TIMING.extinctionPauseSeconds,
      };
    },
    waitFor(predicateFn, timeoutMs = 10000) {
      return new Promise((resolve, reject) => {
        const start = performance.now();
        const tick = () => {
          let result;
          try { result = predicateFn(); } catch (e) { reject(e); return; }
          if (result) { resolve(result); return; }
          if (performance.now() - start > timeoutMs) {
            reject(new Error('waitFor timeout after ' + timeoutMs + 'ms'));
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    },
    // Returns the <canvas> the active view is rendering into. Used by external
    // capture scripts that record the canvas via canvas.captureStream(fps).
    activeCanvas() {
      if (state.view === 'globe') return document.querySelector('#globe-container canvas');
      if (state.view === 'tree') return document.getElementById('canvas-tree');
      return document.getElementById('canvas2d');
    },
    activeView() {
      return getActiveView();
    },
  };
  globalThis.__capture = api;
}
