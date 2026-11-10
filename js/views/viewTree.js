// Tree-of-Life view — a radial, time-calibrated tree that grows outward as time plays.
// Implements the renderer interface: init(), render(polygons, timeMa, boundaries, atmo, frame),
// resize(), destroy(), onSpeciesHover(cb), onSpeciesClick(cb).
//
// HOW TO READ THE PICTURE
//   The centre is the formation of the Earth; radius is time on the app's warped screen-time axis
//   (engine/timeScale.js), so the outer rim is always "now" and the rim moves outward at a steady
//   pace during playback. Nothing beyond the now-ring is ever drawn. Every catalogue entry alive
//   at this moment ends in a glyph on the ring; entries that died out end where they died.
//
// LAYOUT (static, computed once at module load — see buildLayout)
//   data/phylogeny.js lists siblings in branching order, oldest split first, and each clade is a
//   lineage that leaves its parent's lineage at originMa. That is drawn as a proper time-tree:
//   along a clade's lineage its children (child clades and its own species) peel off one after
//   another at their own dates, and after every split the lineage carries on at the middle of the
//   tips that are still to come. Tips are spread evenly over a 330° fan in the pre-order of the
//   file, so related groups sit together and the fan ends with the line to humans. Because the
//   oldest branch always leaves from the outside of what remains, no two branches ever cross.
//
// CAMERA
//   The now-ring is framed, not the whole 4.5-billion-year disc: while the tree is small the view
//   is magnified and it eases back to the full disc as the tree grows (frameRadius). User pan and
//   zoom are applied on top of that.
//
// NAMES (placed a few times a second against an occupancy grid of branches, words and chrome)
//   1. the living, radially outside the now-ring, most abundant first (as many as fit);
//   2. the time axis: era/eon or period names, extinction rings and dates, in a column of their own;
//   3. landmark clades, near where their lineage starts or, failing that, across their own wedge;
//   4. the extinct ("† Stegosaurus"), outward from their seed-heads wherever room is left — mostly
//      once the viewer zooms in.
//   Names never run under the chrome that floats over the stage (context card, toasts, zoom HUD).
//   The map's Labels layer does not apply here (the toolbar disables it in this view).

import { FONTS, LIFE_GROUPS, getCategoryInfo } from '../config.js';
import { clades } from '../data/phylogeny.js';
import { species } from '../data/species.js';
import { extinctions } from '../data/extinctions.js';
import { getSegments, maToFraction } from '../engine/timeScale.js';
import { formatMa, formatDuration, formatRange } from '../util/format.js';
import { drawGlyph } from './glyphs.js';

// ---------------------------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------------------------

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// Canvas angles run clockwise from 3 o'clock, so 90° points straight down. The fan starts just
// left of the downward time axis and sweeps clockwise over the top; the 30° it leaves free is the
// axis wedge, most of it to the right of the axis where the ring labels are set.
const FAN_START = 99 * DEG;
const FAN_SWEEP = 330 * DEG;
const AXIS_ANGLE = 90 * DEG;
const GROUP_GAP = 0.6;           // extra tip slots between neighbouring life groups

// Auto-framing: on-screen radius of the now-ring as a share of the full radius (see frameRadius).
const FRAME_FLOOR = 0.42;
const FRAME_ONSET = 0.012;

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 14;
const ELBOW_PX = 4.5;            // fillet radius where a branch turns from its arc into its ray
const BORN_FADE = 0.0042;        // story fraction over which a new branch fades in (~1.5 s at 1×)
const DEATH_FADE = 0.0036;       // …and over which a dead branch dims
const HOVER_PX = 10;
const HOVER_PX_TOUCH = 20;
const STEM_HOVER_PX = 6;
const LABEL_PITCH_PX = 12.5;     // minimum distance between neighbouring rim labels
const LABEL_FONT_PX = 11.5;
const LAYOUT_INTERVAL_MS = 240;  // throttle for label placement
const BURST_SECONDS = 0.8;
const ARRIVAL_LABEL_SECONDS = 5;
const LABEL_FONT = `400 ${LABEL_FONT_PX}px ${FONTS.ui}`;
const LABEL_FONT_LEAD = `600 ${LABEL_FONT_PX}px ${FONTS.ui}`;
const EPITAPH_FONT = `400 11px ${FONTS.ui}`;
const EPITAPH_GAP = 4.5;         // from a seed-head to the start of its name
const TEXT_HALF = 6.25;          // half the height of a line of label text, for free-space tests
const NAME_FONT = `600 12.5px ${FONTS.display}`;
const CLADE_FONT = `italic 600 12.5px ${FONTS.display}`;
const SMALL_FONT = `600 11px ${FONTS.ui}`;
const NOW_FONT = `600 12px ${FONTS.ui}`;
// A clade name set inside its own wedge may cross this share of branch cells (behind a halo).
const WEDGE_MAX_COST = 0.34;

// Clades named on the tree itself when there is room, most important first. Ids that are not in
// data/phylogeny.js are skipped, so the list can run ahead of (or behind) the data.
const LANDMARK_CLADES = [
  'animals', 'eukaryotes', 'bacteria', 'archaea', 'vertebrates', 'land_plants', 'arthropods',
  'dinosaurs', 'mammaliaforms', 'tetrapods', 'fungi', 'flowering_plants', 'insects', 'birds',
  'molluscs', 'sauropsids', 'synapsids', 'primates', 'placentals', 'hominins', 'jawed_vertebrates',
  'seed_plants', 'archosaurs', 'theropods', 'echinoderms', 'cnidarians', 'great_apes', 'homo',
];

// Where an entry without a (known) clade is attached, by category.
const FALLBACK_CLADE = {
  bacteria: 'bacteria', prokaryote: 'bacteria', archaea: 'archaea', protist: 'eukaryotes',
  eukaryote: 'eukaryotes', alga: 'archaeplastida', plant: 'land_plants', fungus: 'fungi',
  invertebrate: 'animals', mollusk: 'molluscs', arthropod: 'arthropods', fish: 'vertebrates',
  amphibian: 'tetrapods', reptile: 'sauropsids', marine_reptile: 'sauropsids', dinosaur: 'dinosaurs',
  pterosaur: 'pterosaurs', bird: 'birds', synapsid: 'synapsids', mammal: 'mammaliaforms',
  primate: 'primates', hominin: 'hominins',
};

// Canvas colours; the token-backed ones are re-read from css/styles.css in init().
const THEME = {
  bg: '#070b14',
  text1: '#f1ece1',
  text2: '#b9c2d6',
  text3: '#8591ab',
  text4: '#5c6781',
  accent: '#f2b84b',
  accentStrong: '#ffd27a',
};

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

function hexRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [154, 163, 181];
}
function mixRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function rgbCss(c, alpha = 1) {
  const r = Math.round(c[0]);
  const g = Math.round(c[1]);
  const b = Math.round(c[2]);
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

/** On-screen radius of the now-ring (share of the full radius) for a story fraction 0..1. */
function frameRadius(f) {
  return FRAME_FLOOR * (1 - Math.exp(-f / FRAME_ONSET)) + (1 - FRAME_FLOOR) * f;
}
function autoScaleAt(f) {
  return f > 1e-5 ? frameRadius(f) / f : FRAME_FLOOR / FRAME_ONSET + (1 - FRAME_FLOOR);
}

// ---------------------------------------------------------------------------------------------
// Static layout
// ---------------------------------------------------------------------------------------------

const KIND_STEM = 0;   // a stretch of a clade's lineage between two splits
const KIND_TIP = 1;    // a catalogue entry

// Branch strokes per frame: [state (1 dead, 2 alive), highlighted?, line width, alpha].
const PASSES_PLAIN = [[1, 0, 1.0, 1], [2, 0, 1.45, 1]];
const PASSES_HIGHLIGHT = [[1, 0, 1.0, 0.3], [2, 0, 1.45, 0.3], [1, 1, 1.5, 1], [2, 1, 2.3, 1]];

/**
 * Build the drawing once: tips with their angles, and "branches" — each an optional arc at radius
 * f0 from the parent lineage's angle to its own angle, followed by a ray at its own angle from f0
 * to f1. Radii are story fractions (0 = formation of the Earth, 1 = today).
 */
function buildLayout() {
  const warnings = [];

  // ---- clade nodes ----
  const nodes = new Map();
  let root = null;
  for (const clade of clades) {
    // first/end: the node's own branches and everything below it are branches[first, end).
    const node = { clade, parent: null, kids: [], own: [], items: [], tipLo: -1, tipHi: -1, first: -1, end: -1 };
    nodes.set(clade.id, node);
    const parent = clade.parent == null ? null : nodes.get(clade.parent);
    if (parent) {
      node.parent = parent;
      parent.kids.push(node);
    } else if (!root) {
      root = node;
    } else {
      // A second root or a parent listed later than its child: keep it on the tree at the root.
      warnings.push(`clade "${clade.id}" has no known parent`);
      node.parent = root;
      root.kids.push(node);
    }
  }

  // ---- hang every catalogue entry on a clade ----
  const firstOfCategory = new Map();
  for (const clade of clades) if (!firstOfCategory.has(clade.category)) firstOfCategory.set(clade.category, clade.id);
  const strays = [];
  for (const sp of species) {
    let node = sp.clade ? nodes.get(sp.clade) : null;
    if (!node && root) {
      node = nodes.get(FALLBACK_CLADE[sp.category]) || nodes.get(firstOfCategory.get(sp.category)) || root;
      // Never start a tip before the lineage it hangs from exists.
      while (node.parent && sp.appearanceMa > node.clade.originMa) node = node.parent;
      strays.push(sp.id);
    }
    if (node) node.own.push(sp);
  }
  if (strays.length) warnings.push(`${strays.length} entries without a known clade were placed by category: ${strays.join(', ')}`);

  // ---- order the children of every clade and number the tips ----
  const tips = [];
  const lastClade = clades.length ? nodes.get(clades[clades.length - 1].id) : null;
  const hasTips = (node) => node.own.length > 0 || node.kids.some(hasTips);

  function arrange(node) {
    const kids = node.kids.filter(hasTips);
    const own = node.own.slice().sort((a, b) => (b.appearanceMa - a.appearanceMa)
      || ((a.extinctMa == null) - (b.extinctMa == null)) || (a.id < b.id ? -1 : 1));
    if (node === lastClade) {
      // The last clade of the file is the end of the line to humans: let its last living entry
      // close the fan. (It may be younger than what precedes it, never older, so nothing crosses.)
      for (let i = own.length - 1; i >= 0; i--) {
        if (own[i].extinctMa == null) {
          own.push(own.splice(i, 1)[0]);
          break;
        }
      }
    }
    // Children in branching order, oldest first. The last child clade stays last, so every
    // level ends with the line that carries on; entries younger than it sit just before it.
    const last = kids.length ? kids[kids.length - 1] : null;
    const lastMa = last ? last.clade.originMa : -Infinity;
    const early = kids.slice(0, -1).map((kid) => ({ node: kid, sp: null, ma: kid.clade.originMa }));
    const items = [];
    let k = 0;
    let placed = 0;
    for (const sp of own) {
      if (sp.appearanceMa < lastMa) break;
      while (k < early.length && early[k].ma > sp.appearanceMa) items.push(early[k++]);
      items.push({ node: null, sp, ma: sp.appearanceMa });
      placed++;
    }
    while (k < early.length) items.push(early[k++]);
    for (const sp of own.slice(placed)) items.push({ node: null, sp, ma: sp.appearanceMa });
    if (last) items.push({ node: last, sp: null, ma: lastMa });
    node.items = items;
    node.tipLo = tips.length;
    for (const it of items) {
      if (it.sp) {
        it.tip = tips.length;
        // On the rim a name drops its parenthesis: "Eukaryotes (complex cells)" → "Eukaryotes".
        const label = String(it.sp.name).replace(/\s*\([^)]*\)\s*$/, '') || String(it.sp.name);
        // Peak abundance ranks the extinct for a name at their seed-heads.
        const profile = Array.isArray(it.sp.abundanceProfile) ? it.sp.abundanceProfile : [];
        const peak = profile.reduce((m, p) => Math.max(m, Number(p && p[1]) || 0), 0);
        // The extinct are named with the dagger of natural-history convention: "† Stegosaurus".
        tips.push({ sp: it.sp, label, epitaph: `† ${label}`, index: tips.length, node, angle: 0, f0: 0, f1: Infinity, branch: -1, peak });
      } else {
        arrange(it.node);
      }
    }
    node.tipHi = tips.length - 1;
  }
  if (root && hasTips(root)) arrange(root);

  // ---- angles: even slots, a little air between life groups ----
  const groupOf = (sp) => getCategoryInfo(sp.category).group.id;
  let units = 0.5;
  const offsets = tips.map((tip, i) => {
    if (i > 0) units += 1 + (groupOf(tips[i - 1].sp) !== groupOf(tip.sp) ? GROUP_GAP : 0);
    return units;
  });
  units += 0.5;
  tips.forEach((tip, i) => { tip.angle = FAN_START + (offsets[i] / units) * FAN_SWEEP; });
  const slotAngle = FAN_SWEEP / Math.max(1, units);

  // ---- colours ----
  const palette = [];
  const paletteIndex = new Map();
  const colorOf = (category) => {
    let idx = paletteIndex.get(category);
    if (idx === undefined) {
      idx = palette.length;
      palette.push({ category, info: getCategoryInfo(category) });
      paletteIndex.set(category, idx);
    }
    return idx;
  };
  for (const group of LIFE_GROUPS) for (const cat of group.categories) colorOf(cat.id);

  // ---- branches ----
  const B = { kind: [], a0: [], a: [], f0: [], f1: [], parent: [], color: [], arcColor: [], ref: [] };
  const addBranch = (kind, ref, a0, a, f0, f1, parent, color, arcColor) => {
    B.kind.push(kind); B.ref.push(ref); B.a0.push(a0); B.a.push(a); B.f0.push(f0); B.f1.push(f1);
    B.parent.push(parent); B.color.push(color); B.arcColor.push(arcColor);
    return B.kind.length - 1;
  };
  const midAngle = (items, lo, hi) => {
    const first = items[lo].sp ? items[lo].tip : items[lo].node.tipLo;
    const last = items[hi].sp ? items[hi].tip : items[hi].node.tipHi;
    return (tips[first].angle + tips[last].angle) / 2;
  };
  const late = [];

  function emitItem(item, f, fromAngle, parent, arcColor) {
    if (item.sp) {
      const tip = tips[item.tip];
      tip.f0 = f;
      tip.f1 = item.sp.extinctMa == null ? Infinity : Math.max(f, maToFraction(item.sp.extinctMa));
      tip.branch = addBranch(KIND_TIP, tip, fromAngle, tip.angle, f, tip.f1, parent, colorOf(item.sp.category), arcColor);
    } else {
      emitClade(item.node, f, fromAngle, parent, arcColor);
    }
  }

  function emitClade(node, fStart, fromAngle, parent, arcColor) {
    const { items } = node;
    const color = colorOf(node.clade.category);
    let lo = 0;
    let hi = items.length - 1;
    let angle = midAngle(items, lo, hi);
    let stem = addBranch(KIND_STEM, node, fromAngle, angle, fStart, fStart, parent, color, arcColor);
    node.first = stem;
    let fPrev = fStart;
    const fractionOf = (item) => {
      const f = maToFraction(item.ma);
      if (f < fPrev - 1e-9) late.push(item.sp ? item.sp.id : item.node.clade.id);
      return Math.max(f, fPrev);
    };
    while (lo < hi) {
      // The older end leaves first; a tie leaves in file order.
      const fromLo = items[lo].ma >= items[hi].ma;
      const item = fromLo ? items[lo] : items[hi];
      const f = fractionOf(item);
      B.f1[stem] = f;
      if (fromLo) lo++; else hi--;
      emitItem(item, f, angle, stem, color);
      const next = midAngle(items, lo, hi);
      stem = addBranch(KIND_STEM, node, angle, next, f, f, stem, color, color);
      angle = next;
      fPrev = f;
    }
    const f = fractionOf(items[lo]);
    B.f1[stem] = f;
    emitItem(items[lo], f, angle, stem, color);
    node.end = B.kind.length;
  }

  if (tips.length) emitClade(root, maToFraction(root.clade.originMa), midAngle(root.items, 0, root.items.length - 1), -1, colorOf(root.clade.category));
  if (late.length) warnings.push(`${late.length} branches start before the lineage they hang from and were drawn from its start: ${late.join(', ')}`);

  // ---- typed arrays + derived data ----
  const n = B.kind.length;
  const out = {
    n,
    kind: Uint8Array.from(B.kind),
    a0: Float64Array.from(B.a0),
    a: Float64Array.from(B.a),
    f0: Float64Array.from(B.f0),
    f1: Float64Array.from(B.f1),
    parent: Int32Array.from(B.parent),
    color: Uint8Array.from(B.color),
    arcColor: Uint8Array.from(B.arcColor),
    ref: B.ref,
    cos: new Float64Array(n),
    sin: new Float64Array(n),
    cos0: new Float64Array(n),
    sin0: new Float64Array(n),
    hasArc: new Uint8Array(n),
    death: new Float64Array(n),     // fraction after which nothing on or beyond this branch is alive
  };
  for (let i = 0; i < n; i++) {
    out.cos[i] = Math.cos(out.a[i]);
    out.sin[i] = Math.sin(out.a[i]);
    out.cos0[i] = Math.cos(out.a0[i]);
    out.sin0[i] = Math.sin(out.a0[i]);
    out.hasArc[i] = Math.abs(out.a[i] - out.a0[i]) > 1e-7 ? 1 : 0;
    out.death[i] = out.f1[i];
  }
  // Parents are always emitted before their children, so one backward sweep settles it.
  for (let i = n - 1; i >= 0; i--) {
    const p = out.parent[i];
    if (p >= 0 && out.death[i] > out.death[p]) out.death[p] = out.death[i];
  }
  // Draw lists per colour (rays by own colour, arcs by the colour of the lineage they leave).
  const rays = palette.map(() => []);
  const arcs = palette.map(() => []);
  for (let i = 0; i < n; i++) {
    rays[out.color[i]].push(i);
    if (out.hasArc[i]) arcs[out.arcColor[i]].push(i);
  }

  const tipById = new Map(tips.map((tip) => [tip.sp.id, tip]));
  const landmarks = root && root.first >= 0 ? [root] : [];
  for (const id of LANDMARK_CLADES) {
    const node = nodes.get(id);
    if (node && node.first >= 0 && node !== root) landmarks.push(node);
  }
  // A landmark's "own" entries: runs of its tips that no more specific landmark names. A name set
  // inside the clade's wedge stays over these, so "Vertebrates" sits among the jawless fishes, not
  // among the dinosaurs that "Dinosaurs" already names.
  const within = (node, ancestor) => {
    for (let n = node.parent; n; n = n.parent) if (n === ancestor) return true;
    return false;
  };
  for (const node of landmarks) {
    const subs = landmarks.filter((other) => other !== node && within(other, node));
    const runs = [];
    let start = -1;
    for (let k = node.tipLo; k <= node.tipHi + 1; k++) {
      const own = k <= node.tipHi && !subs.some((sub) => k >= sub.tipLo && k <= sub.tipHi);
      if (own && start < 0) start = k;
      if (!own && start >= 0) {
        runs.push([start, k - 1]);
        start = -1;
      }
    }
    node.ownRuns = runs;
  }
  // Entries that die out, most prominent first: the order in which their names are offered.
  const mortal = tips.filter((tip) => Number.isFinite(tip.f1)).sort((p, q) => (q.peak - p.peak) || (p.index - q.index));

  return { nodes, root, tips, tipById, slotAngle, palette, branches: out, rays, arcs, landmarks, mortal, warnings };
}

const LAYOUT = buildLayout();

// Rings: periods grouped into eras (Phanerozoic) or eons (Precambrian) for the coarse labels.
const RINGS = (() => {
  const segments = getSegments();
  const groups = [];
  for (const seg of segments) {
    const p = seg.period;
    const name = p.eon === 'Phanerozoic' && p.era ? p.era : (p.eon || p.era || p.period);
    const prev = groups[groups.length - 1];
    if (prev && prev.name === name) {
      prev.f1 = seg.f1;
      prev.endMa = seg.endMa;
      prev.segments.push(seg);
    } else {
      groups.push({ name, f0: seg.f0, f1: seg.f1, startMa: seg.startMa, endMa: seg.endMa, segments: [seg] });
    }
  }
  const events = extinctions.map((ext) => ({
    ext,
    f: maToFraction(ext.timeMa),
    fStart: maToFraction(ext.timeMa + ext.durationMa / 2),
    fEnd: maToFraction(ext.timeMa - ext.durationMa / 2),
    label: String(ext.name || '').replace(/\s+extinction$/i, ''),
    rgb: hexRgb(ext.color),
  }));
  return { segments, groups, events };
})();

// ---------------------------------------------------------------------------------------------
// Occupancy grid — a coarse bitmap of where branches run and where words already sit, used to
// set labels in free space
// ---------------------------------------------------------------------------------------------

const CELL_BRANCH = 1;   // a line runs here: a name may cross it only behind a halo
const CELL_WORDS = 2;    // a name or a piece of chrome is here: nothing else may go on top

class Occupancy {
  constructor(cell = 4) {
    this.cell = cell;
    this.cols = 0;
    this.rows = 0;
    this.data = new Uint8Array(0);
  }

  reset(width, height) {
    const cols = Math.ceil(width / this.cell) + 1;
    const rows = Math.ceil(height / this.cell) + 1;
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols;
      this.rows = rows;
      this.data = new Uint8Array(cols * rows);
    } else {
      this.data.fill(0);
    }
  }

  mark(x, y, value = CELL_BRANCH) {
    const c = (x / this.cell) | 0;
    const r = (y / this.cell) | 0;
    if (x >= 0 && y >= 0 && c < this.cols && r < this.rows) {
      const k = r * this.cols + c;
      if (this.data[k] < value) this.data[k] = value;
    }
  }

  /** True when every point of a flat [x0, y0, x1, y1, …] list lies on the grid in an empty cell. */
  allFree(points) {
    for (let k = 0; k < points.length; k += 2) {
      const x = points[k];
      const y = points[k + 1];
      const c = (x / this.cell) | 0;
      const r = (y / this.cell) | 0;
      if (x < 0 || y < 0 || c >= this.cols || r >= this.rows || this.data[r * this.cols + c]) return false;
    }
    return true;
  }

  /** Share of the points that fall on a branch; Infinity if any leaves the grid or meets words. */
  cost(points) {
    let hits = 0;
    for (let k = 0; k < points.length; k += 2) {
      const x = points[k];
      const y = points[k + 1];
      const c = (x / this.cell) | 0;
      const r = (y / this.cell) | 0;
      if (x < 0 || y < 0 || c >= this.cols || r >= this.rows) return Infinity;
      const v = this.data[r * this.cols + c];
      if (v === CELL_WORDS) return Infinity;
      hits += v;
    }
    return points.length ? hits / (points.length / 2) : 0;
  }

  markAll(points, value = CELL_WORDS) {
    for (let k = 0; k < points.length; k += 2) this.mark(points[k], points[k + 1], value);
  }

  markRect(x0, y0, x1, y1) {
    const c0 = Math.max(0, Math.floor(x0 / this.cell));
    const c1 = Math.min(this.cols - 1, Math.floor(x1 / this.cell));
    const r0 = Math.max(0, Math.floor(y0 / this.cell));
    const r1 = Math.min(this.rows - 1, Math.floor(y1 / this.cell));
    // Off the grid entirely (fill() would read a negative end as counting from the array's end).
    if (c1 < c0 || r1 < r0) return;
    for (let r = r0; r <= r1; r++) this.data.fill(CELL_WORDS, r * this.cols + c0, r * this.cols + c1 + 1);
  }

  /** Number of occupied cells under a rectangle (Infinity when it leaves the grid). */
  count(x0, y0, x1, y1) {
    if (x0 < 0 || y0 < 0 || x1 > (this.cols - 1) * this.cell || y1 > (this.rows - 1) * this.cell) return Infinity;
    const c0 = (x0 / this.cell) | 0;
    const c1 = (x1 / this.cell) | 0;
    const r0 = (y0 / this.cell) | 0;
    const r1 = (y1 / this.cell) | 0;
    let hits = 0;
    for (let r = r0; r <= r1; r++) {
      const row = r * this.cols;
      for (let c = c0; c <= c1; c++) if (this.data[row + c]) hits++;
    }
    return hits;
  }
}

// ---------------------------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------------------------

