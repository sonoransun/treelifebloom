// Species and event entries across all geological eons.
// abundanceProfile: array of [Ma, relative_abundance (0-1)] pairs, interpolated at runtime.
// category values map to COLORS.kingdom in config.js.

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
    location: { lat: -25, lon: 25 }
  },
  {
    id: 'great_oxygenation',
    name: 'Great Oxygenation Event',
    scientificName: null,
    category: 'event',
    appearanceMa: 2400,
    extinctMa: 2000,
    abundanceProfile: [[2400, 0.01], [2300, 0.8], [2100, 0.6], [2000, 0.01]],
    description: 'Oxygen levels rise dramatically, transforming Earth',
    location: { lat: 0, lon: 0 }
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
    location: { lat: 20, lon: -80 }
  },
  {
    id: 'snowball_earth',
    name: 'Snowball Earth',
    scientificName: null,
    category: 'event',
    appearanceMa: 720,
    extinctMa: 635,
    abundanceProfile: [[720, 0.01], [700, 0.9], [650, 0.7], [635, 0.01]],
    description: 'Global glaciation nearly covers the entire planet in ice',
    location: { lat: 0, lon: 0 }
  },
  {
    id: 'ediacaran_biota',
    name: 'Ediacaran Biota',
    scientificName: 'Dickinsonia, Charnia',
    category: 'invertebrate',
    appearanceMa: 575,
    extinctMa: 538,
    abundanceProfile: [[575, 0.01], [560, 0.7], [545, 0.5], [538, 0.01]],
    description: 'First large, complex organisms — soft-bodied and enigmatic',
    location: { lat: -30, lon: 40 }
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
    location: { lat: -35, lon: 50 }
  },

  // ===== CAMBRIAN PERIOD =====
  {
    id: 'cambrian_explosion',
    name: 'Cambrian Explosion',
    scientificName: null,
    category: 'event',
    appearanceMa: 538,
    extinctMa: 520,
    abundanceProfile: [[538, 0.01], [530, 0.9], [525, 0.7], [520, 0.01]],
    description: 'Rapid appearance of most major animal phyla',
    location: { lat: -5, lon: 0 }
  },
  {
    id: 'trilobite',
    name: 'Trilobites',
    scientificName: 'Trilobita',
    category: 'arthropod',
    appearanceMa: 521,
    extinctMa: 252,
    abundanceProfile: [[521, 0.01], [500, 0.8], [470, 0.9], [400, 0.5], [300, 0.3], [252, 0.01]],
    description: 'Iconic Paleozoic arthropods; dominated ancient seas',
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
    location: { lat: 10, lon: -120 }
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
    location: { lat: -20, lon: 0 }
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
    location: { lat: -5, lon: -20 }
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
    location: { lat: 0, lon: -25 }
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
    location: { lat: 0, lon: 0 }
  },

  // ===== PERMIAN PERIOD =====
  {
    id: 'dimetrodon',
    name: 'Dimetrodon',
    scientificName: 'Dimetrodon grandis',
    category: 'synapsid',
    appearanceMa: 295,
    extinctMa: 272,
    abundanceProfile: [[295, 0.01], [285, 0.6], [278, 0.7], [272, 0.01]],
    description: 'Sail-backed synapsid; on the mammal ancestry line',
    location: { lat: 10, lon: -30 }
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
    location: { lat: -20, lon: 30 }
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
    location: { lat: 30, lon: 80 }
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
    location: { lat: 15, lon: 20 }
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
    location: { lat: 42, lon: -105 }
  },

  // ===== CENOZOIC - PALEOGENE =====
  {
    id: 'mammal_radiation',
    name: 'Mammalian Radiation',
    scientificName: null,
    category: 'event',
    appearanceMa: 64,
    extinctMa: 50,
    abundanceProfile: [[64, 0.01], [60, 0.8], [55, 0.9], [50, 0.01]],
    description: 'Mammals rapidly diversify to fill ecological niches left by dinosaurs',
    location: { lat: 30, lon: -80 }
  },
  {
    id: 'first_primates',
    name: 'First Primates',
    scientificName: 'Plesiadapis',
    category: 'primate',
    appearanceMa: 56,
    extinctMa: null,
    abundanceProfile: [[56, 0.01], [45, 0.3], [30, 0.4], [10, 0.5], [0, 0.4]],
    description: 'Small arboreal mammals; our lineage begins',
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
    location: { lat: 25, lon: 70 }
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
    location: { lat: 10, lon: 35 }
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
    location: { lat: 40, lon: -90 }
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
    location: { lat: 0, lon: 35 }
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
    location: { lat: 35, lon: -100 }
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
    location: { lat: 5, lon: 35 }
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Civilization',
    scientificName: null,
    category: 'event',
    appearanceMa: 0.012,
    extinctMa: null,
    abundanceProfile: [[0.012, 0.01], [0.008, 0.5], [0.005, 0.7], [0, 1.0]],
    description: 'Farming, cities, and the transformation of Earth',
    location: { lat: 33, lon: 44 }
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
