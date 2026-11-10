// Ice through deep time: how far sea ice and ice sheets reached from each pole.
//
//   getGlaciation(timeMa) → {
//     seaNorth, seaSouth,     degrees of latitude from the pole covered by sea ice
//     landNorth, landSouth,   degrees of latitude from the pole within which land carries ice sheets
//     northCapLatRadius, southCapLatRadius,   legacy: the larger of the two for that hemisphere
//     alpha,                  legacy cap opacity, 0 when there is no ice
//   }
// A radius of 10 means ice poleward of 80° latitude; 90 means ice to the equator.
//
// Sea ice and land ice are different things. Ice sheets reach much lower latitudes than sea ice (at
// the Last Glacial Maximum the Laurentide sheet reached ~40° N while year-round sea ice stayed
// mostly north of ~60° N), and they exist only where there is land: the Late Ordovician
// and Late Paleozoic ice lay on Gondwana, over the SOUTH pole, with open ocean at the north pole.
//
// The extents are schematic. One latitude per hemisphere cannot describe real ice sheets (in the
// last ice age Canada was buried while Siberia at the same latitude was bare), and for everything
// older than the Cenozoic the "edge" is a judgement from the palaeolatitudes of glacial deposits.
// What is taken from the literature is WHEN there was ice, in WHICH hemisphere, and roughly how far
// it got. Each named interval below is a list of keyframes [timeMa, seaN, seaS, landN, landS] that
// starts and ends at zero; the result is the largest value among the intervals active at that time,
// plus a small temperature-driven sea-ice cap (see baseline). Everything is piecewise linear and
// continuous in time. Abrupt freezes and thaws are spread over enough time to cross several
// animation frames (flagged below).

import { getTemperatureAtTime } from './atmosphere.js';

