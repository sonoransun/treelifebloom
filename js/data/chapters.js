// "Explore the History of Life" — narrative chapters spanning the playable
// window (4000 → 0 Ma), each a jump target for js/ui/historyExplorer.js.
//
// Hand-curated: titles, narratives, span boundaries (reusing ICS period edges
// from timeline.js so chapters align with the era strip), and the jump target.
// Derived at module load: accent color (from the period at the jump target)
// and the per-chapter links — milestones, extinctions, and species first
// appearances bucketed by time — so new data added to those files lands in
// the right chapter automatically.

import { milestones } from './milestones.js';
import { extinctions } from './extinctions.js';
import { species } from './species.js';
import { getPeriodAtTime } from './timeline.js';

export const rawChapters = [
  {
    id: 'world-of-microbes',
    title: 'World of Microbes',
    spanStartMa: 4000,
    spanEndMa: 2500,
    timeMa: 3800,
    narrative: 'The bombardment ends, the oceans condense, and within a few hundred million years chemistry crosses into biology. For nearly two billion years Earth\'s only inhabitants are single cells — yet in that time they invent photosynthesis, fermentation, and every metabolic trick life still runs on. Stromatolite reefs, built grain by grain, are the skyscrapers of this world.',
  },
  {
    id: 'oxygen-revolution',
    title: 'The Oxygen Revolution',
    spanStartMa: 2500,
    spanEndMa: 2200,
    timeMa: 2400,
    narrative: 'Cyanobacteria\'s waste product — oxygen — begins to accumulate, rusting the oceans into banded iron and poisoning most of the anaerobic biosphere. It is Earth\'s first pollution crisis and its most consequential: the new reactive atmosphere will one day power every animal that runs, swims, or flies.',
  },
  {
    id: 'complex-cells',
    title: 'Complex Cells & the Quiet Billion',
    spanStartMa: 2200,
    spanEndMa: 720,
    timeMa: 2100,
    // Jump target sits in the Paleoproterozoic (same period as the previous
    // chapter), so take the Mesoproterozoic color that dominates this span.
    color: '#fda4c1',
    narrative: 'One cell engulfs another and, instead of digesting it, keeps it as a power plant: the eukaryotic cell is born. Through the deceptively "boring" billion years that follow, life quietly masters sex, multicellularity, and division of labor — red algae, fungi, and the first animals\' ancestors all trace their roots here.',
  },
  {
    id: 'snowball-earth',
    title: 'Snowball Earth',
    spanStartMa: 720,
    spanEndMa: 635,
    timeMa: 715,
    narrative: 'Twice, runaway ice-albedo feedback drags glaciers to the equator and seals the oceans under kilometer-thick ice. Life endures in refugia around volcanic hotspots and in meltwater slush, while volcanic CO₂ slowly loads the trigger for an explosive thaw.',
  },
  {
    id: 'garden-of-ediacara',
    title: 'The Garden of Ediacara',
    spanStartMa: 635,
    spanEndMa: 538.8,
    timeMa: 575,
    narrative: 'In the aftermath of the great thaw, the seafloor blooms with quilted, frond-like beings unlike anything alive today. Dickinsonia ripples across microbial mats and Kimberella scratches the first trails — life\'s opening, gentle experiment in being large.',
  },
  {
    id: 'cambrian-explosion',
    title: 'The Cambrian Explosion',
    spanStartMa: 538.8,
    spanEndMa: 485.4,
    timeMa: 538,
    narrative: 'In an evolutionary eyeblink, nearly every modern animal body plan bursts into the fossil record. Eyes, shells, claws, and predation appear together in an arms race; among the strange wonders of these seas swims Pikaia, an unassuming relative of every backboned animal to come.',
  },
  {
    id: 'armored-seas',
    title: 'Armored Seas, First Footholds',
    spanStartMa: 485.4,
    spanEndMa: 419.2,
    timeMa: 470,
    narrative: 'Giant nautiloids cruise above trilobite-tiled seafloors and the first jawed fish appear, while the greatest invasion in history begins quietly: moss-grade plants creep onto the continents. The chapter ends in ice, as glaciation drains the shallow seas and erases most marine species.',
  },
  {
    id: 'conquest-of-land',
    title: 'The Conquest of Land',
    spanStartMa: 419.2,
    spanEndMa: 358.9,
    timeMa: 385,
    narrative: 'Forests of Archaeopteris throw the first shade, arthropods rustle in the undergrowth, and in the rivers fish like Tiktaalik do push-ups on their fins. By the chapter\'s end vertebrates have walked ashore — and the reorganized planet pays with a drawn-out marine mass extinction.',
  },
  {
    id: 'coal-and-protomammals',
    title: 'Coal Swamps & Proto-Mammals',
    spanStartMa: 358.9,
    spanEndMa: 251.9,
    timeMa: 335,
    narrative: 'Under an oxygen-rich sky, dragonflies grow to hawk size and coal forests bury the carbon of an era. Pangaea assembles and sail-backed synapsids — kin to our own ancestors — rule the drylands, until the Siberian Traps erupt and nearly end animal life entirely.',
  },
  {
    id: 'triassic-rebirth',
    title: 'Rebirth & the First Dinosaurs',
    spanStartMa: 251.9,
    spanEndMa: 201.4,
    timeMa: 243,
    narrative: 'On a nearly emptied planet, survivors like Lystrosaurus inherit whole continents. From the recovery rise two quiet dynasties at once — the first dinosaurs and the first true mammals — while pterosaurs become the first vertebrates to fly. A second volcanic catastrophe hands dinosaurs the crown.',
  },
  {
    id: 'reign-of-dinosaurs',
    title: 'Reign of the Dinosaurs',
    spanStartMa: 201.4,
    spanEndMa: 66,
    timeMa: 150,
    narrative: 'For 135 million years dinosaurs own every continent: long-necked giants, plated grazers, feathered hunters whose descendants still sing outside your window. Flowers rewire ecosystems mid-reign. It all ends in a single afternoon, when a 10-km asteroid strikes the Yucatán.',
  },
  {
    id: 'rise-of-mammals',
    title: 'Rise of the Mammals',
    spanStartMa: 66,
    spanEndMa: 7.5,
    timeMa: 60,
    narrative: 'Within ten million years of the impact, mammals radiate from rat-sized survivors into whales, bats, horses, and primates. Grasslands sweep across cooling continents, and at the savanna\'s edge, apes begin experimenting with standing upright.',
  },
  {
    id: 'human-story',
    title: 'The Human Story',
    spanStartMa: 7.5,
    spanEndMa: 0,
    timeMa: 7,
    narrative: 'A bipedal ape lineage in Africa learns to knap stone, control fire, and talk about it afterward. Through the whiplash of the ice ages, Homo sapiens spreads to every continent — and in the last twelve thousand years invents farming, cities, and the power to edit the planet itself.',
  },
];

