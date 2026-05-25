import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getActiveExtinction } from '../js/data/extinctions.js';

test('returns null outside any Big Five window', () => {
  assert.equal(getActiveExtinction(100), null); // mid-Cretaceous, quiet
  assert.equal(getActiveExtinction(1000), null);
});

test('detects the End-Permian and K-Pg events with valid progress', () => {
  for (const t of [251.9, 66]) {
    const ext = getActiveExtinction(t);
    assert.ok(ext, `expected an extinction at ${t} Ma`);
    assert.equal(typeof ext.id, 'string');
    assert.ok(ext.progress >= 0 && ext.progress <= 1, `progress ${ext.progress} out of [0,1]`);
  }
});

test('progress increases from window start toward its end', () => {
  const kpg = getActiveExtinction(66);
  // 66 Ma is the event centre, so progress should be around the middle.
  assert.ok(kpg.progress > 0.2 && kpg.progress < 0.8);
});
