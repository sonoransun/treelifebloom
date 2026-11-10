// Smoke test — one command that says whether the app still works end to end.
//
// It drives the running app in Chromium and checks CONTRACTS, not internals: the stable ids of
// index.html, ARIA roles and states, deep links (?t= &view= &plates= &labels= &speed= &play=)
// and the capture API (window.__capture under ?capture=1, see js/capture.js). Components can be
// rewritten freely; as long as those contracts hold, this stays green.
//
// Prereqs (one-time):
//   1. npm install                    (in this directory: Playwright)
//      npx playwright install chromium (the browser build; npm install does not download it)
//   2. The app is being served:       python3 -m http.server 8080   (from the project root)
//
// Usage (`npm test` runs the first line; pass options after --, e.g. npm test -- --only=boot):
//   node smoke-test.js                               # every check against http://localhost:8080
//   node smoke-test.js --base-url=http://localhost:9000
//   node smoke-test.js --only=boot,time              # groups and/or check ids (time.deep-link)
//   node smoke-test.js --json                        # machine-readable report on stdout
//   node smoke-test.js --headed --slow               # watch it: visible browser, slow motion
//   node smoke-test.js --list                        # print the catalogue of checks
//
// --slow also triples every timeout, so use it on a busy machine even when headless.
// Exit code: 0 = nothing failed (SKIP and INFO never fail), 1 = at least one FAIL, 2 = bad usage.
//
// Reading the output:
//   PASS  the contract holds
//   FAIL  a contract is broken: prints what was expected, what was found and a screenshot path
//   SKIP  the feature has not landed yet or cannot run here (offline, no WebGL), with the reason
//   INFO  measurements that never fail (performance)
//   ·     notes under a check give context; "warning — …" flags something worth fixing that
//         does not break a contract (e.g. stale page width that nothing visible occupies)
// A console error, an uncaught exception or a failed request while a check runs fails that
// check — a clean console is part of every contract. Each distinct error is charged once, to the
// first check that triggers it, so one broken component does not paint the whole run red. The
// one exception: a JavaScript module that 404s while the app imports it optionally and carries
// on (SPEC §4: feature-detect modules that have not landed) is reported once as a warning.
//
// How state is read: capture mode exposes __capture.state() but hides the chrome, so checks that
// need real clicks run against the real UI (always through a ?t= deep link, which skips the intro
// card) and observe it through ARIA, the URL and the timeline's <input type="range">; checks that
// need exact numbers run in a ?capture=1 twin. Timing is measured inside the page, frame by
// frame, so neither Playwright round trips nor --slow distort it.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VALIDATOR = resolve(__dirname, '..', 'validate-data.mjs');
const LAUNCH_ARGS = ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'];

// ---------------------------------------------------------------------------------------------
// The contracts under test
// ---------------------------------------------------------------------------------------------

const STABLE_IDS = [
  'app', 'toolbar', 'btn-view-map', 'btn-view-globe', 'btn-view-tree', 'btn-plates', 'btn-labels',
  'btn-chapters', 'btn-legend', 'btn-help', 'btn-sidebar', 'viz-container', 'viz-stage', 'canvas2d',
  'globe-container', 'canvas-tree', 'context-card', 'milestone-overlay', 'extinction-overlay',
  'legend-panel', 'chapters-panel', 'sidebar', 'timeline', 'species-popup', 'species-modal-root',
  'help-root', 'intro-root', 'live-region',
];
const CAPTURE_API = [
  'setView', 'setTime', 'setSpeed', 'setLayer', 'setHoldSeconds', 'skipHold', 'openSpeciesModal',
  'closeSpeciesModal', 'openPanel', 'closePanel', 'play', 'pause', 'state', 'waitFor', 'sleep',
  'activeCanvas',
];
const RENDERERS = { map: '#canvas2d', globe: '#globe-container', tree: '#canvas-tree' };
const VIEW_BUTTONS = { map: '#btn-view-map', globe: '#btn-view-globe', tree: '#btn-view-tree' };
const RANGE = '#timeline input[type="range"]';
const ROW = '#sidebar [data-id][role="button"], #sidebar button[data-id]';

const VIEWPORT = { width: 1440, height: 860 };
const SIZES = [[1440, 860], [1024, 700], [820, 1180], [390, 844]];
const SAMPLE_TIMES_MA = [0, 66, 252, 540, 2400, 4500];
const HOLD_SECONDS = 1.5;      // ?hold= used for the extinction checks
const PERF_SECONDS = 4;

const GROUPS = [
  ['boot', 'boot'],
  ['time', 'time'],
  ['extinctions', 'extinctions'],
  ['views', 'views'],
  ['panels', 'layers & panels'],
  ['species', 'species'],
  ['keyboard', 'keyboard'],
  ['a11y', 'a11y basics'],
  ['motion', 'motion'],
  ['data', 'data'],
  ['performance', 'performance (informational, never fails)'],
];
const GROUP_ALIASES = { layers: 'panels', accessibility: 'a11y', perf: 'performance', extinction: 'extinctions', view: 'views' };

// ---------------------------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------------------------

const USAGE = `Usage: node smoke-test.js [--base-url=http://localhost:8080] [--only=name,name] [--json] [--headed] [--slow] [--list]

  --base-url=URL   where the app is served (default http://localhost:8080)
  --only=a,b       run only these groups and/or checks (see --list)
  --json           print a machine-readable report on stdout (progress goes to stderr)
  --headed         show the browser
  --slow           slow motion between actions and 3x timeouts (watching, or a busy machine)
  --list           print the catalogue of checks and exit`;

function parseArgs(argv) {
  const args = { baseUrl: 'http://localhost:8080', only: null, json: false, headed: false, slow: false, list: false };
  for (const a of argv) {
    if (a.startsWith('--base-url=')) args.baseUrl = a.slice('--base-url='.length).replace(/\/+$/, '');
    else if (a.startsWith('--only=')) args.only = a.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--json') args.json = true;
    else if (a === '--headed') args.headed = true;
    else if (a === '--slow') args.slow = true;
    else if (a === '--list') args.list = true;
    else if (a === '--help' || a === '-h') { console.log(USAGE); process.exit(0); }
    else { console.error(`Unknown argument: ${a}\n\n${USAGE}`); process.exit(2); }
  }
  return args;
}

// ---------------------------------------------------------------------------------------------
// Check registry and outcomes
// ---------------------------------------------------------------------------------------------

const checks = [];

/** Register a check: id is "group.name", purpose is one line, options: { info, strictConsole, timeoutMs }. */
function check(id, purpose, options, fn) {
  if (typeof options === 'function') { fn = options; options = {}; }
  const [group, ...rest] = id.split('.');
  checks.push({ id, group, name: rest.join('.'), purpose, fn, timeoutMs: 60000, ...options });
}

class Failure extends Error {
  constructor(expected, found) {
    super(`expected ${expected}; found ${found}`);
    this.expected = expected;
    this.found = found;
  }
}

class Skip extends Error {}

const brief = (text, max = 300) => {
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean);
  const out = lines.slice(0, 2).join(' ');
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
};
/** One line for an unexpected error; for a Playwright timeout, keep the call-log line that says why. */
function explain(err) {
  const lines = String(err && err.message ? err.message : err).split('\n').map((l) => l.trim()).filter(Boolean);
  const logAt = lines.findIndex((l) => /^Call log:/i.test(l));
  if (logAt < 0) return brief(lines.join('\n'));
  const log = lines.slice(logAt + 1).map((l) => l.replace(/^[-\s]+/, ''));
  const clue = log.find((l) => /intercepts pointer events|not visible|not enabled|not stable|detached|outside of the viewport/.test(l)) || log[log.length - 1];
  return brief(clue ? `${lines[0]} (${clue})` : lines[0]);
}
const ms = (n) => (n >= 10000 ? `${(n / 1000).toFixed(1)} s` : `${Math.round(n)} ms`);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------------------------------------------------------------------------------------------
// Helpers installed in every page as window.__smoke (before the app's own scripts run)
// ---------------------------------------------------------------------------------------------

