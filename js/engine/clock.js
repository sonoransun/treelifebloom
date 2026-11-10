// Geological time clock.
//
// The clock advances linearly along the screen-time axis defined in timeScale.js (so temporal
// compression can never overshoot a short period) and converts that position back to Ma.
//
// Mass extinctions are staged in three beats, all driven by real time inside tick() — there are
// no setTimeout timers to race against manual control:
//   1. hold       time freezes on the leading edge of the event for TIMING.extinctionPauseSeconds
//                 so the overlay can be read (skippable with skipHold());
//   2. window     time creeps through the event at TIMING.extinctionSlowdown × speed;
//   3. aftermath  time runs normally while `event.intensity` eases back to 0 over
//                 TIMING.extinctionAftermathSeconds so views can fade their effects out. The fade
//                 also finishes while paused, so a paused screen settles on what its moment
//                 looks like instead of freezing a half-faded crisis.
// `clock.event` describes the beat for views/overlays; it is null outside events and whenever the
// user scrubs (scrubbing into a window shows the static, progress-based look instead — see
// staticCrisisIntensity). Playing out of such a window fades that look out as an aftermath with
// `elapsedSec: null` (nothing was staged in real time) and `peak` at the last static level shown.
//
// Pausing freezes time, the hold timer and `event.elapsedSec`. Zero-length frames change nothing.
// Non-finite times, fractions, steps and speeds are ignored rather than stored.

import { TIMING } from '../config.js';
import { extinctions, getActiveExtinction } from '../data/extinctions.js';
import { maToScreenSeconds, screenSecondsToMa, totalScreenSeconds } from './timeScale.js';

const EVENT_RAMP_IN_SEC = 0.7;

function windowStart(ext) {
  return ext.timeMa + ext.durationMa / 2;
}

function smoothstep(x) {
  return x * x * (3 - 2 * x);
}

/**
 * Crisis intensity for a window that is not being staged in real time (the viewer scrubbed or
 * deep-linked into it): a bell over the window's progress, 0.55 at either edge and 1 in the
 * middle. main.js draws the static look with it; an aftermath that continues that look starts
 * from the last level shown so nothing pops.
 */
export function staticCrisisIntensity(progress) {
  return 0.55 + 0.45 * Math.sin(progress * Math.PI);
}

export class GeoClock {
  constructor() {
    this.currentTimeMa = TIMING.startTimeMa;
    this.position = 0;            // screen seconds since the start of the story (see timeScale.js)
    this.playing = false;
    this.speedMultiplier = 1.0;

    // Event staging (see header).
    this.hold = null;             // { id, elapsed, duration } while time is frozen on an event
    this.event = null;            // { id, extinction, elapsedSec|null, phase, intensity, aftermathSec, peak }
    this._lastExtinctionId = null;
    this.jumps = 0;               // incremented on every discontinuous jump (scrub, restart)

    this._listeners = [];

    // Fired when the clock flips `playing` on its own (reaching the present). Manual
    // play()/pause()/togglePlay() calls do NOT fire it — their callers already know.
    this.onPlayingChange = null;
    // Fired with the hold object when an event hold starts, and with null when it ends.
    this.onHoldChange = null;
    // Fired once each time playback arrives at the present.
    this.onEnd = null;
  }

  subscribe(fn) {
    this._listeners.push(fn);
  }

  _notify() {
    for (const fn of this._listeners) fn(this.currentTimeMa);
  }

  // ---- transport -------------------------------------------------------------------------

  play() {
    if (this.atEnd()) this._jumpTo(TIMING.startTimeMa); // play from the top after the finale
    this.playing = true;
  }

  pause() {
    this.playing = false;
  }

  togglePlay() {
    if (this.playing) this.pause();
    else this.play();
  }

  setSpeed(multiplier) {
    if (!Number.isFinite(multiplier)) return; // NaN would poison `position` on the next tick
    this.speedMultiplier = Math.max(TIMING.minSpeed, Math.min(TIMING.maxSpeed, multiplier));
  }

