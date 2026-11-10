#!/usr/bin/env node
// Data validator — checks every hand-curated data file for structural and cross-reference errors,
// for the canonical numbers all data files share, and for the authoring rules of the data briefs.
// No dependencies; run from anywhere:
//
//   node scripts/validate-data.mjs              # all checks; exit 1 if any ERROR
//   node scripts/validate-data.mjs --strict     # warnings count as errors too, and the optional
//                                               # modules (phylogeny, chapters, paleogeography,
//                                               # planetLook, the capture catalogue) must exist
//   node scripts/validate-data.mjs --only=species,phylogeny
//   node scripts/validate-data.mjs --quiet      # only print problems and the summary
//
// Sections: timeline, phylogeny, species, extinctions, milestones, chapters, curves,
//           geometry (continents + plate boundaries + paleogeography + marker placement),
//           capture (scripts/capture/sequences.js), imports (named imports between app modules).
// An unknown argument or section name is a usage error (exit 2).
//
//   ERROR  the app would break, or the data contradicts a contract or a canonical number
//   warn   a rule of the authoring briefs (text length, pacing, coverage) is not met
//   ·      information
// Modules are imported by the sections that need them, so a broken file fails only the checks
// that depend on it. A check that crashes on an unexpected shape is reported as an ERROR naming the
// entry (or the section) and everything else still runs.
//
// It validates shape and consistency, not scientific truth — see docs/data-sources.md for that.

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, relative, join } from 'node:path';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SELF = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SELF), '..');

// ------------------------------------------------------------------------------------------
// arguments
// ------------------------------------------------------------------------------------------
const SECTIONS = ['timeline', 'phylogeny', 'species', 'extinctions', 'milestones', 'chapters', 'curves', 'geometry', 'capture', 'imports'];
const USAGE = `Usage: node scripts/validate-data.mjs [--strict] [--quiet] [--only=section,section,…]
Sections: ${SECTIONS.join(', ')}`;
let STRICT = false;
let QUIET = false;
let ONLY = null;
{
  const problems = [];
  for (const a of process.argv.slice(2)) {
    if (a === '--strict') STRICT = true;
    else if (a === '--quiet') QUIET = true;
    else if (a === '--help' || a === '-h') { console.log(USAGE); process.exit(0); }
    else if (a.startsWith('--only=')) {
      const names = a.slice(7).split(',').map((s) => s.trim()).filter(Boolean);
      if (!names.length) problems.push(`"${a}" names no section`);
      for (const n of names) if (!SECTIONS.includes(n)) problems.push(`unknown section "${n}"`);
      ONLY = new Set([...(ONLY || []), ...names]);
    } else problems.push(`unknown argument "${a}"`);
  }
  if (problems.length) {
    console.error(`validate-data: ${problems.join('; ')}\n${USAGE}`);
    process.exit(2);
  }
}
const wants = (name) => !ONLY || ONLY.has(name);
const asked = (name) => !!ONLY && ONLY.has(name); // named explicitly → also print the long tables

// ------------------------------------------------------------------------------------------
// canonical numbers — fixed so that the data files agree with each other. Change them here and
// in the data together, never in one place only.
// ------------------------------------------------------------------------------------------
// Time scale: ICS International Chronostratigraphic Chart v2026/06 (the story starts at 4540 Ma,
// the age of the Earth; the ICS base of the Hadean is 4567). [row key, base in Ma]; every row
// ends where the next one starts, the last at 0.
const CANON_PERIODS = [
  ['Hadean', 4540], ['Eoarchean', 4031], ['Paleoarchean', 3600], ['Mesoarchean', 3200], ['Neoarchean', 2800],
  ['Paleoproterozoic', 2500], ['Mesoproterozoic', 1600], ['Tonian', 1000], ['Cryogenian', 720], ['Ediacaran', 635],
  ['Cambrian', 538.8], ['Ordovician', 486.85], ['Silurian', 443.1], ['Devonian', 419.62], ['Carboniferous', 358.86],
  ['Permian', 298.9], ['Triassic', 251.9], ['Jurassic', 201.4], ['Cretaceous', 143.1], ['Paleocene', 66],
  ['Eocene', 56], ['Oligocene', 33.9], ['Miocene', 23.04], ['Pliocene', 5.333], ['Early Pleistocene', 2.58],
  ['Middle Pleistocene', 0.774], ['Late Pleistocene', 0.129], ['Holocene', 0.0117],
];
// Title-card units (timeline.js ERAS): [id, kind, startMa, endMa].
const CANON_ERAS = [
  ['hadean', 'eon', 4540, 4031], ['archean', 'eon', 4031, 2500], ['proterozoic', 'eon', 2500, 538.8],
  ['paleozoic', 'era', 538.8, 251.9], ['mesozoic', 'era', 251.9, 66], ['cenozoic', 'era', 66, 0],
];
// The Big Five: a victim's extinctMa is EXACTLY its event's timeMa.
const CANON_EXTINCTIONS = { 'end-ordovician': 444.2, 'late-devonian': 372, 'end-permian': 251.9, 'end-triassic': 201.4, 'end-cretaceous': 66 };
// Life-group categories (config.js LIFE_GROUPS) and the plates that epicentres, milestone
// locations and paleogeography may anchor to (modern lon/lat carried back on the plate).
const CANON_CATEGORIES = ['bacteria', 'archaea', 'protist', 'alga', 'plant', 'fungus', 'invertebrate', 'mollusk', 'arthropod', 'fish',
  'amphibian', 'reptile', 'marine_reptile', 'dinosaur', 'pterosaur', 'bird', 'synapsid', 'mammal', 'primate', 'hominin'];
const PLATE_IDS = ['north_america', 'greenland', 'south_america', 'eurasia', 'japan', 'india', 'arabia', 'africa', 'madagascar', 'australia', 'new_zealand', 'antarctica'];
// Species era files are split by first appearance (an entry exactly on a split belongs to the younger file).
const ERA_FILES = [
  ['precambrian', 'precambrianSpecies', Infinity, 538.8],
  ['paleozoic', 'paleozoicSpecies', 538.8, 251.9],
  ['mesozoic', 'mesozoicSpecies', 251.9, 66],
  ['cenozoic', 'cenozoicSpecies', 66, -Infinity],
];

// Text-length limits of the authoring briefs, in characters. Longer is a warning.
const LIMITS = {
  speciesDescription: 70,
  speciesDescriptionLong: [250, 520], // "roughly": warned only beyond 10 % either side
  cladeName: 24,
  cladeDescription: 150,
  periodDescription: 60,
  periodContext: 120,
  abbr: 4,
  eraTagline: 70,
  extinctionDescription: 150,
  causeShort: 70,
  crisisDescription: 200,
  milestoneDescription: 240,
  chapterTitle: 32,
  chapterBlurb: 110,
};
// Pacing rules (seconds of 1× playback).
const PACE = {
  windowCrossSec: 1.45,   // a mass-extinction window takes ≥ ~1.5 s to cross after the slow-down
  milestoneGapSec: 1,     // no two milestones open within ~1 s of each other
  silenceSec: 20,         // never a stretch longer than ~20 s without a milestone or extinction
  milestoneMinSec: 0.4,   // shorter trigger windows are easy to miss
};
const MECHANISMS = ['glaciation', 'anoxia', 'volcanism', 'impact'];
const MILESTONE_CATEGORIES = ['cosmic', 'geological', 'climatic', 'biological', 'cultural', 'crisis'];
const HABITATS = ['marine', 'freshwater', 'land', 'aerial', 'amphibious'];
const VIEWS = ['map', 'globe', 'tree'];
const PANELS = ['clean', 'sidebar', 'clock', 'full'];
const SIDEBAR_TOP_N = 12; // rows of the sidebar's "dominant life" ranking (js/ui/sidebar.js)

// ------------------------------------------------------------------------------------------
// reporting
// ------------------------------------------------------------------------------------------
let errors = 0;
let warnings = 0;
let section = 'load';
const say = (label, msg) => console.log(`  ${label} [${section}] ${msg}`);
const err = (msg) => { errors++; say('ERROR ', msg); };
const warn = (msg) => { warnings++; say('warn  ', msg); };
const info = (msg) => { if (!QUIET) say('·     ', msg); };
function under(label, fn) {
  const prev = section;
  section = label;
  try { return fn(); } finally { section = prev; }
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const inRange = (v, lo, hi) => isNum(v) && v >= lo && v <= hi;
const coordOk = (lon, lat) => inRange(lon, -180, 180) && inRange(lat, -90, 90);
const tagOf = (x, i) => (isObj(x) && isStr(x.id) ? x.id : `#${i}`);
const fmtMa = (ma) => (!isNum(ma) ? String(ma) : ma >= 10 ? ma.toFixed(1).replace(/\.0$/, '') : String(Number(ma.toPrecision(3))));
const fmtExact = (ma) => (isNum(ma) ? String(Number(ma.toFixed(4))) : String(ma)); // window edges: 66.05, 65.95
const fmtVal = (v) => (typeof v === 'number' ? String(v) : v === undefined ? 'undefined' : JSON.stringify(v));
const sample = (items, n = 8) => (items.length <= n ? items.join(', ') : `${items.slice(0, n).join(', ')}, … (+${items.length - n})`);
const plural = (n, word) => `${n} ${n === 1 ? word : word.endsWith('y') ? `${word.slice(0, -1)}ies` : `${word}s`}`;
const win = (e) => [e.timeMa + e.durationMa / 2, e.timeMa - e.durationMa / 2];
const relPath = (abs) => relative(ROOT, abs) || abs;

function tooLong(tag, field, text, limit) {
  if (isStr(text) && text.length > limit) warn(`${tag}: ${field} is ${text.length} chars (keep ≤ ${limit})`);
}

/** "js/x.js:12" for the first stack frame inside the project (this script only as a fallback). */
function stackFrame(stack) {
  let self = null;
  for (const m of String(stack || '').matchAll(/(file:\/\/\/[^\s)]+?|\/[^\s():]+?\.m?js):(\d+)/g)) {
    let p = m[1];
    if (p.startsWith('file:')) { try { p = fileURLToPath(p); } catch { continue; } }
    if (!p.startsWith(`${ROOT}/`)) continue;
    if (p === SELF) { self ||= `${relPath(p)}:${m[2]}`; continue; }
    return `${relPath(p)}:${m[2]}`;
  }
  return self;
}
const describe = (e) => {
  const where = stackFrame(e && e.stack);
  return `${(e && e.name) || 'Error'}: ${e && e.message !== undefined ? e.message : String(e)}${where ? ` (at ${where})` : ''}`;
};

/** fn(entry, index, tag) for every entry; an entry that makes a check throw is reported, not fatal. */
function eachEntry(list, tagFn, fn) {
  list.forEach((item, i) => {
    let tag = `#${i}`;
    try {
      tag = tagFn(item, i);
      if (!isObj(item)) { err(`${tag}: entry is ${item === null ? 'null' : Array.isArray(item) ? 'an array' : typeof item}, not an object`); return; }
      fn(item, i, tag);
    } catch (e) { err(`${tag}: could not be checked — ${describe(e)}`); }
  });
}

/** Run one section; if it crashes, say so and carry on with the next. */
async function runSection(name, fn) {
  if (!wants(name)) return;
  section = name;
  try { await fn(); } catch (e) { err(`section stopped early — ${describe(e)}`); }
}

const KINDS = {
  function: [(v) => typeof v === 'function', 'a function'],
  array: [Array.isArray, 'an array'],
  map: [(v) => v instanceof Map, 'a Map'],
  object: [isObj, 'an object'],
};
/** ERROR for a missing or mistyped export the app relies on; warn for one promised but not there yet. */
function checkExports(mod, file, required, promised = {}) {
  let ok = true;
  for (const [name, kind] of Object.entries(required)) {
    if (!(name in mod)) { err(`${file}: missing export ${name}`); ok = false; }
    else if (!KINDS[kind][0](mod[name])) { err(`${file}: export ${name} must be ${KINDS[kind][1]}`); ok = false; }
  }
  for (const [name, kind] of Object.entries(promised)) {
    if (!(name in mod)) warn(`${file}: does not export ${name} yet (part of its documented API)`);
    else if (!KINDS[kind][0](mod[name])) err(`${file}: export ${name} must be ${KINDS[kind][1]}`);
  }
  return ok;
}

/** { plateId, lon, lat, name } with a canonical plate id. */
function checkPlace(tag, p) {
  if (!isObj(p)) { err(`${tag} must be { plateId, lon, lat, name }`); return; }
  if (!PLATE_IDS.includes(p.plateId)) err(`${tag}.plateId "${p.plateId}" is not a canonical plate id (${PLATE_IDS.join(', ')})`);
  if (!coordOk(p.lon, p.lat)) err(`${tag}: lon ${fmtVal(p.lon)} / lat ${fmtVal(p.lat)} out of range`);
  else if (p.lon === 0 && p.lat === 0) warn(`${tag}: coordinates are exactly 0, 0 — a placeholder?`);
  if (!isStr(p.name)) err(`${tag}: name missing`);
}

// ------------------------------------------------------------------------------------------
// module loading — lazy, cached, and explicit about which file is broken
// ------------------------------------------------------------------------------------------
const loaded = new Map();
const reportedCauses = new Set();

function load(rel, { optional = false } = {}) {
  if (!loaded.has(rel)) loaded.set(rel, importModule(rel, optional));
  return loaded.get(rel);
}

/**
 * Another owner's module, for a cross-check: null (and no message) if it is missing or broken —
 * its own section reports that — so one author's broken file never fails another's --only run.
 */
async function peek(rel) {
  if (loaded.has(rel)) return loaded.get(rel);
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) return null;
  try {
    const mod = await import(pathToFileURL(abs).href);
    loaded.set(rel, Promise.resolve(mod));
    return mod;
  } catch {
    return null; // not cached: a later load() imports it again and reports the failure
  }
}

async function importModule(rel, optional) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) {
    if (!optional) under('load', () => err(`${rel} is missing`));
    else if (STRICT) under('load', () => err(`${rel} is missing (optional until it lands; --strict requires it)`));
    else info(`${rel} is not there yet — the checks that need it are skipped`);
    return null;
  }
  try {
    return await import(pathToFileURL(abs).href);
  } catch (e) {
    const where = culprit(e, abs);
    const key = where || e.message;
    if (reportedCauses.has(key)) under('load', () => info(`${rel} is unavailable too (same cause)`));
    else {
      reportedCauses.add(key);
      under('load', () => err(`${rel} failed to import: ${e.message}${where ? ` (${where})` : ''}`));
    }
    return null;
  }
}

