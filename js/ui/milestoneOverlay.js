// Milestone overlay — lightweight top-center toast for non-extinction events
// (oxygenation, snowball earths, plants on land, first flowers, etc.).
// Shorter and less aggressive than the extinction overlay (no shake, no flash).

import { getActiveMilestone } from '../data/milestones.js';

export class MilestoneOverlay {
  constructor() {
    this.overlay = document.getElementById('milestone-overlay');
    this.titleEl = document.getElementById('milestone-title');
    this.bodyEl = document.getElementById('milestone-body');
    this._activeId = null;
  }

  update(timeMa) {
    const m = getActiveMilestone(timeMa);
    if (m) {
      if (this._activeId !== m.id) {
        this._activeId = m.id;
        this.titleEl.textContent = m.name;
        this.bodyEl.textContent = m.description;
        this.titleEl.style.color = m.color;
        this.overlay.style.borderColor = m.color;
      }
      this.overlay.classList.remove('hidden');
      this.overlay.classList.add('active');
    } else if (this._activeId) {
      this._activeId = null;
      this.overlay.classList.remove('active');
      this.overlay.classList.add('hidden');
    }
  }
}
