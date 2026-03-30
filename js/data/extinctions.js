// The Big Five mass extinction events plus notable events.

export const extinctions = [
  {
    id: 'end-ordovician',
    name: 'End-Ordovician Extinction',
    timeMa: 443.8,
    durationMa: 1.0,
    severityPercent: 86,
    cause: 'Glaciation of Gondwana, sea level drop',
    color: '#4488ff',
    affectedGroups: ['nautiloid', 'sea_scorpion', 'trilobite'],
    description: 'Severe glaciation wiped out 86% of species, primarily marine life'
  },
  {
    id: 'late-devonian',
    name: 'Late Devonian Extinction',
    timeMa: 372,
    durationMa: 2.0,
    severityPercent: 75,
    cause: 'Ocean anoxia, possible volcanic activity',
    color: '#cc6600',
    affectedGroups: ['anomalocaris', 'trilobite', 'sea_scorpion', 'nautiloid'],
    description: 'Multiple pulses of extinction over millions of years; 75% of species lost'
  },
  {
    id: 'end-permian',
    name: 'End-Permian Extinction',
    subtitle: 'The Great Dying',
    timeMa: 251.9,
    durationMa: 0.5,
    severityPercent: 96,
    cause: 'Siberian Traps volcanism, ocean anoxia, global warming',
    color: '#ff2222',
    affectedGroups: ['trilobite', 'sea_scorpion', 'dimetrodon', 'therapsid_early'],
    description: 'The most catastrophic extinction: 96% of all species obliterated'
  },
  {
    id: 'end-triassic',
    name: 'End-Triassic Extinction',
    timeMa: 201.4,
    durationMa: 0.5,
    severityPercent: 80,
    cause: 'Central Atlantic Magmatic Province volcanism',
    color: '#aa22aa',
    affectedGroups: [],
    description: '80% of species lost, clearing the way for dinosaur dominance'
  },
  {
    id: 'end-cretaceous',
    name: 'End-Cretaceous Extinction',
    subtitle: 'K-Pg Event',
    timeMa: 66,
    durationMa: 0.1,
    severityPercent: 76,
    cause: 'Chicxulub asteroid impact + Deccan Traps volcanism',
    color: '#ff8800',
    affectedGroups: ['tyrannosaurus', 'triceratops', 'spinosaurus', 'pterosaur', 'stegosaurus', 'brachiosaurus', 'archaeopteryx_lineage'],
    description: 'Asteroid impact ends the age of dinosaurs; 76% of species lost'
  }
];

/**
 * Check if an extinction event is active at the given time.
 * Returns the event object or null.
 */
export function getActiveExtinction(timeMa) {
  for (const ext of extinctions) {
    const start = ext.timeMa + ext.durationMa / 2;
    const end = ext.timeMa - ext.durationMa / 2;
    if (timeMa <= start && timeMa >= end) {
      // Calculate progress through the event (0 = just started, 1 = ending)
      const progress = (start - timeMa) / ext.durationMa;
      return { ...ext, progress };
    }
  }
  return null;
}
