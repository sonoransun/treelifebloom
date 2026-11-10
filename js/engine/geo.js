// Geographic helpers shared by the Map and Globe views, and habitat-aware marker placement.
//
//   pointInPolygon(lon, lat, vertices)      even–odd test in map coordinates
//   isLand(lon, lat, polygons)              is the point on any continent?
//   isSeamEdge(a, b)                        does this polygon edge lie on the map frame (not a coast)?
//   nearestCoast(lon, lat, polygons)        closest point on a real shoreline
//   inferHabitat(sp)                        'marine' | 'land'
//   placeSpecies(alive, polygons, timeMa)   Map(species id → { lon, lat }) for this frame
//
// placeSpecies() exists because a species' `location` is a MODERN fossil locality while the land
// underneath is paleogeography. For every marker it
//   1. anchors the site to the plate (or block — Siberia, Avalonia, North China …) it sits on today
//      and lets it ride that plate back in time (true palaeo-coordinates in the rigid-plate regime,
//      0–540 Ma; further back the site keeps riding the continents its plate descends from — see
//      plateToWorld in interpolator.js);
//   2. settles it on the right surface: marine markers in the sea just off the nearest shore
//      (most marine fossil sites are on land today — they go to the adjacent shelf), everything
//      else on land, a little inside the nearest shore;
//   3. spreads species that share a site into a small hexagonal cluster. Each species owns a fixed
//      slot of its cluster (worked out once from the whole catalogue), so arrivals and extinctions
//      never shuffle the others, and next to a shore the cluster fans away from it;
//   4. never lets a marker teleport: when its proper place changes abruptly it travels there at a
//      limited speed over the next few frames.
// While time moves in small steps a marker also stays loyal to the stretch of shore it used on the
// previous frame (hysteresis), so it does not flicker between two candidate coasts. After a jump
// in time everything is decided afresh: scrubbing to a moment always shows the same picture.
//
// Distances are measured on the sphere; nothing special happens at the antimeridian or the poles.

import { findPlateAt, plateToWorld } from './interpolator.js';
import { species as CATALOGUE } from '../data/species.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// Tunables — degrees of arc unless noted.
const SHELF_DEG = 1.6;            // marine markers keep at least this distance from the shore
const SHELF_REACH_DEG = 2.4;      // … and shelf-sea fossils stay within SHELF + this of it
const INLAND_DEG = 0.9;           // land markers keep this clearance from the shore where there is room
const SPREAD_DEG = 2.8;           // spacing between co-located markers
const SITE_EPS_DEG = 1.5;         // sites closer than this form one cluster
const PROBE_DEG = 0.35;           // "is there open water just beyond this edge?" test distance
const CONTINUOUS_MA = 3;          // (Ma) a larger time step counts as a jump: no hysteresis, no glide
// Hysteresis, first tier: the same stretch of shore as on the previous frame is kept unless
// another shore is clearly nearer.
const STICK_DEG = 0.6;            // "the same stretch" = within this distance of last frame's shore point
const STICK_BIAS = 1.3;           // it may be this many times farther than the nearest shore …
const STICK_SLACK_DEG = 0.6;      // … plus this
// Hysteresis, second tier: if that stretch is gone, a shore in the same region is preferred to a
// leap across a continent.
const REGION_DEG = 8;             // "the same region" = within this distance of the old shore point
const REGION_MIN_DEG = 2.5;       // hops shorter than this are not worth preventing
const REGION_BIAS = 1.6;          // it may be this many times farther from the site than the new choice …
const REGION_SLACK_DEG = 2;       // … plus this
// A cluster's axis (the direction its first slots fan out in).
const DEFAULT_AXIS = Math.PI / 6; // (radians, counter-clockwise from east) far from any shore
const AXIS_NEAR_DEG = 2;          // this close to a shore the axis points straight away from it,
const AXIS_FAR_DEG = 5;           // this far it is the default; blended in between
// Speed limit of a marker relative to its site, per frame: a share of the distance left, within
// [min, max], plus an allowance per Ma of elapsed time (fast-forward must not make markers lag).
const GLIDE_SHARE = 0.14;
const GLIDE_MIN_DEG = 0.4;
const GLIDE_MAX_DEG = 2.2;
const GLIDE_PER_MA = 3;

// ---------------------------------------------------------------------------------------------
// Basics
// ---------------------------------------------------------------------------------------------

/** Even–odd point-in-polygon test. vertices: [[lon, lat], ...] as returned by getPolygonsAtTime. */
export function pointInPolygon(lon, lat, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1];
    const xj = vertices[j][0], yj = vertices[j][1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * True when the edge a→b lies on the map frame: along lat ±90 (the closure of a polygon that
 * surrounds a pole) or along lon ±180 (where a polygon was cut at the antimeridian). Such edges
 * are not coastlines — fill across them, never stroke them.
 */
export function isSeamEdge(a, b) {
  return (Math.abs(Math.abs(a[1]) - 90) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9)
    || (Math.abs(Math.abs(a[0]) - 180) < 1e-9 && Math.abs(a[0] - b[0]) < 1e-9);
}

/** 'marine' or 'land' for marker placement (explicit sp.habitat wins; otherwise guessed from the category). */
export function inferHabitat(sp) {
  if (sp.habitat) return sp.habitat === 'marine' ? 'marine' : 'land';
  return ['fish', 'invertebrate', 'mollusk', 'marine_reptile', 'alga', 'bacteria', 'archaea', 'protist', 'prokaryote', 'eukaryote']
    .includes(sp.category) ? 'marine' : 'land';
}

const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

const bboxCache = new WeakMap();
function bboxOf(p) {
  if (p.bbox) return p.bbox;
  let b = bboxCache.get(p.vertices);
  if (!b) {
    b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const v of p.vertices) {
      if (v[0] < b[0]) b[0] = v[0]; if (v[0] > b[2]) b[2] = v[0];
      if (v[1] < b[1]) b[1] = v[1]; if (v[1] > b[3]) b[3] = v[1];
    }
    bboxCache.set(p.vertices, b);
  }
  return b;
}