function pageHelpers(cfg) {
  const S = {};

  // Resolves inside an animation frame, AFTER the app's own frame callback: a timer task always
  // runs after the current frame's callbacks (where the app re-registers itself), so a callback
  // requested from a timer queues behind the app's. Being behind it in the same frame is also the
  // only moment a WebGL canvas can be read before the browser presents and clears it.
  S.frame = () => new Promise((done) => { setTimeout(() => requestAnimationFrame(done), 0); });
  S.frames = async (n = 2) => {
    let ts = 0;
    for (let i = 0; i < n; i++) ts = await S.frame();
    return ts;
  };

  /** Calls cb(timestamp) once per frame, after the app's callback, until it returns a value. */
  S.eachFrame = (cb) => new Promise((done, fail) => {
    const step = (ts) => {
      let out;
      try { out = cb(ts); } catch (err) { fail(err); return; }
      if (out !== undefined) done(out);
      else requestAnimationFrame(step);
    };
    setTimeout(() => requestAnimationFrame(step), 0);
  });

  S.el = (target) => (typeof target === 'string' ? document.querySelector(target) : target);

  S.describe = (el) => {
    if (!el) return 'nothing';
    if (el === document.body) return '<body>';
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    else if (el.classList && el.classList.length) s += `.${[...el.classList].slice(0, 2).join('.')}`;
    const host = !el.id && el.parentElement ? el.parentElement.closest('[id]') : null;
    if (host) s += ` (in #${host.id})`;
    return s;
  };

  /** 'visible', or the first reason the element cannot be seen. */
  S.whyHidden = (target) => {
    const el = S.el(target);
    if (!el || !el.isConnected) return 'not in the document';
    if (getComputedStyle(el).visibility !== 'visible') return `visibility:${getComputedStyle(el).visibility} on ${S.describe(el)}`;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none') return `display:none on ${S.describe(n)}`;
      if (parseFloat(cs.opacity) < 0.02) return `opacity:${cs.opacity} on ${S.describe(n)}`;
    }
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return `zero size (${Math.round(r.width)}x${Math.round(r.height)})`;
    return 'visible';
  };
  S.shown = (target) => S.whyHidden(target) === 'visible';

  /**
   * In the accessibility tree? Rendered (no display:none here or above — a `hidden` attribute that
   * CSS overrides still renders), not visibility:hidden, not under aria-hidden="true" or inert.
   * Opacity does not count: a transparent control is still announced.
   */
  S.exposed = (el) => {
    if (!el.isConnected || el.closest('[aria-hidden="true"], [inert]')) return false;
    if (!el.getClientRects().length && getComputedStyle(el).display !== 'contents') return false;
    return !/^(hidden|collapse)$/.test(getComputedStyle(el).visibility);
  };

  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

  /** aria-labelledby / aria-label only (what names a region or dialog). */
  S.labelOf = (el) => {
    const ids = el.getAttribute('aria-labelledby');
    if (ids) {
      const text = clean(ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' '));
      if (text) return text;
    }
    return clean(el.getAttribute('aria-label'));
  };

  /** A simplified accessible-name computation: good enough to tell "named" from "unnamed". */
  S.accName = (el) => {
    const label = S.labelOf(el);
    if (label) return label;
    if (el.labels && el.labels.length) {
      const text = clean([...el.labels].map((l) => l.textContent).join(' '));
      if (text) return text;
    }
    if (el.tagName === 'IMG' || el.tagName === 'AREA') {
      const alt = clean(el.getAttribute('alt'));
      if (alt) return alt;
    }
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/.test(el.type) && clean(el.value)) return clean(el.value);
    const fromContent = (node) => {
      let out = '';
      for (const child of node.childNodes) {
        if (child.nodeType === 3) out += child.nodeValue;
        else if (child.nodeType === 1 && child.getAttribute('aria-hidden') !== 'true') {
          const own = child.getAttribute('aria-label');
          if (own) out += ` ${own} `;
          else if (child.tagName === 'IMG') out += ` ${child.getAttribute('alt') || ''} `;
          else out += ` ${fromContent(child)} `;
        }
      }
      return out;
    };
    if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
      const text = clean(fromContent(el));
      if (text) return text;
    }
    return clean(el.getAttribute('title')) || clean(el.getAttribute('placeholder'));
  };

  /** Visible dialogs, with what the checks need to know about each. */
  S.dialogs = () => [...document.querySelectorAll('[role="dialog"], dialog[open]')].filter(S.shown).map((d) => ({
    what: S.describe(d),
    modal: d.getAttribute('aria-modal') === 'true',
    name: S.labelOf(d),
    focusInside: d.contains(document.activeElement),
    active: S.describe(document.activeElement),
    text: clean(d.textContent).slice(0, 400),
    root: d.closest('#species-modal-root, #help-root, #intro-root')?.id || null,
  }));

  /** Why no dialog is visible: one phrase per dialog element in the DOM. */
  S.dialogReport = () => {
    const all = [...document.querySelectorAll('[role="dialog"], dialog')];
    if (!all.length) return 'no role="dialog" element in the document';
    return all.map((d) => `${S.describe(d)}: ${S.whyHidden(d)}`).join('; ');
  };

  S.range = () => {
    const r = document.querySelector(cfg.RANGE);
    if (!r) return null;
    const min = Number(r.min || 0);
    const max = Number(r.max || 100);
    const value = Number(r.value);
    return {
      value, min, max,
      fraction: (value - min) / (max - min || 1),
      valuetext: r.getAttribute('aria-valuetext') || '',
      name: S.accName(r),
    };
  };

  /** Resolves { ok: true } once the timeline range has not moved for quietMs, or { ok: false } after limitMs. */
  S.rangeSettles = (quietMs, limitMs) => {
    const r = document.querySelector(cfg.RANGE);
    if (!r) return Promise.resolve({ ok: false, from: null, to: null });
    const t0 = performance.now();
    const first = r.value;
    let last = first;
    let since = t0;
    return S.eachFrame(() => {
      const now = performance.now();
      if (r.value !== last) { last = r.value; since = now; }
      if (now - since >= quietMs) return { ok: true, value: last };
      if (now - t0 >= limitMs) return { ok: false, from: first, to: last };
      return undefined;
    });
  };

  /** Share (0..1) of an element's box that lies inside the viewport; 0 when it is not rendered. */
  S.onScreen = (target) => {
    const el = S.el(target);
    if (!S.shown(el)) return 0;
    const r = el.getBoundingClientRect();
    const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
    const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    return w > 0 && h > 0 ? (w * h) / (r.width * r.height) : 0;
  };

  /**
   * Horizontal fit right now: { problems, warnings }, one phrase each. Problems: the page scrolls
   * sideways because something really reaches past the viewport, an element shows a horizontal
   * scrollbar, or a control or text is cut off at the right edge of the screen (that last one
   * keeps the check honest if the shell ever clips #app to hide an overflow). Warning: the page
   * reports extra width that nothing occupies any more — stale overflow from an earlier layout,
   * which the next layout of that box clears (this probe does exactly that to tell the two apart).
   */
  S.fitProblems = () => {
    const vw = document.documentElement.clientWidth;
    const root = document.scrollingElement || document.documentElement;
    const out = [];
    const warnings = [];
    const atRoot = (n) => !n || n === document.body || n === document.documentElement;
    const CONTROL = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="link"], [role="slider"]';
    const carries = (el) => el.matches(CONTROL) || [...el.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim());
    // What becomes of a box that reaches past the right edge of the viewport. `hidden`: inert or
    // aria-hidden (a closed drawer waiting off-screen) — exempt from "cut off", yet it still widens
    // whatever does not clip it.
    const fate = (el) => {
      let hidden = false;
      for (let n = el; !atRoot(n); n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.position === 'fixed') return { kind: 'aside' };                   // fixed boxes never widen the page
        if (n.inert || n.getAttribute('aria-hidden') === 'true') hidden = true;
        if (n === el || cs.overflowX === 'visible') continue;
        if (/auto|scroll/.test(cs.overflowX)) return { kind: 'aside' };          // reachable by scrolling that box
        const r = n.getBoundingClientRect();
        if (r.right > vw + 1) {                                                   // the clipping box sticks out itself
          const up = fate(n);
          return { ...up, hidden: up.hidden || hidden };
        }
        return r.left <= 1 && r.right >= vw - 1 ? { kind: 'edge', by: n, hidden } : { kind: 'aside' };
      }
      return { kind: 'page', hidden };
    };
    const spill = [];      // boxes nothing clips: they widen the page
    const cut = [];        // controls and text clipped at the screen edge
    for (const el of document.querySelectorAll('body *')) {
      if (!el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1 || r.width <= 1 || r.height <= 1) continue;          // 1px boxes: .sr-only text
      if (r.bottom <= 0 || r.top >= innerHeight) continue;                        // above or below the screen (a closed bottom sheet)
      const f = fate(el);
      if (f.kind === 'page') spill.push({ el, right: r.right, hidden: f.hidden });
      else if (f.kind === 'edge' && !f.hidden && carries(el) && S.shown(el)) cut.push({ el, right: r.right, by: f.by });
    }
    // The widest box first; among equals the outermost (document order), which names the culprit.
    spill.sort((a, b) => b.right - a.right);

    if (root.scrollWidth > vw + 1) {
      const before = root.scrollLeft;
      root.scrollLeft = root.scrollWidth;
      const reach = root.scrollLeft;
      root.scrollLeft = before;
      if (reach > 0) {
        const worst = spill[0];
        if (worst) {
          out.push(`the page is ${root.scrollWidth}px wide in a ${vw}px viewport and scrolls ${reach}px sideways (${S.describe(worst.el)}${worst.hidden ? ', inert or aria-hidden,' : ''} reaches x=${Math.round(worst.right)})`);
        } else {
          // No element box is out there. Find the deepest box whose content still reaches past
          // the viewport, lay it out afresh, and see whether the extra width survives: if it does,
          // text or a pseudo-element really spills out; if not, it was stale.
          const pageWidth = root.scrollWidth;
          let ghost = null;
          let depth = -1;
          for (const el of document.querySelectorAll('body *')) {
            if (getComputedStyle(el).overflowX !== 'visible' || el.scrollWidth <= el.clientWidth + 1) continue;
            if (el.getBoundingClientRect().left + el.scrollWidth <= vw + 1) continue;
            if (fate(el).kind !== 'page') continue;          // fixed, or clipped: cannot widen the page
            let d = 0;
            for (let n = el; n; n = n.parentElement) d++;
            if (d > depth) { ghost = el; depth = d; }
          }
          const ghostText = ghost ? `${S.describe(ghost)} reports ${ghost.scrollWidth}px of content in its ${ghost.clientWidth}px box` : 'no box owns up to it';
          let stale = false;
          if (ghost) {
            const prev = [ghost.style.getPropertyValue('width'), ghost.style.getPropertyPriority('width')];
            ghost.style.setProperty('width', `${ghost.getBoundingClientRect().width - 1}px`, 'important');
            void ghost.offsetWidth;
            if (prev[0]) ghost.style.setProperty('width', prev[0], prev[1]);
            else ghost.style.removeProperty('width');
            void ghost.offsetWidth;
            stale = root.scrollWidth <= vw + 1;
          }
          if (stale) {
            warnings.push(`the page reported ${pageWidth}px of width in a ${vw}px viewport (scrollable ${reach}px sideways by script) with no element out there: ${ghostText}, `
              + 'stale overflow that a fresh layout of that box clears — invisible unless a script scrolls the page sideways');
          } else {
            out.push(`the page is ${pageWidth}px wide in a ${vw}px viewport and scrolls ${reach}px sideways, yet no element box reaches past x=${vw}: ${ghostText} (text or a pseudo-element spilling out?)`);
          }
        }
      } else if (spill.length) {
        cut.push(...spill.filter((s) => carries(s.el) && S.shown(s.el)).map((s) => ({ ...s, by: document.body })));
      }
    }
    // A full-width box that hides its overflow: unlike clip, overflow:hidden can still be scrolled
    // by a script or by focusing something past its edge, so stale extra width there is the same
    // hazard one level down. (Real content past the edge is reported as cut off, below.)
    for (const el of document.querySelectorAll('body *')) {
      if (el.scrollWidth <= el.clientWidth + 1 || getComputedStyle(el).overflowX !== 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.left > 1 || r.right < vw - 1 || r.bottom <= 0 || r.top >= innerHeight || !S.shown(el)) continue;
      const width = el.scrollWidth;
      const prev = [el.style.getPropertyValue('width'), el.style.getPropertyPriority('width')];
      el.style.setProperty('width', `${r.width - 1}px`, 'important');
      void el.offsetWidth;
      if (prev[0]) el.style.setProperty('width', prev[0], prev[1]);
      else el.style.removeProperty('width');
      void el.offsetWidth;
      if (el.scrollWidth <= el.clientWidth + 1) {
        warnings.push(`${S.describe(el)} (full width, overflow: hidden) reported ${width}px of content in its ${el.clientWidth}px box with nothing out there: `
          + 'stale overflow that a fresh layout clears — a script or a focused control could scroll it sideways (overflow: clip cannot be scrolled)');
      } else {
        // Something really waits past its edge. Decoration (a scrim, a glow) is fine; controls or
        // text there (a closed drawer) are what focus or scrollIntoView would drag into view.
        const beyond = [...el.querySelectorAll('*')].filter((d) => d.getClientRects().length && d.getBoundingClientRect().right > r.right + 1);
        if (beyond.some(carries)) {
          warnings.push(`${S.describe(el)} (full width, overflow: hidden) holds ${el.scrollWidth - el.clientWidth}px of content past its right edge (${S.describe(beyond[0])}): `
            + 'nothing shows it, but a script or a focused control could scroll it into view (overflow: clip cannot be scrolled)');
        }
      }
    }
    if (cut.length) {
      cut.sort((a, b) => b.right - a.right);
      const names = [...new Set(cut.map((c) => S.describe(c.el)))];
      out.push(`${cut.length === 1 ? 'a control or text is' : `${cut.length} controls or texts are`} cut off at the right edge of the screen by ${S.describe(cut[0].by)}: ${names.slice(0, 4).join(', ')}${names.length > 4 ? ', …' : ''}`);
    }
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (!/auto|scroll/.test(cs.overflowX) || cs.scrollbarWidth === 'none') continue;   // hidden scrollbar = a deliberate swipe strip
      if (el.scrollWidth <= el.clientWidth + 1 || !el.getClientRects().length) continue;
      // Only what the viewer can see: a closed drawer may size its contents when it opens.
      if (S.onScreen(el) === 0 || el.closest('[inert]')) continue;
      out.push(`${S.describe(el)} shows a horizontal scrollbar (${el.scrollWidth}px of content in ${el.clientWidth}px)`);
    }
    return { problems: out, warnings };
  };

  /**
   * fitProblems() once the layout has settled after a load or a resize (components re-lay
   * themselves out a frame or more later): wait minFrames, then measure every 4 frames until the
   * page is clean or the same problems were seen three times running, at most limitMs.
   * Warnings seen on the way are kept (measuring one heals it).
   */
  S.fitSettled = (minFrames, limitMs) => {
    const t0 = performance.now();
    const warnings = new Set();
    let frames = 0;
    let last = null;
    let same = 0;
    return S.eachFrame(() => {
      if (++frames < minFrames || frames % 4) return undefined;
      const fit = S.fitProblems();
      for (const w of fit.warnings) warnings.add(w);
      const key = fit.problems.join('\n');
      same = key === last ? same + 1 : 0;
      last = key;
      if (fit.problems.length && same < 2 && performance.now() - t0 <= limitMs) return undefined;
      return { problems: fit.problems, warnings: [...warnings] };
    });
  };

  /** Scroll the page as far sideways as it goes (a failure screenshot then shows what that does). */
  S.scrollSideways = () => {
    const root = document.scrollingElement || document.documentElement;
    root.scrollLeft = root.scrollWidth;
    return root.scrollLeft;
  };

  /**
   * js/ui/shortcuts.js ignores every key while `[role="dialog"][aria-modal="true"]:not(.hidden)`
   * matches. A closed dialog that is hidden any other way therefore silences the keyboard;
   * name it, so a failing keyboard check says why.
   */
  S.keyboardBlockers = () => {
    const ghosts = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]:not(.hidden)')].filter((d) => !S.shown(d)).map(S.describe);
    return ghosts.length
      ? ` (${ghosts.join(', ')}: an invisible [role="dialog"][aria-modal="true"] without class "hidden" — js/ui/shortcuts.js takes it for an open dialog and ignores every key)`
      : '';
  };

  S.viewState = () => {
    const app = document.getElementById('app');
    return {
      view: app ? app.dataset.view || null : null,
      shown: Object.keys(cfg.RENDERERS).filter((v) => S.shown(cfg.RENDERERS[v])),
      pressed: Object.keys(cfg.VIEW_BUTTONS).filter((v) => document.querySelector(cfg.VIEW_BUTTONS[v])?.getAttribute('aria-pressed') === 'true'),
    };
  };

  /**
   * Colour statistics of a canvas. Call it right after `await S.frame()` so the read happens in
   * the frame the app has just drawn (see S.frame).
   */
  S.pixels = (canvas) => {
    if (!canvas || canvas.tagName !== 'CANVAS') return { error: 'no <canvas> to read' };
    if (!S.shown(canvas)) return { error: `canvas is not visible (${S.whyHidden(canvas)})` };
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return { error: `canvas backing store is ${w}x${h}` };
    const copy = document.createElement('canvas');
    copy.width = w;
    copy.height = h;
    const g = copy.getContext('2d', { willReadFrequently: true });
    g.drawImage(canvas, 0, 0);
    const data = new Uint32Array(g.getImageData(0, 0, w, h).data.buffer);
    const first = data[0];
    const seen = new Set();
    let different = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== first) different++;
      if (seen.size < 32) seen.add(data[i]);
    }
    const hex = (v) => `rgba(${v & 255}, ${(v >> 8) & 255}, ${(v >> 16) & 255}, ${((v >>> 24) / 255).toFixed(2)})`;
    return { w, h, colours: seen.size, coverage: different / data.length, first: hex(first) };
  };

  globalThis.__smoke = S;
}

// ---------------------------------------------------------------------------------------------
// Facts read from the app's own modules (so no date or duration is hard-coded here)
// ---------------------------------------------------------------------------------------------

/** Runs in the page. */
async function computeFacts() {
  const load = (rel) => import(new URL(rel, document.baseURI).href);
  const facts = { events: [], total: null, startMa: null, quietMa: 150, endRunMa: 2, species: {}, notes: [] };

  const { extinctions, getActiveExtinction } = await load('js/data/extinctions.js');
  let ts = null;
  try {
    ts = await load('js/engine/timeScale.js');
  } catch (err) {
    facts.notes.push(`js/engine/timeScale.js could not be imported (${err.message}); using fixed offsets`);
  }
  const total = ts ? ts.totalScreenSeconds() : null;
  const sec = (ma) => ts.maToScreenSeconds(ma);
  const maAt = (s) => ts.screenSecondsToMa(Math.max(0, Math.min(total, s)));
  facts.total = total;
  facts.startMa = ts ? ts.fractionToMa(0) : null;

  for (const ext of extinctions) {
    const inside = (ma) => {
      const hit = getActiveExtinction(ma);
      return !!hit && hit.id === ext.id;
    };
    // Find the window through the public accessor instead of assuming its formula.
    const edge = (dir) => {
      let a = ext.timeMa;
      let b = ext.timeMa + dir * (Math.abs(ext.durationMa || 1) * 2 + 1);
      if (!inside(a) || inside(b)) return null;
      for (let i = 0; i < 60; i++) {
        const m = (a + b) / 2;
        if (inside(m)) a = m; else b = m;
      }
      return a;
    };
    const edgeMa = edge(1);    // leading edge: the oldest moment inside the window
    const endMa = edge(-1);    // trailing edge
    const event = { id: ext.id, name: ext.name, timeMa: ext.timeMa, severity: ext.severityPercent ?? 0, edgeMa, endMa, valid: edgeMa !== null && endMa !== null };
    if (event.valid) {
      // "Just before": a third of a second of 1x playback ahead of the window.
      event.beforeMa = ts ? maAt(sec(edgeMa) - 0.35) : edgeMa + 0.6;
      if (getActiveExtinction(event.beforeMa)) event.valid = false;
      event.insideMa = (edgeMa + endMa) / 2;
    }
    facts.events.push(event);
  }

  if (ts) {
    // A stretch of story with no extinction close ahead of, or just behind, the playhead.
    const valid = facts.events.filter((e) => e.valid);
    const quiet = (ma) => valid.every((e) => sec(e.edgeMa) - sec(ma) > 20 || sec(ma) - sec(e.endMa) > 6);
    facts.quietMa = [150, 100, 300, 30, 500, 1000, 2000].find(quiet) ?? 150;
    facts.endRunMa = maAt(total - 3);
  }

  try {
    const sp = await load('js/data/species.js');
    const tri = sp.species.find((s) => s.id === 'trilobite');
    facts.species = { trilobite: tri ? tri.name : null, fallbackId: sp.species[0].id, fallbackName: sp.species[0].name, count: sp.species.length };
  } catch (err) {
    facts.species = { error: err.message };
  }
  return facts;
}

/**
 * Runs in the page: play from just before an extinction and record, frame by frame, what the
 * clock, the overlay and the stage do. `skip: true` calls skipHold() on the first held frame.
 * The hold is timed with frame timestamps (the clock's own time base), so it is exact.
 */
async function watchExtinction({ beforeMa, endMa, skip, tailMs, enterLimitMs, holdLimitMs }) {
  const c = window.__capture;
  const S = window.__smoke;
  const overlay = document.getElementById('extinction-overlay');
  const stage = document.getElementById('viz-stage');
  const out = {
    entered: false, released: false, resumed: false, stillHolding: false,
    holdMs: null, holdMa: null, slowMs: 0, moved: 0, backwards: null,
    overlayShown: false, overlayWhy: null,
    stageMoves: 0, stageExample: null, frames: 0,
  };
  c.pause();
  c.setSpeed(1);
  c.setTime(beforeMa);
  c.play();
  const t0 = performance.now();
  let heldTs = null;          // frame timestamp at which the hold was first seen
  let heldAt = null;          // …and the wall clock then, for the give-up limits
  let releasedAt = null;
  let prevTs = null;
  let prevMa = Infinity;
  await S.eachFrame((ts) => {
    const now = performance.now();
    const gap = prevTs === null ? 0 : ts - prevTs;
    prevTs = ts;
    const s = c.state();
    out.frames++;
    if (s.timeMa > prevMa + 1e-9 && !out.backwards) out.backwards = [prevMa, s.timeMa];
    prevMa = s.timeMa;
    const tf = getComputedStyle(stage).transform;
    if (tf && tf !== 'none' && tf !== 'matrix(1, 0, 0, 1, 0, 0)') {
      out.stageMoves++;
      if (!out.stageExample) out.stageExample = tf;
    }
    if (heldTs === null) {
      if (s.holding) {
        heldTs = ts;
        heldAt = now;
        out.entered = true;
        out.holdMa = s.timeMa;
        if (skip) {
          c.skipHold();
          out.holdingAfterSkip = c.state().holding;
        }
      } else if (!s.playing || s.timeMa < endMa || now - t0 > enterLimitMs) {
        return true;
      }
      return undefined;
    }
    if (releasedAt === null) {
      // The app counts at most 100 ms per frame, so a stalled frame legitimately stretches a hold.
      out.slowMs += Math.max(0, gap - 100);
      if (s.holding) {
        if (Math.abs(s.timeMa - out.holdMa) > 1e-9) out.moved++;
        if (!out.overlayShown) {
          const why = S.whyHidden(overlay);
          if (why === 'visible') out.overlayShown = true;
          else out.overlayWhy = why;
        }
        if (now - heldAt > holdLimitMs) {
          out.stillHolding = true;
          return true;
        }
        return undefined;
      }
      releasedAt = now;
      out.released = true;
      out.holdMs = ts - heldTs;
      out.playingAfter = s.playing;
    }
    if (s.timeMa < out.holdMa - 1e-9) out.resumed = true;
    if (now - releasedAt >= tailMs && (out.resumed || now - releasedAt > tailMs + 1500)) return true;
    return undefined;
  });
  const end = c.state();
  out.lastMa = end.timeMa;
  out.playing = end.playing;
  c.pause();
  return out;
}

// ---------------------------------------------------------------------------------------------
// The run: one browser, one context, pages opened per check
// ---------------------------------------------------------------------------------------------

class Run {
  constructor(args, browser) {
    this.args = args;
    this.browser = browser;
    this.context = null;         // the shared context (set by main); isolated ones come from makeContext()
    this.baseUrl = args.baseUrl;
    this.origin = new URL(args.baseUrl).origin;
    this.slow = args.slow ? 3 : 1;
    this.known = new Map();      // console/request problem -> id of the first check that hit it
    this.warned = new Set();     // optional-module 404s already reported as a warning
    this.shotDir = null;
    this.shakeSeen = null;       // did #viz-stage move during an extinction with motion allowed?
    this._facts = null;
    this._globe = null;
    this.validator = null;
  }

