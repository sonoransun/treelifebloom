import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getBoundariesAtTime } from '../js/engine/plateBoundaryInterpolator.js';

const TIMES = [4000, 1100, 540, 300, 200, 66, 20, 0];

test('getBoundariesAtTime returns finite-coordinate polylines (no NaN)', () => {
  for (const t of TIMES) {
    const boundaries = getBoundariesAtTime(t);
    assert.ok(Array.isArray(boundaries), `array at ${t} Ma`);
    for (const b of boundaries) {
      assert.equal(typeof b.type, 'string');
      assert.ok(Array.isArray(b.vertices));
      for (const [x, y] of b.vertices) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y),
          `non-finite boundary vertex [${x}, ${y}] at ${t} Ma (${b.id})`);
      }
    }
  }
});

test('boundary types are limited to the three known kinds', () => {
  const kinds = new Set();
  for (const t of TIMES) for (const b of getBoundariesAtTime(t)) kinds.add(b.type);
  for (const k of kinds) {
    assert.ok(['divergent', 'convergent', 'transform'].includes(k), `unexpected type ${k}`);
  }
});
