import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPolygonsAtTime } from '../js/engine/interpolator.js';

const SAMPLE_TIMES = [4000, 2700, 1100, 750, 540, 300, 250, 150, 66, 20, 0];

test('getPolygonsAtTime returns continents with finite coordinates (no NaN)', () => {
  for (const t of SAMPLE_TIMES) {
    const polys = getPolygonsAtTime(t);
    assert.ok(Array.isArray(polys), `array expected at ${t} Ma`);
    for (const p of polys) {
      assert.ok(Array.isArray(p.vertices), `vertices array at ${t} Ma`);
      for (const [lon, lat] of p.vertices) {
        assert.ok(Number.isFinite(lon) && Number.isFinite(lat),
          `non-finite vertex [${lon}, ${lat}] at ${t} Ma for ${p.id}`);
      }
    }
  }
});

test('interpolated coordinates stay within plausible geographic bounds', () => {
  for (const t of SAMPLE_TIMES) {
    for (const p of getPolygonsAtTime(t)) {
      for (const [lon, lat] of p.vertices) {
        assert.ok(lon >= -360 && lon <= 360, `lon ${lon} wild at ${t} Ma`);
        assert.ok(lat >= -90 && lat <= 90, `lat ${lat} out of range at ${t} Ma`);
      }
    }
  }
});

test('a mid-slice time produces at least one continent', () => {
  assert.ok(getPolygonsAtTime(400).length > 0);
});
