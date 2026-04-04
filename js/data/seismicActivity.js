// Seismic/tectonic activity level across geological time.
// Values are 0-1 normalized intensity, based on plate tectonic reconstructions.

import { interpolateFromCurve } from './atmosphere.js';

// [timeMa, seismicActivityLevel (0-1)]
const seismicCurve = [
  [4000, 0.9],   // Hadean: extreme activity, planetary formation, magma ocean
  [3800, 0.75],  // Late bombardment, crust solidifying
  [3500, 0.5],   // Early Archean, first stable crust
  [3000, 0.45],  // Mid-Archean, greenstone belt tectonics
  [2700, 0.6],   // Neoarchean, active rifting and craton assembly
  [2400, 0.4],   // Early Paleoproterozoic, relative quiet
  [2100, 0.35],  // Boring billion beginning
  [1800, 0.3],   // Boring billion, minimal tectonic activity
  [1200, 0.5],   // Rodinia assembly beginning
  [1100, 0.7],   // Rodinia assembly — Grenville orogeny
  [1000, 0.5],   // Rodinia stable
  [900, 0.45],   // Rodinia stable
  [750, 0.8],    // Rodinia breakup — massive rifting
  [635, 0.5],    // Post-snowball stabilization
  [540, 0.65],   // Gondwana assembly, Iapetus opening
  [500, 0.55],   // Early Ordovician
  [430, 0.5],    // Iapetus closing, Caledonian orogeny begins
  [400, 0.55],   // Acadian orogeny
  [350, 0.6],    // Carboniferous convergence
  [300, 0.7],    // Pangaea assembly — Variscan/Appalachian orogeny
  [250, 0.4],    // Pangaea stable, mostly interior
  [200, 0.8],    // Pangaea breakup begins — CAMP volcanism
  [150, 0.7],    // Active Atlantic rifting, Tethys subduction
  [100, 0.6],    // Cretaceous subduction zones active
  [66, 0.65],    // Deccan Traps, active Pacific subduction
  [55, 0.5],     // India-Asia collision beginning
  [40, 0.7],     // India-Asia collision peak, Alpine orogeny
  [20, 0.65],    // Ring of Fire maturing
  [5, 0.7],      // Active modern tectonics building
  [0, 0.65],     // Present day
];

export function getSeismicActivityAtTime(timeMa) {
  return interpolateFromCurve(seismicCurve, timeMa);
}
