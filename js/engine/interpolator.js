// Continental engine — turns js/data/continents.js into the land polygons of any moment.
//
//   getPolygonsAtTime(timeMa) → [{ id, name, color, vertices, labelAt, labelRank, bbox, plateId?, label? }]
//   plateToWorld(plateId, lon, lat, timeMa) → [lon, lat] | null
//   findPlateAt(lon, lat, maxOffshoreDeg?) → plateId | null
//   getKinematicRangeMa() → number
//
// Two regimes (the data file explains the formats):
//
//   RIGID PLATES (0 … kinematic range, 540 Ma). Every plate is its present-day coastline rotated on
//   the sphere by a pose that is slerped between keyframes, so shapes never deform while they drift.
//   Rings cut out of one modern landmass share its name while they are together ("label groups":
//   the present-day map says Asia once, the Devonian one Siberia, Tarim, North China …), and a
//   plate id also covers the plates hanging off it: plateToWorld('eurasia', …) for a point in
//   Siberia follows Siberia.
//
//   DEEP TIME (older). Schematic continents morph from slice to slice. Each morph is planned once
//   ("stage plan"): continents are matched (id → hint → nearest), a split parent is partitioned
//   among its children and a merged child among its parents (power-diagram cells, so the pieces
//   tile the whole at the moment of the split/merge), both outlines of a track are aligned by a
//   best-fit rigid rotation + cyclic shift and re-parametrised onto one shared vertex list. Each
//   frame then only blends vertices in the co-moving frame and applies part of the rigid rotation:
//   a continent that merely drifts keeps its shape, one that changes shape does so without
//   tumbling. The hand-over to the plates is such a morph too; its younger end is the plates
//   themselves, coasting just past their oldest keyframe so velocity is continuous at the switch.
//   Hand-over specifics: a plate leaving a schematic continent keeps its bearing and drifts along
//   the parallels (no great-circle swings past a pole), a plate whose `from` hint names another
//   plate rides out of that plate the way islands ride their main ring, and an island that lies
//   well outside its host's old continent slides into it rigidly rather than being squashed.
//
// Everything is computed on the unit sphere and only projected to longitude/latitude at the very
// end, where a ring that crosses the antimeridian is cut into rings that stop at ±180 and a ring
// that surrounds a pole is closed along the ±90 edge. Edges lying on that frame are "seams"
// (geo.js isSeamEdge) — renderers fill across them but must not stroke them.

import { plates as PLATE_DATA, deepSlices, FIRST_CRUST_MA, labelGroups as LABEL_GROUPS, cratonLineages } from '../data/continents.js';
import { fractalSubdivide, markRenderReady, seedFrom } from './fractal.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const SQDEG = R2D * R2D;            // steradians → square degrees

// Tunables
const DETAIL_DEPTH = 2;             // coastline detail levels baked into sparse deep-time outlines (one less for detailed ones)
const DETAIL_AMPLITUDE = 0.2;
const ALIGN_SAMPLES = 96;           // uniform samples used to align two outlines
const MAX_FIT_SPIN = 60 * D2R;      // largest rigid spin a morph may attribute to a continent
const HANDOVER_SPIN = 15 * D2R;     // … and a plate leaving a schematic continent in the hand-over
const EASE_RAMP = 0.16;             // share of a morph spent accelerating / braking
const COAST_MA = 9;                 // how far past their oldest keyframe plates coast in the hand-over
const CELL_OVERLAP_DEG = 0.6;       // split/merge pieces overlap by this much so no hairline shows
const MIN_CELL_SHARE = 0.012;       // a piece smaller than this share of its host counts as empty
const TUCK_DEPTH_DEG = 0.8;         // hidden fragments sit this far inside their host's outline
const ISLAND_LABELS_FULL = 66;      // (Ma) islands (rings that are not a plate's main ring) are labelled up to here …
const ISLAND_LABELS_GONE = 120;     // … and no longer from here on
const LIM_LON = 179.9999;           // ordinary vertices stay strictly inside the map frame …
const LIM_LAT = 89.9999;            // … so only seam vertices sit exactly on ±180 / ±90

/** Data problems are reported once, on the console, and worked around. */
function warn(message) {
  if (typeof console !== 'undefined') console.warn(`[continents] ${message}`);
}

// =============================================================================================
// Vectors, quaternions
// =============================================================================================

function toVec(lon, lat) {
  const lo = lon * D2R, la = lat * D2R, c = Math.cos(la);
  return [c * Math.cos(lo), c * Math.sin(lo), Math.sin(la)];
}
function toLonLat(v) {
  return [Math.atan2(v[1], v[0]) * R2D, Math.asin(v[2] > 1 ? 1 : v[2] < -1 ? -1 : v[2]) * R2D];
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function unit(a) {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 1e-300 ? [a[0] / l, a[1] / l, a[2] / l] : [1, 0, 0];
}
const angleBetween = (a, b) => Math.atan2(Math.hypot(...cross(a, b)), dot(a, b));

// Quaternions are [w, x, y, z].
const Q_ID = [1, 0, 0, 0];
function qMul(a, b) {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
}
const qConj = (q) => [q[0], -q[1], -q[2], -q[3]];
function qAxisAngle(axis, rad) {
  const s = Math.sin(rad / 2);
  return [Math.cos(rad / 2), axis[0] * s, axis[1] * s, axis[2] * s];
}
/** Spherical interpolation a → b. t outside 0..1 keeps turning about the same axis (extrapolation). */
function qSlerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let s = 1;
  if (d < 0) { d = -d; s = -1; }
  let wa, wb;
  if (d > 0.99999999) {
    wa = 1 - t; wb = t * s;
  } else {
    const th = Math.acos(d), sn = Math.sin(th);
    wa = Math.sin((1 - t) * th) / sn;
    wb = (Math.sin(t * th) / sn) * s;
  }
  const q = [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb, a[3] * wa + b[3] * wb];
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
/** Row-major 3×3 rotation matrix of q, written into m. */
function qToMat(q, m) {
  const w = q[0], x = q[1], y = q[2], z = q[3];
  m[0] = 1 - 2 * (y * y + z * z); m[1] = 2 * (x * y - w * z); m[2] = 2 * (x * z + w * y);
  m[3] = 2 * (x * y + w * z); m[4] = 1 - 2 * (x * x + z * z); m[5] = 2 * (y * z - w * x);
  m[6] = 2 * (x * z - w * y); m[7] = 2 * (y * z + w * x); m[8] = 1 - 2 * (x * x + y * y);
  return m;
}
function qFromMat(m) {
  const tr = m[0] + m[4] + m[8];
  let q;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [s / 4, (m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s];
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    q = [(m[7] - m[5]) / s, s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s];
  } else if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    q = [(m[2] - m[6]) / s, (m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s];
  } else {
    const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
    q = [(m[3] - m[1]) / s, (m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4];
  }
  return q;
}
function qRotate(q, v) {
  const m = qToMat(q, new Array(9));
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}
/** Shortest rotation that carries unit vector a onto unit vector b. */
function qBetween(a, b) {
  const axis = cross(a, b);
  const l = Math.hypot(axis[0], axis[1], axis[2]);
  if (l < 1e-12) return Q_ID;
  return qAxisAngle([axis[0] / l, axis[1] / l, axis[2] / l], Math.atan2(l, dot(a, b)));
}

const Z_AXIS = [0, 0, 1];
const NEAR_POLE_Z = 0.9998;         // |sin lat| above this (lat > ~88.9°) has no usable meridian

/** Longitude of b minus longitude of a (radians, the short way round); 0 if either is at a pole. */
function lonTurn(a, b) {
  if (Math.abs(a[2]) > NEAR_POLE_Z || Math.abs(b[2]) > NEAR_POLE_Z) return 0;
  let d = Math.atan2(b[1], b[0]) - Math.atan2(a[1], a[0]);
  if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * Rotation that carries unit vector a onto b along a's meridian and then about the polar axis, so
 * what lay north of a still lies north of b. (The shortest rotation does not keep bearings: between
 * two points at high latitude it swings everything around the pole.)
 */
function northKeeping(a, b) {
  if (Math.abs(a[2]) > NEAR_POLE_Z || Math.abs(b[2]) > NEAR_POLE_Z) return qBetween(a, b);
  const k = Math.sqrt(Math.max(0, 1 - b[2] * b[2])) / Math.hypot(a[0], a[1]);
  const onMeridian = [a[0] * k, a[1] * k, b[2]];      // a moved to b's latitude
  return qMul(qAxisAngle(Z_AXIS, lonTurn(a, b)), qBetween(a, onMeridian));
}

/** Local east / north / up unit vectors at a point. */
function localFrame(lon, lat) {
  const lo = lon * D2R, la = lat * D2R;
  const sl = Math.sin(lo), cl = Math.cos(lo), sp = Math.sin(la), cp = Math.cos(la);
  return { e: [-sl, cl, 0], n: [-sp * cl, -sp * sl, cp], r: [cp * cl, cp * sl, sp] };
}

/**
 * One track keyframe → the rotation that carries the present-day plate to its place at that time.
 * `key` is either [lon, lat, spin] (where the anchor was; clockwise turn in degrees) or
 * { pole: [lon, lat], angle } (finite rotation, counter-clockwise positive about the pole).
 */
function poseQuat(anchor, key) {
  if (!Array.isArray(key)) return qAxisAngle(toVec(key.pole[0], key.pole[1]), key.angle * D2R);
  const A = localFrame(anchor[0], anchor[1]);
  const B = localFrame(key[0], key[1]);
  const s = (key[2] || 0) * D2R, c = Math.cos(s), sn = Math.sin(s);
  // the plate's old "north" now points clockwise of north by `spin`
  const n2 = [B.n[0] * c + B.e[0] * sn, B.n[1] * c + B.e[1] * sn, B.n[2] * c + B.e[2] * sn];
  const e2 = [B.e[0] * c - B.n[0] * sn, B.e[1] * c - B.n[1] * sn, B.e[2] * c - B.n[2] * sn];
  const m = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i * 3 + j] = e2[i] * A.e[j] + n2[i] * A.n[j] + B.r[i] * A.r[j];
  return qFromMat(m);
}

// =============================================================================================
// Rings on the sphere (Float64Array of x,y,z triples; counter-clockwise = interior on the left)
// =============================================================================================

function ringFromLonLat(points) {
  const xyz = new Float64Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    const v = toVec(points[i][0], points[i][1]);
    xyz[i * 3] = v[0]; xyz[i * 3 + 1] = v[1]; xyz[i * 3 + 2] = v[2];
  }
  return xyz;
}
function ringFromFlat(flat) {
  const n = flat.length >> 1;
  const xyz = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = toVec(flat[i * 2], flat[i * 2 + 1]);
    xyz[i * 3] = v[0]; xyz[i * 3 + 1] = v[1]; xyz[i * 3 + 2] = v[2];
  }
  return xyz;
}
function meanDirection(xyz, n) {
  let x = 0, y = 0, z = 0;
  for (let j = 0; j < n * 3; j += 3) { x += xyz[j]; y += xyz[j + 1]; z += xyz[j + 2]; }
  return unit([x, y, z]);
}
/** Signed solid angle in steradians; positive when the ring runs counter-clockwise seen from outside. */
function signedArea(xyz, n) {
  const c = meanDirection(xyz, n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = i * 3, b = ((i + 1) % n) * 3;
    const ax = xyz[a], ay = xyz[a + 1], az = xyz[a + 2], bx = xyz[b], by = xyz[b + 1], bz = xyz[b + 2];
    // Van Oosterom & Strackee: solid angle of the triangle (c, a, b)
    const triple = c[0] * (ay * bz - az * by) + c[1] * (az * bx - ax * bz) + c[2] * (ax * by - ay * bx);
    const den = 1 + (c[0] * ax + c[1] * ay + c[2] * az) + (ax * bx + ay * by + az * bz) + (bx * c[0] + by * c[1] + bz * c[2]);
    sum += 2 * Math.atan2(triple, den);
  }
  return sum;
}
function reverseRing(xyz, n) {
  const out = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const s = (n - 1 - i) * 3;
    out[i * 3] = xyz[s]; out[i * 3 + 1] = xyz[s + 1]; out[i * 3 + 2] = xyz[s + 2];
  }
  return out;
}
function rotateRing(xyz, n, q) {
  const m = qToMat(q, new Array(9));
  const out = new Float64Array(n * 3);
  for (let j = 0; j < n * 3; j += 3) {
    const x = xyz[j], y = xyz[j + 1], z = xyz[j + 2];
    out[j] = m[0] * x + m[1] * y + m[2] * z;
    out[j + 1] = m[3] * x + m[4] * y + m[5] * z;
    out[j + 2] = m[6] * x + m[7] * y + m[8] * z;
  }
  return out;
}

