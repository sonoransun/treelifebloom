// Procedural terrain biome coloring, shared by the 2D map and 3D globe.
//
// Turns (latitude, relative elevation, a per-point noise sample) + a per-frame
// climate snapshot into a surface color: barren rock on early Earth, greening
// once land plants evolve (~470 Ma), arid subtropical deserts, and sub-polar
// tundra near the ice caps. Composes UNDER the views' existing elevation
// (snow/highland), hot-crust, and extinction tints. Pure + deterministic.

import { RENDER_EXTRA } from '../config.js';
import { hexToRgb, clamp } from './colorMix.js';
import { getTemperatureAtTime, getOxygenAtTime, getCO2AtTime } from '../data/atmosphere.js';
import { getGlaciation } from '../data/glaciation.js';

// Palette parsed once at module load — biomeColorAt runs per surface point per frame,
// so the hot path mixes numerically instead of round-tripping rgb() strings.
const PAL = RENDER_EXTRA.biome
  ? {
      rock: hexToRgb(RENDER_EXTRA.biome.rock),
      desert: hexToRgb(RENDER_EXTRA.biome.desert),
      grass: hexToRgb(RENDER_EXTRA.biome.grass),
      forest: hexToRgb(RENDER_EXTRA.biome.forest),
      boreal: hexToRgb(RENDER_EXTRA.biome.boreal),
      tundra: hexToRgb(RENDER_EXTRA.biome.tundra),
    }
  : null;

function smoothstep(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Fraction of land covered by vegetation at a given time, 0..1.
 * 0 before land plants (vegStartMa); ramps up as mosses → forests appear,
 * then trends lusher toward the present, modulated by oxygen (proxy for
 * primary productivity, so the Carboniferous reads green and lush).
 */
export function vegetationLevel(timeMa, o2Pct, co2Ppm) {
  const B = RENDER_EXTRA.biome;
  if (timeMa >= B.vegStartMa) return 0; // barren rock world

  let veg;
  if (timeMa >= B.vegForestMa) {
    // 470 → 385 Ma: bryophytes/early vascular plants spreading (partial cover).
    veg = 0.55 * smoothstep((B.vegStartMa - timeMa) / (B.vegStartMa - B.vegForestMa));
  } else {
    // After first forests: trend toward full cover at the present.
    veg = 0.55 + 0.45 * clamp((B.vegForestMa - timeMa) / B.vegForestMa, 0, 1);
  }
  // Productivity factor from O₂ (gentle): high-O₂ greenhouse forests lusher.
  const prod = clamp(0.7 + (o2Pct || 0) / 30, 0.7, 1.1);
  return clamp(veg * prod, 0, 1);
}

/** One cheap snapshot per frame, passed to biomeColorAt for every point. */
export function biomeClimate(timeMa) {
  return {
    tempC: getTemperatureAtTime(timeMa),
    veg: vegetationLevel(timeMa, getOxygenAtTime(timeMa), getCO2AtTime(timeMa)),
    glac: getGlaciation(timeMa),
  };
}

/**
 * Biome color for one surface point.
 * @param latDeg  latitude in degrees (-90..90)
 * @param relAlt  relative elevation, ~[-1, 1] (higher = rockier)
 * @param climate result of biomeClimate(timeMa)
 * @param mottle  per-point noise in [-1, 1] for patchiness (caller reuses its relief noise)
 * @returns an "rgb(r,g,b)" string, or null if biomes are disabled (caller falls back).
 */
export function biomeColorAt(latDeg, relAlt, climate, mottle = 0) {
  const B = RENDER_EXTRA.biome;
  if (!B || !B.enabled) return null;

  const absLat = Math.abs(latDeg);

  // Ice fringe: poleward of (90 - capRadius) is ice; tundra ramps in over a band.
  const cap = latDeg >= 0 ? climate.glac.northCapLatRadius : climate.glac.southCapLatRadius;
  const iceEdgeLat = 90 - cap;
  const tundraBand = 15;
  const iceProx = clamp((absLat - (iceEdgeLat - tundraBand)) / tundraBand, 0, 1);

  // Warmth: 1 at the equator → 0 toward the poles, nudged by the global anomaly.
  const tempAnom = (climate.tempC - 15) / 25;
  const warmth = clamp(1 - absLat / 75 + tempAnom * 0.15, 0, 1);

  // Aridity: subtropical desert belt, stronger when hot, jittered by noise.
  let aridity = clamp(1 - Math.abs(absLat - B.desertLatCenter) / B.desertLatWidth, 0, 1);
  aridity *= clamp(0.5 + (climate.tempC - 12) / 30, 0, 1.2);
  aridity = clamp(aridity + mottle * 0.15, 0, 1);

  // Greenness: vegetation gated by climate, dryness, ice, warmth, and elevation.
  let green = climate.veg * (1 - aridity) * (1 - iceProx) * (0.5 + 0.5 * warmth);
  green *= clamp(1 - Math.max(0, relAlt) * 0.5, 0.3, 1); // rockier up high
  green = clamp(green + mottle * 0.12 * climate.veg, 0, 1);

  // Compose: rock → desert (arid) → vegetation (warmth picks shade) → tundra fringe.
  // Numeric mixing rounds each channel per step exactly like mixColors did, so the
  // output stays byte-identical to the former mixColors chain (pinned in tests).
  const veg = warmth > 0.66 ? PAL.forest : warmth > 0.33 ? PAL.grass : PAL.boreal;
  const tArid = aridity * (1 - iceProx);
  let r = Math.round(PAL.rock.r + (PAL.desert.r - PAL.rock.r) * tArid);
  let g = Math.round(PAL.rock.g + (PAL.desert.g - PAL.rock.g) * tArid);
  let b = Math.round(PAL.rock.b + (PAL.desert.b - PAL.rock.b) * tArid);
  r = Math.round(r + (veg.r - r) * green);
  g = Math.round(g + (veg.g - g) * green);
  b = Math.round(b + (veg.b - b) * green);
  const tIce = iceProx * 0.8;
  r = Math.round(r + (PAL.tundra.r - r) * tIce);
  g = Math.round(g + (PAL.tundra.g - g) * tIce);
  b = Math.round(b + (PAL.tundra.b - b) * tIce);

  // Subtle lightness grain for texture.
  if (mottle !== 0) {
    const grain = mottle > 0 ? 255 : 0;
    const tGrain = Math.abs(mottle) * 0.06;
    r = Math.round(r + (grain - r) * tGrain);
    g = Math.round(g + (grain - g) * tGrain);
    b = Math.round(b + (grain - b) * tGrain);
  }

  return `rgb(${r},${g},${b})`;
}