/** Is the point on any continent? polygons: [{ vertices, bbox? }]. */
export function isLand(lon, lat, polygons) {
  for (let i = 0; i < polygons.length; i++) {
    const p = polygons[i];
    if (p.vertices.length < 3) continue;
    const b = bboxOf(p);
    if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
    if (pointInPolygon(lon, lat, p.vertices)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// The polygons on the sphere (built once per polygon set, i.e. once per frame)
// ---------------------------------------------------------------------------------------------

const sphereCache = new WeakMap();
const CHUNK = 12;             // edges per chunk; every chunk has its own bounding ball

/** Smallest-ish ball around vertices i0..i1 (inclusive, wrapping) of xyz: writes [cx, cy, cz, r] to out[o..]. */
function boundingBall(xyz, n, i0, i1, out, o) {
  let cx = 0, cy = 0, cz = 0, count = 0;
  for (let i = i0; i <= i1; i++) { const j = (i % n) * 3; cx += xyz[j]; cy += xyz[j + 1]; cz += xyz[j + 2]; count++; }
  cx /= count; cy /= count; cz /= count;
  let r2 = 0;
  for (let i = i0; i <= i1; i++) {
    const j = (i % n) * 3;
    const d2 = (xyz[j] - cx) * (xyz[j] - cx) + (xyz[j + 1] - cy) * (xyz[j + 1] - cy) + (xyz[j + 2] - cz) * (xyz[j + 2] - cz);
    if (d2 > r2) r2 = d2;
  }
  out[o] = cx; out[o + 1] = cy; out[o + 2] = cz; out[o + 3] = Math.sqrt(r2);
}

function sphereIndex(polygons) {
  let index = sphereCache.get(polygons);
  if (index) return index;
  index = [];
  let base = 0;
  for (const p of polygons) {
    const v = p.vertices, n = v.length;
    if (n < 3) continue;
    const xyz = new Float64Array(n * 3);
    let area = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const lo = v[i][0] * D2R, la = v[i][1] * D2R, c = Math.cos(la);
      xyz[i * 3] = c * Math.cos(lo); xyz[i * 3 + 1] = c * Math.sin(lo); xyz[i * 3 + 2] = Math.sin(la);
      area += v[j][0] * v[i][1] - v[i][0] * v[j][1];
    }
    const ball = new Float64Array(4);
    boundingBall(xyz, n, 0, n - 1, ball, 0);
    const chunks = new Float64Array(Math.ceil(n / CHUNK) * 4);
    for (let c = 0, e0 = 0; e0 < n; c += 4, e0 += CHUNK) boundingBall(xyz, n, e0, Math.min(n, e0 + CHUNK), chunks, c);
    index.push({
      v, n, xyz,
      ball,                                       // [x, y, z, radius] of a ball (in chord units) that holds every vertex
      chunks,                                     // the same for every run of CHUNK edges
      ccw: area >= 0,                             // rings from the engine are counter-clockwise: sea on the right
      base,                                       // first slot of this polygon's edges in the per-query edge list
      hidden: null,                               // per edge, for the whole frame: 1 = land beyond its middle, -1 = open water, 0 = not probed
      rejected: null,                             // per-edge stamp of the query that discarded the edge
      skipped: 0,                                 // stamp of the query that found this polygon too thin to stand on
    });
    base += n;
  }
  index.edges = base;
  sphereCache.set(polygons, index);
  return index;
}

/** Edge e runs from vertex e to vertex e+1. Does it lie on the map frame? */
function edgeIsSeam(item, e) {
  const a = item.v[e], b = item.v[e + 1 === item.n ? 0 : e + 1];
  return (a[0] === b[0] && (a[0] === 180 || a[0] === -180)) || (a[1] === b[1] && (a[1] === 90 || a[1] === -90));
}

const chordToDeg = (d2) => 2 * Math.asin(Math.min(1, Math.sqrt(d2) / 2)) * R2D;
/** Angle in degrees between two unit vectors given as [x, y, z]. */
const angleDeg = (a, b) => Math.atan2(
  Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]),
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
) * R2D;
const lonOf = (x, y) => Math.atan2(y, x) * R2D;
const latOf = (z) => Math.asin(z > 1 ? 1 : z < -1 ? -1 : z) * R2D;

// ---- shore search ------------------------------------------------------------------------------
//
// "Which shore is nearest?" is easy from the sea: the nearest polygon edge. From a point on land
// the nearest edges are often not shores at all — cut lines between abutting polygons, margins
// tucked under a neighbour, the seams of a continent that is splitting — so candidates are examined
// nearest-first and those with land beyond them are discarded (together with the hidden stretch of
// outline they belong to).

const QUICK = 4;              // candidates collected by the pruned first pass
const MAX_EXAMINED = 160;     // candidates a single query may examine before giving up
const candidates = Array.from({ length: QUICK + 1 }, () => ({ d2: 0, x: 0, y: 0, z: 0, item: null, e: 0 }));
let candidateCount = 0;
const kept = { found: false, d2: 0, x: 0, y: 0, z: 0, item: null, e: 0 };
const current = { d2: 0, x: 0, y: 0, z: 0, item: null, e: 0 };
let queryStamp = 0;

