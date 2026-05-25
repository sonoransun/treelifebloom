import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeoClock } from '../js/engine/clock.js';
import { TIMING } from '../js/config.js';

test('starts paused at startTimeMa', () => {
  const c = new GeoClock();
  assert.equal(c.currentTimeMa, TIMING.startTimeMa);
  assert.equal(c.playing, false);
});

test('tick does nothing while paused', () => {
  const c = new GeoClock();
  const before = c.currentTimeMa;
  assert.equal(c.tick(1), false);
  assert.equal(c.currentTimeMa, before);
});

test('tick advances toward the present (counts down) when playing', () => {
  const c = new GeoClock();
  c.play(); // at 4000 Ma (Hadean) — no extinction window, so no auto-pause timer
  const before = c.currentTimeMa;
  const changed = c.tick(0.1);
  assert.equal(changed, true);
  assert.ok(c.currentTimeMa < before, 'time should decrease');
  c.pause();
});

test('setSpeed clamps to [minSpeed, maxSpeed]', () => {
  const c = new GeoClock();
  c.setSpeed(1000);
  assert.equal(c.speedMultiplier, TIMING.maxSpeed);
  c.setSpeed(-5);
  assert.equal(c.speedMultiplier, TIMING.minSpeed);
});

test('setTime clamps to [endTimeMa, startTimeMa]', () => {
  const c = new GeoClock();
  c.setTime(99999);
  assert.equal(c.currentTimeMa, TIMING.startTimeMa);
  c.setTime(-100);
  assert.equal(c.currentTimeMa, TIMING.endTimeMa);
});

test('restart returns to the start and pauses', () => {
  const c = new GeoClock();
  c.setTime(100);
  c.play();
  c.restart();
  assert.equal(c.currentTimeMa, TIMING.startTimeMa);
  assert.equal(c.playing, false);
});

test('subscribe receives the current time on change', () => {
  const c = new GeoClock();
  let seen = null;
  c.subscribe((t) => { seen = t; });
  c.setTime(1234);
  assert.equal(seen, 1234);
});
