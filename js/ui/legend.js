// Legend — a field guide to everything drawn on screen: the branches of life (colour + shape),
// what a marker's size and rings mean, the symbols on the map, plate-boundary line styles, the
// planet's colours, and how to read the timeline.
// Toggled from the toolbar ('panel:toggle' { name: 'legend' }); reports 'panel:changed'.
//
// The legend defines the visual vocabulary of the chrome, so this file is also the home of the
// small helpers the rest of the dialog family shares (popup, species dialog, chapters, help):
//   glyphSvg()            a life group's marker shape as inline SVG
//   wireTabs()            ARIA tab behaviour for a segmented control
//   FloatingPanel         open / close / focus plumbing for the two corner panels, which also
//                         keep clear of the context card below them
//   closeButtonMarkup()   the round close button every panel and dialog carries
//   safely()              keeps one failing part of a component from stopping the app at boot
//   optionalModule()      loads a data module that may not exist, without ever blocking boot

import { COLORS, LIFE_GROUPS } from '../config.js';
import * as interpolator from '../engine/interpolator.js';
import { getSegments } from '../engine/timeScale.js';
import { getTemperatureAtTime, getOxygenAtTime, getCO2AtTime } from '../data/atmosphere.js';
import { getPlanetLook, mixHex } from '../util/planetLook.js';

// ---------------------------------------------------------------------------------------------
// Robustness
// ---------------------------------------------------------------------------------------------

/**
 * Run one part of a component's set-up. Components are built at boot, where an exception would
 * take the whole app down with it, and several of these parts read data that other modules own;
 * a part that fails is reported once and left out instead.
 */
export function safely(label, build) {
  try {
    return build();
  } catch (err) {
    console.error(`${label} could not be built:`, err);
    return undefined;
  }
}

/**
 * Await an optional module: resolves to its namespace, or to null if it is missing, broken or
 * too slow to arrive. Pass a function so the import() resolves relative to the caller:
 *   const data = await optionalModule(() => import('../data/chapters.js'));
 */
export function optionalModule(load, timeoutMs = 4000) {
  return Promise.race([
    Promise.resolve().then(load).catch(() => null),
    new Promise((resolve) => { setTimeout(() => resolve(null), timeoutMs); }),
  ]);
}

// ---------------------------------------------------------------------------------------------
// Family glyphs
// ---------------------------------------------------------------------------------------------

// The map, globe and tree draw markers with js/views/glyphs.js. When that module is part of the
// page its glyphSvg() is used here too, so the legend can never disagree with the views;
// localGlyphSvg() is the stand-in with the same signature and the same shapes.
// The module is requested only if the page has already loaded it (the map view imports it
// statically), so a build without it does not log a failed request.
function sharedGlyphsLoaded() {
  try {
    const url = new URL('../views/glyphs.js', import.meta.url).href;
    return performance.getEntriesByType('resource').some((entry) => entry.name === url);
  } catch {
    return false;
  }
}
const sharedGlyphs = sharedGlyphsLoaded() ? await optionalModule(() => import('../views/glyphs.js')) : null;

const LOCAL_SHAPES = {
  dot: '<circle cx="8" cy="8" r="5.2"/>',
  ring: '<circle cx="8" cy="8" r="4.2" fill="none" stroke="currentColor" stroke-width="3.4"/>',
  leaf: '<path d="M2.7 13.3Q13.2 13.2 13.3 2.7 2.8 2.8 2.7 13.3z"/>',
  star: '<path d="M8 1.3l1.9 4.2 4.6.5-3.4 3.1.9 4.5L8 11.3l-4 2.3.9-4.5L1.5 6l4.6-.5z"/>',
  hex: '<path d="M13.9 8l-2.95 5.1h-5.9L2.1 8l2.95-5.1h5.9z"/>',
  oval: '<ellipse cx="8" cy="8" rx="6.6" ry="4"/>',
  triangle: '<path d="M8 2l6.1 10.5H1.9z"/>',
  square: '<rect x="3.3" y="3.3" width="9.4" height="9.4" rx="1.5"/>',
};

