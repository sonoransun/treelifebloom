// Life & planet panel — "what is the planet like right now, and who is alive?"
//
//   Now tab    Planet vitals (six instrument cards: value, comparison with today, sparkline of the
//              whole story — point at a sparkline to read any moment, click to travel there),
//              three state words (climate, tectonics, estimated species), the share of each life
//              group among the living, the ranked list of dominant life, and a strip naming what
//              just arrived and what was just lost.
//   Index tab  Every entry in the dataset: searchable, grouped by life group, oldest first
//              (built lazily the first time the tab is opened).
//
// update(frame) runs every animation frame. Only bookkeeping, the sparkline playheads and the
// hover highlight are per-frame; everything that writes text or touches layout is throttled to
// TIMING.sidebarUpdateIntervalMs and written only when the formatted value actually changed.
// Rows are keyed by species id and never rebuilt: reordering is a FLIP animation.
//
// Bus: emits 'species:hover', 'species:open', 'time:seek' and (to close the narrow-screen drawer)
// 'panel:toggle'; listens to 'panel:close-all'. Every clickable species element carries data-id.

import { ATMOSPHERE, LIFE_GROUPS, TIMING, getCategoryInfo } from '../config.js';
// Data modules are imported as namespaces: some exports are being added concurrently, and a
// missing optional export must degrade to "no reading", never to a broken module graph.
import * as atmosphere from '../data/atmosphere.js';
import * as planet from '../data/planet.js';
import * as seismic from '../data/seismicActivity.js';
import * as biodiversity from '../data/biodiversity.js';
import * as catalogue from '../data/species.js';
import * as timeline from '../data/timeline.js';
import { maToScreenSeconds, screenSecondsToMa } from '../engine/timeScale.js';
import { formatInt, formatMa, formatRange, formatRatio, formatYearsAgo } from '../util/format.js';
import { Sparkline } from './sparkline.js';

const TOP_N = 12;               // rows in the "dominant life" ranking
const NEW_BADGE_SEC = 4;        // how long a row wears its "new" badge
const EVENT_CHIP_SEC = 6;       // lifetime of a "just arrived" / "just lost" chip
const EVENT_FADE_SEC = 1.5;     // …of which the last part is the fade-out
const EVENT_MAX_CHIPS = 40;     // per kind; beyond this the oldest make way (bounds the DOM at 4×)
const TREND_LOOKBACK_SEC = 1;   // compare abundance with one second of playback earlier
const TREND_THRESHOLD = 0.02;   // …and call it a trend only when it clearly moved
const NARROW_QUERY = '(max-width: 900px)'; // the panel is a drawer / bottom sheet below this
const SPARK_HEIGHT = 26;         // CSS px; matches .sb-vital-spark in css/sidebar.css

const MINUS = '\u2212';
const SVG_NS = 'http://www.w3.org/2000/svg';
const EMPTY = [];

// ---------------------------------------------------------------------------------------------
// Small DOM helpers
// ---------------------------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** Stroke icon from a path on a 16-unit grid. */
function icon(d, className = 'sb-icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  return svg;
}

const ICONS = {
  dagger: 'M8 2v12M4.5 5.5h7',
  chevron: 'M4 6l4 4 4-4',
  close: 'M4 4l8 8M12 4l-8 8',
  search: 'M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM14 14l-3.4-3.4',
  down: 'M8 3v10M4 9l4 4 4-4',
};

function fold(text) {
  return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Write `text` into `node`, wrapping the first occurrence of the (folded) query in <mark>. */
function writeMarked(node, text, query) {
  const folded = fold(text);
  const at = query && folded.length === text.length ? folded.indexOf(query) : -1;
  if (at < 0) {
    if (node.childElementCount) node.textContent = text;
    return;
  }
  node.replaceChildren(
    text.slice(0, at),
    el('mark', 'sb-mark', text.slice(at, at + query.length)),
    text.slice(at + query.length),
  );
}

// ---------------------------------------------------------------------------------------------
// Family glyphs — every life group has its own marker shape, so colour is never the only cue.
// js/views/glyphs.js (shared with the map, globe and legend) is used when it is present; until
// it loads, or if it is missing, the local shapes below stand in with the same signature.
// ---------------------------------------------------------------------------------------------

const GLYPH_SHAPES = {
  dot: '<circle cx="8" cy="8" r="5"/>',
  ring: '<circle cx="8" cy="8" r="4.3" fill="none" stroke="currentColor" stroke-width="2.4"/>',
  leaf: '<path d="M8 1.6C12.8 4.4 13.2 10 8 14.4 2.8 10 3.2 4.4 8 1.6z"/>',
  star: '<path d="M8 1.4l1.9 4.1 4.5.5-3.3 3.1.9 4.4L8 11.3l-4 2.2.9-4.4L1.6 6l4.5-.5z"/>',
  hex: '<path d="M8 1.8l5.4 3.1v6.2L8 14.2l-5.4-3.1V4.9z"/>',
  oval: '<ellipse cx="8" cy="8" rx="6.6" ry="4.2"/>',
  triangle: '<path d="M8 2.2l6.2 10.9H1.8z"/>',
  square: '<rect x="2.8" y="2.8" width="10.4" height="10.4" rx="1.6"/>',
};

function localGlyphSvg(glyph, color, size = 14) {
  const shape = GLYPH_SHAPES[glyph] || GLYPH_SHAPES.dot;
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor" style="color:${color}" aria-hidden="true">${shape}</svg>`;
}

let glyphSvg = localGlyphSvg;
const glyphTemplates = new Map();

function fillGlyph(holder) {
  const { glyph, color, size } = holder.dataset;
  const key = `${glyph}|${color}|${size}`;
  let template = glyphTemplates.get(key);
  if (!template) {
    let markup = null;
    try {
      markup = glyphSvg(glyph, color, Number(size));
    } catch {
      markup = null;
    }
    if (typeof markup !== 'string' || !markup.includes('<svg')) markup = localGlyphSvg(glyph, color, Number(size));
    template = document.createElement('template');
    template.innerHTML = markup; // generated markup (shape + config colour), never data strings
    glyphTemplates.set(key, template);
  }
  holder.replaceChildren(template.content.cloneNode(true));
}

function glyphEl(glyph, color, size = 14) {
  const holder = el('span', 'sb-glyph');
  holder.setAttribute('aria-hidden', 'true');
  holder.dataset.glyph = glyph;
  holder.dataset.color = color;
  holder.dataset.size = String(size);
  fillGlyph(holder);
  return holder;
}

/**
 * Swap in the shared glyph renderer and repaint the glyphs already on screen.
 * The module is requested only if the page has already loaded it (the map view imports it
 * statically), so a build without it never logs a failed request.
 */
function adoptSharedGlyphs(root) {
  let present = false;
  try {
    const url = new URL('../views/glyphs.js', import.meta.url).href;
    present = performance.getEntriesByType('resource').some((entry) => entry.name === url);
  } catch {
    present = false;
  }
  if (!present) return;
  import('../views/glyphs.js')
    .then((mod) => {
      if (typeof mod.glyphSvg !== 'function') return;
      glyphSvg = mod.glyphSvg;
      glyphTemplates.clear();
      for (const holder of root.querySelectorAll('.sb-glyph')) fillGlyph(holder);
    })
    .catch(() => { /* module not present: the local shapes stay */ });
}

// ---------------------------------------------------------------------------------------------
// Life groups
// ---------------------------------------------------------------------------------------------

// LIFE_GROUPS, plus an "Other" bucket if the dataset uses a category outside them.
const groups = [...LIFE_GROUPS];
const groupIndexById = new Map(groups.map((g, i) => [g.id, i]));
const lifeInfoByCategory = new Map();

/** { color, label, glyph, groupIndex } for a species category (cached). */
function lifeInfo(category) {
  let info = lifeInfoByCategory.get(category);
  if (!info) {
    const cat = getCategoryInfo(category);
    let groupIndex = groupIndexById.get(cat.group.id);
    if (groupIndex == null) {
      groupIndex = groups.push(cat.group) - 1;
      groupIndexById.set(cat.group.id, groupIndex);
    }
    info = { color: cat.color, label: cat.label, glyph: cat.group.glyph || 'dot', groupIndex };
    lifeInfoByCategory.set(category, info);
  }
  return info;
}

const allSpecies = catalogue.species || EMPTY;
let firstLifeMa = 0;
for (const sp of allSpecies) {
  lifeInfo(sp.category); // settle the group list before any DOM is built
  if (sp.appearanceMa > firstLifeMa) firstLifeMa = sp.appearanceMa;
}

const isAlive = catalogue.isAlive
  || ((sp, ma) => ma <= sp.appearanceMa && ma >= (sp.extinctMa ?? 0));

function abundanceAt(sp, ma) {
  if (ma > sp.appearanceMa) return 0;
  return catalogue.interpolateAbundance ? catalogue.interpolateAbundance(sp.abundanceProfile, ma) : sp.currentAbundance;
}

const ABUNDANCE_LEVELS = [
  [0.7, 'Dominant'],
  [0.45, 'Abundant'],
  [0.2, 'Common'],
  [0.07, 'Uncommon'],
  [-Infinity, 'Rare'],
];

function abundanceLevel(a) {
  for (const [min, label] of ABUNDANCE_LEVELS) if (a >= min) return label;
  return 'Rare';
}

// ---------------------------------------------------------------------------------------------
// Species rows — shared behaviour of every clickable species element in the panel (list rows,
// index entries, event chips): click / Enter / Space opens the dialog, hover and keyboard focus
// announce 'species:hover' (hover card + marker highlight), ArrowUp / ArrowDown walk the rows.
//
// Each such element carries data-id; the hover card (js/ui/speciesPopup.js) looks the element up
// by that attribute to hang itself beside the panel instead of over the rows being read.
// ---------------------------------------------------------------------------------------------

function wireSpeciesRows(container, bus, selector) {
  let announced = null;
  const rowOf = (target) => (target instanceof Element ? target.closest(selector) : null);
  const announce = (row, x, y) => {
    announced = row ? row.dataset.id : null;
    bus.emit('species:hover', { id: announced, x, y, source: 'sidebar' });
  };
  const onPointer = (e) => {
    if (e.pointerType === 'touch') return;
    const row = rowOf(e.target);
    if (row) announce(row, e.clientX, e.clientY);
    else if (announced) announce(null, 0, 0);
  };

  container.addEventListener('click', (e) => {
    const row = rowOf(e.target);
    if (row) bus.emit('species:open', { id: row.dataset.id });
  });
  container.addEventListener('pointerover', onPointer);
  container.addEventListener('pointermove', onPointer);
  container.addEventListener('pointerleave', () => { if (announced) announce(null, 0, 0); });
  container.addEventListener('focusin', (e) => {
    const row = rowOf(e.target);
    if (!row || !row.matches(':focus-visible')) return; // keyboard focus only; the pointer has hover
    const rect = row.getBoundingClientRect();
    announce(row, rect.left, rect.top + rect.height / 2);
  });
  container.addEventListener('focusout', () => { if (announced) announce(null, 0, 0); });
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const current = rowOf(e.target);
    if (!current) return;
    const rows = [...container.querySelectorAll(selector)].filter((r) => r.getClientRects().length > 0);
    const next = rows[rows.indexOf(current) + (e.key === 'ArrowDown' ? 1 : -1)];
    if (!next) return;
    e.preventDefault();
    next.focus();
  });
}