/** Where an import failure comes from: the stack when it has a location, else `node --check`. */
function culprit(e, abs) {
  const frame = stackFrame(e && e.stack);
  if (frame && !frame.startsWith('scripts/validate-data')) return frame;
  if (!(e instanceof SyntaxError)) return null;
  // A parse error in a dependency names no file: check the import graph file by file.
  const seen = new Set();
  const todo = [abs];
  while (todo.length) {
    const file = todo.shift();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 10000 });
    if (r.status !== 0) {
      const m = /^(\/.+?):(\d+)\s*$/m.exec(r.stderr || '');
      return m ? `${relPath(m[1])}:${m[2]}` : relPath(file);
    }
    for (const dep of parseModule(file).imports) if (dep.target) todo.push(dep.target);
  }
  return null;
}

// Static module parser (imports section, and finding the file behind a parse error). Handles the
// statement forms used in this code base: top-level import/export statements at column 0.
const parsedModules = new Map();
function parseModule(abs) {
  if (parsedModules.has(abs)) return parsedModules.get(abs);
  const out = { imports: [], exports: new Set(), reexports: [], all: null };
  parsedModules.set(abs, out);
  let src = '';
  try { src = readFileSync(abs, 'utf8'); } catch { return out; }
  const lineAt = (i) => src.slice(0, i).split('\n').length;
  const target = (spec) => (/^\.{1,2}\//.test(spec) ? resolve(dirname(abs), spec) : spec.startsWith('/') ? resolve(ROOT, `.${spec}`) : null);
  const names = (list) => list.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.split(/\s+as\s+/));
  for (const m of src.matchAll(/^import\s+([^'";]*?)\s*from\s*['"]([^'"]+)['"]/gm)) {
    const clause = m[1].trim();
    const braces = /\{([^}]*)\}/.exec(clause);
    const named = braces ? names(braces[1]).map((n) => n[0]) : [];
    if (/^[\w$]+/.test(clause)) named.push('default');
    out.imports.push({ spec: m[2], target: target(m[2]), names: named, line: lineAt(m.index) });
  }
  for (const m of src.matchAll(/^import\s*['"]([^'"]+)['"]/gm)) out.imports.push({ spec: m[1], target: target(m[1]), names: [], line: lineAt(m.index) });
  for (const m of src.matchAll(/^export\s*(\*(?:\s*as\s+([\w$]+))?|\{([^}]*)\})\s*from\s*['"]([^'"]+)['"]/gm)) {
    const pairs = m[3] !== undefined ? names(m[3]) : null;
    out.imports.push({ spec: m[4], target: target(m[4]), names: pairs ? pairs.map((n) => n[0]) : [], line: lineAt(m.index) });
    out.reexports.push({ target: target(m[4]), as: m[2] || null, names: pairs ? pairs.map((n) => n[n.length - 1]) : null });
  }
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\s*\*?|class|const|let|var)\s+([\w$]+)/gm)) out.exports.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}(?!\s*from)/gm)) for (const n of names(m[1])) out.exports.add(n[n.length - 1]);
  if (/^export\s+default\b/m.test(src)) out.exports.add('default');
  return out;
}
function exportsOf(abs, stack = new Set([abs])) {
  const mod = parseModule(abs);
  if (mod.all) return mod.all;
  const all = new Set(mod.exports);
  for (const r of mod.reexports) {
    if (r.names) for (const n of r.names) all.add(n);
    else if (r.as) all.add(r.as);
    else if (r.target && existsSync(r.target) && !stack.has(r.target)) {
      stack.add(r.target);
      for (const n of exportsOf(r.target, stack)) if (n !== 'default') all.add(n);
    }
  }
  mod.all = all;
  return all;
}

// ------------------------------------------------------------------------------------------
// config (everything depends on it)
// ------------------------------------------------------------------------------------------
const config = await load('js/config.js');
if (!config || !isObj(config.TIMING) || !isNum(config.TIMING.startTimeMa) || !Array.isArray(config.LIFE_GROUPS)) {
  if (config) err('js/config.js must export TIMING (with startTimeMa) and LIFE_GROUPS');
  console.log(`\n${plural(errors, 'error')}, ${plural(warnings, 'warning')}`);
  process.exit(1);
}
const { TIMING, LIFE_GROUPS, COLORS = {}, getCategoryInfo } = config;
const START = TIMING.startTimeMa;
const CATEGORY_IDS = new Set(LIFE_GROUPS.flatMap((g) => (isObj(g) && Array.isArray(g.categories) ? g.categories : []).map((c) => c && c.id)));
const groupOf = (category) => {
  if (typeof getCategoryInfo === 'function') return getCategoryInfo(category)?.group?.id;
  return LIFE_GROUPS.find((g) => isObj(g) && Array.isArray(g.categories) && g.categories.some((c) => c && c.id === category))?.id;
};

// ------------------------------------------------------------------------------------------
// timeline
// ------------------------------------------------------------------------------------------
async function checkTimeline() {
  const file = 'js/data/timeline.js';
  const mod = await load(file);
  if (!mod) return;
  checkExports(mod, file, { timeline: 'array', ERAS: 'array', getPeriodAtTime: 'function', getEraAtTime: 'function', getTemporalWeight: 'function' });
  const { timeline } = mod;
  if (!Array.isArray(timeline) || !timeline.length) { if (Array.isArray(timeline)) err('timeline is empty'); return; }
  const rowTag = (p, i) => (isObj(p) && isStr(p.period) ? p.period : `row ${i}`);
  const names = new Set();
  const abbrs = new Map();
  eachEntry(timeline, rowTag, (p, i, tag) => {
    for (const k of ['eon', 'period', 'label', 'color', 'description']) if (!isStr(p[k])) err(`${tag}: missing ${k}`);
    if (p.era !== null && !isStr(p.era)) err(`${tag}: era must be a name (null only for the Hadean)`);
    if (p.parentPeriod !== undefined && !isStr(p.parentPeriod)) err(`${tag}: parentPeriod must be a name when present`);
    if (!isNum(p.startMa) || !isNum(p.endMa) || p.startMa <= p.endMa) err(`${tag}: startMa must be > endMa`);
    if (!isNum(p.temporalWeight) || p.temporalWeight <= 0) err(`${tag}: temporalWeight must be > 0`);
    if (!isHex(p.color)) err(`${tag}: color must be #rrggbb`);
    if (names.has(p.period)) err(`${tag}: duplicate period name`);
    names.add(p.period);
    const prev = timeline[i - 1];
    if (i > 0 && isObj(prev) && prev.endMa !== p.startMa) err(`${tag}: starts at ${p.startMa} but the previous row ends at ${prev.endMa}`);
    const display = isStr(p.label) ? p.label : p.period;
    if (isStr(display) && /[-_]/.test(display) && !/^(Early|Middle|Late) /.test(display)) {
      warn(`${tag}: display name "${display}" looks like an internal key`);
    }
    if (!isStr(p.abbr)) err(`${tag}: missing abbr (shown on timeline blocks too narrow for the name)`);
    else {
      if (!new RegExp(`^[\\x21-\\x7e]{1,${LIMITS.abbr}}$`).test(p.abbr)) warn(`${tag}: abbr "${p.abbr}" must be 1–${LIMITS.abbr} printable ASCII characters`);
      if (abbrs.has(p.abbr)) warn(`${tag}: abbr "${p.abbr}" is also used by ${abbrs.get(p.abbr)}`);
      abbrs.set(p.abbr, tag);
    }
    tooLong(tag, 'description', p.description, LIMITS.periodDescription);
    if (!isObj(p.context)) warn(`${tag}: missing context { life, climate, geography }`);
    else {
      for (const k of ['life', 'climate', 'geography']) {
        if (!isStr(p.context[k])) warn(`${tag}: context.${k} missing`);
        else tooLong(tag, `context.${k}`, p.context[k], LIMITS.periodContext);
      }
    }
  });
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  if (isObj(first) && first.startMa < START) err(`first row starts at ${first.startMa}, after TIMING.startTimeMa ${START}`);
  if (!isObj(last) || last.endMa !== 0) err('last row must end at 0 Ma');

  // Canonical rows and boundaries.
  CANON_PERIODS.forEach(([name, base], i) => {
    const end = i + 1 < CANON_PERIODS.length ? CANON_PERIODS[i + 1][1] : 0;
    const row = timeline.find((p) => isObj(p) && p.period === name);
    if (!row) err(`no "${name}" row (${base}–${end} Ma on the canonical time scale)`);
    else if (row.startMa !== base || row.endMa !== end) err(`${name}: spans ${row.startMa}–${row.endMa} Ma; canonical ${base}–${end} (ICS v2026/06)`);
  });
  for (const p of timeline) if (isObj(p) && !CANON_PERIODS.some(([n]) => n === p.period)) err(`${p.period}: not a row of the canonical time scale`);

  // ERAS: canonical, contiguous, and spanning exactly the rows that belong to each unit.
  if (Array.isArray(mod.ERAS)) {
    const eras = mod.ERAS;
    if (eras.length !== CANON_ERAS.length) err(`ERAS has ${eras.length} entries; expected ${CANON_ERAS.length} (${CANON_ERAS.map((e) => e[0]).join(', ')})`);
    eachEntry(eras, (e, i) => `ERAS ${tagOf(e, i)}`, (e, i, tag) => {
      for (const k of ['id', 'name', 'tagline']) if (!isStr(e[k])) err(`${tag}: missing ${k}`);
      if (e.kind !== 'eon' && e.kind !== 'era') err(`${tag}: kind must be 'eon' or 'era'`);
      const c = CANON_ERAS[i];
      if (c && (e.id !== c[0] || e.kind !== c[1] || e.startMa !== c[2] || e.endMa !== c[3])) {
        err(`${tag}: ${e.kind} ${e.startMa}–${e.endMa} Ma; canonical entry ${i} is ${c[0]} (${c[1]}) ${c[2]}–${c[3]} Ma`);
      }
      const prev = eras[i - 1];
      if (i > 0 && isObj(prev) && prev.endMa !== e.startMa) err(`${tag}: starts at ${e.startMa} but the previous entry ends at ${prev.endMa}`);
      tooLong(tag, 'tagline', e.tagline, LIMITS.eraTagline);
      const unitOf = (p) => String((e.kind === 'eon' ? p.eon : p.era) || '').toLowerCase();
      const rows = timeline.filter((p) => isObj(p) && unitOf(p) === String(e.id).toLowerCase());
      if (!rows.length) err(`${tag}: no timeline row has ${e.kind} "${e.id}"`);
      else if (rows[0].startMa !== e.startMa || rows[rows.length - 1].endMa !== e.endMa) {
        err(`${tag}: spans ${e.startMa}–${e.endMa} Ma, but its rows span ${rows[0].startMa}–${rows[rows.length - 1].endMa}`);
      }
    });
  }

  // Accessors agree with the rows (probed inside each row, where the answer is unambiguous).
  const { getPeriodAtTime, getEraAtTime, getTemporalWeight } = mod;
  if (typeof getPeriodAtTime === 'function') {
    const misses = [];
    const eraIdOf = (p) => String(p.eon === 'Phanerozoic' ? p.era : p.eon).toLowerCase();
    for (const p of timeline) {
      if (!isObj(p) || !isNum(p.startMa) || !isNum(p.endMa)) continue;
      const span = p.startMa - p.endMa;
      for (const t of [(p.startMa + p.endMa) / 2, p.startMa - span * 1e-6, p.endMa + span * 1e-6]) {
        const got = getPeriodAtTime(t);
        if (got !== p) misses.push(`getPeriodAtTime(${t}) → ${got?.period ?? fmtVal(got)}, expected ${p.period}`);
        if (typeof getTemporalWeight === 'function' && getTemporalWeight(t) !== p.temporalWeight) misses.push(`getTemporalWeight(${t}) → ${getTemporalWeight(t)}, expected ${p.temporalWeight}`);
        if (typeof getEraAtTime === 'function' && Array.isArray(mod.ERAS) && getEraAtTime(t)?.id !== eraIdOf(p)) misses.push(`getEraAtTime(${t}) → ${getEraAtTime(t)?.id}, expected ${eraIdOf(p)}`);
      }
    }
    for (const t of [START, START + 100]) if (getPeriodAtTime(t) !== first) misses.push(`getPeriodAtTime(${t}) must be the first row`);
    for (const t of [0, -1]) if (getPeriodAtTime(t) !== last) misses.push(`getPeriodAtTime(${t}) must be the last row`);
    for (const m of misses.slice(0, 5)) err(m);
    if (misses.length > 5) err(`… and ${misses.length - 5} more accessor mismatches`);
    if (!misses.length && isObj(timeline[1])) {
      const younger = getPeriodAtTime(timeline[1].startMa) === timeline[1];
      info(`accessors agree with the rows; a time exactly on a boundary belongs to the ${younger ? 'younger row (the one that starts there)' : 'older row'}`);
    }
  }

  const ts = await load('js/engine/timeScale.js');
  if (ts && checkExports(ts, 'js/engine/timeScale.js', { maToFraction: 'function', fractionToMa: 'function', maToScreenSeconds: 'function', screenSecondsToMa: 'function', getSegments: 'function', totalScreenSeconds: 'function', formatClock: 'function' })) {
    const total = ts.totalScreenSeconds();
    info(`${timeline.length} periods; play-through ${ts.formatClock(total)} at 1× (+ extinction holds)`);
    for (const s of ts.getSegments()) {
      const sec = s.t1 - s.t0;
      if (!(sec >= 1.5)) warn(`${s.period.period}: only ${sec.toFixed(2)} s of screen time at 1×`);
    }
    for (const ma of [START, 4000, 2500, 541, 252, 66, 2.58, 0.3, 0.0117, 0.001, 0]) {
      const back = ts.fractionToMa(ts.maToFraction(ma));
      if (!(Math.abs(back - ma) <= Math.max(1e-6, ma * 1e-9))) err(`timeScale round-trip failed at ${ma} Ma → ${back}`);
    }
  }
}

