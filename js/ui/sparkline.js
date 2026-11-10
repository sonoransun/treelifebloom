// Sparkline — a small canvas chart of one [Ma, value] curve across the WHOLE story.
//
// x is the warped screen-time axis (js/engine/timeScale.js): 0 = the formation of the Earth,
// 1 = the present, so a sparkline lines up with the timeline bar and its playhead moves at a
// constant rate during playback. The part already played is drawn solid, the part still to come
// faint, with a dot at the playhead. An optional reference value ("today") is drawn as a hairline,
// and the area between it and the curve is washed in, so "more / less than today" reads at a glance.
//
//   const spark = new Sparkline(parent, { curve, height: 24, log: true, baseline: 280 });
//   spark.draw(timeMa);          // every frame — repaints only when the playhead moved >= 0.5 px
//   spark.setCursor(ma | null);  // optional crosshair, e.g. to link several sparklines on hover
//   spark.timeAt(clientX);       // the time under a pointer position
//
// The curve is rasterised once per size into two off-screen layers (past / future); a repaint is
// two drawImage calls and one dot.

import { TIMING } from '../config.js';
import { fractionToMa, getSegments, maToFraction } from '../engine/timeScale.js';

const DOT_RADIUS = 3;        // playhead dot, CSS px
const DOT_RING = 1.5;        // surface-coloured ring that lifts the dot off the line
const INSET = DOT_RADIUS + DOT_RING; // plot inset so the dot is never clipped by the canvas edge
const LINE_WIDTH = 1.5;
const FUTURE_ALPHA = 0.28;   // the part of the story still to come
const WASH_ALPHA = 0.16;     // area between the curve and the reference line (past only)
const SAMPLE_STEP = 1 / 64;  // extra samples between data points (keeps log scales honest)
const MIN_MOVE_PX = 0.5;

/** Linear interpolation on a curve sorted oldest → youngest (descending Ma), clamped at both ends. */
function valueAt(curve, ma) {
  const last = curve.length - 1;
  if (ma >= curve[0][0]) return curve[0][1];
  if (ma <= curve[last][0]) return curve[last][1];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (curve[mid][0] >= ma) lo = mid;
    else hi = mid;
  }
  const [t1, v1] = curve[lo];
  const [t2, v2] = curve[hi];
  return t1 === t2 ? v2 : v1 + (v2 - v1) * ((t1 - ma) / (t1 - t2));
}

function cssToken(el, name, fallback) {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}

export class Sparkline {
  /**
   * @param {HTMLElement} parent
   * @param {object} opts
   * @param {Array<[number, number]>} opts.curve  [Ma, value] pairs, oldest first
   * @param {number} [opts.width]     CSS px; omit to fill the parent and follow its width
   * @param {number} [opts.height]    CSS px (default 24)
   * @param {string} [opts.color]     line colour (default: the secondary text token)
   * @param {boolean} [opts.log]      log10 y-scale
   * @param {[number, number]} [opts.domain]  y-range; values outside run off the chart
   * @param {number} [opts.baseline]  reference value drawn as a hairline (e.g. today's value)
   * @param {number} [opts.fromMa]    the curve is unknown before this age: nothing is drawn there
   * @param {string} [opts.surface]   colour behind the chart, used to ring the playhead dot
   */
  constructor(parent, { curve, width, height = 24, color, log = false, domain, baseline, fromMa, surface } = {}) {
    this.parent = parent;
    this.curve = curve[0][0] >= curve[curve.length - 1][0] ? curve : [...curve].reverse();
    this.log = !!log;
    this.fromMa = fromMa ?? Infinity;
    this.height = height;
    this.autoWidth = width == null;

    // Colours come from the design tokens unless the caller overrides them.
    this.color = color || cssToken(parent, '--text-2', '#b9c2d6');
    this.accent = cssToken(parent, '--accent', '#f2b84b');
    this.surface = surface || cssToken(parent, '--bg-2', '#111a2b');
    this.rule = cssToken(parent, '--line-strong', '#2d3b5a');

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sparkline';
    this.canvas.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this._buildScale(domain, baseline);
    this._buildPath();

    this._w = 0;
    this._dpr = 0;
    this._past = document.createElement('canvas');
    this._future = document.createElement('canvas');
    this._lastX = -Infinity;
    this._lastMa = null;
    this._cursorMa = null;
    this._dirty = true;

    if (this.autoWidth) {
      this._observer = new ResizeObserver((entries) => {
        const w = Math.floor(entries[entries.length - 1].contentRect.width);
        if (w !== this._w) this.resize(w, this.height);
      });
      this._observer.observe(parent);
      this.resize(Math.floor(parent.clientWidth), height);
    } else {
      this.resize(width, height);
    }
  }

