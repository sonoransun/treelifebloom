# Capture pipeline

Headless capture of the 10 notable sequences embedded in the project README and `docs/sequences/`.

For each entry in [`sequences.js`](sequences.js) the pipeline produces:

- `assets/screenshots/<NN>-<id>.png` — still poster
- `assets/animations/<NN>-<id>.webm` — animated clip (VP9, ~4 Mb/s)
- `assets/animations/<NN>-<id>.gif` — 480-wide poster GIF (15 fps)

## One-time setup

```bash
# 1. Node deps (downloads Playwright's Chromium binary too)
cd scripts/capture
npm install

# 2. ffmpeg, for WebM → GIF conversion
brew install ffmpeg          # macOS
# sudo apt install ffmpeg    # Debian / Ubuntu
```

## Capture

In one shell, serve the project from the repo root:

```bash
python3 -m http.server 8080
```

In another shell:

```bash
cd scripts/capture
node capture.js --list             # see the catalog
node capture.js cambrian           # one sequence
node capture.js cambrian permian   # several
node capture.js --all              # all 10 (~5 min)
```

Useful flags:

| Flag | Purpose |
|---|---|
| `--all` | Capture every sequence |
| `--list` | Print the catalog and exit |
| `--keep-webm-only` | Skip the GIF conversion (no ffmpeg needed) |
| `--base-url=URL` | Point at a server other than `http://localhost:8080` |
| `STRICT=1 …` | Fail-fast: exit on the first sequence that errors |

## How it works

1. Capture mode is activated via `?capture=1` (see [`js/capture.js`](../../js/capture.js)). The CSS in [`css/styles.css`](../../css/styles.css) hides chrome based on the `panel` URL param (`clean`, `sidebar`, `clock`, `full`).
2. The capture script opens that URL in headless Chromium with a tuned viewport.
3. It uses `window.__capture` to set the view (2D / 3D), scrub to the sequence start, and play.
4. Recording uses the browser's `MediaRecorder` API over `canvas.captureStream(fps)` — so we capture the actual GL/Canvas pixels, not the page.
5. The blob is shipped back to Node as base64 via `page.exposeFunction`, written as `.webm`.
6. A still PNG is taken at `posterAt × duration` (uses `page.screenshot` clipped to `#viz-container`).
7. ffmpeg generates the GIF poster from the WebM with a two-pass palette.

## Troubleshooting

- **Black canvas in the WebM** — usually means headless WebGL didn't initialize. Try `--use-gl=swiftshader` instead of `--use-gl=angle` in `capture.js`. Some Linux hosts also need `xvfb-run`.
- **`Recorder produced no data`** — VP9 unsupported. The script falls back to VP8 / default; if all fail, install a more recent Chromium.
- **2-second pause makes the clip end early** — set `crossesExtinction: true` on the sequence; the runtime adds a 2.2 s buffer.
- **Low FPS on the 3D globe** — bump `deviceScaleFactor` down from 2 to 1 for that sequence (edit `capture.js`).
