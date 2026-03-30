// Geological time clock with temporal compression.

import { TIMING } from '../config.js';
import { getTemporalWeight } from '../data/timeline.js';
import { getActiveExtinction } from '../data/extinctions.js';

export class GeoClock {
  constructor() {
    this.currentTimeMa = TIMING.startTimeMa;
    this.playing = false;
    this.speedMultiplier = 1.0;
    this._listeners = [];
  }

  subscribe(fn) {
    this._listeners.push(fn);
  }

  _notify() {
    for (const fn of this._listeners) {
      fn(this.currentTimeMa);
    }
  }

  play() {
    this.playing = true;
  }

  pause() {
    this.playing = false;
  }

  togglePlay() {
    this.playing = !this.playing;
  }

  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(TIMING.minSpeed, Math.min(TIMING.maxSpeed, multiplier));
  }

  setTime(timeMa) {
    this.currentTimeMa = Math.max(TIMING.endTimeMa, Math.min(TIMING.startTimeMa, timeMa));
    this._notify();
  }

  restart() {
    this.currentTimeMa = TIMING.startTimeMa;
    this.playing = false;
    this._notify();
  }

  /**
   * Advance the clock by deltaSeconds of real time.
   * Returns true if time changed.
   */
  tick(deltaSeconds) {
    if (!this.playing) return false;
    if (this.currentTimeMa <= TIMING.endTimeMa) {
      this.playing = false;
      return false;
    }

    const weight = getTemporalWeight(this.currentTimeMa);

    // Check if we're in an extinction event — slow down further
    const extinction = getActiveExtinction(this.currentTimeMa);
    const extinctionFactor = extinction ? TIMING.extinctionSlowdown : 1.0;

    // Higher weight = slower progression (more screen time per Ma)
    const effectiveSpeed = (TIMING.baseSpeedMaPerSec * this.speedMultiplier * extinctionFactor) / weight;

    // Time counts DOWN from past to present
    this.currentTimeMa -= effectiveSpeed * deltaSeconds;

    if (this.currentTimeMa <= TIMING.endTimeMa) {
      this.currentTimeMa = TIMING.endTimeMa;
      this.playing = false;
    }

    this._notify();
    return true;
  }
}