  screenshotDir() {
    if (!this.shotDir) this.shotDir = mkdtempSync(join(tmpdir(), 'ltb-smoke-'));
    return this.shotDir;
  }

  /** A browser context with the run's settings and the page helpers (own storage: a true first visit). */
  async makeContext() {
    const context = await this.browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    context.setDefaultTimeout(10000 * this.slow);
    await context.addInitScript(pageHelpers, { RANGE, RENDERERS, VIEW_BUTTONS });
    return context;
  }

  /** Attach console / exception / network listeners that feed `sink`. */
  track(page, sink) {
    const external = (url) => {
      try { return new URL(url).origin !== this.origin; } catch { return false; }
    };
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      // The browser's own line for a failed resource: the request/response listeners below
      // record the same event with its URL, and decide whether it is ours to worry about.
      if (/^Failed to load resource/.test(text)) return;
      sink.push({ kind: 'console error', text: brief(text) });
    });
    page.on('pageerror', (err) => sink.push({ kind: 'uncaught exception', text: brief(err.stack || err.message) }));
    page.on('requestfailed', (req) => {
      const reason = req.failure()?.errorText || 'failed';
      if (reason === 'net::ERR_ABORTED') return;               // cancelled by navigation or page close
      if (external(req.url())) {
        // An unreachable CDN is the environment's problem (offline), not a broken contract.
        if (sink.environment) sink.environment.push(`${req.url()} (${reason})`);
        return;
      }
      sink.push({ kind: 'failed request', text: `${req.url()} (${reason})`, url: req.url(), type: req.resourceType() });
    });
    page.on('response', (res) => {
      if (res.status() >= 400) {
        sink.push({ kind: 'failed request', text: `${res.url()} (HTTP ${res.status()})`, url: res.url(), type: res.request().resourceType(), status: res.status() });
      }
    });
  }

  async newPage(sink, opts = {}) {
    const page = await (opts.context || this.context).newPage();
    this.track(page, sink);
    if (opts.reducedMotion) await page.emulateMedia({ reducedMotion: opts.reducedMotion });
    if (opts.viewport) await page.setViewportSize(opts.viewport);
    if (opts.frameProbe) {
      // Registered before the app starts its loop, so every frame it runs FIRST and stamps the
      // moment the frame's callbacks begin (S.frame() gives the moment after the app's ran).
      await page.addInitScript(() => {
        const tick = () => {
          requestAnimationFrame(tick);
          globalThis.__smokeFrameStart = performance.now();
        };
        requestAnimationFrame(tick);
      });
    }
    return page;
  }

  /** Dates and durations read from the app's own data modules (memoised). */
  facts() {
    this._facts ??= (async () => {
      const page = await this.context.newPage();
      try {
        await page.goto(`${this.baseUrl}/?capture=1`, { waitUntil: 'load' });
        return await page.evaluate(computeFacts);
      } catch (err) {
        throw new Failure('to read js/data/extinctions.js, js/engine/timeScale.js and js/data/species.js from the page', explain(err));
      } finally {
        await page.close().catch(() => {});
      }
    })();
    return this._facts;
  }

  /**
   * Can the globe run here? { ok: true, ms } | { ok: false, kind: 'env' | 'broken', reason }.
   * 'env' (three.js CDN unreachable, no WebGL) makes globe checks SKIP; 'broken' makes them FAIL.
   */
  globe() {
    this._globe ??= (async () => {
      const sink = [];
      sink.environment = [];
      const page = await this.newPage(sink);
      const pending = new Set();
      const isExternal = (req) => { try { return new URL(req.url()).origin !== this.origin; } catch { return false; } };
      page.on('request', (req) => { if (isExternal(req)) pending.add(req.url()); });
      page.on('requestfinished', (req) => pending.delete(req.url()));
      page.on('requestfailed', (req) => pending.delete(req.url()));
      try {
        await page.goto(`${this.baseUrl}/?capture=1`, { waitUntil: 'load' });
        await page.waitForFunction(() => globalThis.__captureReady === true, null, { timeout: 15000 * this.slow });
        const webgl = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
        if (!webgl) return { ok: false, kind: 'env', reason: 'WebGL 2 is not available in this browser' };
        const limit = 25000 * this.slow;
        const started = Date.now();
        let timer;
        // A rejected setView() is an answer too: whether it means "offline" is decided below.
        const view = await Promise.race([
          page.evaluate(() => Promise.resolve(window.__capture.setView('globe')).then(
            () => window.__capture.state().view,
            (err) => `rejected (${err && err.message ? err.message : err})`,
          )),
          new Promise((done) => { timer = setTimeout(() => done('timeout'), limit); }),
        ]).finally(() => clearTimeout(timer));
        if (view === 'globe') return { ok: true, ms: Date.now() - started, problems: [...sink] };
        if (sink.environment.length) {
          return { ok: false, kind: 'env', reason: `three.js could not be fetched: ${sink.environment[0]} — offline?` };
        }
        if (view === 'timeout' && pending.size) {
          return { ok: false, kind: 'env', reason: `still waiting for ${[...pending][0]} after ${limit / 1000} s — network too slow?` };
        }
        const detail = sink.length ? sink.map((p) => `${p.kind}: ${p.text}`).join(' | ') : 'no error was logged';
        return { ok: false, kind: 'broken', reason: `state().view = ${JSON.stringify(view)} after __capture.setView("globe") (${detail})` };
      } catch (err) {
        return { ok: false, kind: 'broken', reason: explain(err) };
      } finally {
        await page.close().catch(() => {});
      }
    })();
    return this._globe;
  }
}

/** What a check body gets. */
class CheckContext {
  constructor(run, def) {
    this.run = run;
    this.def = def;
    this.pages = [];
    this.contexts = [];
    this.problems = [];
    this.problems.environment = [];
    this.notes = [];
    // Problems logged from this index on fail the check even if an earlier check already paid for them.
    this.strictFrom = def.strictConsole ? 0 : Infinity;
  }

  /** From now on any console error fails this check, known or not ("…with no console errors"). */
  strictConsoleFromNow() { this.strictFrom = Math.min(this.strictFrom, this.problems.length); }

  note(text) { this.notes.push(text); }
  skip(reason) { throw new Skip(reason); }
  fail(expected, found) { throw new Failure(expected, found); }
  expect(ok, expected, found) {
    if (!ok) throw new Failure(expected, typeof found === 'function' ? found() : found);
  }

  facts() { return this.run.facts(); }

  /**
   * Load a URL and make sure the app came up. A module that fails to load or throws while
   * js/main.js is wiring things leaves a dead page: say so at once instead of letting every
   * later wait run into its timeout.
   */
  async _load(page, url) {
    const before = this.problems.length;
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => window.__smoke.frames(2));
    const fresh = this.problems.slice(before);
    const crash = fresh.find((p) => p.kind === 'uncaught exception');
    const ran = await page.evaluate(() => !!document.documentElement.dataset.motion);   // stamped by js/main.js
    if (crash) throw new Failure('the app to start', `${crash.kind} while loading: ${crash.text}`);
    if (!ran) throw new Failure('the app to start', `js/main.js never ran${fresh[0] ? ` (${fresh[0].kind}: ${fresh[0].text})` : ' and nothing was logged'}`);
  }

  /** Open the real UI at `${base}/${query}` (query: '' or '?t=…'); opts.isolated = in a fresh browser context. */
  async open(query = '', opts = {}) {
    if (opts.isolated) {
      const context = await this.run.makeContext();
      this.contexts.push(context);
      opts = { ...opts, context };
    }
    const page = await this.run.newPage(this.problems, opts);
    this.pages.push(page);
    await this._load(page, `${this.run.baseUrl}/${query}`);
    return page;
  }

  /** Open capture mode (`?capture=1&${params}`) and wait for window.__capture. */
  async capture(params = '', opts = {}) {
    const page = await this.run.newPage(this.problems, opts);
    this.pages.push(page);
    await this._load(page, `${this.run.baseUrl}/?capture=1${params ? `&${params}` : ''}`);
    await this.until(page, () => globalThis.__captureReady === true, null, {
      timeout: 15000,
      expected: 'window.__captureReady === true under ?capture=1 (js/capture.js)',
      found: () => `__captureReady = ${globalThis.__captureReady}, __capture is ${typeof globalThis.__capture}`,
    });
    await page.evaluate(() => window.__smoke.frames(2));
    return page;
  }

  /** Wait for a condition in the page; a timeout becomes a FAIL with expected / found. */
  async until(page, fn, arg, { timeout = 5000, expected, found } = {}) {
    const limit = timeout * this.run.slow;
    try {
      await page.waitForFunction(fn, arg, { timeout: limit });
    } catch (err) {
      if (!/Timeout/i.test(err.message)) throw err;
      let seen = 'the page state could not be read';
      try {
        seen = typeof found === 'function' ? await page.evaluate(found, arg) : (found ?? 'the condition never became true');
      } catch { /* keep the default */ }
      throw new Failure(`${expected} (waited ${limit / 1000} s)`, String(seen));
    }
  }

  /** Globe available? Throws SKIP when the environment cannot run it, FAIL when it is broken. */
  async needGlobe() {
    const g = await this.run.globe();
    if (g.ok) return g;
    if (g.kind === 'env') throw new Skip(g.reason);
    throw new Failure('the globe view to load', g.reason);
  }

  /** For checks that also have non-globe legs: false (with a note) when the environment cannot run it. */
  async hasGlobe() {
    const g = await this.run.globe();
    if (g.ok) return true;
    if (g.kind === 'env') {
      this.note(`globe leg skipped — ${g.reason}`);
      return false;
    }
    throw new Failure('the globe view to load', g.reason);
  }

  async dispose() {
    for (const page of this.pages) await page.close().catch(() => {});
    for (const context of this.contexts) await context.close().catch(() => {});
  }
}

const state = (page) => page.evaluate(() => window.__capture.state());
const readRange = (page) => page.evaluate(() => window.__smoke.range());
const keyboardBlockers = (page) => page.evaluate(() => window.__smoke.keyboardBlockers());

/** The play/pause button of #timeline, found by its accessible name (Play, Pause, Resume, Replay, Continue), or null. */
async function transportButton(page) {
  const handle = await page.evaluateHandle(() => [...document.querySelectorAll('#timeline button, #timeline [role="button"]')]
    .find((b) => /^(play|pause|resume|replay|continue)\b/i.test(window.__smoke.accName(b))) || null);
  return handle.asElement();
}

/**
 * Prove in the real UI that the clock stands still. The timeline range is coarse (one step is a
 * couple of seconds of story), so it must hold still for 1.5 of its steps at `speed`; and the
 * play button, when there is one, must stop reading "Pause".
 */
async function expectStill(t, page, expected, { speed = 1 } = {}) {
  const button = await transportButton(page);
  if (button) {
    await t.until(page, (b) => !/^pause\b/i.test(window.__smoke.accName(b)), button, {
      timeout: 2000, expected: `${expected}: the play button to stop reading "Pause"`, found: (b) => `it reads "${window.__smoke.accName(b)}"`,
    });
  }
  const facts = await t.facts();
  const r = await readRange(page);
  const stepMs = facts.total && r ? ((facts.total / Math.max(1, r.max - r.min)) * 1000) / speed : 2000;
  const quietMs = Math.max(400, Math.round(stepMs * 1.5));
  const res = await page.evaluate(([q, limit]) => window.__smoke.rangeSettles(q, limit), [quietMs, quietMs + 4000 * t.run.slow]);
  t.expect(res.ok, `${expected}: the timeline range to hold still for ${ms(quietMs)} (1.5 of its steps)`, `the range kept moving: ${res.from} -> ${res.to}`);
}

