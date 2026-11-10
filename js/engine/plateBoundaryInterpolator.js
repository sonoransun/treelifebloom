// Tectonic plate boundaries of any moment — they ride on the continents.
//
//   getBoundariesAtTime(timeMa) → [{ id, type, vertices, name?, opacity? }]
//
// js/data/plateBoundaries.js describes every boundary ONCE, attached to the plates of
// js/data/continents.js, with the interval in which it existed (its header documents the format).
// Nothing is redrawn per keyframe: each frame a boundary is carried by its plate(s) to where the
// continents stand, so a trench stays on its margin and a ridge stays in the middle of its ocean
// whatever the continental model does. Three ways to ride:
//
//   one plate   every vertex turns with that plate — or with the block hanging off it that the
//               vertex lies on (or within 4° of): 'eurasia' near Japan rides Japan;
//   two plates  every vertex is carried by BOTH plates and drawn part-way between the two copies
//               (a ridge midway between conjugate margins, a trench just off the overriding plate
//               of a closing ocean, a suture on the seam): it closes onto the seam when the plates
//               meet and stays between them while they drift apart;
//   fixed       map coordinates (open-ocean features with no continent to hold on to), optionally
//               keyframed.
//
// HOW A PLATE MOVES A LINE. A plate's pose at time t is recovered as the rotation that takes two
// probe points (present-day coordinates, ~1.5–2° apart, well inside the plate) to where
// plateToWorld() puts them at t. In the rigid-plate regime that is exactly the plate's own rotation;
// in deep time plateToWorld() carries a point back through the schematic continents it descends
// from, keeping its place in each changing outline, and the probes' rotation is how that part of
// the continent turns — so a line keeps its shape and follows "its" continent instead of
// scattering vertex by vertex. An entry's `at` picks
// the probe point (which block, and in deep time which ancestral continent, carries the line);
// `frame` lets a line be drawn on the map of any time (a deep-time belt is drawn where the
// schematic continents stand at that slice) — it is turned back to present-day coordinates once.
//
// Birth and death are drawn as growth: a boundary unzips from one end or its middle while it fades
// in, and retracts the same way when it dies. Each frame the result is densified (no edge longer
// than MAX_EDGE_DEG of arc, nor sweeping more than MAX_LON_STEP of longitude near the poles), cut
// where it crosses the antimeridian (pieces end exactly on ±180° and get ids '<id>~1', '<id>~2', …)
// and memoised per timeMa.

import { boundaries as DATA, TECTONICS_START_MA } from '../data/plateBoundaries.js';
import { plates as PLATE_DATA } from '../data/continents.js';
import { plateToWorld, findPlateAt } from './interpolator.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const MAX_EDGE_DEG = 3;             // densify great-circle edges longer than this …
const MAX_LON_STEP = 8;             // … or sweeping more longitude than this (near the poles)
const DEFAULT_FADE_MA = 6;          // birth / death ramps unless an entry says otherwise
const OFFSHORE_DEG = 4;             // a one-plate vertex this close to a child block rides that block
const PROBE_GAP_DEG = 1.5;          // the second probe sits this far from the first
const MIN_VISIBLE = 0.02;           // below this share of its length a growing boundary is not drawn
const JOIN_GAP = 4 * D2R;           // consecutive whole parts closer than this are drawn as one line

function warn(message) {
  if (typeof console !== 'undefined') console.warn(`[plateBoundaries] ${message}`);
}

// ---- small sphere toolkit --------------------------------------------------------------------