const INTERVALS = [
  {
    // Oldest known glaciation: diamictites of the Mozaan Group, Pongola Supergroup, South Africa,
    // ~2.9 Ga, at middle palaeolatitudes (Young et al. 1998, J. Geol. 106: 523). Extent and
    // hemisphere unknown: drawn as modest caps at both poles and widened to ~0.1 Gyr so it registers.
    name: 'Pongola glaciation',
    keys: [
      [2960, 0, 0, 0, 0],
      [2925, 12, 12, 20, 20],
      [2895, 12, 12, 20, 20],
      [2860, 0, 0, 0, 0],
    ],
  },
  {
    // Three or four glaciations between ~2.43 and ~2.22 Ga (Huronian Supergroup, Canada; Transvaal,
    // South Africa), the first by 2.426 Ga and at low palaeolatitude (Gumsley et al. 2017, PNAS 114:
    // 1811), the last before ~2.22 Ga (Rasmussen et al. 2013, EPSL 382: 173). Their separate ages are
    // poorly known, so one continuous glacial era is drawn, with ice to middle latitudes in both
    // hemispheres; at least one advance probably went much further (a "snowball").
    name: 'Huronian glaciations',
    keys: [
      [2440, 0, 0, 0, 0],
      [2425, 34, 34, 46, 46],
      [2228, 34, 34, 46, 46],
      [2212, 0, 0, 0, 0],
    ],
  },
  {
    // Sturtian snowball Earth, ~717–659 Ma: glacial deposits at sea level in the tropics on every
    // continent (onset 717.5–716.3 Ma, end 659.3–658.5 Ma: Macdonald et al. 2010, Science 327: 1241;
    // Rooney et al. 2015, Geology 43: 459; compiled by Hoffman et al. 2017, Sci. Adv. 3: e1600983).
    // Ice sheets on all land; the sea ice is drawn to within 10° of the equator — whether a belt of
    // open tropical water survived is debated (Hoffman et al. 2017). No glacial deposits are firmly
    // known from the ~1.5 Gyr since the Huronian, so polar ice appears only in the last few million
    // years before the runaway. LIBERTY: the freeze and the thaw took thousands of years; each is drawn
    // over ~5 Myr, centred on the dated onset and end, so that the ice edge moves a few degrees per
    // frame.
    name: 'Sturtian snowball Earth',
    keys: [
      [723, 0, 0, 0, 0],
      [720, 8, 8, 12, 12],
      [717.3, 40, 40, 50, 50],
      [714.6, 80, 80, 90, 90],
      [661.8, 80, 80, 90, 90],
      [656.6, 0, 0, 0, 0],
    ],
  },
  {
    // Marinoan snowball Earth: began at or after 649.9 Ma and before 639.3 Ma (drawn ~649), ended
    // 636.0–634.7 Ma — cap carbonates 635.2 Ma (Prave et al. 2016, Geology 44: 631; Condon et al.
    // 2005, Science 308: 95; Hoffman et al. 2017). Same liberties as above.
    name: 'Marinoan snowball Earth',
    keys: [
      [652.6, 0, 0, 0, 0],
      [650.4, 22, 22, 30, 30],
      [646.8, 80, 80, 90, 90],
      [637.8, 80, 80, 90, 90],
      [632.6, 0, 0, 0, 0],
    ],
  },
  {
    // Gaskiers glaciation (Newfoundland), 579.9–579.6 Ma and under 340,000 years long (Pu et al.
    // 2016, Geology 44: 955): a middle- to high-latitude ice age, not a snowball. Widened to ~4 Myr.
    name: 'Gaskiers glaciation',
    keys: [
      [582.2, 0, 0, 0, 0],
      [580.4, 14, 20, 22, 32],
      [579.5, 14, 20, 22, 32],
      [577.7, 0, 0, 0, 0],
    ],
  },
  {
    // Late Ordovician–early Silurian ice on Gondwana, which lay over the south pole: ice from the
    // Katian, maximum in the Hirnantian (445.2–443.1 Ma) with sheets across North Africa, Arabia and
    // South America, remnants in South America into the early Silurian (Finnegan et al. 2011, Science
    // 331: 903; Le Heron & Craig 2008, J. Geol. Soc. 165: 19; Díaz-Martínez & Grahn 2007, Palaeogeogr.
    // Palaeoclimatol. Palaeoecol. 245: 62). Southern Hemisphere only.
    name: 'Late Ordovician (Hirnantian) glaciation',
    keys: [
      [458, 0, 0, 0, 0],
      [452, 0, 8, 0, 14],
      [447, 0, 16, 0, 30],
      [445.3, 0, 24, 0, 44],
      [444.6, 0, 28, 0, 52],
      [443.7, 0, 28, 0, 50],
      [443, 0, 22, 0, 40],
      [440, 0, 16, 0, 28],
      [436, 0, 10, 0, 18],
      [431, 0, 8, 0, 14],
      [427, 0, 0, 0, 0],
    ],
  },
  {
    // Late Paleozoic Ice Age on southern Gondwana: first glaciers in the latest Devonian (~360 Ma),
    // major ice from the mid-Carboniferous (~335 Ma), greatest extent in the latest Carboniferous–
    // earliest Permian (~300–294 Ma), main deglaciation in the Artinskian (~290–283 Ma), last ice in
    // eastern Australia until ~260–255 Ma (Fielding, Frank & Isbell 2008, GSA Spec. Pap. 441; Isbell
    // et al. 2012, Gondwana Res. 22: 1; Montañez & Poulsen 2013, Annu. Rev. Earth Planet. Sci. 41:
    // 629). Southern Hemisphere only; any northern ice comes from the temperature baseline.
    name: 'Late Paleozoic Ice Age',
    keys: [
      [364, 0, 0, 0, 0],
      [360, 0, 6, 0, 14],
      [358.5, 0, 10, 0, 22],
      [355, 0, 6, 0, 12],
      [348, 0, 6, 0, 14],
      [342, 0, 12, 0, 26],
      [335, 0, 18, 0, 38],
      [328, 0, 22, 0, 46],
      [318, 0, 22, 0, 46],
      [310, 0, 20, 0, 42],
      [303, 0, 24, 0, 50],
      [294, 0, 24, 0, 50],
      [288, 0, 18, 0, 40],
      [283, 0, 14, 0, 30],
      [272, 0, 10, 0, 24],
      [262, 0, 8, 0, 18],
      [256, 0, 4, 0, 8],
      [253, 0, 0, 0, 0],
    ],
  },
  {
    // Antarctica. Continent-wide ice from the Eocene–Oligocene transition, 33.9–33.6 Ma (Zachos et al.
    // 2001, Science 292: 686; Miller et al. 2020, Sci. Adv. 6: eaaz1346), reduced in the Miocene
    // Climatic Optimum, expanded and permanent after ~13.8 Ma, with a ring of sea ice that widens in
    // glacials (winter sea ice ~5–10° further north at the Last Glacial Maximum: Gersonde et al. 2005,
    // Quat. Sci. Rev. 24: 869). Today: ice sheet to ~64° S, mean sea-ice edge ~64° S.
    name: 'Antarctic ice sheet',
    keys: [
      [36, 0, 0, 0, 0],
      [34.3, 0, 2, 0, 6],
      [33.9, 0, 8, 0, 14],
      [33.6, 0, 16, 0, 23],
      [27, 0, 16, 0, 22],
      [24.5, 0, 14, 0, 20],
      [23, 0, 18, 0, 23],
      [17, 0, 14, 0, 19],
      [14.8, 0, 14, 0, 19],
      [13.8, 0, 20, 0, 24],
      [10, 0, 22, 0, 25],
      [6, 0, 24, 0, 26],
      [2.6, 0, 26, 0, 26],
      [0.9, 0, 28, 0, 27],
      [0.19, 0, 28, 0, 27],
      [0.14, 0, 33, 0, 28],
      [0.125, 0, 25, 0, 26],
      [0.109, 0, 28, 0, 27],
      [0.065, 0, 31, 0, 28],
      [0.021, 0, 33, 0, 28],
      [0.0117, 0, 28, 0, 27],
      [0.008, 0, 26, 0, 26],
      [0, 0, 26, 0, 26],
    ],
  },
  {
    // Northern Hemisphere. Sea ice in the Arctic Ocean from the middle Miocene (seasonal ice is older);
    // lasting ice on Greenland from the late Miocene (~7 Ma: Larsen et al. 1994, Science 264: 952;
    // episodic glaciers since the late Eocene: Eldrett et al. 2007, Nature 446: 176); large ice
    // sheets from ~2.7 Ma (Haug et al. 2005, Nature 433: 821), pulsing every 41 kyr and, after
    // ~0.9 Ma, every ~100 kyr. As with temperature, 2.58–0.19 Ma shows the cycle mean, not the
    // cycles. The last cycle is drawn: penultimate maximum ~140 ka; Last Interglacial with a smaller
    // Greenland ice sheet; stepwise growth; Last Glacial Maximum 26.5–19 ka with the Laurentide sheet
    // to ~40° N and the Scandinavian sheet to ~52° N (Clark et al. 2009, Science 325: 710); retreat
    // complete by ~7 ka (Dyke 2004, Dev. Quat. Sci. 2: 373). Today: Greenland (drawn as land ice
    // within 14° of the pole) and Arctic sea ice (mean edge ~74° N). LIBERTY: the penultimate
    // deglaciation is drawn ~18 kyr long (real: ~7 kyr).
    name: 'Northern Hemisphere ice',
    keys: [
      [14, 0, 0, 0, 0],
      [10, 5, 0, 0, 0],
      [7, 7, 0, 6, 0],
      [3.6, 9, 0, 8, 0],
      [3.3, 11, 0, 12, 0],
      [3.2, 8, 0, 8, 0],
      [3, 9, 0, 9, 0],
      [2.7, 13, 0, 18, 0],
      [2.5, 15, 0, 24, 0],
      [1.25, 16, 0, 27, 0],
      [0.9, 17, 0, 30, 0],
      [0.19, 18, 0, 31, 0],
      [0.143, 27, 0, 44, 0],
      [0.125, 15, 0, 13, 0],
      [0.116, 16, 0, 14, 0],
      [0.109, 19, 0, 26, 0],
      [0.1, 18, 0, 22, 0],
      [0.087, 20, 0, 30, 0],
      [0.082, 19, 0, 25, 0],
      [0.065, 24, 0, 38, 0],
      [0.055, 22, 0, 32, 0],
      [0.035, 23, 0, 36, 0],
      [0.026, 27, 0, 45, 0],
      [0.021, 28, 0, 46, 0],
      [0.019, 28, 0, 45, 0],
      [0.0146, 25, 0, 40, 0],
      [0.0129, 24, 0, 36, 0],
      [0.0117, 23, 0, 33, 0],
      [0.0095, 19, 0, 26, 0],
      [0.008, 17, 0, 20, 0],
      [0.0068, 16, 0, 15, 0],
      [0, 16, 0, 14, 0],
    ],
  },
];

