// Extinction event overlay — displays text and visual effects during mass extinctions.

import { getActiveExtinction } from '../data/extinctions.js';

export class ExtinctionOverlay {
  constructor() {
    this.overlay = document.getElementById('extinction-overlay');
    this.textEl = document.getElementById('extinction-text');
    this.subtextEl = document.getElementById('extinction-subtext');
    this._activeId = null;
    this._shakeEl = document.getElementById('viz-container');
  }

  update(timeMa) {
    const extinction = getActiveExtinction(timeMa);

    if (extinction) {
      if (this._activeId !== extinction.id) {
        // New extinction event starting
        this._activeId = extinction.id;
        this.textEl.textContent = extinction.name;
        this.subtextEl.textContent = `${extinction.severityPercent}% of species lost — ${extinction.cause}`;
        this.textEl.style.color = extinction.color;
      }

      this.overlay.classList.remove('hidden');
      this.overlay.classList.add('active');

      // Screen shake based on severity and progress
      const shakeIntensity = Math.sin(extinction.progress * Math.PI) * (extinction.severityPercent / 100) * 3;
      const shakeX = (Math.random() - 0.5) * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * shakeIntensity;
      this._shakeEl.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
    } else {
      if (this._activeId) {
        this._activeId = null;
        this.overlay.classList.remove('active');
        this.overlay.classList.add('hidden');
        this._shakeEl.style.transform = '';
      }
    }
  }
}