// ------------------------------------------------------------------------------------------
// phylogeny (optional until the Tree view lands)
// ------------------------------------------------------------------------------------------
async function checkPhylogeny() {
  const file = 'js/data/phylogeny.js';
  const mod = await load(file, { optional: true });
  if (!mod) return;
  checkExports(mod, file, { clades: 'array', cladeById: 'map', getLineage: 'function', getChildren: 'function', lowestCommonAncestor: 'function', divergenceMa: 'function' });
  const clades = Array.isArray(mod.clades) ? mod.clades : null;
  if (!clades) return;
  const byId = new Map();
  const seen = new Set();
  const path = []; // ancestors of the previous row, root first — the pre-order test
  let roots = 0;
  let outOfOrder = 0;
  eachEntry(clades, tagOf, (c, i, tag) => {
    if (!isStr(c.id) || !/^[a-z0-9_]+$/.test(c.id)) err(`${tag}: id must be snake_case`);
    if (seen.has(c.id)) err(`${tag}: duplicate id`);
    if (!isStr(c.name)) err(`${tag}: missing name`);
    else if (c.name.length > LIMITS.cladeName) warn(`${tag}: name "${c.name}" is ${c.name.length} chars (keep ≤ ${LIMITS.cladeName})`);
    if (c.scientificName != null && !isStr(c.scientificName)) err(`${tag}: scientificName must be a string or null`);
    if (!isStr(c.description)) err(`${tag}: missing description`);
    else tooLong(tag, 'description', c.description, LIMITS.cladeDescription);
    if (!CATEGORY_IDS.has(c.category)) err(`${tag}: category "${c.category}" is not a LIFE_GROUPS category`);
    if (!isNum(c.originMa) || c.originMa <= 0 || c.originMa > START) err(`${tag}: originMa ${c.originMa} out of range`);
    if (c.parent == null) { roots++; path.length = 0; }
    else if (!seen.has(c.parent)) err(`${tag}: parent "${c.parent}" must exist and appear earlier in the array`);
    else {
      const parent = byId.get(c.parent);
      if (isNum(c.originMa) && parent && c.originMa > parent.originMa) err(`${tag}: originMa ${c.originMa} is older than its parent ${c.parent} (${parent.originMa})`);
      // In pre-order every row's parent lies on the path from the root to the row before it.
      const k = path.lastIndexOf(c.parent);
      if (k >= 0) path.length = k + 1;
      else if (++outOfOrder <= 5) err(`${tag}: rows are not in pre-order — its parent ${c.parent} is not an ancestor of the row before it`);
    }
    path.push(c.id);
    seen.add(c.id);
    if (!byId.has(c.id)) byId.set(c.id, c);
  });
  if (outOfOrder > 5) err(`… and ${outOfOrder - 5} more rows out of pre-order`);
  if (roots !== 1) err(`expected exactly one root clade, found ${roots}`);
  if (mod.cladeById instanceof Map && mod.cladeById.size !== byId.size) err(`cladeById has ${mod.cladeById.size} entries but clades has ${byId.size} ids`);

  // The helpers agree with the rows (one deep leaf, the root, one pair).
  const leaf = [...byId.values()].pop();
  const root = [...byId.values()].find((c) => c.parent == null);
  const mid = clades[Math.floor(clades.length / 2)];
  try {
    if (leaf && root && typeof mod.getLineage === 'function') {
      const lin = mod.getLineage(leaf.id);
      const chain = Array.isArray(lin) && lin.length > 0 && lin[0] === root && lin[lin.length - 1] === leaf && lin.every((x, k) => k === 0 || (isObj(x) && x.parent === lin[k - 1].id));
      if (!chain) err(`getLineage("${leaf.id}") is not the chain of clades from the root to it`);
    }
    if (root && typeof mod.getChildren === 'function') {
      const kids = mod.getChildren(root.id);
      const want = clades.filter((c) => isObj(c) && c.parent === root.id);
      if (!Array.isArray(kids) || kids.length !== want.length || kids.some((k) => !want.includes(k))) err(`getChildren("${root.id}") does not return the clades whose parent is ${root.id}`);
    }
    if (leaf && isObj(mid) && typeof mod.lowestCommonAncestor === 'function' && typeof mod.getLineage === 'function') {
      const lca = mod.lowestCommonAncestor(leaf.id, mid.id);
      if (!lca || !mod.getLineage(leaf.id).includes(lca) || !mod.getLineage(mid.id).includes(lca)) err(`lowestCommonAncestor("${leaf.id}", "${mid.id}") is not an ancestor of both`);
    }
    if (leaf && typeof mod.divergenceMa === 'function') {
      if (mod.divergenceMa(leaf.id, leaf.id) !== 0) err('divergenceMa(x, x) must be 0');
      if (isObj(mid) && mid.id !== leaf.id && !(mod.divergenceMa(leaf.id, mid.id) > 0)) err(`divergenceMa("${leaf.id}", "${mid.id}") must be a positive number of Ma`);
    }
  } catch (e) { err(`a phylogeny helper throws — ${describe(e)}`); }
  info(`${clades.length} clades`);
}

// ------------------------------------------------------------------------------------------
// species
// ------------------------------------------------------------------------------------------
async function checkSpecies() {
  // life groups in config.js: canonical categories, and the shape the colour system relies on
  for (const id of CANON_CATEGORIES) if (!CATEGORY_IDS.has(id)) err(`js/config.js: LIFE_GROUPS has no category "${id}" (a canonical category id)`);
  for (const id of CATEGORY_IDS) if (!CANON_CATEGORIES.includes(id)) warn(`js/config.js: LIFE_GROUPS category "${id}" is not a canonical category id`);
  eachEntry(LIFE_GROUPS, (g, i) => `LIFE_GROUPS ${tagOf(g, i)}`, (g, i, tag) => {
    for (const k of ['id', 'label', 'glyph']) if (!isStr(g[k])) err(`${tag}: missing ${k}`);
    if (!isHex(g.color)) err(`${tag}: color must be #rrggbb`);
    if (!Array.isArray(g.categories) || !g.categories.length) err(`${tag}: needs categories`);
    else for (const c of g.categories) if (!isObj(c) || !isStr(c.id) || !isStr(c.label) || !isHex(c.color)) err(`${tag}: category ${isObj(c) ? c.id : c} needs id, label and a #rrggbb color`);
  });

  // The era files first, so that a broken one is named rather than species.js.
  const eraMods = [];
  for (const [eraFile, exportName, older, younger] of ERA_FILES) eraMods.push([eraFile, exportName, older, younger, await load(`js/data/species/${eraFile}.js`)]);
  const file = 'js/data/species.js';
  const mod = await load(file);
  if (!mod) return;
  checkExports(mod, file, { species: 'array', speciesById: 'map', getSpeciesAtTime: 'function', isAlive: 'function', interpolateAbundance: 'function' });
  const { species } = mod;
  if (!Array.isArray(species)) return;
  const phyloMod = await load('js/data/phylogeny.js', { optional: true });
  const phylo = phyloMod && Array.isArray(phyloMod.clades) ? phyloMod : null; // a broken one is reported by its section
  const cladeById = new Map();
  if (phylo) for (const c of phylo.clades) if (isObj(c)) cladeById.set(c.id, c);

  const seen = new Set();
  const missing = { clade: 0, habitat: 0, fossilSite: 0 };
  const cladeUse = new Map();
  const orphanClades = [];
  const firstNames = [];
  const firstDescriptions = [];
  const names = new Map();
  const sciNames = new Map();
  const [longMin, longMax] = LIMITS.speciesDescriptionLong;
  eachEntry(species, tagOf, (s, i, tag) => {
    if (!isStr(s.id) || !/^[a-z0-9_]+$/.test(s.id)) err(`${tag}: id must be snake_case`);
    if (seen.has(s.id)) err(`${tag}: duplicate id`);
    seen.add(s.id);
    if (!isStr(s.name)) err(`${tag}: missing name`);
    else {
      if (/^First\b/i.test(s.name)) firstNames.push(`${s.id} ("${s.name}")`);
      const key = s.name.trim().toLowerCase();
      names.set(key, [...(names.get(key) || []), s.id]);
    }
    if (s.scientificName !== null && !isStr(s.scientificName)) err(`${tag}: scientificName must be a string or null`);
    else if (isStr(s.scientificName)) {
      const key = s.scientificName.trim().toLowerCase();
      sciNames.set(key, [...(sciNames.get(key) || []), s.id]);
    }
    if (!CATEGORY_IDS.has(s.category)) {
      if (COLORS.kingdom && COLORS.kingdom[s.category]) warn(`${tag}: legacy category "${s.category}" — use one of the LIFE_GROUPS category ids`);
      else err(`${tag}: unknown category "${s.category}"`);
    }
    const end = s.extinctMa ?? 0;
    if (!isNum(s.appearanceMa) || s.appearanceMa <= 0 || s.appearanceMa > START) err(`${tag}: appearanceMa ${s.appearanceMa} out of range`);
    if (s.extinctMa !== null && (!isNum(s.extinctMa) || s.extinctMa < 0)) err(`${tag}: extinctMa must be null or ≥ 0`);
    else if (s.extinctMa === 0) warn(`${tag}: extinctMa is 0 — use null for a lineage that is still alive`);
    if (isNum(s.appearanceMa) && s.appearanceMa <= end) err(`${tag}: appearanceMa (${s.appearanceMa}) must be older than extinctMa (${end})`);

    const prof = s.abundanceProfile;
    if (!Array.isArray(prof) || prof.length < 2) err(`${tag}: abundanceProfile needs ≥ 2 points`);
    else if (prof.some((p) => !Array.isArray(p) || p.length !== 2)) err(`${tag}: abundanceProfile points must be [Ma, abundance] pairs (point ${prof.findIndex((p) => !Array.isArray(p) || p.length !== 2)} is ${fmtVal(prof.find((p) => !Array.isArray(p) || p.length !== 2))})`);
    else {
      for (let k = 0; k < prof.length; k++) {
        const [ma, a] = prof[k];
        if (!isNum(ma) || !inRange(a, 0, 1)) err(`${tag}: abundanceProfile[${k}] = [${ma}, ${a}] invalid`);
        if (k > 0 && !(ma < prof[k - 1][0])) err(`${tag}: abundanceProfile not strictly descending in Ma at index ${k}`);
      }
      if (prof[0][0] !== s.appearanceMa) warn(`${tag}: abundanceProfile starts at ${prof[0][0]}, appearanceMa is ${s.appearanceMa}`);
      if (prof[prof.length - 1][0] !== end) warn(`${tag}: abundanceProfile ends at ${prof[prof.length - 1][0]}, expected ${end}`);
      const lastValue = prof[prof.length - 1][1];
      if (s.extinctMa != null && isNum(lastValue) && lastValue > 0.1) warn(`${tag}: abundance is still ${lastValue} at extinction — let the profile fall to ~0.01`);
      if (prof.every((p) => !(p[1] > 0))) warn(`${tag}: abundance is 0 throughout — the entry always ranks last`);
    }

    if (!isObj(s.location) || !coordOk(s.location.lon, s.location.lat)) err(`${tag}: location must be { lat ∈ [-90,90], lon ∈ [-180,180] }`);
    else if (s.location.lat === 0 && s.location.lon === 0) warn(`${tag}: location is exactly 0, 0 — a placeholder, not a fossil locality`);
    if (!isStr(s.description)) err(`${tag}: missing description`);
    else {
      tooLong(tag, 'description', s.description, LIMITS.speciesDescription);
      if (/^First\b/.test(s.description)) firstDescriptions.push(s.id);
    }
    if (!isStr(s.descriptionLong)) err(`${tag}: missing descriptionLong`);
    else if (s.descriptionLong.length < longMin * 0.9 || s.descriptionLong.length > longMax * 1.1) warn(`${tag}: descriptionLong is ${s.descriptionLong.length} chars (aim for roughly ${longMin}–${longMax})`);

    if (s.clade == null) missing.clade++;
    else if (phylo) {
      const clade = cladeById.get(s.clade);
      if (!clade) err(`${tag}: clade "${s.clade}" is not in phylogeny.js`);
      else {
        cladeUse.set(s.clade, (cladeUse.get(s.clade) || 0) + 1);
        if (isNum(s.appearanceMa) && s.appearanceMa > clade.originMa) err(`${tag}: appears at ${s.appearanceMa} Ma, before its clade ${s.clade} originates (${clade.originMa} Ma)`);
      }
    } else orphanClades.push(s.id);
    if (s.habitat == null) missing.habitat++;
    else if (!HABITATS.includes(s.habitat)) err(`${tag}: habitat "${s.habitat}" must be one of ${HABITATS.join(', ')}`);
    if (s.fossilSite == null) missing.fossilSite++;
    else if (!isStr(s.fossilSite)) err(`${tag}: fossilSite must be a non-empty string`);
    for (const k of ['size', 'diet']) if (s[k] != null && !isStr(s[k])) err(`${tag}: ${k} must be a string when present`);
  });
  const entries = species.filter(isObj);
  for (const [k, n] of Object.entries(missing)) if (n > 0) (STRICT ? err : warn)(`${n} of ${species.length} entries have no ${k}`);
  if (orphanClades.length) warn(`${plural(orphanClades.length, 'entry')} name a clade, but js/data/phylogeny.js is ${phyloMod ? 'unusable' : 'missing'}, so the clade ids cannot be checked`);
  if (firstNames.length) warn(`${plural(firstNames.length, 'name')} start with "First" — use the plain group name and let the description carry the "first": ${sample(firstNames)}`);
  if (firstDescriptions.length) info(`${plural(firstDescriptions.length, 'description')} start with "First" (fine for the taxon itself, but no "first ever" unless true): ${sample(firstDescriptions)}`);
  for (const [key, ids] of names) if (ids.length > 1) warn(`duplicate name "${key}": ${ids.join(', ')}`);
  for (const [key, ids] of sciNames) if (ids.length > 1) warn(`duplicate scientificName "${key}": ${ids.join(', ')}`);

  // Era files hold the entries that first appear in their era. The species brief lets an entry
  // stay in its file when a corrected date moves it across the boundary, so this is information.
  const strays = [];
  for (const [eraFile, exportName, older, younger, eraMod] of eraMods) {
    if (!eraMod) continue;
    const list = eraMod[exportName];
    if (!Array.isArray(list)) { err(`species/${eraFile}.js must export ${exportName}`); continue; }
    for (const s of list) {
      if (isObj(s) && isNum(s.appearanceMa) && !(s.appearanceMa <= older && s.appearanceMa > younger)) strays.push(`${s.id} (${s.appearanceMa} Ma, ${eraFile}.js)`);
    }
  }
  if (strays.length) info(`${plural(strays.length, 'entry')} kept in an era file other than that of their first appearance (allowed by the species brief): ${sample(strays)}`);

  const { getSpeciesAtTime } = mod;
  if (typeof getSpeciesAtTime !== 'function') return;
  const counts = [3500, 2000, 600, 500, 400, 300, 200, 100, 50, 10, 1, 0].map((t) => `${t}:${getSpeciesAtTime(t).length}`);
  info(`${species.length} entries; alive at Ma → ${counts.join('  ')}`);
  if (phylo && Array.isArray(phylo.clades)) {
    const unused = phylo.clades.filter((c) => isObj(c) && !cladeUse.has(c.id) && !phylo.clades.some((d) => isObj(d) && d.parent === c.id));
    if (unused.length) info(`${unused.length} leaf clades have no species attached yet: ${sample(unused.map((c) => c.id), 12)}`);
  }

  // The living world: every life group has members alive today.
  const familiesNow = new Set(getSpeciesAtTime(0).map((s) => groupOf(s.category)));
  for (const g of LIFE_GROUPS) if (isObj(g) && !familiesNow.has(g.id)) warn(`no "${g.label}" entry is alive at 0 Ma — every life group needs members that persist to the present`);

  // Mass extinctions must visibly kill: victims end EXACTLY at the event's timeMa.
  const ext = await peek('js/data/extinctions.js');
  if (ext && Array.isArray(ext.extinctions)) {
    const near = [];
    for (const e of ext.extinctions) {
      if (!isObj(e) || !isNum(e.timeMa) || !isNum(e.durationMa)) continue;
      const [a, b] = win(e);
      const exact = entries.filter((s) => s.extinctMa === e.timeMa);
      const inWindow = entries.filter((s) => isNum(s.extinctMa) && s.extinctMa !== e.timeMa && s.extinctMa <= a && s.extinctMa >= b);
      if (exact.length < 4) warn(`${e.id} (${e.timeMa} Ma): ${exact.length ? `only ${exact.length}` : 'no'} dataset ${exact.length === 1 ? 'entry ends' : 'entries end'} exactly at the event — mass extinctions must visibly kill (≥ 4 victims with extinctMa ${e.timeMa})`);
      if (inWindow.length) warn(`${e.id}: ${plural(inWindow.length, 'entry')} end inside the event window but not at its timeMa — pin victims to exactly ${e.timeMa}: ${sample(inWindow.map((s) => `${s.id} (${s.extinctMa})`))}`);
      for (const s of entries) if (isNum(s.extinctMa) && s.extinctMa !== e.timeMa && Math.abs(s.extinctMa - e.timeMa) <= 2 && !(s.extinctMa <= a && s.extinctMa >= b)) near.push(`${s.id} ${s.extinctMa} (${e.id} ${e.timeMa})`);
      info(`${e.id}: ${plural(exact.length, 'dataset victim')}`);
    }
    if (near.length) info(`entries ending within 2 Ma of a mass extinction but not in it (pin them if they are victims): ${sample(near)}`);
  } else info('skipped the mass-extinction victim check: js/data/extinctions.js did not load');

  // How long each entry is on screen, and whether it ever reaches the sidebar's default ranking.
  const ts = await load('js/engine/timeScale.js');
  if (ts && typeof ts.maToScreenSeconds === 'function' && typeof ts.totalScreenSeconds === 'function') {
    const brief = entries.filter((s) => isNum(s.appearanceMa))
      .map((s) => ({ id: s.id, sec: ts.maToScreenSeconds(s.extinctMa ?? 0) - ts.maToScreenSeconds(s.appearanceMa) }))
      .filter((r) => r.sec < 2).sort((x, y) => x.sec - y.sec);
    if (brief.length) info(`${plural(brief.length, 'entry')} alive for under 2 s of 1× playback: ${sample(brief.map((r) => `${r.id} ${r.sec.toFixed(2)} s`))}`);
    const everTop = new Set();
    const total = ts.totalScreenSeconds();
    for (let k = 0; k <= total * 4; k++) for (const s of getSpeciesAtTime(ts.screenSecondsToMa(Math.min(total, k / 4))).slice(0, SIDEBAR_TOP_N)) everTop.add(s.id);
    const never = entries.filter((s) => !everTop.has(s.id)).map((s) => s.id);
    if (never.length) info(`${plural(never.length, 'entry')} never reach the top ${SIDEBAR_TOP_N} of the "dominant life" ranking (only "Show all" lists them): ${sample(never, 12)}`);
  }
}

