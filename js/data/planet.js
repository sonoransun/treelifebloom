// Planet-state curves: slow, planet-wide variables that give each moment its context
// (how long was a day, how bright was the Sun, was the land green yet, what were the seas like).
//
// All values are smoothed, order-of-magnitude reconstructions for animation. Curves are
// [timeMa, value] knots, oldest first, joined by straight lines; the comment above each one names
// the literature it leans on and the liberties it takes (source for docs/data-sources.md).
// Three kinds of curve live here, and they deserve different amounts of trust:
//   measured-ish  — sea level (Phanerozoic), day length, solar luminosity: published numbers
//   editorial     — magma, ocean chemistry, vegetation, grassland: 0..1 weights that turn a
//                   well-dated SEQUENCE of events into something a renderer can blend. The timing
//                   is from the literature; the weights themselves are judgement calls.

import { interpolateFromCurve } from './atmosphere.js';
import { getGlaciation } from './glaciation.js';

// ---------------------------------------------------------------------------------------------
// MAGMA — fraction of the surface that is molten.
// Earth forms hot; the Moon-forming giant impact (~4.51 Ga: Barboni et al. 2017, Sci. Adv. 3:
// e1602365) melts whatever crust existed. LIBERTY: the resulting magma ocean probably froze over
// within a few million years (Elkins-Tanton 2008, EPSL 271: 181; Zahnle et al. 2007, Space Sci.
// Rev. 129: 35); here it fades over ~100 Myr so that it can be seen, ending before the oldest
// zircon (4404 Ma, Jack Hills: Wilde et al. 2001, Nature 409: 175), which needs solid crust.
// ---------------------------------------------------------------------------------------------
const magmaCurve = [
  [4540, 1.0],
  [4500, 1.0],
  [4460, 0.6],
  [4440, 0.25],
  [4420, 0.06],
  [4404, 0.0],
  [0, 0.0],
];

// ---------------------------------------------------------------------------------------------
// WATER — liquid-water ocean coverage of the non-continental surface (0 = none, 1 = modern-style
// oceans). After the magma ocean the water is in the air as steam; it rains out once the surface
// cools below ~374 °C, above which water cannot be liquid at any pressure (Zahnle et al. 2007; in
// the temperature curve, from ~4423 Ma). Oxygen isotopes in Jack Hills zircons show that liquid
// water was interacting with crust by 4.4–4.3 Ga (Wilde et al. 2001; Valley et al. 2002, Geology
// 30: 351).
// ---------------------------------------------------------------------------------------------
const waterCurve = [
  [4540, 0.0],
  [4423, 0.0],      // the global mean falls below water's critical point (374 °C)
  [4404, 0.6],
  [4370, 0.9],
  [4340, 1.0],
  [0, 1.0],
];

