// Timeline & transport — the viewer's map of the whole story (root: <footer id="timeline">).
//
// Everything is drawn on the screen-time axis (js/engine/timeScale.js): a period's width is its
// share of the play-through, so the playhead moves at a constant speed and the crowded
// Phanerozoic is as legible as the long Precambrian.
//
// Top to bottom:
//   event rail      Big Five (diamonds), second-tier crises (hollow diamonds), milestones (dots)
//   eon band        Hadean … Phanerozoic, with the Phanerozoic's three eras marked inside it
//   period band     one block per timeline row in its ICS colour (slightly calmed)
//   climate stripe  global temperature as a blue ↔ grey ↔ red ribbon
//   playhead        hairline + grip across all four rails; the bands ahead of it are dimmed, so
//                   they double as a progress bar
//   transport       chapter steps, play / continue / replay, restart, speed, running time, age
//
// Pointer: hover anywhere for a tooltip, click a block to jump to its start, drag anywhere to
// scrub (the rail and the climate stripe seek on press), click a marker to watch that event.
// The bands are decorative for assistive tech; the real controls are one visually hidden
// <input type="range"> (←/→ step, PageUp/PageDown move by period), the marker buttons (a toolbar
// with a roving tabindex, so the rail is a single tab stop) and the transport buttons.
//
// Data is read defensively: `crises`, `ERAS`, labels, abbreviations and most event fields are
// optional, and the counts are expected to grow.

import { TIMING, ATMOSPHERE } from '../config.js';
import {
  getSegments,
  totalScreenSeconds,
  formatClock,
  fractionToMa,
  maToFraction,
  maToScreenSeconds,
  screenSecondsToMa,
} from '../engine/timeScale.js';
import { formatMa, formatYearsAgo, formatDuration, formatInt } from '../util/format.js';
import * as timelineData from '../data/timeline.js';
import * as extinctionData from '../data/extinctions.js';
import * as milestoneData from '../data/milestones.js';
import * as planetData from '../data/planet.js';
import { getTemperatureAtTime } from '../data/atmosphere.js';

const SPEEDS = [0.25, 0.5, 1, 2, 4];
const LEAD_IN_SECONDS = 1.5;     // a marker jump lands this much real time before its event
const HAIR_SECONDS = 0.04;       // "the start of a period" is a hair inside it, so it is the one named
const PREV_GRACE_SECONDS = 1;    // stepping back this close to a start goes to the one before
const ARIA_THROTTLE_SEC = 1.5;   // slider value text while playing: current, never chatty
const TIP_DELAY_MS = 320;        // transport-button tooltips; the rails answer instantly
const MIN_NAMED_SHARE = 0.3;     // below this share of nameable period blocks, show no names at all
const MIN_ABBR_BLOCK_PX = 22;    // narrowest period block that may carry an abbreviation
// By pointer type: how far a press may wander on a block and still be a click rather than a scrub,
// and how near a marker the pointer must be to count as "on" it (closest wins).
const DRAG_THRESHOLD_PX = { mouse: 4, pen: 6, touch: 10 };
const MARK_REACH_PX = { mouse: 11, pen: 12, touch: 18 };

// Official ICS chart colours for the eons (timeline.js carries colours per row only).
const EON_COLORS = {
  Hadean: '#ae027e',
  Archean: '#f0047f',
  Proterozoic: '#f73563',
  Phanerozoic: '#9ad9dd',
};
const BAND_SURFACE = '#111a2b';  // --bg-2; the eon band is its ICS colour sunk into the chrome
const EON_MUTE = 0.6;
const PERIOD_SATURATION = 0.84;

const CATEGORY_LABELS = {
  cosmic: 'Cosmos',
  geological: 'Earth',
  climatic: 'Climate',
  biological: 'Life',
  cultural: 'Humanity',
  crisis: 'Crisis',
};

// Event rail geometry (px): the rows a marker may sit on, centre line first. The Big Five never
// leave the centre; lesser markers step above/below it when the centre is taken.
const RAIL_CENTRE = 8;
const MARK_ROWS = { extinction: [RAIL_CENTRE], crisis: [RAIL_CENTRE, 4, 12], milestone: [RAIL_CENTRE, 3, 13] };
// Collision radii: a dot's true radius; for the diamonds a little under the half-diagonal, since
// neighbours mostly approach them corner-on from the outer rows.
const MARK_RADIUS = { extinction: 5.6, crisis: 4.2, milestone: 3.5 };
const MARK_GAP = 1;
const MARK_SQUEEZE = 2.5;        // second-chance placement may overlap neighbours' rings by this much
const MARK_NUDGES = [0, -2, 2, -4, 4, -6, 6, -8, 8, -10, 10, -12, 12, -14, 14, -16, 16, -18, 18];
const MARK_ROOMY_WIDTH = 520;    // narrower rails get a single row of the top-ranked markers
const MARK_RANK = { extinction: 100, crisis: 20, milestone: 10 };

// ---- climate ramp ---------------------------------------------------------------------------
// Diverging: two hues around a neutral grey at the modern mean, lighter = further from today
// (the dark-surface convention; both arms rise through the same lightness steps). Positions
// 0…0.66 cover ±20 °C, eased so a few degrees already show; the last third is kept for the
// extremes — snowball Earths, the Hadean — which read as "ice-white" and "white-hot" without
// flattening the Phanerozoic detail.
const TEMP_NEUTRAL = '#586175';
const TEMP_COLD = [[0, TEMP_NEUTRAL], [0.33, '#3f73b8'], [0.66, '#3987e5'], [0.85, '#86b6ef'], [1, '#cde2fb']];
const TEMP_HOT = [[0, TEMP_NEUTRAL], [0.33, '#a8504c'], [0.66, '#e34948'], [0.85, '#f08f7e'], [1, '#fbd5c8']];
const TEMP_SPAN_C = 20;

function hexRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgbCss(c) {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

function luminance(rgb) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/** Black ink reads better than white on this fill (WCAG contrast, whichever is higher: ≥ 4.58 either way). */
function wantsDarkInk(rgb) {
  const l = luminance(rgb);
  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05);
}

/** The official ICS colour taken down a notch (as CSS saturate()) so the band sits calmly in the dark chrome. */
function calm(hex) {
  const [r, g, b] = hexRgb(hex);
  const grey = 0.213 * r + 0.715 * g + 0.072 * b;
  return [r, g, b].map((v) => grey + (v - grey) * PERIOD_SATURATION);
}

function sampleRamp(ramp, pos) {
  for (let i = 1; i < ramp.length; i++) {
    if (pos <= ramp[i][0]) {
      const t = (pos - ramp[i - 1][0]) / (ramp[i][0] - ramp[i - 1][0]);
      return mixRgb(hexRgb(ramp[i - 1][1]), hexRgb(ramp[i][1]), t);
    }
  }
  return hexRgb(ramp[ramp.length - 1][1]);
}

function modernTempC() {
  return Number.isFinite(ATMOSPHERE?.modernTempC) ? ATMOSPHERE.modernTempC : 15;
}