/**
 * Bucketing rule (used for links AND the live highlight): walk chapters
 * oldest → youngest and take the first whose young edge the time has not yet
 * crossed, i.e. `t >= spanEndMa`. Young-edge-inclusive, so a boundary event
 * (End-Permian at 251.9, K-Pg at 66) lands in the chapter it *ends*.
 * Returns -1 only for an empty list.
 */
export function chapterIndexAtTime(timeMa, list = chapters) {
  for (let i = 0; i < list.length; i++) {
    if (timeMa >= list[i].spanEndMa) return i;
  }
  return list.length - 1;
}

/** The chapter object containing timeMa (derived `chapters` by default). */
export function chapterAtTime(timeMa, list = chapters) {
  const i = chapterIndexAtTime(timeMa, list);
  return i >= 0 ? list[i] : null;
}

/**
 * Pure derivation: returns a new array of chapters, each extended with
 *  - color: explicit override, else the ICS color of the period at timeMa
 *  - milestones / extinctions: bucketed by their timeMa, oldest first
 *  - speciesFirstSeen: species bucketed by appearanceMa, oldest first
 * Every source entry lands in exactly one chapter (see chapterIndexAtTime).
 */
export function deriveChapterLinks(raw, { milestones, extinctions, species }) {
  const out = raw.map((ch) => ({
    ...ch,
    color: ch.color || getPeriodAtTime(ch.timeMa).color,
    milestones: [],
    extinctions: [],
    speciesFirstSeen: [],
  }));

  const bucket = (t) => out[chapterIndexAtTime(t, out)];
  for (const m of milestones) bucket(m.timeMa).milestones.push(m);
  for (const e of extinctions) bucket(e.timeMa).extinctions.push(e);
  for (const s of species) bucket(s.appearanceMa).speciesFirstSeen.push(s);

  for (const ch of out) {
    ch.milestones.sort((a, b) => b.timeMa - a.timeMa);
    ch.extinctions.sort((a, b) => b.timeMa - a.timeMa);
    ch.speciesFirstSeen.sort((a, b) => b.appearanceMa - a.appearanceMa);
  }
  return out;
}

// Built once at module load (mirrors the species.js + speciesTaxonomy.js merge).
export const chapters = deriveChapterLinks(rawChapters, { milestones, extinctions, species });