function toVec(lon, lat) {
  const lo = lon * D2R, la = lat * D2R, c = Math.cos(la);
  return [c * Math.cos(lo), c * Math.sin(lo), Math.sin(la)];
}
function toLonLat(v) {
  return [Math.atan2(v[1], v[0]) * R2D, Math.asin(Math.max(-1, Math.min(1, v[2]))) * R2D];
}
function norm(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const arc = (a, b) => Math.atan2(Math.hypot(...cross(a, b)), dot(a, b));

/** Point at fraction f of the great-circle arc a → b (a and b unit vectors); f may lie outside 0..1. */
function slerp(a, b, f) {
  if (f === 0) return a;
  if (f === 1) return b;
  const th = arc(a, b);
  if (th < 1e-9) return a;
  if (Math.PI - th < 1e-6) return norm([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  const s = Math.sin(th), wa = Math.sin((1 - f) * th) / s, wb = Math.sin(f * th) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
}

/**
 * Where a ridge vertex p sits relative to its two conjugate coast points a and b:
 * f = share of the way from a to b (along the great circle), c = signed angle off that circle.
 */
function conjugateFit(a, b, p) {
  const L = arc(a, b);
  const nn = cross(a, b), ln = Math.hypot(nn[0], nn[1], nn[2]);
  if (L < 1e-6 || ln < 1e-9) return { f: 0.5, c: 0, L: Math.max(L, 1e-6) };
  const n = [nn[0] / ln, nn[1] / ln, nn[2] / ln];
  const k = dot(p, n);
  const c = Math.asin(Math.max(-1, Math.min(1, k)));
  const foot = norm([p[0] - k * n[0], p[1] - k * n[1], p[2] - k * n[2]]);
  let f = arc(a, foot) / L;
  if (dot(cross(a, foot), n) < 0) f = -f;
  return { f, c, L };
}

/** Orthonormal frame (rows) from two non-parallel unit vectors. */
function frameOf(p, q) {
  const d = dot(p, q);
  const e2 = norm([q[0] - d * p[0], q[1] - d * p[1], q[2] - d * p[2]]);
  return [p, e2, cross(p, e2)];
}
/** The rotation (3×3, row-major) that takes p1 → q1 and the direction of p2 → that of q2. */
function rotationFrom(p1, p2, q1, q2) {
  const P = frameOf(p1, p2), Q = frameOf(q1, q2);
  const m = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    m[r * 3 + c] = Q[0][r] * P[0][c] + Q[1][r] * P[1][c] + Q[2][r] * P[2][c];
  }
  return m;
}
const apply = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
/** Inverse (= transpose) of a rotation matrix applied to v. */
const applyT = (m, v) => [
  m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
  m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
  m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
];

const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// ---- carriers: a plate (or block) plus two probe points, and its rotation at any time ------------

const PLATE_BY_ID = new Map(PLATE_DATA.map((p) => [p.id, p]));

function descendsFrom(id, root) {
  for (let p = id, k = 0; p && k < 64; k++) {
    if (p === root) return true;
    p = PLATE_BY_ID.get(p)?.parent || null;
  }
  return false;
}

/** A probe partner PROBE_GAP_DEG east of p (north/south near the poles). */
function partner([lon, lat]) {
  const c = Math.cos(lat * D2R);
  return c > 0.2 ? [lon + PROBE_GAP_DEG / c, lat] : [lon, lat + (lat > 0 ? -PROBE_GAP_DEG : PROBE_GAP_DEG)];
}

const defaultProbeCache = new Map();
/**
 * Two points well inside a plate's own land (not on a block hanging off it, nor on a neighbour drawn
 * over it), close together so that in deep time both ride the same ancestral continent: main-ring
 * label points first, then the plate's anchor, then small offsets around them.
 */
function defaultProbes(id) {
  if (defaultProbeCache.has(id)) return defaultProbeCache.get(id);
  const plate = PLATE_BY_ID.get(id);
  let probes = null;
  const seeds = [];
  (plate.rings || []).forEach((r, i) => { if ((i === 0 || r.main) && Array.isArray(r.label)) seeds.push(r.label); });
  if (Array.isArray(plate.anchor)) seeds.push(plate.anchor);
  const candidates = [];
  for (const s of seeds) {
    candidates.push(s);
    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [4, 0], [-4, 0], [0, 4], [0, -4]]) candidates.push([s[0] + dx, s[1] + dy]);
  }
  const ok = candidates.filter(([lon, lat]) => Math.abs(lat) < 88 && findPlateAt(lon, lat, 0) === id);
  const a = ok[0];
  const b = a && ok.find((c) => {
    const d = arc(toVec(a[0], a[1]), toVec(c[0], c[1])) * R2D;
    return d > 1.2 && d < 4.5;
  });
  if (a && b) probes = [a, b];
  else if (Array.isArray(plate.anchor)) {
    warn(`plate "${id}": no clean probe points — using its anchor`);
    probes = [plate.anchor, partner(plate.anchor)];
  }
  defaultProbeCache.set(id, probes);
  return probes;
}

