import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGlaciation } from '../js/data/glaciation.js';

test('cap radii and alpha are finite and within bounds', () => {
  for (const t of [4000, 720, 300, 66, 2, 0]) {
    const g = getGlaciation(t);
    assert.ok(Number.isFinite(g.northCapLatRadius) && g.northCapLatRadius >= 0 && g.northCapLatRadius <= 90);
    assert.ok(Number.isFinite(g.southCapLatRadius) && g.southCapLatRadius >= 0 && g.southCapLatRadius <= 90);
    assert.ok(Number.isFinite(g.alpha) && g.alpha >= 0 && g.alpha <= 1);
  }
});

test('Snowball Earth (~700 Ma) has far larger ice caps than a warm period (~50 Ma)', () => {
  const snowball = getGlaciation(700);
  const warm = getGlaciation(50);
  assert.ok(snowball.northCapLatRadius > warm.northCapLatRadius,
    `snowball ${snowball.northCapLatRadius} should exceed warm ${warm.northCapLatRadius}`);
});
