// Headless capture pipeline.
// Drives the running app via Playwright and writes artifacts under ../../assets/.
//
// Prereqs (one-time):
//   1. The dev server is running:  python3 -m http.server 8080  (from project root)
//   2. ffmpeg is on $PATH:          brew install ffmpeg  (macOS)  /  apt install ffmpeg
//                                   (every clip needs it, also with --no-gif; modals and stills don't)
//   3. npm install                  (Playwright; in this directory)
//      npx playwright install chromium  (the browser build this Playwright drives — npm install
//                                   does not download it)
//
// Usage:
//   node capture.js --all                  # every sequence, modal showcase and still
//   node capture.js cambrian permian       # just the listed sequences
//   node capture.js --modals               # all species-dialog stills   (--modal <id>… for some)
//   node capture.js --stills               # all UI stills incl. the README hero (--still <id>… for some)
//   node capture.js --modal trilobite --seq kpg   # --seq switches back to sequence ids
//   node capture.js --list                 # print the catalog
//   node capture.js --help                 # print this usage
//   node capture.js --base-url=http://localhost:9000 cambrian
//   node capture.js --no-gif               # skip GIF conversion
//   node capture.js --out=/tmp/dry-run --all   # write under another root instead of the project
//   node capture.js --strict --all         # or STRICT=1: stop at the first failure, and treat
//                                          # warnings and page console errors as failures
//
// Exit codes: 0 done · 1 a capture failed, or the server / ffmpeg is missing · 2 bad arguments
// (unknown flag or id, empty value; nothing is captured then).
//
// How clips are recorded: the whole page (canvas AND the DOM overlays — context card, milestone
// toasts, extinction card, sidebar) is captured through the DevTools screencast while the app
// plays in real time, then the frames are assembled by ffmpeg into a constant-frame-rate VP9
// WebM plus a small GIF. Each sequence plays from startMa until the clock reaches endMa (and any
// extinction aftermath crossed on the way has faded), pauses on that frame and lingers tailMs.
//
// Every capture checks its result and fails instead of writing a misleading file: the app must
// boot without an exception, the requested view must be live, a clip must reach endMa, a species
// dialog must be open, and a still that wants an extinction hold must be inside one.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  sequences, findSequence,
  modalShowcases, findModalShowcase,
  stills, findStill,
} from './sequences.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');
// Output root: the project by default; --out=<dir> redirects everything (handy for dry runs).
let OUT_ROOT = PROJECT_ROOT;
const ASSETS = {
  get shots() { return join(OUT_ROOT, 'assets', 'screenshots'); },
  get anims() { return join(OUT_ROOT, 'assets', 'animations'); },
};

// STRICT=1|true|yes|on (or --strict): stop at the first failure; warnings count as failures.
let STRICT = /^(1|true|yes|on)$/i.test(process.env.STRICT || '');

const VIEW_ALIASES = { '2d': 'map', '3d': 'globe', map: 'map', globe: 'globe', tree: 'tree' };
/** 'map' | 'globe' | 'tree' for a view name or legacy alias (any case), else null. */
const viewName = (v) => {
  const key = String(v).toLowerCase();
  return Object.hasOwn(VIEW_ALIASES, key) ? VIEW_ALIASES[key] : null;
};
const PANELS = new Set(['clean', 'sidebar', 'clock', 'full']);
const READY_TIMEOUT_MS = 15000;
// Headless Chromium composites ~100 frames/s; keep at most ~45 of them (the clip is 30 fps).
const MIN_FRAME_GAP_SEC = 1 / 45;

/** A problem the user can fix (arguments, server, ffmpeg): printed without a stack trace. */
class CliError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}
const usageError = (message) => new CliError(message, 2);

// "page.evaluate: Error: __capture.setView: …\n    at …" → "__capture.setView: …"
const clean = (message) => String(message).split('\n')[0].replace(/^(?:page|frame)\.\w+: (?:\w*Error: )?/, '');

const fmtMa = (ma) => (!Number.isFinite(ma) ? String(ma)
  : ma >= 100 ? ma.toFixed(1) : ma >= 1 ? ma.toFixed(2) : String(Number(ma.toPrecision(3))));

/** Print a warning; in strict mode it fails the capture instead. */
function warn(message) {
  console.warn(`  ⚠ ${message}`);
  if (STRICT) throw new Error(message);
}

