// Planet painter — draws the planet's surface for one frame onto a 2D canvas. Shared by the Map
// view (Equal Earth projection, clipped to the planet outline, with limb glow and place names) and
// the Globe view (equirectangular texture for the sphere), so both always show the same world.
//
//   import { paintPlanet, paintKey, projectPoint, unprojectPoint, fitScale, equalEarth, equirect }
//     from './planetPainter.js';
//
//   const view = {
//     projection: equalEarth,        // or equirect
//     scale, cx, cy,                 // CSS px per projection unit; planet centre in CSS px
//     width, height, pixelRatio,     // canvas size in CSS px; backing store = size × pixelRatio
//     outline: true,                 // true: clip to the planet outline, draw limb + halo (map)
//                                    // false: fill the whole rectangle (texture for a sphere)
//     layers: { graticule, labels, features, boundaries },
//     zoom: 1,                       // optional: user zoom factor (reveals lesser place names)
//     avoid: [{ x, y, r } | { x, y, w, h }],   // optional: discs / boxes (CSS px) that place
//                                    // names must keep clear of (markers and their labels)
//   };
//   const info = paintPlanet(ctx, frame, view);   // → { labelBoxes: [{x, y, w, h}], animated }
//
// Place names, features and routes come from js/data/paleogeography.js when it exists. A place
// (or a path point) given with a plateId is in present-day coordinates and rides its plate back in
// time (plateToWorld), as everywhere in the project; anything else is drawn where it says.
//
// Every planet colour comes from frame.look (js/util/planetLook.js). Layers, bottom to top:
//   outer halo · ocean · magma fissures · graticule · shelf-sea glow · sea ice · coast · land ·
//   rain and drought tones, relief, rim light · ice sheets · hot spots · plate boundaries ·
//   paleogeographic features · crisis effects · scene tint · place names · limb glow.
//
// How it stays fast: coastlines are projected once per moment into Path2D objects (in projection
// units, so panning and zooming reuse them); everything soft — shelf glow, rain shadows, rim
// light — comes from one small blurred land mask per moment instead of wide strokes; relief is a
// tiling hillshade that rides with each plate. Nothing is ever read back from a GPU canvas: the
// small helper canvases are deliberately software-backed.
//
// Species markers are NOT drawn here: each view draws its own with js/views/glyphs.js.

import { COLORS, FONTS } from '../config.js';
import { mixHex, hexAlpha } from '../util/planetLook.js';
import * as geo from '../engine/geo.js';
import * as interp from '../engine/interpolator.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const TAU = Math.PI * 2;

// Geographic sizes below are given in "reference pixels": CSS pixels on the 1440×860 desktop
// layout, where one projection unit is about 203 px. They scale with the planet, so the shelf seas
// are as wide on a phone, on the globe texture or at 8× zoom as they are there.
const K_REF = 203;

// Upscaling the small helper canvases: plain bilinear. ('high' asks for bicubic resampling, which
// costs a whole frame at 2× on a laptop GPU and is invisible on blurred masks.)
const SMOOTHING = 'medium';

// Optional place-name data (written separately; the painter degrades gracefully without it).
let paleo = null;
import('../data/paleogeography.js').then((m) => { paleo = m; }).catch(() => { paleo = null; });

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// =============================================================================================
// Projections
// =============================================================================================

// Equal Earth (Šavrič, Patterson & Jenny 2018): equal-area, straight parallels.
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796;
const EE_M = Math.sqrt(3) / 2;

// Hot loops project through these scratch outputs instead of allocating a pair per vertex.
// PY points DOWN (south positive) so projected paths, images and patterns share one transform.
let PX = 0, PY = 0;

function eeFwd(lon, lat) {
  const th = Math.asin(EE_M * Math.sin(lat * D2R));
  const t2 = th * th, t6 = t2 * t2 * t2;
  PX = (lon * D2R * Math.cos(th)) / (EE_M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
  PY = -th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
}

function eqFwd(lon, lat) {
  PX = lon * D2R;
  PY = -lat * D2R;
}

const EE_X_MAX = Math.PI / (EE_M * A1);
const EE_Y_MAX = (() => { eeFwd(0, 90); return -PY; })();

/** Equal Earth. project → [x, y] in unit-sphere units (y north-positive); invert → [lon, lat] | null. */
export const equalEarth = {
  name: 'equalEarth',
  project(lonDeg, latDeg) {
    eeFwd(lonDeg, latDeg);
    return [PX, -PY];
  },
  invert(x, y) {
    if (!(Math.abs(y) <= EE_Y_MAX + 1e-9)) return null;
    let th = y / A1;
    let d = A1;
    for (let i = 0; i < 12; i++) {
      const t2 = th * th, t6 = t2 * t2 * t2;
      const fy = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2)) - y;
      d = A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2);
      const step = fy / d;
      th -= step;
      if (Math.abs(step) < 1e-12) break;
    }
    const t2 = th * th, t6 = t2 * t2 * t2;
    d = A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2);
    const lon = ((EE_M * x * d) / Math.cos(th)) * R2D;
    const lat = Math.asin(clamp(Math.sin(th) / EE_M, -1, 1)) * R2D;
    if (!(Math.abs(lon) <= 180 + 1e-6)) return null;
    return [clamp(lon, -180, 180), lat];
  },
  bounds: { xMax: EE_X_MAX, yMax: EE_Y_MAX },
};

/** Plate carrée (longitude/latitude in radians) — the texture layout of a sphere. */
export const equirect = {
  name: 'equirect',
  project(lonDeg, latDeg) {
    return [lonDeg * D2R, latDeg * D2R];
  },
  invert(x, y) {
    if (!(Math.abs(x) <= Math.PI + 1e-9 && Math.abs(y) <= Math.PI / 2 + 1e-9)) return null;
    return [clamp(x * R2D, -180, 180), clamp(y * R2D, -90, 90)];
  },
  bounds: { xMax: Math.PI, yMax: Math.PI / 2 },
};

/** Screen position (CSS px) of a longitude/latitude under a view — the transform paintPlanet uses. */
export function projectPoint(view, lonDeg, latDeg) {
  const p = view.projection.project(lonDeg, latDeg);
  return [view.cx + p[0] * view.scale, view.cy - p[1] * view.scale];
}

/** Longitude/latitude under a screen position (CSS px), or null outside the planet. */
export function unprojectPoint(view, px, py) {
  return view.projection.invert((px - view.cx) / view.scale, (view.cy - py) / view.scale);
}

/** Scale (CSS px per projection unit) that fits the whole planet into width × height with padding. */
export function fitScale(projection, width, height, padding = 0) {
  const b = projection.bounds;
  return Math.max(1e-3, Math.min((width - 2 * padding) / (2 * b.xMax), (height - 2 * padding) / (2 * b.yMax)));
}

// Per-projection internals: fast forward function, static paths, latitude → gradient offset.
const internals = new Map();

function projectionInternals(projection) {
  let P = internals.get(projection);
  if (P) return P;
  const fwd = projection === equalEarth ? eeFwd : projection === equirect ? eqFwd : (lon, lat) => {
    const p = projection.project(lon, lat);
    PX = p[0];
    PY = -p[1];
  };
  const { xMax, yMax } = projection.bounds;
  P = { projection, name: projection.name || 'custom', fwd, xMax, yMax, curved: projection !== equirect };
  /** Y (projection units, south-positive) of a parallel. */
  P.latY = (lat) => { fwd(0, clamp(lat, -90, 90)); return PY; };
  /** 0..1 offset of a parallel in a north → south gradient across the planet. */
  P.off = (lat) => clamp((P.latY(lat) + yMax) / (2 * yMax), 0, 1);

  // Outline: the ±180° meridians joined by the pole lines.
  const outline = new Path2D();
  if (P.curved) {
    for (let lat = 90; lat >= -90; lat -= 2) {
      fwd(-180, lat);
      if (lat === 90) outline.moveTo(PX, PY);
      else outline.lineTo(PX, PY);
    }
    for (let lat = -90; lat <= 90; lat += 2) {
      fwd(180, lat);
      outline.lineTo(PX, PY);
    }
    outline.closePath();
  } else {
    outline.rect(-xMax, -yMax, 2 * xMax, 2 * yMax);
  }
  P.outline = outline;

  // Graticule: 30° grid; equator; tropics + polar circles.
  const grid = new Path2D();
  for (let lon = -150; lon <= 150; lon += 30) {
    for (let lat = 90; lat >= -90; lat -= 5) {
      fwd(lon, lat);
      if (lat === 90) grid.moveTo(PX, PY);
      else grid.lineTo(PX, PY);
    }
  }
  const parallel = (path, lat) => {
    fwd(-180, lat);
    path.moveTo(PX, PY);
    fwd(180, lat);
    path.lineTo(PX, PY);
  };
  for (const lat of [-60, -30, 30, 60]) parallel(grid, lat);
  const equator = new Path2D();
  parallel(equator, 0);
  const circles = new Path2D();
  for (const lat of [-66.56, -23.44, 23.44, 66.56]) parallel(circles, lat);
  P.grid = grid;
  P.equator = equator;
  P.circles = circles;

  // Gradient offsets of the 5° ladder used by look.landStops.
  P.off5 = [];
  for (let lat = -90; lat <= 90; lat += 5) P.off5.push(P.off(lat));
  internals.set(projection, P);
  return P;
}

// =============================================================================================
// Canvases and procedural textures (built lazily, once)
// =============================================================================================

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/**
 * A small software-backed helper canvas with its context at `.c`. Browsers GPU-accelerate large
 * canvases only; mixing the two kinds in a blur chain would force a GPU read-back on every copy,
 * so every mask canvas asks for a CPU backing store up front.
 */
function softCanvas(w, h) {
  const canvas = makeCanvas(w, h);
  canvas.c = canvas.getContext('2d', { willReadFrequently: true });
  return canvas;
}

/** Replace the contents of `to` with `from`, scaled to fit (one step of a blur chain). */
function copyScaled(from, to) {
  const c = to.c;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'copy';
  c.imageSmoothingEnabled = true;
  c.drawImage(from, 0, 0, to.width, to.height);
  c.globalCompositeOperation = 'source-over';
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable fractal value noise, w × h samples in 0..1. */
function fbmField(w, h, cellsX, cellsY, octaves, seed, gain = 0.5) {
  const out = new Float32Array(w * h);
  const rand = mulberry32(seed);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const cx = cellsX << o, cy = cellsY << o;
    const lattice = new Float32Array(cx * cy);
    for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * cy;
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      const r0 = (y0 % cy) * cx, r1 = ((y0 + 1) % cy) * cx;
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * cx;
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const c0 = x0 % cx, c1 = (x0 + 1) % cx;
        const a = lattice[r0 + c0], b = lattice[r0 + c1], c = lattice[r1 + c0], d = lattice[r1 + c1];
        out[row + x] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
      }
    }
    total += amp;
    amp *= gain;
  }
  const inv = 1 / total;
  for (let i = 0; i < out.length; i++) out[i] *= inv;
  return out;
}

function putField(w, h, pixel) {
  // software-backed like every other helper: a tile that lived on the GPU would have to be read
  // back each time a pattern made from it is rasterised into one of the mask canvases
  const canvas = softCanvas(w, h);
  const c = canvas.c;
  const img = c.createImageData(w, h);
  const d = img.data;
  const px = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      pixel(x, y, px);
      const i = (y * w + x) * 4;
      d[i] = px[0]; d[i + 1] = px[1]; d[i + 2] = px[2]; d[i + 3] = px[3];
    }
  }
  c.putImageData(img, 0, 0);
  return canvas;
}

const hexRgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

const tiles = {};

// Opaque grey hillshade lit from the north-west (128 = flat); composited with soft-light.
const RELIEF_SIZE = 512;
function reliefTile() {
  if (tiles.relief) return tiles.relief;
  const n = RELIEF_SIZE;
  const f = fbmField(n, n, 4, 4, 6, 11, 0.52);
  const at = (x, y) => f[((y + n) % n) * n + ((x + n) % n)];
  tiles.relief = putField(n, n, (x, y, px) => {
    // Height rises to the east/south → the slope faces the light.
    const slope = (at(x + 2, y) - at(x - 2, y)) + (at(x, y + 2) - at(x, y - 2));
    const v = clamp(128 + slope * 640 + (at(x, y) - 0.5) * 130, 0, 255);
    px[0] = px[1] = px[2] = v;
    px[3] = 255;
  });
  return tiles.relief;
}

// World-sized textures: wrapped exactly once around the planet (periodic in x), so nothing
// repeats on the map and the seam closes on a sphere.
const WORLD_W = 1024, WORLD_H = 512;

// Very soft light/dark mottling for open water and pack ice (plain alpha, no blend mode needed).
function worldGrain() {
  if (tiles.grain) return tiles.grain;
  const w = WORLD_W, h = WORLD_H;
  const f = fbmField(w, h, 6, 3, 5, 97, 0.55);
  tiles.grain = putField(w, h, (x, y, px) => {
    const s = clamp((f[y * w + x] - 0.5) * 4.4, -1, 1);
    px[0] = px[1] = px[2] = s > 0 ? 255 : 0;
    px[3] = Math.round(Math.abs(s) * 255);
  });
  return tiles.grain;
}