// Every edge of the frame with its closest point to the query (filled on demand, second pass).
let edgeD2 = new Float64Array(4096);
let edgeQ = new Float64Array(4096 * 3);

/** Closest point of edge (a→b) to p; returns the squared chord distance and leaves the point in `near`. */
const near = { x: 0, y: 0, z: 0 };
function closestOnEdge(px, py, pz, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const l2 = dx * dx + dy * dy + dz * dz;
  let t = l2 > 1e-18 ? ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  near.x = ax + dx * t; near.y = ay + dy * t; near.z = az + dz * t;
  const ex = px - near.x, ey = py - near.y, ez = pz - near.z;
  return ex * ex + ey * ey + ez * ez;
}

/** How far (chord) a point is from a bounding ball stored as [x, y, z, r] at balls[o..]; 0 inside it. */
function ballGap(px, py, pz, balls, o) {
  const dx = px - balls[o], dy = py - balls[o + 1], dz = pz - balls[o + 2];
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz) - balls[o + 3];
  return d > 0 ? d : 0;
}

let worst2 = Infinity;        // first pass: squared distance a new candidate has to beat
let gaps = new Float64Array(256);

/** First pass over edges e0..e1-1 of one polygon. */
function scanEdges(item, e0, e1, px, py, pz, stick, stick2, want) {
  const xyz = item.xyz, n = item.n;
  let ax = xyz[e0 * 3], ay = xyz[e0 * 3 + 1], az = xyz[e0 * 3 + 2];
  for (let e = e0; e < e1; e++) {
    const o = e + 1 === n ? 0 : (e + 1) * 3;
    const bx = xyz[o], by = xyz[o + 1], bz = xyz[o + 2];
    const d2 = closestOnEdge(px, py, pz, ax, ay, az, bx, by, bz);
    if ((d2 < worst2 || (stick && d2 < kept.d2)) && !edgeIsSeam(item, e)) {
      if (d2 < worst2) {
        let slot = candidateCount < want ? candidateCount++ : want - 1;
        while (slot > 0 && candidates[slot - 1].d2 > d2) {
          const up = candidates[slot], down = candidates[slot - 1];
          up.d2 = down.d2; up.x = down.x; up.y = down.y; up.z = down.z; up.item = down.item; up.e = down.e;
          slot--;
        }
        const c = candidates[slot];
        c.d2 = d2; c.x = near.x; c.y = near.y; c.z = near.z; c.item = item; c.e = e;
        if (candidateCount === want) worst2 = candidates[want - 1].d2;
      }
      if (stick && d2 < kept.d2) {
        const sx = near.x - stick[0], sy = near.y - stick[1], sz = near.z - stick[2];
        if (sx * sx + sy * sy + sz * sz < stick2) {
          kept.found = true; kept.d2 = d2; kept.x = near.x; kept.y = near.y; kept.z = near.z; kept.item = item; kept.e = e;
        }
      }
    }
    ax = bx; ay = by; az = bz;
  }
}

/**
 * First pass: the `want` closest edges (nearer than limit2, a squared chord) into `candidates`,
 * nearest first. Whole polygons and runs of edges are skipped by their bounding balls. With
 * `stick` (the shore point chosen on the previous frame) also `kept`, the closest point within
 * stickDeg of it.
 */
function quickScan(px, py, pz, index, stick, stickDeg, want, limit2) {
  candidateCount = 0;
  kept.found = false; kept.d2 = Infinity;
  worst2 = limit2;
  const stickChord = 2 * Math.sin((stickDeg * D2R) / 2);
  const stick2 = stickChord * stickChord;
  // Begin with the polygon whose ball is nearest: it usually holds the answer and lets most others be skipped.
  if (gaps.length < index.length) gaps = new Float64Array(index.length * 2);
  let first = -1, firstGap = Infinity;
  for (let k = 0; k < index.length; k++) {
    const g = ballGap(px, py, pz, index[k].ball, 0);
    gaps[k] = g;
    if (g < firstGap) { firstGap = g; first = k; }
  }
  for (let pass = -1; pass < index.length; pass++) {
    const k = pass < 0 ? first : pass;
    if (k < 0 || (pass >= 0 && k === first)) continue;
    const item = index[k];
    if (gaps[k] * gaps[k] > worst2) {
      if (!stick || gaps[k] * gaps[k] > kept.d2 || ballGap(stick[0], stick[1], stick[2], item.ball, 0) > stickChord) continue;
    }
    const chunks = item.chunks, n = item.n;
    for (let c = 0, e0 = 0; e0 < n; c += 4, e0 += CHUNK) {
      const g = ballGap(px, py, pz, chunks, c);
      if (g * g > worst2) {
        if (!stick || g * g > kept.d2 || ballGap(stick[0], stick[1], stick[2], chunks, c) > stickChord) continue;
      }
      scanEdges(item, e0, e0 + CHUNK < n ? e0 + CHUNK : n, px, py, pz, stick, stick2, want);
    }
  }
}

/**
 * Second pass: every edge of the frame with its distance to p. Seams, edges discarded by this
 * query and (for a query from land) edges already known to have land beyond them get Infinity.
 */
