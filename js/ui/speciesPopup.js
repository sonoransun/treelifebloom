// Hover card for a species — a compact "what is that?" answer. Listens for 'species:hover' from
// every surface and anchors itself by source:
//   sidebar            beside the hovered row, to the LEFT of the panel, so it never covers the
//                      list it belongs to;
//   map, globe, tree   16px from the pointer, flipped to stay inside the viewport and never
//                      under the pointer; on touch it sits above the finger and hides after 2.5 s.
// The card is a tooltip: it takes no pointer events and no focus.

import { getCategoryInfo } from '../config.js';
import { formatDuration, formatRange } from '../util/format.js';
import { glyphSvg } from './legend.js';

const EDGE = 8;             // minimum gap to the viewport edge
const POINTER_GAP = 16;     // distance from the pointer
const FINGER_GAP = 28;      // distance above a fingertip
const ROW_GAP = 10;         // distance from the sidebar's edge
const ARROW_INSET = 16;     // the arrow keeps this far from the card's rounded corners
const TOUCH_HIDE_MS = 2500;
const ROW_TRACK_MS = 150;   // how often a row-anchored card re-checks its row during playback

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Where a species stands relative to a moment: { state: 'alive'|'future'|'gone', text }. */
function statusAt(sp, timeMa) {
  if (timeMa > sp.appearanceMa) {
    return { state: 'future', text: `Appears in ${formatDuration(timeMa - sp.appearanceMa)}` };
  }
  if (sp.extinctMa != null && timeMa < sp.extinctMa) {
    return { state: 'gone', text: `Went extinct ${formatDuration(sp.extinctMa - timeMa)} before this moment` };
  }
  return { state: 'alive', text: 'Alive now' };
}

