// How many species were alive? An ILLUSTRATIVE log-scale index of the estimated number of living
// species (eukaryotes only: animals, plants, fungi, protists), in thousands, anchored to Mora et al.
// 2011 at the present. It is not a published reconstruction.
//
// What is real:
//   - The end point: about 8.7 million eukaryote species are estimated to exist today, give or take
//     1.3 million (Mora et al. 2011, PLoS Biol. 9: e1001127). That is an estimate of the total, not
//     a catalogue: about 2.2 million species are catalogued today (Catalogue of Life 2025; it held
//     ~1.2 million when Mora et al. wrote). Bacteria and archaea are not counted.
//   - The shape after 540 Ma: it follows the marine genus curves of the fossil record — Cambrian
//     and Ordovician radiations, a long Paleozoic plateau, a low after the end-Permian extinction
//     and a rise to the present (Sepkoski 2002, Bull. Am. Paleontol. 363; Alroy et al. 2008,
//     Science 321: 97) — with life on land added on top from the Devonian and, above all, since
//     the Cretaceous spread of flowering plants and their insects. Nothing supports a doubling of
//     global richness in the last 10 Myr, so the final rise is gentle.
//   - The falls at the five mass extinctions: each is about as deep as the share of marine species
//     lost that the extinction cards give (~85, 75, 90, 78 and 76 %; after Barnosky et al. 2011,
//     Nature 471: 51, Table 1, and Dal Corso et al. 2022, Nat. Rev. Earth Environ. 3: 197, for the
//     end-Permian). Diversity holds until the event and drops AT it: every Big Five date in
//     js/data/extinctions.js is bracketed by a knot just before and the low just after, inside the
//     event's window.
// What is not: the absolute numbers before the present. Nobody knows how many species lived in the
//   Devonian; the values are right, at best, to an order of magnitude.
//
// Until the first communities of large organisms (~574 Ma, well into the Ediacaran) no count is
// offered at all. Life was microbial or nearly so, and microbial "species" cannot be counted
// this way. The curve then carries a PLACEHOLDER below 1 (thousand), not an
// estimate, and formatDiversity() prints words instead of a number:
//   0                  → "none"            before 3.7 Ga: no accepted evidence of life
//   0 < value < 0.5    → "microbes only"   bacteria and archaea (oldest, debated, traces ~3.7 Ga)
//   0.5 ≤ value < 1    → "mostly microbes" from the first eukaryote fossils (~1.65 Ga)
//   value ≥ 1          → a rounded count   from the first communities of large organisms (~574 Ma)
// Callers that know the time should prefer formatDiversityAt(timeMa).

/** Ages (Ma) at which the read-out changes kind. */
export const DIVERSITY_ERAS = {
  lifeFromMa: 3700,        // oldest (debated) traces of life: Isua, Greenland
  eukaryotesFromMa: 1650,  // oldest widely accepted eukaryote fossils
  countableFromMa: 574,    // Avalon assemblage: the first communities of large organisms
};