// ------------------------------------------------------------------------------------------
// extinctions
// ------------------------------------------------------------------------------------------
async function checkExtinctions() {
  const file = 'js/data/extinctions.js';
  const mod = await load(file);
  if (!mod) return;
  checkExports(mod, file, { extinctions: 'array', getActiveExtinction: 'function' }, { crises: 'array' });
  const list = Array.isArray(mod.extinctions) ? mod.extinctions : null;
  if (!list) return;
  const speciesMod = await peek('js/data/species.js');
  const speciesById = new Map();
  if (speciesMod && Array.isArray(speciesMod.species)) for (const s of speciesMod.species) if (isObj(s)) speciesById.set(s.id, s);
  const ts = await load('js/engine/timeScale.js');
  const ids = new Set();
  const lacking = new Map(); // a field of the new event schema → ids that lack it
  const NEW_FIELDS = ['severityLabel', 'causeShort', 'mechanism', 'epicenter', 'victims', 'survivors'];
  eachEntry(list, tagOf, (e, i, tag) => {
    if (ids.has(e.id)) err(`${tag}: duplicate id`);
    ids.add(e.id);
    for (const k of ['id', 'name', 'cause', 'description']) if (!isStr(e[k])) err(`${tag}: missing ${k}`);
    if (e.subtitle != null && !isStr(e.subtitle)) err(`${tag}: subtitle must be a string when present`);
    if (!isHex(e.color)) err(`${tag}: color must be #rrggbb`);
    if (!isNum(e.timeMa) || !isNum(e.durationMa) || e.durationMa <= 0) { err(`${tag}: timeMa/durationMa invalid`); return; }
    if (!inRange(e.severityPercent, 1, 100)) err(`${tag}: severityPercent out of range`);
    if (!(e.id in CANON_EXTINCTIONS)) err(`${tag}: not one of the Big Five ids (${Object.keys(CANON_EXTINCTIONS).join(', ')})`);
    else if (e.timeMa !== CANON_EXTINCTIONS[e.id]) err(`${tag}: timeMa ${e.timeMa}; the canonical date is ${CANON_EXTINCTIONS[e.id]} Ma (victims pin their extinctMa to it)`);
    const [a, b] = win(e);
    if (a > START || b < 0) err(`${tag}: window ${a}–${b} outside the timeline`);
    for (let j = 0; j < i; j++) {
      const o = list[j];
      if (!isObj(o) || !isNum(o.timeMa) || !isNum(o.durationMa)) continue;
      const [c, d] = win(o);
      if (a >= d && b <= c) err(`${tag}: window overlaps ${o.id}`);
    }
    if (ts && typeof ts.maToScreenSeconds === 'function') {
      const cross = (ts.maToScreenSeconds(b) - ts.maToScreenSeconds(a)) / TIMING.extinctionSlowdown;
      if (cross < PACE.windowCrossSec) warn(`${tag}: the window (${fmtExact(a)}–${fmtExact(b)} Ma) is crossed in ${cross.toFixed(2)} s at 1× even with the ${TIMING.extinctionSlowdown}× slow-down — make it ≥ ~1.5 s`);
    }
    tooLong(tag, 'description', e.description, LIMITS.extinctionDescription);

    // the card / map-staging fields
    for (const k of NEW_FIELDS) if (!(k in e)) lacking.set(k, [...(lacking.get(k) || []), e.id]);
    if ('severityLabel' in e && !isStr(e.severityLabel)) err(`${tag}: severityLabel must be a non-empty string`);
    if ('causeShort' in e) {
      if (!isStr(e.causeShort)) err(`${tag}: causeShort must be a non-empty string`);
      else tooLong(tag, 'causeShort', e.causeShort, LIMITS.causeShort);
    }
    if ('mechanism' in e && !MECHANISMS.includes(e.mechanism)) err(`${tag}: mechanism "${e.mechanism}" must be one of ${MECHANISMS.join(', ')}`);
    if (e.epicenter != null) checkPlace(`${tag}: epicenter`, e.epicenter);
    for (const [key, lo, hi] of [['victims', 4, 8], ['survivors', 3, 5]]) {
      if (!(key in e)) continue;
      const names = e[key];
      if (!Array.isArray(names) || names.some((n) => !isStr(n))) { err(`${tag}: ${key} must be an array of display names`); continue; }
      if (names.length < lo || names.length > hi) warn(`${tag}: ${names.length} ${key} (list ${lo}–${hi})`);
    }
    if (Array.isArray(e.victims) && Array.isArray(e.survivors)) {
      const both = e.victims.filter((v) => e.survivors.includes(v));
      if (both.length) warn(`${tag}: listed both as victim and survivor: ${both.join(', ')}`);
    }
    // affectedGroups (legacy) lists species ids, which must be alive at the event.
    if (e.affectedGroups !== undefined && !Array.isArray(e.affectedGroups)) err(`${tag}: affectedGroups must be an array of species ids`);
    else if (Array.isArray(e.affectedGroups) && speciesMod) {
      for (const id of e.affectedGroups) {
        const sp = speciesById.get(id);
        if (!sp) { warn(`${tag}: affectedGroups lists unknown species id "${id}"`); continue; }
        if (!(sp.appearanceMa >= b && (sp.extinctMa ?? 0) <= a)) warn(`${tag}: affectedGroups lists "${id}", which was not alive during the event (${sp.appearanceMa}–${sp.extinctMa ?? 0} Ma)`);
      }
    }
  });
  for (const id of Object.keys(CANON_EXTINCTIONS)) if (!ids.has(id)) err(`the Big Five event "${id}" (${CANON_EXTINCTIONS[id]} Ma) is missing`);
  if (lacking.size) warn(`events lack the card and map-staging fields: ${[...lacking].map(([k, v]) => `${k} (${v.length === list.length ? 'all' : v.join(', ')})`).join('; ')}`);
  if (!speciesMod && list.some((e) => isObj(e) && Array.isArray(e.affectedGroups))) info('skipped the affectedGroups check: js/data/species.js did not load');

  // getActiveExtinction: window = timeMa ± durationMa/2, progress 0 → 1 across it, null outside.
  if (typeof mod.getActiveExtinction === 'function') {
    try {
      for (const e of list) {
        if (!isObj(e) || !isNum(e.timeMa) || !(e.durationMa > 0)) continue;
        const [a, b] = win(e);
        const at = (t) => mod.getActiveExtinction(t);
        const close = (got, p) => got && got.id === e.id && Math.abs(got.progress - p) <= 1e-6;
        if (!close(at(a), 0)) err(`getActiveExtinction(${a}) must return ${e.id} with progress 0 (the window's leading edge)`);
        if (!close(at(e.timeMa), 0.5)) err(`getActiveExtinction(${e.timeMa}) must return ${e.id} with progress 0.5`);
        if (!close(at(b), 1)) err(`getActiveExtinction(${b}) must return ${e.id} with progress 1 (the trailing edge)`);
        const before = at(a + Math.max(1e-6, e.durationMa * 1e-3));
        if (before && before.id === e.id) err(`getActiveExtinction is already ${e.id} before its window opens`);
      }
    } catch (e) { err(`getActiveExtinction throws — ${describe(e)}`); }
  }

  // crises: second-tier events (timeline markers; they never pause the clock)
  const crises = Array.isArray(mod.crises) ? mod.crises : null;
  if (crises) {
    const crisisIds = new Set();
    eachEntry(crises, (c, i) => `crisis ${tagOf(c, i)}`, (c, i, tag) => {
      if (!isStr(c.id)) err(`${tag}: missing id`);
      else if (crisisIds.has(c.id)) err(`${tag}: duplicate id`);
      else if (c.id in CANON_EXTINCTIONS) err(`${tag}: id is a Big Five id`);
      crisisIds.add(c.id);
      for (const k of ['name', 'severityNote', 'cause', 'description']) if (!isStr(c[k])) err(`${tag}: missing ${k}`);
      if (!isHex(c.color)) err(`${tag}: color must be #rrggbb`);
      if (!isNum(c.timeMa) || !isNum(c.durationMa) || c.durationMa <= 0) { err(`${tag}: timeMa/durationMa invalid`); return; }
      const [a, b] = win(c);
      if (a > START || b < 0) err(`${tag}: window ${a}–${b} outside the timeline`);
      tooLong(tag, 'description', c.description, LIMITS.crisisDescription);
    });
  }
  info(`${plural(list.length, 'mass extinction')}${crises ? `, ${crises.length} second-tier crises` : ''}`);
}

