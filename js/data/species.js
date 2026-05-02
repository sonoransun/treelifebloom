// Species and event entries across all geological eons.
// abundanceProfile: array of [Ma, relative_abundance (0-1)] pairs, interpolated at runtime.
// description: short one-line label (sidebar uses ellipsis at css/styles.css:340).
// descriptionLong: 2-3 sentences for hover popup (morphology / ecology / significance).
// Linnaean taxonomy (domain → species) and `rank` are merged in from
// ./speciesTaxonomy.js at module load. scientificName values are overridden there when
// the raw entry below uses a loose common-name form.

import { TAXONOMY } from './speciesTaxonomy.js';

const rawSpecies = [
  // ===== ARCHEAN EON =====
  {
    id: 'prokaryotes',
    name: 'Prokaryotes',
    scientificName: 'Bacteria & Archaea',
    appearanceMa: 3800,
    extinctMa: null,
    abundanceProfile: [[3800, 0.01], [3500, 0.3], [2700, 0.7], [2000, 0.9], [541, 0.6], [0, 0.5]],
    description: 'First life — single-celled organisms',
    descriptionLong: 'Single-celled organisms without nuclei or membrane-bound organelles, the only inhabitants of Earth for nearly two billion years. They invented every major metabolic pathway — fermentation, anaerobic respiration, photosynthesis — and still dominate the biosphere by mass and chemistry today, driving the planet\'s nitrogen, sulfur and carbon cycles.',
    location: { lat: -10, lon: 30 }
  },
  {
    id: 'stromatolites',
    name: 'Stromatolites',
    scientificName: 'Cyanobacteria mats',
    appearanceMa: 3500,
    extinctMa: null,
    abundanceProfile: [[3500, 0.01], [2700, 0.8], [2000, 0.7], [541, 0.2], [0, 0.05]],
    description: 'Photosynthetic mats; began oxygenating the atmosphere',
    descriptionLong: 'Layered mineral structures built by communities of photosynthetic cyanobacteria trapping sediment grain by grain. For more than two billion years they were the dominant macroscopic life on Earth, and their cumulative oxygen production rusted the oceans and triggered the Great Oxygenation Event. Living examples still grow today in hypersaline bays like Shark Bay, Australia.',
    location: { lat: -22, lon: 114 }
  },

  // ===== PROTEROZOIC EON =====
  {
    id: 'eukaryotes',
    name: 'First Eukaryotes',
    scientificName: 'Grypania spiralis',
    appearanceMa: 2100,
    extinctMa: null,
    abundanceProfile: [[2100, 0.01], [1500, 0.3], [1000, 0.5], [541, 0.7], [0, 0.8]],
    description: 'Cells with nuclei — foundation for complex life',
    descriptionLong: 'Cells with a true nucleus and membrane-bound organelles — including mitochondria descended from engulfed bacteria via endosymbiosis. This single architectural leap unlocked the size, energy budget, and complexity required for every plant, animal, fungus, and protist that followed. Without it, Earth would still be a microbial planet.',
    location: { lat: 10, lon: -60 }
  },
  {
    id: 'red_algae',
    name: 'Multicellular Red Algae',
    scientificName: 'Bangiomorpha pubescens',
    appearanceMa: 1200,
    extinctMa: null,
    abundanceProfile: [[1200, 0.01], [800, 0.3], [541, 0.2], [0, 0.15]],
    description: 'First multicellular organism; sexual reproduction appears',
    descriptionLong: 'Bangiomorpha is the oldest fossil organism with clearly differentiated cell types and the earliest unambiguous evidence of sexual reproduction. By coordinating specialized cells into a single body it pioneered a strategy that all complex life — animals, fungi, plants — would later refine. Modern red algae remain critical reef-builders and sources of agar and nori.',
    location: { lat: 20, lon: -80 }
  },
  {
    id: 'fungi_divergence',
    name: 'First Fungi',
    scientificName: 'Opisthokonta',
    appearanceMa: 1000,
    extinctMa: null,
    abundanceProfile: [[1000, 0.01], [600, 0.3], [400, 0.6], [0, 0.7]],
    description: 'Decomposer kingdom diverges from animal lineage',
    descriptionLong: 'Fungi share a common ancestor with animals more recently than either does with plants — both are opisthokonts, swimming or feeding via a single posterior flagellum. Once on land, fungi became the planet\'s primary recyclers of dead biomass and partnered with plant roots in mycorrhizal symbioses that made forests possible. Without them, every dead leaf would still be sitting where it fell.',
    location: { lat: 0, lon: 0 }
  },
  {
    id: 'lichens',
    name: 'Lichens',
    scientificName: 'Fungi-algae symbiosis',
    appearanceMa: 600,
    extinctMa: null,
    abundanceProfile: [[600, 0.01], [470, 0.3], [350, 0.5], [200, 0.4], [0, 0.4]],
    description: 'Fungus-algae symbiosis; pioneers of bare rock',
    descriptionLong: 'A composite organism in which a fungus provides physical structure and water retention while an algal or cyanobacterial partner photosynthesizes inside. Lichens colonize bare rock and accelerate weathering through chemical secretions, slowly producing the soil substrate that vascular plants would later need. They were among the first complex life to live exposed on land.',
    location: { lat: 0, lon: 0 }
  },
  {
    id: 'ediacaran_biota',
    name: 'Ediacaran Biota',
    scientificName: 'Charnia, Spriggina',
    appearanceMa: 575,
    extinctMa: 538,
    abundanceProfile: [[575, 0.01], [560, 0.7], [545, 0.5], [538, 0.01]],
    description: 'First large, complex organisms — soft-bodied and enigmatic',
    descriptionLong: 'A worldwide assemblage of soft-bodied, mostly sessile organisms with body plans unlike anything alive today — fronds, discs, quilted ribbons, and spindles up to a meter long. They appeared after the Marinoan Snowball Earth thaw and vanished at the dawn of the Cambrian, possibly outcompeted by newly evolved mobile predators. Whether they represent failed experiments or ancestors of modern phyla is still fiercely debated.',
    location: { lat: -30, lon: 40 }
  },
  {
    id: 'dickinsonia_sp',
    name: 'Dickinsonia',
    scientificName: 'Dickinsonia costata',
    appearanceMa: 571,
    extinctMa: 538,
    abundanceProfile: [[571, 0.01], [560, 0.4], [545, 0.3], [538, 0.01]],
    description: 'Iconic flat ribbed Ediacaran of contested affinity',
    descriptionLong: 'A flat, ribbed, oval organism up to 1.4 meters long whose biological affinity remained debated for eighty years. Cholesterol biomarkers preserved in its fossils now identify it as one of Earth\'s earliest known animals, predating the Cambrian explosion by roughly thirty million years. It likely fed by absorbing nutrients across its underside while resting motionless on Ediacaran microbial mats.',
    location: { lat: -32, lon: 138 }
  },
  {
    id: 'kimberella',
    name: 'Kimberella',
    scientificName: 'Kimberella quadrata',
    appearanceMa: 555,
    extinctMa: 538,
    abundanceProfile: [[555, 0.01], [548, 0.4], [540, 0.3], [538, 0.01]],
    description: 'Possibly the first bilaterian animal',
    descriptionLong: 'A slug-shaped Ediacaran with a clearly defined front and back, head and tail — the oldest unambiguous bilaterian, the body plan that all worms, insects, fish, and humans share. Trace fossils show it scraped microbial mats with a radula-like feeding organ, suggesting an early mollusk-grade animal. Its existence pushes the origin of complex animal anatomy more than fifteen million years before the Cambrian explosion.',
    location: { lat: -35, lon: 50 }
  },

  // ===== CAMBRIAN PERIOD =====
  {
    id: 'trilobite',
    name: 'Trilobites',
    scientificName: 'Trilobita',
    appearanceMa: 521,
    extinctMa: 252,
    abundanceProfile: [[521, 0.01], [500, 0.8], [470, 0.9], [400, 0.5], [300, 0.3], [252, 0.01]],
    description: 'Iconic Paleozoic arthropods; dominated ancient seas',
    descriptionLong: 'Three-lobed segmented arthropods with the earliest sophisticated compound eyes — built from arrays of calcite lenses still preserved as crystals in their fossils. They diversified into more than twenty thousand species across every marine niche, from blind burrowers to free-swimming hunters. After surviving two mass extinctions, the last trilobite line was finally erased by the End-Permian event.',
    location: { lat: -15, lon: 10 }
  },
  {
    id: 'anomalocaris',
    name: 'Anomalocaris',
    scientificName: 'Anomalocaris canadensis',
    appearanceMa: 518,
    extinctMa: 480,
    abundanceProfile: [[518, 0.01], [510, 0.7], [495, 0.5], [480, 0.01]],
    description: 'Apex predator of the Cambrian seas',
    descriptionLong: 'The first known apex predator, reaching a meter in length when most Cambrian animals were finger-sized. It hunted with a pair of segmented grasping appendages and a circular ring of plates around its mouth, propelled by undulating lateral flaps. Its fossils were so strange that early paleontologists described its body, mouth and arms as three separate species before finally piecing them together.',
    location: { lat: 10, lon: -120 }
  },
  {
    id: 'opabinia',
    name: 'Opabinia',
    scientificName: 'Opabinia regalis',
    appearanceMa: 508,
    extinctMa: 500,
    abundanceProfile: [[508, 0.01], [505, 0.4], [502, 0.3], [500, 0.01]],
    description: 'Five eyes and a clawed proboscis — Burgess Shale weirdness',
    descriptionLong: 'A finger-sized Cambrian oddity with five mushroom-shaped eyes mounted on stalks and a long flexible proboscis tipped with a grasping claw. When first reconstructed in 1972, the audience at the Palaeontological Association laughed — convinced no real animal could look so absurd. It is now considered a cousin of Anomalocaris and a key witness to the morphological wildness of the Cambrian explosion.',
    location: { lat: 51, lon: -116 }
  },
  {
    id: 'hallucigenia',
    name: 'Hallucigenia',
    scientificName: 'Hallucigenia sparsa',
    appearanceMa: 515,
    extinctMa: 490,
    abundanceProfile: [[515, 0.01], [508, 0.4], [500, 0.3], [490, 0.01]],
    description: 'Bizarre spiny creature from the Burgess Shale',
    descriptionLong: 'A worm-like Cambrian animal originally reconstructed upside-down and back-to-front, walking on its defensive spines with tentacles waving from its back. Re-examination found tiny claws on the true legs and identified its head — long mistaken for a mineral blob — as a simple eye-bearing structure. It is now classed among the lobopodians, a stem group leading toward modern arthropods and velvet worms.',
    location: { lat: 15, lon: -115 }
  },
  {
    id: 'pikaia',
    name: 'Pikaia',
    scientificName: 'Pikaia gracilens',
    appearanceMa: 505,
    extinctMa: 490,
    abundanceProfile: [[505, 0.01], [500, 0.3], [495, 0.2], [490, 0.01]],
    description: 'Early chordate — ancestor of all vertebrates',
    descriptionLong: 'A small leaf-shaped swimmer from the Burgess Shale with a clearly visible notochord — the stiffening rod that defines the chordate body plan and would eventually become the vertebral column. It probably fed by filtering particles from the water while propelling itself with sinuous side-to-side undulations. As one of the earliest known chordates, it sits very near the trunk of the lineage that produced fish, amphibians, dinosaurs, and us.',
    location: { lat: 10, lon: -115 }
  },

  // ===== ORDOVICIAN PERIOD =====
  {
    id: 'nautiloid',
    name: 'Nautiloids',
    scientificName: 'Orthoceras',
    appearanceMa: 480,
    extinctMa: null,
    abundanceProfile: [[480, 0.01], [460, 0.7], [420, 0.5], [252, 0.2], [66, 0.1], [0, 0.05]],
    description: 'First major cephalopod predators',
    descriptionLong: 'Shelled cephalopods with chambered conical or coiled shells whose internal gas-filled compartments controlled buoyancy — the same engineering still used by the surviving chambered nautilus. They were the dominant marine predators for nearly a hundred million years before fish jaws and ammonites displaced most lineages. A handful of species in tropical Indo-Pacific reefs are the last living members.',
    location: { lat: -20, lon: 0 }
  },
  {
    id: 'cameroceras',
    name: 'Cameroceras',
    scientificName: 'Cameroceras trentonense',
    appearanceMa: 470,
    extinctMa: 440,
    abundanceProfile: [[470, 0.01], [460, 0.6], [450, 0.5], [440, 0.01]],
    description: 'Giant Ordovician nautiloid, ~6 meter shell',
    descriptionLong: 'A straight-shelled nautiloid with a conical shell that may have exceeded six meters, making it among the largest animals of its era. It was the apex predator of Ordovician seas, hunting trilobites and early jawless fish with its tentacled head while jet-propelling backwards through warm shallow waters. The end-Ordovician glaciation and sea-level drop wiped out its preferred reef habitats.',
    location: { lat: -10, lon: -20 }
  },
  {
    id: 'land_plants_early',
    name: 'First Land Plants',
    scientificName: 'Bryophyta (mosses)',
    appearanceMa: 470,
    extinctMa: null,
    abundanceProfile: [[470, 0.01], [440, 0.2], [400, 0.4], [300, 0.5], [0, 0.4]],
    description: 'Plants begin colonizing land',
    descriptionLong: 'Low-growing non-vascular plants — mosses, liverworts and hornworts — that crept out of freshwater margins by tolerating desiccation and absorbing water directly through their tissues. Lacking roots or internal plumbing they stayed small and hugged moist surfaces, but they accelerated chemical weathering of rock and began drawing down atmospheric CO₂. Their descendants still carpet wet forests and tundra worldwide.',
    location: { lat: -30, lon: 20 }
  },
  {
    id: 'sea_scorpion',
    name: 'Sea Scorpions',
    scientificName: 'Eurypterida',
    appearanceMa: 467,
    extinctMa: 252,
    abundanceProfile: [[467, 0.01], [430, 0.7], [390, 0.5], [300, 0.2], [252, 0.01]],
    description: 'Giant marine predators, up to 2.5 meters long',
    descriptionLong: 'Eurypterids were the largest known arthropods ever, with Jaekelopterus reaching about 2.5 meters — longer than a human is tall. They patrolled coastal seas and brackish lagoons with paired grasping claws, eventually invading freshwater and possibly even brief excursions onto land using book-lung-like respiration. Their long reign ended with the End-Permian extinction.',
    location: { lat: -10, lon: -30 }
  },

  // ===== SILURIAN PERIOD =====
  {
    id: 'jawed_fish',
    name: 'First Jawed Fish',
    scientificName: 'Acanthodii',
    appearanceMa: 430,
    extinctMa: 250,
    abundanceProfile: [[430, 0.01], [400, 0.5], [370, 0.7], [300, 0.4], [250, 0.01]],
    description: 'Jaws — a revolutionary evolutionary innovation',
    descriptionLong: 'Acanthodians, or "spiny sharks," were the first vertebrates with hinged jaws, evolved from the front gill arches of jawless ancestors. Jaws transformed feeding strategies almost instantly, allowing active predation, biting, and shell-crushing rather than passive filter-feeding. Every fish, amphibian, reptile, bird and mammal alive today inherits a modified version of this single anatomical innovation.',
    location: { lat: -20, lon: -10 }
  },
  {
    id: 'vascular_plants',
    name: 'Vascular Plants',
    scientificName: 'Cooksonia',
    appearanceMa: 425,
    extinctMa: null,
    abundanceProfile: [[425, 0.01], [400, 0.3], [350, 0.6], [200, 0.7], [0, 0.8]],
    description: 'Plants with internal water transport colonize further inland',
    descriptionLong: 'Cooksonia and its kin pioneered xylem and phloem — internal tubes that conduct water upward and sugars downward, freeing plants from a life pressed against damp surfaces. With internal plumbing they could grow tall, escape competitors, and colonize drier inland habitats, setting up the explosion of Devonian forests. Every tree, vine and grass alive today is a descendant of this innovation.',
    location: { lat: -25, lon: 15 }
  },
  {
    id: 'land_arthropods',
    name: 'First Land Arthropods',
    scientificName: 'Pneumodesmus (millipedes)',
    appearanceMa: 420,
    extinctMa: null,
    abundanceProfile: [[420, 0.01], [380, 0.4], [320, 0.6], [200, 0.4], [0, 0.3]],
    description: 'Animals follow plants onto land',
    descriptionLong: 'Tiny millipedes and arachnids were the first animals to breathe atmospheric oxygen for their entire lives, following the new bryophyte and vascular plant cover onto land. Their waxy cuticles prevented desiccation and their hardened exoskeletons supported their bodies without buoyancy. They opened a vast new ecosystem that vertebrates would not enter for another fifty million years.',
    location: { lat: -15, lon: 5 }
  },

  // ===== DEVONIAN PERIOD =====
  {
    id: 'insects_first',
    name: 'First Insects',
    scientificName: 'Rhyniognatha',
    appearanceMa: 400,
    extinctMa: null,
    abundanceProfile: [[400, 0.01], [350, 0.3], [300, 0.6], [100, 0.8], [0, 0.9]],
    description: 'The most diverse animal group begins',
    descriptionLong: 'Insects diverged from crustacean-like ancestors and quickly developed the segmented six-legged body plan that has produced more species than any other group of animals in Earth\'s history. The later evolution of wings made them the first animals to fly — by some 100 million years before vertebrates. Today insects account for more than half of all described species and most terrestrial animal biomass.',
    location: { lat: 0, lon: -10 }
  },
  {
    id: 'first_forests',
    name: 'First Forests',
    scientificName: 'Archaeopteris',
    appearanceMa: 385,
    extinctMa: 350,
    abundanceProfile: [[385, 0.01], [375, 0.6], [360, 0.8], [350, 0.01]],
    description: 'First true trees form forests, transforming landscapes',
    descriptionLong: 'Archaeopteris was the first plant with a modern tree architecture: woody trunk, deep root systems, and broad photosynthetic foliage. Its forests stabilized soils, deepened the carbon cycle, and drew down so much atmospheric CO₂ that they likely contributed to the Late Devonian cooling and extinction. Wood as a structural material became one of evolution\'s most consequential inventions.',
    location: { lat: -5, lon: -20 }
  },
  {
    id: 'dunkleosteus',
    name: 'Dunkleosteus',
    scientificName: 'Dunkleosteus terrelli',
    appearanceMa: 382,
    extinctMa: 358,
    abundanceProfile: [[382, 0.01], [375, 0.6], [365, 0.7], [358, 0.01]],
    description: 'Devonian armored apex predator with bone-shearing jaws',
    descriptionLong: 'A six-meter armored placoderm whose head and shoulders were sheathed in interlocking bony plates. Instead of teeth it used self-sharpening bony blades capable of bite forces estimated above 5,000 newtons — among the most powerful in any vertebrate. It was the apex predator of Devonian seas before the entire placoderm lineage went extinct in the Hangenberg event.',
    location: { lat: 30, lon: -80 }
  },
  {
    id: 'tiktaalik',
    name: 'Tiktaalik',
    scientificName: 'Tiktaalik roseae',
    appearanceMa: 375,
    extinctMa: 360,
    abundanceProfile: [[375, 0.01], [370, 0.5], [365, 0.3], [360, 0.01]],
    description: 'Fish-tetrapod transitional form — fins becoming limbs',
    descriptionLong: 'A predicted transitional form discovered exactly where and when paleontologists expected — in 375-million-year-old Devonian river deposits in the Canadian Arctic. It combined a flat crocodile-like skull and mobile neck with fins containing wrist and finger-like bones, allowing it to prop itself up in shallow oxygen-poor water. It is the textbook example of evolution moving vertebrates onto land.',
    location: { lat: 5, lon: -15 }
  },
  {
    id: 'first_amphibians',
    name: 'First Amphibians',
    scientificName: 'Ichthyostega',
    appearanceMa: 365,
    extinctMa: null,
    abundanceProfile: [[365, 0.01], [340, 0.5], [300, 0.6], [200, 0.3], [0, 0.2]],
    description: 'Vertebrates walk on land for the first time',
    descriptionLong: 'Ichthyostega still kept a fish-like tail and seven digits per limb, but possessed weight-bearing ribs and a sturdy pelvis attached to the spine. It probably moved more like a mudskipper than a salamander, dragging itself between pools rather than truly walking. Its lineage produced every land vertebrate that followed, including modern frogs, reptiles, birds, and mammals.',
    location: { lat: 0, lon: -25 }
  },
  {
    id: 'acanthostega',
    name: 'Acanthostega',
    scientificName: 'Acanthostega gunnari',
    appearanceMa: 365,
    extinctMa: 360,
    abundanceProfile: [[365, 0.01], [363, 0.4], [361, 0.3], [360, 0.01]],
    description: 'Eight-fingered tetrapod that lived in water',
    descriptionLong: 'A meter-long aquatic tetrapod with eight fingers on each hand and internal gills retained from its fish ancestors. Its limbs were too weak to support its body on land, suggesting that legs and digits first evolved for navigating shallow weed-choked water rather than for walking. It overturned the long-held assumption that vertebrates evolved limbs in order to crawl ashore.',
    location: { lat: 70, lon: -40 }
  },

  // ===== CARBONIFEROUS PERIOD =====
  {
    id: 'giant_insects',
    name: 'Giant Insects',
    scientificName: 'Meganeura (70cm wingspan)',
    appearanceMa: 350,
    extinctMa: 299,
    abundanceProfile: [[350, 0.01], [330, 0.6], [310, 0.7], [299, 0.01]],
    description: 'High oxygen enables insects of enormous size',
    descriptionLong: 'Carboniferous skies hosted dragonfly relatives like Meganeura with wingspans of seventy centimeters and millipedes (Arthropleura) over two meters long. Insects breathe through passive tracheal tubes whose efficiency is limited by atmospheric oxygen, so the 30+ percent O₂ levels of the Carboniferous let them grow to sizes physically impossible today. As oxygen fell across the Permian, gigantism vanished with it.',
    location: { lat: 5, lon: -5 }
  },
  {
    id: 'first_reptiles',
    name: 'First Reptiles',
    scientificName: 'Hylonomus lyelli',
    appearanceMa: 312,
    extinctMa: null,
    abundanceProfile: [[312, 0.01], [280, 0.4], [250, 0.5], [200, 0.6], [66, 0.7], [0, 0.5]],
    description: 'Amniotic egg frees vertebrates from water for reproduction',
    descriptionLong: 'Hylonomus was a small lizard-shaped insectivore that laid the first known shelled, water-tight amniotic eggs — a self-contained life-support pod with its own water supply, food and waste membrane. This single innovation freed vertebrates from their evolutionary tether to standing water and made the conquest of dry interiors possible. Every reptile, bird, and mammal alive today inherits the amniotic egg.',
    location: { lat: 10, lon: -10 }
  },
  {
    id: 'coal_forests',
    name: 'Coal Swamp Forests',
    scientificName: 'Lepidodendron, Sigillaria',
    appearanceMa: 330,
    extinctMa: 299,
    abundanceProfile: [[330, 0.01], [320, 0.7], [310, 0.9], [299, 0.01]],
    description: 'Massive forests whose burial creates coal deposits',
    descriptionLong: 'Equatorial Pangaea was covered in vast wetland forests of giant lycopods — scale trees up to forty meters tall with photosynthetic bark and shallow root mats. When they fell into anoxic swamps, fungi had not yet evolved the enzymes to digest their lignin, so they accumulated, compressed, and eventually became the world\'s coal seams. The carbon they sequestered drove atmospheric CO₂ to one of the lowest levels in Earth history.',
    location: { lat: 0, lon: 0 }
  },

  // ===== PERMIAN PERIOD =====
  {
    id: 'edaphosaurus',
    name: 'Edaphosaurus',
    scientificName: 'Edaphosaurus pogonias',
    appearanceMa: 303,
    extinctMa: 272,
    abundanceProfile: [[303, 0.01], [290, 0.5], [280, 0.6], [272, 0.01]],
    description: 'Sail-backed early synapsid herbivore',
    descriptionLong: 'A 3-meter sail-backed synapsid that, unlike its more famous relative Dimetrodon, was a plant-eater equipped with peg-like teeth and a barrel-shaped gut for fermenting tough vegetation. Its dorsal sail was studded with crossbars, possibly for thermoregulation, display, or both. As one of the earliest vertebrate herbivores it helped establish the modern plant-herbivore-carnivore food chain on land.',
    location: { lat: 12, lon: -30 }
  },
  {
    id: 'dimetrodon',
    name: 'Dimetrodon',
    scientificName: 'Dimetrodon grandis',
    appearanceMa: 295,
    extinctMa: 272,
    abundanceProfile: [[295, 0.01], [285, 0.6], [278, 0.7], [272, 0.01]],
    description: 'Sail-backed synapsid; on the mammal ancestry line',
    descriptionLong: 'A 3-meter sail-backed predator that, despite its dinosaurian appearance, lived 50 million years before any dinosaur and is more closely related to mammals than to reptiles. The "two-measure tooth" name reflects its differentiated dentition — distinct shearing and stabbing teeth, an early step toward the specialized mammalian dental kit. The sail likely functioned in thermoregulation, display, or species recognition.',
    location: { lat: 10, lon: -30 }
  },
  {
    id: 'mesosaurus',
    name: 'Mesosaurus',
    scientificName: 'Mesosaurus tenuidens',
    appearanceMa: 299,
    extinctMa: 270,
    abundanceProfile: [[299, 0.01], [285, 0.5], [275, 0.4], [270, 0.01]],
    description: 'Pangaea biogeography marker — South America + Africa',
    descriptionLong: 'A small freshwater reptile whose fossils are found only in matching rock layers in South America and southern Africa — a geographic puzzle that helped Alfred Wegener argue for continental drift. Its needle-like teeth interlocked into a basket for filter-feeding tiny crustaceans, and it propelled itself with a flattened tail. Its biogeography is now a textbook fingerprint of the Pangaea supercontinent.',
    location: { lat: -30, lon: 0 }
  },
  {
    id: 'therapsids',
    name: 'Therapsids',
    scientificName: 'Mammal-like reptiles',
    appearanceMa: 275,
    extinctMa: null,
    abundanceProfile: [[275, 0.01], [260, 0.6], [252, 0.3], [230, 0.2], [200, 0.1], [150, 0.05]],
    description: 'Increasingly mammalian features evolve',
    descriptionLong: 'Therapsids accumulated the gradual transformations that would make mammals possible: differentiated teeth, an upright limb posture under the body, a secondary palate for breathing while chewing, and probably some degree of warm-bloodedness and fur. Most lineages perished in the End-Permian extinction, but one group — the cynodonts — survived to give rise to true mammals. They are not "reptiles" in any modern sense.',
    location: { lat: -20, lon: 30 }
  },
  {
    id: 'lystrosaurus',
    name: 'Lystrosaurus',
    scientificName: 'Lystrosaurus murrayi',
    appearanceMa: 255,
    extinctMa: 250,
    abundanceProfile: [[255, 0.01], [253, 0.4], [251.5, 0.95], [251, 0.9], [250, 0.5]],
    description: 'Pig-sized survivor that dominated post-Great Dying',
    descriptionLong: 'A barrel-bodied burrowing herbivore with a tusked beak that became, briefly, the most successful land vertebrate ever. In the desolate aftermath of the End-Permian extinction it accounted for as much as 95 percent of all terrestrial vertebrate fossils — an empty world taken over by one ecological generalist. Its global distribution across Pangaea also became key evidence for plate tectonics.',
    location: { lat: -28, lon: 24 }
  },

  // ===== TRIASSIC PERIOD =====
  {
    id: 'first_dinosaurs',
    name: 'First Dinosaurs',
    scientificName: 'Nyasasaurus parringtoni',
    appearanceMa: 243,
    extinctMa: 66,
    abundanceProfile: [[243, 0.01], [230, 0.2], [200, 0.5], [150, 0.8], [100, 0.9], [66, 0.01]],
    description: 'Small bipedal forms that will come to dominate Earth',
    descriptionLong: 'The earliest dinosaurs were small bipedal carnivores, dwarfed by giant rauisuchian crocodile-line reptiles that were the actual top predators of the Triassic. Only after the End-Triassic extinction wiped out their competitors did dinosaurs explode into the empty niches. From these inauspicious beginnings they would dominate every terrestrial vertebrate niche for the next 165 million years.',
    location: { lat: -30, lon: 35 }
  },
  {
    id: 'first_mammals',
    name: 'First True Mammals',
    scientificName: 'Morganucodon',
    appearanceMa: 210,
    extinctMa: null,
    abundanceProfile: [[210, 0.01], [150, 0.1], [66, 0.15], [55, 0.5], [20, 0.7], [0, 0.8]],
    description: 'Tiny nocturnal insectivores; mammals begin',
    descriptionLong: 'Morganucodon was a shrew-sized nocturnal insectivore with fully mammalian middle-ear bones and replaceable teeth set in a single plane. For 150 million years its descendants stayed small and nocturnal, hiding from dinosaurs and evolving acute hearing, smell, and warm-bloodedness — the very traits that would let mammals diversify explosively after the K-Pg extinction. Every mammal alive today is built on its blueprint.',
    location: { lat: -20, lon: 20 }
  },
  {
    id: 'pterosaur',
    name: 'Pterosaurs',
    scientificName: 'Pterosauria',
    appearanceMa: 228,
    extinctMa: 66,
    abundanceProfile: [[228, 0.01], [200, 0.3], [150, 0.5], [100, 0.6], [66, 0.01]],
    description: 'First vertebrates to achieve powered flight',
    descriptionLong: 'Pterosaurs invented vertebrate flight 80 million years before birds, with wings formed from a membrane stretched between an enormously elongated fourth finger and the body. Hollow pneumatic bones and an air-sac respiratory system kept them light, and species ranged from sparrow-sized insectivores to the largest flying animals ever known. They are not flying dinosaurs — they were a separate sister lineage that shared a common reptile ancestor.',
    location: { lat: -10, lon: 15 }
  },

  // ===== JURASSIC PERIOD =====
  {
    id: 'stegosaurus',
    name: 'Stegosaurus',
    scientificName: 'Stegosaurus stenops',
    appearanceMa: 155,
    extinctMa: 150,
    abundanceProfile: [[155, 0.01], [153, 0.6], [151, 0.5], [150, 0.01]],
    description: 'Iconic plated dinosaur of the Late Jurassic',
    descriptionLong: 'A nine-meter herbivore with two staggered rows of bony plates along its back and four lethal meter-long spikes on its tail (the "thagomizer"). Despite its size, its braincase held a brain the size of a walnut, and the plates were honeycombed with blood vessels — likely used for thermoregulation, display, or both. Fossil evidence shows allosaurs were sometimes killed by tail-spike strikes.',
    location: { lat: 20, lon: -60 }
  },
  {
    id: 'brachiosaurus',
    name: 'Brachiosaurus',
    scientificName: 'Brachiosaurus altithorax',
    appearanceMa: 154,
    extinctMa: 140,
    abundanceProfile: [[154, 0.01], [150, 0.6], [145, 0.5], [140, 0.01]],
    description: 'Giant sauropod, up to 13 meters tall',
    descriptionLong: 'A 50-tonne sauropod whose forelimbs were longer than its hind legs, lifting its head thirteen meters above the ground — a giraffe-like browsing strategy. Its hollow vertebrae and air-sac respiratory system (inherited and shared with modern birds) made the colossal frame possible without crushing weight. The "Berlin Brachiosaurus" mounted at the Museum für Naturkunde remains the tallest assembled dinosaur skeleton in the world.',
    location: { lat: 15, lon: -55 }
  },
  {
    id: 'archaeopteryx',
    name: 'Archaeopteryx',
    scientificName: 'Archaeopteryx lithographica',
    appearanceMa: 150,
    extinctMa: 140,
    abundanceProfile: [[150, 0.01], [148, 0.4], [144, 0.3], [140, 0.01]],
    description: 'Dinosaur-bird transitional form; feathered flight',
    descriptionLong: 'A magpie-sized animal with the asymmetric flight feathers and wishbone of a bird but the toothed jaws, clawed wings, and long bony tail of a small theropod dinosaur. Discovered in Bavarian limestone two years after Darwin published On the Origin of Species, it became the most celebrated transitional fossil in evolutionary biology. Modern birds are now understood to be living theropod dinosaurs.',
    location: { lat: 25, lon: 15 }
  },
  {
    id: 'flowering_plants',
    name: 'Flowering Plants',
    scientificName: 'Angiosperms',
    appearanceMa: 140,
    extinctMa: null,
    abundanceProfile: [[140, 0.01], [100, 0.3], [66, 0.5], [30, 0.8], [0, 0.9]],
    description: 'Transform terrestrial ecosystems with fruits and flowers',
    descriptionLong: 'Angiosperms invented the flower, an organ that recruits insect pollinators to perform the work of moving gametes, and the fruit, which recruits animals to disperse seeds. Their faster reproductive cycles and animal-mediated genetics let them outcompete most older plant lineages and now dominate every land biome. Together with the insect radiations they catalyzed, they created the modern terrestrial biosphere.',
    location: { lat: -10, lon: 40 }
  },

  // ===== CRETACEOUS PERIOD =====
  {
    id: 'placental_mammals',
    name: 'Placental Mammals',
    scientificName: 'Eutheria',
    appearanceMa: 125,
    extinctMa: null,
    abundanceProfile: [[125, 0.01], [66, 0.1], [55, 0.4], [30, 0.6], [0, 0.8]],
    description: 'Internal development of young; will diversify after K-Pg',
    descriptionLong: 'Placental mammals nourish their developing young through a placenta — a temporary organ that exchanges nutrients, oxygen and waste with the mother\'s bloodstream. Long gestation produces well-developed offspring capable of complex behaviors at birth. After the K-Pg extinction cleared the dinosaurs, placentals exploded into nearly every available niche from bats and whales to primates and ungulates.',
    location: { lat: 30, lon: 80 }
  },
  {
    id: 'iguanodon',
    name: 'Iguanodon',
    scientificName: 'Iguanodon bernissartensis',
    appearanceMa: 140,
    extinctMa: 120,
    abundanceProfile: [[140, 0.01], [130, 0.6], [125, 0.7], [120, 0.01]],
    description: 'Early ornithopod with a famous thumb spike',
    descriptionLong: 'A nine-meter ornithopod that walked on two legs while browsing and dropped to all fours when grazing, equipped with a heavy conical thumb-spike for defense (originally misreconstructed as a horn on its nose). Its dental battery of self-replacing grinding teeth was a key innovation that let ornithopods process tough vegetation efficiently. Mass-mortality finds in Belgian coal mines have produced some of the most complete dinosaur skeletons known.',
    location: { lat: 50, lon: 0 }
  },
  {
    id: 'spinosaurus',
    name: 'Spinosaurus',
    scientificName: 'Spinosaurus aegyptiacus',
    appearanceMa: 112,
    extinctMa: 93,
    abundanceProfile: [[112, 0.01], [105, 0.5], [98, 0.6], [93, 0.01]],
    description: 'Largest terrestrial predator, semi-aquatic',
    descriptionLong: 'At about 15 meters Spinosaurus was longer than Tyrannosaurus, with a crocodile-like skull, conical fish-grabbing teeth, and a tall sail of elongated neural spines along its back. Recent finds of dense bones, paddle-like feet, and a finned tail show it was the only known semiaquatic dinosaur, hunting large fish in the river systems of Cretaceous North Africa. The original holotype was destroyed in a 1944 Allied bombing raid on Munich.',
    location: { lat: 15, lon: 20 }
  },
  {
    id: 'quetzalcoatlus',
    name: 'Quetzalcoatlus',
    scientificName: 'Quetzalcoatlus northropi',
    appearanceMa: 70,
    extinctMa: 66,
    abundanceProfile: [[70, 0.01], [68, 0.6], [67, 0.7], [66, 0.01]],
    description: 'Giant azhdarchid pterosaur — wingspan ~11 meters',
    descriptionLong: 'An azhdarchid pterosaur the size of a small plane, with an eleven-meter wingspan and a giraffe-tall stance when folded on the ground. Despite its bulk, hollow bones kept it under 250 kilograms, and it likely launched into flight using a powerful four-limbed quadrupedal vault. It probably hunted on foot like a giant stork, picking off small dinosaurs across the Late Cretaceous floodplains of North America.',
    location: { lat: 31, lon: -103 }
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    scientificName: 'Triceratops horridus',
    appearanceMa: 68,
    extinctMa: 66,
    abundanceProfile: [[68, 0.01], [67, 0.6], [66.5, 0.7], [66, 0.01]],
    description: 'Three-horned ceratopsian; one of the last dinosaurs',
    descriptionLong: 'A nine-meter ceratopsian with a brow horn pair over a meter long, a stout nose horn, and a vast bony frill protecting the neck. Its dental battery — a self-sharpening pair of slicing blades made from hundreds of stacked teeth — let it process tough cycads and palm-like vegetation. It was among the very last non-avian dinosaurs to walk the Earth, ranging the Hell Creek floodplains until the asteroid struck.',
    location: { lat: 40, lon: -100 }
  },
  {
    id: 'tyrannosaurus',
    name: 'Tyrannosaurus rex',
    scientificName: 'Tyrannosaurus rex',
    appearanceMa: 68,
    extinctMa: 66,
    abundanceProfile: [[68, 0.01], [67, 0.7], [66.5, 0.8], [66, 0.01]],
    description: 'Apex predator of the Late Cretaceous',
    descriptionLong: 'A 12-meter, 9-tonne theropod with a bone-crushing bite force estimated above 35,000 newtons — capable of pulverizing the skeletons of its prey. Forward-facing eyes gave it stereoscopic depth perception, and isotopic studies of its growth confirm it added more than two kilograms per day during its teenage growth spurt. Tiny arms with two functional fingers remain one of paleontology\'s most enduring puzzles.',
    location: { lat: 42, lon: -105 }
  },

  // ===== CENOZOIC - PALEOGENE =====
  {
    id: 'first_primates',
    name: 'First Primates',
    scientificName: 'Plesiadapis',
    appearanceMa: 56,
    extinctMa: null,
    abundanceProfile: [[56, 0.01], [45, 0.3], [30, 0.4], [10, 0.5], [0, 0.4]],
    description: 'Small arboreal mammals; our lineage begins',
    descriptionLong: 'Squirrel-like arboreal mammals with grasping hands and feet adapted for moving along thin branches in the new angiosperm forests. The shift to a tree-canopy lifestyle drove the evolution of forward-facing eyes for depth perception and dexterous fingers — traits that all primates, including humans, still inherit. Their lineage would eventually produce monkeys, apes, and us.',
    location: { lat: 40, lon: -75 }
  },
  {
    id: 'first_whales',
    name: 'First Whales',
    scientificName: 'Pakicetus',
    appearanceMa: 50,
    extinctMa: null,
    abundanceProfile: [[50, 0.01], [40, 0.2], [20, 0.4], [5, 0.5], [0, 0.4]],
    description: 'Land mammals return to the sea',
    descriptionLong: 'Pakicetus was a wolf-sized terrestrial mammal whose ear bones already show the dense, sound-conducting structure that defines whales. Within roughly ten million years its descendants — Ambulocetus, Rodhocetus, Basilosaurus — became progressively more aquatic, abandoning the land entirely. Today\'s blue whales, the largest animals ever to live, descend from this short-legged hoofed ancestor.',
    location: { lat: 25, lon: 70 }
  },
  {
    id: 'horses',
    name: 'Early Horses',
    scientificName: 'Eohippus / Hyracotherium',
    appearanceMa: 52,
    extinctMa: null,
    abundanceProfile: [[52, 0.01], [40, 0.3], [20, 0.5], [5, 0.6], [0, 0.4]],
    description: 'Dog-sized forest browsers that evolve into modern horses',
    descriptionLong: 'Eohippus was a small, four-toed forest browser the size of a fox, equipped with leaf-cropping teeth rather than the high-crowned grazing molars of modern horses. As Cenozoic grasslands spread, the horse lineage progressively lost toes, lengthened limbs, and developed wear-resistant teeth — the result is one of the best-documented evolutionary transitions in the fossil record. All living equids descend from this same Eocene starting point.',
    location: { lat: 40, lon: -90 }
  },
  {
    id: 'paraceratherium',
    name: 'Paraceratherium',
    scientificName: 'Paraceratherium transouralicum',
    appearanceMa: 34,
    extinctMa: 23,
    abundanceProfile: [[34, 0.01], [30, 0.5], [25, 0.4], [23, 0.01]],
    description: 'Largest land mammal ever — hornless rhinoceros',
    descriptionLong: 'A hornless rhinoceros relative weighing fifteen to twenty tonnes — the largest land mammal known to have existed. Its long neck and elongated forelimbs let it browse leaves from the canopy of Oligocene Asian woodlands, occupying an ecological niche analogous to that of sauropod dinosaurs. When climate-driven aridification replaced its woodlands with grasslands, the lineage went extinct.',
    location: { lat: 45, lon: 75 }
  },
  {
    id: 'first_monkeys',
    name: 'Old World Monkeys',
    scientificName: 'Catarrhini',
    appearanceMa: 35,
    extinctMa: null,
    abundanceProfile: [[35, 0.01], [25, 0.3], [10, 0.4], [0, 0.35]],
    description: 'Divergence of Old World monkeys and apes',
    descriptionLong: 'Catarrhines — Old World monkeys and apes — diverged from New World monkeys some 35 million years ago, after the South Atlantic widened and isolated the two populations. They share downward-facing nostrils, full trichromatic color vision, and (mostly) loss of the prehensile tail. From this lineage came the apes, including the line that produced gibbons, orangutans, gorillas, chimpanzees, and humans.',
    location: { lat: 10, lon: 35 }
  },

  // ===== CENOZOIC - NEOGENE =====
  {
    id: 'great_apes',
    name: 'First Great Apes',
    scientificName: 'Proconsul',
    appearanceMa: 20,
    extinctMa: null,
    abundanceProfile: [[20, 0.01], [14, 0.3], [7, 0.4], [2, 0.3], [0, 0.2]],
    description: 'Larger, tailless primates diversify in Africa and Asia',
    descriptionLong: 'Proconsul was a tail-less arboreal ape, slow-moving and quadrupedal, that lived in the warm Miocene forests of East Africa. Its descendants would split into the gibbons, orangutan, gorilla, chimpanzee and hominin lineages over the next 15 million years. Our own chimpanzee-line divergence is the most recent of these splits, only 6–7 million years ago.',
    location: { lat: 0, lon: 35 }
  },
  {
    id: 'phorusrhacid',
    name: 'Terror Birds',
    scientificName: 'Phorusrhacidae',
    appearanceMa: 27,
    extinctMa: 1.8,
    abundanceProfile: [[27, 0.01], [15, 0.5], [5, 0.5], [3, 0.3], [1.8, 0.01]],
    description: 'Flightless apex predators of isolated South America',
    descriptionLong: 'Three-meter flightless birds with massive hooked axe-like beaks, terror birds were the dominant land predators of South America while the continent was an isolated island. They could probably outrun any prey on the open pampas and dispatch it with downward strikes of the beak. Their extinction followed shortly after the Great American Biotic Interchange brought placental carnivores south across the new Panama land bridge.',
    location: { lat: -34, lon: -58 }
  },
  {
    id: 'grasslands',
    name: 'Grassland Expansion',
    scientificName: 'Poaceae',
    appearanceMa: 20,
    extinctMa: null,
    abundanceProfile: [[20, 0.1], [10, 0.5], [5, 0.7], [0, 0.8]],
    description: 'Savanna ecosystems emerge, reshaping evolution',
    descriptionLong: 'C₄ grasses use a more efficient photosynthetic chemistry that thrives in low CO₂ and high light, and they spread rapidly across the cooling, drying Miocene continents. Vast new savannas reshaped vertebrate evolution, favoring fast-running grazers and the carnivores that hunted them — and ultimately bipedal apes who could see over the grass. They now cover more than a quarter of the planet\'s land surface.',
    location: { lat: 5, lon: 30 }
  },
  {
    id: 'sahelanthropus',
    name: 'Sahelanthropus',
    scientificName: 'Sahelanthropus tchadensis',
    appearanceMa: 7,
    extinctMa: 6,
    abundanceProfile: [[7, 0.01], [6.5, 0.3], [6, 0.01]],
    description: 'Earliest known hominin; near the human-chimp divergence',
    descriptionLong: 'Known from a single distorted skull found in Chad in 2001, Sahelanthropus combined a chimp-sized brain with a forward-shifted foramen magnum suggesting an upright posture. It lived around the time of the human-chimpanzee divergence and may sit very close to the actual split. Its discovery extended the known hominin record back nearly two million years.',
    location: { lat: 12, lon: 17 }
  },
  {
    id: 'australopithecus',
    name: 'Australopithecus',
    scientificName: 'Australopithecus afarensis',
    appearanceMa: 4.2,
    extinctMa: 2.0,
    abundanceProfile: [[4.2, 0.01], [3.5, 0.4], [3.0, 0.5], [2.5, 0.3], [2.0, 0.01]],
    description: 'Bipedal hominins — "Lucy" and relatives',
    descriptionLong: 'Australopithecus afarensis — best known from the partial skeleton "Lucy" found in 1974 — was fully bipedal but still had relatively long curved arms and ape-sized brains. The 3.6-million-year-old Laetoli footprints in Tanzania, made by an Australopithecus pair walking through fresh volcanic ash, remain the oldest direct evidence of human-style upright walking. The genus Homo would emerge from this lineage about 2.5 million years ago.',
    location: { lat: 8, lon: 38 }
  },
  {
    id: 'megalodon',
    name: 'Megalodon',
    scientificName: 'Otodus megalodon',
    appearanceMa: 23,
    extinctMa: 3.6,
    abundanceProfile: [[23, 0.01], [15, 0.5], [10, 0.6], [5, 0.3], [3.6, 0.01]],
    description: 'Giant shark up to 15 meters; apex ocean predator',
    descriptionLong: 'A giant lamniform shark estimated at 15–18 meters long with serrated teeth the size of a human hand and a bite force exceeding any animal that has ever lived. It hunted whales in coastal nursery waters across the Miocene-Pliocene oceans, often crippling them with strikes to the flippers and ribs. Cooling oceans, prey shifts to colder polar waters, and competition from killer whales likely drove its extinction.',
    location: { lat: 20, lon: -40 }
  },

  // ===== QUATERNARY PERIOD =====
  {
    id: 'homo_habilis',
    name: 'Homo habilis',
    scientificName: 'Homo habilis',
    appearanceMa: 2.8,
    extinctMa: 1.5,
    abundanceProfile: [[2.8, 0.01], [2.3, 0.4], [1.9, 0.5], [1.5, 0.01]],
    description: 'First stone toolmakers',
    descriptionLong: 'Homo habilis ("handy man") had a brain about half the size of a modern human\'s but produced the deliberately struck Oldowan stone tools — sharp flakes used to butcher carcasses and crack open marrow bones. This shift to a tool-mediated, scavenged-meat-rich diet may have fueled the dramatic brain expansion seen in later Homo lineages. They coexisted with several Australopithecus and Paranthropus species across East Africa.',
    location: { lat: -2, lon: 35 }
  },
  {
    id: 'homo_erectus',
    name: 'Homo erectus',
    scientificName: 'Homo erectus',
    appearanceMa: 1.9,
    extinctMa: 0.11,
    abundanceProfile: [[1.9, 0.01], [1.5, 0.4], [1.0, 0.6], [0.5, 0.4], [0.11, 0.01]],
    description: 'First hominin to leave Africa; mastered fire',
    descriptionLong: 'Homo erectus was the first hominin with body proportions essentially the same as modern humans, and the first to leave Africa, ranging across Europe and as far east as Java. They controlled fire — letting them cook food, extend day length, and warm shelters — and produced the Acheulean handaxe, a standardized tool design that endured for over a million years. Surviving on Java until perhaps 110,000 years ago, they were our longest-lived sister species.',
    location: { lat: 0, lon: 37 }
  },
  {
    id: 'mammoth',
    name: 'Woolly Mammoth',
    scientificName: 'Mammuthus primigenius',
    appearanceMa: 0.8,
    extinctMa: 0.004,
    abundanceProfile: [[0.8, 0.01], [0.4, 0.5], [0.1, 0.7], [0.012, 0.4], [0.004, 0.01]],
    description: 'Ice age megafauna; coexisted with early humans',
    descriptionLong: 'Insulated by a coarse outer coat over a thick wool undercoat and small ears that reduced heat loss, woolly mammoths grazed the vast steppe-tundra of Pleistocene Eurasia and North America. They coexisted with Neanderthals and modern humans, who hunted them and used their bones to build huts. Mainland populations vanished around 10,000 years ago; an isolated dwarf population survived on Wrangel Island until about 4,000 years ago — younger than the Egyptian pyramids.',
    location: { lat: 55, lon: 60 }
  },
  {
    id: 'saber_tooth',
    name: 'Saber-toothed Cat',
    scientificName: 'Smilodon fatalis',
    appearanceMa: 2.5,
    extinctMa: 0.01,
    abundanceProfile: [[2.5, 0.01], [1.0, 0.5], [0.1, 0.6], [0.02, 0.3], [0.01, 0.01]],
    description: 'Iconic predator with massive canine teeth',
    descriptionLong: 'Smilodon was a robust, lion-sized ambush predator with eighteen-centimeter serrated upper canines that swung downward into prey throats with the help of an unusually wide gape. It was relatively slow but immensely powerful, likely hunting large herbivores cooperatively. Its extinction at the end of the Pleistocene coincides with the loss of its preferred megafaunal prey and the spread of human hunters.',
    location: { lat: 35, lon: -100 }
  },
  {
    id: 'megatherium',
    name: 'Giant Ground Sloth',
    scientificName: 'Megatherium americanum',
    appearanceMa: 5,
    extinctMa: 0.012,
    abundanceProfile: [[5, 0.01], [2, 0.4], [0.5, 0.5], [0.05, 0.4], [0.012, 0.01]],
    description: 'Elephant-sized ground sloth of the Americas',
    descriptionLong: 'Megatherium was a four-tonne ground sloth the size of an elephant, capable of rearing up on its hind legs to pull down high branches with massive curved claws. It ranged across South America and pushed north as far as Patagonia and the Pampas, browsing on woody vegetation in mixed savanna-forest landscapes. Like most New World megafauna, it vanished within a few millennia of human arrival.',
    location: { lat: -34, lon: -65 }
  },
  {
    id: 'glyptodon',
    name: 'Glyptodon',
    scientificName: 'Glyptodon clavipes',
    appearanceMa: 3.2,
    extinctMa: 0.011,
    abundanceProfile: [[3.2, 0.01], [1, 0.4], [0.1, 0.5], [0.02, 0.3], [0.011, 0.01]],
    description: 'Volkswagen-sized armored relative of armadillos',
    descriptionLong: 'A relative of modern armadillos, Glyptodon was encased in a fused dome of bony plates over a meter thick at the top, with a clubbed tail in some species used in male combat. At up to two tonnes and three meters long it browsed open grasslands across South America and the southern United States. Early human inhabitants are thought to have used the empty shells as shelters.',
    location: { lat: -34, lon: -60 }
  },
  {
    id: 'diprotodon',
    name: 'Diprotodon',
    scientificName: 'Diprotodon optatum',
    appearanceMa: 1.6,
    extinctMa: 0.046,
    abundanceProfile: [[1.6, 0.01], [0.5, 0.5], [0.1, 0.5], [0.05, 0.3], [0.046, 0.01]],
    description: 'Largest marsupial — rhino-sized wombat relative',
    descriptionLong: 'Diprotodon was a three-tonne plant-eater roughly the size of a hippo, the largest marsupial ever known and a distant relative of modern wombats. It ranged across Pleistocene Australia\'s woodlands and saltbush plains, and is preserved in such concentration at sites like Lake Callabonna that whole herds appear to have died together in mud. Its extinction shortly after human arrival in Australia is one of the most clear-cut megafauna timing matches.',
    location: { lat: -25, lon: 135 }
  },
  {
    id: 'megaloceros',
    name: 'Irish Elk',
    scientificName: 'Megaloceros giganteus',
    appearanceMa: 0.4,
    extinctMa: 0.008,
    abundanceProfile: [[0.4, 0.01], [0.1, 0.5], [0.02, 0.6], [0.012, 0.4], [0.008, 0.01]],
    description: 'Giant deer with 3.5-meter antler spread',
    descriptionLong: 'Despite its name the "Irish elk" was a giant deer that ranged across Europe and northern Asia, and its antlers — three and a half meters across, weighing up to forty kilograms — were the largest of any cervid known. The metabolic cost of regrowing this rack each year may have made the species especially vulnerable to climate-driven changes in plant nutrition. The last populations vanished from western Siberia around 7,700 years ago.',
    location: { lat: 53, lon: -8 }
  },
  {
    id: 'neanderthals',
    name: 'Neanderthals',
    scientificName: 'Homo neanderthalensis',
    appearanceMa: 0.4,
    extinctMa: 0.04,
    abundanceProfile: [[0.4, 0.01], [0.2, 0.4], [0.1, 0.5], [0.05, 0.3], [0.04, 0.01]],
    description: 'Our closest relatives; complex culture and tools',
    descriptionLong: 'Cold-adapted hominins with brains slightly larger than ours on average, robust skeletons, prominent brow ridges, and a barrel-chested build optimized for retaining heat. They produced Mousterian stone tools, controlled fire, buried their dead, and made jewelry from feathers and shells. They went extinct around 40,000 years ago, but their genes live on — non-African humans today carry roughly 1–2 percent Neanderthal DNA.',
    location: { lat: 45, lon: 10 }
  },
  {
    id: 'homo_sapiens',
    name: 'Homo sapiens',
    scientificName: 'Homo sapiens',
    appearanceMa: 0.3,
    extinctMa: null,
    abundanceProfile: [[0.3, 0.01], [0.1, 0.2], [0.05, 0.4], [0.012, 0.6], [0.005, 0.8], [0, 1.0]],
    description: 'Modern humans — us',
    descriptionLong: 'Anatomically modern humans emerged in Africa around 300,000 years ago, distinguished by a globular braincase, slender skeleton, and complex symbolic behavior. By around 70,000 years ago we had spread across Eurasia and interbred with both Neanderthals and Denisovans before replacing them. In the past 10,000 years we have transformed Earth\'s climate, biosphere, and surface more rapidly than any species in geological history.',
    location: { lat: 5, lon: 35 }
  },

  // ===== EXTENDED SET — additions spanning Proterozoic through Pleistocene =====

  // Archean / Proterozoic additions
  {
    id: 'methanogens',
    name: 'Methanogens',
    scientificName: 'Methanogenic archaea',
    appearanceMa: 3500,
    extinctMa: null,
    abundanceProfile: [[3500, 0.2], [2800, 0.8], [2400, 0.3], [541, 0.15], [0, 0.1]],
    description: 'Methane-producing archaea; shaped the early atmosphere',
    descriptionLong: 'Anaerobic archaea that metabolize simple carbon compounds and exhale methane as waste, making them one of the oldest metabolic lineages on Earth. For nearly a billion years their exhalations gave the sky a hazy orange tint and kept the young Sun warm enough for liquid water. Even today they thrive in cow guts, rice paddies, and ocean-floor sediments — and their activity is a major contributor to atmospheric methane.',
    location: { lat: 0, lon: 40 }
  },
  {
    id: 'gabonionta',
    name: 'Gabonionta',
    scientificName: 'Francevillian biota',
    appearanceMa: 2100,
    extinctMa: 2000,
    abundanceProfile: [[2100, 0.01], [2080, 0.2], [2020, 0.1], [2000, 0.01]],
    description: 'Earliest candidate macroscopic multicellular life',
    descriptionLong: 'Disk-shaped centimeter-scale fossils from black shales in Gabon, forming colonies shortly after the Great Oxygenation Event flooded shallow seas with oxygen. Their biological affinity is unresolved — possibly stem-group eukaryotes experimenting with multicellularity — but they demonstrate that complex body plans were being tried billions of years before the Cambrian explosion. Most went extinct when oceans returned to lower-oxygen conditions.',
    location: { lat: -1, lon: 14 }
  },
  {
    id: 'first_sponges',
    name: 'First Sponges',
    scientificName: 'Porifera (stem)',
    appearanceMa: 800,
    extinctMa: null,
    abundanceProfile: [[800, 0.01], [600, 0.3], [500, 0.5], [200, 0.4], [0, 0.35]],
    description: 'Simplest animals; filter-feeding, no true tissues',
    descriptionLong: 'Sessile filter feeders lacking nerves, muscles, or organs, built from loosely organized cell types that pump seawater through internal chambers. Molecular clocks and biomarkers suggest sponges branched off the animal tree more than 800 million years ago, making them the oldest surviving animal lineage. They built the first biological reefs and remain essential filterers of modern ocean water.',
    location: { lat: 27, lon: 107 }
  },
  {
    id: 'cloudina',
    name: 'Cloudina',
    scientificName: 'Cloudina carinata',
    appearanceMa: 550,
    extinctMa: 538,
    abundanceProfile: [[550, 0.01], [545, 0.4], [540, 0.3], [538, 0.01]],
    description: 'Earliest shelly fossil; first predator drill holes appear',
    descriptionLong: 'A small, tube-shaped organism that secreted stacked calcium carbonate cones — the earliest known biomineralized skeleton. Some Cloudina fossils bear neat drill holes, the oldest direct evidence of predation in the fossil record, suggesting an evolutionary arms race was already underway on the eve of the Cambrian. Their reefs spanned Namibia, Siberia, and China.',
    location: { lat: -20, lon: 18 }
  },

  // Cambrian additions
  {
    id: 'wiwaxia',
    name: 'Wiwaxia',
    scientificName: 'Wiwaxia corrugata',
    appearanceMa: 510,
    extinctMa: 485,
    abundanceProfile: [[510, 0.01], [505, 0.3], [495, 0.2], [485, 0.01]],
    description: 'Scaly Cambrian grazer armored in mineralized sclerites',
    descriptionLong: 'A slug-sized Burgess Shale animal covered in overlapping carbonaceous scales and tall dorsal spines, likely grazing on microbial mats with a radula-like tongue. It has been placed near both annelids and mollusks in different phylogenetic studies, and remains a poster child for the strange experimental body plans of the Cambrian. Its mineralized defenses hint at pressure from early predators.',
    location: { lat: 51, lon: -116 }
  },
  {
    id: 'marrella',
    name: 'Marrella',
    scientificName: 'Marrella splendens',
    appearanceMa: 510,
    extinctMa: 500,
    abundanceProfile: [[510, 0.05], [505, 0.5], [502, 0.4], [500, 0.05]],
    description: 'Most abundant arthropod of the Burgess Shale',
    descriptionLong: 'A small, delicate arthropod with two pairs of long sweeping spines projecting backward from its head shield — the single most common fossil in the Burgess Shale, with more than 25,000 specimens collected. It likely fed on sea-floor detritus and swam by beating its many feathery legs. Though bizarre in appearance, it represents a stem lineage close to the common ancestor of all modern arthropod groups.',
    location: { lat: 51, lon: -116 }
  },
  {
    id: 'aysheaia',
    name: 'Aysheaia',
    scientificName: 'Aysheaia pedunculata',
    appearanceMa: 510,
    extinctMa: 495,
    abundanceProfile: [[510, 0.01], [505, 0.2], [500, 0.15], [495, 0.01]],
    description: 'Cambrian lobopod — ancestor of velvet worms and arthropods',
    descriptionLong: 'A soft-bodied worm-like animal with ten pairs of stubby, clawed legs, often found fossilized alongside sponges it probably fed on. As a lobopod, it sits near the common ancestor of velvet worms, water bears, and arthropods, illuminating how the jointed limb of the most diverse animal phylum first arose. Modern velvet worms retain much the same body plan half a billion years later.',
    location: { lat: 51, lon: -116 }
  },
  {
    id: 'myllokunmingia',
    name: 'Myllokunmingia',
    scientificName: 'Myllokunmingia fengjiaoa',
    appearanceMa: 525,
    extinctMa: 515,
    abundanceProfile: [[525, 0.01], [522, 0.15], [518, 0.1], [515, 0.01]],
    description: 'Among the oldest known vertebrates',
    descriptionLong: 'A jawless, finger-sized fish from the Chengjiang biota of Yunnan, possessing a dorsal fin, paired ventral fins, and the unmistakable vertebrate pharyngeal gill arrangement. At more than half a billion years old it is one of the earliest known animals with a notochord and skull, pushing the origin of our own phylum deep into the Cambrian. Every vertebrate alive today traces its ancestry to creatures very much like it.',
    location: { lat: 25, lon: 103 }
  },
  {
    id: 'archaeocyatha',
    name: 'Archaeocyaths',
    scientificName: 'Archaeocyatha',
    appearanceMa: 525,
    extinctMa: 510,
    abundanceProfile: [[525, 0.05], [520, 0.6], [515, 0.3], [510, 0.01]],
    description: 'First animal reef-builders; double-walled calcareous cups',
    descriptionLong: 'Cone-shaped sessile animals with porous, double-walled calcareous skeletons, likely filter-feeding via currents drawn through their walls. For a brief window in the early Cambrian they built the first true animal reefs on Earth, ringing warm shallow seas from Australia to Siberia. Their disappearance 510 million years ago left reef-building to other groups until corals eventually took over.',
    location: { lat: -30, lon: 138 }
  },
  {
    id: 'ottoia',
    name: 'Ottoia',
    scientificName: 'Ottoia prolifica',
    appearanceMa: 510,
    extinctMa: 495,
    abundanceProfile: [[510, 0.02], [505, 0.35], [500, 0.2], [495, 0.02]],
    description: 'Cambrian priapulid worm — burrowing ambush predator',
    descriptionLong: 'A stout, U-shaped priapulid worm that lived in burrows on the Cambrian sea floor and struck passing prey with an eversible spiny proboscis. Gut contents preserved in Burgess Shale specimens include whole hyoliths and even other Ottoia, revealing it as a top-tier burrow predator. Modern priapulids still live much the same way in cold marine sediments.',
    location: { lat: 51, lon: -116 }
  },

  // Ordovician / Silurian additions
  {
    id: 'graptolites',
    name: 'Graptolites',
    scientificName: 'Graptolithina',
    appearanceMa: 485,
    extinctMa: 320,
    abundanceProfile: [[485, 0.1], [450, 0.6], [420, 0.5], [380, 0.25], [320, 0.01]],
    description: 'Colonial plankton; the defining index fossils of Paleozoic seas',
    descriptionLong: 'Colonial, filter-feeding hemichordates that floated in vast numbers through Paleozoic oceans, each colony branching out from a central thread into rows of tiny cups housing individual zooids. Because they evolved rapidly and dispersed globally, they remain geology\'s most reliable index fossils for Ordovician and Silurian rocks. Their sudden disappearance by the late Carboniferous marks the end of an era in the plankton.',
    location: { lat: 54, lon: -3 }
  },
  {
    id: 'crinoids',
    name: 'Crinoids',
    scientificName: 'Crinoidea',
    appearanceMa: 485,
    extinctMa: null,
    abundanceProfile: [[485, 0.1], [350, 0.7], [250, 0.2], [100, 0.3], [0, 0.2]],
    description: 'Sea lilies and feather stars; echinoderms on stalks',
    descriptionLong: 'Flower-shaped echinoderms anchored to the seabed by a stalk, with feathery arms that filter plankton from passing currents. In the Paleozoic they carpeted entire sea floors, leaving limestone beds composed almost entirely of their disarticulated stem plates. More than six hundred species still live today, some having shed the stalk to crawl or swim as feather stars.',
    location: { lat: 20, lon: -80 }
  },
  {
    id: 'cooksonia',
    name: 'Cooksonia',
    scientificName: 'Cooksonia pertoni',
    appearanceMa: 433,
    extinctMa: 393,
    abundanceProfile: [[433, 0.01], [420, 0.3], [405, 0.25], [393, 0.02]],
    description: 'Among the earliest vascular plants on land',
    descriptionLong: 'A tiny, thumbnail-high plant consisting of little more than forking green stems tipped with spore-bearing knobs, with no true leaves or roots. Despite its simplicity, Cooksonia possessed vascular tissue and a waxy cuticle — the toolkit that made life on dry land possible. Its global distribution in Silurian rocks marks the moment plants began to green the continents in earnest.',
    location: { lat: 52, lon: -2 }
  },
  {
    id: 'astraspis',
    name: 'Astraspis',
    scientificName: 'Astraspis desiderata',
    appearanceMa: 455,
    extinctMa: 420,
    abundanceProfile: [[455, 0.01], [445, 0.2], [430, 0.15], [420, 0.01]],
    description: 'Armored jawless fish; first vertebrate skeleton with bone',
    descriptionLong: 'A small armored fish whose head and trunk were sheathed in mosaic plates of dentine and bone — the earliest vertebrate mineralized skeleton yet found. Lacking jaws, it probably vacuumed up sediment and filtered tiny organisms, the ecological role its modern lamprey and hagfish cousins abandoned long ago. Its hard armor likely offered protection from the eurypterids sharing its seas.',
    location: { lat: 37, lon: -107 }
  },
  {
    id: 'tabulate_corals',
    name: 'Tabulate Corals',
    scientificName: 'Tabulata',
    appearanceMa: 485,
    extinctMa: 252,
    abundanceProfile: [[485, 0.05], [440, 0.5], [380, 0.65], [300, 0.4], [252, 0.01]],
    description: 'Honeycomb-patterned reef corals of the Paleozoic',
    descriptionLong: 'Colonial corals with tightly packed polygonal tubes subdivided by horizontal floors, forming massive reef mounds alongside rugose corals and stromatoporoids. For more than two hundred million years they dominated warm shallow shelves until the end-Permian extinction wiped them out entirely. Modern scleractinian corals are not descendants — they evolved independently in the Triassic from sea-anemone-like ancestors.',
    location: { lat: 44, lon: -79 }
  },

  // Devonian additions
  {
    id: 'archaeopteris',
    name: 'Archaeopteris',
    scientificName: 'Archaeopteris hibernica',
    appearanceMa: 385,
    extinctMa: 359,
    abundanceProfile: [[385, 0.05], [375, 0.5], [365, 0.45], [359, 0.05]],
    description: 'First modern-looking tree; built the first true forests',
    descriptionLong: 'A thirty-meter tree with a woody trunk, true bark, and flat fern-like fronds — combining reproductive strategies from ferns with the internal anatomy of modern conifers. Archaeopteris formed the first forests that looked genuinely forest-like, with canopies, understory, and deep root systems that profoundly altered soils and the carbon cycle. Their global spread helped pull enough CO₂ from the atmosphere to cool the planet and set up the late Paleozoic ice age.',
    location: { lat: 47, lon: -122 }
  },
  {
    id: 'goniatites',
    name: 'Goniatites',
    scientificName: 'Goniatitida',
    appearanceMa: 390,
    extinctMa: 252,
    abundanceProfile: [[390, 0.05], [360, 0.5], [320, 0.55], [280, 0.4], [252, 0.01]],
    description: 'Early ammonoids; coiled shell predators of Paleozoic seas',
    descriptionLong: 'An early ammonoid group with tightly coiled shells and zigzag suture patterns where internal walls met the outer shell. Fast swimmers and opportunistic predators, they diversified wildly during the Devonian and survived the Late Devonian and end-Carboniferous extinctions only to vanish with almost everything else at the end of the Permian. Their descendants gave rise to the more famous ammonites of the Mesozoic.',
    location: { lat: 50, lon: 7 }
  },
  {
    id: 'eusthenopteron',
    name: 'Eusthenopteron',
    scientificName: 'Eusthenopteron foordi',
    appearanceMa: 385,
    extinctMa: 374,
    abundanceProfile: [[385, 0.01], [382, 0.25], [378, 0.2], [374, 0.01]],
    description: 'Lobe-finned fish with limb-like bones in its fins',
    descriptionLong: 'A meter-long predatory fish whose paired fins contained humerus, radius, and ulna bones in the same pattern found in the limbs of every tetrapod alive today. Though Eusthenopteron itself was a committed swimmer, its skeletal anatomy reveals the deep transformation that would soon let close relatives walk onto land. It is one of the most important single-species fossils in the whole story of vertebrate evolution.',
    location: { lat: 49, lon: -65 }
  },

  // Carboniferous additions
  {
    id: 'arthropleura',
    name: 'Arthropleura',
    scientificName: 'Arthropleura armata',
    appearanceMa: 345,
    extinctMa: 290,
    abundanceProfile: [[345, 0.01], [320, 0.35], [300, 0.3], [290, 0.01]],
    description: 'Two-meter millipede — the largest land invertebrate ever',
    descriptionLong: 'A millipede relative that grew to more than two and a half meters long and half a meter wide, stalking the humid coal-swamp floor on dozens of pairs of legs. High atmospheric oxygen and a shortage of large terrestrial predators let it reach a body size no arthropod has matched before or since. Fossil trackways show it could still move surprisingly quickly through the leaf litter of a world that smelled of peat.',
    location: { lat: 52, lon: -2 }
  },
  {
    id: 'lepidodendron',
    name: 'Lepidodendron',
    scientificName: 'Lepidodendron aculeatum',
    appearanceMa: 360,
    extinctMa: 300,
    abundanceProfile: [[360, 0.1], [330, 0.8], [310, 0.7], [300, 0.05]],
    description: 'Giant scale tree; built the world\'s coal deposits',
    descriptionLong: 'A forty-meter lycopod with a trunk patterned like reptilian skin, reproducing by spores and growing for decades before flowering once, toppling, and dying. Vast forests of Lepidodendron and its relatives filled the Carboniferous tropics, and the peat they produced — buried before fungi could evolve the chemistry to digest their lignin — became most of the coal that fuelled the Industrial Revolution. Every lump of Carboniferous coal is their tomb.',
    location: { lat: 40, lon: -80 }
  },
  {
    id: 'eryops',
    name: 'Eryops',
    scientificName: 'Eryops megacephalus',
    appearanceMa: 295,
    extinctMa: 272,
    abundanceProfile: [[295, 0.02], [285, 0.4], [278, 0.3], [272, 0.02]],
    description: 'Crocodile-like early tetrapod; top predator of Permian swamps',
    descriptionLong: 'A two-meter, thick-skulled tetrapod that lurked in Early Permian swamps much like a modern crocodilian, snatching fish and amphibians with a mouth of blade-like teeth. Though often called an amphibian, Eryops sits on the deep stem of the tetrapod tree near the split between modern amphibians and the ancestors of amniotes. It was one of the last large predators of its body plan before synapsids took over terrestrial food webs.',
    location: { lat: 32, lon: -99 }
  },

  // Permian additions
  {
    id: 'gorgonopsid',
    name: 'Gorgonopsids',
    scientificName: 'Gorgonopsia',
    appearanceMa: 265,
    extinctMa: 252,
    abundanceProfile: [[265, 0.01], [258, 0.4], [254, 0.35], [252, 0.01]],
    description: 'Saber-toothed apex predators of the Permian',
    descriptionLong: 'Dog-to-bear-sized therapsid predators with elongated canines and powerful jaws, hunting across the Permian supercontinent of Pangaea. They were the top carnivores of their time, preying on pareiasaurs and dicynodonts in the same ecosystems that hosted the first mammalian ancestors. Every single species vanished in the end-Permian extinction, the most severe mass-death in Earth\'s history.',
    location: { lat: -32, lon: 26 }
  },
  {
    id: 'glossopteris',
    name: 'Glossopteris',
    scientificName: 'Glossopteris indica',
    appearanceMa: 299,
    extinctMa: 251,
    abundanceProfile: [[299, 0.05], [280, 0.55], [265, 0.65], [255, 0.4], [251, 0.02]],
    description: 'Tongue-leaved tree that blanketed Gondwana',
    descriptionLong: 'A deciduous seed fern whose broad tongue-shaped leaves carpet Permian rocks from South America to Australia, Antarctica, and India. The matching Glossopteris floras across these continents were among the earliest evidence used by Alfred Wegener to argue that the southern lands were once joined as Gondwana. Like most of the late Permian world, the trees were nearly erased at the end of the Permian.',
    location: { lat: -75, lon: 0 }
  },
  {
    id: 'scutosaurus',
    name: 'Scutosaurus',
    scientificName: 'Scutosaurus karpinskii',
    appearanceMa: 254,
    extinctMa: 252,
    abundanceProfile: [[254, 0.05], [253, 0.4], [252.2, 0.2], [252, 0.02]],
    description: 'Armored pareiasaur; rhinoceros-sized Permian herbivore',
    descriptionLong: 'A stocky, three-meter herbivorous pareiasaur covered in bony armor plates and boasting outward-flaring cheek bosses, browsing through the drying floodplains of late Permian Siberia. Its massive skull and leaf-shaped teeth indicate a diet of tough vegetation in an increasingly harsh world. Scutosaurus was among the last pareiasaurs standing when the Siberian Traps erupted and ended the Paleozoic.',
    location: { lat: 66, lon: 63 }
  },

  // Triassic additions
  {
    id: 'coelophysis',
    name: 'Coelophysis',
    scientificName: 'Coelophysis bauri',
    appearanceMa: 216,
    extinctMa: 196,
    abundanceProfile: [[216, 0.02], [210, 0.35], [202, 0.3], [196, 0.02]],
    description: 'Slender early theropod; nimble pack hunter',
    descriptionLong: 'A three-meter, bird-shaped theropod with hollow bones, a long whip-like tail, and blade-toothed jaws, preserved by the thousands in a mass death deposit at Ghost Ranch, New Mexico. Built for speed, it chased small reptiles, early mammals, and juveniles of its own kind — rare cannibalism evidence has been proposed and debated in the same quarry. Coelophysis sits close to the base of the theropod line that would later produce everything from Velociraptor to chickadees.',
    location: { lat: 36, lon: -107 }
  },
  {
    id: 'plateosaurus',
    name: 'Plateosaurus',
    scientificName: 'Plateosaurus trossingensis',
    appearanceMa: 214,
    extinctMa: 204,
    abundanceProfile: [[214, 0.05], [210, 0.5], [206, 0.4], [204, 0.02]],
    description: 'Early long-necked herbivore; ancestor-like to sauropods',
    descriptionLong: 'An eight-meter bipedal sauropodomorph that browsed high vegetation across late Triassic Europe, preserved in enormous bonebed accumulations that hint at herd behavior. Its elongated neck and bulky gut previewed the anatomy that would later drive its sauropod descendants to become the biggest land animals of all time. Plateosaurus also demonstrates that dinosaurs were already hugely successful before the end-Triassic extinction cleared the stage.',
    location: { lat: 49, lon: 8 }
  },
  {
    id: 'cynognathus',
    name: 'Cynognathus',
    scientificName: 'Cynognathus crateronotus',
    appearanceMa: 247,
    extinctMa: 237,
    abundanceProfile: [[247, 0.02], [243, 0.35], [240, 0.3], [237, 0.02]],
    description: 'Mammal-like therapsid with a dog-shaped skull',
    descriptionLong: 'A wolf-sized cynodont with differentiated teeth, a secondary bony palate for chewing and breathing simultaneously, and likely fur and whiskers — unmistakably mammal-like features in a still-reptilian chassis. Its fossils have been recovered on every southern continent, mapping the breakup of Gondwana. Close cousins of Cynognathus would give rise to true mammals within a few tens of millions of years.',
    location: { lat: -32, lon: 26 }
  },

  // Jurassic additions
  {
    id: 'allosaurus',
    name: 'Allosaurus',
    scientificName: 'Allosaurus fragilis',
    appearanceMa: 155,
    extinctMa: 145,
    abundanceProfile: [[155, 0.05], [152, 0.55], [148, 0.45], [145, 0.05]],
    description: 'Jurassic apex predator of the Morrison Formation',
    descriptionLong: 'A nine-meter theropod with short, powerful arms, hatchet-bladed teeth, and distinctive horn-like crests above the eyes, dominant predator in the Late Jurassic of western North America. Bonebeds of mixed Allosaurus individuals suggest occasional group feeding, and bite-marked sauropod vertebrae reveal it could take down animals twenty times its mass. It was the T. rex of its day, tens of millions of years before T. rex evolved.',
    location: { lat: 38, lon: -109 }
  },
  {
    id: 'diplodocus',
    name: 'Diplodocus',
    scientificName: 'Diplodocus carnegii',
    appearanceMa: 154,
    extinctMa: 150,
    abundanceProfile: [[154, 0.05], [152, 0.5], [151, 0.4], [150, 0.05]],
    description: 'Whip-tailed sauropod; one of the longest animals ever',
    descriptionLong: 'A twenty-six-meter sauropod built like a suspension bridge, with a long horizontal neck balanced by an even longer tail whose thin tip could probably crack the air like a bullwhip. Peg-like teeth clustered at the front of its muzzle suggest it combed soft vegetation from branches rather than chewing. Diplodocus moved in herds across the Morrison flood basin alongside Allosaurus, Stegosaurus, and Brachiosaurus.',
    location: { lat: 41, lon: -105 }
  },
  {
    id: 'ichthyosaur',
    name: 'Ichthyosaurs',
    scientificName: 'Ichthyosauria',
    appearanceMa: 250,
    extinctMa: 90,
    abundanceProfile: [[250, 0.05], [200, 0.55], [160, 0.5], [120, 0.3], [90, 0.02]],
    description: 'Dolphin-shaped marine reptiles of the Mesozoic seas',
    descriptionLong: 'Streamlined, fully aquatic reptiles that resembled dolphins in body shape through dramatic convergent evolution, complete with dorsal fin, crescent-moon tail, and large eyes adapted to deep dives. Some species grew to twenty meters, preyed on squid and fish, and gave live birth tail-first to avoid drowning their young. They dominated Mesozoic oceans for 160 million years before disappearing midway through the Cretaceous.',
    location: { lat: 54, lon: -2 }
  },
  {
    id: 'plesiosaur',
    name: 'Plesiosaurs',
    scientificName: 'Plesiosauria',
    appearanceMa: 203,
    extinctMa: 66,
    abundanceProfile: [[203, 0.02], [170, 0.4], [120, 0.5], [80, 0.35], [66, 0.02]],
    description: 'Long-necked marine reptiles; fabled sea monsters',
    descriptionLong: 'Four-flippered marine reptiles that split into two very different body plans — long-necked, small-headed plesiosauromorphs and short-necked, massive-jawed pliosauromorphs. They stroked through Mesozoic seas like rowing a four-oared boat and hunted everything from schooling fish to other marine reptiles. The last species perished alongside the non-avian dinosaurs at the end of the Cretaceous.',
    location: { lat: 52, lon: -1 }
  },
  {
    id: 'pterodactylus',
    name: 'Pterodactylus',
    scientificName: 'Pterodactylus antiquus',
    appearanceMa: 152,
    extinctMa: 148,
    abundanceProfile: [[152, 0.02], [151, 0.3], [149, 0.25], [148, 0.02]],
    description: 'Crow-sized early pterodactyloid from Solnhofen',
    descriptionLong: 'A short-tailed pterosaur with a wingspan around a meter, flying over the lagoons that became the famous Solnhofen limestones of Bavaria. Fine-grained preservation reveals skin, wing membranes, and soft tissue, making Pterodactylus one of the best-known pterosaurs. Its genus name — "wing finger" — later gave rise to the entire popular term "pterodactyl" for all members of this flying-reptile order.',
    location: { lat: 49, lon: 11 }
  },

  // Cretaceous additions
  {
    id: 'velociraptor',
    name: 'Velociraptor',
    scientificName: 'Velociraptor mongoliensis',
    appearanceMa: 75,
    extinctMa: 71,
    abundanceProfile: [[75, 0.02], [74, 0.35], [72, 0.3], [71, 0.02]],
    description: 'Feathered dromaeosaur; sickle-clawed pack hunter',
    descriptionLong: 'A turkey-sized feathered dromaeosaur with a hyperextendable sickle claw on each second toe, a long stiff tail for balance, and feathers confirmed by quill knobs on preserved forearm bones. The famous "fighting dinosaurs" fossil from Mongolia captures a Velociraptor locked in mortal combat with a Protoceratops, buried by a collapsing sand dune. Its popular depiction at human size in films is wildly inflated — the real animal was the size of a coyote.',
    location: { lat: 45, lon: 107 }
  },
  {
    id: 'ankylosaurus',
    name: 'Ankylosaurus',
    scientificName: 'Ankylosaurus magniventris',
    appearanceMa: 68,
    extinctMa: 66,
    abundanceProfile: [[68, 0.02], [67, 0.35], [66.5, 0.25], [66, 0.02]],
    description: 'Armored tank dinosaur with a clubbed tail',
    descriptionLong: 'A low-slung, eight-meter herbivore sheathed in bony osteoderms and swinging a hammer-like tail club heavy enough to shatter the leg of a tyrannosaur. Its skull was so encased in armor that even the eyelids bore bone plates, and its wide gut processed tough plants via bacterial fermentation. Ankylosaurus lived right up to the Cretaceous-Paleogene boundary and was among the last non-avian dinosaurs on Earth.',
    location: { lat: 47, lon: -110 }
  },
  {
    id: 'mosasaurus',
    name: 'Mosasaurus',
    scientificName: 'Mosasaurus hoffmannii',
    appearanceMa: 82,
    extinctMa: 66,
    abundanceProfile: [[82, 0.02], [76, 0.4], [70, 0.45], [66, 0.02]],
    description: 'Apex marine predator of the late Cretaceous oceans',
    descriptionLong: 'A seventeen-meter marine lizard, more closely related to modern monitor lizards than to plesiosaurs, patrolling late Cretaceous seas as the top predator after the ichthyosaurs vanished. Powerful flippers, a shark-like tail, and a double-hinged jaw let it swallow ammonites and other mosasaurs whole. The type fossil, unearthed in a chalk mine near Maastricht in 1764, was one of the first great discoveries that hinted at deep time and extinction.',
    location: { lat: 51, lon: 6 }
  },
  {
    id: 'parasaurolophus',
    name: 'Parasaurolophus',
    scientificName: 'Parasaurolophus walkeri',
    appearanceMa: 76,
    extinctMa: 73,
    abundanceProfile: [[76, 0.02], [75, 0.35], [74, 0.3], [73, 0.02]],
    description: 'Hadrosaur with a curving tubular head crest',
    descriptionLong: 'A duck-billed hadrosaur whose hollow head crest curved back over its neck like a brass horn, almost certainly used to produce resonant low-frequency calls across herds. CT scans of the crest show looping air passages that would have acted as a natural musical instrument. Parasaurolophus grazed the forested floodplains of Late Cretaceous western North America alongside its iconic contemporaries Triceratops and T. rex.',
    location: { lat: 49, lon: -112 }
  },
  {
    id: 'magnolia',
    name: 'Early Magnolias',
    scientificName: 'Magnoliaceae',
    appearanceMa: 130,
    extinctMa: null,
    abundanceProfile: [[130, 0.02], [100, 0.3], [60, 0.5], [20, 0.45], [0, 0.4]],
    description: 'Ancient flowering plants older than bees',
    descriptionLong: 'Large-flowered trees that evolved before true bees existed, so their tough, tepal-like flowers are built to be pollinated by beetles crawling over the reproductive parts. Their lineage shows what very early angiosperm flowers probably looked like — simple, radially symmetric, and many-parted. More than two hundred magnolia species survive today, scattered across eastern Asia and the Americas as living fossils from the age of dinosaurs.',
    location: { lat: 34, lon: -85 }
  },

  // Cenozoic additions
  {
    id: 'basilosaurus',
    name: 'Basilosaurus',
    scientificName: 'Basilosaurus cetoides',
    appearanceMa: 41,
    extinctMa: 33,
    abundanceProfile: [[41, 0.02], [38, 0.3], [35, 0.25], [33, 0.02]],
    description: 'Serpent-shaped early whale with vestigial back legs',
    descriptionLong: 'A twenty-meter early whale built like an enormous marine serpent, with tiny vestigial hind legs that could not support its weight on land but still had functional knees and ankles. Originally named as a reptile — hence the "saurus" — it is in fact one of the clearest transitional fossils ever found, locking the whale lineage to land-dwelling ancestors. Its entire skeletons have been recovered from the desert of Wadi Al-Hitan in Egypt.',
    location: { lat: 29, lon: 30 }
  },
  {
    id: 'titanoboa',
    name: 'Titanoboa',
    scientificName: 'Titanoboa cerrejonensis',
    appearanceMa: 60,
    extinctMa: 58,
    abundanceProfile: [[60, 0.02], [59.5, 0.3], [58.5, 0.2], [58, 0.02]],
    description: 'Largest snake ever; thirteen-meter Paleocene predator',
    descriptionLong: 'A thirteen-meter, boa-like constrictor weighing more than a ton, thriving in the steamy rainforests of northern South America just after the dinosaurs vanished. Its gigantic body size implies mean annual temperatures a full ten degrees Celsius warmer than today\'s tropics. Fossilized vertebrae from the Cerrejón coal mine in Colombia were initially mistaken for crocodile bones — the animal was that far off the expected scale for snakes.',
    location: { lat: 11, lon: -72 }
  },
  {
    id: 'andrewsarchus',
    name: 'Andrewsarchus',
    scientificName: 'Andrewsarchus mongoliensis',
    appearanceMa: 45,
    extinctMa: 36,
    abundanceProfile: [[45, 0.01], [42, 0.2], [38, 0.15], [36, 0.01]],
    description: 'Wolf-faced giant; possibly the largest meat-eating land mammal',
    descriptionLong: 'Known from a single gigantic skull nearly a meter long, Andrewsarchus was an Eocene artiodactyl — related to hippos and whales — with the face of an enormous wolf and the teeth of a bone-crushing carnivore. Estimates put its shoulder height around two meters and its diet somewhere between scavenging and active predation. It remains one of the most mysterious large mammals in the fossil record because no postcranial bones have yet been found.',
    location: { lat: 42, lon: 96 }
  },
  {
    id: 'woolly_rhino',
    name: 'Woolly Rhinoceros',
    scientificName: 'Coelodonta antiquitatis',
    appearanceMa: 3.6,
    extinctMa: 0.01,
    abundanceProfile: [[3.6, 0.01], [0.5, 0.35], [0.1, 0.45], [0.02, 0.2], [0.01, 0.01]],
    description: 'Shaggy cold-steppe grazer with a massive front horn',
    descriptionLong: 'A heavily furred rhinoceros adapted to the mammoth-steppe ecosystem that stretched from western Europe to Siberia during the last Ice Age, grazing tough grasses with specialized lip and tooth anatomy. Its front horn, long and flattened from side to side, was used to sweep snow aside to reach forage. Neanderthals and early modern humans both hunted them, and entire carcasses have emerged complete with hair from Siberian permafrost.',
    location: { lat: 60, lon: 100 }
  },
  {
    id: 'dire_wolf',
    name: 'Dire Wolf',
    scientificName: 'Aenocyon dirus',
    appearanceMa: 0.25,
    extinctMa: 0.01,
    abundanceProfile: [[0.25, 0.02], [0.1, 0.3], [0.02, 0.25], [0.01, 0.02]],
    description: 'Pleistocene North American pack hunter, larger than gray wolves',
    descriptionLong: 'A heavy, broad-skulled canid twenty percent larger than a modern gray wolf, specialized for bringing down large Pleistocene mammals like bison and horses. Recent DNA work shows dire wolves diverged from the wolf lineage nearly six million years ago, making them a distinct genus rather than simply giant wolves. They vanished around 10,000 years ago as their large prey disappeared, leaving no living descendants.',
    location: { lat: 34, lon: -118 }
  },
  {
    id: 'cave_bear',
    name: 'Cave Bear',
    scientificName: 'Ursus spelaeus',
    appearanceMa: 0.3,
    extinctMa: 0.024,
    abundanceProfile: [[0.3, 0.02], [0.1, 0.3], [0.05, 0.25], [0.024, 0.02]],
    description: 'Massive European bear of the Ice Age; mostly vegetarian',
    descriptionLong: 'A brown-bear-sized omnivore that hibernated in deep European caves, producing thousands of skeletons preserved in Alpine and Carpathian sites. Tooth-wear patterns and chemical isotopes suggest most cave bears ate mainly plants despite their formidable size. They were hunted by Neanderthals and early modern humans, and probably went extinct around 24,000 years ago as climate cooled and their forested habitats retreated.',
    location: { lat: 47, lon: 14 }
  },
  {
    id: 'gomphothere',
    name: 'Gomphotheres',
    scientificName: 'Gomphotheriidae',
    appearanceMa: 20,
    extinctMa: 0.009,
    abundanceProfile: [[20, 0.05], [10, 0.5], [5, 0.4], [1, 0.3], [0.01, 0.02]],
    description: 'Four-tusked proboscideans; spread across four continents',
    descriptionLong: 'Elephant relatives with two pairs of tusks — one jutting from the upper jaw like modern elephants and a second pair projecting forward from a shovel-like lower jaw. They crossed the Bering land bridge from Eurasia into the Americas and were among the earliest proboscideans south of the Isthmus of Panama. They outlasted every other four-tusker on the planet, hanging on in the Americas until the end-Pleistocene extinctions around 9,000 years ago.',
    location: { lat: 30, lon: -100 }
  },
  {
    id: 'thylacoleo',
    name: 'Marsupial Lion',
    scientificName: 'Thylacoleo carnifex',
    appearanceMa: 2,
    extinctMa: 0.04,
    abundanceProfile: [[2, 0.02], [0.5, 0.25], [0.1, 0.3], [0.05, 0.15], [0.04, 0.01]],
    description: 'Australian apex predator with the strongest mammalian bite',
    descriptionLong: 'A leopard-sized marsupial carnivore with huge blade-like premolars that sheared flesh like scissors and a bite force per body weight higher than any known mammal, living or extinct. Despite deriving from herbivorous wombat-like ancestors, it became Australia\'s top predator for much of the Pleistocene. It disappeared shortly after humans arrived on the continent, like most of Australia\'s megafauna.',
    location: { lat: -27, lon: 135 }
  },

  // Cross-period additions
  {
    id: 'conodonts',
    name: 'Conodonts',
    scientificName: 'Conodonta',
    appearanceMa: 540,
    extinctMa: 201,
    abundanceProfile: [[540, 0.1], [450, 0.6], [350, 0.55], [250, 0.3], [201, 0.02]],
    description: 'Eel-shaped chordates identified only by their tooth fossils',
    descriptionLong: 'For more than a century conodonts were known solely from bizarre, intricate microscopic tooth-like elements scattered through Paleozoic and early Mesozoic rocks, their animal a complete mystery. In 1983 impressions of soft-bodied conodonts were finally identified — slender eel-like chordates with large eyes, muscular bodies, and a cluster of tooth elements working as a feeding apparatus. Today their teeth remain geology\'s sharpest tool for dating rocks across 340 million years of history.',
    location: { lat: 50, lon: 5 }
  },
  {
    id: 'lingula',
    name: 'Lingula',
    scientificName: 'Lingula anatina',
    appearanceMa: 540,
    extinctMa: null,
    abundanceProfile: [[540, 0.2], [450, 0.4], [250, 0.25], [100, 0.2], [0, 0.15]],
    description: 'Oldest genus of any living animal; a half-billion-year-old brachiopod',
    descriptionLong: 'A burrowing, tongue-shaped brachiopod that anchors itself in marine sediments by a long muscular stalk and filters water through fine tentacles. Lingula-type shells have remained essentially unchanged since the early Cambrian, making this one of the most conservative body plans in the entire animal kingdom. Fossilized Cambrian Lingula from 500 million years ago look remarkably like the species living on Japanese mudflats right now.',
    location: { lat: 35, lon: 139 }
  },
  {
    id: 'cycads',
    name: 'Cycads',
    scientificName: 'Cycadophyta',
    appearanceMa: 280,
    extinctMa: null,
    abundanceProfile: [[280, 0.05], [200, 0.6], [150, 0.65], [80, 0.3], [0, 0.1]],
    description: 'Palm-like gymnosperms; dinosaur-age survivors',
    descriptionLong: 'Slow-growing, palm-like gymnosperms bearing enormous cones, with roots that host nitrogen-fixing cyanobacteria. Their heyday was the Mesozoic, when they formed vast "cycad forests" that were a staple food of many herbivorous dinosaurs. More than three hundred species survive today in tropical pockets worldwide, making them one of the oldest seed-plant lineages still alive.',
    location: { lat: -25, lon: 135 }
  },
  {
    id: 'ammonites',
    name: 'Ammonites',
    scientificName: 'Ammonitida',
    appearanceMa: 201,
    extinctMa: 66,
    abundanceProfile: [[201, 0.1], [150, 0.7], [100, 0.65], [70, 0.5], [66, 0.02]],
    description: 'Iconic coiled shellfish; defining fossils of the Mesozoic oceans',
    descriptionLong: 'Highly mobile, squid-like cephalopods housed in spiraled chambered shells whose internal walls met the outer shell along elaborate, frilly suture lines. They diversified into thousands of species of every imaginable size and ornament, and their rapid evolution makes them superb index fossils for Mesozoic rock layers. Every last lineage perished at the Cretaceous-Paleogene boundary alongside the non-avian dinosaurs.',
    location: { lat: 50, lon: 5 }
  },
  {
    id: 'indohyus',
    name: 'Indohyus',
    scientificName: 'Indohyus indirae',
    appearanceMa: 48,
    extinctMa: 45,
    abundanceProfile: [[48, 0.01], [47, 0.2], [46, 0.15], [45, 0.01]],
    description: 'Cat-sized semi-aquatic deer relative; closest non-whale to whales',
    descriptionLong: 'A small, hoofed mammal the size of a raccoon that waded in shallow Eocene streams of what is now Kashmir, feeding on aquatic plants much like the modern water chevrotain. Its ear bones share a distinctive structure with early whales, identifying it as the closest known non-whale relative of the cetacean lineage. Indohyus is the transitional fossil that bridges the gap between terrestrial artiodactyls and the earliest whales.',
    location: { lat: 34, lon: 76 }
  },

  // ---- Notable recent discoveries (added 2024+) ----

  // Proterozoic
  {
    id: 'ourasphaira',
    name: 'Ourasphaira',
    scientificName: 'Ourasphaira giraldae',
    appearanceMa: 1000,
    extinctMa: 800,
    abundanceProfile: [[1000, 0.02], [950, 0.06], [900, 0.08], [850, 0.05], [800, 0.01]],
    description: 'Microscopic Proterozoic fungus — pushes fungal origin back ~500 Ma',
    descriptionLong: 'Microfossils from shales of Arctic Canada (Grassy Bay Formation, Northwest Territories), described in 2019, that show branching multicellular filaments and chitin-bearing spheres unmistakably fungal in architecture. At 900–1000 million years old, they more than double the age of the oldest previously accepted fungi and imply that the deep eukaryotic crown groups had already diversified well before the Cryogenian glaciations. Ourasphaira reframes when life on land may have begun, since fungi likely accompanied early algae out of the water.',
    location: { lat: 70, lon: -120 }
  },

  // Cambrian
  {
    id: 'saccorhytus',
    name: 'Saccorhytus',
    scientificName: 'Saccorhytus coronarius',
    appearanceMa: 540,
    extinctMa: 530,
    abundanceProfile: [[540, 0.03], [538, 0.10], [535, 0.09], [532, 0.04], [530, 0.01]],
    description: 'Sub-millimeter Cambrian "bag with a mouth"; reinterpreted ecdysozoan',
    descriptionLong: 'A roughly one-millimeter spheroidal microfossil from the Kuanchuanpu Formation of Shaanxi, China, originally announced in 2017 as the earliest known deuterostome (and possibly a stem-vertebrate). Restudy in 2022 with new specimens showed that its supposed gill pores were instead spine bases, reclassifying it as an early ecdysozoan more closely related to arthropods and priapulids than to chordates. Its on-again, off-again identity is itself a reminder of how thin the evidence is for the very earliest animal body plans.',
    location: { lat: 33, lon: 109 }
  },
  {
    id: 'cambroraster',
    name: 'Cambroraster',
    scientificName: 'Cambroraster falcatus',
    appearanceMa: 510,
    extinctMa: 500,
    abundanceProfile: [[510, 0.05], [508, 0.18], [506, 0.22], [503, 0.12], [500, 0.03]],
    description: 'Burgess Shale radiodont with a Millennium Falcon-shaped head shield',
    descriptionLong: 'A bottom-feeding radiodont (Anomalocaris-relative) up to 30 centimeters long, named in 2019 from hundreds of new Burgess Shale specimens collected in Kootenay National Park. Its enormous concave horseshoe-shaped head carapace earned the species name "falcatus" and an immediate Star Wars nickname; it likely sieved sediment with its rake-like frontal appendages while the shield blocked downward currents. Cambroraster shows that radiodonts had evolved a benthic-grazing ecology in addition to the iconic open-water predation of Anomalocaris.',
    location: { lat: 51.4, lon: -116.5 }
  },
  {
    id: 'stanleycaris',
    name: 'Stanleycaris',
    scientificName: 'Stanleycaris hirpex',
    appearanceMa: 510,
    extinctMa: 500,
    abundanceProfile: [[510, 0.04], [508, 0.16], [506, 0.20], [503, 0.10], [500, 0.02]],
    description: 'Three-eyed radiodont with brain preserved; Burgess Shale, 2022',
    descriptionLong: 'A small radiodont (~20 cm) from the Burgess Shale, redescribed in 2022 from 268 superbly preserved specimens that revealed a previously unknown median third eye on the head and the oldest brain fossils ever recovered from a euarthropod. The three-eyed configuration suggests a sophisticated visual system tuned to predation in dim Cambrian waters, while the brain preservation is rewriting our understanding of how nervous systems evolved early in Arthropoda. Stanleycaris is the most completely known radiodont, period.',
    location: { lat: 51.4, lon: -116.5 }
  },
  {
    id: 'habelia',
    name: 'Habelia',
    scientificName: 'Habelia optata',
    appearanceMa: 510,
    extinctMa: 505,
    abundanceProfile: [[510, 0.03], [508, 0.10], [506, 0.12], [505, 0.04]],
    description: 'Burgess Shale chelicerate: oldest unambiguous spider/scorpion relative',
    descriptionLong: 'A small armored arthropod (~2 cm) known from Walcott Quarry for over a century but completely reinterpreted in 2017, when better imaging of the head revealed a chelicerate-style appendage layout. The redescription places Habelia at the base of the chelicerate tree, making it the oldest unambiguous member of the lineage that contains modern spiders, scorpions, and horseshoe crabs. Its powerful jaws-and-pincers head suggests these animals started life as durophagous predators, not the sit-and-wait hunters most modern chelicerates have become.',
    location: { lat: 51.4, lon: -116.5 }
  },

  // Devonian
  {
    id: 'qikiqtania',
    name: 'Qikiqtania',
    scientificName: 'Qikiqtania wakei',
    appearanceMa: 375,
    extinctMa: 370,
    abundanceProfile: [[375, 0.03], [373, 0.10], [371, 0.08], [370, 0.02]],
    description: 'Tetrapodomorph cousin of Tiktaalik that returned to fully aquatic life',
    descriptionLong: 'A meter-long sarcopterygian fish from the same Ellesmere Island sites that produced Tiktaalik, formally described in 2022 after decades in storage. Its pectoral fin bones lack the weight-bearing modifications seen in Tiktaalik and show instead an oar-like geometry, indicating that Qikiqtania abandoned shallow-water "walking" and recommitted to swimming even as its close relatives were inching onto land. It is the first clear evidence that the tetrapod-stem lineage included independent re-aquatic experiments running in parallel with the famous fish-to-land trajectory.',
    location: { lat: 79, lon: -77 }
  },
  {
    id: 'hyneria_udlezinye',
    name: 'Hyneria udlezinye',
    scientificName: 'Hyneria udlezinye',
    appearanceMa: 365,
    extinctMa: 358,
    abundanceProfile: [[365, 0.05], [362, 0.18], [360, 0.20], [358, 0.06]],
    description: 'Apex 2.7 m Devonian sarcopterygian from high-latitude Gondwana',
    descriptionLong: 'A massive lobe-finned predatory fish, around 2.7 meters long, named in 2022 from the Witpoort Formation of the Eastern Cape, South Africa. Despite living near the Devonian South Pole at roughly 70°S paleolatitude, it occupied the same apex-predator niche as North American Hyneria lindae, demonstrating that giant tristichopterids were a worldwide fixture of late Devonian estuaries. The species name "udlezinye" means "the one that eats others" in the local isiXhosa language.',
    location: { lat: -33, lon: 27 }
  },

  // Carboniferous
  {
    id: 'arthropleura_giant',
    name: 'Arthropleura',
    scientificName: 'Arthropleura armata',
    appearanceMa: 345,
    extinctMa: 290,
    abundanceProfile: [[345, 0.05], [320, 0.30], [305, 0.35], [298, 0.20], [290, 0.03]],
    description: 'Up to 2.6 m Carboniferous millipede — largest land arthropod ever',
    descriptionLong: 'A flat-bodied myriapod whose largest known specimens reached 2.6 meters and an estimated 50 kilograms, making it the biggest terrestrial arthropod that has ever lived. A spectacular partial exoskeleton found in a sandstone block on Howick beach, Northumberland, was described in 2021 and forced a major upward revision of size estimates and ecological role: Arthropleura was likely a high-fiber herbivore feeding on Lepidodendron-class lycopsid forests. It thrived in the high-oxygen Carboniferous and disappeared as atmospheric O2 declined and reptile predators diversified.',
    location: { lat: 55.5, lon: -1.6 }
  },

  // Middle Triassic
  {
    id: 'cymbospondylus',
    name: 'Cymbospondylus',
    scientificName: 'Cymbospondylus youngorum',
    appearanceMa: 247,
    extinctMa: 244,
    abundanceProfile: [[247, 0.05], [246, 0.18], [245, 0.16], [244, 0.04]],
    description: 'Earliest known giant ichthyosaur — 17 m, just 5 Ma after end-Permian',
    descriptionLong: 'A 17-meter ichthyosaur whose two-meter skull was excavated from the Augusta Mountains of Nevada and named in 2021. Living only about five million years after the end-Permian mass extinction, it shows that marine reptiles ballooned to sperm-whale dimensions almost as soon as ocean ecosystems recovered — far faster than the equivalent rise of giant mammals after the end-Cretaceous. Its sheer size requires an unexpectedly productive Triassic ocean and an explosive growth strategy that no living analogue truly matches.',
    location: { lat: 40.4, lon: -118 }
  },

  // Late Triassic
  {
    id: 'issi_saaneq',
    name: 'Issi saaneq',
    scientificName: 'Issi saaneq',
    appearanceMa: 215,
    extinctMa: 212,
    abundanceProfile: [[215, 0.04], [214, 0.14], [213, 0.10], [212, 0.02]],
    description: 'Late Triassic plateosaurid sauropodomorph from Greenland (2021)',
    descriptionLong: 'A medium-sized two-legged sauropodomorph (~3-4 meters), named in 2021 from skulls collected by Danish-led expeditions to the Jameson Land basin of east Greenland. Its name means "cold bone" in Greenlandic Inuktitut, referencing both the Arctic recovery site and the high-latitude environment Issi inhabited. The find pushes plateosaurid range deep into Pangaea\'s polar regions and helps map how this early dinosaur lineage spread before the supercontinent broke apart.',
    location: { lat: 71, lon: -25 }
  },

  // Early Jurassic
  {
    id: 'ledumahadi',
    name: 'Ledumahadi',
    scientificName: 'Ledumahadi mafube',
    appearanceMa: 200,
    extinctMa: 195,
    abundanceProfile: [[200, 0.04], [198, 0.14], [196, 0.10], [195, 0.02]],
    description: 'Quadrupedal Early Jurassic giant sauropodomorph (12 t, S. Africa)',
    descriptionLong: 'An Early Jurassic sauropodomorph from the Free State of South Africa, named in 2018, whose 12-tonne body weight made it the largest known terrestrial animal of its time. Limb-bone analysis showed it walked on all fours despite still belonging to the bipedal-leaning sauropodomorph grade — a precocious experiment in giant quadrupedalism tens of millions of years before the true sauropod radiation. Its Sesotho name means "giant thunderclap at dawn."',
    location: { lat: -29, lon: 28 }
  },

  // Middle/Late Jurassic
  {
    id: 'maiopatagium',
    name: 'Maiopatagium',
    scientificName: 'Maiopatagium furculiferum',
    appearanceMa: 162,
    extinctMa: 158,
    abundanceProfile: [[162, 0.04], [160, 0.12], [159, 0.10], [158, 0.03]],
    description: 'Gliding Jurassic mammaliaform with skin membranes between limbs',
    descriptionLong: 'A squirrel-sized haramiyidan mammaliaform from the Tiaojishan Formation of northeastern China, described in 2017 with an exquisitely preserved gliding membrane stretched between its limbs. It pre-dates the modern gliding mammals (sugar gliders, flying squirrels) by more than 100 million years and shows that early mammal-line synapsids were already exploiting arboreal niches alongside contemporary feathered dinosaurs. Its diet appears to have been soft plant parts and seeds, prefiguring the later success of arboreal mammalian herbivores.',
    location: { lat: 41, lon: 119 }
  },
  {
    id: 'yi_qi',
    name: 'Yi qi',
    scientificName: 'Yi qi',
    appearanceMa: 162,
    extinctMa: 158,
    abundanceProfile: [[162, 0.03], [160, 0.10], [159, 0.08], [158, 0.02]],
    description: 'Pigeon-sized scansoriopterygid with bat-like membrane wings',
    descriptionLong: 'A tiny Jurassic theropod from the Tiaojishan Formation of Hebei, described in 2015, that combined feathers with a stiff styliform wrist bone supporting a membranous wing — closer in plan to a bat or pterosaur than to a bird. The species name (meaning "strange wing" in Mandarin) captures how surprising the find was: it shows dinosaurs experimented with at least two completely different aerodynamic architectures during the Jurassic. Yi qi was probably a short-distance glider hunting insects in the canopy.',
    location: { lat: 41, lon: 114.5 }
  },
  {
    id: 'anchiornis',
    name: 'Anchiornis',
    scientificName: 'Anchiornis huxleyi',
    appearanceMa: 161,
    extinctMa: 158,
    abundanceProfile: [[161, 0.05], [160, 0.18], [159, 0.16], [158, 0.04]],
    description: 'Four-winged feathered theropod with reconstructed plumage color',
    descriptionLong: 'A crow-sized paravian from the Tiaojishan Formation of Liaoning, named in 2009 and famous as the first dinosaur to have its full body color reconstructed (in 2010) from the shape of preserved melanosomes. The result — a black-and-white body with a rusty crown patch — was the first time anyone could realistically picture what a non-avian dinosaur actually looked like. Anchiornis sits very near the dinosaur-bird transition and is now one of the best-known feathered theropods on Earth.',
    location: { lat: 41.6, lon: 120.7 }
  },
  {
    id: 'tianyulong',
    name: 'Tianyulong',
    scientificName: 'Tianyulong confuciusi',
    appearanceMa: 160,
    extinctMa: 156,
    abundanceProfile: [[160, 0.04], [159, 0.12], [158, 0.10], [156, 0.03]],
    description: 'Heterodontosaurid ornithischian with quill-like filamentous integument',
    descriptionLong: 'A small, fast-running ornithischian from China, originally described in 2009 with bristly filaments preserved along its back and tail. Because ornithischians sit on the opposite branch of Dinosauria from theropods, the existence of fuzz on Tianyulong implies that protofeather-like integument is ancestral for all dinosaurs (and possibly for ornithodirans more broadly), not a theropod novelty. Subsequent work in the 2010s reinforced the interpretation, making Tianyulong a key data point in the deep history of feathers.',
    location: { lat: 41.6, lon: 120.5 }
  },

  // Early/Mid Cretaceous
  {
    id: 'yutyrannus',
    name: 'Yutyrannus',
    scientificName: 'Yutyrannus huali',
    appearanceMa: 126,
    extinctMa: 122,
    abundanceProfile: [[126, 0.04], [125, 0.16], [123, 0.14], [122, 0.04]],
    description: '9 m feathered tyrannosauroid — biggest known feathered animal',
    descriptionLong: 'A 9-meter, 1,400-kilogram tyrannosauroid from the Yixian Formation of Liaoning, named in 2012 with patches of long filamentous feathers preserved along its body. Its name means "beautiful feathered tyrant" in Mandarin. As by far the largest known feathered animal, Yutyrannus shows that body-covering feathers persisted at large body size in cool Early Cretaceous climates, complicating the long-running assumption that big tyrannosaurs like T. rex lost most of their integumentary insulation.',
    location: { lat: 41.6, lon: 121 }
  },
  {
    id: 'wulong',
    name: 'Wulong',
    scientificName: 'Wulong bohaiensis',
    appearanceMa: 122,
    extinctMa: 118,
    abundanceProfile: [[122, 0.04], [120, 0.14], [119, 0.10], [118, 0.03]],
    description: 'Crow-sized juvenile microraptorine dromaeosaurid (China, 2020)',
    descriptionLong: 'A small four-winged dromaeosaurid from the Jiufotang Formation of Liaoning, named in 2020 from a near-complete juvenile skeleton with extensive feather impressions. Wulong\'s long bony tail tipped with paired plume-feathers shows that ornamental display structures evolved early and may have functioned in courtship before maturity, complicating the line between adult and juvenile plumage in early paravians. The name means "dancing dragon."',
    location: { lat: 41.6, lon: 120.5 }
  },
  {
    id: 'borealopelta',
    name: 'Borealopelta',
    scientificName: 'Borealopelta markmitchelli',
    appearanceMa: 112,
    extinctMa: 108,
    abundanceProfile: [[112, 0.05], [110, 0.18], [109, 0.16], [108, 0.05]],
    description: 'Mummified nodosaur with skin, scales, and original color preserved',
    descriptionLong: 'A 5.5-meter armored ankylosaur recovered nose-down in marine sediment at the Suncor Millennium Mine in Alberta, named in 2017 after years of meticulous preparation. The carcass was floated out to sea, sank in low-oxygen mud, and lithified essentially three-dimensionally — preserving osteoderms, keratinous sheaths, gut contents, and even pigment chemistry that revealed reddish-brown countershading. Borealopelta is among the most lifelike dinosaur fossils ever found and remains the basis for our most confident dinosaur color reconstruction.',
    location: { lat: 57, lon: -111.5 }
  },
  {
    id: 'cretophasmomima',
    name: 'Cretophasmomima',
    scientificName: 'Cretophasmomima melanogramma',
    appearanceMa: 127,
    extinctMa: 122,
    abundanceProfile: [[127, 0.03], [125, 0.10], [124, 0.08], [122, 0.02]],
    description: 'Cretaceous stick insect with leaf-mimicking wing pattern',
    descriptionLong: 'A leaf-mimicking phasmid from the Yixian Formation of Liaoning, described in 2014 from beautifully preserved adults whose dark longitudinal wing stripes mirror those of contemporary gymnosperm leaves recovered in the same beds. It is among the earliest unambiguous evidence of insect leaf-mimicry — a textbook camouflage strategy whose evolutionary origin had been hard to date. Cretophasmomima also lived alongside the first flowering plants, suggesting that the plant–insect mimicry arms race got started in the Early Cretaceous.',
    location: { lat: 41.5, lon: 121.5 }
  },
  {
    id: 'patagotitan',
    name: 'Patagotitan',
    scientificName: 'Patagotitan mayorum',
    appearanceMa: 103,
    extinctMa: 100,
    abundanceProfile: [[103, 0.05], [102, 0.20], [101, 0.18], [100, 0.05]],
    description: '~70 t titanosaur from Argentine Patagonia — among the largest land animals',
    descriptionLong: 'An enormous Patagonian titanosaur, formally named in 2017 from at least six individuals quarried at La Flecha farm in Chubut Province. Femur length of 2.4 meters and a body length of around 37 meters place Patagotitan in the running for the largest land animal that ever lived (along with Argentinosaurus and Notocolossus). Its discovery filled in critical anatomy of the late lognkosaurian sauropods and inspired the iconic American Museum of Natural History full-skeleton mount.',
    location: { lat: -43.5, lon: -69 }
  },
  {
    id: 'xiyunykus',
    name: 'Xiyunykus',
    scientificName: 'Xiyunykus pengi',
    appearanceMa: 122,
    extinctMa: 118,
    abundanceProfile: [[122, 0.03], [120, 0.10], [119, 0.08], [118, 0.02]],
    description: 'Long-snouted Early Cretaceous alvarezsaurian theropod (Xinjiang, 2018)',
    descriptionLong: 'A medium-sized alvarezsaurian theropod from the Tugulu Group of Xinjiang, named in 2018, that fills a critical gap between basal alvarezsaurs and the highly specialized later forms. Its elongated snout shows the early stages of the slender insectivorous skull seen in Mononykus, while its arms still retain a more typical theropod build before the lineage\'s later reduction to a single stout claw. Xiyunykus and its sister Bannykus together document one of the most striking evolutionary transformations in any dinosaur clade.',
    location: { lat: 44, lon: 86 }
  },
  {
    id: 'halszkaraptor',
    name: 'Halszkaraptor',
    scientificName: 'Halszkaraptor escuilliei',
    appearanceMa: 75,
    extinctMa: 71,
    abundanceProfile: [[75, 0.04], [74, 0.14], [73, 0.10], [71, 0.03]],
    description: 'Goose-necked, semi-aquatic Mongolian dromaeosaurid (2017)',
    descriptionLong: 'A roughly duck-sized dromaeosaurid from the Mongolian Gobi, named in 2017, with a long flexible neck, flipper-like forelimbs, and a body plan more reminiscent of waterfowl than a "raptor." Synchrotron scans of the holotype settled an authentication dispute and revealed teeth, body proportions, and bone microstructure consistent with a piscivorous, semi-aquatic lifestyle. Halszkaraptor is the only confirmed semi-aquatic non-avialan dinosaur outside Spinosauridae.',
    location: { lat: 43.5, lon: 102 }
  },
  {
    id: 'mansourasaurus',
    name: 'Mansourasaurus',
    scientificName: 'Mansourasaurus shahinae',
    appearanceMa: 81,
    extinctMa: 78,
    abundanceProfile: [[81, 0.04], [80, 0.14], [79, 0.10], [78, 0.03]],
    description: 'Late Cretaceous African titanosaur — rare African Mesozoic dinosaur',
    descriptionLong: 'A medium-sized titanosaur (~10 m, 5.5 t) from the Quseir Formation of the Dakhla Oasis, Egypt, named in 2018 from a partial skeleton including the skull, jaw, and significant postcrania. The specimen is the most complete late Cretaceous African dinosaur known and has phylogenetic affinities with European sauropods, indicating that land bridges between Africa and southern Europe were still functional well into the Campanian. Mansourasaurus single-handedly improved our understanding of late-Mesozoic Gondwanan biogeography.',
    location: { lat: 25.5, lon: 28.9 }
  },
  {
    id: 'vintana',
    name: 'Vintana',
    scientificName: 'Vintana sertichi',
    appearanceMa: 71,
    extinctMa: 66,
    abundanceProfile: [[71, 0.04], [70, 0.14], [68, 0.12], [66, 0.04]],
    description: 'Baseball-sized-skull gondwanatherian from Late Cretaceous Madagascar',
    descriptionLong: 'A 9-kilogram herbivorous gondwanatherian mammal from the Maevarano Formation of Madagascar, named in 2014 from a remarkably complete skull. Its size dwarfed every other Mesozoic mammal known at the time, and its grinding dentition suggests it ate tough vegetation on a Late Cretaceous Gondwanan island already evolving its peculiar isolated fauna. Vintana means "luck" in Malagasy — a nod to the unexpected discovery that Mesozoic mammals could be this large and this strange.',
    location: { lat: -16, lon: 46.5 }
  },
  {
    id: 'adalatherium',
    name: 'Adalatherium',
    scientificName: 'Adalatherium hui',
    appearanceMa: 70,
    extinctMa: 66,
    abundanceProfile: [[70, 0.04], [69, 0.13], [67, 0.11], [66, 0.04]],
    description: '"Crazy beast" — gondwanatherian mammal with extreme insular morphology',
    descriptionLong: 'A 3-kilogram badger-like mammal from the Maevarano Formation of Madagascar, named in 2020 from a near-complete skeleton (the most complete Mesozoic mammal from the Southern Hemisphere). Its body plan combines a long flexible spine with massive forelimbs, bizarre tooth morphology, and an unprecedented number of cranial foramina, suggesting a sensory and behavioral package unlike any modern analog. Adalatherium hui (Malagasy "crazy beast / Hu\'s") embodies how isolated Late Cretaceous Madagascar incubated its own evolutionary experiments alongside the dinosaurs.',
    location: { lat: -16, lon: 46.5 }
  },
  {
    id: 'natovenator',
    name: 'Natovenator',
    scientificName: 'Natovenator polydontus',
    appearanceMa: 73,
    extinctMa: 69,
    abundanceProfile: [[73, 0.03], [72, 0.10], [71, 0.08], [69, 0.02]],
    description: 'Streamlined diving dromaeosaurid from Mongolia (2022)',
    descriptionLong: 'A small Halszkaraptor-relative from the Barun Goyot Formation of Mongolia, named in 2022, whose ribcage shows the goose-style streamlining typical of modern diving birds — flat, posteriorly-directed ribs that compress the body into a hydrodynamic shape. Combined with its many small needle-like teeth and a sinuous neck, Natovenator firmly establishes a second clear case of semi-aquatic ecology in non-avialan theropods. The name means "swimming hunter."',
    location: { lat: 43.5, lon: 102 }
  },
  {
    id: 'dakotaraptor',
    name: 'Dakotaraptor',
    scientificName: 'Dakotaraptor steini',
    appearanceMa: 67,
    extinctMa: 66,
    abundanceProfile: [[67, 0.04], [66.5, 0.12], [66.1, 0.10], [66, 0.02]],
    description: '5+ m feathered dromaeosaurid from Hell Creek (S. Dakota, 2015)',
    descriptionLong: 'A roughly 5.5-meter dromaeosaurid from the Hell Creek Formation of South Dakota, named in 2015, with quill knobs on the ulna confirming flight-style feathers on the arms despite the animal being far too large to fly. Dakotaraptor lived alongside Tyrannosaurus rex right up to the K-Pg boundary, occupying a mid-sized predator niche otherwise hard to fill in latest Maastrichtian faunas. Some elements of the original holotype have since been argued to belong to a turtle, but the dromaeosaurid identity of the type material itself stands.',
    location: { lat: 45.6, lon: -103.4 }
  },

  // Earliest Paleogene
  {
    id: 'asteriornis',
    name: 'Asteriornis',
    scientificName: 'Asteriornis maastrichtensis',
    appearanceMa: 67,
    extinctMa: 66,
    abundanceProfile: [[67, 0.04], [66.7, 0.12], [66.3, 0.10], [66, 0.04]],
    description: '"Wonderchicken" — earliest known modern crown-bird (Belgium, 2020)',
    descriptionLong: 'A small chicken-sized bird from latest Cretaceous beach deposits in Belgium, named in 2020, whose nearly complete skull is the oldest unambiguous fossil of a modern crown bird. It sits at or near the split between landfowl (chickens) and waterfowl (ducks), proving that the Galloanserae lineage already existed when the asteroid struck — and probably explaining why these groups, alongside paleognaths and a few neoavians, were the seed stock for all 11,000 living bird species. Its informal nickname "Wonderchicken" stuck immediately.',
    location: { lat: 51, lon: 3.7 }
  },

  // Eocene
  {
    id: 'kumimanu',
    name: 'Kumimanu',
    scientificName: 'Kumimanu fordycei',
    appearanceMa: 59,
    extinctMa: 55,
    abundanceProfile: [[59, 0.04], [57, 0.14], [56, 0.12], [55, 0.04]],
    description: 'Heaviest known penguin (~150 kg) — Paleocene New Zealand, 2023',
    descriptionLong: 'A giant Paleocene penguin from the Moeraki Formation of New Zealand\'s Otago coast, formally described in 2023, whose flipper bones imply a body mass around 150 kilograms — three times the largest living penguin (the emperor) and the heaviest seabird ever known. Kumimanu shows that penguins had achieved gigantism within just a few million years of the K-Pg extinction, exploiting marine niches left empty by the demise of mosasaurs and pteranodontids. Its name means "monster bird" in Maori.',
    location: { lat: -45.5, lon: 170.6 }
  },
  {
    id: 'phiomicetus',
    name: 'Phiomicetus',
    scientificName: 'Phiomicetus anubis',
    appearanceMa: 44,
    extinctMa: 41,
    abundanceProfile: [[44, 0.04], [43, 0.14], [42, 0.12], [41, 0.03]],
    description: '3 m four-legged predatory whale; "Anubis whale" (Egypt, 2021)',
    descriptionLong: 'A roughly 3-meter, 600-kilogram four-legged whale from the Fayum Depression of Egypt, named in 2021 — the first protocetid whale described by an Arab-led team. Its powerful jaws and elongated skull proportions earned it the species name "anubis" after the Egyptian god of mummification, evoking a fearsome predator able to take large prey on land or in water. Phiomicetus refines our picture of how amphibious whales spread across the Tethys Sea coastlines on their way to fully aquatic life.',
    location: { lat: 29.3, lon: 30.7 }
  },
  {
    id: 'peregocetus',
    name: 'Peregocetus',
    scientificName: 'Peregocetus pacificus',
    appearanceMa: 43,
    extinctMa: 40,
    abundanceProfile: [[43, 0.04], [42.5, 0.13], [41, 0.10], [40, 0.03]],
    description: 'Four-legged whale on the Pacific coast of Peru — first New World find',
    descriptionLong: 'A 4-meter four-legged whale from Playa Media Luna, Peru, named in 2019 — the first quadrupedal whale ever found in the Americas. Anatomical details of the tail and feet suggest it could swim using both webbed feet and a tail-driven undulation, a transitional locomotion mode between Indohyus-style wading and the fully fluked propulsion of basilosaurids. Its presence in South America implies that early whales crossed the South Atlantic from West Africa within just a few million years of taking to the water.',
    location: { lat: -14.4, lon: -75.9 }
  },
  {
    id: 'inkayacu',
    name: 'Inkayacu',
    scientificName: 'Inkayacu paracasensis',
    appearanceMa: 37,
    extinctMa: 34,
    abundanceProfile: [[37, 0.04], [36, 0.14], [35, 0.12], [34, 0.04]],
    description: 'Giant Eocene Peruvian penguin with reconstructed reddish-brown plumage',
    descriptionLong: 'A 1.5-meter Eocene penguin from the Otuma Formation of Peru\'s Pisco Basin, named in 2010 from a near-complete skeleton with feather impressions. Crucially, melanosomes preserved in its plumage allowed the first color reconstruction of any extinct penguin, revealing reddish-brown and grey rather than the modern black-and-white. Inkayacu shows that penguin gigantism extended into low latitudes during the warmer Eocene and that today\'s tuxedo coloring is a comparatively recent specialization.',
    location: { lat: -14, lon: -75.5 }
  },

  // Pleistocene Hominins
  {
    id: 'denisovans',
    name: 'Denisovans',
    scientificName: 'Homo sp. Denisova',
    appearanceMa: 0.5,
    extinctMa: 0.03,
    abundanceProfile: [[0.5, 0.05], [0.2, 0.20], [0.06, 0.18], [0.03, 0.02]],
    description: 'Asian sister group to Neanderthals, identified from genetics in 2010',
    descriptionLong: 'A previously unknown human lineage first identified in 2010 from a single finger bone in Denisova Cave, Siberia, when ancient DNA revealed it belonged to neither Homo sapiens nor Neanderthals. Subsequent finds (a jaw from the Tibetan Plateau in 2019; teeth from Laos in 2022) extended their range across East Asia and into high-altitude environments. Surviving Denisovan ancestry of up to 5% in modern Melanesians and Papuans shows that they interbred extensively with our own species before going extinct around 30,000 years ago.',
    location: { lat: 51.4, lon: 84.7 }
  },
  {
    id: 'homo_naledi',
    name: 'Homo naledi',
    scientificName: 'Homo naledi',
    appearanceMa: 0.335,
    extinctMa: 0.236,
    abundanceProfile: [[0.335, 0.05], [0.3, 0.18], [0.27, 0.16], [0.236, 0.04]],
    description: 'Mosaic-anatomy hominin from Rising Star Cave, S. Africa (2015)',
    descriptionLong: 'A small-brained but otherwise gracile hominin named in 2015 from over 1,500 fossils packed into the nearly inaccessible Dinaledi Chamber of South Africa\'s Rising Star Cave system. Its mosaic anatomy — primitive shoulders and pelvis, modern feet and teeth — initially suggested a Pliocene age, but radiometric dating in 2017 placed it at just 335-236 thousand years ago, contemporary with early Homo sapiens. Whether the chamber represents deliberate body disposal by Homo naledi remains contested but stands as one of the most provocative open questions in paleoanthropology.',
    location: { lat: -25.9, lon: 27.8 }
  },
  {
    id: 'homo_longi',
    name: 'Homo longi',
    scientificName: 'Homo longi',
    appearanceMa: 0.2,
    extinctMa: 0.146,
    abundanceProfile: [[0.2, 0.05], [0.18, 0.16], [0.16, 0.14], [0.146, 0.04]],
    description: '"Dragon Man" — large-skulled Pleistocene hominin from Harbin (2021)',
    descriptionLong: 'A massive, well-preserved Middle Pleistocene cranium from Harbin, northeast China, named in 2021 from a skull that had been hidden in a well since 1933 to keep it from Japanese occupiers. Its huge braincase, broad face, and large brow ridge prompted formal designation as a new species (Homo longi, "dragon"), though many researchers now suspect the specimen actually represents a Denisovan — which would finally give that elusive lineage a face. Either way, Homo longi enriches the picture of how diverse our genus was in Asia just before sapiens arrived.',
    location: { lat: 45.8, lon: 126.5 }
  },
  {
    id: 'homo_luzonensis',
    name: 'Homo luzonensis',
    scientificName: 'Homo luzonensis',
    appearanceMa: 0.067,
    extinctMa: 0.05,
    abundanceProfile: [[0.067, 0.04], [0.06, 0.12], [0.055, 0.10], [0.05, 0.02]],
    description: 'Small-bodied Philippine island hominin from Callao Cave (2019)',
    descriptionLong: 'A small-bodied hominin named in 2019 from a handful of teeth and foot bones found in Callao Cave on Luzon, Philippines, dated to between 67 and 50 thousand years ago. Its mosaic anatomy — primitive curved finger and toe bones together with modern-looking molars — closely parallels Homo floresiensis on the nearby island of Flores, suggesting that Southeast Asia hosted multiple independent island-dwarf hominin lineages contemporaneous with early Homo sapiens. Luzon was never connected to mainland Asia, implying these ancestors arrived by water.',
    location: { lat: 17.7, lon: 121.8 }
  },
];