/** Azimuthal-equidistant map around `centre`: sphere ↔ plane, in degrees. Used for all 2-D work. */
function tangentPlane(centre) {
  const c = centre;
  const ref = Math.abs(c[2]) > 0.999 ? [1, 0, 0] : [0, 0, 1];
  const east = unit(cross(ref, c));
  const north = cross(c, east);
  return {
    project(x, y, z) {
      const d = c[0] * x + c[1] * y + c[2] * z;
      const px = east[0] * x + east[1] * y + east[2] * z;
      const py = north[0] * x + north[1] * y + north[2] * z;
      const l = Math.hypot(px, py);
      if (l < 1e-14) return [0, 0];
      const ang = Math.atan2(l, d) * R2D;
      return [(px / l) * ang, (py / l) * ang];
    },
    unproject(px, py) {
      const ang = Math.hypot(px, py) * D2R;
      if (ang < 1e-14) return [c[0], c[1], c[2]];
      const s = Math.sin(ang) / (ang * R2D), k = Math.cos(ang);
      return [
        c[0] * k + (east[0] * px + north[0] * py) * s,
        c[1] * k + (east[1] * px + north[1] * py) * s,
        c[2] * k + (east[2] * px + north[2] * py) * s,
      ];
    },
  };
}
function projectRing(plane, xyz, n) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = plane.project(xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2]);
  return out;
}
function unprojectRing(plane, poly) {
  const xyz = new Float64Array(poly.length * 3);
  for (let i = 0; i < poly.length; i++) {
    const v = plane.unproject(poly[i][0], poly[i][1]);
    xyz[i * 3] = v[0]; xyz[i * 3 + 1] = v[1]; xyz[i * 3 + 2] = v[2];
  }
  return xyz;
}

// ---- planar helpers (points are [x, y]) -------------------------------------------------------

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Closest point on the outline of poly to (x, y): [qx, qy, distance]. */
function nearestOnPoly(x, y, poly) {
  let bx = x, by = y, bd = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], ay = poly[j][1];
    const dx = poly[i][0] - ax, dy = poly[i][1] - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + dx * t, qy = ay + dy * t;
    const d = (x - qx) * (x - qx) + (y - qy) * (y - qy);
    if (d < bd) { bd = d; bx = qx; by = qy; }
  }
  return [bx, by, Math.sqrt(bd)];
}
function polyArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return a / 2;
}
/** Sutherland–Hodgman: the part of poly where a·x + b·y ≤ c. */
function clipHalfPlane(poly, a, b, c) {
  const out = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const p = poly[j], q = poly[i];
    const dp = a * p[0] + b * p[1] - c, dq = a * q[0] + b * q[1] - c;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
/** A point comfortably inside poly (largest clearance on a coarse-to-fine grid). */
function innerPoint(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of poly) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = (x1 - x0) / 2, hy = (y1 - y0) / 2;
  let best = null, bestD = -1;
  for (let pass = 0; pass < 3; pass++) {
    const G = 8;
    for (let i = 0; i <= G; i++) for (let j = 0; j <= G; j++) {
      const x = cx - hx + (2 * hx * i) / G, y = cy - hy + (2 * hy * j) / G;
      if (!pointInPoly(x, y, poly)) continue;
      const d = nearestOnPoly(x, y, poly)[2];
      if (d > bestD) { bestD = d; best = [x, y]; }
    }
    if (!best) break;
    cx = best[0]; cy = best[1]; hx /= 3; hy /= 3;
  }
  return best || [cx, cy];
}

// ---- arc-length parametrisation ---------------------------------------------------------------

/** Cumulative arc length (radians) at each vertex; entry n is the full perimeter. */
function arcLengths(xyz, n) {
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const a = i * 3, b = ((i + 1) % n) * 3;
    const dx = xyz[b] - xyz[a], dy = xyz[b + 1] - xyz[a + 1], dz = xyz[b + 2] - xyz[a + 2];
    cum[i + 1] = cum[i] + 2 * Math.asin(Math.min(1, Math.hypot(dx, dy, dz) / 2));
  }
  return cum;
}
/** Point on the ring at fraction f (0..1, wraps) of its perimeter, written to out[o..o+2]. */
function pointAtFraction(xyz, n, cum, f, out, o) {
  f -= Math.floor(f);
  const s = f * cum[n];
  let lo = 0, hi = n;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
  const span = cum[lo + 1] - cum[lo];
  const t = span > 0 ? (s - cum[lo]) / span : 0;
  const a = lo * 3, b = ((lo + 1) % n) * 3;
  const x = xyz[a] + (xyz[b] - xyz[a]) * t, y = xyz[a + 1] + (xyz[b + 1] - xyz[a + 1]) * t, z = xyz[a + 2] + (xyz[b + 2] - xyz[a + 2]) * t;
  const l = Math.hypot(x, y, z) || 1;
  out[o] = x / l; out[o + 1] = y / l; out[o + 2] = z / l;
}
function resampleUniform(xyz, n, cum, m) {
  const out = new Float64Array(m * 3);
  for (let i = 0; i < m; i++) pointAtFraction(xyz, n, cum, i / m, out, i * 3);
  return out;
}

// =============================================================================================
// Sphere → map: cut at the antimeridian, close over the poles, emit polygons
// =============================================================================================

let LON = new Float64Array(2048);
let LAT = new Float64Array(2048);
// Map-frame corners in counter-clockwise order of the frame parameter (see frameParam).
const CORNERS = [[-180, -90], [180, -90], [180, 90], [-180, 90]];

// Position of a point on the map frame, increasing counter-clockwise:
// bottom edge 0..1 (west→east), right edge 1..2 (south→north), top 2..3, left edge 3..4 (north→south).
function frameParam(lon, lat) {
  return lon > 0 ? 1 + (lat + 90) / 180 : 3 + (90 - lat) / 180;
}

function ringBBox(vertices) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const p = vertices[i];
    if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
  }
  return [x0, y0, x1, y1];
}

/** Lon/lat polygon area in square degrees of arc (cos-latitude weighted shoelace; sign = winding). */
function mapArea(vertices) {
  let a = 0;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const p = vertices[j], q = vertices[i];
    a += (q[0] - p[0]) * (Math.sin(p[1] * D2R) + Math.sin(q[1] * D2R));
  }
  return (-a / 2) * R2D;
}

