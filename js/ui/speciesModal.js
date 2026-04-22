// Species detail modal — opens on sidebar click, pauses the animation,
// shows full info, the full Linnaean lineage, and the closest evolutionary
// relatives scored by shared taxonomic rank.

import { species as allSpecies } from '../data/species.js';
import {
  cladeColor,
  lineageLabels,
  relativesOf,
  RANK_LABELS,
} from '../util/taxonomy.js';

export class SpeciesModal {
  constructor(clock, controls) {
    this.clock = clock;
    this.controls = controls;
    this.el = document.getElementById('species-modal');
    this.backdropEl = document.getElementById('species-modal-backdrop');
    this.titleEl = document.getElementById('species-modal-title');
    this.sciEl = document.getElementById('species-modal-sci');
    this.metaEl = document.getElementById('species-modal-meta');
    this.lineageEl = document.getElementById('species-modal-lineage');
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
    const color = cladeColor(sp);
    this.el.style.borderLeftColor = color;
    this.titleEl.textContent = sp.name;
    this.titleEl.style.color = color;
    this.sciEl.textContent = sp.scientificName || '';
    const rankLabel = sp.rank ? RANK_LABELS[sp.rank] : null;
    const metaPrefix = rankLabel
      ? rankLabel
      : (sp.taxonomy?.classOrPhylum || sp.taxonomy?.kingdom || sp.taxonomy?.domain || '');
    this.metaEl.textContent = metaPrefix
      ? `${metaPrefix} · ${formatRange(sp)}`
      : formatRange(sp);
    this._renderLineage(sp, color);
    this.bodyEl.textContent = sp.descriptionLong || sp.description || '';

    this.relativesEl.innerHTML = '';
    const aliveIds = new Set((alive || []).map(s => s.id));
    const relatives = relativesOf(sp, allSpecies);
    if (!relatives.length) {
      const empty = document.createElement('li');
      empty.className = 'species-modal-empty';
      empty.textContent = 'No close relatives recorded in the taxonomy.';
      this.relativesEl.appendChild(empty);
      return;
    }
    for (const rel of relatives) {
      this.relativesEl.appendChild(this._renderRelative(rel, aliveIds, alive));
    }
  }

  _renderLineage(sp, color) {
    if (!this.lineageEl) return;
    const segs = lineageLabels(sp);
    this.lineageEl.innerHTML = '';
    for (const seg of segs) {
      const li = document.createElement('li');
      if (seg.isSelf) li.className = 'self';

      const label = document.createElement('span');
      label.className = 'rank-label';
      label.textContent = seg.label;

      const value = document.createElement('span');
      value.className = 'rank-value';
      value.textContent = seg.value;
      if (seg.isSelf) value.style.color = color;

      li.appendChild(label);
      li.appendChild(value);
      this.lineageEl.appendChild(li);
    }
  }

  _renderRelative(rel, aliveIds, alive) {
    const li = document.createElement('li');
    li.className = 'species-modal-relative';

    const dot = document.createElement('span');
    dot.className = 'species-modal-relative-dot';
    dot.style.background = cladeColor(rel);

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
