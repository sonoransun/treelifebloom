// Collapsible legend explaining kingdom dot colors, plate boundary line styles,
// and how to read the era strip. Toggled via the toolbar.

import { COLORS } from '../config.js';

const KINGDOM_LABELS = {
  prokaryote: 'Prokaryotes',
  bacteria: 'Bacteria',
  eukaryote: 'Eukaryotes',
  plant: 'Plants',
  invertebrate: 'Invertebrates',
  arthropod: 'Arthropods',
  fish: 'Fish',
  amphibian: 'Amphibians',
  reptile: 'Reptiles',
  synapsid: 'Synapsids',
  mammal: 'Mammals',
  bird: 'Birds',
  primate: 'Primates',
  hominin: 'Hominins',
};

export class Legend {
  constructor() {
    this.panel = document.getElementById('legend-panel');
    this.btn = document.getElementById('btn-legend');
    if (!this.panel || !this.btn) return;
    this._render();
    this.btn.addEventListener('click', () => this.toggle());
  }

  toggle() {
    const open = !this.panel.classList.contains('hidden');
    this.panel.classList.toggle('hidden', open);
    this.btn.classList.toggle('active', !open);
  }

  _render() {
    const sections = [];

    // Kingdoms
    let html = '<div class="legend-section"><div class="legend-title">Life</div>';
    for (const [key, label] of Object.entries(KINGDOM_LABELS)) {
      const color = COLORS.kingdom[key] || '#aaa';
      html += `<div class="legend-row"><span class="legend-dot" style="background:${color}"></span><span>${label}</span></div>`;
    }
    html += '</div>';
    sections.push(html);

    // Plate boundaries
    sections.push(`
      <div class="legend-section">
        <div class="legend-title">Tectonic boundaries</div>
        <div class="legend-row"><span class="legend-line legend-line-divergent" style="background:${COLORS.boundary.divergent}"></span><span>Divergent (rifts, ridges)</span></div>
        <div class="legend-row"><span class="legend-line" style="background:${COLORS.boundary.convergent}"></span><span>Convergent (subduction)</span></div>
        <div class="legend-row"><span class="legend-line legend-line-transform" style="background:${COLORS.boundary.transform}"></span><span>Transform (slip-strike)</span></div>
      </div>
    `);

    // Reading aids
    sections.push(`
      <div class="legend-section">
        <div class="legend-title">Reading the view</div>
        <div class="legend-tip">Era strip below shows geological periods, colored by ICS standard.</div>
        <div class="legend-tip">Click a species in the sidebar for the full description.</div>
        <div class="legend-tip">During extinctions the screen reddens and shakes.</div>
      </div>
    `);

    this.panel.innerHTML = sections.join('');
  }
}