/** A point inside a lon/lat polygon: middle of the widest land span along its mid-latitude. */
function mapInnerPoint(vertices, bbox) {
  let best = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2], bestW = -1;
  for (const f of [0.5, 0.35, 0.65]) {
    const lat = bbox[1] + (bbox[3] - bbox[1]) * f;
    const xs = [];
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const p = vertices[j], q = vertices[i];
      if ((p[1] > lat) !== (q[1] > lat)) xs.push(p[0] + ((lat - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      if (xs[k + 1] - xs[k] > bestW) { bestW = xs[k + 1] - xs[k]; best = [(xs[k] + xs[k + 1]) / 2, lat]; }
    }
    if (bestW > 0) break;
  }
  return best;
}

function pushPolygon(out, meta, vertices, bbox, labelAt, rank, piece) {
  markRenderReady(vertices);
  const poly = {
    id: piece ? `${meta.id}~${piece}` : meta.id,
    name: meta.name,
    color: meta.color,
    vertices,
    labelAt,
    labelRank: rank,
    bbox,
  };
  if (meta.plateId) poly.plateId = meta.plateId;
  if (!(rank > 0)) poly.label = false;
  out.push(poly);
}

/**
 * Project one ring (n unit vectors in xyz) and append the resulting polygon(s) to `out`.
 * meta: { id, name, color, plateId?, label: [x,y,z] | null, rank, checkLabel? }
 */
function emitRing(xyz, n, meta, out) {
  if (n < 3) return;
  if (LON.length < n) { LON = new Float64Array(n * 2); LAT = new Float64Array(n * 2); }
  let crossings = 0, prev = 0;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0, j = 0; i < n; i++, j += 3) {
    let lon = Math.atan2(xyz[j + 1], xyz[j]) * R2D;
    const z = xyz[j + 2];
    let lat = Math.asin(z > 1 ? 1 : z < -1 ? -1 : z) * R2D;
    if (lon > LIM_LON) lon = LIM_LON; else if (lon < -LIM_LON) lon = -LIM_LON;
    if (lat > LIM_LAT) lat = LIM_LAT; else if (lat < -LIM_LAT) lat = -LIM_LAT;
    LON[i] = lon; LAT[i] = lat;
    if (i > 0 && Math.abs(lon - prev) > 180) crossings++;
    prev = lon;
    if (lon < x0) x0 = lon; if (lon > x1) x1 = lon;
    if (lat < y0) y0 = lat; if (lat > y1) y1 = lat;
  }
  if (Math.abs(LON[0] - prev) > 180) crossings++;

  let labelAt = null;
  if (meta.label) {
    labelAt = toLonLat(meta.label);
  }

  if (crossings === 0) {
    const vertices = new Array(n);
    for (let i = 0; i < n; i++) vertices[i] = [LON[i], LAT[i]];
    const bbox = [x0, y0, x1, y1];
    if (!labelAt || (meta.checkLabel && meta.rank > 0 && !pointInPoly(labelAt[0], labelAt[1], vertices))) {
      labelAt = mapInnerPoint(vertices, bbox);
    }
    pushPolygon(out, meta, vertices, bbox, labelAt, meta.rank, 0);
    return;
  }

  // ---- the ring crosses the antimeridian: cut it into pieces and re-join them along the frame ----
  // The pairing below assumes the interior is on the left; a ring that arrives clockwise is walked backwards.
  const forward = signedArea(xyz, n) >= 0;
  const at = forward ? (k) => k : (k) => n - 1 - k;
  const segments = [];
  let current = null;
  const head = [];          // vertices before the first crossing; they belong to the last segment
  let headExit = null;
  for (let k = 0; k < n; k++) {
    const i = at(k), j = at((k + 1) % n);
    (current ? current.pts : head).push([LON[i], LAT[i]]);
    if (Math.abs(LON[j] - LON[i]) <= 180) continue;
    // latitude where the great-circle edge i→j meets the antimeridian (y = 0)
    const yi = xyz[i * 3 + 1], yj = xyz[j * 3 + 1];
    const t = Math.abs(yi - yj) > 1e-300 ? yi / (yi - yj) : 0.5;
    const cx = xyz[i * 3] + (xyz[j * 3] - xyz[i * 3]) * t;
    const cz = xyz[i * 3 + 2] + (xyz[j * 3 + 2] - xyz[i * 3 + 2]) * t;
    let lat = Math.atan2(cz, Math.abs(cx)) * R2D;
    if (lat > LIM_LAT) lat = LIM_LAT; else if (lat < -LIM_LAT) lat = -LIM_LAT;
    const side = LON[i] > 0 ? 180 : -180;      // the edge leaves through this side …
    const exit = [side, lat];
    if (current) { current.pts.push(exit); current.exit = frameParam(side, lat); segments.push(current); } else headExit = exit;
    current = { pts: [[-side, lat]], entry: frameParam(-side, lat), exit: 0 };   // … and re-enters through the other
  }
  for (const p of head) current.pts.push(p);
  current.pts.push(headExit);
  current.exit = frameParam(headExit[0], headExit[1]);
  segments.push(current);

  const pieces = [];
  const used = new Array(segments.length).fill(false);
  for (let s0 = 0; s0 < segments.length; s0++) {
    if (used[s0]) continue;
    const vertices = [];
    let s = s0;
    for (let guard = 0; guard <= segments.length; guard++) {
      used[s] = true;
      const seg = segments[s];
      for (const p of seg.pts) vertices.push(p);
      // walk the frame counter-clockwise from this exit to the next entry
      let next = -1, gap = Infinity;
      for (let c = 0; c < segments.length; c++) {
        let d = segments[c].entry - seg.exit;
        if (d <= 1e-12) d += 4;
        if (d < gap) { gap = d; next = c; }
      }
      for (let corner = Math.floor(seg.exit) + 1; corner < seg.exit + gap; corner++) vertices.push(CORNERS[corner % 4]);
      if (next === s0 || used[next]) break;
      s = next;
    }
    if (vertices.length >= 3) pieces.push(vertices);
  }
  if (!pieces.length) return;

  // The piece that holds the label point keeps the id and the label; the rest become "<id>~1",
  // "<id>~2" … (largest first) and are not labelled: one name per landmass.
  pieces.sort((a, b) => Math.abs(mapArea(b)) - Math.abs(mapArea(a)));
  let owner = labelAt ? pieces.findIndex((v) => pointInPoly(labelAt[0], labelAt[1], v)) : -1;
  const labelInside = owner >= 0;
  if (owner < 0) owner = 0;
  let extra = 0;
  for (let p = 0; p < pieces.length; p++) {
    const vertices = pieces[p];
    const bbox = ringBBox(vertices);
    const own = p === owner;
    pushPolygon(out, meta, vertices, bbox, own && labelInside ? labelAt : mapInnerPoint(vertices, bbox), own ? meta.rank : 0, own ? 0 : ++extra);
  }
}

// =============================================================================================
// Plates (rigid regime)
// =============================================================================================

const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Scale factor 0..1 of a ring that emerges over ring.emerge = [fromMa, toMa]. */
function emergence(ring, t) {
  if (!ring.emerge) return 1;
  const span = ring.emerge[0] - ring.emerge[1];
  if (!(span > 0)) return t <= ring.emerge[1] ? 1 : 0;
  return smooth01((ring.emerge[0] - t) / span);
}

function buildPlates() {
  const byId = new Map();
  const list = PLATE_DATA.map((d) => {
    const keys = d.track
      .map((row) => ({ ma: row[0], q: poseQuat(d.anchor, row.length === 2 ? row[1] : row.slice(1)) }))
      .sort((a, b) => a.ma - b.ma);
    const plate = {
      id: d.id,
      name: d.name,
      color: d.color,
      from: d.from ? [].concat(d.from) : null,
      parentId: d.parent || null,
      parent: null,
      keys,
      rings: [],
      qT: NaN,          // memo of plateQuat: the time …
      q: Q_ID,          // … and the world rotation at that time
    };
    plate.rings = (d.rings || []).filter((r) => r.v && r.v.length >= 6).map((r, index) => {
      let xyz = ringFromFlat(r.v);
      const n = xyz.length / 3;
      const area = signedArea(xyz, n);
      if (area < 0) xyz = reverseRing(xyz, n);
      const label = r.label ? toVec(r.label[0], r.label[1]) : ringLabel({ xyz, n });
      return {
        id: r.id,
        name: r.name || d.name,
        named: !!r.name,
        plate,
        n,
        xyz,
        area: Math.abs(area) * SQDEG,
        rank: r.name ? Math.sqrt(Math.abs(area) * SQDEG) : 0,
        label,
        main: index === 0 || !!r.main,
        emerge: r.emerge || null,
        origin: r.origin ? toVec(r.origin[0], r.origin[1]) : label,
        groupId: r.group || null,
        group: null,
        // [name | null, Ma]: older than Ma the ring is labelled with that name (null: not at all)
        oldName: Array.isArray(r.oldName) && Number.isFinite(r.oldName[1]) ? r.oldName : null,
      };
    });
    byId.set(plate.id, plate);
    return plate;
  });
  for (const p of list) {
    if (!p.parentId) continue;
    p.parent = byId.get(p.parentId) || null;
    if (!p.parent) warn(`plate "${p.id}": unknown parent "${p.parentId}" — treated as having none`);
  }
  // a plate must not be its own ancestor
  for (const p of list) {
    const seen = new Set([p]);
    for (let a = p.parent; a; a = a.parent) {
      if (seen.has(a)) { warn(`plate "${p.id}": its parents form a loop — parent dropped`); p.parent = null; break; }
      seen.add(a);
    }
  }
  // The rigid regime reaches as far back as every plate has keyframes.
  const range = list.length ? Math.min(...list.map((p) => p.keys[p.keys.length - 1].ma)) : 0;
  buildLabelGroups(list);
  return { list, byId, range };
}

/**
 * Label groups: rings that were cut out of one modern landmass (Asia → Siberia, Tarim, North China …)
 * share that landmass's name while they are still together (t ≤ until): every member reports the
 * group's name, and only the member that holds the group's label point shows it, ranked by the
 * area of the whole group. Further back each ring is labelled under its own name.
 */
function buildLabelGroups(list) {
  const groups = new Map();
  for (const [id, g] of Object.entries(LABEL_GROUPS || {})) {
    if (!g || !Array.isArray(g.label)) continue;
    groups.set(id, { id, name: g.name || id, until: Number(g.until) || 0, label: toVec(g.label[0], g.label[1]), members: [], holder: null, rank: 0 });
  }
  for (const plate of list) {
    for (const ring of plate.rings) {
      if (!ring.groupId) continue;
      const g = groups.get(ring.groupId);
      if (!g) { warn(`ring "${ring.id}": unknown label group "${ring.groupId}"`); continue; }
      g.members.push(ring);
      ring.group = g;
    }
  }
  for (const g of groups.values()) {
    if (!g.members.length) continue;
    g.rank = Math.sqrt(g.members.reduce((s, r) => s + r.area, 0));
    g.holder = g.members.find((r) => ringContains(r, g.label)) || null;
    if (!g.holder) {
      warn(`label group "${g.id}": its label point lies on none of its rings — the largest one carries it`);
      g.holder = g.members.reduce((a, b) => (b.area > a.area ? b : a));
      g.label = g.holder.label;
    }
  }
}

