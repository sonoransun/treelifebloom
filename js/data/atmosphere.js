// Air and climate through deep time: global mean surface temperature, atmospheric oxygen and
// carbon dioxide from the formation of the Earth (4540 Ma) to the present.
//
// What these curves are: smoothed, order-of-magnitude reconstructions for animation, not data
// products. Each is a list of [timeMa, value] knots, oldest first, joined by straight lines. The
// comment block above each curve says which published reconstruction it leans on and where it
// takes a liberty (these notes are the source for docs/data-sources.md).
//
// Shared conventions
//   - Ages follow the ICS chart used across the project (v2026/06, identical to v2024/12 at period
//     level: Hirnantian 445.2–443.1, PETM 56.0, Holocene base 0.0117 …).
//   - "Present" (0 Ma) is the mid-2020s, not the pre-industrial world: the last knots of the
//     temperature and CO₂ curves are the modern rise. Pre-industrial values sit 170–250 years
//     earlier (temperature: the 1850s; CO₂: c. 1775).
//   - Abrupt events are drawn a little wider than they were so that playback (which steps through
//     tens of thousands to a million years per frame) cannot jump over them. Peak values are kept;
//     every such liberty is flagged where it is taken.

// ---------------------------------------------------------------------------------------------
// TEMPERATURE — global mean surface temperature, °C
//
// Phanerozoic, 486.85 Ma → present: ONE framework, the PhanDA data-assimilation reconstruction
//   (Judd et al. 2024, Science 385: eadk3705). Knots follow its stage medians (table
//   PhanDA_GMSTandCO2_percentiles.csv of the paper's repository), smoothed where neighbouring stages
//   scatter; averaged over each PhanDA stage the curve lies inside that stage's 16th–84th
//   percentile band (all 85 stages). PhanDA runs warm: 5–8 °C above the older reconstruction of
//   Scotese et al. 2021 (Earth-Sci. Rev. 215: 103503) in hothouse intervals (28 °C there, ~36 °C here
//   at the Cenomanian–Turonian maximum), and 3–6 °C above proxy syntheses for the early Eocene
//   (DeepMIP: 27.0 °C, range 23.2–29.7, Inglis et al. 2020, Clim. Past 16: 1953) and the Miocene
//   Climatic Optimum (Steinthorsdottir et al. 2021, Paleoceanogr. Paleoclimatol. 36: e2020PA004037).
//   It agrees with them on the PETM, the Oligocene, the Pliocene and the ice ages. One framework is
//   used throughout so that every rise and fall on the curve is measured with the same ruler; read
//   absolute values in hothouse intervals as the warm end of current estimates. In this framework an
//   ice age need not be colder than today: the Hirnantian glaciation has a global mean near 20 °C,
//   with the ice on a polar supercontinent.
//   Events shorter than a stage are added from specialist work in the same proxy framework:
//     Hirnantian glacial maximum — tropical seas cool ~5 °C (Finnegan et al. 2011, Science 331: 903)
//     end-Permian — ~8–10 °C of warming across the boundary (Joachimski et al. 2012, Geology 40:
//       195; Sun et al. 2012, Science 338: 366). LIBERTY: drawn from 252.7 to 251.3 Ma; most of it
//       happened within ~0.1 Myr of the extinction horizon (251.94 Ma)
//     end-Triassic — +3–4 °C with the CAMP eruptions (McElwain et al. 1999, Science 285: 1386)
//     latest Cretaceous — ~2 °C Deccan-age warming 66.4–66.1 Ma, over before the impact (Barnet et
//       al. 2018, Geology 46: 147; Hull et al. 2020, Science 367: 266). The impact winter itself
//       lasted years to decades and is far below the resolution of this curve: it is NOT drawn.
//     PETM — 34 °C peak, +5.6 °C in a few thousand years (Tierney et al. 2022, PNAS 119:
//       e2205326119; cf. 31.6 °C in Inglis et al. 2020, Clim. Past 16: 1953), the whole event
//       lasting ~170 kyr (Röhl et al. 2007, Geochem. Geophys. Geosyst. 8: Q12002). LIBERTY: the
//       peak is held for ~0.2 Myr, inside PhanDA's 0.3-Myr PETM interval, and the recovery ends at
//       55.6 Ma — ~0.4 Myr in all — so that the read-outs can show it (at 1× the Eocene plays
//       ~0.5 s per Myr).
//     Eocene–Oligocene transition — ~2.5 °C step 34.3–33.6 Ma (Hutchinson et al. 2021, Clim. Past
//       17: 269)
//     Miocene Climatic Optimum 16.9–14.7 Ma and the cooling step that ended it (Steinthorsdottir
//       et al. 2021, Paleoceanogr. Paleoclimatol. 36: e2020PA004037)
//     mid-Pliocene warm period 3.3–3.0 Ma — ~3 °C above pre-industrial (PlioMIP2: Haywood et al.
//       2020, Clim. Past 16: 2095)
//   Pleistocene: glacial cycles are too fast to draw for 2.6 Myr (a 41-kyr cycle would last a fifth
//     of a second), so 2.58–0.19 Ma shows the cycle MEAN (PhanDA stage medians: 14.2 → 11.8 °C);
//     real glacial maxima were ~4 °C colder and interglacials ~2–3 °C warmer than the line. The last
//     glacial cycle (from 190 ka) is drawn in full:
//       Last Interglacial ~127–124 ka, 0.5–1.5 °C above pre-industrial (IPCC AR6 WG1 2021, ch. 2)
//       Last Glacial Maximum 21 ka, 6.1 ± 0.4 °C below pre-industrial (Tierney et al. 2020, Nature
//         584: 569)
//       deglaciation and Holocene after Osman et al. 2021 (Nature 599: 239) and Shakun et al. 2012
//         (Nature 484: 49); the Younger Dryas (12.9–11.7 ka) is a small dip in the GLOBAL mean, and
//         the Holocene begins ~1 °C below pre-industrial. A mild mid-Holocene optimum (~6.5 ka,
//         +0.3 °C) is drawn between the proxy synthesis of Kaufman et al. 2020 (Sci. Data 7: 201;
//         about +0.7 °C relative to the 19th century) and data-assimilation work (Osman et al.),
//         which finds none; IPCC AR6 (2021) assesses +0.2 to +1.0 °C around 6.5 ka.
//   Present: pre-industrial (1850–1900) ≈ 13.8 °C; mid-2020s ≈ 15.1 °C, i.e. +1.3 °C — the
//     long-term warming level (observed 2015–2024 mean 1.24 °C; human-induced warming 1.36 °C in
//     2024, rising ~0.27 °C per decade: Forster et al. 2025, Earth Syst. Sci. Data 17: 2641).
//     Single years run warmer: 2024 was 1.55 ± 0.13 °C and 2025 1.44 ± 0.13 °C above 1850–1900 (WMO).
//     Absolute global temperature is only known to a few tenths of a degree.
//
// Cambrian, 538.8–486.85 Ma: not covered by PhanDA. A greenhouse rising to meet PhanDA's ~32 °C in
//   the earliest Ordovician, consistent with sea-surface temperatures of 20–25 °C at high southern
//   latitudes ~514–509 Ma (Hearing et al. 2018, Sci. Adv. 4: eaar5690). Low confidence.
//
// Precambrian: there is no global temperature proxy. The curve encodes the sequence of states the
//   rock record requires — ice ages where there are glacial deposits, warmth where there are none —
//   on the same scale as the Phanerozoic part (ice-free worlds ≈ 22–25 °C).
//   Hadean: a magma ocean (≥ 1,200 °C, the melting range of rock); for ~1,000 years after the
//     Moon-forming impact (~4.51 Ga: Barboni et al. 2017, Sci. Adv. 3: e1602365) a rock-vapour
//     atmosphere near 2,000 °C; then a steam + CO₂ atmosphere that rains out into a ~230 °C ocean
//     under ~100 bar of CO₂ (Zahnle et al. 2007, Space Sci. Rev. 129: 35). LIBERTIES: the vapour
//     spike is drawn a few Myr wide, and the magma ocean, which probably froze over within a few
//     million years of the impact (Elkins-Tanton 2008, EPSL 271: 181), cools over ~100 Myr so that
//     it can be seen. Zircons show continental crust and liquid water by 4.4–4.3 Ga (Wilde et al.
//     2001, Nature 409: 175; Valley et al. 2002, Geology 30: 351). The ~230 °C ocean lasts as long
//     as the CO₂ stays in the air; as the CO₂ is drawn down into the crust the seas pass through
//     ~100 °C in only 10⁵–10⁷ years (Sleep, Zahnle & Neuhoff 2001, PNAS 98: 3666). LIBERTY: here
//     they take ~35 Myr to cool from 110 to 60 °C (4374–4340 Ma). 4.3–4.0 Ga is unconstrained
//     (anything from frozen to hot); the line simply joins the Archean value.
//   Archean: 0–50 °C in carbon-cycle models (Krissansen-Totton, Arney & Catling 2018, PNAS 115:
//     4105); reviews favour 0–40 °C (Catling & Zahnle 2020, Sci. Adv. 6: eaax1420). Readings of
//     55–85 °C from chert oxygen isotopes (Knauth & Lowe 2003, GSA Bull. 115: 566) are disputed;
//     40 → 25 °C nods to them while staying inside the model range. One dip: the Pongola
//     glaciation ~2.9 Ga (Mozaan Group, South Africa: Young et al. 1998, J. Geol. 106: 523),
//     widened to ~0.1 Gyr so it registers.
//   Huronian, 2430–2220 Ma: three or four glaciations, at least one at low latitude (first by
//     2.426 Ga: Gumsley et al. 2017, PNAS 114: 1811; last before ~2.22 Ga: Rasmussen et al. 2013,
//     EPSL 382: 173). Their individual ages are poorly known, so they are drawn as ONE cold era at
//     ~8 °C, about the global mean of the Last Glacial Maximum; the warm spells between them are
//     not shown.
//   "Boring billion": no glacial deposits are firmly known between ~2.2 and 0.72 Ga; a flat 24 °C,
//     cooling slightly as Rodinia rifts apart in the tropics but staying ice-free until ~720 Ma.
//   Cryogenian: Sturtian ~717–659 Ma and Marinoan ≤ 650–635 Ma (onset 717.5–716.3, end
//     659.3–658.5; Marinoan onset ≤ 649.9, end 636.0–634.7 Ma: Macdonald et al. 2010, Science 327:
//     1241; Rooney et al. 2015, Geology 43: 459; Prave et al. 2016, Geology 44: 631; compiled by
//     Hoffman et al. 2017, Sci. Adv. 3: e1600983). Global means of about −35 °C after each freeze,
//     rising to about −25 °C as volcanic CO₂ builds up, sit at the warm end of hard-snowball climate
//     models (Pierrehumbert et al. 2011, Annu. Rev. Earth Planet. Sci. 39: 417). Each thaw is
//     followed by a short greenhouse of ~30 °C: the value a coupled atmosphere–ocean model gives for
//     the Marinoan aftermath at 15,000 ppm CO₂ (Ramme & Marotzke 2022, Clim. Past 18: 759; earlier,
//     simpler estimates ran hotter). LIBERTY: each freeze is drawn ~5 Myr and each thaw ~6 Myr long
//     (in reality thousands of years), and the thaw slows where the planet's colours are most
//     sensitive, so that colours and ice edge change over many animation frames.
//   Ediacaran: Gaskiers glaciation 579.9–579.6 Ma, under 340 kyr long (Pu et al. 2016, Geology 44:
//     955): a regional ice age, not a snowball — a ~5 °C dip, widened to ~4 Myr.
// ---------------------------------------------------------------------------------------------
const temperatureCurve = [
  // Hadean — molten, then steam, then the first seas
  [4540, 1500],     // late accretion: magma ocean
  [4515, 1500],
  [4510, 2000],     // Moon-forming impact: rock-vapour atmosphere (drawn a few Myr wide)
  [4502, 1500],
  [4460, 1200],     // magma ocean crusting over under steam and CO₂
  [4440, 800],
  [4425, 400],      // the crust hardens; the oceans are still in the sky
  [4410, 240],      // steam rains out: a scalding ocean under a dense CO₂ atmosphere
  [4390, 150],
  [4370, 100],      // CO₂ drawn down into the crust (the ~100 °C phase widened: see above)
  [4340, 60],
  [4300, 48],
  [4200, 44],
  [4100, 42],
  [4031, 41],

  // Archean — warm, oxygen-free
  [4000, 40],       // liquid-water oceans; temperate to hot (the magma ocean ended by ~4.4 Ga)
  [3800, 38],       // waning bombardment
  [3500, 35],       // 0–50 °C in carbon-cycle models; hotter from chert δ18O
  [3200, 32],
  [3000, 29],
  [2960, 27],
  [2925, 14],       // Pongola glaciation
  [2895, 14],
  [2860, 26],
  [2700, 27],
  [2500, 25],

  // Paleoproterozoic — the Huronian ice ages
  [2440, 22],       // methane greenhouse failing as oxygen appears
  [2425, 8],        // Huronian glacial era begins
  [2228, 8],
  [2216, 19],       // thaw
  [2205, 22],
  [2060, 24],       // Lomagundi interval: warm, carbonate-rich seas
  [1800, 24],

  // Mesoproterozoic–Tonian — the long quiet
  [1000, 24],
  [800, 23],
  [740, 22],        // CO₂ falls as Rodinia rifts apart in the tropics
  [720, 18],

  // Cryogenian — two snowball Earths (each freeze and thaw widened: see above)
  [718.8, 13],      // Sturtian onset: sea ice runs away toward the equator
  [717.3, 3],
  [716, -12],
  [714.6, -35],     // hard snowball
  [662, -25],       // volcanic CO₂ has been building up for 55 Myr
  [661, -10],       // Sturtian collapse (~659 Ma)
  [660.4, 0],
  [658.8, 12],
  [658.4, 19.5],
  [656.6, 23.5],
  [656, 26],
  [655.6, 30],      // post-glacial greenhouse
  [654, 29],
  [653.4, 26],      // weathering of freshly ground rock draws the CO₂ back down
  [652.8, 23.5],
  [651, 19.5],
  [650.4, 14],      // Marinoan onset
  [649.4, 6],
  [648.6, 0],
  [648, -12],
  [647.4, -35],
  [637.6, -25],
  [636.6, -10],     // Marinoan collapse (cap carbonates: 635.2 Ma)
  [636, 0],

  // Ediacaran — a greenhouse aftermath, then milder
  [634.4, 12],
  [634, 19.5],
  [632.6, 23.5],
  [632.1, 26],
  [631.7, 30],      // post-glacial greenhouse
  [629.7, 28],
  [627.7, 26],
  [626.2, 23.5],
  [622, 22],
  [600, 21],
  [582.6, 21],
  [581.4, 19],
  [580.6, 16],      // Gaskiers glaciation (widened)
  [579.4, 16],
  [578.4, 19],
  [577, 21],
  [550, 21],

  // Cambrian — greenhouse (not covered by PhanDA)
  [538.8, 24],
  [530, 27],
  [515, 29],
  [500, 30.5],
  [486.85, 32],

  // Ordovician–Silurian (PhanDA from here on)
  [482, 32.1],      // Tremadocian
  [474.2, 31.5],    // Floian
  [463.8, 31],      // Darriwilian
  [458.2, 29],
  [455.5, 27.4],    // Sandbian
  [449, 27.8],      // Katian
  [446.5, 27],
  [445.6, 25],      // ice sheets grow on polar Gondwana
  [445, 21],
  [444.6, 19.2],    // Hirnantian glacial maximum
  [443.8, 19.2],
  [443.2, 20.5],    // deglaciation
  [440.8, 19.6],    // Rhuddanian–Aeronian: still cool
  [435.8, 23.5],    // Telychian
  [431.8, 20.5],    // Sheinwoodian
  [428.7, 21],      // Homerian
  [425.9, 25.6],    // Gorstian
  [425, 30],
  [423.9, 32.5],    // Ludfordian
  [420.9, 33],      // Pridoli

  // Devonian
  [414.75, 28.8],   // Lochkovian–Pragian
  [402.4, 25.3],    // Emsian
  [389.8, 22.8],    // Eifelian
  [382.1, 25.7],    // Givetian
  [375, 27.8],      // Frasnian
  [372.6, 27.9],
  [371.4, 25],      // Kellwasser crises: cooling pulses at the Frasnian–Famennian boundary
  [365.2, 23.8],    // Famennian
  [360.5, 23],
  [359, 21.5],      // end-Devonian (Hangenberg) cooling; first Gondwanan glaciers

  // Carboniferous–Permian — Late Paleozoic Ice Age
  [353, 21.8],      // Tournaisian
  [348, 20.5],
  [344, 15.5],
  [338.5, 13],      // Visean
  [330.3, 12.3],
  [326.9, 12],      // Serpukhovian: coldest stage of the Phanerozoic before the Pleistocene
  [319.3, 14.1],    // Bashkirian
  [311.1, 17.3],    // Moscovian
  [305.35, 14.8],   // Kasimovian
  [301.3, 16.3],    // Gzhelian
  [296.2, 17.8],    // Asselian (lower half of PhanDA's band: peak of Gondwanan ice)
  [292, 18.5],      // Sakmarian
  [286.9, 20.5],    // Artinskian: main deglaciation
  [278.8, 18.7],    // Kungurian
  [271.8, 15.4],    // Roadian
  [264.4, 18.7],    // Wordian–Capitanian
  [256.9, 21.5],    // Wuchiapingian
  [253.1, 18.6],    // Changhsingian
  [252.7, 18.8],
  [251.9, 22.7],    // end-Permian: Siberian Traps warming (widened: see above)
  [251.6, 25],
  [251.3, 28],      // Induan

  // Triassic
  [250.9, 28.5],
  [249.4, 29.5],    // late Smithian thermal maximum: the "lethally hot" tropics
  [247.5, 27],
  [245.7, 25.8],    // Olenekian–Anisian
  [241.5, 23.6],
  [239.2, 22.3],    // Ladinian
  [234.6, 23.4],    // Carnian
  [233.2, 25.2],    // Carnian Pluvial Episode
  [231.5, 23.6],
  [216.5, 25],      // Norian
  [205.7, 23],
  [203.55, 22.3],   // Rhaetian
  [201.6, 22.5],
  [201.3, 25.5],    // end-Triassic: CAMP warming
  [200.5, 25.5],

  // Jurassic
  [197.1, 25.1],    // Hettangian–Sinemurian
  [188.55, 24.1],   // Pliensbachian
  [184.5, 23],
  [183, 26.5],      // Toarcian oceanic anoxic event
  [182.4, 27.2],
  [179.45, 26.4],   // Toarcian
  [172.8, 23.2],    // Aalenian
  [169.5, 21.4],    // Bajocian
  [166.7, 18.8],    // Bathonian: Middle Jurassic cool interval
  [163.4, 20.3],    // Callovian
  [158.2, 23.9],    // Oxfordian
  [152, 24.5],      // Kimmeridgian
  [146.2, 27.3],    // Tithonian

  // Cretaceous
  [140.4, 27],      // Berriasian
  [135.15, 27.6],   // Valanginian
  [129.55, 27.5],   // Hauterivian
  [124, 29.5],      // Barremian
  [120.3, 31],      // Aptian (oceanic anoxic event 1a)
  [117.3, 31],
  [113, 28.5],      // Aptian–Albian cool snap
  [106.85, 27.5],   // Albian
  [102, 29.5],
  [100.5, 31],
  [97.2, 34],       // Cenomanian
  [94.5, 35.2],
  [93.6, 36],       // Cenomanian–Turonian thermal maximum: hottest of the Phanerozoic
  [91.65, 35.6],    // Turonian
  [87.5, 32.5],     // Coniacian
  [84.7, 31.4],     // Santonian
  [77.9, 28.1],     // Campanian
  [72, 25.5],
  [69.1, 24.5],     // Maastrichtian
  [66.45, 24.3],
  [66.25, 26.3],    // late Maastrichtian warming event (Deccan Traps)
  [66.08, 24.4],
  [66, 24.3],       // Chicxulub impact (the impact winter is too brief to draw)

  // Paleogene
  [65.6, 26.5],
  [63.5, 27.9],     // Danian–Selandian
  [61, 27.5],
  [59.2, 26.2],
  [57.6, 25.8],     // Thanetian
  [56.6, 27],
  [56.03, 28],
  [55.995, 33.6],   // Paleocene–Eocene Thermal Maximum (widened: see above)
  [55.8, 33.6],
  [55.6, 30.2],
  [55, 30.5],
  [54, 31.5],
  [52.5, 32.8],     // Early Eocene Climatic Optimum (53–49 Ma)
  [50.5, 33],
  [49, 32],
  [48.07, 30.5],
  [46, 28.5],
  [44.55, 27.2],    // Lutetian
  [41, 27.3],
  [40.1, 27.9],     // Middle Eocene Climatic Optimum
  [39.6, 27.5],     // Bartonian
  [37.7, 26.8],
  [35.8, 26.1],     // Priabonian
  [34.3, 25.6],
  [33.9, 24.6],     // Eocene–Oligocene transition…
  [33.6, 23.2],     // …Antarctica glaciates (Oi-1)
  [30.6, 23.4],     // Rupelian
  [27.3, 23.2],
  [25.2, 23.6],     // Chattian: late Oligocene warming
  [23.04, 22.3],    // Oligocene–Miocene boundary glaciation (Mi-1)

  // Neogene
  [21.7, 22.1],     // Aquitanian
  [18.2, 23.6],     // Burdigalian
  [16.9, 24.5],     // Miocene Climatic Optimum
  [14.8, 24.3],
  [13.8, 22.9],     // Middle Miocene Climate Transition: East Antarctic ice expands
  [12.7, 22.6],     // Serravallian
  [9.44, 20.6],     // Tortonian
  [7.25, 18.2],
  [6.29, 16.9],     // Messinian: late Miocene cooling
  [5.333, 16.5],
  [4.5, 17.5],      // Zanclean: early Pliocene warmth
  [3.6, 16.2],
  [3.3, 15.6],      // M2 glaciation
  [3.2, 16.8],      // mid-Pliocene warm period (+3 °C)
  [3, 16.7],
  [2.8, 15.4],      // Northern Hemisphere ice sheets take hold

  // Quaternary — cycle mean, then the last glacial cycle in full
  [2.58, 14.8],
  [2.19, 14.2],     // Gelasian mean (41-kyr cycles)
  [1.8, 13.4],
  [1.29, 12.8],     // Calabrian mean
  [0.9, 12.2],      // mid-Pleistocene transition to 100-kyr cycles
  [0.774, 12],
  [0.45, 11.8],     // Chibanian mean (glacials ~8 °C, interglacials ~14 °C)
  [0.19, 11.6],
  [0.16, 9.4],
  [0.14, 8],        // penultimate glacial maximum (MIS 6)
  [0.135, 8.6],
  [0.129, 13.6],    // Termination II
  [0.126, 14.8],    // Last Interglacial (Eemian) peak
  [0.119, 14.2],
  [0.115, 12.8],    // glacial inception
  [0.109, 11.2],    // MIS 5d
  [0.1, 12.4],      // MIS 5c
  [0.087, 11],      // MIS 5b
  [0.082, 12],      // MIS 5a
  [0.071, 10],
  [0.065, 9.2],     // MIS 4
  [0.057, 10.4],    // MIS 3
  [0.04, 10],
  [0.029, 9],
  [0.024, 8],
  [0.021, 7.8],     // Last Glacial Maximum
  [0.018, 8.1],
  [0.0165, 8.8],    // deglaciation begins
  [0.0147, 11.2],   // Bølling–Allerød warming
  [0.0129, 12],
  [0.0123, 11.6],   // Younger Dryas
  [0.0117, 12.8],   // Holocene begins, ~1 °C below pre-industrial
  [0.01, 13.3],
  [0.008, 13.8],
  [0.0065, 14.1],   // mid-Holocene optimum (mild, debated)
  [0.004, 14],
  [0.002, 13.9],
  [0.0004, 13.65],  // Little Ice Age (c. 1625)
  [0.00017, 13.8],  // pre-industrial (1850s)
  [0.00005, 14.1],  // 1970s
  [0, 15.1],        // mid-2020s: +1.3 °C
];