/** Click the first visible species row of the sidebar; returns its data-id (rows reorder while time plays, so retry). */
async function clickSpeciesRow(t, page) {
  await t.until(page, (sel) => [...document.querySelectorAll(sel)].some((el) => window.__smoke.shown(el)), ROW, {
    timeout: 5000,
    expected: `a visible species row in #sidebar (${ROW})`,
    found: () => `#sidebar holds ${document.querySelectorAll('#sidebar [data-id]').length} [data-id] elements and ${document.querySelectorAll('#sidebar button, #sidebar [role="button"]').length} buttons; sidebar: ${window.__smoke.whyHidden('#sidebar')}`,
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const handle = await page.evaluateHandle((sel) => [...document.querySelectorAll(sel)].find((el) => window.__smoke.shown(el)) || null, ROW);
    const row = handle.asElement();
    if (!row) break;
    const id = await row.evaluate((el) => el.dataset.id);
    try {
      await row.click({ timeout: 3000 * t.run.slow });
      return id;
    } catch { /* the row left the list while we aimed at it: take the next one */ }
  }
  throw new Failure('a species row to accept a click', 'no row stayed clickable for 3 attempts');
}

/** Wait for a visible dialog and return its description. */
async function expectDialog(t, page, after) {
  await t.until(page, () => window.__smoke.dialogs().length > 0, null, {
    timeout: 3000, expected: `a visible role="dialog" ${after}`, found: () => window.__smoke.dialogReport(),
  });
  return (await page.evaluate(() => window.__smoke.dialogs()))[0];
}

/** Wait until exactly the expected view is live: #app[data-view], one visible renderer, aria-pressed. */
async function expectView(t, page, view, context) {
  await t.until(page, (want) => {
    const v = window.__smoke.viewState();
    return v.view === want && v.shown.length === 1 && v.shown[0] === want && v.pressed.length === 1 && v.pressed[0] === want;
  }, view, {
    timeout: 4000,
    expected: `${context}: #app[data-view="${view}"], only ${RENDERERS[view]} visible, only ${VIEW_BUTTONS[view]} aria-pressed`,
    found: () => {
      const v = window.__smoke.viewState();
      return `#app[data-view="${v.view}"], visible renderers: [${v.shown.join(', ') || 'none'}], aria-pressed: [${v.pressed.join(', ') || 'none'}]`;
    },
  });
}

/** Switch view through the capture API and wait until the app reports it. */
async function captureView(t, page, view) {
  // Not awaited in the page: the wait below reports a switch that never lands, with context.
  await page.evaluate((v) => { Promise.resolve(window.__capture.setView(v)).catch(() => {}); }, view);
  await t.until(page, (v) => window.__capture.state().view === v, view, {
    timeout: 25000,
    expected: `state().view === "${view}" after __capture.setView("${view}")`,
    found: () => `state().view = "${window.__capture.state().view}"`,
  });
}

// ---------------------------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------------------------

check('boot.load', 'a first visit loads cleanly: no console errors, no failed requests, title set', { strictConsole: true }, async (t) => {
  const page = await t.open('');
  const title = await page.title();
  t.expect(title.trim().length > 0, 'a non-empty document.title', JSON.stringify(title));
  const boot = await page.evaluate(() => ({
    motion: document.documentElement.dataset.motion || null,
    view: document.getElementById('app')?.dataset.view || null,
  }));
  t.expect(boot.motion === 'full' || boot.motion === 'reduced',
    'js/main.js to have run (it stamps <html data-motion="full|reduced">)', `data-motion = ${JSON.stringify(boot.motion)}`);
  t.expect(boot.view === 'map', '#app[data-view="map"] on a first visit', `data-view = ${JSON.stringify(boot.view)}`);
});

check('boot.stable-ids', 'every stable id of index.html is present exactly once', async (t) => {
  const page = await t.open('');
  const counts = await page.evaluate((ids) => ids.map((id) => [id, document.querySelectorAll(`[id="${id}"]`).length]), STABLE_IDS);
  const missing = counts.filter(([, n]) => n === 0).map(([id]) => `#${id}`);
  const doubled = counts.filter(([, n]) => n > 1).map(([id, n]) => `#${id} x${n}`);
  t.expect(!missing.length && !doubled.length, `${STABLE_IDS.length} ids, each exactly once`,
    [missing.length ? `missing: ${missing.join(', ')}` : '', doubled.length ? `duplicated: ${doubled.join(', ')}` : ''].filter(Boolean).join('; '));
});

check('boot.capture-api', '?capture=1 exposes window.__capture (documented methods, state() shape) and hides the chrome', async (t) => {
  const page = await t.capture('');
  const api = await page.evaluate((names) => {
    const c = window.__capture;
    const s = c.state();
    return {
      missing: names.filter((n) => typeof c[n] !== 'function'),
      state: s,
      types: Object.fromEntries(Object.entries(s).map(([k, v]) => [k, typeof v])),
      chrome: ['#toolbar', '#timeline'].filter((sel) => window.__smoke.shown(sel)),
      stage: window.__smoke.whyHidden('#viz-stage'),
      bodyClass: document.body.classList.contains('capture-mode'),
    };
  }, CAPTURE_API);
  t.expect(api.missing.length === 0, `__capture to have ${CAPTURE_API.join(', ')}`, `not a function: ${api.missing.join(', ')}`);
  const want = { timeMa: 'number', fraction: 'number', playing: 'boolean', holding: 'boolean', speed: 'number', view: 'string', layers: 'object' };
  const wrong = Object.entries(want).filter(([k, type]) => api.types[k] !== type).map(([k, type]) => `${k}: ${api.types[k] ?? 'missing'} (want ${type})`);
  t.expect(wrong.length === 0, `state() to return ${Object.keys(want).join(', ')}`, wrong.join('; '));
  t.expect(typeof api.state.layers.plates === 'boolean' && typeof api.state.layers.labels === 'boolean',
    'state().layers = { plates: boolean, labels: boolean }', JSON.stringify(api.state.layers));
  t.expect(api.bodyClass && api.chrome.length === 0, 'body.capture-mode with #toolbar and #timeline hidden', `body.capture-mode: ${api.bodyClass}; still visible: ${api.chrome.join(', ') || 'none'}`);
  t.expect(api.stage === 'visible', '#viz-stage to stay visible in capture mode', api.stage);
});

check('boot.deep-link-direct', 'a deep link without ?t= (?view=tree&play=1) goes straight to the scene: no dialog in the way, already playing', async (t) => {
  const page = await t.open('?view=tree&play=1');
  await t.until(page, () => document.getElementById('app').dataset.view === 'tree', null, {
    timeout: 25000, expected: '?view=tree -> #app[data-view="tree"]', found: () => `#app[data-view="${document.getElementById('app').dataset.view}"]`,
  });
  const r0 = await readRange(page);
  t.expect(r0, `the real UI to have ${RANGE}`, 'no range input in #timeline');
  await t.until(page, ([sel, from]) => Number(document.querySelector(sel).value) > from, [RANGE, r0.value], {
    timeout: 5000, expected: '?play=1 to start playback (the timeline range advances)', found: ([sel]) => `the range stays at ${document.querySelector(sel).value}`,
  });
  await page.evaluate(() => window.__smoke.frames(30));   // an intro card would be up by now
  const dialogs = await page.evaluate(() => window.__smoke.dialogs());
  t.expect(dialogs.length === 0, 'no dialog over a deep-linked scene (js/main.js: "a deep link … goes straight to the scene")',
    () => `${dialogs[0].what} "${dialogs[0].name}" is open over the playing story`);
});

check('boot.intro', 'a first visit opens the intro card as a named modal dialog in #intro-root; Escape dismisses it without starting playback and gives the keyboard back', async (t) => {
  // Its own browser context: an intro that remembers it was seen must still show on a true first visit.
  const page = await t.open('', { isolated: true });
  const shown = await page.waitForFunction(() => window.__smoke.dialogs().length > 0, null, { timeout: 1500 * t.run.slow }).then(() => true, () => false);
  if (!shown) {
    const children = await page.evaluate(() => document.getElementById('intro-root').childElementCount);
    if (children === 0) t.skip('the intro card has not landed yet (#intro-root is empty on a first visit)');
    t.fail('a visible role="dialog" on a first visit (the intro is shown on app:ready unless the page was deep-linked)', await page.evaluate(() => window.__smoke.dialogReport()));
  }
  const d = (await page.evaluate(() => window.__smoke.dialogs()))[0];
  t.expect(d.root === 'intro-root', 'the first-visit dialog to live in #intro-root', `${d.what} is not inside #intro-root`);
  t.expect(d.modal, 'the intro to carry aria-modal="true"', `${d.what} has no aria-modal="true"`);
  t.expect(d.name, 'the intro to have an accessible name (aria-labelledby or aria-label)', `${d.what} has none`);
  await t.until(page, () => window.__smoke.dialogs()[0]?.focusInside === true, null, {
    timeout: 2000, expected: 'keyboard focus to move into the intro', found: () => `focus is on ${window.__smoke.describe(document.activeElement)}`,
  });
  await page.keyboard.press('Escape');
  await t.until(page, () => window.__smoke.dialogs().length === 0, null, {
    timeout: 3000, expected: 'Escape to dismiss the intro', found: () => window.__smoke.dialogReport(),
  });
  await expectStill(t, page, 'dismissing the intro with Escape not to start playback');
  // …and the keyboard is back: a dismissed intro must not leave the shortcuts silenced.
  const plates = () => page.evaluate(() => document.getElementById('btn-plates').getAttribute('aria-pressed'));
  const before = await plates();
  await page.keyboard.press('p');
  await t.until(page, (was) => document.getElementById('btn-plates').getAttribute('aria-pressed') !== was, before, {
    timeout: 2000,
    expected: 'P to toggle the plate boundaries once the intro is dismissed (the shortcuts work again)',
    found: (was) => `#btn-plates[aria-pressed] stays "${was}"${window.__smoke.keyboardBlockers()}`,
  });
  await page.keyboard.press('p');                     // put the layer back as it was
  t.note(`${d.what} "${d.name}"; dismissed by Escape, shortcuts work again (was ${before}, ${await plates()} after two presses)`);
});

const FIT_EXPECTED = 'the page to fit the viewport width: no sideways scrolling, no horizontal scrollbar, no control or text cut off at the screen edge';

/**
 * Settled fit problems of a page (warnings become notes, prefixed with `where`). On a failure the
 * page is left scrolled sideways, so the screenshot shows what that does to the app.
 */
async function settledFit(t, page, where) {
  const fit = await page.evaluate((limitMs) => window.__smoke.fitSettled(8, limitMs), 2000 * t.run.slow);
  for (const w of fit.warnings) t.note(`warning — ${where}: ${w}`);
  if (!fit.problems.some((line) => line.includes('sideways'))) return fit.problems;
  await page.evaluate(() => window.__smoke.scrollSideways());
  return fit.problems.map((line) => (line.includes('sideways') ? `${line} [screenshot: the page scrolled sideways as far as it goes]` : line));
}

check('boot.no-hscroll', `no horizontal overflow when the app is opened at ${SIZES.map(([w, h]) => `${w}x${h}`).join(', ')}`, async (t) => {
  const facts = await t.facts();
  const problems = [];
  // A busy deep-linked scene at every size, and a first visit (intro included, once it lands) on a phone.
  const legs = [...SIZES.map((size) => [`?t=${facts.quietMa}`, size]), ['', SIZES[SIZES.length - 1]]];
  for (const [query, [width, height]] of legs) {
    const where = `${width}x${height}${query ? '' : ' (first visit)'}`;
    const page = await t.open(query, { viewport: { width, height } });
    const found = await settledFit(t, page, where);
    for (const line of found) problems.push(`${where}: ${line}`);
    if (!found.length) await page.close();      // keep the failing pages open for the screenshots
  }
  t.expect(problems.length === 0, FIT_EXPECTED, problems.join('; '));
});

check('boot.resize-reflow', 'opened on a desktop and then shrunk to each smaller size, the app re-lays itself out: nothing is left wider than the viewport', async (t) => {
  const facts = await t.facts();
  const [desktop, ...smaller] = SIZES;
  const problems = [];
  // One fresh desktop page per size: a laptop window made narrow, a tablet rotated. (A page's
  // first shrink is what leaves stale layout behind; later ones on the same page may not.)
  for (const [width, height] of smaller) {
    const where = `${desktop[0]} -> ${width}x${height}`;
    const page = await t.open(`?t=${facts.quietMa}`, { viewport: { width: desktop[0], height: desktop[1] } });
    const atDesktop = await settledFit(t, page, `${desktop[0]}x${desktop[1]}`);
    if (atDesktop.length) t.fail(`the page to fit at ${desktop[0]}x${desktop[1]} before shrinking`, atDesktop.join('; '));
    await page.setViewportSize({ width, height });
    const found = await settledFit(t, page, where);
    for (const line of found) problems.push(`${where}: ${line}`);
    if (!found.length) await page.close();      // keep the failing pages open for the screenshots
  }
  t.expect(problems.length === 0, `${FIT_EXPECTED}, also after a resize`, problems.join('; '));
});

// ---------------------------------------------------------------------------------------------
// time
// ---------------------------------------------------------------------------------------------

check('time.deep-link', '?t=66.5 lands within 0.01 Ma, paused, and the real timeline reflects it', async (t) => {
  const cap = await t.capture('t=66.5');
  const s = await state(cap);
  t.expect(Math.abs(s.timeMa - 66.5) <= 0.01, '__capture.state().timeMa within 0.01 Ma of 66.5', `timeMa = ${s.timeMa}`);
  t.expect(s.playing === false, 'a deep link without &play=1 to start paused', `playing = ${s.playing}`);
  await cap.close();

  const ui = await t.open('?t=66.5');
  const range = await readRange(ui);
  t.expect(range, `the real UI to have ${RANGE}`, 'no range input in #timeline');
  t.expect(range.fraction > 0 && range.fraction < 1, 'the timeline range to sit between its ends at 66.5 Ma',
    `value ${range.value} in [${range.min}, ${range.max}]`);
  t.expect(range.valuetext.trim().length > 0, 'the range to describe 66.5 Ma in aria-valuetext', 'aria-valuetext is empty');
  t.note(`range reads "${range.valuetext}"`);
});

check('time.play-pause', 'play advances time toward the present, pause stops it exactly', async (t) => {
  const facts = await t.facts();
  const page = await t.capture(`t=${facts.quietMa}&hold=0`);
  const r = await page.evaluate(async () => {
    const c = window.__capture;
    const S = window.__smoke;
    const startMa = c.state().timeMa;
    c.play();
    const trace = [];
    const t0 = performance.now();
    await S.eachFrame(() => {
      trace.push(c.state().timeMa);
      return trace.length >= 30 || performance.now() - t0 > 4000 ? true : undefined;
    });
    const playing = c.state().playing;
    c.pause();
    const pausedMa = c.state().timeMa;
    let drift = 0;
    const t1 = performance.now();
    await S.eachFrame(() => {
      drift = Math.max(drift, Math.abs(c.state().timeMa - pausedMa));
      return performance.now() - t1 >= 300 ? true : undefined;
    });
    return { startMa, trace, playing, pausedMa, drift, playingAfter: c.state().playing };
  });
  const last = r.trace[r.trace.length - 1];
  t.expect(r.playing === true, 'state().playing === true after play()', `playing = ${r.playing}`);
  t.expect(last < r.startMa, `time to count down from ${r.startMa} Ma while playing`, `after ${r.trace.length} frames timeMa = ${last}`);
  const up = r.trace.findIndex((v, i) => i > 0 && v > r.trace[i - 1]);
  t.expect(up < 0, 'time never to step back toward the past during playback', () => `frame ${up}: ${r.trace[up - 1]} -> ${r.trace[up]} Ma`);
  t.expect(r.playingAfter === false, 'state().playing === false after pause()', `playing = ${r.playingAfter}`);
  t.expect(r.drift === 0, 'time to stand still for 300 ms after pause()', `it moved by ${r.drift} Ma from ${r.pausedMa}`);
});

check('time.runs-to-end', 'playback is monotonic across period boundaries, reaches 0 Ma and stops itself', async (t) => {
  const facts = await t.facts();
  const page = await t.capture(`t=${facts.endRunMa}&speed=4&hold=0`);
  const r = await page.evaluate(async (limitMs) => {
    const c = window.__capture;
    const S = window.__smoke;
    const startMa = c.state().timeMa;
    c.play();
    let prev = Infinity;
    let backwards = null;
    let frames = 0;
    const t0 = performance.now();
    await S.eachFrame(() => {
      const s = c.state();
      frames++;
      if (s.timeMa > prev + 1e-12 && !backwards) backwards = [prev, s.timeMa];
      prev = s.timeMa;
      return !s.playing || performance.now() - t0 > limitMs ? true : undefined;
    });
    return { startMa, frames, backwards, took: performance.now() - t0, end: c.state() };
  }, 10000 * t.run.slow);
  t.expect(!r.backwards, 'time never to step back toward the past', () => `${r.backwards[0]} -> ${r.backwards[1]} Ma`);
  t.expect(r.end.playing === false && r.end.holding === false, 'the clock to stop itself at the present (playing false)',
    `after ${ms(r.took)}: playing = ${r.end.playing}, timeMa = ${r.end.timeMa}`);
  t.expect(r.end.timeMa === 0 && r.end.fraction >= 0.999999, 'state() to read timeMa 0 and fraction 1 at the end', `timeMa = ${r.end.timeMa}, fraction = ${r.end.fraction}`);
  t.expect(r.frames > 5, 'the last stretch to be played, not jumped', `only ${r.frames} frames from ${r.startMa} Ma`);
  t.note(`${Number(r.startMa.toPrecision(3))} Ma -> 0 in ${ms(r.took)} at 4x`);
});

check('time.replay', 'play at the end restarts from the beginning', async (t) => {
  const facts = await t.facts();
  const page = await t.capture('t=0');
  const before = await state(page);
  t.expect(before.timeMa === 0 && before.playing === false, '?t=0 to open paused at the present', `timeMa = ${before.timeMa}, playing = ${before.playing}`);
  const after = await page.evaluate(() => {
    window.__capture.play();
    const s = window.__capture.state();
    window.__capture.pause();
    return s;
  });
  t.expect(after.playing === true, 'play() at the end to start playing', `playing = ${after.playing}`);
  t.expect(after.fraction < 0.01 && (facts.startMa === null || after.timeMa > facts.startMa * 0.99),
    `play() at the end to rewind to the start${facts.startMa === null ? '' : ` (${facts.startMa} Ma)`}`, `timeMa = ${after.timeMa}, fraction = ${after.fraction}`);
});

check('time.speed', '?speed=2 applies: state().speed is 2 and playback really runs twice as fast as 1x', async (t) => {
  const facts = await t.facts();
  const page = await t.capture(`t=${facts.quietMa}&speed=2&hold=0`);
  const s = await state(page);
  t.expect(s.speed === 2, '?speed=2 -> state().speed === 2', `speed = ${s.speed}`);
  // Median per-frame rate of the story fraction: immune to the odd slow frame.
  const r = await page.evaluate(async () => {
    const c = window.__capture;
    const S = window.__smoke;
    const rate = async () => {
      const rates = [];
      let prev = null;
      await S.eachFrame((ts) => {
        const f = c.state().fraction;
        if (prev && ts > prev.ts) rates.push((f - prev.f) / ((ts - prev.ts) / 1000));
        prev = { ts, f };
        return rates.length >= 24 ? true : undefined;
      });
      rates.sort((a, b) => a - b);
      return rates[rates.length >> 1];
    };
    c.play();
    await S.frames(3);
    const at2 = await rate();
    c.setSpeed(1);
    await S.frames(3);
    const at1 = await rate();
    c.pause();
    return { at2, at1 };
  });
  t.expect(r.at1 > 0 && r.at2 > 0, 'time to advance at both speeds', `fraction/s at 1x = ${r.at1}, at 2x = ${r.at2}`);
  const ratio = r.at2 / r.at1;
  t.expect(Math.abs(ratio - 2) < 0.1, 'playback at ?speed=2 to run 2.0x as fast as at 1x', `${ratio.toFixed(3)}x`);
  if (facts.total) {
    const real = r.at1 * facts.total;
    t.expect(Math.abs(real - 1) < 0.05, `1x to cover the story in totalScreenSeconds() (${facts.total.toFixed(1)} s)`,
      `the measured rate would take ${(1 / r.at1).toFixed(1)} s (${real.toFixed(3)}x)`);
  }
});

check('time.transport-button', 'the play/pause button in #timeline starts and stops playback, by click and by Space, and its label follows', async (t) => {
  const facts = await t.facts();
  // 4x: the range moves a step every half second, so "playing" and "paused" are quick to tell apart.
  const page = await t.open(`?t=${facts.quietMa}&speed=4`);
  const button = await transportButton(page);
  if (!button) t.skip('no button whose accessible name starts with Play/Pause found in #timeline');
  const label = () => button.evaluate((b) => window.__smoke.accName(b));
  const advancing = async (what) => {
    const v0 = (await readRange(page)).value;
    await t.until(page, ([sel, from]) => Number(document.querySelector(sel).value) > from, [RANGE, v0], {
      timeout: 4000, expected: `${what} to start playback (the timeline range advances)`, found: ([sel]) => `the range stays at ${document.querySelector(sel).value}`,
    });
  };

  t.expect(await readRange(page), `the real UI to have ${RANGE}`, 'no range input in #timeline');
  const pausedLabel = await label();
  await button.click();
  await advancing('a click on the button');
  const playingLabel = await label();
  t.expect(playingLabel && playingLabel !== pausedLabel, 'the button label to change while playing', `it still reads "${playingLabel}"`);
  await button.click();
  await expectStill(t, page, 'a second click to stop playback', { speed: 4 });
  t.expect((await label()) === pausedLabel, `the label to return to "${pausedLabel}" when paused`, `"${await label()}"`);

  // The classic double toggle: Space on the focused button must act once, not twice.
  await button.focus();
  await page.keyboard.press('Space');
  await advancing('Space on the focused button');
  await page.keyboard.press('Space');
  await expectStill(t, page, 'Space again to stop playback', { speed: 4 });
  t.note(`label "${pausedLabel}" <-> "${playingLabel}"`);
});

check('time.url-follows-scrub', 'while paused, scrubbing the timeline updates ?t= in the URL, so the deep link stays shareable', async (t) => {
  const facts = await t.facts();
  const page = await t.open(`?t=${facts.quietMa}`);
  t.expect(await readRange(page), `the real UI to have ${RANGE}`, 'no range input in #timeline');
  await page.focus(RANGE);
  await page.keyboard.press('End');               // native range behaviour: jump to the present
  await t.until(page, (sel) => {
    const r = document.querySelector(sel);
    return Number(r.value) >= Number(r.max || 100);
  }, RANGE, {
    timeout: 2000, expected: 'End on the focused range to move it to its maximum (the present)', found: (sel) => `value = ${document.querySelector(sel).value}`,
  });
  await t.until(page, () => {
    const raw = new URLSearchParams(location.search).get('t');
    return raw !== null && Number(raw) < 0.5;
  }, RANGE, {
    timeout: 4000,
    expected: 'the URL to follow the scrub to the present (?t=0) while paused',
    found: (sel) => `location.search is still "${location.search}" while the timeline reads "${document.querySelector(sel).getAttribute('aria-valuetext')}"`,
  });

  // …and by pointer: drag across the scrubbable strip, i.e. the range's own box wherever the app put it.
  const box = await page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { x: r.left, y: r.top + r.height / 2, w: r.width, h: r.height };
  }, RANGE);
  if (box.w < 200 || box.h < 4) {
    t.note('pointer leg skipped: the range input has no box to drag across');
    return;
  }
  const before = await readRange(page);
  await page.mouse.move(box.x + box.w * 0.3, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.w * 0.4, box.y, { steps: 4 });
  await page.mouse.move(box.x + box.w * 0.5, box.y, { steps: 4 });
  await page.mouse.up();
  await page.evaluate(() => window.__smoke.frames(3));
  const after = await readRange(page);
  if (after.value === before.value) {
    t.note("pointer leg skipped: dragging across the range's box did not move the timeline");
    return;
  }
  await t.until(page, () => {
    const raw = new URLSearchParams(location.search).get('t');
    return raw !== null && Number(raw) > 1;
  }, RANGE, {
    timeout: 4000,
    expected: 'the URL to follow a pointer drag back to the middle of the story while paused',
    found: (sel) => `location.search is still "${location.search}" while the timeline reads "${document.querySelector(sel).getAttribute('aria-valuetext')}"`,
  });
  t.note(`keyboard and pointer scrubs both reach the URL (${await page.evaluate(() => location.search)})`);
});

