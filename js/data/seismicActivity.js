// Tectonic activity through deep time — a QUALITATIVE, editorial index from 0 (quiet) to 1
// (planet-wide upheaval). It is not a measurement and has no unit: nobody can count ancient
// earthquakes. The index tracks how vigorously the plates were colliding and rifting apart, as far
// as the rock record shows it: giant impacts and a hot, turbulent mantle in the Hadean, the pace of
// mountain building and rifting through the supercontinent cycle, and the flood basalts that erupted
// as continents split. Flood basalts that erupted inside a plate, far from any boundary that was
// opening (the Siberian Traps, Emeishan), are not counted: the index is about plates, not volcanism.
//
// Read it in five bands, as the sidebar does: < 0.2 low · 0.2–0.4 moderate · 0.4–0.6 active
// (today) · 0.6–0.8 high · ≥ 0.8 extreme. The heights of the peaks relative to one another are a
// judgement call; the quietest stretch, the mid-Proterozoic, reads "moderate".
//
// What shapes the curve, and where that comes from:
//   - A hotter early mantle and a waning rain of impacts: extreme in the Hadean, high in the Archean.
//     How the Archean crust moved — plates or a stagnant, overturning lid — is debated.
//   - The surge of crust formation and craton assembly at ~2.7 Ga, the largest peak in the zircon
//     age record (Condie & Aster 2010, Precambrian Res. 180: 227).
//   - A magmatic lull at ~2.45–2.2 Ga (Condie, O'Neill & Aster 2009, EPSL 282: 294; Spencer et al.
//     2018, Nat. Geosci. 11: 97).
//   - Supercontinent cycles — collisional mountain belts while a supercontinent assembles, quiet
//     while it holds, rifting and flood basalts as it breaks up (Mitchell et al. 2021, Nat. Rev.
//     Earth Environ. 2: 358): Nuna/Columbia assembled across 2.1–1.8 Ga orogens (Zhao et al. 2002,
//     Earth-Sci. Rev. 59: 125); Rodinia in the Grenville orogeny, ~1.2–1.0 Ga, breaking up from
//     ~0.8 Ga (Li et al. 2008, Precambrian Res. 160: 179); Gondwana in the Pan-African orogenies,
//     ~650–530 Ma; Pangaea ~335–300 Ma, breaking up from ~200 Ma.
//   - The mid-Proterozoic quiet: thin crust and few high mountain belts between ~1.8 and 0.8 Ga
//     (Tang et al. 2021, Science 371: 728; Cawood & Hawkesworth 2014, Geology 42: 503). The low
//     point of the curve sits at ~1.45 Ga, between the Nuna and Rodinia cycles.
//   - Flood-basalt provinces of continental break-up as short spikes (ages from Ernst 2014, "Large
//     Igneous Provinces", Cambridge Univ. Press): Franklin 719 Ma (rifting margin of Laurentia),
//     Central Atlantic (CAMP) 201 Ma, Karoo–Ferrar 183 Ma, Paraná–Etendeka 134 Ma, Deccan 66 Ma,
//     North Atlantic 56 Ma.

import { interpolateFromCurve } from './atmosphere.js';

// [timeMa, activity index 0–1]
const seismicCurve = [
  [4540, 1.0],     // accretion and giant impacts; the surface is a magma ocean
  [4500, 1.0],
  [4400, 0.95],    // first crust, constantly reworked by impacts and a hot mantle
  [4200, 0.92],
  [4000, 0.9],     // earliest Archean: high heat flow, waning bombardment; tectonic style unknown
  [3800, 0.75],    // Eoarchean: first preserved supracrustal belts (Isua)
  [3500, 0.62],    // greenstone belts; vigorous volcanism on a hot mantle
  [3000, 0.6],     // plate tectonics may be under way by now (its start date is debated)
  [2700, 0.75],    // Neoarchean surge of crust formation; cratons weld together
  [2500, 0.55],
  [2400, 0.35],    // Paleoproterozoic magmatic lull
  [2200, 0.3],
  [2100, 0.45],    // 2.1–1.8 Ga collisional orogens begin
  [1900, 0.7],     // Nuna (Columbia) assembly: Trans-Hudson, Svecofennian, Trans-North China orogens
  [1700, 0.45],    // Nuna assembled; long-lived accretionary margins
  [1450, 0.3],     // mid-Proterozoic orogenic quiescence: the "boring billion"
  [1200, 0.5],     // Rodinia assembly beginning
  [1080, 0.68],    // Grenville orogeny: Rodinia assembles
  [1000, 0.52],
  [950, 0.36],     // Rodinia holds
  [860, 0.36],
  [825, 0.5],      // rifting begins
  [750, 0.72],     // Rodinia breaks up
  [719, 0.75],     // Franklin flood basalts along the rifting margin of Laurentia
  [680, 0.6],
  [600, 0.7],      // Pan-African orogenies: Gondwana assembles; the Iapetus Ocean opens
  [540, 0.68],
  [500, 0.58],
  [460, 0.55],     // Taconic arc collisions
  [425, 0.62],     // Caledonian orogeny: Baltica and Avalonia meet Laurentia
  [390, 0.6],      // Acadian orogeny
  [360, 0.58],
  [330, 0.7],      // Pangaea assembles: Variscan, Alleghanian and Ural orogenies
  [300, 0.7],
  [280, 0.52],
  [250, 0.4],      // Pangaea stable, mostly interior
  [230, 0.4],
  [203, 0.42],
  [201.4, 0.76],   // Central Atlantic Magmatic Province: Pangaea begins to split
  [200, 0.62],
  [190, 0.58],
  [183, 0.7],      // Karoo–Ferrar eruptions as Gondwana starts to break up
  [175, 0.62],     // the central Atlantic opens
  [150, 0.64],
  [134, 0.7],      // Paraná–Etendeka; the South Atlantic opens
  [120, 0.75],     // fast mid-Cretaceous sea-floor spreading
  [100, 0.7],
  [90, 0.66],
  [75, 0.6],
  [67, 0.6],
  [66, 0.7],       // Deccan Traps; India rifts from the Seychelles soon after
  [65, 0.6],
  [58, 0.58],
  [56, 0.66],      // North Atlantic Igneous Province; Greenland parts from Europe
  [50, 0.64],      // India meets Asia
  [35, 0.62],      // Alps and Himalaya rising
  [20, 0.6],
  [10, 0.57],
  [0, 0.55],       // today: active
];

export function getSeismicActivityAtTime(timeMa) {
  return interpolateFromCurve(seismicCurve, timeMa);
}

// Exported for sparklines.
export const SEISMIC_CURVE = seismicCurve;