const USAGE = `Usage: node capture.js [ids…] [options]

  ids…                    clip ids (see --list); --modal / --still switch the id list
  --all                   every clip, species-dialog showcase and interface still
  --seq | --sequences     the ids that follow are clip ids
  --modal <id>…           species-dialog showcases (bare id or modal-<id>)
  --modals [<id>…]        every showcase, or only these
  --still <id>…           interface stills
  --stills [<id>…]        every still, or only these
  --list                  print the catalog and exit
  --no-gif                skip the GIF (clips still need ffmpeg for the WebM)
  --base-url=<url>        where the app is served (default http://localhost:8080)
  --out=<dir>             write under <dir>/assets/ instead of the project (dry runs)
  --strict                stop at the first failure; warnings and page errors fail too (or STRICT=1)
  --help, -h              this help

Exit codes: 0 done · 1 a capture failed, or the server / ffmpeg / browser is missing · 2 bad arguments.
Full reference: scripts/capture/README.md`;

function parseArgs(argv) {
  const args = {
    sequences: [], modals: [], stills: [],
    all: false, list: false, allModals: false, allStills: false,
    baseUrl: 'http://localhost:8080', gif: true,
  };
  let collecting = 'sequences';
  let needsIds = null; // '--modal' / '--still' must be followed by at least one id
  const value = (arg, flag) => {
    const v = arg.slice(flag.length + 1);
    if (!v.trim()) throw usageError(`${flag} needs a value, e.g. ${flag}=…`);
    return v;
  };
  for (const a of argv) {
    if (needsIds && a.startsWith('-')) throw usageError(`${needsIds} needs at least one id (${needsIds}s takes all of them)`);
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--all') args.all = true;
    else if (a === '--list') args.list = true;
    else if (a === '--strict') STRICT = true;
    else if (a === '--no-gif' || a === '--keep-webm-only') args.gif = false;
    else if (a === '--seq' || a === '--sequences') collecting = 'sequences';
    else if (a === '--modals') { args.allModals = true; collecting = 'modals'; }
    else if (a === '--modal') { collecting = 'modals'; needsIds = a; }
    else if (a === '--stills') { args.allStills = true; collecting = 'stills'; }
    else if (a === '--still') { collecting = 'stills'; needsIds = a; }
    else if (a.startsWith('--base-url=')) args.baseUrl = value(a, '--base-url').replace(/\/+$/, '');
    else if (a.startsWith('--out=')) args.out = resolve(value(a, '--out'));
    // A mistyped flag must not fall through: '--output=/tmp/x' would regenerate the project's assets.
    else if (a.startsWith('-')) throw usageError(`Unknown flag: ${a}`);
    // --list prints showcases as 'modal-<id>'; accept that spelling too.
    else { args[collecting].push(collecting === 'modals' ? a.replace(/^modal-/, '') : a); needsIds = null; }
  }
  if (needsIds) throw usageError(`${needsIds} needs at least one id (${needsIds}s takes all of them)`);
  const strayIds = [...args.sequences, ...args.modals, ...args.stills];
  if (args.all && strayIds.length) {
    // A typo next to --all must not silently start a full run.
    throw usageError(`--all captures everything; drop the ids (${strayIds.join(', ')}) or drop --all`);
  }
  try {
    new URL(args.baseUrl);
  } catch {
    throw usageError(`--base-url is not a URL: ${args.baseUrl}`);
  }
  return args;
}

const pad2 = (n) => String(n).padStart(2, '0');

function paths(seq) {
  const stem = `${pad2(seq.order)}-${seq.id}`;
  return {
    png: join(ASSETS.shots, `${stem}.png`),
    webm: join(ASSETS.anims, `${stem}.webm`),
    gif: join(ASSETS.anims, `${stem}.gif`),
  };
}

