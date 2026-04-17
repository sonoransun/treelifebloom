// Historical atmospheric and temperature data across geological time.
// Values are approximate, based on published paleoclimate reconstructions.

// [timeMa, globalAvgTempC]
const temperatureCurve = [
  [4000, 70],   // Hot early Earth, magma ocean cooling
  [3800, 55],   // Late bombardment era
  [3500, 40],   // Early Archean, still very warm
  [3000, 30],   // Mid-Archean
  [2700, 25],   // Neoarchean
  [2400, 22],   // Early Paleoproterozoic
  [2300, 8],    // Huronian glaciation
  [2100, 22],   // Post-Huronian recovery
  [1800, 25],   // Mesoproterozoic warmth
  [1100, 22],   // Rodinia assembled
  [900, 20],    // Pre-Cryogenian
  [720, -2],    // Sturtian Snowball Earth onset
  [660, 25],    // Post-Sturtian interglacial
  [650, -5],    // Marinoan Snowball Earth
  [635, 28],    // Post-Marinoan greenhouse
  [580, 22],    // Ediacaran
  [540, 21],    // Cambrian
  [500, 25],    // Late Cambrian warmth
  [460, 22],    // Ordovician
  [445, 11],    // End-Ordovician glaciation
  [430, 16],    // Silurian recovery
  [400, 20],    // Early Devonian
  [370, 20],    // Late Devonian
  [350, 16],    // Early Carboniferous cooling
  [320, 14],    // Permo-Carboniferous glaciation
  [300, 12],    // Late Carboniferous ice age
  [280, 14],    // Late Carboniferous/Permian transition
  [260, 18],    // Mid-Permian warming
  [252, 28],    // End-Permian thermal spike (Great Dying)
  [250, 24],    // Early Triassic hothouse
  [230, 20],    // Mid-Triassic
  [200, 17],    // End-Triassic
  [180, 16],    // Early Jurassic
  [150, 17],    // Late Jurassic
  [120, 19],    // Early Cretaceous
  [100, 22],    // Mid-Cretaceous warmth
  [90, 23],     // Turonian thermal maximum
  [66, 18],     // End-Cretaceous
  [55, 24],     // PETM / Eocene thermal maximum
  [40, 20],     // Mid-Eocene
  [34, 14],     // Eocene-Oligocene cooling (Antarctic ice)
  [20, 16],     // Miocene warmth
  [14, 14],     // Mid-Miocene cooling
  [5, 13],      // Pliocene
  [2.5, 10],    // Early Quaternary ice ages
  [0.8, 8],     // Mid-Pleistocene glacials
  [0.02, 6],    // Last Glacial Maximum
  [0.01, 12],   // Holocene warming
  [0, 15],      // Present day
];

// [timeMa, O2 percent of atmosphere]
const oxygenCurve = [
  [4000, 0],      // Anoxic early atmosphere
  [3500, 0],      // Still no free O2
  [2800, 0.01],   // Trace O2 from early photosynthesizers
  [2450, 0.02],   // Just before Great Oxygenation Event
  [2400, 1],      // GOE begins
  [2200, 3],      // GOE plateau
  [2000, 2],      // Slight O2 drawdown
  [1800, 2],      // Boring billion, low O2
  [1200, 2],      // Mid-Proterozoic
  [1000, 3],      // Slight rise
  [800, 3],       // Neoproterozoic
  [720, 2],       // Snowball Earth O2 dip
  [635, 5],       // Post-Snowball oxygenation
  [580, 8],       // Neoproterozoic Oxygenation Event
  [540, 13],      // Cambrian
  [500, 15],      // Late Cambrian
  [460, 14],      // Ordovician
  [430, 14],      // Silurian
  [400, 15],      // Devonian
  [370, 17],      // Late Devonian forest expansion
  [350, 25],      // Carboniferous O2 rise
  [320, 30],      // Carboniferous peak forest
  [300, 32],      // Late Carboniferous maximum
  [280, 28],      // Early Permian decline
  [260, 23],      // Mid-Permian
  [252, 16],      // End-Permian crash
  [250, 16],      // Early Triassic low
  [230, 17],      // Mid-Triassic recovery
  [200, 16],      // Late Triassic
  [180, 20],      // Early Jurassic
  [150, 26],      // Late Jurassic
  [120, 28],      // Early Cretaceous
  [100, 30],      // Mid-Cretaceous
  [80, 28],       // Late Cretaceous
  [66, 26],       // End-Cretaceous
  [50, 24],       // Eocene
  [30, 23],       // Oligocene
  [20, 22],       // Miocene
  [10, 21],       // Late Miocene
  [0, 21],        // Present day
];

