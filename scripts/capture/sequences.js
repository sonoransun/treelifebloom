// Capture catalog. See capture.js for how each kind is produced.
//
// ── sequences ──────────────────────────────────────────────────────────────────────────────
// Each entry produces:
//   assets/animations/<NN>-<id>.webm  (animated clip, page-level: canvas + overlays)
//   assets/animations/<NN>-<id>.gif   (480-wide preview)
//   assets/screenshots/<NN>-<id>.png  (2× still at posterMa)
//
//   id, order      slug + filename prefix (chronological)
//   title, blurb   used by docs/notable-sequences.md and docs/sequences/<id>.md
//   view           'map' | 'globe' | 'tree'
//   panel          capture-mode chrome: 'clean' | 'sidebar' | 'clock' | 'full' (sidebar + context card)
//   plates, labels layer toggles (labels default on)
//   startMa, endMa play from startMa until the clock reaches endMa — and on until the aftermath of
//                  a mass extinction crossed on the way has faded — then pause there
//   speed          playback speed (default 1)
//   sweep          instead of playing, glide the clock evenly from startMa to endMa over
//                  sweepSec seconds — a time-lapse with no extinction holds (their windows are
//                  stepped over)
//   holdSec        seconds the clock holds on a mass extinction during the clip (default 3.5)
//   maxSec         safety cap on recording length (default 30); reaching it fails the clip
//   tailMs         linger on the paused last frame (default 600; sweeps 1200)
//   posterMa       time of the still (default: midpoint)
//   posterInEvent  the poster is meant to sit inside a mass-extinction window; any other shot that
//                  lands in one is reported, because it shows the crisis card and vignette
//   width, height  viewport in CSS pixels
//
// Times near the Big Five are chosen to survive wider event windows (js/data/extinctions.js:
// window = timeMa ± durationMa / 2): keep shots and clip ends a few Ma clear of an event unless
// the shot is about it.

const HD = { width: 1280, height: 720 };

export const sequences = [
  {
    id: 'hadean', order: 1,
    title: "Earth's Origin & Hadean",
    view: 'map', panel: 'full', plates: false,
    startMa: 4540, endMa: 4000, speed: 1.5, posterMa: 4480,
    ...HD,
    blurb: 'A molten newborn planet cools: the magma ocean crusts over, steam rains out, and the first seas appear.',
  },
  {
    id: 'goe', order: 2,
    title: 'Great Oxidation Event',
    view: 'map', panel: 'full', plates: false,
    startMa: 2500, endMa: 2200, posterMa: 2330,
    ...HD,
    blurb: "Cyanobacteria flood the air with oxygen: the methane haze clears, the land rusts red, and Earth freezes.",
  },
  {
    id: 'snowball', order: 3,
    title: 'Snowball Earth',
    view: 'globe', panel: 'clock', plates: false,
    startMa: 730, endMa: 632, posterMa: 690,
    ...HD,
    blurb: 'Ice reaches the tropics — twice — and then melts in a greenhouse rush that sets the stage for animals.',
  },
  {
    id: 'cambrian', order: 4,
    title: 'Cambrian Explosion',
    view: 'map', panel: 'full', plates: false,
    startMa: 540, endMa: 486, speed: 2, posterMa: 508,
    ...HD,
    blurb: 'Body plans burst onto the scene — markers bloom across the shelf seas and the sidebar fills in seconds.',
  },
  {
    // Ends before the Late Devonian extinction (372 Ma) so the clip stays about the forests.
    id: 'forests', order: 5,
    title: 'First Forests (Devonian)',
    view: 'map', panel: 'full', plates: false,
    startMa: 410, endMa: 374.5, speed: 1.5, posterMa: 377,
    ...HD,
    blurb: 'The continents turn green, the first forests pull carbon out of the sky, and lobe-finned fish edge toward the land.',
  },
  {
    // endMa 241: the clip runs on until the extinction's aftermath has faded (about there).
    id: 'permian', order: 6,
    title: 'End-Permian "Great Dying"',
    view: 'map', panel: 'full', plates: false,
    startMa: 262, endMa: 241, posterMa: 251.9, posterInEvent: true,
    ...HD,
    blurb: 'Siberian volcanism tips the planet into the worst extinction in the rock record.',
  },
  {
    // Starts clear of the end-Triassic window (201.4 Ma) even if that window is widened.
    id: 'jurassic', order: 7,
    title: 'Jurassic Dinosaurs',
    view: 'globe', panel: 'clock', plates: true,
    startMa: 198, endMa: 146, speed: 2, posterMa: 155,
    ...HD,
    blurb: 'Pangaea unzips along the young Atlantic while dinosaurs reach their giant-sized prime.',
  },
  {
    // endMa 61.5: the clip runs on until the impact's aftermath has faded (about there).
    id: 'kpg', order: 8,
    title: 'K-Pg Asteroid Impact',
    view: 'map', panel: 'full', plates: false,
    startMa: 70, endMa: 61.5, posterMa: 66.03, posterInEvent: true, holdSec: 4.5,
    ...HD,
    blurb: 'A 10-km asteroid strikes the Yucatán; the shock ring crosses the planet and the dinosaurs are gone.',
  },
  {
    // endMa just before the Holocene (0.0117 Ma), so the paused last frame is still the Pleistocene.
    id: 'pleistocene', order: 9,
    title: 'Ice Age & Megafauna',
    view: 'map', panel: 'full', plates: false,
    startMa: 2.58, endMa: 0.014, speed: 2.5, posterMa: 0.021,
    ...HD,
    blurb: 'Ice sheets pulse across the north while mammoths, sabre-tooths and giant sloths roam the continents.',
  },
  {
    id: 'hominin', order: 10,
    title: 'Hominin Emergence',
    view: 'map', panel: 'full', plates: false,
    startMa: 6, endMa: 0, speed: 4, posterMa: 0.045, maxSec: 20,
    ...HD,
    blurb: 'From upright apes in Africa to a species that peoples every continent — the last six million years.',
  },
  {
    id: 'tree', order: 11,
    title: 'The Tree Blooms',
    view: 'tree', panel: 'clock', plates: false,
    startMa: 4540, endMa: 0, sweep: true, sweepSec: 14, posterMa: 0,
    ...HD,
    blurb: 'All of life in one time-lapse: the tree grows outward from a single root to the living rim of today.',
  },
  {
    id: 'drift', order: 12,
    title: 'Pangaea to Present',
    view: 'globe', panel: 'clock', plates: false,
    startMa: 300, endMa: 0, sweep: true, sweepSec: 12, posterMa: 250,
    ...HD,
    blurb: 'Three hundred million years of continental drift: Pangaea assembles, splits, and becomes the map we know.',
  },
];

