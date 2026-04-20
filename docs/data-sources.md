# Data sources

The visualization is driven by hand-curated data files, each backed by published paleo records. The numbers are simplifications suitable for animation — not research-grade reconstructions.

## Continental reconstructions

`js/data/continents.js` — 12 time slices from 4000 Ma to present, hand-traced as simplified polygons.

The reconstructions broadly follow:

- **Scotese, C. R.** PALEOMAP project (paleomap.com) — coverage from 600 Ma onward.
- **Domeier, M. & Torsvik, T. H.** (2014) "Plate tectonics in the late Paleozoic" — for Pangaea assembly and breakup.
- **Li, Z. X. et al.** (2008) "Assembly, configuration, and break-up history of Rodinia: A synthesis" — Neoproterozoic supercontinent.
- **Bleeker, W.** (2003) "The late Archean record: a puzzle in ca. 35 pieces" — Archean cratons.

For each slice we keep ~15–30 vertices per continent. Adjacent slices use matched vertex counts when continent identity is preserved; when continents split or merge across slices, the interpolator handles the topology change.

## Geological periods

`js/data/timeline.js` — 26 periods covering eons / eras / periods / select epochs.

- Boundaries follow the **International Commission on Stratigraphy (ICS)** chronostratigraphic chart (latest revision).
- Period colors use the official **ICS color codes**.
- The Cenozoic is split to epoch level (Paleocene, Eocene, Oligocene, Miocene, Pliocene, Pleistocene, Holocene) since recent time gets disproportionate screen time.

The `temporalWeight` field is editorial, not from any source — it controls how slowly the clock advances through each period. Tuned so that the Cambrian explosion, Mesozoic radiations, and Pleistocene get more screen time than the Boring Billion.

## Mass extinctions

`js/data/extinctions.js` — the Big Five.

- Severity percentages from **Raup, D. M. & Sepkoski, J. J.** (1982) and updated meta-analyses (e.g., **Stanley, S. M.** 2016).
- Cause descriptions synthesize standard textbook explanations: Siberian Traps for end-Permian, Chicxulub + Deccan for K-Pg, Central Atlantic Magmatic Province for end-Triassic, etc.
- The 2-second hard pause and 0.3× slowdown are editorial — they exist to give the viewer time to read the overlay.

## Species & abundance profiles

`js/data/species.js` — 119 species + milestone events, each with an `abundanceProfile` of `[Ma, abundance]` pairs.

Profiles are illustrative, not quantitative — designed so the sidebar's "dominant life" ranking moves through plausible successions (Stromatolites → trilobites → fish → tetrapods → dinosaurs → mammals → hominins). First-appearance and last-appearance dates loosely follow:

- **Benton, M. J.** (2015) *Vertebrate Palaeontology*, 4th ed. — for vertebrate clades.
- **Cohen, K. M. et al.** (2013) "The ICS International Chronostratigraphic Chart" — for Phanerozoic boundaries.
- **Knoll, A. H.** (2014) *Life on a Young Planet* — for Precambrian life.
- The fossil record literature in general — e.g. **PBDB** (Paleobiology Database) entries for individual taxa.

Locations are paleogeographically plausible but approximate.

## Atmosphere

`js/data/atmosphere.js` — three curves.

- **Temperature:** composite based on **Scotese, C. R. & Wright, N.** (2018) "PALEOMAP Paleotemperature Summary".
- **O₂ (atmospheric):** **Lyons, T. W., Reinhard, C. T. & Planavsky, N. J.** (2014) "The rise of oxygen in Earth's early ocean and atmosphere" — including the GOE step and the Carboniferous peak.
- **CO₂:** composite from **Foster, G. L., Royer, D. L. & Lunt, D. J.** (2017) "Future climate forcing potentially without precedent in the last 420 million years" plus deeper-time estimates from **Krissansen-Totton, J. et al.** (2018).

Curves are smoothed for animation — sharp millennial-scale events are deliberately blunted.

## Seismic activity

`js/data/seismicActivity.js` — qualitative curve reflecting plate-tectonic intensity (supercontinent assembly/breakup periods spike, "Boring Billion" troughs).

Editorial; no single source. Loosely follows the literature on supercontinent cycles (e.g. **Mitchell, R. N. et al.** 2021 on the supercontinent cycle and Earth-system feedbacks).

## Glaciation

`js/data/glaciation.js` — polar ice-cap latitude radius derived from the temperature curve, with the `coldThresholdC` / `warmThresholdC` mapping defined in `js/config.js`. Snowball Earth gets explicit treatment via temperature lows.

## Plate boundaries

`js/data/plateBoundaries.js` (or similar) — divergent / convergent / transform polylines per time slice. Hand-traced following the same reconstruction sources as continents above.

## A note on accuracy

This is a **visualization**, not a research tool. Numbers are tuned for legibility and pacing. Where the educational story conflicts with publication-grade nuance, the story wins — the goal is to leave a viewer with an intuitive grasp of Earth's deep-time arc, not to reproduce contested boundary dates to the kilo-year.

If you want to refine a curve, edit the data file and reload — there is no build step.
