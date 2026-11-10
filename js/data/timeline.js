// Geological time scale — the names, colours, pacing and per-period context of the whole story.
//
// BOUNDARIES follow the ICS International Chronostratigraphic Chart v2026/06 (stratigraphy.org;
// cite Cohen, Harper, Gibbard & Car 2025, Episodes 48: 105–115). At the level of these rows it is
// identical to v2024/12, the revision that moved the bases of the Ordovician (486.85), Silurian
// (443.1), Devonian (419.62), Carboniferous (358.86), Cretaceous (143.1) and Miocene (23.04).
// One deliberate departure: the first row starts at 4540 Ma, the age of the Earth and the start of
// the story (TIMING.startTimeMa); the ICS base of the Hadean is 4567 Ma, the age of the Solar
// System's oldest solids. The chart marks 720 and 635 Ma as approximate.
//
// ROWS are contiguous, oldest first, and of mixed rank — whichever ICS unit tells the story best
// at that depth of time: the Hadean Eon; the four Archean eras; the first two Proterozoic eras,
// then the three periods of the Neoproterozoic; the Paleozoic and Mesozoic periods; the Cenozoic
// epochs; and the Pleistocene in its three sub-epochs (the Middle Pleistocene is the Chibanian).
//
//   eon, era        ICS parents. `era` is null for the Hadean; an Archean or early Proterozoic
//                   row is itself an era, so it names itself.
//   period          unique key and fallback display name
//   label           display name
//   abbr            unique, ≤ 4 ASCII characters, for timeline blocks too narrow for the label
//   parentPeriod    Cenozoic rows only: the ICS period the epoch or sub-epoch belongs to
//   startMa, endMa  older and younger bound (Ma). A row owns its start but not its end, so a time
//                   exactly on a boundary belongs to the row that begins there.
//   color           the unit's colour on the ICS chart: its CGMW colour code as RGB hex. The
//                   code list has no entry for the Early Pleistocene as a whole; it takes that of
//                   its first stage, the Gelasian. The Middle and Late Pleistocene use the
//                   Chibanian and Upper Pleistocene codes.
//   temporalWeight  pacing, see below
//   description     the single most memorable thing about the interval (≤ 60 characters)
//   context         { life, climate, geography } — one line each (≤ 120 characters) for the
//                   context card: who is alive, what the air and ice are doing, where the land is
//
// PACING. A row is on screen for (startMa − endMa) × temporalWeight / TIMING.baseSpeedMaPerSec
// seconds at 1× (js/engine/timeScale.js lays the rows end to end). Each weight is derived from an
// editorial target, noted beside it: weight = seconds × 15 / duration in Myr, to three significant
// figures. The whole story runs for about 5 min 52 s. The enormous weights at the young end are
// intended: the last 130,000 years — Neanderthals, the peopling of the planet, the lost giant
// mammals, farming — get more screen time than the whole Cambrian.
//
// The text is a summary for a general audience. Dates in it are fossil or rock ages from the
// literature, rounded; "~", "by" and "probably" mark what is uncertain or still argued over.

