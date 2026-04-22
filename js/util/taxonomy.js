// Taxonomy-aware helpers shared across the UI and views.
// All species entries carry a `taxonomy` object (domain → species, as curated in
// js/data/speciesTaxonomy.js) plus a `rank` naming the level the entry actually
// represents. Ranks below `rank` are null by design.

import { COLORS } from '../config.js';

export const RANKS = ['domain', 'kingdom', 'classOrPhylum', 'order', 'family', 'genus', 'species'];

export const RANK_LABELS = {
  domain: 'Domain',
  kingdom: 'Kingdom',
  classOrPhylum: 'Class / Phylum',
  order: 'Order',
  family: 'Family',
  genus: 'Genus',
  species: 'Species',
};

const DEFAULT_COLOR = '#aaaaaa';

// Color lookup: family override → order override → classOrPhylum → kingdom → domain → default.
// This lets us color most clades by classOrPhylum while still giving Primates / Hominidae
// their distinctive "we're almost home" palette at the end of the timeline.
export function cladeColor(sp) {
  const t = sp && sp.taxonomy;
  if (!t) return DEFAULT_COLOR;
  const ov = COLORS.cladeOverride || {};
  const clade = COLORS.clade || {};
  if (t.family && ov[t.family]) return ov[t.family];
  if (t.order && ov[t.order]) return ov[t.order];
  if (t.classOrPhylum && clade[t.classOrPhylum]) return clade[t.classOrPhylum];
  if (t.kingdom && clade[t.kingdom]) return clade[t.kingdom];
  if (t.domain && clade[t.domain]) return clade[t.domain];
  return DEFAULT_COLOR;
}

// Full lineage, one entry per non-null rank. Used by the modal ladder and
// popup one-liner. `isSelf` marks the rank that this entry actually represents.
export function lineageLabels(sp) {
  const t = sp && sp.taxonomy;
  if (!t) return [];
  const selfRank = sp.rank;
  const out = [];
  for (const rank of RANKS) {
    const value = t[rank];
    if (value == null) continue;
    out.push({
      rank,
      label: RANK_LABELS[rank],
      value,
      isSelf: rank === selfRank,
    });
  }
  return out;
}

// Depth of the most-recent common rank where both lineages have equal, non-null values.
// 7 = same species epithet (same genus+species), 6 = same genus, 5 = same family, ...
// 1 = same domain, 0 = no shared rank.
export function sharedRankDepth(a, b) {
  const ta = a && a.taxonomy;
  const tb = b && b.taxonomy;
  if (!ta || !tb) return 0;
  let depth = 0;
  for (let i = 0; i < RANKS.length; i++) {
    const rank = RANKS[i];
    const va = ta[rank];
    const vb = tb[rank];
    if (va == null || vb == null) continue;
    if (va === vb) depth = i + 1;
  }
  return depth;
}

// Temporal tiebreaker: positive if the two life-spans overlap (size of overlap);
// negative if they don't (negative distance between midpoints). Bigger wins.
export function temporalTiebreak(a, b) {
  const aEnd = a.extinctMa == null ? 0 : a.extinctMa;
  const bEnd = b.extinctMa == null ? 0 : b.extinctMa;
  const overlap = Math.min(a.appearanceMa, b.appearanceMa) - Math.max(aEnd, bEnd);
  if (overlap > 0) return overlap;
  const aMid = (a.appearanceMa + aEnd) / 2;
  const bMid = (b.appearanceMa + bEnd) / 2;
  return -Math.abs(aMid - bMid);
}

// Rank closest relatives for a species, using lineage distance as primary key and
// temporal overlap as tiebreaker. `minShare = 1` keeps the list from padding with
// entries that share only "Life on Earth" in common.
export function relativesOf(sp, candidates, { limit = 6, minShare = 1 } = {}) {
  const scored = [];
  for (const cand of candidates) {
    if (cand.id === sp.id) continue;
    const share = sharedRankDepth(sp, cand);
    if (share < minShare) continue;
    const tie = temporalTiebreak(sp, cand);
    scored.push({ cand, share, tie });
  }
  scored.sort((x, y) => y.share - x.share || y.tie - x.tie);
  return scored.slice(0, limit).map((s) => s.cand);
}

// 2D rim-ring predicate — replaces the hardcoded `advancedClades` Set.
// Mammals and birds get a rim ring ONCE they have resolved to order level or deeper,
// which keeps "stem" mammalian/avian entries (Mammalia itself, Aves itself) without
// the extra flourish while highlighting the populated modern-clade radiation.
export function hasRimRing(sp) {
  const t = sp && sp.taxonomy;
  if (!t) return false;
  const cls = t.classOrPhylum;
  return (cls === 'Mammalia' || cls === 'Aves') && t.order != null;
}

// Full binomial string when the entry resolves to genus+species; else the most
// specific non-null rank value. Used by the popup/modal self-row rendering.
export function formalName(sp) {
  const t = sp && sp.taxonomy;
  if (!t) return sp?.scientificName || sp?.name || '';
  if (t.genus && t.species) return `${t.genus} ${t.species}`;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const v = t[RANKS[i]];
    if (v != null) return v;
  }
  return sp.scientificName || sp.name || '';
}
