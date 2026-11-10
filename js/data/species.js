// Species catalogue — aggregates the per-era files under ./species/.
//
// Entry schema (every field required unless marked optional):
//   id               unique snake_case slug
//   name             display name ("Trilobites")
//   scientificName   taxon or representative genus/species, or null
//   category         key of COLORS.kingdom in ../config.js (drives marker/sidebar colour)
//   clade            id of the node in ./phylogeny.js this entry hangs from (drives the Tree view
//                    and the modal's lineage breadcrumb)
//   appearanceMa     first appearance, millions of years ago (larger = older)
//   extinctMa        last appearance in Ma, or null if the lineage is still alive
//   abundanceProfile [[Ma, 0..1], ...] oldest → youngest; first point at appearanceMa, last at
//                    extinctMa (or 0). Editorial "prominence in this story": it drives the
//                    "dominant life" ranking, marker size (map, globe, tree), the life-group share
//                    bar and the dialog's prominence curve.
//   habitat          'marine' | 'freshwater' | 'land' | 'aerial' | 'amphibious'
//                    (markers of marine entries are kept in the sea, all others on land)
//   location         { lat, lon } of a representative MODERN fossil locality
//   fossilSite       human-readable name of that locality ("Burgess Shale, British Columbia")
//   size             optional short string ("up to 12 m long, ~8 t")
//   diet             optional short string ("apex predator", "filter feeder", "photosynthesis")
//   description      one-line label (≤ 70 chars)
//   descriptionLong  2–3 sentences shown in the species dialog (the hover card shows `description`)
//
// `currentAbundance` is added at runtime by getSpeciesAtTime().

import { precambrianSpecies } from './species/precambrian.js';
import { paleozoicSpecies } from './species/paleozoic.js';
import { mesozoicSpecies } from './species/mesozoic.js';
import { cenozoicSpecies } from './species/cenozoic.js';

export const species = [
  ...precambrianSpecies,
  ...paleozoicSpecies,
  ...mesozoicSpecies,
  ...cenozoicSpecies,
];

export const speciesById = new Map(species.map((s) => [s.id, s]));

/** Is this entry alive at timeMa? (inclusive at both ends) */
export function isAlive(s, timeMa) {
  return timeMa <= s.appearanceMa && timeMa >= (s.extinctMa ?? 0);
}

/**
 * Get species alive at the given time, sorted by abundance descending.
 * Ties break on id so the ranking never flickers between frames.
 */
export function getSpeciesAtTime(timeMa) {
  const alive = [];
  for (const s of species) {
    if (!isAlive(s, timeMa)) continue;
    alive.push({ ...s, currentAbundance: interpolateAbundance(s.abundanceProfile, timeMa) });
  }
  alive.sort((a, b) => (b.currentAbundance - a.currentAbundance) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return alive;
}

/**
 * Interpolate abundance at a given time from an abundance profile
 * (sorted oldest → youngest, i.e. descending Ma).
 */
export function interpolateAbundance(profile, timeMa) {
  if (!profile || profile.length === 0) return 0;
  if (timeMa >= profile[0][0]) return profile[0][1];
  const last = profile[profile.length - 1];
  if (timeMa <= last[0]) return last[1];

  for (let i = 0; i < profile.length - 1; i++) {
    const [ma1, a1] = profile[i];
    const [ma2, a2] = profile[i + 1];
    if (timeMa <= ma1 && timeMa >= ma2) {
      if (ma1 === ma2) return a2;
      const t = (ma1 - timeMa) / (ma1 - ma2);
      return a1 + (a2 - a1) * t;
    }
  }
  return 0;
}
