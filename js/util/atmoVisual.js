// Translates an atmosphere snapshot into visual parameters: haze color/alpha
// and a latitude-keyed continent color sample.

import { ATMOSPHERE, RENDER_EXTRA } from '../config.js';
import { hexToRgb, mixColors, clamp } from './colorMix.js';

/**
 * Compute haze tint and alpha from atmosphere snapshot.
 * Hot or high CO₂ → warm tint; cold → blue tint; low O₂ → dim grey.
 * Returns { color: 'rgba(...)', alpha: 0..1 } or null if no haze warranted.
 */
export function computeHaze(atmo) {
  if (!atmo) return null;
  const { tempC, co2Ppm, o2Pct } = atmo;
  const tempDev = tempC - ATMOSPHERE.modernTempC;
  const co2Ratio = Math.max(co2Ppm, 1) / ATMOSPHERE.modernCo2Ppm;

  const tempHazeMag = clamp(Math.abs(tempDev) / 30, 0, 1);
  const co2HazeMag = clamp(Math.log10(co2Ratio) / 2.5, 0, 1);
  const lowO2Mag = clamp((10 - o2Pct) / 10, 0, 1);

  const totalMag = clamp(tempHazeMag + co2HazeMag * 0.7 + lowO2Mag * 0.4, 0, 1);
  const alpha = totalMag * ATMOSPHERE.hazeMaxAlpha;
  if (alpha < 0.01) return null;

  // Pick dominant tint
  let baseColor;
  if (co2HazeMag > 0.5 && tempDev > 0) {
    baseColor = ATMOSPHERE.highCo2Color;
  } else if (tempDev < -2) {
    baseColor = ATMOSPHERE.coldColor;
  } else if (tempDev > 2) {
    baseColor = ATMOSPHERE.hotColor;
  } else if (lowO2Mag > 0.4) {
    baseColor = ATMOSPHERE.lowO2Color;
  } else {
    baseColor = ATMOSPHERE.hotColor;
  }

  const rgb = hexToRgb(baseColor);
  return {
    color: `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha.toFixed(3)})`,
    rgb,
    alpha,
  };
}

/**
 * Sample latitude palette at a given latitude in degrees.
 * Returns a hex color string.
 */
export function sampleLatitudePalette(latDeg) {
  const palette = RENDER_EXTRA.latitudePalette;
  if (latDeg <= palette[0].lat) return palette[0].color;
  if (latDeg >= palette[palette.length - 1].lat) return palette[palette.length - 1].color;
  for (let i = 0; i < palette.length - 1; i++) {
    const a = palette[i];
    const b = palette[i + 1];
    if (latDeg >= a.lat && latDeg <= b.lat) {
      const t = (latDeg - a.lat) / (b.lat - a.lat);
      return mixColors(a.color, b.color, t);
    }
  }
  return palette[0].color;
}

/**
 * Blend a continent's base color with the latitude palette at its centroid.
 */
export function continentColorAtLatitude(baseColor, latDeg) {
  if (!RENDER_EXTRA.continentColorByLatitude) return baseColor;
  const latColor = sampleLatitudePalette(latDeg);
  return mixColors(baseColor, latColor, RENDER_EXTRA.latitudeBlend);
}
