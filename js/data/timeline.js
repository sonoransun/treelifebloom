// Geological periods with temporal weights for animation compression.
// temporalWeight > 1 = slower playback (more screen time), < 1 = faster.

export const timeline = [
  // HADEAN
  { eon: 'Hadean', era: null, period: 'Hadean', startMa: 4540, endMa: 4000, color: '#d10068', temporalWeight: 0.10, description: 'Earth forming, molten surface' },

  // ARCHEAN
  { eon: 'Archean', era: 'Eoarchean', period: 'Eoarchean', startMa: 4000, endMa: 3600, color: '#da037b', temporalWeight: 0.20, description: 'Oldest rocks, first oceans' },
  { eon: 'Archean', era: 'Paleoarchean', period: 'Paleoarchean', startMa: 3600, endMa: 3200, color: '#e5067e', temporalWeight: 0.30, description: 'First life appears' },
  { eon: 'Archean', era: 'Mesoarchean', period: 'Mesoarchean', startMa: 3200, endMa: 2800, color: '#f00981', temporalWeight: 0.20, description: 'Stromatolites flourish' },
  { eon: 'Archean', era: 'Neoarchean', period: 'Neoarchean', startMa: 2800, endMa: 2500, color: '#f74370', temporalWeight: 0.35, description: 'Photosynthesis spreads, oxygen rising' },

  // PROTEROZOIC
  { eon: 'Proterozoic', era: 'Paleoproterozoic', period: 'Paleoproterozoic', startMa: 2500, endMa: 1600, color: '#f56890', temporalWeight: 0.45, description: 'Great Oxygenation Event' },
  { eon: 'Proterozoic', era: 'Mesoproterozoic', period: 'Mesoproterozoic', startMa: 1600, endMa: 1000, color: '#fda4c1', temporalWeight: 0.35, description: 'Eukaryotes diversify, Rodinia forms' },
  { eon: 'Proterozoic', era: 'Neoproterozoic', period: 'Cryogenian', startMa: 1000, endMa: 720, color: '#fec4d8', temporalWeight: 0.45, description: 'Rodinia breaks up' },
  { eon: 'Proterozoic', era: 'Neoproterozoic', period: 'Cryogenian-Snowball', startMa: 720, endMa: 635, color: '#d0e8ff', temporalWeight: 1.00, description: 'Snowball Earth glaciations' },
  { eon: 'Proterozoic', era: 'Neoproterozoic', period: 'Ediacaran', startMa: 635, endMa: 538.8, color: '#fedd9e', temporalWeight: 2.50, description: 'First large complex organisms' },

  // PHANEROZOIC - Paleozoic
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Cambrian', startMa: 538.8, endMa: 485.4, color: '#7fa056', temporalWeight: 5.50, description: 'Explosion of multicellular life' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Ordovician', startMa: 485.4, endMa: 443.8, color: '#009270', temporalWeight: 4.00, description: 'Marine life diversifies, first land plants' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Silurian', startMa: 443.8, endMa: 419.2, color: '#b3e1b6', temporalWeight: 3.50, description: 'Jawed fish, vascular plants, land arthropods' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Devonian', startMa: 419.2, endMa: 358.9, color: '#cb8c37', temporalWeight: 5.00, description: 'Age of Fishes, first forests and amphibians' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Carboniferous', startMa: 358.9, endMa: 298.9, color: '#67a599', temporalWeight: 4.00, description: 'Coal swamps, giant insects, first reptiles' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Permian', startMa: 298.9, endMa: 251.9, color: '#f04028', temporalWeight: 3.20, description: 'Pangaea forms, synapsids dominate' },

  // PHANEROZOIC - Mesozoic
  { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Triassic', startMa: 251.9, endMa: 201.4, color: '#812b92', temporalWeight: 4.00, description: 'Dinosaurs and mammals appear' },
  { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Jurassic', startMa: 201.4, endMa: 145, color: '#34b2c9', temporalWeight: 5.50, description: 'Dinosaurs dominate, Pangaea splits' },
  { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Cretaceous', startMa: 145, endMa: 66, color: '#7fc64e', temporalWeight: 5.50, description: 'Flowering plants, T. rex, asteroid impact' },

  // PHANEROZOIC - Cenozoic (epoch-level detail; parentPeriod preserves the coarser name)
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Paleocene',   parentPeriod: 'Paleogene',  startMa: 66,     endMa: 56,     color: '#fdb46c', temporalWeight: 3.00, description: 'Mammals recover from the K-Pg impact' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Eocene',      parentPeriod: 'Paleogene',  startMa: 56,     endMa: 34,     color: '#fd9a52', temporalWeight: 4.50, description: 'Greenhouse peak, early whales and primates' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Oligocene',   parentPeriod: 'Paleogene',  startMa: 34,     endMa: 23,     color: '#fec07b', temporalWeight: 3.00, description: 'Cooling, Antarctic glaciation, first grasses' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Miocene',     parentPeriod: 'Neogene',    startMa: 23,     endMa: 5.333,  color: '#ffe619', temporalWeight: 6.00, description: 'Grassland expansion, great apes diversify' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Pliocene',    parentPeriod: 'Neogene',    startMa: 5.333,  endMa: 2.58,   color: '#fff0a0', temporalWeight: 5.00, description: 'Early hominins, Panama closes, ice caps grow' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Pleistocene', parentPeriod: 'Quaternary', startMa: 2.58,   endMa: 0.0117, color: '#f9f97f', temporalWeight: 10.00, description: 'Ice ages, megafauna, rise of Homo' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Holocene',    parentPeriod: 'Quaternary', startMa: 0.0117, endMa: 0,      color: '#feebd0', temporalWeight: 5.00, description: 'Agriculture, civilization, the human epoch' },
];

/**
 * Find the geological period for a given time in Ma.
 */
export function getPeriodAtTime(timeMa) {
  for (const period of timeline) {
    if (timeMa <= period.startMa && timeMa > period.endMa) {
      return period;
    }
  }
  // Edge cases
  if (timeMa >= timeline[0].startMa) return timeline[0];
  return timeline[timeline.length - 1];
}

/**
 * Get temporal weight at a given time.
 */
export function getTemporalWeight(timeMa) {
  const period = getPeriodAtTime(timeMa);
  return period ? period.temporalWeight : 1.0;
}