// Temperature-driven baseline: when the global mean is below 18 °C the poles are cold enough for
// a small ice cap even where no glaciation is listed (threshold after Scotese et al. 2021 and the
// "coldhouse" state of Judd et al. 2024); the same radius is applied to both the sea-ice and the
// land-ice edges. In practice it only adds a small northern cap (up to 9°) during the Late
// Paleozoic Ice Age; it is zero in every hothouse and during the magma ocean.
const BASELINE_FULL_C = 10;
const BASELINE_NONE_C = 18;
const BASELINE_MAX_RADIUS = 12;

function baselineRadius(timeMa) {
  const tempC = getTemperatureAtTime(timeMa);
  const t = (BASELINE_NONE_C - tempC) / (BASELINE_NONE_C - BASELINE_FULL_C);
  return BASELINE_MAX_RADIUS * Math.max(0, Math.min(1, t));
}

/** Keyframe table → out = [seaN, seaS, landN, landS] at timeMa (timeMa must lie inside the table). */
function sampleKeys(keys, timeMa, out) {
  let lo = 0;
  let hi = keys.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (keys[mid][0] >= timeMa) lo = mid;
    else hi = mid;
  }
  const a = keys[lo];
  const b = keys[hi];
  const k = Math.max(0, Math.min(1, (a[0] - timeMa) / (a[0] - b[0])));
  for (let i = 0; i < 4; i++) out[i] = a[i + 1] + (b[i + 1] - a[i + 1]) * k;
}

