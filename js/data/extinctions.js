// Mass extinctions — the "Big Five" that the clock stages, and the second-tier crises that the
// timeline marks.
//
// `extinctions` (the Big Five). The clock holds on the leading edge of each window, creeps
// through it, then lets the effects fade (see engine/clock.js).
//   id              stable key — other modules, deep links and the species data key on it
//   name            formal name
//   subtitle        optional familiar name; when present the card leads with it
//   timeMa          date of the event. Species that die in it end EXACTLY here (briefs: D-canon)
//   durationMa      the on-screen staging window, timeMa ± durationMa/2. It is NOT how long the
//                   dying took (that is in `cause`): each window is sized to span the crisis
//                   interval and to take ~1.5–2 s to cross at 1× once the clock's slow-down
//                   is applied.
//   severityPercent the number the severity meter fills to — see "Severity" below
//   severityLabel   what that number measures (always shown next to it)
//   cause           the full story in 2–3 sentences (dialogs, help, docs — not the map)
//   causeShort      one line, ≤ 70 characters, for the card and tooltips
//   mechanism       'glaciation' | 'anoxia' | 'volcanism' | 'impact' — drives the map staging
//   epicenter       { plateId, lon, lat, name } in MODERN coordinates (the engine carries the
//                   point back on its plate), or null when no single place is defensible
//   victims         display names of groups that ended in, or were devastated by, the event
//   survivors       display names of notable groups that came through
//   color           event colour (card rule, timeline diamond, map tint)
//   description     ONE sentence, ≤ 150 characters, present tense, for the card
//
// Severity. Nobody has counted species across a mass extinction: every figure is extrapolated
// from the genera and families that fossils record. The meter shows the classic estimates of
// marine species lost (Jablonski 1994, as tabulated by Barnosky et al. 2011: 86 / 75 / 96 / 80 /
// 76 %; Sheehan 2001 gives 85 % for the end-Ordovician), with one correction: the 96 % for the
// end-Permian lumped in the end-Capitanian crisis 8 Myr earlier, so that event shows 90 %, inside
// the 81–94 % range of Dal Corso et al. 2022. Where the published figures are a range the label
// says so and the meter sits inside it. Re-analyses that subtract ordinary background
// extinction (Stanley 2016, who leaves out the end-Triassic) lower the figures they cover —
// 42–44 % of genera instead of 57 % for the end-Ordovician, 16–20 % instead of 35 % for the
// Kellwasser crisis, 38–40 % for the end-Cretaceous — but leave the end-Permian (62 % of genera,
// 81 % of species) far in front. The numbers are for comparing the five with one another, not
// for reading to the point.
//
// `crises` — second-tier extinctions and biotic crises. They never pause the clock; the timeline
// draws them as small markers and a few have a matching toast in milestones.js (linked by that
// milestone's `crisisId`).
//   id, name, timeMa, durationMa (window = timeMa ± durationMa/2), severityNote, cause,
//   description (≤ 200 characters, present tense), color
//
// Dates follow the ICS International Chronostratigraphic Chart (v2026/06; see timeline.js).
// Sources for every entry are listed in docs/data-sources.md.

