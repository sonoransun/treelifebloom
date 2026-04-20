// Extinction event overlay — displays text and visual effects during mass extinctions.

import { getActiveExtinction } from '../data/extinctions.js';
import { hexToRgb } from '../util/colorMix.js';

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
        // New extinction event starting — re-skin the overlay in this event's signature color.
        this._activeId = extinction.id;
        this.textEl.textContent = extinction.name;
        this.subtextEl.textContent = `${extinction.severityPercent}% of species lost — ${extinction.cause}`;
        this.textEl.style.color = extinction.color;
        this.textEl.style.textShadow = `0 0 18px ${extinction.color}, 0 0 6px rgba(0,0,0,0.85)`;

        const c = hexToRgb(extinction.color);
        // Signature-color radial vignette around the title.
        this.overlay.style.background =
          `radial-gradient(ellipse at center, rgba(${c.r},${c.g},${c.b},0.20) 0%,`
          + ` rgba(${Math.round(c.r * 0.35)},${Math.round(c.g * 0.35)},${Math.round(c.b * 0.35)},0.55) 100%)`;
        this.subtextEl.style.color = `rgba(${Math.min(255, c.r + 80)},${Math.min(255, c.g + 80)},${Math.min(255, c.b + 80)},0.92)`;
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