// ---------------------------------------------------------------------------------------------
// OCEAN CHEMISTRY — regime weights (they need not sum to 1; consumers normalise).
//   ferruginous — anoxic and iron-rich: the Archean ocean and most of the Proterozoic deep ocean
//   euxinic     — anoxic and sulfidic: productive margins of the mid-Proterozoic ocean, and brief
//                 returns during Phanerozoic oceanic anoxic events
//   oxygenated  — ventilated: first only the sunlit surface layer, the whole ocean since the Devonian
// Timing: iron formations show a ferruginous ocean until the Great Oxidation; sulfidic waters appear
// along continental margins by ~1.84 Ga (Canfield 1998, Nature 396: 450; Poulton, Fralick & Canfield
// 2004, Nature 431: 173) but the deep ocean stayed mostly iron-rich, not sulfidic (Planavsky et al.
// 2011, Nature 477: 448; Lyons, Reinhard & Planavsky 2014, Nature 506: 307); ferruginous water was
// again dominant in the later Neoproterozoic (Canfield et al. 2008, Science 321: 949). Anoxic deep
// water stayed common through the early Paleozoic; the lasting oxygenation of the deep ocean came
// only in the Devonian (Sperling et al. 2015, Nature 523: 451; Dahl et al. 2010, PNAS 107: 17911).
// Small euxinic bumps mark the best-documented anoxic events: Kellwasser 372 Ma, Hangenberg 359 Ma,
// end-Permian (photic-zone euxinia: Grice et al. 2005, Science 307: 706), end-Triassic, Toarcian
// 183 Ma, OAE 1a 120 Ma, OAE 2 94 Ma (Jenkyns 2010, Geochem. Geophys. Geosyst. 11: Q03004).
// The weights are editorial: they order and date the regimes, they do not measure them.
// ---------------------------------------------------------------------------------------------
const ferruginousCurve = [
  [4540, 1.0],
  [2450, 1.0],
  [2300, 0.85],     // surface waters turn mildly oxic after the Great Oxidation
  [1850, 0.65],
  [1000, 0.65],
  [800, 0.7],
  [660, 0.75],      // Cryogenian: iron formations return
  [635, 0.7],
  [580, 0.6],
  [538.8, 0.5],
  [500, 0.42],
  [445, 0.35],
  [420, 0.25],
  [390, 0.08],      // Devonian: the deep ocean is finally ventilated
  [360, 0.04],
  [300, 0.0],
  [0, 0.0],
];

const euxinicCurve = [
  [4540, 0.0],
  [2450, 0.0],
  [2300, 0.02],
  [1850, 0.15],     // sulfidic wedges along productive margins
  [1000, 0.15],
  [750, 0.1],
  [660, 0.05],
  [600, 0.08],
  [538.8, 0.1],
  [500, 0.12],      // Cambrian anoxic, sulfidic shelf seas
  [445, 0.1],
  [420, 0.08],
  [390, 0.04],
  [373, 0.04],
  [372.2, 0.14],    // Kellwasser events
  [371, 0.05],
  [359.6, 0.04],
  [358.9, 0.1],     // Hangenberg event
  [357.8, 0.03],
  [300, 0.02],
  [253, 0.03],
  [251.9, 0.25],    // end-Permian: sulfidic water reaches the sunlit zone
  [250, 0.2],
  [247, 0.08],
  [240, 0.03],
  [202, 0.03],
  [201.3, 0.1],     // end-Triassic
  [200.3, 0.03],
  [183.6, 0.03],
  [183, 0.1],       // Toarcian oceanic anoxic event
  [182, 0.03],
  [121, 0.02],
  [120.3, 0.08],    // OAE 1a
  [119.5, 0.02],
  [94.4, 0.02],
  [93.9, 0.1],      // OAE 2
  [93.2, 0.02],
  [50, 0.01],
  [0, 0.0],
];

const oxygenatedCurve = [
  [4540, 0.0],
  [2450, 0.0],
  [2300, 0.13],     // a thin oxic surface layer
  [1850, 0.2],
  [1000, 0.2],
  [800, 0.2],
  [660, 0.2],
  [635, 0.22],
  [580, 0.32],      // Ediacaran pulses of deep-ocean oxygenation
  [538.8, 0.4],
  [500, 0.46],
  [445, 0.55],
  [420, 0.67],
  [390, 0.88],      // Devonian: lasting deep-ocean oxygenation
  [360, 0.93],
  [300, 0.98],
  [0, 1.0],
];

