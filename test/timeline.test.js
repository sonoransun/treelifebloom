import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPeriodAtTime } from '../js/data/timeline.js';
import {
  totalScreenSeconds,
  maToFraction,
  fractionToMa,
  maToScreenSeconds,
  screenSecondsToMa,
} from '../js/engine/timeScale.js';
import { TIMING } from '../js/config.js';

test('the play-through length is a positive finite number of seconds', () => {
  const total = totalScreenSeconds();
  assert.ok(Number.isFinite(total));
  assert.ok(total > 0);
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

test('maToFraction / fractionToMa round-trip', () => {
  for (const t of [0, 0.0117, 2.58, 66, 250, 1000, 2500, 4000]) {
    const back = fractionToMa(maToFraction(t));
    assert.ok(Math.abs(back - t) <= Math.max(1e-6, t * 1e-9), `round-trip ${t} -> ${back}`);
  }
});

test('maToScreenSeconds / screenSecondsToMa round-trip', () => {
  for (const t of [0, 1, 66, 541, 3000]) {
    const back = screenSecondsToMa(maToScreenSeconds(t));
    assert.ok(Math.abs(back - t) <= Math.max(1e-6, t * 1e-9), `round-trip ${t} -> ${back}`);
  }
});

test('fraction runs from 0 at the start of the story to 1 at the present', () => {
  assert.equal(maToFraction(TIMING.startTimeMa), 0);
  assert.equal(maToFraction(TIMING.endTimeMa), 1);
  const f4000 = maToFraction(4000), fMid = maToFraction(2000), f0 = maToFraction(0);
  for (const f of [f4000, fMid, f0]) assert.ok(f >= 0 && f <= 1, `fraction ${f} out of range`);
  // Larger Ma (further past) => smaller fraction: the timeline reads left = past, right = present.
  assert.ok(f4000 < fMid && fMid < f0);
});
