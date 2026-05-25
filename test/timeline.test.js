import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPeriodAtTime,
  timeMaToFraction,
  fractionToTimeMa,
  TOTAL_WEIGHTED_TIME,
} from '../js/data/timeline.js';
import { TIMING } from '../js/config.js';

test('TOTAL_WEIGHTED_TIME is a positive finite number', () => {
  assert.ok(Number.isFinite(TOTAL_WEIGHTED_TIME));
  assert.ok(TOTAL_WEIGHTED_TIME > 0);
});

test('getPeriodAtTime returns a named period across the timeline', () => {
  for (const t of [TIMING.startTimeMa, 2000, 540, 66, TIMING.endTimeMa]) {
    const p = getPeriodAtTime(t);
    assert.ok(p, `expected a period at ${t} Ma`);
    assert.equal(typeof p.period, 'string');
    assert.ok(p.period.length > 0);
  }
});

test('present (0 Ma) and 4000 Ma resolve to different periods', () => {
  assert.notEqual(getPeriodAtTime(0).period, getPeriodAtTime(4000).period);
});

test('timeMaToFraction / fractionToTimeMa round-trip', () => {
  for (const t of [0, 250, 1000, 2500, 4000]) {
    const back = fractionToTimeMa(timeMaToFraction(t));
    assert.ok(Math.abs(back - t) < 1, `round-trip ${t} -> ${back}`);
  }
});

test('fraction is monotonic in time and within [0,1]', () => {
  const f0 = timeMaToFraction(0);
  const fMid = timeMaToFraction(2000);
  const f4000 = timeMaToFraction(4000);
  for (const f of [f0, fMid, f4000]) {
    assert.ok(f >= 0 && f <= 1, `fraction ${f} out of range`);
  }
  // Larger Ma (further past) => larger fraction (the scrubber inverts this for display).
  assert.ok(f4000 > fMid && fMid > f0);
});
