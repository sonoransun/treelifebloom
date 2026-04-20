# Capturing screenshots & animated clips

The screenshots and WebM/GIF animations embedded in the [README](../README.md) and the [sequence walkthroughs](sequences/) are produced by a Playwright-driven capture pipeline. This document covers the high-level idea; the full reference lives in [scripts/capture/README.md](../scripts/capture/README.md).

## The 30-second version

```bash
# One-time
cd scripts/capture
npm install                      # downloads Playwright + Chromium
brew install ffmpeg              # for WebM → GIF

# Each run
python3 -m http.server 8080      # in another shell, from project root
node capture.js --all            # ~5 minutes, all 10 sequences
```

Outputs land in:

- `assets/screenshots/<NN>-<id>.png` — still poster
- `assets/animations/<NN>-<id>.webm` — animated clip (~1–3 MB)
- `assets/animations/<NN>-<id>.gif` — 480-wide GIF poster (~3–8 MB)

## How it works

1. **Capture mode** is activated by appending `?capture=1` to the URL. The CSS in `css/styles.css` hides chrome based on the `panel` URL param (`clean`, `sidebar`, `clock`, `full`). See `js/capture.js`.
2. The capture script opens that URL in headless Chromium with a tuned viewport.
3. Each sequence drives the visualization deterministically via `window.__capture` — set the view, scrub to the start time, set speed, play.
4. Recording uses the browser's `MediaRecorder` API over `canvas.captureStream(fps)` — so we capture the actual GL/Canvas pixels, not the page chrome.
5. The WebM blob is returned to Node as base64 via `page.exposeFunction`, then written to disk.
6. A still PNG poster is taken at `posterAt × duration` using `page.screenshot` clipped to `#viz-container`.
7. ffmpeg generates the GIF poster from the WebM with a two-pass palette (`palettegen` + `paletteuse`) for clean color quantization.

## Sequence catalog

The 10 sequences are defined in `scripts/capture/sequences.js`. Each entry specifies:

- `id`, `order`, `title` — used for naming and docs
- `view: '2d' | '3d'` — which renderer to capture
- `panel: 'clean' | 'sidebar' | 'clock' | 'full'` — which chrome stays visible
- `startMa`, `endMa`, `durationSec` — what to play and for how long
- `posterAt: 0..1` — fraction of duration at which to take the still
- `fps`, `width`, `height` — recording params
- `crossesExtinction: true` — adds 2.2 s buffer for the auto-pause

To add a sequence: append an entry to that array, then `node capture.js <id>`.

## Customization

The capture script accepts:

| Flag | Purpose |
|---|---|
| `--all` | Capture every sequence |
| `--list` | Print the catalog |
| `--keep-webm-only` | Skip ffmpeg / GIF conversion |
| `--base-url=URL` | Point at a non-default server |
| `STRICT=1 …` | Fail-fast: exit on the first error |

## Troubleshooting

- **Black canvas in the WebM** — headless WebGL didn't initialize. Try `--use-gl=swiftshader` (instead of `--use-gl=angle`) inside `capture.js`. On Linux hosts also try wrapping with `xvfb-run`.
- **`Recorder produced no data`** — VP9 unsupported. The script falls back to VP8 / default; if all fail, install a more recent Chromium via `npx playwright install chromium`.
- **2-second pause makes the clip end early** — set `crossesExtinction: true` on the sequence entry.
- **GIF colors look wrong** — the palette generation is two-pass; the second pass should be lossless. If you still see banding, try increasing the GIF width in `capture.js` (currently 480 px).
- **3D globe looks low-fidelity** — bump `deviceScaleFactor` from 2 to 1 to reduce GPU load (or vice versa for a sharper globe at the cost of bigger files).

## Why Playwright?

We need:

- Deterministic scrubbing (the regular UI scrubber is mouse-driven, not scriptable from outside the browser).
- Per-frame canvas capture without page chrome.
- Headless operation so the docs build can run in CI.

Playwright + `MediaRecorder` + `canvas.captureStream` hits all three with a single dev dependency and no GPU plumbing beyond what Playwright's Chromium already ships.
