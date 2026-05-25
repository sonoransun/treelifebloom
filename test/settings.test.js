import { test } from 'node:test';
import assert from 'node:assert/strict';

// settings.js reads location/localStorage/history at call time (not import time),
// so we stub them on globalThis before exercising the module.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.location = { origin: 'https://x.test', pathname: '/app/', search: '' };
globalThis.history = { replaceState() {} };

const { buildShareUrl, readUrlState, saveSetting, loadSettings } =
  await import('../js/util/settings.js');

test('buildShareUrl emits set params and omits defaults', () => {
  const url = buildShareUrl({ time: 540.7, view: '3d', plates: true, elevation: 1.8 });
  assert.match(url, /^https:\/\/x\.test\/app\/\?/);
  assert.match(url, /t=541/);   // rounded
  assert.match(url, /view=3d/);
  assert.match(url, /plates=1/);
  assert.match(url, /ex=1\.8/);

  const plain = buildShareUrl({ time: 100, view: '2d', plates: false, elevation: 1 });
  assert.ok(!/plates=/.test(plain), 'plates omitted when false');
  assert.ok(!/ex=/.test(plain), 'ex omitted at 1x');
});

test('readUrlState parses the query back into a state object', () => {
  globalThis.location.search = '?t=500&view=3d&plates=1&ex=2.5';
  const s = readUrlState();
  assert.equal(s.time, 500);
  assert.equal(s.view, '3d');
  assert.equal(s.plates, true);
  assert.equal(s.elevation, 2.5);
});

test('readUrlState rejects an invalid view and reports absent params as undefined', () => {
  globalThis.location.search = '?view=banana';
  const s = readUrlState();
  assert.equal(s.view, undefined);
  assert.equal(s.time, undefined);
  assert.equal(s.plates, undefined);
});

test('saveSetting / loadSettings round-trip through storage', () => {
  saveSetting({ speed: 2 });
  saveSetting({ view: '3d', legend: true });
  const s = loadSettings();
  assert.equal(s.speed, 2);
  assert.equal(s.view, '3d');
  assert.equal(s.legend, true);
});

test('buildShareUrl with no state yields the bare path', () => {
  assert.equal(buildShareUrl(), 'https://x.test/app/');
});