/** Stripe colour for a global mean temperature. */
function tempColor(tempC) {
  const d = tempC - modernTempC();
  const a = Math.abs(d);
  let pos;
  if (a <= TEMP_SPAN_C) pos = 0.66 * (a / TEMP_SPAN_C) ** 0.7;
  else if (d < 0) pos = 0.66 + 0.34 * Math.min(1, (a - TEMP_SPAN_C) / 40);
  else pos = 0.66 + 0.34 * Math.min(1, Math.log10(a / TEMP_SPAN_C) / Math.log10(75));
  return rgbCss(sampleRamp(d < 0 ? TEMP_COLD : TEMP_HOT, pos));
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function periodName(period) {
  return period ? period.label || period.period || '' : '';
}

function windowStartMa(ev) {
  return ev.timeMa + (ev.durationMa || 0) / 2;
}

/** "Hothouse · Ice-free; hot from pole to pole" — the same regime names the sidebar uses. */
function climateStateLine(ma, tempC) {
  if (typeof planetData.getClimateState !== 'function') return '';
  try {
    const state = planetData.getClimateState(ma, tempC);
    if (!state || !state.label) return '';
    return state.blurb ? `${state.label} · ${state.blurb}` : state.label;
  } catch {
    return '';   // a tooltip line is never worth an exception
  }
}

/** The second-tier crisis a 'crisis' milestone is the toast for: same id, else overlapping in time. */
function crisisTwin(milestone, crises) {
  let best = null;
  let bestGap = Infinity;
  for (const c of crises) {
    if (c.id === milestone.id) return c;
    const gap = Math.abs(c.timeMa - milestone.timeMa);
    const reach = Math.max(c.durationMa || 0, milestone.durationMa || 0) / 2;
    if (gap <= reach && gap < bestGap) {
      best = c;
      bestGap = gap;
    }
  }
  return best;
}

// ---- icons (inline SVG, 20 × 20, currentColor) ----------------------------------------------
const ARROW_CCW = '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></g>';
const icon = (name, body) => `<svg class="tl-icon tl-icon-${name}" viewBox="0 0 20 20" aria-hidden="true">${body}</svg>`;
const ICONS = {
  play: icon('play', '<path fill="currentColor" d="M8.35 3.3 17.15 9a1.2 1.2 0 0 1 0 2l-8.8 5.7a1.2 1.2 0 0 1-1.85-1V4.3a1.2 1.2 0 0 1 1.85-1z"/>'),
  pause: icon('pause', '<rect fill="currentColor" x="4.9" y="3.5" width="3.7" height="13" rx="1.1"/><rect fill="currentColor" x="11.4" y="3.5" width="3.7" height="13" rx="1.1"/>'),
  replay: icon('replay', `<g transform="translate(.4 .4) scale(.8)" stroke-width="2.4">${ARROW_CCW}</g><path fill="currentColor" d="M8.5 7.7v5l4.2-2.5z"/>`),
  prev: icon('prev', '<rect fill="currentColor" x="3.6" y="4.6" width="2.3" height="10.8" rx="1"/><path fill="currentColor" d="M14.75 4.55 8.1 9.1a1.1 1.1 0 0 0 0 1.8l6.65 4.55a1.1 1.1 0 0 0 1.7-.9v-9.1a1.1 1.1 0 0 0-1.7-.9z"/>'),
  next: icon('next', '<rect fill="currentColor" x="14.1" y="4.6" width="2.3" height="10.8" rx="1"/><path fill="currentColor" d="M5.25 4.55 11.9 9.1a1.1 1.1 0 0 1 0 1.8l-6.65 4.55a1.1 1.1 0 0 1-1.7-.9v-9.1a1.1 1.1 0 0 1 1.7-.9z"/>'),
  restart: icon('restart', `<g transform="translate(1.6 1.6) scale(.7)" stroke-width="2.5">${ARROW_CCW}</g>`),
};

const BLOCK_HINT = 'Click to jump to its start · drag to scrub';
const FIT_STEPS = ['fit-1', 'fit-2', 'fit-3', 'fit-4'];   // see .tl-transport.fit-* in timeline.css

const PLAY_LABELS = {
  play: 'Play',
  pause: 'Pause',
  hold: 'Continue',
  replay: 'Replay from the beginning',
};

export class Controls {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('timeline');
    this._segments = getSegments();
    this._total = totalScreenSeconds();
    // The slider counts arrow-key nudges, so one native step (assistive tech's "increment")
    // moves time exactly as far as one press of ← / →.
    this._rangeMax = Math.max(1, Math.round(this._total / TIMING.nudgeSeconds));

    this._W = 0;                 // track width in CSS px; 0 while the footer is hidden (capture mode)
    this._dpr = 0;
    this._x = null;              // playhead position in px (snapped to device pixels)
    this._drag = null;           // pointer interaction in progress on the track
    this._hoverMark = null;
    this._hoverBlock = null;
    this._tipText = {};
    this._tipOwner = null;       // element whose tooltip is showing (marker or transport button)
    this._tipTimer = 0;
    this._widths = new Map();    // measured label widths
    this._aheadFrom = 0;         // index of the first marker ahead of the playhead
    this._roving = -1;
    this._railFocus = false;
    this._activeMark = null;
    this._playMode = null;
    this._ringValue = null;

    this._buildDom();
    this._buildBands();
    this._buildMarks();
    this._wireTrack();
    this._wireRail();
    this._wireTransport();

    app.bus.on('clock:playing', () => this.syncPlayButton());
    app.bus.on('clock:hold', () => this.syncPlayButton());
    app.bus.on('clock:speed', ({ speed }) => this._syncSpeed(speed));
    this.syncPlayButton();
    this._syncSpeed(app.clock.speedMultiplier);

    this._coarse = window.matchMedia('(pointer: coarse)');
    this._coarse.addEventListener('change', () => this._layout(true));
    new ResizeObserver(() => this._layout()).observe(this.root);
    this._layout();
  }

  // ---- DOM ------------------------------------------------------------------------------------

  _buildDom() {
    const speedButtons = SPEEDS.map((s) => (
      `<button type="button" class="seg-btn" role="radio" aria-checked="false" tabindex="-1" data-speed="${s}" aria-label="${s}× speed">${s}×</button>`
    )).join('');
    const speedOptions = SPEEDS.map((s) => `<option value="${s}">${s}×</option>`).join('');

    this.root.innerHTML = `
      <div class="tl-track">
        <input type="range" id="scrubber" class="tl-range" min="0" max="${this._rangeMax}" step="1" value="0"
               aria-label="Position in Earth history">
        <div class="tl-rail" role="toolbar" aria-orientation="horizontal"
             aria-label="Events on the timeline: mass extinctions, crises and milestones"></div>
        <div class="tl-bands" id="era-strip" aria-hidden="true">
          <div class="tl-eons"></div>
          <div class="tl-periods"></div>
          <div class="tl-veil"></div>
          <div class="tl-labels tl-labels-lit"></div>
          <div class="tl-labels tl-labels-dim"></div>
        </div>
        <canvas class="tl-climate" aria-hidden="true"></canvas>
        <div class="tl-window" aria-hidden="true"></div>
        <div class="tl-ghost" aria-hidden="true"></div>
        <div class="tl-playhead" aria-hidden="true">
          <svg class="tl-grip" viewBox="0 0 13 13"><path d="M2.5.5h8a2 2 0 0 1 2 2v3.6a2 2 0 0 1-.66 1.48L7.17 11.9a1 1 0 0 1-1.34 0L1.16 7.58A2 2 0 0 1 .5 6.1V2.5a2 2 0 0 1 2-2z"/></svg>
        </div>
      </div>
      <div class="tl-lower">
        <div class="tl-caption" aria-hidden="true">
          <span class="tl-key"></span>
          <span class="tl-caption-label">global temperature</span>
        </div>
        <div class="tl-transport">
          <div class="tl-nav" role="group" aria-label="Playback">
            <button id="btn-prev-chapter" class="tl-btn" type="button" aria-label="Previous chapter">${ICONS.prev}</button>
            <button id="btn-play" class="tl-btn tl-play" type="button" data-state="play" aria-label="Play">
              <svg class="tl-ring" viewBox="0 0 44 44" aria-hidden="true">
                <circle class="tl-ring-track" cx="22" cy="22" r="20.5"/>
                <circle class="tl-ring-value" cx="22" cy="22" r="20.5" pathLength="100"/>
              </svg>
              ${ICONS.play}${ICONS.pause}${ICONS.replay}
            </button>
            <button id="btn-next-chapter" class="tl-btn" type="button" aria-label="Next chapter">${ICONS.next}</button>
            <button id="btn-restart" class="tl-btn tl-restart" type="button" aria-label="Back to the beginning">${ICONS.restart}</button>
          </div>
          <div class="tl-speed segmented" role="radiogroup" aria-label="Playback speed">${speedButtons}</div>
          <span class="tl-speed-select">
            <label class="sr-only" for="speed-select">Playback speed</label>
            <select id="speed-select">${speedOptions}</select>
          </span>
          <span class="tl-spacer"></span>
          <div class="tl-readout">
            <span id="tl-elapsed" class="tl-elapsed num"></span>
            <span id="tl-age-long" class="tl-age-long num"></span>
            <span id="current-time-display" class="tl-age-now display num"></span>
          </div>
        </div>
      </div>
      <div class="tl-tip glass" id="tl-tip" role="tooltip">
        <div class="tl-tip-head">
          <span class="tl-tip-swatch"></span><span class="tl-tip-kicker kicker"></span><span class="tl-tip-at num"></span>
        </div>
        <div class="tl-tip-title display"></div>
        <div class="tl-tip-meta num"></div>
        <div class="tl-tip-body" id="tl-tip-body"></div>
        <div class="tl-tip-foot"></div>
        <div class="tl-tip-keys"></div>
      </div>`;

    const q = (sel) => this.root.querySelector(sel);
    this.track = q('.tl-track');
    this.scrubber = q('#scrubber');
    this.rail = q('.tl-rail');
    this.eonsEl = q('.tl-eons');
    this.periodsEl = q('.tl-periods');
    this.veil = q('.tl-veil');
    this.litLabels = q('.tl-labels-lit');
    this.dimLabels = q('.tl-labels-dim');
    this.climate = q('.tl-climate');
    this.windowEl = q('.tl-window');
    this.ghost = q('.tl-ghost');
    this.playhead = q('.tl-playhead');
    this.prevBtn = q('#btn-prev-chapter');
    this.playBtn = q('#btn-play');
    this.nextBtn = q('#btn-next-chapter');
    this.restartBtn = q('#btn-restart');
    this.ringValue = q('.tl-ring-value');
    this.speedGroup = q('.tl-speed');
    this.speedButtons = [...this.speedGroup.querySelectorAll('.seg-btn')];
    this.speedSelect = q('#speed-select');
    this.transport = q('.tl-transport');
    this.elapsedEl = q('#tl-elapsed');
    this.ageLongEl = q('#tl-age-long');
    this.timeDisplay = q('#current-time-display');
    this.tip = q('#tl-tip');
    this._tipEls = {
      head: q('.tl-tip-head'),
      kicker: q('.tl-tip-kicker'),
      at: q('.tl-tip-at'),
      title: q('.tl-tip-title'),
      meta: q('.tl-tip-meta'),
      body: q('.tl-tip-body'),
      foot: q('.tl-tip-foot'),
      keys: q('.tl-tip-keys'),
    };

    q('.tl-key').style.background = `linear-gradient(90deg, ${TEMP_COLD[2][1]}, ${TEMP_NEUTRAL}, ${TEMP_HOT[2][1]})`;
    this.elapsedEl.title = 'Running time at 1× speed: elapsed / total';
  }

  /** Eon/era spans and period blocks, plus two copies of every label (lit and dimmed ink). */
  _buildBands() {
    const segs = this._segments;
    const label = (cls) => [this.litLabels.appendChild(el('div', cls)), this.dimLabels.appendChild(el('div', cls))];

    this._periods = segs.map((seg, i) => {
      const p = seg.period;
      const name = periodName(p);
      const block = this.periodsEl.appendChild(el('div', 'tl-block tl-period'));
      const fill = calm(p.color);
      block.style.background = rgbCss(fill);
      const [lit, dim] = label('tl-plabel');
      lit.classList.add(wantsDarkInk(fill) ? 'ink-dark' : 'ink-light');
      return {
        type: 'period', seg, block, lit, dim, name,
        abbr: p.abbr || name.slice(0, 3),
        t0: seg.t0, f0: seg.f0, f1: seg.f1,
        first: i === 0, last: i === segs.length - 1, text: null,
      };
    });

    // Eons, split into eras only where an era is a real group of rows (the Phanerozoic); in the
    // Precambrian the rows of the period band are the eras themselves.
    const eons = [];
    for (const seg of segs) {
      const name = seg.period.eon || '';
      let eon = eons[eons.length - 1];
      if (!eon || eon.name !== name) eons.push(eon = { name, eras: [] });
      const eraName = seg.period.era || '';
      let era = eon.eras[eon.eras.length - 1];
      if (!era || era.name !== eraName) eon.eras.push(era = { name: eraName, segs: [] });
      era.segs.push(seg);
    }
    const eraInfo = Array.isArray(timelineData.ERAS) ? timelineData.ERAS : [];
    this._spans = [];
    for (const eon of eons) {
      const split = eon.eras.length > 1 && eon.eras.every((e) => e.name && e.segs.length > 1);
      const groups = split ? eon.eras : [{ name: '', segs: eon.eras.flatMap((e) => e.segs) }];
      const color = rgbCss(mixRgb(hexRgb(EON_COLORS[eon.name] || groups[0].segs[0].period.color), hexRgb(BAND_SURFACE), EON_MUTE));
      groups.forEach((g, gi) => {
        const first = g.segs[0];
        const last = g.segs[g.segs.length - 1];
        const block = this.eonsEl.appendChild(el('div', `tl-block tl-eon${gi > 0 ? ' tl-eon-sub' : ''}`));
        block.style.background = color;
        const [lit, dim] = label('tl-elabel');
        const name = g.name || eon.name;
        const info = name && eraInfo.find((e) => e && typeof e.name === 'string' && e.name.toLowerCase().startsWith(name.toLowerCase()));
        this._spans.push({
          type: 'span', block, lit, dim, name,
          eon: eon.name, isEra: split,
          // The first era of a split eon also carries the eon's name when there is room.
          candidates: split && gi === 0 ? [`${eon.name} · ${name}`, name] : [name],
          periods: g.segs.map((s) => periodName(s.period)),
          tagline: info && typeof info.tagline === 'string' ? info.tagline : '',
          startMa: first.startMa, endMa: last.endMa,
          t0: first.t0, f0: first.f0, f1: last.f1,
          first: this._spans.length === 0, closesEon: gi === groups.length - 1, text: null,
        });
      });
    }
    if (this._spans.length) this._spans[this._spans.length - 1].last = true;

    this._measurer = this.litLabels.appendChild(el('div', 'tl-measure'));
  }

  /** One button per event, in chronological order (that is also the arrow-key order). */
  _buildMarks() {
    const marks = [];
    const add = (kind, ev, key) => {
      if (!ev || !Number.isFinite(ev.timeMa)) return;
      const half = (ev.durationMa || 0) / 2;
      marks.push({
        kind, ev, key,
        f: maToFraction(ev.timeMa),
        f0: maToFraction(ev.timeMa + half),
        f1: maToFraction(ev.timeMa - half),
        r: MARK_RADIUS[kind],
        rank: MARK_RANK[kind] + (Number(ev.priority) || 0) * 15,
        x: 0, y: RAIL_CENTRE, hidden: false,
      });
    };

    const extinctions = Array.isArray(extinctionData.extinctions) ? extinctionData.extinctions : [];
    const crises = Array.isArray(extinctionData.crises) ? extinctionData.crises : [];
    const milestones = Array.isArray(milestoneData.milestones) ? milestoneData.milestones : [];
    for (const ext of extinctions) add('extinction', ext, `x:${ext.id}`);
    for (const c of crises) add('crisis', c, `c:${c.id}`);

    // A crisis that also has a toast is listed in both files; it gets one marker, not two.
    this._milestoneKeys = new Map();
    for (const m of milestones) {
      if (!m) continue;
      const twin = m.category === 'crisis' ? crisisTwin(m, crises) : null;
      if (twin) {
        this._milestoneKeys.set(m.id, `c:${twin.id}`);
      } else {
        this._milestoneKeys.set(m.id, `m:${m.id}`);
        add('milestone', m, `m:${m.id}`);
      }
    }

    marks.sort((a, b) => a.f - b.f || b.rank - a.rank);
    this._marks = marks;
    this._markByKey = new Map();
    this._markByEl = new Map();
    marks.forEach((m, i) => {
      m.index = i;
      const btn = el('button', `tl-mark tl-mark-${m.kind} is-ahead`);
      btn.type = 'button';
      btn.tabIndex = -1;
      btn.style.setProperty('--c', m.ev.color || '');
      btn.style.zIndex = String(Math.round(m.rank));
      btn.setAttribute('aria-label', `${m.ev.name || 'Event'}, ${formatYearsAgo(m.ev.timeMa)} — jump`);
      m.el = this.rail.appendChild(btn);
      this._markByKey.set(m.key, m);
      this._markByEl.set(btn, m);
    });
    this._marksByRank = [...marks].sort((a, b) => b.rank - a.rank || a.f - b.f);
  }

  // ---- layout (on resize) -----------------------------------------------------------------------

  _layout(force = false) {
    const W = this.track.clientWidth;
    if (!W) {
      this._W = 0;
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    if (force || W !== this._W || dpr !== this._dpr) {
      this._W = W;
      this._dpr = dpr;
      this._layoutBands(W);
      this._layoutMarks(W);
    }
    this._fitTransport();
    this._measure();
    this._drawClimate();
    this._hideTip();
    this._tipW = 0;
    this._setHover(null, null);
    this._setGhost(null);
    this._x = null;
    this._setPlayhead(this.app.clock.getFraction());
  }

  /**
   * The transport row must never overflow: drop the running time, then the long-form age, then
   * close up the spacing, and on the very narrowest screens drop the restart button.
   */
  _fitTransport() {
    const row = this.transport;
    row.classList.remove(...FIT_STEPS);
    for (const step of FIT_STEPS) {
      if (row.scrollWidth <= row.clientWidth) break;
      row.classList.add(step);
    }
  }

  /** Cache the geometry pointer handlers and tooltips need (viewport px). */
  _measure() {
    const root = this.root.getBoundingClientRect();
    const track = this.track.getBoundingClientRect();
    this._origin = { left: root.left + this.root.clientLeft, top: root.top + this.root.clientTop };
    this._rootH = this.root.clientHeight;
    this._trackLeft = track.left;
    this._trackTop = track.top;
    this._zones = [];
    for (const [name, node] of [['rail', this.rail], ['eon', this.eonsEl], ['period', this.periodsEl], ['climate', this.climate]]) {
      const r = node.getBoundingClientRect();
      if (r.height > 0) this._zones.push({ name, top: r.top - track.top, bottom: r.bottom - track.top });
    }
  }

  _textWidth(cls, text) {
    const key = `${cls}|${text}`;
    let w = this._widths.get(key);
    if (w === undefined) {
      this._measurer.className = `tl-measure ${cls}`;
      this._measurer.textContent = text;
      w = this._measurer.getBoundingClientRect().width;
      this._widths.set(key, w);
    }
    return w;
  }

  _layoutBands(W) {
    const edge = (f) => Math.round(f * W);
    const place = (item, x0, w, text) => {
      item.x0 = x0;
      item.w = w;
      item.block.style.left = `${x0}px`;
      item.block.style.width = `${w}px`;
      for (const node of [item.lit, item.dim]) {
        node.style.left = `${x0}px`;
        node.style.width = `${w}px`;
      }
      if (text !== item.text) {
        item.text = text;
        item.lit.textContent = text;
        item.dim.textContent = text;
      }
    };

    let named = 0;
    for (const p of this._periods) {
      p.x0 = edge(p.f0);
      p.w = Math.max(0, edge(p.f1) - p.x0 - (p.last ? 0 : 1));
      p.fit = '';
      if (p.w >= this._textWidth('tl-plabel', p.name) + 12) p.fit = p.name;
      else if (p.w >= Math.max(MIN_ABBR_BLOCK_PX, this._textWidth('tl-plabel is-abbr', p.abbr) + 5)) p.fit = p.abbr;
      if (p.fit) named++;
    }
    // A stray name or two on a phone-width band says less than a clean band (the tooltip and
    // the context card still name every period).
    const sparse = named < this._periods.length * MIN_NAMED_SHARE;
    for (const p of this._periods) {
      const text = sparse ? '' : p.fit;
      const abbreviated = text !== '' && text !== p.name;
      if (abbreviated !== p.abbreviated) {
        p.abbreviated = abbreviated;
        p.lit.classList.toggle('is-abbr', abbreviated);
        p.dim.classList.toggle('is-abbr', abbreviated);
      }
      place(p, p.x0, p.w, text);
    }

    for (const s of this._spans) {
      const x0 = edge(s.f0);
      // Eons are separated by a surface gap; eras inside an eon by a hairline (see .tl-eon-sub).
      const w = Math.max(0, edge(s.f1) - x0 - (s.closesEon && !s.last ? 1 : 0));
      let text = s.candidates.find((c) => w >= this._textWidth('tl-elabel', c) + 10) || '';
      // A name that only just misses (the Hadean on a laptop) may close up its tracking instead.
      const tight = !text && w >= this._textWidth('tl-elabel is-tight', s.name) + 5;
      if (tight) text = s.name;
      if (tight !== !!s.tight) {
        s.tight = tight;
        s.lit.classList.toggle('is-tight', tight);
        s.dim.classList.toggle('is-tight', tight);
      }
      place(s, x0, w, text);
    }
  }

  /**
   * Beeswarm: most important first, every marker as close to its true time as it can get.
   * A marker whose spot is taken tries the rows above/below the centre line, then growing
   * sideways nudges (never across one of the Big Five). The few that still find no room get a
   * second chance at touching their neighbours; after that a marker is left out at this width
   * (its toast still plays). Phone-width rails get one calm row and no nudging.
   */
  _layoutMarks(W) {
    const roomy = W >= MARK_ROOMY_WIDTH;
    const gap = !roomy ? 6 : this._coarse.matches ? 3 : MARK_GAP;
    const nudges = roomy ? MARK_NUDGES : [0];
    const placed = [];
    const big = [];                                  // x of the Big Five placed so far

    const place = (m, minGap) => {
      const x0 = m.f * W;
      let lo = Math.min(x0, 0);
      let hi = Math.max(x0, W);
      for (const bx of big) {
        if (bx < x0) lo = Math.max(lo, bx);
        else if (bx > x0) hi = Math.min(hi, bx);
      }
      for (const dx of nudges) {
        const x = x0 + dx;
        if (x < lo || x > hi) continue;
        for (const y of roomy ? MARK_ROWS[m.kind] : [RAIL_CENTRE]) {
          if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + m.r + minGap)) {
            m.x = x;
            m.y = y;
            placed.push(m);
            if (m.kind === 'extinction') big.push(x);
            return true;
          }
        }
      }
      return false;
    };

    for (const m of this._marksByRank) m.hidden = !place(m, gap);
    if (roomy) {
      for (const m of this._marksByRank) if (m.hidden) m.hidden = !place(m, gap - MARK_SQUEEZE);
    }

    for (const m of this._marks) {
      m.el.hidden = m.hidden;
      if (!m.hidden) {
        m.el.style.left = `${Math.round(m.x * 2) / 2}px`;
        m.el.style.top = `${m.y}px`;
      }
    }
    this._syncRoving();
  }

  _drawClimate() {
    const canvas = this.climate;
    const cssW = this._W;
    const cssH = canvas.clientHeight;
    if (!cssH) return;                       // hidden on narrow screens
    const w = Math.round(cssW * this._dpr);
    const h = Math.round(cssH * this._dpr);
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const step = Math.max(1, Math.round(this._dpr));   // one sample per CSS pixel
    for (let x = 0; x < w; x += step) {
      ctx.fillStyle = tempColor(getTemperatureAtTime(fractionToMa((x + step / 2) / w)));
      ctx.fillRect(x, 0, step, h);
    }
  }

  // ---- lookups ----------------------------------------------------------------------------------

  _zoneAt(y) {
    let best = null;
    let bestDist = Infinity;
    for (const z of this._zones) {
      const d = y < z.top ? z.top - y : y > z.bottom ? y - z.bottom : 0;
      if (d < bestDist) {
        best = z;
        bestDist = d;
      }
    }
    return best ? best.name : 'rail';
  }

  _itemAt(items, f) {
    for (const it of items) if (f < it.f1) return it;
    return items[items.length - 1];
  }

  _nearestMark(x, y, pointerType) {
    let best = null;
    let bestDist = MARK_REACH_PX[pointerType] || MARK_REACH_PX.mouse;
    for (const m of this._marks) {
      if (m.hidden) continue;
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < bestDist) {
        best = m;
        bestDist = d;
      }
    }
    return best;
  }

  _pointer(e) {
    const x = clamp(e.clientX - this._trackLeft, 0, this._W);
    return { x, y: e.clientY - this._trackTop, f: x / this._W, type: e.pointerType };
  }

  // ---- pointer: hover, click, scrub -------------------------------------------------------------

  _wireTrack() {
    const t = this.track;
    t.addEventListener('pointerenter', () => this._measure());
    t.addEventListener('pointerdown', (e) => this._onDown(e));
    t.addEventListener('pointermove', (e) => this._onMove(e));
    t.addEventListener('pointerup', (e) => this._onUp(e));
    t.addEventListener('pointercancel', () => this._endDrag());
    t.addEventListener('lostpointercapture', () => this._endDrag());
    t.addEventListener('pointerleave', () => {
      if (this._drag) return;
      this._setHover(null, null);
      this._setGhost(null);
      this._hideTip();
    });
    // A drag must never turn into a text selection or a native drag of the canvas.
    t.addEventListener('dragstart', (e) => e.preventDefault());

    // Keyboard: the hidden range input is the scrubber. Shortcuts.js leaves these keys alone
    // while a range has focus.
    const s = this.scrubber;
    s.addEventListener('keydown', (e) => this._onScrubKey(e));
    s.addEventListener('input', () => {
      this.app.seek(fractionToMa(Number(s.value) / this._rangeMax));
    });
    s.addEventListener('focus', () => this.track.classList.toggle('is-focus', s.matches(':focus-visible')));
    s.addEventListener('blur', () => this.track.classList.remove('is-focus'));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._hideTip();
    });
  }

  _onDown(e) {
    if (!this._W || this._drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();               // no text selection, no focus theft from wherever the keyboard is
    if (e.target.closest('.tl-mark')) return;   // a direct hit on a marker: its own click handles it
    this._measure();
    const p = this._pointer(e);
    const zone = this._zoneAt(p.y);
    const mark = zone === 'rail' ? this._nearestMark(p.x, p.y, p.type) : null;
    let block = null;
    if (zone === 'period') block = this._itemAt(this._periods, p.f);
    else if (zone === 'eon') block = this._itemAt(this._spans, p.f);
    this._drag = {
      id: e.pointerId, x0: e.clientX, scrubbing: false, resume: false, mark, block,
      slop: DRAG_THRESHOLD_PX[e.pointerType] || DRAG_THRESHOLD_PX.mouse,
    };
    try {
      this.track.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety: without it the drag simply ends at the track's edge */
    }
    // Blocks and markers wait to see whether this is a click; the rail and the stripe scrub at once.
    if (!mark && !block) this._beginScrub(p);
  }

  _onMove(e) {
    const d = this._drag;
    if (d) {
      if (e.pointerId !== d.id) return;
      const p = this._pointer(e);
      if (!d.scrubbing) {
        if (Math.abs(e.clientX - d.x0) < d.slop) return;
        this._beginScrub(p);
      } else {
        this._scrubTo(p);
      }
      return;
    }
    if (e.pointerType === 'touch' || !this._W) return;
    this._hoverAt(this._pointer(e));
  }

  _onUp(e) {
    const d = this._drag;
    if (!d || e.pointerId !== d.id) return;
    const wasScrubbing = d.scrubbing;
    this._endDrag();
    if (!wasScrubbing) {
      if (d.mark) this._activateMark(d.mark);
      else if (d.block) this._seekToStart(d.block);
    }
    const y = e.clientY - this._trackTop;
    const over = e.clientX >= this._trackLeft && e.clientX <= this._trackLeft + this._W && y >= 0 && y <= this.track.offsetHeight;
    if (e.pointerType === 'mouse' && over) this._hoverAt(this._pointer(e));
    else this._hideTip();
  }

  _beginScrub(p) {
    const d = this._drag;
    const { clock } = this.app;
    d.scrubbing = true;
    // Hold playback still under the pointer. Silent on purpose: the bus hears the outcome once,
    // on release (see _endDrag), so nothing flickers mid-drag.
    d.resume = clock.playing;
    if (d.resume) clock.pause();
    this.root.classList.add('is-scrubbing');
    this._setHover(null, null);
    this._setGhost(null);
    this._scrubTo(p);
  }

  _scrubTo(p) {
    this.app.clock.seekFraction(p.f);
    this._setPlayhead(p.f);
    const ma = fractionToMa(p.f);
    this._showTip({
      kind: 'scrub',
      title: formatMa(ma),
      meta: periodName(this._itemAt(this._periods, p.f).seg.period),
    }, this._trackLeft - this._origin.left + p.x, this._trackTop - this._origin.top);
  }

  _endDrag() {
    const d = this._drag;
    if (!d) return;
    this._drag = null;
    try {
      this.track.releasePointerCapture(d.id);
    } catch {
      /* already released */
    }
    if (!d.scrubbing) return;
    this.root.classList.remove('is-scrubbing');
    // One broadcast commits the scrub: buttons re-sync and, when paused, the deep link updates.
    const { app } = this;
    if (d.resume && !app.clock.atEnd()) app.play();
    else app.pause();
  }

  _hoverAt(p) {
    const zone = this._zoneAt(p.y);
    const mark = zone === 'rail' ? this._nearestMark(p.x, p.y, p.type) : null;
    if (mark) {
      this._setHover(mark, null);
      this._setGhost(null);
      this._showMarkTip(mark);
      return;
    }

    const period = this._itemAt(this._periods, p.f);
    const span = zone === 'eon' ? this._itemAt(this._spans, p.f) : null;
    this._setHover(null, zone === 'period' ? period : span);
    this._setGhost(p.x);

    const ma = fractionToMa(p.f);
    let spec;
    if (zone === 'period') spec = this._periodTip(period, ma);
    else if (zone === 'eon') spec = this._spanTip(span, ma);
    else if (zone === 'climate') spec = this._climateTip(ma);
    else spec = { kind: 'scrub', title: formatMa(ma), meta: period.name };
    this._tipOwner = null;
    this._showTip(spec, this._trackLeft - this._origin.left + p.x, this._trackTop - this._origin.top);
  }

  _setHover(mark, block) {
    if (mark !== this._hoverMark) {
      if (this._hoverMark) this._hoverMark.el.classList.remove('is-hover');
      if (mark) mark.el.classList.add('is-hover');
      this._hoverMark = mark;
      this._showWindow(mark);
    }
    if (block !== this._hoverBlock) {
      if (this._hoverBlock) this._hoverBlock.block.classList.remove('is-hover');
      if (block) block.block.classList.add('is-hover');
      this._hoverBlock = block;
    }
  }

  _setGhost(x) {
    const on = x != null;
    if (on) this.ghost.style.transform = `translateX(${Math.round(x)}px)`;
    if (on !== this._ghostOn) {
      this._ghostOn = on;
      this.ghost.classList.toggle('is-on', on);
    }
  }

  /** Bracket under the rail showing how long the hovered/focused event lasts on screen. */
  _showWindow(mark) {
    if (!mark || !this._W) {
      this.windowEl.classList.remove('is-on');
      return;
    }
    const x0 = mark.f0 * this._W;
    const w = Math.max(3, (mark.f1 - mark.f0) * this._W);
    this.windowEl.style.transform = `translateX(${Math.round(x0 - (w === 3 ? 1.5 : 0))}px)`;
    this.windowEl.style.width = `${Math.round(w)}px`;
    this.windowEl.style.setProperty('--c', mark.ev.color || '');
    this.windowEl.classList.add('is-on');
  }

  _seekToStart(item) {
    const ma = item.first ? TIMING.startTimeMa : screenSecondsToMa(item.t0 + HAIR_SECONDS);
    this.app.seek(ma);
  }

  _onScrubKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const { app } = this;
    const step = TIMING.nudgeSeconds * (e.shiftKey ? 5 : 1);
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        app.bus.emit('time:nudge', { seconds: step });
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        app.bus.emit('time:nudge', { seconds: -step });
        break;
      case 'PageUp':
        this._stepPeriod(1);
        break;
      case 'PageDown':
        this._stepPeriod(-1);
        break;
      case 'Home':
        app.seek(TIMING.startTimeMa);
        break;
      case 'End':
        app.seek(TIMING.endTimeMa);
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  /** Next start (dir 1) or current/previous start (dir -1) among items sorted by t0; null at the ends. */
  _neighbour(items, dir) {
    const pos = this.app.clock.elapsedSeconds();
    if (dir > 0) return items.find((it) => it.t0 > pos + HAIR_SECONDS + 1e-6) || null;
    let i = items.length - 1;
    while (i > 0 && items[i].t0 > pos - PREV_GRACE_SECONDS) i--;
    return items[i];
  }

  _stepPeriod(dir) {
    const target = this._neighbour(this._periods, dir);
    if (target) this._seekToStart(target);
    else this.app.seek(TIMING.endTimeMa);
  }

  // ---- event rail -------------------------------------------------------------------------------

  _wireRail() {
    const rail = this.rail;
    rail.addEventListener('click', (e) => {
      const m = this._markByEl.get(e.target.closest('.tl-mark'));
      if (m) this._activateMark(m);
    });
    rail.addEventListener('focusin', (e) => {
      const m = this._markByEl.get(e.target);
      if (!m) return;
      this._railFocus = true;
      this._setRoving(m.index);
      if (e.target.matches(':focus-visible')) {
        this._setHover(m, null);
        this._showMarkTip(m, true);
        e.target.setAttribute('aria-describedby', 'tl-tip-body');
      }
    });
    rail.addEventListener('focusout', (e) => {
      const m = this._markByEl.get(e.target);
      if (m) {
        m.el.removeAttribute('aria-describedby');
        if (this._tipOwner === m.el) this._hideTip();
        if (this._hoverMark === m) this._setHover(null, null);
      }
      if (!rail.contains(e.relatedTarget)) {
        this._railFocus = false;
        this._syncRoving();
      }
    });
    rail.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const visible = this._marks.filter((m) => !m.hidden);
      if (!visible.length) return;
      const at = visible.indexOf(this._markByEl.get(e.target));
      let to;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          to = Math.min(visible.length - 1, at + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          to = Math.max(0, at - 1);
          break;
        case 'Home':
          to = 0;
          break;
        case 'End':
          to = visible.length - 1;
          break;
        default:
          return;
      }
      e.preventDefault();   // also keeps the global ←/→ time-step shortcut out of the rail
      visible[to].el.focus();
    });
  }

  _activateMark(m) {
    const { app } = this;
    // Land a moment before the leading edge so the event is seen arriving; scaled by speed so
    // the run-up is the same ~1.5 s of real time at 0.25× and at 4×.
    const edge = maToScreenSeconds(windowStartMa(m.ev));
    let start = Math.max(0, edge - LEAD_IN_SECONDS * app.clock.speedMultiplier);
    if (m.kind !== 'extinction') {
      // …but never run up through somebody else's mass extinction (and its six-second hold):
      // "Recovery after the Great Dying" starts after the dying, not before it.
      for (const x of extinctionData.extinctions || []) {
        const half = (x.durationMa || 0) / 2;
        const opens = maToScreenSeconds(x.timeMa + half);
        if (opens >= start && opens < edge) {
          start = Math.min(edge, Math.max(start, maToScreenSeconds(x.timeMa - half) + HAIR_SECONDS));
        }
      }
    }
    app.seek(screenSecondsToMa(start), { play: true });
  }

  _setRoving(index) {
    if (index === this._roving) return;
    if (this._marks[this._roving]) this._marks[this._roving].el.tabIndex = -1;
    this._roving = index;
    if (this._marks[index]) this._marks[index].el.tabIndex = 0;
  }

  /** Tab into the rail lands on the next event ahead of the playhead (or the last one shown). */
  _syncRoving() {
    const marks = this._marks;
    const current = marks[this._roving];
    if (this._railFocus && current && !current.hidden) return;   // the user is steering
    let i = this._aheadFrom;
    while (i < marks.length && marks[i].hidden) i++;
    if (i >= marks.length) {
      i = marks.length - 1;
      while (i >= 0 && marks[i].hidden) i--;
    }
    this._setRoving(i);
  }

  _syncMarks(frame) {
    const marks = this._marks;
    const f = frame.fraction + 1e-9;
    let i = this._aheadFrom;
    while (i < marks.length && marks[i].f <= f) marks[i++].el.classList.remove('is-ahead');
    while (i > 0 && marks[i - 1].f > f) marks[--i].el.classList.add('is-ahead');
    if (i !== this._aheadFrom) {
      this._aheadFrom = i;
      this._syncRoving();
    }

    // The event on stage right now: the extinction card's, else the milestone toast's.
    const staged = frame.crisis && frame.crisis.extinction ? frame.crisis.extinction : frame.milestone;
    const stagedId = staged ? staged.id : null;
    const isExtinction = !!(staged && staged !== frame.milestone);
    if (stagedId !== this._stagedId || isExtinction !== this._stagedIsExtinction) {
      this._stagedId = stagedId;
      this._stagedIsExtinction = isExtinction;
      const key = !staged ? null : isExtinction ? `x:${stagedId}` : this._milestoneKeys.get(stagedId);
      const active = (key && this._markByKey.get(key)) || null;
      if (this._activeMark) this._activeMark.el.classList.remove('is-active');
      if (active) active.el.classList.add('is-active');
      this._activeMark = active;
    }
  }

  // ---- transport --------------------------------------------------------------------------------

  _wireTransport() {
    const { app } = this;
    this.prevBtn.addEventListener('click', () => this._stepChapter(-1));
    this.nextBtn.addEventListener('click', () => this._stepChapter(1));
    this.restartBtn.addEventListener('click', () => app.restart());
    this.playBtn.addEventListener('click', () => {
      const { clock } = app;
      if (clock.hold && clock.playing) clock.skipHold();
      else if (clock.atEnd()) app.play();          // clock.play() rewinds from the finale
      else app.togglePlay();
      this.syncPlayButton();
    });

    this.speedGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (btn) app.setSpeed(Number(btn.dataset.speed));
    });
    this.speedGroup.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const at = this.speedButtons.indexOf(e.target);
      if (at < 0) return;
      let to;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') to = Math.min(SPEEDS.length - 1, at + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') to = Math.max(0, at - 1);
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = SPEEDS.length - 1;
      else return;
      e.preventDefault();
      app.setSpeed(SPEEDS[to]);
      this.speedButtons[to].focus();
    });
    this.speedSelect.addEventListener('change', () => app.setSpeed(parseFloat(this.speedSelect.value)));

    const hints = [
      [this.prevBtn, () => ({ body: 'Previous chapter', keys: ['['] })],
      [this.nextBtn, () => ({ body: 'Next chapter', keys: [']'] })],
      [this.restartBtn, () => ({ body: 'Back to the beginning', keys: ['Home'] })],
      [this.playBtn, () => this._playHint()],
    ];
    for (const [node, spec] of hints) {
      const show = (delay) => {
        clearTimeout(this._tipTimer);
        const open = () => {
          const r = node.getBoundingClientRect();
          this._tipOwner = node;
          this._showTip({ kind: 'hint', ...spec() }, r.left + r.width / 2 - this._origin.left, r.top - this._origin.top);
        };
        if (delay && !this._tipOpen) this._tipTimer = setTimeout(open, TIP_DELAY_MS);
        else open();
      };
      const hide = () => {
        clearTimeout(this._tipTimer);
        if (this._tipOwner === node) this._hideTip();
      };
      node.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(true); });
      node.addEventListener('pointerleave', hide);
      node.addEventListener('pointerdown', hide);
      node.addEventListener('focus', () => { if (node.matches(':focus-visible')) show(false); });
      node.addEventListener('blur', hide);
    }
  }

  _playHint() {
    switch (this._playMode) {
      case 'hold': return { body: 'Holding on the extinction — press to continue', keys: ['Space'] };
      case 'pause': return { body: 'Pause', keys: ['Space'] };
      case 'replay': return { body: 'Replay from the beginning', keys: ['Space'] };
      default: return { body: 'Play', keys: ['Space'] };
    }
  }

  _stepChapter(dir) {
    const { app } = this;
    const before = app.clock.jumps;
    app.bus.emit('chapter:step', { dir });
    // The chapters component owns this event. If nothing moved the clock (it is absent or has no
    // chapters), step through the eras instead so the buttons never go dead.
    if (app.clock.jumps !== before) return;
    const target = this._neighbour(this._spans, dir);
    if (!target) return;
    this._seekToStart(target);
    app.notice(target.name, 1600);
  }

  /** Re-sync the play button after anything changed clock.playing. */
  syncPlayButton() {
    const { clock } = this.app;
    this._applyPlayState(clock.playing || this._scrubWillResume(), clock.hold, clock.atEnd());
  }

  /** A scrub in progress is holding playback and will hand it back: keep showing "playing". */
  _scrubWillResume() {
    return !!(this._drag && this._drag.scrubbing && this._drag.resume);
  }

  _applyPlayState(playing, hold, atEnd) {
    let mode = 'play';
    if (hold && playing) mode = 'hold';
    else if (playing) mode = 'pause';
    else if (atEnd) mode = 'replay';

    if (mode !== this._playMode) {
      this._playMode = mode;
      this.playBtn.dataset.state = mode;
      let label = PLAY_LABELS[mode];
      if (mode === 'hold') {
        const ext = (extinctionData.extinctions || []).find((x) => x.id === hold.id);
        label = `Continue — holding on the ${ext ? ext.name : 'extinction'}`;
      }
      this.playBtn.setAttribute('aria-label', label);
      if (this._tipOwner === this.playBtn && this._tipOpen) {
        const r = this.playBtn.getBoundingClientRect();
        this._showTip({ kind: 'hint', ...this._playHint() }, r.left + r.width / 2 - this._origin.left, r.top - this._origin.top);
      }
    }

    // Countdown ring: full when the hold starts, empty when time moves again.
    const ring = hold ? Math.round(clamp(hold.elapsed / (hold.duration || 1), 0, 1) * 200) / 2 : null;
    if (ring !== this._ringValue) {
      if ((ring === null) !== (this._ringValue === null)) this.playBtn.classList.toggle('has-ring', ring !== null);
      this._ringValue = ring;
      if (ring !== null) this.ringValue.style.strokeDashoffset = String(-ring);
    }
  }

  _syncSpeed(speed) {
    let checked = -1;
    SPEEDS.forEach((s, i) => { if (Math.abs(s - speed) < 1e-6) checked = i; });
    // An off-menu speed (deep link ?speed=3) checks nothing; the nearest step stays tabbable.
    let tabbable = checked;
    if (tabbable < 0) {
      tabbable = 0;
      SPEEDS.forEach((s, i) => { if (Math.abs(s - speed) < Math.abs(SPEEDS[tabbable] - speed)) tabbable = i; });
    }
    this.speedButtons.forEach((btn, i) => {
      btn.classList.toggle('active', i === checked);
      btn.setAttribute('aria-checked', String(i === checked));
      btn.tabIndex = i === tabbable ? 0 : -1;
    });

    const value = String(speed);
    let option = [...this.speedSelect.options].find((o) => Number(o.value) === speed);
    const custom = this.speedSelect.querySelector('option[data-custom]');
    if (!option) {
      option = custom || this.speedSelect.appendChild(el('option'));
      option.dataset.custom = '1';
      option.value = value;
      option.textContent = `${value}×`;
    } else if (custom && custom !== option) {
      custom.remove();
    }
    this.speedSelect.value = option.value;
  }

  // ---- tooltip ----------------------------------------------------------------------------------

  /** `ma` is the age under the pointer; it rides in the tooltip's corner. */
  _periodTip(item, ma) {
    const p = item.seg.period;
    // The two nearest levels above the row: "Phanerozoic · Paleozoic", "Cenozoic · Quaternary".
    const path = [p.eon, p.era, p.parentPeriod]
      .filter((s, i, all) => s && s !== item.name && all.indexOf(s) === i)
      .slice(-2);
    return {
      kind: 'period',
      color: item.block.style.background,
      kicker: path.length ? path.join(' · ') : 'Eon',
      at: formatMa(ma),
      title: item.name,
      meta: `${formatMa(item.seg.startMa)} – ${formatMa(item.seg.endMa)} · ${formatDuration(item.seg.startMa - item.seg.endMa)}`,
      body: p.description || '',
      foot: BLOCK_HINT,
    };
  }

  _spanTip(span, ma) {
    return {
      kind: 'period',
      color: span.block.style.background,
      kicker: span.isEra ? `Era · ${span.eon} eon` : 'Eon',
      at: formatMa(ma),
      title: span.name,
      meta: `${formatMa(span.startMa)} – ${formatMa(span.endMa)} · ${formatDuration(span.startMa - span.endMa)}`,
      body: span.tagline || (span.periods.length > 1 ? span.periods.join(' · ') : ''),
      foot: BLOCK_HINT,
    };
  }

  _climateTip(ma) {
    const base = Math.round(modernTempC());
    const raw = getTemperatureAtTime(ma);
    if (!Number.isFinite(raw)) return { kind: 'scrub', title: formatMa(ma), meta: 'temperature unknown' };
    const temp = Math.round(raw);
    const d = temp - base;
    let versus;
    if (d === 0) versus = `about the same as today's ${base} °C`;
    else if (d > 60) versus = `far hotter than today's ${base} °C`;
    else versus = `${Math.abs(d)} °C ${d > 0 ? 'warmer' : 'colder'} than today's ${base} °C`;
    return {
      kind: 'temp',
      color: tempColor(raw),
      kicker: 'Global temperature',
      at: formatMa(ma),
      title: `${temp < 0 ? '−' : ''}${formatInt(Math.abs(temp))} °C`,
      meta: versus,
      body: climateStateLine(ma, raw),
    };
  }

  _showMarkTip(m, viaKeyboard = false) {
    const ev = m.ev;
    const how = viaKeyboard ? 'Press Enter' : 'Click';
    const spec = { kind: m.kind, color: ev.color, title: ev.name || 'Event', meta: formatYearsAgo(ev.timeMa) };
    if (m.kind === 'extinction') {
      spec.kicker = 'Mass extinction';
      if (ev.subtitle) spec.meta += ` · ${ev.subtitle}`;
      const toll = Number.isFinite(ev.severityPercent) ? `${ev.severityPercent}% ${ev.severityLabel || 'of species lost'}` : '';
      // Older data has no short cause; its one-line description already states the toll.
      spec.body = ev.causeShort ? [toll, ev.causeShort].filter(Boolean).join(' — ') : ev.description || toll;
      spec.foot = `${how} to watch it unfold`;
    } else if (m.kind === 'crisis') {
      spec.kicker = 'Biotic crisis';
      spec.body = ev.description || ev.severityNote || '';
      spec.foot = `${how} to jump there`;
    } else {
      spec.kicker = CATEGORY_LABELS[ev.category] || 'Milestone';
      spec.body = ev.description || '';
      spec.foot = `${how} to jump there`;
    }
    this._tipOwner = m.el;
    this._showTip(spec, this._trackLeft - this._origin.left + m.x, this._trackTop - this._origin.top);
  }

  /**
   * Fill and place the shared tooltip. anchorX/anchorTop are relative to the footer's padding
   * box; the tip sits above anchorTop, centred on anchorX but never leaving the viewport.
   */
  _showTip(spec, anchorX, anchorTop) {
    clearTimeout(this._tipTimer);
    const els = this._tipEls;
    const last = this._tipText;
    let changed = false;
    for (const field of ['kicker', 'at', 'title', 'meta', 'body', 'foot']) {
      const text = spec[field] || '';
      if (text === last[field]) continue;
      last[field] = text;
      els[field].textContent = text;
      els[field].hidden = !text;
      changed = true;
    }
    const keys = (spec.keys || []).join(' ');
    if (keys !== last.keys) {
      last.keys = keys;
      els.keys.replaceChildren(...(spec.keys || []).map((k) => el('kbd', '', k)));
      els.keys.hidden = !keys;
      changed = true;
    }
    if (spec.kind !== last.kind) {
      last.kind = spec.kind;
      this.tip.dataset.kind = spec.kind;
      changed = true;
    }
    const color = spec.color || '';
    if (color !== last.color) {
      last.color = color;
      this.tip.style.setProperty('--tip-color', color || 'transparent');
    }
    els.head.hidden = !last.kicker;

    if (changed || !this._tipW) this._tipW = this.tip.offsetWidth;
    const w = this._tipW;
    const min = 8 - this._origin.left;
    const max = document.documentElement.clientWidth - 8 - w - this._origin.left;
    const left = Math.round(clamp(anchorX - w / 2, min, Math.max(min, max)));
    this.tip.style.transform = `translateX(${left}px)`;
    this.tip.style.bottom = `${Math.round(this._rootH - anchorTop + 9)}px`;
    this.tip.style.setProperty('--caret-x', `${Math.round(clamp(anchorX - left, 12, w - 12))}px`);
    if (!this._tipOpen) {
      this._tipOpen = true;
      this.tip.classList.add('is-open');
    }
  }

  _hideTip() {
    clearTimeout(this._tipTimer);
    this._tipOwner = null;
    if (!this._tipOpen) return;
    this._tipOpen = false;
    this.tip.classList.remove('is-open');
  }

  // ---- per frame --------------------------------------------------------------------------------

  /** Move the playhead and everything keyed to it: the dimming veil and the two label layers. */
  _setPlayhead(fraction) {
    const W = this._W;
    const x = Math.round(clamp(fraction, 0, 1) * W * this._dpr) / this._dpr;
    if (x === this._x) return;
    this._x = x;
    this.playhead.style.transform = `translateX(${x}px)`;
    this.veil.style.transform = `translateX(${x}px)`;
    this.litLabels.style.clipPath = `inset(0 ${W - x}px 0 0)`;
    this.dimLabels.style.clipPath = `inset(0 0 0 ${x}px)`;
  }

  update(frame) {
    if (!this._W) return;
    if ((window.devicePixelRatio || 1) !== this._dpr) this._layout();

    this._setPlayhead(frame.fraction);

    const value = Math.round(frame.fraction * this._rangeMax);
    if (value !== this._rangeValue) {
      this._rangeValue = value;
      this.scrubber.value = String(value);
    }

    if (frame.timeMa !== this._ma) {
      this._ma = frame.timeMa;
      const age = formatMa(frame.timeMa);
      if (age !== this._age) {
        this._age = age;
        this.timeDisplay.textContent = age;
      }
      const long = formatYearsAgo(frame.timeMa);
      if (long !== this._ageLong) {
        this._ageLong = long;
        this._valueDirty = true;
      }
      // At the very end the two readouts would say the same thing twice ("Today", "Present").
      const shown = frame.atEnd ? '' : long;
      if (shown !== this._ageShown) {
        this._ageShown = shown;
        this.ageLongEl.textContent = shown;
      }
    }
    if (frame.period !== this._period) {
      this._period = frame.period;
      this._valueDirty = true;
    }

    // Screen readers hear the slider's value text when it changes under focus: keep it fresh
    // while paused or scrubbing, and merely current while the story plays.
    if (this._valueDirty && (!frame.playing || frame.jumped || frame.nowSec - (this._valueAt || 0) >= ARIA_THROTTLE_SEC)) {
      this._valueDirty = false;
      this._valueAt = frame.nowSec;
      this.scrubber.setAttribute('aria-valuetext', `${this._ageLong}, ${periodName(frame.period)}`);
    }

    const seconds = Math.round(frame.fraction * this._total);
    if (seconds !== this._seconds) {
      this._seconds = seconds;
      this.elapsedEl.textContent = `${formatClock(seconds)} / ${formatClock(this._total)}`;
    }

    this._applyPlayState(frame.playing || this._scrubWillResume(), frame.hold, frame.atEnd);
    this._syncMarks(frame);
  }
}