// [timeMa, estimated living species in thousands]; geometric (log) interpolation between knots.
const diversityCurve = [
  [4540, 0],
  [3705, 0],
  [3700, 0.25],    // placeholder: microbes only
  [1700, 0.25],
  [1650, 0.6],     // placeholder: mostly microbes
  [600, 0.6],
  [574, 1],        // Ediacaran biota
  [550, 5],
  [538.8, 4],      // end-Ediacaran turnover
  [530, 15],       // Cambrian explosion
  [518, 45],
  [513, 60],
  [509, 45],       // early Cambrian (Botomian–Toyonian) extinctions
  [490, 60],
  [470, 200],      // Great Ordovician Biodiversification Event
  [455, 240],
  [445.2, 260],
  [444.8, 120],    // end-Ordovician, first pulse (glaciation)
  [443.9, 110],
  [443.1, 39],     // second pulse (deglaciation): −85 % in all
  [438, 110],
  [430, 300],
  [420, 330],
  [400, 360],
  [385, 380],
  [373, 380],
  [371, 95],       // Late Devonian (Kellwasser): −75 %
  [366, 130],
  [359.2, 170],
  [358.6, 120],    // end-Devonian (Hangenberg)
  [340, 300],
  [320, 600],      // coal forests; insects take to the air
  [300, 620],
  [275, 650],
  [259.8, 660],
  [259.2, 500],    // end-Capitanian
  [254, 560],
  [252.2, 600],
  [251.7, 60],     // end-Permian: −90 %
  [249, 70],
  [245, 120],
  [240, 200],
  [232, 280],
  [210, 340],
  [201.7, 350],
  [201.2, 77],     // end-Triassic: −78 %
  [199, 120],
  [190, 300],
  [183.2, 400],
  [182.7, 340],    // Toarcian
  [175, 450],
  [165, 600],
  [150, 800],
  [125, 1100],
  [100, 1500],     // flowering plants and their insects
  [94, 1550],
  [93.6, 1400],    // Cenomanian–Turonian
  [85, 1650],
  [70, 1800],
  [66.05, 1800],
  [65.95, 432],    // end-Cretaceous: −76 %
  [65, 550],
  [62, 800],
  [55, 1200],
  [45, 1650],
  [34, 2000],
  [33.5, 1850],    // Eocene–Oligocene turnover
  [23, 3600],
  [15, 5600],
  [10, 7500],
  [5, 8200],
  [2.6, 8500],
  [0.05, 8700],
  // Mora et al. 2011: ~8.7 million eukaryote species estimated to exist (~1.2 million then
  // catalogued; ~2.2 million in the Catalogue of Life today)
  [0, 8700],
];

/** Estimated number of living species at timeMa, in thousands (see the caveats above). */
export function estimatedDiversityKilo(timeMa) {
  const curve = diversityCurve;
  const last = curve.length - 1;
  if (!(timeMa < curve[0][0])) return curve[0][1];
  if (timeMa <= curve[last][0]) return curve[last][1];

  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (curve[mid][0] >= timeMa) lo = mid;
    else hi = mid;
  }
  const [t1, v1] = curve[lo];
  const [t2, v2] = curve[hi];
  const a = (t1 - timeMa) / (t1 - t2);
  // Geometric interpolation suits a quantity that spans orders of magnitude; it cannot start from
  // zero, so the segment that leaves zero is linear.
  if (v1 <= 0 || v2 <= 0) return v1 + (v2 - v1) * a;
  return Math.exp(Math.log(v1) + (Math.log(v2) - Math.log(v1)) * a);
}

/** Is a species count meaningful at timeMa? (false while life is microbial) */
export function isDiversityCountable(timeMa) {
  return timeMa <= DIVERSITY_ERAS.countableFromMa;
}

/**
 * Human-readable diversity for a value from estimatedDiversityKilo().
 * Counts are rounded to two significant figures: "8.7M", "260k", "4.5k".
 */
export function formatDiversity(kilo) {
  if (!(kilo > 0)) return 'none';
  if (kilo < 0.5) return 'microbes only';
  if (kilo < 1) return 'mostly microbes';
  const species = kilo * 1000;
  const magnitude = 10 ** (Math.floor(Math.log10(species)) - 1);
  const rounded = Math.round(species / magnitude) * magnitude;
  if (rounded >= 1e6) return `${trim(rounded / 1e6)}M`;
  return `${trim(rounded / 1e3)}k`;
}

/** Same read-out, straight from the time. */
export function formatDiversityAt(timeMa) {
  return formatDiversity(estimatedDiversityKilo(timeMa));
}

function trim(n) {
  return String(Number(n.toPrecision(2)));
}

// Exported for sparklines: use a log axis and clamp to ≥ 1 (the values below 1 are placeholders,
// and the curve is 0 before life).
export const BIODIVERSITY_CURVE = diversityCurve;