export const extinctions = [
  {
    id: 'end-ordovician',
    name: 'End-Ordovician Extinction',
    timeMa: 444.2,
    // 445.2–443.2 Ma: the Hirnantian Age (445.2–443.1 Ma) all but its last 0.1 Myr, with the
    // first pulse at its start and the second near its end.
    durationMa: 2.0,
    severityPercent: 85,
    severityLabel: 'of marine species lost (estimate)',
    cause: 'As Gondwana drifted over the South Pole an ice sheet spread across what is now the Sahara: sea level fell by perhaps 100 metres, draining the warm shallow seas where most species lived, and the oceans chilled. A second pulse struck within about a million years, as the ice melted and oxygen-poor water spread over the re-flooded shelves. The classic toll is about 85% of marine species (57% of genera); methods that subtract ordinary background extinction put the genus loss nearer 42–44%, and some researchers argue that volcanism and warming played a part.',
    causeShort: 'Ice age on Gondwana: seas drain and chill, then stagnate as it melts',
    mechanism: 'glaciation',
    // Hirnantian glacial pavements and tillites are exposed across the central Sahara.
    epicenter: { plateId: 'africa', lon: 8.5, lat: 25.5, name: 'Hirnantian ice sheet, central Sahara' },
    victims: ['Graptolites', 'Trilobites', 'Brachiopods', 'Conodonts', 'Nautiloids', 'Tabulate corals', 'Crinoids'],
    survivors: ['Jawless fishes', 'Sea scorpions', 'Snails and clams', 'The first land plants'],
    color: '#4488ff',
    description: 'Two waves of extinction — as Gondwana’s ice sheets grow, then as they melt — ravage the seas, where nearly all animals still live.',
  },
  {
    id: 'late-devonian',
    name: 'Late Devonian Extinction',
    timeMa: 372.0,
    // 373–371 Ma: the Lower and Upper Kellwasser events (~600 kyr apart) and the first
    // aftermath, at the Frasnian–Famennian boundary (372.15 ± 0.46 Ma).
    durationMa: 2.0,
    severityPercent: 75,
    severityLabel: 'of marine species lost, in pulses (estimate)',
    cause: 'Not one blow but a drawn-out crisis: twice within about a million years — the Lower and Upper Kellwasser events — oxygen-starved water spread across the shallow tropical seas and buried them in black mud, amid sharp swings of climate. The suspects are nutrients washed off the land by the first deep-rooted forests, volcanism (Siberia’s Viluy Traps are of about the right age) and rhythms in Earth’s orbit; none is proven. The classic toll of about 75% of marine species adds up several Late Devonian pulses — the Kellwasser crisis alone removed roughly a fifth to two-fifths of marine genera, depending on the method — and the armoured placoderm fishes outlived it, to die out 13 million years later in the Hangenberg crisis.',
    causeShort: 'Oxygen-starved seas, in pulses — forests and volcanoes are suspects',
    mechanism: 'anoxia',
    // No single place to point at: the black shales are worldwide, and the best-dated Viluy
    // lavas do not coincide with the Frasnian–Famennian boundary.
    epicenter: null,
    victims: ['Reef-building sponges', 'Tabulate corals', 'Rugose corals', 'Brachiopods', 'Trilobites', 'Goniatites', 'Conodonts'],
    survivors: ['Placoderms, for now', 'Sharks', 'Ray-finned fishes', 'The first tetrapods', 'Land plants'],
    color: '#cc6600',
    description: 'Oxygen-starved seas destroy the greatest reefs Earth has yet built; corals, trilobites and brachiopods are devastated.',
  },
  {
    id: 'end-permian',
    name: 'End-Permian Extinction',
    subtitle: 'The Great Dying',
    timeMa: 251.9,
    // 252.75–251.05 Ma: the main eruptive phase of the Siberian Traps and the first ~850 kyr of
    // the Triassic. The marine extinction itself took ~60 kyr (251.941–251.880 Ma).
    durationMa: 1.7,
    severityPercent: 90,
    severityLabel: 'of marine species lost (estimates: 81–94%)',
    cause: 'The Siberian Traps — a few million cubic kilometres of lava and sills, among the largest volcanic outpourings known — baked through coal, salt and limestone and poured carbon dioxide and other gases into the air. Temperatures rose by some 8–10 °C; the oceans warmed, turned more acidic and lost their oxygen. An estimated 81–94% of marine species died, most of them within about 60,000 years, and roughly 70% of land vertebrates over a longer stretch; older figures of up to 96% lumped in a separate crisis, the end-Capitanian, 8 million years earlier.',
    causeShort: 'Siberian Traps eruptions: extreme hothouse, acid seas without oxygen',
    mechanism: 'volcanism',
    epicenter: { plateId: 'eurasia', lon: 100, lat: 66, name: 'Siberian Traps, Tunguska Basin' },
    victims: ['Trilobites', 'Sea scorpions', 'Tabulate corals', 'Rugose corals', 'Fusulinid forams', 'Gorgonopsians', 'Pareiasaurs', 'Glossopteris forests'],
    survivors: ['Lystrosaurus', 'Cynodonts (our ancestors)', 'Early archosaurs', 'Ceratitid ammonoids', 'Bivalves'],
    color: '#ff2222',
    description: 'The worst extinction on record: most species in the sea and on land vanish — in the oceans within about 60,000 years.',
  },
  {
    id: 'end-triassic',
    name: 'End-Triassic Extinction',
    timeMa: 201.4,
    // 202.2–200.6 Ma: the eruptions of the Central Atlantic Magmatic Province (from
    // 201.56 Ma, over ~600 kyr) and the earliest Jurassic aftermath.
    durationMa: 1.6,
    severityPercent: 78,
    severityLabel: 'of marine species lost (estimates: 75–80%)',
    cause: 'As Pangaea began to tear apart, the Central Atlantic Magmatic Province erupted in pulses over about 600,000 years, spreading lava and sills across some 10 million square kilometres of what are now four continents. Its carbon dioxide warmed the climate by several degrees and acidified the oceans: reefs collapsed and the conodonts vanished for good. On land most crocodile-line reptiles and many large amphibians disappeared, and the dinosaurs — for reasons still debated — inherited the world.',
    causeShort: 'Central Atlantic eruptions as Pangaea rifts: CO₂ surge, acid seas',
    mechanism: 'volcanism',
    epicenter: { plateId: 'africa', lon: -7.4, lat: 31.1, name: 'Central Atlantic lavas, High Atlas, Morocco' },
    victims: ['Conodonts', 'Phytosaurs', 'Aetosaurs', 'Rauisuchians', 'Ceratitid ammonoids', 'Reef corals and sponges', 'Most giant amphibians'],
    survivors: ['Dinosaurs', 'Pterosaurs', 'Crocodile ancestors', 'Early mammals', 'Ichthyosaurs and plesiosaurs'],
    color: '#b952c8',
    description: 'Lava floods the rift that will become the Atlantic; reefs collapse and most of the dinosaurs’ crocodile-line rivals vanish.',
  },
  {
    id: 'end-cretaceous',
    name: 'End-Cretaceous Extinction',
    subtitle: 'The Chicxulub Impact',
    timeMa: 66.0,
    // 66.45–65.55 Ma: the main phase of Deccan volcanism, the impact (66.04 Ma — effectively
    // instantaneous) and the first few hundred thousand years of the recovery.
    durationMa: 0.9,
    severityPercent: 76,
    severityLabel: 'of species lost (estimate from marine fossils)',
    cause: 'A ~10-km asteroid struck the Yucatán at Chicxulub, blasting sulfate- and carbonate-rich rock into a global veil of dust, soot and sulfur aerosols. Re-entering ejecta may have ignited wildfires across continents; then years of impact winter shut down photosynthesis. India’s Deccan Traps were erupting too — how much they stressed life beforehand is debated.',
    causeShort: 'A 10-km asteroid strikes Yucatán: darkness, cold, food chains collapse',
    mechanism: 'impact',
    // The crater's centre (21.3° N) lies on the coast; 20.8° N, still well inside the 180 km crater,
    // keeps the staged impact on land on the 1:110m coastline and on the Chicxulub feature marker.
    epicenter: { plateId: 'north_america', lon: -89.5, lat: 20.8, name: 'Chicxulub crater, Yucatán' },
    victims: ['Non-avian dinosaurs', 'Pterosaurs', 'Mosasaurs', 'Plesiosaurs', 'Ammonites', 'Rudist clams', 'Toothed birds', 'Most chalk-forming plankton'],
    survivors: ['Birds, the last dinosaurs', 'Mammals', 'Crocodilians and turtles', 'Flowering plants', 'Sharks and ray-finned fishes'],
    color: '#ff8800',
    description: 'An asteroid some 10 km wide strikes Mexico’s Yucatán; in the dark, cold years that follow, every dinosaur except a few kinds of bird dies out.',
  },
];