  /** Jump to a time. Scrubbing never triggers an event hold. Non-finite values are ignored. */
  setTime(timeMa) {
    if (!Number.isFinite(timeMa)) return; // clamping cannot fix NaN, and it would stick
    this._jumpTo(timeMa);
    this._notify();
  }

  /** Jump to a 0..1 position along the story (0 = deep past, 1 = present). */
  seekFraction(fraction) {
    if (!Number.isFinite(fraction)) return;
    const f = Math.max(0, Math.min(1, fraction));
    this.setTime(screenSecondsToMa(f * totalScreenSeconds()));
  }

  /** Step by a number of 1×-playback seconds (negative = toward the past). */
  nudge(screenSeconds) {
    if (!Number.isFinite(screenSeconds)) return;
    const pos = Math.max(0, Math.min(totalScreenSeconds(), this.position + screenSeconds));
    this.setTime(screenSecondsToMa(pos));
  }

  restart() {
    this._jumpTo(TIMING.startTimeMa);
    this.playing = false;
    this._notify();
  }

  /** End the current event hold early (the "Continue" affordance). */
  skipHold() {
    if (this.hold) this._endHold();
  }

  atEnd() {
    return this.currentTimeMa <= TIMING.endTimeMa;
  }

  /** 0..1 position along the story. */
  getFraction() {
    return this.position / totalScreenSeconds();
  }

  /** Seconds of 1× playback already behind / still ahead of the playhead. */
  elapsedSeconds() {
    return this.position;
  }

  remainingSeconds() {
    return totalScreenSeconds() - this.position;
  }

  // ---- frame step ------------------------------------------------------------------------

  /**
   * Advance the clock by deltaSeconds of real time.
   * Returns true if geological time changed.
   */
  tick(deltaSeconds) {
    // A zero-length (or invalid) frame changes nothing. Recomputing the time from an unchanged
    // position is not bit-exact: it can land one ulp before the leading edge of the window the
    // clock sits in, and the next frame would start that event's hold all over again. The first
    // frame has dt = 0, and browsers that clamp timer precision repeat rAF timestamps.
    if (!(deltaSeconds > 0)) return false;

    if (!this.playing) {
      // Paused: time, holds and the event's own clock stand still, but an aftermath still fades
      // out — the window is over, so the paused moment should not keep showing the crisis.
      if (this.event && this.event.phase === 'aftermath') this._tickEvent(deltaSeconds, false);
      return false;
    }

    this._tickEvent(deltaSeconds, true);

    if (this.hold) {
      this.hold.elapsed += deltaSeconds;
      if (this.hold.elapsed >= this.hold.duration) this._endHold();
      return false;
    }

    if (this.atEnd()) {
      // A jump (End key, scrub, nudge) reached the present while playing: stop there. This is not
      // playback arriving, so no onEnd (that is the finale's cue).
      this.playing = false;
      if (this.onPlayingChange) this.onPlayingChange();
      return false;
    }

    const active = getActiveExtinction(this.currentTimeMa);
    const factor = active ? TIMING.extinctionSlowdown : 1.0;
    let nextPos = this.position + deltaSeconds * this.speedMultiplier * factor;
    // Round trips through the warp are not bit-exact; time must never run backwards.
    let nextMa = Math.min(this.currentTimeMa, screenSecondsToMa(nextPos));

    // Never step over the leading edge of an extinction window (at 4× a single frame can be
    // longer than the whole K-Pg window): land exactly on the edge instead.
    if (!active) {
      const upcoming = this._extinctionStartBetween(this.currentTimeMa, nextMa);
      if (upcoming) {
        nextMa = windowStart(upcoming);
        nextPos = maToScreenSeconds(nextMa);
      }
    }

    this.position = nextPos;
    this.currentTimeMa = nextMa;

    const now = getActiveExtinction(this.currentTimeMa);
    const nowId = now ? now.id : null;
    if (nowId !== this._lastExtinctionId) {
      const leftId = this._lastExtinctionId;
      this._lastExtinctionId = nowId;
      if (nowId) this._enterExtinction(now);
      else if (this.event) {
        if (this.event.phase !== 'aftermath') this._beginAftermath();
      } else if (leftId && active && active.id === leftId) this._beginStaticAftermath(active);
    }

    if (this.atEnd()) {
      this.currentTimeMa = TIMING.endTimeMa;
      this.position = totalScreenSeconds();
      this._notify();
      this._stopAtEnd();
      return true;
    }

    this._notify();
    return true;
  }