/** A plate's own (possibly parent-relative) rotation at time t; coasts on past its last keyframe. */
function trackQuat(plate, t) {
  const k = plate.keys;
  const last = k.length - 1;
  if (t <= k[0].ma || last === 0) return k[0].q;
  if (t >= k[last].ma) {
    if (t === k[last].ma) return k[last].q;
    return qSlerp(k[last - 1].q, k[last].q, (t - k[last - 1].ma) / (k[last].ma - k[last - 1].ma));
  }
  let i = 0;
  while (k[i + 1].ma < t) i++;
  return qSlerp(k[i].q, k[i + 1].q, (t - k[i].ma) / (k[i + 1].ma - k[i].ma));
}
/** World rotation of a plate at time t (present-day → then). */
function plateQuat(plate, t) {
  if (plate.qT === t) return plate.q;
  let q = trackQuat(plate, t);
  if (plate.parent) q = qMul(plateQuat(plate.parent, t), q);
  plate.qT = t; plate.q = q;
  return q;
}

let XYZ = new Float64Array(3 * 1024);
const MAT = new Array(9);

/** Rotate (and, while it is emerging, shrink) a plate ring into the scratch buffer. */
function placeRing(ring, m, scale) {
  const n = ring.n, src = ring.xyz;
  if (XYZ.length < n * 3) XYZ = new Float64Array(n * 6);
  if (scale >= 1) {
    for (let j = 0; j < n * 3; j += 3) {
      const x = src[j], y = src[j + 1], z = src[j + 2];
      XYZ[j] = m[0] * x + m[1] * y + m[2] * z;
      XYZ[j + 1] = m[3] * x + m[4] * y + m[5] * z;
      XYZ[j + 2] = m[6] * x + m[7] * y + m[8] * z;
    }
    return;
  }
  const o = ring.origin;
  for (let j = 0; j < n * 3; j += 3) {
    let x = o[0] + (src[j] - o[0]) * scale, y = o[1] + (src[j + 1] - o[1]) * scale, z = o[2] + (src[j + 2] - o[2]) * scale;
    const l = Math.hypot(x, y, z) || 1;
    x /= l; y /= l; z /= l;
    XYZ[j] = m[0] * x + m[1] * y + m[2] * z;
    XYZ[j + 1] = m[3] * x + m[4] * y + m[5] * z;
    XYZ[j + 2] = m[6] * x + m[7] * y + m[8] * z;
  }
}

function kinematicPolygons(t) {
  const out = [];
  for (const plate of PLATES.list) {
    const m = qToMat(plateQuat(plate, t), MAT);
    for (const ring of plate.rings) {
      const scale = emergence(ring, t);
      if (scale < 0.05) continue;
      placeRing(ring, m, scale);
      let lab = ring.label;
      if (scale < 1) {
        const o = ring.origin;
        lab = unit([o[0] + (lab[0] - o[0]) * scale, o[1] + (lab[1] - o[1]) * scale, o[2] + (lab[2] - o[2]) * scale]);
      }
      let name = ring.name, rank = ring.rank * scale;
      if (ring.oldName && t > ring.oldName[1]) { if (ring.oldName[0]) name = ring.oldName[0]; else rank = 0; }
      // modern island names mean little once the islands are part of an older coast: their labels
      // fade out between ISLAND_LABELS_FULL and ISLAND_LABELS_GONE (the names stay on the polygons)
      if (!ring.main && t > ISLAND_LABELS_FULL) rank *= 1 - smooth01((t - ISLAND_LABELS_FULL) / (ISLAND_LABELS_GONE - ISLAND_LABELS_FULL));
      const g = ring.group;
      if (g && t <= g.until) {
        name = g.name;
        if (ring === g.holder) { lab = g.label; rank = g.rank; } else rank = 0;
      }
      const label = [
        m[0] * lab[0] + m[1] * lab[1] + m[2] * lab[2],
        m[3] * lab[0] + m[4] * lab[1] + m[5] * lab[2],
        m[6] * lab[0] + m[7] * lab[1] + m[8] * lab[2],
      ];
      emitRing(XYZ, ring.n, { id: ring.id, name, color: plate.color, plateId: plate.id, label, rank }, out);
    }
  }
  return out;
}

// =============================================================================================
// Deep time: nodes (one continent of one slice), stage plans, tracks
// =============================================================================================

function makeNode(props, xyz, n) {
  const area = signedArea(xyz, n);
  if (area < 0) xyz = reverseRing(xyz, n);
  const centroid = meanDirection(xyz, n);
  return { main: true, from: null, into: null, plateId: null, ring: null, label: null, ...props, xyz, n, centroid, area: Math.abs(area) * SQDEG };
}

function labelOf(node) {
  if (!node.label) {
    const plane = tangentPlane(node.centroid);
    const p = innerPoint(projectRing(plane, node.xyz, node.n));
    node.label = unit(plane.unproject(p[0], p[1]));
  }
  return node.label;
}

/**
 * Round the corners of a hand-drawn outline: every vertex becomes the quadratic curve that runs
 * from the middle of the edge before it to the middle of the edge after it (two segments of it).
 * Doubles the vertex count; the outline still touches every edge midpoint. Edges are taken the
 * short way round, so outlines may cross the antimeridian or circle a pole.
 */
function roundCorners(vertices) {
  const n = vertices.length;
  const near = (lon, ref) => (lon - ref > 180 ? lon - 360 : lon - ref < -180 ? lon + 360 : lon);
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = vertices[(i + n - 1) % n], v = vertices[i], q = vertices[(i + 1) % n];
    const ax = (near(p[0], v[0]) + v[0]) / 2, ay = (p[1] + v[1]) / 2;
    const bx = (v[0] + near(q[0], v[0])) / 2, by = (v[1] + q[1]) / 2;
    out.push([ax, ay], [0.25 * ax + 0.5 * v[0] + 0.25 * bx, 0.25 * ay + 0.5 * v[1] + 0.25 * by]);
  }
  return out;
}

function buildDeepNodes(slice) {
  return slice.continents.filter((c) => Array.isArray(c.vertices) && c.vertices.length >= 3).map((c) => {
    // outlines that are already detailed get one level of coastline detail, sparse ones two
    const depth = c.vertices.length >= 24 ? DETAIL_DEPTH - 1 : DETAIL_DEPTH;
    const detailed = fractalSubdivide(roundCorners(c.vertices), depth, DETAIL_AMPLITUDE, seedFrom(c.id, Math.round(slice.ma)));
    return makeNode({
      id: c.id,
      name: c.name || c.id,
      color: c.color || '#8b7355',
      from: c.from ? [].concat(c.from) : null,
      into: c.into || null,
      group: c.id,
    }, ringFromLonLat(detailed), detailed.length);
  });
}

/** The plates frozen at time t, as nodes: the younger end of the hand-over morph. */
function buildPlateNodes(t) {
  const nodes = [];
  for (const plate of PLATES.list) {
    const q = plateQuat(plate, t);
    for (const ring of plate.rings) {
      if (emergence(ring, t) < 1) continue;   // land that does not exist yet joins later, in the rigid regime
      const old = ring.oldName && t > ring.oldName[1] ? ring.oldName : null;
      const node = makeNode({
        id: ring.id,
        name: old && old[0] ? old[0] : ring.name,
        named: ring.named && !(old && !old[0]) && (ring.main || t <= ISLAND_LABELS_GONE),
        color: plate.color,
        from: plate.from,
        group: plate.id,
        plateId: plate.id,
        main: ring.main,
        ring,
        label: qRotate(q, ring.label),
      }, rotateRing(ring.xyz, ring.n, q), ring.n);
      nodes.push(node);
    }
  }
  return nodes;
}

function nearestNode(nodes, v) {
  let best = null, bd = -2;
  for (const node of nodes) {
    const d = dot(node.centroid, v);
    if (d > bd) { bd = d; best = node; }
  }
  return best;
}

/**
 * Partition `host` among `claimants` (power diagram on their centroids, weighted by area), in the
 * host's tangent plane. Returns Map(claimant → ring {xyz, n} | null when its share is empty).
 */
function partition(host, claimants) {
  const plane = tangentPlane(host.centroid);
  const outline = projectRing(plane, host.xyz, host.n);
  const hostArea = Math.abs(polyArea(outline));
  // The claimants are seen where they are, less the motion they share: a group of blocks that all
  // drift 30° on their way to merging (or a family that drifts off together) is first moved, as a
  // whole, onto the host, so that each block claims the part of the host it really lies against.
  let mx = 0, my = 0, mz = 0;
  for (const c of claimants) { mx += c.centroid[0] * c.area; my += c.centroid[1] * c.area; mz += c.centroid[2] * c.area; }
  const shared = qBetween(unit([mx, my, mz]), host.centroid);
  const sites = claimants.map((c) => {
    const v = qRotate(shared, c.centroid);
    const p = plane.project(v[0], v[1], v[2]);
    return { x: p[0], y: p[1], w: c.area / Math.PI };
  });
  const cells = new Map();
  claimants.forEach((claimant, k) => {
    let poly = outline;
    const a = sites[k];
    for (let j = 0; j < sites.length && poly.length >= 3; j++) {
      if (j === k) continue;
      const b = sites[j];
      const nx = 2 * (b.x - a.x), ny = 2 * (b.y - a.y);
      const reach = Math.hypot(nx, ny);
      if (reach < 1e-9) continue;
      // |p-a|² - wa ≤ |p-b|² - wb, pushed CELL_OVERLAP_DEG towards b
      const c = b.x * b.x + b.y * b.y - a.x * a.x - a.y * a.y - b.w + a.w + CELL_OVERLAP_DEG * reach;
      poly = clipHalfPlane(poly, nx, ny, c);
    }
    if (poly.length < 3 || Math.abs(polyArea(poly)) < hostArea * MIN_CELL_SHARE) { cells.set(claimant, null); return; }
    cells.set(claimant, { xyz: unprojectRing(plane, poly), n: poly.length });
  });
  return cells;
}

