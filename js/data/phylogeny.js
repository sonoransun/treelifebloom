// Tree-of-life backbone — the clades that species entries hang from (the `clade` field in
// ./species.js). It drives the Tree view and the lineage breadcrumb in the species dialog.
//
// Entry schema (every field required):
//   id              unique snake_case slug
//   name            display name, at most 24 characters, plain English where one exists
//   scientificName  formal taxon that best matches the branch as drawn, or null if same as name
//   parent          id of the parent clade; null only for the root
//   originMa        where the branch leaves its parent's lineage, in Ma (see below)
//   category        category id from LIFE_GROUPS in ../config.js — colours the branch
//   description     one sentence, at most 150 characters
//
// HOW TO READ IT
//   Every clade is a lineage that begins at `originMa` by branching off its parent's lineage. A
//   clade includes its stem: early forms that are closer to it than to any other node here (so
//   "Birds" starts with Archaeopteryx-grade avialans and "Whales & dolphins" with their hoofed
//   forerunners). A species is attached to the MOST SPECIFIC clade it belongs to and leaves that
//   lineage at its own appearanceMa. A fossil of contested position goes where most specialists
//   now put it or, failing a majority view, on the deepest node that covers all the candidates
//   (Wiwaxia sits on "Spiralians", between its possible mollusc and annelid homes). A species
//   younger than its clade's first internal split (Opabinia on "Arthropods", Hesperornis on
//   "Modern birds & kin") is a member of that clade of unspecified position: it is not a claim
//   that it belongs to the line that continues past the split.
//
//   Order carries meaning. The array is in pre-order (a parent always precedes its descendants) and
//   siblings are listed in branching order, oldest split first:
//     - an earlier sibling's originMa is its split from the line that leads to the later siblings,
//       so sister groups share a date and an unresolved radiation is written as a tie;
//     - the last (or only) child's originMa is its split from its nearest relatives, which may be
//       unnamed members of the parent (gibbons, for "Great apes");
//     - read top to bottom, the tips keep relatives together and end with the line to humans.
//   Read this way the backbone is a proper time-tree and divergenceMa() holds for any two nodes.
//   The price is that a branch can start before the group it is named after is recognisable:
//   "Cats, hyenas & kin" leaves the carnivoran line at the cat–dog split (~54 Ma), long before the
//   first true cats (~30 Ma). Not every named group needs a node either: the deuterostomes are
//   simply the bilaterian line once the protostomes have left it, and the bony fishes the
//   jawed-vertebrate line once the sharks have.
//
// DATES — approximate medians, rounded. Expect errors of several per cent in the Phanerozoic and
// of 10–20% before 1000 Ma.
//   - Splits between living groups: fossil-calibrated molecular clocks, by default the TimeTree
//     median (TT in the notes; 95% CI in brackets where it matters).
//   - Where a fossil that belongs below a node is older than the clock median, the node is moved
//     to just before that fossil (crown archosaurs, lungfish, conifers, grasses, snakes, horses,
//     hominins; each case is noted beside the node).
//   - Extinct groups have no clock: their originMa is the split implied by the oldest fossils on
//     either side, set a little before the first record.
//   - Before ~1000 Ma clocks disagree by hundreds of millions of years. The older family of
//     estimates is used (Moody 2024, Mahendrarajah 2023, Fournier 2021, Wolfe & Fournier 2018,
//     Parfrey 2011): it includes the most recent dated trees of life, and it lets the catalogue's
//     3.46-Ga methanogens and 2.1-Ga Francevillian fossils (if those are eukaryotes) hang below
//     these nodes. The younger family is Betts 2018 (crown Bacteria and Archaea <3.4 Ga, living
//     eukaryotes <1.84 Ga) and TimeTree (eukaryotes ~1.5 Ga).
//   - Rocks versus clocks: clock dates are used for the animal phyla (splits at 750–570 Ma, body
//     fossils from ~575 Ma), flowering plants (~160 Ma for the monocot–eudicot split, clear
//     fossils from ~135 Ma) and the placental orders (97–75 Ma, undisputed fossils after 66 Ma),
//     because a lineage must exist before its first fossil. Modern birds take a middle course
//     (root 100 Ma) between TimeTree (108 Ma) and genome studies with tight priors (<95 Ma).
//
// SIMPLIFICATIONS AND CONTESTED PLACEMENTS (mainstream choice; doubt is flagged in descriptions)
//   - Eukaryotes are drawn on the archaeal (Asgard) line although the mitochondrion came from a
//     bacterium; the eukaryote root is put between the fungus–animal side and the plant–SAR side
//     and the first splits are drawn as a tie, because their order is unresolved.
//   - Comb jellies are not drawn (genomes now favor them as the first animal branch), so sponges are
//     the oldest animal branch shown; the Ediacaran biota is tied with them, its place unresolved.
//   - Grades, not natural groups, kept because they are how the fossils are known: Ediacaran
//     biota, lobopodians, crustaceans, nautiloids, armored jawless fish, seed ferns.
//   - Conodonts with the cyclostomes; trilobites tied with chelicerates and mandibulates; modern
//     amphibians inside the temnospondyls; turtles beside the archosaurs (genomes; Chiari 2012);
//     ichthyosaurs and sauropterygians tied with the lepidosaurs at the first split of crown
//     reptiles (position unresolved); mosasaurs somewhere among lizards and snakes;
//     multituberculates closer to therians than monotremes are; ties at the base of the
//     placentals and among the laurasiatherian orders.
//
// MAIN SOURCES
//   TimeTree of Life — Kumar et al. 2022, Mol. Biol. Evol. 39:msac174 (timetree.org pairwise medians, Nov 2026)
//   Moody et al. 2024, Nat. Ecol. Evol. 8:1654 — LUCA ~4.2 Ga (4.09–4.33)
//   Mahendrarajah et al. 2023, Nat. Commun. 14:7456 — crown Archaea 3.95–3.37 Ga, eukaryote stem 2.67–2.19 Ga, LECA 1.93–1.84 Ga
//   Fournier et al. 2021, Proc. R. Soc. B 288:20210675 — total-group Cyanobacteria ~3.47 Ga, crown ~2.9 Ga
//   Wolfe & Fournier 2018, Nat. Ecol. Evol. 2:897 — methanogens by 3.51 Ga
//   Betts et al. 2018, Nat. Ecol. Evol. 2:1556 — the younger deep-time alternative
//   Parfrey et al. 2011, PNAS 108:13624 — LECA 1.87–1.68 Ga, major eukaryote clades before 1.2 Ga
//   Strassert et al. 2021, Nat. Commun. 12:1879 — eukaryote supergroups (LECA 2.39–1.96 Ga, the old end)
//   Morris et al. 2018, PNAS 115:E2274 — land plants 515–470 Ma, vascular plants 451–431 Ma
//   dos Reis et al. 2015, Curr. Biol. 25:2939 — animals 833–650, eumetazoans 746–626, bilaterians 688–596 Ma
//   Misof et al. 2014, Science 346:763 — insects 479, winged insects 406, Holometabola 345 Ma
//   Benton et al. 2015, Palaeontol. Electron. 18.1.1FC — fossil minimum and maximum ages for animal nodes
//   Schultz et al. 2023, Nature 618:110 — comb jellies as the sister group of all other animals
//   Caldwell et al. 2015, Nat. Commun. 6:5996 — the oldest snakes (Eophis, ~167 Ma)
//   Nesbitt 2011, Bull. Am. Mus. Nat. Hist. 352; Brusatte et al. 2010, Earth-Sci. Rev. 101:68 — archosaurs, dinosaurs
//   Stiller et al. 2024, Nature 629:851 — Neoaves radiate at the K–Pg boundary (67.4–66.5 Ma)
//   Chiari et al. 2012, BMC Biol. 10:65 — turtles sister to archosaurs, split ~255 Ma
//   Benton 2015, Vertebrate Palaeontology (4th ed.) — fossil ranges and vertebrate relationships
//
// Clade ids and species ids are separate namespaces; many coincide (the species 'cycads' hangs from
// the clade 'cycads'), but one pair deliberately does not match (species 'great_apes', Proconsul
// and other early apes, hangs from 'apes').

