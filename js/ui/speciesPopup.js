// Floating popup card for a species — anchored near the cursor.
// Shows full descriptionLong, time range, scientific name. Subscribed to by
// view2d hover, view3d raycaster, and sidebar mouseenter.

import { cladeColor, lineageLabels } from '../util/taxonomy.js';

export class SpeciesPopup {
  constructor() {
    this.el = document.getElementById('species-popup');
    this.titleEl = document.getElementById('species-popup-title');
    this.sciEl = document.getElementById('species-popup-sci');
    this.lineageEl = document.getElementById('species-popup-lineage');
    this.bodyEl = document.getElementById('species-popup-body');
    this.metaEl = document.getElementById('species-popup-meta');
    this._lastId = null;
  }

  show(sp, x, y) {
    if (!sp) { this.hide(); return; }
    if (this._lastId !== sp.id) {
      this._lastId = sp.id;
      this.titleEl.textContent = sp.name;
      this.sciEl.textContent = sp.scientificName || '';
      this.bodyEl.textContent = sp.descriptionLong || sp.description || '';
      this.metaEl.textContent = formatRange(sp);
      const color = cladeColor(sp);
      this.el.style.borderColor = color;
      this.titleEl.style.color = color;
      this._renderLineage(sp, color);
    }
    // Anchor: prefer to the right of cursor; flip to left near right edge.
    const margin = 14;
    const popupW = 280;
    const popupH = this.el.offsetHeight || 120;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x + margin;
    if (left + popupW > vw - 8) left = x - popupW - margin;
    let top = y + margin;
    if (top + popupH > vh - 8) top = y - popupH - margin;
    this.el.style.left = Math.max(8, left) + 'px';
    this.el.style.top = Math.max(8, top) + 'px';
    this.el.classList.remove('hidden');
  }

  hide() {
    this._lastId = null;
    this.el.classList.add('hidden');
  }

  _renderLineage(sp, color) {
    if (!this.lineageEl) return;
    const segs = lineageLabels(sp);
    if (!segs.length) {
      this.lineageEl.textContent = '';
      return;
    }
    this.lineageEl.textContent = '';
    segs.forEach((seg, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'sep';
        sep.textContent = '›';
        this.lineageEl.appendChild(sep);
      }
      const span = document.createElement('span');
      span.textContent = seg.value;
      if (seg.isSelf) {
        span.className = 'self';
        span.style.color = color;
      }
      this.lineageEl.appendChild(span);
    });
  }
}

function formatRange(sp) {
  const start = formatMa(sp.appearanceMa);
  const end = sp.extinctMa == null ? 'present' : formatMa(sp.extinctMa);
  return `${start} → ${end}`;
}

function formatMa(ma) {
  if (ma >= 1000) return (ma / 1000).toFixed(1) + ' Ga';
  if (ma >= 1) return Math.round(ma) + ' Ma';
  if (ma >= 0.001) return Math.round(ma * 1000) + ' ka';
  return Math.round(ma * 1000000) + ' yr';
}