// ------------------------------------------------------------------------------------------
// milestones
// ------------------------------------------------------------------------------------------
async function checkMilestones() {
  const file = 'js/data/milestones.js';
  const mod = await load(file);
  if (!mod) return;
  checkExports(mod, file, { milestones: 'array', getActiveMilestone: 'function' });
  const list = Array.isArray(mod.milestones) ? mod.milestones : null;
  if (!list) return;
  const ext = await peek('js/data/extinctions.js');
  const events = ext && Array.isArray(ext.extinctions) ? ext.extinctions.filter((e) => isObj(e) && isNum(e.timeMa) && isNum(e.durationMa)) : [];
  const crisisIds = ext && Array.isArray(ext.crises) ? new Set(ext.crises.filter(isObj).map((c) => c.id)) : null;
  if (!ext) info('skipped the checks against the mass extinctions: js/data/extinctions.js did not load');
  const ts = await load('js/engine/timeScale.js');
  const sec = ts && typeof ts.maToScreenSeconds === 'function' ? (ma) => ts.maToScreenSeconds(Math.min(START, Math.max(0, ma))) : null;
  if (Array.isArray(mod.MILESTONE_CATEGORIES)) {
    const declared = mod.MILESTONE_CATEGORIES.map((c) => (isObj(c) ? c.id : c));
    if (declared.join() !== MILESTONE_CATEGORIES.join()) warn(`MILESTONE_CATEGORIES ids are ${declared.join(', ')}; the documented set is ${MILESTONE_CATEGORIES.join(', ')}`);
    for (const c of mod.MILESTONE_CATEGORIES) if (!isObj(c) || !isStr(c.label) || !isHex(c.color)) err(`MILESTONE_CATEGORIES ${isObj(c) ? c.id : c}: needs id, label and a #rrggbb color`);
  }
  const ids = new Set();
  const rows = [];
  eachEntry(list, tagOf, (m, i, tag) => {
    if (!isStr(m.id) || !/^[a-z0-9_]+$/.test(m.id)) err(`${tag}: id must be snake_case`);
    if (ids.has(m.id)) err(`${tag}: duplicate id`);
    ids.add(m.id);
    for (const k of ['id', 'name', 'description', 'category']) if (!isStr(m[k])) err(`${tag}: missing ${k}`);
    if (isStr(m.category) && !MILESTONE_CATEGORIES.includes(m.category)) err(`${tag}: category "${m.category}" must be one of ${MILESTONE_CATEGORIES.join(', ')}`);
    if (!isHex(m.color)) err(`${tag}: color must be #rrggbb`);
    if (m.priority !== undefined && !isNum(m.priority)) err(`${tag}: priority must be a number when present`);
    if (m.location !== undefined) checkPlace(`${tag}: location`, m.location);
    if (m.crisisId !== undefined && crisisIds && !crisisIds.has(m.crisisId)) err(`${tag}: crisisId "${m.crisisId}" is not a crisis in extinctions.js`);
    if (!isNum(m.timeMa) || !isNum(m.durationMa) || m.durationMa <= 0) { err(`${tag}: timeMa/durationMa invalid`); return; }
    tooLong(tag, 'description', m.description, LIMITS.milestoneDescription);
    const [a, b] = win(m);
    if (a > START) err(`${tag}: window starts at ${a} Ma, before the timeline begins`);
    if (b < 0) warn(`${tag}: window ends at ${b} Ma (after the present) — it is cut off at 0`);
    if (sec) {
      const len = sec(b) - sec(a);
      if (len < PACE.milestoneMinSec) warn(`${tag}: on screen for only ${len.toFixed(2)} s at 1× (the toast lingers, but the trigger window is very short)`);
      rows.push({ m, a, b, lead: sec(a), len });
    }
    // A milestone may overlap a mass extinction only as its aftermath, opening at or after the
    // event's leading edge; one already open when the event starts competes with its card.
    for (const e of events) {
      const [c, d] = win(e);
      if (a >= d && b <= c && a > c) warn(`${tag}: window (${fmtExact(a)}–${fmtExact(b)} Ma) opens before the ${e.id} window (${fmtExact(c)}–${fmtExact(d)} Ma) and is still open when the event starts`);
    }
  });

  // Overlapping windows: which one shows is up to getActiveMilestone; masked ones are flagged below.
  const valid = list.filter((m) => isObj(m) && isNum(m.timeMa) && isNum(m.durationMa) && m.durationMa > 0);
  const overlaps = [];
  for (let i = 0; i < valid.length; i++) {
    for (let j = 0; j < i; j++) {
      const [a, b] = win(valid[i]);
      const [c, d] = win(valid[j]);
      if (a > d && b < c) overlaps.push(`${valid[j].id} ↔ ${valid[i].id}`);
    }
  }
  if (overlaps.length) info(`${overlaps.length} overlapping milestone windows: ${sample(overlaps)}`);

  // Every milestone must be the active one at some moment of its window.
  if (typeof mod.getActiveMilestone === 'function' && ts) {
    try {
      for (const r of rows) {
        const n = Math.max(9, Math.ceil(r.len * 120));
        let shown = false;
        const winners = new Set();
        for (let k = 0; k <= n && !shown; k++) {
          const t = r.len > 0 ? ts.screenSecondsToMa(r.lead + (r.len * k) / n) : r.a - ((r.a - r.b) * k) / n;
          const got = mod.getActiveMilestone(t);
          if (got && got.id === r.m.id) shown = true;
          else if (got) winners.add(got.id);
        }
        if (!shown) warn(`${r.m.id}: getActiveMilestone never returns it — ${winners.size ? `${[...winners].join(', ')} win${winners.size === 1 ? 's' : ''} throughout its window` : 'it is not active anywhere in its window'}`);
      }
    } catch (e) { err(`getActiveMilestone throws — ${describe(e)}`); }
  }

  // Pacing on the 1× axis: leading edges apart, and no long silences (extinctions count as beats).
  if (rows.length && ts) {
    const total = ts.totalScreenSeconds();
    const byLead = [...rows].sort((x, y) => x.lead - y.lead);
    let closest = null;
    for (let i = 1; i < byLead.length; i++) {
      const gap = byLead[i].lead - byLead[i - 1].lead;
      if (gap < PACE.milestoneGapSec) warn(`${byLead[i - 1].m.id} and ${byLead[i].m.id} open only ${gap.toFixed(2)} s apart at 1× (keep ≥ ~${PACE.milestoneGapSec} s)`);
      if (!closest || gap < closest.gap) closest = { gap, a: byLead[i - 1].m.id, b: byLead[i].m.id };
    }
    const beats = [{ t: 0, id: 'the start' }, ...byLead.map((r) => ({ t: r.lead, id: r.m.id })),
      ...events.map((e) => ({ t: sec(win(e)[0]), id: `[${e.id}]` })), { t: total, id: 'the end' }].sort((x, y) => x.t - y.t);
    let longest = { gap: 0 };
    for (let i = 1; i < beats.length; i++) {
      const gap = beats[i].t - beats[i - 1].t;
      if (gap > PACE.silenceSec) warn(`${gap.toFixed(1)} s without a milestone or extinction at 1×, between ${beats[i - 1].id} and ${beats[i].id} (keep silences ≤ ~${PACE.silenceSec} s)`);
      if (gap > longest.gap) longest = { gap, a: beats[i - 1].id, b: beats[i].id };
    }
    info(`${plural(list.length, 'milestone')}; a new one every ${(total / Math.max(1, rows.length)).toFixed(1)} s on average; longest silence ${longest.gap.toFixed(1)} s (${longest.a} → ${longest.b})${closest ? `; closest pair ${closest.gap.toFixed(2)} s (${closest.a}, ${closest.b})` : ''}`);
    if (asked('milestones')) {
      info('timetable at 1× — opens (s), window (s), gap since the previous one (s), id (Ma):');
      byLead.forEach((r, i) => info(`  ${r.lead.toFixed(1).padStart(6)}  ${r.len.toFixed(2).padStart(6)}  ${(i ? r.lead - byLead[i - 1].lead : r.lead).toFixed(2).padStart(6)}  ${r.m.id} (${fmtMa(r.m.timeMa)} Ma)`));
    }
  } else info(`${plural(list.length, 'milestone')}`);
}

// ------------------------------------------------------------------------------------------
// chapters (optional until it lands)
// ------------------------------------------------------------------------------------------
async function checkChapters() {
  const file = 'js/data/chapters.js';
  const mod = await load(file, { optional: true });
  if (!mod) return;
  checkExports(mod, file, { chapters: 'array', getChapterAt: 'function' });
  const list = mod.chapters;
  if (!Array.isArray(list)) return;
  if (!list.length) { err('chapters must be a non-empty array'); return; }
  const ids = new Set();
  eachEntry(list, tagOf, (c, i, tag) => {
    if (ids.has(c.id)) err(`${tag}: duplicate id`);
    ids.add(c.id);
    for (const k of ['id', 'title', 'blurb']) if (!isStr(c[k])) err(`${tag}: missing ${k}`);
    if (!inRange(c.startMa, 0, START)) err(`${tag}: startMa out of range`);
    if (!inRange(c.endMa, 0, START) || !(c.endMa < c.startMa)) err(`${tag}: endMa must be a time younger than startMa (≥ 0)`);
    const prev = list[i - 1];
    if (i > 0 && isObj(prev)) {
      if (!(c.startMa < prev.startMa)) err(`${tag}: chapters must be ordered oldest → youngest`);
      if (prev.endMa !== c.startMa) err(`${tag}: starts at ${c.startMa}, but ${prev.id} ends at ${prev.endMa} — chapters must be contiguous`);
    }
    if (c.view != null && !VIEWS.includes(c.view)) err(`${tag}: view must be ${VIEWS.join(' | ')}`);
    tooLong(tag, 'title', c.title, LIMITS.chapterTitle);
    tooLong(tag, 'blurb', c.blurb, LIMITS.chapterBlurb);
  });
  const first = list[0];
  const last = list[list.length - 1];
  if (isObj(first) && first.startMa !== START) err(`the first chapter starts at ${first.startMa}; it must start at ${START} Ma`);
  if (isObj(last) && last.endMa !== 0) err(`the last chapter ends at ${last.endMa}; it must end at 0 Ma`);
  if (list.length < 14 || list.length > 18) warn(`${list.length} chapters (the brief asks for 14–18)`);
  if (typeof mod.getChapterAt === 'function') {
    // each chapter covers [startMa, endMa): its start belongs to it, its end to the next one
    try {
      for (const c of list) {
        if (!isObj(c) || !isNum(c.startMa) || !isNum(c.endMa)) continue;
        if (mod.getChapterAt((c.startMa + c.endMa) / 2) !== c) err(`getChapterAt(${(c.startMa + c.endMa) / 2}) is not ${c.id}`);
        if (mod.getChapterAt(c.startMa) !== c) err(`getChapterAt(${c.startMa}) is not ${c.id} — a chapter covers [startMa, endMa)`);
      }
      if (mod.getChapterAt(0) !== last) err('getChapterAt(0) must be the last chapter');
    } catch (e) { err(`getChapterAt throws — ${describe(e)}`); }
  }
  const ext = await peek('js/data/extinctions.js');
  if (ext && typeof ext.getActiveExtinction === 'function') {
    try {
      const inside = list.filter((c) => isObj(c) && isNum(c.startMa) && ext.getActiveExtinction(c.startMa)).map((c) => `${c.id} (${ext.getActiveExtinction(c.startMa).id})`);
      if (inside.length) info(`chapters that start inside a mass-extinction window (a jump lands mid-event): ${inside.join(', ')}`);
    } catch { /* extinctions.js is checked in its own section */ }
  }
  info(`${list.length} chapters`);
}

