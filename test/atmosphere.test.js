import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTemperatureAtTime,
  getOxygenAtTime,
  getCO2AtTime,
  interpolateFromCurve,
  ATMOSPHERE_CURVES,
} from '../js/data/atmosphere.js';

const TIMES = [4000, 2400, 720, 540, 300, 66, 0];

test('atmosphere readouts are finite within plausible bounds', () => {
  for (const t of TIMES) {
    const temp = getTemperatureAtTime(t);
    const o2 = getOxygenAtTime(t);
    const co2 = getCO2AtTime(t);
    assert.ok(Number.isFinite(temp) && temp > -30 && temp < 100, `temp ${temp} at ${t}`);
    assert.ok(Number.isFinite(o2) && o2 >= 0 && o2 <= 40, `O2 ${o2} at ${t}`);
    assert.ok(Number.isFinite(co2) && co2 >= 0, `CO2 ${co2} at ${t}`);
  }
});

test('interpolateFromCurve returns endpoints past the curve bounds', () => {
  const curve = ATMOSPHERE_CURVES.temperature; // [[Ma, value], ...] descending in Ma
  const oldest = curve[0];
  const newest = curve[curve.length - 1];
  assert.equal(interpolateFromCurve(curve, oldest[0]), oldest[1]);
  assert.equal(interpolateFromCurve(curve, newest[0]), newest[1]);
  // Clamps beyond the defined range rather than extrapolating.
  assert.equal(interpolateFromCurve(curve, oldest[0] + 1000), oldest[1]);
});

test('a midpoint interpolation lands between its neighbours', () => {
  const curve = [[100, 10], [0, 20]];
  const mid = interpolateFromCurve(curve, 50);
  assert.ok(mid > 10 && mid < 20, `mid ${mid}`);
});