export class SpeciesPopup {
  constructor(app) {
    this.app = app;
    this.el = document.getElementById('species-popup');
    this.el.innerHTML = `
      <div class="pop-head">
        <span class="pop-glyph" aria-hidden="true"></span>
        <div class="pop-names">
          <div id="species-popup-title" class="display"></div>
          <div id="species-popup-sci" class="sci"></div>
        </div>
      </div>
      <div id="species-popup-meta" class="num"></div>
      <div id="species-popup-status"><span class="pop-status-dot" aria-hidden="true"></span><span class="pop-status-text"></span></div>
      <div id="species-popup-body"></div>
      <div id="species-popup-hint"></div>`;
    this.glyphEl = this.el.querySelector('.pop-glyph');
    this.titleEl = this.el.querySelector('#species-popup-title');
    this.sciEl = this.el.querySelector('#species-popup-sci');
    this.metaEl = this.el.querySelector('#species-popup-meta');
    this.statusEl = this.el.querySelector('#species-popup-status');
    this.statusTextEl = this.el.querySelector('.pop-status-text');
    this.bodyEl = this.el.querySelector('#species-popup-body');
    this.hintEl = this.el.querySelector('#species-popup-hint');

    this._sp = null;            // species on the card
    this._anchor = null;        // { kind: 'row', row } | { kind: 'point', x, y, touch }
    this._size = { w: 0, h: 0 };
    this._statusKey = '';
    this._lastRowCheck = 0;
    this._hideTimer = null;
    this._pointerType = 'mouse';

    // The bus event carries no pointer type, so remember what the viewer is using.
    window.addEventListener('pointerdown', (e) => { this._pointerType = e.pointerType || 'mouse'; }, true);
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') this._pointerType = 'mouse';
    }, { capture: true, passive: true });

    app.bus.on('species:hover', (detail) => {
      const sp = detail && detail.id ? app.speciesById.get(detail.id) : null;
      // The dialog has its own, fuller account of every relative it lists.
      if (sp && detail.source !== 'modal') this.show(sp, detail);
      else this.hide();
    });
    app.bus.on('species:open', () => this.hide());
    app.bus.on('panel:close-all', () => this.hide());
    window.addEventListener('scroll', () => { if (this._sp) this._place(); }, { capture: true, passive: true });
    window.addEventListener('resize', () => this.hide());
  }

  show(sp, { x = 0, y = 0, source = '' } = {}) {
    const touch = this._pointerType === 'touch';
    if (this._sp !== sp) {
      this._sp = sp;
      this._fill(sp, touch);
    }
    const row = source === 'sidebar' ? this._findRow(sp.id, x, y) : null;
    this._anchor = row ? { kind: 'row', row } : { kind: 'point', x, y, touch };
    this.el.classList.remove('hidden');
    if (!this._size.w) this._measure();
    this._place();

    clearTimeout(this._hideTimer);
    if (touch) this._hideTimer = setTimeout(() => this.hide(), TOUCH_HIDE_MS);
  }

  hide() {
    clearTimeout(this._hideTimer);
    if (!this._sp) return;
    this._sp = null;
    this._anchor = null;
    this._size.w = 0;
    this.el.classList.add('hidden');
  }

  /** Keeps the status line true while time runs under a visible card. */
  update(frame) {
    if (!this._sp) return;
    this._setStatus(this._sp, frame.timeMa);
    if (this._anchor.kind === 'row' && frame.playing && frame.nowSec - this._lastRowCheck > ROW_TRACK_MS / 1000) {
      // During playback the list reorders under a resting pointer: follow the row, or let go.
      this._lastRowCheck = frame.nowSec;
      if (this._anchor.row.isConnected) this._place();
      else this.hide();
    }
  }

  _fill(sp, touch) {
    this._size.w = 0; // new content: the card is measured again once it is filled
    const info = getCategoryInfo(sp.category);
    this.glyphEl.innerHTML = glyphSvg(info.group.glyph, info.color, 18);
    this.titleEl.textContent = sp.name;
    const sci = sp.scientificName && sp.scientificName.toLowerCase() !== sp.name.toLowerCase() ? sp.scientificName : '';
    this.sciEl.textContent = sci;
    this.sciEl.classList.toggle('hidden', !sci);
    this.metaEl.textContent = formatRange(sp);
    this.bodyEl.textContent = sp.description || '';
    this.hintEl.textContent = touch ? 'Tap for details' : 'Click for details';
    this._statusKey = '';
    this._setStatus(sp, this.app.clock.currentTimeMa);
  }

  _setStatus(sp, timeMa) {
    const status = statusAt(sp, timeMa);
    const key = `${status.state}|${status.text}`;
    if (key === this._statusKey) return;
    this._statusKey = key;
    this.statusEl.dataset.state = status.state;
    this.statusTextEl.textContent = status.text;
    if (this._size.w) {
      // A longer line can re-wrap the card.
      this._measure();
      this._place();
    }
  }

  _measure() {
    this._size.w = this.el.offsetWidth;
    this._size.h = this.el.offsetHeight;
  }

  /** The sidebar element this hover came from: under the pointer, or the focused row. */
  _findRow(id, x, y) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return null;
    const matches = (node) => {
      const row = node && node.closest ? node.closest('[data-id]') : null;
      return row && row.dataset.id === id && sidebar.contains(row) ? row : null;
    };
    return matches(document.elementFromPoint(x, y))
      || matches(document.activeElement)
      || [...sidebar.querySelectorAll('[data-id]')].find((r) => r.dataset.id === id && r.getClientRects().length > 0)
      || null;
  }

  _place() {
    const anchor = this._anchor;
    if (!anchor) return;
    const { w, h } = this._size;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left;
    let top;
    let arrow = null;

    if (anchor.kind === 'row') {
      const row = anchor.row.getBoundingClientRect();
      const side = document.getElementById('sidebar').getBoundingClientRect();
      if (side.left - ROW_GAP - w >= EDGE) {
        // Beside the row, outside the panel and (when it fits) clear of the timeline below the
        // visualization — unless the row sits so low that the arrow could not reach it from
        // there; the arrow always points back at the row.
        const centre = row.top + row.height / 2;
        const viz = document.getElementById('viz-container')?.getBoundingClientRect();
        const floor = viz && viz.height > h + 2 * EDGE
          ? Math.min(vh, Math.max(viz.bottom, centre + ARROW_INSET + EDGE))
          : vh;
        left = side.left - ROW_GAP - w;
        top = clamp(centre - 30, EDGE, Math.max(EDGE, floor - h - EDGE));
        arrow = clamp(centre - top, ARROW_INSET, h - ARROW_INSET);
      } else {
        // The panel spans the screen (phone sheet): sit above the row, or below if there is no room.
        left = clamp(row.left + 12, EDGE, Math.max(EDGE, vw - w - EDGE));
        top = row.top - h - 8 >= EDGE ? row.top - h - 8 : Math.min(row.bottom + 8, Math.max(EDGE, vh - h - EDGE));
      }
    } else if (anchor.touch) {
      left = clamp(anchor.x - w / 2, EDGE, Math.max(EDGE, vw - w - EDGE));
      top = anchor.y - FINGER_GAP - h >= EDGE ? anchor.y - FINGER_GAP - h : anchor.y + FINGER_GAP;
    } else {
      const { x, y } = anchor;
      // Prefer below-right of the pointer; flip each axis that would leave the viewport. As long
      // as one axis keeps its gap the card cannot sit under the pointer.
      left = x + POINTER_GAP;
      if (left + w > vw - EDGE) left = x - POINTER_GAP - w;
      const sideways = left >= EDGE;
      if (!sideways) left = clamp(x - w / 2, EDGE, Math.max(EDGE, vw - w - EDGE));
      top = y + POINTER_GAP;
      if (top + h > vh - EDGE) top = y - POINTER_GAP - h;
      if (top < EDGE) top = sideways ? clamp(y - h / 2, EDGE, Math.max(EDGE, vh - h - EDGE)) : EDGE;
    }

    this.el.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    if (arrow == null) {
      this.el.removeAttribute('data-arrow');
    } else {
      this.el.dataset.arrow = 'right';
      this.el.style.setProperty('--arrow-y', `${Math.round(arrow)}px`);
    }
  }
}