// ------------------------------------------------------------------------------------------
// curves: data tables, accessors and the planet look, sampled at 30 per second of playback
// ------------------------------------------------------------------------------------------
async function checkCurves() {
  const checkCurve = (name, curve, { min = -Infinity } = {}) => {
    if (!Array.isArray(curve) || curve.length < 2) { err(`${name}: not a curve ([[Ma, value], …] with ≥ 2 points)`); return; }
    for (let i = 0; i < curve.length; i++) {
      const p = curve[i];
      if (!Array.isArray(p) || !isNum(p[0]) || !isNum(p[1])) { err(`${name}[${i}] = ${fmtVal(p)} is not a numeric [Ma, value] pair`); return; }
      if (p[1] < min) err(`${name}[${i}] = [${p[0]}, ${p[1]}] is below ${min}`);
      if (i > 0 && !(p[0] < curve[i - 1][0])) err(`${name}: not strictly descending in Ma at index ${i} (${curve[i - 1][0]} → ${p[0]})`);
    }
    if (curve[curve.length - 1][0] !== 0) warn(`${name}: last point is at ${curve[curve.length - 1][0]} Ma, not 0`);
    if (curve[0][0] < START) warn(`${name}: starts at ${curve[0][0]} Ma — values before that are clamped (timeline starts at ${START})`);
  };
  // Every exported table is checked: the named ones, any other export shaped like a curve, and any
  // object of curves (so a renamed or new table is not skipped).
  const looksLikeCurve = (v) => Array.isArray(v) && v.length >= 2 && Array.isArray(v[0]) && v[0].length === 2 && typeof v[0][0] === 'number';
  const looksLikeCurves = (v) => isObj(v) && Object.keys(v).length > 0 && Object.values(v).every(looksLikeCurve);
  const curvesIn = (mod, prefix, containers, singles) => {
    for (const [name, v] of Object.entries(mod)) {
      if (containers.includes(name) ? isObj(v) : looksLikeCurves(v)) {
        const base = containers.includes(name) ? prefix : `${prefix}.${name}`;
        for (const [k, c] of Object.entries(v)) checkCurve(`${base}.${k}`, c, { min: /co2|oxygen|diversity|luminosity|dayLength/i.test(k) ? 0 : -Infinity });
      } else if (singles.includes(name) || looksLikeCurve(v)) checkCurve(`${prefix}.${name}`, v, { min: /BIODIVERSITY|SEISMIC/.test(name) ? 0 : -Infinity });
    }
  };

  const atmo = await load('js/data/atmosphere.js');
  const planet = await load('js/data/planet.js');
  const glac = await load('js/data/glaciation.js');
  const seismic = await load('js/data/seismicActivity.js');
  const bio = await load('js/data/biodiversity.js');
  const look = await load('js/util/planetLook.js', { optional: true });
  const ts = await load('js/engine/timeScale.js');
  if (atmo) {
    checkExports(atmo, 'js/data/atmosphere.js', { getTemperatureAtTime: 'function', getOxygenAtTime: 'function', getCO2AtTime: 'function', ATMOSPHERE_CURVES: 'object', interpolateFromCurve: 'function' });
    curvesIn(atmo, 'atmosphere', ['ATMOSPHERE_CURVES'], []);
  }
  if (planet) {
    checkExports(planet, 'js/data/planet.js', { getMagmaFraction: 'function', getOceanChemistry: 'function', getVegetation: 'function', getGrasslandFraction: 'function',
      getDayLengthHours: 'function', getSolarLuminosity: 'function', getSeaLevelM: 'function', getClimateState: 'function', PLANET_CURVES: 'object' }, { isSeaLevelKnown: 'function' });
    curvesIn(planet, 'planet', ['PLANET_CURVES'], []);
  }
  if (glac) checkExports(glac, 'js/data/glaciation.js', { getGlaciation: 'function' });
  if (seismic) {
    checkExports(seismic, 'js/data/seismicActivity.js', { getSeismicActivityAtTime: 'function' });
    curvesIn(seismic, 'seismic', [], ['SEISMIC_CURVE']);
  }
  if (bio) {
    checkExports(bio, 'js/data/biodiversity.js', { estimatedDiversityKilo: 'function', formatDiversity: 'function' }, { BIODIVERSITY_CURVE: 'array' });
    curvesIn(bio, 'biodiversity', [], ['BIODIVERSITY_CURVE']);
    if (typeof bio.formatDiversity === 'function') {
      for (const k of [0, 0.0005, 1, 8700]) {
        try { if (!isStr(bio.formatDiversity(k))) err(`formatDiversity(${k}) must return a non-empty string`); }
        catch (e) { err(`formatDiversity(${k}) throws — ${describe(e)}`); }
      }
    }
  }

  // Accessors, sampled with the planet look at 30 samples per second of 1× playback (which is
  // finer than 2 Myr in every period) plus both ends of the story.
  const fn = (mod, name) => (mod && typeof mod[name] === 'function' ? mod[name] : null);
  const unit = (v) => inRange(v, 0, 1);
  const accessors = [
    ['getTemperatureAtTime', fn(atmo, 'getTemperatureAtTime'), isNum, 'a finite number'],
    ['getOxygenAtTime', fn(atmo, 'getOxygenAtTime'), (v) => inRange(v, 0, 100), 'a percentage'],
    ['getCO2AtTime', fn(atmo, 'getCO2AtTime'), (v) => isNum(v) && v >= 0, 'a number ≥ 0'],
    ['getSeismicActivityAtTime', fn(seismic, 'getSeismicActivityAtTime'), (v) => isNum(v) && v >= 0, 'a number ≥ 0'],
    ['estimatedDiversityKilo', fn(bio, 'estimatedDiversityKilo'), (v) => isNum(v) && v >= 0, 'a number ≥ 0'],
    ['getDayLengthHours', fn(planet, 'getDayLengthHours'), (v) => isNum(v) && v > 0, 'a number > 0'],
    ['getSolarLuminosity', fn(planet, 'getSolarLuminosity'), (v) => isNum(v) && v > 0, 'a number > 0'],
    ['getSeaLevelM', fn(planet, 'getSeaLevelM'), isNum, 'a finite number'],
    ['getVegetation', fn(planet, 'getVegetation'), unit, 'a fraction 0..1'],
    ['getGrasslandFraction', fn(planet, 'getGrasslandFraction'), unit, 'a fraction 0..1'],
    ['getMagmaFraction', fn(planet, 'getMagmaFraction'), unit, 'a fraction 0..1'],
    ['getOceanChemistry', fn(planet, 'getOceanChemistry'), (v) => isObj(v) && ['water', 'ferruginous', 'euxinic', 'oxygenated'].every((k) => unit(v[k])), '{ water, ferruginous, euxinic, oxygenated } fractions'],
    ['isSeaLevelKnown', fn(planet, 'isSeaLevelKnown'), (v) => typeof v === 'boolean', 'a boolean'],
  ].filter((a) => a[1]);
  const climate = fn(planet, 'getClimateState');
  const getGlaciation = fn(glac, 'getGlaciation');
  const getLook = look && checkExports(look, 'js/util/planetLook.js', { getPlanetLook: 'function', mixHex: 'function', hexAlpha: 'function' }) ? look.getPlanetLook : null;
  const temp = fn(atmo, 'getTemperatureAtTime');
  const atmoAt = (t) => (atmo ? { tempC: atmo.getTemperatureAtTime(t), o2Pct: fn(atmo, 'getOxygenAtTime')?.(t), co2Ppm: fn(atmo, 'getCO2AtTime')?.(t) } : undefined);
  if (!ts || typeof ts.screenSecondsToMa !== 'function') { info('skipped the accessor sweep: js/engine/timeScale.js did not load'); return; }

  // Sample times: 30 frames per second of real 1× playback, which — like the clock — lands on the
  // leading edge of each mass-extinction window and crawls through it at TIMING.extinctionSlowdown.
  const total = ts.totalScreenSeconds();
  const ext = await peek('js/data/extinctions.js');
  const windows = ext && Array.isArray(ext.extinctions) ? ext.extinctions.filter((e) => isObj(e) && isNum(e.timeMa) && e.durationMa > 0).map(win) : [];
  const inWindow = (t) => windows.some(([a, b]) => t <= a && t >= b);
  const timeList = [];
  for (let pos = 0; ;) {
    const t = ts.screenSecondsToMa(Math.min(total, pos));
    timeList.push(t);
    if (pos >= total) break;
    const slow = inWindow(t);
    pos += (slow ? TIMING.extinctionSlowdown : 1) / 30;
    if (!slow) {
      const next = ts.screenSecondsToMa(Math.min(total, pos));
      const edge = windows.map((w) => w[0]).filter((a) => a < t && a > next).sort((x, y) => y - x)[0];
      if (edge !== undefined) pos = ts.maToScreenSeconds(edge);
    }
  }
  const times = Float64Array.from(timeList);
  const N = times.length - 1;
  const bad = new Map(); // check name → { n, t, v, what }
  const fail = (name, t, v, what) => {
    const b = bad.get(name);
    if (b) b.n++;
    else bad.set(name, { n: 1, t, v, what });
  };
  const guard = (name, call, t) => {
    try { return call(); } catch (e) { fail(`${name} throws`, t, describe(e), null); return undefined; }
  };

  // continuity channels: key → { label, thr, unit, xs } (a colour is three channels, one label)
  const channels = new Map();
  const track = (key, i, v, thr, u = '', label = key) => {
    let ch = channels.get(key);
    if (!ch) { ch = { label, thr, unit: u, xs: new Float64Array(N + 1).fill(NaN) }; channels.set(key, ch); }
    ch.xs[i] = v;
  };
  const rgb = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  const trackColour = (name, i, hex) => { if (isHex(hex)) rgb(hex).forEach((v, k) => track(`${name}/${k}`, i, v, 24, '', name)); };
  // planet-look fields: hex strings and numbers up to two levels deep, found by looking at a few
  // moments (so new fields are checked as soon as they appear)
  let lookShape = null;
  if (getLook) {
    lookShape = { colours: new Set(), numbers: new Set() };
    for (const t of [START, times[Math.floor(N / 2)], 300, 0]) {
      const l = guard('getPlanetLook', () => getLook(t, atmoAt(t)), t);
      if (!isObj(l)) continue;
      for (const [k, v] of Object.entries(l)) {
        if (isHex(v)) lookShape.colours.add(k);
        else if (typeof v === 'number' && k !== 'timeMa') lookShape.numbers.add(k);
        else if (isObj(v)) for (const [k2, v2] of Object.entries(v)) {
          if (isHex(v2)) lookShape.colours.add(`${k}.${k2}`);
          else if (typeof v2 === 'number') lookShape.numbers.add(`${k}.${k2}`);
        }
      }
    }
  }
  const pick = (o, path) => path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
  // (the look's ice edges and opacity follow getGlaciation, which is tracked itself)
  const numberThreshold = (path) => (/^ice\./.test(path) ? null : /alpha|magma|water|vegetation|shelfWidth/i.test(path) ? [0.05, ''] : null);
  const numberRange = (path) => (/(^|\.)(north|south|seaNorth|seaSouth|landNorth|landSouth)$/.test(path) ? [-90, 90] : /alpha|magma|water|vegetation|snowball/i.test(path) ? [0, 1] : null);
  const glacFields = { northCapLatRadius: 'north ice cap', southCapLatRadius: 'south ice cap', seaNorth: 'north sea ice', seaSouth: 'south sea ice', landNorth: 'north ice sheet', landSouth: 'south ice sheet' };
  const magmaAt = fn(planet, 'getMagmaFraction');
  let iceOnMagma = null;

  for (let i = 0; i <= N; i++) {
    const t = times[i];
    for (const [name, f, ok, what] of accessors) {
      const v = guard(name, () => f(t), t);
      if (v !== undefined && !ok(v)) fail(name, t, v, what);
    }
    if (climate && temp) {
      const c = guard('getClimateState', () => climate(t, temp(t)), t);
      if (c !== undefined && !(isStr(c) || (isObj(c) && isStr(c.id) && isStr(c.label)))) fail('getClimateState', t, c, '{ id, label }');
    }
    if (getGlaciation) {
      const g = guard('getGlaciation', () => getGlaciation(t), t);
      if (g !== undefined) {
        if (!isObj(g) || !inRange(g.northCapLatRadius, 0, 90) || !inRange(g.southCapLatRadius, 0, 90) || !inRange(g.alpha, 0, 1)) fail('getGlaciation', t, g, '{ northCapLatRadius, southCapLatRadius ∈ [0, 90], alpha ∈ [0, 1] }');
        else {
          for (const [k, label] of Object.entries(glacFields)) if (k in g) {
            if (!inRange(g[k], 0, 90)) fail(`getGlaciation().${k}`, t, g[k], 'degrees ∈ [0, 90]');
            track(`glaciation.${k}`, i, g[k], 6, '°', label);
          }
          // Opacity is judged through the visible ice — extent × opacity, in degrees — so that a cap
          // fading in or out on its own is caught, while the opacity of a cap that grows fast but
          // smoothly may saturate within a frame or two. (With planetLook, the drawn ice is used.)
          if (!getLook) {
            track('glaciation.visibleNorth', i, g.northCapLatRadius * g.alpha, 6, '°', 'north ice extent × opacity');
            track('glaciation.visibleSouth', i, g.southCapLatRadius * g.alpha, 6, '°', 'south ice extent × opacity');
          }
          // legacy radius = the wider of sea and land ice
          if (['seaNorth', 'landNorth'].every((k) => isNum(g[k])) && Math.abs(g.northCapLatRadius - Math.max(g.seaNorth, g.landNorth)) > 1e-6) fail('getGlaciation() legacy north radius', t, g.northCapLatRadius, 'max(seaNorth, landNorth)');
          if (['seaSouth', 'landSouth'].every((k) => isNum(g[k])) && Math.abs(g.southCapLatRadius - Math.max(g.seaSouth, g.landSouth)) > 1e-6) fail('getGlaciation() legacy south radius', t, g.southCapLatRadius, 'max(seaSouth, landSouth)');
          if (magmaAt && magmaAt(t) > 0.25 && (g.northCapLatRadius > 0 || g.southCapLatRadius > 0) && !iceOnMagma) iceOnMagma = t;
        }
      }
    }
    if (getLook) {
      const l = guard('getPlanetLook', () => getLook(t, atmoAt(t)), t);
      if (!isObj(l)) { if (l !== undefined) fail('getPlanetLook', t, l, 'an object'); continue; }
      for (const path of lookShape.colours) {
        const v = pick(l, path);
        if (!isHex(v)) fail(`getPlanetLook().${path}`, t, v, '#rrggbb');
        else trackColour(path, i, v);
      }
      for (const lat of [0, 45, 75]) {
        const v = typeof l.landAt === 'function' ? guard('getPlanetLook().landAt', () => l.landAt(lat), t) : undefined;
        if (!isHex(v)) fail(`getPlanetLook().landAt(${lat})`, t, v, '#rrggbb');
        else trackColour(`land ${lat}°`, i, v);
      }
      if (!Array.isArray(l.landStops) || l.landStops.some((s) => !isObj(s) || !isHex(s.color))) fail('getPlanetLook().landStops', t, '(see the colours)', '[{ lat, color: #rrggbb }]');
      for (const path of lookShape.numbers) {
        const v = pick(l, path);
        const range = numberRange(path);
        if (!isNum(v) || (range && !inRange(v, range[0], range[1]))) { fail(`getPlanetLook().${path}`, t, v, range ? `a number in [${range}]` : 'a finite number'); continue; }
        const thr = numberThreshold(path);
        if (thr) track(`look.${path}`, i, v, thr[0], thr[1], `look.${path}`);
      }
      const ice = l.ice;
      if (isObj(ice) && isNum(ice.north) && isNum(ice.south) && isNum(ice.alpha)) {
        track('look.visibleNorth', i, (90 - ice.north) * ice.alpha, 6, '°', 'north ice extent × opacity');
        track('look.visibleSouth', i, (90 + ice.south) * ice.alpha, 6, '°', 'south ice extent × opacity');
      }
    }
  }
  for (const [name, b] of bad) {
    if (b.what === null) err(`${name} at ${b.n} of ${N + 1} samples (first at ${fmtMa(b.t)} Ma: ${b.v})`);
    else err(`${name} is not ${b.what} at ${b.n} of ${N + 1} samples (first at ${fmtMa(b.t)} Ma: ${fmtVal(b.v)})`);
  }
  if (iceOnMagma !== null) warn(`getGlaciation draws ice during the magma ocean (e.g. at ${fmtMa(iceOnMagma)} Ma)`);
  info(`${accessors.length + (climate ? 1 : 0) + (getGlaciation ? 1 : 0) + (getLook ? 1 : 0)} accessors sampled ${N + 1} times (30 per second of playback) across the whole timeline`);

  // Continuity: a step larger than the channel's threshold between consecutive frames is a snap
  // when it is not part of a ramp — i.e. it carries more than 40 % of the change across the
  // surrounding 7 frames. A ramp spread over ≥ 3 frames (the brief's "spans several frames": a
  // snowball onset over ~1.5 Myr) passes; a one- or two-frame jump or a flicker does not.
  if (!channels.size) return;
  const snaps = [];
  for (const ch of channels.values()) {
    const xs = ch.xs;
    for (let i = 1; i <= N; i++) {
      const d = Math.abs(xs[i] - xs[i - 1]);
      if (!(d > ch.thr)) continue; // NaN: reported above
      const D = Math.abs(xs[Math.min(N, i + 3)] - xs[Math.max(0, i - 4)]);
      if (!(d <= 0.4 * D)) snaps.push({ i, name: ch.label, d, thr: ch.thr, unit: ch.unit });
    }
  }
  if (!snaps.length) { info('planet colours and ice edges are continuous at 30 fps across the whole story'); return; }
  // Snaps within 4 frames of each other form one episode; it is described by its two most severe
  // channels (step relative to the channel's threshold).
  snaps.sort((x, y) => x.i - y.i);
  const episodes = [];
  for (const s of snaps) {
    let ep = episodes[episodes.length - 1];
    if (!ep || s.i - ep.i1 > 4) { ep = { i0: s.i, i1: s.i, worst: 0, channels: new Map() }; episodes.push(ep); }
    ep.i1 = s.i;
    const prev = ep.channels.get(s.name);
    if (!prev || s.d > prev.d) ep.channels.set(s.name, s);
    ep.worst = Math.max(ep.worst, s.d / s.thr);
  }
  const MAX_LISTED = 15;
  const listed = episodes.length <= MAX_LISTED ? episodes
    : [...episodes].sort((x, y) => y.worst - x.worst).slice(0, MAX_LISTED).sort((x, y) => x.i0 - y.i0);
  const fmtStep = (s) => (s.unit === '°' ? `${s.d.toFixed(1)}°` : s.thr < 1 ? s.d.toFixed(2) : String(Math.round(s.d)));
  const fmtEp = (ep) => {
    const top = [...ep.channels.values()].sort((x, y) => y.d / y.thr - x.d / x.thr);
    const more = top.length > 2 ? `, +${top.length - 2}` : '';
    return `${fmtMa(times[ep.i0])} Ma (${top.slice(0, 2).map((s) => `${s.name} Δ${fmtStep(s)}`).join(', ')}${more})`;
  };
  warn(`planet look jumps between consecutive frames in ${plural(episodes.length, 'episode')}: ${listed.map(fmtEp).join(', ')}${episodes.length > MAX_LISTED ? `, … and ${episodes.length - MAX_LISTED} smaller ones` : ''} — ramps must span several frames at 30 fps (≤ 6° of ice edge, ≤ 24 per colour channel per frame otherwise)`);
}