function localGlyphSvg(glyph, color, size = 14) {
  const shape = LOCAL_SHAPES[glyph] || LOCAL_SHAPES.dot;
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor" style="color:${color}" aria-hidden="true" focusable="false">${shape}</svg>`;
}

/**
 * Inline SVG markup for a life group's marker shape.
 * @param {string} glyph  LIFE_GROUPS[].glyph: 'dot'|'ring'|'leaf'|'star'|'hex'|'oval'|'triangle'|'square'
 * @param {string} color  CSS colour
 * @param {number} size   width and height in px
 * @returns {string} markup built from config values only (safe to assign to innerHTML)
 */
export function glyphSvg(glyph, color, size = 14) {
  if (typeof sharedGlyphs?.glyphSvg === 'function') {
    try {
      const markup = sharedGlyphs.glyphSvg(glyph, color, size);
      if (typeof markup === 'string' && markup.includes('<svg')) return markup;
    } catch {
      /* fall through to the local shapes */
    }
  }
  return localGlyphSvg(glyph, color, size);
}

// ---------------------------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------------------------

/**
 * Turn a container of [role="tab"] buttons (each with aria-controls="<panel id>") into a working
 * tab list: click or arrow keys select, only the selected tab is in the Tab order, and only its
 * panel is shown.
 * @returns {{ select(index: number): void, current(): HTMLElement }}
 */
export function wireTabs(tablist, onChange) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  let current = null;

  const select = (tab, { focus = false, silent = false } = {}) => {
    if (!tab) return;
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.classList.toggle('active', on);
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    }
    const changed = tab !== current;
    current = tab;
    if (focus) tab.focus();
    if (changed && !silent && onChange) onChange(tab);
  };

  tablist.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab && tablist.contains(tab)) select(tab);
  });
  tablist.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(e.target.closest('[role="tab"]'));
    if (i < 0) return;
    let j = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = tabs.length - 1;
    if (j == null) return;
    e.preventDefault(); // these keys belong to the tab list, not to the global time shortcuts
    select(tabs[j], { focus: true });
  });

  select(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0], { silent: true });
  return {
    select: (index) => select(tabs[index]),
    current: () => current,
  };
}

// ---------------------------------------------------------------------------------------------
// Corner panels
// ---------------------------------------------------------------------------------------------

// Below this width the two corner panels would crowd the story overlays, so only one stays open.
const ONE_PANEL_MAX = 1100;
// At and below this width the life & planet panel is a slide-over drawer (css/styles.css).
const DRAWER_MAX = 900;
// At and below this width the corner panels are full-width sheets (css/dialogs.css).
const SHEET_MAX = 720;
// A corner panel ends this far above the "where and when" card (#context-card) when the two share
// a column — unless that would leave it shorter than MIN_PANEL_HEIGHT; it then covers the card.
const CARD_GAP = 12;
const MIN_PANEL_HEIGHT = 280;
const FIT_INTERVAL_SEC = 0.25;

// Was the last thing the viewer did a key press? Decides whether opening a panel should move
// keyboard focus into it: a keyboard user wants to land in the panel, while a mouse user keeps
// Space for play/pause.
let keyboardLast = false;
window.addEventListener('keydown', (e) => {
  if (!e.metaKey && !e.ctrlKey && !e.altKey) keyboardLast = true;
}, true);
window.addEventListener('pointerdown', () => { keyboardLast = false; }, true);

const drawerIsOpen = () => !!document.getElementById('sidebar')?.classList.contains('open');

const CLOSE_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M3.5 3.5l9 9m0-9l-9 9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

/** Markup for the round close button used by every panel and dialog. */
export function closeButtonMarkup(label, id = '') {
  return `<button type="button" class="dlg-close"${id ? ` id="${id}"` : ''} aria-label="${label}" title="${label} (Esc)">${CLOSE_ICON}</button>`;
}

/**
 * A non-modal panel in a top corner of the visualization (legend: left, chapters: right).
 * Subclasses build their DOM inside `this.panel` and may override onOpen(viaKeyboard) / onClose().
 */