// ---------------------------------------------------------------------------------------------
// OXYGEN — O₂ as % of the atmosphere by volume (today 20.95 %)
//
// Before the Great Oxidation: effectively zero. Mass-independent sulfur isotopes require less than
//   0.001 % of today's level, i.e. < 0.0002 % of the air (Farquhar et al. 2000, Science 289: 756;
//   Pavlov & Kasting 2002, Astrobiology 2: 27). Brief Archean "whiffs" are not drawn.
// Great Oxidation Event: oxygen first accumulates between 2.46 and 2.43 Ga (Gumsley et al. 2017,
//   PNAS 114: 1811), rises in oscillations, and becomes permanent by ~2.22 Ga (Poulton et al.
//   2021, Nature 592: 232).
//   The Lomagundi interval (2.22–2.06 Ga) probably saw an "overshoot" of unknown size (Bekker &
//   Holland 2012, EPSL 317–318: 295); drawn at ~3 %.
// Mid-Proterozoic: somewhere between 0.1 % and 10 % of today's level, i.e. 0.02–2 % of the air
//   (Lyons, Reinhard & Planavsky 2014, Nature 506: 307; < 0.1 % of today's level according to
//   Planavsky et al. 2014, Science 346: 635). Drawn at 0.8 % — inside the range, not a measurement.
// Neoproterozoic → Paleozoic: a stepwise rise, not one event. ~5–10 % of the air in the Cambrian,
//   15–20 % by the Devonian, > 25 % in the Permo-Carboniferous (Mills, Krause, Jarvis & Cramer 2023,
//   Annu. Rev. Earth Planet. Sci. 51: 253; Krause et al. 2018, Nat. Commun. 9: 4081; Lenton et al.
//   2018, Earth-Sci. Rev. 178: 1); an Ordovician rise is supported independently (Edwards et al.
//   2017, Nat. Geosci. 10: 925). Fossil charcoal from ~420 Ma on needs at least ~15 % (Glasspool &
//   Scott 2010, Nat. Geosci. 3: 627; Belcher & McElwain 2008, Science 321: 1197). Peak ~30 % at
//   300–285 Ma, held flat rather than peaked (model consensus 25–30 % at ~300 Ma: Krause et al.
//   2018; GEOCARBSULF: Berner 2009, Am. J. Sci. 309: 603).
// Mesozoic–Cenozoic: models disagree by ± 5 percentage points (15–25 % in the Triassic–Jurassic);
//   the curve takes the middle of the model and charcoal estimates and declines gently to today.
//   Ice-core air shows a 0.7 % relative decline over the last 800,000 years (Stolper et al. 2016,
//   Science 353: 1427).
// ---------------------------------------------------------------------------------------------
const oxygenCurve = [
  [4540, 0],
  [2460, 0],        // no free oxygen
  [2430, 0.002],    // Great Oxidation Event begins
  [2400, 0.02],
  [2320, 0.2],      // oxygen rising in fits and starts; not yet permanent
  [2225, 1.5],
  [2200, 3],        // Lomagundi "overshoot" (size unknown)
  [2060, 3],
  [2000, 1],
  [1850, 0.8],      // mid-Proterozoic: roughly 4 % of today's level (range 0.1–10 %)
  [1000, 0.8],
  [800, 1.5],       // Neoproterozoic oxygenation begins
  [635, 1.5],
  [625, 2.5],       // oceans begin to be ventilated after the Marinoan thaw
  [580, 4.5],       // deep-ocean oxygenation pulses after the Gaskiers glaciation
  [560, 6],
  [540, 8],         // Cambrian: 5–10 %
  [500, 9],         // late Cambrian
  [460, 12],        // Ordovician rise
  [430, 14],
  [420, 16],        // first charcoal: wildfires need at least ~15 %
  [400, 17],
  [385, 16.5],
  [372, 17.5],
  [359, 19.5],
  [345, 23],        // forests bury carbon; oxygen climbs
  [330, 26],
  [315, 28.5],
  [300, 30],        // Permo-Carboniferous peak
  [285, 30],
  [270, 28],
  [260, 26],
  [254, 24],
  [251, 21.5],      // end-Permian decline
  [245, 19],
  [230, 19],
  [201, 19],
  [190, 20],
  [170, 21.5],
  [150, 23],
  [125, 24.5],
  [100, 25.5],      // Cretaceous high
  [80, 24.5],
  [66, 23.5],
  [56, 23],
  [34, 22.5],
  [20, 22],
  [10, 21.5],
  [0.8, 21.1],
  [0, 20.95],       // today
];

