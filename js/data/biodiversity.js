// Estimated total biodiversity across geological time.
// We don't have per-species coverage, so this is a coarse log-scale proxy
// keyed off published estimates of marine + terrestrial diversity.
// Returns the rough number of species alive (in thousands).

const diversityCurve = [
  [4000, 0.001],
  [3500, 0.01],
  [2500, 0.1],
  [1000, 1],
  [600, 5],
  [540, 50],     // Cambrian explosion
  [470, 200],
  [443, 100],    // End-Ordovician extinction
  [430, 300],
  [372, 150],    // Late Devonian extinction
  [320, 600],
  [252, 50],     // End-Permian (Great Dying)
  [240, 200],
  [201, 100],    // End-Triassic
  [150, 800],
  [100, 1500],
  [66, 400],     // K-Pg
  [55, 1200],
  [34, 2000],
  [10, 4000],
  [0, 8700],     // Modern estimate of catalogued species (~8.7 million)
];

export function estimatedDiversityKilo(timeMa) {
  if (timeMa >= diversityCurve[0][0]) return diversityCurve[0][1];
  if (timeMa <= diversityCurve[diversityCurve.length - 1][0]) {
    return diversityCurve[diversityCurve.length - 1][1];
  }
  for (let i = 0; i < diversityCurve.length - 1; i++) {
    const [t1, v1] = diversityCurve[i];
    const [t2, v2] = diversityCurve[i + 1];
    if (timeMa <= t1 && timeMa >= t2) {
      const a = (t1 - timeMa) / (t1 - t2);
      // Geometric (log) interpolation for a more sensible visual cadence
      return Math.exp(Math.log(v1) + (Math.log(v2) - Math.log(v1)) * a);
    }
  }
  return 0;
}

export function formatDiversity(kilo) {
  if (kilo >= 1000) return (kilo / 1000).toFixed(1) + 'M';
  if (kilo >= 1) return Math.round(kilo) + 'k';
  if (kilo >= 0.001) return Math.round(kilo * 1000) + '';
  return '~0';
}
