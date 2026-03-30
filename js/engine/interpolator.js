// Continental polygon interpolation between time slices.
// Handles morphing continents smoothly between defined keyframes.

import { slices, timeSlices, getBracketingSlices } from '../data/continents.js';

/**
 * Smoothstep easing function for more natural drift.
 */
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/**
 * Linearly interpolate between two values.
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Interpolate between two polygon vertex arrays.
 * If vertex counts differ, the shorter polygon is padded by repeating its last vertex.
 */
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

/**
 * Try to match continents between two slices by id prefix.
 * Returns an array of { id, name, color, vertices } objects
 * representing the interpolated continents.
 */
function matchAndInterpolate(sliceBefore, sliceAfter, alpha) {
  const before = sliceBefore.continents;
  const after = sliceAfter.continents;

  // Simple case: same number of continents, match by index
  // (this works when continents have been manually aligned in the data)
  if (before.length === after.length) {
    return before.map((cb, i) => {
      const ca = after[i];
      const easedAlpha = smoothstep(alpha);
      return {
        id: alpha < 0.5 ? cb.id : ca.id,
        name: alpha < 0.5 ? cb.name : ca.name,
        color: alpha < 0.5 ? cb.color : ca.color,
        vertices: interpolateVertices(cb.vertices, ca.vertices, easedAlpha)
      };
    });
  }

  // Complex case: different numbers of continents (splits/merges).
  // Strategy: if going from fewer to more continents (split),
  // the "extra" continents in the after slice start as collapsed points
  // at the centroid of the nearest before-continent.
  // If going from more to fewer (merge), the disappearing continents
  // collapse to points at the centroid of the nearest after-continent.

  const easedAlpha = smoothstep(alpha);

  if (before.length < after.length) {
    // Split: fewer -> more continents
    return handleSplit(before, after, easedAlpha);
  } else {
    // Merge: more -> fewer continents
    return handleMerge(before, after, easedAlpha);
  }
}

function centroid(vertices) {
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

function handleSplit(before, after, alpha) {
  const result = [];

  // Match as many as possible by index
  for (let i = 0; i < before.length; i++) {
    const nearestAfter = findNearestContinent(before[i], after);
    result.push({
      id: alpha < 0.5 ? before[i].id : nearestAfter.id,
      name: alpha < 0.5 ? before[i].name : nearestAfter.name,
      color: alpha < 0.5 ? before[i].color : nearestAfter.color,
      vertices: interpolateVertices(before[i].vertices, nearestAfter.vertices, alpha)
    });
  }

  // Extra "after" continents grow from collapsed points
  const matchedAfterIds = new Set(result.map(r => r.id));
  for (const ca of after) {
    if (matchedAfterIds.has(ca.id)) continue;
    // Find the nearest "before" continent to use as the collapse origin
    const nearestBefore = findNearestContinent(ca, before);
    const collapsed = makeCollapsedVertices(centroid(nearestBefore.vertices), ca.vertices.length);
    result.push({
      id: ca.id,
      name: ca.name,
      color: ca.color,
      vertices: interpolateVertices(collapsed, ca.vertices, alpha)
    });
  }

  return result;
}

function handleMerge(before, after, alpha) {
  const result = [];

  // Match after continents to their nearest before continent
  for (const ca of after) {
    const nearestBefore = findNearestContinent(ca, before);
    result.push({
      id: alpha < 0.5 ? nearestBefore.id : ca.id,
      name: alpha < 0.5 ? nearestBefore.name : ca.name,
      color: alpha < 0.5 ? nearestBefore.color : ca.color,
      vertices: interpolateVertices(nearestBefore.vertices, ca.vertices, alpha)
    });
  }

  // Extra "before" continents collapse toward nearest after continent
  const matchedBeforeIds = new Set(result.map(r => r.id));
  for (const cb of before) {
    if (matchedBeforeIds.has(cb.id)) continue;
    const nearestAfter = findNearestContinent(cb, after);
    const collapsed = makeCollapsedVertices(centroid(nearestAfter.vertices), cb.vertices.length);
    result.push({
      id: cb.id,
      name: cb.name,
      color: cb.color,
      vertices: interpolateVertices(cb.vertices, collapsed, alpha)
    });
  }

  return result;
}

function findNearestContinent(target, candidates) {
  const [tLon, tLat] = centroid(target.vertices);
  let nearest = candidates[0];
  let nearestDist = Infinity;
  for (const c of candidates) {
    const [cLon, cLat] = centroid(c.vertices);
    const dist = (tLon - cLon) ** 2 + (tLat - cLat) ** 2;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = c;
    }
  }
  return nearest;
}

/**
 * Get interpolated continental polygons at the given geological time.
 * Returns an array of { id, name, color, vertices: [[lon, lat], ...] }.
 */
export function getPolygonsAtTime(timeMa) {
  const { before, after, alpha } = getBracketingSlices(timeMa);

  // Exact match — no interpolation needed
  if (before === after || alpha === 0) {
    return slices[before].continents.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      vertices: c.vertices.map(v => [...v])
    }));
  }

  return matchAndInterpolate(slices[before], slices[after], alpha);
}
