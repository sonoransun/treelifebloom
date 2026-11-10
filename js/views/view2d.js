// Map view — the planet as an Equal Earth world map floating on the dark backdrop.
//
// The surface (oceans, shelves, ice, land, plate boundaries, place names, crisis effects) is
// painted by js/views/planetPainter.js; this view owns everything around it: fitting the planet
// into the container, pan and zoom (drag, wheel, pinch, double-click, HUD buttons), species
// markers with their labels, arrival blooms and departure embers, and hover / click picking.
//
// While nothing changes (paused, no crisis, no magma) the painted planet is kept in an offscreen
// bitmap and only the markers are redrawn.
//
// Renderer interface: init(), render(polygons, timeMa, boundaries, atmo, frame), resize(),
// destroy(), onSpeciesHover(cb), onSpeciesClick(cb). Extras: setViewport(), getViewport().

import { COLORS, FONTS, getCategoryInfo } from '../config.js';
import { paintPlanet, paintKey, projectPoint, unprojectPoint, fitScale, equalEarth } from './planetPainter.js';
import { drawMarker } from './glyphs.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const TAU = Math.PI * 2;
const ARRIVAL_SEC = 2.6;
const DEPARTURE_SEC = 1.6;
const EMBER = '#9aa3b5';
const LABEL_FONT = `600 12px ${FONTS.ui}`;
const LABEL_H = 16;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const easeOut = (t) => 1 - (1 - t) * (1 - t) * (1 - t);

const ICONS = {
  in: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.2v9.6M3.2 8h9.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  out: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8h9.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  reset: '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 6V2.9h3.1M13.4 10v3.1h-3.1M13.4 6V2.9h-3.1M2.6 10v3.1h3.1"/></g><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>',
};