/** Catch catalogue mistakes before a browser starts (they used to give silent NaN scenes). */
function checkCatalog(seqs, modals, stillList) {
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  const problems = [];
  for (const s of seqs) {
    if (!viewName(s.view)) problems.push(`${s.id}: view must be map, globe or tree`);
    if (!PANELS.has(s.panel)) problems.push(`${s.id}: panel must be clean, sidebar, clock or full`);
    if (!num(s.startMa) || !num(s.endMa)) problems.push(`${s.id}: startMa and endMa must be numbers`);
    if (s.posterMa != null && !num(s.posterMa)) problems.push(`${s.id}: posterMa must be a number`);
  }
  for (const m of modals) {
    if (typeof m.speciesId !== 'string' || !m.speciesId) problems.push(`modal-${m.id}: speciesId is missing`);
    if (!num(m.atMa)) problems.push(`modal-${m.id}: atMa must be a number`);
    if (m.view != null && !viewName(m.view)) problems.push(`modal-${m.id}: view must be map, globe or tree`);
  }
  for (const s of stillList) {
    if (typeof s.out !== 'string' || !s.out) problems.push(`still-${s.id}: out is missing`);
    const t = new URLSearchParams(s.query || '').get('t');
    if (s.inHoldSec != null && (!num(s.inHoldSec) || t == null || !Number.isFinite(Number(t)))) {
      problems.push(`still-${s.id}: inHoldSec needs a number and a ?t= time in the query`);
    }
  }
  if (problems.length) throw new CliError(`sequences.js has problems:\n  ${problems.join('\n  ')}`);
}

