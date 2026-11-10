// Application-wide constants: every tunable lives here.

// ---------------------------------------------------------------------------------------------
// Life groups — the colour system for species markers, sidebar rows, the legend and Tree branches.
//
// Eight hue families in phylogenetic order, one per broad branch of life. In THIS order the eight
// family hues pass the dataviz palette validator on every app surface (dark mode: lightness band,
// chroma floor, colour-vision-deficiency separation of neighbours ≥ 8, normal-vision separation of
// neighbours ≥ 15, contrast ≥ 3:1) — so stacked bars, legends and neighbouring tree branches,
// which all follow this order, stay tellable apart. Do not reorder or re-colour without re-running
// the validator.
//
// On a map any two markers can sit side by side, and no eight hues are pairwise safe for every
// kind of colour vision, so colour is never the only cue: every family also has its own marker
// `glyph`, and species are named on hover, in the sidebar and in the legend.
//
// Categories inside a family share the hue and differ by lightness. `category` on a species entry
// must be one of the category ids below.
// ---------------------------------------------------------------------------------------------
export const LIFE_GROUPS = [
  {
    id: 'microbes', label: 'Microbes', color: '#9085e9', glyph: 'dot',
    blurb: 'Single-celled life: bacteria, archaea and protists',
    categories: [
      { id: 'bacteria', label: 'Bacteria', color: '#9085e9' },
      { id: 'archaea', label: 'Archaea', color: '#b6aef2' },
      { id: 'protist', label: 'Protists & early eukaryotes', color: '#7566dd' },
    ],
  },
  {
    id: 'plants', label: 'Plants, algae & fungi', color: '#008300', glyph: 'leaf',
    blurb: 'Seaweeds to forests — and the fungi that made soil with them',
    categories: [
      { id: 'alga', label: 'Algae', color: '#4fae4f' },
      { id: 'plant', label: 'Land plants', color: '#008300' },
      { id: 'fungus', label: 'Fungi & lichens', color: '#86c686' },
    ],
  },
  {
    id: 'invertebrates', label: 'Invertebrates', color: '#d55181', glyph: 'star',
    blurb: 'Sponges, corals, worms, molluscs, echinoderms and enigmatic early animals',
    categories: [
      { id: 'invertebrate', label: 'Soft-bodied & shelly animals', color: '#d55181' },
      { id: 'mollusk', label: 'Molluscs', color: '#e792b0' },
    ],
  },
  {
    id: 'arthropods', label: 'Arthropods', color: '#c98500', glyph: 'hex',
    blurb: 'Jointed-legged animals: trilobites, sea scorpions, insects',
    categories: [
      { id: 'arthropod', label: 'Arthropods', color: '#c98500' },
    ],
  },
  {
    id: 'fishes', label: 'Fishes', color: '#199e70', glyph: 'oval',
    blurb: 'Backboned animals of the water, from jawless swimmers to sharks',
    categories: [
      { id: 'fish', label: 'Fishes & early chordates', color: '#199e70' },
    ],
  },
  {
    id: 'reptiles', label: 'Amphibians, reptiles & birds', color: '#d95926', glyph: 'triangle',
    blurb: 'From the first walkers on land to dinosaurs and their living heirs, the birds',
    categories: [
      { id: 'amphibian', label: 'Amphibians & early tetrapods', color: '#a8431a' },
      { id: 'reptile', label: 'Reptiles', color: '#c04e1f' },
      { id: 'marine_reptile', label: 'Marine reptiles', color: '#cf6a41' },
      { id: 'dinosaur', label: 'Dinosaurs', color: '#d95926' },
      { id: 'pterosaur', label: 'Pterosaurs', color: '#ec8f68' },
      { id: 'bird', label: 'Birds', color: '#f5b99d' },
    ],
  },
  {
    id: 'mammals', label: 'Synapsids & mammals', color: '#3987e5', glyph: 'square',
    blurb: 'The synapsid line — sail-backs, proto-mammals and mammals',
    categories: [
      { id: 'synapsid', label: 'Early synapsids', color: '#2b6cc0' },
      { id: 'mammal', label: 'Mammals', color: '#3987e5' },
    ],
  },
  {
    id: 'primates', label: 'Primates & humans', color: '#e66767', glyph: 'ring',
    blurb: 'Our own twig of the tree',
    categories: [
      { id: 'primate', label: 'Primates', color: '#e66767' },
      { id: 'hominin', label: 'Hominins', color: '#f6a5a5' },
    ],
  },
];

// Flat lookups derived from LIFE_GROUPS. Null-prototype objects, so ids such as 'constructor' or
// 'toString' are simply unknown categories instead of Object.prototype members.
const kingdom = Object.create(null);
const categoryInfo = Object.create(null);
for (const group of LIFE_GROUPS) {
  for (const cat of group.categories) {
    kingdom[cat.id] = cat.color;
    categoryInfo[cat.id] = { ...cat, group };
  }
}
// Legacy category ids still accepted so older data keeps rendering; new entries must not use them.
const LEGACY_CATEGORY_ALIASES = { prokaryote: 'bacteria', eukaryote: 'protist', event: 'protist' };
for (const [legacy, target] of Object.entries(LEGACY_CATEGORY_ALIASES)) {
  kingdom[legacy] = kingdom[target];
  categoryInfo[legacy] = categoryInfo[target];
}