export class ViewTree {
  constructor(container) {
    this.container = container;
    this.canvas = container.querySelector('#canvas-tree');
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.fitRadius = 100;

    // Camera: user zoom on top of the auto-framing, and the tree point (in units of the full
    // radius) that sits at the centre of the stage.
    this.zoom = 1;
    this.camX = 0;
    this.camY = 0;
    this._auto = null;            // eased auto-framing scale
    this._tween = null;           // { t0, ms, from: {zoom, camX, camY}, to: {...} }
    this._cam = { S: 1, ox: 0, oy: 0 };

    this._hoverCb = null;
    this._clickCb = null;
    this._pointers = new Map();
    this._drag = null;
    this._pinch = null;
    this._pointer = null;         // last mouse position over the canvas (canvas px), or null
    this._localHover = null;      // { tip } | { node } under the pointer (or last tapped)

    // Per-frame state.
    const { branches, tips } = LAYOUT;
    this._cls = new Uint8Array(branches.n);
    this._lit = new Uint8Array(branches.n);
    this._litKey = '';
    this._hasLit = false;
    this._abundance = new Float32Array(tips.length);
    this._aliveStamp = new Uint32Array(tips.length);
    this._stamp = 0;
    this._labelAlpha = new Float32Array(tips.length);
    this._labelTarget = new Uint8Array(tips.length);
    this._labelLead = new Uint8Array(tips.length);
    this._labelEpitaph = new Uint8Array(tips.length);  // 1: the name of the extinct, at its seed-head
    this._labelReach = new Float32Array(tips.length);  // how far a shown name extends beyond its tip (px)
    this._labelled = [];          // tip indices whose label is showing or fading
    this._arrivedAt = new Float64Array(tips.length).fill(-1e9);
    this._bursts = [];            // [{ tip, t0 }]
    this._axisLabels = [];
    this._cladeLabels = [];
    this._cladeSpot = new Map();  // clade id → last chosen candidate, for stable placement
    this._grid = new Occupancy(4);
    this._layoutAt = -1e9;
    this._layoutKey = '';
    this._layoutF = -1;
    this._layoutS = 0;
    this._settleAt = 0;
    this._lastSig = '';
    this._lastF = -1;
    this._reducedMotion = false;
    this._sprites = new Map();
    this._textWidths = new Map();
    this._runs = new Map();
    this._colors = null;
    this._ariaAt = -1e9;
    this._hudKey = null;
    this._warned = false;

    this._buildHud();
    // Chrome that floats over the stage: names on the tree make way for it rather than run under.
    this._chromeEls = [document.getElementById('context-card'), document.getElementById('milestone-overlay'), this.zoomBox];
    this._chrome = [];
    this._chromeAt = -1e9;
    this._toastBox = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onDblClick = this._onDblClick.bind(this);
  }

  onSpeciesHover(cb) { this._hoverCb = cb; }
  onSpeciesClick(cb) { this._clickCb = cb; }

  // ---- lifecycle -------------------------------------------------------------------------

  init() {
    this.ctx = this.canvas.getContext('2d');
    this._readTheme();
    this.canvas.style.display = 'block';
    this.hud.classList.remove('hidden');
    this.resize();

    const c = this.canvas;
    c.addEventListener('pointerdown', this._onPointerDown);
    c.addEventListener('pointermove', this._onPointerMove);
    c.addEventListener('pointerup', this._onPointerUp);
    c.addEventListener('pointercancel', this._onPointerUp);
    c.addEventListener('pointerleave', this._onPointerLeave);
    c.addEventListener('wheel', this._onWheel, { passive: false });
    c.addEventListener('dblclick', this._onDblClick);

    if (!this._warned) {
      this._warned = true;
      for (const message of LAYOUT.warnings) console.warn(`[tree] ${message}`);
    }
  }

