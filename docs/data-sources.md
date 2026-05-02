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

`js/data/species.js` — 155 species, each with an `abundanceProfile` of `[Ma, abundance]` pairs.

Profiles are illustrative, not quantitative — designed so the sidebar's "dominant life" ranking moves through plausible successions (Stromatolites → trilobites → fish → tetrapods → dinosaurs → mammals → hominins). First-appearance and last-appearance dates loosely follow:

- **Benton, M. J.** (2015) *Vertebrate Palaeontology*, 4th ed. — for vertebrate clades.
- **Cohen, K. M. et al.** (2013) "The ICS International Chronostratigraphic Chart" — for Phanerozoic boundaries.
- **Knoll, A. H.** (2014) *Life on a Young Planet* — for Precambrian life.
- The fossil record literature in general — e.g. **PBDB** (Paleobiology Database) entries for individual taxa.

Locations are paleogeographically plausible but approximate.

### Recent-discovery additions (post-2010 paleontology)

A batch of ~36 species added later draws from primary literature published since 2010, much of it summarized in popular outlets but cited here in shortened form for traceability:

- **Berger, L. R. et al.** (2015) "Homo naledi, a new species of the genus Homo" *eLife* — `homo_naledi`.
- **Détroit, F. et al.** (2019) "A new species of Homo from the Late Pleistocene of the Philippines" *Nature* — `homo_luzonensis`.
- **Reich, D. et al.** (2010) "Genetic history of an archaic hominin group from Denisova Cave" *Nature* — `denisovans`.
- **Ji, Q. et al.** (2021) "Late Middle Pleistocene Harbin cranium represents a new Homo species" *The Innovation* — `homo_longi`.
- **Carballido, J. L. et al.** (2017) "A new giant titanosaur sheds light on body mass evolution" *Proc. R. Soc. B* — `patagotitan`.
- **Xu, X. et al.** (2015) "A bizarre Jurassic maniraptoran theropod with preserved evidence of membranous wings" *Nature* — `yi_qi`.
- **Brown, C. M. et al.** (2017) "An exceptionally preserved three-dimensional armored dinosaur reveals insights into coloration and Cretaceous predator-prey dynamics" *Curr. Biol.* — `borealopelta`.
- **Cau, A. et al.** (2017) "Synchrotron scanning reveals amphibious ecomorphology in a new clade of bird-like dinosaurs" *Nature* — `halszkaraptor`.
- **Poust, A. W. et al.** (2020) "A new microraptorine theropod from the Jehol Biota" *Anat. Rec.* — `wulong`.
- **McPhee, B. W. et al.** (2018) "A giant dinosaur from the earliest Jurassic of South Africa and the transition to quadrupedality in early sauropodomorphs" *Curr. Biol.* — `ledumahadi`.
- **Sallam, H. M. et al.** (2018) "New Egyptian sauropod reveals Late Cretaceous dinosaur dispersal between Europe and Africa" *Nat. Ecol. Evol.* — `mansourasaurus`.
- **Beccari, V. et al.** (2021) "Issi saaneq gen. et sp. nov. — a new sauropodomorph dinosaur from the Late Triassic of Greenland" *Diversity* — `issi_saaneq`.
- **Xu, X. et al.** (2012) "A gigantic feathered dinosaur from the Lower Cretaceous of China" *Nature* — `yutyrannus`.
- **Hu, D. et al.** (2009) "A pre-Archaeopteryx troodontid theropod from China with long feathers on the metatarsus" *Nature* + **Li, Q. et al.** (2010) "Plumage color patterns of an extinct dinosaur" *Science* — `anchiornis`.
- **DePalma, R. A. et al.** (2015) "The first giant raptor (Theropoda: Dromaeosauridae) from the Hell Creek Formation" *Paleontol. Contrib.* — `dakotaraptor`.
- **Zheng, X.-T. et al.** (2009) "An Early Cretaceous heterodontosaurid dinosaur with filamentous integumentary structures" *Nature* — `tianyulong`.
- **Lee, S. et al.** (2022) "A non-avian dinosaur with a streamlined body exhibits potential adaptations for swimming" *Commun. Biol.* — `natovenator`.
- **Sander, P. M. et al.** (2021) "Early giant reveals faster evolution of large body size in ichthyosaurs than in cetaceans" *Science* — `cymbospondylus`.
- **Moysiuk, J. & Caron, J.-B.** (2019) "A new hurdiid radiodont from the Burgess Shale evinces the exploitation of Cambrian infaunal food sources" *Proc. R. Soc. B* — `cambroraster`.
- **Moysiuk, J. & Caron, J.-B.** (2022) "A three-eyed radiodont with fossilized neuroanatomy informs the origin of the arthropod head and segmentation" *Curr. Biol.* — `stanleycaris`.
- **Aria, C. & Caron, J.-B.** (2017) "Mandibulate convergence in an armoured Cambrian stem chelicerate" *BMC Evol. Biol.* — `habelia`.
- **Lambert, O. et al.** (2019) "An amphibious whale from the Middle Eocene of Peru reveals early South Pacific dispersal of quadrupedal cetaceans" *Curr. Biol.* — `peregocetus`.
- **Gohar, A. S. et al.** (2021) "A new protocetid whale offers clues to biogeography and feeding ecology in early cetacean evolution" *Proc. R. Soc. B* — `phiomicetus`.
- **Field, D. J. et al.** (2020) "Late Cretaceous neornithine from Europe illuminates the origins of crown birds" *Nature* — `asteriornis`.
- **Clarke, J. A. et al.** (2010) "Fossil evidence for evolution of the shape and color of penguin feathers" *Science* — `inkayacu`.
- **Ksepka, D. T. et al.** (2023) "Largest-known fossil penguin provides insight into the early evolution of sphenisciform body size and flipper anatomy" *J. Paleontol.* — `kumimanu`.
- **Meng, Q.-J. et al.** (2017) "New gliding mammaliaforms from the Jurassic" *Nature* — `maiopatagium`.
- **Krause, D. W. et al.** (2014) "First cranial remains of a gondwanatherian mammal reveal remarkable mosaicism" *Nature* — `vintana`.
- **Krause, D. W. et al.** (2020) "Skeleton of a Cretaceous mammal from Madagascar reflects long-term insularity" *Nature* — `adalatherium`.
- **Loron, C. C. et al.** (2019) "Early fungi from the Proterozoic era in Arctic Canada" *Nature* — `ourasphaira`.
- **Wang, M. et al.** (2014) "Stick insect leaf mimicry in the mid-Mesozoic" *PLoS ONE* — `cretophasmomima`.
- **Han, J. et al.** (2017) "Meiofaunal deuterostomes from the basal Cambrian of Shaanxi" *Nature* + **Liu, Y. et al.** (2022) "Saccorhytus is an early ecdysozoan and not the earliest deuterostome" *Nature* — `saccorhytus`.
- **Xu, X. et al.** (2018) "Two Early Cretaceous fossils document transitional stages in alvarezsaurian dinosaur evolution" *Curr. Biol.* — `xiyunykus`.
- **Stewart, T. A. et al.** (2022) "A new elpistostegalian from the Late Devonian of the Canadian Arctic" *Nature* — `qikiqtania`.
- **Gess, R. & Ahlberg, P. E.** (2022) "A high-latitude Gondwanan species of the Late Devonian tristichopterid Hyneria" *PLoS ONE* — `hyneria_udlezinye`.
- **Davies, N. S. et al.** (2021) "The largest arthropod in Earth history: insights from newly discovered Arthropleura remains" *J. Geol. Soc.* — `arthropleura_giant`.

## Taxonomy

`js/data/speciesTaxonomy.js` — a domain → species Linnaean lineage for every one of the 155 entries, plus a `rank` field naming the most specific level each entry represents. Merged into `species.js` at module load.

Classifications follow mainstream consensus from current reference sources rather than any single cladistic authority:

- **Wikipedia classification boxes** (consulted per-taxon) for the modern accepted placements — especially for ambiguous stem groups (Cambrian lobopods, Ediacaran biota).
- **ITIS** (Integrated Taxonomic Information System, itis.gov) and **Paleobiology Database** for extinct genera and families.
- **Benton 2015** (as above) for vertebrate-clade ordinal placement where literature disagrees.

Where a species has genuine placement uncertainty (e.g. Kimberella, Hallucigenia, Rhyniognatha), ranks are left `null` above the known resolution rather than fabricated — the lineage ladder displays the known ranks honestly and skips the gaps.

Milestones (GOE, Snowball, Cambrian Explosion, etc.) live in `js/data/milestones.js` with a different schema and are not species.

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