// ------------------------------------------------------------------------------------------
// geometry: continents, plate boundaries, paleogeography, marker placement
// ------------------------------------------------------------------------------------------
async function checkGeometry() {
  const interp = await load('js/engine/interpolator.js');
  const bInterp = await load('js/engine/plateBoundaryInterpolator.js');
  const paleo = await load('js/data/paleogeography.js', { optional: true });
  const geo = await load('js/engine/geo.js');
  const continents = await load('js/data/continents.js');
  const interpOk = interp && checkExports(interp, 'js/engine/interpolator.js', { getPolygonsAtTime: 'function', plateToWorld: 'function', findPlateAt: 'function', getKinematicRangeMa: 'function' });
  const geoOk = geo && checkExports(geo, 'js/engine/geo.js', { pointInPolygon: 'function', isLand: 'function', isSeamEdge: 'function', inferHabitat: 'function', placeSpecies: 'function' });
  if (bInterp) checkExports(bInterp, 'js/engine/plateBoundaryInterpolator.js', { getBoundariesAtTime: 'function' });
  if (continents && Array.isArray(continents.plates)) {
    const plateIds = new Set(continents.plates.filter(isObj).map((p) => p.id));
    for (const id of PLATE_IDS) if (!plateIds.has(id)) err(`js/data/continents.js has no plate "${id}" (a canonical anchor plate)`);
  }

  // problems are counted per kind and reported once, with the first example
  const issues = new Map();
  const issue = (key, example) => { const v = issues.get(key); if (v) v.n++; else issues.set(key, { n: 1, example }); };
  let maxVerts = 0;
  let checked = 0;
  if (interpOk) {
    for (let t = 0; t <= START; t += (t < 600 ? 3 : 20)) {
      let polys;
      try { polys = interp.getPolygonsAtTime(t); } catch (e) { issue('getPolygonsAtTime throws', `at ${t} Ma: ${describe(e)}`); continue; }
      if (!Array.isArray(polys)) { issue('getPolygonsAtTime does not return an array', `at ${t} Ma`); continue; }
      let verts = 0;
      const ids = new Set();
      for (const p of polys) {
        if (!isObj(p) || !isStr(p.id) || !Array.isArray(p.vertices)) { issue('a polygon without id or vertices', `at ${t} Ma`); continue; }
        if (ids.has(p.id)) issue('duplicate polygon ids in one frame', `${p.id} at ${t} Ma`);
        ids.add(p.id);
        verts += p.vertices.length;
        if (p.vertices.length < 3) issue('a polygon with fewer than 3 vertices', `${p.id} at ${t} Ma`);
        if (p.vertices.some((v) => !Array.isArray(v) || !coordOk(v[0], v[1]))) issue('an out-of-range or NaN vertex', `${p.id} at ${t} Ma`);
        if (p.labelAt != null && (!Array.isArray(p.labelAt) || !coordOk(p.labelAt[0], p.labelAt[1]))) issue('an invalid labelAt', `${p.id} at ${t} Ma`);
        if (!isHex(p.color)) issue('a colour that is not #rrggbb', `${p.id} (${fmtVal(p.color)}) at ${t} Ma`);
        if (p.name != null && typeof p.name !== 'string') issue('a name that is not a string', `${p.id} at ${t} Ma`);
        if (p.labelRank != null && !(isNum(p.labelRank) && p.labelRank >= 0)) issue('a labelRank that is not a number ≥ 0', `${p.id} at ${t} Ma`);
      }
      maxVerts = Math.max(maxVerts, verts);
      checked++;
    }
    for (const [key, v] of issues) err(`getPolygonsAtTime: ${key} — ${v.n} time${v.n === 1 ? '' : 's'}, first ${v.example}`);
    info(`continents sampled at ${checked} times; max ${maxVerts} vertices in a frame`);
    if (maxVerts > 6000) warn(`a frame has ${maxVerts} continent vertices — the renderers budget for ≤ ~4500`);
  }
  if (bInterp && typeof bInterp.getBoundariesAtTime === 'function') {
    for (let t = 0; t <= START; t += (t < 600 ? 5 : 25)) {
      let bs;
      try { bs = bInterp.getBoundariesAtTime(t); } catch (e) { err(`getBoundariesAtTime(${t}) threw: ${describe(e)}`); break; }
      if (!Array.isArray(bs)) { err(`getBoundariesAtTime(${t}) did not return an array`); break; }
      const badOne = bs.find((b) => !isObj(b) || !['divergent', 'convergent', 'transform'].includes(b.type) || !Array.isArray(b.vertices) || b.vertices.some((v) => !Array.isArray(v) || !coordOk(v[0], v[1])));
      if (badOne) { err(`getBoundariesAtTime(${t}): boundary ${isObj(badOne) ? badOne.id : badOne} has an invalid type or vertex`); break; }
    }
  }

  if (paleo) {
    const file = 'js/data/paleogeography.js';
    checkExports(paleo, file, { getOceanLabelsAt: 'function', getFeaturesAt: 'function' }, { getLandLabelsAt: 'function', getMigrationsAt: 'function' });
    const unit = (v) => v === undefined || inRange(v, 0, 1);
    const plateOk = (o) => o.plateId === undefined || PLATE_IDS.includes(o.plateId);
    const pathOk = (path, min) => Array.isArray(path) && path.length >= min && path.every((v) => Array.isArray(v) && coordOk(v[0], v[1]));
    const label = (o) => isStr(o.name) && coordOk(o.lon, o.lat) && (o.size === undefined || [1, 2, 3].includes(o.size)) && unit(o.opacity) && plateOk(o);
    const shapes = {
      getOceanLabelsAt: [label, '{ name, lon, lat, size 1|2|3, opacity 0..1 }'],
      getLandLabelsAt: [(o) => label(o) && (o.subtitle === undefined || typeof o.subtitle === 'string'), '{ name, subtitle?, lon, lat, size 1|2|3, opacity 0..1 }'],
      getFeaturesAt: [(o) => isStr(o.name) && (coordOk(o.lon, o.lat) || pathOk(o.path, 2)) && (o.path === undefined || pathOk(o.path, 2)) && unit(o.opacity) && unit(o.progress) && unit(o.intensity) && plateOk(o), '{ name, lon/lat or path, opacity/progress 0..1 }'],
      getMigrationsAt: [(o) => isStr(o.name) && pathOk(o.path, 2) && unit(o.opacity) && unit(o.progress), '{ name, path [[lon, lat], …], progress/opacity 0..1 }'],
    };
    for (const [name, [ok, shape]] of Object.entries(shapes)) {
      if (typeof paleo[name] !== 'function') continue;
      let problem = null;
      let n = 0;
      for (let t = 0; t <= START; t += (t < 600 ? 4 : 30)) {
        let items;
        try { items = paleo[name](t); } catch (e) { problem ||= `throws at ${t} Ma: ${describe(e)}`; n++; continue; }
        if (!Array.isArray(items)) { problem ||= `returns ${fmtVal(items)} at ${t} Ma, not an array`; n++; continue; }
        const badItem = items.find((o) => !isObj(o) || !ok(o));
        if (badItem) { problem ||= `returns ${JSON.stringify(badItem)?.slice(0, 160)} at ${t} Ma`; n++; }
      }
      if (problem) err(`${name}: items must be ${shape}; ${n} sampled time${n === 1 ? '' : 's'} fail, first ${problem}`);
    }

    // Placement: names in the right water or on the right land, and few enough to read. Sampled
    // every 2 Ma back to 600 Ma, every 20 Ma before that, and 600 moments evenly spread over the
    // playback (which is what reaches the Quaternary). Gateways and features the data marks as
    // marine are allowed at sea.
    const ts = await peek('js/engine/timeScale.js');
    if (interpOk && geoOk && typeof paleo.getOceanLabelsAt === 'function') {
      const times = new Set();
      for (let t = 0; t <= 600; t += 2) times.add(t);
      for (let t = 620; t <= START; t += 20) times.add(t);
      if (ts && typeof ts.screenSecondsToMa === 'function' && typeof ts.totalScreenSeconds === 'function') {
        const total = ts.totalScreenSeconds();
        for (let k = 0; k <= 600; k++) times.add(+ts.screenSecondsToMa((total * k) / 600).toFixed(6));
      }
      const marine = new Set((paleo.paleoData && Array.isArray(paleo.paleoData.features) ? paleo.paleoData.features : []).filter((f) => isObj(f) && (f.marine || f.type === 'gateway')).map((f) => f.id));
      const fails = new Map();
      const fail = (kind, example) => { const v = fails.get(kind); if (v) v.n++; else fails.set(kind, { n: 1, example }); };
      const dist = (a, b) => {
        const r = Math.PI / 180;
        const s = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2;
        return 2 * Math.asin(Math.min(1, Math.sqrt(s))) / r;
      };
      let maxOceans = 0, maxFeatures = 0;
      for (const t of times) {
        let polys, oceans, lands, features;
        try {
          polys = interp.getPolygonsAtTime(t);
          oceans = paleo.getOceanLabelsAt(t) || [];
          lands = typeof paleo.getLandLabelsAt === 'function' ? paleo.getLandLabelsAt(t) || [] : [];
          features = paleo.getFeaturesAt(t) || [];
        } catch { continue; }   // a throwing accessor is reported by the shape check above
        if (!Array.isArray(polys) || !polys.length) continue;
        const shown = oceans.filter((o) => isObj(o) && (o.opacity ?? 1) > 0.05);
        maxOceans = Math.max(maxOceans, shown.length);
        maxFeatures = Math.max(maxFeatures, features.length);
        for (const o of shown) if (geo.isLand(o.lon, o.lat, polys)) fail('an ocean name on land', `${o.id} at ${fmtMa(t)} Ma`);
        for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
          if (dist(shown[i], shown[j]) < 12) fail('two ocean names closer than 12°', `${shown[i].id} / ${shown[j].id} at ${fmtMa(t)} Ma`);
        }
        for (const l of lands) if (isObj(l) && (l.opacity ?? 1) > 0.05 && !geo.isLand(l.lon, l.lat, polys)) fail('a land name at sea', `${l.id} at ${fmtMa(t)} Ma`);
        for (const f of features) if (isObj(f) && coordOk(f.lon, f.lat) && !marine.has(f.id) && !geo.isLand(f.lon, f.lat, polys)) fail('a land feature at sea', `${f.id} at ${fmtMa(t)} Ma`);
      }
      for (const [kind, v] of fails) warn(`paleogeography: ${kind} — ${plural(v.n, 'sample')}, first ${v.example}`);
      if (maxOceans > 7) warn(`paleogeography: ${maxOceans} ocean names at once (keep ≤ 7)`);
      if (maxFeatures > 8) warn(`paleogeography: ${maxFeatures} features at once (keep ≤ 8)`);
      info(`paleogeography placement checked at ${times.size} moments; at most ${maxOceans} ocean names and ${maxFeatures} features at once`);
    }
  }

  // Craton lineages (continents.js section 4): well-formed, and every id a deep-time continent.
  if (continents && continents.cratonLineages !== undefined) {
    const list = continents.cratonLineages;
    const deepIds = new Set();
    for (const s of Array.isArray(continents.deepSlices) ? continents.deepSlices : []) for (const c of (isObj(s) && Array.isArray(s.continents) ? s.continents : [])) if (isObj(c)) deepIds.add(c.id);
    if (!Array.isArray(list)) err('js/data/continents.js: cratonLineages must be an array');
    else for (const c of list) {
      const tag = `cratonLineages ${isObj(c) ? c.id : fmtVal(c)}`;
      if (!isObj(c) || !isStr(c.id) || !isStr(c.name)) { err(`${tag}: needs an id and a name`); continue; }
      if (!Array.isArray(c.centre) || !coordOk(c.centre[0], c.centre[1])) err(`${tag}: centre must be [lon, lat]`);
      if (!(isNum(c.radiusDeg) && c.radiusDeg > 0 && c.radiusDeg <= 30)) err(`${tag}: radiusDeg must be in (0, 30]`);
      if (!Array.isArray(c.lineage) || !c.lineage.length) err(`${tag}: lineage must list deep-time continent ids`);
      else for (const id of c.lineage) if (!deepIds.has(id)) err(`${tag}: "${id}" is not a continent of any deep-time slice`);
    }
  }

  // Event sites: an extinction epicentre or a milestone place given with a plate is carried back in
  // time by plateToWorld. At its event it should be on land, or near enough that the globe's ping,
  // which settles on the nearest shore, stays on the right landmass.
  if (interpOk && geoOk && typeof geo.nearestCoast === 'function') {
    const ext = await peek('js/data/extinctions.js');
    const ms = await peek('js/data/milestones.js');
    const sites = [];
    for (const e of (ext && Array.isArray(ext.extinctions) ? ext.extinctions : [])) if (isObj(e) && isObj(e.epicenter)) sites.push([`extinction ${e.id}`, e.timeMa, e.epicenter]);
    for (const m of (ms && Array.isArray(ms.milestones) ? ms.milestones : [])) if (isObj(m) && isObj(m.location)) sites.push([`milestone ${m.id}`, m.timeMa, m.location]);
    const far = [];
    let n = 0;
    for (const [tag, t, p] of sites) {
      if (!isNum(t) || !isStr(p.plateId) || !coordOk(p.lon, p.lat)) continue;
      const at = interp.plateToWorld(p.plateId, p.lon, p.lat, t);
      const polys = interp.getPolygonsAtTime(t);
      if (!at || !Array.isArray(polys) || !polys.length) continue;   // no land yet: nothing to stand on
      n++;
      if (geo.isLand(at[0], at[1], polys)) continue;
      const shore = geo.nearestCoast(at[0], at[1], polys);
      if (shore && shore.distanceDeg > 4) far.push(`${tag} (${p.name || 'site'}) at ${fmtMa(t)} Ma is ${shore.distanceDeg.toFixed(1)}° out to sea`);
    }
    if (far.length) warn(`${plural(far.length, 'event site')} far from land at the event: ${sample(far)}`);
    info(`${n} plate-anchored event sites checked at their event times`);
  }

  // Marker placement: every entry at its first appearance, its peak and its last moment, each
  // moment placed afresh (as after a jump). Markers must be finite and on their habitat's surface.
  if (interpOk && geoOk) {
    const speciesMod = await peek('js/data/species.js');
    if (!speciesMod || !Array.isArray(speciesMod.species) || typeof speciesMod.getSpeciesAtTime !== 'function') { info('skipped the marker-placement check: js/data/species.js did not load'); return; }
    const byId = new Map();
    const moments = new Map(); // Ma → ids to check
    for (const s of speciesMod.species) {
      if (!isObj(s) || !isNum(s.appearanceMa)) continue;
      byId.set(s.id, s);
      const end = isNum(s.extinctMa) ? s.extinctMa : 0;
      const prof = Array.isArray(s.abundanceProfile) ? s.abundanceProfile.filter((p) => Array.isArray(p) && isNum(p[0]) && isNum(p[1])) : [];
      const peak = prof.length ? prof.reduce((x, y) => (y[1] > x[1] ? y : x))[0] : s.appearanceMa;
      for (const t of new Set([s.appearanceMa, Math.min(s.appearanceMa, Math.max(end, peak)), end])) {
        if (!moments.has(t)) moments.set(t, new Set());
        moments.get(t).add(s.id);
      }
    }
    const invalid = [];
    const wrong = [];
    const thrown = [];
    let n = 0;
    for (const t of [...moments.keys()].sort((x, y) => y - x)) {
      let polys;
      let pos;
      try {
        polys = interp.getPolygonsAtTime(t);
        geo.placeSpecies([], polys, t + 1000); // forget the previous frame's hysteresis and glides
        pos = geo.placeSpecies(speciesMod.getSpeciesAtTime(t), polys, t);
      } catch (e) { thrown.push(`${fmtMa(t)} Ma: ${describe(e)}`); continue; }
      for (const id of moments.get(t)) {
        n++;
        const p = pos instanceof Map ? pos.get(id) : undefined;
        if (!isObj(p) || !coordOk(p.lon, p.lat)) { invalid.push(`${id} at ${fmtMa(t)} Ma (${p ? `${p.lon}, ${p.lat}` : 'none'})`); continue; }
        const wantLand = geo.inferHabitat(byId.get(id)) === 'land';
        if (Array.isArray(polys) && polys.length && geo.isLand(p.lon, p.lat, polys) !== wantLand) wrong.push(`${id} at ${fmtMa(t)} Ma (${wantLand ? 'land entry at sea' : 'marine entry on land'})`);
      }
    }
    if (thrown.length) err(`placeSpecies throws at ${thrown.length} of ${moments.size} moments, first at ${thrown[0]}`);
    if (invalid.length) err(`placeSpecies gives no or an invalid position for ${invalid.length} of ${n} (entry, moment) samples: ${sample(invalid)}`);
    if (wrong.length) warn(`placeSpecies puts ${wrong.length} of ${n} (entry, moment) samples on the wrong surface for their habitat: ${sample(wrong)}`);
    info(`marker placement checked for ${byId.size} entries at ${moments.size} moments (first appearance, peak, last moment)`);
  }
}

