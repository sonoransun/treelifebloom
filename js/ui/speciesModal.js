// Species detail modal — opens on sidebar click, pauses the animation,
// shows full info plus the closest evolutionary relatives (same category,
// ranked by temporal overlap / proximity).

import { COLORS } from '../config.js';
import { species as allSpecies } from '../data/species.js';

export class SpeciesModal {
  constructor(clock, controls) {
    this.clock = clock;
    this.controls = controls;
    this.el = document.getElementById('species-modal');
    this.backdropEl = document.getElementById('species-modal-backdrop');
    this.titleEl = document.getElementById('species-modal-title');
    this.sciEl = document.getElementById('species-modal-sci');
    this.metaEl = document.getElementById('species-modal-meta');
    this.bodyEl = document.getElementById('species-modal-body');
    this.relativesEl = document.getElementById('species-modal-relatives');
    this.closeBtn = document.getElementById('species-modal-close');
    this._isOpen = false;
    this._bindClose();
  }

  open(sp, alive) {
    if (!sp) return;
    // Pause on first open only; subsequent relative-clicks don't re-pause.
    if (!this._isOpen) {
      this.clock.pause();
      if (this.controls && this.controls.syncPlayButton) {
        this.controls.syncPlayButton();
      }
    }
    this._populate(sp, alive);
    this.el.classList.remove('hidden');
    this.backdropEl.classList.remove('hidden');
    this._isOpen = true;
  }

  // Hide the modal. Does not auto-resume — viewer presses play when ready.
  close() {
    this.el.classList.add('hidden');
    this.backdropEl.classList.add('hidden');
    this._isOpen = false;
  }

  isOpen() {
    return this._isOpen;
  }

  _populate(sp, alive) {
    const color = COLORS.kingdom[sp.category] || '#aaa';
    this.el.style.borderLeftColor = color;
    this.titleEl.textContent = sp.name;
    this.titleEl.style.color = color;
    this.sciEl.textContent = sp.scientificName || '';
    this.metaEl.textContent = `${sp.category} · ${formatRange(sp)}`;
    this.bodyEl.textContent = sp.descriptionLong || sp.description || '';

    this.relativesEl.innerHTML = '';
    const aliveIds = new Set((alive || []).map(s => s.id));
    const relatives = this._relatives(sp);
    if (!relatives.length) {
      const empty = document.createElement('li');
      empty.className = 'species-modal-empty';
      empty.textContent = 'No close relatives in the current dataset.';
      this.relativesEl.appendChild(empty);
      return;
    }
    for (const rel of relatives) {
      this.relativesEl.appendChild(this._renderRelative(rel, aliveIds, alive));
    }
  }

  _renderRelative(rel, aliveIds, alive) {
    const li = document.createElement('li');
    li.className = 'species-modal-relative';

    const dot = document.createElement('span');
    dot.className = 'species-modal-relative-dot';
    dot.style.background = COLORS.kingdom[rel.category] || '#aaa';

    const name = document.createElement('span');
    name.className = 'species-modal-relative-name';
    name.textContent = rel.name;

    const range = document.createElement('span');
    range.className = 'species-modal-relative-range';
    range.textContent = formatRange(rel);

    li.appendChild(dot);
    li.appendChild(name);
    if (aliveIds.has(rel.id)) {
      const live = document.createElement('span');
      live.className = 'species-modal-relative-live';
      live.textContent = 'live';
      li.appendChild(live);
    }
    li.appendChild(range);

    li.addEventListener('click', () => this.open(rel, alive));
    return li;
  }

  // Score candidates by same-category overlap duration, falling back to
  // distance between appearance midpoints when they never coexisted.
  _relatives(sp) {
    const spEnd = sp.extinctMa == null ? 0 : sp.extinctMa;
    const spMid = (sp.appearanceMa + spEnd) / 2;

    const scored = [];
    for (const cand of allSpecies) {
      if (cand.id === sp.id || cand.category !== sp.category) continue;
      const candEnd = cand.extinctMa == null ? 0 : cand.extinctMa;
      const candMid = (cand.appearanceMa + candEnd) / 2;

      // Overlap window (Ma values; remember larger = older).
      const overlapStart = Math.min(sp.appearanceMa, cand.appearanceMa);
      const overlapEnd = Math.max(spEnd, candEnd);
      const overlap = overlapStart - overlapEnd;

      // overlap > 0 means they share time; higher is a bigger shared window.
      // If disjoint, score by negative midpoint distance (closer = less negative).
      const score = overlap > 0 ? overlap : -Math.abs(spMid - candMid);
      scored.push({ cand, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map(s => s.cand);
  }

  _bindClose() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.backdropEl.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isOpen) {
        this.close();
      }
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
