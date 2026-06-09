import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToRgb, mixColors, mixColorsRgba, clamp } from '../js/util/colorMix.js';

test('hexToRgb parses hex with and without leading #', () => {
  assert.deepEqual(hexToRgb('#ff8000'), { r: 255, g: 128, b: 0 });
  assert.deepEqual(hexToRgb('ff8000'), { r: 255, g: 128, b: 0 });
  assert.deepEqual(hexToRgb('#FFFFFF'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
});

test('hexToRgb parses rgb(...) strings (mixColors output re-mixed)', () => {
  assert.deepEqual(hexToRgb('rgb(12,34,56)'), { r: 12, g: 34, b: 56 });
  assert.deepEqual(hexToRgb('rgb( 12 , 34 , 56 )'), { r: 12, g: 34, b: 56 });
});

test('hexToRgb falls back to black on garbage', () => {
  assert.deepEqual(hexToRgb('not-a-color'), { r: 0, g: 0, b: 0 });
});

test('hexToRgb memo returns consistent values on repeat hex lookups', () => {
  const a = hexToRgb('#5aa0d8');
  const b = hexToRgb('#5aa0d8');
  assert.deepEqual(a, { r: 90, g: 160, b: 216 });
  assert.deepEqual(b, a);
  // rgb(...) inputs are never cached — fresh objects each call.
  const r1 = hexToRgb('rgb(1,2,3)');
  const r2 = hexToRgb('rgb(1,2,3)');
  assert.deepEqual(r1, r2);
  assert.notEqual(r1, r2);
});

test('mixColors keeps its exact rgb(r,g,b) output format and per-step rounding', () => {
  assert.equal(mixColors('#000000', '#ffffff', 0), 'rgb(0,0,0)');
  assert.equal(mixColors('#000000', '#ffffff', 1), 'rgb(255,255,255)');
  assert.equal(mixColors('#000000', '#ffffff', 0.5), 'rgb(128,128,128)'); // Math.round(127.5)
  assert.equal(mixColors('rgb(10,20,30)', '#ffffff', 0.1), 'rgb(35,44,53)');
});

test('mixColorsRgba carries alpha through unchanged', () => {
  assert.equal(mixColorsRgba('#000000', '#ffffff', 0.5, 0.25), 'rgba(128,128,128,0.25)');
});

test('clamp bounds values', () => {
  assert.equal(clamp(-1, 0, 1), 0);
  assert.equal(clamp(2, 0, 1), 1);
  assert.equal(clamp(0.5, 0, 1), 0.5);
});