// ---------------------------------------------------------------------------------------------
// Planet vitals
// ---------------------------------------------------------------------------------------------

function fixed1(n) {
  const s = n.toFixed(1);
  return s === '-0.0' ? '0.0' : s.replace('-', MINUS);
}

function signedInt(n) {
  if (n === 0) return '0';
  return `${n > 0 ? '+' : MINUS}${formatInt(Math.abs(n))}`;
}

/**
 * Oldest age with a real sea-level reading. Uses the data module's own isSeaLevelKnown() when it
 * exists; otherwise the point where the curve leaves its flat-zero "unknown" stretch.
 */
function seaLevelKnownFromMa() {
  if (planet.isSeaLevelKnown) {
    if (planet.isSeaLevelKnown(TIMING.startTimeMa)) return TIMING.startTimeMa;
    let known = TIMING.endTimeMa;
    let unknown = TIMING.startTimeMa;
    for (let i = 0; i < 40; i++) {
      const mid = (known + unknown) / 2;
      if (planet.isSeaLevelKnown(mid)) known = mid;
      else unknown = mid;
    }
    return known;
  }
  const curve = planet.PLANET_CURVES?.seaLevel;
  if (!curve) return 600;
  for (let i = 0; i < curve.length; i++) {
    if (curve[i][1] !== 0) return i > 0 ? curve[i - 1][0] : curve[0][0];
  }
  return 0;
}

const SEA_KNOWN_FROM_MA = seaLevelKnownFromMa();
const seaLevelKnown = (ma) => (planet.isSeaLevelKnown ? planet.isSeaLevelKnown(ma) : ma <= SEA_KNOWN_FROM_MA);

const TECTONIC_LEVELS = ['Low', 'Moderate', 'Active', 'High', 'Extreme'];

// "Today" is wherever each curve ends, so a card always reads "same as today" on the last frame;
// the config baselines are the fallback (and the pre-industrial CO2 reference).
const TODAY = {
  tempC: atmosphere.getTemperatureAtTime ? atmosphere.getTemperatureAtTime(TIMING.endTimeMa) : ATMOSPHERE.modernTempC,
  o2Pct: atmosphere.getOxygenAtTime ? atmosphere.getOxygenAtTime(TIMING.endTimeMa) : ATMOSPHERE.modernO2Pct,
  co2Ppm: atmosphere.getCO2AtTime ? atmosphere.getCO2AtTime(TIMING.endTimeMa) : ATMOSPHERE.modernCo2Ppm,
  dayHours: planet.getDayLengthHours ? planet.getDayLengthHours(TIMING.endTimeMa) : 24,
};

// Each vital: label, unit, a one-sentence explanation (title + hint line), the curve behind its
// sparkline, and read(frame, out) which fills out.value / out.unit / out.strong / out.rest.
function vitalSpecs() {
  const air = atmosphere.ATMOSPHERE_CURVES || {};
  const curves = planet.PLANET_CURVES || {};
  const preIndustrial = ATMOSPHERE.modernCo2Ppm;
  const co2Now = TODAY.co2Ppm > preIndustrial * 1.1
    ? `about ${formatInt(Math.round(TODAY.co2Ppm / 10) * 10)}`
    : 'over 420';
  return [
    {
      id: 'temp',
      label: 'Temperature',
      unit: '°C',
      hint: `Global average surface temperature. Today it is about ${Math.round(TODAY.tempC)} °C.`,
      curve: air.temperature,
      // The molten and steam-shrouded young Earth runs off the top of the chart on purpose.
      spark: { domain: [-10, 45], baseline: TODAY.tempC },
      read(frame, out) {
        const t = frame.atmo.tempC;
        const delta = t - TODAY.tempC;
        out.value = Math.abs(t) >= 100 ? formatInt(t).replace('-', MINUS) : fixed1(t);
        if (Math.abs(delta) < 0.05) {
          out.strong = '';
          out.rest = 'same as today';
        } else {
          const size = Math.abs(delta) >= 100 ? formatInt(Math.abs(delta)) : Math.abs(delta).toFixed(1);
          // Four-figure differences (the molten young Earth) drop the "C" to stay on one line.
          out.strong = `${delta > 0 ? '+' : MINUS}${size}${Math.abs(delta) >= 1000 ? '°' : ' °C'}`;
          out.rest = ' vs today';
        }
      },
    },
    {
      id: 'o2',
      label: 'Oxygen',
      unit: '%',
      hint: `Oxygen in the air, nearly all of it made by photosynthesis. Today: ${Math.round(TODAY.o2Pct)} %.`,
      curve: air.oxygen,
      spark: { baseline: TODAY.o2Pct },
      read(frame, out) {
        const o2 = frame.atmo.o2Pct;
        out.value = o2 >= 0.995 ? o2.toFixed(1) : o2 >= 0.005 ? o2.toFixed(2) : '0';
        const ratio = formatRatio(o2, TODAY.o2Pct);
        if (o2 < 0.005) {
          out.strong = '';
          out.rest = 'no free oxygen';
        } else if (o2 < 1) {
          out.strong = '';
          out.rest = 'almost none';
        } else if (ratio === '1×') {
          out.strong = '';
          out.rest = 'same as today';
        } else {
          out.strong = ratio;
          out.rest = ' today’s level';
        }
      },
    },
    {
      id: 'co2',
      label: 'CO₂',
      unit: 'ppm',
      hint: `Carbon dioxide, the planet’s thermostat: ${formatInt(preIndustrial)} ppm before industry, ${co2Now} today.`,
      curve: air.co2,
      spark: { log: true, baseline: preIndustrial },
      read(frame, out) {
        const ppm = frame.atmo.co2Ppm;
        // The reconstruction is coarse: three significant figures are plenty.
        const step = ppm >= 10000 ? 100 : ppm >= 1000 ? 10 : 1;
        out.value = formatInt(Math.round(ppm / step) * step);
        const ratio = formatRatio(ppm, preIndustrial);
        if (ppm / preIndustrial >= 1000) {
          // Beyond a thousandfold a multiple stops meaning much: say how much of the air it is.
          out.strong = `${formatInt(ppm / 10000)} %`;
          out.rest = ' of the air';
        } else if (ratio === '1×') {
          out.strong = '';
          out.rest = 'pre-industrial level';
        } else {
          out.strong = ratio;
          out.rest = ' pre-industrial';
        }
      },
    },
    {
      id: 'sea',
      label: 'Sea level',
      unit: 'm',
      hint: 'Global sea level against today’s shoreline. High seas flood the continents.',
      curve: curves.seaLevel,
      spark: { baseline: 0, fromMa: SEA_KNOWN_FROM_MA },
      read(frame, out) {
        const level = planet.getSeaLevelM ? planet.getSeaLevelM(frame.timeMa) : null;
        if (level == null || !seaLevelKnown(frame.timeMa)) {
          out.value = '—';
          out.unit = '';
          out.strong = '';
          out.rest = 'no reliable record';
          return;
        }
        const m = Math.round(level / 5) * 5;
        out.value = signedInt(m);
        out.strong = '';
        out.rest = m > 0 ? 'above today' : m < 0 ? 'below today' : 'same as today';
      },
    },
    {
      id: 'day',
      label: 'Day length',
      unit: 'h',
      hint: 'The Moon’s tides slow Earth’s spin: days were shorter, so a year held more of them.',
      curve: curves.dayLength,
      spark: { baseline: TODAY.dayHours },
      read(frame, out) {
        const hours = planet.getDayLengthHours ? planet.getDayLengthHours(frame.timeMa) : null;
        if (!hours) {
          out.value = '—';
          out.unit = '';
          out.strong = '';
          out.rest = 'no data';
          return;
        }
        out.value = hours.toFixed(1);
        const days = (365.25 * 24) / hours;
        const rounded = days >= 1000 ? Math.round(days / 10) * 10 : Math.round(days);
        out.strong = `${hours >= 23.995 ? '' : '~'}${formatInt(rounded)}`;
        out.rest = ' days a year';
      },
    },
    {
      id: 'sun',
      label: 'Sun',
      unit: '%',
      hint: 'The young Sun was about 30 % fainter than today; it has been brightening ever since.',
      curve: curves.luminosity,
      spark: { baseline: 1 },
      read(frame, out) {
        const lum = planet.getSolarLuminosity ? planet.getSolarLuminosity(frame.timeMa) : null;
        if (!lum) {
          out.value = '—';
          out.unit = '';
          out.strong = '';
          out.rest = 'no data';
          return;
        }
        const pct = lum * 100;
        out.value = pct >= 99.95 ? '100' : pct.toFixed(1);
        out.strong = '';
        out.rest = 'as bright as today';
      },
    },
  ];
}