const carriers = new Map();
/** The carrier of a plate id, optionally pinned to a probe point `at` (present-day lon/lat). */
function carrierOf(plateId, at) {
  const key = at ? `${plateId}@${at[0]},${at[1]}` : plateId;
  let c = carriers.get(key);
  if (!c) {
    const probes = at ? [at, partner(at)] : defaultProbes(plateId);
    c = probes ? {
      key, plate: plateId, probes,
      p1: toVec(probes[0][0], probes[0][1]), p2: toVec(probes[1][0], probes[1][1]),
    } : null;
    carriers.set(key, c);
  }
  return c;
}

let frameTime = NaN;
const poses = new Map();
/** Rotation (present-day → timeMa) carried by c, or null. Cached for the current time. */
function poseAt(c, t) {
  if (!c) return null;
  if (t === frameTime) {
    if (poses.has(c.key)) return poses.get(c.key);
  } else {
    poses.clear();
    frameTime = t;
  }
  const m = rotationOf(c, t);
  poses.set(c.key, m);
  return m;
}
function rotationOf(c, t) {
  const qa = plateToWorld(c.plate, c.probes[0][0], c.probes[0][1], t);
  const qb = plateToWorld(c.plate, c.probes[1][0], c.probes[1][1], t);
  if (!qa || !qb) return null;
  return rotationFrom(c.p1, c.p2, toVec(qa[0], qa[1]), toVec(qb[0], qb[1]));
}

// ---- compiling the data once -------------------------------------------------------------------

function flatToPts(flat, what) {
  const out = [];
  if (!Array.isArray(flat)) return out;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const lon = Number(flat[i]), lat = Number(flat[i + 1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lat) > 90) { warn(`${what}: bad coordinate at ${i}`); continue; }
    out.push([lon, lat]);
  }
  return out;
}

const ANCHOR = { start: 0, middle: 0.5, end: 1 };

function timing(src, base) {
  const span = Array.isArray(src.span) ? src.span.map(Number) : null;
  const fade = Array.isArray(src.fade) ? src.fade.map(Number) : null;
  return {
    from: span ? (Number.isFinite(span[0]) ? span[0] : Infinity) : base ? base.from : Infinity,
    to: span ? (Number.isFinite(span[1]) ? span[1] : 0) : base ? base.to : 0,
    fadeIn: fade && Number.isFinite(fade[0]) ? Math.max(0, fade[0]) : base ? base.fadeIn : DEFAULT_FADE_MA,
    fadeOut: fade && Number.isFinite(fade[1]) ? Math.max(0, fade[1]) : base ? base.fadeOut : DEFAULT_FADE_MA,
    grow: src.grow != null ? ANCHOR[src.grow] ?? 0.5 : base ? base.grow : 0.5,
    shrink: src.shrink != null ? ANCHOR[src.shrink] ?? 0.5 : base ? base.shrink : 0.5,
  };
}

function namesOf(name) {
  if (Array.isArray(name)) {
    return name.map(([until, text]) => [until == null ? Infinity : Number(until), text ? String(text) : ''])
      .sort((x, y) => x[0] - y[0]);
  }
  return name ? [[Infinity, String(name)]] : null;
}

/** Properties a part inherits from its entry unless it sets its own. */
const INHERITED = ['ride', 'at', 'frame', 'w', 'off', 'opacity'];

function compilePart(src, id, base) {
  const geo = compileGeometry(src, id);
  if (!geo) return null;
  geo.time = timing(src, base);
  geo.names = src.name != null ? namesOf(src.name) : null;
  geo.opacity = Number.isFinite(src.opacity) ? Math.max(0, Math.min(1, src.opacity)) : 1;
  return geo;
}