/**
 * A copy of `frag` (same vertices, same order) tucked inside `host`: slid rigidly towards the
 * host's interior until it fits, any vertex still outside pulled just inside the host's outline.
 * This is the hidden start (or end) shape of a fragment that has no share of its own.
 * keepBearing: slide it so that north stays north (see northKeeping) — used in the hand-over.
 */
function tuckInside(host, frag, keepBearing = false) {
  const plane = tangentPlane(host.centroid);
  const outline = projectRing(plane, host.xyz, host.n);
  const target = labelOf(host);
  const total = angleBetween(frag.centroid, target);
  const axis = unit(cross(frag.centroid, target));
  const stride = Math.max(1, Math.floor(frag.n / 48));
  let best = frag.xyz, bestInside = -1;
  const STEPS = 24;
  const c = frag.centroid;
  for (let s = 0; s <= STEPS; s++) {
    const f = s / STEPS;
    const slide = keepBearing
      ? northKeeping(c, unit([c[0] + (target[0] - c[0]) * f, c[1] + (target[1] - c[1]) * f, c[2] + (target[2] - c[2]) * f]))
      : qAxisAngle(axis, total * f);
    const moved = s === 0 ? frag.xyz : rotateRing(frag.xyz, frag.n, slide);
    let inside = 0, tested = 0;
    for (let i = 0; i < frag.n; i += stride) {
      const p = plane.project(moved[i * 3], moved[i * 3 + 1], moved[i * 3 + 2]);
      tested++;
      if (pointInPoly(p[0], p[1], outline)) inside++;
    }
    if (inside > bestInside) { bestInside = inside; best = moved; }
    if (inside === tested) break;
  }
  return { xyz: clampInside(plane, outline, best, frag.n), n: frag.n };
}

/**
 * Copy of a ring with every vertex outside `outline` pulled just inside it: to the nearest point of
 * the outline and TUCK_DEPTH_DEG beyond. (Stopping exactly on the outline would leave slivers whose
 * edges coincide with the host's coast.)
 */
function clampInside(plane, outline, xyz, n) {
  const out = new Float64Array(xyz);
  for (let i = 0; i < n; i++) {
    const p = plane.project(xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2]);
    if (pointInPoly(p[0], p[1], outline)) continue;
    const q = nearestOnPoly(p[0], p[1], outline);
    let x = q[0], y = q[1];
    if (q[2] > 1e-9) {
      const k = TUCK_DEPTH_DEG / q[2];
      const ix = q[0] + (q[0] - p[0]) * k, iy = q[1] + (q[1] - p[1]) * k;
      if (pointInPoly(ix, iy, outline)) { x = ix; y = iy; }
    }
    const v = plane.unproject(x, y);
    out[i * 3] = v[0]; out[i * 3 + 1] = v[1]; out[i * 3 + 2] = v[2];
  }
  return out;
}

/** Best spin (within ±maxSpin) about axis `c` taking points a[i] onto b[(i+shift) % m]: returns [angle, score]. */
function bestSpin(a, b, m, shift, c, maxSpin = MAX_FIT_SPIN) {
  let A = 0, B = 0;
  for (let i = 0; i < m; i++) {
    const p = i * 3, q = ((i + shift) % m) * 3;
    const ax = a[p], ay = a[p + 1], az = a[p + 2], bx = b[q], by = b[q + 1], bz = b[q + 2];
    const ca = c[0] * ax + c[1] * ay + c[2] * az, cb = c[0] * bx + c[1] * by + c[2] * bz;
    A += ax * bx + ay * by + az * bz - ca * cb;
    B += bx * (c[1] * az - c[2] * ay) + by * (c[2] * ax - c[0] * az) + bz * (c[0] * ay - c[1] * ax);
  }
  let th = Math.atan2(B, A);
  if (th > maxSpin) th = maxSpin; else if (th < -maxSpin) th = -maxSpin;
  return [th, A * Math.cos(th) + B * Math.sin(th)];
}

/**
 * Build a morph track between two rings.
 *   A (start) and B (end, expressed in the start's frame) share one vertex list of N points;
 *   q is the rigid rotation start-frame → end-frame. World position of vertex i at eased
 *   progress e:  R(e) · normalise(A[i] + (B[i] − A[i])·e), where R(e) runs from identity to q —
 *   by slerp, or (turn ≠ 0) as a turn of e·turn about the polar axis after e of the rest, qr.
 * sameOrder: the rings already correspond vertex to vertex (a tucked copy and its original).
 * handOver:  the end is a plate. A plate leaving a schematic continent has no shape there to match
 *   a spin to, so it keeps its bearing: a share of the continent may only turn a little, and a
 *   copy tucked inside it (slid with tuckInside(…, true)) turns back exactly. On its way it drifts
 *   along the parallels rather than along a great circle, which at high latitude would sweep it
 *   (and everything riding with it) past the pole.
 */
function fitTrack(start, end, sameOrder, handOver = false) {
  const cS = meanDirection(start.xyz, start.n);
  const cE = meanDirection(end.xyz, end.n);
  const q0 = handOver ? northKeeping(cS, cE) : qBetween(cS, cE);
  let q, N, A, endPts;
  if (sameOrder) {
    N = start.n;
    const moved = rotateRing(start.xyz, N, q0);
    const [th] = bestSpin(moved, end.xyz, N, 0, cE);
    q = qMul(qAxisAngle(cE, th), q0);
    A = new Float64Array(start.xyz);
    endPts = end.xyz;
  } else {
    const M = ALIGN_SAMPLES;
    const maxSpin = handOver ? HANDOVER_SPIN : MAX_FIT_SPIN;
    const cumS = arcLengths(start.xyz, start.n), cumE = arcLengths(end.xyz, end.n);
    const moved = rotateRing(resampleUniform(start.xyz, start.n, cumS, M), M, q0);
    const target = resampleUniform(end.xyz, end.n, cumE, M);
    let shift = 0, spin = 0, bestScore = -Infinity;
    for (let k = 0; k < M; k++) {
      const [th, score] = bestSpin(moved, target, M, k, cE, maxSpin);
      if (score > bestScore) { bestScore = score; shift = k; spin = th; }
    }
    q = qMul(qAxisAngle(cE, spin), q0);
    // Shared vertex list: every vertex of either outline, placed by fraction of perimeter.
    // Fraction f of the start corresponds to fraction f + shift/M of the end.
    const delta = shift / M;
    const fr = [];
    for (let i = 0; i < end.n; i++) fr.push(cumE[i] / cumE[end.n]);
    for (let i = 0; i < start.n; i++) { let f = cumS[i] / cumS[start.n] + delta; f -= Math.floor(f); fr.push(f); }
    fr.sort((a, b) => a - b);
    const fractions = [];
    for (const f of fr) if (!fractions.length || f - fractions[fractions.length - 1] > 1e-7) fractions.push(f);
    N = fractions.length;
    A = new Float64Array(N * 3);
    endPts = new Float64Array(N * 3);
    for (let i = 0; i < N; i++) {
      pointAtFraction(start.xyz, start.n, cumS, fractions[i] - delta, A, i * 3);
      pointAtFraction(end.xyz, end.n, cumE, fractions[i], endPts, i * 3);
    }
  }
  const turn = handOver ? lonTurn(cS, cE) : 0;
  return { N, A, B: rotateRing(endPts, N, qConj(q)), q, turn, qr: turn ? qMul(qAxisAngle(Z_AXIS, -turn), q) : q };
}

/** Rotation of a track at eased progress e (identity at 0, tr.q at 1); see fitTrack. */
function pathQuat(tr, e) {
  return tr.turn ? qMul(qAxisAngle(Z_AXIS, tr.turn * e), qSlerp(Q_ID, tr.qr, e)) : qSlerp(Q_ID, tr.q, e);
}

function ringLabel(ring) {
  const plane = tangentPlane(meanDirection(ring.xyz, ring.n));
  const p = innerPoint(projectRing(plane, ring.xyz, ring.n));
  return unit(plane.unproject(p[0], p[1]));
}
const ringRank = (ring) => Math.sqrt(Math.abs(signedArea(ring.xyz, ring.n)) * SQDEG);

/**
 * Plan the morph from the continents of an older slice (A) to those of the next younger one (B);
 * handOver: B are the plates at the start of the rigid regime.
 * Returns { tracks, byYounger: Map(id → [track]), byPlateRing: Map(ring → track) }.
 */
