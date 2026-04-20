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

  // Kingdom colors for species markers/sidebar
  kingdom: {
    prokaryote: '#00cccc',
    eukaryote: '#00aaaa',
    bacteria: '#00cccc',
    plant: '#44bb44',
    invertebrate: '#558888',
    arthropod: '#cc8844',
    fish: '#4488cc',
    amphibian: '#668844',
    reptile: '#996633',
    synapsid: '#aa7744',
    mammal: '#dd8833',
    bird: '#ccaa33',
    primate: '#cc4444',
    hominin: '#ee3333',
    event: '#ffdd44',
  }
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
