// The Big Five mass extinction events.
// description and cause are surfaced in the on-screen overlay; keep them rich but ≤ ~280 chars.

export const extinctions = [
  {
    id: 'end-ordovician',
    name: 'End-Ordovician Extinction',
    timeMa: 443.8,
    durationMa: 1.0,
    severityPercent: 86,
    cause: 'Rapid glaciation of Gondwana lowered sea levels by 100+ meters, destroying the shallow tropical reef habitats where most life lived. A second pulse came as the ice sheets melted and oxygen-poor waters flooded back across the continental shelves.',
    color: '#4488ff',
    affectedGroups: ['nautiloid', 'sea_scorpion', 'trilobite'],
    description: 'Two glaciation pulses wiped out 86% of species — almost entirely marine, since complex life had not yet conquered the land.'
  },
  {
    id: 'late-devonian',
    name: 'Late Devonian Extinction',
    timeMa: 372,
    durationMa: 2.0,
    severityPercent: 75,
    cause: 'A prolonged cascade of regional crises — ocean anoxia spreading from depth, episodic cooling, and possible volcanic or meteorite triggers. The newly evolved deep-rooted forests may have accelerated weathering, draining nutrients into the oceans and triggering algal blooms that suffocated reef ecosystems.',
    color: '#cc6600',
    affectedGroups: ['anomalocaris', 'trilobite', 'sea_scorpion', 'nautiloid', 'dunkleosteus'],
    description: 'A multi-million-year cascade ended the placoderms and reef-builders; 75% of species were lost in pulses rather than a single blow.'
  },
  {
    id: 'end-permian',
    name: 'End-Permian Extinction',
    subtitle: 'The Great Dying',
    timeMa: 251.9,
    durationMa: 0.5,
    severityPercent: 96,
    cause: 'Million-year flood basalt eruptions of the Siberian Traps released enormous volumes of CO₂ and SO₂, warming the climate by 8–10°C. Ocean acidification, near-total seafloor anoxia, and possible methane hydrate destabilization combined into a runaway greenhouse — the worst environmental catastrophe in the rock record.',
    color: '#ff2222',
    affectedGroups: ['trilobite', 'sea_scorpion', 'dimetrodon', 'edaphosaurus', 'therapsids'],
    description: 'Earth\'s closest brush with sterilization — 96% of marine species and 70% of land vertebrates erased in under a million years.'
  },
  {
    id: 'end-triassic',
    name: 'End-Triassic Extinction',
    timeMa: 201.4,
    durationMa: 0.5,
    severityPercent: 80,
    cause: 'The Central Atlantic Magmatic Province eruptions — coinciding with the splitting of Pangaea — released massive CO₂ pulses that acidified oceans and crashed reef ecosystems. The collapse of competing crocodile-line reptiles cleared the way for dinosaurs to take over terrestrial niches.',
    color: '#aa22aa',
    affectedGroups: [],
    description: 'CAMP volcanism along the opening Atlantic killed 80% of species and handed the Mesozoic world to the dinosaurs.'
  },
  {
    id: 'end-cretaceous',
    name: 'End-Cretaceous Extinction',
    subtitle: 'K-Pg Event',
    timeMa: 66,
    durationMa: 0.1,
    severityPercent: 76,
    cause: 'A 10-km asteroid struck the Yucatán at Chicxulub, vaporizing carbonate rock into a global sulfur aerosol veil. A thermal pulse from re-entering ejecta ignited continental wildfires within minutes, then years of impact winter collapsed photosynthesis. The Deccan Traps eruptions in India had already weakened ecosystems beforehand.',
    color: '#ff8800',
    affectedGroups: ['tyrannosaurus', 'triceratops', 'spinosaurus', 'pterosaur', 'stegosaurus', 'brachiosaurus', 'quetzalcoatlus', 'archaeopteryx'],
    description: 'A 10-km asteroid + impact winter ended every non-avian dinosaur and ~76% of all species in geological seconds.'
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
