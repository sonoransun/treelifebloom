// Species sidebar — shows currently alive species ranked by abundance,
// atmosphere readouts with sparklines, and a biodiversity estimate.

import { COLORS } from '../config.js';
import { getSpeciesAtTime } from '../data/species.js';
import {
  getTemperatureAtTime,
  getOxygenAtTime,
  getCO2AtTime,
  ATMOSPHERE_CURVES,
} from '../data/atmosphere.js';
import { getSeismicActivityAtTime } from '../data/seismicActivity.js';
import { estimatedDiversityKilo, formatDiversity } from '../data/biodiversity.js';
import { Sparkline } from './sparkline.js';

export class Sidebar {
  constructor() {
    this.listEl = document.getElementById('species-list');
    this.countEl = document.getElementById('species-count');
    this._tempEl = document.getElementById('atmo-temp');
    this._o2El = document.getElementById('atmo-o2');
    this._co2El = document.getElementById('atmo-co2');
    this._seismicEl = document.getElementById('atmo-seismic');
    this._bioEl = document.getElementById('atmo-bio');
    this._currentIds = new Set();
    this._elements = new Map(); // id -> li element
    this._lastUpdateTime = 0;

    this._initSparklines();

    this._popup = null;
    this._modal = null;

    // Click on a species → open modal (pauses the animation).
    this.listEl.addEventListener('click', (e) => {
      const li = e.target.closest('.species-item');
      if (!li) return;
      const sp = this._spById(li.dataset.id);
      if (!sp || !this._modal) return;
      if (this._popup) this._popup.hide();
      this._modal.open(sp, this._lastAlive || []);
    });
  }

  /** Wire a SpeciesPopup so hovering a sidebar entry shows the popup card. */
  attachPopup(popup) {
    this._popup = popup;
    this.listEl.addEventListener('mouseover', (e) => {
      const li = e.target.closest('.species-item');
      if (!li || !this._popup) return;
      const id = li.dataset.id;
      const sp = this._spById(id);
      if (sp) this._popup.show(sp, e.clientX, e.clientY);
    });
    this.listEl.addEventListener('mouseleave', () => {
      if (this._popup) this._popup.hide();
    });
  }

  /** Wire a SpeciesModal so clicking a sidebar entry opens the detail modal. */
  attachModal(modal) {
    this._modal = modal;
  }

  _spById(id) {
    // Lookup in latest computed snapshot — cached as map during update().
    if (this._lastAlive) {
      for (const s of this._lastAlive) if (s.id === id) return s;
    }
    return null;
  }

  _initSparklines() {
    const mountUnder = (id, color) => {
      const valueEl = document.getElementById(id);
      if (!valueEl) return null;
      const wrap = document.createElement('div');
      wrap.className = 'sparkline-wrap';
      valueEl.parentElement.appendChild(wrap);
      return new Sparkline(wrap, {
        curve: id === 'atmo-temp' ? ATMOSPHERE_CURVES.temperature
             : id === 'atmo-o2'   ? ATMOSPHERE_CURVES.oxygen
             : ATMOSPHERE_CURVES.co2,
        width: 64, height: 16, color,
      });
    };
    this._sparkTemp = mountUnder('atmo-temp', '#cc7755');
    this._sparkO2   = mountUnder('atmo-o2', '#66bbcc');
    this._sparkCo2  = mountUnder('atmo-co2', '#aa8855');
  }

  update(timeMa) {
    // Throttle DOM updates
    const now = performance.now();
    if (now - this._lastUpdateTime < 80) return;
    this._lastUpdateTime = now;

    // Update atmosphere readouts
    const temp = getTemperatureAtTime(timeMa);
    const o2 = getOxygenAtTime(timeMa);
    const co2 = getCO2AtTime(timeMa);
    this._tempEl.textContent = `${temp.toFixed(1)}°C`;
    this._o2El.textContent = `${o2.toFixed(1)}%`;
    this._co2El.textContent = co2 >= 1000 ? `${(co2 / 1000).toFixed(1)}k ppm` : `${Math.round(co2)} ppm`;

    if (this._sparkTemp) this._sparkTemp.draw(timeMa, temp);
    if (this._sparkO2) this._sparkO2.draw(timeMa, o2);
    if (this._sparkCo2) this._sparkCo2.draw(timeMa, co2);

    const seismic = getSeismicActivityAtTime(timeMa);
    const seismicLabel = seismic >= 0.8 ? 'Extreme' : seismic >= 0.6 ? 'High' : seismic >= 0.4 ? 'Active' : seismic >= 0.2 ? 'Moderate' : 'Low';
    const seismicColor = seismic >= 0.8 ? '#ff4444' : seismic >= 0.6 ? '#ff8844' : seismic >= 0.4 ? '#ddcc44' : seismic >= 0.2 ? '#88cc44' : '#44cc88';
    this._seismicEl.textContent = seismicLabel;
    this._seismicEl.style.color = seismicColor;

    // Biodiversity estimate
    if (this._bioEl) {
      const kilo = estimatedDiversityKilo(timeMa);
      this._bioEl.textContent = formatDiversity(kilo);
    }

    const alive = getSpeciesAtTime(timeMa);
    this._lastAlive = alive;
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

    // Update count — show "alive" total, not just top-15.
    this.countEl.textContent = `${alive.length} shown`;
  }

  _createSpeciesElement(sp) {
    const li = document.createElement('li');
    li.className = 'species-item';
    li.dataset.id = sp.id;

    const color = COLORS.kingdom[sp.category] || '#aaa';
    li.style.borderLeftColor = color;

    const dot = document.createElement('div');
    dot.className = 'species-dot';
    dot.style.background = color;

    const info = document.createElement('div');
    info.className = 'species-info';

    const name = document.createElement('span');
    name.className = 'species-name';
    name.textContent = sp.name;

    const desc = document.createElement('span');
    desc.className = 'species-desc';
    desc.textContent = sp.description;

    info.appendChild(name);
    info.appendChild(desc);

    const barWrap = document.createElement('div');
    barWrap.className = 'abundance-bar-container';
    const bar = document.createElement('div');
    bar.className = 'abundance-bar';
    bar.style.width = Math.round(sp.currentAbundance * 100) + '%';
    bar.style.background = color;
    barWrap.appendChild(bar);

    li.appendChild(dot);
    li.appendChild(info);
    li.appendChild(barWrap);

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