// ---------------------------------------------------------------------------------------------
// VEGETATION — share of ice-free land carrying plant cover (today ≈ 0.78: about a fifth of ice-free
// land is desert or bare).
// Dated steps: first land plants (spores of liverwort-grade plants from ~470 Ma: Rubinstein et al.
// 2010, New Phytol. 188: 365; molecular clocks allow a Cambrian origin: Morris et al. 2018, PNAS
// 115: E2274); small vascular plants along waterways by the late Silurian (Cooksonia, ~430 Ma); the
// Rhynie chert wetland flora (407 Ma); the first forests in the Middle Devonian (the oldest known,
// ~390 Ma, in the Hangman Sandstone of SW England: Davies, McMahon & Berry 2024, J. Geol. Soc. 181:
// jgs2023-204; Cairo and Gilboa, New York, ~386–385 Ma: Stein et al. 2020, Curr. Biol. 30: 421);
// Carboniferous coal forests; the rainforest collapse ~305 Ma (Sahney, Benton & Falcon-Lang 2010,
// Geology 38: 1079); the end-Permian loss of forests and the Early Triassic "coal gap", ~252–243 Ma
// (Retallack, Veevers & Morante 1996, GSA Bull. 108: 195); flowering plants taking over between
// ~100 and 70 Ma; forests reaching both poles in the Eocene; deserts and steppe spreading in the
// Pleistocene glacials.
// The K-Pg "fern spike" (forest canopy lost for years to millennia: Vajda, Raine & Hollis 2001,
// Science 294: 1700) is drawn ~0.3 Myr wide and shallow so that it registers at all.
// The fractions between the dated steps are editorial.
// ---------------------------------------------------------------------------------------------
const vegetationCurve = [
  [4540, 0.0],
  [480, 0.0],
  [470, 0.02],      // first land plants: moss- and liverwort-like, in wet places
  [445, 0.05],
  [430, 0.08],      // Cooksonia-grade vascular plants
  [407, 0.16],      // Rhynie chert
  [393, 0.28],
  [385, 0.45],      // first forests
  [372, 0.58],      // Archaeopteris forests span the continents
  [359, 0.62],
  [330, 0.72],
  [310, 0.76],      // coal forests
  [303, 0.68],      // rainforest collapse
  [280, 0.64],
  [260, 0.62],      // arid Pangaea
  [252.2, 0.62],
  [251.7, 0.36],    // end-Permian: forests collapse
  [247, 0.36],      // the "coal gap"
  [240, 0.54],
  [230, 0.64],
  [201.6, 0.68],
  [201.2, 0.6],     // end-Triassic disturbance
  [198, 0.68],
  [150, 0.74],
  [100, 0.78],      // flowering plants begin to take over
  [70, 0.82],
  [66.05, 0.82],
  [65.97, 0.68],    // K-Pg "fern spike" (widened)
  [65.7, 0.8],
  [60, 0.86],
  [50, 0.9],        // Eocene: forests from pole to pole
  [34, 0.84],
  [15, 0.82],
  [3, 0.8],
  [0.19, 0.74],     // Pleistocene mean
  [0.14, 0.68],     // glacial maximum
  [0.125, 0.8],     // Last Interglacial
  [0.065, 0.72],
  [0.021, 0.66],    // Last Glacial Maximum: expanded deserts and polar barrens
  [0.0117, 0.74],
  [0.008, 0.8],     // early Holocene: a green Sahara
  [0, 0.78],
];

// ---------------------------------------------------------------------------------------------
// GRASSLAND — share of vegetated land that is grassland or open savanna rather than forest (today
// ≈ 0.4). Grasses existed in the Late Cretaceous, but open, grass-dominated habitats appear only
// from the late Oligocene–early Miocene (on most continents by ~24–18 Ma) and tropical C4 grasslands
// expand between ~8 and 3 Ma (Strömberg 2011, Annu. Rev. Earth Planet. Sci. 39: 517; Cerling et al.
// 1997, Nature 389: 153; Edwards et al. 2010, Science 328: 587).
// ---------------------------------------------------------------------------------------------
const grasslandCurve = [
  [4540, 0],
  [34, 0],
  [28, 0.02],
  [23, 0.08],       // first grass-dominated habitats
  [18, 0.18],
  [8, 0.28],
  [3, 0.4],         // C4 grasslands
  [0.021, 0.46],    // glacial steppe
  [0, 0.4],
];