  destroy() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this._onPointerDown);
    c.removeEventListener('pointermove', this._onPointerMove);
    c.removeEventListener('pointerup', this._onPointerUp);
    c.removeEventListener('pointercancel', this._onPointerUp);
    c.removeEventListener('pointerleave', this._onPointerLeave);
    c.removeEventListener('wheel', this._onWheel);
    c.removeEventListener('dblclick', this._onDblClick);
    c.style.display = 'none';
    c.style.cursor = '';
    this.hud.classList.add('hidden');
    this._pointers.clear();
    this._drag = null;
    this._pinch = null;
    this._pointer = null;
    this._localHover = null;
    this._setHud(null);
  }

  resize() {
    if (!this.ctx) return;
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (dpr !== this.dpr) {
      this.dpr = dpr;
      this._sprites.clear();
    }
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    // Leave room for the names set radially around the rim; phones give up most of it.
    const marginX = clamp(this.width * 0.17, 40, 132);
    const marginY = clamp(this.height * 0.15, 40, 104);
    this.fitRadius = Math.max(60, Math.min(this.width / 2 - marginX, this.height / 2 - marginY));
    this._lastSig = '';
    this._layoutAt = -1e9;
  }

  _readTheme() {
    const css = getComputedStyle(document.documentElement);
    const read = (name, fallback) => {
      const value = css.getPropertyValue(name).trim();
      return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
    };
    THEME.bg = read('--bg-0', THEME.bg);
    THEME.text1 = read('--text-1', THEME.text1);
    THEME.text2 = read('--text-2', THEME.text2);
    THEME.text3 = read('--text-3', THEME.text3);
    THEME.text4 = read('--text-4', THEME.text4);
    THEME.accent = read('--accent', THEME.accent);
    THEME.accentStrong = read('--accent-strong', THEME.accentStrong);

    const bg = hexRgb(THEME.bg);
    const ink = hexRgb(THEME.text1);
    const grey = hexRgb(THEME.text4);
    this._colors = LAYOUT.palette.map(({ info }) => {
      const base = hexRgb(info.color);
      const alive = mixRgb(base, ink, 0.14);
      // Dead wood: greyed, then sunk towards the backdrop.
      const dead = mixRgb(mixRgb(base, grey, 0.4), bg, 0.42);
      return {
        glyph: info.group.glyph,
        base,
        alive,
        dead,
        aliveCss: rgbCss(alive),
        deadCss: rgbCss(dead),
        baseCss: rgbCss(base),
        labelCss: rgbCss(mixRgb(base, ink, 0.62)),
      };
    });
    this._sprites.clear();
  }

  // ---- HUD (DOM) -------------------------------------------------------------------------

  _buildHud() {
    const el = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    };
    const icon = (paths) => {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.setAttribute('aria-hidden', 'true');
      for (const d of paths) {
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', d);
        svg.appendChild(path);
      }
      return svg;
    };

    this.hud = el('div', 'tree-hud hidden');

    // Lineage readout (top-left): what the highlighted branch is and how it connects to the root.
    this.hudLineage = el('div', 'tree-lineage glass hidden');
    this.hudKicker = el('div', 'kicker tree-lineage-kicker');
    this.hudTitle = el('div', 'display tree-lineage-title');
    this.hudSci = el('div', 'sci tree-lineage-sci');
    this.hudNote = el('div', 'tree-lineage-note');
    this.hudPath = el('div', 'tree-lineage-path');
    this.hudLineage.append(this.hudKicker, this.hudTitle, this.hudSci, this.hudNote, this.hudPath);

    // Zoom cluster (bottom-right).
    const zoomBox = el('div', 'tree-zoom glass');
    this.zoomBox = zoomBox;
    zoomBox.setAttribute('role', 'group');
    zoomBox.setAttribute('aria-label', 'Tree view zoom');
    const button = (label, paths, onClick) => {
      const b = el('button', 'tree-zoom-btn');
      b.type = 'button';
      b.title = label;
      b.setAttribute('aria-label', label);
      b.appendChild(icon(paths));
      b.addEventListener('click', onClick);
      zoomBox.appendChild(b);
      return b;
    };
    button('Zoom in', ['M8 3.5v9', 'M3.5 8h9'], () => this._zoomBy(1.6));
    button('Zoom out', ['M3.5 8h9'], () => this._zoomBy(1 / 1.6));
    this.resetBtn = button('Reset the view', ['M3.2 8a4.8 4.8 0 1 0 1.5-3.5', 'M3 2.8v2.6h2.6'], () => this.resetView());
    this.resetBtn.disabled = true;

    this.hud.append(this.hudLineage, zoomBox);
    this.container.appendChild(this.hud);
  }

  /** Show what is highlighted in the lineage readout: { tip } | { node } | null. */
  _setHud(target) {
    const key = target ? (target.tip ? `s:${target.tip.sp.id}` : `c:${target.node.clade.id}`) : null;
    if (key === this._hudKey) return;
    this._hudKey = key;
    if (!target) {
      this.hudLineage.classList.add('hidden');
      return;
    }
    const node = target.tip ? target.tip.node : target.node;
    const lineage = [];
    for (let n = node; n; n = n.parent) lineage.unshift(n.clade);

    // Each step keeps its arrow, and lines only break between steps.
    this.hudPath.textContent = '';
    const steps = target.tip ? lineage : lineage.slice(0, -1);
    steps.forEach((clade, i) => {
      const step = document.createElement('span');
      step.className = 'tree-lineage-step';
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'tree-lineage-sep';
        sep.textContent = '›';
        sep.setAttribute('aria-hidden', 'true');
        step.appendChild(sep);
      }
      step.appendChild(document.createTextNode(clade.name));
      this.hudPath.append(step, ' ');
    });
    const subject = target.tip ? target.tip.sp : node.clade;
    this.hudTitle.textContent = subject.name;
    this.hudSci.textContent = subject.scientificName && subject.scientificName !== subject.name ? subject.scientificName : '';
    if (target.tip) {
      this.hudKicker.textContent = subject.extinctMa == null ? 'Lineage · still living' : 'Lineage · extinct';
      this.hudNote.textContent = formatRange(subject);
    } else {
      this.hudKicker.textContent = `Branch · from ${formatMa(subject.originMa)}`;
      this.hudNote.textContent = subject.description || '';
    }
    this.hudPath.classList.toggle('hidden', steps.length === 0);
    this.hudLineage.classList.remove('hidden');
    this._placeHud();
  }

  // ---- camera ----------------------------------------------------------------------------

  /** Ease the auto-framing and any zoom tween, then derive the screen mapping for this frame. */
  _updateCamera(fNow, dt, instant) {
    const target = autoScaleAt(fNow);
    if (this._auto == null || instant) this._auto = target;
    // Eased geometrically (a jump from the deep past is a 30-fold zoom-out), so it feels even.
    else this._auto *= Math.pow(target / this._auto, Math.min(1, dt * 8));
    // Snap once the rim would move by less than a quarter pixel: the ease's long tail would
    // otherwise keep re-placing the names for a second or more after a jump.
    if (Math.abs(this._auto - target) * this.fitRadius * this.zoom * Math.max(fNow, 1e-3) < 0.25) this._auto = target;

    if (this._tween) {
      const t = instant ? 1 : clamp((performance.now() - this._tween.t0) / this._tween.ms, 0, 1);
      const e = smooth(t);
      const { from, to } = this._tween;
      // Zoom is eased geometrically so it feels even.
      this.zoom = from.zoom * Math.pow(to.zoom / from.zoom, e);
      this.camX = from.camX + (to.camX - from.camX) * e;
      this.camY = from.camY + (to.camY - from.camY) * e;
      if (t >= 1) this._tween = null;
    }

    this._syncCamera();
    const moved = this.zoom !== 1 || this.camX !== 0 || this.camY !== 0;
    if (this.resetBtn.disabled === moved) this.resetBtn.disabled = !moved;
  }

  /** Derive the screen mapping (pixels per tree unit, and where the centre falls) from the camera. */
  _syncCamera() {
    const S = this.fitRadius * (this._auto ?? 1) * this.zoom;
    this._cam.S = S;
    this._cam.ox = this.width / 2 - this.camX * S;
    this._cam.oy = this.height / 2 - this.camY * S;
  }

  _clampCamera() {
    const reach = Math.max(0.05, this._lastF) + 0.08;
    const d = Math.hypot(this.camX, this.camY);
    if (d > reach) {
      this.camX *= reach / d;
      this.camY *= reach / d;
    }
  }

  /** Zoom by a factor keeping the stage point (x, y) fixed. */
  _zoomAt(x, y, factor, animate = false) {
    const from = { zoom: this.zoom, camX: this.camX, camY: this.camY };
    const zoom = clamp(this.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    if (zoom === this.zoom) return;
    const S0 = this._cam.S;
    const S1 = S0 * (zoom / this.zoom);
    // Tree point under (x, y) before the zoom, kept under it afterwards.
    const tx = (x - this._cam.ox) / S0;
    const ty = (y - this._cam.oy) / S0;
    let camX = tx - (x - this.width / 2) / S1;
    let camY = ty - (y - this.height / 2) / S1;
    if (zoom <= 1) {
      // Zooming out past the fitted view settles back on the centre.
      const k = (zoom - MIN_ZOOM) / (1 - MIN_ZOOM);
      camX *= k;
      camY *= k;
    }
    const to = { zoom, camX, camY };
    if (animate && !this._reducedMotion) {
      this._tween = { t0: performance.now(), ms: 260, from, to };
    } else {
      this._tween = null;
      Object.assign(this, to);
      this._clampCamera();
      this._syncCamera();   // several wheel or pinch events can arrive between two frames
    }
    this._lastSig = '';
  }

  _zoomBy(factor) {
    this._zoomAt(this.width / 2, this.height / 2, factor, true);
  }

  resetView() {
    const to = { zoom: 1, camX: 0, camY: 0 };
    if (this._reducedMotion) {
      this._tween = null;
      Object.assign(this, to);
    } else {
      this._tween = { t0: performance.now(), ms: 320, from: { zoom: this.zoom, camX: this.camX, camY: this.camY }, to };
    }
    this._lastSig = '';
  }

  /** Stage position {x, y} (CSS px inside the stage) of an entry's tip right now, or null. */
  tipPosition(speciesId) {
    const tip = LAYOUT.tipById.get(speciesId);
    if (!tip || this._lastF < tip.f0) return null;
    const { S, ox, oy } = this._cam;
    const f = Math.min(this._lastF, tip.f1);
    return { x: ox + Math.cos(tip.angle) * f * S, y: oy + Math.sin(tip.angle) * f * S };
  }

  // ---- pointer input ---------------------------------------------------------------------

  _local(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = this._local(e);
    this._pointers.set(e.pointerId, p);
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* synthetic events have no capture */ }
    this._tween = null;
    if (this._pointers.size === 1) {
      this._drag = { x: p.x, y: p.y, startX: p.x, startY: p.y, moved: false, type: e.pointerType };
    } else if (this._pointers.size === 2) {
      const [a, b] = [...this._pointers.values()];
      this._pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (this._drag) this._drag.moved = true;
    }
  }

  _onPointerMove(e) {
    const p = this._local(e);
    if (this._pointers.has(e.pointerId)) {
      const prev = this._pointers.get(e.pointerId);
      this._pointers.set(e.pointerId, p);
      if (this._pointers.size >= 2 && this._pinch) {
        const [a, b] = [...this._pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        this.camX -= (mx - this._pinch.x) / this._cam.S;
        this.camY -= (my - this._pinch.y) / this._cam.S;
        this._syncCamera();
        this._zoomAt(mx, my, dist / this._pinch.dist);
        this._pinch = { dist, x: mx, y: my };
        this._lastSig = '';
        return;
      }
      if (this._drag) {
        const d = this._drag;
        if (!d.moved && Math.hypot(p.x - d.startX, p.y - d.startY) > (d.type === 'mouse' ? 3 : 8)) {
          d.moved = true;
          this.canvas.style.cursor = 'grabbing';
          this._setLocalHover(null);
        }
        if (d.moved) {
          this.camX -= (p.x - prev.x) / this._cam.S;
          this.camY -= (p.y - prev.y) / this._cam.S;
          this._clampCamera();
          this._syncCamera();
          this._lastSig = '';
        }
        return;
      }
    }
    if (e.pointerType === 'touch') return;
    this._pointer = { x: p.x, y: p.y, clientX: e.clientX, clientY: e.clientY };
    this._setLocalHover(this._hitTest(p.x, p.y, HOVER_PX), true);
  }

  _onPointerUp(e) {
    const had = this._pointers.delete(e.pointerId);
    try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    if (this._pointers.size < 2) this._pinch = null;
    const d = this._drag;
    if (this._pointers.size === 0) {
      this._drag = null;
      this.canvas.style.cursor = this._localHover && this._localHover.tip ? 'pointer' : '';
    }
    if (!had || !d || d.moved || e.type !== 'pointerup') return;
    // A press that did not travel is a click or tap: open the entry under it.
    const p = this._local(e);
    const touch = e.pointerType === 'touch';
    const hit = this._hitTest(p.x, p.y, touch ? HOVER_PX_TOUCH : HOVER_PX);
    // Touch has no hover: a tapped lineage stays highlighted (with its readout) until the next tap.
    if (touch) this._setLocalHover(hit && hit.node ? hit : null);
    if (hit && hit.tip && this._clickCb) this._clickCb(hit.tip.sp);
  }

  _onPointerLeave(e) {
    if (this._pointers.size || e.pointerType === 'touch') return;
    this._setLocalHover(null);
    this._pointer = null;
  }

  _onWheel(e) {
    e.preventDefault();
    const p = this._local(e);
    // deltaY only (a sideways swipe must not zoom); ctrlKey marks a trackpad pinch.
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.height : 1;
    const delta = clamp(e.deltaY * unit, -240, 240);
    this._zoomAt(p.x, p.y, Math.exp(-delta * (e.ctrlKey ? 0.012 : 0.0022)));
  }

  _onDblClick(e) {
    const p = this._local(e);
    if (this._hitTest(p.x, p.y, HOVER_PX)?.tip) return; // the clicks already opened that entry
    this._zoomAt(p.x, p.y, e.shiftKey ? 1 / 1.9 : 1.9, true);
  }

  /**
   * Record what is under the pointer ({ tip } | { node } | null) and tell the app about entries.
   * `pointerMoved` re-reports the same entry so the hover card can follow the pointer.
   */
  _setLocalHover(hit, pointerMoved = false) {
    const prev = this._localHover;
    const same = (hit && prev) ? (hit.tip === prev.tip && hit.node === prev.node) : hit === prev;
    this._localHover = hit;
    if (!this._drag || !this._drag.moved) this.canvas.style.cursor = hit && hit.tip ? 'pointer' : '';
    const sp = hit && hit.tip ? hit.tip.sp : null;
    const prevSp = prev && prev.tip ? prev.tip.sp : null;
    if (this._hoverCb && (sp !== prevSp || (sp && pointerMoved))) {
      this._hoverCb(sp, this._pointer ? this._pointer.clientX : 0, this._pointer ? this._pointer.clientY : 0);
    }
    if (!same) this._lastSig = '';
  }

  /** Nearest entry (within `reach` px) or, failing that, clade lineage under a stage point. */
  _hitTest(x, y, reach) {
    const { branches: B } = LAYOUT;
    const { S, ox, oy } = this._cam;
    const fNow = this._lastF;
    if (fNow <= 0) return null;
    const px = x - ox;
    const py = y - oy;
    const rho = Math.hypot(px, py);
    if (rho > fNow * S + reach + 200) return null;   // beyond the longest rim label
    // Unwrap the pointer angle onto the fan (the seam lies in the middle of the axis wedge).
    let phi = Math.atan2(py, px);
    const seam = FAN_START + FAN_SWEEP + (TAU - FAN_SWEEP) / 2 - TAU;
    while (phi < seam) phi += TAU;

    let bestTip = -1;
    let bestTipD = reach;
    let bestStem = -1;
    let bestStemD = Math.min(reach, STEM_HOVER_PX);
    for (let i = 0; i < B.n; i++) {
      if (B.f0[i] > fNow) continue;
      const r0 = B.f0[i] * S;
      let r1 = Math.min(B.f1[i], fNow) * S;
      // A name on show is part of its entry's target.
      if (B.kind[i] === KIND_TIP && this._labelTarget[B.ref[i].index]) r1 += this._labelReach[B.ref[i].index];
      // Ray.
      const t = clamp(px * B.cos[i] + py * B.sin[i], r0, r1);
      let d = Math.hypot(px - t * B.cos[i], py - t * B.sin[i]);
      // Arc.
      if (B.hasArc[i]) {
        const lo = Math.min(B.a0[i], B.a[i]);
        const hi = Math.max(B.a0[i], B.a[i]);
        let da;
        if (phi >= lo && phi <= hi) {
          da = Math.abs(rho - r0);
        } else {
          da = Math.min(
            Math.hypot(px - r0 * B.cos0[i], py - r0 * B.sin0[i]),
            Math.hypot(px - r0 * B.cos[i], py - r0 * B.sin[i]),
          );
        }
        if (da < d) d = da;
      }
      if (B.kind[i] === KIND_TIP) {
        if (d < bestTipD) { bestTipD = d; bestTip = i; }
      } else if (d < bestStemD) {
        bestStemD = d;
        bestStem = i;
      }
    }
    if (bestTip >= 0) return { tip: B.ref[bestTip], node: undefined };
    if (bestStem >= 0) return { tip: undefined, node: B.ref[bestStem] };
    return null;
  }

  // ---- frame -----------------------------------------------------------------------------

  render(polygons, timeMa, boundaries, atmo, frame) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!frame) {
      frame = { timeMa, fraction: maToFraction(timeMa), nowSec: performance.now() / 1000, dtSec: 0, alive: [], arrivals: [], departures: [], jumped: true };
    }
    const { tips, tipById } = LAYOUT;
    const fNow = clamp(Number.isFinite(frame.fraction) ? frame.fraction : maToFraction(timeMa), 0, 1);
    const now = frame.nowSec;
    const dt = Math.min(0.1, frame.dtSec || 0);
    const reduced = !!frame.reducedMotion;
    this._reducedMotion = reduced;
    const jumped = !!frame.jumped || this._lastF < 0;
    this._lastF = fNow;

    if (jumped) this._bursts.length = 0;

    this._updateCamera(fNow, dt, reduced || this._auto == null);
    const cam = this._cam;

    // Who is alive, and how prominent.
    const stamp = ++this._stamp;
    for (const sp of frame.alive) {
      const tip = tipById.get(sp.id);
      if (!tip) continue;
      this._aliveStamp[tip.index] = stamp;
      this._abundance[tip.index] = sp.currentAbundance || 0;
    }
    if (!jumped && !reduced) {
      for (const id of frame.arrivals) {
        const tip = tipById.get(id);
        if (!tip) continue;
        this._bursts.push({ tip, t0: now });
        this._arrivedAt[tip.index] = now;
      }
    }
    const burstsBefore = this._bursts.length;
    while (this._bursts.length && now - this._bursts[0].t0 > BURST_SECONDS) this._bursts.shift();
    // Something faded out this frame (see below): it must be painted once more, gone.
    let settled = this._bursts.length !== burstsBefore;

    // Pointer still, tree moving: keep the hover honest during playback.
    if (this._pointer && !this._drag && frame.playing) {
      this._setLocalHover(this._hitTest(this._pointer.x, this._pointer.y, HOVER_PX));
    }

    // What is highlighted: the branch under the pointer, else the entry hovered or opened elsewhere.
    let target = this._localHover;
    if (!target) {
      const tip = tipById.get(frame.hoverId) || tipById.get(frame.focusId);
      if (tip) target = { tip };
    }
    this._setHighlight(target);
    this._setHud(target);

    // Labels are placed a few times a second, not every frame. (The map's Labels layer does not
    // apply here: the toolbar disables that toggle in this view, so the tree always names itself.)
    const hoverTip = target && target.tip ? target.tip : null;
    const focusTip = tipById.get(frame.focusId) || null;
    const toast = this._chromeEls[1];
    const layoutKey = `${this.width}x${this.height}|${this.zoom.toFixed(4)}|${this.camX.toFixed(4)}|${this.camY.toFixed(4)}|${hoverTip ? hoverTip.index : -1}|${focusTip ? focusTip.index : -1}|${frame.atEnd ? 1 : 0}|${toast ? toast.classList.contains('hidden') : 1}`;
    const ms = now * 1000;
    // Interaction (pan, zoom, hover) re-places at once; growth and camera easing a few times a second.
    const drifted = ms - this._layoutAt > LAYOUT_INTERVAL_MS && (fNow !== this._layoutF || cam.S !== this._layoutS);
    // The chrome reacts to a jump after this view has drawn (components update later in the
    // frame), so a jump is placed once more a moment later.
    const settle = this._settleAt > 0 && ms >= this._settleAt;
    const rekeyed = layoutKey !== this._layoutKey;
    if (jumped || drifted || settle || rekeyed) {
      // Where the chrome sits only changes on a jump, a resize or a toast, so during playback it
      // is re-read (a forced layout) at most once a second.
      if (jumped || settle || rekeyed || ms - this._chromeAt > 1000) {
        this._chromeAt = ms;
        this._readChrome();
      }
      this._settleAt = jumped ? ms + 160 : 0;
      this._layoutKey = layoutKey;
      this._layoutAt = ms;
      this._layoutF = fNow;
      this._layoutS = cam.S;
      this._placeLabels(frame, fNow, cam, hoverTip, focusTip, stamp, now);
    }

    // Ease label opacity.
    let fading = false;
    const keep = [];
    for (const index of this._labelled) {
      const goal = this._labelTarget[index];
      const was = this._labelAlpha[index];
      let alpha = was;
      if (reduced || jumped) alpha = goal;
      else alpha += (goal - alpha) * Math.min(1, dt * 9);
      if (Math.abs(goal - alpha) < 0.03) alpha = goal;
      else fading = true;
      // The frame in which a name snaps to its goal still has to be painted: text at a sliver of
      // alpha composites far brighter than it should, so a skipped repaint leaves a ghost name.
      if (alpha !== was) settled = true;
      this._labelAlpha[index] = alpha;
      if (alpha > 0 || goal) keep.push(index);
    }
    this._labelled = keep;

    // The canvas's accessible summary: throttled during playback, prompt once the clock rests.
    if (ms - this._ariaAt > (frame.playing ? 1500 : 200)) {
      this._ariaAt = ms;
      let extinct = 0;
      for (const tip of tips) if (tip.f1 < fNow) extinct++;
      const living = frame.alive.length;
      const label = `Tree of life at ${formatMa(frame.timeMa)}: ${living} living ${living === 1 ? 'lineage' : 'lineages'}, ${extinct} extinct.`;
      if (this.canvas.getAttribute('aria-label') !== label) this.canvas.setAttribute('aria-label', label);
    }

    // Skip the repaint when nothing can have changed (paused, no pointer activity).
    const crisis = frame.crisis || null;
    const animating = fading || settled || this._bursts.length > 0 || this._tween != null
      || this._auto !== autoScaleAt(fNow) || (crisis && !reduced);
    const sig = `${fNow}|${cam.S}|${cam.ox}|${cam.oy}|${this._litKey}|${this._layoutAt}|${this.dpr}|${crisis ? crisis.extinction.id : ''}|${frame.atEnd ? 1 : 0}`;
    if (!animating && sig === this._lastSig) return;
    this._lastSig = sig;

    this._draw(ctx, frame, fNow, cam, { now, reduced, crisis, hoverTip, focusTip, stamp });
  }

  /** Mark the branches to emphasise: an entry's line back to the root, or a clade's whole bough. */
  _setHighlight(target) {
    const key = target ? (target.tip ? `s${target.tip.index}` : `c${target.node.first}`) : '';
    if (key === this._litKey) return;
    this._litKey = key;
    const { branches: B } = LAYOUT;
    this._lit.fill(0);
    this._hasLit = !!target;
    if (!target) return;
    let from;
    if (target.tip) {
      from = target.tip.branch;
    } else {
      from = target.node.first;
      for (let i = target.node.first; i < target.node.end; i++) this._lit[i] = 1;
    }
    for (let i = from; i >= 0; i = B.parent[i]) this._lit[i] = 1;
  }

  // ---- label placement (throttled) -------------------------------------------------------

  _textWidth(ctx, font, text) {
    const key = `${font}|${text}`;
    let w = this._textWidths.get(key);
    if (w === undefined) {
      ctx.font = font;
      w = ctx.measureText(text).width;
      this._textWidths.set(key, w);
    }
    return w;
  }

  /** Centre offset of every character of a string (plus its tracked width), for text on a curve. */
  _glyphRun(ctx, font, text, track = 0) {
    const key = `${font}|${track}|${text}`;
    let run = this._runs.get(key);
    if (!run) {
      ctx.font = font;
      const centres = [];
      let prev = 0;
      for (let k = 0; k < text.length; k++) {
        const upTo = ctx.measureText(text.slice(0, k + 1)).width;
        centres.push((prev + upTo) / 2 + k * track);
        prev = upTo;
      }
      run = { centres, width: prev + Math.max(0, text.length - 1) * track };
      this._runs.set(key, run);
    }
    return run;
  }

  /**
   * Text set along a circle of radius `radius` about the tree centre, centred on angle `theta`
   * (or ending there with align 'end'). It reads left to right on either half of the circle.
   */
  _arcText(ctx, cam, text, font, radius, theta, { fill, halo = null, haloWidth = 3, track = 0.4, align = 'center' } = {}) {
    const run = this._glyphRun(ctx, font, text, track);
    const dpr = this.dpr;
    const upper = Math.sin(theta) < 0;
    const dir = upper ? 1 : -1;                       // direction of reading, as a change of angle
    const start = align === 'end' ? theta - dir * (run.width / radius) : theta - dir * (run.width / 2 / radius);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let pass = halo ? 0 : 1; pass < 2; pass++) {
      for (let k = 0; k < text.length; k++) {
        const a = start + dir * (run.centres[k] / radius);
        const rot = a + dir * Math.PI / 2;
        const c = Math.cos(rot);
        const sn = Math.sin(rot);
        ctx.setTransform(dpr * c, dpr * sn, -dpr * sn, dpr * c, dpr * (cam.ox + Math.cos(a) * radius), dpr * (cam.oy + Math.sin(a) * radius));
        if (pass === 0) {
          ctx.strokeStyle = halo;
          ctx.lineWidth = haloWidth;
          ctx.strokeText(text[k], 0, 0);
        } else {
          ctx.fillStyle = fill;
          ctx.fillText(text[k], 0, 0);
        }
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _placeLabels(frame, fNow, cam, hoverTip, focusTip, stamp, now) {
    const ctx = this.ctx;
    const { tips, branches: B } = LAYOUT;
    const { S, ox, oy } = cam;
    const rim = fNow * S;
    const chrome = this._chrome;

    // ---- rim labels: the living, most prominent first ----
    const font = LABEL_FONT_LEAD;   // measure at the heavier weight so either weight fits
    const candidates = [];
    const sapiens = frame.atEnd ? LAYOUT.tipById.get('homo_sapiens') : null;
    for (const tip of tips) {
      const alive = this._aliveStamp[tip.index] === stamp;
      const forced = tip === hoverTip || tip === focusTip || tip === sapiens;
      if (!forced && !alive) continue;
      if (fNow < tip.f0) continue;
      let score = this._abundance[tip.index];
      if (this._labelTarget[tip.index]) score += 0.12;                           // stay put once shown
      if (now - this._arrivedAt[tip.index] < ARRIVAL_LABEL_SECONDS) score += 2;  // newcomers announce themselves
      if (forced) score += 100;
      candidates.push({ tip, score, forced });
    }
    candidates.sort((p, q) => q.score - p.score);
    const glyphR = this._glyphRadius(rim);
    const accepted = [];
    const fitted = this.zoom <= 1.001 && Math.hypot(this.camX, this.camY) * S < 2;
    const minGap = rim > 1 ? LABEL_PITCH_PX / (rim + glyphR + 6) : TAU;
    // The date on the now-ring (see _drawNowTag) keeps its place where the axis meets the ring;
    // on a small tree it is wider than the axis wedge and would collide with the first names.
    const tagText = frame.timeMa <= 0 ? 'Today' : formatMa(frame.timeMa);
    const tagHalf = (this._textWidth(ctx, NOW_FONT, tagText) / 2 + 4) / Math.max(rim + 14, 1) + minGap / 2;
    const offTag = (angle) => Math.abs(Math.atan2(Math.sin(angle - AXIS_ANGLE), Math.cos(angle - AXIS_ANGLE))) > tagHalf;
    for (const c of candidates) {
      const { tip } = c;
      const r = Math.min(fNow, tip.f1) * S + glyphR + 6;
      const w = this._textWidth(ctx, font, tip.label);
      const cos = Math.cos(tip.angle);
      const sin = Math.sin(tip.angle);
      const x0 = ox + cos * r;
      const y0 = oy + sin * r;
      const x1 = ox + cos * (r + w);
      const y1 = oy + sin * (r + w);
      if (!c.forced) {
        // In the fitted view a name must fit on the stage; once the user has zoomed or panned,
        // it only has to start on it (the rest is a drag away).
        const pad = 10;
        const inside = (x, y) => x >= pad && y >= pad && x <= this.width - pad && y <= this.height - pad;
        if (!inside(x0, y0) || (fitted && !inside(x1, y1))) continue;
        let clash = false;
        for (const other of accepted) {
          if (Math.abs(other.tip.angle - tip.angle) < minGap) { clash = true; break; }
        }
        if (clash || !offTag(tip.angle) || this._underChrome(chrome, x0, y0, cos, sin, w)) continue;
      }
      accepted.push(c);
    }
    this._labelTarget.fill(0);
    this._labelLead.fill(0);
    this._labelEpitaph.fill(0);
    accepted.forEach((c, rank) => {
      const { index } = c.tip;
      this._labelTarget[index] = 1;
      this._labelReach[index] = glyphR + 6 + this._textWidth(ctx, font, c.tip.label);
      this._labelLead[index] = c.forced || rank < 12 ? 1 : 0;
      if (!this._labelled.includes(index)) this._labelled.push(index);
    });

    // ---- where the branches and the chrome are (for words set inside the tree) ----
    const grid = this._grid;
    grid.reset(this.width, this.height);
    const step = grid.cell * 0.9;
    for (let i = 0; i < B.n; i++) {
      if (B.f0[i] > fNow) continue;
      const r0 = B.f0[i] * S;
      const r1 = Math.min(B.f1[i], fNow) * S;
      for (let r = r0; r <= r1; r += step) grid.mark(ox + B.cos[i] * r, oy + B.sin[i] * r);
      if (B.hasArc[i] && r0 > 0.5) {
        const lo = Math.min(B.a0[i], B.a[i]);
        const hi = Math.max(B.a0[i], B.a[i]);
        const da = step / r0;
        for (let a = lo; a <= hi; a += da) grid.mark(ox + Math.cos(a) * r0, oy + Math.sin(a) * r0);
      }
    }
    for (const box of chrome) grid.markRect(box.x0 - 4, box.y0 - 4, box.x1 + 4, box.y1 + 4);
    // The living on the rim, glyph and name, so that nothing set later runs into them.
    const pts = this._pts || (this._pts = []);
    for (const tip of tips) {
      if (this._aliveStamp[tip.index] !== stamp || tip.f0 > fNow) continue;
      const x = ox + Math.cos(tip.angle) * rim;
      const y = oy + Math.sin(tip.angle) * rim;
      grid.markRect(x - glyphR - 2, y - glyphR - 2, x + glyphR + 2, y + glyphR + 2);
    }
    for (const c of accepted) {
      const { tip } = c;
      const cos = Math.cos(tip.angle);
      const sin = Math.sin(tip.angle);
      const r0 = Math.min(fNow, tip.f1) * S + glyphR + 6;
      pts.length = 0;
      for (let u = 0; u <= this._labelReach[tip.index] - glyphR - 6; u += 3.5) {
        for (let d = -5; d <= 5; d += 5) pts.push(ox + cos * (r0 + u) - sin * d, oy + sin * (r0 + u) + cos * d);
      }
      grid.markAll(pts);
    }

    // In order of precedence: the time axis, the names of clades, then the extinct.
    this._axisLabels = this._placeAxisLabels(ctx, fNow, cam, grid);
    this._cladeLabels = this._placeCladeLabels(ctx, fNow, cam, grid);
    this._placeEpitaphs(ctx, fNow, cam, grid);
  }

  /** Rectangles (stage px) of the chrome now floating over the stage. */
  _readChrome() {
    const out = [];
    let stage = null;
    this._toastBox = null;
    for (const el of this._chromeEls) {
      if (!el || el.classList.contains('hidden')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      stage = stage || this.canvas.getBoundingClientRect();
      const box = { x0: r.left - stage.left, y0: r.top - stage.top, x1: r.right - stage.left, y1: r.bottom - stage.top };
      if (el === this._chromeEls[1]) this._toastBox = box;
      out.push(box);
    }
    this._chrome = out;
    this._placeHud();
    return out;
  }

  /** Keep the lineage readout clear of a milestone toast: both live at the top of the stage. */
  _placeHud() {
    const el = this.hudLineage;
    if (el.classList.contains('hidden')) return;
    const toast = this._toastBox;
    let top = '';
    if (toast) {
      const left = el.offsetLeft;
      const right = left + el.offsetWidth;
      if (toast.x0 < right + 6 && toast.x1 > left - 6) top = `${Math.round(toast.y1 + 8)}px`;
    }
    if (el.style.top !== top) el.style.top = top;
  }

  /** True when a radial name from (x, y) along (cos, sin), w px long, would run under the chrome. */
  _underChrome(chrome, x, y, cos, sin, w) {
    if (!chrome.length) return false;
    const pad = 4;
    for (let u = 0; u <= w + 4; u += 4) {
      for (let d = -5; d <= 5; d += 5) {
        const px = x + cos * Math.min(u, w) - sin * d;
        const py = y + sin * Math.min(u, w) + cos * d;
        for (const r of chrome) {
          if (px > r.x0 - pad && px < r.x1 + pad && py > r.y0 - pad && py < r.y1 + pad) return true;
        }
      }
    }
    return false;
  }

  /**
   * Names of the extinct, read outward from their seed-heads: offered most prominent first, and
   * set only where the tree leaves room. In the overview they stay inside the now-ring, which
   * belongs to the living; once the viewer zooms in, a name may run on through the ring where
   * no living tip or name stands (recent deaths sit close to it on the warped axis).
   */
  _placeEpitaphs(ctx, fNow, cam, grid) {
    const { S, ox, oy } = cam;
    const rim = fNow * S;
    const pad = 8;
    const beyond = this.zoom > 1.4;
    const pts = this._pts || (this._pts = []);
    for (const tip of LAYOUT.mortal) {
      if (tip.f1 >= fNow || tip.f0 > fNow || this._labelTarget[tip.index]) continue;
      const w = this._textWidth(ctx, EPITAPH_FONT, tip.epitaph);
      const r0 = tip.f1 * S + EPITAPH_GAP;
      if (!beyond && r0 + w > rim - 6) continue;
      const cos = Math.cos(tip.angle);
      const sin = Math.sin(tip.angle);
      const xa = ox + cos * r0;
      const ya = oy + sin * r0;
      const xb = ox + cos * (r0 + w);
      const yb = oy + sin * (r0 + w);
      if (Math.min(xa, xb) < pad || Math.min(ya, yb) < pad
        || Math.max(xa, xb) > this.width - pad || Math.max(ya, yb) > this.height - pad) continue;
      // Sampled from a little way out, so the entry's own seed-head does not count against it.
      pts.length = 0;
      for (let u = 3; u <= w + 1; u += 3.5) {
        for (let d = -4.5; d <= 4.5; d += 4.5) pts.push(ox + cos * (r0 + u) - sin * d, oy + sin * (r0 + u) + cos * d);
      }
      if (!grid.allFree(pts)) continue;
      grid.markAll(pts);
      this._labelTarget[tip.index] = 1;
      this._labelEpitaph[tip.index] = 1;
      this._labelReach[tip.index] = EPITAPH_GAP + w;
      if (!this._labelled.includes(tip.index)) this._labelled.push(tip.index);
    }
  }

  /** Ring names and dates, set as a column just right of the downward time axis. */
  _placeAxisLabels(ctx, fNow, cam, grid) {
    const { S, ox, oy } = cam;
    const out = [];
    const taken = [];   // [y0, y1] of accepted labels
    const x = ox + 7;
    const ink = hexRgb(THEME.text1);
    const rim = fNow * S;
    const tryPlace = (f, text, font, color, slack) => {
      const w = this._textWidth(ctx, font, text);
      for (const dy of slack) {
        const y = oy + f * S + dy;
        const y0 = y - TEXT_HALF;
        const y1 = y + TEXT_HALF;
        if (Math.hypot(x + w - ox, y1 - oy) > rim - 4) continue;   // stay inside the grown disc
        if (taken.some(([a, b]) => y0 + 0.5 < b && y1 - 0.5 > a)) continue;
        if (grid.count(x - 2, y0, x + w + 3, y1) > 0) continue;
        taken.push([y0, y1]);
        out.push({ f, dy, text, font, color, w });
        return true;
      }
      return false;
    };

    // 1. Mass extinctions that have happened: name and date, else the name, else just the date.
    for (const ev of RINGS.events) {
      if (ev.f > fNow) continue;
      const color = rgbCss(mixRgb(ev.rgb, ink, 0.38));
      const date = formatMa(ev.ext.timeMa);
      for (const text of [`${ev.label} · ${date}`, ev.label, date]) {
        if (tryPlace(ev.f, text, SMALL_FONT, color, [0, -3, 3, 5])) break;
      }
    }
    // 2. One level of names per era or eon: its periods if each has room, otherwise its own.
    for (const group of RINGS.groups) {
      if (group.f0 >= fNow) break;
      const fEnd = Math.min(group.f1, fNow);
      const begun = group.segments.filter((seg) => seg.f0 < fNow);
      const depthOf = (seg) => (Math.min(seg.f1, fNow) - seg.f0) * S;
      // The period still growing is excused: it gets its name once it is deep enough.
      const roomy = group.segments.length > 1 && begun.every((seg) => depthOf(seg) >= 16 || seg.f1 > fNow);
      if (roomy) {
        for (const seg of begun) {
          if (depthOf(seg) < 16) continue;
          tryPlace((seg.f0 + Math.min(seg.f1, fNow)) / 2, seg.period.label || seg.period.period, NAME_FONT, THEME.text2, [0, -3, 3]);
        }
      } else if ((fEnd - group.f0) * S >= 16) {
        // Anywhere in the band will do: start in the middle and work outwards (in small steps, so
        // the name still finds the gap between the extinction labels an era can hold).
        const slack = [0];
        for (let d = 2.5; d < (fEnd - group.f0) * S / 2 - 6; d += 2.5) slack.push(-d, d);
        tryPlace((group.f0 + fEnd) / 2, group.name, NAME_FONT, THEME.text2, slack);
      }
    }
    // 3. Dates: the formation of the Earth at the centre, then the era boundaries.
    tryPlace(0, formatMa(RINGS.segments[0].startMa), SMALL_FONT, THEME.text3, [0]);
    for (const group of RINGS.groups) {
      if (group.f0 <= 0 || group.f0 > fNow) continue;
      if (RINGS.events.some((ev) => ev.f <= fNow && Math.abs(ev.f - group.f0) * S < 9)) continue;
      tryPlace(group.f0, formatMa(group.startMa), SMALL_FONT, THEME.text3, [0]);
    }
    const lines = out.map((label) => ({ y: oy + label.f * S + label.dy, w: label.w })).sort((p, q) => p.y - q.y);
    lines.forEach((line, k) => {
      grid.markRect(x - 3, line.y - TEXT_HALF - 1, x + line.w + 4, line.y + TEXT_HALF + 1);
      // The gaps of the column belong to it too, and so do its ends (down to the now-ring), so a
      // clade's name is never read as a period's.
      const next = lines[k + 1];
      if (next) grid.markRect(ox - 3, line.y, x + Math.max(line.w, next.w) + 4, next.y);
      else grid.markRect(ox - 3, line.y, x + line.w + 4, oy + rim - 2);
    });
    if (lines.length) grid.markRect(ox - 3, oy + 6, x + lines[0].w + 4, lines[0].y);
    return out;
  }

  /**
   * Names of landmark clades. Each is tried, in order: curved along the arc that leads into the
   * clade, straight along the first stretch of its lineage, then floating beside the point where
   * the lineage starts. A name is only set where it covers no branch and no other label.
   */
  _placeCladeLabels(ctx, fNow, cam, grid) {
    const { S, ox, oy } = cam;
    const { branches: B } = LAYOUT;
    const out = [];
    // Fewer names on a small tree (phones), more as the user zooms in.
    const limit = Math.round(clamp((this.fitRadius * this.zoom) / 22, 3, LAYOUT.landmarks.length));
    const rim = fNow * S;
    const rows = [-4.5, 0, 4.5];
    const pts = [];

    // The branch whose arc leads into a clade and nowhere else (its own, or the last turn of the
    // parent lineage when the clade simply carries that lineage on).
    const arcInto = (node) => {
      let i = node.first;
      for (let hop = 0; hop < 3 && i >= 0; hop++) {
        if (B.hasArc[i]) return i;
        if (B.parent[i] !== i - 1) return -1;
        i = B.parent[i];
      }
      return -1;
    };

    for (const node of LAYOUT.landmarks) {
      if (out.length >= limit) break;
      const first = node.first;
      const f0 = B.f0[first];
      const isRoot = node === LAYOUT.root;
      // Only worth naming once the bough has grown a little.
      if ((fNow - f0) * S < (isRoot ? 3 : 14)) continue;
      const text = node.clade.name;
      const color = isRoot ? THEME.text1 : this._colors[B.color[first]].labelCss;
      const prev = this._cladeSpot.get(node.clade.id);
      let placed = null;

      // 1. Along the arc.
      const j = isRoot ? -1 : arcInto(node);
      if (j >= 0 && B.f0[j] <= fNow) {
        const run = this._glyphRun(ctx, CLADE_FONT, text, 0.4);
        const r0 = B.f0[j] * S;
        const span = Math.abs(B.a[j] - B.a0[j]);
        const toParent = B.a0[j] > B.a[j] ? 1 : -1;
        const inset = 6;
        const sides = prev && prev.type === 'arc' && prev.side < 0 ? [-1, 1] : [1, -1];
        for (const side of sides) {
          const rt = r0 + side * (TEXT_HALF + 4);
          // Not on tight circles (the letters would splay) and not beyond the now-ring.
          if (rt < 52 || run.width / rt > 1.5 || rt + TEXT_HALF > rim - 3) continue;
          const half = run.width / 2 / rt;
          // Start beside the clade's own end of the arc and slide towards the parent.
          for (let t = inset / r0 + half; t <= span - inset / r0 - half && !placed; t += 7 / r0) {
            const theta = B.a[j] + toParent * t;
            pts.length = 0;
            for (let u = -half; u <= half + 1e-9; u += 4 / rt) {
              const cos = Math.cos(theta + u);
              const sin = Math.sin(theta + u);
              for (const d of rows) pts.push(ox + cos * (rt + d), oy + sin * (rt + d));
            }
            if (grid.allFree(pts)) placed = { type: 'arc', node, text, color, branch: j, side, theta };
          }
          if (placed) break;
        }
      }

      // 2. Along the first stretch of the lineage.
      if (!placed && !isRoot) {
        const w = this._textWidth(ctx, CLADE_FONT, text);
        const r0 = f0 * S;
        const r1 = Math.min(B.f1[first], fNow) * S;
        const cos = B.cos[first];
        const sin = B.sin[first];
        for (const side of [1, -1]) {
          const off = side * (TEXT_HALF + 3.5);
          for (let rc = r0 + 7 + w / 2; rc + w / 2 <= r1 - 5 && !placed; rc += 8) {
            pts.length = 0;
            for (let u = -w / 2; u <= w / 2; u += 4) {
              for (const d of rows) {
                pts.push(ox + cos * (rc + u) - sin * (off + d), oy + sin * (rc + u) + cos * (off + d));
              }
            }
            if (grid.allFree(pts)) placed = { type: 'ray', node, text, color, along: rc - r0, off };
          }
          if (placed) break;
        }
      }

      // 3. Floating beside the starting point, tied to it by a hairline.
      if (!placed) {
        const w = this._textWidth(ctx, CLADE_FONT, text);
        const nx = ox + B.cos[first] * f0 * S;
        const ny = oy + B.sin[first] * f0 * S;
        const spots = prev && prev.type === 'float' ? [prev] : [];
        for (const dist of isRoot ? [9, 14, 20] : [10, 17, 26, 37]) {
          for (let k = 0; k < 12; k++) {
            const a = B.a[first] + Math.PI + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * (Math.PI / 6);
            spots.push({ dx: Math.cos(a) * dist, dy: Math.sin(a) * dist });
          }
        }
        for (const spot of spots) {
          // Anchor the box by the side that faces the node.
          const cx = nx + spot.dx + (spot.dx > 2 ? w / 2 : spot.dx < -2 ? -w / 2 : 0);
          const cy = ny + spot.dy + (spot.dy > 2 ? TEXT_HALF - 2 : spot.dy < -2 ? 2 - TEXT_HALF : 0);
          const x0 = cx - w / 2 - 3;
          const x1 = cx + w / 2 + 3;
          const y0 = cy - TEXT_HALF;
          const y1 = cy + TEXT_HALF;
          const far = Math.max(Math.hypot(x0 - ox, y0 - oy), Math.hypot(x1 - ox, y0 - oy), Math.hypot(x0 - ox, y1 - oy), Math.hypot(x1 - ox, y1 - oy));
          if (far > rim - 5 || grid.count(x0, y0, x1, y1) > 0) continue;
          grid.markRect(x0, y0, x1, y1);
          placed = { type: 'float', node, text, color, dx: spot.dx, dy: spot.dy, cx: cx - nx, cy: cy - ny, w };
          break;
        }
        // 4. Inside its own wedge, across its own branches.
        if (!placed && !isRoot) placed = this._placeWedgeLabel(ctx, node, text, color, fNow, cam, grid, prev);
      } else {
        grid.markAll(pts);
      }

      if (placed) {
        this._cladeSpot.set(node.clade.id, placed);
        out.push(placed);
      }
    }
    return out;
  }

  /**
   * A clade's name set along an arc over its own entries (see ownRuns in buildLayout), the way a
   * map names a region: it may cross branches (a halo knocks them out under the letters) but never
   * other words. Few crossings, a spot near the clade's base and near the middle of the run are
   * preferred, and a spot that still works is kept, so the name does not wander as the tree grows.
   */
  _placeWedgeLabel(ctx, node, text, color, fNow, cam, grid, prev) {
    const { S, ox, oy } = cam;
    const { tips, branches: B, slotAngle } = LAYOUT;
    const rim = fNow * S;
    const run = this._glyphRun(ctx, CLADE_FONT, text, 0.6);
    // A young clade is a thin band at the rim (the warped axis gives recent time little depth),
    // so its name may also sit just inside its base, under the fan it names.
    const rBase = B.f0[node.first] * S;
    const rStart = Math.max(rBase - 26, 56);
    const rEnd = rim - TEXT_HALF - 7;
    if (rEnd < rStart || !node.ownRuns) return null;
    const pts = this._pts || (this._pts = []);
    let best = null;
    let lo = 0;
    let hi = 0;
    // The whole wedge grown so far: the letters may spread over all of it, as long as the middle
    // of the name stays over the clade's own entries.
    let wlo = Infinity;
    let whi = -Infinity;
    for (let k = node.tipLo; k <= node.tipHi; k++) {
      if (tips[k].f0 > fNow) continue;
      wlo = Math.min(wlo, tips[k].angle - slotAngle / 2);
      whi = Math.max(whi, tips[k].angle + slotAngle / 2);
    }
    const consider = (rt, theta) => {
      const half = run.width / 2 / rt;
      if (run.width / rt > 1.1 || theta < lo || theta > hi || theta - half < wlo || theta + half > whi) return;
      pts.length = 0;
      for (let u = -half; u <= half + 1e-9; u += 3.5 / rt) {
        const c = Math.cos(theta + u);
        const s = Math.sin(theta + u);
        for (let d = -4.5; d <= 4.5; d += 4.5) pts.push(ox + c * (rt + d), oy + s * (rt + d));
      }
      const cost = grid.cost(pts);
      if (cost > WEDGE_MAX_COST) return;
      const mid = (lo + hi) / 2;
      const score = cost + 0.25 * Math.min(1, Math.abs(rt - rBase - 10) / 80)
        + 0.15 * Math.abs(theta - mid) / Math.max(1e-6, (hi - lo) / 2);
      if (!best || score < best.score) best = { score, rt, theta, pts: pts.slice() };
    };
    // The part of a run grown so far, with half a slot of air either side (false if none).
    const bounds = ([first, last]) => {
      lo = Infinity;
      hi = -Infinity;
      for (let k = first; k <= last; k++) {
        if (tips[k].f0 > fNow) continue;
        lo = Math.min(lo, tips[k].angle);
        hi = Math.max(hi, tips[k].angle);
      }
      lo -= slotAngle / 2;
      hi += slotAngle / 2;
      return hi > lo;
    };
    if (prev && prev.type === 'wedge' && prev.u * S >= rStart && prev.u * S <= rEnd) {
      const home = node.ownRuns.find((r) => bounds(r) && prev.theta >= lo && prev.theta <= hi);
      if (home) consider(prev.u * S, prev.theta);
    }
    if (!best) {
      for (const r of node.ownRuns) {
        if (!bounds(r)) continue;
        const mid = (lo + hi) / 2;
        for (let rt = rStart; rt <= rEnd; rt += 7) {
          if (run.width / rt > whi - wlo) continue;
          const dTheta = Math.min(12 / rt, (hi - lo) / 2);
          for (let k = 0; k <= (hi - lo) / dTheta; k++) consider(rt, mid + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * dTheta);
        }
      }
    }
    if (!best) return null;
    grid.markAll(best.pts);
    return { type: 'wedge', node, text, color, u: best.rt / S, theta: best.theta };
  }

  _glyphRadius(rim) {
    const pitch = LAYOUT.slotAngle * rim;
    return clamp(pitch * 0.5, 3, 5);
  }

  // ---- drawing ---------------------------------------------------------------------------

  _draw(ctx, frame, fNow, cam, opts) {
    const { now, reduced, crisis, hoverTip, focusTip, stamp } = opts;
    const { S, ox, oy } = cam;
    const { branches: B, tips, rays, arcs } = LAYOUT;
    const colors = this._colors;
    const dpr = this.dpr;
    const rim = fNow * S;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this._drawRings(ctx, fNow, cam, crisis, now, reduced);

    // ---- classify branches for this moment ----
    const cls = this._cls;
    const lit = this._lit;
    const dimOthers = this._hasLit;
    const shifting = [];
    for (let i = 0; i < B.n; i++) {
      if (B.f0[i] > fNow) { cls[i] = 0; continue; }
      const born = (fNow - B.f0[i]) / BORN_FADE;
      const dying = (fNow - B.death[i]) / DEATH_FADE;
      if (born < 1 || (dying > 0 && dying < 1)) {
        cls[i] = 3;
        shifting.push(i);
      } else {
        cls[i] = dying >= 1 ? 1 : 2;
      }
    }

    // ---- branches: dead wood, then the living, then whatever is highlighted ----
    const wide = this.zoom > 2.4 ? 0.3 : 0;
    for (const [want, wantLit, width, alpha] of dimOthers ? PASSES_HIGHLIGHT : PASSES_PLAIN) {
      ctx.lineWidth = width + wide;
      ctx.globalAlpha = alpha;
      for (let c = 0; c < colors.length; c++) {
        let any = false;
        ctx.beginPath();
        for (const i of rays[c]) {
          if (cls[i] !== want || (dimOthers && lit[i] !== wantLit)) continue;
          this._traceRay(ctx, i, S, ox, oy, fNow);
          any = true;
        }
        for (const i of arcs[c]) {
          if (cls[i] !== want || (dimOthers && lit[i] !== wantLit)) continue;
          this._traceArc(ctx, i, S, ox, oy, fNow);
          any = true;
        }
        if (!any) continue;
        ctx.strokeStyle = want === 1 ? colors[c].deadCss : colors[c].aliveCss;
        ctx.stroke();
      }
    }
    // Branches caught mid-change: fading in at birth, or dimming after their last tip died.
    for (const i of shifting) {
      const born = clamp((fNow - B.f0[i]) / BORN_FADE, 0, 1);
      const dying = smooth((fNow - B.death[i]) / DEATH_FADE);
      const isLit = !dimOthers || lit[i];
      ctx.globalAlpha = (0.15 + 0.85 * born) * (isLit ? 1 : 0.3);
      ctx.lineWidth = (isLit && dimOthers ? 2.3 : 1.45) - 0.45 * dying + wide;
      ctx.strokeStyle = rgbCss(mixRgb(colors[B.color[i]].alive, colors[B.color[i]].dead, dying));
      ctx.beginPath();
      this._traceRay(ctx, i, S, ox, oy, fNow);
      ctx.stroke();
      if (B.hasArc[i]) {
        ctx.strokeStyle = rgbCss(mixRgb(colors[B.arcColor[i]].alive, colors[B.arcColor[i]].dead, dying));
        ctx.beginPath();
        this._traceArc(ctx, i, S, ox, oy, fNow);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // ---- the lineages a mass extinction is ending ----
    if (crisis) this._drawVictims(ctx, crisis, fNow, cam, now, reduced);

    // ---- the centre: the formation of the Earth ----
    if (rim > 30) {
      ctx.fillStyle = THEME.text3;
      ctx.beginPath();
      ctx.arc(ox, oy, 1.6, 0, TAU);
      ctx.fill();
    }

    // ---- the root: the last universal common ancestor ----
    if (LAYOUT.root && LAYOUT.root.first >= 0 && B.f0[LAYOUT.root.first] <= fNow) {
      const i = LAYOUT.root.first;
      const x = ox + B.cos[i] * B.f0[i] * S;
      const y = oy + B.sin[i] * B.f0[i] * S;
      ctx.fillStyle = THEME.bg;
      ctx.strokeStyle = THEME.text1;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }

    // ---- seed-heads where entries died; growth points of lineages between named entries ----
    const glyphR = this._glyphRadius(rim);
    for (const tip of tips) {
      if (tip.f1 >= fNow || tip.f0 > fNow) continue;
      const i = tip.branch;
      const fresh = 1 - smooth((fNow - tip.f1) / (DEATH_FADE * 2.5));
      const x = ox + B.cos[i] * tip.f1 * S;
      const y = oy + B.sin[i] * tip.f1 * S;
      const col = colors[B.color[i]];
      ctx.globalAlpha = dimOthers && !lit[i] ? 0.3 : 1;
      ctx.fillStyle = rgbCss(mixRgb(col.dead, col.alive, 0.25 + 0.6 * fresh));
      ctx.beginPath();
      ctx.arc(x, y, 1.55 + fresh * 1.3, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < B.n; i++) {
      if (B.kind[i] !== KIND_STEM || B.f0[i] > fNow || B.f1[i] <= fNow) continue;
      ctx.globalAlpha = dimOthers && !lit[i] ? 0.3 : 0.95;
      ctx.fillStyle = colors[B.color[i]].aliveCss;
      ctx.beginPath();
      ctx.arc(ox + B.cos[i] * rim, oy + B.sin[i] * rim, 1.5, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ---- the now-ring, with a soft bloom outside it (a seed of light before it has opened) ----
    if (rim <= 0.5) {
      const accent = hexRgb(THEME.accent);
      ctx.fillStyle = rgbCss(accent, 0.18);
      ctx.beginPath(); ctx.arc(ox, oy, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = rgbCss(accent, 0.9);
      ctx.beginPath(); ctx.arc(ox, oy, 2, 0, TAU); ctx.fill();
    } else {
      const accent = hexRgb(THEME.accent);
      const glow = ctx.createRadialGradient(ox, oy, rim, ox, oy, rim + 34);
      glow.addColorStop(0, rgbCss(accent, 0.11));
      glow.addColorStop(0.4, rgbCss(accent, 0.035));
      glow.addColorStop(1, rgbCss(accent, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ox, oy, rim + 34, 0, TAU);
      ctx.moveTo(ox + rim, oy);
      ctx.arc(ox, oy, rim, 0, TAU, true);
      ctx.fill('evenodd');
      ctx.strokeStyle = rgbCss(accent, 0.07);
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(ox, oy, rim, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgbCss(accent, 0.16);
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(ox, oy, rim, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgbCss(accent, 0.85);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ox, oy, rim, 0, TAU); ctx.stroke();
    }

    // ---- living tips: halo, then the family glyph, turned to face outwards ----
    const us = frame.atEnd ? LAYOUT.tipById.get('homo_sapiens') : null;
    for (const tip of tips) {
      if (this._aliveStamp[tip.index] !== stamp || tip.f0 > fNow) continue;
      const i = tip.branch;
      const x = ox + B.cos[i] * rim;
      const y = oy + B.sin[i] * rim;
      if (x < -20 || y < -20 || x > this.width + 20 || y > this.height + 20) continue;
      const halo = this._halo(B.color[i]);
      const hr = glyphR * 3.4 * (0.75 + 0.5 * this._abundance[tip.index]);
      ctx.globalAlpha = dimOthers && !lit[i] ? 0.25 : 0.9;
      ctx.drawImage(halo, x - hr, y - hr, hr * 2, hr * 2);
    }
    for (const tip of tips) {
      if (this._aliveStamp[tip.index] !== stamp || tip.f0 > fNow) continue;
      const i = tip.branch;
      const x = ox + B.cos[i] * rim;
      const y = oy + B.sin[i] * rim;
      if (x < -20 || y < -20 || x > this.width + 20 || y > this.height + 20) continue;
      const col = colors[B.color[i]];
      const emphasised = tip === hoverTip || tip === focusTip;
      const here = tip === us;
      const r = glyphR * 1.12 * (0.86 + 0.3 * this._abundance[tip.index]) * (emphasised ? 1.35 : 1);
      ctx.globalAlpha = dimOthers && !lit[i] ? 0.35 : 1;
      // The family glyphs of views/glyphs.js (the legend's), turned so their "up" faces outward;
      // the outline in the backdrop colour keeps neighbours apart where they touch.
      const c = B.sin[i];
      const s = -B.cos[i];
      ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * x, dpr * y);
      drawGlyph(ctx, col.glyph, 0, 0, r, { fill: col.baseCss, stroke: THEME.bg, strokeWidth: 0.9 });
      if (emphasised || here) {
        ctx.strokeStyle = here && !emphasised ? THEME.accent : THEME.text1;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.2 + 2.6, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;

    // ---- blooms for the newly arrived ----
    for (const burst of this._bursts) {
      const t = (now - burst.t0) / BURST_SECONDS;
      if (t < 0 || t > 1) continue;
      const i = burst.tip.branch;
      const x = ox + B.cos[i] * rim;
      const y = oy + B.sin[i] * rim;
      const ease = 1 - (1 - t) * (1 - t);
      ctx.strokeStyle = rgbCss(mixRgb(colors[B.color[i]].base, hexRgb(THEME.text1), 0.45), (1 - t) * 0.95);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = B.a[i] + (k - 3) * 0.42;
        const r0 = glyphR + 2 + ease * 5;
        const r1 = r0 + 3 + ease * 6 * (1 - Math.abs(k - 3) / 6);
        ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
        ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      }
      ctx.stroke();
    }

    // ---- words ----
    this._drawAxisLabels(ctx, cam);
    this._drawCladeLabels(ctx, cam);
    this._drawRimLabels(ctx, fNow, cam, glyphR, hoverTip, focusTip, crisis);
    this._drawNowTag(ctx, frame, fNow, cam);
    this._drawCaption(ctx, frame, fNow, cam);
  }

  /** Path of a branch's ray from the end of its elbow to its tip (or to now). */
  _traceRay(ctx, i, S, ox, oy, fNow) {
    const B = LAYOUT.branches;
    const r0 = B.f0[i] * S;
    const r1 = Math.min(B.f1[i], fNow) * S;
    const cos = B.cos[i];
    const sin = B.sin[i];
    const rho = B.hasArc[i] ? this._elbow(i, r0, r1) : 0;
    if (rho > 0) {
      const a = B.a[i] + (B.a0[i] > B.a[i] ? rho / r0 : -rho / r0);
      ctx.moveTo(ox + Math.cos(a) * r0, oy + Math.sin(a) * r0);
      ctx.arcTo(ox + cos * r0, oy + sin * r0, ox + cos * (r0 + rho), oy + sin * (r0 + rho), rho);
    } else {
      ctx.moveTo(ox + cos * r0, oy + sin * r0);
    }
    ctx.lineTo(ox + cos * r1, oy + sin * r1);
  }

  /** Path of the arc that carries a branch from its parent lineage's angle to its own. */
  _traceArc(ctx, i, S, ox, oy, fNow) {
    const B = LAYOUT.branches;
    const r0 = B.f0[i] * S;
    if (r0 < 0.3) return;
    const r1 = Math.min(B.f1[i], fNow) * S;
    const rho = this._elbow(i, r0, r1);
    const back = B.a0[i] > B.a[i];
    const end = B.a[i] + (back ? rho / r0 : -rho / r0);
    ctx.moveTo(ox + B.cos0[i] * r0, oy + B.sin0[i] * r0);
    ctx.arc(ox, oy, r0, B.a0[i], end, back);
  }

  _elbow(i, r0, r1) {
    const B = LAYOUT.branches;
    const arcLen = Math.abs(B.a[i] - B.a0[i]) * r0;
    const rho = Math.min(ELBOW_PX, arcLen * 0.5, r1 - r0);
    return rho > 0.8 ? rho : 0;
  }

  _halo(colorIndex) {
    let sprite = this._sprites.get(colorIndex);
    if (!sprite) {
      const size = Math.round(48 * this.dpr);
      sprite = document.createElement('canvas');
      sprite.width = size;
      sprite.height = size;
      const g = sprite.getContext('2d');
      const c = mixRgb(this._colors[colorIndex].base, hexRgb(THEME.text1), 0.2);
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, rgbCss(c, 0.5));
      grad.addColorStop(0.3, rgbCss(c, 0.2));
      grad.addColorStop(1, rgbCss(c, 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      this._sprites.set(colorIndex, sprite);
    }
    return sprite;
  }

  _drawRings(ctx, fNow, cam, crisis, now, reduced) {
    const { S, ox, oy } = cam;
    const rim = fNow * S;
    if (rim <= 0.5) return;

    // Period bands: a breath of the period's colour, hairline boundaries.
    for (const seg of RINGS.segments) {
      if (seg.f0 >= fNow) break;
      const r0 = seg.f0 * S;
      const r1 = Math.min(seg.f1, fNow) * S;
      const rgb = hexRgb(seg.period.color);
      ctx.fillStyle = rgbCss(rgb, 0.085);
      ctx.beginPath();
      ctx.arc(ox, oy, r1, 0, TAU);
      if (r0 > 0.01) {
        ctx.moveTo(ox + r0, oy);
        ctx.arc(ox, oy, r0, 0, TAU, true);
      }
      ctx.fill('evenodd');
    }
    ctx.lineWidth = 1;
    for (const group of RINGS.groups) {
      for (const seg of group.segments) {
        if (seg.f0 <= 0 || seg.f0 >= fNow) continue;
        const eraEdge = seg === group.segments[0];
        ctx.strokeStyle = rgbCss(hexRgb(seg.period.color), eraEdge ? 0.26 : 0.1);
        ctx.beginPath();
        ctx.arc(ox, oy, seg.f0 * S, 0, TAU);
        ctx.stroke();
      }
    }

    // Mass-extinction rings, pulsing while the crisis is on screen.
    for (const ev of RINGS.events) {
      if (ev.f > fNow && !(crisis && crisis.extinction.id === ev.ext.id && ev.fStart <= fNow)) continue;
      const r = Math.min(ev.f, fNow) * S;
      const active = crisis && crisis.extinction.id === ev.ext.id;
      const hot = mixRgb(ev.rgb, hexRgb(THEME.text1), 0.2);
      if (active) {
        const k = crisis.intensity ?? 1;
        const pulse = reduced ? 0.6 : 0.5 + 0.5 * Math.sin(now * 5.2);
        ctx.strokeStyle = rgbCss(hot, 0.1 * k + 0.1 * k * pulse);
        ctx.lineWidth = 10 + 6 * pulse * k;
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = rgbCss(hot, 0.25 * k + 0.2 * k * pulse);
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, TAU); ctx.stroke();
      }
      ctx.strokeStyle = rgbCss(hot, active ? 0.95 : 0.55);
      ctx.lineWidth = active ? 1.4 : 1;
      ctx.setLineDash([2.5, 4.5]);
      ctx.beginPath(); ctx.arc(ox, oy, r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /** Flash the entries whose last appearance falls inside the active extinction window. */
  _drawVictims(ctx, crisis, fNow, cam, now, reduced) {
    const ev = RINGS.events.find((e) => e.ext.id === crisis.extinction.id);
    if (!ev) return;
    const { S, ox, oy } = cam;
    const { branches: B, tips } = LAYOUT;
    const k = crisis.intensity ?? 1;
    const pulse = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(now * 7.5);
    const hot = mixRgb(ev.rgb, hexRgb(THEME.text1), 0.45);
    ctx.strokeStyle = rgbCss(hot, clamp(k * pulse, 0, 1));
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    let any = false;
    for (const tip of tips) {
      if (tip.f0 > fNow || tip.f1 < ev.fStart - 1e-9 || tip.f1 > ev.fEnd + 1e-9) continue;
      this._traceRay(ctx, tip.branch, S, ox, oy, fNow);
      if (B.hasArc[tip.branch]) this._traceArc(ctx, tip.branch, S, ox, oy, fNow);
      any = true;
    }
    if (any) ctx.stroke();
  }

  _drawAxisLabels(ctx, cam) {
    const { S, ox, oy } = cam;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = rgbCss(hexRgb(THEME.bg), 0.85);
    ctx.lineWidth = 3;
    for (const label of this._axisLabels) {
      const x = ox + 7;
      const y = oy + label.f * S + label.dy;
      ctx.font = label.font;
      ctx.strokeText(label.text, x, y);
      ctx.fillStyle = label.color;
      ctx.fillText(label.text, x, y);
    }
  }

  _drawCladeLabels(ctx, cam) {
    const { S, ox, oy } = cam;
    const B = LAYOUT.branches;
    const dpr = this.dpr;
    const halo = rgbCss(hexRgb(THEME.bg), 0.9);
    for (const label of this._cladeLabels) {
      const i = label.node.first;
      ctx.globalAlpha = this._hasLit && !this._lit[i] ? 0.35 : 1;
      if (label.type === 'arc') {
        const radius = B.f0[label.branch] * S + label.side * (TEXT_HALF + 4);
        this._arcText(ctx, cam, label.text, CLADE_FONT, radius, label.theta, { fill: label.color, halo });
        continue;
      }
      if (label.type === 'wedge') {
        // Set across branches: a wider, opaque halo keeps the letters clean.
        this._arcText(ctx, cam, label.text, CLADE_FONT, label.u * S, label.theta,
          { fill: label.color, halo: THEME.bg, haloWidth: 4.5, track: 0.6 });
        continue;
      }
      ctx.font = CLADE_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = halo;
      ctx.lineWidth = 3;
      if (label.type === 'ray') {
        const r = B.f0[i] * S + label.along;
        const cos = B.cos[i];
        const sin = B.sin[i];
        const flip = cos < 0 ? -1 : 1;
        ctx.setTransform(dpr * cos * flip, dpr * sin * flip, -dpr * sin * flip, dpr * cos * flip,
          dpr * (ox + cos * r - sin * label.off), dpr * (oy + sin * r + cos * label.off));
        ctx.strokeText(label.text, 0, 0);
        ctx.fillStyle = label.color;
        ctx.fillText(label.text, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        continue;
      }
      const nx = ox + B.cos[i] * B.f0[i] * S;
      const ny = oy + B.sin[i] * B.f0[i] * S;
      const x = nx + label.cx;
      const y = ny + label.cy;
      // A hairline ties the name to the point where its lineage begins.
      const ex = clamp(nx, x - label.w / 2, x + label.w / 2);
      const ey = clamp(ny, y - TEXT_HALF + 1, y + TEXT_HALF - 1);
      if (Math.hypot(ex - nx, ey - ny) > 4) {
        ctx.strokeStyle = label.color;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha *= 0.6;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.globalAlpha /= 0.6;
        ctx.strokeStyle = halo;
        ctx.lineWidth = 3;
      }
      ctx.strokeText(label.text, x, y);
      ctx.fillStyle = label.color;
      ctx.fillText(label.text, x, y);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Names along the tips, never upside-down: the living outside the now-ring, the extinct (with
   * their dagger) outward from their seed-heads.
   */
  _drawRimLabels(ctx, fNow, cam, glyphR, hoverTip, focusTip, crisis) {
    const { S, ox, oy } = cam;
    const { tips } = LAYOUT;
    const dpr = this.dpr;
    const ev = crisis ? RINGS.events.find((e) => e.ext.id === crisis.extinction.id) : null;
    const doomed = ev ? rgbCss(mixRgb(hexRgb(THEME.text1), mixRgb(ev.rgb, hexRgb(THEME.text1), 0.3), clamp(crisis.intensity ?? 1, 0, 1))) : null;
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = rgbCss(hexRgb(THEME.bg), 0.9);
    ctx.lineWidth = 3;
    let font = '';
    for (const index of this._labelled) {
      const alpha = this._labelAlpha[index];
      if (alpha <= 0.01) continue;
      const tip = tips[index];
      const named = tip === hoverTip || tip === focusTip;
      const epitaph = this._labelEpitaph[index] === 1 && !named;
      const lead = !epitaph && (this._labelLead[index] || named);
      const r = epitaph
        ? tip.f1 * S + EPITAPH_GAP
        : Math.min(fNow, tip.f1) * S + glyphR + (named ? 9 : 6);
      const cos = Math.cos(tip.angle);
      const sin = Math.sin(tip.angle);
      const flip = cos < 0;
      const rot = flip ? tip.angle + Math.PI : tip.angle;
      const rc = Math.cos(rot);
      const rs = Math.sin(rot);
      ctx.setTransform(dpr * rc, dpr * rs, -dpr * rs, dpr * rc, dpr * (ox + cos * r), dpr * (oy + sin * r));
      ctx.textAlign = flip ? 'right' : 'left';
      const wanted = epitaph ? EPITAPH_FONT : lead ? LABEL_FONT_LEAD : LABEL_FONT;
      if (wanted !== font) {
        font = wanted;
        ctx.font = font;
      }
      const dimmed = this._hasLit && !this._lit[tip.branch];
      ctx.globalAlpha = alpha * (dimmed ? 0.4 : 1);
      const text = epitaph ? tip.epitaph : tip.label;
      // The name of an extinct entry sits inside the tree: give it a halo.
      if (tip.f1 < fNow) ctx.strokeText(text, 0, 0.5);
      // Names about to be lost take on the colour of the extinction.
      const victim = ev && tip.f1 >= ev.fStart - 1e-9 && tip.f1 <= ev.fEnd + 1e-9;
      ctx.fillStyle = victim ? doomed : epitaph ? THEME.text3 : lead ? THEME.text1 : THEME.text2;
      ctx.fillText(text, 0, 0.5);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
  }

  /**
   * The current date, set along the now-ring where the time axis meets it. At the very end it
   * becomes a sentence that runs up to the tip of our own species.
   */
  _drawNowTag(ctx, frame, fNow, cam) {
    const rim = fNow * cam.S;
    if (rim < 3 || cam.oy + rim + 12 > this.height + 14) return;
    const radius = rim + 14;
    const date = frame.timeMa <= 0 ? 'Today' : formatMa(frame.timeMa);
    const us = frame.atEnd ? LAYOUT.tipById.get('homo_sapiens') : null;
    if (us) {
      // The words have the axis wedge to themselves: from the first tip round to our own.
      const usAngle = us.angle - TAU;
      const room = (FAN_START - usAngle) * radius - 16;
      for (const words of [`${date} — you are here`, 'you are here']) {
        if (this._glyphRun(ctx, NOW_FONT, words, 0.4).width > room) continue;
        this._arcText(ctx, cam, words, NOW_FONT, radius, usAngle + 10 / radius, { fill: THEME.accent, align: 'end' });
        return;
      }
    }
    if (rim < 60) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = NOW_FONT;
      ctx.fillStyle = THEME.accent;
      ctx.fillText(date, cam.ox, cam.oy + radius + 1);
    } else {
      this._arcText(ctx, cam, date, NOW_FONT, radius, AXIS_ANGLE, { fill: THEME.accent });
    }
  }

  /** A quiet caption for the stretch before anything is alive. */
  _drawCaption(ctx, frame, fNow, cam) {
    if (frame.alive.length > 0) return;
    const { S, ox, oy } = cam;
    const rootMa = LAYOUT.root ? LAYOUT.root.clade.originMa : Infinity;
    const y = Math.max(oy + fNow * S + 46, oy + this.fitRadius * 0.34);
    if (y > this.height - 20) return;
    const age = Math.max(0, RINGS.segments[0].startMa - frame.timeMa);
    let title;
    let line;
    if (frame.timeMa > rootMa) {
      title = 'No life yet';
      line = age < 1 ? 'The Earth has only just formed' : `The Earth is ${formatDuration(age)} old`;
    } else {
      // Between the root (a molecular-clock date) and the first entry of the catalogue.
      title = 'Life\u2019s first branches';
      line = 'Known only from the genes of living cells — the oldest fossils are still to come';
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic 600 18px ${FONTS.display}`;
    ctx.fillStyle = THEME.text2;
    ctx.fillText(title, ox, y);
    ctx.font = `13px ${FONTS.ui}`;
    ctx.fillStyle = THEME.text3;
    ctx.fillText(line, ox, y + 24);
  }
}

/** The static layout, exported for data checks and tests (the app itself does not import it). */
export const TREE_LAYOUT = LAYOUT;