// Second-tier crises, oldest first.
export const crises = [
  {
    // The first of the two Ediacaran pulses; the dataset's White Sea species end here.
    id: 'white-sea-nama',
    name: 'White Sea–Nama Extinction',
    timeMa: 550,
    durationMa: 3,
    severityNote: 'Possibly the first mass extinction of animals: only about 14 of some 70 genera of the White Sea assemblage turn up in the younger Nama assemblage, a loss of about 80% (Evans et al. 2022). A soft-bodied, patchy record, so not directly comparable with the Big Five.',
    cause: 'Debated: a spread of oxygen-poor water across the shallow seas (favoured by Evans et al. 2022), and/or the rise of burrowing and grazing animals that broke up the microbial mats the Ediacarans lived on.',
    description: 'Slug-like Kimberella, Spriggina, three-armed Tribrachidium and most of their White Sea neighbours vanish. A few Ediacarans survive, joined by the first animals with hard tubes, such as Cloudina.',
    color: '#d55181',
  },
  {
    id: 'end-ediacaran',
    name: 'End-Ediacaran Extinction',
    timeMa: 538.8,
    durationMa: 3,
    severityNote: 'The second and final pulse: the Nama-type Ediacarans — White Sea survivors and newcomers such as Cloudina — disappear at or near the base of the Cambrian. Hard to measure in a soft-bodied record; a few forms may linger briefly into the Cambrian.',
    cause: 'Debated: a renewed spread of oxygen-poor water and a jolt to the carbon cycle recorded at the boundary, and/or replacement by burrowing, grazing and predatory animals that broke up the microbial-mat sea floor.',
    description: 'The last of the quilted, frond-like Ediacara biota — Earth’s first large, complex organisms — and the tube-builder Cloudina disappear as the Cambrian dawns, leaving the sea floor to the burrowers.',
    color: '#c75c96',
  },
  {
    id: 'end-botomian',
    name: 'End-Botomian Extinction',
    timeMa: 511,
    durationMa: 4,
    severityNote: 'Proportionally among the heaviest losses on record — estimates run from about half to four-fifths of marine genera — but they rest on a small, patchily sampled early Cambrian fauna. It came in pulses: the Sinsk anoxic event (~513 Ma), then the Hawke Bay fall in sea level.',
    cause: 'Oxygen-poor water spreading over the shelves (the Sinsk event), then a major fall in sea level. The Kalkarindji flood basalts of northern Australia (~511 Ma) are a suspected trigger; the link is not settled.',
    description: 'Archaeocyaths — sponge-like animals that built the first great animal reefs — all but vanish, with many small shelly animals and early trilobites: the first big setback after the Cambrian explosion.',
    color: '#d55181',
  },
  {
    id: 'hangenberg',
    name: 'Hangenberg Crisis (End-Devonian)',
    timeMa: 358.86,
    durationMa: 0.8,
    severityNote: 'The last pulse of the Late Devonian crises, about 13 Myr after Kellwasser. For vertebrates it rivals the Big Five: every placoderm and about 44% of higher-level vertebrate groups are lost (Sallan & Coates 2010); ammonoids, trilobites and the first forests suffer too.',
    cause: 'Black-shale anoxia in the oceans followed by a short glaciation and a fall in sea level; the proposed triggers (forest-driven nutrient run-off, volcanism, a damaged ozone layer) are still debated.',
    description: 'Oxygen-starved seas, then a sharp ice age, close the Devonian. The armoured placoderm fishes — Dunkleosteus among them — die out, leaving the seas to sharks and ray-finned fishes.',
    color: '#c75c96',
  },
  {
    id: 'rainforest-collapse',
    name: 'Carboniferous Rainforest Collapse',
    timeMa: 305,
    durationMa: 4,
    severityNote: 'A crisis for the plants of tropical Euramerica rather than a marine mass extinction. Whether it also reshaped land-animal diversity (Sahney et al. 2010) is still debated.',
    cause: 'A drier, more seasonal climate in the Kasimovian Age, tied to the waxing and waning of Gondwana’s ice sheets, broke the continuous coal forests into isolated patches.',
    description: 'As the climate dries, the equatorial coal forests break up into islands. Giant clubmoss trees give way to tree ferns, and the amniotes — whose eggs survive on dry land — begin to spread.',
    color: '#de5c70',
  },
  {
    id: 'olsons-extinction',
    name: 'Olson’s Extinction',
    timeMa: 273,
    durationMa: 3,
    severityNote: 'A mid-Permian turnover of land vertebrates around the Kungurian–Roadian boundary (274.4 Ma). Long dismissed as a gap in the fossil record (“Olson’s Gap”), it survives corrections for sampling (Sahney & Benton 2008; Brocklehurst et al. 2017). The marine signal is weak.',
    cause: 'Uncertain — probably climate change, as Pangaea’s interior dried and its climate belts shifted, rather than any known volcanic trigger.',
    description: 'The sail-backed “pelycosaurs” — Dimetrodon, Edaphosaurus and kin — and many large amphibians drop out of the record. Therapsids, the mammal forerunners that rule the later Permian, take their place.',
    color: '#de5c70',
  },
  {
    id: 'end-capitanian',
    name: 'End-Capitanian (Guadalupian) Extinction',
    timeMa: 259.5,
    durationMa: 1.6,
    severityNote: 'Recognised as separate from the end-Permian event only in 1994, and sometimes ranked beside the Big Five: about 33–35% of marine genera lost (Stanley 2016) and 74–80% of land-vertebrate genera in the Karoo Basin (Day et al. 2015). Its global severity is still debated.',
    cause: 'Eruption of the Emeishan Traps flood basalts in what is now south-west China (~260 Ma): cooling, then warming, ocean acidification and anoxia.',
    description: 'Eight million years before the Great Dying, the Emeishan Traps erupt. Giant fusulinid forams and, on land, heavy-skulled dinocephalians are wiped out; reef-building sponges and corals are hit hard.',
    color: '#d55181',
  },
  {
    id: 'carnian-pluvial',
    name: 'Carnian Pluvial Episode',
    timeMa: 233,
    durationMa: 2,
    severityNote: 'About a third of marine genera lost (Dal Corso et al. 2020), with a major turnover on land. It matters most for what followed: dinosaurs, modern conifers, stony-coral reefs and chalk-shelled plankton all expand afterwards.',
    cause: 'Eruption of the Wrangellia flood basalts (now in Alaska and British Columbia): CO₂-driven warming and one to two million years of intense rainfall across arid Pangaea.',
    description: 'For more than a million years it rains on Pangaea’s deserts. Ammonoids, crinoids and conodonts suffer; on land rhynchosaurs and dicynodonts decline — and dinosaurs, until now rare, begin their rise.',
    color: '#c75c96',
  },
  {
    id: 'toarcian-oae',
    name: 'Toarcian Oceanic Anoxic Event',
    timeMa: 183,
    durationMa: 1.2,
    severityNote: 'A second-order extinction, far below the Big Five: heaviest among sea-floor bivalves, brachiopods and ammonites, especially in the seas of Europe.',
    cause: 'The Karoo–Ferrar flood basalts of southern Africa and Antarctica (~183 Ma) release CO₂ and methane: several degrees of warming, ocean acidification and widespread sea-floor anoxia.',
    description: 'Eruptions in southern Gondwana warm the planet and starve the seas of oxygen. Black shale blankets Europe’s sea floors — including the Posidonia Shale that entombed Holzmaden’s ichthyosaurs.',
    color: '#d55181',
  },
  {
    id: 'oae2',
    name: 'Cenomanian–Turonian Anoxic Event (OAE 2)',
    timeMa: 93.9,
    durationMa: 1.0,
    severityNote: 'Roughly a quarter of marine invertebrate genera lost. It coincides with one of the hottest climates of the last 250 million years and with the final disappearance of the ichthyosaurs.',
    cause: 'Submarine eruptions of the Caribbean and High Arctic volcanic provinces fertilise the oceans and raise CO₂; decaying plankton blooms strip the water of oxygen for about half a million years.',
    description: 'In the hottest greenhouse of the dinosaur age, large parts of the ocean run out of oxygen and black, carbon-rich mud piles up worldwide. Ichthyosaurs and many ammonites are among the casualties.',
    color: '#c75c96',
  },
  {
    id: 'petm',
    name: 'Paleocene–Eocene Thermal Maximum',
    timeMa: 56.0,
    durationMa: 0.3,
    severityNote: 'Not a mass extinction: 30–50% of deep-sea foraminifera species die out, while most land animals and surface plankton migrate, shrink or diversify instead.',
    cause: 'Thousands of gigatonnes of carbon released within a few thousand years. The source is debated: North Atlantic volcanism, methane hydrates and thawing carbon stores are the main suspects.',
    description: 'Global temperature jumps 5–6 °C and the oceans acidify for some 170,000 years: the closest ancient parallel to today’s warming — though carbon is now being released about ten times faster.',
    color: '#de5c70',
  },
  {
    id: 'eocene-oligocene',
    name: 'Eocene–Oligocene Extinction',
    timeMa: 33.9,
    durationMa: 0.6,
    severityNote: 'Modest by Big Five standards (about 15% of marine genera) but a lasting reorganisation: warm-water molluscs and plankton and many archaic mammals disappear.',
    cause: 'Abrupt global cooling as CO₂ fell below roughly 750 ppm and ice sheets spread across Antarctica.',
    description: 'The warm Eocene world ends. As Antarctica freezes, sea level drops and Europe’s mammals turn over in the “Grande Coupure” — the great break — as immigrants from Asia replace native lineages.',
    color: '#c75c96',
  },
  {
    id: 'quaternary-megafauna',
    name: 'Late Quaternary Megafauna Extinctions',
    timeMa: 0.03,
    durationMa: 0.04,
    severityNote: 'Of land-mammal genera heavier than 44 kg, about 88% vanish in Australia, 83% in South America, 72% in North America, 36% in Eurasia and 18% in Africa (Barnosky et al. 2004). Island giants follow within the last few thousand years.',
    cause: 'Hunting and habitat change by spreading modern humans, compounded by the abrupt climate swings at the end of the last ice age; the balance is still argued continent by continent.',
    description: 'Between about 50,000 and 10,000 years ago most of the world’s giant land animals disappear — Diprotodon, mammoths, woolly rhinos, ground sloths, sabre-tooth cats — largely in step with human arrival.',
    color: '#de5c70',
  },
  {
    id: 'anthropocene-extinction',
    name: 'The Sixth Extinction?',
    timeMa: 0.00025,
    durationMa: 0.0005,
    severityNote: 'Ongoing. More than 900 species are documented extinct since 1500 CE (IUCN Red List) — a small part of the true toll. Vertebrates are disappearing up to ~100 times faster than the background rate (Ceballos et al. 2015); monitored wildlife populations have shrunk by 73% on average since 1970 (Living Planet Index); about a million species are threatened (IPBES 2019). It is not yet a loss on the scale of the Big Five (Barnosky et al. 2011).',
    cause: 'People: habitat destruction, over-hunting and over-fishing, introduced species, pollution and, increasingly, rapid climate change.',
    description: 'Dodo, great auk, passenger pigeon, thylacine: species now vanish tens to hundreds of times faster than normal. It is not yet a mass extinction — and, uniquely, its cause can choose to stop.',
    color: '#d55181',
  },
];

/**
 * The mass extinction whose window contains timeMa, as { ...extinction, progress } with
 * progress 0 at the leading (older) edge and 1 at the trailing edge — or null.
 */
export function getActiveExtinction(timeMa) {
  for (const ext of extinctions) {
    const start = ext.timeMa + ext.durationMa / 2;
    const end = ext.timeMa - ext.durationMa / 2;
    if (timeMa <= start && timeMa >= end) {
      const progress = (start - timeMa) / ext.durationMa;
      return { ...ext, progress };
    }
  }
  return null;
}