// Crack network: glowing fissures of the magma ocean; reused (as bare alpha) for leads in a
// frozen ocean.
let crackField = null;
function cracks() {
  if (!crackField) {
    const w = WORLD_W, h = WORLD_H;
    const f = fbmField(w, h, 10, 5, 4, 53);
    const pools = fbmField(w, h, 3, 2, 3, 71);
    const line = new Float32Array(w * h);
    const pool = new Float32Array(w * h);
    for (let i = 0; i < line.length; i++) {
      const ridge = 1 - Math.abs(2 * f[i] - 1);
      line[i] = Math.pow(clamp((ridge - 0.8) / 0.2, 0, 1), 1.6);
      pool[i] = clamp((pools[i] - 0.54) * 4, 0, 1);
    }
    crackField = { line, pool };
  }
  return crackField;
}

function lavaTile(ramp) {
  if (tiles.lava) return tiles.lava;
  const w = WORLD_W, h = WORLD_H;
  const { line, pool } = cracks();
  const stops = ramp.map(hexRgb);
  tiles.lava = putField(w, h, (x, y, px) => {
    const i = y * w + x;
    const e = clamp(line[i] + pool[i] * 0.42, 0, 1);
    // ember → orange → yellow → white-hot along the ramp
    const pos = e * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(pos));
    const t = pos - k;
    px[0] = lerp(stops[k][0], stops[k + 1][0], t);
    px[1] = lerp(stops[k][1], stops[k + 1][1], t);
    px[2] = lerp(stops[k][2], stops[k + 1][2], t);
    px[3] = Math.round(255 * Math.min(1, e * 1.2));
  });
  return tiles.lava;
}

/** The crack network in one colour: open leads between the floes of a frozen ocean. */
function leadsTile(hex) {
  if (tiles.leads && tiles.leadsHex === hex) return tiles.leads;
  const w = WORLD_W, h = WORLD_H;
  const { line } = cracks();
  const rgb = hexRgb(hex);
  tiles.leads = putField(w, h, (x, y, px) => {
    px[0] = rgb[0]; px[1] = rgb[1]; px[2] = rgb[2];
    // only the spine of each crack: hairline leads, not rivers
    px[3] = Math.round(255 * smoothstep(0.62, 0.97, line[y * w + x]));
  });
  tiles.leadsHex = hex;
  return tiles.leads;
}

// Blotches (anoxic stains), tinted on demand.
const BLOTCH_SIZE = 256;
function blotchTile(hex) {
  if (tiles.blotch && tiles.blotchHex === hex) return tiles.blotch;
  const n = BLOTCH_SIZE;
  if (!tiles.blotchField) tiles.blotchField = fbmField(n, n, 4, 4, 4, 131);
  const f = tiles.blotchField;
  const rgb = hexRgb(hex);
  tiles.blotch = putField(n, n, (x, y, px) => {
    px[0] = rgb[0]; px[1] = rgb[1]; px[2] = rgb[2];
    px[3] = Math.round(255 * smoothstep(0.46, 0.64, f[y * n + x]));
  });
  tiles.blotchHex = hex;
  return tiles.blotch;
}

// A pattern snapshots its tile when it is created: cache per context and per tile canvas.
const patterns = new WeakMap();
function patternOf(ctx, tile) {
  let byCtx = patterns.get(ctx);
  if (!byCtx) {
    byCtx = new WeakMap();
    patterns.set(ctx, byCtx);
  }
  let p = byCtx.get(tile);
  if (!p) {
    p = ctx.createPattern(tile, 'repeat');
    byCtx.set(tile, p);
  }
  return p;
}

// =============================================================================================
// Geometry of a moment (projected once, reused across layers, pans and zooms)
// =============================================================================================

/**
 * Split a lon/lat polyline where it crosses the antimeridian. Each run ends, and the next one
 * starts, exactly on the ±180° edge, so nothing is missing on either side of the map (or of a
 * sphere texture's seam). → [[[lon, lat], …], …]
 */
function splitAntimeridian(pts) {
  const runs = [];
  let run = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i > 0) {
      const q = pts[i - 1];
      const d = p[0] - q[0];
      if (Math.abs(d) > 180) {
        const edge = q[0] > 0 ? 180 : -180;
        const lon2 = p[0] + (d > 0 ? -360 : 360);
        const t = (edge - q[0]) / (lon2 - q[0] || 1);
        const lat = q[1] + (p[1] - q[1]) * t;
        run.push([edge, lat]);
        if (run.length > 1) runs.push(run);
        run = [[-edge, lat]];
      }
    }
    run.push(p);
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

const localSeam = (a, b) => (Math.abs(Math.abs(a[1]) - 90) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9)
  || (Math.abs(Math.abs(a[0]) - 180) < 1e-9 && Math.abs(a[0] - b[0]) < 1e-9);
const isSeam = typeof geo.isSeamEdge === 'function' ? geo.isSeamEdge : localSeam;
const meridianSeam = (a, b) => Math.abs(Math.abs(a[0]) - 180) < 1e-9 && Math.abs(a[0] - b[0]) < 1e-9;

const MASK_MARGIN = 0.16;      // projection units of slack around the planet in the land masks

let SX = new Float64Array(2048);
let SY = new Float64Array(2048);

const geometryCache = new Map();   // projection name → geometry of the last moment painted

function buildGeometry(frame, P) {
  const polygons = frame.polygons || [];
  const cached = geometryCache.get(P.name);
  if (cached && cached.timeMa === frame.timeMa && cached.count === polygons.length) {
    // The new engine returns the same array for the same moment; the old one allocates a fresh
    // (but identical) array every frame.
    if (cached.source === polygons || !('timeMa' in polygons)) return cached;
  }

  const land = new Path2D();        // every ring, closed (fill, clip)
  const coast = new Path2D();       // coastlines only: seam edges on the map frame are left out
  const maskExtra = new Path2D();   // slabs just outside the frame, so blurs do not see a coast at a seam
  const groups = new Map();         // plate (or polygon) → { path, plateId, lon, lat, rank }
  const names = [];
  const outlines = [];              // big rings, coarsely: where plates may touch (see seams)
  const fwd = P.fwd;
  let vertexCount = 0;

  for (const poly of polygons) {
    // render-ready outlines (js/engine/interpolator.js): drawn as straight segments
    const v = poly.vertices;
    const n = v ? v.length : 0;
    if (n < 3) continue;
    vertexCount += n;
    if (SX.length < n) {
      SX = new Float64Array(n * 2);
      SY = new Float64Array(n * 2);
    }
    let sumLon = 0, sumLat = 0;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      fwd(v[i][0], v[i][1]);
      SX[i] = PX;
      SY[i] = PY;
      if (PX < x0) x0 = PX;
      if (PX > x1) x1 = PX;
      if (PY < y0) y0 = PY;
      if (PY > y1) y1 = PY;
      sumLon += v[i][0];
      sumLat += v[i][1];
    }

    const key = poly.plateId || poly.id || `p${groups.size}`;
    if (n >= 12) {
      const step = Math.max(1, Math.round(n / 80));
      const ring = [];
      for (let i = 0; i < n; i += step) ring.push(SX[i], SY[i]);
      outlines.push({ key, x0, y0, x1, y1, ring });
    }
    let group = groups.get(key);
    const rank = Number.isFinite(poly.labelRank) ? poly.labelRank : Math.sqrt(n);
    const at = poly.labelAt || [sumLon / n, sumLat / n];
    if (!group) {
      group = { key, plateId: poly.plateId || null, path: new Path2D(), lon: at[0], lat: at[1], rank };
      groups.set(key, group);
    } else if (rank > group.rank) {
      group.lon = at[0];
      group.lat = at[1];
      group.rank = rank;
    }

    // Closed ring → land + its plate group. A cut along the ±180° meridian follows the curved
    // edge of the projection.
    land.moveTo(SX[0], SY[0]);
    group.path.moveTo(SX[0], SY[0]);
    let penDown = false;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = v[i], b = v[j];
      if (isSeam(a, b)) {
        penDown = false;
        if (meridianSeam(a, b)) {
          const steps = P.curved ? Math.max(1, Math.ceil(Math.abs(b[1] - a[1]) / 2.5)) : 1;
          const sign = a[0] > 0 ? 1 : -1;
          maskExtra.moveTo(SX[i], SY[i]);
          for (let s = 1; s <= steps; s++) {
            fwd(a[0], a[1] + ((b[1] - a[1]) * s) / steps);
            if (s < steps) {
              land.lineTo(PX, PY);
              group.path.lineTo(PX, PY);
            }
            maskExtra.lineTo(PX, PY);
          }
          maskExtra.lineTo(SX[j] + sign * MASK_MARGIN * 2, SY[j]);
          maskExtra.lineTo(SX[i] + sign * MASK_MARGIN * 2, SY[i]);
          maskExtra.closePath();
        } else {
          const sign = a[1] > 0 ? -1 : 1;   // the north pole is up (negative Y)
          maskExtra.moveTo(SX[i], SY[i]);
          maskExtra.lineTo(SX[j], SY[j]);
          maskExtra.lineTo(SX[j], SY[j] + sign * MASK_MARGIN * 2);
          maskExtra.lineTo(SX[i], SY[i] + sign * MASK_MARGIN * 2);
          maskExtra.closePath();
        }
      } else {
        if (!penDown) {
          coast.moveTo(SX[i], SY[i]);
          penDown = true;
        }
        coast.lineTo(SX[j], SY[j]);
      }
      if (j !== 0) {
        land.lineTo(SX[j], SY[j]);
        group.path.lineTo(SX[j], SY[j]);
      }
    }
    land.closePath();
    group.path.closePath();

    if (poly.name && poly.label !== false && rank > 0) {
      names.push({ name: poly.name, lon: at[0], lat: at[1], rank, id: poly.id });
    }
  }

  // Outlines of the big rings that touch a ring of another plate (bounding boxes overlap): the
  // relief feathers its texture seams along them.
  let seams = null;
  const near = 0.01;
  for (const a of outlines) {
    for (const b of outlines) {
      if (a.key === b.key || a.x0 > b.x1 + near || b.x0 > a.x1 + near || a.y0 > b.y1 + near || b.y0 > a.y1 + near) continue;
      if (!seams) seams = new Path2D();
      seams.moveTo(a.ring[0], a.ring[1]);
      for (let i = 2; i < a.ring.length; i += 2) seams.lineTo(a.ring[i], a.ring[i + 1]);
      seams.closePath();
      break;
    }
  }

  const geometry = {
    timeMa: frame.timeMa,
    count: polygons.length,
    source: polygons,
    land,
    coast,
    maskExtra,
    seams,
    groups: [...groups.values()],
    names,
    vertexCount,
    masksKey: null,       // set by landMasks()
  };
  geometryCache.set(P.name, geometry);
  return geometry;
}

// ---------------------------------------------------------------------------------------------
// Land masks: small planet-space canvases derived from one fill of the land. They replace every
// wide stroke of the classic recipe — and, being built from the union of all polygons, they are
// blind to the seams between abutting plates.
// ---------------------------------------------------------------------------------------------

const MASK_W = 512;
const maskSets = new Map();    // projection name → reusable canvases

function maskSet(P) {
  let set = maskSets.get(P.name);
  if (set) return set;
  const spanX = 2 * (P.xMax + MASK_MARGIN), spanY = 2 * (P.yMax + MASK_MARGIN);
  const w = MASK_W, h = Math.round((MASK_W * spanY) / spanX);
  const level = (d) => softCanvas(w / d, h / d);
  set = {
    w, h, s: w / spanX,
    owner: null,
    sharp: level(1),       // the land, antialiased, in the shelf colour
    near: level(2),        // edges softened over a few pixels: the shoals
    l4: level(4),
    l8: level(8),
    l16: level(16),
    wide: level(2),        // blurred over ~6° of arc: the shelf seas
    far: level(4),         // blurred over ~15° of arc: "how continental is it here?"
    tone: level(4),        // rain greens and drought tans, ready to lay over the land
    scratch: level(4),
    light: level(1),
    shade: level(1),
    stain: level(2),
    band: level(2),
    ice: softCanvas(320, Math.round((320 * spanY) / spanX)),
    iceSmall: softCanvas(80, Math.round((80 * spanY) / spanX)),
    iceSoft: softCanvas(160, Math.round((160 * spanY) / spanX)),
  };
  maskSets.set(P.name, set);
  return set;
}

/** A vertical alpha ramp across a mask canvas, keyed by latitude: stops [{ lat }], value(stop) → 0..1. */
function latitudeRamp(c, canvas, set, P, stops, value) {
  const k = canvas.height / set.h;
  const top = MASK_MARGIN * set.s * k, span = 2 * P.yMax * set.s * k;
  const g = c.createLinearGradient(0, top, 0, top + span);
  for (const stop of stops) g.addColorStop(P.off(stop.lat), `rgba(0,0,0,${clamp(value(stop), 0, 1).toFixed(3)})`);
  return g;
}

