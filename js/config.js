// Application-wide constants

export const COLORS = {
  ocean: '#062a4a',
  oceanDeep: '#041628',
  land: '#8B7355',
  landStroke: '#c9a86c',
  background: '#0a0e1a',
  text: '#e0e0e0',
  textMuted: '#888',
  extinctionFlash: '#ff2222',
  gridLine: 'rgba(255, 255, 255, 0.08)',

  // Plate boundary colors by type
  boundary: {
    divergent: '#ff6644',
    convergent: '#4488ff',
    transform: '#aacc44',
  },

  // Clade colors for species markers/sidebar. Keyed on taxonomy.classOrPhylum
  // (plus kingdom/domain fallbacks — see util/taxonomy.js::cladeColor).
  clade: {
    // Microbes
    Bacteria:          '#00cccc',
    Cyanobacteria:     '#00c0a8',
    Archaea:           '#00aaaa',
    Methanobacteria:   '#00aaaa',

    // Stem / protist eukaryotes
    Eukaryota:         '#7fbbbb',

    // Kingdom-level fallbacks
    Plantae:           '#44bb44',
    Fungi:             '#aa66bb',
    Animalia:          '#888899',

    // Algae & plant clades
    Rhodophyta:        '#cc4477',
    Ascomycota:        '#aa66bb',
    Embryophyta:       '#44bb44',

    // Basal animals
    Porifera:          '#778877',
    Cnidaria:          '#55aa99',

    // Lophotrochozoa
    Mollusca:          '#668888',
    Brachiopoda:       '#669090',
    Annelida:          '#6a7e80',
    Priapulida:        '#7e8f92',

    // Ecdysozoa
    Arthropoda:        '#cc8844',

    // Deuterostomes (non-chordate)
    Echinodermata:     '#bbaa55',
    Hemichordata:      '#9999aa',

    // Ediacaran / Cambrian stem animals without a modern phylum
    'Metazoa-stem':    '#558888',

    // Fish-grade chordates — all share the blue family
    Chordata:          '#5aa0d8',
    Agnatha:           '#4488cc',
    Pteraspidomorphi:  '#4488cc',
    Conodonta:         '#3a7ab8',
    Placodermi:        '#3568a0',
    Acanthodii:        '#4488cc',
    Chondrichthyes:    '#4488cc',
    Actinopterygii:    '#4488cc',
    Sarcopterygii:     '#3f78b6',

    // Tetrapod grades & clades
    Amphibia:          '#668844',
    Reptilia:          '#996633',
    Synapsida:         '#aa7744',
    Dinosauria:        '#b88844',
    Pterosauria:       '#7a6040',
    Aves:              '#ccaa33',
    Mammalia:          '#dd8833',
  },

  // Narrower overrides consulted before classOrPhylum. Lets us keep the
  // "apes are visibly special" color cue near the end of the timeline without
  // bloating the classOrPhylum palette.
  cladeOverride: {
    // order-level
    Primates:          '#cc4444',
    // family-level
    Hominidae:         '#ee3333',
  },
};

export const TIMING = {
  startTimeMa: 4000,       // animation starts at 4 billion years ago
  endTimeMa: 0,            // ends at present
  baseSpeedMaPerSec: 15,   // base rate: 15 million years per real second
  minSpeed: 0.25,
  maxSpeed: 4,
  extinctionSlowdown: 0.3, // speed multiplier during extinction events
  extinctionPauseSeconds: 2, // hard pause when entering an extinction so the overlay can be read
  sidebarUpdateIntervalMs: 80, // throttle sidebar DOM updates
  legendUpdateIntervalMs: 500, // throttle legend-tree rebuild (less time-critical than sidebar)
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

  // Terrain relief (always-on). Drop terrainSubdivLevels to 2 if perf < 60fps.
  terrainSubdivLevels: 3,
  terrainBaseAmplitude: 0.040,
  terrainProtoAmplitude: 0.075,
  terrainBaseFreq: 5.0,
  terrainProtoFreq: 9.0,
  terrainBaseOctaves: 4,
  terrainProtoOctaves: 5,
  terrainProtoJaggedness: 0.6,
  terrainProtoStartMa: 1000,
  terrainProtoFullMa: 3000,
  terrainHotTintColor: '#a83820',
  terrainSnowColor: '#e8e8ec',
  terrainHighlandColor: '#5a4530',
  terrainLowlandColor: '#3d4a2e',
  terrainCoastTaper: 0.3,

  // Plate boundary 3D (toggle-gated). Heights in sphere-radius units.
  boundaryRidgeWidthDeg: 1.8,
  boundaryConvergentApex: 1.18,
  boundaryConvergentBaseColor: '#5d6f9a',
  boundaryConvergentApexColor: '#c4d4e8',
  // Divergent: twin raised ridges (lip) with a glowing axial canyon floor
  // between them. Both above ocean so they're visible above the opaque sea.
  boundaryDivergentTrench: 1.04,
  boundaryDivergentLip: 1.10,
  boundaryDivergentInnerColor: '#ff4422',
  boundaryDivergentLipColor: '#3a4658',
  boundaryTransformUpper: 1.04,
  boundaryTransformLower: 0.98,
  boundaryTransformUpperColor: '#9aac6a',
  boundaryTransformLowerColor: '#5a6438',

  // 2D terrain hillshade (always-on). Reuses terrain* config above and the
  // terrainProfileForAge ramp so the 2D map and 3D globe show consistent peaks.
  view2dHillshadeSpacing: 14,
  view2dHillshadeBlobRadius: 11,
  view2dHillshadeAlpha: 0.20,
  view2dHighlandThreshold: 0.25,
  view2dHighlandBlobRadius: 7,
  view2dHighlandAlpha: 0.45,
  view2dSnowThreshold: 0.55,
  view2dSnowBlobRadius: 4.5,
  view2dSnowAlpha: 0.85,
  view2dHotPeakColor: '#ff5530',

  // 2D plate boundaries (toggle-gated). Layered strokes for "astronomical" contrast.
  view2dBoundaryGlow: 6,
  view2dBoundaryAlpha: 1.0,
  view2dConvergentShadowWidth: 9,
  view2dConvergentBaseWidth: 6,
  view2dConvergentSnowWidth: 2.0,
  view2dConvergentToothSize: 11,
  view2dConvergentToothSpacing: 55,
  view2dDivergentRailOffset: 3.5,
  view2dDivergentRailWidth: 3,
  view2dDivergentCoreWidth: 2.0,
  view2dTransformRailWidth: 4,
  view2dTransformRailOffset: 4,
};

export const LAYOUT = {
  sidebarWidth: 280,
  toolbarHeight: 48,
  controlsHeight: 96,
};

// Atmospheric visual response (haze, sky tint).
// Modern Earth: ~15 °C, ~280 ppm CO₂, ~21% O₂. Deviations drive overlay color.
export const ATMOSPHERE = {
  modernTempC: 15,
  modernCo2Ppm: 280,
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
  ambientLow: 0.22,             // dimmer ambient lets terminator show
  rimLightStrength: 0.18,
};

// Polar glaciation rendering.
export const GLACIATION = {
  capColor: '#f0f8ff',
  capEdgeColor: '#dfe8ff',
  // Latitude (degrees from pole) at which the cap edge sits, given temperature.
  // tempC = -5 → cap reaches ~equator (lat radius 80); tempC = 25 → no caps.
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
