// Deterministic fractal detail for coastlines (midpoint displacement).
//
// The wiggles are keyed on a seed + the index of the edge + the position inside that edge — never
// on coordinates — so a coast keeps exactly the same detail while its polygon drifts, rotates or
// morphs. (Hashing coordinates, as this module once did, re-rolled every wiggle on every frame of
// motion and made coastlines "boil".)
//
// The continental engine (js/engine/interpolator.js) applies this once, when the deep-time
// outlines are loaded, and hands out polygons that are already render-ready; such vertex arrays
// carry a non-enumerable `renderReady` flag and pass through fractalSubdivide() untouched, so a
// renderer may still call it on every polygon without multiplying vertices.

import { RENDER } from '../config.js';

const READY = 'renderReady';
const ROUGHNESS = 0.6;       // amplitude falloff per level (0.5 = smooth bulges, 0.7 = craggy)
const SEAM_EPS = 1e-6;

/** Flag a vertex array as "dense enough to draw as is". Returns the same array. */
export function markRenderReady(vertices) {
  if (vertices && !vertices[READY]) Object.defineProperty(vertices, READY, { value: true });
  return vertices;
}

export function isRenderReady(vertices) {
  return !!(vertices && vertices[READY]);
}

/** 32-bit integer mix of (h, k). */
function mix(h, k) {
  h = (h ^ Math.imul(k + 0x9e3779b9, 0x85ebca6b)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) | 0;
}

/** hash → [-1, 1] */
function unit(h) {
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

/** Stable integer seed from a string (polygon id) and an optional number. */
export function seedFrom(text, salt = 0) {
  let h = mix(0x1234567, salt | 0);
  for (let i = 0; i < text.length; i++) h = mix(h, text.charCodeAt(i));
  return h;
}

// An edge that lies on the map frame (lat ±90 or lon ±180) closes a polygon; it is not a coast.
function onSeam(ax, ay, bx, by) {
  return (Math.abs(Math.abs(ay) - 90) < SEAM_EPS && Math.abs(ay - by) < SEAM_EPS)
    || (Math.abs(Math.abs(ax) - 180) < SEAM_EPS && Math.abs(ax - bx) < SEAM_EPS);
}

function subdivide(out, ax, ay, bx, by, depth, amplitude, key) {
  if (depth <= 0) return;
  // work in true degrees of arc: longitudes shrink with latitude
  const k = Math.max(0.2, Math.cos(((ay + by) / 2) * (Math.PI / 180)));
  const dx = (bx - ax) * k;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return;
  const d = unit(key) * amplitude * len;
  const mx = (ax + bx) / 2 + ((-dy / len) * d) / k;
  const my = Math.max(-90, Math.min(90, (ay + by) / 2 + (dx / len) * d));
  subdivide(out, ax, ay, mx, my, depth - 1, amplitude * ROUGHNESS, mix(key, 1));
  out.push([mx, my]);
  subdivide(out, mx, my, bx, by, depth - 1, amplitude * ROUGHNESS, mix(key, 2));
}

/**
 * Add coastline detail to a closed outline.
 * @param {Array<[number, number]>} vertices  [[lon, lat], ...]. Every edge is taken the short way
 *   round, so an outline may cross the antimeridian (… 170, -175 … or … 170, 185 …) or circle a pole.
 * @param {number} depth      subdivision levels; each level doubles the vertex count
 * @param {number} amplitude  first-level displacement as a fraction of the edge length
 * @param {number} seed       integer; the same seed always gives the same coast
 * @returns a new array — or `vertices` itself when it is already render-ready or too short. New
 *   points continue the longitude of the vertex before them (they may lie slightly beyond ±180).
 */
export function fractalSubdivide(
  vertices,
  depth = RENDER.fractalDepth,
  amplitude = RENDER.fractalAmplitude,
  seed = 0,
) {
  if (!vertices || vertices.length < 3 || depth <= 0 || isRenderReady(vertices)) return vertices;

  const n = vertices.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    out.push([a[0], a[1]]);
    if (onSeam(a[0], a[1], b[0], b[1])) continue;
    let bx = b[0];
    if (bx - a[0] > 180) bx -= 360; else if (bx - a[0] < -180) bx += 360;
    subdivide(out, a[0], a[1], bx, b[1], depth, amplitude, mix(seed | 0, i));
  }
  return out;
}
