# Capture pipeline and smoke test

Two Playwright scripts live in this folder. Both drive the running app in headless Chromium:

- **`capture.js`** films the clips and takes the stills that the README and `docs/` embed. It works from the catalog in **`sequences.js`**.
- **`smoke-test.js`** checks, end to end, that the app still keeps its contracts.

This page is the reference. For the big picture, with a diagram, start with [docs/capture.md](../../docs/capture.md).

**Contents:** [Setup](#setup) · [Running capture.js](#running-capturejs) · [Outputs](#outputs) · [How each kind is captured](#how-each-kind-is-captured) · [The catalog](#the-catalog) · [Warnings and strict mode](#warnings-and-strict-mode) · [Capture mode](#capture-mode) · [Capture API](#capture-api) · [Smoke test](#smoke-test) · [Troubleshooting](#troubleshooting)

## Setup

1. **Node 18 or newer**, which is Playwright's minimum.
2. **Playwright and its Chromium**, once, in this folder:

   ```bash
   cd scripts/capture
   npm install                       # Playwright (package.json asks for ^1.48)
   npx playwright install chromium   # the browser build this Playwright version drives
   ```

   `npm install` does not download a browser. `package-lock.json` is git-ignored, so a fresh install takes the newest 1.x release; run `npx playwright install chromium` again after Playwright updates. On a fresh Linux machine, `npx playwright install --with-deps chromium` also installs the system libraries Chromium needs.
3. **ffmpeg** on your `PATH`, built with the VP9 encoder: `brew install ffmpeg` or `sudo apt install ffmpeg`. `ffmpeg -hide_banner -encoders | grep vp9` should list `libvpx-vp9`; Homebrew's build has it. Only clips need ffmpeg. Species-dialog showcases and interface stills don't.
4. **The app, being served.** From the project root, run `python3 -m http.server 8080`; any static server works. The default base URL is `http://localhost:8080`.

<!-- REVIEW after geometry lands -->
The globe view loads three.js from `cdn.jsdelivr.net` (through the import map in `index.html`), so captures of the globe need network access.

`package.json` defines npm shortcuts: `npm run list`, `npm run capture -- <ids…>`, `npm run capture:all` and `npm test`. The last runs the smoke test; pass its options after `--`.

## Running capture.js

Run it from this folder or from the project root (`node scripts/capture/capture.js …`). Paths resolve from the script's own location, except `--out=`, which is relative to your current directory.

```bash
node capture.js --list                        # print the catalog and exit
node capture.js kpg                           # one clip (bare ids are clip ids)
node capture.js cambrian permian              # several clips
node capture.js --modals                      # every species-dialog showcase
node capture.js --modal trilobite mammoth     # some of them
node capture.js --stills                      # every interface still, the README hero included
node capture.js --still hero tree             # some of them (here "tree" is the still, not the clip)
node capture.js --modal trilobite --seq kpg   # --seq switches back to clip ids
node capture.js --all                         # every clip, showcase and still
node capture.js --all --out=/tmp/preview      # the same, written under /tmp/preview/assets/
node capture.js --strict --all                # stop at the first failure; warnings fail too
STRICT=1 node capture.js --all                # the same
node capture.js --no-gif kpg                  # WebM and poster only (ffmpeg is still needed)
node capture.js --base-url=http://localhost:9000 kpg
```

### Flags

| Flag | Effect |
|---|---|
| *ids* | Bare words are ids. They join the current list, which is clips until `--modal(s)` or `--still(s)` switches it. |
| `--all` | Capture every clip, showcase and still. Ids given alongside it are neither checked nor used. |
| `--list` | Print the catalog and exit. No server is needed. |
| `--seq`, `--sequences` | The ids that follow are clip ids. |
| `--modal <id>…` | The ids that follow are species-dialog showcases; give at least one. Use the id without the `modal-` prefix that `--list` prints (`--modal trilobite`). |
| `--modals [<id>…]` | Every showcase, or only the ids that follow. |
| `--still <id>…` | The ids that follow are interface stills; give at least one. |
| `--stills [<id>…]` | Every interface still, or only the ids that follow. |
| `--no-gif`, `--keep-webm-only` | Skip the GIF. The WebM and poster are still made, so ffmpeg is still needed. |
| `--base-url=<url>` | Where the app is served. The default is `http://localhost:8080`; trailing slashes are dropped. |
| `--out=<dir>` | Write under `<dir>/assets/…` instead of the project's `assets/`. Use it for dry runs. |
| `--strict` | Turn on strict mode; see [Warnings and strict mode](#warnings-and-strict-mode). |
| `STRICT` (environment) | `1`, `true`, `yes` or `on`, in any case, turns strict mode on. Any other value leaves it off, `STRICT=0` included. |

There is no `--help` flag: it is rejected like any other unknown flag. The same usage summary is in the header comment of `capture.js`.

### Exit codes

| Code | When |
|---|---|
| `0` | Everything asked for was captured. Warnings may have been printed. |
| `1` | A capture failed, or the run couldn't start: the server was unreachable, ffmpeg couldn't be run (checked only when clips are requested), `sequences.js` has a mistake, or Chromium couldn't be launched. |
| `2` | The command line is wrong, and nothing runs. That covers an unknown flag or id, `--modal` or `--still` without an id, an empty `--out=` or `--base-url=`, a base URL that isn't a URL, and having nothing to capture. |

### Reading the output

A dry run of one clip and one still prints:

```text
Writing under /tmp/preview/assets

▶ 08 kpg — K-Pg Asteroid Impact (map, 70 → 61.5 Ma)
  ✓ /tmp/preview/assets/animations/08-kpg.webm  (346 frames, 10.9 s, ended at 61.25 Ma after end-cretaceous)
  ✓ /tmp/preview/assets/animations/08-kpg.gif
  ✓ /tmp/preview/assets/screenshots/08-kpg.png

■ still — hero (?t=95)
  ✓ /tmp/preview/assets/life-tree-bloom.png

Done.
```

- `▶` starts a clip. The WebM line ends with the frame count, the seconds recorded, the time the clock stopped at, and any extinctions staged on the way.
- `◆` starts a species-dialog showcase, and `■` an interface still.
- `(strict)` at the end of the first line means strict mode is on.
- `✓` is a file written, `⚠` a warning, and `✗ <label>: <reason>` a failure.
- `[page error]` and `[page exception]` lines relay the app's own console errors and uncaught exceptions as they happen.
- The last line is `Done.` or `Done with N failures.`

## Outputs

| Kind | File (under the project, or under `--out`) | Format |
|---|---|---|
| Clip | `assets/animations/NN-<id>.webm` | VP9 (`libvpx-vp9`, CRF 33), constant 30 fps, no audio; the entry's viewport size at 1× pixel density |
| GIF preview | `assets/animations/NN-<id>.gif` | 480 px wide, 12 fps, 128-color palette with Bayer dithering |
| Poster | `assets/screenshots/NN-<id>.png` | the viewport at 2× pixel density |
| Species-dialog showcase | `assets/screenshots/modal-<id>.png` | the viewport at 2× |
| Interface still | the entry's `out`, relative to the project root | the viewport at 2× |

`NN` is the entry's `order`, zero-padded, and existing files are overwritten. For scale, the twelve current clips come to about 20 MB of WebM and another 20 MB of GIF.

## How each kind is captured

### Clips

1. **A fresh browser context** at the entry's `width` × `height` and 1× pixel density opens `<base-url>/?capture=1&panel=<panel>&hold=<holdSec>`.
2. **Boot check.** The script imports the page's entry module again. It is the same instance, so nothing runs twice, and the import rejects at once with the real error if the app failed to boot. The script then waits up to 15 s for `window.__captureReady`.
3. **Scene.** In the page, it calls `setView(view)`, `setSpeed(speed)`, `setTime(startMa)`, `setLayer('plates', plates)`, `setLayer('labels', labels)` and `pause()`. It checks `state().view` and warns if `startMa` lies in a mass-extinction window. Then it gives the view time to load and settle: 1.8 s for the globe and the tree, 0.5 s for the map.
4. **Screencast.** A DevTools (CDP) screencast of the page starts. It delivers JPEG frames (quality 93) with timestamps, saved to a temporary `ltb-<id>-…` folder in the system temp directory. Headless Chromium paints far more often than a 30 fps clip needs, so a frame that arrives within 1/45 s of the last kept one is dropped. The very last frame is always kept, so the clip ends on the exact final picture.
5. **Playback.**
   - **Normal entries** call `__capture.playUntil(endMa, { timeoutMs: maxSec × 1000 })`, and the clock plays in real time at `speed`.
     - A mass extinction on the way is staged as the app always stages it: the hold (`holdSec`), a slowed crawl through the event window, then the aftermath fade.
     - The page pauses on the frame that reaches `endMa`. If an aftermath is still fading there, it pauses on the frame where the fade ends instead.
     - Any other outcome fails the clip: the cap was hit, something else paused playback, or the story ended first. A clip that ends inside an extinction window gets a warning.
     - The clip then lingers on the paused frame for `tailMs`.
   - **Sweeps** (`sweep: true`) call `__capture.sweep(startMa, endMa, sweepSec × 1000)` instead.
     - The clock is paused and moved once per animation frame, evenly along the story axis (the warped axis of the timeline bar), so there are no holds.
     - Extinction windows are stepped over, landing a year past their far edge, because scrubbing into a window would flash its card for a single frame.
     - Milestone toasts and the extinction overlay are hidden while the sweep runs.
     - The clip then lingers for `tailMs`.
6. **Encode.** The screencast stops. The frames are listed in an ffconcat file with each frame's real duration; the last one lasts until the screencast stopped. ffmpeg resamples them to a constant 30 fps WebM, cut at the listed total, and makes the GIF from the WebM.

   The clip therefore runs at the pace the scene actually played: a stall on a busy machine shows as a held frame, never as a speed-up. The temporary folder is deleted afterwards, also when the capture fails.
7. **Poster.** A new context at 2× pixel density opens `<base-url>/?capture=1&panel=<panel>`. It sets the same scene at `posterMa`, paused, and screenshots the viewport. If the WebM encode failed, the poster is still taken and the encode error is reported after it.

### Species-dialog showcases

A new context at the entry's size and 2× pixel density opens `<base-url>/?capture=1&panel=<panel>` and sets the scene at `atMa`. The panel is `full` and the view is the map unless the entry says otherwise. The script then calls `__capture.openSpeciesModal(speciesId)`, which also pauses the app. It waits up to 5 s until `state().focusId` is that species and a dialog inside `#species-modal-root` is visible. It waits 0.6 s more for the dialog's entrance, then screenshots the viewport.

### Interface stills

Interface stills show the real interface, not capture mode: toolbar, timeline, sidebar and cards, as a visitor sees them. A new context opens `<base-url>/<query>` at the entry's size (default 1512 × 860), 2× pixel density and no reduced-motion preference. The script waits for boot, then for `#app[data-view]` to show the view the query asks for (the map by default), then for `settleMs`.

- **With `inHoldSec`**, it starts playback from the query's `?t=` through the app's own event bus (`time:seek` with `play: true`). It takes the shot that many seconds into the first mass-extinction hold, or half a second before the hold ends if the hold is shorter. If the hold hasn't lasted that long within 15 s of starting to play, the still fails.
- **With `eval`**, it runs that JavaScript in the page and then waits `afterEvalMs`.

The query uses the app's deep-link parameters: `t`, `view`, `plates`, `labels`, `speed` and `play` (see `js/engine/urlState.js`). An empty query is a first visit, which opens on the intro card.

## The catalog

`sequences.js` exports three arrays (`sequences`, `modalShowcases` and `stills`) and a `find…` helper for each. Before a browser starts, `capture.js` checks the entries it is about to use. If a field is missing or of the wrong kind, it stops with `sequences.js has problems:` and a list of them (exit 1).

<!-- REVIEW after geometry lands -->
### sequences

| Field | Default | Meaning |
|---|---|---|
| `id` | required | Slug: the command-line id, and part of the file names. |
| `order` | required | The `NN-` file-name prefix and the `--list` order (chronological). |
| `title`, `blurb` | — | Used by the sequence pages ([docs/notable-sequences.md](../../docs/notable-sequences.md) and `docs/sequences/`). |
| `view` | required | `'map'`, `'globe'` or `'tree'`; the legacy `'2d'` and `'3d'` still work. |
| `panel` | required | What stays on screen: `'clean'`, `'sidebar'`, `'clock'` or `'full'` (see [Capture mode](#capture-mode)). |
| `plates` | `false` | Turns on the plate-boundary layer. |
| `labels` | `true` | Turns on the place-name layer. |
| `startMa`, `endMa` | required | Numbers, in millions of years ago: play (or sweep) from `startMa` to `endMa`. |
| `speed` | `1` | Playback speed. The app clamps it to 0.25–4. |
| `holdSec` | `3.5` | Seconds the clock holds on a mass extinction during the clip, passed as `&hold=`. The app's own hold is 6 s. |
| `maxSec` | `30` | Cap on playback, in real seconds; reaching it fails the clip. Sweeps don't use it. |
| `tailMs` | `600` (`1200` for sweeps) | How long the clip lingers on its paused last frame. |
| `sweep` | `false` | Film a time-lapse instead of playback. |
| `sweepSec` | `12` | Length of the time-lapse, in seconds. |
| `posterMa` | see `posterAt` | Time of the poster still. |
| `posterAt` | `0.5` | Used only without `posterMa`: the poster sits this fraction of the way from `startMa` to `endMa`, measured in Ma. |
| `posterInEvent` | `false` | Marks a poster that is meant to sit inside a mass-extinction window, so it gets no warning there. Any other shot that lands in a window does. |
| `width`, `height` | — | Viewport in CSS pixels. Always set them: the clip has no default, and only the poster falls back to 1280 × 720. Every current entry uses 1280 × 720. |

### modalShowcases

| Field | Default | Meaning |
|---|---|---|
| `id` | required | The command-line id (`--modal <id>`) and the file name `modal-<id>.png`. |
| `speciesId` | required | A species id from `js/data/species/*.js`. |
| `atMa` | required | The moment behind the dialog. Keep it outside mass-extinction windows, or the crisis card shows behind the dialog and a warning is printed. |
| `view` | `'map'` | As for sequences. |
| `panel` | `'full'` | As for sequences. |
| `plates`, `labels` | `false`, `true` | As for sequences. |
| `width`, `height` | `1280`, `720` | Viewport in CSS pixels. The current entries use 1280 × 800. |
| `blurb` | — | Used by the documentation. |

### stills

| Field | Default | Meaning |
|---|---|---|
| `id` | required | The command-line id (`--still <id>`). |
| `query` | `''` | URL query string, e.g. `'?t=152&view=globe&plates=1'`. An empty string is a first visit, with the intro card. |
| `out` | required | Output path, relative to the project root (or to `--out`). |
| `width`, `height` | `1512`, `860` | Viewport in CSS pixels. |
| `settleMs` | `1800` | Wait after the view is up. |
| `inHoldSec` | — | Play from the query's `?t=` and shoot this many seconds into the first mass-extinction hold. Needs a numeric `?t=` a few Ma before an event. |
| `eval` | — | JavaScript, as a string, run in the page before the shot. |
| `afterEvalMs` | `800` | Wait after `eval`. |

### The catalog today

This is `node capture.js --list` at the time of writing. The two sweeps, `tree` and `drift`, aren't flagged as such in the listing; their entries say `sweep: true`.

```text
Sequences:

  01 hadean         map 1.5×              4540 → 4000    Ma  Earth's Origin & Hadean
  02 goe            map                   2500 → 2200    Ma  Great Oxidation Event
  03 snowball       globe                  730 → 632     Ma  Snowball Earth
  04 cambrian       map 2×                 540 → 486     Ma  Cambrian Explosion
  05 forests        map 1.5×               410 → 374.5   Ma  First Forests (Devonian)
  06 permian        map                    262 → 241     Ma  End-Permian "Great Dying"
  07 jurassic       globe plates 2×        198 → 146     Ma  Jurassic Dinosaurs
  08 kpg            map                     70 → 61.5    Ma  K-Pg Asteroid Impact
  09 pleistocene    map 2.5×              2.58 → 0.014   Ma  Ice Age & Megafauna
  10 hominin        map 4×                   6 → 0       Ma  Hominin Emergence
  11 tree           tree                  4540 → 0       Ma  The Tree Blooms
  12 drift          globe                  300 → 0       Ma  Pangaea to Present

Modal showcases:

  modal-trilobite        species=trilobite        @ 500 Ma
  modal-tiktaalik        species=tiktaalik        @ 375 Ma
  modal-tyrannosaurus    species=tyrannosaurus    @ 67 Ma
  modal-mammoth          species=mammoth          @ 0.05 Ma
  modal-homo_sapiens     species=homo_sapiens     @ 0.05 Ma

Stills:

  hero             assets/life-tree-bloom.png
  intro            assets/screenshots/ui-intro.png
  globe            assets/screenshots/ui-globe.png
  tree             assets/screenshots/ui-tree.png
  extinction       assets/screenshots/ui-extinction.png
  present          assets/screenshots/ui-present.png
  phone            assets/screenshots/ui-phone.png
```

### Choosing times near the Big Five

A mass extinction's window is `timeMa ± durationMa / 2`, from `js/data/extinctions.js`. Scrubbing into a window shows its crisis look straight away: the extinction card and a colored vignette. So every shot and every clip ending should sit a few million years clear of a window, unless it is meant to show the event; the pipeline warns when one doesn't. To print the current windows, run this from the project root:

```bash
node --input-type=module -e "
const { extinctions } = await import('./js/data/extinctions.js');
for (const e of extinctions) {
  const half = e.durationMa / 2;
  console.log(e.id.padEnd(15), (e.timeMa + half).toFixed(2), '→', (e.timeMa - half).toFixed(2), 'Ma');
}
"
```

Milestone toasts and era title cards are different. They are part of the story and appear whenever the time sits in their window: a still at 150 Ma carries the toast "The giants", for example. If one covers what you want to show, move the time.

## Warnings and strict mode

Warnings are printed with ⚠. They don't fail a normal run:

- `⚠ <label>: <time> Ma is inside the <event> window, so the shot shows its crisis look`: a clip's start, a poster without `posterInEvent`, or a showcase's `atMa` lies in a mass-extinction window.
- `⚠ <id>: the clip ends inside the <event> window`.
- `⚠ GIF conversion skipped: …`. The WebM and the poster are still written.

The page's console errors are relayed as `[page error]` lines and are not fatal. Uncaught exceptions (`[page exception]`) always fail the capture they happen in. ResizeObserver loop notices are ignored.

**Strict mode** (`--strict`, or `STRICT` set to `1`, `true`, `yes` or `on`) is meant for runs whose output will be committed:

- every warning fails the capture it belongs to, at the point where it is raised;
- page console errors fail the capture;
- the run stops after the first failure and prints `Stopping at the first failure (strict mode).`

Most warnings come before anything is written. A poster or GIF warning, though, arrives after the clip's WebM has already been written.

## Capture mode

Capture mode lives in the app, in [js/capture.js](../../js/capture.js). Its styles are in [css/styles.css](../../css/styles.css), plus a few rules in the component stylesheets. It is off unless the URL says `capture=1`.

### URL parameters

| Parameter | Values | Effect |
|---|---|---|
| `capture` | `1` | Turns capture mode on. Any other value leaves it off. |
| `panel` | `clean` (default), `sidebar`, `clock`, `full` | What stays on screen besides the visualization. An unknown value acts like `clean`. |
| `hold` | seconds ≥ 0 | Length of every mass-extinction hold on this page; `0` turns holds off. An empty value is ignored. Any other value that isn't a number ≥ 0 is ignored with a console warning. |
| `t`, `view`, `plates`, `labels`, `speed`, `play` | as in any deep link | Applied before the app reports ready. |

Capture mode never rewrites the URL.

### What each panel shows

| `panel` | On screen |
|---|---|
| `clean` | The visualization and its story overlays: milestone toasts, era title cards, the extinction card and vignette. |
| `sidebar` | … plus the life & planet sidebar, laid out as a plain full-height column on the right at any viewport size. |
| `clock` | … plus the context card: where the period sits in the time scale, its name, the age, the 24-hour Earth clock and the period's one-liner. In capture mode it stays compact; the life, climate and geography lines never unfold. |
| `full` | … plus both. |

On viewports narrower than 1900 px, the context card steps aside while an extinction card is on screen. At clip sizes it is therefore missing from crisis frames, by design.

Capture mode always hides:

- the toolbar, the timeline and the status notice;
- the hover card, the intro card and the skip link;
- focus rings;
- the on-canvas controls of the map, globe and tree;
- the context card's info button and tooltip;
- the extinction card's Continue button;
- the end-of-story finale card.

The one-time view hints are not shown either. Legend, Chapters and Help stay hidden unless a script opens them with `openPanel()`. During `sweep()`, the milestone overlay and the extinction overlay are hidden too.

These body classes are available for styling:

- `capture-mode`, always;
- `capture-mode-with-sidebar` and `capture-mode-with-clock`, from `panel`;
- `capture-show-<name>`, while a script shows a panel;
- `capture-sweeping`, during `sweep()`.

### Ready

`window.__captureReady` becomes `true`, and `__capture.ready` resolves, on the app's `app:ready` event. That happens after any deep-linked view switch and `play=1` have taken effect. Wait for it before you script anything.

## Capture API

`window.__capture` exists only under `?capture=1`. Methods that take times or numbers accept numbers or numeric strings, and throw a `TypeError` for anything else, so a script can't leave the clock at NaN. Async methods reject instead of throwing.

| Member | Returns | What it does |
|---|---|---|
| `ready` | Promise | Resolves when the app has finished booting, at the moment `window.__captureReady` turns true. |
| `setView(mode)` | Promise | Switch to `'map'`, `'globe'` or `'tree'`, in any case; `'2d'` and `'3d'` work too. Resolves once the view is live. Rejects on an unknown name, or when the view can't be started; the app then stays on the previous view. |
| `setTime(ma)` | — | Jump to a time, clamped to 4540–0 Ma. A jump never starts a hold. Jumping into an extinction window shows its static crisis look. |
| `seekFraction(f)` | — | Jump to a position on the story axis, where 0 is Earth's formation and 1 the present (clamped). |
| `fractionOf(ma)` | number | The story-axis position (0–1) of a time. |
| `setSpeed(x)` | — | Set the playback speed, clamped to 0.25–4. |
| `setLayer(name, on)` | — | Turn `'plates'` or `'labels'` on or off. Other names are ignored. |
| `setBoundaries(on)` | — | Older alias of `setLayer('plates', on)`. |
| `setHoldSeconds(s)` | — | Set the length of holds that start from now on. `0`, or a negative number, turns them off. |
| `skipHold()` | — | End the current hold, like the Continue button. |
| `play()`, `pause()` | — | Start or stop playback. |
| `playUntil(ma, { timeoutMs = 30000, aftermath = true })` | Promise of `{ reason, events, state }` | Play, then pause on the frame that reaches `ma`. Unless `aftermath` is `false`, it keeps going until the fade-out of an extinction crossed on the way has finished. The result fields are listed under the table. |
| `sweep(fromMa, toMa, ms)` | Promise of `state()` | Time-lapse: pause, then glide evenly along the story axis over `ms`, one jump per animation frame. Extinction windows are stepped over, landing a year past the far edge. Sets `body.capture-sweeping` while it runs, and rejects if a step throws. |
| `openSpeciesModal(id)` | — | Open the species dialog; the app pauses. Throws for an id that isn't in the data. |
| `closeSpeciesModal()` | — | Close the dialog. It closes on the app's close-everything request, so the script then reopens any legend, chapters or help panel that was open. |
| `openPanel(name)` | — | Open `'legend'`, `'chapters'` or `'help'` and let it show in capture mode. The sidebar follows `panel=` instead: `openPanel('sidebar')` has no visible effect in capture mode. |
| `closePanel(name)` | — | Close it again. |
| `state()` | object | A snapshot of the clock and the view; see below. |
| `waitFor(fn, timeoutMs = 10000)` | Promise | Call `fn` once per animation frame until it returns something truthy, then resolve with that value. Rejects on timeout, or if `fn` throws. |
| `sleep(ms)` | Promise | Resolve after `ms` milliseconds. |
| `activeCanvas()` | element | The active view's `<canvas>`: `#canvas2d`, the globe's canvas inside `#globe-container`, or `#canvas-tree`. |
| `activeView()` | object | The active view's renderer object, for debugging. |

The `playUntil()` result has three fields, and playback is paused whatever the reason:

- `reason` is `'reached'`, `'end'` (the present came first), `'stopped'` (something else paused playback) or `'timeout'`.
- `events` lists the ids of the extinctions staged on the way.
- `state` is `state()` at that frame.

### state()

| Field | Meaning |
|---|---|
| `timeMa` | Current time, in Ma. |
| `fraction` | Position on the story axis, 0–1. |
| `playing` | Whether playback is running. It stays `true` during a hold. |
| `holding` | Whether a mass-extinction hold is in progress. |
| `hold` | `{ id, elapsed, duration }` during a hold; otherwise `null`. |
| `event` | `{ id, phase, intensity }` while playback stages an extinction; otherwise `null`. `phase` is `'hold'`, `'window'` or `'aftermath'`, and `intensity` runs from 0 to 1. |
| `extinctionId` | The mass-extinction window the clock is in, even if it was scrubbed there; otherwise `null`. |
| `atEnd` | Whether the clock is at the present. |
| `speed` | Playback speed. |
| `view` | `'map'`, `'globe'` or `'tree'`. |
| `layers` | `{ plates, labels }`, both booleans. |
| `focusId` | The species shown in the dialog; otherwise `null`. |
| `holdSeconds` | The current hold length. |

### Driving it yourself

Open `http://localhost:8080/?capture=1&panel=full` and use the DevTools console:

```js
__capture.setTime(70)
await __capture.playUntil(61.5)   // → { reason: 'reached', events: ['end-cretaceous'], state: {…} }
__capture.setTime(67)
__capture.openSpeciesModal('tyrannosaurus')
```

Or write a Playwright script. Save it in this folder, so that `playwright` resolves, and run it with `node my-still.js`:

```js
// my-still.js — one 2× still of the Late Jurassic globe with plate boundaries.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8080';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
page.on('pageerror', (err) => console.error('page threw:', err.message));

await page.goto(`${BASE}/?capture=1&panel=clock`);
await page.waitForFunction(() => window.__captureReady === true);
const state = await page.evaluate(async () => {
  const c = window.__capture;
  await c.setView('globe');      // rejects if the globe cannot start
  c.setTime(150);
  c.setLayer('plates', true);
  c.pause();
  return c.state();
});
console.log(`${state.view} at ${state.timeMa} Ma, plates ${state.layers.plates}`);
await page.waitForTimeout(1800);  // give the globe a moment to settle
await page.screenshot({ path: 'globe-150.png' });
await browser.close();
```

## Smoke test

`smoke-test.js` answers *does the app still work?* in about a minute. It drives the running app in headless Chromium and checks contracts, not internals: the stable ids in `index.html`, ARIA roles and states, deep links, the capture API, panels, keyboard shortcuts, reduced motion and the data validator. Components can be rewritten freely; as long as those contracts hold, the test stays green.

Real clicks go to the real interface, usually opened through a `?t=` deep link that skips the intro card. Their effects are read from ARIA attributes, the URL and the timeline's range input. Checks that need exact numbers run in a `?capture=1` twin. Dates and durations come from the app's own data modules, so the checks follow the data. Timing is measured inside the page, frame by frame.

### Running it

It needs the same setup as the pipeline (Playwright and Chromium, but no ffmpeg), with the app being served.

```bash
node smoke-test.js                                # every check, against http://localhost:8080
node smoke-test.js --base-url=http://localhost:9000
node smoke-test.js --only=boot,extinctions        # whole groups…
node smoke-test.js --only=time.deep-link,views    # …and/or single checks
node smoke-test.js --json > report.json           # machine-readable report; progress goes to stderr
node smoke-test.js --headed --slow                # watch it in a visible browser
node smoke-test.js --list                         # every check, with a one-line purpose
npm test -- --only=boot                           # through npm: options after --
```

| Option | Effect |
|---|---|
| `--base-url=<url>` | Where the app is served. The default is `http://localhost:8080`. |
| `--only=<a,b,…>` | Run only these groups and/or check ids. The group aliases `layers`, `accessibility`, `perf`, `extinction` and `view` are accepted too. |
| `--json` | Print a JSON report on stdout; progress goes to stderr. |
| `--headed` | Show the browser. |
| `--slow` | Add 120 ms of slow motion between actions and triple every timeout. Use it to watch, or on a busy machine. |
| `--list` | Print the checks and exit. |
| `--help`, `-h` | Print the usage and exit. |

### What it checks

| Group | Covers |
|---|---|
| `boot` | A clean first load; every stable id present once; the capture API and its `state()`; deep links that go straight to the scene; the intro dialog; no sideways scrolling from phone to desktop sizes, also after the window shrinks. |
| `time` | Deep links to a time; play and pause; playing through to the present; replay; speed; the play button; the URL following the scrubber. |
| `extinctions` | The hold on each mass extinction; `skipHold()`; scrubbing never starting a hold. |
| `views` | The globe loading; switching views, including rapidly; deep links to a view; every view painting at sample times; every view playing through a crisis. |
| `panels` | The Plates and Labels layers; Legend and Chapters; the sidebar drawer on a narrow screen; Help. |
| `species` | The species dialog opened from the sidebar and from the capture API; Escape closing it. |
| `keyboard` | Space, also during a hold; the arrow keys; the timeline range; 1, 2 and 3 for the views; shortcuts staying inert in dialogs and text fields. |
| `a11y` | Accessible names; the timeline range's label and value text; document structure; text alternatives for images and canvases; ARIA id references. |
| `motion` | With `prefers-reduced-motion`, `data-motion="reduced"` is set and the stage never shakes during an extinction. |
| `data` | `node ../validate-data.mjs --quiet`: errors fail, warnings are noted. |
| `performance` | Frame times over a few seconds of playback in each view. These are informational and never fail. |

Each check may take up to 60 s, and the data check up to 130 s. `--slow` triples both.

### Reading the results

Every check prints one of four statuses, sometimes with dimmed `·` notes beneath:

- `PASS`: the contract holds.
- `FAIL`: the check prints `expected:` and `found:`, plus a screenshot of each page it still had open. The screenshots go to a temporary `ltb-smoke-…` folder in the system temp directory, and its path is repeated at the end of the run.
- `SKIP`: the check can't run here. Typically that's the globe, when three.js can't be fetched or WebGL 2 is missing. A skip never fails the run.
- `INFO`: a measurement.

A note starting `warning —` flags something worth fixing that breaks no contract.

A clean console is part of every contract. A console error, an uncaught exception or a failed request to the app's own server fails the check it happens in. Each distinct error is charged once, to the first check that runs into it. There are two exceptions:

- A JavaScript module that 404s while the app imports it as optional, and carries on without it, is reported once as a warning.
- Failed requests to other origins, such as the CDN, don't count.

The run ends with `OK — N passed, 0 failed, …` or `FAILED — …`, followed by the ids that failed.

| Exit code | When |
|---|---|
| `0` | Nothing failed. SKIP and INFO never fail. |
| `1` | At least one check failed, or the app couldn't be reached. |
| `2` | Bad usage: an unknown option, or an unknown group or check in `--only`. |

The `--json` report is a single object with these fields:

- `ok`, `baseUrl`, `browser`, `startedAt` and `durationMs`.
- `summary`: `{ passed, failed, skipped, info, warnings }`.
- `warnings`: an array of `{ check, text }`.
- `screenshotDir`: `null` when nothing failed.
- `checks`: one entry per check, with `id`, `group`, `name`, `purpose`, `status` and `durationMs`, plus `notes`, `expected`, `found`, `reason`, `screenshots` and `console` when they apply.

If the app can't be reached, the report is `{ ok: false, baseUrl, error, checks: [] }`.

## Troubleshooting

Messages are quoted as `capture.js` prints them. Each failure line starts with `✗ <label>:`.

**`Dev server not reachable at http://localhost:8080: fetch failed`**
Nothing is serving the app at the base URL. Start `python3 -m http.server 8080` from the project root, or pass `--base-url=`. The smoke test reports the same problem as `The app is not reachable at …`.

**`ffmpeg is needed to encode clips (also with --no-gif) but could not be run`**
Install ffmpeg (see [Setup](#setup)). `--modals` and `--stills` work without it.

**`browserType.launch: Executable doesn't exist at …`**
Playwright's browser isn't installed, or Playwright has been updated since. Run `npx playwright install chromium` in this folder.

**`the app failed to boot: …`**
A module threw while the app started, for example a syntax error or a file saved half-way. The real error follows the colon. `node smoke-test.js --only=boot` helps narrow it down.

**`the app did not signal ready within 15 s`** or **`the map view did not come up within 15 s`**
The app never finished booting, or the base URL points at something other than this app. The second form comes from interface stills, which wait for `#app[data-view]`.

<!-- REVIEW after geometry lands -->
**`__capture.setView: the globe view did not come up (still showing map)`**
The globe couldn't start, so the capture stopped rather than film the flat map. The globe needs WebGL and loads three.js from `cdn.jsdelivr.net`, so check the network. Chromium is launched with `--use-gl=angle --enable-webgl --ignore-gpu-blocklist`. The smoke test's `views.globe-loads` check tells an offline machine (SKIP) from a broken globe (FAIL).

**`stopped at <t> Ma, before reaching <endMa> Ma: hit the <n> s cap (maxSec)`**
The scene plays for longer, in real time, than its cap. Raise `maxSec` or `speed`, shorten the span, or give the machine some room. Two variants end differently. `…: playback was paused` means something paused the clock mid-clip. `…: the story ended` means `endMa` is below 0.

**`⚠ <label>: <t> Ma is inside the <event> window, so the shot shows its crisis look`**
See [Choosing times near the Big Five](#choosing-times-near-the-big-five). Move the time, or set `posterInEvent: true` if the poster is meant to show the event. For `⚠ <id>: the clip ends inside the <event> window`, move `endMa` past the window.

**`no mass-extinction hold lasted <s> s within 15 s of playing from <t> Ma`**
An interface still with `inHoldSec` never reached a hold. Either its `?t=` is too far before the event (playback takes longer than 15 s to get there), or it already lies inside or after the window: scrubbing into a window never starts a hold. Choose a `?t=` a few Ma before the window.

**`__capture.openSpeciesModal: unknown species id "…"`** or **`the species dialog for … did not appear`**
The first means the id isn't in `js/data/species/*.js`. The second means the dialog didn't become visible within 5 s.

**`sequences.js has problems:`**
A catalog entry has a missing or malformed field, and the list says which. Nothing was captured.

**`Unknown modal showcase: modal-trilobite`**
Use the id without the `modal-` prefix that `--list` shows: `--modal trilobite`.

**`Unknown flag: --help`**
There is no `--help`. This page and the header of `capture.js` describe the usage.

**`⚠ GIF conversion skipped: …`**
ffmpeg's GIF pass failed, and its error follows. The WebM and poster were written. In strict mode the clip counts as failed.

**`Screencast produced no frames`**
The page painted nothing while recording, perhaps because its renderer stalled. Look for `[page error]` lines above it.

**`the page threw: …`**
An uncaught exception happened during the capture, and the file that capture was making is not written.

**`Target page, context or browser has been closed`**
The browser went away mid-capture: the run was interrupted (Ctrl-C), or Chromium crashed. The clip in progress is reported as failed, and its temporary frames are still cleaned up.

**An unexpected toast or card in a still**
Milestone toasts and era title cards belong to the story. They appear whenever the time sits in their window. Pick another time if one covers the subject.

**The context card is missing from a crisis frame**
This is by design. On viewports narrower than 1900 px, the context card steps aside while the extinction card is up.

**Choppy clips**
Clips are recorded in real time, so a busy machine paints fewer frames. The timing stays true, and a stall shows as a held frame. Close heavy apps and capture again.
