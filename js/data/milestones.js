// Narrative milestones — non-extinction events worth a brief on-screen callout.
// Distinct from extinctions (which have their own overlay/shake) and from species
// (which appear in the sidebar abundance ranking). Includes events migrated out
// of species.js where they were polluting the abundance ranking as fake species.

export const milestones = [
  {
    id: 'great_oxygenation',
    timeMa: 2400,
    durationMa: 200,
    name: 'Great Oxygenation Event',
    description: 'Cyanobacterial photosynthesis floods the atmosphere with O₂ for the first time, rusting the oceans and triggering Earth\'s first mass extinction of anaerobic life.',
    color: '#66bbcc',
    category: 'climatic',
  },
  {
    id: 'first_eukaryotes_event',
    timeMa: 2100,
    durationMa: 100,
    name: 'First Eukaryotes',
    description: 'Endosymbiosis joins a host cell and an engulfed bacterium into a new kind of cell with a nucleus and mitochondria — the prerequisite for all complex life.',
    color: '#88dd99',
    category: 'biological',
  },
  {
    id: 'sturtian_snowball',
    timeMa: 715,
    durationMa: 50,
    name: 'Sturtian Snowball Earth',
    description: 'Runaway ice-albedo feedback freezes the planet from pole to pole. Glaciers reach the equator and ocean surfaces lock under kilometer-thick ice for tens of millions of years.',
    color: '#aaccff',
    category: 'climatic',
  },
  {
    id: 'marinoan_snowball',
    timeMa: 645,
    durationMa: 15,
    name: 'Marinoan Snowball Earth',
    description: 'A second global glaciation freezes Earth again. Volcanic CO₂ slowly accumulates beneath the ice; when it finally tips the climate, the thaw is sudden and violent.',
    color: '#aaccff',
    category: 'climatic',
  },
  {
    id: 'cambrian_explosion',
    timeMa: 538,
    durationMa: 18,
    name: 'Cambrian Explosion',
    description: 'Within ~20 million years almost every modern animal phylum appears in the fossil record. Hard parts, eyes, predation, and complex food webs all emerge in a single evolutionary radiation.',
    color: '#ffcc66',
    category: 'biological',
  },
  {
    id: 'plants_on_land',
    timeMa: 470,
    durationMa: 30,
    name: 'Plants Colonize Land',
    description: 'Bryophyte-grade plants creep out of freshwater margins. Their chemical weathering of rock begins drawing down atmospheric CO₂ and producing the first soils.',
    color: '#88cc66',
    category: 'biological',
  },
  {
    id: 'first_forests_event',
    timeMa: 385,
    durationMa: 25,
    name: 'First Forests',
    description: 'Archaeopteris evolves wood, deep roots, and a tree canopy, transforming continents into forested landscapes and locking up so much carbon it triggers a global cooling pulse.',
    color: '#66aa44',
    category: 'biological',
  },
  {
    id: 'pangaea_assembly',
    timeMa: 335,
    durationMa: 35,
    name: 'Pangaea Assembles',
    description: 'All major continental fragments collide into a single supercontinent stretching pole to pole. Coastal habitats shrink, continental interiors dry out, and global biogeography simplifies.',
    color: '#cc8855',
    category: 'geological',
  },
  {
    id: 'mammal_radiation',
    timeMa: 60,
    durationMa: 14,
    name: 'Mammal Radiation',
    description: 'In the empty world after the K-Pg impact, surviving mammal lineages explode into every vacated niche — bats, whales, primates, ungulates, carnivorans — within ten million years.',
    color: '#dd8844',
    category: 'biological',
  },
  {
    id: 'first_flowers_event',
    timeMa: 140,
    durationMa: 20,
    name: 'First Flowers',
    description: 'Angiosperms invent the flower and the fruit, recruiting insects and animals into reproductive labor. They will eventually displace older plant lineages and rewire terrestrial ecosystems.',
    color: '#ddaa66',
    category: 'biological',
  },
  {
    id: 'grasslands_event',
    timeMa: 25,
    durationMa: 8,
    name: 'Grasslands Spread',
    description: 'C₄ grasses, with their more efficient photosynthesis, claim vast cooling continental interiors. New savanna ecosystems drive grazer evolution and eventually shape primate origins.',
    color: '#bbcc55',
    category: 'biological',
  },
  {
    id: 'agriculture',
    timeMa: 0.012,
    durationMa: 0.012,
    name: 'Agriculture & Civilization',
    description: 'After 290,000 years as foragers, Homo sapiens begins domesticating plants and animals across multiple independent centers. Cities, writing, and industry follow within a few thousand years.',
    color: '#ee9966',
    category: 'cultural',
  },
  {
    id: 'megafauna_extinction',
    timeMa: 0.012,
    durationMa: 0.011,
    name: 'Holocene Megafauna Loss',
    description: 'Within a few millennia of human arrival on each continent, most large terrestrial mammals — mammoths, giant sloths, terror birds, Diprotodon — vanish. The pattern matches human dispersal more closely than climate.',
    color: '#cc6644',
    category: 'biological',
  },
];

const CALLOUT_FADE_MA = 0.05; // tail of milestone callout duration as fraction

/**
 * Get the milestone whose duration window contains timeMa, if any.
 * Returns the milestone object with `progress` (0 = just started, 1 = ending), or null.
 */
export function getActiveMilestone(timeMa) {
  for (const m of milestones) {
    const start = m.timeMa + m.durationMa / 2;
    const end = m.timeMa - m.durationMa / 2;
    if (timeMa <= start && timeMa >= end) {
      const progress = (start - timeMa) / m.durationMa;
      return { ...m, progress };
    }
  }
  return null;
}