export const clades = [
  // ---- Root and prokaryotes -------------------------------------------------------------------
  { id: 'luca', name: 'LUCA', scientificName: null, parent: null, originMa: 4200, category: 'bacteria',
    description: 'The last universal common ancestor of all living cells; no fossil records it, and its age is a molecular-clock estimate of about 4.2 billion years.' }, // Moody 2024: 4.09–4.33 Ga
  { id: 'bacteria', name: 'Bacteria', scientificName: null, parent: 'luca', originMa: 4200, category: 'bacteria',
    description: 'One of life\'s two primary domains: cells without a nucleus that invented photosynthesis and still run most of the planet\'s chemistry.' }, // the two domains part at LUCA by definition
  { id: 'cyanobacteria', name: 'Cyanobacteria', scientificName: null, parent: 'bacteria', originMa: 3500, category: 'bacteria',
    description: 'Inventors of oxygen-producing photosynthesis and ancestors of every chloroplast; whether they built the very oldest stromatolites is uncertain.' }, // Fournier 2021: total group (split from its non-photosynthetic sister) 3.47 Ga (3.72–3.25), crown 2.98 Ga
  { id: 'archaea', name: 'Archaea', scientificName: null, parent: 'luca', originMa: 4200, category: 'archaea',
    description: 'Life\'s other primary domain: microbes with unique membranes, many living in extreme heat, salt or acid; complex cells arose from within them.' },
  { id: 'euryarchaeota', name: 'Methanogens & kin', scientificName: 'Euryarchaeota', parent: 'archaea', originMa: 3700, category: 'archaea',
    description: 'A major branch of archaea that includes the methane-makers, whose gas may have warmed the young Earth, as well as extreme salt-lovers.' }, // ~crown Archaea 3.95–3.37 Ga (Mahendrarajah 2023); methanogens by 3.51 Ga (Wolfe & Fournier 2018)
  { id: 'asgard_archaea', name: 'Asgard archaea', scientificName: 'Asgardarchaeota', parent: 'archaea', originMa: 3000, category: 'archaea',
    description: 'Archaea discovered in sea-floor mud in 2015 that carry genes once thought unique to complex cells; our closest prokaryote relatives.' }, // no direct estimate: placed between crown Archaea (~3.7 Ga) and the eukaryote stem (~2.4 Ga)
  { id: 'eukaryotes', name: 'Eukaryotes', scientificName: 'Eukaryota', parent: 'asgard_archaea', originMa: 2400, category: 'protist',
    description: 'Cells with a nucleus; they arose when an Asgard-line archaeon engulfed an alphaproteobacterium, which became the mitochondrion.' }, // split from nearest Asgard relatives 2.67–2.19 Ga (Mahendrarajah 2023)

  // ---- Protist supergroups of the plankton -----------------------------------------------------
  { id: 'sar', name: 'SAR supergroup', scientificName: 'Sar', parent: 'eukaryotes', originMa: 1850, category: 'protist',
    description: 'A vast alliance of mostly single-celled eukaryotes, named for its three branches, that includes much of the ocean plankton.' }, // first split of living eukaryotes, a three-way tie: LECA 1.93–1.84 Ga (Mahendrarajah 2023), 1.87–1.68 (Parfrey 2011); TT ~1.5 Ga
  { id: 'rhizarians', name: 'Rhizarians', scientificName: 'Rhizaria', parent: 'sar', originMa: 1400, category: 'protist',
    description: 'Amoeba-like protists with thread-thin pseudopods, many of them building intricate shells: forams, radiolarians and kin.' }, // weakly constrained: TT 1039 (656–1422); major clades before 1.2 Ga (Parfrey 2011)
  { id: 'forams', name: 'Forams', scientificName: 'Foraminifera', parent: 'rhizarians', originMa: 800, category: 'protist',
    description: 'Marine amoebae in tiny chambered shells that pile up as limestone and chalk; their chemistry is a prime record of past climate.' }, // clocks 1150–650 Ma; shells from ~540 Ma
  { id: 'stramenopiles', name: 'Stramenopiles', scientificName: 'Stramenopila', parent: 'sar', originMa: 1300, category: 'protist',
    description: 'Protists that typically swim with one hairy and one smooth flagellum: diatoms, kelps and other brown algae, and water molds.' }, // weakly constrained: TT 942 (758–1126)
  { id: 'diatoms', name: 'Diatoms', scientificName: 'Bacillariophyta', parent: 'stramenopiles', originMa: 250, category: 'alga',
    description: 'Single-celled algae encased in ornate shells of glass; they generate roughly a fifth of the oxygen produced on Earth each year.' }, // TT 298 (218–379) for the split from bolidophytes; crown ~190 Ma
  { id: 'alveolates', name: 'Alveolates', scientificName: 'Alveolata', parent: 'sar', originMa: 1300, category: 'protist',
    description: 'Protists with flattened sacs beneath the cell membrane: dinoflagellates, ciliates and parasites such as the malaria agent.' },
  { id: 'haptophytes', name: 'Coccolithophores & kin', scientificName: 'Haptophyta', parent: 'eukaryotes', originMa: 1850, category: 'alga',
    description: 'Haptophyte algae, best known for the coccolithophores whose tiny chalk plates built the White Cliffs of Dover; of uncertain deep relationships.' },

  // ---- Plants and algae -----------------------------------------------------------------------
  { id: 'archaeplastida', name: 'Archaeplastida', scientificName: null, parent: 'eukaryotes', originMa: 1850, category: 'alga',
    description: 'Heirs of the cell that tamed a cyanobacterium as the first chloroplast: red algae, green algae and land plants.' },
  { id: 'red_algae', name: 'Red algae', scientificName: 'Rhodophyta', parent: 'archaeplastida', originMa: 1600, category: 'alga',
    description: 'Mostly marine seaweeds with red pigments tuned to dim blue-green light; fossil Bangiomorpha is the oldest evidence of sexual reproduction.' }, // TT 1304 (1156–1452); Strassert 2021 older (crown reds 1.98–1.73 Ga)
  { id: 'green_algae', name: 'Green algae', scientificName: 'Chlorophyta', parent: 'archaeplastida', originMa: 1100, category: 'alga',
    description: 'Sea lettuce, Volvox and much of the green plankton of seas and lakes; the other green algae sit on the branch leading to land plants.' }, // TT 974 (862–1087), moved before the 1.0-Ga green seaweed Proterocladus
  { id: 'streptophytes', name: 'Streptophytes', scientificName: 'Streptophyta', parent: 'archaeplastida', originMa: 1100, category: 'alga',
    description: 'Freshwater green algae such as stoneworts and pond silks, together with the land plants that arose from among them.' },
  { id: 'land_plants', name: 'Land plants', scientificName: 'Embryophyta', parent: 'streptophytes', originMa: 700, category: 'plant',
    description: 'Plants that nourish an embryo on the parent, the key to life out of water; this line left its pond-algal relatives long before colonizing land.' }, // split from conjugating algae: TT 798 (648–947); crown streptophytes 891–629 (Morris 2018)
  { id: 'bryophytes', name: 'Mosses & liverworts', scientificName: 'Bryophyta sensu lato', parent: 'land_plants', originMa: 500, category: 'plant',
    description: 'Mosses, liverworts and hornworts: small plants without true roots or veins that still need a film of water to reproduce.' }, // Morris 2018: 515–470, means ~500; TT 483 (466–500)
  { id: 'vascular_plants', name: 'Vascular plants', scientificName: 'Tracheophyta', parent: 'land_plants', originMa: 500, category: 'plant',
    description: 'Plants with internal plumbing of xylem and phloem that lifts water against gravity, letting them grow tall and spread into drier ground.' },
  { id: 'lycophytes', name: 'Clubmosses & kin', scientificName: 'Lycopodiophyta', parent: 'vascular_plants', originMa: 432, category: 'plant',
    description: 'Clubmosses, quillworts and the giant scale trees of the coal swamps; the oldest surviving branch of the vascular plants.' }, // crown vascular plants: TT 428.5 (418–439), Morris 2018 451–431; kept after the 433-Ma Cooksonia, a stem vascular plant
  { id: 'ferns', name: 'Ferns & horsetails', scientificName: 'Monilophyta', parent: 'vascular_plants', originMa: 405, category: 'plant',
    description: 'Spore-bearing plants with large fronds or jointed stems; tree ferns and giant horsetails shaded the Carboniferous swamps.' }, // TT 405 (394–416)
  { id: 'seed_plants', name: 'Seed plants', scientificName: 'Lignophyta', parent: 'vascular_plants', originMa: 405, category: 'plant',
    description: 'Plants that package their embryos in seeds; their woody, spore-bearing forerunners, the progymnosperms, built some of the first forests.' },
  { id: 'seed_ferns', name: 'Seed ferns', scientificName: 'Pteridospermatophyta', parent: 'seed_plants', originMa: 370, category: 'plant',
    description: 'Extinct early seed plants, many with fern-like fronds, such as Medullosa and tongue-leaved Glossopteris; an informal grade, not one natural group.' }, // first seeds ~370–365 Ma (Elkinsia, Moresnetia)
  { id: 'gymnosperms', name: 'Gymnosperms', scientificName: 'Acrogymnospermae', parent: 'seed_plants', originMa: 325, category: 'plant',
    description: 'Seed plants with naked seeds, usually borne in cones: conifers, cycads, ginkgos and the unusual gnetophytes.' }, // TT 325 (316–334)
  { id: 'conifers', name: 'Conifers', scientificName: 'Pinophyta', parent: 'gymnosperms', originMa: 315, category: 'plant',
    description: 'Cone-bearing trees with needles or scales, from pines and redwoods to monkey puzzles; the dominant trees of the Mesozoic.' }, // fossil-led: cordaites and walchian conifers by ~315–310 Ma; TT 286–262 is younger than those fossils
  { id: 'cycads', name: 'Cycads', scientificName: 'Cycadales', parent: 'gymnosperms', originMa: 300, category: 'plant',
    description: 'Stout, palm-like plants with massive cones, often pollinated by beetles; widespread in the age of dinosaurs, a few hundred species today.' }, // between the conifer split and the first cycads (~290–280 Ma)
  { id: 'ginkgos', name: 'Ginkgos', scientificName: 'Ginkgoales', parent: 'gymnosperms', originMa: 300, category: 'plant',
    description: 'Trees with fan-shaped leaves that were diverse and worldwide in the Mesozoic; a single species, Ginkgo biloba, survives.' },
  { id: 'flowering_plants', name: 'Flowering plants', scientificName: 'Angiospermae', parent: 'seed_plants', originMa: 325, category: 'plant',
    description: 'Plants with flowers and fruit; their branch parted from other seed plants long before their first clear fossils, about 135 million years old.' },
  { id: 'magnoliids', name: 'Magnoliids', scientificName: 'Magnoliidae', parent: 'flowering_plants', originMa: 160, category: 'plant',
    description: 'An early branch of flowering plants with simple, many-parted flowers: magnolias, laurels, avocados and black pepper.' }, // TT 158 (150–166): a near three-way split with monocots and eudicots; fossils from ~125 Ma
  { id: 'monocots', name: 'Monocots', scientificName: 'Monocotyledoneae', parent: 'flowering_plants', originMa: 160, category: 'plant',
    description: 'Flowering plants with one seed leaf and parallel-veined leaves: grasses, palms, lilies, orchids and bananas.' }, // TT 160 (154–166)
  { id: 'grasses', name: 'Grasses', scientificName: 'Poaceae', parent: 'monocots', originMa: 100, category: 'plant',
    description: 'Monocots that grow from the base of the leaf and so survive grazing and fire; they include bamboos and all cereals.' }, // TT 84 (74–94), moved before grass remains in ~100-Ma amber and dinosaur teeth
  { id: 'eudicots', name: 'Eudicots', scientificName: 'Eudicotyledoneae', parent: 'flowering_plants', originMa: 160, category: 'plant',
    description: 'The largest branch of flowering plants, recognized by pollen with three grooves: oaks, roses, legumes, sunflowers and most broadleaved trees.' },

  // ---- Amoebae, fungi and the closest relatives of animals -------------------------------------
  { id: 'amoebozoans', name: 'Amoebae & slime molds', scientificName: 'Amoebozoa', parent: 'eukaryotes', originMa: 1500, category: 'protist',
    description: 'Classic shape-shifting amoebae and the slime molds; the nearest major relatives of the branch that holds fungi and animals.' }, // TT 1455 (1228–1683)
  { id: 'fungi', name: 'Fungi', scientificName: null, parent: 'eukaryotes', originMa: 1250, category: 'fungus',
    description: 'Yeasts, molds and mushrooms, which digest food outside their bodies; closer to animals than to plants, and the partners of algae in lichens.' }, // TT 1218 (1113–1323)
  { id: 'choanoflagellates', name: 'Choanoflagellates', scientificName: 'Choanoflagellata', parent: 'eukaryotes', originMa: 900, category: 'protist',
    description: 'Single-celled filter feeders with a collar around one flagellum, strikingly like the feeding cells of sponges; the closest relatives of animals.' }, // TT 892 (829–955)

  // ---- Animals --------------------------------------------------------------------------------
  { id: 'animals', name: 'Animals', scientificName: 'Metazoa', parent: 'eukaryotes', originMa: 900, category: 'invertebrate',
    description: 'Many-celled organisms that eat other life and develop from embryos; molecular clocks place their origin well before their first fossils.' },
  { id: 'sponges', name: 'Sponges', scientificName: 'Porifera', parent: 'animals', originMa: 750, category: 'invertebrate',
    description: 'Filter feeders without nerves or muscles, among them the reef-building archaeocyaths; with the comb jellies, the oldest branches of the animal tree.' }, // first split of living animals: TT 750 (699–802); dos Reis 2015: 833–650
  { id: 'ediacaran_biota', name: 'Ediacaran biota', scientificName: null, parent: 'animals', originMa: 750, category: 'invertebrate',
    description: 'Extinct late-Ediacaran fronds, discs, quilts and tubes: many probably early animals of uncertain placement, and not one natural group.' }, // no date of its own: tied with the sponges at the first split of living animals because its position is unresolved; fossils 575–539 Ma
  { id: 'cnidarians', name: 'Corals, jellyfish & kin', scientificName: 'Cnidaria', parent: 'animals', originMa: 690, category: 'invertebrate',
    description: 'Animals armed with stinging cells and built on radial symmetry: corals, sea anemones, jellyfish and hydras.' }, // TT 682 (631–733); dos Reis 2015: 746–626
  { id: 'tabulate_corals', name: 'Tabulate corals', scientificName: 'Tabulata', parent: 'cnidarians', originMa: 500, category: 'invertebrate',
    description: 'Extinct colonial corals of tightly packed tubes crossed by flat floors; major Paleozoic reef builders that died out at the end of the Permian.' }, // fossils from ~485 Ma, possible Cambrian forerunners
  { id: 'rugose_corals', name: 'Rugose corals', scientificName: 'Rugosa', parent: 'cnidarians', originMa: 470, category: 'invertebrate',
    description: 'Extinct horn corals, solitary or colonial, with wrinkled outer walls; they vanished with the tabulates in the end-Permian extinction.' }, // fossils from ~460 Ma
  { id: 'stony_corals', name: 'Stony corals', scientificName: 'Scleractinia', parent: 'cnidarians', originMa: 340, category: 'invertebrate',
    description: 'Builders of modern reefs; their skeletons appear only about 245 million years ago, but their soft-bodied line reaches back into the Paleozoic.' }, // split from corallimorph anemones: TT 343 (236–450)
  { id: 'bilaterians', name: 'Bilaterians', scientificName: 'Bilateria', parent: 'animals', originMa: 690, category: 'invertebrate',
    description: 'Animals with a front and a back end and mirror-image sides: a body plan shared by worms, insects, snails, fish and people.' },
  { id: 'protostomes', name: 'Protostomes', scientificName: 'Protostomia', parent: 'bilaterians', originMa: 650, category: 'invertebrate',
    description: 'The branch of bilaterians that holds most animal species: arthropods, roundworms, molluscs, segmented worms and their relatives.' }, // dos Reis 2015: 688–596
  { id: 'ecdysozoans', name: 'Molting animals', scientificName: 'Ecdysozoa', parent: 'protostomes', originMa: 610, category: 'invertebrate',
    description: 'Animals that grow by molting an outer cuticle: arthropods, velvet worms, water bears, roundworms and priapulid worms.' }, // TT 608 (573–644)
  { id: 'priapulids', name: 'Priapulid worms', scientificName: 'Priapulida', parent: 'ecdysozoans', originMa: 580, category: 'invertebrate',
    description: 'Burrowing predatory worms with a spiny snout that turns inside out; abundant in Cambrian seas, a handful of species today.' }, // TT 581 (543–620)
  { id: 'lobopodians', name: 'Lobopodians', scientificName: 'Lobopodia', parent: 'ecdysozoans', originMa: 570, category: 'invertebrate',
    description: 'Worm-like Cambrian animals walking on soft, clawed legs; a grade close to the origins of velvet worms, water bears and arthropods.' }, // velvet-worm–arthropod split: TT 558 (543–573)
  { id: 'arthropods', name: 'Arthropods', scientificName: 'Arthropoda', parent: 'ecdysozoans', originMa: 570, category: 'arthropod',
    description: 'Animals with a jointed outer skeleton, by far the most species-rich of all; their earliest stem members still lacked jointed legs.' },
  { id: 'radiodonts', name: 'Radiodonts', scientificName: 'Radiodonta', parent: 'arthropods', originMa: 565, category: 'arthropod',
    description: 'Early swimming hunters such as Anomalocaris, with grasping head limbs and a ring-shaped mouth; cousins of the true arthropods.' }, // stem branch just below the crown; fossils from ~520 Ma
  { id: 'trilobites', name: 'Trilobites', scientificName: 'Trilobita', parent: 'arthropods', originMa: 560, category: 'arthropod',
    description: 'Three-lobed marine arthropods with calcite armor and crystal-lensed eyes; their exact place among early arthropods is debated.' }, // tied with the chelicerate–mandibulate split; fossils from 521 Ma
  { id: 'chelicerates', name: 'Chelicerates', scientificName: 'Chelicerata', parent: 'arthropods', originMa: 560, category: 'arthropod',
    description: 'Arthropods with pincer-like mouthparts and no antennae: horseshoe crabs, sea scorpions, spiders, scorpions and mites.' }, // TT 560 (537–582)
  { id: 'horseshoe_crabs', name: 'Horseshoe crabs', scientificName: 'Xiphosura', parent: 'chelicerates', originMa: 490, category: 'arthropod',
    description: 'Armored marine chelicerates with a tail spike, little changed in outline for 440 million years; genomes hint they may be sea-going arachnids.' }, // TT 482 (460–505)
  { id: 'eurypterids', name: 'Sea scorpions', scientificName: 'Eurypterida', parent: 'chelicerates', originMa: 475, category: 'arthropod',
    description: 'Extinct aquatic chelicerates, some more than two meters long, that hunted in Paleozoic seas, lagoons and rivers.' }, // fossils from 467 Ma
  { id: 'arachnids', name: 'Arachnids', scientificName: 'Arachnida', parent: 'chelicerates', originMa: 475, category: 'arthropod',
    description: 'Eight-legged, mostly land-living chelicerates: scorpions, spiders, harvestmen, mites and ticks.' },
  { id: 'myriapods', name: 'Millipedes & centipedes', scientificName: 'Myriapoda', parent: 'arthropods', originMa: 550, category: 'arthropod',
    description: 'Many-legged land arthropods, among the very first animals to live on land; giant Arthropleura was the largest land invertebrate ever.' }, // TT 552 (534–571)
  { id: 'crustaceans', name: 'Crustaceans', scientificName: 'Crustacea', parent: 'arthropods', originMa: 525, category: 'arthropod',
    description: 'Crabs, shrimps, barnacles, copepods and kin; not a single natural branch, because the insects arose from within them.' }, // first split of Pancrustacea: TT 524 (506–543, water flea vs shrimp); crown pancrustacean Yicaris ~514 Ma (Benton 2015)
  { id: 'insects', name: 'Insects', scientificName: 'Hexapoda', parent: 'arthropods', originMa: 480, category: 'arthropod',
    description: 'Six-legged arthropods that arose from crustacean ancestors, were the first animals to fly, and now make up most known animal species.' }, // Misof 2014: 479
  { id: 'palaeopterans', name: 'Dragonflies & mayflies', scientificName: 'Palaeoptera', parent: 'insects', originMa: 400, category: 'arthropod',
    description: 'The oldest lineages of winged insects, unable to fold their wings flat over the body; the giant griffinflies of the coal swamps belong here.' }, // TT 396 (373–420); Misof 2014: 406
  { id: 'hymenopterans', name: 'Wasps, bees & ants', scientificName: 'Hymenoptera', parent: 'insects', originMa: 340, category: 'arthropod',
    description: 'Sawflies, wasps, bees and ants: vital pollinators and some of the most elaborate social insects, with fossils from the Triassic onward.' }, // TT 331 (311–352); Misof 2014: 345
  { id: 'beetles', name: 'Beetles', scientificName: 'Coleoptera', parent: 'insects', originMa: 315, category: 'arthropod',
    description: 'Insects whose front wings are hardened into protective cases; roughly one in four described animal species is a beetle.' }, // TT 308 (283–333)
  { id: 'lepidopterans', name: 'Butterflies & moths', scientificName: 'Lepidoptera', parent: 'insects', originMa: 260, category: 'arthropod',
    description: 'Scale-winged insects, sister group of the caddisflies; most living kinds diversified alongside the flowering plants.' }, // split from caddisflies: TT 257 (220–294)
  { id: 'spiralians', name: 'Spiralians', scientificName: 'Spiralia', parent: 'protostomes', originMa: 610, category: 'invertebrate',
    description: 'Molluscs, segmented worms, brachiopods, bryozoans and kin, many with spiral egg cleavage; the branching order of these phyla is unresolved.' },
  { id: 'brachiopods', name: 'Lamp shells', scientificName: 'Brachiopoda', parent: 'spiralians', originMa: 575, category: 'invertebrate',
    description: 'Brachiopods: filter feeders with an upper and a lower shell that carpeted Paleozoic sea floors; Lingula is a living example.' }, // the four spiralian phyla are a tie: TT 583 (552–613)
  { id: 'bryozoans', name: 'Moss animals', scientificName: 'Bryozoa', parent: 'spiralians', originMa: 575, category: 'invertebrate',
    description: 'Bryozoans: colonies of tiny filter-feeding individuals in box-like mineral chambers that encrust rocks, shells and seaweeds.' },
  { id: 'molluscs', name: 'Molluscs', scientificName: 'Mollusca', parent: 'spiralians', originMa: 575, category: 'mollusk',
    description: 'Soft-bodied animals with a mantle that usually secretes a shell, most with a rasping tongue: snails, clams, squid and their kin.' }, // tie with the other three spiralian phyla
  { id: 'bivalves', name: 'Bivalves', scientificName: 'Bivalvia', parent: 'molluscs', originMa: 540, category: 'mollusk',
    description: 'Molluscs between two hinged shells that filter food from the water: clams, mussels, oysters and scallops.' }, // shelled classes tied: TT 536 (523–549); Benton 2015: 549–532
  { id: 'gastropods', name: 'Snails & slugs', scientificName: 'Gastropoda', parent: 'molluscs', originMa: 540, category: 'mollusk',
    description: 'Molluscs that creep on a muscular foot, usually under a coiled shell; the most diverse molluscs in the sea, in fresh water and on land.' },
  { id: 'cephalopods', name: 'Cephalopods', scientificName: 'Cephalopoda', parent: 'molluscs', originMa: 540, category: 'mollusk',
    description: 'Jet-propelled molluscs with arms, keen eyes and large brains: nautiluses, ammonites, squid, cuttlefish and octopuses.' },
  { id: 'nautiloids', name: 'Nautiloids', scientificName: 'Nautiloidea', parent: 'cephalopods', originMa: 500, category: 'mollusk',
    description: 'Cephalopods with chambered outer shells, straight or coiled; a grade that includes the earliest cephalopods and the living Nautilus.' }, // first cephalopods ~497 Ma; the Nautilus–squid split itself is ~410 Ma (TT 406)
  { id: 'ammonoids', name: 'Ammonoids', scientificName: 'Ammonoidea', parent: 'cephalopods', originMa: 410, category: 'mollusk',
    description: 'Chambered cephalopods whose chamber walls were intricately folded: goniatites, ceratites and ammonites, all gone by 66 million years ago.' }, // from bactritoids in the Early Devonian
  { id: 'coleoids', name: 'Squid, octopus & kin', scientificName: 'Coleoidea', parent: 'cephalopods', originMa: 410, category: 'mollusk',
    description: 'Cephalopods that internalized or lost the shell: the extinct belemnites and living squid, cuttlefish and octopuses.' },
  { id: 'annelids', name: 'Segmented worms', scientificName: 'Annelida', parent: 'spiralians', originMa: 575, category: 'invertebrate',
    description: 'Ringed worms built from repeated segments: marine bristle worms, earthworms and leeches.' },
  { id: 'ambulacrarians', name: 'Ambulacrarians', scientificName: 'Ambulacraria', parent: 'bilaterians', originMa: 625, category: 'invertebrate',
    description: 'Echinoderms and hemichordates, united by similar larvae; together with the chordates they form the deuterostome animals.' }, // TT 627 (591–663); dos Reis 2015: 662–587
  { id: 'echinoderms', name: 'Echinoderms', scientificName: 'Echinodermata', parent: 'ambulacrarians', originMa: 560, category: 'invertebrate',
    description: 'Spiny-skinned sea animals with five-fold symmetry and water-powered tube feet: sea lilies, starfish, sea urchins and kin.' }, // TT 547 (525–568)
  { id: 'crinoids', name: 'Sea lilies & kin', scientificName: 'Crinoidea', parent: 'echinoderms', originMa: 515, category: 'invertebrate',
    description: 'Crinoids: sea lilies and feather stars, echinoderms with a cup and feathery arms, often stalked, whose remains build entire limestones.' }, // fossil-led: between the first echinoderms (521 Ma) and the first crinoids (~485 Ma)
  { id: 'echinoids', name: 'Sea urchins', scientificName: 'Echinoidea', parent: 'echinoderms', originMa: 480, category: 'invertebrate',
    description: 'Globe- or disc-shaped echinoderms armored with plates and movable spines: sea urchins, heart urchins and sand dollars.' }, // fossil-led: echinoids by ~465 Ma; TT 420 for the split from sea cucumbers is younger
  { id: 'hemichordates', name: 'Acorn worms & kin', scientificName: 'Hemichordata', parent: 'ambulacrarians', originMa: 560, category: 'invertebrate',
    description: 'Acorn worms and tiny tube-dwelling pterobranchs; they share gill slits with the chordates but are closer kin to echinoderms.' },
  { id: 'graptolites', name: 'Graptolites', scientificName: 'Graptolithina', parent: 'hemichordates', originMa: 520, category: 'invertebrate',
    description: 'Colonial hemichordates in branching tubes of collagen; the drifting kinds are prized zone fossils, and one genus is still alive.' }, // sea-floor graptolites from ~510 Ma

  // ---- Chordates and fishes -------------------------------------------------------------------
  { id: 'chordates', name: 'Chordates', scientificName: 'Chordata', parent: 'bilaterians', originMa: 625, category: 'fish',
    description: 'Animals with a stiffening notochord, a dorsal nerve cord and gill slits: lancelets, sea squirts and vertebrates.' },
  { id: 'vertebrates', name: 'Vertebrates', scientificName: 'Vertebrata', parent: 'chordates', originMa: 600, category: 'fish',
    description: 'Chordates with a skull, paired eyes and, in most, a backbone; their line parted from the sea squirts before any fossil record.' }, // TT 601 (550–652)
  { id: 'cyclostomes', name: 'Lampreys & hagfish', scientificName: 'Cyclostomata', parent: 'vertebrates', originMa: 560, category: 'fish',
    description: 'The living jawless vertebrates; the extinct conodonts are often placed on this branch, although their position is still debated.' }, // TT 563 (515–611)
  { id: 'ostracoderms', name: 'Armored jawless fish', scientificName: 'Ostracodermi', parent: 'vertebrates', originMa: 500, category: 'fish',
    description: 'Extinct jawless fishes in bony armor, the first vertebrates with bone; a grade of lineages on the way to jawed vertebrates.' }, // bone fragments ~495 Ma (Anatolepis), armoured fish by 467 Ma
  { id: 'jawed_vertebrates', name: 'Jawed vertebrates', scientificName: 'Gnathostomata', parent: 'vertebrates', originMa: 480, category: 'fish',
    description: 'Vertebrates with hinged jaws made from gill arches, and with paired fins; more than 99% of living vertebrate species.' }, // stem estimate: older than the crown split (465), younger than the first armoured jawless fish
  { id: 'placoderms', name: 'Placoderms', scientificName: 'Placodermi', parent: 'jawed_vertebrates', originMa: 470, category: 'fish',
    description: 'Extinct armored fishes with a jointed head and trunk shield, among the earliest jawed vertebrates; possibly a grade rather than one branch.' }, // stem branch just below the crown; fossils from ~439 Ma
  { id: 'cartilaginous_fish', name: 'Cartilaginous fish', scientificName: 'Chondrichthyes', parent: 'jawed_vertebrates', originMa: 465, category: 'fish',
    description: 'Sharks, rays and chimaeras, with skeletons of cartilage; the extinct spiny acanthodians belong to their early stem.' }, // TT 463 (447–479); Benton 2015: 468–421
  { id: 'ray_finned_fish', name: 'Ray-finned fish', scientificName: 'Actinopterygii', parent: 'jawed_vertebrates', originMa: 435, category: 'fish',
    description: 'Bony fishes whose fins are webs of skin on slender rays; about half of all living vertebrate species.' }, // TT 435 (428–442)
  { id: 'teleosts', name: 'Teleosts', scientificName: 'Teleostei', parent: 'ray_finned_fish', originMa: 305, category: 'fish',
    description: 'Ray-finned fishes with a symmetrical tail and mobile upper jaw bones, from eels to seahorses; about 96% of living fish species.' }, // split from gars and bowfin: TT 305 (283–327)
  { id: 'lobe_finned_fish', name: 'Lobe-finned fish', scientificName: 'Sarcopterygii', parent: 'jawed_vertebrates', originMa: 435, category: 'fish',
    description: 'Bony fishes with fleshy fins built around a single stout bone, the forerunner of arms and legs; the tetrapods are their descendants.' },
  { id: 'coelacanths', name: 'Coelacanths', scientificName: 'Actinistia', parent: 'lobe_finned_fish', originMa: 420, category: 'fish',
    description: 'Lobe-finned fishes with a three-lobed tail, believed extinct for 66 million years until one was caught off South Africa in 1938.' }, // TT 412 (404–421); must predate the lungfish split
  { id: 'lungfish', name: 'Lungfish', scientificName: 'Dipnomorpha', parent: 'lobe_finned_fish', originMa: 415, category: 'fish',
    description: 'Air-breathing lobe-finned fishes with crushing tooth plates; the closest living relatives of the land vertebrates.' }, // fossil-led: lungfish-line fossils by ~415–410 Ma (Benton 2015 minimum 408); TT 402 is younger
  { id: 'tetrapodomorphs', name: 'Tetrapodomorphs', scientificName: 'Tetrapodomorpha', parent: 'lobe_finned_fish', originMa: 415, category: 'fish',
    description: 'Lobe-finned fishes on the line to land vertebrates, such as Eusthenopteron and Tiktaalik, whose fins were turning into limbs.' },

  // ---- Tetrapods ------------------------------------------------------------------------------
  { id: 'tetrapods', name: 'Tetrapods', scientificName: 'Tetrapoda', parent: 'tetrapodomorphs', originMa: 395, category: 'amphibian',
    description: 'Vertebrates with four limbs bearing digits; the earliest, such as Acanthostega, still lived in water and kept their gills.' }, // limbs with digits: trackways ~393–390 Ma (Zachelmie, if made by tetrapods), skeletons from ~375 Ma
  { id: 'temnospondyls', name: 'Temnospondyls', scientificName: 'Temnospondyli', parent: 'tetrapods', originMa: 350, category: 'amphibian',
    description: 'Mostly large, flat-headed early amphibians of swamps and rivers; modern amphibians probably arose among them, though this is debated.' }, // amphibian–amniote split: TT 352 (349–355); Benton 2015: 351–337
  { id: 'lissamphibians', name: 'Modern amphibians', scientificName: 'Lissamphibia', parent: 'temnospondyls', originMa: 330, category: 'amphibian',
    description: 'Frogs, salamanders and caecilians: small amphibians with moist, glandular skin through which they breathe.' }, // stem estimate: before the caecilian split, TT 317 (308–326)
  { id: 'frogs', name: 'Frogs & toads', scientificName: 'Salientia', parent: 'lissamphibians', originMa: 290, category: 'amphibian',
    description: 'Tailless jumping amphibians with a tadpole stage; Triadobatrachus, from just after the end-Permian extinction, is the oldest known.' }, // TT 290 (279–301); Benton 2015 allows 273–250 only
  { id: 'salamanders', name: 'Salamanders & newts', scientificName: 'Caudata', parent: 'lissamphibians', originMa: 290, category: 'amphibian',
    description: 'Tailed amphibians that keep the sprawling build of early tetrapods and can regrow lost limbs.' },
  { id: 'amniotes', name: 'Amniotes', scientificName: 'Amniota', parent: 'tetrapods', originMa: 350, category: 'amphibian',
    description: 'Tetrapods whose eggs wrap the embryo in protective membranes, freeing reproduction from water: reptiles, birds and mammals.' }, // coloured as early tetrapods: the stem predates the reptile–mammal split

  // ---- Reptiles and birds ---------------------------------------------------------------------
  { id: 'sauropsids', name: 'Reptiles & birds', scientificName: 'Sauropsida', parent: 'amniotes', originMa: 320, category: 'reptile',
    description: 'The amniote branch that includes every living reptile and bird, as well as the extinct dinosaurs, pterosaurs and marine reptiles.' }, // TT 319 (317–321); Benton 2015: 333–318
  { id: 'parareptiles', name: 'Parareptiles', scientificName: 'Parareptilia', parent: 'sauropsids', originMa: 318, category: 'reptile',
    description: 'An early offshoot of Permian and Triassic reptiles including mesosaurs and pareiasaurs; whether they form one natural group is debated.' }, // must predate Hylonomus (~318–315 Ma) if that is on the other reptile branch
  { id: 'mesosaurs', name: 'Mesosaurs', scientificName: 'Mesosauridae', parent: 'parareptiles', originMa: 310, category: 'reptile',
    description: 'Slender early Permian swimmers, the first reptiles to return to the water; fossils on both sides of the Atlantic helped reveal continental drift.' }, // before the oldest other parareptiles (~306 Ma)
  { id: 'pareiasaurs', name: 'Pareiasaurs', scientificName: 'Pareiasauria', parent: 'parareptiles', originMa: 270, category: 'reptile',
    description: 'Stocky, knobbly-skulled plant-eaters up to three meters long; among the largest land animals of the late Permian.' }, // fossils from ~265 Ma
  { id: 'lepidosaurs', name: 'Lepidosaurs', scientificName: 'Lepidosauria', parent: 'sauropsids', originMa: 280, category: 'reptile',
    description: 'Scaly reptiles that shed their skin in sheets or flakes: the tuatara, lizards and snakes.' }, // TT 281 (277–285); Benton 2015: 296–256
  { id: 'squamates', name: 'Lizards & snakes', scientificName: 'Squamata', parent: 'lepidosaurs', originMa: 245, category: 'reptile',
    description: 'Reptiles with highly mobile skulls: more than 11,000 living species of lizards and snakes, plus the extinct sea-going mosasaurs.' }, // split from the tuatara line: TT 245 (237–253); Benton 2015: 253–238
  { id: 'snakes', name: 'Snakes', scientificName: 'Serpentes', parent: 'squamates', originMa: 170, category: 'reptile',
    description: 'Limbless predatory lizards with extraordinarily flexible jaws; Titanoboa, of the Paleocene, was the largest known.' }, // fossil-led: oldest snake Eophis ~167 Ma (Caldwell 2015), and the iguanian Bharatagama (crown-squamate minimum 168.9 Ma, Benton 2015) sits on the other side of this split; TT 162 (155–169) is younger
  { id: 'mosasaurs', name: 'Mosasaurs', scientificName: 'Mosasauroidea', parent: 'squamates', originMa: 110, category: 'marine_reptile',
    description: 'Giant sea-going lizards of the Late Cretaceous; whether their nearest relatives are monitor lizards or snakes remains unsettled.' }, // stem estimate just before the first fossils (~98 Ma); the true split could be as old as the snake split
  { id: 'ichthyosaurs', name: 'Ichthyosaurs', scientificName: 'Ichthyosauromorpha', parent: 'sauropsids', originMa: 280, category: 'marine_reptile',
    description: 'Dolphin-shaped marine reptiles that gave birth at sea; their exact position among the reptiles is uncertain.' }, // no date of its own: tied with the lepidosaur split (TT 281) because its position is unresolved; fossils from ~250 Ma
  { id: 'sauropterygians', name: 'Sauropterygians', scientificName: 'Sauropterygia', parent: 'sauropsids', originMa: 280, category: 'marine_reptile',
    description: 'Paddle-limbed marine reptiles such as placodonts, nothosaurs and plesiosaurs; like ichthyosaurs, of uncertain reptile ancestry.' }, // as ichthyosaurs; fossils from ~248 Ma
  { id: 'plesiosaurs', name: 'Plesiosaurs', scientificName: 'Plesiosauria', parent: 'sauropterygians', originMa: 220, category: 'marine_reptile',
    description: 'Four-flippered underwater fliers, either long-necked with small heads or short-necked with huge jaws; extinct 66 million years ago.' }, // from pistosaur-grade ancestors; first plesiosaur ~205 Ma
  { id: 'turtles', name: 'Turtles', scientificName: 'Pantestudines', parent: 'sauropsids', originMa: 260, category: 'reptile',
    description: 'Reptiles encased in a shell built from broadened ribs; genomes place them next to the archosaurs, though anatomy long suggested otherwise.' }, // TT 257 (249–265); Chiari 2012: ~255; stem turtle Eunotosaurus ~260 Ma
  { id: 'archosaurs', name: 'Archosaurs', scientificName: 'Archosauria', parent: 'sauropsids', originMa: 260, category: 'reptile',
    description: 'The "ruling reptiles": crocodiles, pterosaurs, dinosaurs and birds, together with their Triassic forerunners.' },
  { id: 'pseudosuchians', name: 'Crocodiles & kin', scientificName: 'Pseudosuchia', parent: 'archosaurs', originMa: 250, category: 'reptile',
    description: 'Crocodile-line archosaurs, the top land predators of the Triassic; of their many branches only the crocodylomorphs survive.' }, // fossil-led: Benton 2015 minimum 247.1 (Ctenosauriscus); Nesbitt 2011; TT 243 is younger; crocodylomorphs from ~230 Ma
  { id: 'pterosaurs', name: 'Pterosaurs', scientificName: 'Pterosauria', parent: 'archosaurs', originMa: 247, category: 'pterosaur',
    description: 'Flying reptiles with wings of skin stretched from an enormously long fourth finger; close cousins of the dinosaurs, not dinosaurs.' }, // bird-line archosaurs present by ~245 Ma (Nesbitt 2011)
  { id: 'dinosaurs', name: 'Dinosaurs', scientificName: 'Dinosauria', parent: 'archosaurs', originMa: 247, category: 'dinosaur',
    description: 'Archosaurs that held their legs directly beneath the body; they dominated the land for 135 million years and survive today as birds.' },
  { id: 'ornithischians', name: 'Bird-hipped dinosaurs', scientificName: 'Ornithischia', parent: 'dinosaurs', originMa: 240, category: 'dinosaur',
    description: 'Plant-eating dinosaurs with an extra beak-forming bone on the lower jaw; despite the name, they are not the ancestors of birds.' }, // first split of dinosaurs, before the 233-Ma faunas (Brusatte 2010)
  { id: 'thyreophorans', name: 'Armored dinosaurs', scientificName: 'Thyreophora', parent: 'ornithischians', originMa: 200, category: 'dinosaur',
    description: 'Ornithischians protected by rows of bony plates and spikes set in the skin: stegosaurs, ankylosaurs and their early kin.' }, // fossils from ~195 Ma (Scelidosaurus, Scutellosaurus)
  { id: 'stegosaurs', name: 'Stegosaurs', scientificName: 'Stegosauria', parent: 'thyreophorans', originMa: 175, category: 'dinosaur',
    description: 'Dinosaurs with upright plates or spines along the back and a spiked tail; at their peak in the Late Jurassic.' }, // both branches present by ~168 Ma
  { id: 'ankylosaurs', name: 'Ankylosaurs', scientificName: 'Ankylosauria', parent: 'thyreophorans', originMa: 175, category: 'dinosaur',
    description: 'Low, tank-like dinosaurs sheathed in bony armor, some swinging a heavy tail club; they lasted to the end of the Cretaceous.' },
  { id: 'ornithopods', name: 'Ornithopods', scientificName: 'Ornithopoda', parent: 'ornithischians', originMa: 170, category: 'dinosaur',
    description: 'Beaked, mostly two-legged plant-eaters with grinding cheek teeth, from small runners to Iguanodon and the duck-bills.' }, // before the first horned-dinosaur relatives (~160 Ma)
  { id: 'hadrosaurs', name: 'Duck-billed dinosaurs', scientificName: 'Hadrosauroidea', parent: 'ornithopods', originMa: 130, category: 'dinosaur',
    description: 'Large ornithopods with broad beaks and batteries of hundreds of teeth, many with hollow head crests; abundant in the Late Cretaceous.' }, // from Iguanodon-grade ancestors; first ~126 Ma
  { id: 'ceratopsians', name: 'Horned dinosaurs', scientificName: 'Ceratopsia', parent: 'ornithischians', originMa: 165, category: 'dinosaur',
    description: 'Parrot-beaked dinosaurs that began as small bipeds and ended as horned, frilled giants such as Triceratops.' }, // Yinlong ~160 Ma
  { id: 'pachycephalosaurs', name: 'Dome-headed dinosaurs', scientificName: 'Pachycephalosauria', parent: 'ornithischians', originMa: 165, category: 'dinosaur',
    description: 'Two-legged plant-eaters with thick, domed skull roofs, probably used for butting; the closest relatives of the horned dinosaurs.' },
  { id: 'sauropodomorphs', name: 'Sauropods & kin', scientificName: 'Sauropodomorpha', parent: 'dinosaurs', originMa: 235, category: 'dinosaur',
    description: 'Long-necked plant-eating dinosaurs, from early bipeds such as Plateosaurus to the sauropods, the largest land animals ever.' }, // both branches present in the 233–231-Ma faunas
  { id: 'diplodocoids', name: 'Diplodocoids', scientificName: 'Diplodocoidea', parent: 'sauropodomorphs', originMa: 180, category: 'dinosaur',
    description: 'Sauropods with long, low skulls, pencil-shaped teeth and whip-like tails, such as Diplodocus and Apatosaurus.' }, // before the oldest diplodocoid (Lingwulong, ~174 Ma)
  { id: 'macronarians', name: 'Macronarians', scientificName: 'Macronaria', parent: 'sauropodomorphs', originMa: 180, category: 'dinosaur',
    description: 'Sauropods with huge nostril openings: Camarasaurus, Brachiosaurus and the titanosaurs, the last and largest of the sauropods.' },
  { id: 'theropods', name: 'Theropods', scientificName: 'Theropoda', parent: 'dinosaurs', originMa: 235, category: 'dinosaur',
    description: 'Two-legged, mostly meat-eating dinosaurs with hollow bones and three main fingers; birds are living theropods.' },
  { id: 'coelophysoids', name: 'Coelophysoids', scientificName: 'Coelophysoidea', parent: 'theropods', originMa: 228, category: 'dinosaur',
    description: 'Slender, lightly built early theropods of the Late Triassic and Early Jurassic, such as Coelophysis.' }, // fossils from ~220 Ma
  { id: 'megalosauroids', name: 'Spinosaurs & megalosaurs', scientificName: 'Megalosauroidea', parent: 'theropods', originMa: 180, category: 'dinosaur',
    description: 'Large Jurassic and Cretaceous predators, among them Megalosaurus and the crocodile-snouted, fish-eating spinosaurids.' }, // fossils from ~170 Ma
  { id: 'allosauroids', name: 'Allosaurs & kin', scientificName: 'Allosauroidea', parent: 'theropods', originMa: 175, category: 'dinosaur',
    description: 'Big-headed predators at the top of Jurassic and Cretaceous food chains: Allosaurus and the giant carcharodontosaurs.' }, // before the first coelurosaurs (~167 Ma)
  { id: 'tyrannosauroids', name: 'Tyrannosaurs', scientificName: 'Tyrannosauroidea', parent: 'theropods', originMa: 170, category: 'dinosaur',
    description: 'Coelurosaurs that began small, and probably feathered, in the Jurassic and ended as giant bone-crushers such as Tyrannosaurus.' }, // Proceratosaurus, Kileskus ~167 Ma
  { id: 'dromaeosaurs', name: 'Raptor dinosaurs', scientificName: 'Dromaeosauridae', parent: 'theropods', originMa: 165, category: 'dinosaur',
    description: 'Feathered, sickle-clawed predators such as Velociraptor and Deinonychus; among the closest relatives of birds.' }, // before Anchiornis-grade paravians (~160 Ma)
  { id: 'birds', name: 'Birds', scientificName: 'Avialae', parent: 'theropods', originMa: 165, category: 'bird',
    description: 'Feathered theropods with winged arms, from toothed, long-tailed Archaeopteryx to some 11,000 living species.' },
  { id: 'enantiornithes', name: 'Opposite birds', scientificName: 'Enantiornithes', parent: 'birds', originMa: 135, category: 'bird',
    description: 'The commonest birds of the Cretaceous, most with teeth and clawed wings; none survived the end-Cretaceous extinction.' }, // both branches present by ~131 Ma
  { id: 'modern_birds', name: 'Modern birds & kin', scientificName: 'Euornithes', parent: 'birds', originMa: 135, category: 'bird',
    description: 'The branch leading to all living birds, with their toothless beaks; its Cretaceous members still included toothed seabirds.' },
  { id: 'palaeognaths', name: 'Ratites & tinamous', scientificName: 'Palaeognathae', parent: 'modern_birds', originMa: 100, category: 'bird',
    description: 'Ostriches, emus, kiwis, the extinct moas and elephant birds, and the flying tinamous; the oldest split among living birds.' }, // middle course: TT 108 (102–114); tight-prior genome studies <95
  { id: 'fowl', name: 'Waterfowl & landfowl', scientificName: 'Galloanserae', parent: 'modern_birds', originMa: 90, category: 'bird',
    description: 'Ducks, geese and swans together with chickens, pheasants and their kin; known from just before the asteroid impact.' }, // middle course: TT 96 (90–103); Benton 2015 maximum 86.8
  { id: 'neoaves', name: 'Neoaves', scientificName: null, parent: 'modern_birds', originMa: 90, category: 'bird',
    description: 'All other living birds, about 95% of species, which radiated explosively around the end-Cretaceous extinction.' },
  { id: 'cariamiformes', name: 'Seriemas & terror birds', scientificName: 'Cariamiformes', parent: 'neoaves', originMa: 67, category: 'bird',
    description: 'Long-legged ground birds, mainly of South America: two living seriemas and the extinct, flightless, predatory terror birds.' }, // land-bird and water-bird lines part in the K–Pg radiation (Stiller 2024); TT 67 (59–76)
  { id: 'penguins', name: 'Penguins', scientificName: 'Sphenisciformes', parent: 'neoaves', originMa: 63, category: 'bird',
    description: 'Flightless seabirds that fly underwater on flipper-like wings; their fossils begin only about five million years after the asteroid impact.' }, // split from tubenoses: TT 63 (61–64)

  // ---- Synapsids and mammals ------------------------------------------------------------------
  { id: 'synapsids', name: 'Synapsids', scientificName: 'Synapsida', parent: 'amniotes', originMa: 320, category: 'synapsid',
    description: 'The amniote branch that leads to mammals, marked by a single opening behind each eye; its early members were not reptiles.' },
  { id: 'edaphosaurs', name: 'Edaphosaurs', scientificName: 'Edaphosauridae', parent: 'synapsids', originMa: 310, category: 'synapsid',
    description: 'Sail-backed early synapsids with crossbars on the sail spines; among the first large plant-eating land vertebrates.' }, // fossils from ~305 Ma
  { id: 'sphenacodonts', name: 'Sphenacodonts', scientificName: 'Sphenacodontidae', parent: 'synapsids', originMa: 305, category: 'synapsid',
    description: 'Top predators of the early Permian such as sail-backed Dimetrodon; the closest relatives of the therapsids.' }, // fossils from ~300 Ma
  { id: 'therapsids', name: 'Therapsids', scientificName: 'Therapsida', parent: 'synapsids', originMa: 305, category: 'synapsid',
    description: 'Synapsids with more upright limbs and specialized teeth that dominated the later Permian; mammals are their only survivors.' }, // sister of the sphenacodonts; own fossils only from ~275–270 Ma
  { id: 'dicynodonts', name: 'Dicynodonts', scientificName: 'Anomodontia', parent: 'therapsids', originMa: 280, category: 'synapsid',
    description: 'Beaked, usually two-tusked plant-eating therapsids; Lystrosaurus famously flourished after the end-Permian extinction.' }, // fossils from ~268 Ma
  { id: 'gorgonopsians', name: 'Gorgonopsians', scientificName: 'Gorgonopsia', parent: 'therapsids', originMa: 275, category: 'synapsid',
    description: 'Saber-toothed therapsid predators of the Permian, wiped out in the end-Permian extinction.' }, // fossils from ~270–265 Ma
  { id: 'cynodonts', name: 'Cynodonts', scientificName: 'Cynodontia', parent: 'therapsids', originMa: 270, category: 'synapsid',
    description: 'Therapsids with a bony secondary palate and complex cheek teeth; the lineage from which mammals arose.' }, // fossils from ~260 Ma
  { id: 'mammaliaforms', name: 'Mammals', scientificName: 'Mammaliaformes', parent: 'cynodonts', originMa: 230, category: 'mammal',
    description: 'Small, furry, probably milk-producing cynodonts with the new mammalian jaw joint; every living mammal descends from them.' }, // mammals in the broad sense; set just before the first fossils (~225 Ma); Morganucodon ~205 Ma
  { id: 'monotremes', name: 'Egg-laying mammals', scientificName: 'Monotremata', parent: 'mammaliaforms', originMa: 180, category: 'mammal',
    description: 'Monotremes: the platypus and the echidnas, last survivors of a once wider southern radiation of egg-laying mammals.' }, // TT 181 (168–194); Benton 2015: 201.5–165
  { id: 'multituberculates', name: 'Multituberculates', scientificName: 'Multituberculata', parent: 'mammaliaforms', originMa: 170, category: 'mammal',
    description: 'Rodent-like mammals with many-cusped teeth that lasted more than 130 million years, from the Jurassic to the Eocene.' }, // between the monotreme split and their first fossils (~167 Ma)
  { id: 'marsupials', name: 'Marsupials', scientificName: 'Metatheria', parent: 'mammaliaforms', originMa: 162, category: 'mammal',
    description: 'Mammals whose tiny newborn finish developing attached to a teat, usually in a pouch: kangaroos, opossums and their extinct kin.' }, // fossil-led: the placental-line Juramaia is ~160.5 Ma; TT 159 (152–166); Benton 2015: 170–156
  { id: 'placentals', name: 'Placentals', scientificName: 'Eutheria', parent: 'mammaliaforms', originMa: 162, category: 'mammal',
    description: 'Mammals that nourish their young to an advanced stage through a placenta; molecular clocks date the living orders to the Cretaceous.' },
  { id: 'afrotheres', name: 'Afrotheres', scientificName: 'Afrotheria', parent: 'placentals', originMa: 97, category: 'mammal',
    description: 'A branch rooted in Africa that unites elephants, sea cows, hyraxes, aardvarks, tenrecs and golden moles.' }, // TT 97 (92–102); tied with xenarthrans
  { id: 'proboscideans', name: 'Elephants & kin', scientificName: 'Proboscidea', parent: 'afrotheres', originMa: 62, category: 'mammal',
    description: 'Trunked, tusked afrotheres: the living elephants and the extinct mammoths, mastodons and gomphotheres.' }, // split from sea cows: TT 61 (58–65); Eritherium ~60 Ma
  { id: 'xenarthrans', name: 'Sloths & armadillos', scientificName: 'Xenarthra', parent: 'placentals', originMa: 97, category: 'mammal',
    description: 'South American mammals with extra joints in the spine: sloths, anteaters, armadillos and extinct giants such as Glyptodon.' },
  { id: 'laurasiatheres', name: 'Laurasiatheres', scientificName: 'Laurasiatheria', parent: 'placentals', originMa: 90, category: 'mammal',
    description: 'A branch of placentals rooted in the northern continents: bats, carnivorans, hoofed mammals, whales, pangolins, shrews and moles.' }, // TT 89.5 (86–93)
  { id: 'bats', name: 'Bats', scientificName: 'Chiroptera', parent: 'laurasiatheres', originMa: 79, category: 'mammal',
    description: 'The only mammals capable of powered flight, most of them navigating by echolocation; about a fifth of living mammal species.' }, // TT 79 (76–82)
  { id: 'carnivorans', name: 'Carnivorans', scientificName: 'Carnivora', parent: 'laurasiatheres', originMa: 76, category: 'mammal',
    description: 'Mammals with scissor-like cheek teeth for slicing meat: cats, dogs, bears, weasels, seals and their kin.' }, // three-way tie with the hoofed orders: TT 76–72
  { id: 'feliforms', name: 'Cats, hyenas & kin', scientificName: 'Feliformia', parent: 'carnivorans', originMa: 54, category: 'mammal',
    description: 'Cat-like carnivorans: cats, including saber-tooths such as Smilodon, together with hyenas, civets and mongooses.' }, // TT 54 (51–56)
  { id: 'canids', name: 'Dogs & kin', scientificName: 'Canidae', parent: 'carnivorans', originMa: 45, category: 'mammal',
    description: 'Long-snouted running carnivorans that arose in North America: wolves, foxes, jackals and the extinct dire wolf.' }, // TT 45 (42–47.5)
  { id: 'ursids', name: 'Bears', scientificName: 'Ursidae', parent: 'carnivorans', originMa: 40, category: 'mammal',
    description: 'Large, heavily built carnivorans with a flat-footed gait and mostly mixed diets, including the extinct cave bear.' }, // split from seals and weasels: TT 40 (37–42)
  { id: 'perissodactyls', name: 'Odd-toed ungulates', scientificName: 'Perissodactyla', parent: 'laurasiatheres', originMa: 76, category: 'mammal',
    description: 'Hoofed mammals that carry their weight on the middle toe: horses, rhinos, tapirs and extinct giants such as Paraceratherium.' },
  { id: 'horses', name: 'Horses', scientificName: 'Equoidea', parent: 'perissodactyls', originMa: 57, category: 'mammal',
    description: 'From fox-sized forest browsers of the Eocene to one-toed grazers of the open plains; a classic fossil series of evolutionary change.' }, // fossil-led: first horses 56 Ma; TT 55 (54–56) is marginally younger
  { id: 'rhinos', name: 'Rhinos & tapirs', scientificName: 'Ceratomorpha', parent: 'perissodactyls', originMa: 57, category: 'mammal',
    description: 'Stout browsers and grazers, among them the hornless Paraceratherium, one of the largest land mammals that ever lived.' },
  { id: 'artiodactyls', name: 'Even-toed ungulates', scientificName: 'Artiodactyla', parent: 'laurasiatheres', originMa: 76, category: 'mammal',
    description: 'Hoofed mammals with a double-pulley ankle bone: pigs, camels, deer, cattle, hippos and, surprisingly, the whales.' },
  { id: 'whales', name: 'Whales & dolphins', scientificName: 'Cetaceamorpha', parent: 'artiodactyls', originMa: 55, category: 'mammal',
    description: 'Small hoofed waders such as Indohyus became fully marine whales within about ten million years; hippos are their closest living relatives.' }, // split from hippos: TT 53 (52–54); oldest whale ~53 Ma, so set slightly older
  { id: 'glires', name: 'Rodents & rabbits', scientificName: 'Glires', parent: 'placentals', originMa: 84, category: 'mammal',
    description: 'Gnawing mammals with ever-growing incisors; rodents alone account for about 40% of living mammal species.' }, // TT 83.5 (80–87)
  { id: 'primates', name: 'Primates', scientificName: null, parent: 'placentals', originMa: 75, category: 'primate',
    description: 'Tree-adapted mammals with grasping hands, nails instead of claws and forward-facing eyes: lemurs, monkeys, apes and us.' }, // split from colugos and treeshrews: TT 73 (66–80) and 80 (76–84)
  { id: 'haplorhines', name: 'Dry-nosed primates', scientificName: 'Haplorhini', parent: 'primates', originMa: 72, category: 'primate',
    description: 'Tarsiers, monkeys and apes: primates with a dry nose and continuous upper lip that rely more on sight than on smell.' }, // split from lemurs and lorises: TT 72 (69–74); Benton 2015 soft maximum 66
  { id: 'catarrhines', name: 'Old World monkeys & apes', scientificName: 'Catarrhini', parent: 'haplorhines', originMa: 42, category: 'primate',
    description: 'Old World monkeys and apes, with narrow, downward-facing nostrils and three-color vision; sister group of the New World monkeys.' }, // split from New World monkeys: TT 42 (40.5–44)
  { id: 'apes', name: 'Apes', scientificName: 'Hominoidea', parent: 'catarrhines', originMa: 29, category: 'primate',
    description: 'Tailless primates with broad chests, mobile shoulders and large brains: gibbons, great apes and early forms such as Proconsul.' }, // split from Old World monkeys: TT 29 (28–30); Benton 2015: 34–24
  { id: 'great_apes', name: 'Great apes', scientificName: 'Hominidae', parent: 'apes', originMa: 20, category: 'primate',
    description: 'Orangutans, gorillas, chimpanzees, bonobos and humans, with their extinct relatives; large-bodied, long-lived and slow to mature.' }, // split from gibbons: TT 19.6 (18.7–20.5)
  { id: 'hominins', name: 'Hominins', scientificName: 'Hominini', parent: 'great_apes', originMa: 7.5, category: 'hominin',
    description: 'The human side of the split from chimpanzees, marked by upright walking: Sahelanthropus, Australopithecus and Homo.' }, // fossil-led: Sahelanthropus ~7 Ma; TT 6.5 (6.2–6.7); Benton 2015 maximum 10
  { id: 'homo', name: 'Humans', scientificName: 'Homo', parent: 'hominins', originMa: 3, category: 'hominin',
    description: 'Our own genus: larger-brained, tool-dependent hominins that spread out of Africa; Homo sapiens is the only survivor.' }, // oldest Homo jaw 2.8 Ma (Ledi-Geraru)
];