function compileGeometry(src, id) {
  const ride = src.ride;
  const frame = Number.isFinite(src.frame) && src.frame > 0 ? src.frame : 0;
  if (ride == null) {
    const keys = Array.isArray(src.keys) && src.keys.length
      ? src.keys.map(([ma, flat]) => ({ ma: Number(ma), pts: flatToPts(flat, id).map(([lo, la]) => toVec(lo, la)) }))
        .sort((a, b) => a.ma - b.ma)
      : [{ ma: 0, pts: flatToPts(src.v, id).map(([lo, la]) => toVec(lo, la)) }];
    const n = keys[0].pts.length;
    if (keys.some((k) => k.pts.length !== n)) { warn(`${id}: keyframes differ in length — only the first is used`); keys.length = 1; }
    return n >= 2 ? { kind: 'fixed', keys, n } : null;
  }
  if (typeof ride === 'string') {
    if (!PLATE_BY_ID.has(ride)) { warn(`${id}: unknown plate "${ride}"`); return null; }
    const pts = flatToPts(src.v, id);
    if (pts.length < 2) return null;
    const at = Array.isArray(src.at) && Number.isFinite(src.at[0]) ? src.at : null;
    const cars = carriersFor(ride, at, frame, pts);
    if (!cars) { warn(`${id}: no probes for "${ride}"`); return null; }
    return { kind: 'plate', frame, pts, cars, x: null, n: pts.length };
  }
  if (Array.isArray(ride) && ride.length >= 2) {
    const [a, b] = ride;
    if (!PLATE_BY_ID.has(a) || !PLATE_BY_ID.has(b)) { warn(`${id}: unknown plate in [${ride}]`); return null; }
    const w = Number.isFinite(ride[2]) ? ride[2] : Number.isFinite(src.w) ? src.w : 0.5;
    const off = Number.isFinite(src.off) && src.off > 0 ? src.off * D2R : 0;
    const atA = Array.isArray(src.at) && Array.isArray(src.at[0]) ? src.at[0] : null;
    const atB = Array.isArray(src.at) && Array.isArray(src.at[1]) ? src.at[1] : null;
    // conjugate lines vA / vB (the boundary stays between them), or one line v carried by both plates
    const ptsA = flatToPts(src.vA || src.v, id);
    const ptsB = flatToPts(src.vB || src.v, id);
    const ridge = src.vA && src.vB && src.v ? flatToPts(src.v, id) : null;
    if (ptsB.length !== ptsA.length || (ridge && ridge.length !== ptsA.length)) {
      warn(`${id}: v / vA / vB differ in length`);
      return null;
    }
    if (ptsA.length < 2) return null;
    const carsA = carriersFor(a, atA, frame, ptsA), carsB = carriersFor(b, atB, frame, ptsB);
    if (!carsA || !carsB) { warn(`${id}: no probes for [${ride}]`); return null; }
    // the fit is the same in any frame, so it is taken on the map the line was drawn on
    const fit = ridge
      ? ridge.map((p, j) => conjugateFit(toVec(ptsA[j][0], ptsA[j][1]), toVec(ptsB[j][0], ptsB[j][1]), toVec(p[0], p[1])))
      : null;
    return { kind: 'pair', frame, carsA, carsB, w, off, ptsA, ptsB, fit, xa: null, xb: null, n: ptsA.length };
  }
  warn(`${id}: unreadable ride`);
  return null;
}

/**
 * The carrier of every vertex of a line riding `plateId`: one pinned carrier when `at` is given, the
 * plate itself for a line drawn on an old map (`frame`), else per vertex the most specific block
 * hanging off the plate that the vertex lies on or just off (as plateToWorld resolves a site). A
 * vertex with no land near it at all takes the block of its nearest neighbour along the line that
 * has one, so an offshore stretch never falls back to the parent plate's own (distant) motion.
 */
function carriersFor(plateId, at, frame, pts) {
  if (at || frame) {
    const c = carrierOf(plateId, at);
    return c ? pts.map(() => c) : null;
  }
  const ids = pts.map(([lon, lat]) => {
    const found = findPlateAt(lon, lat, OFFSHORE_DEG);
    if (!found) return null;
    return found !== plateId && descendsFrom(found, plateId) ? found : plateId;
  });
  const cars = ids.map((id, j) => {
    if (id) return carrierOf(id, null);
    for (let d = 1; d < ids.length; d++) {
      const near = ids[j - d] || ids[j + d];
      if (near) return carrierOf(near, null);
    }
    return carrierOf(plateId, null);
  });
  return cars.every(Boolean) ? cars : null;
}