// ---------------------------------------------------------------------------------------------
// CARBON DIOXIDE — CO₂, parts per million of dry air by volume
//
// Cenozoic, 66 Ma → 3 Ma: the community proxy synthesis of the CenCO2PIP Consortium 2023 (Science
//   382: eadi5177): 650–850 ppm in the early Paleocene; peak ~1,600 ppm at ~51 Ma; 800–1,100 ppm in
//   the middle–late Eocene; 720 ppm when Antarctica glaciated (33.9 Ma); 550 ppm by 32 Ma; a rise
//   to ~500 ppm in the Miocene Climatic Optimum (17–15 Ma), the last time CO₂ was consistently
//   above today's; below 270 ppm at 2.6 Ma. PETM: roughly 900 → 2,000 ppm (Gutjahr et al. 2017,
//   Nature 548: 573; Tierney et al. 2022, PNAS 119: e2205326119).
// Last 800,000 years: Antarctic ice cores (Bereiter et al. 2015, Geophys. Res. Lett. 42: 542) —
//   ~190 ppm in glacials, 280 ppm in interglacials; deglacial rise after Marcott et al. 2014 (Nature
//   514: 616). As with temperature, 2.58–0.19 Ma shows the cycle mean and the last cycle is drawn.
// Present: 280 ppm before industry (to ~1800 CE); 427 ppm = the 2025 annual mean at Mauna Loa
//   (Scripps/NOAA record).
// 420–66 Ma: the multi-proxy compilation of Foster, Royer & Lunt 2017 (Nat. Commun. 8: 14845), as
//   updated and averaged by stage in Judd et al. 2024 (Science 385: eadk3705): ~2,000 ppm in the
//   Early Devonian (one plant-based estimate is far lower, ~500–700 ppm: Dahl et al. 2022, Nat.
//   Commun. 13: 7616), ~800–1,000 ppm by the Middle Devonian, ~350–450 ppm in the Late Paleozoic
//   Ice Age, ~700–1,300 ppm in the Mesozoic. Eruptive spikes are added: end-Permian, ~430 →
//   ~2,500 ppm (Wu et al. 2021, Nat. Commun. 12: 2137), kept brief because stage averages stay
//   far lower; end-Triassic, a doubling with each CAMP pulse (Schaller et al. 2011, Science 331:
//   1404; McElwain et al. 1999); and a smaller Toarcian pulse as the Karoo–Ferrar magmas intruded
//   coal (McElwain, Wade-Murphy & Hesselbo 2005, Nature 435: 479).
// 539–420 Ma: no reliable proxies. Carbon-cycle models give several thousand ppm for the Cambrian
//   and Ordovician (GEOCARBSULF: Berner 2006, Geochim. Cosmochim. Acta 70: 5653; COPSE: Lenton et
//   al. 2018), while the few proxy values for the Late Ordovician–Silurian are far lower (~500–
//   1,000 ppm in the Judd et al. compilation). Drawn as a decline from ~4,000 to ~1,500 ppm. Low
//   confidence.
// Precambrian: order of magnitude only. Tens of thousands of ppm are needed to offset the faint
//   young Sun (Krissansen-Totton et al. 2018, PNAS 115: 4105); ancient soils give ~10,000–150,000
//   ppm at 2.7 Ga falling to several thousand by 1.8 Ga (Kanzaki & Murakami 2015, Geochim.
//   Cosmochim. Acta 159: 190), and calcified cyanobacteria — a different proxy — imply at most
//   ~3,600 ppm at 1.2 Ga (Kah & Riding 2007, Geology 35: 799). Snowball Earth: CO₂ must fall to a few hundred ppm to start one and reach 10,000–100,000
//   ppm (0.01–0.1 bar) to end it (Abbot et al. 2012, Geophys. Res. Lett. 39: L20711; Hoffman et
//   al. 2017); drawn rising to 20,000 ppm, and 15,000 ppm at the post-glacial temperature peak —
//   the level at which a coupled model gives the ~30 °C drawn in the temperature curve (Ramme &
//   Marotzke 2022, Clim. Past 18: 759).
// Hadean: after the magma ocean the atmosphere was probably dominated by CO₂ — of order 100 bar
//   (Zahnle et al. 2007) — so the mixing ratio is near a million ppm; it is drawn down into
//   carbonate over the next few hundred million years. Model-based.
// ---------------------------------------------------------------------------------------------
const co2Curve = [
  [4540, 900000],   // a CO₂-dominated atmosphere, tens of bar deep
  [4350, 900000],
  [4200, 500000],
  [4100, 250000],
  [4031, 150000],
  [3800, 100000],
  [3500, 70000],
  [3000, 40000],
  [2700, 30000],
  [2500, 20000],
  [2200, 12000],
  [1850, 8000],
  [1400, 5000],
  [1200, 3500],
  [1000, 3000],
  [800, 2500],
  [745, 1500],      // weathering of Rodinia's rift basalts draws CO₂ down
  [720, 600],
  [717.3, 300],     // Sturtian onset
  [714.6, 300],
  [662, 20000],     // CO₂ accumulates under the ice until the greenhouse breaks the freeze
  [659, 18000],
  [655.6, 15000],   // post-glacial greenhouse
  [654, 6000],      // rapid weathering of freshly ground rock
  [652.8, 2000],
  [651, 600],
  [650.4, 300],     // Marinoan onset
  [647.4, 300],
  [637.6, 20000],
  [634.4, 18000],
  [631.7, 15000],   // post-glacial greenhouse
  [629.7, 6000],
  [626.2, 4000],
  [600, 3000],
  [550, 3500],
  [538.8, 4000],    // Cambrian–Ordovician: models only
  [500, 4000],
  [486.85, 3500],
  [470, 3200],
  [460, 2500],
  [452, 1800],
  [445.6, 1500],
  [444.4, 1100],    // Hirnantian drawdown
  [443, 1300],
  [435, 1300],
  [425, 1500],
  [419.6, 1800],
  [410, 2000],      // Early Devonian (proxies begin)
  [398, 1900],
  [394, 1300],
  [390, 800],       // Middle Devonian: first forests (proxies scatter widely, ~500–1,000 ppm)
  [386, 850],
  [382, 1000],
  [375, 980],       // forests spread
  [365, 800],
  [359, 600],
  [353, 420],
  [338.5, 440],
  [327, 350],       // Late Paleozoic Ice Age
  [319, 330],
  [311, 340],
  [305, 400],
  [301, 430],
  [294, 450],
  [287, 600],
  [279, 600],
  [272, 400],
  [264, 470],
  [257, 600],
  [253, 600],
  [252.3, 450],     // latest Permian
  [251.9, 1700],    // Siberian Traps
  [251.75, 2500],
  [251.5, 2000],
  [250.8, 1200],
  [249.5, 900],
  [245.7, 800],
  [239, 750],
  [232, 950],
  [216.5, 1000],
  [203.5, 1250],
  [201.6, 1300],
  [201.3, 2400],    // CAMP eruptions
  [200.6, 2000],
  [199, 1300],
  [197.1, 1070],
  [188.5, 820],
  [183.3, 800],
  [182.9, 1300],    // Toarcian (Karoo–Ferrar eruptions)
  [182, 1000],
  [179.5, 800],
  [172.8, 1050],
  [166.7, 930],
  [163.4, 870],
  [158, 740],
  [146, 720],
  [135, 840],
  [124, 750],
  [117, 870],
  [107, 810],
  [97, 860],
  [91.6, 800],
  [84.7, 700],
  [77.9, 850],
  [70, 950],
  [66, 750],        // earliest Paleocene
  [62, 700],
  [59, 750],
  [56.3, 900],
  [56.03, 950],
  [55.995, 2000],   // PETM
  [55.8, 2000],
  [55.7, 1100],
  [53, 1400],
  [51, 1600],       // Early Eocene Climatic Optimum: Cenozoic maximum
  [48, 1300],
  [44, 1000],
  [40, 950],
  [36, 850],
  [33.9, 720],      // Antarctica glaciates
  [32, 550],
  [27, 430],
  [23, 400],
  [20, 380],        // early Miocene
  [16, 500],        // Miocene Climatic Optimum
  [14.5, 450],
  [13, 380],        // after the Middle Miocene Climate Transition
  [10, 330],        // late Miocene
  [7, 320],
  [5.3, 350],
  [4, 390],         // Pliocene
  [3.2, 380],       // mid-Pliocene warm period
  [2.6, 270],       // onset of Northern Hemisphere glaciation
  [2.2, 260],
  [1.25, 250],      // 41-kyr world: cycle mean of ~210–290 ppm
  [0.8, 230],       // 100-kyr world: cycle mean of ~180–280 ppm
  [0.19, 230],
  [0.14, 192],      // penultimate glacial maximum
  [0.129, 270],
  [0.126, 280],     // Last Interglacial
  [0.115, 265],
  [0.109, 240],
  [0.1, 240],
  [0.087, 225],
  [0.082, 240],
  [0.065, 200],
  [0.057, 215],
  [0.04, 205],
  [0.029, 195],
  [0.021, 188],     // Last Glacial Maximum
  [0.018, 190],
  [0.0165, 212],
  [0.0147, 238],
  [0.0129, 240],    // Younger Dryas
  [0.0117, 265],    // Holocene begins
  [0.008, 260],
  [0.004, 270],
  [0.001, 280],
  [0.00025, 280],   // pre-industrial (c. 1775)
  [0.000176, 285],  // 1850
  [0.000126, 296],  // 1900
  [0.000068, 316],  // 1958: measurements begin at Mauna Loa
  [0.000026, 370],  // 2000
  [0, 427],         // 2025 annual mean at Mauna Loa
];

