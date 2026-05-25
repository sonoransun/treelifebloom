import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimatedDiversityKilo, formatDiversity } from '../js/data/biodiversity.js';

test('diversity estimate is finite and non-negative across time', () => {
  for (const t of [4000, 540, 250, 66, 0]) {
    const k = estimatedDiversityKilo(t);
    assert.ok(Number.isFinite(k) && k >= 0, `diversity ${k} at ${t} Ma`);
  }
});

test('diversity rises from deep time toward the present', () => {
  assert.ok(estimatedDiversityKilo(0) > estimatedDiversityKilo(3000));
});

test('formatDiversity returns a non-empty string at every magnitude', () => {
  for (const k of [0, 0.0005, 0.4, 12, 3400]) {
    const s = formatDiversity(k);
    assert.equal(typeof s, 'string');
    assert.ok(s.length > 0);
  }
});