/** Present-day coordinates (unit vectors) of a line drawn on the map of `frame` Ma. */
function toPresent(pts, cars, frame) {
  const inverse = new Map();
  return pts.map(([lon, lat], j) => {
    const v = toVec(lon, lat);
    if (!frame) return v;
    const c = cars[j];
    if (!inverse.has(c.key)) inverse.set(c.key, rotationOf(c, frame));
    const m = inverse.get(c.key);
    return m ? norm(applyT(m, v)) : v;
  });
}

function compile(entry) {
  const id = String(entry.id || '');
  if (!id) { warn('a boundary without an id is skipped'); return null; }
  if (!['divergent', 'convergent', 'transform'].includes(entry.type)) { warn(`${id}: unknown type "${entry.type}"`); return null; }
  const base = timing(entry, null);
  const sources = Array.isArray(entry.parts)
    ? entry.parts.map((p) => {
      const merged = { ...p };
      for (const k of INHERITED) if (merged[k] === undefined && entry[k] !== undefined) merged[k] = entry[k];
      return merged;
    })
    : [{ ...entry, name: null }];
  const parts = sources.map((p) => compilePart(p, id, base)).filter(Boolean);
  if (!parts.length) return null;
  const from = Math.max(...parts.map((p) => p.time.from));
  const to = Math.min(...parts.map((p) => p.time.to));
  return { id, type: entry.type, names: namesOf(entry.name), from, to, parts };
}

let COMPILED = null;
function compiled() {
  if (!COMPILED) {
    COMPILED = [];
    const seen = new Set();
    for (const e of DATA || []) {
      let c = null;
      try {
        c = compile(e);
      } catch (err) {
        warn(`${e && e.id}: ${err.message}`);
      }
      if (!c) continue;
      if (seen.has(c.id)) { warn(`duplicate id "${c.id}" — the second is skipped`); continue; }
      seen.add(c.id);
      COMPILED.push(c);
    }
  }
  return COMPILED;
}

// ---- one boundary at one moment -----------------------------------------------------------------

/** How much of a boundary shows at t (0..1) and where it grows from / retracts to. */
function visibility(tm, t) {
  if (t > tm.from || t < tm.to) return null;
  const birth = tm.fadeIn > 0 && Number.isFinite(tm.from) ? smooth01((tm.from - t) / tm.fadeIn) : 1;
  const death = tm.fadeOut > 0 && tm.to > 0 ? smooth01((t - tm.to) / tm.fadeOut) : 1;
  const g = Math.min(birth, death);
  return { g, anchor: birth <= death ? tm.grow : tm.shrink };
}

function nameAt(names, t) {
  if (!names) return null;
  for (const [until, text] of names) if (t <= until) return text || null;
  return names[names.length - 1][1] || null;
}