/**
 * Interpolate a value from a curve at a given time.
 * Curve is an array of [timeMa, value] sorted descending by time; values are held constant
 * beyond both ends.
 */
export function interpolateFromCurve(curve, timeMa) {
  const last = curve.length - 1;
  if (!(timeMa < curve[0][0])) return curve[0][1];
  if (timeMa <= curve[last][0]) return curve[last][1];

  // Binary search for the segment [lo, lo + 1] with curve[lo][0] >= timeMa > curve[lo + 1][0].
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (curve[mid][0] >= timeMa) lo = mid;
    else hi = mid;
  }
  const [t1, v1] = curve[lo];
  const [t2, v2] = curve[hi];
  return v1 + (v2 - v1) * ((t1 - timeMa) / (t1 - t2));
}

export function getTemperatureAtTime(timeMa) {
  return interpolateFromCurve(temperatureCurve, timeMa);
}

export function getOxygenAtTime(timeMa) {
  return interpolateFromCurve(oxygenCurve, timeMa);
}

export function getCO2AtTime(timeMa) {
  return interpolateFromCurve(co2Curve, timeMa);
}

// Exported curves for sparkline rendering. CO₂ spans nearly four orders of magnitude (from ~190 ppm
// in the ice ages to ~900,000 ppm in the Hadean): plot it on a log axis.
export const ATMOSPHERE_CURVES = {
  temperature: temperatureCurve,
  oxygen: oxygenCurve,
  co2: co2Curve,
};

// Reference values for "compared with today" read-outs, read off the curves so they cannot drift
// apart: `present` is where the curves end (the mid-2020s); `preIndustrial` is the 1850s climate
// and the CO₂ level before industry (~1775).
export const ATMOSPHERE_REFERENCE = {
  present: {
    year: 2025,
    tempC: getTemperatureAtTime(0),
    o2Pct: getOxygenAtTime(0),
    co2Ppm: getCO2AtTime(0),
  },
  preIndustrial: {
    tempC: getTemperatureAtTime(0.00017),
    co2Ppm: getCO2AtTime(0.00025),
  },
};