// ---------------------------------------------------------------------------------------------
// DAY LENGTH — hours. The Moon's tides slow Earth's spin.
// Anchors: ~5 h just after the Moon-forming impact (canonical impact models; unknown before it);
// ~13 h at 3.2 Ga (tidal rhythmites, Moodies Group: Eulenfeld & Heubeck 2023, J. Geophys. Res.
// Planets 128: e2022JE007466); ~17 h at 2.46 Ga (Milankovitch cycles in banded iron formation:
// Lantink et al. 2022, PNAS 119: e2117146119); a stall near 19 h between ~2 and ~1 Ga, when the
// Sun's pull on the atmospheric tide may have balanced the Moon's braking (Mitchell & Kirscher 2023,
// Nat. Geosci. 16: 567; 18.7 h at 1.4 Ga: Meyers & Malinverno 2018, PNAS 115: 6363); 21.9 ± 0.4 h at
// ~620 Ma (Elatina rhythmites: Williams 2000, Rev. Geophys. 38: 37); ~22 h in the Devonian, from
// ~400 daily growth lines per year in corals (Wells 1963, Nature 197: 948); 23.5 h in the latest
// Cretaceous, from 372 days per year in a rudist bivalve (de Winter et al. 2020, Paleoceanogr.
// Paleoclimatol. 35: e2019PA003723). Between anchors the curve is a smooth guess; before 3.2 Ga it
// is model-based only.
// ---------------------------------------------------------------------------------------------
const dayLengthCurve = [
  [4540, 5],
  [4500, 5],
  [4400, 6.5],
  [4000, 9.5],
  [3500, 12],
  [3200, 13],
  [2800, 15],
  [2460, 17],
  [2200, 18.3],
  [2000, 19],       // resonance stall
  [1000, 19.3],
  [800, 20.4],
  [620, 21.5],
  [400, 22],
  [300, 22.6],
  [200, 23],
  [70, 23.5],
  [0, 24],
];

// ---------------------------------------------------------------------------------------------
// SOLAR LUMINOSITY — relative to today. Standard solar evolution (Gough 1981, Solar Physics 74: 21):
//   L(t) = 1 / (1 + 0.4 · (1 − t / 4.57 Gyr)),  t = age of the Sun.
// 71.6 % at 4.54 Ga, 82 % at 2.5 Ga, 95.5 % at 540 Ma: the "faint young Sun".
// ---------------------------------------------------------------------------------------------
const SUN_AGE_MA = 4570;
const solarLuminosityAt = (timeMa) => 1 / (1 + 0.4 * (Math.max(0, Math.min(SUN_AGE_MA, timeMa)) / SUN_AGE_MA));
const luminosityCurve = [];
for (let ma = 4540; ma > 0; ma -= 227) luminosityCurve.push([ma, Number(solarLuminosityAt(ma).toFixed(4))]);
luminosityCurve.push([0, 1]);