export const timeline = [
  // ---- HADEAN ----------------------------------------------------------------------------------
  {
    eon: 'Hadean', era: null, period: 'Hadean', label: 'Hadean', abbr: 'Had',
    startMa: 4540, endMa: 4031, color: '#ae027e', temporalWeight: 0.413, // 14 s
    description: 'Earth and Moon form; magma ocean cools to crust and oceans',
    context: {
      life: 'No confirmed trace of life — only disputed hints, such as specks of carbon sealed in a 4.1-billion-year-old zircon.',
      climate: 'Rock-vapor skies give way to steam and CO₂; zircon crystals suggest liquid-water seas by 4.4–4.3 billion years ago.',
      geography: 'A magma ocean hardens into a dark crust, soon under water and pounded by asteroids. Almost no rock this old survives.',
    },
  },

  // ---- ARCHEAN ---------------------------------------------------------------------------------
  {
    eon: 'Archean', era: 'Eoarchean', period: 'Eoarchean', label: 'Eoarchean', abbr: 'EoA',
    startMa: 4031, endMa: 3600, color: '#da037f', temporalWeight: 0.278, // 8 s
    description: 'Oldest firmly dated rocks; early chemical hints of life',
    context: {
      life: 'Carbon in 3.7-billion-year-old Greenland rocks hints at microbes, but every claim this old is disputed.',
      climate: 'No free oxygen. The Sun is a quarter dimmer than today, yet greenhouse gases keep the seas from freezing.',
      geography: 'Mostly ocean, with volcanic islands and the first surviving scraps of continental crust; giant asteroids still strike.',
    },
  },
  {
    eon: 'Archean', era: 'Paleoarchean', period: 'Paleoarchean', label: 'Paleoarchean', abbr: 'PaA',
    startMa: 3600, endMa: 3200, color: '#f4449f', temporalWeight: 0.338, // 9 s
    description: 'Oldest firm fossils: stromatolites and microbial mats',
    context: {
      life: 'Microbes in Australia’s Pilbara build layered mounds 3.5 billion years ago: stromatolites, the oldest accepted fossils.',
      climate: 'Still no free oxygen and no ozone shield. A CO₂-rich greenhouse, probably with methane, offsets the faint Sun.',
      geography: 'Lasting continental cores take shape — among them the Pilbara and Kaapvaal cratons, perhaps joined as “Vaalbara”.',
    },
  },
  {
    eon: 'Archean', era: 'Mesoarchean', period: 'Mesoarchean', label: 'Mesoarchean', abbr: 'MeA',
    startMa: 3200, endMa: 2800, color: '#f768a9', temporalWeight: 0.263, // 7 s
    description: 'Continents take root; the first known ice age',
    context: {
      life: 'Stromatolite reefs line the shores. Some microbes may already make oxygen from sunlight — the evidence is disputed.',
      climate: 'No free oxygen yet. About 2.9 billion years ago the oldest known glaciers leave their rubble in southern Africa.',
      geography: 'Continental cores thicken, stabilize and begin to rise above the sea; plate tectonics is probably at work by now.',
    },
  },
  {
    eon: 'Archean', era: 'Neoarchean', period: 'Neoarchean', label: 'Neoarchean', abbr: 'NeA',
    startMa: 2800, endMa: 2500, color: '#f99bc1', temporalWeight: 0.4, // 8 s
    description: 'Continents grow fast; possible whiffs of oxygen in the air',
    context: {
      life: 'Cyanobacteria — sunlight-harvesting bacteria — are probably releasing oxygen by now; stromatolite reefs grow vast.',
      climate: 'The air still holds almost no oxygen: it is mopped up as fast as it is made. Methane may at times form an orange haze.',
      geography: 'A surge of new crust ~2.7 billion years ago enlarges the continents, which may cluster as “Kenorland”.',
    },
  },

  // ---- PROTEROZOIC -----------------------------------------------------------------------------
  {
    eon: 'Proterozoic', era: 'Paleoproterozoic', period: 'Paleoproterozoic', label: 'Paleoproterozoic', abbr: 'PaP',
    startMa: 2500, endMa: 1600, color: '#f74370', temporalWeight: 0.433, // 26 s
    description: 'Oxygen builds up in the air; the first complex cells',
    context: {
      life: 'Oxygen poisons many microbes and lets others breathe. By ~1.65 billion years ago, cells with a nucleus leave fossils.',
      climate: 'Oxygen rises ~2.4 billion years ago and probably strips methane from the air: ice may reach the tropics (the Huronian).',
      geography: 'Iron rusts out of the seas as banded iron ore; by ~1.8 billion years ago the continents join as Columbia (Nuna).',
    },
  },
  {
    eon: 'Proterozoic', era: 'Mesoproterozoic', period: 'Mesoproterozoic', label: 'Mesoproterozoic', abbr: 'MeP',
    startMa: 1600, endMa: 1000, color: '#fdb462', temporalWeight: 0.325, // 13 s
    description: 'The “boring billion”: seaweeds and the first signs of sex',
    context: {
      life: 'Bacteria still dominate. Bangiomorpha, a red alga ~1.05 billion years old, is the oldest fossil evidence of sex.',
      climate: 'Warm and steady: no ice ages are firmly known from this era, and oxygen stays a small fraction of today’s level.',
      geography: 'Columbia breaks apart; by ~1.1 billion years ago its pieces are colliding again to build Rodinia.',
    },
  },
  {
    eon: 'Proterozoic', era: 'Neoproterozoic', period: 'Tonian', label: 'Tonian', abbr: 'Ton',
    startMa: 1000, endMa: 720, color: '#febf4e', temporalWeight: 0.482, // 9 s
    description: 'Rodinia starts to split; complex cells diversify',
    context: {
      life: 'Algae, shelled amoebae and probably fungi diversify; genetic clocks suggest the first animals arise, unseen by fossils.',
      climate: 'Mostly warm and ice-free — until the period ends on the brink of one of the deepest freezes in Earth history.',
      geography: 'Nearly all land is joined in the supercontinent Rodinia, which begins to rift apart ~800 million years ago.',
    },
  },
  {
    eon: 'Proterozoic', era: 'Neoproterozoic', period: 'Cryogenian', label: 'Cryogenian', abbr: 'Cry',
    startMa: 720, endMa: 635, color: '#fecc5c', temporalWeight: 1.59, // 9 s
    description: 'Snowball Earth: twice, ice reaches the tropics',
    context: {
      life: 'Microbes and algae hang on in open water or meltwater pools; disputed chemical traces hint at the first sponges.',
      climate: 'Two global glaciations — the Sturtian, ~57 million years long, and the Marinoan — each end in a sudden hothouse.',
      geography: 'Rodinia’s fragments drift apart at low latitudes; glaciers reach the sea even near the equator.',
    },
  },
  {
    eon: 'Proterozoic', era: 'Neoproterozoic', period: 'Ediacaran', label: 'Ediacaran', abbr: 'Edi',
    startMa: 635, endMa: 538.8, color: '#fed96a', temporalWeight: 2.18, // 14 s
    description: 'Soft-bodied Ediacarans: the first large complex life',
    context: {
      life: 'From ~575 million years ago fronds and quilted discs up to 2 m long carpet the sea floor; some are early animals.',
      climate: 'A hothouse thaw after Snowball Earth, then milder, with a brief ice age ~580 million years ago (the Gaskiers).',
      geography: 'The future southern continents collide to build Gondwana; the Iapetus Ocean opens between Laurentia and Baltica.',
    },
  },

  // ---- PHANEROZOIC · Paleozoic -----------------------------------------------------------------
  {
    eon: 'Phanerozoic', era: 'Paleozoic', period: 'Cambrian', label: 'Cambrian', abbr: 'Cam',
    startMa: 538.8, endMa: 486.85, color: '#7fa056', temporalWeight: 5.77, // 20 s
    description: 'Explosion of animal body plans — shells, eyes, predators',
    context: {
      life: 'Within ~25 million years most major animal groups appear: trilobites, the hunter Anomalocaris, the first fish.',
      climate: 'A greenhouse with little or no polar ice; CO₂ is many times today’s level and high seas flood the continents.',
      geography: 'Gondwana spans the south; Laurentia, Siberia and Baltica are island continents; the north is almost all ocean.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Paleozoic', period: 'Ordovician', label: 'Ordovician', abbr: 'Ord',
    startMa: 486.85, endMa: 443.1, color: '#009270', temporalWeight: 4.46, // 13 s
    description: 'Seas fill with life; plants reach land; an icy end',
    context: {
      life: 'Marine animal families triple: coral and sponge reefs, giant nautiloids, jawless fish. Moss-like plants reach land.',
      climate: 'A greenhouse with some of the highest seas known — until ice sheets grow over Gondwana at the very end.',
      geography: 'Gondwana drifts over the South Pole; the Iapetus Ocean narrows as Baltica and Avalonia close on Laurentia.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Paleozoic', period: 'Silurian', label: 'Silurian', abbr: 'Sil',
    startMa: 443.1, endMa: 419.62, color: '#b3e1b6', temporalWeight: 5.11, // 8 s
    description: 'Jaws in the sea; plants with veins on land',
    context: {
      life: 'Jawed fish and two-meter sea scorpions hunt coastal waters; finger-high plants and millipedes settle wet ground.',
      climate: 'The southern ice melts away, seas rise and warm shallow waters spread across the continents again.',
      geography: 'Baltica and Avalonia collide with Laurentia, closing the Iapetus Ocean and raising the Caledonian mountains.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Paleozoic', period: 'Devonian', label: 'Devonian', abbr: 'Dev',
    startMa: 419.62, endMa: 358.86, color: '#cb8c37', temporalWeight: 4.44, // 18 s
    description: 'Age of Fishes; first forests; fins become limbs',
    context: {
      life: 'Armored fish and early sharks rule the seas; the first forests rise ~390 million years ago; some fish evolve limbs.',
      climate: 'Warm at first; spreading forests may help draw down CO₂, and the period ends with cooling and oxygen-starved seas.',
      geography: 'Laurussia, the “Old Red Continent”, lies in the tropics; the Rheic Ocean narrows between it and Gondwana.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Paleozoic', period: 'Carboniferous', label: 'Carboniferous', abbr: 'Carb',
    startMa: 358.86, endMa: 298.9, color: '#67a599', temporalWeight: 4, // 16 s
    description: 'Coal forests, giant insects and the first reptiles',
    context: {
      life: 'Scale trees 30 m tall fill the swamps; dragonfly-like insects span 70 cm; early reptiles lay eggs on dry land.',
      climate: 'Oxygen peaks near 30% of the air (21% today); CO₂ falls and ice sheets spread across southern Gondwana.',
      geography: 'Gondwana and Laurussia collide, closing the Rheic Ocean and raising mountains across the heart of Pangaea.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Paleozoic', period: 'Permian', label: 'Permian', abbr: 'Perm',
    startMa: 298.9, endMa: 251.9, color: '#f04028', temporalWeight: 4.15, // 13 s
    description: 'Pangaea complete; mammal forerunners; the Great Dying',
    context: {
      life: 'Sail-backed Dimetrodon, then therapsids — mammal forerunners — rule the land; forests of Glossopteris cloak the south.',
      climate: 'The southern ice melts and Pangaea’s interior dries to desert; the period ends in volcano-driven global heating.',
      geography: 'Almost all land is joined in Pangaea, C-shaped around the Tethys Sea and ringed by the Panthalassa Ocean.',
    },
  },

  // ---- PHANEROZOIC · Mesozoic ------------------------------------------------------------------
  {
    eon: 'Phanerozoic', era: 'Mesozoic', period: 'Triassic', label: 'Triassic', abbr: 'Tri',
    startMa: 251.9, endMa: 201.4, color: '#812b92', temporalWeight: 4.16, // 14 s
    description: 'After the Great Dying: the first dinosaurs and mammals',
    context: {
      life: 'Recovery takes millions of years; by the end there are dinosaurs, pterosaurs, turtles, crocodile kin and tiny mammals.',
      climate: 'Hot and mostly dry, with no polar ice; right after the extinction the tropics are lethally hot.',
      geography: 'Pangaea stretches nearly from pole to pole; late in the period rifts open where the Atlantic will form.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Mesozoic', period: 'Jurassic', label: 'Jurassic', abbr: 'Jur',
    startMa: 201.4, endMa: 143.1, color: '#34b2c9', temporalWeight: 4.63, // 18 s
    description: 'Giant dinosaurs; Pangaea splits; the first birds',
    context: {
      life: '25-meter sauropods, Stegosaurus, Allosaurus; ~150 million years ago feathered dinosaurs take wing as the first birds.',
      climate: 'Warm and humid, with little or no polar ice; forests of conifers, cycads and ferns — no known flowers yet.',
      geography: 'Pangaea splits into Laurasia and Gondwana; the young Atlantic opens and shallow seas flood Europe.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Mesozoic', period: 'Cretaceous', label: 'Cretaceous', abbr: 'Cret',
    startMa: 143.1, endMa: 66, color: '#7fc64e', temporalWeight: 5.06, // 26 s
    description: 'Flowers, T. rex and the asteroid that ends an era',
    context: {
      life: 'Flowering plants spread with their pollinators; T. rex and Triceratops arrive only in the last two million years.',
      climate: 'A greenhouse peaking ~94 million years ago: no lasting polar ice, forests near the poles, seas far above today’s.',
      geography: 'Gondwana breaks apart: the South Atlantic opens, India heads north, and an inland sea splits North America.',
    },
  },

  // ---- PHANEROZOIC · Cenozoic (epochs; parentPeriod keeps the ICS period) ----------------------
  {
    eon: 'Phanerozoic', era: 'Cenozoic', period: 'Paleocene', label: 'Paleocene', abbr: 'Pal', parentPeriod: 'Paleogene',
    startMa: 66, endMa: 56, color: '#fda75f', temporalWeight: 10.5, // 7 s
    description: 'Mammals and birds inherit an emptied world',
    context: {
      life: 'Survivors rebound: mammals grow from rat-sized to bear-sized, birds diversify, modern-style rainforests arise.',
      climate: 'Warm and ice-free, with forests near the poles; it ends with the PETM, a sudden global heat spike of 5–6 °C.',
      geography: 'India races north toward Asia; the North Atlantic begins to open between Greenland and Europe.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Cenozoic', period: 'Eocene', label: 'Eocene', abbr: 'Eoc', parentPeriod: 'Paleogene',
    startMa: 56, endMa: 33.9, color: '#fdb46c', temporalWeight: 8.14, // 12 s
    description: 'Hothouse Earth: early whales, horses and primates',
    context: {
      life: 'Modern mammal groups appear: cat-sized horses, bats, early primates — and whales, evolved from hoofed land animals.',
      climate: 'The hottest stretch of the Cenozoic: ice-free poles, palms and alligators in the Arctic — then a long cooling.',
      geography: 'India collides with Asia and the Himalaya begin to rise; Australia finally parts from Antarctica.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Cenozoic', period: 'Oligocene', label: 'Oligocene', abbr: 'Oli', parentPeriod: 'Paleogene',
    startMa: 33.9, endMa: 23.04, color: '#fdc07a', temporalWeight: 9.67, // 7 s
    description: 'Cooling, Antarctic ice sheet, first open grasslands',
    context: {
      life: 'Grassy open country begins to spread; giant hornless rhinos browse Asia; apes and Old World monkeys part ways in Africa.',
      climate: 'CO₂ falls and ~34 million years ago a permanent ice sheet covers Antarctica; sea level drops and the world cools.',
      geography: 'Seaways open around Antarctica and a cold current starts to circle it; Africa pushes north, raising the Alps.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Cenozoic', period: 'Miocene', label: 'Miocene', abbr: 'Mio', parentPeriod: 'Neogene',
    startMa: 23.04, endMa: 5.333, color: '#ffff00', temporalWeight: 11.9, // 14 s
    description: 'Grasslands spread and apes flourish in a cooling world',
    context: {
      life: 'Horses and antelope graze the grasslands; apes roam Africa and Eurasia; our line probably begins ~7 million years ago.',
      climate: 'Warm until ~14 million years ago, then cooler and drier as Antarctic ice expands and CO₂ falls.',
      geography: 'Africa–Arabia meets Eurasia, closing the Tethys; the Himalaya and Andes soar; the Mediterranean nearly dries out.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Cenozoic', period: 'Pliocene', label: 'Pliocene', abbr: 'Pli', parentPeriod: 'Neogene',
    startMa: 5.333, endMa: 2.58, color: '#ffff99', temporalWeight: 49, // 9 s
    description: 'Lucy’s kin walk upright in Africa; the Americas join',
    context: {
      life: 'Australopithecus — “Lucy” and her kin — walks upright in East Africa; stone tools appear by ~3.3 million years ago.',
      climate: 'Some 3 °C warmer than before industry, CO₂ near today’s level, seas 5–25 m higher; then the north begins to freeze.',
      geography: 'The Isthmus of Panama rises, joining the Americas and parting Atlantic from Pacific, by ~3 million years ago.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Cenozoic', period: 'Early Pleistocene', label: 'Early Pleistocene', abbr: 'E.Pl', parentPeriod: 'Quaternary',
    startMa: 2.58, endMa: 0.774, color: '#ffedb3', temporalWeight: 74.8, // 9 s
    description: 'The northern ice ages begin; early humans leave Africa',
    context: {
      life: 'Homo erectus arises in Africa ~2 million years ago, makes hand-axes and spreads to Georgia, China and Java.',
      climate: 'Ice sheets advance and retreat across the north about every 41,000 years, paced by the tilt of Earth’s axis.',
      geography: 'Continents sit where they are today; with each ice advance the seas fall, exposing land bridges such as Sundaland.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Cenozoic', period: 'Middle Pleistocene', label: 'Middle Pleistocene', abbr: 'M.Pl', parentPeriod: 'Quaternary',
    startMa: 0.774, endMa: 0.129, color: '#fff2c7', temporalWeight: 186, // 8 s
    description: 'Deeper ice ages; Neanderthals; our species emerges',
    context: {
      life: 'Neanderthals in Europe, Denisovans in Asia and, by ~300,000 years ago in Africa, Homo sapiens; hearths become routine.',
      climate: 'Glacial cycles now last ~100,000 years: ice builds slowly, then collapses within about 10,000 years.',
      geography: 'At each glacial peak, ice sheets bury Canada and northern Europe and sea level falls by some 70–125 m.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Cenozoic', period: 'Late Pleistocene', label: 'Late Pleistocene', abbr: 'L.Pl', parentPeriod: 'Quaternary',
    startMa: 0.129, endMa: 0.0117, color: '#fff2d3', temporalWeight: 1530, // 12 s — five human-story toasts need reading room
    description: 'The last ice age; Homo sapiens spreads worldwide',
    context: {
      life: 'Homo sapiens leaves Africa, paints caves and outlasts the Neanderthals (gone ~40,000 years ago); giant mammals dwindle.',
      climate: 'A warm interglacial, then the last ice age: at its peak ~21,000 years ago Earth is ~6 °C colder than in 1850.',
      geography: 'Ice reaches New York and Berlin; seas ~125 m lower join Siberia to Alaska, Britain to Europe, Australia to New Guinea.',
    },
  },
  {
    eon: 'Phanerozoic', era: 'Cenozoic', period: 'Holocene', label: 'Holocene', abbr: 'Hol', parentPeriod: 'Quaternary',
    startMa: 0.0117, endMa: 0, color: '#feebd2', temporalWeight: 14100, // 11 s
    description: 'Farms, cities and a human-altered planet',
    context: {
      life: 'Farming begins in several regions; humans grow from a few million to over 8 billion as extinction rates soar.',
      climate: 'Some 11,000 years of stable warmth; then fossil fuels lift CO₂ from 280 to over 425 ppm and warm Earth by about 1.3 °C.',
      geography: 'Melting ice lifts the seas ~60 m; ~8,000 years ago Britain becomes an island and New Guinea parts from Australia.',
    },
  },
];

// Chapter-level units for title cards: the three Precambrian eons, then the Phanerozoic's eras.
export const ERAS = [
  { id: 'hadean', kind: 'eon', name: 'Hadean Eon', startMa: 4540, endMa: 4031, tagline: 'The Moon forms; a molten world cools; the first seas gather' },
  { id: 'archean', kind: 'eon', name: 'Archean Eon', startMa: 4031, endMa: 2500, tagline: 'Microbial life takes hold on a planet without free oxygen' },
  { id: 'proterozoic', kind: 'eon', name: 'Proterozoic Eon', startMa: 2500, endMa: 538.8, tagline: 'Oxygen, complex cells, global ice — and the first animals' },
  { id: 'paleozoic', kind: 'era', name: 'Paleozoic Era', startMa: 538.8, endMa: 251.9, tagline: 'Life fills the seas, greens the land — and nearly dies' },
  { id: 'mesozoic', kind: 'era', name: 'Mesozoic Era', startMa: 251.9, endMa: 66, tagline: 'The age of reptiles: dinosaurs, flowers and a fatal asteroid' },
  { id: 'cenozoic', kind: 'era', name: 'Cenozoic Era', startMa: 66, endMa: 0, tagline: 'Mammals, grasslands, ice ages — and us' },
];

/**
 * The timeline row for a time in Ma. A time exactly on a boundary belongs to the row that starts
 * there; anything at or before the first row's start gets the first row, anything at or after the
 * present (or not a number) the last.
 */
export function getPeriodAtTime(timeMa) {
  let lo = 0;
  let hi = timeline.length - 1;
  if (!(timeMa > 0)) return timeline[hi];
  // Rows are contiguous and ordered oldest → youngest: find the first row whose end is younger
  // than timeMa.
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (timeMa <= timeline[mid].endMa) lo = mid + 1;
    else hi = mid;
  }
  return timeline[lo];
}

/** The ERAS entry (eon before the Phanerozoic, era within it) for a time in Ma; same edge rules. */
export function getEraAtTime(timeMa) {
  if (!(timeMa > 0)) return ERAS[ERAS.length - 1];
  for (let i = ERAS.length - 1; i > 0; i--) {
    if (timeMa <= ERAS[i].startMa) return ERAS[i];
  }
  return ERAS[0];
}

/** Pacing weight at a time in Ma (see PACING above). */
export function getTemporalWeight(timeMa) {
  return getPeriodAtTime(timeMa).temporalWeight;
}
