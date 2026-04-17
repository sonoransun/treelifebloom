// Species and event entries across all geological eons.
// abundanceProfile: array of [Ma, relative_abundance (0-1)] pairs, interpolated at runtime.
// category values map to COLORS.kingdom in config.js.
// description: short one-line label (sidebar uses ellipsis at css/styles.css:340).
// descriptionLong: 2-3 sentences for hover popup (morphology / ecology / significance).

export const species = [
  // ===== ARCHEAN EON =====
  {
    id: 'prokaryotes',
    name: 'Prokaryotes',
    scientificName: 'Bacteria & Archaea',
    category: 'prokaryote',
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
    category: 'bacteria',
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
    category: 'eukaryote',
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
    category: 'plant',
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
    category: 'eukaryote',
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
    category: 'plant',
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
    category: 'invertebrate',
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
    category: 'invertebrate',
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
    category: 'invertebrate',
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
    category: 'arthropod',
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
    category: 'arthropod',
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
    category: 'arthropod',
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
    category: 'invertebrate',
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
    category: 'fish',
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
    category: 'invertebrate',
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
    category: 'invertebrate',
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
    category: 'plant',
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
    category: 'arthropod',
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
    category: 'fish',
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
    category: 'plant',
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
    category: 'arthropod',
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
    category: 'arthropod',
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
    category: 'plant',
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
    category: 'fish',
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
    category: 'fish',
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
    category: 'amphibian',
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
    category: 'amphibian',
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
    category: 'arthropod',
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
    category: 'reptile',
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
    category: 'plant',
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
    category: 'synapsid',
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
    category: 'synapsid',
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
    category: 'reptile',
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
    category: 'synapsid',
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
    category: 'synapsid',
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
    category: 'reptile',
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
    category: 'mammal',
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
    category: 'reptile',
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
    category: 'reptile',
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
    category: 'reptile',
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
    category: 'bird',
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
    category: 'plant',
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
    category: 'mammal',
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
    category: 'reptile',
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
    category: 'reptile',
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
    category: 'reptile',
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
    category: 'reptile',
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
    category: 'reptile',
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
    category: 'primate',
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
    category: 'mammal',
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
    category: 'mammal',
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
    category: 'mammal',
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
    category: 'primate',
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
    category: 'primate',
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
    category: 'bird',
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
    category: 'plant',
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
    category: 'hominin',
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
    category: 'hominin',
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
    category: 'fish',
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
    category: 'hominin',
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
    category: 'hominin',
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
    category: 'mammal',
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
    category: 'mammal',
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
    category: 'mammal',
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
    category: 'mammal',
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
    category: 'mammal',
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
    category: 'mammal',
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
    category: 'hominin',
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
    category: 'hominin',
    appearanceMa: 0.3,
    extinctMa: null,
    abundanceProfile: [[0.3, 0.01], [0.1, 0.2], [0.05, 0.4], [0.012, 0.6], [0.005, 0.8], [0, 1.0]],
    description: 'Modern humans — us',
    descriptionLong: 'Anatomically modern humans emerged in Africa around 300,000 years ago, distinguished by a globular braincase, slender skeleton, and complex symbolic behavior. By around 70,000 years ago we had spread across Eurasia and interbred with both Neanderthals and Denisovans before replacing them. In the past 10,000 years we have transformed Earth\'s climate, biosphere, and surface more rapidly than any species in geological history.',
    location: { lat: 5, lon: 35 }
  },
];

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