function fullScan(px, py, pz, index) {
  if (edgeD2.length < index.edges) { edgeD2 = new Float64Array(index.edges * 2); edgeQ = new Float64Array(index.edges * 6); }
  const shoresOnly = query.onLand;
  for (let k = 0; k < index.length; k++) {
    const item = index[k], xyz = item.xyz, n = item.n, rejected = item.rejected, hidden = item.hidden;
    let ax = xyz[0], ay = xyz[1], az = xyz[2];
    for (let e = 0; e < n; e++) {
      const o = e + 1 === n ? 0 : (e + 1) * 3;
      const bx = xyz[o], by = xyz[o + 1], bz = xyz[o + 2];
      const slot = item.base + e;
      if (item.skipped === queryStamp || (rejected && rejected[e] === queryStamp) || (shoresOnly && hidden && hidden[e] === 1)
        || edgeIsSeam(item, e)) edgeD2[slot] = Infinity;
      else {
        edgeD2[slot] = closestOnEdge(px, py, pz, ax, ay, az, bx, by, bz);
        edgeQ[slot * 3] = near.x; edgeQ[slot * 3 + 1] = near.y; edgeQ[slot * 3 + 2] = near.z;
      }
      ax = bx; ay = by; az = bz;
    }
  }
}

// The state of the query in progress.
const query = { px: 0, py: 0, pz: 0, index: null, polygons: null, onLand: false, limit2: Infinity, phase: 0, next: 0, sticky: false, examined: 0 };

/**
 * Start looking for shores around the unit vector p.
 *   horizonDeg  shores farther away than this are of no interest (Infinity = any distance)
 */
function beginShoreSearch(px, py, pz, index, polygons, onLand, stick, stickDeg, horizonDeg) {
  queryStamp++;
  query.px = px; query.py = py; query.pz = pz; query.index = index; query.polygons = polygons;
  query.onLand = onLand; query.phase = 0; query.examined = 0;
  const horizonChord = horizonDeg < 180 ? 2 * Math.sin((horizonDeg * D2R) / 2) : Infinity;
  query.limit2 = horizonChord * horizonChord;
  quickScan(px, py, pz, index, stick, stickDeg, onLand ? QUICK : 2, query.limit2);
  // hysteresis: the previous stretch of shore goes first unless another is clearly nearer
  query.sticky = kept.found && candidateCount > 0
    && chordToDeg(kept.d2) <= chordToDeg(candidates[0].d2) * STICK_BIAS + STICK_SLACK_DEG;
  query.next = query.sticky ? -1 : 0;
}

function isRejected(item, e) {
  return item.skipped === queryStamp || (item.rejected !== null && item.rejected[e] === queryStamp)
    || (query.onLand && item.hidden !== null && item.hidden[e] === 1);
}

/** The next candidate shore point, nearest first; null when there is none left. */
function nextCandidate() {
  if (query.phase === 0) {
    while (query.next < candidateCount) {
      const c = query.next < 0 ? kept : candidates[query.next];
      query.next++;
      if (!isRejected(c.item, c.e)) { query.examined++; return c; }
    }
    // the quick list is used up (rare: hidden stretches of outline, slivers too thin to stand on)
    fullScan(query.px, query.py, query.pz, query.index);
    query.phase = 1;
  }
  if (query.examined++ > MAX_EXAMINED) return null;
  const index = query.index, total = index.edges;
  let bestSlot = -1, bestD2 = query.limit2;
  for (let s = 0; s < total; s++) if (edgeD2[s] < bestD2) { bestD2 = edgeD2[s]; bestSlot = s; }
  if (bestSlot < 0) return null;
  let k = 0;
  while (k + 1 < index.length && index[k + 1].base <= bestSlot) k++;
  current.item = index[k]; current.e = bestSlot - index[k].base; current.d2 = bestD2;
  current.x = edgeQ[bestSlot * 3]; current.y = edgeQ[bestSlot * 3 + 1]; current.z = edgeQ[bestSlot * 3 + 2];
  return current;
}

function markRejected(item, e) {
  if (!item.rejected) item.rejected = new Int32Array(item.n);
  item.rejected[e] = queryStamp;
  if (query.phase === 1) edgeD2[item.base + e] = Infinity;
}

/**
 * Is there land just beyond the middle of edge e (so the edge is no shore)? A property of the
 * frame, not of the query, so the answer is remembered on the polygon for the rest of the frame.
 */
function landBeyond(item, e) {
  if (!item.hidden) item.hidden = new Int8Array(item.n);
  if (item.hidden[e] === 0) item.hidden[e] = probeBeyond(item, e) ? 1 : -1;
  return item.hidden[e] === 1;
}
function probeBeyond(item, e) {
  const xyz = item.xyz, a = e * 3, b = (e + 1 === item.n ? 0 : e + 1) * 3;
  let mx = xyz[a] + xyz[b], my = xyz[a + 1] + xyz[b + 1], mz = xyz[a + 2] + xyz[b + 2];
  const ml = Math.hypot(mx, my, mz) || 1;
  mx /= ml; my /= ml; mz /= ml;
  const dx = xyz[b] - xyz[a], dy = xyz[b + 1] - xyz[a + 1], dz = xyz[b + 2] - xyz[a + 2];
  // seaward = to the right of the direction of travel on a counter-clockwise ring: d × m
  let ox = dy * mz - dz * my, oy = dz * mx - dx * mz, oz = dx * my - dy * mx;
  const ol = Math.hypot(ox, oy, oz);
  if (ol < 1e-12) return true;
  const k = (item.ccw ? 1 : -1) / ol;
  const cs = Math.cos(PROBE_DEG * D2R), sn = Math.sin(PROBE_DEG * D2R);
  return isLand(lonOf(mx * cs + ox * k * sn, my * cs + oy * k * sn), latOf(mz * cs + oz * k * sn), query.polygons);
}