// ---------------------------------------------------------------------------------------------
// SEA LEVEL — global mean sea level relative to today, metres. Known only for the Phanerozoic:
// before 538.8 Ma the curve is 0 by construction, NOT a measurement (see isSeaLevelKnown).
// Long-term (million-year) trends, heavily smoothed; magnitudes before the Cenozoic are uncertain
// by at least ± 50 m and the stratigraphic estimates used here sit at the high end of the range.
//   Paleozoic — Haq & Schutter 2008 (Science 322: 64): a rise through the Cambrian (from near today's
//     level to ~+90 m); the Paleozoic maximum, ~+220 m, in the Late Ordovician; a fall of ~95 m with
//     the Hirnantian ice (estimates 50–100 m, > 80 m at Meifod, Wales: Brenchley et al. 2006, Geol.
//     J. 41); ~+180 m in the Silurian; an Early Devonian low and a high near
//     the Middle–Late Devonian boundary; a fall to about today's level near the Mississippian–
//     Pennsylvanian boundary; ~+80 m in the latest Carboniferous; a steep Middle Permian fall to the
//     lowest level of the era, about today's, in the Late Permian.
//   Triassic and Jurassic — Haq 2018 (GSA Today 28(12): 4 and 28(1): 4): within ~20 m of today's for
//     most of the Triassic, ~+50 m in the late Carnian, ~−50 m in the Rhaetian and earliest Jurassic;
//     ~+75 m in the Toarcian; ~+140 m near the Kimmeridgian–Tithonian boundary; ~+100 m at the end.
//   Cretaceous — Haq 2014 (Glob. Planet. Change 113: 44): ~+75 m in the mid-Valanginian, ~+165 m in
//     the early Barremian, the Mesozoic peak of ~+240–250 m in the earliest Turonian. Backstripping
//     and ocean-basin models give lower Late Cretaceous values (+100 ± 50 m: Miller et al. 2005,
//     Science 310: 1293; ~+170 m: Müller et al. 2008, Science 319: 1357), so the descent from the
//     Turonian peak to the Paleocene partly reflects the change of method between sources.
//   Cenozoic — the smoothed ice-volume record of Miller et al. 2020 (Sci. Adv. 6: eaaz1346; data:
//     PANGAEA, doi:10.1594/PANGAEA.923139), from benthic δ18O and Mg/Ca: +50–60 m in the nearly
//     ice-free early Eocene (all of today's ice melted would add ~66 m); a ~65 m fall as Antarctica
//     glaciated, 34.0–33.4 Ma; Oligocene and early Miocene levels within ~20 m of today's as the
//     Antarctic ice waxed and waned; +25–30 m in the Miocene Climatic Optimum; ~−20 m in the late
//     Miocene. Its Paleocene values are not followed: the curve descends smoothly from the
//     Cretaceous values instead. LIBERTY: the smoothed record averages the Pliocene's warm and cold
//     spells to about today's level; the curve shows the mid-Pliocene warm peaks, ~+15 m (+5 to
//     +25 m: Dumitru et al. 2019, Nature 574: 233; Miller et al. 2012, Geology 40: 407).
//   Last glacial cycle — +5.5 to +9 m in the Last Interglacial (Dutton & Lambeck 2012, Science
//     337: 216); −125 m at the Last Glacial Maximum (estimates −120 to −134 m: Clark et al. 2009,
//     Science 325: 710; Lambeck et al. 2014, PNAS 111: 15296); deglacial rise after Lambeck et al.
//     2014. As with temperature, the Pleistocene before 190 ka shows the cycle mean (real range:
//     about +10 to −130 m).
// ---------------------------------------------------------------------------------------------
export const SEA_LEVEL_KNOWN_FROM_MA = 538.8;