const scratch = [0, 0, 0, 0];

export function getGlaciation(timeMa) {
  const t = timeMa > 0 ? timeMa : 0; // also maps NaN and negative input to the present
  const base = baselineRadius(t);
  let seaNorth = base;
  let seaSouth = base;
  let landNorth = base;
  let landSouth = base;

  for (const interval of INTERVALS) {
    const keys = interval.keys;
    if (t > keys[0][0] || t < keys[keys.length - 1][0]) continue;
    sampleKeys(keys, t, scratch);
    if (scratch[0] > seaNorth) seaNorth = scratch[0];
    if (scratch[1] > seaSouth) seaSouth = scratch[1];
    if (scratch[2] > landNorth) landNorth = scratch[2];
    if (scratch[3] > landSouth) landSouth = scratch[3];
  }

  const north = Math.max(seaNorth, landNorth);
  const south = Math.max(seaSouth, landSouth);
  return {
    northCapLatRadius: north,
    southCapLatRadius: south,
    alpha: 0.88 * Math.min(1, Math.max(north, south) / 8),
    seaNorth,
    seaSouth,
    landNorth,
    landSouth,
  };
}

/** Names of the glacial intervals that have ice at timeMa (for labels and tooltips). */
export function getActiveGlaciations(timeMa) {
  const t = timeMa > 0 ? timeMa : 0;
  const names = [];
  for (const interval of INTERVALS) {
    const keys = interval.keys;
    if (t > keys[0][0] || t < keys[keys.length - 1][0]) continue;
    sampleKeys(keys, t, scratch);
    if (Math.max(scratch[0], scratch[1], scratch[2], scratch[3]) > 0.5) names.push(interval.name);
  }
  return names;
}

// Exported for documentation, sparklines and tests: [{ name, keys: [[timeMa, seaN, seaS, landN, landS], …] }].
export const GLACIAL_INTERVALS = INTERVALS;