// Merge Linnaean taxonomy + rank (and any scientificName overrides) into every entry.
// In development, warn loudly if any entry lacks a taxonomy record — the lineage UI
// assumes every species has one.
export const species = rawSpecies.map((sp) => {
  const tax = TAXONOMY[sp.id];
  if (!tax) {
    console.warn(`[species.js] No taxonomy record for id="${sp.id}". Add it to speciesTaxonomy.js.`);
    return sp;
  }
  return {
    ...sp,
    taxonomy: tax.taxonomy,
    rank: tax.rank,
    scientificName: tax.scientificName ?? sp.scientificName,
  };
});

/**
 * Get species alive at the given time, sorted by abundance descending.
 */
export function getSpeciesAtTime(timeMa) {
  const alive = [];
  for (const s of species) {
    const start = s.appearanceMa;
    const end = s.extinctMa ?? 0;
    if (timeMa <= start && timeMa >= end) {
      const abundance = interpolateAbundance(s.abundanceProfile, timeMa);
      alive.push({ ...s, currentAbundance: abundance });
    }
  }
  alive.sort((a, b) => b.currentAbundance - a.currentAbundance);
  return alive;
}

/**
 * Interpolate abundance at a given time from an abundance profile.
 */
function interpolateAbundance(profile, timeMa) {
  if (profile.length === 0) return 0;
  // Profile is sorted from oldest to youngest [highMa, ..., lowMa]
  if (timeMa >= profile[0][0]) return profile[0][1];
  if (timeMa <= profile[profile.length - 1][0]) return profile[profile.length - 1][1];

  for (let i = 0; i < profile.length - 1; i++) {
    const [ma1, a1] = profile[i];
    const [ma2, a2] = profile[i + 1];
    if (timeMa <= ma1 && timeMa >= ma2) {
      const t = (ma1 - timeMa) / (ma1 - ma2);
      return a1 + (a2 - a1) * t;
    }
  }
  return 0;
}
