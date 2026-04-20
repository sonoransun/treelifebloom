// Headless capture pipeline.
// Drives the running app via Playwright and writes artifacts under ../../assets/.
//
// Prereqs (one-time):
//   1. The dev server is running:  python3 -m http.server 8080  (from project root)
//   2. ffmpeg is on $PATH:          brew install ffmpeg  (macOS)  /  apt install ffmpeg
//   3. npm install                  (downloads Playwright + a Chromium binary)
//
// Usage:
//   node capture.js --all                  # capture every sequence in sequences.js
//   node capture.js cambrian permian       # capture just the listed sequences
//   node capture.js --list                 # print the catalog
//   node capture.js --base-url=http://localhost:9000 cambrian
//   node capture.js --keep-webm-only       # skip GIF conversion (no ffmpeg needed)

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sequences, findSequence } from './sequences.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const ASSETS = {
  shots: join(PROJECT_ROOT, 'assets', 'screenshots'),
  anims: join(PROJECT_ROOT, 'assets', 'animations'),
};

function parseArgs(argv) {
  const args = { sequences: [], all: false, list: false, baseUrl: 'http://localhost:8080', keepWebmOnly: false };
  for (const a of argv) {
    if (a === '--all') args.all = true;
    else if (a === '--list') args.list = true;
    else if (a === '--keep-webm-only') args.keepWebmOnly = true;
    else if (a.startsWith('--base-url=')) args.baseUrl = a.slice('--base-url='.length);
    else if (a.startsWith('--')) console.warn(`Unknown flag: ${a}`);
    else args.sequences.push(a);
  }
  return args;
}

function pad2(n) { return String(n).padStart(2, '0'); }

function paths(seq) {
  const stem = `${pad2(seq.order)}-${seq.id}`;
  return {
    png: join(ASSETS.shots, `${stem}.png`),
    webm: join(ASSETS.anims, `${stem}.webm`),
    gif: join(ASSETS.anims, `${stem}.gif`),
  };
}

async function ensureServerUp(baseUrl) {
  // Quick sanity ping. Doesn't require the dev server to be on this exact port,
  // just that the URL we're about to point Playwright at is reachable.
  try {
    const res = await fetch(baseUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    throw new Error(
      `Dev server not reachable at ${baseUrl}: ${e.message}\n` +
      `From the project root, run: python3 -m http.server 8080`
    );
  }
}

function ffmpegToGif(webmPath, gifPath) {
  return new Promise((resolve_, reject) => {
    const args = [
      '-y',
      '-i', webmPath,
      '-vf', 'fps=15,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse',
      gifPath,
    ];
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('error', (err) => reject(new Error(`ffmpeg launch failed: ${err.message}`)));
    proc.on('close', (code) => {
      if (code === 0) resolve_();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

async function captureSequence(browser, seq, baseUrl, opts) {
  const out = paths(seq);
  console.log(`\n▶ ${pad2(seq.order)} ${seq.id} — ${seq.title} (${seq.view}, ${seq.durationSec}s)`);

  const context = await browser.newContext({
    viewport: { width: seq.width, height: seq.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Forward console messages so we can spot runtime errors during recording.
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('  [page error]', msg.text());
  });
  page.on('pageerror', (err) => console.error('  [page exception]', err.message));

  const url = `${baseUrl}/?capture=1&panel=${encodeURIComponent(seq.panel)}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => globalThis.__captureReady === true, null, { timeout: 15000 });

  // Set up the scene.
  await page.evaluate(async (s) => {
    await window.__capture.setView(s.view);
    window.__capture.setSpeed(1);
    window.__capture.setTime(s.startMa);
    window.__capture.pause();
  }, seq);

  // Give the renderers a few frames to settle (3D especially needs the lazy-load to finish).
  await page.waitForTimeout(seq.view === '3d' ? 1200 : 400);

  // Expose a binding so the page can ship the recorded blob back to us as base64.
  let recordedBase64 = null;
  await page.exposeFunction('__deliverBlob', (b64) => { recordedBase64 = b64; });

  // Set up MediaRecorder over canvas.captureStream.
  await page.evaluate((fps) => {
    const canvas = window.__capture.activeCanvas();
    if (!canvas) throw new Error('No active canvas found');
    const stream = canvas.captureStream(fps);
    // Prefer VP9, fall back to default if unsupported.
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    window.__chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) window.__chunks.push(e.data); };
    window.__recorder = rec;
  }, seq.fps);

  // Start the recorder, then start the animation.
  await page.evaluate(() => window.__recorder.start(200));
  await page.evaluate(() => window.__capture.play());

  // Wait for the configured duration (+ buffer for the 2-second extinction auto-pause).
  const buffer = seq.crossesExtinction ? 2200 : 100;
  await page.waitForTimeout(seq.durationSec * 1000 + buffer);

  await page.evaluate(() => window.__capture.pause());

  // Stop recorder and ship the blob back as base64 (chunked-friendly via exposeFunction).
  await page.evaluate(() => new Promise((resolve_) => {
    const rec = window.__recorder;
    rec.onstop = async () => {
      const blob = new Blob(window.__chunks, { type: 'video/webm' });
      const buf = new Uint8Array(await blob.arrayBuffer());
      // Encode in 64KiB pieces to avoid String.fromCharCode argument-count limits.
      let bin = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < buf.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, buf.subarray(i, i + CHUNK));
      }
      await window.__deliverBlob(btoa(bin));
      resolve_();
    };
    rec.stop();
  }));

  if (!recordedBase64) throw new Error('Recorder produced no data');
  writeFileSync(out.webm, Buffer.from(recordedBase64, 'base64'));
  console.log(`  ✓ ${out.webm}`);

  // Capture the still poster at posterAt fraction of the sequence.
  const posterMa = seq.startMa - (seq.startMa - seq.endMa) * seq.posterAt;
  await page.evaluate((ma) => { window.__capture.setTime(ma); }, posterMa);
  await page.waitForTimeout(300);
  // Clip to the visualization area so chrome (if any) is excluded.
  const vizBox = await page.locator('#viz-container').boundingBox();
  await page.screenshot({ path: out.png, clip: vizBox || undefined });
  console.log(`  ✓ ${out.png}`);

  await context.close();

  if (!opts.keepWebmOnly) {
    try {
      await ffmpegToGif(out.webm, out.gif);
      console.log(`  ✓ ${out.gif}`);
    } catch (err) {
      console.warn(`  ⚠ GIF conversion skipped: ${err.message}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    console.log('Available sequences:\n');
    for (const s of sequences) {
      console.log(`  ${pad2(s.order)} ${s.id.padEnd(14)} ${s.view}  ${s.startMa} → ${s.endMa} Ma  (${s.durationSec}s)  ${s.title}`);
    }
    return;
  }

  if (!args.all && args.sequences.length === 0) {
    console.error('Specify sequence ids, or pass --all. Use --list to see options.');
    process.exit(2);
  }

  const targets = args.all ? sequences : args.sequences.map((id) => {
    const s = findSequence(id);
    if (!s) throw new Error(`Unknown sequence: ${id}`);
    return s;
  });

  await ensureServerUp(args.baseUrl);
  mkdirSync(ASSETS.shots, { recursive: true });
  mkdirSync(ASSETS.anims, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    // Improve headless WebGL on hosts where Mesa is missing.
    args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  try {
    for (const seq of targets) {
      try {
        await captureSequence(browser, seq, args.baseUrl, args);
      } catch (err) {
        console.error(`✗ ${seq.id}: ${err.message}`);
        if (process.env.STRICT) throw err;
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\nDone.');
}

main().catch((err) => { console.error(err); process.exit(1); });
