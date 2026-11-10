// planetLook — the planet's colour story through deep time, shared by the Map and Globe views so
// they always agree. Art direction picks the colours; the data picks the timing: magma follows
// getMagmaFraction, sea colour follows the ocean-chemistry regimes, land only greens in step with
// getVegetation, grass only with getGrasslandFraction, ice sits where getGlaciation puts it and
// the climate belts slide with the temperature curve.
//
//   const look = getPlanetLook(timeMa, atmo);          // atmo = { tempC, o2Pct, co2Ppm } (optional)
//
//   look.ocean       { shallow, deep, abyss }  hex — lit open ocean → open ocean → limb / deep basins
//   look.shelf       hex — glow of the shallow seas that hug every coast
//   look.shelfWidth  0..~1.5 — how far that glow reaches (0 = no standing water; rises with sea level)
//   look.landStops   [{ lat, color }] every 5° from -90 to 90 — land colour by latitude (bare rock
//                    before plants; deserts under the subtropical highs; forest, steppe and tundra
//                    belts once land is vegetated; belts slide poleward in hothouse climates)
//   look.landAt(lat) hex — the same data, sampled
//   look.landAlpha   0..1 — solidity of the crust (land fades in as the magma ocean freezes over)
//   look.rock        hex — bare bedrock of the moment
//   look.coast       hex — coastline stroke
//   look.wet         hex — vegetation tint of rain-fed land
//   look.wetStops    [{ lat, alpha, east, west }] every 10° — strength of that tint by latitude
//                    (0 before plants): `alpha` hugs every coast; `east` reaches inland from
//                    east-facing coasts (trade winds blow onshore there in the tropics and
//                    subtropics); `west` from west-facing coasts (the mid-latitude westerlies)
//   look.dry         hex — steppe / desert tint of continental interiors far from any sea
//   look.dryStops    [{ lat, alpha, fringe }] every 10° — strength of that tint by latitude;
//                    `fringe` = patchy drought that frays the edges of the desert belts
//   look.ice         { north, south,                      cap edges in degrees latitude, widest of sea
//                                                         and land ice (90 / -90 = no ice)
//                      seaNorth, seaSouth,                sea-ice edges (degrees latitude)
//                      landNorth, landSouth,              ice-sheet edges on any land that lies there
//                      landNorthAt(lon), landSouthAt(lon) the same edges with their regional lobes
//                                                         (Laurentide low, Siberia high …)
//                      sheets: { plateId: 0..1 },         plates iced over regardless of latitude
//                      alpha,                             0..1 opacity of all ice
//                      snowball,                          0..1 how close the sea ice is to global
//                      sea, land, shade, lead }           hex — pack ice, ice sheet, its shadow, open leads
//   look.atmosphere  { rim, rimAlpha, tint, tintAlpha }   limb-glow colour + strength, and a
//                                                         restrained scene tint
//   look.magma       0..1 molten-surface fraction (Hadean)
//   look.magmaRamp   [hex × 4] incandescence ramp for fissures: ember → orange → yellow → white-hot
//   look.water       0..1 liquid-ocean fraction
//   look.vegetation  0..1 plant cover
//   look.space       hex — backdrop behind the planet
//   look.timeMa      the moment this look describes
//
// Everything is continuous in time: climate inputs are averaged over a third of a second of
// playback on either side, so even a step in a data curve becomes a short ramp instead of a snap.
// The result is memoised — the same moment returns the same object.

import * as planet from '../data/planet.js';
import { getGlaciation } from '../data/glaciation.js';
import { getTemperatureAtTime } from '../data/atmosphere.js';
import { maToScreenSeconds, screenSecondsToMa } from '../engine/timeScale.js';
import { ATMOSPHERE, TIMING } from '../config.js';

// ---- colour helpers --------------------------------------------------------------------------

function parse(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb) {
  const c = (v) => (v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v));
  return `#${((1 << 24) | (c(rgb[0]) << 16) | (c(rgb[1]) << 8) | c(rgb[2])).toString(16).slice(1)}`;
}

/** Linear mix of two hex colours → hex. */
export function mixHex(a, b, t) {
  const ca = parse(a);
  const cb = parse(b);
  const k = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return toHex([ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k]);
}