// [timeMa, CO2 ppm]
const co2Curve = [
  [4000, 100000],   // Massive early CO2 atmosphere
  [3500, 50000],    // Declining but still enormous
  [3000, 25000],    // Archean
  [2700, 15000],    // Neoarchean
  [2400, 10000],    // Pre-GOE
  [2200, 5000],     // Post-GOE drawdown
  [2000, 5000],     // Paleoproterozoic
  [1800, 4000],     // Mesoproterozoic
  [1100, 3000],     // Late Mesoproterozoic
  [900, 2500],      // Tonian
  [800, 2000],      // Pre-Cryogenian
  [720, 800],       // Sturtian glaciation onset (CO2 drawdown)
  [660, 12000],     // Post-Sturtian greenhouse spike
  [650, 600],       // Marinoan glaciation (CO2 drawdown)
  [635, 15000],     // Post-Marinoan cap carbonate greenhouse
  [580, 4000],      // Late Ediacaran
  [540, 5000],      // Cambrian
  [500, 6000],      // Late Cambrian
  [460, 4500],      // Ordovician
  [445, 4000],      // End-Ordovician
  [430, 4500],      // Silurian
  [400, 3000],      // Early Devonian
  [370, 2200],      // Late Devonian
  [350, 800],       // Carboniferous drawdown
  [320, 400],       // Late Carboniferous low
  [300, 300],       // Carboniferous minimum
  [280, 350],       // Early Permian
  [260, 800],       // Mid-Permian rise
  [252, 2500],      // End-Permian volcanic CO2
  [250, 2000],      // Early Triassic
  [230, 1500],      // Mid-Triassic
  [200, 2000],      // End-Triassic (CAMP volcanism)
  [180, 1500],      // Early Jurassic
  [150, 1200],      // Late Jurassic
  [120, 1200],      // Early Cretaceous
  [100, 1000],      // Mid-Cretaceous
  [80, 800],        // Late Cretaceous
  [66, 600],        // End-Cretaceous
  [55, 800],        // PETM spike
  [40, 500],        // Mid-Eocene
  [34, 400],        // Eocene-Oligocene boundary
  [20, 350],        // Miocene
  [10, 300],        // Late Miocene
  [5, 380],         // Pliocene
  [2.5, 300],       // Pleistocene
  [0, 280],         // Pre-industrial present
];

/**
 * Interpolate a value from a curve at a given time.
 * Curve is an array of [timeMa, value] sorted descending by time.
 */
export function interpolateFromCurve(curve, timeMa) {
  if (timeMa >= curve[0][0]) return curve[0][1];
  if (timeMa <= curve[curve.length - 1][0]) return curve[curve.length - 1][1];

  for (let i = 0; i < curve.length - 1; i++) {
    const [t1, v1] = curve[i];
    const [t2, v2] = curve[i + 1];
    if (timeMa <= t1 && timeMa >= t2) {
      const alpha = (t1 - timeMa) / (t1 - t2);
      return v1 + (v2 - v1) * alpha;
    }
  }
  return curve[0][1];
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

// Exported curves for sparkline rendering.
export const ATMOSPHERE_CURVES = {
  temperature: temperatureCurve,
  oxygen: oxygenCurve,
  co2: co2Curve,
};