function partPoints(part, t, out) {
  if (part.kind === 'fixed') {
    const k = part.keys;
    let i = 0;
    while (i + 1 < k.length && k[i + 1].ma <= t) i++;
    const A = k[i], B = k[Math.min(i + 1, k.length - 1)];
    const f = B.ma > A.ma ? Math.max(0, Math.min(1, (t - A.ma) / (B.ma - A.ma))) : 0;
    for (let j = 0; j < part.n; j++) out.push(f > 0 ? norm(slerp(A.pts[j], B.pts[j], f)) : A.pts[j]);
    return;
  }
  if (part.kind === 'plate') {
    if (!part.x) part.x = toPresent(part.pts, part.cars, part.frame);
    for (let j = 0; j < part.n; j++) {
      const m = poseAt(part.cars[j], t);
      if (m) out.push(apply(m, part.x[j]));
    }
    return;
  }
  // pair: part-way between the two plates' copies of each vertex (conjugate lines when given)
  if (!part.xa) {
    part.xa = toPresent(part.ptsA, part.carsA, part.frame);
    part.xb = toPresent(part.ptsB, part.carsB, part.frame);
  }
  for (let j = 0; j < part.n; j++) {
    const ma = poseAt(part.carsA[j], t), mb = poseAt(part.carsB[j], t);
    if (!ma || !mb) continue;
    const pa = apply(ma, part.xa[j]), pb = apply(mb, part.xb[j]);
    if (!part.fit) {
      let f = part.w;
      if (part.off) {
        const gap = arc(pa, pb);
        f = gap > 1e-9 ? Math.min(part.w, part.off / gap) : part.w;
      }
      out.push(norm(slerp(pa, pb, f)));
      continue;
    }
    // the same share of the way across, and the drawn offset from the coast-to-coast line scaled
    // with the width of the ocean: exact on the map the line was drawn on, closing onto the seam
    const { f, c, L } = part.fit[j];
    const m = norm(slerp(pa, pb, f));
    const nn = cross(pa, pb), ln = Math.hypot(nn[0], nn[1], nn[2]);
    if (!c || ln < 1e-9) { out.push(m); continue; }
    const k = c * Math.min(1.5, arc(pa, pb) / L), ck = Math.cos(k), sk = Math.sin(k) / ln;
    out.push(norm([m[0] * ck + nn[0] * sk, m[1] * ck + nn[1] * sk, m[2] * ck + nn[2] * sk]));
  }
}

/** The visible stretch [g share of the length, placed by anchor] of a polyline of unit vectors. */
function trim(pts, g, anchor) {
  if (g >= 1 || pts.length < 2) return pts;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + arc(pts[i - 1], pts[i]));
  const L = cum[cum.length - 1];
  if (!(L > 0)) return pts;
  const s0 = anchor * (1 - g) * L, s1 = s0 + g * L;
  const at = (s) => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const seg = cum[i] - cum[i - 1];
    return seg > 0 ? norm(slerp(pts[i - 1], pts[i], (s - cum[i - 1]) / seg)) : pts[i];
  };
  const out = [at(s0)];
  for (let i = 1; i < pts.length - 1; i++) if (cum[i] > s0 && cum[i] < s1) out.push(pts[i]);
  out.push(at(s1));
  return out;
}

/** Pieces of the edge a → b needed so that no piece is too long on the sphere or on the map. */
function piecesOf(a, b) {
  const th = arc(a, b);
  let n = Math.ceil(th / (MAX_EDGE_DEG * D2R));
  // near a pole a short arc can sweep a lot of longitude, which a flat map draws as a straight chord
  const polar = Math.max(Math.abs(a[2]), Math.abs(b[2]));
  if (polar > 0.7 && th > 0.2 * D2R) {
    const dl = Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])) * R2D;
    n = Math.max(n, Math.ceil(dl / MAX_LON_STEP));
  }
  return Math.min(n, 64);
}

