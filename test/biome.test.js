import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vegetationLevel, biomeClimate, biomeColorAt } from '../js/util/biome.js';
import { mixColors, clamp } from '../js/util/colorMix.js';
import { RENDER_EXTRA } from '../js/config.js';

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

// Reference implementation of biomeColorAt's compose step as it existed before the
// numeric-mixing optimization: a chain of mixColors calls that round each channel
// per step. The optimized path must stay byte-identical to this.
function referenceBiomeColorAt(latDeg, relAlt, climate, mottle = 0) {
  const B = RENDER_EXTRA.biome;
  if (!B || !B.enabled) return null;
  const absLat = Math.abs(latDeg);
  const cap = latDeg >= 0 ? climate.glac.northCapLatRadius : climate.glac.southCapLatRadius;
  const iceEdgeLat = 90 - cap;
  const tundraBand = 15;
  const iceProx = clamp((absLat - (iceEdgeLat - tundraBand)) / tundraBand, 0, 1);
  const tempAnom = (climate.tempC - 15) / 25;
  const warmth = clamp(1 - absLat / 75 + tempAnom * 0.15, 0, 1);
  let aridity = clamp(1 - Math.abs(absLat - B.desertLatCenter) / B.desertLatWidth, 0, 1);
  aridity *= clamp(0.5 + (climate.tempC - 12) / 30, 0, 1.2);
  aridity = clamp(aridity + mottle * 0.15, 0, 1);
  let green = climate.veg * (1 - aridity) * (1 - iceProx) * (0.5 + 0.5 * warmth);
  green *= clamp(1 - Math.max(0, relAlt) * 0.5, 0.3, 1);
  green = clamp(green + mottle * 0.12 * climate.veg, 0, 1);
  let color = mixColors(B.rock, B.desert, aridity * (1 - iceProx));
  const vegColor = warmth > 0.66 ? B.forest : warmth > 0.33 ? B.grass : B.boreal;
  color = mixColors(color, vegColor, green);
  color = mixColors(color, B.tundra, iceProx * 0.8);
  if (mottle !== 0) color = mixColors(color, mottle > 0 ? '#ffffff' : '#000000', Math.abs(mottle) * 0.06);
  return color;
}

test('numeric mixing path is byte-identical to the reference mixColors chain', () => {
  const times = [0, 50, 150, 300, 420, 470, 800, 2000, 3500];
  const alts = [-0.8, -0.3, 0, 0.4, 0.9];
  const mottles = [-1, -0.4, 0, 0.3, 1];
  for (const t of times) {
    const climate = biomeClimate(t);
    for (let lat = -85; lat <= 85; lat += 17) {
      for (const alt of alts) {
        for (const mottle of mottles) {
          assert.equal(
            biomeColorAt(lat, alt, climate, mottle),
            referenceBiomeColorAt(lat, alt, climate, mottle),
            `t=${t} lat=${lat} alt=${alt} mottle=${mottle}`
          );
        }
      }
    }
  }
});

// Snapshot grid pinned from the pre-optimization implementation. Guards against
// silent palette/rounding drift in future refactors.
test('biomeColorAt matches pinned snapshot over a time × lat × alt × mottle grid', () => {
  const snapshot = [
    [3000, -60, 0, 0, 'rgb(138,122,94)'], [3000, -60, 0, 0.5, 'rgb(146,129,100)'],
    [3000, -60, 0.7, 0, 'rgb(138,122,94)'], [3000, -60, 0.7, 0.5, 'rgb(146,129,100)'],
    [3000, 0, 0, 0, 'rgb(138,122,94)'], [3000, 0, 0, 0.5, 'rgb(146,129,100)'],
    [3000, 0, 0.7, 0, 'rgb(138,122,94)'], [3000, 0, 0.7, 0.5, 'rgb(146,129,100)'],
    [3000, 25, 0, 0, 'rgb(201,168,106)'], [3000, 25, 0, 0.5, 'rgb(203,171,110)'],
    [3000, 25, 0.7, 0, 'rgb(201,168,106)'], [3000, 25, 0.7, 0.5, 'rgb(203,171,110)'],
    [420, -60, 0, 0, 'rgb(123,118,91)'], [420, -60, 0, 0.5, 'rgb(131,124,96)'],
    [420, -60, 0.7, 0, 'rgb(128,119,92)'], [420, -60, 0.7, 0.5, 'rgb(136,125,98)'],
    [420, 0, 0, 0, 'rgb(109,116,78)'], [420, 0, 0, 0.5, 'rgb(117,122,84)'],
    [420, 0, 0.7, 0, 'rgb(119,118,84)'], [420, 0, 0.7, 0.5, 'rgb(127,124,89)'],
    [420, 25, 0, 0, 'rgb(169,148,97)'], [420, 25, 0, 0.5, 'rgb(175,155,103)'],
    [420, 25, 0.7, 0, 'rgb(173,150,99)'], [420, 25, 0.7, 0.5, 'rgb(178,156,104)'],
    [200, -60, 0, 0, 'rgb(105,112,87)'], [200, -60, 0, 0.5, 'rgb(111,117,92)'],
    [200, -60, 0.7, 0, 'rgb(117,116,89)'], [200, -60, 0.7, 0.5, 'rgb(122,121,95)'],
    [200, 0, 0, 0, 'rgb(75,109,59)'], [200, 0, 0, 0.5, 'rgb(82,114,65)'],
    [200, 0, 0.7, 0, 'rgb(97,114,71)'], [200, 0, 0.7, 0.5, 'rgb(103,119,77)'],
    [200, 25, 0, 0, 'rgb(152,142,90)'], [200, 25, 0, 0.5, 'rgb(160,148,96)'],
    [200, 25, 0.7, 0, 'rgb(162,146,94)'], [200, 25, 0.7, 0.5, 'rgb(167,151,99)'],
    [0, -60, 0, 0, 'rgb(140,140,119)'], [0, -60, 0, 0.5, 'rgb(143,143,123)'],
    [0, -60, 0.7, 0, 'rgb(143,141,120)'], [0, -60, 0.7, 0.5, 'rgb(145,144,123)'],
    [0, 0, 0, 0, 'rgb(63,107,52)'], [0, 0, 0, 0.5, 'rgb(70,111,59)'],
    [0, 0, 0.7, 0, 'rgb(89,112,67)'], [0, 0, 0.7, 0.5, 'rgb(95,117,73)'],
    [0, 25, 0, 0, 'rgb(138,136,85)'], [0, 25, 0, 0.5, 'rgb(145,142,90)'],
    [0, 25, 0.7, 0, 'rgb(152,141,90)'], [0, 25, 0.7, 0.5, 'rgb(156,145,95)'],
  ];
  const climates = new Map();
  for (const [t, lat, alt, mottle, want] of snapshot) {
    if (!climates.has(t)) climates.set(t, biomeClimate(t));
    assert.equal(biomeColorAt(lat, alt, climates.get(t), mottle), want,
      `t=${t} lat=${lat} alt=${alt} mottle=${mottle}`);
  }
});
