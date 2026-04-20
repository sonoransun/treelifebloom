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

    // Edge-detection for the extinction auto-pause feature.
    this._lastExtinctionId = null;
    this._extinctionResumeTimer = null;

    // Fired when the clock flips `playing` on its own (e.g. extinction auto-pause/resume),
    // so external UI like the play button can re-sync. Manual play/pause/toggle calls do NOT
    // fire this — their callers already know they changed state.
    this.onPlayingChange = null;
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
    this._clearExtinctionResume();
    this.playing = true;
  }

  pause() {
    this._clearExtinctionResume();
    this.playing = false;
  }

  togglePlay() {
    this._clearExtinctionResume();
    this.playing = !this.playing;
  }

  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(TIMING.minSpeed, Math.min(TIMING.maxSpeed, multiplier));
  }

  setTime(timeMa) {
    this.currentTimeMa = Math.max(TIMING.endTimeMa, Math.min(TIMING.startTimeMa, timeMa));
    // Silently sync the extinction tracker so scrubbing into an event doesn't trigger
    // an auto-pause on the next tick.
    const ext = getActiveExtinction(this.currentTimeMa);
    this._lastExtinctionId = ext ? ext.id : null;
    this._notify();
  }

  restart() {
    this._clearExtinctionResume();
    this.currentTimeMa = TIMING.startTimeMa;
    this.playing = false;
    this._lastExtinctionId = null;
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

    // Edge-detect entering a new extinction window during natural playback.
    const endExtinction = getActiveExtinction(this.currentTimeMa);
    const newId = endExtinction ? endExtinction.id : null;
    if (newId !== this._lastExtinctionId) {
      if (newId !== null && this.playing) this._triggerExtinctionPause();
      this._lastExtinctionId = newId;
    }

    this._notify();
    return true;
  }

  _clearExtinctionResume() {
    if (this._extinctionResumeTimer !== null) {
      clearTimeout(this._extinctionResumeTimer);
      this._extinctionResumeTimer = null;
    }
  }

  _triggerExtinctionPause() {
    this.playing = false;
    if (this.onPlayingChange) this.onPlayingChange();
    this._extinctionResumeTimer = setTimeout(() => {
      this._extinctionResumeTimer = null;
      this.playing = true;
      if (this.onPlayingChange) this.onPlayingChange();
    }, TIMING.extinctionPauseSeconds * 1000);
  }
}
