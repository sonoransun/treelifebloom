// Deterministic 3D value-noise + fBm for terrain relief on the globe.
// Cartesian inputs (unit sphere) avoid the lon/lat polar singularity and
// the ±180° seam. Hash style mirrors js/engine/fractal.js so behavior is
// stable across frames — no shimmer when scrubbing time.

import { RENDER } from '../config.js';

export function terrainHash(ix, iy, iz, salt) {
  let h =
    ((ix | 0) * 73856093) ^
    ((iy | 0) * 19349663) ^
    ((iz | 0) * 83492791) ^
    ((salt | 0) * 67867979);
  h = h | 0;
  return ((h & 0x7fffffff) % 100000) / 50000 - 1;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function valueNoise3D(x, y, z, salt = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);
  const fz = smoothstep(z - iz);

  const c000 = terrainHash(ix,     iy,     iz,     salt);
  const c100 = terrainHash(ix + 1, iy,     iz,     salt);
  const c010 = terrainHash(ix,     iy + 1, iz,     salt);
  const c110 = terrainHash(ix + 1, iy + 1, iz,     salt);
  const c001 = terrainHash(ix,     iy,     iz + 1, salt);
  const c101 = terrainHash(ix + 1, iy,     iz + 1, salt);
  const c011 = terrainHash(ix,     iy + 1, iz + 1, salt);
  const c111 = terrainHash(ix + 1, iy + 1, iz + 1, salt);

  const x00 = lerp(c000, c100, fx);
  const x10 = lerp(c010, c110, fx);
  const x01 = lerp(c001, c101, fx);
  const x11 = lerp(c011, c111, fx);

  const y0 = lerp(x00, x10, fy);
  const y1 = lerp(x01, x11, fy);

  return lerp(y0, y1, fz);
}

export function fbm3D(x, y, z, octaves = 4, lacunarity = 2.0, gain = 0.5, salt = 0) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise3D(x * freq, y * freq, z * freq, salt + i * 31);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

// Smooth blend between modern and proto-continent terrain profiles.
// Pre-2.5 Ga slices get sharper, taller, hot-tinted relief — visually
// reads as young chaotic crust.
export function terrainProfileForAge(timeMa) {
  const start = RENDER.terrainProtoStartMa;
  const full = RENDER.terrainProtoFullMa;
  const t = Math.max(0, Math.min(1, (timeMa - start) / Math.max(1, full - start)));
  const k = smoothstep(t);
  return {
    amplitude: lerp(RENDER.terrainBaseAmplitude, RENDER.terrainProtoAmplitude, k),
    freq:      lerp(RENDER.terrainBaseFreq,      RENDER.terrainProtoFreq,      k),
    octaves:   Math.round(lerp(RENDER.terrainBaseOctaves, RENDER.terrainProtoOctaves, k)),
    jaggedness: RENDER.terrainProtoJaggedness * k,
    hotTint:   0.35 * k,
  };
}