const seaLevelCurve = [
  [4540, 0],
  [538.8, 0],       // older values are unknown, not zero
  [530, 15],
  [515, 40],
  [500, 65],
  [487, 90],
  [478, 150],
  [468, 180],
  [455, 215],
  [450, 220],       // Late Ordovician: highest seas of the Paleozoic
  [445.6, 215],
  [444.6, 120],     // Hirnantian ice
  [443.6, 120],
  [443, 150],
  [441, 175],
  [432, 185],
  [425, 180],
  [419.6, 170],
  [408, 150],       // Early Devonian low
  [395, 160],
  [383, 185],
  [372, 170],
  [362, 140],
  [358.9, 120],
  [347, 90],
  [335, 60],
  [323, 0],         // Mississippian–Pennsylvanian boundary low
  [315, 20],
  [307, 50],
  [300, 80],
  [295, 65],
  [280, 60],
  [272, 45],
  [265, 15],
  [259, 0],         // Late Permian: lowest of the Paleozoic
  [254, 0],
  [251.9, 5],
  [247, 15],
  [244, 0],
  [240, 15],
  [237, 30],
  [229, 50],        // late Carnian
  [222, 15],
  [212, 5],
  [206, 0],
  [203.5, -50],     // Rhaetian low
  [201.4, -45],
  [199, -30],
  [195, -5],
  [190, 20],
  [183, 60],
  [181, 75],        // Toarcian
  [175, 35],
  [170, 45],
  [165, 70],
  [160, 100],
  [150, 140],       // Kimmeridgian–Tithonian
  [143.1, 100],
  [140, 110],
  [135, 78],        // Valanginian trough
  [125.5, 165],
  [118, 170],
  [108, 170],
  [100, 200],
  [93.5, 245],      // earliest Turonian: highest seas of the last 250 Myr
  [88, 225],
  [80, 215],
  [72, 190],
  [66, 150],
  [61, 95],
  [56, 65],
  [53, 55],         // nearly ice-free early Eocene
  [50, 58],
  [48, 52],
  [46, 35],
  [42, 34],
  [40, 50],         // Middle Eocene Climatic Optimum
  [38, 22],
  [36, 35],
  [34.2, 45],
  [34, 44],
  [33.8, 22],
  [33.6, -12],      // Antarctica glaciates
  [33.4, -21],
  [33, -13],
  [32, 0],
  [30, 2],
  [28.5, -15],
  [26, 6],
  [24, 18],
  [23, -20],        // Mi-1 glaciation
  [21, -12],
  [20, 1],
  [19, -12],
  [17.5, 4],
  [16.5, 26],
  [15, 30],         // Miocene Climatic Optimum
  [14, 22],
  [13.8, 9],        // East Antarctic ice expands
  [13, -7],
  [12, 1],
  [10.5, 0],
  [9, -20],         // late Miocene
  [8, -18],
  [7, -6],
  [5.3, -5],
  [4, 6],
  [3.6, 10],
  [3.4, 5],
  [3.3, -15],       // M2 glaciation
  [3.2, 15],        // mid-Pliocene warm period (warm peaks: see above)
  [3.05, 15],
  [2.9, -2],
  [2.6, -18],       // Northern Hemisphere ice sheets; cycle mean from here on
  [2, -22],
  [1.25, -26],      // 41-kyr world
  [1, -33],
  [0.9, -45],       // mid-Pleistocene transition
  [0.45, -60],      // cycle mean, 100-kyr world
  [0.19, -60],
  [0.14, -120],     // penultimate glacial maximum
  [0.129, -5],
  [0.125, 7],       // Last Interglacial
  [0.118, 3],
  [0.109, -45],
  [0.1, -25],
  [0.087, -55],
  [0.082, -25],
  [0.065, -90],
  [0.055, -65],
  [0.035, -75],
  [0.029, -100],
  [0.021, -125],    // Last Glacial Maximum
  [0.019, -122],
  [0.0165, -112],
  [0.0146, -100],
  [0.014, -82],     // meltwater pulse 1A
  [0.0129, -68],
  [0.0117, -60],
  [0.01, -40],
  [0.0082, -15],
  [0.007, -4],
  [0.004, -1],
  [0, 0],
];

export function getMagmaFraction(timeMa) {
  return interpolateFromCurve(magmaCurve, timeMa);
}

export function getOceanChemistry(timeMa) {
  return {
    water: interpolateFromCurve(waterCurve, timeMa),
    ferruginous: interpolateFromCurve(ferruginousCurve, timeMa),
    euxinic: interpolateFromCurve(euxinicCurve, timeMa),
    oxygenated: interpolateFromCurve(oxygenatedCurve, timeMa),
  };
}

export function getVegetation(timeMa) {
  return interpolateFromCurve(vegetationCurve, timeMa);
}

export function getGrasslandFraction(timeMa) {
  return interpolateFromCurve(grasslandCurve, timeMa);
}

export function getDayLengthHours(timeMa) {
  return interpolateFromCurve(dayLengthCurve, timeMa);
}

export function getSolarLuminosity(timeMa) {
  return solarLuminosityAt(timeMa);
}