/** Stable 0..1 number from a string (phase offsets, so markers do not breathe in unison). */
function hash01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export class View2D {
  constructor(container) {
    this.container = container;
    this.canvas = container.querySelector('#canvas2d');
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.active = false;
    this.colors = { accent: '#f2b84b', accentStrong: '#ffd27a', text: COLORS.text, muted: '#b9c2d6', ink: COLORS.background };

    // Viewport: zoom relative to the fitted planet, pan = offset of the planet centre (CSS px).
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.baseScale = 100;
    this.pad = 28;
    this.insetBottom = 0;        // CSS px at the bottom of the stage covered by other UI (portrait)
    this.home = { zoom: 1, panX: 0, panY: 0 };
    this._zoomAnim = null;       // { from, to, x, y, … } about a point, or { glide, from, to, … }
    this._nowSec = 0;
    this._reducedMotion = false;

    // The view object handed to the painter (mutated in place every frame).
    this.view = {
      projection: equalEarth,
      scale: 100, cx: 0, cy: 0, width: 0, height: 0, pixelRatio: 1,
      outline: true,
      zoom: 1,
      layers: { graticule: true, labels: true, features: true, boundaries: false },
      avoid: [],
    };

    // Painted-planet cache.
    this._cache = null;
    this._cacheKey = null;
    this._lastKey = null;
    /** Diagnostics of the last frame: ms spent painting the planet (0 when blitted from cache). */
    this.stats = { paintMs: 0, cached: false };

    // Markers of the current frame and the bookkeeping for blooms / embers.
    this._markers = [];
    this._markerPool = [];
    this._byId = new Map();
    this._prev = new Map();      // id → { lon, lat, name, color, glyph, r, labelled } from the last frame
    this._fx = [];               // arrival / departure animations
    this._labels = [];           // species labels laid out for this frame
    this._labelPool = [];
    this._labelled = new Set();
    this._haloSprites = new Map();
    this._textWidths = new Map();

    // Pointer state.
    this._pointers = new Map();  // pointerId → { x, y }
    this._drag = null;           // { x, y, startX, startY, moved, type }
    this._pinch = null;          // { dist, zoom, mx, my }
    this._lastTap = null;        // { x, y, time }
    this._hoverPoint = null;     // { x, y, clientX, clientY } of a resting mouse / pen
    this._hoverMoved = false;
    this._hoverSp = null;
    this._hoverCb = null;
    this._clickCb = null;
    this._cursor = '';

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onWheel = this._onWheel.bind(this);

    this._buildHud();
  }

  onSpeciesHover(cb) {
    this._hoverCb = cb;
  }

  onSpeciesClick(cb) {
    this._clickCb = cb;
  }

  // ---- lifecycle ----------------------------------------------------------------------------

  init() {
    this.ctx = this.canvas.getContext('2d');
    this.canvas.style.display = 'block';
    this.hud.hidden = false;
    this.active = true;
    const style = getComputedStyle(document.documentElement);
    const token = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    this.colors = {
      accent: token('--accent', '#f2b84b'),
      accentStrong: token('--accent-strong', '#ffd27a'),
      text: token('--text-1', COLORS.text),
      muted: token('--text-2', '#b9c2d6'),
      ink: token('--bg-0', COLORS.background),
    };
    this.resize();

    const c = this.canvas;
    c.addEventListener('pointerdown', this._onPointerDown);
    c.addEventListener('pointermove', this._onPointerMove);
    c.addEventListener('pointerup', this._onPointerUp);
    c.addEventListener('pointercancel', this._onPointerUp);
    c.addEventListener('pointerleave', this._onPointerLeave);
    c.addEventListener('wheel', this._onWheel, { passive: false });
  }

  destroy() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this._onPointerDown);
    c.removeEventListener('pointermove', this._onPointerMove);
    c.removeEventListener('pointerup', this._onPointerUp);
    c.removeEventListener('pointercancel', this._onPointerUp);
    c.removeEventListener('pointerleave', this._onPointerLeave);
    c.removeEventListener('wheel', this._onWheel);
    c.style.display = 'none';
    this._setCursor('');
    this.hud.hidden = true;
    this.active = false;
    this._pointers.clear();
    this._drag = null;
    this._pinch = null;
    this._zoomAnim = null;
    this._hoverPoint = null;
    this._setHover(null, 0, 0);
    this._fx.length = 0;
    this._prev.clear();
  }

  resize() {
    if (!this.ctx) return;
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const oldBase = this.baseScale;
    const wasHome = !this._isTransformed();
    this.width = w;
    this.height = h;
    this.dpr = dpr;
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    this.pad = Math.min(w, h) < 520 ? 14 : 28;
    this.baseScale = fitScale(equalEarth, w, h, this.pad);
    // Portrait layouts stack the context card and the zoom buttons over the bottom of the stage:
    // keep that strip out of the planet's home position and out of the pan limits.
    const portrait = w / h < 1.05;
    this.insetBottom = portrait ? Math.round(h * 0.18) : 0;

    // Home view. Landscape and tablets: the whole planet. Phones: fitting by width would leave a
    // sliver, so open zoomed until the planet fills most of the free height, centred on the
    // Atlantic–Africa side where most of the story happens; the viewer pans sideways.
    const b = equalEarth.bounds;
    let homeZoom = 1;
    let homePanX = 0;
    if (portrait && w < 600) {
      const free = h - 2 * this.pad - this.insetBottom;
      homeZoom = clamp((0.8 * free) / (2 * b.yMax * this.baseScale), 1, 3.2);
      homePanX = -equalEarth.project(12, 0)[0] * this.baseScale * homeZoom;
    }
    this.home = { zoom: homeZoom, panX: homePanX, panY: -this.insetBottom / 2 };
    if (wasHome) {
      this.zoom = this.home.zoom;
      this.panX = this.home.panX;
      this.panY = this.home.panY;
    } else if (oldBase > 0) {
      // keep the same spot of the planet under the centre of the container
      this.panX *= this.baseScale / oldBase;
      this.panY *= this.baseScale / oldBase;
    }
    this._clampPan();
    this._cacheKey = null;
    this._lastKey = null;
    this._syncHud();
  }

  // ---- viewport -----------------------------------------------------------------------------

  /** { zoom, lon, lat }: zoom factor and the coordinate at the centre of the visible stage. */
  getViewport() {
    this._syncView();
    const centre = unprojectPoint(this.view, this.width / 2, (this.height - this.insetBottom) / 2);
    return { zoom: this.zoom, lon: centre ? centre[0] : 0, lat: centre ? centre[1] : 0 };
  }

  /**
   * Move the viewport. Any of zoom (1–8), lon / lat (coordinate to centre) may be given;
   * `animate: false` jumps. `home: true` returns to the fitted view.
   */
  setViewport({ zoom, lon, lat, home = false, animate = true } = {}) {
    let target;
    if (home) {
      target = { ...this.home };
    } else {
      const z = clamp(zoom ?? this.zoom, MIN_ZOOM, MAX_ZOOM);
      target = { zoom: z, panX: this.panX * (z / this.zoom), panY: this.panY * (z / this.zoom) };
      if (Number.isFinite(lon) && Number.isFinite(lat)) {
        const p = equalEarth.project(lon, lat);
        target.panX = -p[0] * this.baseScale * z;
        target.panY = p[1] * this.baseScale * z - this.insetBottom / 2;
      }
    }
    if (animate && !this._reducedMotion && this.active) {
      this._zoomAnim = { glide: true, from: { zoom: this.zoom, panX: this.panX, panY: this.panY }, to: target, start: this._nowSec, duration: 0.42 };
    } else {
      this._zoomAnim = null;
      this.zoom = target.zoom;
      this.panX = target.panX;
      this.panY = target.panY;
      this._clampPan();
    }
    this._syncHud();
  }

  /**
   * Keep the planet findable: once it is larger than the stage its edges may not come inside the
   * padding (nor, at the bottom, above the inset); while it is smaller it stays centred.
   */
  _clampPan() {
    const b = equalEarth.bounds;
    const k = this.baseScale * this.zoom;
    const limX = Math.max(0, b.xMax * k - (this.width / 2 - this.pad));
    const midY = -this.insetBottom / 2;
    const limY = Math.max(0, b.yMax * k - (this.height - 2 * this.pad - this.insetBottom) / 2);
    this.panX = clamp(this.panX, -limX, limX);
    this.panY = clamp(this.panY, midY - limY, midY + limY);
  }

  /** Zoom to `zoom`, keeping the planet point under (x, y) (CSS px in the container) where it is. */
  _zoomAt(x, y, zoom) {
    const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    const ratio = z / this.zoom;
    const cx = this.width / 2 + this.panX, cy = this.height / 2 + this.panY;
    this.panX = x - (x - cx) * ratio - this.width / 2;
    this.panY = y - (y - cy) * ratio - this.height / 2;
    this.zoom = z;
    this._clampPan();
  }

  _zoomBy(factor, x = this.width / 2, y = this.height / 2) {
    const from = this._zoomAnim && !this._zoomAnim.glide ? this._zoomAnim.to : this.zoom;
    const to = clamp(from * factor, MIN_ZOOM, MAX_ZOOM);
    if (this._reducedMotion) {
      this._zoomAnim = null;
      this._zoomAt(x, y, to);
    } else {
      this._zoomAnim = { from: this.zoom, to, x, y, start: this._nowSec, duration: 0.24 };
    }
    this._syncHud();
  }

  _stepZoomAnimation() {
    const a = this._zoomAnim;
    if (!a) return;
    const t = clamp((this._nowSec - a.start) / a.duration, 0, 1);
    const e = easeOut(t);
    if (a.glide) {
      this.zoom = a.from.zoom * Math.pow(a.to.zoom / a.from.zoom, e);
      this.panX = a.from.panX + (a.to.panX - a.from.panX) * e;
      this.panY = a.from.panY + (a.to.panY - a.from.panY) * e;
      this._clampPan();
    } else {
      this._zoomAt(a.x, a.y, a.from * Math.pow(a.to / a.from, e));
    }
    if (t >= 1) {
      this._zoomAnim = null;
      this._syncHud();
    }
  }

  _isTransformed() {
    if (this._zoomAnim) return true;
    return Math.abs(this.zoom - this.home.zoom) > 0.002
      || Math.abs(this.panX - this.home.panX) > 0.5 || Math.abs(this.panY - this.home.panY) > 0.5;
  }

  _syncView() {
    const v = this.view;
    v.scale = this.baseScale * this.zoom;
    v.cx = this.width / 2 + this.panX;
    v.cy = this.height / 2 + this.panY;
    v.width = this.width;
    v.height = this.height;
    v.pixelRatio = this.dpr;
    v.zoom = this.zoom;
    return v;
  }

  // ---- HUD ----------------------------------------------------------------------------------

  _buildHud() {
    const hud = document.createElement('div');
    hud.className = 'map-hud';
    hud.setAttribute('role', 'group');
    hud.setAttribute('aria-label', 'Map zoom');
    hud.hidden = true;
    const button = (name, label, icon) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `map-hud-btn map-hud-${name}`;
      b.setAttribute('aria-label', label);
      b.title = label;
      b.innerHTML = icon;
      hud.appendChild(b);
      return b;
    };
    this.btnIn = button('in', 'Zoom in', ICONS.in);
    this.btnOut = button('out', 'Zoom out', ICONS.out);
    this.btnReset = button('reset', 'Reset the map view', ICONS.reset);
    this.btnIn.addEventListener('click', () => this._zoomBy(1.6));
    this.btnOut.addEventListener('click', () => this._zoomBy(1 / 1.6));
    this.btnReset.addEventListener('click', () => this.setViewport({ home: true }));
    this.container.appendChild(hud);
    this.hud = hud;
  }

  _syncHud() {
    if (!this.hud) return;
    const target = this._zoomAnim && !this._zoomAnim.glide ? this._zoomAnim.to : this.zoom;
    const transformed = this._isTransformed();
    if (this.btnReset.disabled === transformed) this.btnReset.disabled = !transformed;
    const maxed = target >= MAX_ZOOM - 1e-3, mined = target <= MIN_ZOOM + 1e-3;
    if (this.btnIn.disabled !== maxed) this.btnIn.disabled = maxed;
    if (this.btnOut.disabled !== mined) this.btnOut.disabled = mined;
  }

  // ---- render -------------------------------------------------------------------------------

  render(polygons, timeMa, boundaries, atmo, frame) {
    const ctx = this.ctx;
    if (!ctx || !frame || !frame.look) return;
    this._nowSec = frame.nowSec;
    this._reducedMotion = !!frame.reducedMotion;
    this._stepZoomAnimation();

    const view = this._syncView();
    const layers = frame.layers || {};
    view.layers.labels = layers.labels !== false;
    view.layers.features = layers.labels !== false;
    view.layers.boundaries = !!frame.boundaries;

    // Lay out markers and their labels first: place names on the planet then keep clear of them.
    this._layoutMarkers(frame, view);
    this._layoutLabels(frame);

    // Planet: repaint only when the picture changed; a picture that holds still for two frames
    // moves into the offscreen cache and is blitted from then on.
    const key = paintKey(frame, view);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const started = performance.now();
    const cached = key === this._cacheKey && !!this._cache;
    if (cached) {
      ctx.drawImage(this._cache, 0, 0);
    } else if (key === this._lastKey) {
      const cache = this._cacheCanvas();
      const cctx = cache.getContext('2d');
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.clearRect(0, 0, cache.width, cache.height);
      paintPlanet(cctx, frame, view);
      this._cacheKey = key;
      ctx.drawImage(cache, 0, 0);
    } else {
      paintPlanet(ctx, frame, view);
      this._cacheKey = null;
    }
    this._lastKey = key;
    this.stats.paintMs = cached ? 0 : performance.now() - started;
    this.stats.cached = cached;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._drawMarkers(frame);
    this._drawLabels();
    this._pickHover();
    if (!this._zoomAnim && this.btnReset.disabled === this._isTransformed()) this._syncHud();
  }

  _cacheCanvas() {
    if (!this._cache) this._cache = document.createElement('canvas');
    if (this._cache.width !== this.canvas.width || this._cache.height !== this.canvas.height) {
      this._cache.width = this.canvas.width;
      this._cache.height = this.canvas.height;
    }
    return this._cache;
  }

  // ---- markers ------------------------------------------------------------------------------

  _layoutMarkers(frame, view) {
    const markers = this._markers;
    const pool = this._markerPool;
    const alive = frame.alive || [];
    const positions = frame.positions;
    const small = Math.min(this.width, this.height) < 520;
    const sizeK = small ? 0.86 : 1;
    const t = frame.nowSec;
    let n = 0;
    this._byId.clear();
    for (let i = 0; i < alive.length; i++) {
      const sp = alive[i];
      if (sp.category === 'event') continue;                  // legacy pseudo-species
      const pos = (positions && positions.get(sp.id)) || sp.location;
      if (!pos) continue;
      const p = projectPoint(view, pos.lon, pos.lat);
      let m = pool[n];
      if (!m) {
        m = {};
        pool[n] = m;
      }
      const info = getCategoryInfo(sp.category);
      const abundance = clamp(sp.currentAbundance || 0, 0, 1);
      const breath = frame.reducedMotion ? 1 : 1 + 0.06 * Math.sin(t * 1.7 + hash01(sp.id) * TAU);
      m.sp = sp;
      m.id = sp.id;
      m.lon = pos.lon;
      m.lat = pos.lat;
      m.x = p[0];
      m.y = p[1];
      m.baseR = (4 + 4 * Math.pow(abundance, 0.7)) * sizeK;
      m.r = m.baseR * breath;
      m.color = info.color;
      m.glyph = info.group.glyph;
      m.lit = sp.id === frame.hoverId || sp.id === frame.focusId;
      markers[n++] = m;
      this._byId.set(sp.id, m);
    }
    markers.length = n;

    // arrivals bloom, departures leave an ember
    const fx = this._fx;
    if (frame.jumped) {
      fx.length = 0;
    } else {
      for (const id of frame.arrivals || []) {
        const m = this._byId.get(id);
        if (m) fx.push({ kind: 'arrive', id, start: t, name: m.sp.name });
      }
      for (const id of frame.departures || []) {
        const last = this._prev.get(id);
        if (last) fx.push({ kind: 'depart', id, start: t, ...last });
      }
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      const life = f.kind === 'arrive' ? ARRIVAL_SEC : DEPARTURE_SEC;
      if (t - f.start > life || (f.kind === 'arrive' && !this._byId.has(f.id))) {
        fx.splice(i, 1);
        continue;
      }
      if (f.kind === 'depart') {
        const p = projectPoint(view, f.lon, f.lat);
        f.x = p[0];
        f.y = p[1];
        f.alpha = Math.pow(1 - clamp((t - f.start) / DEPARTURE_SEC, 0, 1), 1.4);
      }
    }
    if (fx.length > 60) fx.splice(0, fx.length - 60);
  }

  _textWidth(text) {
    let w = this._textWidths.get(text);
    if (w == null) {
      this.ctx.font = LABEL_FONT;
      w = this.ctx.measureText(text).width;
      if (this._textWidths.size > 2000) this._textWidths.clear();
      this._textWidths.set(text, w);
    }
    return w;
  }

  /**
   * Decide which species get a name this frame and where: the hovered and focused ones always,
   * then newcomers, the just-departed, and as many of the most abundant as fit. Greedy, four
   * candidate spots per marker, never over another label or marker. The result also goes into
   * view.avoid, so the painter keeps its place names out of the way.
   */
  _layoutLabels(frame) {
    const markers = this._markers;
    const labels = this._labels;
    const pool = this._labelPool;
    const labelled = this._labelled;
    const t = frame.nowSec;
    const W = this.width, H = this.height;
    const { text, muted, accentStrong } = this.colors;
    let n = 0;
    labelled.clear();

    const overlapsLabel = (x, y, w, h) => {
      for (let i = 0; i < n; i++) {
        const b = labels[i];
        if (x < b.x + b.w && x + w > b.x && y < b.y + LABEL_H && y + h > b.y) return true;
      }
      return false;
    };
    const overlapsMarker = (x, y, w, h, own) => {
      for (const m of markers) {
        if (m === own) continue;
        const nx = clamp(m.x, x, x + w), ny = clamp(m.y, y, y + h);
        const r = m.baseR + 2;
        if ((m.x - nx) ** 2 + (m.y - ny) ** 2 < r * r) return true;
      }
      return false;
    };
    const place = (x, y, r, name, own, forced, alpha, fill, mark) => {
      const markW = mark ? this._textWidth(`${mark} `) : 0;
      const w = this._textWidth(name) + markW;
      const gap = r + 6;
      let bx = 0, by = 0, found = false;
      // right, left, above, below
      for (let spot = 0; spot < 4 && !found; spot++) {
        bx = spot === 0 ? x + gap : spot === 1 ? x - gap - w : x - w / 2;
        by = spot === 2 ? y - gap - LABEL_H + 2 : spot === 3 ? y + gap - 2 : y - LABEL_H / 2;
        if (bx < 4 || bx + w > W - 4 || by < 4 || by + LABEL_H > H - 4) continue;
        if (overlapsLabel(bx - 3, by - 1, w + 6, LABEL_H + 2)) continue;
        if (overlapsMarker(bx - 1, by, w + 2, LABEL_H, own)) continue;
        found = true;
      }
      if (!found) {
        if (!forced) return false;
        bx = clamp(x + gap, 4, Math.max(4, W - 4 - w));
        by = clamp(y - LABEL_H / 2, 4, Math.max(4, H - 4 - LABEL_H));
      }
      const label = pool[n] || (pool[n] = {});
      label.x = bx;
      label.y = by;
      label.w = w;
      label.h = LABEL_H;
      label.name = name;
      label.mark = mark;
      label.markW = markW;
      label.alpha = alpha;
      label.fill = fill;
      label.markFill = mark === '+' ? accentStrong : fill;
      labels[n++] = label;
      return true;
    };

    // 1. hovered / focused — always
    for (const m of markers) {
      if (m.lit && place(m.x, m.y, m.baseR * 1.18 + 4, m.sp.name, m, true, 1, text, null)) labelled.add(m.id);
    }
    // 2. newcomers
    for (const f of this._fx) {
      if (f.kind !== 'arrive' || labelled.has(f.id)) continue;
      const m = this._byId.get(f.id);
      if (!m) continue;
      const alpha = 1 - clamp((t - f.start - (ARRIVAL_SEC - 0.5)) / 0.5, 0, 1);
      if (place(m.x, m.y, m.baseR, f.name, m, false, alpha, text, '+')) labelled.add(f.id);
    }
    // 3. the just-departed, if they had a name on screen
    for (const f of this._fx) {
      if (f.kind === 'depart' && f.labelled) place(f.x, f.y, f.r, f.name, null, false, 0.9 * f.alpha, muted, '†');
    }
    // 4. the dominant forms, as many as fit (more when zoomed in)
    const room = Math.max(3, Math.round(((equalEarth.bounds.xMax * 2 * this.baseScale) / 150) * Math.pow(this.zoom, 1.15)));
    let named = labelled.size;
    for (let i = 0; i < markers.length && named < room; i++) {
      const m = markers[i];
      if (labelled.has(m.id)) continue;
      if (m.x < -20 || m.x > W + 20 || m.y < -20 || m.y > H + 20) continue;
      if (place(m.x, m.y, m.baseR, m.sp.name, m, false, 0.96, text, null)) {
        labelled.add(m.id);
        named++;
      }
    }
    labels.length = n;

    // what the painter's place names must keep clear of: marker discs, then label boxes
    const avoid = this.view.avoid;
    let a = 0;
    for (const m of markers) {
      const disc = avoid[a] && avoid[a].r != null ? avoid[a] : (avoid[a] = { x: 0, y: 0, r: 0 });
      disc.x = m.x;
      disc.y = m.y;
      disc.r = m.baseR + 5;
      a++;
    }
    for (let i = 0; i < n; i++) {
      const box = avoid[a] && avoid[a].w != null ? avoid[a] : (avoid[a] = { x: 0, y: 0, w: 0, h: 0 });
      box.x = labels[i].x - 4;
      box.y = labels[i].y - 2;
      box.w = labels[i].w + 8;
      box.h = LABEL_H + 4;
      a++;
    }
    avoid.length = a;
  }

  _halo(color) {
    let sprite = this._haloSprites.get(color);
    if (!sprite) {
      sprite = document.createElement('canvas');
      sprite.width = 64;
      sprite.height = 64;
      const c = sprite.getContext('2d');
      const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`);
      g.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.2)`);
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      this._haloSprites.set(color, sprite);
    }
    return sprite;
  }

  _arrival(id) {
    for (const f of this._fx) if (f.kind === 'arrive' && f.id === id) return f;
    return null;
  }

  _drawMarkers(frame) {
    const ctx = this.ctx;
    const markers = this._markers;
    const t = frame.nowSec;
    const still = !!frame.reducedMotion;
    const { accent, accentStrong, ink } = this.colors;

    // departures first: grey embers under the living
    for (const f of this._fx) {
      if (f.kind !== 'depart') continue;
      const age = clamp((t - f.start) / DEPARTURE_SEC, 0, 1);
      drawMarker(ctx, f.glyph, f.x, f.y, f.r * (still ? 1 : 1 - 0.25 * age), EMBER, { ring: ink, highlight: false, alpha: 0.85 * f.alpha });
    }

    // halos, then bodies — least abundant first so the dominant forms sit on top
    for (let i = markers.length - 1; i >= 0; i--) {
      const m = markers[i];
      const hr = m.r * (m.lit ? 3.6 : 2.7);
      ctx.drawImage(this._halo(m.color), m.x - hr, m.y - hr, hr * 2, hr * 2);
    }
    for (let i = markers.length - 1; i >= 0; i--) {
      const m = markers[i];
      if (m.lit) continue;
      let r = m.r;
      const bloom = still ? null : this._arrival(m.id);
      if (bloom) r *= 0.35 + 0.65 * easeOut(clamp((t - bloom.start) / 0.5, 0, 1));
      drawMarker(ctx, m.glyph, m.x, m.y, r, m.color, { ring: ink });
    }

    // arrival blooms: two rings opening outward
    for (const f of this._fx) {
      if (f.kind !== 'arrive') continue;
      const m = this._byId.get(f.id);
      if (!m) continue;
      const age = t - f.start;
      ctx.lineWidth = 1.6;
      if (still) {
        ctx.strokeStyle = accentStrong;
        ctx.globalAlpha = 0.8 * (1 - clamp((age - (ARRIVAL_SEC - 0.6)) / 0.6, 0, 1));
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.baseR + 6, 0, TAU);
        ctx.stroke();
      } else {
        for (const delay of [0, 0.38]) {
          const p = clamp((age - delay) / 1.25, 0, 1);
          if (p <= 0 || p >= 1) continue;
          ctx.strokeStyle = delay ? m.color : accentStrong;
          ctx.globalAlpha = 0.9 * (1 - p) * (1 - p);
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.baseR + 3 + 24 * easeOut(p), 0, TAU);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // hovered / focused markers on top, ringed in the accent colour
    for (const m of markers) {
      if (!m.lit) continue;
      drawMarker(ctx, m.glyph, m.x, m.y, m.r * 1.18, m.color, { ring: ink });
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.baseR * 1.18 + 5, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // remember where everyone was, for embers on the next frame
    const prev = this._prev;
    prev.clear();
    for (const m of markers) {
      prev.set(m.id, { lon: m.lon, lat: m.lat, name: m.sp.name, color: m.color, glyph: m.glyph, r: m.baseR, labelled: this._labelled.has(m.id) });
    }
  }

  _drawLabels() {
    const ctx = this.ctx;
    ctx.font = LABEL_FONT;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(7,11,20,0.8)';
    for (const label of this._labels) {
      const y = label.y + LABEL_H / 2;
      let x = label.x;
      ctx.globalAlpha = label.alpha;
      if (label.mark) {
        ctx.strokeText(label.mark, x, y);
        ctx.fillStyle = label.markFill;
        ctx.fillText(label.mark, x, y);
        x += label.markW;
      }
      ctx.strokeText(label.name, x, y);
      ctx.fillStyle = label.fill;
      ctx.fillText(label.name, x, y);
    }
    ctx.globalAlpha = 1;
  }

  // ---- picking ------------------------------------------------------------------------------

  _markerAt(x, y, reach = 12) {
    let best = null;
    let bestD = Infinity;
    for (const m of this._markers) {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d <= Math.max(reach, m.baseR + 5) && d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  /** Once per frame: what is under the resting pointer? (Markers move and appear under it.) */
  _pickHover() {
    const hp = this._hoverPoint;
    if (!hp || this._drag || this._pinch) {
      if (!hp && this._hoverSp) this._setHover(null, 0, 0);
      return;
    }
    const m = this._markerAt(hp.x, hp.y);
    const sp = m ? m.sp : null;
    const changed = (sp ? sp.id : null) !== (this._hoverSp ? this._hoverSp.id : null);
    if (changed || (sp && this._hoverMoved)) this._setHover(sp, hp.clientX, hp.clientY);
    this._hoverMoved = false;
    this._setCursor(sp ? 'pointer' : 'grab');
  }

  _setHover(sp, clientX, clientY) {
    const was = this._hoverSp;
    this._hoverSp = sp;
    if (!sp && !was) return;
    if (this._hoverCb) this._hoverCb(sp, clientX, clientY);
  }

  _setCursor(cursor) {
    if (this._cursor !== cursor) {
      this._cursor = cursor;
      this.canvas.style.cursor = cursor;
    }
  }

  // ---- pointer input ------------------------------------------------------------------------

  _local(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = this._local(e);
    this._pointers.set(e.pointerId, p);
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    this._zoomAnim = null;
    if (this._pointers.size === 1) {
      this._drag = { x: p.x, y: p.y, startX: p.x, startY: p.y, moved: false, type: e.pointerType };
      this._pinch = null;
    } else if (this._pointers.size === 2) {
      const [a, b] = [...this._pointers.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      // the planet point under the fingers, in zoom-1 pixels from the planet centre
      this._pinch = {
        dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        zoom: this.zoom,
        ux: (mx - this.width / 2 - this.panX) / this.zoom,
        uy: (my - this.height / 2 - this.panY) / this.zoom,
      };
      this._drag = null;
      this._setHover(null, 0, 0);
    }
  }

  _onPointerMove(e) {
    const p = this._local(e);
    if (this._pointers.has(e.pointerId)) this._pointers.set(e.pointerId, p);

    if (this._pinch && this._pointers.size >= 2) {
      const [a, b] = [...this._pointers.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      // two fingers: the point that was under them stays under their midpoint as they spread,
      // close or move together (exact, whichever finger's event arrives first)
      const z = clamp(this._pinch.zoom * (dist / this._pinch.dist), MIN_ZOOM, MAX_ZOOM);
      this.zoom = z;
      this.panX = mx - this.width / 2 - this._pinch.ux * z;
      this.panY = my - this.height / 2 - this._pinch.uy * z;
      this._clampPan();
      this._syncHud();
      return;
    }

    const d = this._drag;
    if (d && this._pointers.has(e.pointerId)) {
      const slop = d.type === 'mouse' ? 4 : 8;
      if (!d.moved && Math.hypot(p.x - d.startX, p.y - d.startY) > slop) {
        d.moved = true;
        this._setCursor('grabbing');
        if (this._hoverSp) this._setHover(null, 0, 0);
      }
      if (d.moved) {
        // the map follows the pointer 1:1 at any zoom
        this.panX += p.x - d.x;
        this.panY += p.y - d.y;
        this._clampPan();
        this._syncHud();
      }
      d.x = p.x;
      d.y = p.y;
      return;
    }

    if (e.pointerType !== 'touch') {
      this._hoverPoint = { x: p.x, y: p.y, clientX: e.clientX, clientY: e.clientY };
      this._hoverMoved = true;
    }
  }

  _onPointerUp(e) {
    const had = this._pointers.delete(e.pointerId);
    try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    if (this._pinch) {
      if (this._pointers.size < 2) this._pinch = null;
      // a finger that stays down carries on as a drag, without a jump
      if (this._pointers.size === 1) {
        const [rest] = [...this._pointers.values()];
        this._drag = { x: rest.x, y: rest.y, startX: rest.x, startY: rest.y, moved: true, type: 'touch' };
      }
      return;
    }
    const d = this._drag;
    this._drag = null;
    if (!d || !had || e.type === 'pointercancel') return;
    this._setCursor('grab');
    if (d.moved) return;

    // A press that did not move is a click / tap.
    const p = this._local(e);
    const now = performance.now();
    const m = this._markerAt(p.x, p.y, d.type === 'mouse' ? 12 : 20);
    if (m) {
      this._lastTap = null;
      if (this._clickCb) this._clickCb(m.sp);
      return;
    }
    const last = this._lastTap;
    if (last && now - last.time < 340 && Math.hypot(p.x - last.x, p.y - last.y) < 28) {
      // double-click / double-tap on open map: zoom in on that spot (or back out at the limit)
      this._lastTap = null;
      if (this.zoom >= MAX_ZOOM - 0.01) this.setViewport({ home: true });
      else this._zoomBy(2, p.x, p.y);
    } else {
      this._lastTap = { x: p.x, y: p.y, time: now };
    }
  }

  _onPointerLeave(e) {
    if (e.pointerType === 'touch') return;
    this._hoverPoint = null;
    if (!this._drag) this._setHover(null, 0, 0);
  }

  _onWheel(e) {
    e.preventDefault();
    // deltaY only: a sideways trackpad swipe must not zoom. ctrlKey marks a trackpad pinch.
    let dy = e.deltaY;
    if (!dy) return;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= 400;
    const p = this._local(e);
    this._zoomAnim = null;
    this._zoomAt(p.x, p.y, this.zoom * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)));
    this._syncHud();
  }
}