class Vitals {
  constructor(app, parent) {
    this.app = app;
    this.el = el('section', 'sb-vitals');
    this.el.setAttribute('aria-labelledby', 'sb-vitals-title');
    const title = el('h2', 'sr-only', 'Planet vitals');
    title.id = 'sb-vitals-title';
    this.grid = el('div', 'sb-vitals-grid');
    this.el.append(title, this.grid);

    this.cards = vitalSpecs().map((spec) => this._buildCard(spec));
    this._buildFoot();
    parent.appendChild(this.el);

    // Sparklines read their colours from the computed styles around them, so they are created
    // only once the cards are in the document.
    this.sparks = [];
    for (const card of this.cards) {
      if (!card.spec.curve || card.spec.curve.length < 2) continue;
      card.spark = new Sparkline(card.sparkEl, {
        curve: card.spec.curve,
        height: SPARK_HEIGHT,
        surface: getComputedStyle(card.card).backgroundColor,
        ...card.spec.spark,
      });
      this.sparks.push(card.spark);
    }

    this._hoverCard = null;
    this._focusCard = null;
    this._tapCard = null;
    this._peekCard = null;       // card whose sparkline is under the pointer…
    this._peekMa = null;         // …and the time it points at
    this._scratch = { value: '', unit: '', strong: '', rest: '' };
    this._peekOut = { value: '', unit: '', strong: '', rest: '' };
    document.addEventListener('pointerdown', (e) => {
      if (this._tapCard && !(e.target instanceof Element && e.target.closest('.sb-vital'))) this._setHint('tap', null);
    });
  }

