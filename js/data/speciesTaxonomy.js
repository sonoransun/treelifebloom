// Linnaean taxonomy + `rank` for every species entry, keyed by species.id.
// Merged into each species at module load by js/data/species.js.
//
// Rules:
//   - `rank` names the level this entry actually represents. All ranks above it
//     must be filled; all ranks below it must be null.
//   - `rank` values: 'domain' | 'kingdom' | 'classOrPhylum' | 'order' | 'family' | 'genus' | 'species'.
//   - `scientificName` is an OPTIONAL override: when provided it replaces the value in
//     species.js (curating loose common-name values toward proper Linnaean forms).
//   - `classOrPhylum` is one field, carrying whichever rank (class OR phylum) conventionally
//     identifies the group. Color lookups key off it via COLORS.clade (see util/taxonomy.js).

const T = (domain, kingdom, classOrPhylum, order, family, genus, species) => ({
  domain, kingdom, classOrPhylum, order, family, genus, species,
});

export const TAXONOMY = {
  // ===== ARCHEAN / PROTEROZOIC =====
  prokaryotes: {
    taxonomy: T('Bacteria', null, null, null, null, null, null),
    rank: 'domain',
    scientificName: 'Bacteria & Archaea (prokaryotes)',
  },
  stromatolites: {
    taxonomy: T('Bacteria', 'Bacteria', 'Cyanobacteria', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Cyanobacteria (stromatolite-building mats)',
  },
  methanogens: {
    taxonomy: T('Archaea', 'Euryarchaeota', 'Methanobacteria', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Methanogenic archaea',
  },
  eukaryotes: {
    taxonomy: T('Eukarya', null, 'Eukaryota', null, null, 'Grypania', 'spiralis'),
    rank: 'species',
    scientificName: 'Grypania spiralis',
  },
  gabonionta: {
    taxonomy: T('Eukarya', 'Eukaryota', null, null, null, null, null),
    rank: 'kingdom',
    scientificName: 'Francevillian (Gabonionta) biota',
  },
  red_algae: {
    taxonomy: T('Eukarya', 'Archaeplastida', 'Rhodophyta', 'Bangiales', 'Bangiaceae', 'Bangiomorpha', 'pubescens'),
    rank: 'species',
    scientificName: 'Bangiomorpha pubescens',
  },
  fungi_divergence: {
    taxonomy: T('Eukarya', 'Fungi', null, null, null, null, null),
    rank: 'kingdom',
    scientificName: 'Fungi (stem)',
  },
  lichens: {
    taxonomy: T('Eukarya', 'Fungi', 'Ascomycota', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Lichen-forming Ascomycota',
  },
  first_sponges: {
    taxonomy: T('Eukarya', 'Animalia', 'Porifera', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Porifera (stem sponges)',
  },
  ediacaran_biota: {
    taxonomy: T('Eukarya', 'Animalia', 'Metazoa-stem', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Ediacaran biota (Charnia, Spriggina et al.)',
  },
  dickinsonia_sp: {
    taxonomy: T('Eukarya', 'Animalia', 'Metazoa-stem', null, 'Dickinsoniidae', 'Dickinsonia', 'costata'),
    rank: 'species',
  },
  kimberella: {
    taxonomy: T('Eukarya', 'Animalia', 'Metazoa-stem', null, 'Kimberellidae', 'Kimberella', 'quadrata'),
    rank: 'species',
  },
  cloudina: {
    taxonomy: T('Eukarya', 'Animalia', 'Metazoa-stem', null, 'Cloudinidae', 'Cloudina', 'carinata'),
    rank: 'species',
  },

  // ===== CAMBRIAN =====
  trilobite: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Trilobita (class within Arthropoda)',
  },
  anomalocaris: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Radiodonta', 'Anomalocarididae', 'Anomalocaris', 'canadensis'),
    rank: 'species',
  },
  opabinia: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Opabiniida', 'Opabiniidae', 'Opabinia', 'regalis'),
    rank: 'species',
  },
  hallucigenia: {
    taxonomy: T('Eukarya', 'Animalia', 'Metazoa-stem', 'Lobopodia', 'Hallucigeniidae', 'Hallucigenia', 'sparsa'),
    rank: 'species',
  },
  aysheaia: {
    taxonomy: T('Eukarya', 'Animalia', 'Metazoa-stem', 'Lobopodia', 'Aysheaiidae', 'Aysheaia', 'pedunculata'),
    rank: 'species',
  },
  wiwaxia: {
    taxonomy: T('Eukarya', 'Animalia', 'Metazoa-stem', null, 'Wiwaxiidae', 'Wiwaxia', 'corrugata'),
    rank: 'species',
  },
  ottoia: {
    taxonomy: T('Eukarya', 'Animalia', 'Priapulida', 'Ottoiidae', 'Ottoiidae', 'Ottoia', 'prolifica'),
    rank: 'species',
  },
  marrella: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Marrellomorpha', 'Marrellidae', 'Marrella', 'splendens'),
    rank: 'species',
  },
  archaeocyatha: {
    taxonomy: T('Eukarya', 'Animalia', 'Porifera', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Archaeocyatha (stem sponges)',
  },
  pikaia: {
    taxonomy: T('Eukarya', 'Animalia', 'Chordata', null, 'Pikaiidae', 'Pikaia', 'gracilens'),
    rank: 'species',
  },
  myllokunmingia: {
    taxonomy: T('Eukarya', 'Animalia', 'Agnatha', null, 'Myllokunmingiidae', 'Myllokunmingia', 'fengjiaoa'),
    rank: 'species',
  },

  // ===== ORDOVICIAN / SILURIAN =====
  nautiloid: {
    taxonomy: T('Eukarya', 'Animalia', 'Mollusca', 'Orthocerida', 'Orthoceratidae', 'Orthoceras', null),
    rank: 'genus',
  },
  cameroceras: {
    taxonomy: T('Eukarya', 'Animalia', 'Mollusca', 'Endocerida', 'Endoceratidae', 'Cameroceras', 'trentonense'),
    rank: 'species',
  },
  land_plants_early: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Bryophyta (stem land plants)',
  },
  sea_scorpion: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Eurypterida', null, null, null),
    rank: 'order',
    scientificName: 'Eurypterida (sea scorpions)',
  },
  graptolites: {
    taxonomy: T('Eukarya', 'Animalia', 'Hemichordata', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Graptolithina (class within Hemichordata)',
  },
  crinoids: {
    taxonomy: T('Eukarya', 'Animalia', 'Echinodermata', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Crinoidea',
  },
  tabulate_corals: {
    taxonomy: T('Eukarya', 'Animalia', 'Cnidaria', 'Tabulata', null, null, null),
    rank: 'order',
    scientificName: 'Tabulata (order within Anthozoa)',
  },
  astraspis: {
    taxonomy: T('Eukarya', 'Animalia', 'Pteraspidomorphi', 'Astraspida', 'Astraspididae', 'Astraspis', 'desiderata'),
    rank: 'species',
  },
  jawed_fish: {
    taxonomy: T('Eukarya', 'Animalia', 'Acanthodii', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Acanthodii (spiny sharks — first jawed fish)',
  },
  vascular_plants: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', 'Cooksonioidea', 'Cooksoniaceae', 'Cooksonia', null),
    rank: 'genus',
    scientificName: 'Cooksonia',
  },
  cooksonia: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', 'Cooksonioidea', 'Cooksoniaceae', 'Cooksonia', 'pertoni'),
    rank: 'species',
  },
  land_arthropods: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Archidesmida', null, 'Pneumodesmus', 'newmani'),
    rank: 'species',
    scientificName: 'Pneumodesmus newmani',
  },

  // ===== DEVONIAN =====
  insects_first: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', null, null, 'Rhyniognatha', 'hirsti'),
    rank: 'species',
    scientificName: 'Rhyniognatha hirsti',
  },
  first_forests: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', 'Archaeopteridales', 'Archaeopteridaceae', 'Archaeopteris', null),
    rank: 'genus',
    scientificName: 'Archaeopteris',
  },
  archaeopteris: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', 'Archaeopteridales', 'Archaeopteridaceae', 'Archaeopteris', 'hibernica'),
    rank: 'species',
  },
  dunkleosteus: {
    taxonomy: T('Eukarya', 'Animalia', 'Placodermi', 'Arthrodira', 'Dunkleosteidae', 'Dunkleosteus', 'terrelli'),
    rank: 'species',
  },
  eusthenopteron: {
    taxonomy: T('Eukarya', 'Animalia', 'Sarcopterygii', 'Osteolepiformes', 'Tristichopteridae', 'Eusthenopteron', 'foordi'),
    rank: 'species',
  },
  tiktaalik: {
    taxonomy: T('Eukarya', 'Animalia', 'Sarcopterygii', 'Elpistostegalia', 'Tiktaalikidae', 'Tiktaalik', 'roseae'),
    rank: 'species',
  },
  first_amphibians: {
    taxonomy: T('Eukarya', 'Animalia', 'Amphibia', null, 'Ichthyostegidae', 'Ichthyostega', 'stensioei'),
    rank: 'species',
    scientificName: 'Ichthyostega stensioei',
  },
  acanthostega: {
    taxonomy: T('Eukarya', 'Animalia', 'Amphibia', null, 'Acanthostegidae', 'Acanthostega', 'gunnari'),
    rank: 'species',
  },
  goniatites: {
    taxonomy: T('Eukarya', 'Animalia', 'Mollusca', 'Goniatitida', null, null, null),
    rank: 'order',
    scientificName: 'Goniatitida (order within Ammonoidea)',
  },

  // ===== CARBONIFEROUS =====
  giant_insects: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Meganisoptera', 'Meganeuridae', 'Meganeura', 'monyi'),
    rank: 'species',
    scientificName: 'Meganeura monyi',
  },
  arthropleura: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Arthropleurida', 'Arthropleuridae', 'Arthropleura', 'armata'),
    rank: 'species',
  },
  first_reptiles: {
    taxonomy: T('Eukarya', 'Animalia', 'Reptilia', null, 'Protorothyrididae', 'Hylonomus', 'lyelli'),
    rank: 'species',
  },
  coal_forests: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', 'Lepidodendrales', null, null, null),
    rank: 'order',
    scientificName: 'Lepidodendrales (scale trees — Lepidodendron, Sigillaria)',
  },
  lepidodendron: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', 'Lepidodendrales', 'Lepidodendraceae', 'Lepidodendron', 'aculeatum'),
    rank: 'species',
  },
  eryops: {
    taxonomy: T('Eukarya', 'Animalia', 'Amphibia', 'Temnospondyli', 'Eryopidae', 'Eryops', 'megacephalus'),
    rank: 'species',
  },

  // ===== PERMIAN =====
  edaphosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Synapsida', 'Edaphosauria', 'Edaphosauridae', 'Edaphosaurus', 'pogonias'),
    rank: 'species',
  },
  dimetrodon: {
    taxonomy: T('Eukarya', 'Animalia', 'Synapsida', 'Sphenacodontia', 'Sphenacodontidae', 'Dimetrodon', 'grandis'),
    rank: 'species',
  },
  mesosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Reptilia', 'Mesosauria', 'Mesosauridae', 'Mesosaurus', 'tenuidens'),
    rank: 'species',
  },
  therapsids: {
    taxonomy: T('Eukarya', 'Animalia', 'Synapsida', 'Therapsida', null, null, null),
    rank: 'order',
    scientificName: 'Therapsida (mammal-line synapsids)',
  },
  gorgonopsid: {
    taxonomy: T('Eukarya', 'Animalia', 'Synapsida', 'Gorgonopsia', null, null, null),
    rank: 'order',
    scientificName: 'Gorgonopsia',
  },
  lystrosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Synapsida', 'Dicynodontia', 'Lystrosauridae', 'Lystrosaurus', 'murrayi'),
    rank: 'species',
  },
  glossopteris: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', 'Glossopteridales', 'Glossopteridaceae', 'Glossopteris', 'indica'),
    rank: 'species',
  },
  scutosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Reptilia', 'Procolophonomorpha', 'Pareiasauridae', 'Scutosaurus', 'karpinskii'),
    rank: 'species',
  },

  // ===== TRIASSIC =====
  first_dinosaurs: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', null, null, 'Nyasasaurus', 'parringtoni'),
    rank: 'species',
  },
  coelophysis: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Coelophysidae', 'Coelophysis', 'bauri'),
    rank: 'species',
  },
  plateosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Sauropodomorpha', 'Plateosauridae', 'Plateosaurus', 'trossingensis'),
    rank: 'species',
  },
  cynognathus: {
    taxonomy: T('Eukarya', 'Animalia', 'Synapsida', 'Cynodontia', 'Cynognathidae', 'Cynognathus', 'crateronotus'),
    rank: 'species',
  },
  first_mammals: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', null, 'Morganucodontidae', 'Morganucodon', 'watsoni'),
    rank: 'species',
    scientificName: 'Morganucodon watsoni',
  },
  pterosaur: {
    taxonomy: T('Eukarya', 'Animalia', 'Pterosauria', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Pterosauria',
  },
  ichthyosaur: {
    taxonomy: T('Eukarya', 'Animalia', 'Reptilia', 'Ichthyosauria', null, null, null),
    rank: 'order',
    scientificName: 'Ichthyosauria',
  },

  // ===== JURASSIC =====
  stegosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Stegosauria', 'Stegosauridae', 'Stegosaurus', 'stenops'),
    rank: 'species',
  },
  brachiosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Sauropodomorpha', 'Brachiosauridae', 'Brachiosaurus', 'altithorax'),
    rank: 'species',
  },
  allosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Allosauridae', 'Allosaurus', 'fragilis'),
    rank: 'species',
  },
  diplodocus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Sauropodomorpha', 'Diplodocidae', 'Diplodocus', 'carnegii'),
    rank: 'species',
  },
  archaeopteryx: {
    taxonomy: T('Eukarya', 'Animalia', 'Aves', null, 'Archaeopterygidae', 'Archaeopteryx', 'lithographica'),
    rank: 'species',
  },
  pterodactylus: {
    taxonomy: T('Eukarya', 'Animalia', 'Pterosauria', 'Pterodactyloidea', 'Pterodactylidae', 'Pterodactylus', 'antiquus'),
    rank: 'species',
  },
  plesiosaur: {
    taxonomy: T('Eukarya', 'Animalia', 'Reptilia', 'Plesiosauria', null, null, null),
    rank: 'order',
    scientificName: 'Plesiosauria',
  },
  flowering_plants: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Angiospermae (flowering plants)',
  },

  // ===== CRETACEOUS =====
  placental_mammals: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Eutheria (placental mammals)',
  },
  iguanodon: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Ornithopoda', 'Iguanodontidae', 'Iguanodon', 'bernissartensis'),
    rank: 'species',
  },
  spinosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Spinosauridae', 'Spinosaurus', 'aegyptiacus'),
    rank: 'species',
  },
  quetzalcoatlus: {
    taxonomy: T('Eukarya', 'Animalia', 'Pterosauria', 'Pterodactyloidea', 'Azhdarchidae', 'Quetzalcoatlus', 'northropi'),
    rank: 'species',
  },
  triceratops: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Ceratopsia', 'Ceratopsidae', 'Triceratops', 'horridus'),
    rank: 'species',
  },
  tyrannosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Tyrannosauridae', 'Tyrannosaurus', 'rex'),
    rank: 'species',
  },
  velociraptor: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Dromaeosauridae', 'Velociraptor', 'mongoliensis'),
    rank: 'species',
  },
  ankylosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Ankylosauria', 'Ankylosauridae', 'Ankylosaurus', 'magniventris'),
    rank: 'species',
  },
  mosasaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Reptilia', 'Squamata', 'Mosasauridae', 'Mosasaurus', 'hoffmannii'),
    rank: 'species',
  },
  parasaurolophus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Ornithopoda', 'Hadrosauridae', 'Parasaurolophus', 'walkeri'),
    rank: 'species',
  },
  magnolia: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', 'Magnoliales', 'Magnoliaceae', null, null),
    rank: 'family',
    scientificName: 'Magnoliaceae',
  },

  // ===== CENOZOIC — PALEOGENE =====
  titanoboa: {
    taxonomy: T('Eukarya', 'Animalia', 'Reptilia', 'Squamata', 'Boidae', 'Titanoboa', 'cerrejonensis'),
    rank: 'species',
  },
  first_primates: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Plesiadapidae', 'Plesiadapis', null),
    rank: 'genus',
    scientificName: 'Plesiadapis',
  },
  first_whales: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Cetacea', 'Pakicetidae', 'Pakicetus', 'inachus'),
    rank: 'species',
    scientificName: 'Pakicetus inachus',
  },
  horses: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Perissodactyla', 'Equidae', 'Eohippus', null),
    rank: 'genus',
    scientificName: 'Eohippus (Hyracotherium)',
  },
  basilosaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Cetacea', 'Basilosauridae', 'Basilosaurus', 'cetoides'),
    rank: 'species',
  },
  andrewsarchus: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Artiodactyla', 'Triisodontidae', 'Andrewsarchus', 'mongoliensis'),
    rank: 'species',
  },
  indohyus: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Artiodactyla', 'Raoellidae', 'Indohyus', 'indirae'),
    rank: 'species',
  },
  paraceratherium: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Perissodactyla', 'Paraceratheriidae', 'Paraceratherium', 'transouralicum'),
    rank: 'species',
  },
  first_monkeys: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', null, null, null),
    rank: 'order',
    scientificName: 'Catarrhini (Old World monkeys and apes)',
  },

  // ===== CENOZOIC — NEOGENE =====
  great_apes: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Proconsulidae', 'Proconsul', null),
    rank: 'genus',
    scientificName: 'Proconsul',
  },
  phorusrhacid: {
    taxonomy: T('Eukarya', 'Animalia', 'Aves', 'Cariamiformes', 'Phorusrhacidae', null, null),
    rank: 'family',
    scientificName: 'Phorusrhacidae (terror birds)',
  },
  grasslands: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', 'Poales', 'Poaceae', null, null),
    rank: 'family',
    scientificName: 'Poaceae (grasses)',
  },
  sahelanthropus: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Hominidae', 'Sahelanthropus', 'tchadensis'),
    rank: 'species',
  },
  australopithecus: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Hominidae', 'Australopithecus', 'afarensis'),
    rank: 'species',
  },
  megalodon: {
    taxonomy: T('Eukarya', 'Animalia', 'Chondrichthyes', 'Lamniformes', 'Otodontidae', 'Otodus', 'megalodon'),
    rank: 'species',
  },

  // ===== QUATERNARY =====
  homo_habilis: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Hominidae', 'Homo', 'habilis'),
    rank: 'species',
  },
  homo_erectus: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Hominidae', 'Homo', 'erectus'),
    rank: 'species',
  },
  neanderthals: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Hominidae', 'Homo', 'neanderthalensis'),
    rank: 'species',
  },
  homo_sapiens: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Hominidae', 'Homo', 'sapiens'),
    rank: 'species',
  },
  mammoth: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Proboscidea', 'Elephantidae', 'Mammuthus', 'primigenius'),
    rank: 'species',
  },
  saber_tooth: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Carnivora', 'Felidae', 'Smilodon', 'fatalis'),
    rank: 'species',
  },
  megatherium: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Pilosa', 'Megatheriidae', 'Megatherium', 'americanum'),
    rank: 'species',
  },
  glyptodon: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Cingulata', 'Chlamyphoridae', 'Glyptodon', 'clavipes'),
    rank: 'species',
  },
  diprotodon: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Diprotodontia', 'Diprotodontidae', 'Diprotodon', 'optatum'),
    rank: 'species',
  },
  megaloceros: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Artiodactyla', 'Cervidae', 'Megaloceros', 'giganteus'),
    rank: 'species',
  },
  woolly_rhino: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Perissodactyla', 'Rhinocerotidae', 'Coelodonta', 'antiquitatis'),
    rank: 'species',
  },
  dire_wolf: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Carnivora', 'Canidae', 'Aenocyon', 'dirus'),
    rank: 'species',
  },
  cave_bear: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Carnivora', 'Ursidae', 'Ursus', 'spelaeus'),
    rank: 'species',
  },
  gomphothere: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Proboscidea', 'Gomphotheriidae', null, null),
    rank: 'family',
    scientificName: 'Gomphotheriidae',
  },
  thylacoleo: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Diprotodontia', 'Thylacoleonidae', 'Thylacoleo', 'carnifex'),
    rank: 'species',
  },

  // ===== CROSS-PERIOD =====
  conodonts: {
    taxonomy: T('Eukarya', 'Animalia', 'Conodonta', null, null, null, null),
    rank: 'classOrPhylum',
    scientificName: 'Conodonta',
  },
  lingula: {
    taxonomy: T('Eukarya', 'Animalia', 'Brachiopoda', 'Lingulida', 'Lingulidae', 'Lingula', 'anatina'),
    rank: 'species',
  },
  cycads: {
    taxonomy: T('Eukarya', 'Plantae', 'Embryophyta', 'Cycadales', null, null, null),
    rank: 'order',
    scientificName: 'Cycadophyta',
  },
  ammonites: {
    taxonomy: T('Eukarya', 'Animalia', 'Mollusca', 'Ammonitida', null, null, null),
    rank: 'order',
    scientificName: 'Ammonitida',
  },

  // ---- Notable recent discoveries (added 2024+) ----

  // Proterozoic
  ourasphaira: {
    taxonomy: T('Eukarya', 'Fungi', 'Ascomycota', null, null, 'Ourasphaira', 'giraldae'),
    rank: 'species',
  },

  // Cambrian
  saccorhytus: {
    // 2022 reinterpretation places it within Ecdysozoa (stem group) rather than Deuterostomia.
    taxonomy: T('Eukarya', 'Animalia', 'Ecdysozoa', null, null, 'Saccorhytus', 'coronarius'),
    rank: 'species',
  },
  cambroraster: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Radiodonta', 'Hurdiidae', 'Cambroraster', 'falcatus'),
    rank: 'species',
  },
  stanleycaris: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Radiodonta', 'Hurdiidae', 'Stanleycaris', 'hirpex'),
    rank: 'species',
  },
  habelia: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Habeliida', 'Habeliidae', 'Habelia', 'optata'),
    rank: 'species',
  },

  // Devonian
  qikiqtania: {
    taxonomy: T('Eukarya', 'Animalia', 'Sarcopterygii', 'Elpistostegalia', null, 'Qikiqtania', 'wakei'),
    rank: 'species',
  },
  hyneria_udlezinye: {
    taxonomy: T('Eukarya', 'Animalia', 'Sarcopterygii', 'Tristichopteridae', null, 'Hyneria', 'udlezinye'),
    rank: 'species',
  },

  // Carboniferous
  arthropleura_giant: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Arthropleurida', 'Arthropleuridae', 'Arthropleura', 'armata'),
    rank: 'species',
  },

  // Triassic
  cymbospondylus: {
    taxonomy: T('Eukarya', 'Animalia', 'Reptilia', 'Ichthyosauria', 'Cymbospondylidae', 'Cymbospondylus', 'youngorum'),
    rank: 'species',
  },
  issi_saaneq: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Sauropodomorpha', 'Plateosauridae', 'Issi', 'saaneq'),
    rank: 'species',
  },

  // Jurassic
  ledumahadi: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Sauropodomorpha', null, 'Ledumahadi', 'mafube'),
    rank: 'species',
  },
  maiopatagium: {
    taxonomy: T('Eukarya', 'Animalia', 'Synapsida', 'Haramiyida', 'Eleutherodontidae', 'Maiopatagium', 'furculiferum'),
    rank: 'species',
  },
  yi_qi: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Scansoriopterygidae', 'Yi', 'qi'),
    rank: 'species',
  },
  anchiornis: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Anchiornithidae', 'Anchiornis', 'huxleyi'),
    rank: 'species',
  },
  tianyulong: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Ornithischia', 'Heterodontosauridae', 'Tianyulong', 'confuciusi'),
    rank: 'species',
  },

  // Cretaceous
  yutyrannus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Proceratosauridae', 'Yutyrannus', 'huali'),
    rank: 'species',
  },
  wulong: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Dromaeosauridae', 'Wulong', 'bohaiensis'),
    rank: 'species',
  },
  borealopelta: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Ankylosauria', 'Nodosauridae', 'Borealopelta', 'markmitchelli'),
    rank: 'species',
  },
  cretophasmomima: {
    taxonomy: T('Eukarya', 'Animalia', 'Arthropoda', 'Phasmatodea', 'Susumaniidae', 'Cretophasmomima', 'melanogramma'),
    rank: 'species',
  },
  patagotitan: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Sauropoda', 'Lognkosauria', 'Patagotitan', 'mayorum'),
    rank: 'species',
  },
  xiyunykus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Alvarezsauridae', 'Xiyunykus', 'pengi'),
    rank: 'species',
  },
  halszkaraptor: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Dromaeosauridae', 'Halszkaraptor', 'escuilliei'),
    rank: 'species',
  },
  mansourasaurus: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Sauropoda', 'Titanosauria', 'Mansourasaurus', 'shahinae'),
    rank: 'species',
  },
  vintana: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Gondwanatheria', 'Sudamericidae', 'Vintana', 'sertichi'),
    rank: 'species',
  },
  adalatherium: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Gondwanatheria', null, 'Adalatherium', 'hui'),
    rank: 'species',
  },
  natovenator: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Dromaeosauridae', 'Natovenator', 'polydontus'),
    rank: 'species',
  },
  dakotaraptor: {
    taxonomy: T('Eukarya', 'Animalia', 'Dinosauria', 'Theropoda', 'Dromaeosauridae', 'Dakotaraptor', 'steini'),
    rank: 'species',
  },

  // Earliest Paleogene
  asteriornis: {
    taxonomy: T('Eukarya', 'Animalia', 'Aves', 'Galloanserae', null, 'Asteriornis', 'maastrichtensis'),
    rank: 'species',
  },

  // Paleocene/Eocene
  kumimanu: {
    taxonomy: T('Eukarya', 'Animalia', 'Aves', 'Sphenisciformes', 'Spheniscidae', 'Kumimanu', 'fordycei'),
    rank: 'species',
  },
  phiomicetus: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Cetacea', 'Protocetidae', 'Phiomicetus', 'anubis'),
    rank: 'species',
  },
  peregocetus: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Cetacea', 'Protocetidae', 'Peregocetus', 'pacificus'),
    rank: 'species',
  },
  inkayacu: {
    taxonomy: T('Eukarya', 'Animalia', 'Aves', 'Sphenisciformes', 'Spheniscidae', 'Inkayacu', 'paracasensis'),
    rank: 'species',
  },

  // Pleistocene Hominins
  denisovans: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Hominidae', 'Homo', null),
    rank: 'genus',
    scientificName: 'Homo sp. Denisova',
  },
  homo_naledi: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Hominidae', 'Homo', 'naledi'),
    rank: 'species',
  },
  homo_longi: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Hominidae', 'Homo', 'longi'),
    rank: 'species',
  },
  homo_luzonensis: {
    taxonomy: T('Eukarya', 'Animalia', 'Mammalia', 'Primates', 'Hominidae', 'Homo', 'luzonensis'),
    rank: 'species',
  },
};