function buildPlan(A, B, handOver = false) {
  const byIdA = new Map(A.map((a) => [a.id, a]));

  // 0. A plate whose `from` hint names another PLATE (before naming any continent of A) breaks out
  //    of that plate: none of its rings gets a share of A; they all ride the other plate's main
  //    track like islands (step 4). Chains are followed; a loop rides nothing.
  const platesWithMains = new Set(B.filter((b) => b.main && b.plateId).map((b) => b.group));
  const rideOf = new Map();
  for (const b of B) {
    if (!b.plateId || rideOf.has(b.group)) continue;
    let ride = null;
    for (const id of b.from || []) {
      if (byIdA.has(id)) break;
      if (id !== b.group && platesWithMains.has(id)) { ride = id; break; }
    }
    rideOf.set(b.group, ride);
  }
  const hostGroupOf = (group) => {
    const seen = new Set([group]);
    for (let g = rideOf.get(group); g; g = rideOf.get(g)) {
      if (seen.has(g)) return group;
      seen.add(g);
      if (!rideOf.get(g)) return g;
    }
    return group;
  };
  const rides = (b) => hostGroupOf(b.group) !== b.group;

  const mains = B.filter((b) => b.main && !rides(b));
  const byIdB = new Map(mains.map((b) => [b.id, b]));

  // 1. where does every younger continent come from?
  const kids = new Map(A.map((a) => [a, []]));
  const sourceOf = new Map();
  for (const b of mains) {
    let src = byIdA.get(b.id);
    if (!src && b.from) for (const id of b.from) { if (byIdA.has(id)) { src = byIdA.get(id); break; } }
    if (!src) src = nearestNode(A, b.centroid);
    sourceOf.set(b, src);
    kids.get(src).push(b);
  }
  // 2. older continents with no descendant fuse into a younger one
  const parents = new Map(mains.map((b) => [b, [sourceOf.get(b)]]));
  const fusing = [];
  for (const a of A) {
    if (kids.get(a).length || !mains.length) continue;
    const dst = (a.into && byIdB.get(a.into)) || nearestNode(mains, a.centroid);
    fusing.push([a, dst]);
    parents.get(dst).push(a);
  }
  // 3. shares: a split parent among its children, a merged child among its parents
  const splitCells = new Map();
  for (const a of A) if (kids.get(a).length > 1) splitCells.set(a, partition(a, kids.get(a)));
  const mergeCells = new Map();
  for (const b of mains) if (parents.get(b).length > 1) mergeCells.set(b, partition(b, parents.get(b)));

  const tracks = [];
  const byYounger = new Map();
  const byPlateRing = new Map();
  const mainTrackOf = new Map();
  const addTrack = (tr) => {
    tracks.push(tr);
    if (!byYounger.has(tr.youngerId)) byYounger.set(tr.youngerId, []);
    byYounger.get(tr.youngerId).push(tr);
    return tr;
  };

  // A label position: the preferred point when it lies inside the ring, else the ring's own middle.
  const labelIn = (ring, preferred) => (ringContains(ring, preferred) ? preferred : ringLabel(ring));

  const connect = (a, b, descends) => {
    // start shape (at the older slice): the whole parent, its share of a split parent, or — when
    // that share is empty — a copy of the child tucked inside the parent
    let start = a, end = b, tucked = false;
    if (descends && kids.get(a).length > 1) {
      start = splitCells.get(a).get(b);
      if (!start) { start = tuckInside(a, b, handOver); tucked = true; }
    }
    // end shape (at the younger slice): the whole child, or this parent's share of a merged child
    if (parents.get(b).length > 1 && !tucked) {
      end = mergeCells.get(b).get(a);
      if (!end) { end = tuckInside(b, a, handOver); tucked = start === a; }
    }
    const fit = fitTrack(start, end, tucked, handOver);
    // identity: the chain parent → heir keeps the older name for the first half of the morph and
    // takes the younger one for the second; side branches keep their own name and only show a
    // label while they are a visible, separate piece.
    const siblings = kids.get(a);
    const heir = descends && (siblings.length === 1 || b.id === a.id
      || (!siblings.some((s) => s.id === a.id) && siblings.every((s) => s.area <= b.area)));
    const tr = {
      ...fit,
      older: a, younger: b, youngerId: b.id,
      idA: heir ? a.id : descends ? b.id : a.id,
      idB: descends ? b.id : a.id,
      nameA: heir ? a.name : descends ? b.name : a.name,
      nameB: descends ? b.name : a.name,
      colorA: a.color, colorB: b.color,
      plateId: b.plateId,
      plate: b.ring ? b.ring.plate : null,
      labelA: start === a || heir ? labelIn(start, labelOf(a)) : ringLabel(start),
      labelB: qRotate(qConj(fit.q), end === b || descends ? labelIn(end, labelOf(b)) : ringLabel(end)),
      rankA: start === a || heir ? Math.sqrt(a.area) : ringRank(start),
      rankB: end === b || descends ? Math.sqrt(b.area) : ringRank(end),
      showA: descends ? heir : true,        // label visible while progress < 0.5
      showB: descends,                      // label visible while progress ≥ 0.5
      end,                                  // world shape at the younger slice (for riding lineages)
    };
    addTrack(tr);
    if (descends) { mainTrackOf.set(b, tr); if (b.ring) byPlateRing.set(b.ring, tr); }
    return tr;
  };

  for (const b of mains) connect(sourceOf.get(b), b, true);
  for (const [a, b] of fusing) connect(a, b, false);

  // 4. islands of a plate (and every ring of a plate that rides another one) ride with the nearest
  //    main ring of their host plate and stay hidden inside its older continent at the start
  const groupMains = new Map();
  for (const b of mains) {
    if (!groupMains.has(b.group)) groupMains.set(b.group, []);
    groupMains.get(b.group).push(b);
  }
  const planes = new Map();
  for (const b of B) {
    if (b.main && !rides(b)) continue;
    const hosts = groupMains.get(hostGroupOf(b.group));
    if (!hosts) continue;
    const hostTrack = mainTrackOf.get(nearestNode(hosts, b.centroid));
    const parent = hostTrack.older;
    if (!planes.has(parent)) {
      const plane = tangentPlane(parent.centroid);
      planes.set(parent, { plane, outline: projectRing(plane, parent.xyz, parent.n) });
    }
    const { plane, outline } = planes.get(parent);
    const inStartFrame = rotateRing(b.xyz, b.n, qConj(hostTrack.q));
    const rank = b.named === false ? 0 : Math.sqrt(b.area);
    // hidden start: slid rigidly into the old continent when it lies well outside it (clamping each
    // vertex on its own would smear a distant island into a long sliver), else just clamped
    const centre = meanDirection(inStartFrame, b.n);
    const cp = plane.project(centre[0], centre[1], centre[2]);
    const start = pointInPoly(cp[0], cp[1], outline) || nearestOnPoly(cp[0], cp[1], outline)[2] < 2
      ? clampInside(plane, outline, inStartFrame, b.n)
      : tuckInside(parent, { xyz: inStartFrame, n: b.n, centroid: centre }, handOver).xyz;
    const tr = addTrack({
      N: b.n, A: start, B: inStartFrame,
      q: hostTrack.q, turn: hostTrack.turn, qr: hostTrack.qr,
      older: parent, younger: b, youngerId: b.id,
      idA: b.id, idB: b.id, nameA: b.name, nameB: b.name, colorA: parent.color, colorB: b.color,
      plateId: b.plateId, plate: b.ring ? b.ring.plate : null,
      labelA: null, labelB: qRotate(qConj(hostTrack.q), labelOf(b)),
      rankA: 0, rankB: rank, showA: false, showB: rank > 0,
      end: b,
    });
    tr.labelA = tr.labelB;
    if (b.ring) byPlateRing.set(b.ring, tr);
  }
  return { tracks, byYounger, byPlateRing };
}

// =============================================================================================
// Stages: the list of morph intervals, oldest first; the last one is the hand-over to the plates
// =============================================================================================

const PLATES = buildPlates();
const RANGE = PLATES.range;

const STAGES = [];
{
  const slices = [];
  for (const s of deepSlices.filter((d) => d.ma > RANGE && Array.isArray(d.continents)).sort((a, b) => b.ma - a.ma)) {
    if (slices.length && slices[slices.length - 1].ma === s.ma) warn(`two deep-time slices at ${s.ma} Ma — the second is ignored`);
    else slices.push(s);
  }
  const levels = slices.map((s) => ({ ma: s.ma, nodes: null, build: () => buildDeepNodes(s) }));
  levels.push({ ma: RANGE, nodes: null, build: () => buildPlateNodes(RANGE) });
  for (let i = 0; i + 1 < levels.length; i++) {
    STAGES.push({ older: levels[i], younger: levels[i + 1], plan: null, handOver: i + 2 === levels.length });
  }
}
const OLDEST = STAGES.length ? STAGES[0].older : null;
// Land starts to form here; never later than the oldest slice, which must be complete at its own time.
const CRUST_START = OLDEST ? Math.max(FIRST_CRUST_MA, OLDEST.ma) : FIRST_CRUST_MA;

function nodesOf(level) {
  if (!level.nodes) level.nodes = level.build();
  return level.nodes;
}
function planOf(stage) {
  if (!stage.plan) stage.plan = buildPlan(nodesOf(stage.older), nodesOf(stage.younger), stage.handOver);
  return stage.plan;
}
function stageAt(t) {
  for (const stage of STAGES) if (t <= stage.older.ma && t > stage.younger.ma) return stage;
  return null;
}

// Stage plans cost a few milliseconds each (the hand-over ~15 ms) the first time they are needed.
// In a browser they are prepared one at a time while the page is idle, so playback never hitches.
if (typeof globalThis.document !== 'undefined') {
  const later = typeof globalThis.requestIdleCallback === 'function'
    ? (fn) => globalThis.requestIdleCallback(fn)
    : (fn) => globalThis.setTimeout(fn, 250);
  let next = STAGES.length - 1;
  const prepare = () => {
    if (next < 0) return;
    planOf(STAGES[next--]);
    later(prepare);
  };
  later(prepare);
}

/** Morph progress 0..1 → eased progress: constant speed with a short run-up and run-down. */
function ease(a) {
  if (a <= 0) return 0;
  if (a >= 1) return 1;
  const p = EASE_RAMP, v = 1 / (1 - p);
  if (a < p) return (v * a * a) / (2 * p);
  if (a > 1 - p) return 1 - (v * (1 - a) * (1 - a)) / (2 * p);
  return v * (a - p / 2);
}

const hexCache = new Map();
function mixHex(a, b, t) {
  if (a === b || t <= 0) return a;
  if (t >= 1) return b;
  const key = a + b + ((t * 32) | 0);
  let hex = hexCache.get(key);
  if (!hex) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const k = ((t * 32) | 0) / 32;
    const ch = (s) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * k);
    hex = '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
    hexCache.set(key, hex);
  }
  return hex;
}

/**
 * In the hand-over the plates do not stand still at the far end: they coast a little past their
 * oldest keyframe (never more than COAST_MA), so that position AND velocity match the rigid
 * regime at the switch. Returns the extra rotation for a plate at time t, progress e.
 */
function coastQuat(plate, t, e) {
  const tEff = RANGE + COAST_MA * (1 - Math.exp(-(t - RANGE) / COAST_MA));
  const d = qMul(plateQuat(plate, tEff), qConj(plateQuat(plate, RANGE)));
  return qSlerp(Q_ID, d, e);
}

/** Rigid rotation of a track at time t (eased progress e), as a quaternion. */
function trackRotation(stage, tr, t, e) {
  const q = pathQuat(tr, e);
  return stage.handOver && tr.plate ? qMul(coastQuat(tr.plate, t, e), q) : q;
}

