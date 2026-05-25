import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terrainHash, fbm3D, terrainProfileForAge } from '../js/engine/terrainNoise.js';
import { RENDER } from '../js/config.js';

test('terrainHash is deterministic and in [-1, 1)', () => {
  for (const [x, y, z, s] of [[1, 2, 3, 0], [-5, 9, 0, 7], [100, 100, 100, 3]]) {
    const a = terrainHash(x, y, z, s);
    const b = terrainHash(x, y, z, s);
    assert.equal(a, b, 'same inputs must give same output (no per-frame shimmer)');
    assert.ok(a >= -1 && a < 1, `hash ${a} out of [-1,1)`);
  }
});

test('fbm3D output stays within [-1, 1]', () => {
  for (let i = 0; i < 50; i++) {
    const v = fbm3D(i * 0.37, i * 1.13, i * 0.71, 4);
    assert.ok(v >= -1 && v <= 1, `fbm3D ${v} out of range`);
  }
});

test('terrainProfileForAge blends modern -> proto with age', () => {
  const modern = terrainProfileForAge(0);
  const proto = terrainProfileForAge(4000);
  const mid = terrainProfileForAge(2000);

  assert.equal(modern.amplitude, RENDER.terrainBaseAmplitude);
  assert.equal(proto.amplitude, RENDER.terrainProtoAmplitude);
  // Proto terrain is taller; mid-time sits between the two.
  assert.ok(proto.amplitude > modern.amplitude);
  assert.ok(mid.amplitude > modern.amplitude && mid.amplitude < proto.amplitude);
  // Jaggedness/hotTint ramp up with age, modern has none.
  assert.equal(modern.jaggedness, 0);
  assert.ok(proto.jaggedness > 0);
});