/** hex + alpha → "rgba(r,g,b,a)". */
export function hexAlpha(hex, alpha) {
  const c = parse(hex);
  const a = alpha <= 0 ? 0 : alpha >= 1 ? 1 : alpha;
  return `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
}

// Internal maths works on [r, g, b] triplets so a look costs no string parsing.
function mix(a, b, t) {
  const k = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** Weighted blend of triplets: [[rgb, weight], ...]. */
function blend(pairs) {
  let r = 0, g = 0, b = 0, w = 0;
  for (const [c, weight] of pairs) {
    if (!(weight > 0)) continue;
    r += c[0] * weight; g += c[1] * weight; b += c[2] * weight; w += weight;
  }
  return w > 0 ? [r / w, g / w, b / w] : pairs[0][0];
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Sample keyframes [[ma, ...values]] (sorted by descending ma) at ma; values are numbers or triplets. */
function sampleKeys(keys, ma) {
  if (ma >= keys[0][0]) return keys[0];
  const last = keys[keys.length - 1];
  if (ma <= last[0]) return last;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (ma <= a[0] && ma >= b[0]) {
      const t = (a[0] - ma) / (a[0] - b[0] || 1);
      const out = [ma];
      for (let k = 1; k < a.length; k++) {
        out.push(typeof a[k] === 'number' ? a[k] + (b[k] - a[k]) * t : mix(a[k], b[k], t));
      }
      return out;
    }
  }
  return last;
}

const P = parse;

// ---- palettes --------------------------------------------------------------------------------

// Sea regimes: [lit open ocean, open ocean, limb / deep basins, shelf glow].
const OCEAN = {
  // Dark, barely frozen crust — the incandescent fissures are painted on top by the views.
  magma:       [P('#6a2209'), P('#35110a'), P('#150706'), P('#ff7a1a')],
  // Freshly frozen basalt under a steam atmosphere, before the rain-out.
  basalt:      [P('#3b302a'), P('#27201c'), P('#13100f'), P('#8a5a3a')],
  // Anoxic, iron-rich Archean sea — green.
  ferruginous: [P('#2a6f5c'), P('#1a5547'), P('#0c322e'), P('#5a9a73')],
  // Sulfidic mid-Proterozoic margins — dusky teal.
  euxinic:     [P('#24668a'), P('#165070'), P('#0b2f4b'), P('#4796a2')],
  // Ventilated Phanerozoic ocean — blue.
  oxygenated:  [P('#1a6aa2'), P('#0f4d7c'), P('#082a4f'), P('#40a6b8')],
};

// Bare bedrock through time, by climate belt: [ma, polar, temperate, arid, tropic].
// Black Hadean crust → dark grey basalt and greenstone (the Archean) → rust-red continents once
// free oxygen appears (red beds, from ~2.3 Ga) → weathered tan. The scene's warm haze lifts these
// a little on screen, so the Archean keys sit darker than they read.
const ROCK_KEYS = [
  [4540, P('#2a1712'), P('#2e1913'), P('#33190f'), P('#33190f')],
  [4400, P('#2c1a14'), P('#301c15'), P('#351d12'), P('#351d12')],
  [4200, P('#2b2421'), P('#2e2622'), P('#332824'), P('#302622')],
  [4000, P('#332d2a'), P('#36302c'), P('#3b332e'), P('#38312c')],
  [3500, P('#3a3431'), P('#3e3733'), P('#463c35'), P('#413833')],
  [2700, P('#473e38'), P('#4c423a'), P('#57493e'), P('#50453c')],
  [2450, P('#58483e'), P('#61493d'), P('#6e4f3f'), P('#664c3e')],
  [2200, P('#6a5043'), P('#795643'), P('#8c5f44'), P('#815942')],
  [1000, P('#735747'), P('#835d46'), P('#986748'), P('#8b6046')],
  [635,  P('#7d6a56'), P('#8a7359'), P('#a0825f'), P('#927859')],
  [520,  P('#84735f'), P('#917c62'), P('#a98d68'), P('#9a8263')],
  [0,    P('#8a7b66'), P('#978568'), P('#c8a875'), P('#a08a66')],
];

// The arid belt once plants exist: [ma, colour]. Red beds across the dry heart of Pangaea, pale
// sand today.
const DESERT_KEYS = [
  [480, P('#a98d68')],
  [320, P('#a8905f')],
  [270, P('#b48654')],
  [252, P('#b47549')],
  [225, P('#bb8a54')],
  [150, P('#b89a62')],
  [50,  P('#bca066')],
  [0,   P('#c8a875')],
];

const BIOME = {
  rainforest: P('#2b6639'),
  temperate:  P('#4f7d3e'),
  boreal:     P('#3f644a'),
  grass:      P('#9aa55a'),
  steppe:     P('#8f9360'),
  tundra:     P('#8f927d'),
  frost:      P('#aeb3aa'),
};

const WET = P('#356f3b');           // lush fringe along rain-catching coasts

const ICE = { sea: '#dfeaf3', land: '#f5f8fb', shade: '#9db6d0', lead: '#2d6384' };

const MAGMA_RAMP = ['#7a1c06', '#ff5a14', '#ffb347', '#fff1c4'];

// Limb glow of the sky through time: [ma, colour, strength].
const RIM_KEYS = [
  [4540, P('#ff7a2a'), 0.34],   // incandescent rock-vapour sky
  [4400, P('#f08040'), 0.30],
  [4200, P('#e89a5e'), 0.26],   // steam and CO₂
  [4000, P('#e2a064'), 0.22],
  [3500, P('#dc9a5c'), 0.20],   // CO₂–methane haze (think Titan)
  [2450, P('#d6965a'), 0.18],
  [2200, P('#b7b9b6'), 0.13],   // the haze clears after the Great Oxidation
  [2000, P('#a9bccb'), 0.11],
  [1000, P('#96b6d4'), 0.10],
  [540,  P('#90b8dc'), 0.10],
  [0,    P('#8fbbe6'), 0.10],
];

const SKY = {
  magma: P('#ff6a2a'),
  haze:  P('#d98a45'),
  snow:  P('#cfe0f0'),
  hot:   P('#d99a5a'),
  cool:  P('#a8c8ea'),
};

// Where the Quaternary ice sheets actually reached, relative to the widest (Laurentide) margin:
// [longitude, degrees the land-ice edge sits poleward of that margin]. Continents have barely
// moved since the ice ages began, so longitude is a fair proxy for "which continent".
const NORTH_LOBES = [
  [-180, 24], [-160, 22], [-140, 12], [-125, 0], [-100, -2], [-80, -1], [-62, 3], [-45, 14],
  [-20, 13], [-5, 5], [15, 5], [40, 10], [60, 16], [90, 27], [120, 30], [150, 28], [180, 24],
];
// The Patagonian ice field pushes north along the Andes: [longitude, degrees] (negative = equatorward).
const SOUTH_LOBES = [
  [-180, 0], [-90, 0], [-73, -11], [-56, 0], [180, 0],
];
// Plates that carry an ice sheet regardless of latitude: [plateId, [[ma, cover], ...]].
const ICE_SHEET_KEYS = {
  greenland: [[18, 0], [7, 0.12], [3.3, 0.3], [2.6, 0.92], [0, 0.92]],
};

// ---- helpers ---------------------------------------------------------------------------------

function sampleLobes(lobes, lon) {
  const x = lon < -180 ? lon + 360 : lon > 180 ? lon - 360 : lon;
  for (let i = 0; i < lobes.length - 1; i++) {
    const a = lobes[i], b = lobes[i + 1];
    if (x >= a[0] && x <= b[0]) {
      const t = (x - a[0]) / (b[0] - a[0] || 1);
      const s = t * t * (3 - 2 * t);
      return a[1] + (b[1] - a[1]) * s;
    }
  }
  return lobes[lobes.length - 1][1];
}

// Sea ice and ice sheets as degrees from each pole. The data module is being extended to report
// them separately; until then they are derived from the single legacy cap radius (pack ice stays
// well poleward of an ice-sheet margin unless the whole planet freezes).
function iceRadii(timeMa) {
  const g = getGlaciation(timeMa) || {};
  const legacy = (r) => {
    const cap = clamp(r || 0, 0, 90);
    return { sea: cap * (0.6 + 0.4 * smoothstep(48, 80, cap)), land: cap + (90 - cap) * smoothstep(70, 82, cap) };
  };
  const n = legacy(g.northCapLatRadius);
  const s = legacy(g.southCapLatRadius);
  const num = (v, fallback) => (Number.isFinite(v) ? clamp(v, 0, 90) : fallback);
  return [
    num(g.seaNorth, n.sea), num(g.seaSouth, s.sea), num(g.landNorth, n.land), num(g.landSouth, s.land),
    clamp(Number.isFinite(g.alpha) ? g.alpha : 0, 0, 1),
  ];
}

// Screen-time taps (seconds of 1× playback, weight) that low-pass the climate inputs: one tap per
// frame of 1× playback across ±0.4 s, triangular weights, so a step in a data curve (a snowball
// freezing over, an ice sheet collapsing) becomes a ramp of a couple of dozen frames, not a jump.
// Temperatures are clamped first: a magma ocean at thousands of degrees must not drag the
// average of a neighbouring frame.
const TAPS = [];
for (let i = -12; i <= 12; i++) TAPS.push([i / 30, 13 - Math.abs(i)]);

function smoothedClimate(timeMa) {
  const sec = maToScreenSeconds(timeMa);
  const ice = [0, 0, 0, 0, 0];
  let temp = 0, wSum = 0;
  for (const [dt, w] of TAPS) {
    const t = dt === 0 ? timeMa : screenSecondsToMa(sec + dt);
    temp += clamp(getTemperatureAtTime(t), -60, 90) * w;
    const r = iceRadii(t);
    for (let i = 0; i < 5; i++) ice[i] += r[i] * w;
    wSum += w;
  }
  for (let i = 0; i < 5; i++) ice[i] /= wSum;
  return { tempDelta: temp / wSum - clamp(getTemperatureAtTime(timeMa), -60, 90), ice };
}

const seaLevelM = (timeMa) => (typeof planet.getSeaLevelM === 'function' ? planet.getSeaLevelM(timeMa) : 0);

// ---- main ------------------------------------------------------------------------------------

let memo = null;

/**
 * @param {number} timeMa
 * @param {{tempC:number, o2Pct:number, co2Ppm:number}} [atmo]
 */
export function getPlanetLook(timeMa, atmo) {
  const t = clamp(Number(timeMa) || 0, TIMING.endTimeMa, TIMING.startTimeMa);
  const tempIn = atmo && Number.isFinite(atmo.tempC) ? atmo.tempC : getTemperatureAtTime(t);
  const o2Pct = atmo && Number.isFinite(atmo.o2Pct) ? atmo.o2Pct : ATMOSPHERE.modernO2Pct;
  if (memo && memo.timeMa === t && memo.tempIn === tempIn && memo.o2In === o2Pct) return memo.look;

  const climate = smoothedClimate(t);
  // Magma-ocean temperatures run to thousands of degrees: the belts saturate long before that.
  const tempC = clamp(tempIn + climate.tempDelta, -60, 90);
  const dev = tempC - ATMOSPHERE.modernTempC;

  const magma = clamp(planet.getMagmaFraction(t), 0, 1);
  const chem = planet.getOceanChemistry(t);
  const water = clamp(chem.water, 0, 1) * (1 - magma);
  const dry = Math.max(0, 1 - magma - water);
  const chemTotal = chem.ferruginous + chem.euxinic + chem.oxygenated || 1;
  const wFerr = (water * chem.ferruginous) / chemTotal;
  const wEux = (water * chem.euxinic) / chemTotal;
  const wOxy = (water * chem.oxygenated) / chemTotal;

  const seaLayer = (i) => blend([
    [OCEAN.magma[i], magma], [OCEAN.basalt[i], dry],
    [OCEAN.ferruginous[i], wFerr], [OCEAN.euxinic[i], wEux], [OCEAN.oxygenated[i], wOxy],
  ]);
  const ocean = { shallow: toHex(seaLayer(0)), deep: toHex(seaLayer(1)), abyss: toHex(seaLayer(2)) };

  // ---- land ----
  const rockKey = sampleKeys(ROCK_KEYS, t);
  const rockPolar = rockKey[1], rockTemperate = rockKey[2], rockArid = rockKey[3], rockTropic = rockKey[4];
  const desert = sampleKeys(DESERT_KEYS, t)[1];
  const vegetation = clamp(planet.getVegetation(t), 0, 1);
  const grass = clamp(planet.getGrasslandFraction(t), 0, 1);

  // Climate belts slide with global temperature: in a hothouse forests reach the poles and the
  // subtropical dry belt widens poleward; in an icehouse tundra and steppe push toward the
  // mid-latitudes and the air is drier everywhere.
  const warm = clamp(dev / 12, -1, 1);
  const polarStart = clamp(62 + dev * 1.9, 30, 96);
  const aridCentre = 24 + 4 * warm;
  const aridWidth = 10 - 1.5 * Math.max(0, warm) + 3 * Math.max(0, -warm);
  const glacialDry = smoothstep(2, 10, -dev);             // 0 … 1 as the world cools into an ice age
  const frozen = 1 - smoothstep(-2, 9, tempC);            // snowball: frost on every rock
  const greenBase = Math.pow(Math.min(1, vegetation / 0.72), 1.3);   // green belts are fully green by ~70% cover

  const landRgb = (latDeg) => {
    const a = Math.abs(latDeg);
    const arid = Math.exp(-(((a - aridCentre) / aridWidth) ** 2));
    const cold = smoothstep(polarStart, polarStart + 16, a);

    // bare ground
    let bare = mix(rockTropic, rockTemperate, smoothstep(8, 40, a));
    bare = mix(bare, rockPolar, smoothstep(50, 80, a));
    bare = mix(bare, rockArid, arid * 0.85);
    if (vegetation > 0) bare = mix(bare, desert, (0.25 + 0.75 * arid) * Math.min(1, vegetation * 6));
    bare = mix(bare, BIOME.frost, Math.max(cold * 0.35, frozen * 0.55));
    if (vegetation <= 0.0005) return bare;

    // plant cover
    let veg = mix(BIOME.rainforest, BIOME.temperate, smoothstep(10, 36, a));
    veg = mix(veg, BIOME.boreal, smoothstep(42, 58, a));
    const grassBelt = grass * (0.3 + 0.7 * Math.exp(-(((a - 26) / 15) ** 2)));
    veg = mix(veg, BIOME.grass, grassBelt);
    veg = mix(veg, BIOME.steppe, glacialDry * smoothstep(18, 44, a) * 0.75);
    const cover = greenBase * (1 - arid * 0.9) * (1 - cold * 0.94) * (1 - frozen);
    let out = mix(bare, veg, cover);
    // tundra / polar barrens where it is too cold for trees
    out = mix(out, BIOME.tundra, cold * 0.6 * Math.min(1, vegetation * 4));
    return out;
  };

  const landStops = [];
  for (let lat = -90; lat <= 90; lat += 5) landStops.push({ lat, color: toHex(landRgb(lat)) });
  const landAt = (latDeg) => toHex(landRgb(clamp(latDeg, -90, 90)));

  // Rain: every coast is a little greener; east coasts catch the trade winds in the tropics and
  // subtropics (so deserts sit on the west sides and in the interiors of continents), west coasts
  // catch the mid-latitude westerlies. Far from any sea the mid-latitudes dry out into steppe.
  const wetBase = 0.62 * Math.pow(vegetation, 0.8) * (1 - frozen) * (1 - 0.35 * glacialDry);
  const dryBase = Math.min(1, vegetation * 5) * (1 - frozen) * (0.5 + 0.2 * glacialDry);
  const wetStops = [];
  const dryStops = [];
  for (let lat = -90; lat <= 90; lat += 10) {
    const a = Math.abs(lat);
    const arid = Math.exp(-(((a - aridCentre) / aridWidth) ** 2));
    const cold = smoothstep(polarStart - 4, polarStart + 12, a);
    wetStops.push({
      lat,
      alpha: wetBase * (1 - arid * 0.7) * (1 - cold),
      east: wetBase * 1.5 * Math.exp(-(((a - aridCentre + 1) / 13) ** 2)) * (1 - cold),
      west: wetBase * 1.1 * Math.exp(-(((a - 50 - 6 * warm) / 11) ** 2)) * (1 - cold),
    });
    const edgeIn = Math.exp(-(((a - aridCentre + aridWidth * 1.15) / 6) ** 2));
    const edgeOut = Math.exp(-(((a - aridCentre - aridWidth * 1.15) / 6) ** 2));
    dryStops.push({
      lat,
      alpha: dryBase * Math.exp(-(((a - 41 - 4 * warm) / 12) ** 2)) * (1 - cold * 0.6),
      fringe: dryBase * 1.5 * Math.max(edgeIn, edgeOut),
    });
  }

  // ---- ice ----
  const [seaN, seaS, landN, landS, iceAlphaRaw] = climate.ice;
  const iceAlpha = smoothstep(0.02, 0.45, iceAlphaRaw) * (1 - magma);
  const quaternary = 1 - smoothstep(4, 9, t);             // the lobes describe the last ice ages only
  const lobeScaleN = quaternary * smoothstep(4, 22, landN);
  const lobeScaleS = quaternary * smoothstep(26, 28.5, landS);
  const landNorth = 90 - landN;
  const landSouth = -90 + landS;
  const sheets = {};
  for (const id of Object.keys(ICE_SHEET_KEYS)) {
    const cover = sampleKeys(ICE_SHEET_KEYS[id], t)[1] * (1 - magma);
    if (cover > 0.001) sheets[id] = cover;
  }
  const ice = {
    north: 90 - Math.max(seaN, landN),
    south: -90 + Math.max(seaS, landS),
    seaNorth: 90 - seaN,
    seaSouth: -90 + seaS,
    landNorth,
    landSouth,
    landNorthAt: (lon) => Math.min(90, landNorth + sampleLobes(NORTH_LOBES, lon) * lobeScaleN),
    landSouthAt: (lon) => Math.max(-90, landSouth + sampleLobes(SOUTH_LOBES, lon) * lobeScaleS),
    sheets,
    alpha: iceAlpha,
    snowball: smoothstep(55, 76, Math.min(seaN, seaS)),
    sea: ICE.sea,
    land: ICE.land,
    shade: ICE.shade,
    lead: ICE.lead,
  };

  // ---- atmosphere ----
  // Every regime contributes through a smooth weight, so the tint never snaps between colours
  // as a curve crosses a threshold.
  const wMagma = smoothstep(0, 0.3, magma);
  const wHaze = (1 - wMagma) * (1 - smoothstep(0.1, 1.2, o2Pct));   // anoxic CO₂–methane haze
  const wSnow = frozen * (1 - wMagma);                               // global glaciation
  const wHot = smoothstep(5, 14, dev) * (1 - wMagma);                // greenhouse warmth
  const wCool = (1 - frozen) * glacialDry;                           // icehouse chill

  const rimKey = sampleKeys(RIM_KEYS, t);
  const rimBase = rimKey[1];
  let rim = mix(rimBase, SKY.snow, 0.7 * wSnow);
  rim = mix(rim, SKY.hot, 0.35 * wHot);
  rim = mix(rim, SKY.cool, 0.4 * wCool);
  const rimAlpha = rimKey[2] + 0.06 * wSnow + 0.04 * wHot + 0.02 * wCool;
  const contributions = [
    [SKY.magma, wMagma * 0.10],
    [SKY.haze, wHaze * 0.075],
    [SKY.snow, wSnow * 0.06],
    [SKY.hot, wHot * 0.05],
    [SKY.cool, wCool * 0.035],
    [rimBase, 0.015],
  ];
  const tintAlpha = Math.min(0.14, contributions.reduce((sum, c) => sum + c[1], 0));
  // The hue is anchored on the limb colour: when every regime weight is small, one of them
  // switching off would otherwise swing the hue of this (faint) tint from one frame to the next.
  contributions.push([rim, 0.05]);
  const tint = blend(contributions);

  const shelf = blend([
    [OCEAN.magma[3], magma], [OCEAN.basalt[3], dry],
    [OCEAN.ferruginous[3], wFerr], [OCEAN.euxinic[3], wEux], [OCEAN.oxygenated[3], wOxy],
  ]);
  const seaLevel = clamp(seaLevelM(t), -150, 260);

  const look = {
    timeMa: t,
    ocean,
    shelf: toHex(shelf),
    shelfWidth: smoothstep(0.05, 0.6, water) * (0.95 + seaLevel / 420),
    rock: toHex(rockTemperate),
    coast: toHex(mix(landRgb(30), P('#fff1d6'), 0.34 + 0.12 * (1 - magma))),
    landStops,
    landAt,
    landAlpha: 1 - smoothstep(0.25, 0.9, magma),
    wet: toHex(WET),
    wetStops,
    dry: toHex(mix(desert, BIOME.steppe, 0.45)),
    dryStops,
    ice,
    atmosphere: { rim: toHex(rim), rimAlpha, tint: toHex(tint), tintAlpha },
    magma,
    magmaRamp: MAGMA_RAMP,
    water,
    vegetation,
    space: '#05070d',
  };
  memo = { timeMa: t, tempIn, o2In: o2Pct, look };
  return look;
}