function morphPolygons(stage, t) {
  const plan = planOf(stage);
  const alpha = (stage.older.ma - t) / (stage.older.ma - stage.younger.ma);
  const e = ease(alpha);
  const late = alpha >= 0.5;
  const out = [];
  for (const tr of plan.tracks) {
    const m = qToMat(trackRotation(stage, tr, t, e), MAT);
    const N = tr.N, A = tr.A, B = tr.B;
    if (XYZ.length < N * 3) XYZ = new Float64Array(N * 6);
    for (let j = 0; j < N * 3; j += 3) {
      let x = A[j] + (B[j] - A[j]) * e, y = A[j + 1] + (B[j + 1] - A[j + 1]) * e, z = A[j + 2] + (B[j + 2] - A[j + 2]) * e;
      const l = Math.hypot(x, y, z) || 1;
      x /= l; y /= l; z /= l;
      XYZ[j] = m[0] * x + m[1] * y + m[2] * z;
      XYZ[j + 1] = m[3] * x + m[4] * y + m[5] * z;
      XYZ[j + 2] = m[6] * x + m[7] * y + m[8] * z;
    }
    const la = tr.labelA, lb = tr.labelB;
    const lx = la[0] + (lb[0] - la[0]) * e, ly = la[1] + (lb[1] - la[1]) * e, lz = la[2] + (lb[2] - la[2]) * e;
    const ll = Math.hypot(lx, ly, lz) || 1;
    const label = [
      (m[0] * lx + m[1] * ly + m[2] * lz) / ll,
      (m[3] * lx + m[4] * ly + m[5] * lz) / ll,
      (m[6] * lx + m[7] * ly + m[8] * lz) / ll,
    ];
    const shown = late ? tr.showB : tr.showA;
    emitRing(XYZ, N, {
      id: late ? tr.idB : tr.idA,
      name: late ? tr.nameB : tr.nameA,
      color: mixHex(tr.colorA, tr.colorB, e),
      plateId: tr.plateId,
      label,
      rank: shown ? tr.rankA + (tr.rankB - tr.rankA) * e : 0,
      checkLabel: true,
    }, out);
  }
  return out;
}

/** Between the first crust and the oldest slice, that slice's continents grow from nothing. */
function nascentPolygons(t) {
  const out = [];
  if (!OLDEST) return out;
  const scale = smooth01((CRUST_START - t) / (CRUST_START - OLDEST.ma));
  if (scale < 0.04) return out;
  for (const node of nodesOf(OLDEST)) {
    const o = labelOf(node), n = node.n, src = node.xyz;
    if (XYZ.length < n * 3) XYZ = new Float64Array(n * 6);
    for (let j = 0; j < n * 3; j += 3) {
      const x = o[0] + (src[j] - o[0]) * scale, y = o[1] + (src[j + 1] - o[1]) * scale, z = o[2] + (src[j + 2] - o[2]) * scale;
      const l = Math.hypot(x, y, z) || 1;
      XYZ[j] = x / l; XYZ[j + 1] = y / l; XYZ[j + 2] = z / l;
    }
    emitRing(XYZ, n, { id: node.id, name: node.name, color: node.color, label: o, rank: Math.sqrt(node.area) * scale }, out);
  }
  return out;
}

function cleanTime(timeMa) {
  const t = Number(timeMa);
  return t > 0 ? t : 0;   // NaN and negatives → the present
}

// =============================================================================================
// Public API
// =============================================================================================

let memoTime = NaN;
let memoPolygons = null;

/**
 * Land polygons at a moment in time. Render-ready: vertices are dense, longitudes stay within
 * ±180 and latitudes within ±90, rings never cross the antimeridian, and a ring around a pole is
 * closed along the ±90 edge.
 *
 * @param {number} timeMa
 * @returns {Array<{id:string, name:string, color:string, vertices:number[][], labelAt:number[],
 *   labelRank:number, bbox:number[], plateId?:string, label?:false}>}
 *   labelAt   a point well inside the shape for its name
 *   labelRank importance of that name ≈ √area in degrees (Africa ≈ 49, Greenland ≈ 13, Great
 *             Britain ≈ 4); 0 (and label:false) = do not label
 *   bbox      [minLon, minLat, maxLon, maxLat]
 *   plateId   the rigid plate a polygon belongs to (rigid regime and hand-over)
 * The array itself carries a non-enumerable `timeMa`. The same timeMa returns the same array.
 */
export function getPolygonsAtTime(timeMa) {
  const t = cleanTime(timeMa);
  if (t === memoTime) return memoPolygons;
  let polygons;
  if (t <= RANGE) polygons = kinematicPolygons(t);
  else if (!OLDEST) polygons = [];
  else if (t <= OLDEST.ma) polygons = morphPolygons(stageAt(t), t);
  else if (t < CRUST_START) polygons = nascentPolygons(t);
  else polygons = [];
  Object.defineProperty(polygons, 'timeMa', { value: t });
  memoTime = t;
  memoPolygons = polygons;
  return polygons;
}

/** Oldest time (Ma) covered by the rigid-plate regime. */
export function getKinematicRangeMa() {
  return RANGE;
}

let modernPolygons = null;
function modern() {
  if (!modernPolygons) modernPolygons = kinematicPolygons(0);
  return modernPolygons;
}

/**
 * Which plate does a PRESENT-DAY coordinate sit on?
 * Plates are tested in the order they are listed in continents.js. A point just offshore (within
 * maxOffshoreDeg of a coast) is given to the nearest plate; pass 0 to accept land only.
 * @returns {string|null} plate id
 */
export function findPlateAt(lon, lat, maxOffshoreDeg = 4) {
  if (!(lat >= -90 && lat <= 90) || !Number.isFinite(lon)) return null;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  const polys = modern();
  for (const p of polys) {
    const b = p.bbox;
    if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
    if (pointInPoly(lon, lat, p.vertices)) return p.plateId;
  }
  if (!(maxOffshoreDeg > 0)) return null;
  const k = Math.max(0.05, Math.cos(lat * D2R));
  let best = null, bestD = maxOffshoreDeg;
  for (const p of polys) {
    const b = p.bbox;
    if ((b[0] - lon) * k > bestD || (lon - b[2]) * k > bestD || b[1] - lat > bestD || lat - b[3] > bestD) continue;
    const v = p.vertices;
    for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
      const ax = v[j][0], ay = v[j][1], bx = v[i][0], by = v[i][1];
      if ((Math.abs(ax) === 180 && ax === bx) || (Math.abs(ay) === 90 && ay === by)) continue;   // seam, not coast
      const dx = (bx - ax) * k, dy = by - ay;
      const l2 = dx * dx + dy * dy;
      let u = l2 > 0 ? ((lon - ax) * k * dx + (lat - ay) * dy) / l2 : 0;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const d = Math.hypot((lon - ax) * k - dx * u, lat - ay - dy * u);
      if (d < bestD) { bestD = d; best = p.plateId; }
    }
  }
  return best;
}

// ---- riding a plate (and, further back, the continents it descends from) -----------------------

/** Is `plate` the plate `root` itself or one that hangs off it (parent, grandparent …)? */
function descendsFrom(plate, root) {
  for (let p = plate, k = 0; p && k < 64; p = p.parent, k++) if (p === root) return true;
  return false;
}
const resolveCache = new Map();
/**
 * A plate id names that plate AND the blocks that hang off it today: 'eurasia' covers Siberia,
 * Tarim, North China …, which ride their own tracks in deep time. A point given with such an id is
 * carried by the most specific of them that it lies on (or just off).
 */
function resolvePlate(plate, lon, lat) {
  const key = `${plate.id}|${lon}|${lat}`;
  let hit = resolveCache.get(key);
  if (hit) return hit;
  hit = plate;
  const id = findPlateAt(lon, lat);
  const found = id ? PLATES.byId.get(id) : null;
  if (found && found !== plate && descendsFrom(found, plate)) hit = found;
  if (resolveCache.size > 2000) resolveCache.clear();
  resolveCache.set(key, hit);
  return hit;
}

const pathCache = new Map();

/** The main ring of a plate that a present-day point belongs to (the nearest one for islands). */
function hostRing(plate, v) {
  let best = null, bd = -2;
  for (const ring of plate.rings) {
    if (!ring.main) continue;
    const d = dot(ring.label, v);
    if (d > bd) { bd = d; best = ring; }
  }
  return best;
}

function ringContains(ring, v) {
  const plane = tangentPlane(meanDirection(ring.xyz, ring.n));
  const p = plane.project(v[0], v[1], v[2]);
  return pointInPoly(p[0], p[1], projectRing(plane, ring.xyz, ring.n));
}

// A site that was offshore of the younger outline may end up this much further offshore of the
// older one before it is tucked inside (offshore sites stay offshore); a site that was on land
// stays on land.
const CARRY_SLACK_DEG = 2;

/**
 * Where a site riding a track sits at the track's OLDER end. The outline does not just turn, it
 * changes shape (A → B share one vertex list; see fitTrack), so turning the site rigidly — as the
 * outline's best-fit rotation does — lets it drift off its land a little at every slice, and over a
 * dozen slices into the Archean by tens of degrees. Instead the site keeps its place in the shape:
 * its mean value coordinates with respect to B (computed in an azimuthal map centred on the site,
 * where angles and distances from it are true) are applied to A. Where the outline does not
 * change, the site does not move. An image that still lands well outside A (deep concavities) is
 * tucked just inside A's outline.
 * x: the site in the start frame at the younger end (inside or near B). Returns a unit vector.
 */