/**
 * Discard a candidate that turned out to have land beyond it — and with it the hidden stretch of
 * outline around it, found by probing neighbours in growing strides (hidden stretches are
 * contiguous; what lies between two hidden probes is taken to be hidden too).
 */
function rejectHidden(c) {
  const item = c.item, n = item.n;
  markRejected(item, c.e);
  if (!landBeyond(item, c.e)) return;             // only the candidate's own spot is covered: leave its neighbours alone
  for (const dir of [1, -1]) {
    let at = c.e, stride = 1;
    for (let tests = 0; tests < 24; tests++) {
      const e = (((at + dir * stride) % n) + n) % n;
      if (e === c.e || edgeIsSeam(item, e) || !landBeyond(item, e)) {
        if (stride === 1) break;
        stride = 1;                               // overshot the end of the hidden stretch: creep up to it
        continue;
      }
      for (let s = 1; s <= stride; s++) {
        const between = (((at + dir * s) % n) + n) % n;
        item.hidden[between] = 1;
        if (query.phase === 1) edgeD2[item.base + between] = Infinity;
      }
      at = e;
      if (stride < 16) stride *= 2;
    }
  }
}

// The shore point under examination: unit vector q, unit tangent o pointing out to sea, distance from the query.
const shore = { qx: 0, qy: 0, qz: 0, ox: 0, oy: 0, oz: 0, dist: 0 };

/** Prepare `shore` from a candidate of the current query. */
function examine(c) {
  const px = query.px, py = query.py, pz = query.pz;
  let qx = c.x, qy = c.y, qz = c.z;
  const ql = Math.hypot(qx, qy, qz) || 1;
  qx /= ql; qy /= ql; qz /= ql;
  const along = px * qx + py * qy + pz * qz;
  let tx = px - qx * along, ty = py - qy * along, tz = pz - qz * along;   // tangent at q towards p
  let tl = Math.hypot(tx, ty, tz);
  if (tl > 1e-7) {
    const s = (query.onLand ? -1 : 1) / tl;       // at sea p lies seaward of the shore; on land it lies inland
    tx *= s; ty *= s; tz *= s;
  } else {
    // p sits on the shore itself: use the edge's seaward normal (direction of travel × position)
    const xyz = c.item.xyz, a = c.e * 3, b = (c.e + 1 === c.item.n ? 0 : c.e + 1) * 3, s = c.item.ccw ? 1 : -1;
    const dx = xyz[b] - xyz[a], dy = xyz[b + 1] - xyz[a + 1], dz = xyz[b + 2] - xyz[a + 2];
    tx = (dy * qz - dz * qy) * s; ty = (dz * qx - dx * qz) * s; tz = (dx * qy - dy * qx) * s;
    tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
  }
  shore.qx = qx; shore.qy = qy; shore.qz = qz; shore.ox = tx; shore.oy = ty; shore.oz = tz;
  shore.dist = chordToDeg(c.d2);
}

// A point `deg` from the examined shore point: positive = out to sea, negative = inland.
const spot = { x: 0, y: 0, z: 0 };
function spotAt(deg) {
  const a = Math.abs(deg) * D2R, cs = Math.cos(a), sn = Math.sin(a) * (deg < 0 ? -1 : 1);
  spot.x = shore.qx * cs + shore.ox * sn; spot.y = shore.qy * cs + shore.oy * sn; spot.z = shore.qz * cs + shore.oz * sn;
}
const spotIsLand = () => isLand(lonOf(spot.x, spot.y), latOf(spot.z), query.polygons);

/**
 * Advance the current query to the next real shore (open water just beyond it) and leave it in
 * `shore`. Returns the candidate, or null when the search is exhausted.
 */
function nextShore() {
  for (;;) {
    const c = nextCandidate();
    if (!c) return null;
    examine(c);
    if (query.onLand) {
      spotAt(PROBE_DEG);
      if (spotIsLand()) { rejectHidden(c); continue; }
    }
    return c;
  }
}

/**
 * The closest point on a real shoreline: map-frame seams, cut lines between abutting polygons
 * and margins hidden under a neighbouring polygon do not count.
 * @returns {{lon:number, lat:number, distanceDeg:number} | null} null when there is no land
 */
export function nearestCoast(lon, lat, polygons) {
  if (!polygons || !polygons.length) return null;
  const lo = lon * D2R, la = lat * D2R, cl = Math.cos(la);
  beginShoreSearch(cl * Math.cos(lo), cl * Math.sin(lo), Math.sin(la), sphereIndex(polygons), polygons, isLand(lon, lat, polygons), null, 0, Infinity);
  if (!nextShore()) return null;
  return { lon: lonOf(shore.qx, shore.qy), lat: latOf(shore.qz), distanceDeg: shore.dist };
}

// ---------------------------------------------------------------------------------------------
// Clusters: which species share a site, and which slot each one owns
// ---------------------------------------------------------------------------------------------

let clusterOf = null;        // species id → { cluster, slot }
const clusters = [];

function siteDistance(a, b) {
  const k = Math.cos(((a.lat + b.lat) / 2) * D2R);
  let dLon = Math.abs(a.lon - b.lon);
  if (dLon > 180) dLon = 360 - dLon;
  return Math.hypot(dLon * k, a.lat - b.lat);
}