// ------------------------------------------------------------------------------------------
// capture pipeline catalogue
// ------------------------------------------------------------------------------------------
async function checkCapture() {
  const file = 'scripts/capture/sequences.js';
  const seq = await load(file, { optional: true });
  if (!seq) return;
  checkExports(seq, file, { sequences: 'array', modalShowcases: 'array', stills: 'array' });
  const speciesMod = await peek('js/data/species.js');
  const speciesById = new Map();
  if (speciesMod && Array.isArray(speciesMod.species)) for (const s of speciesMod.species) if (isObj(s)) speciesById.set(s.id, s);
  const ext = await peek('js/data/extinctions.js');
  const activeAt = (t) => {
    try { return ext && typeof ext.getActiveExtinction === 'function' ? ext.getActiveExtinction(t) : null; } catch { return null; } // reported by its own section
  };
  const clockMod = await peek('js/engine/clock.js');
  const skipped = [!speciesMod && 'the species references (js/data/species.js)', !ext && 'the extinction-window checks (js/data/extinctions.js)',
    !(clockMod && typeof clockMod.GeoClock === 'function') && 'the clip-length simulation (js/engine/clock.js)'].filter(Boolean);
  if (skipped.length) info(`skipped ${skipped.join(', ')}: did not load`);
  const { minSpeed = 0.25, maxSpeed = 4 } = TIMING;
  const sequences = Array.isArray(seq.sequences) ? seq.sequences : [];
  const modals = Array.isArray(seq.modalShowcases) ? seq.modalShowcases : [];
  const stills = Array.isArray(seq.stills) ? seq.stills : [];

  const ids = new Set();
  const orders = new Set();
  let simulate = !!(clockMod && typeof clockMod.GeoClock === 'function');
  eachEntry(sequences, (s, i) => `sequence ${tagOf(s, i)}`, (s, i, tag) => {
    if (!isStr(s.id)) err(`${tag}: missing id`);
    else if (ids.has(s.id)) err(`${tag}: duplicate id`);
    ids.add(s.id);
    if (!Number.isInteger(s.order) || s.order < 1) err(`${tag}: order must be a positive integer`);
    else if (orders.has(s.order)) err(`${tag}: order ${s.order} is used twice`);
    orders.add(s.order);
    if (!VIEWS.includes(s.view)) err(`${tag}: view "${s.view}" must be ${VIEWS.join(' | ')}`);
    if (!PANELS.includes(s.panel)) err(`${tag}: panel "${s.panel}" must be ${PANELS.join(' | ')}`);
    if (!(isNum(s.startMa) && isNum(s.endMa) && s.startMa <= START && s.endMa >= 0 && s.startMa > s.endMa)) { err(`sequence "${s.id}": ${s.startMa} → ${s.endMa} is outside the timeline`); return; }
    if (s.speed !== undefined && !inRange(s.speed, minSpeed, maxSpeed)) err(`${tag}: speed ${fmtVal(s.speed)} must be within ${minSpeed}–${maxSpeed} (the clock clamps it)`);
    for (const k of ['holdSec', 'tailMs']) if (s[k] !== undefined && !(isNum(s[k]) && s[k] >= 0)) err(`${tag}: ${k} must be a number ≥ 0`);
    for (const k of ['maxSec', 'sweepSec']) if (s[k] !== undefined && !(isNum(s[k]) && s[k] > 0)) err(`${tag}: ${k} must be a number > 0`);
    for (const k of ['width', 'height']) if (!(Number.isInteger(s[k]) && s[k] > 0)) err(`${tag}: ${k} must be a positive integer`);
    if (s.posterAt !== undefined && !inRange(s.posterAt, 0, 1)) err(`${tag}: posterAt must be within 0..1`);
    if (s.posterMa !== undefined) {
      if (!inRange(s.posterMa, 0, START)) err(`${tag}: posterMa ${fmtVal(s.posterMa)} is outside the timeline`);
      else if (s.posterMa > s.startMa || s.posterMa < s.endMa) warn(`${tag}: posterMa ${s.posterMa} is outside the clip (${s.startMa} → ${s.endMa})`);
      else if (activeAt(s.posterMa)) info(`${tag}: the poster (${s.posterMa} Ma) is inside the ${activeAt(s.posterMa).id} window`);
    }
    if (s.sweep) return;
    if (activeAt(s.startMa)) warn(`${tag}: starts inside the ${activeAt(s.startMa).id} window, so no extinction hold fires`);
    // Expected length: the app's own clock at 60 ticks per second with this hold and speed.
    if (simulate) {
      const cap = s.maxSec ?? 30;
      const savedHold = TIMING.extinctionPauseSeconds;
      let played = 0;
      try {
        TIMING.extinctionPauseSeconds = s.holdSec ?? 3.5;
        const c = new clockMod.GeoClock();
        c.setTime(s.startMa);
        c.setSpeed(s.speed || 1);
        c.play();
        while (c.currentTimeMa > s.endMa && c.playing && played <= cap + 5) { c.tick(1 / 60); played += 1 / 60; }
      } catch (e) {
        simulate = false; // the clock's own data is broken: that is reported by its section
        info(`skipped the clip-length simulation: the clock throws — ${describe(e)}`);
        return;
      } finally { TIMING.extinctionPauseSeconds = savedHold; }
      if (played > cap) err(`${tag}: needs ${played > cap + 5 ? `over ${cap + 5}` : played.toFixed(1)} s to reach ${s.endMa} Ma but maxSec is ${cap} — the clip would be cut short`);
      else if (played < 4) warn(`${tag}: plays for only ${played.toFixed(1)} s`);
    }
  });

  const modalIds = new Set();
  eachEntry(modals, (m, i) => `modal ${tagOf(m, i)}`, (m, i, tag) => {
    if (!isStr(m.id) || modalIds.has(m.id)) err(`${tag}: missing or duplicate id`);
    modalIds.add(m.id);
    if (!isNum(m.atMa) || m.atMa < 0 || m.atMa > START) err(`${tag}: atMa ${fmtVal(m.atMa)} must be a time on the timeline`);
    else if (activeAt(m.atMa)) warn(`${tag}: ${m.atMa} Ma is inside the ${activeAt(m.atMa).id} window — the extinction staging competes with the dialog`);
    if (!speciesMod) return;
    const sp = speciesById.get(m.speciesId);
    if (!sp) { err(`modal showcase "${m.id}" references unknown species "${m.speciesId}"`); return; }
    if (isNum(m.atMa) && !(m.atMa <= sp.appearanceMa && m.atMa >= (sp.extinctMa ?? 0))) warn(`${tag}: ${m.speciesId} is not alive at ${m.atMa} Ma (${sp.appearanceMa}–${sp.extinctMa ?? 0} Ma)`);
  });

  const stillIds = new Set();
  eachEntry(stills, (s, i) => `still ${tagOf(s, i)}`, (s, i, tag) => {
    if (!isStr(s.id) || stillIds.has(s.id)) err(`${tag}: missing or duplicate id`);
    stillIds.add(s.id);
    if (!isStr(s.out)) err(`${tag}: missing out`);
    if (typeof s.query !== 'string') { err(`${tag}: query must be a string`); return; }
    const q = new URLSearchParams(s.query);
    if (q.has('view') && !VIEWS.includes(q.get('view'))) err(`${tag}: view=${q.get('view')} must be ${VIEWS.join(' | ')}`);
    if (!q.has('t')) return;
    const t = Number(q.get('t'));
    if (!inRange(t, 0, START)) { err(`${tag}: t=${q.get('t')} is not a time on the timeline`); return; }
    if (q.get('play') === '1' && activeAt(t)) warn(`${tag}: ?t=${t}&play=1 starts inside the ${activeAt(t).id} window, so no extinction hold fires`);
  });
  info(`${sequences.length} capture sequences, ${modals.length} modal showcases, ${stills.length} stills`);
}

// ------------------------------------------------------------------------------------------
// imports: every named import between app modules names an export of its target
// (static: no module is executed, so the DOM-bound UI code is covered too)
// ------------------------------------------------------------------------------------------
async function checkImports() {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (name === 'node_modules' || name.startsWith('.')) continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.m?js$/.test(name)) files.push(p);
    }
  };
  walk(join(ROOT, 'js'));
  let named = 0;
  for (const f of files) {
    for (const imp of parseModule(f).imports) {
      if (!imp.target) continue; // a bare specifier (the import map)
      const where = `${relPath(f)}:${imp.line}`;
      if (!existsSync(imp.target)) { err(`${where} imports ${imp.spec}, which does not exist`); continue; }
      const available = exportsOf(imp.target);
      for (const n of imp.names) {
        named++;
        if (!available.has(n)) err(`${where} imports ${n === 'default' ? 'the default export' : `{ ${n} }`} from ${relPath(imp.target)}, which does not export it`);
      }
    }
  }
  info(`${named} named imports across ${files.length} modules checked`);
}

// ------------------------------------------------------------------------------------------
await runSection('timeline', checkTimeline);
await runSection('phylogeny', checkPhylogeny);
await runSection('species', checkSpecies);
await runSection('extinctions', checkExtinctions);
await runSection('milestones', checkMilestones);
await runSection('chapters', checkChapters);
await runSection('curves', checkCurves);
await runSection('geometry', checkGeometry);
await runSection('capture', checkCapture);
await runSection('imports', checkImports);

console.log(`\n${plural(errors, 'error')}, ${plural(warnings, 'warning')}`);
process.exit(errors > 0 || (STRICT && warnings > 0) ? 1 : 0);