export const cladeById = new Map(clades.map((c) => [c.id, c]));

const childrenById = new Map(clades.map((c) => [c.id, []]));
for (const c of clades) {
  if (c.parent !== null) childrenById.get(c.parent)?.push(c);
}

/** [root, ..., clade] for a clade id (empty array if unknown). */
export function getLineage(cladeId) {
  const lineage = [];
  let node = cladeById.get(cladeId);
  // The length guard only matters if the data ever gained a parent cycle.
  while (node && lineage.length < clades.length) {
    lineage.push(node);
    node = node.parent === null ? undefined : cladeById.get(node.parent);
  }
  return lineage.reverse();
}

/** Direct children of a clade, in branching order (a new array; empty if none or unknown). */
export function getChildren(cladeId) {
  return [...(childrenById.get(cladeId) ?? [])];
}

/** Lowest common ancestor clade of two clade ids (or null). */
export function lowestCommonAncestor(a, b) {
  const lineageA = getLineage(a);
  const lineageB = getLineage(b);
  let ancestor = null;
  for (let i = 0; i < lineageA.length && i < lineageB.length && lineageA[i] === lineageB[i]; i++) {
    ancestor = lineageA[i];
  }
  return ancestor;
}

/**
 * Divergence time in Ma between two clade ids = originMa of the first branch below their LCA
 * that separates them (0 if identical; larger = more distantly related; Infinity if either id is
 * unknown, so that unknowns sort last).
 */
export function divergenceMa(a, b) {
  const lineageA = getLineage(a);
  const lineageB = getLineage(b);
  if (lineageA.length === 0 || lineageB.length === 0) return Infinity;
  if (a === b) return 0;
  let i = 0;
  while (i < lineageA.length && i < lineageB.length && lineageA[i] === lineageB[i]) i++;
  if (i === 0) return Infinity;
  // One of the two is missing when one clade is an ancestor of the other.
  const branchA = lineageA[i];
  const branchB = lineageB[i];
  return Math.max(branchA ? branchA.originMa : -Infinity, branchB ? branchB.originMa : -Infinity);
}