// ---------------------------------------------------------------------------------------------
// extinctions
// ---------------------------------------------------------------------------------------------

function validEvents(t, facts) {
  const broken = facts.events.filter((e) => !e.valid).map((e) => e.id);
  t.expect(facts.events.length > 0 && broken.length === 0,
    'getActiveExtinction() to bracket every entry of `extinctions` around its timeMa', broken.length ? `no usable window for: ${broken.join(', ')}` : 'the extinctions list is empty');
  return facts.events;
}

check('extinctions.hold', `playing into each mass extinction (?hold=${HOLD_SECONDS}) holds the clock, shows #extinction-overlay, then releases by itself`, async (t) => {
  const facts = await t.facts();
  const events = validEvents(t, facts);
  const page = await t.capture(`hold=${HOLD_SECONDS}`);
  const s = await state(page);
  t.expect(s.holdSeconds === HOLD_SECONDS, `?hold=${HOLD_SECONDS} -> state().holdSeconds === ${HOLD_SECONDS}`, `holdSeconds = ${s.holdSeconds}`);
  const problems = [];
  const held = [];
  for (const ev of events) {
    const r = await page.evaluate(watchExtinction, {
      beforeMa: ev.beforeMa, endMa: ev.endMa, skip: false, tailMs: 0,
      enterLimitMs: 8000 * t.run.slow, holdLimitMs: (HOLD_SECONDS * 1000 + 5000) * t.run.slow,
    });
    if (r.stageMoves > 0) t.run.shakeSeen = true;
    else if (t.run.shakeSeen === null) t.run.shakeSeen = false;
    const bad = (text) => problems.push(`${ev.id}: ${text}`);
    if (!r.entered) {
      bad(r.playing === false && r.lastMa >= ev.endMa
        ? `the clock stopped at ${r.lastMa} Ma with state().holding false`
        : `no hold — the clock ran from ${ev.beforeMa.toFixed(3)} to ${r.lastMa.toFixed(3)} Ma with state().holding never true`);
      continue;
    }
    if (r.holdMa > ev.edgeMa + 1e-6 || r.holdMa < ev.endMa - 1e-6) bad(`held at ${r.holdMa} Ma, outside the event window ${ev.edgeMa.toFixed(3)}–${ev.endMa.toFixed(3)} Ma`);
    if (r.moved) bad(`time moved on ${plural(r.moved, 'frame')} during the hold`);
    if (r.backwards) bad(`time stepped back ${r.backwards[0]} -> ${r.backwards[1]} Ma`);
    if (!r.overlayShown) bad(`#extinction-overlay stayed hidden for the whole hold (${r.overlayWhy})`);
    if (r.stillHolding || !r.released) {
      bad(`still holding ${((HOLD_SECONDS * 1000 + 5000) / 1000).toFixed(1)} s later — the hold never ended by itself`);
      continue;
    }
    if (r.holdMs < HOLD_SECONDS * 1000 - 20) bad(`the hold lasted ${ms(r.holdMs)}, shorter than ${HOLD_SECONDS} s`);
    if (r.holdMs > HOLD_SECONDS * 1000 + 1500 * t.run.slow + r.slowMs) bad(`the hold lasted ${ms(r.holdMs)}, far longer than ${HOLD_SECONDS} s`);
    if (!r.resumed || r.playingAfter !== true) bad(`after the hold time did not move on (playing = ${r.playingAfter}, timeMa = ${r.lastMa})`);
    held.push(`${ev.id} ${(r.holdMs / 1000).toFixed(2)} s`);
  }
  if (held.length) t.note(`held: ${held.join(', ')}`);
  t.expect(problems.length === 0,
    `for each of ${events.length} events: state().holding true on the leading edge, overlay visible, released after ~${HOLD_SECONDS} s, playback resumes`, problems.join('; '));
});

check('extinctions.skip-hold', '__capture.skipHold() ends a hold at once and playback carries on', async (t) => {
  const facts = await t.facts();
  const events = validEvents(t, facts);
  const page = await t.capture('hold=30');
  const problems = [];
  for (const ev of events) {
    const r = await page.evaluate(watchExtinction, {
      beforeMa: ev.beforeMa, endMa: ev.endMa, skip: true, tailMs: 0,
      enterLimitMs: 8000 * t.run.slow, holdLimitMs: 5000 * t.run.slow,
    });
    const bad = (text) => problems.push(`${ev.id}: ${text}`);
    if (!r.entered) { bad(`never entered the hold (timeMa = ${r.lastMa}, playing = ${r.playing})`); continue; }
    if (r.holdingAfterSkip !== false) bad(`state().holding = ${r.holdingAfterSkip} right after skipHold()`);
    if (!r.released) bad('the hold was not released');
    else if (!r.resumed || r.playingAfter !== true) bad(`time did not move on after skipHold() (playing = ${r.playingAfter}, timeMa = ${r.lastMa})`);
  }
  t.expect(problems.length === 0, `skipHold() to release a 30 s hold immediately at each of ${events.length} events, still playing`, problems.join('; '));
});

check('extinctions.scrub-no-hold', 'scrubbing into an extinction window never triggers a hold', async (t) => {
  const facts = await t.facts();
  const events = validEvents(t, facts);
  const page = await t.capture(`hold=${HOLD_SECONDS}`);
  const problems = [];
  for (const ev of events) {
    const r = await page.evaluate(async ({ insideMa }) => {
      const c = window.__capture;
      const S = window.__smoke;
      c.pause();
      c.setTime(insideMa);
      await S.frames(2);
      const paused = c.state();
      c.play();
      let held = false;
      let n = 0;
      await S.eachFrame(() => {
        if (c.state().holding) held = true;
        return ++n >= 8 ? true : undefined;
      });
      const playing = c.state();
      // …and the same again while already playing.
      c.setTime(insideMa);
      n = 0;
      await S.eachFrame(() => {
        if (c.state().holding) held = true;
        return ++n >= 4 ? true : undefined;
      });
      c.pause();
      return { paused, playing, held };
    }, ev);
    if (r.paused.holding) problems.push(`${ev.id}: state().holding true right after setTime(${ev.insideMa})`);
    else if (r.held) problems.push(`${ev.id}: a hold started after scrubbing to ${ev.insideMa} Ma and pressing play`);
    else if (!(r.playing.timeMa < r.paused.timeMa)) problems.push(`${ev.id}: time did not advance after scrubbing in (timeMa = ${r.playing.timeMa})`);
  }
  t.expect(problems.length === 0, 'setTime() into a window, then play: holding stays false and time advances', problems.join('; '));
});

// ---------------------------------------------------------------------------------------------
// views
// ---------------------------------------------------------------------------------------------

check('views.globe-loads', 'the globe view loads (needs three.js from the CDN and WebGL), with a clean console', async (t) => {
  const g = await t.needGlobe();
  // What the probe page logged while the globe loaded is this check's to answer for.
  t.problems.push(...(g.problems || []));
  t.note(`ready in ${ms(g.ms)}`);
});

check('views.switch-cycle', 'Map -> Globe -> Tree -> Map by toolbar: exactly one renderer visible, #app[data-view] and the URL follow', async (t) => {
  const facts = await t.facts();
  const globe = await t.hasGlobe();
  const page = await t.open(`?t=${facts.quietMa}`);
  await expectView(t, page, 'map', 'on load');
  for (const view of globe ? ['globe', 'tree', 'map'] : ['tree', 'map']) {
    await page.click(VIEW_BUTTONS[view]);
    await t.until(page, (want) => document.getElementById('app').dataset.view === want, view, {
      timeout: 25000,
      expected: `#app[data-view="${view}"] after clicking ${VIEW_BUTTONS[view]}`,
      found: () => `#app[data-view="${document.getElementById('app').dataset.view}"]; notice: "${document.getElementById('view-notice')?.textContent || ''}"`,
    });
    await expectView(t, page, view, `after clicking ${VIEW_BUTTONS[view]}`);
    await t.until(page, (want) => {
      const q = new URLSearchParams(location.search).get('view');
      return want === 'map' ? q === null || q === 'map' : q === want;
    }, view, {
      timeout: 4000,
      expected: view === 'map' ? 'the URL to drop view= once back on the map (paused)' : `the URL to carry view=${view} while paused`,
      found: () => `location.search = "${location.search}"`,
    });
  }
  const at = await page.evaluate(() => Number(new URLSearchParams(location.search).get('t')));
  t.expect(Math.abs(at - facts.quietMa) < 0.5, `the URL to keep t=${facts.quietMa} through the view switches`, `t=${at}`);
});

check('views.deep-link', '?view=tree and ?view=globe open directly in that view', async (t) => {
  const facts = await t.facts();
  const globe = await t.hasGlobe();
  for (const view of globe ? ['tree', 'globe'] : ['tree']) {
    const page = await t.open(`?t=${facts.quietMa}&view=${view}`);
    await t.until(page, (want) => document.getElementById('app').dataset.view === want, view, {
      timeout: 25000,
      expected: `?view=${view} -> #app[data-view="${view}"]`,
      found: () => `#app[data-view="${document.getElementById('app').dataset.view}"]`,
    });
    await expectView(t, page, view, `?view=${view}`);
    await page.close();
  }
});

check('views.rapid-toggle', '10 view switches in 300 ms end in a consistent state with no console errors', async (t) => {
  const facts = await t.facts();
  const globe = await t.hasGlobe();
  const order = globe
    ? ['globe', 'tree', 'map', 'globe', 'tree', 'globe', 'map', 'tree', 'map', 'globe']
    : ['tree', 'map', 'tree', 'map', 'tree', 'map', 'tree', 'map', 'map', 'tree'];
  const final = order[order.length - 1];
  const page = await t.open(`?t=${facts.quietMa}`);
  t.strictConsoleFromNow();
  const took = await page.evaluate((selectors) => new Promise((done) => {
    const t0 = performance.now();
    selectors.forEach((sel, i) => setTimeout(() => {
      document.querySelector(sel).click();
      if (i === selectors.length - 1) done(performance.now() - t0);
    }, i * 30));
  }), order.map((v) => VIEW_BUTTONS[v]));
  await t.until(page, (want) => document.getElementById('app').dataset.view === want, final, {
    timeout: 25000,
    expected: `the last requested view to win: #app[data-view="${final}"]`,
    found: () => `#app[data-view="${document.getElementById('app').dataset.view}"]`,
  });
  await expectView(t, page, final, `after ${order.length} clicks in ${Math.round(took)} ms`);
  // It must also stay that way: nothing queued may flip it afterwards.
  await page.evaluate(() => window.__smoke.frames(12));
  await expectView(t, page, final, 'a dozen frames later');
  t.note(`${order.join(' > ')} in ${Math.round(took)} ms`);
});

check('views.non-blank', `every view paints at ${SAMPLE_TIMES_MA.join(', ')} Ma (more than one colour on its canvas)`, async (t) => {
  const globe = await t.hasGlobe();
  const page = await t.capture('');
  const blank = [];
  const painted = [];
  for (const view of ['map', ...(globe ? ['globe'] : []), 'tree']) {
    await captureView(t, page, view);
    let least = 1;
    for (const ma of SAMPLE_TIMES_MA) {
      const px = await page.evaluate(async ({ ma, limitMs }) => {
        const c = window.__capture;
        const S = window.__smoke;
        c.pause();
        c.setTime(ma);
        const t0 = performance.now();
        let stats;
        // A view may need a few frames after a jump (textures, layout): allow it up to limitMs.
        do {
          await S.frames(2);
          stats = S.pixels(c.activeCanvas());
        } while (!stats.error && stats.colours < 2 && performance.now() - t0 < limitMs);
        return stats;
      }, { ma, limitMs: 2000 * t.run.slow });
      if (px.error) blank.push(`${view} at ${ma} Ma: ${px.error}`);
      else if (px.colours < 2) blank.push(`${view} at ${ma} Ma: one flat colour ${px.first} over ${px.w}x${px.h}`);
      else least = Math.min(least, px.coverage);
    }
    painted.push(`${view} >= ${(least * 100).toFixed(1)}%`);
  }
  t.note(`share of pixels differing from the corner pixel: ${painted.join(', ')}`);
  t.expect(blank.length === 0, 'more than one distinct colour on __capture.activeCanvas() at every sampled time', blank.join('; '));
});

check('views.play-through-crisis', 'every view plays through a mass extinction (hold, window, aftermath) with no console errors and keeps painting', async (t) => {
  const facts = await t.facts();
  const ev = validEvents(t, facts).reduce((a, b) => (b.timeMa < a.timeMa ? b : a));   // the most recent event
  const globe = await t.hasGlobe();
  const page = await t.capture('hold=0.4');
  t.strictConsoleFromNow();
  const problems = [];
  for (const view of ['map', ...(globe ? ['globe'] : []), 'tree']) {
    await captureView(t, page, view);
    const r = await page.evaluate(watchExtinction, {
      beforeMa: ev.beforeMa, endMa: ev.endMa, skip: false, tailMs: 1200,
      enterLimitMs: 8000 * t.run.slow, holdLimitMs: 5400 * t.run.slow,
    });
    if (!r.entered || !r.released || !r.resumed) {
      problems.push(`${view}: the clock did not get through ${ev.id} (held: ${r.entered}, released: ${r.released}, moved on: ${r.resumed}, timeMa = ${r.lastMa})`);
    }
    const px = await page.evaluate(async () => {
      await window.__smoke.frame();
      return window.__smoke.pixels(window.__capture.activeCanvas());
    });
    if (px.error) problems.push(`${view}: ${px.error}`);
    else if (px.colours < 2) problems.push(`${view}: the canvas is one flat colour ${px.first} after the event`);
  }
  t.expect(problems.length === 0, `map, globe and tree to play through ${ev.id} and still paint`, problems.join('; '));
  t.note(`played ${ev.id} in each view`);
});