// ── modal showcases ────────────────────────────────────────────────────────────────────────
// One 2× still each at assets/screenshots/modal-<id>.png with the species dialog open.
//   speciesId matches an id in js/data/species/*.js; atMa is the time shown behind the dialog
//   (keep it outside the mass-extinction windows, or the crisis card shows behind the dialog).
export const modalShowcases = [
  {
    id: 'trilobite', speciesId: 'trilobite', atMa: 500, width: 1280, height: 800,
    blurb: 'Paleozoic icon — the first complex arthropods to leave a rich fossil record.',
  },
  {
    // The fossil's age; 3 Ma before the Late Devonian extinction (372 Ma).
    id: 'tiktaalik', speciesId: 'tiktaalik', atMa: 375, width: 1280, height: 800,
    blurb: 'The "fishapod" — one foot still in the water, one plan for the land.',
  },
  {
    id: 'tyrannosaurus', speciesId: 'tyrannosaurus', atMa: 67, width: 1280, height: 800,
    blurb: 'The last apex theropod before the K-Pg impact wiped the slate clean.',
  },
  {
    id: 'mammoth', speciesId: 'mammoth', atMa: 0.05, width: 1280, height: 800,
    blurb: 'Ice Age megafauna — survived glacial cycles until the late-Pleistocene extinctions.',
  },
  {
    id: 'homo_sapiens', speciesId: 'homo_sapiens', atMa: 0.05, width: 1280, height: 800,
    blurb: 'The species doing the watching, 50,000 years ago and counting.',
  },
];

// ── stills ─────────────────────────────────────────────────────────────────────────────────
// 2× screenshots of the REAL UI (no capture mode), opened on a deep link.
//   query        URL query string ('' = fresh load, which shows the intro card)
//   out          path relative to the project root
//   settleMs     wait once the app has booted and shows the view in the query (default 1800)
//   inHoldSec    then play from the query's ?t= and shoot this many seconds into the first
//                mass-extinction hold (fails if none begins); pick a ?t= a few Ma before the event
//   eval         optional JS to run in the page, then afterEvalMs (default 800) before the shot
export const stills = [
  { id: 'hero', query: '?t=95', out: 'assets/life-tree-bloom.png', width: 1512, height: 860 },
  { id: 'intro', query: '', out: 'assets/screenshots/ui-intro.png', width: 1512, height: 860 },
  { id: 'globe', query: '?t=152&view=globe&plates=1', out: 'assets/screenshots/ui-globe.png', width: 1512, height: 860, settleMs: 3200 },
  { id: 'tree', query: '?t=0&view=tree', out: 'assets/screenshots/ui-tree.png', width: 1512, height: 860, settleMs: 2600 },
  // 5 Ma before the end-Permian extinction (251.9 Ma): before its window however wide it is made.
  { id: 'extinction', query: '?t=257', inHoldSec: 2.5, out: 'assets/screenshots/ui-extinction.png', width: 1512, height: 860, settleMs: 1000 },
  { id: 'present', query: '?t=0', out: 'assets/screenshots/ui-present.png', width: 1512, height: 860 },
  { id: 'phone', query: '?t=320', out: 'assets/screenshots/ui-phone.png', width: 390, height: 844 },
];

export const findSequence = (id) => sequences.find((s) => s.id === id);
export const findModalShowcase = (id) => modalShowcases.find((m) => m.id === id);
export const findStill = (id) => stills.find((s) => s.id === id);