  _buildCard(spec) {
    const card = el('div', 'sb-vital');
    card.tabIndex = 0;
    card.setAttribute('role', 'group');
    card.title = spec.hint;
    const label = el('div', 'sb-vital-label kicker', spec.label);
    label.id = `sb-vital-${spec.id}`;
    const describe = el('span', 'sr-only', spec.hint);
    describe.id = `sb-vital-${spec.id}-about`;
    card.setAttribute('aria-labelledby', label.id);
    card.setAttribute('aria-describedby', describe.id);

    const value = el('div', 'sb-vital-value');
    const num = el('span', 'sb-vital-num display num', '—');
    const unit = el('span', 'sb-vital-unit', spec.unit);
    value.append(num, unit);

    const compare = el('div', 'sb-vital-compare num');
    const strong = el('b');
    const rest = el('span');
    compare.append(strong, rest);

    const sparkEl = el('div', 'sb-vital-spark');
    sparkEl.title = ''; // the card's tooltip must not cover the sparkline's own readout
    card.append(label, value, compare, sparkEl, describe);
    this.grid.appendChild(card);

    const entry = { spec, card, num, unit, strong, rest, sparkEl, spark: null, last: { value: null, unit: null, strong: null, rest: null } };

    // The sparkline doubles as a small timeline: pointing reads that moment (with a crosshair on
    // all six charts), clicking travels there.
    sparkEl.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') this._peek(entry, e.clientX); });
    sparkEl.addEventListener('pointerleave', () => this._peek(null));
    sparkEl.addEventListener('click', (e) => {
      if (!entry.spark) return;
      // Travel to exactly the moment the hint line is showing.
      const ma = this._peekCard === entry ? this._peekMa : entry.spark.timeAt(e.clientX);
      this.app.bus.emit('time:seek', { ma });
    });

    card.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') this._setHint('hover', entry); });
    card.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') this._setHint('hover', null); });
    // Keyboard focus only: a mouse click also focuses the card and must not pin the explanation.
    card.addEventListener('focus', () => { if (card.matches(':focus-visible')) this._setHint('focus', entry); });
    card.addEventListener('blur', () => this._setHint('focus', null));
    // Touch has no hover: a tap shows the explanation, a second tap (or a tap elsewhere) hides it.
    card.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') this._setHint('tap', this._tapCard === entry ? null : entry);
    });
    return entry;
  }

  // Under the grid: three quiet state words, which give way to the explanation of whichever
  // card is hovered or focused (same box, so nothing below ever moves).
  _buildFoot() {
    this.foot = el('div', 'sb-vitals-foot');
    this.states = el('dl', 'sb-states');
    const state = (label, title) => {
      const wrap = el('div', 'sb-state');
      wrap.title = title;
      const dt = el('dt', 'kicker', label);
      const dd = el('dd', 'sb-state-value');
      const text = el('span', null, '—');
      dd.appendChild(text);
      wrap.append(dt, dd);
      this.states.appendChild(wrap);
      return { wrap, dd, text, last: null };
    };
    this.climate = state('Climate', 'The planet’s climate regime at this moment');
    this.tectonics = state('Tectonics', 'How vigorously the plates are rifting and colliding');
    this.diversity = state('Est. species', 'Rough estimate of the number of species alive (order of magnitude)');

    this.pips = el('span', 'sb-pips');
    this.pips.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < TECTONIC_LEVELS.length; i++) this.pips.appendChild(el('i'));
    this.tectonics.dd.appendChild(this.pips);

    this.hint = el('p', 'sb-vitals-hint');
    this.hint.setAttribute('aria-hidden', 'true'); // screen readers get it via aria-describedby
    this.foot.append(this.states, this.hint);
    this.el.appendChild(this.foot);
  }

  _setHint(source, entry) {
    if (source === 'hover') this._hoverCard = entry;
    else if (source === 'tap') this._tapCard = entry;
    else this._focusCard = entry;
    this._syncHint();
  }

  _peek(entry, clientX) {
    if (!entry || !entry.spark) {
      if (!this._peekCard) return;
      this._peekCard = null;
      for (const spark of this.sparks) spark.setCursor(null);
    } else {
      this._peekCard = entry;
      this._peekMa = entry.spark.timeAt(clientX);
      for (const spark of this.sparks) spark.setCursor(this._peekMa);
    }
    this._syncHint();
  }

  _syncHint() {
    const active = this._hoverCard || this._tapCard || this._focusCard;
    let text = null;
    if (this._peekCard) text = this._peekText(this._peekCard.spec, this._peekMa);
    else if (active) text = active.spec.hint;
    if (text != null && text !== this._hintText) this.hint.textContent = this._hintText = text;
    this.foot.classList.toggle('is-hinting', text != null);
  }

  /** "Permian, 252 Ma: 28.0 °C (+13.0 °C vs today). Click to go there." */
  _peekText(spec, ma) {
    const out = this._peekOut;
    out.unit = spec.unit;
    spec.read({
      timeMa: ma,
      atmo: {
        tempC: atmosphere.getTemperatureAtTime ? atmosphere.getTemperatureAtTime(ma) : NaN,
        o2Pct: atmosphere.getOxygenAtTime ? atmosphere.getOxygenAtTime(ma) : NaN,
        co2Ppm: atmosphere.getCO2AtTime ? atmosphere.getCO2AtTime(ma) : NaN,
      },
    }, out);
    const period = timeline.getPeriodAtTime ? timeline.getPeriodAtTime(ma) : null;
    const when = period ? `${period.label || period.period}, ${formatMa(ma)}` : formatMa(ma);
    const reading = out.unit
      ? `${out.value} ${out.unit} (${out.strong}${out.rest})`
      : out.rest;
    return `${when}: ${reading}. Click to go there.`;
  }

  /** Per-frame: move the sparkline playheads (each repaints only after a visible move). */
  draw(timeMa) {
    for (const spark of this.sparks) spark.draw(timeMa);
  }

  /** Throttled: readings, comparisons and state words. */
  update(frame) {
    const out = this._scratch;
    for (const card of this.cards) {
      out.unit = card.spec.unit;
      card.spec.read(frame, out);
      const last = card.last;
      if (out.value !== last.value) {
        card.num.textContent = last.value = out.value;
        card.num.classList.toggle('is-long', out.value.length >= 7); // "100,000" steps down a size
      }
      if (out.unit !== last.unit) card.unit.textContent = last.unit = out.unit;
      if (out.strong !== last.strong) card.strong.textContent = last.strong = out.strong;
      if (out.rest !== last.rest) card.rest.textContent = last.rest = out.rest;
    }

    const climate = planet.getClimateState ? planet.getClimateState(frame.timeMa, frame.atmo.tempC) : null;
    const climateKey = climate ? climate.label : '';
    if (climateKey !== this.climate.last) {
      this.climate.last = climateKey;
      this.climate.wrap.hidden = !climate;
      if (climate) {
        this.climate.text.textContent = climate.label;
        this.climate.wrap.title = climate.blurb ? `${climate.label}: ${climate.blurb}` : climate.label;
      }
    }

    const activity = seismic.getSeismicActivityAtTime ? seismic.getSeismicActivityAtTime(frame.timeMa) : null;
    const level = activity == null ? -1 : Math.max(0, Math.min(TECTONIC_LEVELS.length - 1, Math.floor(activity * 5)));
    if (level !== this.tectonics.last) {
      this.tectonics.last = level;
      this.tectonics.wrap.hidden = level < 0;
      if (level >= 0) {
        this.tectonics.text.textContent = TECTONIC_LEVELS[level];
        this.pips.dataset.level = String(level + 1);
      }
    }

    // Before the first lineage of this story appears there is nothing to count, whatever the
    // smoothed curve says.
    const lifeless = frame.timeMa > firstLifeMa && !(frame.alive && frame.alive.length);
    const species = lifeless ? 'none'
      : biodiversity.estimatedDiversityKilo && biodiversity.formatDiversity
        ? biodiversity.formatDiversity(biodiversity.estimatedDiversityKilo(frame.timeMa))
        : '';
    if (species !== this.diversity.last) {
      this.diversity.last = species;
      this.diversity.wrap.hidden = !species;
      this.diversity.text.textContent = species;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Dominant life — share bar by life group + the ranked list
// ---------------------------------------------------------------------------------------------

const MOVE_TIMING = { duration: 380, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' };
const ENTER_KEYFRAMES = [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }];
const ENTER_TIMING = { duration: 320, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' };
const LEAVE_KEYFRAMES = [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(12px)' }];
const LEAVE_TIMING = { duration: 220, easing: 'ease-in', fill: 'forwards' };

class LifeList {
  constructor(app, parent) {
    this.app = app;
    this._rows = new Map();       // id → row record
    this._order = [];             // ids in DOM order
    this._newUntil = new Map();   // id → event-clock time at which the "new" badge comes off
    this._first = new Map();      // scratch: FLIP start positions
    this._keep = new Set();       // scratch: ids staying in the list
    this._sums = new Array(groups.length).fill(0);
    this._pct = new Array(groups.length).fill(0);
    this._rank = groups.map((_, i) => i);
    this._instant = true;         // next reconcile must not animate (first paint, scrub, restart)
    this._showAll = false;
    this._activeKey = '';
    this._lit = [];               // scratch + current: rows carrying the highlight
    this._litNow = [];
    this._tableOpen = false;
    this._last = { count: null, more: null, empty: null, bar: null };

    this._build(parent);
    wireSpeciesRows(this.listEl, app.bus, '.sb-row');
  }

  _build(parent) {
    // A zero-height marker of where the header naturally sits, so the panel can tell when the
    // sticky header is pinned to the top or the bottom of the scroll area.
    this.sentinel = el('div', 'sb-life-sentinel');

    this.head = el('div', 'sb-life-head');
    const titleRow = el('div', 'sb-life-title');
    const title = el('h2', 'display', 'Dominant life');
    title.id = 'sb-life-title';
    this.countEl = el('span', 'sb-life-count num');
    this.jumpBtn = el('button', 'sb-life-jump');
    this.jumpBtn.type = 'button';
    this.jumpBtn.setAttribute('aria-label', 'Scroll to the list of dominant life');
    this.jumpBtn.appendChild(icon(ICONS.down));
    titleRow.append(title, this.countEl, this.jumpBtn);

    // Who rules now: one bar, one segment per life group, widths = abundance-weighted shares.
    this.bar = el('div', 'sb-share');
    this.bar.setAttribute('role', 'img');
    this.bar.title = 'Who rules now: each life group’s share of the living, weighted by abundance';
    const track = el('span', 'sb-share-track');
    this.segments = groups.map((group) => {
      const seg = el('span', 'sb-share-seg');
      seg.style.setProperty('--c', group.color);
      track.appendChild(seg);
      return { el: seg, grow: -1, title: '' };
    });
    this.bar.appendChild(track);
    this.head.append(titleRow, this.bar);

    // Legend: the two leading groups. It is also the disclosure for the full table below.
    this.body = el('div', 'sb-life-body');
    this.body.setAttribute('role', 'region');
    this.body.setAttribute('aria-labelledby', 'sb-life-title');
    this.tableBtn = el('button', 'sb-share-legend');
    this.tableBtn.type = 'button';
    this.tableBtn.title = 'Show every group’s share';
    this.tableBtn.setAttribute('aria-expanded', 'false');
    this.tableBtn.setAttribute('aria-controls', 'sb-share-table');
    this.keysEl = el('span', 'sb-share-keys');
    this.keysEl.appendChild(el('span', 'sr-only', 'Leading groups: '));
    this.keys = [0, 1].map(() => {
      const key = el('span', 'sb-share-key');
      const glyph = glyphEl('dot', '#000', 12);
      const name = el('span', 'sb-share-name');
      const pct = el('span', 'sb-share-pct num');
      key.append(glyph, name, pct);
      key.hidden = true;
      this.keysEl.appendChild(key);
      return { el: key, glyph, name, pct, group: -1, text: '' };
    });
    const allLabel = el('span', 'sb-share-all', 'Who rules now · share of the living');
    this.tableBtn.append(this.keysEl, allLabel, icon(ICONS.chevron));

    // The same shares as a table: every group, its glyph, its share (also the non-colour key).
    this.table = el('ul', 'sb-share-table');
    this.table.id = 'sb-share-table';
    this.table.hidden = true;
    this.tableRows = groups.map((group) => {
      const li = el('li', 'sb-share-row');
      const name = el('span', 'sb-share-name', group.label);
      const meter = el('span', 'sb-meter');
      const fill = el('span', 'sb-meter-fill');
      fill.style.setProperty('--c', group.color);
      meter.appendChild(fill);
      const pct = el('span', 'sb-share-pct num');
      li.append(glyphEl(group.glyph || 'dot', group.color, 12), name, meter, pct);
      if (group.blurb) li.title = group.blurb;
      this.table.appendChild(li);
      return { li, fill, pct, value: -1 };
    });

    const listWrap = el('div', 'sb-life-wrap');
    this.listEl = el('ul', 'sb-life-list');
    this.ghostEl = el('ul', 'sb-life-ghosts');
    this.ghostEl.setAttribute('aria-hidden', 'true');
    this.ghostEl.inert = true;
    listWrap.append(this.listEl, this.ghostEl);

    this.emptyEl = el('div', 'sb-life-empty');
    this.emptyEl.hidden = true;
    const emptyTitle = el('p', 'sb-life-empty-title display', 'No life yet.');
    const emptyText = el('p', null, `The first cells appear around ${formatYearsAgo(firstLifeMa)}.`);
    const emptyBtn = el('button', 'sb-link', 'Jump to first life');
    emptyBtn.type = 'button';
    emptyBtn.addEventListener('click', () => this.app.bus.emit('time:seek', { ma: firstLifeMa }));
    this.emptyEl.append(emptyTitle, emptyText, emptyBtn);

    this.moreBtn = el('button', 'sb-link sb-life-more');
    this.moreBtn.type = 'button';
    this.moreBtn.hidden = true;
    this.moreBtn.addEventListener('click', () => {
      this._showAll = !this._showAll;
      this._instant = true;
      this.onLayoutChange?.();
    });

    this.tableBtn.addEventListener('click', () => {
      this._tableOpen = !this._tableOpen;
      this.table.hidden = !this._tableOpen;
      this.tableBtn.setAttribute('aria-expanded', String(this._tableOpen));
      this.tableBtn.title = this._tableOpen ? 'Show only the two leading groups' : 'Show every group’s share';
      this.onLayoutChange?.();
    });

    this.body.append(this.tableBtn, this.table, listWrap, this.emptyEl, this.moreBtn);
    parent.append(this.sentinel, this.head, this.body);
  }

  // ---- bookkeeping (every frame) -------------------------------------------------------------

  noteArrival(id, clock) {
    this._newUntil.set(id, clock + NEW_BADGE_SEC);
  }

  /** The clock jumped (scrub, restart, chapter): no "new" badges, and no animation next time. */
  onJump() {
    this._newUntil.clear();
    this._instant = true;
  }

  /** Light the rows of the species hovered anywhere in the app and of the one open in the dialog. */
  highlight(hoverId, focusId) {
    const key = `${hoverId || ''}|${focusId || ''}`;
    if (key === this._activeKey) return;
    this._activeKey = key;
    const want = this._lit;
    want.length = 0;
    for (const id of [hoverId, focusId]) {
      const row = id ? this._rows.get(id) : null;
      if (row && !want.includes(row.li)) want.push(row.li);
    }
    for (const li of this._litNow) if (!want.includes(li)) li.classList.remove('is-active');
    for (const li of want) li.classList.add('is-active');
    this._lit = this._litNow;
    this._litNow = want;
  }

  // ---- throttled update ----------------------------------------------------------------------

  update(frame, clock) {
    const alive = frame.alive || EMPTY;
    const total = alive.length;
    const shown = this._showAll ? total : Math.min(TOP_N, total);

    let same = shown === this._order.length;
    for (let i = 0; same && i < shown; i++) same = alive[i].id === this._order[i];
    if (!same) this._reconcile(alive, shown, frame.reducedMotion);
    this._instant = false;

    if (shown > 0) {
      const now = maToScreenSeconds(frame.timeMa);
      const earlierMa = screenSecondsToMa(Math.max(0, now - TREND_LOOKBACK_SEC));
      for (let i = 0; i < shown; i++) this._syncRow(this._rows.get(alive[i].id), alive[i], earlierMa, clock);
    }
    if (this._newUntil.size) {
      for (const [id, until] of this._newUntil) if (until <= clock) this._newUntil.delete(id);
    }

    this._syncShares(alive);
    this._syncChrome(total, shown);
  }

  _syncChrome(total, shown) {
    const last = this._last;
    const count = total === 0 ? 'none yet'
      : total > shown ? `${total} alive · top ${shown}`
        : `${total} ${total === 1 ? 'lineage' : 'lineages'} alive`;
    if (count !== last.count) this.countEl.textContent = last.count = count;

    const empty = total === 0;
    if (empty !== last.empty) {
      last.empty = empty;
      this.emptyEl.hidden = !empty;
      this.tableBtn.hidden = empty;
      if (empty && this._tableOpen) this.tableBtn.click();
      this.onLayoutChange?.();
    }

    const more = total <= TOP_N ? '' : this._showAll ? `Show only the top ${TOP_N}` : `Show all ${total} lineages`;
    if (more !== last.more) {
      last.more = more;
      this.moreBtn.hidden = !more;
      this.moreBtn.textContent = more;
    }
  }

  _syncShares(alive) {
    const sums = this._sums;
    sums.fill(0);
    let total = 0;
    for (const sp of alive) {
      const a = sp.currentAbundance || 0;
      sums[lifeInfo(sp.category).groupIndex] += a;
      total += a;
    }

    // Whole percentages that still add up to 100 (largest remainders get the spare points).
    const pct = this._pct;
    let assigned = 0;
    for (let i = 0; i < sums.length; i++) {
      pct[i] = total > 0 ? Math.floor((sums[i] / total) * 100) : 0;
      assigned += pct[i];
    }
    const rank = this._rank;
    if (total > 0) {
      rank.sort((a, b) => ((sums[b] / total) * 100 - pct[b]) - ((sums[a] / total) * 100 - pct[a]) || a - b);
      for (let i = 0; assigned < 100 && i < rank.length; i++) {
        if (sums[rank[i]] > 0) {
          pct[rank[i]]++;
          assigned++;
        }
      }
    }

    let label = '';
    for (let i = 0; i < groups.length; i++) {
      const seg = this.segments[i];
      const grow = total > 0 ? Math.round((sums[i] / total) * 1000) / 10 : 0;
      if (grow !== seg.grow) {
        seg.grow = grow;
        seg.el.style.flexGrow = String(grow);
        seg.el.classList.toggle('is-zero', grow === 0);
      }
      const title = `${groups[i].label} — ${pct[i]} %`;
      if (title !== seg.title) seg.el.title = seg.title = title;
      if (pct[i] > 0) label += `${label ? ', ' : ''}${groups[i].label} ${pct[i]} %`;
    }
    const barLabel = total > 0
      ? `Share of living lineages by group, weighted by abundance: ${label}`
      : 'No living lineages yet';
    if (barLabel !== this._last.bar) {
      this._last.bar = barLabel;
      this.bar.setAttribute('aria-label', barLabel);
      this.bar.classList.toggle('is-empty', total <= 0);
    }

    // The two leading groups. While a single group has the planet to itself, the second line
    // says so instead of standing empty (-2 marks that placeholder).
    rank.sort((a, b) => sums[b] - sums[a] || a - b);
    for (let k = 0; k < this.keys.length; k++) {
      const key = this.keys[k];
      const gi = total > 0 && sums[rank[k]] > 0 ? rank[k] : (k === 1 && total > 0 ? -2 : -1);
      if (gi !== key.group) {
        key.group = gi;
        key.el.hidden = gi === -1;
        key.el.classList.toggle('is-alone', gi === -2);
        if (gi >= 0) {
          const group = groups[gi];
          key.name.textContent = group.label;
          key.glyph.dataset.glyph = group.glyph || 'dot';
          key.glyph.dataset.color = group.color;
          fillGlyph(key.glyph);
        } else if (gi === -2) {
          key.name.textContent = 'No other group yet';
        }
      }
      const text = gi >= 0 ? `${pct[gi]} %` : '';
      if (text !== key.text) key.pct.textContent = key.text = text;
    }

    if (this._tableOpen) {
      for (let i = 0; i < groups.length; i++) {
        const row = this.tableRows[i];
        if (pct[i] === row.value) continue;
        row.value = pct[i];
        row.pct.textContent = `${pct[i]} %`;
        row.fill.style.transform = `scaleX(${pct[i] / 100})`;
        row.li.classList.toggle('is-zero', pct[i] === 0);
      }
    } else if (this.tableRows[0].value !== -1) {
      for (const row of this.tableRows) row.value = -1; // refresh in full when reopened
    }
  }

  _createRow(sp) {
    const info = lifeInfo(sp.category);
    const li = el('li', 'sb-life-item');
    const btn = el('button', 'sb-row');
    btn.type = 'button';
    btn.dataset.id = sp.id;

    const main = el('span', 'sb-row-main');
    const top = el('span', 'sb-row-top');
    const name = el('span', 'sb-row-name', sp.name);
    const status = el('span', 'sb-row-status');
    const isNew = el('span', 'sb-new', 'new');
    const trend = el('span', 'sb-trend');
    const level = el('span', 'sb-level');
    status.append(isNew, trend, level);
    top.append(name, status);

    const desc = el('span', 'sb-row-desc', sp.description || '');
    const meter = el('span', 'sb-meter');
    meter.setAttribute('aria-hidden', 'true');
    const fill = el('span', 'sb-meter-fill');
    fill.style.setProperty('--c', info.color);
    meter.appendChild(fill);

    main.append(top, desc, meter);
    btn.append(glyphEl(info.glyph, info.color, 14), main);
    li.appendChild(btn);
    return { id: sp.id, li, btn, fill, level, a: -1, levelText: '', trend: 0, isNew: false, move: null };
  }

  _syncRow(row, sp, earlierMa, clock) {
    const a = sp.currentAbundance || 0;
    const quantised = Math.round(a * 200) / 200;
    if (quantised !== row.a) {
      row.a = quantised;
      row.fill.style.transform = `scaleX(${Math.max(0.015, quantised)})`;
    }
    let changed = false;
    const level = abundanceLevel(a);
    if (level !== row.levelText) {
      row.level.textContent = row.levelText = level;
      changed = true;
    }

    const isNew = (this._newUntil.get(sp.id) || -Infinity) > clock;
    if (isNew !== row.isNew) {
      row.isNew = isNew;
      row.li.classList.toggle('is-new', isNew);
      changed = true;
    }

    const delta = a - abundanceAt(sp, earlierMa);
    const trend = delta > TREND_THRESHOLD ? 1 : delta < -TREND_THRESHOLD ? -1 : 0;
    if (trend !== row.trend) {
      row.trend = trend;
      if (trend) row.li.dataset.trend = trend > 0 ? 'up' : 'down';
      else delete row.li.dataset.trend;
      changed = true;
    }

    // "Ammonites. Dominant, rising. Iconic coiled shellfish…" — starts with the visible name.
    if (changed) {
      const state = `${isNew ? 'Just appeared, ' : ''}${level.toLowerCase()}${trend > 0 ? ', rising' : trend < 0 ? ', falling' : ''}`;
      row.btn.setAttribute('aria-label', `${sp.name}. ${state.charAt(0).toUpperCase()}${state.slice(1)}. ${sp.description || ''}`.trim());
    }
  }

  // Keyed reconcile with FLIP: measure where every row is, apply the new order, then animate each
  // row from its old position to its new one. Rows that drop out fade away as ghosts on top.
  _reconcile(alive, shown, reducedMotion) {
    const list = this.listEl;
    const animate = !this._instant && !reducedMotion && typeof list.animate === 'function';
    const focused = list.contains(document.activeElement) ? document.activeElement : null;
    const first = this._first;
    first.clear();

    if (animate) {
      const top = list.getBoundingClientRect().top;
      for (const row of this._rows.values()) {
        first.set(row.id, row.li.getBoundingClientRect().top - top); // includes a move in flight
      }
    } else {
      this.ghostEl.textContent = ''; // a jump: nothing lingers from the moment left behind
    }
    for (const row of this._rows.values()) {
      if (!row.move) continue;
      row.move.cancel();
      row.move = null;
    }

    const keep = this._keep;
    keep.clear();
    for (let i = 0; i < shown; i++) keep.add(alive[i].id);
    for (const row of [...this._rows.values()]) {
      if (keep.has(row.id)) continue;
      this._rows.delete(row.id);
      if (animate) this._ghost(row, first.get(row.id));
      else row.li.remove();
    }

    for (let i = 0; i < shown; i++) {
      const sp = alive[i];
      let row = this._rows.get(sp.id);
      const created = !row;
      if (created) {
        row = this._createRow(sp);
        this._rows.set(sp.id, row);
      }
      const at = list.children[i] || null;
      if (at !== row.li) {
        // moveBefore keeps focus and running animations on the moved row where it is supported.
        if (!created && typeof list.moveBefore === 'function') list.moveBefore(row.li, at);
        else list.insertBefore(row.li, at);
      }
      this._order[i] = sp.id;
    }
    this._order.length = shown;

    if (focused && focused.isConnected && document.activeElement !== focused) {
      focused.focus({ preventScroll: true });
    }

    if (animate) {
      const top = list.getBoundingClientRect().top;
      for (let i = 0; i < shown; i++) {
        const row = this._rows.get(this._order[i]);
        const from = first.get(row.id);
        if (from == null) {
          row.li.animate(ENTER_KEYFRAMES, ENTER_TIMING);
          continue;
        }
        const dy = from - (row.li.getBoundingClientRect().top - top);
        if (Math.abs(dy) < 0.5) continue;
        // A climber passes in front of the rows it overtakes.
        row.move = row.li.animate(
          [{ transform: `translateY(${dy}px)`, zIndex: dy > 0 ? 1 : 0 }, { transform: 'translateY(0)', zIndex: dy > 0 ? 1 : 0 }],
          MOVE_TIMING,
        );
      }
    }

    this._activeKey = ''; // re-evaluate the highlight against the new set of rows
    this.onLayoutChange?.();
  }

  _ghost(row, top) {
    const li = row.li;
    li.classList.remove('is-active');
    li.classList.add('is-leaving');
    li.style.top = `${top || 0}px`;
    this.ghostEl.appendChild(li);
    const remove = () => li.remove();
    li.animate(LEAVE_KEYFRAMES, LEAVE_TIMING).finished.then(remove, remove);
  }
}

// ---------------------------------------------------------------------------------------------
// Just arrived / just lost — a strip pinned under the list, so newcomers (which start rare, far
// down the ranking) and departures are named the moment they happen.
// ---------------------------------------------------------------------------------------------

class EventStrip {
  constructor(app, parent) {
    this.app = app;
    this.el = el('div', 'sb-events');
    this.el.hidden = true;
    this.kinds = {
      new: this._buildKind('Arrived', 'sb-events-new'),
      lost: this._buildKind('Lost', 'sb-events-lost'),
    };
    wireSpeciesRows(this.el, app.bus, '.sb-chip');
    parent.appendChild(this.el);
  }

  _buildKind(label, className) {
    const row = el('div', `sb-events-row ${className}`);
    row.hidden = true;
    const chips = el('div', 'sb-chips');
    const more = el('span', 'sb-chips-more num');
    row.append(el('span', 'kicker', label), chips, more);
    this.el.appendChild(row);
    return { row, chips, more, items: [], ids: new Set(), moreText: '', dirty: false };
  }

  /** `born` may lie in the future: the chip then waits until that moment before it starts to age. */
  add(kind, id, born) {
    const sp = this.app.speciesById.get(id);
    const group = this.kinds[kind];
    if (!sp || !group || group.ids.has(id)) return;
    group.ids.add(id);
    const chip = el('button', 'sb-chip');
    chip.type = 'button';
    chip.dataset.id = id;
    if (kind === 'lost') {
      chip.append(icon(ICONS.dagger, 'sb-icon sb-dagger'), el('span', null, sp.name));
      chip.setAttribute('aria-label', `${sp.name}, just went extinct`);
    } else {
      const info = lifeInfo(sp.category);
      chip.append(glyphEl(info.glyph, info.color, 12), el('span', null, sp.name));
      chip.setAttribute('aria-label', `${sp.name}, just appeared`);
    }
    // Arrivals come one at a time: the newest leads the line. Losses can come as a batch (a mass
    // extinction, most abundant first) and keep their order.
    if (kind === 'new') group.chips.prepend(chip);
    else group.chips.appendChild(chip);
    group.items.push({ id, chip, born, fading: false });
    if (group.items.length > EVENT_MAX_CHIPS) {
      const oldest = group.items.shift();
      group.ids.delete(oldest.id);
      oldest.chip.remove();
    }
    group.dirty = true;
  }

  get active() {
    return this.kinds.new.items.length > 0 || this.kinds.lost.items.length > 0;
  }

  /** Chips waiting for a moment that has now been brought forward (a skipped extinction hold). */
  startAgeing(clock) {
    for (const group of Object.values(this.kinds)) {
      for (const item of group.items) if (item.born > clock) item.born = clock;
    }
  }

  clear() {
    for (const group of Object.values(this.kinds)) {
      if (!group.items.length) continue;
      group.items.length = 0;
      group.ids.clear();
      group.chips.textContent = '';
      group.dirty = true;
    }
  }

  /** Throttled: retire old chips, start fades, show or hide the strip. */
  update(clock) {
    let any = false;
    for (const group of Object.values(this.kinds)) {
      const items = group.items;
      for (let i = items.length - 1; i >= 0; i--) {
        if (clock - items[i].born < EVENT_CHIP_SEC) continue;
        group.ids.delete(items[i].id);
        items[i].chip.remove();
        items.splice(i, 1);
        group.dirty = true;
      }
      for (const item of items) {
        if (!item.fading && clock - item.born >= EVENT_CHIP_SEC - EVENT_FADE_SEC) {
          item.fading = true;
          item.chip.classList.add('is-fading');
        }
      }
      const visible = items.length > 0;
      if (group.row.hidden === visible) group.row.hidden = !visible;
      any = any || visible;
    }
    if (this.el.hidden === any) this.el.hidden = !any;

    // Chips beyond the row's line limit are clipped by whole lines; count them as "+N".
    // Measured only when the set of chips changed.
    for (const group of Object.values(this.kinds)) {
      if (!group.dirty) continue;
      group.dirty = false;
      let hiddenChips = 0;
      if (group.items.length) {
        const bottom = group.chips.getBoundingClientRect().bottom;
        for (const item of group.items) if (item.chip.getBoundingClientRect().top >= bottom - 1) hiddenChips++;
      }
      const moreText = hiddenChips > 0 ? `+${hiddenChips}` : '';
      if (moreText !== group.moreText) group.more.textContent = group.moreText = moreText;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Index — every entry in the dataset
// ---------------------------------------------------------------------------------------------

class SpeciesIndex {
  constructor(app, panel) {
    this.app = app;
    this.panel = panel;
    this.built = false;
    this.entries = [];
    this.sections = [];
    this._query = '';
    this._last = { meta: null, alive: -1 };
  }

  build() {
    if (this.built) return;
    this.built = true;
    const title = el('h2', 'sr-only', 'Index of all life forms');
    title.id = 'sb-index-title';

    const top = el('div', 'sb-index-top');
    const field = el('label', 'sb-search');
    this.input = el('input');
    this.input.type = 'search';
    this.input.id = 'sb-search';
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.placeholder = `Search ${allSpecies.length} life forms`;
    this.input.setAttribute('aria-label', 'Search all life forms by name');
    field.append(icon(ICONS.search), this.input);
    // Only the count of matches is a live region; the "alive now" tally changes all the time.
    const meta = el('p', 'sb-index-meta num');
    this.metaCount = el('span');
    this.metaCount.setAttribute('role', 'status');
    this.metaAlive = el('span');
    meta.append(this.metaCount, this.metaAlive);
    top.append(field, meta);

    this.scroll = el('div', 'sb-index-scroll');
    const bySection = groups.map(() => []);
    for (const sp of allSpecies) bySection[lifeInfo(sp.category).groupIndex].push(sp);

    groups.forEach((group, gi) => {
      const members = bySection[gi].sort((a, b) => b.appearanceMa - a.appearanceMa || a.name.localeCompare(b.name));
      if (!members.length) return;
      const section = el('section', 'sb-group');
      const heading = el('h3', 'sb-group-head');
      const toggle = el('button', 'sb-group-toggle');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'true');
      const listId = `sb-group-${group.id}`;
      toggle.setAttribute('aria-controls', listId);
      const count = el('span', 'sb-group-count num', String(members.length));
      toggle.append(glyphEl(group.glyph || 'dot', group.color, 12), el('span', 'sb-group-name', group.label), count, icon(ICONS.chevron));
      heading.appendChild(toggle);
      const list = el('ul', 'sb-group-list');
      list.id = listId;
      const record = { section, toggle, list, count, total: members.length, open: true, entries: [] };
      toggle.addEventListener('click', () => {
        record.open = !record.open;
        this._applyFilter();
      });

      for (const sp of members) {
        const info = lifeInfo(sp.category);
        const li = el('li');
        const btn = el('button', 'sb-entry');
        btn.type = 'button';
        btn.dataset.id = sp.id;
        const name = el('span', 'sb-entry-name', sp.name);
        const tag = el('span', 'sb-alive', 'alive');
        tag.hidden = true;
        // Second line: the scientific name, or the category where that would only repeat the name.
        const hasSci = sp.scientificName && fold(sp.scientificName) !== fold(sp.name);
        const sci = el('span', hasSci ? 'sb-entry-sci sci' : 'sb-entry-sci', hasSci ? sp.scientificName : info.label);
        const range = el('span', 'sb-entry-range num', formatRange(sp));
        btn.append(glyphEl(info.glyph, info.color, 12), name, tag, sci, range);
        li.appendChild(btn);
        list.appendChild(li);
        const entry = {
          sp, li, btn, tag, name, sci,
          sciText: sci.textContent,
          label: `${sp.name}, ${sci.textContent}. ${formatRange(sp).replace(' → ', ' to ')}`,
          hay: fold(`${sp.name} ${sp.scientificName || ''} ${info.label}`),
          alive: null,
          match: true,
        };
        record.entries.push(entry);
        this.entries.push(entry);
      }
      section.append(heading, list);
      this.scroll.appendChild(section);
      this.sections.push(record);
    });

    this.empty = el('div', 'sb-index-empty');
    this.empty.hidden = true;
    this.emptyText = el('p');
    const clear = el('button', 'sb-link', 'Clear the search');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      this.input.value = '';
      this._onInput();
      this.input.focus();
    });
    this.empty.append(el('p', 'sb-life-empty-title display', 'Nothing by that name.'), this.emptyText, clear);
    this.scroll.appendChild(this.empty);

    this.panel.append(title, top, this.scroll);
    this.panel.setAttribute('aria-labelledby', 'sb-tab-index');

    this.input.addEventListener('input', () => this._onInput());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        const firstRow = this.scroll.querySelector('li:not([hidden]) > .sb-entry');
        if (firstRow && firstRow.getClientRects().length) {
          e.preventDefault();
          firstRow.focus();
        }
      } else if (e.key === 'Escape' && this.input.value) {
        // First Escape clears the query; an empty field lets Escape close the drawer.
        e.preventDefault();
        e.stopPropagation();
        this.input.value = '';
        this._onInput();
      }
    });
    wireSpeciesRows(this.scroll, this.app.bus, '.sb-entry');
    this._applyFilter();
  }

  _onInput() {
    const query = fold(this.input.value.trim());
    if (query === this._query) return;
    this._query = query;
    this._applyFilter();
    this.scroll.scrollTop = 0;
  }

  _applyFilter() {
    const query = this._query;
    let matches = 0;
    for (const section of this.sections) {
      let n = 0;
      for (const entry of section.entries) {
        const match = !query || entry.hay.includes(query);
        if (match) {
          n++;
          writeMarked(entry.name, entry.sp.name, query);
          writeMarked(entry.sci, entry.sciText, query);
        }
        if (match !== entry.match) {
          entry.match = match;
          entry.li.hidden = !match;
        }
      }
      matches += n;
      section.section.hidden = n === 0;
      section.count.textContent = query ? `${n} of ${section.total}` : String(section.total);
      // While searching, every group with a match is opened; the viewer's own choice returns after.
      const open = query ? true : section.open;
      section.list.hidden = !open;
      section.toggle.setAttribute('aria-expanded', String(open));
    }
    this.empty.hidden = matches > 0;
    if (!matches) this.emptyText.textContent = `No life form in this story matches “${this.input.value.trim()}”.`;
    const total = this.entries.length;
    const count = query ? `${matches} ${matches === 1 ? 'match' : 'matches'} of ${total}` : `${total} life forms`;
    if (count !== this._last.meta) this.metaCount.textContent = this._last.meta = count;
    this.metaAlive.hidden = !!query;
  }

  /** Throttled, only while the tab is showing: who is alive at the playhead. */
  update(frame) {
    if (!this.built) return;
    let alive = 0;
    for (const entry of this.entries) {
      const now = isAlive(entry.sp, frame.timeMa);
      if (now) alive++;
      if (now === entry.alive) continue;
      entry.alive = now;
      entry.tag.hidden = !now;
      entry.btn.classList.toggle('is-alive', now);
      entry.btn.setAttribute('aria-label', now ? `${entry.label}. Alive now` : entry.label);
    }
    if (alive !== this._last.alive) {
      this._last.alive = alive;
      this.metaAlive.textContent = ` · ${alive} alive now`;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------------------------

export class Sidebar {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('sidebar');
    this.root.textContent = '';

    this._tab = 'now';
    this._visible = true;
    this._force = true;          // run the throttled pass on the next frame regardless of timing
    this._lastHeavy = -Infinity;
    this._clock = 0;             // seconds of playback seen: ages badges and chips, frozen while paused
    this._heldId = null;         // extinction whose hold is in progress
    this._lastMa = null;         // time shown by the last throttled pass
    this._pinQueued = false;

    this._buildShell();

    this.vitals = new Vitals(app, this.nowScroll);
    this.life = new LifeList(app, this.nowScroll);
    this.events = new EventStrip(app, this.nowPanel);
    this.index = new SpeciesIndex(app, this.indexPanel);

    this.life.onLayoutChange = () => { this._force = true; this._queuePinCheck(); };
    this.life.head.addEventListener('click', (e) => {
      if (!this.life.head.classList.contains('is-pinned-bottom')) return;
      if (e.target instanceof Element && e.target.closest('button') && !e.target.closest('.sb-life-jump')) return;
      this.nowScroll.scrollTo({
        top: this.life.sentinel.offsetTop,
        behavior: app.state.reducedMotion ? 'auto' : 'smooth',
      });
    });
    this.nowScroll.addEventListener('scroll', () => this._queuePinCheck(), { passive: true });
    this.indexPanel.addEventListener('scroll', () => this._queuePinCheck(), { passive: true, capture: true });

    // Drawer behaviour on narrow screens: the toolbar owns the .open class; this panel keeps
    // itself out of the tab order while closed, and closes on Escape.
    this._narrow = window.matchMedia(NARROW_QUERY);
    this._narrow.addEventListener('change', () => this._syncShell());
    new MutationObserver(() => this._syncShell()).observe(this.root, { attributes: true, attributeFilter: ['class'] });
    new ResizeObserver(() => { this._measureGutter(); this._queuePinCheck(); }).observe(this.nowScroll);
    app.bus.on('panel:close-all', () => this._closeDrawer());
    this.root.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || !this._drawerOpen()) return;
      // The global shortcut ignores keys typed into the search field; handle Escape here.
      if (e.target instanceof HTMLInputElement) this._closeDrawer();
    });

    this._syncShell();
    adoptSharedGlyphs(this.root);
  }

  // ---- shell: tabs, panels -------------------------------------------------------------------

  _buildShell() {
    const top = el('div', 'sb-top');
    this.topEl = top;
    this.tablist = el('div', 'sb-tabs segmented');
    this.tablist.setAttribute('role', 'tablist');
    this.tablist.setAttribute('aria-label', 'Life and planet panel');
    this.tabs = {
      now: this._buildTab('now', 'Now', 'What the planet is like at this moment, and who is alive'),
      index: this._buildTab('index', 'Index', 'Every life form in the story'),
    };
    this.tabs.index.append(el('span', 'sb-tab-count num', String(allSpecies.length)));
    this.tablist.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); // also keeps the global ←/→ time-step shortcut out of the tab strip
      const next = this._tab === 'now' ? 'index' : 'now';
      this._selectTab(next);
      this.tabs[next].focus();
    });

    this.closeBtn = el('button', 'sb-close');
    this.closeBtn.type = 'button';
    this.closeBtn.setAttribute('aria-label', 'Close the life and planet panel');
    this.closeBtn.appendChild(icon(ICONS.close));
    this.closeBtn.addEventListener('click', () => this._closeDrawer());
    top.append(this.tablist, this.closeBtn);

    this.nowPanel = el('div', 'sb-panel sb-now');
    this.nowPanel.id = 'sb-panel-now';
    this.nowPanel.setAttribute('role', 'tabpanel');
    this.nowPanel.setAttribute('aria-labelledby', 'sb-tab-now');
    this.nowScroll = el('div', 'sb-scroll');
    this.nowPanel.appendChild(this.nowScroll);

    this.indexPanel = el('div', 'sb-panel sb-index');
    this.indexPanel.id = 'sb-panel-index';
    this.indexPanel.setAttribute('role', 'tabpanel');
    this.indexPanel.hidden = true;

    this.root.append(top, this.nowPanel, this.indexPanel);
  }

  _buildTab(name, label, title) {
    const tab = el('button', 'seg-btn sb-tab');
    tab.type = 'button';
    tab.id = `sb-tab-${name}`;
    tab.title = title;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `sb-panel-${name}`);
    tab.setAttribute('aria-selected', String(name === this._tab));
    tab.tabIndex = name === this._tab ? 0 : -1;
    tab.classList.toggle('active', name === this._tab);
    tab.appendChild(el('span', null, label));
    tab.addEventListener('click', () => this._selectTab(name));
    this.tablist.appendChild(tab);
    return tab;
  }

  _selectTab(name) {
    if (name === this._tab) return;
    this._tab = name;
    for (const [key, tab] of Object.entries(this.tabs)) {
      const selected = key === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('active', selected);
    }
    if (name === 'index') this.index.build();
    this.nowPanel.hidden = name !== 'now';
    this.indexPanel.hidden = name !== 'index';
    this.app.bus.emit('species:hover', { id: null, x: 0, y: 0, source: 'sidebar' });
    this.life.onJump(); // rows must not animate in from wherever they were when the tab was hidden
    this._force = true;
    this._queuePinCheck();
  }

  // ---- shell: drawer, visibility, scroll state -----------------------------------------------

  _drawerOpen() {
    return this._narrow.matches && this.root.classList.contains('open');
  }

  _closeDrawer() {
    if (!this._drawerOpen()) return;
    const hadFocus = this.root.contains(document.activeElement);
    this.app.bus.emit('panel:toggle', { name: 'sidebar', open: false });
    if (hadFocus) document.getElementById('btn-sidebar')?.focus();
  }

  _syncShell() {
    const narrow = this._narrow.matches;
    const open = this.root.classList.contains('open');
    const wasVisible = this._visible;
    if (this.app.state.captureMode) {
      this._visible = getComputedStyle(this.root).display !== 'none';
    } else {
      this._visible = !narrow || open;
      // A closed drawer is off-screen: keep it out of the tab order and the accessibility tree.
      this.root.inert = narrow && !open;
    }
    if (this._visible && !wasVisible) {
      this._force = true;
      this.life.onJump();
    }
    this._measureGutter();
  }

  /** Width of a classic (space-taking) scrollbar, so both gutters stay optically equal. */
  _measureGutter() {
    const gutter = this.nowScroll.offsetWidth - this.nowScroll.clientWidth;
    if (gutter === this._gutter || this.nowScroll.offsetWidth === 0) return;
    this._gutter = gutter;
    this.root.style.setProperty('--sb-gutter', `${gutter}px`);
  }

  _queuePinCheck() {
    if (this._pinQueued) return;
    this._pinQueued = true;
    requestAnimationFrame(() => {
      this._pinQueued = false;
      const scroll = this.nowScroll;
      const head = this.life.head;
      const active = this._tab === 'now' ? scroll : this.index.scroll;
      this.topEl.classList.toggle('is-scrolled', !!active && active.scrollTop > 0);
      if (!scroll.clientHeight) return;
      const natural = this.life.sentinel.offsetTop;
      const pinnedTop = natural < scroll.scrollTop - 1;
      const pinnedBottom = natural > scroll.scrollTop + scroll.clientHeight - head.offsetHeight + 1;
      head.classList.toggle('is-pinned-top', pinnedTop);
      head.classList.toggle('is-pinned-bottom', pinnedBottom);
    });
  }

  // While the clock holds on the leading edge of a mass extinction, name the lineages this event
  // is about to take (they leave the map moments after the hold); their chips start to age when
  // the hold ends.
  _trackHold(frame) {
    const hold = frame.hold;
    if (!hold) {
      if (this._heldId) {
        this._heldId = null;
        this.events.startAgeing(this._clock);
      }
      return;
    }
    if (hold.id === this._heldId) return;
    this._heldId = hold.id;
    const ext = (frame.crisis && frame.crisis.extinction) || frame.extinction;
    if (!ext || !frame.alive) return;
    const from = ext.timeMa + ext.durationMa / 2;
    const to = ext.timeMa - ext.durationMa / 2;
    const release = this._clock + Math.max(0, hold.duration - hold.elapsed);
    for (const sp of frame.alive) {
      if (sp.extinctMa != null && sp.extinctMa <= from && sp.extinctMa >= to) this.events.add('lost', sp.id, release);
    }
    this._force = true;
  }

  // ---- frame ---------------------------------------------------------------------------------

  update(frame) {
    // Bookkeeping that has to see every frame.
    if (frame.jumped) {
      this.life.onJump();
      this.events.clear();
      this._heldId = null;
    }
    this._trackHold(frame);
    const arrivals = frame.arrivals || EMPTY;
    const departures = frame.departures || EMPTY;
    for (let i = 0; i < arrivals.length; i++) {
      this.life.noteArrival(arrivals[i], this._clock);
      this.events.add('new', arrivals[i], this._clock);
    }
    for (let i = 0; i < departures.length; i++) this.events.add('lost', departures[i], this._clock);
    // Badges and chips age with playback and freeze on pause — except at the end of the story,
    // where nothing more will happen and the last of them should still fade away.
    const ageing = frame.playing || (frame.atEnd && this.events.active);
    if (ageing) this._clock += frame.dtSec;

    if (!this._visible) return;

    const now = this._tab === 'now';
    if (now) {
      this.vitals.draw(frame.timeMa);
      this.life.highlight(frame.hoverId, frame.focusId);
    }

    if (!this._force) {
      if ((frame.nowSec - this._lastHeavy) * 1000 < TIMING.sidebarUpdateIntervalMs) return;
      // Paused on the same moment: every reading on the panel is already current.
      if (!ageing && frame.timeMa === this._lastMa) return;
    }
    this._force = false;
    this._lastHeavy = frame.nowSec;
    this._lastMa = frame.timeMa;

    if (now) {
      this.vitals.update(frame);
      this.life.update(frame, this._clock);
      this.life.highlight(frame.hoverId, frame.focusId);
      this.events.update(this._clock);
    } else {
      this.index.update(frame);
    }
  }
}