// ---------------------------------------------------------------------------------------------
// layers & panels
// ---------------------------------------------------------------------------------------------

check('panels.layers', 'Plates and Labels toggle aria-pressed, the deep link and __capture.state().layers', async (t) => {
  const facts = await t.facts();
  const attr = (page, sel) => page.evaluate((s) => document.querySelector(s).getAttribute('aria-pressed'), sel);

  // Real UI: real clicks, observed through ARIA and the URL.
  const ui = await t.open(`?t=${facts.quietMa}`);
  for (const [name, sel, initial] of [['plates', '#btn-plates', false], ['labels', '#btn-labels', true]]) {
    t.expect((await attr(ui, sel)) === String(initial), `${sel}[aria-pressed="${initial}"] by default`, `aria-pressed = ${JSON.stringify(await attr(ui, sel))}`);
    for (const on of [!initial, initial]) {
      await ui.click(sel);
      await t.until(ui, ([s, want]) => document.querySelector(s).getAttribute('aria-pressed') === want, [sel, String(on)], {
        timeout: 2000, expected: `${sel}[aria-pressed="${on}"] after a click`, found: ([s]) => `aria-pressed = "${document.querySelector(s).getAttribute('aria-pressed')}"`,
      });
      await t.until(ui, ([key, want]) => {
        const raw = new URLSearchParams(location.search).get(key);
        const urlOn = raw === null ? key === 'labels' : raw !== '0' && raw !== 'false';
        return urlOn === want;
      }, [name, on], {
        timeout: 4000, expected: `the URL to say ${name} is ${on ? 'on' : 'off'} while paused`, found: () => `location.search = "${location.search}"`,
      });
    }
  }
  await ui.close();

  // Capture twin: the deep link, the buttons and the API all meet in state().layers.
  const cap = await t.capture('plates=1&labels=0');
  let s = await state(cap);
  t.expect(s.layers.plates === true && s.layers.labels === false, '?plates=1&labels=0 -> state().layers = { plates: true, labels: false }', JSON.stringify(s.layers));
  t.expect((await attr(cap, '#btn-plates')) === 'true' && (await attr(cap, '#btn-labels')) === 'false',
    'the buttons to mirror the deep link (aria-pressed true / false)', `plates: ${await attr(cap, '#btn-plates')}, labels: ${await attr(cap, '#btn-labels')}`);
  await cap.evaluate(() => document.getElementById('btn-plates').click());   // the toolbar is hidden in capture mode
  s = await state(cap);
  t.expect(s.layers.plates === false && (await attr(cap, '#btn-plates')) === 'false',
    'a click on #btn-plates to clear state().layers.plates and aria-pressed', `layers.plates = ${s.layers.plates}, aria-pressed = ${await attr(cap, '#btn-plates')}`);
  await cap.evaluate(() => window.__capture.setLayer('labels', true));
  s = await state(cap);
  t.expect(s.layers.labels === true && (await attr(cap, '#btn-labels')) === 'true',
    '__capture.setLayer("labels", true) to set state().layers.labels and aria-pressed', `layers.labels = ${s.layers.labels}, aria-pressed = ${await attr(cap, '#btn-labels')}`);
});

check('panels.legend-chapters', 'Legend and Chapters open and close from the toolbar, mirror aria-expanded, and Escape closes them', async (t) => {
  const facts = await t.facts();
  const page = await t.open(`?t=${facts.quietMa}`);
  const PANELS = [['#btn-legend', '#legend-panel'], ['#btn-chapters', '#chapters-panel']];
  const expectPanel = (btn, panel, open, when) => t.until(page, ([b, p, want]) => window.__smoke.shown(p) === want
    && document.querySelector(b).getAttribute('aria-expanded') === String(want), [btn, panel, open], {
    timeout: 3000,
    expected: `${when}: ${panel} ${open ? 'visible' : 'hidden'} and ${btn}[aria-expanded="${open}"]`,
    found: ([b, p]) => `${p}: ${window.__smoke.whyHidden(p)}; ${b}[aria-expanded="${document.querySelector(b).getAttribute('aria-expanded')}"]`,
  });
  for (const [btn, panel] of PANELS) {
    await expectPanel(btn, panel, false, 'on load');
    await page.click(btn);
    await expectPanel(btn, panel, true, `after clicking ${btn}`);
    await page.click(btn);
    await expectPanel(btn, panel, false, `after clicking ${btn} again`);
  }
  for (const [btn, panel] of PANELS) {
    await page.click(btn);
    await expectPanel(btn, panel, true, `after clicking ${btn}`);
    await page.keyboard.press('Escape');
    await expectPanel(btn, panel, false, 'after Escape');
  }
});

check('panels.sidebar-drawer', 'on a narrow screen #btn-sidebar slides the sidebar in and out and mirrors aria-expanded', async (t) => {
  const facts = await t.facts();
  const page = await t.open(`?t=${facts.quietMa}`, { viewport: { width: 820, height: 1180 } });
  t.expect(await page.evaluate(() => window.__smoke.shown('#btn-sidebar')), '#btn-sidebar to be visible at 820px wide', await page.evaluate(() => window.__smoke.whyHidden('#btn-sidebar')));
  const expectDrawer = (open, when) => t.until(page, (want) => (window.__smoke.onScreen('#sidebar') > 0.9) === want
    && document.getElementById('btn-sidebar').getAttribute('aria-expanded') === String(want), open, {
    timeout: 3000,
    expected: `${when}: #sidebar ${open ? 'on screen' : 'off screen'} and #btn-sidebar[aria-expanded="${open}"]`,
    found: () => `${Math.round(window.__smoke.onScreen('#sidebar') * 100)}% of #sidebar is on screen; #btn-sidebar[aria-expanded="${document.getElementById('btn-sidebar').getAttribute('aria-expanded')}"]`,
  });
  await expectDrawer(false, 'on load');
  await page.click('#btn-sidebar');
  await expectDrawer(true, 'after clicking #btn-sidebar');
  // Escape is the sidebar component's job (it answers panel:close-all): report it, do not require it.
  await page.keyboard.press('Escape');
  const closedByEscape = await page.waitForFunction(() => window.__smoke.onScreen('#sidebar') < 0.1, null, { timeout: 1000 * t.run.slow }).then(() => true, () => false);
  if (closedByEscape) {
    await expectDrawer(false, 'after Escape');
  } else {
    t.note('Escape does not close the drawer (js/ui/sidebar.js is expected to answer panel:close-all on narrow screens)');
    await page.click('#btn-sidebar');
    await expectDrawer(false, 'after clicking #btn-sidebar again');
  }
});

check('panels.help', 'the Help button opens a modal dialog; Escape closes it and focus returns to the button', async (t) => {
  const facts = await t.facts();
  const page = await t.open(`?t=${facts.quietMa}`);
  await page.click('#btn-help');
  const opened = await page.waitForFunction(() => window.__smoke.dialogs().length > 0, null, { timeout: 1500 * t.run.slow }).then(() => true, () => false);
  if (!opened) {
    const children = await page.evaluate(() => document.getElementById('help-root').childElementCount);
    if (children === 0) t.skip('the Help dialog has not landed yet (#help-root is empty and #btn-help opens nothing)');
    t.fail('a visible role="dialog" after clicking #btn-help', await page.evaluate(() => window.__smoke.dialogReport()));
  }
  const d = (await page.evaluate(() => window.__smoke.dialogs()))[0];
  t.expect(d.modal, 'the Help dialog to carry aria-modal="true"', `${d.what} has no aria-modal="true"`);
  t.expect(d.name, 'the Help dialog to have an accessible name (aria-labelledby or aria-label)', `${d.what} has none`);
  await t.until(page, () => window.__smoke.dialogs()[0]?.focusInside === true, null, {
    timeout: 2000, expected: 'keyboard focus to move into the Help dialog', found: () => `focus is on ${window.__smoke.describe(document.activeElement)}`,
  });
  await page.keyboard.press('Escape');
  await t.until(page, () => window.__smoke.dialogs().length === 0, null, {
    timeout: 3000, expected: 'Escape to close the Help dialog', found: () => window.__smoke.dialogReport(),
  });
  await t.until(page, () => document.activeElement?.id === 'btn-help', null, {
    timeout: 2000, expected: 'focus to return to #btn-help', found: () => `focus is on ${window.__smoke.describe(document.activeElement)}`,
  });
});

// ---------------------------------------------------------------------------------------------
// species
// ---------------------------------------------------------------------------------------------

check('species.sidebar-dialog', 'a species row in #sidebar opens a modal dialog that pauses the clock; Escape closes it and focus returns to the row', async (t) => {
  const facts = await t.facts();
  const page = await t.open(`?t=${facts.quietMa}&play=1&speed=4`);
  const r0 = await readRange(page);
  t.expect(r0, `the real UI to have ${RANGE} (used to watch the clock)`, 'no range input in #timeline');
  await t.until(page, ([sel, from]) => Number(document.querySelector(sel).value) > from, [RANGE, r0.value], {
    timeout: 5000, expected: '?play=1 to start playback (the timeline range advances)', found: ([sel]) => `the range stays at ${document.querySelector(sel).value}`,
  });
  const id = await clickSpeciesRow(t, page);
  const d = await expectDialog(t, page, `after clicking the "${id}" row`);
  t.expect(d.modal, 'the species dialog to carry aria-modal="true"', `${d.what} has no aria-modal="true"`);
  t.expect(d.name, 'the species dialog to have an accessible name (aria-labelledby or aria-label)', `${d.what} has none`);
  await t.until(page, () => window.__smoke.dialogs()[0]?.focusInside === true, null, {
    timeout: 2000, expected: 'keyboard focus to move into the dialog', found: () => `focus is on ${window.__smoke.describe(document.activeElement)}`,
  });
  await expectStill(t, page, 'opening the dialog to pause the clock', { speed: 4 });

  await page.keyboard.press('Escape');
  await t.until(page, () => window.__smoke.dialogs().length === 0, null, {
    timeout: 3000, expected: 'Escape to close the dialog', found: () => window.__smoke.dialogReport(),
  });
  await t.until(page, (want) => {
    const row = document.activeElement?.closest?.('#sidebar [data-id]');
    return !!row && row.dataset.id === want;
  }, id, {
    timeout: 2000, expected: `focus to return to the "${id}" row`, found: () => `focus is on ${window.__smoke.describe(document.activeElement)}`,
  });
  await expectStill(t, page, 'the clock to stay paused after the dialog closes', { speed: 4 });
  t.note(`row "${id}" -> ${d.what} "${d.name}"`);
});

check('species.escape-after-click', 'Escape still closes the species dialog after a click on its text (when focus may have dropped out of it)', async (t) => {
  const facts = await t.facts();
  const page = await t.open(`?t=${facts.quietMa}`);
  const id = await clickSpeciesRow(t, page);
  await expectDialog(t, page, `after clicking the "${id}" row`);
  // Aim at plain text inside the dialog: a heading or paragraph that is not part of any control.
  const spot = await page.evaluate(() => {
    const S = window.__smoke;
    const dialog = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(S.shown);
    const controls = 'a[href], button, input, select, textarea, summary, [tabindex], [role="button"], [role="tab"], [role="link"]';
    for (const el of dialog.querySelectorAll('h1, h2, h3, h4, p, li, dd, div, span')) {
      const host = el.closest(controls);
      if ((host && host !== dialog) || el.querySelector(controls)) continue;
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 2);
      if (!ownText || !S.shown(el)) continue;
      const r = el.getBoundingClientRect();
      const x = r.left + Math.min(r.width / 2, 30);
      const y = r.top + r.height / 2;
      if (r.width < 12 || r.height < 8 || !el.contains(document.elementFromPoint(x, y))) continue;
      return { x, y, what: S.describe(el) };
    }
    return null;
  });
  if (!spot) t.skip('found no plain text inside the dialog to click on');
  await page.mouse.click(spot.x, spot.y);
  const focus = await page.evaluate(() => window.__smoke.describe(document.activeElement));
  await page.keyboard.press('Escape');
  await t.until(page, () => window.__smoke.dialogs().length === 0, null, {
    timeout: 3000,
    expected: `Escape to close the dialog after a click on its text (${spot.what})`,
    found: () => `the dialog is still open; focus is on ${window.__smoke.describe(document.activeElement)}, so neither the dialog's own key handler nor the global shortcuts (which defer to an open modal) act on Escape`
      + ' — a native <dialog> opened with showModal(), or tabindex="-1" on the dialog box so a click keeps focus inside it, keeps Escape working',
  });
  t.note(`after the click focus was on ${focus}`);
});

check('species.capture-modal', "__capture.openSpeciesModal('trilobite') shows the dialog in capture mode and pauses the clock", async (t) => {
  const facts = await t.facts();
  t.expect(!facts.species.error, 'js/data/species.js to export `species`', facts.species.error);
  const id = facts.species.trilobite ? 'trilobite' : facts.species.fallbackId;
  const name = facts.species.trilobite || facts.species.fallbackName;
  if (!facts.species.trilobite) t.note(`no species with id "trilobite" in the data; using "${id}"`);
  const page = await t.capture(`t=${facts.quietMa}&play=1`);
  await t.until(page, () => window.__capture.state().playing === true, null, {
    timeout: 3000, expected: '?play=1 -> state().playing === true', found: () => `playing = ${window.__capture.state().playing}`,
  });
  await page.evaluate((speciesId) => window.__capture.openSpeciesModal(speciesId), id);
  await t.until(page, () => window.__smoke.dialogs().length > 0, null, {
    timeout: 3000,
    expected: `a visible role="dialog" in capture mode after __capture.openSpeciesModal("${id}")`,
    found: () => window.__smoke.dialogReport(),
  });
  const d = (await page.evaluate(() => window.__smoke.dialogs()))[0];
  t.expect(d.text.toLowerCase().includes(name.toLowerCase()), `the dialog to show "${name}"`, `it reads "${d.text.slice(0, 120)}"`);
  const s = await state(page);
  t.expect(s.playing === false, 'opening the dialog to pause the clock (state().playing === false)', `playing = ${s.playing}`);
  await page.evaluate(() => window.__capture.closeSpeciesModal());
  await t.until(page, () => window.__smoke.dialogs().length === 0, null, {
    timeout: 3000, expected: '__capture.closeSpeciesModal() to hide the dialog', found: () => window.__smoke.dialogReport(),
  });
});

// ---------------------------------------------------------------------------------------------
// keyboard
// ---------------------------------------------------------------------------------------------

check('keyboard.space', 'Space toggles play — but not while a button has focus, where it must activate the button instead', async (t) => {
  const facts = await t.facts();
  const page = await t.capture(`t=${facts.quietMa}`);
  const playing = async () => (await state(page)).playing;
  await page.keyboard.press('Space');
  t.expect((await playing()) === true, 'Space to start playback', `playing = ${await playing()}${await keyboardBlockers(page)}`);
  await page.keyboard.press('Space');
  t.expect((await playing()) === false, 'Space again to pause', `playing = ${await playing()}`);

  // Any focused button will do; a probe button keeps this independent of component markup.
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.id = 'smoke-probe-button';
    b.type = 'button';
    b.textContent = 'probe';
    b.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647';
    b.addEventListener('click', () => { b.dataset.clicks = String(Number(b.dataset.clicks || 0) + 1); });
    document.body.appendChild(b);
    b.focus();
  });
  await page.keyboard.press('Space');
  const probe = await page.evaluate(() => ({ clicks: Number(document.getElementById('smoke-probe-button').dataset.clicks || 0), focused: document.activeElement?.id }));
  t.expect((await playing()) === false, 'Space on a focused button NOT to toggle play', 'playback started');
  t.expect(probe.clicks === 1, 'Space on a focused button to activate that button once', `the button received ${plural(probe.clicks, 'click')}`);
});

check('keyboard.space-continues-hold', 'Space during an extinction hold continues the story instead of pausing', async (t) => {
  const facts = await t.facts();
  const ev = validEvents(t, facts)[0];
  const page = await t.capture('hold=30');
  await page.evaluate((ma) => {
    const c = window.__capture;
    c.setTime(ma);
    c.play();
  }, ev.beforeMa);
  await t.until(page, () => window.__capture.state().holding === true, null, {
    timeout: 8000, expected: `a hold on ${ev.id}`, found: () => JSON.stringify(window.__capture.state()),
  });
  await page.keyboard.press('Space');
  const s = await state(page);
  t.expect(s.holding === false && s.playing === true, 'Space to end the hold and keep playing', `holding = ${s.holding}, playing = ${s.playing}`);
});