function carryBack(x, tr) {
  const N = tr.N, A = tr.A, B = tr.B;
  if (!N || N < 3) return x;
  const plane = tangentPlane(x);
  const px = new Float64Array(N), py = new Float64Array(N), r = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const p = plane.project(B[i * 3], B[i * 3 + 1], B[i * 3 + 2]);
    px[i] = p[0]; py[i] = p[1]; r[i] = Math.hypot(p[0], p[1]);
    if (r[i] < 1e-9) return unit([A[i * 3], A[i * 3 + 1], A[i * 3 + 2]]);   // on a vertex
  }
  const half = new Float64Array(N);     // tan(α/2) of the angle at the site between vertices i, i+1
  for (let i = 0; i < N; i++) {
    const j = i + 1 === N ? 0 : i + 1;
    const cr = px[i] * py[j] - py[i] * px[j];
    const rr = r[i] * r[j];
    const den = rr + px[i] * px[j] + py[i] * py[j];
    if (den <= 1e-12 * rr) {
      // on the edge i–j: the same fraction of the way along A's edge
      const f = r[i] / (r[i] + r[j]);
      return unit([
        A[i * 3] + (A[j * 3] - A[i * 3]) * f,
        A[i * 3 + 1] + (A[j * 3 + 1] - A[i * 3 + 1]) * f,
        A[i * 3 + 2] + (A[j * 3 + 2] - A[i * 3 + 2]) * f,
      ]);
    }
    half[i] = cr / den;
  }
  let W = 0, ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0;
  for (let i = 0; i < N; i++) {
    const w = (half[i === 0 ? N - 1 : i - 1] + half[i]) / r[i];
    W += w;
    ax += w * A[i * 3]; ay += w * A[i * 3 + 1]; az += w * A[i * 3 + 2];
    bx += w * B[i * 3]; by += w * B[i * 3 + 1]; bz += w * B[i * 3 + 2];
  }
  let xa = Math.abs(W) > 1e-12 ? unit([ax / W, ay / W, az / W]) : null;
  if (!xa || !Number.isFinite(xa[0]) || !Number.isFinite(xa[1]) || !Number.isFinite(xa[2])) xa = x;
  else {
    // the coordinates reproduce the site on B only up to the map's distortion: remove that residue,
    // so that an unchanged outline leaves the site exactly where it was
    const xb = unit([bx / W, by / W, bz / W]);
    if (Number.isFinite(xb[0]) && dot(xb, x) < 1 - 1e-15) xa = qRotate(qBetween(xb, x), xa);
  }
  // keep the site with its land at the older end
  const pa = tangentPlane(meanDirection(A, N));
  const outA = projectRing(pa, A, N);
  const p = pa.project(xa[0], xa[1], xa[2]);
  if (pointInPoly(p[0], p[1], outA)) return xa;
  const pb = tangentPlane(meanDirection(B, N));
  const outB = projectRing(pb, B, N);
  const q = pb.project(x[0], x[1], x[2]);
  const offB = pointInPoly(q[0], q[1], outB) ? 0 : nearestOnPoly(q[0], q[1], outB)[2];
  if (offB > 0 && nearestOnPoly(p[0], p[1], outA)[2] <= offB + CARRY_SLACK_DEG) return xa;
  return tuckInto({ xyz: A, n: N }, xa);
}

// Craton lineages (continents.js, section 4): present-day circles → preferred deep-time continents.
const LINEAGES = (Array.isArray(cratonLineages) ? cratonLineages : [])
  .filter((c) => c && Array.isArray(c.centre) && Number.isFinite(c.radiusDeg) && Array.isArray(c.lineage))
  .map((c) => ({ id: c.id, centre: toVec(c.centre[0], c.centre[1]), cosR: Math.cos(c.radiusDeg * D2R), rank: new Map(c.lineage.map((id, i) => [id, i])) }));

/** The lineage preferences of a present-day point: Map(continent id → rank, older = higher) or null. */
function lineageAt(v) {
  let best = null, bd = -2;
  for (const c of LINEAGES) {
    const d = dot(c.centre, v);
    if (d >= c.cosR && d > bd) { bd = d; best = c; }
  }
  return best ? best.rank : null;
}

/** Of the tracks leading into continent `carrierId`, the one a craton lineage prefers (or null). */
function lineageTrack(plan, carrierId, lineage) {
  const candidates = plan.byYounger.get(carrierId) || [];
  if (!lineage || candidates.length < 2) return null;
  let best = null, rank = -1;
  for (const c of candidates) {
    const r = lineage.get(c.older.id);
    if (r !== undefined && r > rank) { rank = r; best = c; }
  }
  return best;
}

/**
 * v moved inside `ring` ({ xyz, n }), unchanged if it already is: across the nearest stretch of
 * coast and up to TUCK_SITE_DEG beyond it (less where the land is narrower), so that a carried
 * site does not sit on the shoreline; failing that, to the ring's inner point.
 */
const TUCK_SITE_DEG = 2.5;
function tuckInto(ring, v) {
  const plane = tangentPlane(meanDirection(ring.xyz, ring.n));
  const outline = projectRing(plane, ring.xyz, ring.n);
  const p = plane.project(v[0], v[1], v[2]);
  if (pointInPoly(p[0], p[1], outline)) return v;
  const q = nearestOnPoly(p[0], p[1], outline);
  if (q[2] > 1e-9) {
    for (let d = TUCK_SITE_DEG; d >= 0.15; d /= 2) {
      const k = d / q[2];
      const ix = q[0] + (q[0] - p[0]) * k, iy = q[1] + (q[1] - p[1]) * k;
      if (pointInPoly(ix, iy, outline)) return unit(plane.unproject(ix, iy));
    }
  }
  const c = innerPoint(outline);
  return unit(plane.unproject(c[0], c[1]));
}

/**
 * The lineage of a site on a plate, stage by stage from the hand-over back to the oldest slice:
 * [{ stage, track, x, xa }] in the track's start frame: x where the site is at the stage's younger
 * end, xa where it is at the older end (carried with the changing outline: see carryBack). The
 * next older stage starts from xa. Where a merge offers several parents, the site follows its
 * craton lineage if it has one (lineageAt), else the parent whose piece it lies in. Static, so
 * cached.
 */
function deepPath(plate, v) {
  const key = `${plate.id}|${v[0].toFixed(5)}|${v[1].toFixed(5)}|${v[2].toFixed(5)}`;
  let path = pathCache.get(key);
  if (path) return path;
  path = [];
  let world = qRotate(plateQuat(plate, RANGE), v);     // the site at the hand-over
  let carrierId = null;
  const lineage = lineageAt(v);
  for (let s = STAGES.length - 1; s >= 0; s--) {
    const stage = STAGES[s];
    const plan = planOf(stage);
    let track = null;
    if (stage.handOver) {
      // prefer the ring that actually contains the site, else the plate's nearest main ring; a plate
      // whose land only emerges later (no ring at the hand-over) hands the site to its parent
      for (let p = plate; p && !track; p = p.parent) {
        const own = p.rings.find((r) => plan.byPlateRing.has(r) && r.main && ringContains(r, v));
        track = plan.byPlateRing.get(own || hostRing(p, v)) || null;
      }
    } else {
      const candidates = plan.byYounger.get(carrierId) || [];
      track = lineageTrack(plan, carrierId, lineage)
        || candidates.find((c) => ringContains(c.end, world)) || nearestTrack(candidates, world);
    }
    if (!track) break;
    const x = qRotate(qConj(track.q), world);
    let xa = carryBack(x, track);
    // If the next older stage follows the site's craton lineage into a parent whose piece of this
    // continent the site is not in, move it into that piece now, while the continent is whole, so
    // that it crosses on land rather than over the sea once the pieces part.
    if (lineage && s > 0) {
      const next = lineageTrack(planOf(STAGES[s - 1]), track.older.id, lineage);
      if (next) xa = tuckInto(next.end, xa);
    }
    path.push({ stage, track, x, xa });
    world = xa;                   // at the older slice the track has not rotated yet
    carrierId = track.older.id;
  }
  if (pathCache.size > 4000) pathCache.clear();
  pathCache.set(key, path);
  return path;
}
function nearestTrack(tracks, v) {
  let best = null, bd = -2;
  for (const tr of tracks) {
    const d = dot(meanDirection(tr.end.xyz, tr.end.n), v);
    if (d > bd) { bd = d; best = tr; }
  }
  return best;
}

/**
 * Where was a PRESENT-DAY coordinate that rides on a plate at timeMa?
 * Inside the rigid regime this is the true paleo-position. Further back the point keeps riding:
 * first the plate's own track through the hand-over morph, then the morph of each continent the
 * plate descends from (through splits and merges, following its craton lineage where one is
 * given: continents.js section 4), all the way to the first crust — so a fossil site stays with
 * "its" continent for the whole story. Through each morph it keeps its place in the changing
 * outline (deepPath, carryBack), so a point on land stays on land; one given offshore stays
 * roughly as far offshore, so snap it if it must be on land.
 * A plate id also covers the blocks that hang off that plate today: a point given as 'eurasia'
 * that lies in Siberia rides Siberia, one given as 'north_america' on the Yucatán rides Yucatán.
 * @returns {[number, number] | null} null for an unknown plate
 */
export function plateToWorld(plateId, lon, lat, timeMa) {
  let plate = PLATES.byId.get(plateId);
  if (!plate || !Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  plate = resolvePlate(plate, lon, lat);
  const t = cleanTime(timeMa);
  const v = toVec(lon, lat);
  if (t <= RANGE) return toLonLat(qRotate(plateQuat(plate, t), v));
  const path = deepPath(plate, v);
  if (!path.length) return null;
  for (const step of path) {
    if (t > step.stage.older.ma) continue;
    const alpha = (step.stage.older.ma - t) / (step.stage.older.ma - step.stage.younger.ma);
    const e = ease(alpha);
    // like an outline vertex: from xa (older slice) to x (younger slice), then the track's turn
    const x = step.x, xa = step.xa;
    const p = xa === x ? x : unit([xa[0] + (x[0] - xa[0]) * e, xa[1] + (x[1] - xa[1]) * e, xa[2] + (x[2] - xa[2]) * e]);
    return toLonLat(qRotate(trackRotation(step.stage, step.track, t, e), p));
  }
  // older than the oldest slice: shrink towards the nucleus of the continent the site ended up on
  const lastStep = path[path.length - 1];
  if (lastStep.stage !== STAGES[0]) return toLonLat(lastStep.xa);
  const o = labelOf(lastStep.track.older);
  const scale = t >= CRUST_START ? 0 : smooth01((CRUST_START - t) / (CRUST_START - OLDEST.ma));
  const x = lastStep.xa;
  return toLonLat(unit([o[0] + (x[0] - o[0]) * scale, o[1] + (x[1] - o[1]) * scale, o[2] + (x[2] - o[2]) * scale]));
}
