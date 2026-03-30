// Species sidebar — shows currently alive species ranked by abundance.

import { COLORS } from '../config.js';
import { getSpeciesAtTime } from '../data/species.js';

export class Sidebar {
  constructor() {
    this.listEl = document.getElementById('species-list');
    this.countEl = document.getElementById('species-count');
    this._currentIds = new Set();
    this._elements = new Map(); // id -> li element
    this._lastUpdateTime = 0;
  }

  update(timeMa) {
    // Throttle DOM updates
    const now = performance.now();
    if (now - this._lastUpdateTime < 80) return;
    this._lastUpdateTime = now;

    const alive = getSpeciesAtTime(timeMa);
    const top = alive.slice(0, 15);
    const newIds = new Set(top.map(s => s.id));

    // Remove species that are no longer alive
    for (const id of this._currentIds) {
      if (!newIds.has(id)) {
        const el = this._elements.get(id);
        if (el) {
          el.classList.add('exiting');
          el.addEventListener('animationend', () => {
            el.remove();
            this._elements.delete(id);
          }, { once: true });
        }
        this._currentIds.delete(id);
      }
    }

    // Add or update species
    for (let i = 0; i < top.length; i++) {
      const sp = top[i];
      if (this._elements.has(sp.id)) {
        // Update abundance bar
        const el = this._elements.get(sp.id);
        const bar = el.querySelector('.abundance-bar');
        if (bar) {
          bar.style.width = Math.round(sp.currentAbundance * 100) + '%';
        }
        // Reorder
        if (this.listEl.children[i] !== el) {
          this.listEl.insertBefore(el, this.listEl.children[i]);
        }
      } else {
        // New species — create element
        const el = this._createSpeciesElement(sp);
        el.classList.add('entering');
        el.addEventListener('animationend', () => {
          el.classList.remove('entering');
        }, { once: true });

        if (this.listEl.children[i]) {
          this.listEl.insertBefore(el, this.listEl.children[i]);
        } else {
          this.listEl.appendChild(el);
        }

        this._elements.set(sp.id, el);
        this._currentIds.add(sp.id);
      }
    }

    // Update count
    this.countEl.textContent = `${alive.length} species`;
  }

  _createSpeciesElement(sp) {
    const li = document.createElement('li');
    li.className = 'species-item';
    li.dataset.id = sp.id;

    const color = COLORS.kingdom[sp.category] || '#aaa';
    li.style.borderLeftColor = color;

    li.innerHTML = `
      <div class="species-dot" style="background: ${color}"></div>
      <div class="species-info">
        <span class="species-name">${sp.name}</span>
        <span class="species-desc">${sp.description}</span>
      </div>
      <div class="abundance-bar-container">
        <div class="abundance-bar" style="width: ${Math.round(sp.currentAbundance * 100)}%; background: ${color}"></div>
      </div>
    `;

    return li;
  }

  triggerExtinctionFade(affectedGroups) {
    for (const id of affectedGroups) {
      const el = this._elements.get(id);
      if (el) {
        el.classList.add('extinction-exit');
        el.addEventListener('animationend', () => {
          el.remove();
          this._elements.delete(id);
          this._currentIds.delete(id);
        }, { once: true });
      }
    }
  }
}