// The neutral fallback: every unknown category shares this one group (so grouping by the group
// object keeps them together), and each unknown id always gets the same record.
const OTHER_GROUP = { id: 'other', label: 'Other', color: '#9aa3b5', glyph: 'dot', categories: [] };
const fallbackInfo = new Map();

/** { id, label, color, group: {id, label, color, glyph, ...} } for a category id (or a neutral fallback). */
export function getCategoryInfo(categoryId) {
  const known = categoryInfo[categoryId];
  if (known) return known;
  let info = fallbackInfo.get(categoryId);
  if (!info) {
    info = { id: categoryId, label: categoryId, color: OTHER_GROUP.color, group: OTHER_GROUP };
    fallbackInfo.set(categoryId, info);
  }
  return info;
}

export const COLORS = {
  ocean: '#062a4a',
  oceanDeep: '#041628',
  land: '#8B7355',
  landStroke: '#c9a86c',
  background: '#070b14',
  text: '#f1ece1',
  textMuted: '#7f8aa3',
  extinctionFlash: '#ff2222',
  gridLine: 'rgba(255, 255, 255, 0.08)',

  // Plate boundary colours by type
  boundary: {
    divergent: '#ff7a52',
    convergent: '#5a9bff',
    transform: '#b6d44a',
  },

  // category id → colour (derived from LIFE_GROUPS)
  kingdom,
};

// Typography for canvas renderers (mirrors the CSS custom properties in css/styles.css).
export const FONTS = {
  display: "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Cambria, Georgia, serif",
  ui: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

export const TIMING = {
  startTimeMa: 4540,            // the story starts with the formation of the Earth
  endTimeMa: 0,                 // …and ends at the present
  baseSpeedMaPerSec: 15,        // base rate before a period's temporalWeight is applied
  minSpeed: 0.25,
  maxSpeed: 4,
  extinctionSlowdown: 0.3,      // speed multiplier while crossing a mass-extinction window
  extinctionPauseSeconds: 6,    // hold on the leading edge of a mass extinction (skippable)
  extinctionAftermathSeconds: 3, // visual fade-out after the window has passed
  nudgeSeconds: 2,              // arrow keys step this many seconds of 1× playback
  sidebarUpdateIntervalMs: 100, // throttle for DOM-heavy panels
};

export const RENDER = {
  gridSpacingDeg: 30,
  speciesMarkerRadius: 4,
  speciesMarkerPulseAmplitude: 1.5,
  continentFillAlpha: 1.0,
  fractalDepth: 3,
  fractalAmplitude: 0.15,
  landStrokeWidth: 1.8,

  // Plate boundaries
  boundaryElevation: 1.003,

  // 3D specific
  globeRadius: 1,
  continentElevation: 1.025,
  continentSideColor: '#3d2e1a',
  markerElevation: 1.035,
  starCount: 2000,
  autoRotateSpeed: 0.3,
};

// Mirrors the grid in css/styles.css (--toolbar-h, --sidebar-w); the timeline footer sizes itself
// (about 131px on desktop, 107px on phones).
export const LAYOUT = {
  sidebarWidth: 328,
  toolbarHeight: 52,
};

// Atmospheric visual response (haze, sky tint).
// Modern Earth: ~15 °C, ~280 ppm CO₂ (pre-industrial), ~21% O₂. Deviations drive overlay colour.
export const ATMOSPHERE = {
  modernTempC: 15,
  modernCo2Ppm: 280,
  modernO2Pct: 21,
  hazeMaxAlpha: 0.45,
  hotColor: '#c66020',          // sepia/burnt orange — hot greenhouse
  coldColor: '#88aaff',         // pale blue — icehouse
  highCo2Color: '#b08050',      // brown methane-tinged haze
  lowO2Color: '#445566',        // grey-blue dim, low-O₂ atmosphere
  // 3D atmosphere shell
  shellRadiusFactor: 1.04,
  shellOpacityMin: 0.12,
  shellOpacityMax: 0.45,
  // Day/night terminator (3D)
  ambientLow: 0.22,
  rimLightStrength: 0.18,
};

// Polar glaciation rendering.
export const GLACIATION = {
  capColor: '#f0f8ff',
  capEdgeColor: '#dfe8ff',
  // Latitude (degrees from pole) at which the cap edge sits, given temperature.
  coldThresholdC: 0,
  warmThresholdC: 22,
  maxCapLatRadius: 70,
};

// Continent latitude shading: poles → cool, tropics → warm.
export const RENDER_EXTRA = {
  continentColorByLatitude: true,
  latitudePalette: [
    { lat: -90, color: '#c8d4dc' },
    { lat: -60, color: '#9c8e6c' },
    { lat: -30, color: '#8b7355' },
    { lat:   0, color: '#6b7c45' },
    { lat:  30, color: '#8b7355' },
    { lat:  60, color: '#9c8e6c' },
    { lat:  90, color: '#c8d4dc' },
  ],
  latitudeBlend: 0.55, // how strongly to lean toward latitude palette vs. continent.color
};