  // ---- internals -------------------------------------------------------------------------

  _jumpTo(timeMa) {
    this.jumps++;
    this.currentTimeMa = Math.max(TIMING.endTimeMa, Math.min(TIMING.startTimeMa, timeMa));
    this.position = maToScreenSeconds(this.currentTimeMa);
    // Silently sync the edge detector so scrubbing into an event doesn't trigger a hold.
    const ext = getActiveExtinction(this.currentTimeMa);
    this._lastExtinctionId = ext ? ext.id : null;
    this.event = null;
    if (this.hold) {
      this.hold = null;
      if (this.onHoldChange) this.onHoldChange(null);
    }
  }

  _extinctionStartBetween(fromMa, toMa) {
    // Time counts down, so fromMa > toMa. Find the first window whose leading edge lies in (toMa, fromMa).
    let best = null;
    for (const ext of extinctions) {
      const start = windowStart(ext);
      if (start < fromMa && start > toMa && (!best || start > windowStart(best))) best = ext;
    }
    return best;
  }

  _enterExtinction(active) {
    const extinction = extinctions.find((e) => e.id === active.id) || active;
    this.event = {
      id: extinction.id,
      extinction,
      elapsedSec: 0,
      phase: 'hold',
      intensity: 0,
      aftermathSec: 0,
      peak: 1,
    };
    if (TIMING.extinctionPauseSeconds > 0) {
      this.hold = { id: extinction.id, elapsed: 0, duration: TIMING.extinctionPauseSeconds };
      if (this.onHoldChange) this.onHoldChange(this.hold);
    } else {
      this.event.phase = 'window';
    }
  }

  _endHold() {
    this.hold = null;
    if (this.event && this.event.phase === 'hold') this.event.phase = 'window';
    if (this.onHoldChange) this.onHoldChange(null);
  }

  _beginAftermath() {
    this.event.phase = 'aftermath';
    this.event.aftermathSec = 0;
  }

  /**
   * Playback left a window the viewer had scrubbed into: it was showing the static look with no
   * staged event, so fade that look out — from the level shown on the last frame inside the
   * window (`left` is getActiveExtinction() of that frame) — instead of cutting it.
   */
  _beginStaticAftermath(left) {
    const extinction = extinctions.find((e) => e.id === left.id) || left;
    const peak = staticCrisisIntensity(left.progress);
    this.event = {
      id: extinction.id,
      extinction,
      elapsedSec: null, // never staged in real time: views show the steady look, fading
      phase: 'aftermath',
      intensity: peak,
      aftermathSec: 0,
      peak,
    };
  }

  /** Advance the event envelope; `running` is false while paused (only an aftermath fades). */
  _tickEvent(deltaSeconds, running) {
    const ev = this.event;
    if (!ev) return;
    if (running && ev.elapsedSec != null) ev.elapsedSec += deltaSeconds;
    // The same eased ramp-in in every phase, so window -> aftermath never steps even when the
    // event is younger than the ramp (hold skipped at once, or disabled).
    const ramp = ev.elapsedSec == null ? 1 : smoothstep(Math.min(1, ev.elapsedSec / EVENT_RAMP_IN_SEC));
    if (ev.phase === 'aftermath') {
      ev.aftermathSec += deltaSeconds;
      const out = 1 - ev.aftermathSec / Math.max(0.001, TIMING.extinctionAftermathSeconds);
      if (out <= 0) {
        this.event = null;
        return;
      }
      ev.intensity = ev.peak * ramp * smoothstep(out);
    } else {
      ev.intensity = ramp;
    }
  }

  _stopAtEnd() {
    this.playing = false;
    if (this.onPlayingChange) this.onPlayingChange();
    if (this.onEnd) this.onEnd();
  }
}
