// Collapsible legend: a live Linnaean tree of currently-alive species (grouped
// domain → kingdom → class/phylum), plus the fixed plate-boundary and
// reading-aid sections. Toggled via the toolbar.

import { COLORS, TIMING } from '../config.js';
import { cladeColor } from '../util/taxonomy.js';
import { getSpeciesAtTime } from '../data/species.js';

export class Legend {
  constructor() {
    this.panel = document.getElementById('legend-panel');
    this.btn = document.getElementById('btn-legend');
    if (!this.panel || !this.btn) return;

    this._popup = null;         // SpeciesPopup — attached from main.js
    this._modal = null;         // SpeciesModal — attached from main.js
    this._allSpecies = null;    // full list, to resolve click → modal context

    // Collapsed-summary labels are persisted across rebuilds so the user's
    // open/closed choices survive when the tree refreshes.
    this._closed = new Set();

    this._lastAlive = null;
    this._lastUpdateMa = null;
    this._lastUpdateMs = 0;

    this._build();
    this.btn.addEventListener('click', () => this.toggle());
  }

  attachPopup(popup) { this._popup = popup; }
  attachModal(modal) { this._modal = modal; }
  attachAllSpecies(species) { this._allSpecies = species; }

  toggle() {
    const open = !this.panel.classList.contains('hidden');
    this.panel.classList.toggle('hidden', open);
    this.btn.classList.toggle('active', !open);
    // Reset the throttle so the next animate() tick rebuilds immediately.
    this._lastUpdateMs = 0;
    this._lastUpdateMa = null;
  }

  // Called every frame from main.js. Throttles tree rebuilds to keep the DOM
  // work modest — the tree isn't as time-critical as the sidebar. Skips work
  // entirely when the panel is hidden.
  update(timeMa) {
    if (this.panel.classList.contains('hidden')) return;
    const now = performance.now();
    const throttled = now - this._lastUpdateMs < TIMING.legendUpdateIntervalMs;
    // Force an immediate rebuild when the user scrubbed (big time jump) or we
    // have never rendered a species tree yet.
    const jumped = this._lastUpdateMa == null
      || Math.abs(this._lastUpdateMa - timeMa) > 5;
    if (throttled && !jumped) return;
    this._lastUpdateMs = now;
    this._lastUpdateMa = timeMa;
    this._lastAlive = getSpeciesAtTime(timeMa);
    this._renderTree(this._lastAlive);
  }

  // Initial skeleton — tree section (empty until update() fires), boundaries,
  // and reading aids. Built once.
  _build() {
    this.panel.innerHTML = '';

    const treeSection = document.createElement('div');
    treeSection.className = 'legend-section legend-tree-section';
    const treeTitle = document.createElement('div');
    treeTitle.className = 'legend-title';
    treeTitle.textContent = 'Tree of Life (on screen)';
    treeSection.appendChild(treeTitle);
    this.treeContainer = document.createElement('div');
    this.treeContainer.className = 'legend-tree';
    treeSection.appendChild(this.treeContainer);
    const treeEmpty = document.createElement('div');
    treeEmpty.className = 'legend-tip legend-tree-empty';
    treeEmpty.textContent = 'No species on screen yet.';
    treeSection.appendChild(treeEmpty);
    this._treeEmptyEl = treeEmpty;
    this.panel.appendChild(treeSection);

    const boundaries = document.createElement('div');
    boundaries.className = 'legend-section';
    boundaries.innerHTML = `
      <div class="legend-title">Tectonic boundaries</div>
      <div class="legend-row"><span class="legend-line legend-line-divergent" style="background:${COLORS.boundary.divergent}"></span><span>Divergent (rifts, ridges)</span></div>
      <div class="legend-row"><span class="legend-line" style="background:${COLORS.boundary.convergent}"></span><span>Convergent (subduction)</span></div>
      <div class="legend-row"><span class="legend-line legend-line-transform" style="background:${COLORS.boundary.transform}"></span><span>Transform (slip-strike)</span></div>
    `;
    this.panel.appendChild(boundaries);

    const tips = document.createElement('div');
    tips.className = 'legend-section';
    tips.innerHTML = `
      <div class="legend-title">Reading the view</div>
      <div class="legend-tip">Era strip below shows geological periods, colored by ICS standard.</div>
      <div class="legend-tip">Click any species name above for the full description.</div>
      <div class="legend-tip">During extinctions the screen shakes and tints.</div>
    `;
    this.panel.appendChild(tips);
  }