function landMasks(S) {
  const { geometry, P, look } = S;
  const set = maskSet(P);
  const wetKey = look.wetStops ? look.wetStops.map((w) => `${w.alpha.toFixed(2)}${(w.east || 0).toFixed(2)}`).join('') : '';
  const key = `${look.shelf}|${look.wet}|${look.dry}|${wetKey}`;
  if (geometry.masksKey === key && set.owner === geometry) return set;
  const { w, h, s } = set;

  // 1. sharp land in the shelf colour
  const c = set.sharp.c;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, w, h);
  c.setTransform(s, 0, 0, s, (P.xMax + MASK_MARGIN) * s, (P.yMax + MASK_MARGIN) * s);
  c.fillStyle = look.shelf;
  c.fill(geometry.land);
  c.fill(geometry.maskExtra);
  if (!P.curved) {
    // a sphere texture wraps: let land near one edge glow across the other
    for (const shift of [-2 * P.xMax, 2 * P.xMax]) {
      c.translate(shift, 0);
      c.fill(geometry.land);
      c.translate(-shift, 0);
    }
  }

  // 2. blur chain (repeated halving, then doubling back up: a cheap, portable Gaussian-ish blur)
  copyScaled(set.sharp, set.near);
  copyScaled(set.near, set.l4);
  copyScaled(set.l4, set.l8);
  copyScaled(set.l8, set.l16);
  copyScaled(set.l8, set.l4);              // back up, one level at a time, so the result is smooth
  copyScaled(set.l4, set.wide);
  copyScaled(set.l16, set.l8);
  copyScaled(set.l8, set.far);

  // 3. tone: drought in continental interiors, then rain where the sea is near or upwind
  const t = set.tone.c;
  const q = set.scratch.c;
  const tw = set.tone.width, th = set.tone.height;
  t.setTransform(1, 0, 0, 1, 0, 0);
  t.globalCompositeOperation = 'source-over';
  t.globalAlpha = 1;
  t.clearRect(0, 0, tw, th);
  const layer = (colour, cut, ramp) => {
    q.setTransform(1, 0, 0, 1, 0, 0);
    q.globalAlpha = 1;
    q.globalCompositeOperation = 'copy';
    q.fillStyle = colour;
    q.fillRect(0, 0, tw, th);
    cut(q);
    q.globalAlpha = 1;
    q.globalCompositeOperation = 'destination-in';
    q.fillStyle = ramp;
    q.fillRect(0, 0, tw, th);
    q.globalCompositeOperation = 'source-over';
    t.drawImage(set.scratch, 0, 0);
  };
  if (look.dryStops && look.dry) {
    // far from every coast: keep the tint only where the very wide blur is still solid land
    layer(look.dry, (x) => {
      x.globalCompositeOperation = 'destination-in';
      x.drawImage(set.far, 0, 0);
      x.drawImage(set.far, 0, 0);
      x.drawImage(set.far, 0, 0);
    }, latitudeRamp(q, set.scratch, set, P, look.dryStops, (d) => d.alpha));
  }
  if (look.dryStops && look.dry && look.dryStops[0].fringe != null) {
    // patchy drought frays the ruler-straight edges of the desert belts
    const blotches = patternOf(q, blotchTile('#000000'));
    const planetPx = (2 * P.xMax * s * tw) / w;
    const scale = planetPx / 4 / BLOTCH_SIZE;        // four tiles around the planet: wraps cleanly
    blotches.setTransform(new DOMMatrix([scale, 0, 0, scale, (MASK_MARGIN * s * tw) / w, 0]));
    layer(look.dry, (x) => {
      x.globalCompositeOperation = 'destination-in';
      x.fillStyle = blotches;
      x.fillRect(0, 0, tw, th);
    }, latitudeRamp(q, set.scratch, set, P, look.dryStops, (d) => d.fringe));
  }
  if (look.wetStops && look.wet) {
    const shift = Math.round(tw * 0.036);            // ≈ 13° of longitude at the equator
    // every coast, a little
    layer(look.wet, (x) => {
      x.globalCompositeOperation = 'destination-out';
      x.drawImage(set.wide, 0, 0, tw, th);
      x.globalAlpha = 0.55;
      x.drawImage(set.wide, 0, 0, tw, th);
    }, latitudeRamp(q, set.scratch, set, P, look.wetStops, (d) => d.alpha));
    // sea upwind to the east (trade winds) …
    layer(look.wet, (x) => {
      x.globalCompositeOperation = 'destination-out';
      x.drawImage(set.far, -shift, 0);
    }, latitudeRamp(q, set.scratch, set, P, look.wetStops, (d) => d.east || 0));
    // … or to the west (westerlies)
    layer(look.wet, (x) => {
      x.globalCompositeOperation = 'destination-out';
      x.drawImage(set.far, shift, 0);
    }, latitudeRamp(q, set.scratch, set, P, look.wetStops, (d) => d.west || 0));
  }

  // 4. rim light: land whose north-west neighbour is sea catches the light, land whose
  //    south-east neighbour is sea falls into shade
  const rim = (canvas, colour, dx, dy) => {
    const r = canvas.c;
    r.setTransform(1, 0, 0, 1, 0, 0);
    r.globalCompositeOperation = 'copy';
    r.drawImage(set.sharp, 0, 0);
    r.globalCompositeOperation = 'source-in';
    r.fillStyle = colour;
    r.fillRect(0, 0, canvas.width, canvas.height);
    r.globalCompositeOperation = 'destination-out';
    r.drawImage(set.sharp, dx, dy);
    r.globalCompositeOperation = 'source-over';
  };
  rim(set.light, '#fff6e2', 1.2, 1.2);
  rim(set.shade, '#120c06', -1.2, -1.2);

  geometry.masksKey = key;
  set.owner = geometry;
  return set;
}

// Static soft versions of the planet outline (per projection): halo outside, limb inside.
const EDGE_W = 512;
const EDGE_MARGIN = 0.4;

function edgeMasks(P) {
  if (P.edge) return P.edge;
  const spanX = 2 * (P.xMax + EDGE_MARGIN), spanY = 2 * (P.yMax + EDGE_MARGIN);
  const w = EDGE_W, h = Math.round((w * spanY) / spanX), s = w / spanX;
  const sharp = softCanvas(w, h);
  sharp.c.setTransform(s, 0, 0, s, (P.xMax + EDGE_MARGIN) * s, (P.yMax + EDGE_MARGIN) * s);
  sharp.c.fillStyle = '#fff';
  sharp.c.fill(P.outline);
  const chain = [sharp];
  for (let d = 2; d <= 32; d *= 2) {
    const next = softCanvas(w / d, h / d);
    copyScaled(chain[chain.length - 1], next);
    chain.push(next);
  }
  /** The outline blurred by going down to chain level `n` and back up one level at a time. */
  const blurred = (n) => {
    let current = chain[n];
    for (let i = n - 1; i >= 1; i--) {
      const up = softCanvas(chain[i].width, chain[i].height);
      copyScaled(current, up);
      current = up;
    }
    return current;
  };
  /** White where the blurred planet is thin: a falloff from the edge inward. */
  const inside = (source) => {
    const out = softCanvas(source.width, source.height);
    out.c.fillStyle = '#fff';
    out.c.fillRect(0, 0, out.width, out.height);
    out.c.globalCompositeOperation = 'destination-out';
    out.c.drawImage(source, 0, 0);
    out.c.globalCompositeOperation = 'source-over';
    return out;
  };
  const b2 = blurred(3), b3 = blurred(4), b4 = blurred(5);
  P.edge = {
    halo: b3,                 // direct: half-strength at the edge, fading outward
    glow: inside(b2),         // tight inner falloff — the sky seen edge-on
    shade: inside(b4),        // broad inner falloff — the ocean darkening toward the limb
    vignette: inside(b3),
    slots: new Map(),
  };
  return P.edge;
}

/** One of the edge masks filled with a colour (re-tinted only when the colour changes). */
function tintedEdge(P, name, hex) {
  const edge = edgeMasks(P);
  let slot = edge.slots.get(name);
  if (!slot) {
    slot = softCanvas(edge[name].width, edge[name].height);
    edge.slots.set(name, slot);
  }
  if (slot.hex !== hex) {
    const c = slot.c;
    c.globalCompositeOperation = 'copy';
    c.drawImage(edge[name], 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = hex;
    c.fillRect(0, 0, slot.width, slot.height);
    c.globalCompositeOperation = 'source-over';
    slot.hex = hex;
  }
  return slot;
}

// =============================================================================================
// Scene set-up
// =============================================================================================

// Older extinction data carries neither `mechanism` nor `epicenter`: infer them from the id.
// Epicentres are MODERN coordinates on a plate (the engine carries them back in time).
const MECHANISM_BY_ID = {
  'end-cretaceous': 'impact',
  'end-permian': 'volcanism',
  'end-triassic': 'volcanism',
  'end-ordovician': 'glaciation',
  'late-devonian': 'anoxia',
};
const EPICENTER_BY_ID = {
  'end-cretaceous': { plateId: 'north_america', lon: -89.5, lat: 21.3, name: 'Chicxulub' },
  'end-permian': { plateId: 'eurasia', lon: 100, lat: 66, name: 'Siberian Traps' },
  'end-triassic': { plateId: 'africa', lon: -7.5, lat: 31, name: 'Central Atlantic Magmatic Province' },
  'end-ordovician': { plateId: 'africa', lon: 5, lat: 25, name: 'Gondwanan ice centre' },
};

function plateToWorld(plateId, lon, lat, timeMa) {
  if (plateId && typeof interp.plateToWorld === 'function') {
    try {
      const p = interp.plateToWorld(plateId, lon, lat, timeMa);
      if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) return p;
    } catch { /* fall through to the modern coordinate */ }
  }
  return [lon, lat];
}

function readCrisis(frame) {
  const c = frame.crisis;
  if (!c || !c.extinction || !(c.intensity > 0.003)) return null;
  const ext = c.extinction;
  const color = /^#[0-9a-f]{6}$/i.test(ext.color || '') ? ext.color : '#ff5533';
  // `epicenter: null` in the data means "no single site": only a missing field falls back
  const source = ext.epicenter === undefined ? EPICENTER_BY_ID[ext.id] : ext.epicenter;
  let epi = null;
  if (source && Number.isFinite(source.lon) && Number.isFinite(source.lat)) {
    const p = plateToWorld(source.plateId, source.lon, source.lat, frame.timeMa);
    epi = { lon: p[0], lat: p[1], name: source.name || '' };
  }
  return {
    id: ext.id,
    mechanism: ext.mechanism || MECHANISM_BY_ID[ext.id] || 'volcanism',
    intensity: clamp(c.intensity, 0, 1),
    // null = the viewer scrubbed into the event (or prefers reduced motion): show the steady state
    elapsed: frame.reducedMotion || c.elapsedSec == null ? null : c.elapsedSec,
    color,
    dark: mixHex(color, '#05070d', 0.74),
    epi,
  };
}

/** The look with the crisis blended in: ocean and land lean ~25% toward a dark event colour. */
function crisisLook(look, crisis) {
  if (!crisis) return look;
  const k = 0.25 * crisis.intensity;
  const tone = (hex) => mixHex(hex, crisis.dark, k);
  return {
    ...look,
    ocean: { shallow: tone(look.ocean.shallow), deep: tone(look.ocean.deep), abyss: tone(look.ocean.abyss) },
    shelf: tone(look.shelf),
    coast: tone(look.coast),
    landStops: look.landStops.map((s) => ({ lat: s.lat, color: tone(s.color) })),
  };
}

const planetCTM = (S) => S.ctx.setTransform(S.pr * S.k, 0, 0, S.pr * S.k, S.pr * S.cx, S.pr * S.cy);
const screenCTM = (S) => S.ctx.setTransform(S.pr, 0, 0, S.pr, 0, 0);
/** Screen px → projection units (for strokes that keep a constant width on screen). */
const px = (S, n) => n / S.k;
/** Reference px → projection units (for things that scale with the planet). */
const ref = (n) => n / K_REF;

function fillPlanet(S) {
  const { ctx, P } = S;
  const m = 0.05;
  ctx.fillRect(-P.xMax - m, -P.yMax - m, 2 * (P.xMax + m), 2 * (P.yMax + m));
}

/** Draw a planet-space helper canvas (one that includes `margin` units of slack on every side). */
function drawPlanetImage(S, image, margin = MASK_MARGIN) {
  const { ctx, P } = S;
  ctx.drawImage(image, -P.xMax - margin, -P.yMax - margin, 2 * (P.xMax + margin), 2 * (P.yMax + margin));
}

/** Draw a world texture (wrapped once around the planet), shifted east by `shift` of its width. */
function drawWorld(S, image, shift = 0) {
  const { ctx, P } = S;
  const w = image.width, h = image.height;
  const cut = Math.round((((shift % 1) + 1) % 1) * w);
  if (cut === 0) {
    ctx.drawImage(image, -P.xMax, -P.yMax, 2 * P.xMax, 2 * P.yMax);
    return;
  }
  const split = (cut / w) * 2 * P.xMax;
  ctx.drawImage(image, w - cut, 0, cut, h, -P.xMax, -P.yMax, split, 2 * P.yMax);
  ctx.drawImage(image, 0, 0, w - cut, h, -P.xMax + split, -P.yMax, 2 * P.xMax - split, 2 * P.yMax);
}

// =============================================================================================
// Layers
// =============================================================================================

function paintHalo(S) {
  // Soft atmosphere just outside the outline (the planet is painted over the inner half).
  const { ctx, P, look } = S;
  planetCTM(S);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = SMOOTHING;
  const a = clamp(look.atmosphere.rimAlpha ?? 0.1, 0.04, 0.5);
  ctx.globalAlpha = clamp(0.34 + a * 1.9, 0, 1);
  drawPlanetImage(S, tintedEdge(P, 'halo', look.atmosphere.rim), EDGE_MARGIN);
  ctx.globalAlpha = 1;
}