export class FloatingPanel {
  constructor(app, name, panelId, toolbarButtonId) {
    this.app = app;
    this.name = name;
    this.panel = document.getElementById(panelId);
    this.isOpen = false;
    this._toolbarButtonId = toolbarButtonId;
    this._opener = null;
    this._maxHeight = '';
    this._fitAt = 0;

    app.bus.on('panel:toggle', ({ name: target, open }) => {
      if (target === name) {
        this.toggle(open);
      } else if (target === 'sidebar' && this.isOpen && window.innerWidth <= DRAWER_MAX) {
        // The drawer and a corner panel never share a small screen. Look once every listener
        // has run, whichever of them owns the drawer's state.
        queueMicrotask(() => { if (drawerIsOpen()) this.close(); });
      }
    });
    app.bus.on('panel:close-all', () => this.close());
    app.bus.on('panel:changed', ({ name: other, open }) => {
      if (open && other !== name && (other === 'legend' || other === 'chapters')
        && window.innerWidth < ONE_PANEL_MAX) this.close();
    });
    window.addEventListener('resize', () => {
      if (!this.isOpen) return;
      this._fitAboveCard();
      if (name !== 'legend' || window.innerWidth >= ONE_PANEL_MAX) return;
      // The window shrank with both panels open: the legend yields to the chapters.
      const chapters = document.getElementById('chapters-panel');
      if (chapters && !chapters.classList.contains('hidden')) this.close();
    });
  }

  /** While open, keep clear of the context card as it changes (a few times a second at most). */
  update(frame) {
    if (!this.isOpen || frame.nowSec - this._fitAt < FIT_INTERVAL_SEC) return;
    this._fitAt = frame.nowSec;
    this._fitAboveCard();
  }

  /** Ends the panel above the "where and when" card when they share a column (wide screens). */
  _fitAboveCard() {
    let max = '';
    const card = document.getElementById('context-card');
    if (card && window.innerWidth > SHEET_MAX && card.getClientRects().length) {
      const c = card.getBoundingClientRect();
      const p = this.panel.getBoundingClientRect();
      const style = getComputedStyle(card);
      const shown = c.height > 0 && style.visibility !== 'hidden' && Number(style.opacity) > 0.05;
      if (shown && c.left < p.right && c.right > p.left && c.top > p.top) {
        const room = Math.floor(c.top - CARD_GAP - p.top);
        if (room >= MIN_PANEL_HEIGHT) max = `${room}px`;
      }
    }
    if (max !== this._maxHeight) {
      this._maxHeight = max;
      this.panel.style.maxHeight = max;
    }
  }

  toggle(force) {
    if (force ?? !this.isOpen) this.open();
    else this.close();
  }

  open() {
    if (this.isOpen) return;
    const active = document.activeElement;
    this._opener = active && active !== document.body ? active : null;
    this.panel.classList.remove('hidden');
    this.isOpen = true;
    this._fitAboveCard();
    if (window.innerWidth <= DRAWER_MAX && drawerIsOpen()) {
      this.app.bus.emit('panel:toggle', { name: 'sidebar', open: false });
    }
    this.app.bus.emit('panel:changed', { name: this.name, open: true });
    this.onOpen(keyboardLast);
  }

  close() {
    if (!this.isOpen) return;
    const hadFocus = this.panel.contains(document.activeElement);
    this.panel.classList.add('hidden');
    this.isOpen = false;
    this.app.bus.emit('panel:changed', { name: this.name, open: false });
    this.onClose();
    if (hadFocus) this._returnFocus();
    this._opener = null;
  }

  /**
   * Focus was inside the panel: hand it back to whatever had it before. If nothing did (the
   * panel was opened with a shortcut key), leave nothing focused, so Space is play/pause again
   * rather than a second press of some button.
   */
  _returnFocus() {
    const shown = (node) => node && node.isConnected && node.getClientRects().length > 0;
    const button = document.getElementById(this._toolbarButtonId);
    const target = shown(this._opener) ? this._opener : (this._opener && shown(button) ? button : null);
    if (target) target.focus({ preventScroll: true });
    else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }

  /** Once its body has scrolled, the panel fades content out at the top edge as well. */
  watchScroll(body) {
    body.addEventListener('scroll', () => body.classList.toggle('is-scrolled', body.scrollTop > 2), { passive: true });
  }

  onOpen() {}

  onClose() {}
}

// ---------------------------------------------------------------------------------------------
// Legend content
// ---------------------------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** The planet's colours at one moment, exactly as the Map and Globe will draw them. */
function lookAt(ma) {
  return getPlanetLook(ma, {
    tempC: getTemperatureAtTime(ma),
    o2Pct: getOxygenAtTime(ma),
    co2Ppm: getCO2AtTime(ma),
  });
}

/** Three sampled colours → a soft three-stop gradient. */
function ramp(a, b, c) {
  return `linear-gradient(90deg, ${a} 0%, ${a} 12%, ${b} 42%, ${b} 58%, ${c} 88%, ${c} 100%)`;
}

// Small inline illustrations of what the views draw (js/views/view2d.js, planetPainter.js). Ink
// follows the text colour through currentColor; amber is the app's accent, as on the map.
const ICON = (inner) => `<svg viewBox="0 0 44 20" width="44" height="20" aria-hidden="true" focusable="false">${inner}</svg>`;
const ICONS = {
  size: ICON('<g fill="currentColor"><circle cx="7" cy="10" r="2.6"/><circle cx="19" cy="10" r="4.2"/><circle cx="35" cy="10" r="6.2"/></g>'),
  bloom: ICON('<circle cx="22" cy="10" r="3.4" fill="currentColor"/><circle cx="22" cy="10" r="6.4" fill="none" stroke="var(--accent-strong)" stroke-width="1.4" opacity=".9"/><circle cx="22" cy="10" r="9.2" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"/>'),
  ember: ICON('<circle cx="22" cy="10" r="7" fill="currentColor" opacity=".2"/><circle cx="22" cy="10" r="3.6" fill="currentColor"/>'),
  focus: ICON('<circle cx="22" cy="10" r="3.6" fill="currentColor"/><circle cx="22" cy="10" r="7.4" fill="none" stroke="var(--accent)" stroke-width="2"/>'),
  place: ICON('<circle cx="22" cy="10" r="2.9" fill="currentColor"/><path d="M22 1.5v4M22 14.5v4M11.5 10h5M27.5 10h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>'),
  lip: ICON('<defs><radialGradient id="lg-ember"><stop offset="0" stop-color="rgb(255,214,150)" stop-opacity=".95"/><stop offset=".3" stop-color="rgb(255,128,48)" stop-opacity=".8"/><stop offset=".65" stop-color="rgb(214,62,20)" stop-opacity=".4"/><stop offset="1" stop-color="rgb(160,30,10)" stop-opacity="0"/></radialGradient></defs><ellipse cx="22" cy="10" rx="13" ry="9" fill="url(#lg-ember)"/>'),
  impact: ICON('<circle cx="22" cy="10" r="6.2" fill="none" stroke="var(--text-1)" stroke-width="1.5"/><circle cx="22" cy="10" r="1.7" fill="var(--text-1)"/>'),
  orogeny: ICON('<path d="M5 15h34" stroke="currentColor" stroke-width="1" opacity=".5"/><path d="M8 13.5l4-6 4 6m3 0l4-6 4 6m3 0l4-6 4 6" fill="none" stroke="var(--text-1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'),
  gateway: ICON('<path d="M11 10h22M15.5 5.8L11 10l4.5 4.2M28.5 5.8L33 10l-4.5 4.2" fill="none" stroke="var(--text-1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'),
  migration: ICON('<path d="M5 15C12 4 22 3 31 8" fill="none" stroke="var(--accent-strong)" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="0.1 4.6"/><path d="M38 10.5l-8.6 2 2-3.7-3.1-3.3z" fill="var(--accent-strong)"/>'),
};