/** Give a species its cluster (the nearest one within SITE_EPS_DEG, else a new one) and its slot. */
function assign(sp) {
  const e = {
    id: sp.id,
    lon: sp.location.lon,
    lat: sp.location.lat,
    marine: inferHabitat(sp) === 'marine',
    from: Number.isFinite(sp.appearanceMa) ? sp.appearanceMa : Infinity,
    to: sp.extinctMa ?? 0,
    marker: sp.category !== 'event',
    slot: 0,
  };
  let cluster = null, nearest = SITE_EPS_DEG;
  for (const c of clusters) {
    if (c.marine !== e.marine) continue;
    const d = siteDistance(c, e);
    if (d < nearest) { nearest = d; cluster = c; }
  }
  if (!cluster) {
    cluster = { lon: e.lon, lat: e.lat, marine: e.marine, members: [], plateId: undefined, shelf: false };
    clusters.push(cluster);
  }
  // the lowest slot not held by a contemporary of the same cluster
  if (e.marker) {
    const taken = new Set();
    for (const m of cluster.members) if (m.marker && m.from >= e.to && e.from >= m.to) taken.add(m.slot);
    while (taken.has(e.slot)) e.slot++;
  }
  cluster.members.push(e);
  const entry = { cluster, slot: e.slot };
  clusterOf.set(e.id, entry);
  return entry;
}

const hasSite = (sp) => !!sp && !!sp.location && Number.isFinite(sp.location.lon) && Number.isFinite(sp.location.lat);

function buildClusters() {
  clusterOf = new Map();
  // oldest first, so the first inhabitant of a site keeps its centre
  const ordered = (Array.isArray(CATALOGUE) ? CATALOGUE : []).filter(hasSite)
    .sort((a, b) => (b.appearanceMa - a.appearanceMa) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const sp of ordered) assign(sp);
}

/** { cluster, slot } of a species. Entries that are not in the catalogue are fitted in on first sight. */
function lookup(sp) {
  if (!clusterOf) buildClusters();
  return clusterOf.get(sp.id) || assign(sp);
}

/** Ring (1, 2, …) that a slot lies on; slot 0 is the centre. Ring r holds 6r slots. */
function slotRing(slot) {
  let ring = 0, first = 1;
  while (slot >= first) { ring++; first += 6 * ring; }
  return ring;
}
/**
 * Where a slot sits relative to its cluster centre: [turn, distance].
 *   turn      radians away from the cluster's axis. Slots of a ring are handed out fanning away
 *             from the axis — straight along it first, then alternately left and right — so a small
 *             cluster next to a shore (axis = away from the shore) stays on its own side of it.
 *   distance  degrees of arc
 */
function slotPolar(slot) {
  const ring = slotRing(slot);
  const k = slot - (1 + 3 * ring * (ring - 1));           // 0 … 6·ring − 1 within the ring
  const side = k % 2 ? 1 : -1;
  return [side * Math.ceil(k / 2) * (Math.PI / (3 * ring)), ring * SPREAD_DEG];
}

// ---------------------------------------------------------------------------------------------
// Settling a point on the right surface
// ---------------------------------------------------------------------------------------------

// Result of settle(): the settled point and the shore point it was measured from (unit vectors).
const settled = { x: 0, y: 0, z: 0, shore: false, sx: 0, sy: 0, sz: 0 };

/**
 * Try to place a marker relative to the examined shore point. Returns false when no step from
 * this shore reaches the right surface (a sliver of land, a blocked strait).
 */
function placeFrom(marine, clear, reach) {
  const dist = shore.dist, onLand = query.onLand;
  if (marine) {
    let want = 0;
    if (onLand || dist < clear) want = clear;
    else if (reach > 0 && dist > reach) want = reach;
    if (want === 0) { settled.x = query.px; settled.y = query.py; settled.z = query.pz; return true; }
    // back off towards the shore if something else is in the way (a strait, an island)
    for (let step = want; step >= 0.09; step /= 2) {
      spotAt(step);
      if (!spotIsLand()) { settled.x = spot.x; settled.y = spot.y; settled.z = spot.z; return true; }
    }
    return false;
  }
  if (onLand && dist >= clear) { settled.x = query.px; settled.y = query.py; settled.z = query.pz; return true; }
  // inland from the shore point; shrink the step where the land is too narrow for the full clearance
  for (let step = clear; step >= 0.04; step /= 2) {
    spotAt(-step);
    if (spotIsLand()) { settled.x = spot.x; settled.y = spot.y; settled.z = spot.z; return true; }
  }
  return false;
}

/**
 * Move the unit vector (px, py, pz) onto the surface its habitat needs. Writes `settled`.
 *   marine  → at sea, at least `clear` degrees from the shore; with `reach` > 0 also at most that far
 *   land    → on land, `clear` degrees inside the shore where the land is wide enough
 *   stick   → the shore point chosen on the previous frame ([x, y, z]) or null; `carried` is how
 *             far (degrees) the site itself has moved since then
 */