function paintOcean(S) {
  const { ctx, P, look, view } = S;
  planetCTM(S);
  const polar = mixHex(look.ocean.deep, look.ocean.abyss, 0.6);
  const g = ctx.createLinearGradient(0, -P.yMax, 0, P.yMax);
  g.addColorStop(0, polar);
  g.addColorStop(P.off(52), look.ocean.deep);
  g.addColorStop(0.5, mixHex(look.ocean.deep, look.ocean.shallow, 0.36));
  g.addColorStop(P.off(-52), look.ocean.deep);
  g.addColorStop(1, polar);
  ctx.fillStyle = g;
  fillPlanet(S);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = SMOOTHING;
  if (view.outline) {
    // a broad lift around the centre of the map …
    ctx.save();
    ctx.scale(P.xMax / P.yMax, 1);
    const r = ctx.createRadialGradient(0, 0, 0, 0, 0, P.yMax * 1.05);
    r.addColorStop(0, hexAlpha(look.ocean.shallow, 0.24));
    r.addColorStop(0.6, hexAlpha(look.ocean.shallow, 0.06));
    r.addColorStop(1, hexAlpha(look.ocean.shallow, 0));
    ctx.fillStyle = r;
    ctx.fillRect(-P.yMax * 1.1, -P.yMax * 1.1, P.yMax * 2.2, P.yMax * 2.2);
    ctx.restore();
    // … and the abyss gathering along the limb
    ctx.globalAlpha = 0.9;
    drawPlanetImage(S, tintedEdge(P, 'shade', look.ocean.abyss), EDGE_MARGIN);
  }

  // grain: currents and gyres, barely there
  ctx.globalAlpha = 0.075 * (1 - 0.5 * look.magma);
  drawWorld(S, worldGrain());
  ctx.globalAlpha = 1;
}

// Deterministic "hot spots" of the magma ocean: [lon, lat, size, phase].
const HOT_SPOTS = [
  [-128, 22, 1.0, 0.3], [-64, -31, 0.8, 1.9], [-12, 44, 1.2, 4.1], [38, -8, 1.0, 2.6], [96, 31, 0.9, 5.2],
  [141, -38, 1.1, 0.9], [-162, -52, 0.7, 3.4], [17, 9, 0.8, 5.9], [72, -55, 0.9, 1.3], [-95, 61, 0.7, 4.6],
  [164, 12, 1.0, 2.2], [-33, -5, 0.9, 3.0],
];
const DEFAULT_RAMP = ['#7a1c06', '#ff5a14', '#ffb347', '#fff1c4'];