check('keyboard.arrows', 'Arrow keys step time: Right toward the present, Left toward the past, Shift five times further', async (t) => {
  const facts = await t.facts();
  const page = await t.capture(`t=${facts.quietMa}`);
  const at = async () => (await state(page)).timeMa;
  const t0 = await at();
  await page.keyboard.press('ArrowRight');
  const t1 = await at();
  t.expect(t1 < t0, 'ArrowRight to move toward the present (smaller Ma)', `${t0} -> ${t1} Ma${await keyboardBlockers(page)}`);
  await page.keyboard.press('ArrowLeft');
  const t2 = await at();
  t.expect(t2 > t1, 'ArrowLeft to move toward the past (larger Ma)', `${t1} -> ${t2} Ma`);
  t.expect(Math.abs(t2 - t0) < Math.abs(t0 - t1) * 0.05 + 1e-6, 'ArrowLeft to undo ArrowRight', `started at ${t0}, back at ${t2} Ma`);
  await page.keyboard.press('Shift+ArrowRight');
  const t3 = await at();
  t.expect(t2 - t3 > (t0 - t1) * 2, 'Shift+ArrowRight to step further than ArrowRight', `plain step ${(t0 - t1).toFixed(3)} Ma, Shift step ${(t2 - t3).toFixed(3)} Ma`);
  t.expect((await state(page)).playing === false, 'stepping not to start playback', 'playing = true');
});

check('keyboard.range-arrows', 'the timeline range steps with the arrow keys and the clock follows it', async (t) => {
  const facts = await t.facts();
  const page = await t.open(`?t=${facts.quietMa}`);
  const r0 = await readRange(page);
  t.expect(r0, `the real UI to have ${RANGE}`, 'no range input in #timeline');
  await page.focus(RANGE);
  // A paused app never rewrites the thumb, so a moved thumb proves nothing by itself: the clock
  // must follow, and the range's value text is written from the clock.
  const step = async (key, before) => {
    for (let i = 0; i < 3; i++) await page.keyboard.press(key);
    await t.until(page, ([sel, old]) => (document.querySelector(sel).getAttribute('aria-valuetext') || '') !== old, [RANGE, before.valuetext, before.value], {
      timeout: 2000,
      expected: `${key} x3 on the focused range to move the clock (its aria-valuetext to change from "${before.valuetext}")`,
      found: ([sel, old, from]) => `aria-valuetext is still "${old}" although the thumb went from ${from} to ${document.querySelector(sel).value}`,
    });
    await page.evaluate(() => window.__smoke.frames(4));       // the app re-syncs the thumb from the clock
    return readRange(page);
  };
  const r1 = await step('ArrowRight', r0);
  t.expect(r1.value > r0.value, 'ArrowRight on the focused range to move the clock toward the present', `value ${r0.value} -> ${r1.value} ("${r0.valuetext}" -> "${r1.valuetext}")`);
  const r2 = await step('ArrowLeft', r1);
  t.expect(r2.value < r1.value, 'ArrowLeft on the focused range to move the clock back toward the past', `value ${r1.value} -> ${r2.value} ("${r1.valuetext}" -> "${r2.valuetext}")`);
  t.note(`"${r0.valuetext}" -> "${r1.valuetext}" -> "${r2.valuetext}"`);
});

check('keyboard.views', 'keys 1 / 2 / 3 switch to Map / Globe / Tree', async (t) => {
  const facts = await t.facts();
  const globe = await t.hasGlobe();
  const page = await t.capture(`t=${facts.quietMa}`);
  for (const [key, view] of [...(globe ? [['2', 'globe']] : []), ['3', 'tree'], ['1', 'map']]) {
    await page.keyboard.press(key);
    await t.until(page, (want) => window.__capture.state().view === want && document.getElementById('app').dataset.view === want, view, {
      timeout: 10000, expected: `key "${key}" -> state().view === "${view}"`, found: () => `state().view = "${window.__capture.state().view}"${window.__smoke.keyboardBlockers()}`,
    });
  }
});

/** state() fields a stray shortcut would change. */
const footprint = (s) => JSON.stringify({ timeMa: s.timeMa, playing: s.playing, view: s.view, layers: s.layers, speed: s.speed });

check('keyboard.inert-in-dialog', 'shortcuts are inert while a modal dialog is open, and work again once it closes', async (t) => {
  const facts = await t.facts();
  t.expect(!facts.species.error, 'js/data/species.js to export `species`', facts.species.error);
  const id = facts.species.trilobite ? 'trilobite' : facts.species.fallbackId;
  const page = await t.capture(`t=${facts.quietMa}`);
  await page.evaluate((speciesId) => window.__capture.openSpeciesModal(speciesId), id);
  await t.until(page, () => window.__smoke.dialogs().some((d) => d.modal), null, {
    timeout: 3000, expected: `a visible modal dialog after __capture.openSpeciesModal("${id}")`, found: () => window.__smoke.dialogReport(),
  });
  const before = footprint(await state(page));
  // Keys that do not activate whatever control has focus inside the dialog.
  for (const key of ['3', 'ArrowRight', 'p', 'l', 'End', '+']) await page.keyboard.press(key);
  await page.evaluate(() => window.__smoke.frames(4));
  const during = footprint(await state(page));
  t.expect(during === before, 'keys 3, ArrowRight, P, L, End and + to do nothing behind an open dialog', `state() went from ${before} to ${during}`);
  t.expect((await page.evaluate(() => window.__smoke.dialogs().length)) > 0, 'the dialog to stay open', 'it closed');

  await page.keyboard.press('Escape');
  await t.until(page, () => window.__smoke.dialogs().length === 0, null, {
    timeout: 3000, expected: 'Escape to close the dialog', found: () => window.__smoke.dialogReport(),
  });
  // A closing animation may keep the dialog around for a moment: give the keyboard a second to come back.
  let plates = false;
  for (let attempt = 0; attempt < 5 && !plates; attempt++) {
    await page.keyboard.press('p');
    plates = (await state(page)).layers.plates;
    if (!plates) await page.evaluate(() => window.__smoke.frames(12));
  }
  t.expect(plates === true, 'P to toggle plates again once the dialog is closed', `layers.plates stays false after 5 presses${await keyboardBlockers(page)}`);
});

check('keyboard.inert-in-input', 'shortcuts are inert while a text input has focus, and the input gets the keys', async (t) => {
  const facts = await t.facts();
  const page = await t.capture(`t=${facts.quietMa}`);
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'smoke-probe-input';
    input.type = 'text';
    input.setAttribute('aria-label', 'smoke-test probe');
    input.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647';
    document.body.appendChild(input);
    input.focus();
  });
  const before = footprint(await state(page));
  for (const key of ['p', '3', 'Space', 'ArrowRight', 'l', 'g']) await page.keyboard.press(key);
  await page.evaluate(() => window.__smoke.frames(4));
  const during = footprint(await state(page));
  const typed = await page.evaluate(() => document.getElementById('smoke-probe-input').value);
  t.expect(during === before, 'typing "p3 lg" and ArrowRight in a text input to leave the app alone', `state() went from ${before} to ${during}`);
  t.expect(typed === 'p3 lg', 'the input to receive the typed characters "p3 lg"', `it holds ${JSON.stringify(typed)}`);
  const panels = await page.evaluate(() => document.getElementById('btn-legend').getAttribute('aria-expanded'));
  t.expect(panels === 'false', 'G typed in an input not to open the legend', `#btn-legend[aria-expanded="${panels}"]`);
});

// ---------------------------------------------------------------------------------------------
// a11y basics
// ---------------------------------------------------------------------------------------------

/** Open the real UI with the toolbar panels (and, when possible, a species dialog) on screen, to audit more DOM. */
async function openForAudit(t, view = 'map') {
  const facts = await t.facts();
  const page = await t.open(`?t=${facts.quietMa}${view === 'map' ? '' : `&view=${view}`}`);
  await t.until(page, (want) => document.getElementById('app').dataset.view === want, view, {
    timeout: 25000, expected: `#app[data-view="${view}"]`, found: () => `data-view = ${document.getElementById('app').dataset.view}`,
  });
  // Best effort from here on: the audit is about whatever DOM ends up on the page.
  await page.click('#btn-legend', { timeout: 2000 * t.run.slow }).catch(() => {});
  await page.click('#btn-chapters', { timeout: 2000 * t.run.slow }).catch(() => {});
  const row = (await page.evaluateHandle((sel) => [...document.querySelectorAll(sel)].find((el) => window.__smoke.shown(el)) || null, ROW)).asElement();
  if (row) {
    await row.click({ timeout: 3000 * t.run.slow }).catch(() => {});
    await page.waitForFunction(() => window.__smoke.dialogs().length > 0, null, { timeout: 1500 * t.run.slow }).catch(() => {});
  }
  await page.evaluate(() => window.__smoke.frames(2));
  return page;
}

check('a11y.names', 'every button, link and form control has an accessible name', async (t) => {
  const page = await openForAudit(t);
  const r = await page.evaluate(() => {
    const S = window.__smoke;
    // Only what assistive technology can reach: a control that is not rendered needs no name yet.
    const controls = [...document.querySelectorAll('button, [role="button"], a[href], select, textarea, input:not([type="hidden"]), summary, [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="slider"], [role="menuitem"]')]
      .filter(S.exposed);
    return { total: controls.length, unnamed: controls.filter((el) => !S.accName(el)).map(S.describe) };
  });
  t.note(`${r.total} rendered controls audited`);
  t.expect(r.unnamed.length === 0, 'an accessible name (text, aria-label, aria-labelledby, <label> or title) on every control',
    `${plural(r.unnamed.length, 'unnamed control')}: ${[...new Set(r.unnamed)].slice(0, 8).join(', ')}`);
});

check('a11y.range', 'the timeline range has a label and an aria-valuetext that follows time', async (t) => {
  const facts = await t.facts();
  const page = await t.open(`?t=${facts.quietMa}`);
  const r0 = await readRange(page);
  t.expect(r0, `the real UI to have ${RANGE}`, 'no range input in #timeline');
  t.expect(r0.name, 'the range to have an accessible name (aria-label)', 'it has none');
  t.expect(r0.valuetext.trim(), 'the range to have a non-empty aria-valuetext', 'aria-valuetext is empty or missing');
  // End on a focused range is native: it jumps to the present without going through the app's shortcuts.
  await page.focus(RANGE);
  await page.keyboard.press('End');
  await t.until(page, ([sel, old]) => {
    const text = document.querySelector(sel).getAttribute('aria-valuetext') || '';
    return text.trim() !== '' && text !== old;
  }, [RANGE, r0.valuetext], {
    timeout: 3000,
    expected: `aria-valuetext to change from "${r0.valuetext}" after jumping to the present`,
    found: ([sel]) => `aria-valuetext = "${document.querySelector(sel).getAttribute('aria-valuetext')}", value = ${document.querySelector(sel).value}`,
  });
  const r1 = await readRange(page);
  t.note(`"${r0.valuetext}" -> "${r1.valuetext}"`);
});

check('a11y.structure', 'exactly one h1, a live region, and no tabindex above 0', async (t) => {
  const page = await openForAudit(t);
  const r = await page.evaluate(() => {
    const S = window.__smoke;
    const live = document.getElementById('live-region');
    return {
      h1: document.querySelectorAll('h1').length,
      live: live ? { value: live.getAttribute('aria-live'), display: getComputedStyle(live).display } : null,
      positive: [...document.querySelectorAll('[tabindex]')].filter((el) => Number(el.getAttribute('tabindex')) > 0).map((el) => `${S.describe(el)} tabindex=${el.getAttribute('tabindex')}`),
    };
  });
  t.expect(r.h1 === 1, 'exactly one <h1>', `${r.h1}`);
  t.expect(r.live && /^(polite|assertive)$/.test(r.live.value || '') && r.live.display !== 'none',
    '#live-region with aria-live="polite", rendered (display:none silences it)', r.live ? `aria-live = ${JSON.stringify(r.live.value)}, display = ${r.live.display}` : '#live-region is missing');
  t.expect(r.positive.length === 0, 'no element with tabindex > 0 (it hijacks the tab order)', r.positive.slice(0, 6).join(', '));
});

check('a11y.images', 'every image and canvas has a text alternative or is hidden from assistive technology (in each view)', async (t) => {
  const globe = await t.hasGlobe();
  // Each renderer's canvas is only rendered, and so only in the accessibility tree, in its own view.
  const bad = [];
  let total = 0;
  for (const view of ['map', ...(globe ? ['globe'] : []), 'tree']) {
    const page = await openForAudit(t, view);
    const r = await auditImages(page);
    total += r.total;
    for (const what of r.bad) bad.push(`${what} [${view}]`);
    if (!r.bad.length) await page.close();      // keep the failing pages open for the screenshots
  }
  t.note(`${total} rendered images/canvases audited across the views`);
  const counts = new Map();
  for (const what of bad) counts.set(what, (counts.get(what) || 0) + 1);
  t.expect(bad.length === 0, 'aria-label / alt / <title> on every rendered <img>, <canvas>, <svg> and role="img", or aria-hidden="true" when decorative',
    `${plural(bad.length, 'unlabelled element')}: ${[...counts].slice(0, 8).map(([what, n]) => (n > 1 ? `${what} x${n}` : what)).join(', ')}`);
});

/** Unlabelled images in the page as it stands: { total, bad: [description] }. */
function auditImages(page) {
  return page.evaluate(() => {
    const S = window.__smoke;
    const exempt = (el) => !!el.closest('[aria-hidden="true"], [role="presentation"], [role="none"]');
    const named = (el) => !!S.labelOf(el);
    const inNamedImage = (el) => {
      const host = el.parentElement && el.parentElement.closest('[role="img"]');
      return !!host && named(host);
    };
    const inNamedControl = (el) => {
      const host = el.closest('button, a[href], [role="button"], [role="tab"], label, summary');
      return !!host && !!S.accName(host);
    };
    const bad = [];
    let total = 0;
    for (const el of document.querySelectorAll('img, canvas, svg, [role="img"]')) {
      if (el.ownerSVGElement) continue;                        // nested <svg>: judged with its root
      if (!S.exposed(el) && !exempt(el)) continue;             // not rendered: not in the accessibility tree yet
      total++;
      if (exempt(el)) continue;
      let ok;
      if (el.tagName === 'IMG') ok = el.hasAttribute('alt') || named(el);            // alt="" marks it decorative
      else if (el.tagName === 'CANVAS') ok = named(el) || inNamedImage(el) || el.textContent.trim().length > 0;
      else if (el.tagName.toLowerCase() === 'svg') ok = named(el) || !!el.querySelector(':scope > title') || inNamedImage(el) || inNamedControl(el);
      else ok = named(el);
      if (!ok) bad.push(S.describe(el));
    }
    return { total, bad };
  });
}

check('a11y.references', 'ids used by aria-labelledby, aria-controls, aria-describedby and <label for> exist exactly once', async (t) => {
  const page = await openForAudit(t);
  const r = await page.evaluate(() => {
    const S = window.__smoke;
    const naming = [];      // a dangling reference here leaves a control or region without its name
    const other = [];
    const doubled = new Set();
    const look = (el, attr, list) => {
      for (const id of (el.getAttribute(attr) || '').split(/\s+/).filter(Boolean)) {
        const n = document.querySelectorAll(`[id="${CSS.escape(id)}"]`).length;
        if (n === 0) list.push(`${S.describe(el)} ${attr}="${id}"`);
        else if (n > 1) doubled.add(`#${id} x${n}`);
      }
    };
    for (const el of document.querySelectorAll('[aria-labelledby]')) look(el, 'aria-labelledby', naming);
    for (const el of document.querySelectorAll('label[for]')) look(el, 'for', naming);
    for (const el of document.querySelectorAll('[aria-controls]')) look(el, 'aria-controls', other);
    for (const el of document.querySelectorAll('[aria-describedby]')) look(el, 'aria-describedby', other);
    return { naming, other, doubled: [...doubled] };
  });
  if (r.other.length) t.note(`references to elements not in the DOM right now: ${r.other.slice(0, 5).join(', ')}`);
  t.expect(r.naming.length === 0 && r.doubled.length === 0, 'every aria-labelledby / <label for> target to exist, and no referenced id to be duplicated',
    [r.naming.length ? `dangling: ${r.naming.slice(0, 6).join(', ')}` : '', r.doubled.length ? `duplicated ids: ${r.doubled.slice(0, 6).join(', ')}` : ''].filter(Boolean).join('; '));
});