async function ensureServerUp(baseUrl) {
  try {
    const res = await fetch(baseUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    throw new CliError(
      `Dev server not reachable at ${baseUrl}: ${e.message}\n` +
      'From the project root, run: python3 -m http.server 8080',
    );
  }
}

/** Fail before recording anything rather than after every clip. */
async function ensureFfmpeg() {
  try {
    await run('ffmpeg', ['-version']);
  } catch (e) {
    throw new CliError(
      `ffmpeg is needed to encode clips (also with --no-gif) but could not be run: ${clean(e.message)}\n` +
      'Install it (brew install ffmpeg / apt install ffmpeg), or capture only --modals and --stills.',
    );
  }
}

function run(cmd, args) {
  return new Promise((resolve_, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('error', (err) => reject(new Error(`${cmd} launch failed: ${err.message}`)));
    proc.on('close', (code) => {
      if (code === 0) resolve_();
      else reject(new Error(`${cmd} exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Print the page's console errors and exceptions as they happen, and remember them. */
function watchPage(page) {
  const health = { exceptions: [], consoleErrors: [] };
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    health.consoleErrors.push(msg.text());
    console.error('  [page error]', msg.text());
  });
  page.on('pageerror', (err) => {
    // Benign: the browser reports deferred ResizeObserver notifications as an error event.
    if (/^ResizeObserver loop/.test(err.message)) return;
    health.exceptions.push(err.message);
    console.error('  [page exception]', err.message);
  });
  page.on('crash', () => health.exceptions.push('the page crashed'));
  return health;
}

/** Throw if the page threw (or, in strict mode, logged a console error). */
function assertHealthy(health) {
  if (health.exceptions.length) throw new Error(`the page threw: ${health.exceptions[0]}`);
  if (STRICT && health.consoleErrors.length) {
    throw new Error(`the page logged ${health.consoleErrors.length} console error(s), first: ${health.consoleErrors[0]}`);
  }
}

/**
 * Wait until the app has booted — in capture mode until it signals ready (after any deep-linked
 * view switch), otherwise until #app shows the view the URL asks for — and fail fast if it can't.
 */
async function waitForApp(page, health, { capture, view = 'map' }) {
  // Importing the page's own entry module again (the same instance — nothing runs twice) resolves
  // once main.js has run, and rejects with the real error when the app failed to boot: a module
  // mid-copy with a syntax error, a throwing constructor…
  await page.evaluate(async () => {
    const entry = document.querySelector('script[type="module"][src]');
    if (entry) await import(entry.src);
  }).catch((err) => {
    throw new Error(`the app failed to boot: ${health.exceptions[0] || clean(err.message)}`);
  });
  const ready = capture
    ? () => globalThis.__captureReady === true
    : (v) => document.getElementById('app')?.dataset.view === v;
  await page.waitForFunction(ready, view, { timeout: READY_TIMEOUT_MS }).catch((err) => {
    if (err.name !== 'TimeoutError') throw err;
    assertHealthy(health);
    throw new Error(capture
      ? `the app did not signal ready within ${READY_TIMEOUT_MS / 1000} s`
      : `the ${view} view did not come up within ${READY_TIMEOUT_MS / 1000} s`);
  });
  assertHealthy(health);
}

const LAUNCH_ARGS = ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'];

/** Put the app into the scene a catalog entry describes (capture mode only). */
async function setScene(page, spec, { label, allowEvent = false } = {}) {
  const want = viewName(spec.view || 'map');
  const st = await page.evaluate(async (s) => {
    const c = window.__capture;
    await c.setView(s.view || 'map'); // rejects when the view cannot come up
    c.setSpeed(s.speed || 1);
    c.setTime(s.startMa ?? s.atMa);
    c.setLayer('plates', !!s.plates);
    c.setLayer('labels', s.labels !== false);
    c.pause();
    return c.state();
  }, spec);
  // Belt and braces for an older page whose setView still resolves on failure.
  if (st.view !== want) throw new Error(`the ${want} view did not come up (still showing ${st.view})`);
  // Scrubbing into a mass-extinction window shows its crisis look (card + vignette).
  if (st.extinctionId && !allowEvent) {
    warn(`${label}: ${fmtMa(st.timeMa)} Ma is inside the ${st.extinctionId} window, so the shot shows its crisis look`);
  }
  // Lazy views (globe, tree) need a moment to load and settle.
  await page.waitForTimeout(want !== 'map' ? 1800 : 500);
}

async function captureSequence(browser, seq, baseUrl, opts) {
  const out = paths(seq);
  console.log(`\n▶ ${pad2(seq.order)} ${seq.id} — ${seq.title} (${seq.view}, ${seq.startMa} → ${seq.endMa} Ma)`);

  const context = await browser.newContext({
    viewport: { width: seq.width, height: seq.height },
    deviceScaleFactor: 1,
  });
  let frameDir = null;
  // Cleared before the frame directory is removed: a late frame must not write into it (ENOENT).
  let recording = false;
  let encodeError = null;
  try {
    frameDir = mkdtempSync(join(tmpdir(), `ltb-${seq.id}-`));
    const page = await context.newPage();
    const health = watchPage(page);

    const holdSec = seq.holdSec ?? 3.5;
    const url = `${baseUrl}/?capture=1&panel=${encodeURIComponent(seq.panel)}&hold=${holdSec}`;
    await page.goto(url, { waitUntil: 'load' });
    await waitForApp(page, health, { capture: true });
    await setScene(page, seq, { label: `${seq.id} start` });

    // Record the composited page through the DevTools screencast.
    const frames = []; // { file, t } — t in seconds since the epoch
    let skipped = null; // newest frame dropped by the rate cap; written if it turns out to be the last
    let frameError = null;
    const store = ({ data, t }) => {
      const file = join(frameDir, `f${String(frames.length).padStart(5, '0')}.jpg`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      frames.push({ file, t });
    };
    const client = await context.newCDPSession(page);
    client.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      client.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      if (!recording) return;
      const t = metadata.timestamp ?? Date.now() / 1000;
      const last = frames[frames.length - 1];
      try {
        if (last && t - last.t < MIN_FRAME_GAP_SEC) {
          skipped = { data, t };
        } else {
          store({ data, t });
          skipped = null;
        }
      } catch (err) {
        frameError = frameError || err;
      }
    });
    recording = true;
    await client.send('Page.startScreencast', { format: 'jpeg', quality: 93, everyNthFrame: 1 });

    const startedAt = Date.now();
    let note = '';
    if (seq.sweep) {
      // Time-lapse: glide evenly along the story axis, one seek per animation frame (no holds;
      // mass-extinction windows are stepped over so their card cannot flash for a frame).
      const ms = (seq.sweepSec ?? 12) * 1000;
      await withTimeout(
        page.evaluate((s) => window.__capture.sweep(s.startMa, s.endMa, s.ms), { startMa: seq.startMa, endMa: seq.endMa, ms }),
        ms + 15000, 'the sweep did not finish',
      );
      await page.waitForTimeout(seq.tailMs ?? 1200);
    } else {
      // Play until endMa (and any extinction aftermath has faded); the page pauses on that frame.
      const maxSec = seq.maxSec ?? 30;
      const result = await withTimeout(
        page.evaluate((s) => window.__capture.playUntil(s.endMa, { timeoutMs: s.ms }), { endMa: seq.endMa, ms: maxSec * 1000 }),
        maxSec * 1000 + 15000, 'the page stopped responding',
      );
      if (result.reason !== 'reached') {
        const why = { timeout: `hit the ${maxSec} s cap (maxSec)`, stopped: 'playback was paused', end: 'the story ended' }[result.reason] || result.reason;
        throw new Error(`stopped at ${fmtMa(result.state.timeMa)} Ma, before reaching ${seq.endMa} Ma: ${why}`);
      }
      note = `, ended at ${fmtMa(result.state.timeMa)} Ma${result.events.length ? ` after ${result.events.join(', ')}` : ''}`;
      if (result.state.extinctionId) warn(`${seq.id}: the clip ends inside the ${result.state.extinctionId} window`);
      await page.waitForTimeout(seq.tailMs ?? 600); // linger on the paused last frame
    }
    const tookSec = (Date.now() - startedAt) / 1000;

    await client.send('Page.stopScreencast');
    const stoppedAt = Date.now() / 1000;
    await page.waitForTimeout(150); // frames already in flight
    recording = false;
    if (skipped) store(skipped); // the final picture, even if it came right after the previous one
    if (frameError) throw new Error(`could not store a screencast frame: ${frameError.message}`);
    assertHealthy(health);
    if (frames.length < 2) throw new Error('Screencast produced no frames');

    // Assemble: an ffconcat list with per-frame durations → constant 30 fps VP9. The last frame
    // lasts until the screencast stopped, so a tail with no repaints keeps its length. ffmpeg
    // gives the repeated last entry the previous entry's duration, so the output is cut at the
    // listed total (-t).
    const lines = ['ffconcat version 1.0'];
    let totalSec = 0;
    for (let i = 0; i < frames.length; i++) {
      const next = frames[i + 1];
      const dur = next ? Math.max(0.001, next.t - frames[i].t) : Math.max(1 / 30, stoppedAt - frames[i].t);
      totalSec += dur;
      lines.push(`file '${frames[i].file}'`, `duration ${dur.toFixed(4)}`);
    }
    lines.push(`file '${frames[frames.length - 1].file}'`);
    const listFile = join(frameDir, 'frames.ffconcat');
    writeFileSync(listFile, lines.join('\n'));
    try {
      await run('ffmpeg', [
        '-y', '-f', 'concat', '-safe', '0', '-i', listFile,
        '-vf', 'fps=30,format=yuv420p',
        '-c:v', 'libvpx-vp9', '-crf', '33', '-b:v', '0', '-row-mt', '1', '-an',
        '-t', totalSec.toFixed(4),
        out.webm,
      ]);
      console.log(`  ✓ ${out.webm}  (${frames.length} frames, ${tookSec.toFixed(1)} s${note})`);
      if (opts.gif) {
        try {
          await run('ffmpeg', [
            '-y', '-i', out.webm,
            '-vf', 'fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
            out.gif,
          ]);
          console.log(`  ✓ ${out.gif}`);
        } catch (err) {
          warn(`GIF conversion skipped: ${clean(err.message)}`);
        }
      }
    } catch (err) {
      encodeError = err; // the poster below needs no ffmpeg, so it is still taken
    }
  } finally {
    recording = false;
    if (frameDir) rmSync(frameDir, { recursive: true, force: true });
    await context.close().catch(() => {});
  }

  // Poster still at 2× in a fresh context so it is crisp and deterministic.
  const posterMa = seq.posterMa ?? (seq.startMa - (seq.startMa - seq.endMa) * (seq.posterAt ?? 0.5));
  await captureFrame(browser, {
    ...seq, atMa: posterMa, out: out.png,
    query: `?capture=1&panel=${encodeURIComponent(seq.panel)}`,
    label: `${seq.id} poster`, inEvent: !!seq.posterInEvent,
  }, baseUrl);
  if (encodeError) throw encodeError;
}

// Page-side: the species dialog reports itself open on this species and is really on screen.
function speciesDialogShown(id) {
  if (window.__capture.state().focusId !== id) return false;
  const root = document.getElementById('species-modal-root');
  const dialog = root && root.querySelector('dialog, [role="dialog"]');
  if (!dialog) return false;
  return dialog.checkVisibility
    ? dialog.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    : dialog.getClientRects().length > 0;
}

/** One still in capture mode at a given time (optionally with a species dialog open). */
async function captureFrame(browser, spec, baseUrl) {
  const context = await browser.newContext({
    viewport: { width: spec.width || 1280, height: spec.height || 720 },
    deviceScaleFactor: 2,
  });
  try {
    const page = await context.newPage();
    const health = watchPage(page);
    await page.goto(`${baseUrl}/${spec.query}`, { waitUntil: 'load' });
    await waitForApp(page, health, { capture: true });
    await setScene(page, { ...spec, startMa: spec.atMa }, { label: spec.label, allowEvent: spec.inEvent });
    if (spec.speciesId) {
      await page.evaluate((id) => window.__capture.openSpeciesModal(id), spec.speciesId);
      await page.waitForFunction(speciesDialogShown, spec.speciesId, { timeout: 5000 }).catch((err) => {
        if (err.name !== 'TimeoutError') throw err;
        throw new Error(`the species dialog for ${spec.speciesId} did not appear`);
      });
      await page.waitForTimeout(600);
    }
    assertHealthy(health);
    await page.screenshot({ path: spec.out });
    console.log(`  ✓ ${spec.out}`);
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Start playback from the still's ?t= and return once the first mass-extinction hold has run for
 * inHoldSec — whatever the event windows and the time scale are at the moment. Uses the app's
 * own event bus ('time:seek', 'clock:hold'), since the real UI has no capture API.
 */
async function playIntoHold(page, still) {
  const ma = Number(new URLSearchParams(still.query).get('t'));
  const timeoutMs = 15000;
  const ok = await withTimeout(page.evaluate(async ({ ma, at, timeoutMs }) => {
    const entry = document.querySelector('script[type="module"][src]');
    const { bus } = await import(new URL('engine/bus.js', entry.src).href);
    return new Promise((resolve) => {
      let holdStart = null;
      let duration = Infinity;
      const off = bus.on('clock:hold', ({ hold }) => {
        holdStart = hold ? performance.now() : null;
        if (hold) duration = hold.duration;
      });
      const t0 = performance.now();
      const check = () => {
        const now = performance.now();
        // Shoot inside the hold even if it is shorter than asked.
        if (holdStart != null && (now - holdStart) / 1000 >= Math.min(at, duration - 0.5)) {
          off();
          resolve(true);
        } else if (now - t0 > timeoutMs) {
          off();
          resolve(false);
        } else {
          requestAnimationFrame(check);
        }
      };
      bus.emit('time:seek', { ma, play: true });
      requestAnimationFrame(check);
    });
  }, { ma, at: still.inHoldSec, timeoutMs }), timeoutMs + 10000, 'the page stopped responding');
  if (!ok) {
    throw new Error(`no mass-extinction hold lasted ${still.inHoldSec} s within ${timeoutMs / 1000} s of playing from ${ma} Ma`);
  }
}

/** One still of the REAL UI (no capture mode) from a deep link. */
async function captureStill(browser, still, baseUrl) {
  const out = join(OUT_ROOT, still.out);
  mkdirSync(dirname(out), { recursive: true });
  console.log(`\n■ still — ${still.id} (${still.query || '/'})`);
  const context = await browser.newContext({
    viewport: { width: still.width || 1512, height: still.height || 860 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
  });
  try {
    const page = await context.newPage();
    const health = watchPage(page);
    await page.goto(`${baseUrl}/${still.query || ''}`, { waitUntil: 'load' });
    const view = viewName(new URLSearchParams(still.query || '').get('view') || 'map') || 'map';
    await waitForApp(page, health, { capture: false, view });
    await page.waitForTimeout(still.settleMs ?? 1800);
    if (still.inHoldSec != null) await playIntoHold(page, still);
    if (still.eval) {
      await page.evaluate(still.eval);
      await page.waitForTimeout(still.afterEvalMs ?? 800);
    }
    assertHealthy(health);
    await page.screenshot({ path: out });
    console.log(`  ✓ ${out}`);
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(USAGE);
    return;
  }

  if (args.list) {
    console.log('Sequences:\n');
    for (const s of sequences) {
      const flags = [s.view, s.plates ? 'plates' : '', s.speed && s.speed !== 1 ? `${s.speed}×` : ''].filter(Boolean).join(' ');
      console.log(`  ${pad2(s.order)} ${s.id.padEnd(14)} ${flags.padEnd(18)} ${String(s.startMa).padStart(7)} → ${String(s.endMa).padEnd(7)} Ma  ${s.title}`);
    }
    console.log('\nModal showcases:\n');
    for (const m of modalShowcases) {
      console.log(`  modal-${m.id.padEnd(16)} species=${String(m.speciesId).padEnd(16)} @ ${m.atMa} Ma`);
    }
    console.log('\nStills:\n');
    for (const s of stills) console.log(`  ${s.id.padEnd(16)} ${s.out}`);
    return;
  }

  // Unknown ids are reported before anything runs, with a hint when the id is of another kind.
  const kindOf = (id) => (findSequence(id) ? 'a sequence' : findModalShowcase(id) ? 'a modal showcase' : findStill(id) ? 'a still' : null);
  const pick = (ids, find, kind) => ids.map((id) => {
    const found = find(id);
    if (found) return found;
    const other = kindOf(id);
    throw usageError(`Unknown ${kind}: ${id}${other ? ` (${id} is ${other}; --seq, --modal and --still switch the id list)` : ''}`);
  });
  const seqTargets = args.all ? sequences : pick(args.sequences, findSequence, 'sequence');
  const modalTargets = (args.all || (args.allModals && !args.modals.length)) ? modalShowcases : pick(args.modals, findModalShowcase, 'modal showcase');
  const stillTargets = (args.all || (args.allStills && !args.stills.length)) ? stills : pick(args.stills, findStill, 'still');

  if (!seqTargets.length && !modalTargets.length && !stillTargets.length) {
    throw usageError('Specify sequence ids, --all, --modals [ids…] or --stills [ids…]. Use --list to see options.');
  }
  checkCatalog(seqTargets, modalTargets, stillTargets);

  if (args.out) OUT_ROOT = args.out;
  await ensureServerUp(args.baseUrl);
  if (seqTargets.length) await ensureFfmpeg();
  mkdirSync(ASSETS.shots, { recursive: true });
  mkdirSync(ASSETS.anims, { recursive: true });
  console.log(`Writing under ${join(OUT_ROOT, 'assets')}${STRICT ? ' (strict)' : ''}`);

  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  let failures = 0;
  let stopped = false;
  const attempt = async (label, fn) => {
    if (stopped) return;
    try {
      await fn();
    } catch (err) {
      failures++;
      const [head, ...rest] = String(err.message).split('\n');
      console.error(`✗ ${label}: ${clean(head)}`);
      // Keep a tool's own diagnostics (ffmpeg's stderr tail); Playwright's call logs are noise.
      if (rest.length && !/^(?:page|frame)\./.test(head)) console.error(rest.slice(-12).map((l) => `    ${l}`).join('\n'));
      if (STRICT) {
        stopped = true;
        console.error('Stopping at the first failure (strict mode).');
      }
    }
  };

  try {
    for (const seq of seqTargets) {
      await attempt(seq.id, () => captureSequence(browser, seq, args.baseUrl, args));
    }
    for (const spec of modalTargets) {
      if (stopped) break;
      console.log(`\n◆ modal — ${spec.speciesId} @ ${spec.atMa} Ma`);
      await attempt(`modal-${spec.id}`, () => captureFrame(browser, {
        ...spec,
        view: spec.view || 'map',
        out: join(ASSETS.shots, `modal-${spec.id}.png`),
        query: `?capture=1&panel=${encodeURIComponent(spec.panel || 'full')}`,
        label: `modal-${spec.id}`,
      }, args.baseUrl));
    }
    for (const still of stillTargets) {
      await attempt(`still-${still.id}`, () => captureStill(browser, still, args.baseUrl));
    }
  } finally {
    await browser.close();
  }

  console.log(failures ? `\nDone with ${failures} failure${failures === 1 ? '' : 's'}.` : '\nDone.');
  if (failures) process.exitCode = 1;
}

main().catch((err) => {
  if (err instanceof CliError) {
    console.error(err.message);
    process.exit(err.exitCode);
  }
  console.error(err);
  process.exit(1);
});