  // ---- scale & geometry (size-independent) ---------------------------------------------------

  _t(value) {
    return this.log ? Math.log10(Math.max(value, 1e-9)) : value;
  }

  _buildScale(domain, baseline) {
    let min = Infinity;
    let max = -Infinity;
    if (domain) {
      [min, max] = domain;
    } else {
      for (const [ma, v] of this.curve) {
        if (ma > this.fromMa) continue;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (baseline != null) {
        min = Math.min(min, baseline);
        max = Math.max(max, baseline);
      }
    }
    if (!(max > min)) max = min + 1;
    this.min = min;
    this.max = max;
    this._t0 = this._t(min);
    this._span = this._t(max) - this._t0 || 1;
    this._baseN = baseline == null ? null : this._norm(baseline);
  }

  /** value → 0 (bottom of the scale) … 1 (top); outside that range when the value is off the chart. */
  _norm(value) {
    return (this._t(value) - this._t0) / this._span;
  }

  _buildPath() {
    // Vertices: every data point, every period boundary (where the time warp bends) and a regular
    // sprinkling of samples in between so long spans stay faithful on a log scale.
    const oldest = Math.min(TIMING.startTimeMa, this.fromMa);
    const youngest = TIMING.endTimeMa;
    const stops = new Set([oldest, youngest]);
    for (const [ma] of this.curve) stops.add(ma);
    for (const seg of getSegments()) {
      stops.add(seg.startMa);
      stops.add(seg.endMa);
    }
    for (let f = 0; f <= 1; f += SAMPLE_STEP) stops.add(fractionToMa(f));

    this._points = [...stops]
      .filter((ma) => ma <= oldest && ma >= youngest)
      .sort((a, b) => b - a)
      .map((ma) => [maToFraction(ma), this._norm(valueAt(this.curve, ma))]);
  }

  // ---- sizing --------------------------------------------------------------------------------

  /** Set the CSS size; called automatically when no explicit width was given. */
  resize(width, height = this.height) {
    this._w = Math.max(0, width);
    this.height = height;
    this._dpr = 0; // forces the layers to be rebuilt on the next draw
    this._dirty = true;
    if (this._lastMa != null) this.draw(this._lastMa);
  }

  _x(fraction) {
    return INSET + fraction * (this._w - 2 * INSET);
  }

  _y(norm) {
    return INSET + (1 - norm) * (this.height - 2 * INSET);
  }

  _rebuildLayers() {
    const dpr = window.devicePixelRatio || 1;
    this._dpr = dpr;
    const pw = Math.max(1, Math.round(this._w * dpr));
    const ph = Math.max(1, Math.round(this.height * dpr));
    for (const c of [this.canvas, this._past, this._future]) {
      c.width = pw;
      c.height = ph;
    }
    this.canvas.style.width = `${this._w}px`;
    this.canvas.style.height = `${this.height}px`;
    this._paintLayer(this._past, 1, WASH_ALPHA);
    this._paintLayer(this._future, FUTURE_ALPHA, 0);
  }

  _tracePath(ctx) {
    ctx.beginPath();
    let started = false;
    for (const [f, n] of this._points) {
      const x = this._x(f);
      const y = this._y(n);
      if (started) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      started = true;
    }
  }

  _paintLayer(layer, lineAlpha, washAlpha) {
    const ctx = layer.getContext('2d');
    const points = this._points;
    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.clearRect(0, 0, this._w, this.height);
    if (!points.length) return;

    const hasBase = this._baseN != null && this._baseN >= 0 && this._baseN <= 1;
    const baseY = hasBase ? Math.round(this._y(this._baseN)) + 0.5 : this.height;

    // Wash between the curve and the reference line (or the floor when there is none).
    if (washAlpha > 0) {
      this._tracePath(ctx);
      ctx.lineTo(this._x(points[points.length - 1][0]), baseY);
      ctx.lineTo(this._x(points[0][0]), baseY);
      ctx.closePath();
      ctx.globalAlpha = washAlpha;
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Reference hairline ("today"): identical in both layers so it reads as one continuous rule.
    if (hasBase) {
      ctx.strokeStyle = this.rule;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.lineTo(this._w, baseY);
      ctx.stroke();
    }

    ctx.globalAlpha = lineAlpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    this._tracePath(ctx);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ---- per-frame -----------------------------------------------------------------------------

  /** Move the playhead to timeMa. Cheap to call every frame. */
  draw(timeMa) {
    this._lastMa = timeMa;
    if (this._w < 2 * INSET + 2) return; // not laid out (hidden tab, closed drawer)
    if (this._dpr !== (window.devicePixelRatio || 1)) {
      this._rebuildLayers();
      this._dirty = true;
    }

    const x = this._x(maToFraction(timeMa));
    if (!this._dirty && Math.abs(x - this._lastX) < MIN_MOVE_PX) return;
    this._lastX = x;
    this._dirty = false;

    const { ctx, canvas } = this;
    const split = Math.max(0, Math.min(canvas.width, Math.round(x * this._dpr)));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (split < canvas.width) {
      ctx.drawImage(this._future, split, 0, canvas.width - split, canvas.height, split, 0, canvas.width - split, canvas.height);
    }
    if (split > 0) {
      ctx.drawImage(this._past, 0, 0, split, canvas.height, 0, 0, split, canvas.height);
    }

    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    if (this._cursorMa != null) this._drawCursor(ctx);
    if (timeMa > this.fromMa) {
      // No value yet: a quiet tick shows where the playhead is, without inventing a reading.
      ctx.strokeStyle = this.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, this.height / 2 - 4);
      ctx.lineTo(Math.round(x) + 0.5, this.height / 2 + 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    const y = this._y(Math.max(0, Math.min(1, this._norm(valueAt(this.curve, timeMa)))));
    ctx.fillStyle = this.surface;
    ctx.beginPath();
    ctx.arc(x, y, DOT_RADIUS + DOT_RING, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.accent;
    ctx.beginPath();
    ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawCursor(ctx) {
    const ma = this._cursorMa;
    const x = Math.round(this._x(maToFraction(ma))) + 0.5;
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 1);
    ctx.lineTo(x, this.height - 1);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (ma > this.fromMa) return;
    const y = this._y(Math.max(0, Math.min(1, this._norm(valueAt(this.curve, ma)))));
    ctx.fillStyle = this.surface;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /** Show a crosshair at a time, or clear it with null (linked hover across sparklines). */
  setCursor(timeMa) {
    if (timeMa === this._cursorMa) return;
    this._cursorMa = timeMa;
    this._dirty = true;
    if (this._lastMa != null) this.draw(this._lastMa);
  }

  /** The time (Ma) under a viewport x coordinate, clamped to the story. */
  timeAt(clientX) {
    const rect = this.canvas.getBoundingClientRect();
    const f = (clientX - rect.left - INSET) / Math.max(1, rect.width - 2 * INSET);
    return fractionToMa(Math.max(0, Math.min(1, f)));
  }

  /** The curve's value at a time (same interpolation the playhead dot uses). */
  valueAt(timeMa) {
    return valueAt(this.curve, timeMa);
  }

  destroy() {
    if (this._observer) this._observer.disconnect();
    this.canvas.remove();
  }
}
