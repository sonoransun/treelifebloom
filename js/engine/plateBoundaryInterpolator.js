// Tectonic plate boundary interpolation between time slices.
// Mirrors the continental interpolator but for open polylines.

import { boundarySlices } from '../data/plateBoundaries.js';
import { getBracketingSlices } from '../data/continents.js';

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function interpolateVertices(verts1, verts2, alpha) {
  const maxLen = Math.max(verts1.length, verts2.length);
  const result = [];
  for (let i = 0; i < maxLen; i++) {
    const v1 = verts1[Math.min(i, verts1.length - 1)];
    const v2 = verts2[Math.min(i, verts2.length - 1)];
    result.push([
      lerp(v1[0], v2[0], alpha),
      lerp(v1[1], v2[1], alpha)
    ]);
  }
  return result;
}

function midpoint(vertices) {
  let sumLon = 0, sumLat = 0;
  for (const [lon, lat] of vertices) {
    sumLon += lon;
    sumLat += lat;
  }
  return [sumLon / vertices.length, sumLat / vertices.length];
}

function makeCollapsedVertices(center, count) {
  return Array.from({ length: count }, () => [...center]);
}

/**
 * Get interpolated tectonic plate boundaries at the given geological time.
 * Returns an array of { id, type, vertices: [[lon, lat], ...] }.
 */
export function getBoundariesAtTime(timeMa) {
  const { before, after, alpha } = getBracketingSlices(timeMa);

  const sliceBefore = boundarySlices[before];
  const sliceAfter = boundarySlices[after];

  // Exact match — no interpolation needed
  if (before === after || alpha === 0) {
    return sliceBefore.boundaries.map(b => ({
      id: b.id,
      type: b.type,
      vertices: b.vertices.map(v => [...v])
    }));
  }

  const easedAlpha = smoothstep(alpha);
  const beforeBoundaries = sliceBefore.boundaries;
  const afterBoundaries = sliceAfter.boundaries;

  // Build id->boundary maps for matching
  const beforeMap = new Map(beforeBoundaries.map(b => [b.id, b]));
  const afterMap = new Map(afterBoundaries.map(b => [b.id, b]));

  const result = [];
  const matched = new Set();

  // Match boundaries by id and interpolate
  for (const bb of beforeBoundaries) {
    const ab = afterMap.get(bb.id);
    if (ab) {
      matched.add(bb.id);
      result.push({
        id: easedAlpha < 0.5 ? bb.id : ab.id,
        type: easedAlpha < 0.5 ? bb.type : ab.type,
        vertices: interpolateVertices(bb.vertices, ab.vertices, easedAlpha)
      });
    } else {
      // Boundary only in "before" — collapse to midpoint (fade out)
      const mid = midpoint(bb.vertices);
      const collapsed = makeCollapsedVertices(mid, bb.vertices.length);
      result.push({
        id: bb.id,
        type: bb.type,
        vertices: interpolateVertices(bb.vertices, collapsed, easedAlpha)
      });
    }
  }

  // Boundaries only in "after" — expand from midpoint (fade in)
  for (const ab of afterBoundaries) {
    if (matched.has(ab.id)) continue;
    const mid = midpoint(ab.vertices);
    const collapsed = makeCollapsedVertices(mid, ab.vertices.length);
    result.push({
      id: ab.id,
      type: ab.type,
      vertices: interpolateVertices(collapsed, ab.vertices, easedAlpha)
    });
  }

  return result;
}