/** Densify, project and cut at the antimeridian → [[[lon, lat], …], …]. */
function toPolylines(pts) {
  const dense = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = piecesOf(a, b);
    for (let k = 1; k < n; k++) dense.push(norm(slerp(a, b, k / n)));
    dense.push(b);
  }
  const runs = [];
  let run = [];
  let prev = null;
  for (const v of dense) {
    const ll = toLonLat(v);
    if (prev && Math.abs(ll[0] - prev.ll[0]) > 180) {
      // where the arc prev → v meets the antimeridian half-plane (y = 0, x < 0)
      const n = cross(prev.v, v);
      let d = norm([-n[2], 0, n[0]]);
      if (d[0] > 0) d = [-d[0], 0, -d[2]];
      const lat = Math.asin(Math.max(-1, Math.min(1, d[2]))) * R2D;
      const edge = prev.ll[0] > 0 ? 180 : -180;
      run.push([edge, lat]);
      if (run.length > 1) runs.push(run);
      run = [[-edge, lat]];
    }
    run.push(ll);
    prev = { v, ll };
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

function arcLength(run) {
  let s = 0;
  for (let i = 1; i < run.length; i++) s += Math.hypot((run[i][0] - run[i - 1][0]) * Math.cos(run[i][1] * D2R), run[i][1] - run[i - 1][1]);
  return s;
}

const round4 = (x) => Math.round(x * 1e4) / 1e4;

/**
 * A boundary at t: its visible parts, consecutive whole parts joined into one line, a part that is
 * being born or dying drawn on its own (shortened) → polylines with ids '<id>', '<id>~1', …
 */
function boundaryAt(b, t, out) {
  if (t > b.from || t < b.to) return;
  const lines = [];          // { pts, g, name, opacity }
  let open = null;
  for (const part of b.parts) {
    const vis = visibility(part.time, t);
    if (!vis || vis.g < MIN_VISIBLE) { open = null; continue; }
    const pts = [];
    partPoints(part, t, pts);
    if (pts.length < 2) { open = null; continue; }
    const name = nameAt(part.names, t) || nameAt(b.names, t);
    if (vis.g < 1) {
      lines.push({ pts: trim(pts, vis.g, vis.anchor), g: vis.g, name, opacity: part.opacity });
      open = null;
    } else if (open && open.opacity === part.opacity && arc(open.pts[open.pts.length - 1], pts[0]) < JOIN_GAP) {
      // consecutive parts that meet are drawn as one line (a shared joint once)
      if (arc(open.pts[open.pts.length - 1], pts[0]) < 1e-7) pts.shift();
      open.pts.push(...pts);
      if (name && !open.name) open.name = name;
    } else {
      open = { pts, g: 1, name, opacity: part.opacity };
      lines.push(open);
    }
  }
  const runs = [];
  for (const line of lines) {
    for (const vertices of toPolylines(line.pts)) {
      runs.push({ vertices: vertices.map(([lo, la]) => [round4(lo), round4(la)]), line, len: arcLength(vertices) });
    }
  }
  // each name is shown once per boundary, on the longest stretch that carries it
  const best = new Map();
  for (const r of runs) {
    const nm = r.line.name;
    if (nm && (!best.has(nm) || r.len > best.get(nm).len)) best.set(nm, r);
  }
  runs.forEach((r, i) => {
    const o = { id: i ? `${b.id}~${i}` : b.id, type: b.type, vertices: r.vertices };
    if (r.line.name && best.get(r.line.name) === r) o.name = r.line.name;
    const opacity = r.line.g * r.line.opacity;
    if (opacity < 1) o.opacity = Math.round(opacity * 1000) / 1000;
    out.push(o);
  });
}

// ---- public API ------------------------------------------------------------------------------------

let memoTime = NaN;
let memoResult = null;

/**
 * Plate boundaries at a moment in time, carried to where the continents stand.
 * Open polylines of [lon, lat]; none crosses the antimeridian (a line that does is cut into pieces
 * that end exactly on ±180°); no edge is longer than 3° of arc. Ids are stable through time; a
 * boundary cut by the antimeridian, or one whose parts are born at different times, adds pieces
 * '<id>~1', '<id>~2', … and its name sits on its longest piece only. Convergent boundaries are
 * drawn with the overriding plate on their LEFT (looking along the line on a north-up map).
 * Before TECTONICS_START_MA (no plate tectonics yet) the result is empty; NaN and negative times
 * count as the present. The same timeMa returns the same array.
 * @param {number} timeMa
 * @returns {Array<{id:string, type:'divergent'|'convergent'|'transform', vertices:number[][],
 *   name?:string, opacity?:number}>}  opacity (0..1) is present while a boundary is being born or
 *   dying (it is then also drawn shortened by the same share) and on conjectural deep-time ones.
 */
export function getBoundariesAtTime(timeMa) {
  const raw = Number(timeMa);
  const t = raw > 0 ? raw : 0;
  if (t === memoTime && memoResult) return memoResult;
  const out = [];
  if (t <= TECTONICS_START_MA) {
    for (const b of compiled()) {
      try {
        boundaryAt(b, t, out);
      } catch (e) {
        warn(`${b.id} at ${t} Ma: ${e.message}`);
      }
    }
  }
  memoTime = t;
  memoResult = out;
  return out;
}