  _renderTree(alive) {
    if (!this.treeContainer) return;
    this.treeContainer.innerHTML = '';
    if (!alive || !alive.length) {
      this._treeEmptyEl.classList.remove('hidden');
      return;
    }
    this._treeEmptyEl.classList.add('hidden');

    // Bucket species into a three-level tree: domain → kingdom → classOrPhylum.
    const tree = new Map();
    for (const sp of alive) {
      const t = sp.taxonomy;
      if (!t) continue;
      const domain = t.domain || '—';
      const kingdom = t.kingdom || t.domain || '—';
      const cls = t.classOrPhylum || kingdom;
      if (!tree.has(domain)) tree.set(domain, new Map());
      const kMap = tree.get(domain);
      if (!kMap.has(kingdom)) kMap.set(kingdom, new Map());
      const cMap = kMap.get(kingdom);
      if (!cMap.has(cls)) cMap.set(cls, []);
      cMap.get(cls).push(sp);
    }

    const domainOrder = ['Bacteria', 'Archaea', 'Eukarya'];
    const domains = Array.from(tree.keys()).sort((a, b) => {
      const ia = domainOrder.indexOf(a);
      const ib = domainOrder.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    for (const domain of domains) {
      this.treeContainer.appendChild(this._renderDomain(domain, tree.get(domain)));
    }
  }

  _renderDomain(domain, kingdomMap) {
    const details = this._openDetails(`domain:${domain}`);
    details.classList.add('legend-tree-domain');
    const summary = document.createElement('summary');
    summary.textContent = domain;
    details.appendChild(summary);
    const kingdoms = Array.from(kingdomMap.keys()).sort();
    for (const k of kingdoms) {
      details.appendChild(this._renderKingdom(domain, k, kingdomMap.get(k)));
    }
    return details;
  }

  _renderKingdom(domain, kingdom, classMap) {
    const details = this._openDetails(`kingdom:${domain}/${kingdom}`);
    details.classList.add('legend-tree-kingdom');
    const summary = document.createElement('summary');
    summary.textContent = kingdom;
    details.appendChild(summary);
    const classes = Array.from(classMap.keys()).sort();
    for (const c of classes) {
      details.appendChild(this._renderClass(domain, kingdom, c, classMap.get(c)));
    }
    return details;
  }

  _renderClass(domain, kingdom, cls, speciesList) {
    const details = this._openDetails(`class:${domain}/${kingdom}/${cls}`);
    details.classList.add('legend-tree-class');
    const summary = document.createElement('summary');
    summary.textContent = `${cls} (${speciesList.length})`;
    details.appendChild(summary);
    // Sort species leaves by descending abundance (current abundance already on sp)
    speciesList.sort((a, b) => (b.currentAbundance ?? 0) - (a.currentAbundance ?? 0));
    for (const sp of speciesList) {
      details.appendChild(this._renderLeaf(sp));
    }
    return details;
  }

  _renderLeaf(sp) {
    const row = document.createElement('div');
    row.className = 'legend-tree-leaf';
    row.dataset.id = sp.id;

    const dot = document.createElement('span');
    dot.className = 'legend-dot';
    dot.style.background = cladeColor(sp);

    const name = document.createElement('span');
    name.className = 'legend-tree-leaf-name';
    name.textContent = sp.name;

    row.appendChild(dot);
    row.appendChild(name);

    row.addEventListener('click', () => this._openSpecies(sp));
    row.addEventListener('mouseenter', (e) => {
      if (this._popup) this._popup.show(sp, e.clientX, e.clientY);
    });
    row.addEventListener('mouseleave', () => {
      if (this._popup) this._popup.hide();
    });
    return row;
  }

  // Build a <details> element that remembers its open/closed state by label.
  _openDetails(key) {
    const details = document.createElement('details');
    const closed = this._closed.has(key);
    details.open = !closed;
    details.addEventListener('toggle', () => {
      if (details.open) this._closed.delete(key);
      else this._closed.add(key);
    });
    return details;
  }

  _openSpecies(sp) {
    if (!this._modal) return;
    const full = this._allSpecies
      ? this._allSpecies.find((s) => s.id === sp.id) || sp
      : sp;
    this._modal.open(full, this._lastAlive || []);
  }
}
