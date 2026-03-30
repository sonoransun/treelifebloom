// Application-wide constants

export const COLORS = {
  ocean: '#0a3d6b',
  oceanDeep: '#061e38',
  land: '#8B7355',
  landStroke: '#6B5335',
  background: '#0a0e1a',
  text: '#e0e0e0',
  textMuted: '#888',
  extinctionFlash: '#ff2222',
  gridLine: 'rgba(255, 255, 255, 0.08)',

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
  baseSpeedMaPerSec: 50,   // base rate: 50 million years per real second
  minSpeed: 0.25,
  maxSpeed: 4,
  extinctionSlowdown: 0.3, // speed multiplier during extinction events
  sidebarUpdateIntervalMs: 80, // throttle sidebar DOM updates
};

export const RENDER = {
  gridSpacingDeg: 30,
  speciesMarkerRadius: 4,
  speciesMarkerPulseAmplitude: 1.5,
  continentFillAlpha: 0.85,

  // 3D specific
  globeRadius: 1,
  continentElevation: 1.003,
  markerElevation: 1.01,
  starCount: 2000,
  autoRotateSpeed: 0.3,
};

export const LAYOUT = {
  sidebarWidth: 280,
  toolbarHeight: 48,
  controlsHeight: 96,
};