/** Global mean sea level vs today in metres. Meaningful only where isSeaLevelKnown(timeMa). */
export function getSeaLevelM(timeMa) {
  return interpolateFromCurve(seaLevelCurve, timeMa);
}

/** False before the Phanerozoic, where getSeaLevelM returns a placeholder 0. */
export function isSeaLevelKnown(timeMa) {
  return timeMa <= SEA_LEVEL_KNOWN_FROM_MA;
}

// ---------------------------------------------------------------------------------------------
// CLIMATE STATE — one word for the moment.
// Temperature alone cannot tell an icehouse from a greenhouse: with a supercontinent parked on the
// pole, ice sheets grew at global means well above today's (Hirnantian ≈ 20 °C; Judd et al. 2024,
// Science 385: eadk3705). So the state is read from the ice first (js/data/glaciation.js) and from
// the temperature second. Temperature thresholds follow the PhanDA climate states of Judd et al.:
// coldhouse < 18 °C, coolhouse 18–22 °C, transitional and warmhouse 22–28 °C, hothouse ≥ 28 °C.
// The magma ocean lasts while more than 5 % of the surface is molten (the first ~120 Myr of the
// story); the steam world after it, while the global mean is above 100 °C, is a hothouse.
// Labels stay short (≤ 12 characters) for the sidebar.
// ---------------------------------------------------------------------------------------------
const CLIMATE_STATES = {
  magma: { id: 'magma', label: 'Magma ocean', blurb: 'The surface is molten rock' },
  snowball: { id: 'snowball', label: 'Snowball', blurb: 'Ice reaches the tropics' },
  icehouse: { id: 'icehouse', label: 'Icehouse', blurb: 'Ice sheets on the polar continents' },
  coolhouse: { id: 'coolhouse', label: 'Cool', blurb: 'Small or seasonal polar ice; mild mid-latitudes' },
  greenhouse: { id: 'greenhouse', label: 'Greenhouse', blurb: 'Little or no polar ice' },
  hothouse: { id: 'hothouse', label: 'Hothouse', blurb: 'Ice-free; hot from pole to pole' },
  steam: { id: 'hothouse', label: 'Hothouse', blurb: 'Scalding seas under a dense steam and CO₂ sky' },
};

/**
 * Coarse climate regime for the current moment.
 * Returns { id, label, blurb } where id ∈ magma | snowball | icehouse | coolhouse | greenhouse | hothouse.
 * @param {number} timeMa
 * @param {number} tempC  global mean surface temperature at that time (getTemperatureAtTime)
 */
export function getClimateState(timeMa, tempC) {
  if (getMagmaFraction(timeMa) > 0.05) return CLIMATE_STATES.magma;
  if (tempC >= 100) return CLIMATE_STATES.steam;

  const ice = getGlaciation(timeMa);
  const sheets = Math.max(ice.landNorth, ice.landSouth);
  const seaIce = Math.max(ice.seaNorth, ice.seaSouth);
  if (sheets >= 70 || tempC <= -10) return CLIMATE_STATES.snowball;
  if (sheets >= 15) return CLIMATE_STATES.icehouse;
  if (sheets > 3 || seaIce > 3 || tempC < 22) return CLIMATE_STATES.coolhouse;
  if (tempC < 28) return CLIMATE_STATES.greenhouse;
  return CLIMATE_STATES.hothouse;
}

// Every table, for sparklines, documentation and the validator. All are [timeMa, value] knots from
// 4540 Ma to 0; ocean-chemistry weights and the other editorial curves are 0..1.
export const PLANET_CURVES = {
  dayLength: dayLengthCurve,
  luminosity: luminosityCurve,
  seaLevel: seaLevelCurve,
  vegetation: vegetationCurve,
  grassland: grasslandCurve,
  magma: magmaCurve,
  water: waterCurve,
  ferruginous: ferruginousCurve,
  euxinic: euxinicCurve,
  oxygenated: oxygenatedCurve,
};