// ---------------------------------------------------------------------------------------------
// motion
// ---------------------------------------------------------------------------------------------

check('motion.reduced', 'with prefers-reduced-motion, <html data-motion="reduced"> is set and #viz-stage never moves during an extinction', async (t) => {
  const facts = await t.facts();
  const events = validEvents(t, facts);
  const ev = events.reduce((a, b) => (b.severity > a.severity ? b : a));   // the hardest shake
  const page = await t.capture(`hold=${HOLD_SECONDS}`, { reducedMotion: 'reduce' });
  const motion = await page.evaluate(() => document.documentElement.dataset.motion);
  t.expect(motion === 'reduced', '<html data-motion="reduced"> under prefers-reduced-motion: reduce', `data-motion = ${JSON.stringify(motion)}`);
  const r = await page.evaluate(watchExtinction, {
    beforeMa: ev.beforeMa, endMa: ev.endMa, skip: false, tailMs: 900,
    enterLimitMs: 8000 * t.run.slow, holdLimitMs: (HOLD_SECONDS * 1000 + 5000) * t.run.slow,
  });
  t.expect(r.entered, `the clock to hold on ${ev.id} so the stage can be watched`, `no hold (timeMa = ${r.lastMa}, playing = ${r.playing})`);
  t.expect(r.stageMoves === 0, `#viz-stage to keep transform: none through the hold, the window and the aftermath of ${ev.id}`,
    `a transform on ${r.stageMoves} of ${plural(r.frames, 'frame')}, e.g. ${r.stageExample}`);
  if (t.run.shakeSeen !== null) t.note(`without the preference the stage ${t.run.shakeSeen ? 'does shake (seen in extinctions.hold)' : 'did not move either'}`);

  // The preference is live: switching it off must flip the attribute back.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await t.until(page, () => document.documentElement.dataset.motion === 'full', null, {
    timeout: 3000, expected: '<html data-motion="full"> once the preference is switched off', found: () => `data-motion = "${document.documentElement.dataset.motion}"`,
  });
});

// ---------------------------------------------------------------------------------------------
// data
// ---------------------------------------------------------------------------------------------

function startValidator() {
  if (!existsSync(VALIDATOR)) return Promise.resolve({ missing: true });
  return new Promise((done) => {
    const proc = spawn(process.execPath, ['../validate-data.mjs', '--quiet'], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => proc.kill(), 120000);
    proc.stdout.on('data', (d) => { out += d; });
    proc.stderr.on('data', (d) => { err += d; });
    proc.on('error', (e) => { clearTimeout(timer); done({ crashed: e.message }); });
    proc.on('close', (code) => { clearTimeout(timer); done({ code, out, err }); });
  });
}

check('data.validator', 'the data files on disk pass scripts/validate-data.mjs (errors fail, warnings are reported)', { timeoutMs: 130000 }, async (t) => {
  const r = await (t.run.validator ?? startValidator());
  if (r.missing) t.skip(`${VALIDATOR} does not exist`);
  t.expect(!r.crashed, 'node ../validate-data.mjs --quiet to run', r.crashed);
  const lines = r.out.split('\n').map((l) => l.trim());
  const errorLines = lines.filter((l) => /^ERROR\b/i.test(l));
  const summary = [...r.out.matchAll(/(\d+) errors?, (\d+) warnings?/gi)].pop();
  if (!summary) {
    // No summary line (it crashed, or its output format changed): its exit code decides.
    t.expect(r.code === 0, 'the validator to exit 0 (it exits 1 on any error)',
      `exit code ${r.code} and no "N errors, M warnings" line: ${brief(errorLines.join(' | ') || r.err || r.out.slice(-400) || 'no output')}`);
    t.note(`exit code 0, but no "N errors, M warnings" summary line to report counts from`);
    return;
  }
  const errors = Number(summary[1]);
  const warnings = Number(summary[2]);
  t.note(`validated ${resolve(__dirname, '..', '..')}: ${plural(errors, 'error')}, ${plural(warnings, 'warning')}`);
  for (const line of lines.filter((l) => /^warn\b/i.test(l)).slice(0, 3)) t.note(line);
  if (warnings > 3) t.note(`… and ${warnings - 3} more warnings (node ../validate-data.mjs --quiet lists them)`);
  t.expect(errors === 0 && r.code === 0, '0 errors (and exit code 0)',
    errors ? `${plural(errors, 'error')}: ${errorLines.slice(0, 6).join(' | ')}` : `0 errors reported, but exit code ${r.code}: ${brief(r.err || r.out.slice(-400))}`);
});

// ---------------------------------------------------------------------------------------------
// performance (informational)
// ---------------------------------------------------------------------------------------------

for (const view of ['map', 'globe', 'tree']) {
  check(`performance.${view}`, `frame time over ${PERF_SECONDS} s of playback from 100 Ma in the ${view} view`, { info: true }, async (t) => {
    if (view === 'globe') await t.needGlobe();
    const page = await t.open(`?t=100&play=1${view === 'map' ? '' : `&view=${view}`}`, { frameProbe: true });
    await t.until(page, (want) => document.getElementById('app').dataset.view === want, view, {
      timeout: 25000, expected: `#app[data-view="${view}"]`, found: () => `data-view = ${document.getElementById('app').dataset.view}`,
    });
    const m = await page.evaluate(async (durationMs) => {
      const S = window.__smoke;
      const range = S.range();
      await S.frames(10);                       // let the view settle after loading
      const gaps = [];
      const work = [];
      let last = null;
      const t0 = performance.now();
      await S.eachFrame((ts) => {
        if (last !== null) gaps.push(ts - last);
        last = ts;
        work.push(performance.now() - globalThis.__smokeFrameStart);   // the frame's callbacks: all of the app's work
        return performance.now() - t0 >= durationMs ? true : undefined;
      });
      const stats = (list) => {
        const sorted = [...list].sort((a, b) => a - b);
        return {
          avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
          p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
          max: sorted[sorted.length - 1],
        };
      };
      const after = S.range();
      return { frames: gaps.length, gap: stats(gaps), work: stats(work), advanced: range && after ? after.value > range.value : null };
    }, PERF_SECONDS * 1000);
    t.note(`frame time avg ${m.gap.avg.toFixed(1)} ms (${Math.round(1000 / m.gap.avg)} fps), p95 ${m.gap.p95.toFixed(1)} ms, worst ${m.gap.max.toFixed(0)} ms over ${m.frames} frames`);
    t.note(`the app's script time per frame: avg ${m.work.avg.toFixed(1)} ms, p95 ${m.work.p95.toFixed(1)} ms, worst ${m.work.max.toFixed(0)} ms`);
    if (m.advanced === false) t.note('warning: the timeline did not advance while measuring — ?play=1 may not have started playback');
  });
}

// ---------------------------------------------------------------------------------------------
// Runner and report
// ---------------------------------------------------------------------------------------------

function selectChecks(only) {
  if (!only) return checks;
  const wanted = only.map((name) => {
    const [group, ...rest] = name.split('.');
    return [GROUP_ALIASES[group] || group, ...rest].join('.');
  });
  const unknown = wanted.filter((name) => !checks.some((c) => c.group === name || c.id === name));
  if (unknown.length) {
    console.error(`Unknown check or group: ${unknown.join(', ')}\nGroups: ${GROUPS.map(([g]) => g).join(', ')}. Use --list for the checks.`);
    process.exit(2);
  }
  return checks.filter((c) => wanted.includes(c.group) || wanted.includes(c.id));
}

function printCatalogue() {
  const width = Math.max(...checks.map((c) => c.id.length));
  for (const [group, title] of GROUPS) {
    console.log(`\n${title}`);
    for (const c of checks.filter((x) => x.group === group)) console.log(`  ${c.id.padEnd(width)}  ${c.purpose}`);
  }
  console.log(`\n${checks.length} checks. Run a subset by group and/or check id, e.g. --only=time,views.non-blank`);
}

async function ensureServerUp(baseUrl) {
  try {
    const res = await fetch(baseUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    throw new Error(
      `The app is not reachable at ${baseUrl}: ${e.cause?.code || e.message}\n`
      + 'From the project root, run: python3 -m http.server 8080   (or pass --base-url=…)',
    );
  }
}

/**
 * A same-origin JavaScript module answered 404 and nothing complained about it (no console error
 * or exception names it): the app imported it optionally and survived. Anything else is a failure.
 */
function optionalModule(p, all, run) {
  if (p.kind !== 'failed request' || p.status !== 404 || p.type !== 'script' || !p.url) return false;
  let path;
  try {
    const u = new URL(p.url);
    if (u.origin !== run.origin || !/\.m?js$/.test(u.pathname)) return false;
    path = u.pathname;
  } catch {
    return false;
  }
  const file = path.split('/').pop();
  return !all.some((q) => q !== p && q.kind !== 'failed request' && (q.text.includes(path) || q.text.includes(file)));
}

function withTimeout(promise, limitMs, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Failure(`${what} to finish within ${limitMs / 1000} s`, 'it was still running — the page may have stopped animating')), limitMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function runCheck(run, def) {
  const t = new CheckContext(run, def);
  const started = Date.now();
  const result = { id: def.id, group: def.group, name: def.name, purpose: def.purpose, status: 'pass' };

  const body = Promise.resolve().then(() => def.fn(t));
  body.catch(() => {});             // a timed-out body may reject later, when its pages close
  try {
    await withTimeout(body, def.timeoutMs * run.slow, `check ${def.id}`);
    if (def.info) result.status = 'info';
  } catch (err) {
    if (err instanceof Skip) {
      result.status = 'skip';
      result.reason = err.message;
    } else if (def.info) {
      result.status = 'info';
      t.note(`could not measure: ${err instanceof Failure ? `expected ${err.expected}; found ${err.found}` : explain(err)}`);
    } else if (err instanceof Failure) {
      result.status = 'fail';
      result.expected = err.expected;
      result.found = err.found;
    } else {
      result.status = 'fail';
      result.expected = 'the check to run to completion';
      result.found = explain(err);
    }
  }

  // Let console events that are still in flight land before judging the console.
  for (const page of t.pages) if (!page.isClosed()) await page.evaluate(() => 0).catch(() => {});
  const problems = [];
  const seen = new Set();
  for (const [index, p] of t.problems.entries()) {
    const key = `${p.kind}: ${p.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (optionalModule(p, t.problems, run)) {
      // SPEC §4: a module that has not landed yet is feature-detected with import() and the app
      // carries on. Say so once per run instead of failing every check that loads it.
      if (!run.warned.has(key)) {
        run.warned.add(key);
        t.note(`warning — ${new URL(p.url).pathname} is not on the server (HTTP ${p.status}): the app imports it as an optional module and carried on without it; it has to land (or the import go) before release`);
      }
      continue;
    }
    // A strict check re-charges console errors and exceptions; a failed request stays charged once.
    problems.push({ key, firstSeenIn: run.known.get(key), strict: index >= t.strictFrom && p.kind !== 'failed request' });
  }
  if (problems.length) result.console = problems.map((p) => p.key);
  const chargeable = problems.filter((p) => p.strict || !p.firstSeenIn);
  if ((result.status === 'pass' || result.status === 'skip') && chargeable.length) {
    if (result.status === 'skip') t.note(`otherwise this check would have been skipped: ${result.reason}`);
    result.status = 'fail';
    result.expected = 'no console errors, uncaught exceptions or failed requests while the check ran (its own assertions passed)';
    result.found = chargeable.slice(0, 4).map((p) => p.key).join(' | ') + (chargeable.length > 4 ? ` | … ${chargeable.length - 4} more` : '');
  } else {
    for (const p of problems.slice(0, 4)) {
      t.note(p.firstSeenIn && p.firstSeenIn !== def.id ? `${p.key} (already charged to ${p.firstSeenIn})` : p.key);
    }
  }
  // Only a check that ends red pays for an error; an INFO check leaves it for the next one to find.
  if (result.status === 'fail') {
    for (const p of problems) if (!run.known.has(p.key)) run.known.set(p.key, def.id);
  }

  if (result.status === 'fail') {
    const shots = [];
    const open = t.pages.filter((page) => !page.isClosed());
    for (const [i, page] of open.entries()) {
      const file = join(run.screenshotDir(), `${def.id}${open.length > 1 ? `-${i + 1}` : ''}.png`);
      try {
        await page.screenshot({ path: file, timeout: 8000 });
        shots.push(file);
      } catch { /* a crashed or closed page has nothing to show */ }
    }
    if (shots.length) result.screenshots = shots;
  }
  await t.dispose();
  if (t.notes.length) result.notes = t.notes;
  result.durationMs = Date.now() - started;
  return result;
}

function makeReporter(args) {
  const stream = args.json ? process.stderr : process.stdout;
  const colour = !!stream.isTTY && !process.env.NO_COLOR;
  const paint = (code, text) => (colour ? `\x1b[${code}m${text}\x1b[0m` : text);
  const TAG = { pass: paint(32, 'PASS'), fail: paint(31, 'FAIL'), skip: paint(33, 'SKIP'), info: paint(36, 'INFO') };
  const line = (text = '') => stream.write(`${text}\n`);
  const width = Math.max(...checks.map((c) => c.id.length));
  return {
    line,
    group: (title) => line(`\n${paint(1, title)}`),
    result(r) {
      line(`  ${TAG[r.status]}  ${r.id.padEnd(width)}  ${r.purpose}  ${paint(2, `(${ms(r.durationMs)})`)}`);
      const detail = (label, text) => line(`        ${label} ${text}`);
      if (r.status === 'fail') {
        detail('expected:', r.expected);
        detail('found:   ', r.found);
        for (const file of r.screenshots || []) detail('screenshot:', file);
      }
      if (r.status === 'skip') detail('reason:', r.reason);
      for (const note of r.notes || []) detail(paint(2, '·'), paint(2, note));
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.list) {
    printCatalogue();
    return;
  }
  const selected = selectChecks(args.only);
  const report = makeReporter(args);
  const startedAt = new Date();

  try {
    await ensureServerUp(args.baseUrl);
  } catch (err) {
    if (args.json) console.log(JSON.stringify({ ok: false, baseUrl: args.baseUrl, error: err.message, checks: [] }, null, 2));
    console.error(err.message);
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch({ headless: !args.headed, slowMo: args.slow ? 120 : 0, args: LAUNCH_ARGS });
  const run = new Run(args, browser);
  run.context = await run.makeContext();
  // The validator needs no browser: let it work in the background from the start.
  if (selected.some((c) => c.id === 'data.validator')) run.validator = startValidator();

  report.line("Life's Tree Blooms — smoke test");
  report.line(`  app      ${args.baseUrl}`);
  report.line(`  browser  Chromium ${browser.version()}${args.headed ? '' : ' (headless)'}${args.slow ? ', slow motion' : ''}`);
  report.line(`  checks   ${selected.length}${args.only ? ` of ${checks.length} (--only=${args.only.join(',')})` : ''}`);

  const results = [];
  try {
    for (const [group, title] of GROUPS) {
      const inGroup = selected.filter((c) => c.group === group);
      if (!inGroup.length) continue;
      report.group(title);
      for (const def of inGroup) {
        const result = await runCheck(run, def);
        results.push(result);
        report.result(result);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const count = (status) => results.filter((r) => r.status === status).length;
  const warnings = results.flatMap((r) => (r.notes || []).filter((n) => n.startsWith('warning —')).map((text) => ({ check: r.id, text })));
  const summary = { passed: count('pass'), failed: count('fail'), skipped: count('skip'), info: count('info'), warnings: warnings.length };
  const durationMs = Date.now() - startedAt.getTime();
  report.line('');
  report.line(`${summary.failed ? 'FAILED' : 'OK'} — ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped, ${summary.info} informational`
    + `${warnings.length ? `, ${plural(warnings.length, 'warning')}` : ''} in ${(durationMs / 1000).toFixed(1)} s`);
  if (summary.failed) {
    report.line(`  failed: ${results.filter((r) => r.status === 'fail').map((r) => r.id).join(', ')}`);
    if (run.shotDir) report.line(`  screenshots: ${run.shotDir}`);
  }
  if (warnings.length) report.line(`  warnings in: ${[...new Set(warnings.map((w) => w.check))].join(', ')} (see the notes above)`);
  if (args.json) {
    console.log(JSON.stringify({
      ok: summary.failed === 0,
      baseUrl: args.baseUrl,
      browser: `Chromium ${browser.version()}`,
      startedAt: startedAt.toISOString(),
      durationMs,
      summary,
      warnings,
      screenshotDir: run.shotDir,
      checks: results,
    }, null, 2));
  }
  process.exitCode = summary.failed ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