function settle(px, py, pz, marine, clear, reach, polygons, index, stick, carried) {
  settled.x = px; settled.y = py; settled.z = pz; settled.shore = false;
  const onLand = isLand(lonOf(px, py), latOf(pz), polygons);
  beginShoreSearch(px, py, pz, index, polygons, onLand, stick, STICK_DEG + 2 * carried, Infinity);
  for (let c = nextShore(); c; c = nextShore()) {
    if (placeFrom(marine, clear, reach)) {
      settled.shore = true; settled.sx = shore.qx; settled.sy = shore.qy; settled.sz = shore.qz;
      if (stick && c !== kept) stayInRegion(px, py, pz, marine, clear, reach, polygons, index, stick, onLand);
      return;
    }
    // a blocked strait (marine) or a sliver of land too thin to stand on: look elsewhere
    if (marine) markRejected(c.item, c.e);
    else { c.item.skipped = queryStamp; if (query.phase === 1) fullScan(px, py, pz, index); }
  }
  if (onLand !== marine) return;                  // already on the right surface and no shore to keep clear of
  // Last resort (a crowd of overlapping shapes in mid-morph): the nearest spot of the right kind
  // on rings of growing radius around the point.
  let ex = -py, ey = px;
  const el = Math.hypot(ex, ey);
  if (el < 1e-9) { ex = 1; ey = 0; } else { ex /= el; ey /= el; }
  const nx = -pz * ey, ny = pz * ex, nz = px * ey - py * ex;
  for (let ring = 1; ring <= 60; ring++) {
    const a = ring * 0.75 * D2R, cs = Math.cos(a), sn = Math.sin(a);
    for (let k = 0; k < 16; k++) {
      const b = ((k + (ring % 2) / 2) / 16) * Math.PI * 2, cb = Math.cos(b), sb = Math.sin(b);
      const x = px * cs + (ex * cb + nx * sb) * sn, y = py * cs + (ey * cb + ny * sb) * sn, z = pz * cs + nz * sb * sn;
      if (isLand(lonOf(x, y), latOf(z), polygons) !== marine) { settled.x = x; settled.y = y; settled.z = z; return; }
    }
  }
}

/**
 * Second tier of the hysteresis. settle() has just chosen a shore that is NOT the stretch used on
 * the previous frame (it vanished under a neighbouring shape, or another shore became nearer).
 * If a usable shore still exists near the old one and is not much farther from the site than the
 * new choice, the marker stays in that region instead of leaping across a continent.
 */
function stayInRegion(px, py, pz, marine, clear, reach, polygons, index, stick, onLand) {
  if (angleDeg([settled.sx, settled.sy, settled.sz], stick) <= REGION_MIN_DEG) return;   // a short hop along the same coast
  const chosen = { x: settled.x, y: settled.y, z: settled.z, sx: settled.sx, sy: settled.sy, sz: settled.sz, dist: shore.dist };
  const restore = () => {
    settled.x = chosen.x; settled.y = chosen.y; settled.z = chosen.z;
    settled.sx = chosen.sx; settled.sy = chosen.sy; settled.sz = chosen.sz;
    settled.shore = true;
  };
  // the usable shore nearest to the OLD shore point (only shores within REGION_DEG of it matter)
  const stickOnLand = isLand(lonOf(stick[0], stick[1]), latOf(stick[2]), polygons);
  beginShoreSearch(stick[0], stick[1], stick[2], index, polygons, stickOnLand, null, 0, REGION_DEG);
  if (!nextShore() || shore.dist > REGION_DEG) { restore(); return; }
  const qx = shore.qx, qy = shore.qy, qz = shore.qz;
  const dx = px - qx, dy = py - qy, dz = pz - qz;
  const dist = chordToDeg(dx * dx + dy * dy + dz * dz);
  if (dist > chosen.dist * REGION_BIAS + REGION_SLACK_DEG) { restore(); return; }
  // measure that shore from the site again and place the marker relative to it
  const along = px * qx + py * qy + pz * qz;
  const tx = px - qx * along, ty = py - qy * along, tz = pz - qz * along;
  const tl = Math.hypot(tx, ty, tz);
  if (tl < 1e-7) { restore(); return; }
  const seaward = (onLand ? -1 : 1) / tl;
  query.px = px; query.py = py; query.pz = pz; query.onLand = onLand;
  shore.ox = tx * seaward; shore.oy = ty * seaward; shore.oz = tz * seaward; shore.dist = dist;
  if (placeFrom(marine, clear, reach) && isLand(lonOf(settled.x, settled.y), latOf(settled.z), polygons) !== marine) {
    settled.shore = true; settled.sx = qx; settled.sy = qy; settled.sz = qz;
  } else restore();
}

// ---------------------------------------------------------------------------------------------
// placeSpecies
// ---------------------------------------------------------------------------------------------

// Per species: what the previous frame decided (dropped after a jump in time).
//   shore / slotShore  the shore points the marker (and its slot) were measured from
//   out                where the marker was drawn
//   anchor             where its site was before settling
const memory = new Map();
let lastPolygons = null;
let lastIds = '';
let lastResult = null;
let lastTime = NaN;

/**
 * Marker positions for this frame.
 * @param {Array} alive     species alive now (each needs id, location {lon, lat}, category/habitat)
 * @param {Array} polygons  getPolygonsAtTime(timeMa)
 * @param {number} [timeMa] the current time; defaults to the time the polygons were computed for
 * @returns {Map<string, {lon:number, lat:number}>} species id → marker position
 */
