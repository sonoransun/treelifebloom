// Capture sequence catalog. Each entry produces:
//   - assets/animations/<NN>-<id>.webm  (animated clip)
//   - assets/animations/<NN>-<id>.gif   (poster GIF, 480w/15fps)
//   - assets/screenshots/<NN>-<id>.png  (still poster at posterAt fraction of duration)
//
// Fields:
//   id              short slug; selects the sequence on the CLI
//   order           prefix in output filenames (chronological by Ma)
//   title           display title (used in docs/sequences/<id>.md)
//   view            '2d' | '3d' — which renderer to capture
//   panel           'clean' | 'sidebar' | 'clock' | 'full' — capture-mode chrome flag
//   plates          true to enable the plate tectonic overlay (default false)
//   startMa, endMa  scrub to startMa, then play; clip ends near endMa or after durationSec
//   durationSec     real seconds to record (extinction pauses add up to 2s automatically)
//   posterAt        0..1 — fraction of duration at which to capture the still PNG
//   fps             recording frame rate
//   width, height   viewport dimensions in CSS pixels (deviceScaleFactor=2 for crispness)
//   blurb           one-sentence "why it matters" — used in docs/notable-sequences.md
//   crossesExtinction  true if this sequence will hit the 2-sec auto-pause; adds buffer

export const sequences = [
  {
    id: 'hadean', order: 1,
    title: "Earth's Origin & Hadean",
    view: '2d', panel: 'sidebar', plates: false,
    startMa: 4540, endMa: 4000,
    durationSec: 6, posterAt: 0.6, fps: 30,
    width: 1280, height: 720,
    blurb: 'Molten newborn planet — no continents, no life, just a hot rock cooling under a young sun.',
  },
  {
    id: 'goe', order: 2,
    title: 'Great Oxygenation Event',
    view: '2d', panel: 'sidebar', plates: false,
    startMa: 2500, endMa: 2200,
    durationSec: 8, posterAt: 0.5, fps: 30,
    width: 1280, height: 720,
    blurb: "Cyanobacteria peak, the methane haze clears, and Earth's atmosphere irreversibly flips toward oxygen.",
  },
  {
    id: 'snowball', order: 3,
    title: 'Snowball Earth',
    view: '2d', panel: 'sidebar', plates: false,
    startMa: 720, endMa: 635,
    durationSec: 8, posterAt: 0.55, fps: 30,
    width: 1280, height: 720,
    blurb: 'Polar ice caps reach the equator — a blue-and-white planet during the Cryogenian glaciations.',
  },
  {
    id: 'cambrian', order: 4,
    title: 'Cambrian Explosion',
    view: '2d', panel: 'sidebar', plates: true,
    startMa: 540, endMa: 480,
    durationSec: 12, posterAt: 0.55, fps: 30,
    width: 1280, height: 720,
    blurb: 'Body plans burst onto the scene — the sidebar fills with new categories in seconds.',
  },
  {
    id: 'forests', order: 5,
    title: 'First Forests (Devonian)',
    view: '2d', panel: 'sidebar', plates: true,
    startMa: 410, endMa: 360,
    durationSec: 10, posterAt: 0.5, fps: 30,
    width: 1280, height: 720,
    blurb: 'Land turns green, fish crawl out, oxygen surges as the first forests take hold.',
  },
  {
    id: 'permian', order: 6,
    title: 'End-Permian "Great Dying"',
    view: '2d', panel: 'sidebar', plates: true,
    startMa: 256, endMa: 250,
    durationSec: 8, posterAt: 0.5, fps: 30,
    width: 1280, height: 720,
    crossesExtinction: true,
    blurb: 'The worst extinction in the rock record — 96% of marine species lost in under a million years.',
  },
  {
    id: 'jurassic', order: 7,
    title: 'Jurassic Dinosaurs',
    view: '2d', panel: 'sidebar', plates: true,
    startMa: 200, endMa: 145,
    durationSec: 10, posterAt: 0.5, fps: 30,
    width: 1280, height: 720,
    blurb: 'Pangaea splits, oceans flood the gaps, and dinosaur diversity reaches its peak.',
  },
  {
    id: 'kpg', order: 8,
    title: 'K-Pg Asteroid Impact',
    view: '2d', panel: 'sidebar', plates: true,
    startMa: 67, endMa: 64,
    durationSec: 7, posterAt: 0.35, fps: 30,
    width: 1280, height: 720,
    crossesExtinction: true,
    blurb: 'A 10-km asteroid streaks across the sky and the non-avian dinosaurs vanish from the sidebar.',
  },
  {
    id: 'pleistocene', order: 9,
    title: 'Ice Age & Megafauna',
    view: '2d', panel: 'sidebar', plates: true,
    startMa: 2.5, endMa: 0.012,
    durationSec: 9, posterAt: 0.5, fps: 30,
    width: 1280, height: 720,
    blurb: 'Polar caps expand, mammoths and dire wolves spread across continents reshaped by ice.',
  },
  {
    id: 'hominin', order: 10,
    title: 'Hominin Emergence',
    view: '2d', panel: 'sidebar', plates: true,
    startMa: 6, endMa: 0,
    durationSec: 8, posterAt: 0.6, fps: 30,
    width: 1280, height: 720,
    blurb: 'Ardipithecus → Homo erectus → Neanderthals → Homo sapiens, on the heels of the megafauna.',
  },
];

// Modal showcase stills. Each produces a single PNG at assets/screenshots/modal-<id>.png
// with the species-detail modal open on top of a 2D map at the specified time.
//
// Fields:
//   id         output slug
//   speciesId  matches id in js/data/species.js
//   atMa       time to scrub to before opening the modal
//   plates     whether to show the plate overlay behind the modal
//   width, height  viewport
//   blurb      caption for docs/notable-sequences.md
export const modalShowcases = [
  {
    id: 'trilobite', speciesId: 'trilobite', atMa: 500, plates: true,
    width: 1280, height: 800,
    blurb: 'Paleozoic icon — the first complex arthropods to leave a rich fossil record.',
  },
  {
    id: 'tiktaalik', speciesId: 'tiktaalik', atMa: 370, plates: true,
    width: 1280, height: 800,
    blurb: 'The "fishapod" — one foot still in the water, one plan for the land.',
  },
  {
    id: 'tyrannosaurus', speciesId: 'tyrannosaurus', atMa: 67, plates: true,
    width: 1280, height: 800,
    blurb: 'The last apex theropod before the K-Pg impact wiped the slate clean.',
  },
  {
    id: 'mammoth', speciesId: 'mammoth', atMa: 0.5, plates: true,
    width: 1280, height: 800,
    blurb: 'Ice Age megafauna — survived glacial cycles until the late-Pleistocene extinctions.',
  },
  {
    id: 'homo_sapiens', speciesId: 'homo_sapiens', atMa: 0.05, plates: true,
    width: 1280, height: 800,
    blurb: 'The species doing the watching, 50,000 years after its own origin.',
  },
];

export function findSequence(id) {
  return sequences.find((s) => s.id === id);
}

export function findModalShowcase(id) {
  return modalShowcases.find((m) => m.id === id);
}
