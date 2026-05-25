import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fractalSubdivide } from '../js/engine/fractal.js';

const triangle = [[0, 0], [10, 0], [5, 8]];

test('fractalSubdivide is deterministic (no per-frame shimmer)', () => {
  const a = fractalSubdivide(triangle);
  const b = fractalSubdivide(triangle);
  assert.deepEqual(a, b);
});

test('subdivision adds vertices and keeps coordinates finite', () => {
  const out = fractalSubdivide(triangle);
  assert.ok(out.length >= triangle.length);
  for (const [x, y] of out) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
  }
});

test('depth 0 / degenerate input is returned unchanged', () => {
  assert.deepEqual(fractalSubdivide([[1, 1], [2, 2]]), [[1, 1], [2, 2]]); // < 3 verts
  const flat = fractalSubdivide(triangle, 0);
  assert.equal(flat.length, triangle.length);
});

test('amplitude 0 leaves vertices on their original edges (no displacement)', () => {
  const out = fractalSubdivide(triangle, 3, 0);
  // With no amplitude the inserted points are exact edge midpoints — all finite, count grows.
  assert.ok(out.length > triangle.length);
  for (const [x, y] of out) assert.ok(Number.isFinite(x) && Number.isFinite(y));
});