export function placeSpecies(alive, polygons, timeMa) {
  let t = Number(timeMa);
  if (!Number.isFinite(t)) t = polygons && Number.isFinite(polygons.timeMa) ? polygons.timeMa : 0;

  let ids = '';
  for (let i = 0; i < alive.length; i++) ids += alive[i].id + '|';
  if (polygons === lastPolygons && ids === lastIds && t === lastTime && lastResult) return lastResult;

  const continuous = Math.abs(t - lastTime) <= CONTINUOUS_MA;
  const out = new Map();
  const hasLand = !!polygons && polygons.length > 0;
  const index = hasLand ? sphereIndex(polygons) : null;
  let gliding = false;

  for (let i = 0; i < alive.length; i++) {
    const sp = alive[i];
    if (!hasSite(sp)) continue;
    const { cluster, slot } = lookup(sp);

    // 1. anchor: ride the plate under the modern site
    if (cluster.plateId === undefined) {
      cluster.plateId = findPlateAt(cluster.lon, cluster.lat);
      // A marine fossil found on a plate — on land today (it lived in a shelf sea) or just off a
      // coast (often only because the simplified coastline misses the real one) — belongs next to
      // a shore at every time. Only open-ocean sites, which ride no plate, may lie far out.
      cluster.shelf = cluster.marine && cluster.plateId !== null;
    }
    let lon = cluster.lon, lat = cluster.lat;
    if (cluster.plateId) {
      const at = plateToWorld(cluster.plateId, lon, lat, t);
      if (at) { lon = at[0]; lat = at[1]; }
    }
    const cl = Math.cos(lat * D2R);
    let x = cl * Math.cos(lon * D2R), y = cl * Math.sin(lon * D2R), z = Math.sin(lat * D2R);
    const anchor = [x, y, z];

    let mem = memory.get(sp.id);
    if (!mem || !continuous || Math.abs(t - mem.time) > CONTINUOUS_MA) {
      mem = { time: t, shore: null, slotShore: null, out: null, anchor: null };
      memory.set(sp.id, mem);
    }
    const prevTime = mem.time;
    mem.time = t;
    const carried = mem.anchor ? angleDeg(mem.anchor, anchor) : 0;   // how far the site itself moved since the last frame

    // 2. habitat: settle the cluster centre on the right surface
    let away = DEFAULT_AXIS;
    if (hasLand) {
      const clear = cluster.marine ? SHELF_DEG : INLAND_DEG;
      const reach = cluster.marine && cluster.shelf ? clear + SHELF_REACH_DEG : 0;
      settle(x, y, z, cluster.marine, clear, reach, polygons, index, mem.shore, carried);
      mem.shore = settled.shore ? [settled.sx, settled.sy, settled.sz] : null;
      x = settled.x; y = settled.y; z = settled.z;
    }

    // 3. de-cluster: this species' own slot around the centre
    if (slot > 0) {
      // local east / north at the centre (any orthonormal pair will do at a pole)
      let ex = -y, ey = x;
      const el = Math.hypot(ex, ey);
      if (el < 1e-9) { ex = 1; ey = 0; } else { ex /= el; ey /= el; }
      const nx = -z * ey, ny = z * ex, nz = x * ey - y * ex;
      // The cluster's axis: a fixed bearing far from any shore; close to one it swings to point
      // away from the shore, so the first slots handed out stay on the cluster's own surface.
      if (hasLand && mem.shore) {
        const q = mem.shore;
        const along = x * q[0] + y * q[1] + z * q[2];
        const tx = x * along - q[0], ty = y * along - q[1], tz = z * along - q[2];   // tangent at the centre, away from the shore point
        const dist = Math.atan2(Math.hypot(tx, ty, tz), along) * R2D;
        const w = 1 - smooth01((dist - AXIS_NEAR_DEG) / (AXIS_FAR_DEG - AXIS_NEAR_DEG));
        if (w > 0 && dist > 1e-6) {
          let turn = Math.atan2(tx * nx + ty * ny + tz * nz, tx * ex + ty * ey) - DEFAULT_AXIS;
          turn -= Math.round(turn / (2 * Math.PI)) * 2 * Math.PI;
          away = DEFAULT_AXIS + turn * w;
        }
      }
      const [turn, distance] = slotPolar(slot);
      const cb = Math.cos(away + turn), sb = Math.sin(away + turn), cd = Math.cos(distance * D2R), sd = Math.sin(distance * D2R);
      const sx = x * cd + (ex * cb + nx * sb) * sd, sy = y * cd + (ey * cb + ny * sb) * sd, sz = z * cd + nz * sb * sd;
      x = sx; y = sy; z = sz;
      if (hasLand) {
        // respect the habitat even in a tight spot: a slot on the wrong surface settles on its own
        if (isLand(lonOf(x, y), latOf(z), polygons) === cluster.marine) {
          settle(x, y, z, cluster.marine, cluster.marine ? SHELF_DEG : INLAND_DEG, 0, polygons, index, mem.slotShore, carried);
          mem.slotShore = settled.shore ? [settled.sx, settled.sy, settled.sz] : null;
          x = settled.x; y = settled.y; z = settled.z;
        } else mem.slotShore = null;
      }
    }

    // 4. smooth: a marker never teleports. When its proper place changes abruptly (another shore
    //    became the nearest, a strait closed) it travels there at a limited speed instead.
    if (mem.out) {
      const left = angleDeg(mem.out, [x, y, z]);
      const step = Math.max(GLIDE_MIN_DEG, Math.min(GLIDE_MAX_DEG, left * GLIDE_SHARE)) + carried + GLIDE_PER_MA * Math.abs(t - prevTime);
      if (left > step) {
        const f = step / left;
        x = mem.out[0] + (x - mem.out[0]) * f; y = mem.out[1] + (y - mem.out[1]) * f; z = mem.out[2] + (z - mem.out[2]) * f;
        const l = Math.hypot(x, y, z) || 1;
        x /= l; y /= l; z /= l;
        gliding = true;
      }
    }
    mem.out = [x, y, z];
    mem.anchor = anchor;
    out.set(sp.id, { lon: lonOf(x, y), lat: latOf(z) });
  }

  // forget species that are no longer alive, so a reappearance starts fresh
  if (memory.size > alive.length * 2 + 64) {
    for (const id of memory.keys()) if (!out.has(id)) memory.delete(id);
  }
  lastTime = t;
  // while a marker is still gliding the frame is not final: the next call (even at the same time) continues it
  if (gliding) { lastPolygons = null; lastResult = null; } else { lastPolygons = polygons; lastIds = ids; lastResult = out; }
  return out;
}
