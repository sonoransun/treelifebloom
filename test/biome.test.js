import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vegetationLevel, biomeClimate, biomeColorAt } from '../js/util/biome.js';

const RGB = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/;
function rgb(str) {
  const m = RGB.exec(str);
  assert.ok(m, `not an rgb() string: ${str}`);
  return { r: +m[1], g: +m[2], b: +m[3] };
}
const greenness = (c) => c.g - c.r; // how green vs. red/tan

test('vegetationLevel is zero before land plants and rises afterward', () => {
  assert.equal(vegetationLevel(500, 13, 5000), 0);   // pre-470 Ma: barren
  assert.equal(vegetationLevel(1000, 5, 10000), 0);
  const early = vegetationLevel(430, 14, 3000);       // bryophyte spread
  const forested = vegetationLevel(300, 30, 400);     // Carboniferous
  assert.ok(early > 0 && early <= 1);
  assert.ok(forested > early, 'cover should increase after forests');
  assert.ok(vegetationLevel(0, 21, 280) <= 1);
});

test('biomeColorAt returns an rgb string', () => {
  assert.match(biomeColorAt(0, 0, biomeClimate(0), 0), RGB);
});

test('a forested world is greener than the barren early Earth', () => {
  const barren = rgb(biomeColorAt(0, 0, biomeClimate(3000), 0)); // Archean rock
  const lush = rgb(biomeColorAt(0, 0, biomeClimate(50), 0));     // Cenozoic tropics
  assert.ok(greenness(lush) > greenness(barren),
    `lush ${JSON.stringify(lush)} should be greener than barren ${JSON.stringify(barren)}`);
});

test('subtropical desert belt reads less green than the equator', () => {
  const climate = biomeClimate(50);
  const equator = rgb(biomeColorAt(0, 0, climate, 0));
  const desert = rgb(biomeColorAt(25, 0, climate, 0));
  assert.ok(greenness(equator) > greenness(desert),
    `equator ${JSON.stringify(equator)} vs desert ${JSON.stringify(desert)}`);
});

test('high elevation is rockier (less green) than lowland at the same latitude', () => {
  const climate = biomeClimate(50);
  const lowland = rgb(biomeColorAt(0, -0.4, climate, 0));
  const peak = rgb(biomeColorAt(0, 0.9, climate, 0));
  assert.ok(greenness(lowland) >= greenness(peak));
});
