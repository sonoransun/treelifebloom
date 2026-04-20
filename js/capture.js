// Capture mode — activated via `?capture=1` URL parameter.
// Hides UI chrome and exposes `window.__capture` so an external script (Playwright,
// browser console, etc.) can deterministically drive the visualization for screen
// recording. No-op when the parameter is absent.
//
// Optional `panel` modifier:
//   ?capture=1                — clean: hide everything but the viz canvas
//   ?capture=1&panel=sidebar  — keep the species sidebar visible
//   ?capture=1&panel=clock    — keep the time/period overlay visible
//   ?capture=1&panel=full     — keep sidebar + clock visible

const params = new URLSearchParams(globalThis.location?.search || '');
const enabled = params.get('capture') === '1';
const panel = params.get('panel') || 'clean';

export function isCaptureMode() {
  return enabled;
}

export function initCapture({ clock, controls, switchView, getViewMode }) {
  if (!enabled) return;

  document.body.classList.add('capture-mode');
  if (panel === 'sidebar' || panel === 'full') {
    document.body.classList.add('capture-mode-with-sidebar');
  }
  if (panel === 'clock' || panel === 'full') {
    document.body.classList.add('capture-mode-with-clock');
  }

  globalThis.__capture = {
    async setView(mode) {
      // switchView is async (lazy-loads view3d on first 3D toggle).
      await switchView(mode);
    },
    setTime(ma) {
      clock.setTime(Number(ma));
    },
    setSpeed(mult) {
      clock.setSpeed(Number(mult));
    },
    play() {
      clock.play();
      controls.syncPlayButton();
    },
    pause() {
      clock.pause();
      controls.syncPlayButton();
    },
    state() {
      return {
        timeMa: clock.currentTimeMa,
        playing: clock.playing,
        speed: clock.speedMultiplier,
        view: getViewMode(),
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
    // Returns the active <canvas> the active view is rendering into. Used by external
    // capture scripts that record the canvas via canvas.captureStream(fps).
    activeCanvas() {
      const mode = getViewMode();
      if (mode === '3d') {
        return document.querySelector('#globe-container canvas');
      }
      return document.getElementById('canvas2d');
    },
  };

  // Signal readiness so external scripts can `waitForFunction(() => window.__captureReady)`.
  globalThis.__captureReady = true;
}
