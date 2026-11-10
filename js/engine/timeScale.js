// Screen-time warp — maps geological time (Ma) to playback position and back.
//
// Every period in timeline.js gets `durationMa × temporalWeight / TIMING.baseSpeedMaPerSec`
// seconds of screen time at 1×. Laying the periods end to end gives a "screen seconds" axis on
// which playback is perfectly linear. The clock advances along this axis, and the timeline bar,
// sparklines and Tree view all draw on it, so a period's width on screen is exactly the share of
// the story it gets.
//
// Conventions: screen seconds run 0 (TIMING.startTimeMa, the deep past) → total (present).
// Fractions are the same axis normalised to 0..1.

import { timeline } from '../data/timeline.js';
import { TIMING } from '../config.js';

const segments = [];
let total = 0;

function build() {
  segments.length = 0;
  total = 0;
  for (const period of timeline) {
    const startMa = Math.min(period.startMa, TIMING.startTimeMa);
    const endMa = Math.max(period.endMa, TIMING.endTimeMa);
    if (startMa <= endMa) continue; // entirely outside the playable range
    const seconds = ((startMa - endMa) * period.temporalWeight) / TIMING.baseSpeedMaPerSec;
    segments.push({ period, startMa, endMa, t0: total, t1: total + seconds });
    total += seconds;
  }
  for (const s of segments) {
    s.f0 = s.t0 / total;
    s.f1 = s.t1 / total;
  }
}
build();

/** Total play-through length in real seconds at 1× (excluding extinction holds). */
export function totalScreenSeconds() {
  return total;
}

/** Period segments on the warped axis: [{ period, startMa, endMa, t0, t1, f0, f1 }]. */
export function getSegments() {
  return segments;
}

/** Ma → screen seconds since the start of the story. */
export function maToScreenSeconds(ma) {
  if (ma >= segments[0].startMa) return 0;
  const last = segments[segments.length - 1];
  if (ma <= last.endMa) return total;
  // Binary search: segments are contiguous and ordered oldest → youngest.
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ma < segments[mid].endMa) lo = mid + 1;
    else hi = mid;
  }
  const s = segments[lo];
  const a = (s.startMa - ma) / (s.startMa - s.endMa);
  return s.t0 + (s.t1 - s.t0) * a;
}

/** Screen seconds → Ma. */
export function screenSecondsToMa(seconds) {
  if (seconds <= 0) return segments[0].startMa;
  if (seconds >= total) return segments[segments.length - 1].endMa;
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (seconds > segments[mid].t1) lo = mid + 1;
    else hi = mid;
  }
  const s = segments[lo];
  const a = (seconds - s.t0) / (s.t1 - s.t0);
  return s.startMa - (s.startMa - s.endMa) * a;
}

/** Ma → 0..1 position along the story (0 = deep past, 1 = present). */
export function maToFraction(ma) {
  return maToScreenSeconds(ma) / total;
}

/** 0..1 position along the story → Ma. */
export function fractionToMa(fraction) {
  return screenSecondsToMa(Math.max(0, Math.min(1, fraction)) * total);
}

/** "m:ss" for a number of seconds (used by the transport readout). */
export function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