function boundaryIcon(type) {
  const color = COLORS.boundary[type];
  if (type === 'divergent') return ICON(`<path d="M4 10h36" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-dasharray="7 5"/>`);
  if (type === 'convergent') {
    return ICON(`<path d="M4 12h36" stroke="${color}" stroke-width="2" stroke-linecap="round"/><path d="M9 12l3.5-5 3.5 5zm10 0l3.5-5 3.5 5zm10 0l3.5-5 3.5 5z" fill="${color}"/>`);
  }
  return ICON(`<path d="M4 10h36" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2.5 3.5"/>`);
}

// The timeline footer (js/ui/controls.js): marks on its event rail, its temperature stripe and
// the veil over the bands ahead of the playhead. Shapes and sizes follow css/timeline.css.
const TIMELINE_ICONS = {
  extinction: ICON('<path d="M22 4.6l5.4 5.4-5.4 5.4-5.4-5.4z" fill="currentColor"/>'),
  crisis: ICON('<path d="M22 5.9l4.1 4.1-4.1 4.1-4.1-4.1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
  milestone: ICON('<circle cx="22" cy="10" r="3.6" fill="currentColor"/>'),
};

/** Three period blocks in their chart colours; with `veil`, the playhead and the dimmed future. */
function bandsIcon(veil) {
  const names = ['Triassic', 'Jurassic', 'Cretaceous'];
  const colours = names.map((name, i) => getSegments().find((s) => s.period.period === name)?.period.color
    || ['#812b92', '#34b2c9', '#7fc64e'][i]);
  const blocks = `<rect x="3" y="5" width="11" height="10" rx="1" fill="${colours[0]}"/>`
    + `<rect x="15" y="5" width="12" height="10" rx="1" fill="${colours[1]}"/>`
    + `<rect x="28" y="5" width="13" height="10" rx="1" fill="${colours[2]}"/>`;
  if (!veil) return ICON(blocks);
  return ICON(`${blocks}<rect x="21" y="5" width="20" height="10" fill="var(--bg-0)" opacity=".6"/>`
    + '<path d="M21 2.5v15" stroke="var(--accent-strong)" stroke-width="2" stroke-linecap="round"/>');
}
// The footer's own blue ↔ grey ↔ red ramp (TEMP_COLD / TEMP_NEUTRAL / TEMP_HOT there); its key in
// the footer is read first so the two can never disagree.
const CLIMATE_RAMP_FALLBACK = 'linear-gradient(90deg, #3987e5, #586175, #e34948)';

function climateRamp() {
  const key = document.querySelector('#timeline .tl-key');
  const background = key ? key.style.backgroundImage || key.style.background : '';
  return background && background.includes('gradient') ? background : CLIMATE_RAMP_FALLBACK;
}

const TABS = [
  { id: 'life', label: 'Life' },
  { id: 'markers', label: 'Markers' },
  { id: 'map', label: 'Map' },
  { id: 'planet', label: 'Planet' },
  { id: 'timeline', label: 'Timeline' },
];

export class Legend extends FloatingPanel {
  constructor(app) {
    super(app, 'legend', 'legend-panel', 'btn-legend');
    this._build();
  }

  onOpen(viaKeyboard) {
    this.body.scrollTop = 0;
    if (viaKeyboard) this.tabs.current().focus({ preventScroll: true });
  }

  _build() {
    const tabButtons = TABS.map((t, i) => `
      <button type="button" class="seg-btn" role="tab" id="lg-tab-${t.id}" aria-controls="lg-pane-${t.id}"
              aria-selected="${i === 0}">${t.label}</button>`).join('');
    this.panel.innerHTML = `
      <header class="panel-head">
        <h2 class="panel-title display">Legend</h2>
        ${closeButtonMarkup('Close legend')}
      </header>
      <div class="segmented panel-tabs" role="tablist" aria-label="Legend sections">${tabButtons}</div>
      <div class="panel-body">${TABS.map((t) => `
        <div class="lg-pane" id="lg-pane-${t.id}" role="tabpanel" aria-labelledby="lg-tab-${t.id}" tabindex="0"></div>`).join('')}
      </div>`;
    this.body = this.panel.querySelector('.panel-body');
    this.watchScroll(this.body);
    this.panel.querySelector('.dlg-close').addEventListener('click', () => this.close());

    const pane = (id) => this.panel.querySelector(`#lg-pane-${id}`);
    safely('Legend: life groups', () => this._buildLife(pane('life')));
    safely('Legend: markers', () => this._buildMarkers(pane('markers')));
    safely('Legend: map symbols', () => this._buildMap(pane('map')));
    safely('Legend: planet colours', () => this._buildPlanetColours(pane('planet')));
    safely('Legend: timeline', () => this._buildTimeline(pane('timeline')));
    this.tabs = wireTabs(this.panel.querySelector('[role="tablist"]'), () => { this.body.scrollTop = 0; });
  }

  // ---- Life: the eight hue families ----------------------------------------------------------

  _buildLife(pane) {
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    const count = words[LIFE_GROUPS.length] || LIFE_GROUPS.length;
    pane.appendChild(el('p', 'lg-intro',
      `Shape and colour show which of ${count} branches of life something belongs to. Lighter and darker shades tell the smaller groups apart.`));
    const list = el('ul', 'lg-groups');
    for (const group of LIFE_GROUPS) {
      const item = el('li', 'lg-group');
      const glyph = el('span', 'lg-glyph');
      glyph.innerHTML = glyphSvg(group.glyph, group.color, 20);
      const text = el('div', 'lg-group-text');
      text.append(el('div', 'lg-name', group.label), el('div', 'lg-blurb', group.blurb));
      if (group.categories.length > 1) {
        const cats = el('ul', 'lg-cats');
        for (const cat of group.categories) {
          const chip = el('li', 'lg-cat');
          const dot = el('span', 'lg-cat-glyph');
          dot.innerHTML = glyphSvg(group.glyph, cat.color, 11);
          chip.append(dot, el('span', null, cat.label));
          cats.appendChild(chip);
        }
        text.appendChild(cats);
      }
      item.append(glyph, text);
      list.appendChild(item);
    }
    pane.appendChild(list);
  }

  // ---- Markers and map symbols -----------------------------------------------------------------

  _section(pane, title, note) {
    const wrap = el('section', 'lg-section');
    wrap.appendChild(el('h3', 'lg-title kicker', title));
    if (note) wrap.appendChild(el('p', 'lg-note', note));
    const rows = el('ul', 'lg-rows');
    wrap.appendChild(rows);
    pane.appendChild(wrap);
    return rows;
  }

  /** @param {string|Node} iconContent  SVG markup built from config values, or a ready node */
  _row(rows, iconContent, label, detail, className = '') {
    const item = el('li', `lg-row ${className}`.trim());
    const icon = el('span', 'lg-icon');
    if (typeof iconContent === 'string') icon.innerHTML = iconContent;
    else icon.appendChild(iconContent);
    const text = el('div', 'lg-row-text');
    text.appendChild(el('span', 'lg-row-label', label));
    if (detail) text.appendChild(el('span', 'lg-row-detail', detail));
    item.append(icon, text);
    rows.appendChild(item);
  }

  _buildMarkers(pane) {
    const rows = this._section(pane, 'Reading a marker');
    this._row(rows, ICONS.size, 'Size', 'Bigger means more prominent at this moment.');
    this._row(rows, ICONS.bloom, 'Blooming ring', 'It has just appeared.');
    this._row(rows, ICONS.ember, 'Grey ember', 'It has just died out.', 'is-muted');
    this._row(rows, ICONS.focus, 'Ring and name', 'The one you are pointing at or reading about.');
    // True to the engine in use: only the plate model can carry a fossil site back in time.
    this._row(rows, ICONS.place, 'Position', typeof interpolator.plateToWorld === 'function'
      ? 'Where its fossils were found, carried back to where that ground lay at the time.'
      : 'Where its fossils were found, at that site\'s place on today\'s map.');
  }

  _buildMap(pane) {
    const events = this._section(pane, 'Events and places', 'Shown when the Labels layer is on.');
    this._row(events, ICONS.lip, 'Lava floods', 'Eruptions vast enough to change the climate.');
    this._row(events, ICONS.impact, 'Impact', 'Where an asteroid or comet struck.');
    this._row(events, ICONS.orogeny, 'Mountain building', 'Colliding plates push up a range.');
    this._row(events, ICONS.gateway, 'Gateway', 'A seaway or land bridge opens or closes.');
    this._row(events, ICONS.migration, 'Migration', 'The route a group took as it spread.');

    const plates = this._section(pane, 'Plate boundaries', 'Shown when the Plates layer is on.');
    this._row(plates, boundaryIcon('divergent'), 'Divergent', 'Plates pull apart: rifts and ocean ridges.');
    this._row(plates, boundaryIcon('convergent'), 'Convergent', 'Plates collide; teeth point to the plate on top.');
    this._row(plates, boundaryIcon('transform'), 'Transform (strike-slip)', 'Plates slide past each other.');
  }

  // ---- Planet: what the colours of sea, land and sky mean --------------------------------------

  _buildPlanetColours(pane) {
    const hadean = lookAt(4530);
    const archean = lookAt(3300);
    const jurassic = lookAt(150);
    const today = lookAt(0);
    const sea = (look) => mixHex(look.ocean.deep, look.ocean.shallow, 0.45);

    const colours = el('section', 'lg-section');
    colours.appendChild(el('h3', 'lg-title kicker', 'Planet colours'));
    colours.appendChild(el('p', 'lg-note',
      'The planet is coloured by what covered it at each moment. These are informed impressions, not photographs.'));
    const swatch = (title, gradient, labels) => {
      const wrap = el('div', 'lg-swatch');
      wrap.appendChild(el('div', 'lg-swatch-title', title));
      const bar = el('div', 'lg-swatch-bar');
      bar.style.background = gradient;
      wrap.appendChild(bar);
      const ticks = el('div', 'lg-swatch-labels');
      for (const label of labels) ticks.appendChild(el('span', null, label));
      wrap.appendChild(ticks);
      colours.appendChild(wrap);
    };
    swatch('Sea', ramp(sea(hadean), sea(archean), sea(today)),
      ['molten rock', 'iron-rich', 'oxygen-rich']);
    swatch('Land', ramp(archean.rock, jurassic.landAt(8), today.ice.land),
      ['bare rock', 'plant cover', 'ice']);
    swatch('Sky', ramp(hadean.atmosphere.rim, archean.atmosphere.rim, today.atmosphere.rim),
      ['glowing vapour', 'orange haze', 'clear blue']);
    pane.appendChild(colours);
  }

  // ---- Timeline: how to read the bar along the bottom ----------------------------------------

  _buildTimeline(pane) {
    pane.appendChild(el('p', 'lg-intro',
      'The timeline is scaled by storytelling time, not years: each period is as wide as the screen time it gets.'));

    const marks = this._section(pane, 'Marks above the bands',
      'Each wears its own event\'s colour. Hover over one for its name; click or tap it to watch from just before it begins.');
    this._row(marks, TIMELINE_ICONS.extinction, 'Mass extinction', 'One of the Big Five. The story pauses at each one.');
    this._row(marks, TIMELINE_ICONS.crisis, 'Smaller crisis', 'A serious die-off, but not one of the Big Five.');
    this._row(marks, TIMELINE_ICONS.milestone, 'Milestone', 'A turning point for the planet or for life.');

    const bands = this._section(pane, 'Bands and stripe');
    this._row(bands, bandsIcon(false), 'Period colours', 'As on the international geological time chart, a little softened.');
    const stripe = el('span', 'lg-stripe');
    stripe.style.background = climateRamp();
    this._row(bands, stripe, 'Temperature stripe', 'Blue is colder than today, red is warmer, grey is about the same.');
    this._row(bands, bandsIcon(true), 'Dimmed bands', 'The part of the story still ahead of the playhead.');
  }
}
