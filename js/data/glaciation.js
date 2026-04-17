// Polar ice cap extent over geological time.
// Returns { northCapLatRadius, southCapLatRadius, alpha }
// where capLatRadius is degrees of latitude from the pole that the cap covers
// (e.g. 10 = caps reach to 80° lat; 80 = caps reach almost to equator).

import { GLACIATION } from '../config.js';
import { getTemperatureAtTime } from './atmosphere.js';

// Discrete glacial periods that override or amplify temperature-driven caps.
// Each: { startMa, endMa, north, south, alpha } — overrides applied if active.
const glacialPeriods = [
  // Huronian glaciation
  { startMa: 2400, endMa: 2100, north: 45, south: 50, alpha: 0.7 },
  // Sturtian Snowball
  { startMa: 720,  endMa: 660,  north: 80, south: 80, alpha: 0.85 },
  // Marinoan Snowball
  { startMa: 650,  endMa: 635,  north: 80, south: 80, alpha: 0.85 },
  // Andean-Saharan glaciation (end-Ordovician)
  { startMa: 460,  endMa: 430,  north: 10, south: 60, alpha: 0.6 },
  // Karoo Ice Age (Permo-Carboniferous)
  { startMa: 360,  endMa: 260,  north: 5,  south: 55, alpha: 0.7 },
  // Cenozoic Antarctic glaciation (Antarctic ice cap forms)
  { startMa: 34,   endMa: 0,    north: 0,  south: 25, alpha: 0.75 },
  // Pleistocene Northern Hemisphere ice sheets
  { startMa: 2.6,  endMa: 0.012, north: 35, south: 30, alpha: 0.85 },
  // Holocene — modern Greenland + Antarctic caps (smaller, persistent)
  { startMa: 0.012, endMa: 0,    north: 7,  south: 25, alpha: 0.7 },
];

export function getGlaciation(timeMa) {
  // Default: temperature-driven baseline.
  const tempC = getTemperatureAtTime(timeMa);
  let baseline = 0;
  if (tempC <= GLACIATION.coldThresholdC) {
    const t = Math.min(1, (GLACIATION.coldThresholdC - tempC) / 10);
    baseline = GLACIATION.maxCapLatRadius * t;
  } else if (tempC < GLACIATION.warmThresholdC) {
    const t = (GLACIATION.warmThresholdC - tempC) / (GLACIATION.warmThresholdC - GLACIATION.coldThresholdC);
    baseline = 18 * t;
  }

  let north = baseline;
  let south = baseline;
  let alpha = baseline > 5 ? Math.min(0.7, baseline / 50) : 0;

  // Layer in discrete glacial periods (use the strongest active).
  for (const g of glacialPeriods) {
    if (timeMa <= g.startMa && timeMa >= g.endMa) {
      const span = g.startMa - g.endMa;
      const fadeMa = Math.max(span * 0.1, 0.5);
      // Fade in over the leading edge; fade out only if the period actually ended
      // before the present (extant glaciations like Antarctic & Pleistocene stay strong).
      const intoStart = Math.min(1, (g.startMa - timeMa) / fadeMa);
      const intoEnd = g.endMa <= 0.02
        ? 1
        : Math.min(1, (timeMa - g.endMa) / fadeMa);
      const ramp = Math.min(intoStart, intoEnd);
      north = Math.max(north, g.north * ramp);
      south = Math.max(south, g.south * ramp);
      alpha = Math.max(alpha, g.alpha * ramp);
    }
  }

  return {
    northCapLatRadius: Math.min(north, 85),
    southCapLatRadius: Math.min(south, 85),
    alpha: Math.min(alpha, 0.9),
  };
}
