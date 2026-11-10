// Chapters — the story's table of contents (the chapters panel, and the [ / ] keys).
//
// Entry:
//   id       stable key
//   title    ≤ 32 characters
//   startMa  where the chapter begins (older); a chapter covers [startMa, endMa)
//   endMa    where it ends — always the next chapter's startMa; the last one ends at 0
//   blurb    ≤ 110 characters, present tense
//   view     optional 'map' | 'globe' | 'tree': the view that shows this chapter best. Jumping
//            to the chapter switches to it, so it is set only where one view clearly suits:
//            the map for the Hadean (the Tree has only its root, LUCA, to show yet), the globe for
//            Snowball Earth (ice reaching the equator), the Tree for the Cambrian explosion.
//
// The chapters are contiguous and ordered oldest first. Most boundaries are period boundaries
// of the time scale (timeline.js); six are not. Three follow the mass extinctions: the chapters
// that end with the end-Permian, end-Triassic and end-Cretaceous extinctions run to just past
// the end of the extinction's on-screen window (extinctions.js) — 251.0, 200.5 and 65.5 Ma — so
// that jumping to the next chapter lands in the aftermath rather than in the middle of the
// catastrophe. Three follow the story instead of the chart: the "boring billion" begins at
// 1800 Ma (after the Great Oxidation's aftermath), the human lineage at 7 Ma (the oldest
// hominin candidates) and our own species at 0.3 Ma (Jebel Irhoud).

export const chapters = [
  {
    id: 'formation',
    title: 'A world of fire',
    startMa: 4540,
    endMa: 4031,
    blurb: 'Earth forms molten, a giant impact makes the Moon, and the first crust and oceans appear.',
    view: 'map',
  },
  {
    id: 'first_life',
    title: 'First life',
    startMa: 4031,
    endMa: 2500,
    blurb: 'Microbes appear in the young seas, build stromatolite reefs and learn to live on sunlight.',
  },
  {
    id: 'oxygen',
    title: 'The oxygen revolution',
    startMa: 2500,
    endMa: 1800,
    blurb: 'Oxygen made by microbes builds up in the air, rusts the land and probably helps freeze the planet.',
  },
  {
    id: 'long_quiet',
    title: 'The long quiet',
    startMa: 1800,
    endMa: 720,
    blurb: 'A billion calm years in which complex cells arise, invent sex and build many-celled bodies.',
  },
  {
    id: 'snowball',
    title: 'Snowball Earth & first animals',
    startMa: 720,
    endMa: 538.8,
    blurb: 'Ice reaches the tropics twice; after the thaw the first large, soft-bodied creatures appear.',
    view: 'globe',
  },
  {
    id: 'cambrian',
    title: 'The Cambrian explosion',
    startMa: 538.8,
    endMa: 486.85,
    blurb: 'Shells, legs, eyes and claws: nearly every animal body plan appears within 25 million years.',
    view: 'tree',
  },
  {
    id: 'ordovician',
    title: 'Teeming seas, green shores',
    startMa: 486.85,
    endMa: 443.1,
    blurb: 'Sea life triples in variety and the first plants reach land — then an ice age ravages the seas.',
  },
  {
    id: 'onto_land',
    title: 'Life invades the land',
    startMa: 443.1,
    endMa: 358.86,
    blurb: 'Jawed fishes, the first forests and four-legged animals — and seas that twice run out of oxygen.',
  },
  {
    id: 'coal',
    title: 'The coal forests',
    startMa: 358.86,
    endMa: 298.9,
    blurb: 'Swamp forests bury carbon as coal, oxygen soars, insects grow huge and animals lay eggs on land.',
  },
  {
    id: 'pangaea',
    title: 'Pangaea and the Great Dying',
    startMa: 298.9,
    endMa: 251.0,
    blurb: 'One supercontinent, ruled by mammal forerunners — until Siberian eruptions bring the worst extinction.',
  },
  {
    id: 'dinosaurs_rise',
    title: 'Rise of the dinosaurs',
    startMa: 251.0,
    endMa: 200.5,
    blurb: 'Life rebuilds in a hot, dry world: the first dinosaurs, pterosaurs, turtles and mammals appear.',
  },
  {
    id: 'jurassic',
    title: 'Jurassic giants',
    startMa: 200.5,
    endMa: 143.1,
    blurb: 'Pangaea splits, the Atlantic opens, and giant sauropods share the world with the first birds.',
  },
  {
    id: 'cretaceous',
    title: 'Flowers, T. rex and the asteroid',
    startMa: 143.1,
    endMa: 65.5,
    blurb: 'Flowers and insects remake the land in a hothouse world — until an asteroid ends the age of dinosaurs.',
  },
  {
    id: 'mammals',
    title: 'The age of mammals',
    startMa: 65.5,
    endMa: 33.9,
    blurb: 'Survivors inherit a hothouse: mammals grow large, whales go to sea and primates take to the trees.',
  },
  {
    id: 'cooling',
    title: 'A cooling world and the apes',
    startMa: 33.9,
    endMa: 7.0,
    blurb: 'Antarctica freezes, grasslands spread, and apes flourish from Africa to Asia.',
  },
  {
    id: 'hominins',
    title: 'Upright apes and ice ages',
    startMa: 7.0,
    endMa: 0.3,
    blurb: 'Our ancestors stand up, make stone tools, tame fire and leave Africa as the ice ages set in.',
  },
  {
    id: 'sapiens',
    title: 'Our species',
    startMa: 0.3,
    endMa: 0.0117,
    blurb: 'Homo sapiens appears in Africa, makes art and reaches every habitable continent as the giant animals vanish.',
  },
  {
    id: 'human_planet',
    title: 'The human planet',
    startMa: 0.0117,
    endMa: 0,
    blurb: 'Farms, cities, writing, engines: in 12,000 years one species reshapes the whole Earth.',
  },
];

/**
 * The chapter whose [startMa, endMa) span contains timeMa. A time exactly on a boundary belongs
 * to the chapter that starts there; times before the first chapter return the first, and the
 * present (0 Ma) returns the last.
 */
export function getChapterAt(timeMa) {
  for (const chapter of chapters) {
    if (timeMa <= chapter.startMa && timeMa > chapter.endMa) return chapter;
  }
  return timeMa > chapters[0].startMa ? chapters[0] : chapters[chapters.length - 1];
}
