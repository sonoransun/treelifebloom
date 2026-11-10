// Global keyboard shortcuts — the single keydown handler for the whole app.
// (Dialogs handle their own Escape/Tab trapping; everything else lives here so shortcuts can be
// listed in one place: see SHORTCUTS, which the Help dialog renders.)

import { TIMING } from '../config.js';

export const SHORTCUTS = [
  { keys: ['Space'], label: 'Play / pause (also continues past an extinction hold)' },
  { keys: ['←', '→'], label: 'Step back / forward through time' },
  { keys: ['Shift', '←/→'], label: 'Step five times further' },
  { keys: ['PgUp', 'PgDn'], label: 'Previous / next period (timeline focused)' },
  { keys: ['[', ']'], label: 'Previous / next chapter' },
  { keys: ['-', '+'], label: 'Slower / faster' },
  { keys: ['Home', 'R'], label: 'Back to the beginning' },
  { keys: ['End'], label: 'Jump to the present' },
  { keys: ['1', '2', '3'], label: 'Map, Globe, Tree view' },
  { keys: ['P'], label: 'Plate boundaries (Map and Globe)' },
  { keys: ['L'], label: 'Place names & events (Map and Globe)' },
  { keys: ['C'], label: 'Chapters' },
  { keys: ['G'], label: 'Legend' },
  { keys: ['?'], label: 'This help' },
  { keys: ['Tab'], label: 'Reach the timeline: its event markers are one stop — ← → move between them, Enter jumps' },
  { keys: ['Esc'], label: 'Close the open panel or dialog' },
];

const SPEED_STEPS = [0.25, 0.5, 1, 2, 4];

// Held down, only these keep firing (stepping through time); every toggle fires once per press.
const REPEATABLE = new Set(['ArrowLeft', 'ArrowRight']);

// Many layouts can only type these with AltGr (reported as Ctrl+Alt on Windows) or Option (macOS).
const ALT_TYPED = new Set(['[', ']']);

// <input> types that take typed text; every other type is a box, a button or a slider.
const TEXT_INPUTS = new Set(['text', 'search', 'url', 'email', 'tel', 'password', 'number',
  'date', 'datetime-local', 'month', 'week', 'time']);

function isTextField(target) {
  return target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && TEXT_INPUTS.has(target.type));
}

/** Keys typed here belong to the control (text entry, a select's type-ahead). */
/**
 * The modal dialog that is open right now, if any. A dialog counts only when it is actually
 * rendered — not merely missing the .hidden class — so a dialog closed by any other means
 * (the hidden attribute, a closed <dialog>, a display:none ancestor) never swallows shortcuts.
 */
function openModalDialog() {
  for (const el of document.querySelectorAll('[role="dialog"][aria-modal="true"], dialog[open]')) {
    if (el.hidden || el.classList.contains('hidden')) continue;
    if (el.tagName === 'DIALOG' && !el.open && el.getAttribute('role') !== 'dialog') continue;
    const visible = typeof el.checkVisibility === 'function'
      ? el.checkVisibility()
      : el.getClientRects().length > 0;
    if (visible) return el;
  }
  return null;
}

function isTyping(target) {
  if (!target) return false;
  return target.isContentEditable || target.tagName === 'SELECT' || isTextField(target);
}

export class Shortcuts {
  constructor(app) {
    this.app = app;
    document.addEventListener('keydown', (e) => this._onKey(e));
  }

  _onKey(e) {
    if (e.defaultPrevented || e.metaKey) return;
    // Ctrl and Alt combinations belong to the browser and the OS — except the brackets on layouts
    // that need AltGr or Option to type them.
    if ((e.ctrlKey || e.altKey) && !(e.altKey && ALT_TYPED.has(e.key))) return;
    // An open modal dialog owns the keyboard (it handles Escape itself).
    if (openModalDialog()) return;

    const { app } = this;
    const target = e.target instanceof Element ? e.target : null;

    // Escape closes the open panels from anywhere, form controls included — except a text field
    // that still holds text: there the first Escape is the field's (clear / cancel).
    if (e.key === 'Escape') {
      if (e.repeat || (target && isTextField(target) && target.value)) return;
      app.bus.emit('panel:close-all', {});
      return;
    }
    if (isTyping(target)) return;

    // Range sliders and radio groups keep their native arrow keys.
    const onRange = !!target && target.matches('input[type="range"], input[type="radio"]');
    // Anything that activates or toggles on Space by itself keeps it (a link does not: Space on a
    // focused link — the brand, after a restart — still plays and pauses).
    const onButton = !!target && !!target.closest('button, summary, input:not([type="range"]), '
      + '[role="button"], [role="tab"], [role="option"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="switch"]');

    if (e.repeat && !REPEATABLE.has(e.key)) {
      // Still swallow the browser's own action (page scroll) for keys the first press handled.
      if ((e.key === ' ' && !onButton) || ((e.key === 'Home' || e.key === 'End') && !onRange)) e.preventDefault();
      return;
    }

    switch (e.key) {
      case ' ':
        if (onButton) return; // let the focused button activate normally
        e.preventDefault();
        if (app.clock.hold && app.clock.playing) app.clock.skipHold();
        else app.togglePlay();
        break;
      case 'ArrowRight':
      case 'ArrowLeft': {
        if (onRange) return; // native range stepping
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        app.bus.emit('time:nudge', { seconds: dir * TIMING.nudgeSeconds * (e.shiftKey ? 5 : 1) });
        break;
      }
      case '[':
        app.bus.emit('chapter:step', { dir: -1 });
        break;
      case ']':
        app.bus.emit('chapter:step', { dir: 1 });
        break;
      case '-':
      case '_':
        this._stepSpeed(-1);
        break;
      case '+':
      case '=':
        this._stepSpeed(1);
        break;
      case 'Home':
        if (onRange) return;
        e.preventDefault();
        app.restart();
        break;
      case 'End':
        if (onRange) return;
        e.preventDefault();
        app.seek(TIMING.endTimeMa);
        break;
      case '1': app.setView('map'); break;
      case '2': app.setView('globe'); break;
      case '3': app.setView('tree'); break;
      case 'p':
      case 'P': this._toggleLayer('plates'); break;
      case 'l':
      case 'L': this._toggleLayer('labels'); break;
      case 'c':
      case 'C': app.bus.emit('panel:toggle', { name: 'chapters' }); break;
      case 'g':
      case 'G': app.bus.emit('panel:toggle', { name: 'legend' }); break;
      case '?': app.bus.emit('panel:toggle', { name: 'help' }); break;
      case 'r':
      case 'R': app.restart(); break;
      default:
        return;
    }
  }

  /** Map layers apply to the Map and Globe only: in the Tree their chips are disabled, and so are the keys. */
  _toggleLayer(name) {
    const { app } = this;
    if (app.state.view === 'tree') {
      app.notice('Plates and labels belong to the Map and Globe views', 1800);
      return;
    }
    app.toggleLayer(name);
  }

  _stepSpeed(dir) {
    const { app } = this;
    const current = app.clock.speedMultiplier;
    // The nearest step past the current speed, which may sit between steps (?speed=1.5).
    const next = dir > 0
      ? (SPEED_STEPS.find((s) => s > current + 1e-6) ?? SPEED_STEPS[SPEED_STEPS.length - 1])
      : ([...SPEED_STEPS].reverse().find((s) => s < current - 1e-6) ?? SPEED_STEPS[0]);
    app.setSpeed(next);
    app.notice(`Speed ${next}×`, 1200);
  }
}