function paintMagma(S) {
  const { ctx, look, t } = S;
  const m = look.magma;
  if (!(m > 0.01)) return;
  const lava = lavaTile(look.magmaRamp || DEFAULT_RAMP);
  planetCTM(S);
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingQuality = SMOOTHING;
  // the main fissure network breathes …
  ctx.globalAlpha = Math.min(1, m * (0.84 + 0.12 * Math.sin(t * 0.55)));
  drawWorld(S, lava);
  // … while the same network, half a world away, glows in and out of phase
  const second = m * 0.34 * (0.5 + 0.5 * Math.sin(t * 0.31 + 2));
  if (second > 0.01) {
    ctx.globalAlpha = second;
    drawWorld(S, lava, 0.5);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function paintHotSpots(S) {
  const { ctx, P, look, t, motion } = S;
  const m = look.magma;
  if (!(m > 0.01)) return;
  planetCTM(S);
  ctx.globalCompositeOperation = 'lighter';
  const ramp = look.magmaRamp || DEFAULT_RAMP;
  for (const [lon, lat, size, phase] of HOT_SPOTS) {
    const pulse = motion ? 0.5 + 0.5 * Math.sin(t * (0.5 + size * 0.35) + phase) : 0.6;
    const r = ref(14 + 18 * size) * (0.75 + 0.35 * pulse);
    P.fwd(lon, lat);
    const g = ctx.createRadialGradient(PX, PY, 0, PX, PY, r);
    const a = m * (0.22 + 0.42 * pulse);
    g.addColorStop(0, hexAlpha(ramp[3], a));
    g.addColorStop(0.18, hexAlpha(ramp[2], a * 0.7));
    g.addColorStop(0.5, hexAlpha(ramp[1], a * 0.28));
    g.addColorStop(1, hexAlpha(ramp[1], 0));
    ctx.fillStyle = g;
    ctx.fillRect(PX - r, PY - r, 2 * r, 2 * r);
  }
  // Late accretion: now and then something large still falls in.
  if (motion) {
    const period = 3.4;
    for (let lane = 0; lane < 2; lane++) {
      const clock = t / period + lane * 0.47;
      const n = Math.floor(clock);
      const age = (clock - n) * period;                       // seconds since this impact
      if (age > 2.2) continue;
      const rand = mulberry32(n * 7919 + lane * 104729 + 17);
      P.fwd(rand() * 320 - 160, rand() * 120 - 60);
      const x = PX, y = PY;
      const flash = Math.exp(-age / 0.22);
      const ring = ref(8 + 70 * (1 - Math.exp(-age / 0.9)));
      const fade = clamp(1 - age / 2.2, 0, 1);
      const g = ctx.createRadialGradient(x, y, 0, x, y, ref(30));
      g.addColorStop(0, hexAlpha(ramp[3], m * flash));
      g.addColorStop(0.3, hexAlpha(ramp[2], m * flash * 0.6));
      g.addColorStop(1, hexAlpha(ramp[1], 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - ref(30), y - ref(30), ref(60), ref(60));
      ctx.strokeStyle = hexAlpha(ramp[2], m * 0.55 * fade * fade);
      ctx.lineWidth = px(S, 1.6);
      ctx.beginPath();
      ctx.arc(x, y, ring, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

function paintGraticule(S) {
  const { ctx, P } = S;
  planetCTM(S);
  ctx.lineCap = 'butt';
  ctx.lineWidth = px(S, 1);
  ctx.strokeStyle = 'rgba(226,236,248,0.06)';
  ctx.stroke(P.grid);
  ctx.strokeStyle = 'rgba(226,236,248,0.12)';
  ctx.stroke(P.equator);
  ctx.setLineDash([px(S, 3), px(S, 6)]);
  ctx.strokeStyle = 'rgba(226,236,248,0.085)';
  ctx.stroke(P.circles);
  ctx.setLineDash([]);
}

function paintShelf(S) {
  const { ctx, look } = S;
  const width = look.shelfWidth ?? 1;
  if (!(width > 0.02) || !S.geometry.groups.length) return;
  const masks = landMasks(S);
  planetCTM(S);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = SMOOTHING;
  const land = look.landAlpha ?? 1;
  // a tight bright rim of shoals, then the broad shelf (wider and brighter when sea level is high)
  ctx.globalAlpha = clamp(0.7 * Math.min(1, width) * land, 0, 1);
  drawPlanetImage(S, masks.near);
  ctx.globalAlpha = clamp(0.5 * width * land, 0, 1);
  drawPlanetImage(S, masks.wide);
  ctx.globalAlpha = 1;
}

// Smooth, deterministic wobble of an ice edge with longitude (≈ -1..1), drifting very slowly.
function wobble(lonDeg, t, seed) {
  const l = lonDeg * D2R;
  return 0.5 * Math.sin(2 * l + seed + t * 0.021)
    + 0.3 * Math.sin(5 * l + seed * 2.3 - t * 0.033)
    + 0.2 * Math.sin(9 * l + seed * 4.1 + t * 0.05)
    + 0.12 * Math.sin(17 * l + seed * 7.7);
}

/**
 * Path of everything poleward of an edge. edgeLat(lon) → latitude of the edge (degrees).
 * The path overshoots the frame sideways and at the pole; the outline (or canvas) clips it.
 */
function capPath(P, north, edgeLat) {
  const path = new Path2D();
  const far = P.xMax + 1;
  const poleY = north ? -P.yMax - 1 : P.yMax + 1;
  let first = true;
  for (let lon = -180; lon <= 180; lon += 3) {
    P.fwd(lon, clamp(edgeLat(lon), -90, 90));
    if (first) {
      path.moveTo(-far, poleY);
      path.lineTo(-far, PY);
      first = false;
    }
    path.lineTo(PX, PY);
  }
  path.lineTo(far, PY);
  path.lineTo(far, poleY);
  path.closePath();
  return path;
}

/** Just the edge of a cap, as an open line. */
function capEdge(P, edgeLat) {
  const path = new Path2D();
  for (let lon = -180; lon <= 180; lon += 3) {
    P.fwd(lon, clamp(edgeLat(lon), -90, 90));
    if (lon === -180) path.moveTo(PX, PY);
    else path.lineTo(PX, PY);
  }
  return path;
}

function iceState(S) {
  const ice = S.look.ice || {};
  const crisis = S.crisis;
  // glaciation crisis: the ice surges toward the equator
  let surge = 0;
  if (crisis && crisis.mechanism === 'glaciation') {
    const beat = crisis.elapsed == null ? 0.5 : 0.5 + 0.5 * Math.sin(crisis.elapsed * 1.5 - 1.2);
    surge = crisis.intensity * (5 + 3.5 * beat);
  }
  const north = { sea: ice.seaNorth ?? ice.north ?? 90, land: ice.landNorth ?? ice.north ?? 90 };
  const south = { sea: ice.seaSouth ?? ice.south ?? -90, land: ice.landSouth ?? ice.south ?? -90 };
  let surgeN = 0, surgeS = 0;
  if (surge) {
    const epiLat = crisis.epi ? crisis.epi.lat : null;
    const hasN = north.land < 88, hasS = south.land > -88;
    if (hasN || (!hasS && epiLat != null && epiLat > 0)) surgeN = surge;
    if (hasS || (!hasN && !(epiLat != null && epiLat > 0))) surgeS = surge;
  }
  return {
    alpha: clamp(Math.max(ice.alpha ?? 0, surge ? crisis.intensity : 0), 0, 1),
    snowball: ice.snowball ?? 0,
    seaN: north.sea - surgeN,
    seaS: south.sea + surgeS,
    landN: (lon) => (ice.landNorthAt ? ice.landNorthAt(lon) : north.land) - surgeN * 1.5,
    landS: (lon) => (ice.landSouthAt ? ice.landSouthAt(lon) : south.land) + surgeS * 1.5,
    landNBase: north.land - surgeN * 1.5,
    landSBase: south.land + surgeS * 1.5,
    sheets: ice.sheets || null,
    sea: ice.sea || '#dfeaf3',
    land: ice.land || '#f5f8fb',
    shade: ice.shade || '#9db6d0',
    lead: ice.lead || '#2d6384',
  };
}

function paintSeaIce(S) {
  const { ctx, P, t } = S;
  const ice = S.ice;
  if (!(ice.alpha > 0.01)) return;
  const caps = [];
  if (ice.seaN < 89.2) caps.push([true, ice.seaN, 1.3]);
  if (ice.seaS > -89.2) caps.push([false, ice.seaS, 4.7]);
  if (!caps.length) return;

  // The marginal ice zone: both caps drawn small and blurred — a feathered, organic edge.
  const set = maskSet(P);
  const layer = set.ice;
  const s = layer.width / (2 * (P.xMax + MASK_MARGIN));
  const c = layer.c;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, layer.width, layer.height);
  c.setTransform(s, 0, 0, s, (P.xMax + MASK_MARGIN) * s, (P.yMax + MASK_MARGIN) * s);
  c.fillStyle = ice.sea;
  const packs = [];
  for (const [north, edge, seed] of caps) {
    const radius = 90 - Math.abs(edge);
    const amp = 3.4 * Math.min(1, radius / 12) * (1 - 0.5 * ice.snowball);
    const sign = north ? 1 : -1;
    const edgeAt = (lon) => edge + sign * amp * wobble(lon, t, seed);
    c.fill(capPath(P, north, (lon) => edgeAt(lon) - sign * 2.2 * Math.min(1, radius / 8)));
    packs.push([north, radius, edgeAt, sign]);
  }
  copyScaled(layer, set.iceSmall);
  copyScaled(set.iceSmall, set.iceSoft);

  planetCTM(S);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = SMOOTHING;
  ctx.globalAlpha = 0.92 * ice.alpha;
  drawPlanetImage(S, set.iceSoft);
  ctx.globalAlpha = 1;

  // The solid pack inside it.
  for (const [north, radius, edgeAt, sign] of packs) {
    const pack = capPath(P, north, (lon) => edgeAt(lon) + sign * 1.4 * Math.min(1, radius / 8));
    ctx.fillStyle = hexAlpha(ice.sea, 0.62 * ice.alpha);
    ctx.fill(pack);
    ctx.save();
    ctx.clip(pack);
    // pressure ridges …
    ctx.globalAlpha = 0.08 * ice.alpha;
    drawWorld(S, worldGrain(), 0.37);
    // … and, when the whole ocean freezes over, faint leads so it never reads as a blank sheet
    if (ice.snowball > 0.02) {
      ctx.globalAlpha = 0.3 * ice.snowball * ice.alpha;
      drawWorld(S, leadsTile(ice.lead), 0.21);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function landGradient(S, stops) {
  const { ctx, P } = S;
  const g = ctx.createLinearGradient(0, -P.yMax, 0, P.yMax);
  // stops run south → north (-90 … 90); gradient runs north → south
  const ladder = stops.length === P.off5.length;
  for (let i = stops.length - 1; i >= 0; i--) g.addColorStop(ladder ? P.off5[i] : P.off(stops[i].lat), stops[i].color);
  return g;
}

function paintLand(S) {
  const { ctx, P, look, geometry } = S;
  if (!geometry.groups.length) return;
  const alpha = look.landAlpha ?? 1;
  if (!(alpha > 0.01)) return;
  const ice = S.ice;
  planetCTM(S);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha;

  // Drop shadow on the sea, then the coastline. Both are drawn BEFORE the fill: the fill covers
  // their inner half and every seam between abutting plates.
  ctx.save();
  ctx.translate(px(S, 1.2), px(S, 2));
  ctx.strokeStyle = hexAlpha(look.ocean.abyss, 0.5);
  ctx.lineWidth = px(S, 3.8);
  ctx.stroke(geometry.coast);
  ctx.restore();

  let coastStyle = look.coast;
  if (ice.alpha > 0.05 && (ice.landNBase < 89 || ice.landSBase > -89)) {
    // the shore of an ice sheet is ice, not sand
    const frost = mixHex(look.coast, ice.shade, 0.85 * ice.alpha);
    const g = ctx.createLinearGradient(0, -P.yMax, 0, P.yMax);
    const n = clamp(ice.landNBase, -80, 90), s = clamp(ice.landSBase, -90, 80);
    g.addColorStop(0, n < 89 ? frost : look.coast);
    if (n < 89) {
      g.addColorStop(P.off(Math.min(90, n + 2)), frost);
      g.addColorStop(P.off(n - 3), look.coast);
    }
    if (s > -89) {
      g.addColorStop(P.off(s + 3), look.coast);
      g.addColorStop(P.off(Math.max(-90, s - 2)), frost);
    }
    g.addColorStop(1, s > -89 ? frost : look.coast);
    coastStyle = g;
  }
  ctx.strokeStyle = coastStyle;
  ctx.lineWidth = px(S, 2.1);
  ctx.stroke(geometry.coast);

  // Land: one latitude gradient colours every continent.
  const gradient = landGradient(S, look.landStops);
  ctx.fillStyle = gradient;
  ctx.fill(geometry.land);
  ctx.globalAlpha = 1;

  // ---- everything below stays inside the land ----
  ctx.save();
  ctx.clip(geometry.land);
  const masks = landMasks(S);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = SMOOTHING;

  // rain and drought: greener where the sea is near or upwind, drier deep inside continents
  ctx.globalAlpha = alpha;
  drawPlanetImage(S, masks.tone);

  // relief: a hillshade that rides with each plate
  paintRelief(S, alpha);

  // rim light: lit north-west shores, shaded south-east shores
  planetCTM(S);
  ctx.globalAlpha = 0.3 * alpha;
  drawPlanetImage(S, masks.light);
  ctx.globalAlpha = 0.3 * alpha;
  drawPlanetImage(S, masks.shade);
  ctx.globalAlpha = 1;

  paintLandIce(S, gradient);
  ctx.restore();
}

// ---- relief --------------------------------------------------------------------------------

const reliefLayers = new WeakMap();   // target ctx → { canvas, ctx }

function paintRelief(S, alpha) {
  const { ctx, P, geometry, frame } = S;
  // Composed off-screen with destination-over so that where plates overlap exactly one plate's
  // texture shows — no doubled relief along sutures.
  const q = S.pr >= 1.5 ? S.pr / 2 : S.pr;
  const w = Math.max(1, Math.round(S.W * q)), h = Math.max(1, Math.round(S.H * q));
  let layer = reliefLayers.get(ctx);
  if (!layer) {
    layer = { canvas: makeCanvas(w, h) };
    layer.ctx = layer.canvas.getContext('2d');
    reliefLayers.set(ctx, layer);
  }
  if (layer.canvas.width !== w || layer.canvas.height !== h) {
    layer.canvas.width = w;
    layer.canvas.height = h;
  }
  const r = layer.ctx;
  r.setTransform(1, 0, 0, 1, 0, 0);
  r.globalCompositeOperation = 'source-over';
  r.clearRect(0, 0, w, h);
  r.setTransform(q * S.k, 0, 0, q * S.k, q * S.cx, q * S.cy);
  r.globalCompositeOperation = 'destination-over';
  const pattern = patternOf(r, reliefTile());
  r.fillStyle = pattern;
  // Tile size: an integer number of tiles around the planet, so a sphere texture wraps cleanly.
  const span = (2 * P.xMax) / 4 / RELIEF_SIZE;
  for (const group of geometry.groups) {
    let ox, oy, angle = 0;
    if (group.plateId && typeof interp.plateToWorld === 'function') {
      // ride the plate: where two fixed points of the plate are now gives its offset and spin
      const anchor = modernAnchor(group.plateId) || [0, 0];
      const a = plateToWorld(group.plateId, anchor[0], anchor[1], frame.timeMa);
      const b = plateToWorld(group.plateId, anchor[0], anchor[1] + 4, frame.timeMa);
      P.fwd(a[0], a[1]);
      ox = PX; oy = PY;
      if (P.curved) {
        P.fwd(b[0], b[1]);
        const now = Math.atan2(PY - oy, PX - ox);
        P.fwd(anchor[0], anchor[1]);
        const hx = PX, hy = PY;
        P.fwd(anchor[0], anchor[1] + 4);
        angle = now - Math.atan2(PY - hy, PX - hx);
      }
    } else {
      P.fwd(group.lon, group.lat);
      ox = PX; oy = PY;
    }
    const cos = Math.cos(angle) * span, sin = Math.sin(angle) * span;
    pattern.setTransform(new DOMMatrix([cos, sin, -sin, cos, ox, oy]));
    r.fill(group.path);
  }
  // Where two plates abut, their textures meet out of phase. Feather that line: neutral grey
  // (no effect under soft-light) laid along the outlines of touching plates fades the relief
  // toward the suture. (Along coasts the band is hidden under the rim light.)
  if (geometry.seams) {
    r.globalCompositeOperation = 'source-over';
    r.lineJoin = 'round';
    r.strokeStyle = 'rgba(128,128,128,0.36)';
    for (const width of [12, 6]) {
      r.lineWidth = px(S, width);
      r.stroke(geometry.seams);
    }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.66 * alpha;
  ctx.drawImage(layer.canvas, 0, 0, Math.round(S.W * S.pr), Math.round(S.H * S.pr));
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

let anchors = null;
/** A present-day point well inside each plate (asked of the engine once). */
function modernAnchor(plateId) {
  if (!anchors) {
    anchors = new Map();
    try {
      const rank = new Map();
      for (const p of interp.getPolygonsAtTime(0) || []) {
        if (!p.plateId || !p.labelAt) continue;
        const r = Number.isFinite(p.labelRank) ? p.labelRank : 0;
        if (!rank.has(p.plateId) || r > rank.get(p.plateId)) {
          rank.set(p.plateId, r);
          anchors.set(p.plateId, [p.labelAt[0], clamp(p.labelAt[1], -84, 84)]);
        }
      }
    } catch { /* no anchors: relief still follows each polygon's label point */ }
  }
  return anchors.get(plateId) || null;
}

// ---- ice sheets ----------------------------------------------------------------------------

function paintLandIce(S, landFill) {
  const { ctx, P, t, geometry } = S;
  const ice = S.ice;
  if (!(ice.alpha > 0.01)) return;
  planetCTM(S);

  // snowball: when both ice sheets close in on the equator, every continent is simply under ice
  const closing = smoothstep(12, 4, Math.max(ice.landNBase, -ice.landSBase));
  const global = closing > 0.999;
  if (closing > 0.001) {
    ctx.fillStyle = hexAlpha(ice.land, 0.97 * ice.alpha * closing);
    ctx.fill(geometry.land);
    ctx.globalAlpha = 0.17 * ice.alpha * closing;
    drawWorld(S, worldGrain(), 0.63);
    ctx.globalAlpha = 1;
  }
  const caps = [];
  if (!global && ice.landNBase < 89.5) caps.push([true, ice.landN, ice.landNBase, 2.9]);
  if (!global && ice.landSBase > -89.5) caps.push([false, ice.landS, ice.landSBase, 6.1]);
  for (const [north, edgeAt, base, seed] of caps) {
    const radius = 90 - Math.abs(base);
    const amp = 2.6 * Math.min(1, radius / 14);
    const sign = north ? 1 : -1;
    const edge = (lon) => edgeAt(lon) - sign * amp * wobble(lon, t * 0.6, seed);
    const fringe = capPath(P, north, (lon) => edge(lon) - sign * 1.5 * Math.min(1, radius / 10));
    ctx.fillStyle = hexAlpha(ice.land, 0.5 * ice.alpha);
    ctx.fill(fringe);
    const sheet = capPath(P, north, edge);
    ctx.fillStyle = hexAlpha(ice.land, 0.97 * ice.alpha);
    ctx.fill(sheet);
    // soft blue-grey modelling so the sheet has a surface
    ctx.save();
    ctx.clip(sheet);
    ctx.globalAlpha = 0.17 * ice.alpha;
    drawWorld(S, worldGrain(), 0.63);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (closing < 0.5) {
      // the ice margin casts a faint blue shadow onto the land in front of it
      ctx.strokeStyle = hexAlpha(ice.shade, 0.6 * ice.alpha * (1 - 2 * closing));
      ctx.lineWidth = px(S, 2.2);
      ctx.lineJoin = 'round';
      ctx.stroke(capEdge(P, edge));
    }
  }

  // Plates that carry an ice sheet wherever they are (Greenland).
  if (ice.sheets) {
    for (const group of geometry.groups) {
      const cover = group.plateId ? ice.sheets[group.plateId] : 0;
      if (!(cover > 0.01)) continue;
      ctx.fillStyle = hexAlpha(ice.land, 0.97 * cover);
      ctx.fill(group.path);
      ctx.save();
      ctx.clip(group.path);
      ctx.globalAlpha = 0.17 * cover;
      drawWorld(S, worldGrain(), 0.63);
      ctx.restore();
      // … leaving an ice-free coastal fringe
      ctx.globalAlpha = cover;
      ctx.strokeStyle = landFill;
      ctx.lineWidth = px(S, 3.2);
      ctx.stroke(group.path);
      ctx.strokeStyle = hexAlpha(ice.shade, 0.5);
      ctx.lineWidth = px(S, 4.6);
      ctx.globalAlpha = 0.35 * cover;
      ctx.stroke(group.path);
      ctx.globalAlpha = 1;
    }
  }
}

// ---- plate boundaries ----------------------------------------------------------------------

const BOUNDARY_STYLE = {
  divergent:  { color: COLORS.boundary.divergent, width: 1.7, dash: [7, 5] },
  convergent: { color: COLORS.boundary.convergent, width: 1.9, dash: null },
  transform:  { color: COLORS.boundary.transform, width: 1.3, dash: [2.5, 3.5] },
};

function paintBoundaries(S) {
  const { ctx, P, frame, k, cx, cy } = S;
  const boundaries = frame.boundaries;
  S.boundaryNames = [];
  if (!boundaries || !boundaries.length) return;
  screenCTM(S);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const b of boundaries) {
    const v = b.vertices;
    if (!v || v.length < 2) continue;
    const style = BOUNDARY_STYLE[b.type] || BOUNDARY_STYLE.divergent;
    // project, splitting where the line crosses the antimeridian
    const runs = [];
    for (const part of splitAntimeridian(v)) {
      const run = [];
      for (const p of part) {
        P.fwd(p[0], p[1]);
        run.push(cx + PX * k, cy + PY * k);
      }
      runs.push(run);
    }

    for (const line of runs) {
      const path = new Path2D();
      path.moveTo(line[0], line[1]);
      for (let i = 2; i < line.length; i += 2) path.lineTo(line[i], line[i + 1]);
      // dark casing so the line holds on land, sea and ice alike
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.34;
      ctx.strokeStyle = '#050a14';
      ctx.lineWidth = style.width + 2.2;
      ctx.stroke(path);
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      ctx.setLineDash(style.dash || []);
      ctx.stroke(path);
      ctx.setLineDash([]);

      if (b.type === 'convergent') {
        // teeth on the overriding side (left of the direction the line is drawn in)
        ctx.fillStyle = style.color;
        const spacing = 15, size = 5;
        let carried = spacing / 2;
        for (let i = 0; i < line.length - 2; i += 2) {
          const dx = line[i + 2] - line[i], dy = line[i + 3] - line[i + 1];
          const len = Math.hypot(dx, dy);
          if (len < 0.5) continue;
          const ux = dx / len, uy = dy / len;
          let d = carried;
          for (; d < len; d += spacing) {
            const x = line[i] + ux * d, y = line[i + 1] + uy * d;
            ctx.beginPath();
            ctx.moveTo(x - ux * size * 0.62, y - uy * size * 0.62);
            ctx.lineTo(x + uy * size, y - ux * size);
            ctx.lineTo(x + ux * size * 0.62, y + uy * size * 0.62);
            ctx.closePath();
            ctx.fill();
          }
          carried = d - len;
        }
      }
    }
    if (b.name && runs.length && (S.view.zoom || 1) >= 1.6) {
      const line = runs[0];
      const mid = (line.length >> 2) << 1;
      S.boundaryNames.push({ text: b.name, x: line[mid], y: line[mid + 1] - 10, color: style.color });
    }
  }
  ctx.globalAlpha = 1;
}

// ---- paleogeographic features --------------------------------------------------------------

function safeList(fn, timeMa) {
  if (typeof fn !== 'function') return [];
  try {
    const list = fn(timeMa);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const featureClock = new Map();   // impact id → nowSec when it appeared during continuous playback
let featureFrameSec = -1;         // nowSec of the last frame that looked at features

/**
 * Where a place is at this moment, as [lon, lat]. Project canon: coordinates given with a plateId
 * are present-day ones and ride their plate back in time; anything else is drawn where it says.
 * Takes { lon, lat, plateId? } or [lon, lat]; `plateId` is the fallback plate for array points.
 * → null for an unusable place.
 */
function placeAt(place, timeMa, plateId) {
  let lon, lat, plate = plateId;
  if (Array.isArray(place)) {
    lon = place[0];
    lat = place[1];
  } else if (place) {
    lon = place.lon;
    lat = place.lat;
    plate = place.plateId || plateId;
  }
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return plate ? plateToWorld(plate, lon, lat, timeMa) : [lon, lat];
}

/** The polyline of a feature or a migration, carried to this moment: [[lon, lat], …] or null. */
function featurePath(f, timeMa) {
  const p = f.path || f.vertices || f.points;
  if (!Array.isArray(p) || p.length < 2) return null;
  const out = [];
  for (const point of p) {
    const at = placeAt(point, timeMa, f.plateId);
    if (at) out.push(at);
  }
  return out.length >= 2 ? out : null;
}

/**
 * Screen-space runs of a lon/lat polyline: split where it crosses the antimeridian, and
 * optionally cut to the first `upTo` share of its length. → [[x, y, x, y, …], …]
 */
function routeRuns(S, pts, upTo = 1) {
  const { P, k, cx, cy } = S;
  const runs = [];
  let total = 0;
  for (const part of splitAntimeridian(pts)) {
    const run = [];
    for (const p of part) {
      P.fwd(p[0], p[1]);
      const x = cx + PX * k, y = cy + PY * k;
      if (run.length) total += Math.hypot(x - run[run.length - 2], y - run[run.length - 1]);
      run.push(x, y);
    }
    runs.push(run);
  }
  if (upTo >= 1) return runs;
  let left = total * clamp(upTo, 0, 1);
  const out = [];
  for (const line of runs) {
    const cut = [line[0], line[1]];
    let done = false;
    for (let i = 0; i < line.length - 2; i += 2) {
      const d = Math.hypot(line[i + 2] - line[i], line[i + 3] - line[i + 1]);
      if (left >= d) {
        cut.push(line[i + 2], line[i + 3]);
        left -= d;
      } else {
        const f = d > 0 ? left / d : 0;
        cut.push(lerp(line[i], line[i + 2], f), lerp(line[i + 1], line[i + 3], f));
        done = true;
        break;
      }
    }
    if (cut.length > 2) out.push(cut);
    if (done) break;
  }
  return out;
}

function paintFeatures(S) {
  const { ctx, frame, k, cx, cy, P, t, motion } = S;
  S.featureNames = [];
  S.animatedFeatures = false;
  if (!paleo) return;
  const features = safeList(paleo.getFeaturesAt, frame.timeMa);
  const migrations = safeList(paleo.getMigrationsAt, frame.timeMa);
  // "Continuous" = the previous frame was painted a moment ago and time has simply moved on, so
  // a feature that is new now really did just happen.
  const continuous = motion && frame.playing && !frame.jumped && frame.nowSec - featureFrameSec < 0.5;
  featureFrameSec = frame.nowSec;
  if (!features.length && !migrations.length) {
    featureClock.clear();
    return;
  }
  screenCTM(S);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const seen = new Set();
  const unit = k / K_REF;                         // geographic sizes follow the planet

  for (const f of features) {
    const pos = placeAt(f, frame.timeMa);
    if (!pos) continue;
    const type = String(f.type || f.kind || '').toLowerCase();
    const strength = clamp(f.intensity ?? f.opacity ?? 1, 0, 1);
    const opacity = clamp(f.opacity ?? 1, 0, 1);
    if (!(strength > 0.01 || opacity > 0.01)) continue;
    P.fwd(pos[0], pos[1]);
    const x = cx + PX * k, y = cy + PY * k;
    const id = f.id || `${type}:${f.name}`;
    seen.add(id);
    const radius = Math.max(4, ((f.radiusDeg || (type === 'lip' ? 7 : 3)) * D2R) * k);

    if (type === 'lip' || type === 'volcanism' || type === 'hotspot') {
      // large igneous province: an ember that breathes while the eruptions last
      const breath = motion ? 0.78 + 0.22 * Math.sin(t * 1.7 + pos[0]) : 0.9;
      if (motion && strength > 0.05) S.animatedFeatures = true;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
      g.addColorStop(0, `rgba(255,214,150,${(0.62 * strength * breath).toFixed(3)})`);
      g.addColorStop(0.25, `rgba(255,128,48,${(0.46 * strength * breath).toFixed(3)})`);
      g.addColorStop(0.6, `rgba(214,62,20,${(0.2 * strength).toFixed(3)})`);
      g.addColorStop(1, 'rgba(160,30,10,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - radius * 1.5, y - radius * 1.5, radius * 3, radius * 3);
      ctx.globalCompositeOperation = 'source-over';
      if (strength > 0.3) S.featureNames.push({ text: f.name, x, y: y + radius * 0.55 + 10, opacity: smoothstep(0.3, 0.5, strength), warm: true });
    } else if (type === 'impact' || type === 'crater') {
      // the moment of impact (real time, during playback) and the scar it leaves
      if (!featureClock.has(id)) featureClock.set(id, continuous ? frame.nowSec : -1e9);
      const age = motion ? frame.nowSec - featureClock.get(id) : 1e9;
      if (age < 2.4) {
        S.animatedFeatures = true;
        const flash = Math.exp(-age / 0.25);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y, 0, x, y, 46 * unit);
        g.addColorStop(0, `rgba(255,255,255,${(0.95 * flash).toFixed(3)})`);
        g.addColorStop(0.3, `rgba(255,236,190,${(0.5 * flash).toFixed(3)})`);
        g.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 46 * unit, y - 46 * unit, 92 * unit, 92 * unit);
        ctx.globalCompositeOperation = 'source-over';
        const grow = 1 - Math.exp(-age / 0.8);
        ctx.strokeStyle = `rgba(255,244,214,${(0.7 * (1 - age / 2.4)).toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(x, y, radius + 60 * unit * grow, 0, TAU);
        ctx.stroke();
      }
      const ring = Math.max(4, radius * 0.6);
      ctx.strokeStyle = `rgba(7,11,20,${(0.55 * opacity).toFixed(3)})`;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.arc(x, y, ring, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,240,205,${(0.9 * opacity).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = `rgba(255,240,205,${(0.9 * opacity).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, TAU);
      ctx.fill();
      S.featureNames.push({ text: f.name, x, y: y + ring + 11, opacity });
    } else if (type === 'orogeny' || type === 'mountains' || type === 'range') {
      // mountain building: a run of chevrons along the range
      const line = featurePath(f, frame.timeMa);
      const runs = line ? routeRuns(S, line) : [[x - 14, y, x + 14, y]];
      const chevron = (px0, py0) => {
        ctx.beginPath();
        ctx.moveTo(px0 - 3.6, py0 + 2.4);
        ctx.lineTo(px0, py0 - 3.2);
        ctx.lineTo(px0 + 3.6, py0 + 2.4);
        ctx.strokeStyle = `rgba(20,14,8,${(0.5 * opacity).toFixed(3)})`;
        ctx.lineWidth = 2.8;
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,246,226,${(0.85 * opacity).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      };
      let anchor = null;
      for (const pts of runs) {
        let carried = 6;
        for (let i = 0; i < pts.length - 2; i += 2) {
          const dx = pts[i + 2] - pts[i], dy = pts[i + 3] - pts[i + 1];
          const len = Math.hypot(dx, dy);
          if (len < 0.5) continue;
          let d = carried;
          for (; d < len; d += 12) chevron(pts[i] + (dx / len) * d, pts[i + 1] + (dy / len) * d);
          carried = d - len;
        }
        if (!anchor) {
          const mid = (pts.length >> 2) << 1;
          anchor = [pts[mid], pts[mid + 1]];
        }
      }
      if (anchor) S.featureNames.push({ text: f.name, x: anchor[0], y: anchor[1] + 13, opacity });
    } else {
      // gateways and land bridges: a small ↔ marker
      const w = 7;
      const arrow = () => {
        ctx.beginPath();
        ctx.moveTo(x - w, y);
        ctx.lineTo(x + w, y);
        ctx.moveTo(x - w + 3.5, y - 3.2);
        ctx.lineTo(x - w, y);
        ctx.lineTo(x - w + 3.5, y + 3.2);
        ctx.moveTo(x + w - 3.5, y - 3.2);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w - 3.5, y + 3.2);
        ctx.stroke();
      };
      ctx.strokeStyle = `rgba(7,11,20,${(0.6 * opacity).toFixed(3)})`;
      ctx.lineWidth = 3.4;
      arrow();
      ctx.strokeStyle = `rgba(241,236,225,${(0.92 * opacity).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      arrow();
      S.featureNames.push({ text: f.name, x, y: y + 13, opacity });
    }
  }

  for (const m of migrations) {
    const line = m && featurePath(m, frame.timeMa);
    if (!line) continue;
    const opacity = clamp(m.opacity ?? 1, 0, 1);
    const progress = clamp(m.progress ?? 1, 0, 1);
    if (!(opacity > 0.01) || !(progress > 0.002)) continue;
    const runs = routeRuns(S, line, progress);
    if (!runs.length) continue;
    const color = /^#[0-9a-f]{6}$/i.test(m.color || '') ? m.color : '#ffd27a';
    if (motion && progress < 1) S.animatedFeatures = true;
    const path = new Path2D();
    for (const pts of runs) {
      path.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i], pts[i + 1]);
    }
    // a dotted trail that marches toward its head while the journey is under way
    ctx.setLineDash([0.1, 7]);
    ctx.lineDashOffset = motion && progress < 1 ? -((t * 9) % 7) : 0;
    ctx.strokeStyle = `rgba(7,11,20,${(0.55 * opacity).toFixed(3)})`;
    ctx.lineWidth = 5;
    ctx.stroke(path);
    ctx.strokeStyle = hexAlpha(color, 0.95 * opacity);
    ctx.lineWidth = 2.6;
    ctx.stroke(path);
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    // arrowhead at the front
    const last = runs[runs.length - 1];
    const n = last.length;
    const hx = last[n - 2], hy = last[n - 1];
    let bx = last[n - 4], by = last[n - 3];
    for (let i = n - 4; i >= 0 && Math.hypot(hx - bx, hy - by) < 4; i -= 2) {
      bx = last[i];
      by = last[i + 1];
    }
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(Math.atan2(hy - by, hx - bx));
    ctx.beginPath();
    ctx.moveTo(6.5, 0);
    ctx.lineTo(-4.5, -4.6);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4.5, 4.6);
    ctx.closePath();
    ctx.fillStyle = hexAlpha(color, opacity);
    ctx.strokeStyle = `rgba(7,11,20,${(0.7 * opacity).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (m.name) S.featureNames.push({ text: m.name, x: hx, y: hy - 13, opacity, head: true });
  }
  for (const id of featureClock.keys()) if (!seen.has(id)) featureClock.delete(id);
}

// ---- crisis --------------------------------------------------------------------------------

/** Path of the small circle `deg` degrees of arc around a point (a shock front on the sphere). */
function geodesicRing(S, lon, lat, deg) {
  const { P } = S;
  const path = new Path2D();
  const la = lat * D2R, lo = lon * D2R, d = deg * D2R;
  const sinLa = Math.sin(la), cosLa = Math.cos(la), sinD = Math.sin(d), cosD = Math.cos(d);
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const az = (i / 120) * TAU;
    const lat2 = Math.asin(clamp(sinLa * cosD + cosLa * sinD * Math.cos(az), -1, 1));
    const lon2 = (lo + Math.atan2(Math.sin(az) * sinD * cosLa, cosD - sinLa * Math.sin(lat2))) * R2D;
    pts.push([((((lon2 + 180) % 360) + 360) % 360) - 180, lat2 * R2D]);
  }
  for (const run of splitAntimeridian(pts)) {
    for (let i = 0; i < run.length; i++) {
      P.fwd(run[i][0], run[i][1]);
      if (i === 0) path.moveTo(PX, PY);
      else path.lineTo(PX, PY);
    }
  }
  return path;
}

// Vents of a flood-basalt province around its epicentre: [dLon, dLat (degrees), size, phase].
const VENTS = [
  [-6.5, 2.5, 0.7, 0.4], [5.5, 3.5, 0.5, 2.1], [2, -5, 0.8, 4.0], [-3, -4.5, 0.45, 5.3],
  [8.5, -1.5, 0.6, 1.2], [-9, -1, 0.4, 3.3],
];

function glow(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}

/** Stains that bloom in the shelf seas (drawn under the land). */
function paintAnoxia(S) {
  const { ctx, crisis, t } = S;
  if (!crisis || crisis.mechanism !== 'anoxia' || !S.geometry.groups.length) return;
  const masks = landMasks(S);
  const stain = masks.stain;
  const c = stain.c;
  const sw = stain.width, sh = stain.height;
  // the shelf seas and the margins beyond: the blurred land, boosted so the band stays solid
  // some degrees out
  const band = masks.band.c;
  band.setTransform(1, 0, 0, 1, 0, 0);
  band.globalCompositeOperation = 'copy';
  band.globalAlpha = 1;
  band.drawImage(masks.far, 0, 0, sw, sh);
  band.globalCompositeOperation = 'source-over';
  band.drawImage(masks.far, 0, 0, sw, sh);
  band.drawImage(masks.wide, 0, 0, sw, sh);
  band.drawImage(masks.wide, 0, 0, sw, sh);

  const pattern = patternOf(c, blotchTile(mixHex(crisis.color, '#0b0312', 0.88)));
  const drift = crisis.elapsed == null ? 0 : t * 1.6;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'copy';
  pattern.setTransform(new DOMMatrix([1, 0, 0, 1, drift, drift * 0.4]));
  c.fillStyle = pattern;
  c.fillRect(0, 0, sw, sh);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 0.6;
  pattern.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, -drift * 0.7, 31]));
  c.fillRect(0, 0, sw, sh);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(masks.band, 0, 0);
  c.globalCompositeOperation = 'source-over';
  planetCTM(S);
  // the stains spread over the first seconds, then breathe
  const bloom = crisis.elapsed == null ? 1
    : (0.25 + 0.75 * smoothstep(0, 3, crisis.elapsed)) * (0.86 + 0.14 * Math.sin(crisis.elapsed * 0.9));
  ctx.imageSmoothingQuality = SMOOTHING;
  ctx.globalAlpha = clamp(crisis.intensity * bloom, 0, 1);
  drawPlanetImage(S, stain);
  drawPlanetImage(S, stain);
  ctx.globalAlpha = 1;
}

function paintCrisis(S) {
  const { ctx, P, crisis } = S;
  if (!crisis) return;
  const { intensity, elapsed, mechanism } = crisis;
  let ex = 0, ey = 0;
  if (crisis.epi) {
    P.fwd(crisis.epi.lon, crisis.epi.lat);
    ex = PX; ey = PY;
  }
  planetCTM(S);

  if (mechanism === 'impact') {
    const e = elapsed == null ? 99 : elapsed;
    // dust veil: after the shock has passed, the sky stays dark
    const veil = smoothstep(1.6, 4.2, e) * 0.22 * intensity;
    if (veil > 0.003) {
      ctx.fillStyle = `rgba(16,11,8,${veil.toFixed(3)})`;
      fillPlanet(S);
    }
    if (crisis.epi) {
      if (e >= 0.9 && e < 5.2) {
        // shock front racing around the planet
        const p = clamp((e - 0.9) / 3.4, 0, 1);
        const deg = 178 * (1 - Math.pow(1 - p, 1.7));
        const fade = Math.pow(1 - p, 0.8) * intensity;
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'lighter';
        const ring = geodesicRing(S, crisis.epi.lon, crisis.epi.lat, deg);
        ctx.strokeStyle = hexAlpha(crisis.color, 0.3 * fade);
        ctx.lineWidth = ref(16);
        ctx.stroke(ring);
        ctx.strokeStyle = `rgba(255,238,206,${(0.85 * fade).toFixed(3)})`;
        ctx.lineWidth = ref(2.6);
        ctx.stroke(ring);
        if (deg > 14) {
          ctx.strokeStyle = `rgba(255,214,160,${(0.3 * fade).toFixed(3)})`;
          ctx.lineWidth = ref(1.4);
          ctx.stroke(geodesicRing(S, crisis.epi.lon, crisis.epi.lat, deg * 0.72));
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      // fireball, then the glowing crater
      const flash = e >= 0.9 ? Math.exp(-(e - 0.9) / 0.32) : 0;
      ctx.globalCompositeOperation = 'lighter';
      if (flash > 0.004) {
        glow(ctx, ex, ey, ref(210), [
          [0, `rgba(255,255,255,${(intensity * flash).toFixed(3)})`],
          [0.22, `rgba(255,244,214,${(0.75 * intensity * flash).toFixed(3)})`],
          [0.6, `rgba(255,170,80,${(0.25 * intensity * flash).toFixed(3)})`],
          [1, 'rgba(255,120,40,0)'],
        ]);
        ctx.fillStyle = `rgba(255,250,240,${(0.5 * intensity * flash).toFixed(3)})`;
        fillPlanet(S);
      }
      if (e >= 0.9) {
        const ember = (0.55 + 0.45 * Math.exp(-(e - 0.9) / 2.5)) * intensity;
        glow(ctx, ex, ey, ref(22), [
          [0, `rgba(255,236,190,${(0.9 * ember).toFixed(3)})`],
          [0.35, hexAlpha(crisis.color, 0.6 * ember)],
          [1, hexAlpha(crisis.color, 0)],
        ]);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  } else if (mechanism === 'volcanism') {
    const e = elapsed == null ? 99 : elapsed;
    const spread = elapsed == null ? 1 : smoothstep(0.2, 5, e);
    // warm ash veil over the whole planet, thickest around the province
    ctx.fillStyle = `rgba(58,30,18,${(0.13 * intensity * spread).toFixed(3)})`;
    fillPlanet(S);
    if (crisis.epi) {
      const r = ref(150 + 330 * spread);
      glow(ctx, ex, ey, r, [
        [0, `rgba(52,26,16,${(0.5 * intensity).toFixed(3)})`],
        [0.45, `rgba(56,28,18,${(0.26 * intensity * spread).toFixed(3)})`],
        [1, 'rgba(60,30,20,0)'],
      ]);
      // a province, not a point: vents scattered over a few hundred kilometres flare in turn
      ctx.globalCompositeOperation = 'lighter';
      const cosLat = Math.max(0.25, Math.cos(crisis.epi.lat * D2R));
      for (const [dLon, dLat, size, phase] of VENTS) {
        P.fwd(crisis.epi.lon + dLon / cosLat, clamp(crisis.epi.lat + dLat, -89, 89));
        const beat = elapsed == null ? 0.7 : 0.5 + 0.5 * Math.sin(e * (1.6 + size) + phase);
        const vr = ref(16 + 20 * size) * (0.8 + 0.3 * beat);
        glow(ctx, PX, PY, vr, [
          [0, `rgba(255,226,170,${(0.75 * intensity * beat).toFixed(3)})`],
          [0.25, `rgba(255,128,40,${(0.5 * intensity * beat).toFixed(3)})`],
          [1, 'rgba(200,50,10,0)'],
        ]);
      }
      const beat = elapsed == null ? 0.75 : 0.62 + 0.38 * Math.sin(e * 2.3);
      glow(ctx, ex, ey, ref(84), [
        [0, `rgba(255,224,160,${(0.7 * intensity * beat).toFixed(3)})`],
        [0.2, `rgba(255,132,44,${(0.5 * intensity * beat).toFixed(3)})`],
        [0.55, hexAlpha(crisis.color, 0.24 * intensity)],
        [1, hexAlpha(crisis.color, 0)],
      ]);
      ctx.globalCompositeOperation = 'source-over';
    }
  } else if (mechanism === 'glaciation') {
    const beat = elapsed == null ? 0.6 : 0.5 + 0.5 * Math.sin(elapsed * 1.5 - 1.2);
    ctx.fillStyle = `rgba(176,214,255,${((0.05 + 0.06 * beat) * intensity).toFixed(3)})`;
    fillPlanet(S);
  } else if (mechanism === 'anoxia') {
    // the stains themselves are under the land (paintAnoxia); here only a sickly cast
    ctx.fillStyle = `rgba(40,10,48,${(0.1 * intensity).toFixed(3)})`;
    fillPlanet(S);
  }

  // Vignette in the event colour (map only — on a sphere it would paint bands at the poles).
  if (S.view.outline) {
    ctx.imageSmoothingQuality = SMOOTHING;
    ctx.globalAlpha = 0.62 * intensity;
    drawPlanetImage(S, tintedEdge(P, 'vignette', mixHex(crisis.color, '#120408', 0.3)), EDGE_MARGIN);
    ctx.globalAlpha = 1;
  }
}

/** The incoming bolide: drawn after the planet, unclipped — it arrives from space. */
function paintStreak(S) {
  const { ctx, P, crisis, k } = S;
  if (!crisis || crisis.mechanism !== 'impact' || !crisis.epi || crisis.elapsed == null) return;
  const e = crisis.elapsed;
  if (e >= 1.05) return;
  P.fwd(crisis.epi.lon, crisis.epi.lat);
  const tx = S.cx + PX * k, ty = S.cy + PY * k;
  screenCTM(S);
  // Comes in steeply from above, from the side of the screen with more room, and enters from
  // just outside the edge, so the whole flight is on screen.
  const dx = tx < S.W / 2 ? 0.88 : -0.88, dy = -0.47;
  const room = Math.min(
    dx > 0 ? (S.W + 40 - tx) / dx : (tx + 40) / -dx,
    (ty + 40) / -dy,
  );
  const reach = clamp(room, 120, Math.max(S.W, S.H));
  const sx = tx + dx * reach, sy = ty + dy * reach;
  const p = clamp(e / 0.9, 0, 1);
  const head = Math.pow(p, 1.35);                               // slightly accelerating
  const hx = lerp(sx, tx, head), hy = lerp(sy, ty, head);
  const tail = Math.max(0, head - 0.34);
  const ax = lerp(sx, tx, tail), ay = lerp(sy, ty, tail);
  const fade = (e < 0.9 ? 1 : 1 - (e - 0.9) / 0.15) * crisis.intensity;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const g = ctx.createLinearGradient(ax, ay, hx, hy);
  g.addColorStop(0, 'rgba(255,120,40,0)');
  g.addColorStop(0.6, `rgba(255,170,80,${(0.55 * fade).toFixed(3)})`);
  g.addColorStop(1, `rgba(255,250,235,${fade.toFixed(3)})`);
  ctx.strokeStyle = g;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.lineWidth = 9;
  ctx.globalAlpha = 0.25;
  ctx.stroke();
  ctx.globalAlpha = 1;
  glow(ctx, hx, hy, 26, [
    [0, `rgba(255,255,255,${fade.toFixed(3)})`],
    [0.3, `rgba(255,220,160,${(0.6 * fade).toFixed(3)})`],
    [1, 'rgba(255,150,60,0)'],
  ]);
  ctx.globalCompositeOperation = 'source-over';
}

// ---- atmosphere ----------------------------------------------------------------------------

function paintTint(S) {
  const { ctx, look } = S;
  const a = look.atmosphere.tintAlpha;
  if (!(a > 0.004)) return;
  planetCTM(S);
  ctx.fillStyle = hexAlpha(look.atmosphere.tint, a);
  fillPlanet(S);
}

function paintLimb(S) {
  // Inner limb glow: the sky seen edge-on, a few percent of the planet's radius deep.
  const { ctx, P, look, crisis } = S;
  planetCTM(S);
  const rim = crisis ? mixHex(look.atmosphere.rim, crisis.color, 0.45 * crisis.intensity) : look.atmosphere.rim;
  const a = clamp(look.atmosphere.rimAlpha ?? 0.1, 0.03, 0.5);
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = SMOOTHING;
  ctx.globalAlpha = clamp(a * 2.6, 0, 1);
  drawPlanetImage(S, tintedEdge(P, 'glow', rim), EDGE_MARGIN);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// ---- place names ---------------------------------------------------------------------------

const HAS_LETTER_SPACING = typeof CanvasRenderingContext2D !== 'undefined'
  && 'letterSpacing' in CanvasRenderingContext2D.prototype;
const widths = new Map();

function textWidth(ctx, font, text, tracking) {
  const key = `${font}|${tracking}|${text}`;
  let w = widths.get(key);
  if (w == null) {
    ctx.font = font;
    if (HAS_LETTER_SPACING) {
      ctx.letterSpacing = `${tracking}px`;
      w = ctx.measureText(text).width - tracking;
      ctx.letterSpacing = '0px';
    } else {
      w = ctx.measureText(text).width + tracking * Math.max(0, text.length - 1);
    }
    if (widths.size > 4000) widths.clear();
    widths.set(key, w);
  }
  return w;
}

/** Centred text with letter-spacing, an optional halo, then the fill. */
function drawTracked(ctx, text, x, y, font, tracking, width, fill, halo, haloWidth) {
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  const left = x - width / 2;
  if (HAS_LETTER_SPACING) {
    ctx.letterSpacing = `${tracking}px`;
    if (halo) {
      ctx.strokeStyle = halo;
      ctx.lineWidth = haloWidth;
      ctx.strokeText(text, left, y);
    }
    ctx.fillStyle = fill;
    ctx.fillText(text, left, y);
    ctx.letterSpacing = '0px';
    return;
  }
  // Manual tracking for browsers without canvas letterSpacing.
  for (let pass = halo ? 0 : 1; pass < 2; pass++) {
    let cursor = left;
    for (const ch of text) {
      if (pass === 0) {
        ctx.strokeStyle = halo;
        ctx.lineWidth = haloWidth;
        ctx.strokeText(ch, cursor, y);
      } else {
        ctx.fillStyle = fill;
        ctx.fillText(ch, cursor, y);
      }
      cursor += ctx.measureText(ch).width + tracking;
    }
  }
}

/**
 * Land coverage under a screen point (CSS px), 0..255, read from the slightly blurred land mask of
 * this moment (one read-back of a small software canvas per moment, made on first use).
 */
function landCoverage(S, x, y) {
  const g = S.geometry;
  if (g.coverage === undefined) {
    g.coverage = null;
    if (g.groups.length) {
      const set = landMasks(S);
      const m = set.near;
      const data = m.c.getImageData(0, 0, m.width, m.height).data;
      const a = new Uint8Array(m.width * m.height);
      for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3];
      g.coverage = { a, w: m.width, h: m.height, s: (set.s * m.width) / set.w };
    }
  }
  const c = g.coverage;
  if (!c) return 0;
  const mx = Math.floor(((x - S.cx) / S.k + S.P.xMax + MASK_MARGIN) * c.s);
  const my = Math.floor(((y - S.cy) / S.k + S.P.yMax + MASK_MARGIN) * c.s);
  return mx >= 0 && my >= 0 && mx < c.w && my < c.h ? c.a[my * c.w + mx] : 0;
}

// Offsets (in label widths / heights) tried in turn when the anchor is taken.
const STAY = [[0, 0]];
const ROAM = [[0, 0], [0, -1.15], [0, 1.15], [0, -2.3], [0, 2.3], [-0.55, -1.15], [0.55, 1.15], [0.55, -1.15], [-0.55, 1.15], [0, -3.5], [0, 3.5]];

function paintPlaceNames(S) {
  const { ctx, frame, look, k, cx, cy, P, view } = S;
  const zoom = view.zoom || 1;
  const ice = S.ice;
  const candidates = [];
  const at = (lon, lat) => {
    P.fwd(lon, lat);
    return [cx + PX * k, cy + PY * k];
  };
  const small = S.W < 620;

  // oceans — italic serif, letter-spaced, pale
  const pale = mixHex(look.ocean.shallow, '#ffffff', 0.8);
  for (const o of paleo ? safeList(paleo.getOceanLabelsAt, frame.timeMa) : []) {
    const pos = o && o.name ? placeAt(o, frame.timeMa) : null;
    if (!pos) continue;
    const size = clamp(Math.round(o.size || 1), 1, 3);
    if (small && size === 1 && zoom < 1.5) continue;
    const opacity = clamp(o.opacity ?? 1, 0, 1);
    if (!(opacity > 0.02)) continue;
    const [x, y] = at(pos[0], pos[1]);
    const fontPx = [12, 14, 17][size - 1] - (small ? 1 : 0);
    const frozen = ice.alpha > 0.5 && (pos[1] > ice.seaN + 3 || pos[1] < ice.seaS - 3);
    candidates.push({
      text: o.name, x, y,
      font: `italic 400 ${fontPx}px ${FONTS.display}`, tracking: fontPx * 0.2, h: fontPx * 1.3,
      fill: frozen ? hexAlpha(mixHex(ice.lead, '#0b2233', 0.35), 0.7 * opacity) : hexAlpha(pale, (0.56 + 0.06 * size) * opacity),
      halo: frozen ? `rgba(255,255,255,${(0.34 * opacity).toFixed(3)})` : hexAlpha(look.ocean.abyss, 0.5 * opacity), haloWidth: 3,
      priority: size === 3 ? 100 : size === 2 ? 46 : 30,
      roam: true,
      sea: true,
    });
  }

  // land names: pale ink with a dark halo holds on rock, forest and desert alike; on ice the
  // ink turns dark
  const landInk = (lat, opacity) => {
    const onIce = ice.alpha > 0.5 && (lat > ice.landNBase + 2 || lat < ice.landSBase - 2);
    return onIce
      ? { fill: hexAlpha('#22303c', 0.72 * opacity), halo: `rgba(255,255,255,${(0.4 * opacity).toFixed(3)})` }
      : { fill: hexAlpha('#f7efdc', 0.86 * opacity), halo: `rgba(16,11,6,${(0.5 * opacity).toFixed(3)})` };
  };

  // assembled landmasses (supercontinents, paleocontinents)
  const taken = new Set();
  for (const l of paleo ? safeList(paleo.getLandLabelsAt, frame.timeMa) : []) {
    const pos = l && l.name ? placeAt(l, frame.timeMa) : null;
    if (!pos) continue;
    const size = clamp(Math.round(l.size || 2), 1, 3);
    const opacity = clamp(l.opacity ?? 1, 0, 1);
    if (!(opacity > 0.02)) continue;
    const [x, y] = at(pos[0], pos[1]);
    const fontPx = [12, 13, 15][size - 1];
    const ink = landInk(pos[1], opacity);
    taken.add(l.name.toLowerCase());
    if (l.id) taken.add(l.id);
    candidates.push({
      text: l.name.toUpperCase(), x, y,
      font: `600 ${fontPx}px ${FONTS.ui}`, tracking: fontPx * (0.16 + 0.06 * size), h: fontPx * 1.3,
      fill: ink.fill, halo: ink.halo, haloWidth: 3,
      sub: l.subtitle || null,
      priority: 78 + size * 6,
      roam: true,
    });
  }

  // continents — small caps, from each polygon's own name
  const byName = new Map();
  for (const n of S.geometry.names) {
    const prev = byName.get(n.name);
    if (!prev || n.rank > prev.rank) byName.set(n.name, n);
  }
  for (const n of byName.values()) {
    if (taken.has(n.name.toLowerCase()) || (n.id && taken.has(n.id))) continue;
    const reach = n.rank * zoom * (small ? 0.62 : 1);
    const opacity = smoothstep(10.5, 14.5, reach);
    if (!(opacity > 0.02)) continue;
    const [x, y] = at(n.lon, n.lat);
    const ink = landInk(n.lat, opacity * 0.92);
    candidates.push({
      text: n.name.toUpperCase(), x, y,
      font: `600 12px ${FONTS.ui}`, tracking: 1.7, h: 15.5,
      fill: ink.fill, halo: ink.halo, haloWidth: 3,
      priority: 58 + Math.min(20, n.rank / 3),
      roam: n.rank * zoom > 30,
    });
  }

  // features and boundary names
  for (const f of S.featureNames || []) {
    if (!f.text) continue;
    candidates.push({
      text: f.text, x: f.x, y: f.y,
      font: `${f.head ? 600 : 500} 12px ${FONTS.ui}`, tracking: 0.2, h: 15,
      fill: hexAlpha(f.warm ? '#ffe2b8' : '#f1ece1', 0.94 * (f.opacity ?? 1)),
      halo: `rgba(7,11,20,${(0.8 * (f.opacity ?? 1)).toFixed(3)})`, haloWidth: 3,
      priority: f.head ? 56 : 50,
    });
  }
  for (const b of S.boundaryNames || []) {
    candidates.push({
      text: b.text, x: b.x, y: b.y,
      font: `500 12px ${FONTS.ui}`, tracking: 0.2, h: 15,
      fill: hexAlpha(mixHex(b.color, '#ffffff', 0.55), 0.92), halo: 'rgba(7,11,20,0.8)', haloWidth: 3,
      priority: 40,
    });
  }

  // greedy placement by priority; whatever the caller listed in view.avoid is kept clear
  candidates.sort((a, b) => b.priority - a.priority);
  const boxes = [];
  const avoid = view.avoid || [];
  const hits = (x, y, w, h) => {
    for (const b of boxes) {
      if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return true;
    }
    for (const a of avoid) {
      if (a.r != null) {
        const nx = clamp(a.x, x, x + w), ny = clamp(a.y, y, y + h);
        if ((a.x - nx) ** 2 + (a.y - ny) ** 2 < a.r * a.r) return true;
      } else if (x < a.x + a.w && x + w > a.x && y < a.y + a.h && y + h > a.y) {
        return true;
      }
    }
    return false;
  };
  // names stay on the planet (map: inside the outline) …
  const inside = (x, y) => !view.outline || !!P.projection.invert((x - cx) / k, (cy - y) / k);
  const onPlanet = (bx, by, bw, bh) => inside(bx, by) && inside(bx + bw, by) && inside(bx, by + bh) && inside(bx + bw, by + bh);
  // … and sea names at sea: continents drift under fixed anchors
  const overLand = (bx, by, bw, bh) => {
    const cols = Math.max(2, Math.ceil(bw / 22));
    for (let i = 0; i <= cols; i++) {
      const x = bx + (bw * i) / cols;
      for (const f of [0.3, 0.7]) if (landCoverage(S, x, by + bh * f) > 110) return true;
    }
    return false;
  };
  screenCTM(S);
  const subFont = `italic 400 12px ${FONTS.display}`;
  for (const c of candidates) {
    const w = textWidth(ctx, c.font, c.text, c.tracking);
    if (c.x < -w || c.x > S.W + w || c.y < -40 || c.y > S.H + 40) continue;
    const padX = 7, padY = 3;
    const subW = c.sub ? textWidth(ctx, subFont, c.sub, 0.2) : 0;
    const bw = Math.max(w, subW) + padX * 2;
    const bh = c.h + padY * 2 + (c.sub ? 15 : 0);
    // the anchor first, then a few spots around it (area names have room to move)
    let placed = false;
    for (const [dx, dy] of c.roam ? ROAM : STAY) {
      const x = c.x + dx * bw, y = c.y + dy * bh;
      const bx = x - bw / 2, by = y - c.h / 2 - padY;
      if (bx < 2 || by < 2 || bx + bw > S.W - 2 || by + bh > S.H - 2) continue;   // never cut off
      if (hits(bx, by, bw, bh) || !onPlanet(bx, by, bw, bh)) continue;
      if (c.sea && overLand(bx + padX, by + padY, bw - 2 * padX, bh - 2 * padY)) continue;
      boxes.push({ x: bx, y: by, w: bw, h: bh });
      drawTracked(ctx, c.text, x, y, c.font, c.tracking, w, c.fill, c.halo, c.haloWidth);
      if (c.sub) drawTracked(ctx, c.sub, x, y + 15, subFont, 0.2, subW, c.fill, c.halo, 2.5);
      placed = true;
      break;
    }
    if (!placed) continue;
  }
  return boxes;
}

// =============================================================================================
// Public API
// =============================================================================================

const NO_BOXES = [];
const lastPaint = new Map();      // projection name → { timeMa, animatedFeatures }

/**
 * A signature of the picture paintPlanet would produce for this frame and view. While it stays
 * the same, the previous painting is still correct (reuse a cached bitmap / skip a texture
 * upload). Ambient motion is quantised: slow ice drift repaints four times a second, real-time
 * effects (crisis staging, magma, migrations under way) every frame, a still planet never.
 */
export function paintKey(frame, view) {
  const look = frame.look;
  const P = projectionInternals(view.projection || equalEarth);
  const layers = view.layers || {};
  const crisis = frame.crisis && frame.crisis.intensity > 0.003 ? frame.crisis : null;
  let motion = '';
  if (!frame.reducedMotion) {
    const last = lastPaint.get(P.name);
    if (crisis) motion = `c${frame.nowSec}`;
    else if (look.magma > 0.01) motion = `m${frame.nowSec}`;
    else if (last && last.timeMa === frame.timeMa && last.animatedFeatures) motion = `f${frame.nowSec}`;
    else if (look.ice && look.ice.alpha > 0.01) motion = `i${Math.floor(frame.nowSec * 4)}`;
  }
  let avoid = 0;
  if (view.avoid && layers.labels) {
    for (const a of view.avoid) avoid = (avoid * 31 + Math.round(a.x * 2) * 7 + Math.round(a.y * 2)) | 0;
  }
  return [
    frame.timeMa, P.name, view.scale, view.cx, view.cy, view.width, view.height, view.pixelRatio || 1,
    view.outline ? 1 : 0, view.zoom || 1,
    (layers.graticule ? 1 : 0) | (layers.labels ? 2 : 0) | (layers.features ? 4 : 0) | (layers.boundaries ? 8 : 0),
    frame.boundaries ? frame.boundaries.length : -1,
    crisis ? `${crisis.extinction.id}:${crisis.intensity.toFixed(3)}:${crisis.phase}` : '',
    frame.reducedMotion ? 'r' : '', motion, paleo ? 1 : 0, avoid,
  ].join('|');
}

/**
 * Paint the planet's surface for this frame.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} frame  the frame object (.polygons, .look, .timeMa, .nowSec, .crisis, .boundaries,
 *                        .reducedMotion, .playing, .jumped)
 * @param {object} view   see the header of this file
 * @returns {{ labelBoxes: Array<{x:number, y:number, w:number, h:number}>, animated: boolean }}
 *          labelBoxes: the place names drawn (CSS px); animated: the picture is in real-time motion
 */
export function paintPlanet(ctx, frame, view) {
  const projection = view.projection || equalEarth;
  const P = projectionInternals(projection);
  const layers = view.layers || {};
  const crisis = readCrisis(frame);
  const S = {
    ctx, frame, view, P,
    look: crisisLook(frame.look, crisis),
    crisis,
    k: view.scale,
    pr: view.pixelRatio || 1,
    cx: view.cx,
    cy: view.cy,
    W: view.width,
    H: view.height,
    motion: !frame.reducedMotion,
    t: frame.reducedMotion ? 0 : frame.nowSec || 0,
    labelsOn: view.outline ? !!layers.labels : layers.labels === true,
    geometry: null,
    ice: null,
    featureNames: null,
    boundaryNames: null,
    animatedFeatures: false,
  };
  S.geometry = buildGeometry(frame, P);
  S.ice = iceState(S);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.setLineDash([]);

  if (view.outline) {
    paintHalo(S);
    planetCTM(S);
    ctx.clip(P.outline);
  }
  paintOcean(S);
  paintMagma(S);
  if (layers.graticule) paintGraticule(S);
  paintShelf(S);
  paintAnoxia(S);
  paintSeaIce(S);
  paintLand(S);
  paintHotSpots(S);
  if (layers.boundaries) paintBoundaries(S);
  if (layers.features) paintFeatures(S);
  paintCrisis(S);
  paintTint(S);
  let labelBoxes = NO_BOXES;
  if (S.labelsOn) labelBoxes = paintPlaceNames(S);
  if (view.outline) paintLimb(S);
  ctx.restore();

  if (view.outline) {
    ctx.save();
    paintStreak(S);
    ctx.restore();
  }

  lastPaint.set(P.name, { timeMa: frame.timeMa, animatedFeatures: S.animatedFeatures });
  const animated = S.motion && (!!crisis || frame.look.magma > 0.01 || S.animatedFeatures);
  return { labelBoxes, animated };
}
