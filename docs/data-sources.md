# Data sources

These are the notes behind the numbers. For every data file they say what it holds, where its values come from, and which parts are measured, which are reconstructed and which are storytelling choices. The in-app Help dialog ("About the data") links here.

Life's Tree Blooms squeezes 4.54 billion years into about six minutes. Doing that honestly means keeping three kinds of numbers apart:

- **Recorded:** ages of rocks and fossils, the boundaries of the geological time scale, and values read off published reconstructions. They come from the literature cited below, rounded.
- **Reconstructed:** smoothed curves and positions that the evidence supports only approximately. This covers temperatures before any thermometer, oxygen before any trapped air, and where a continent lay 400 million years ago. The shape comes from the sources; the exact line is ours.
- **Editorial:** choices made to tell the story. These include how fast time runs, how prominent each organism is, how long an extinction holds the screen and what color the planet is.

`node scripts/validate-data.mjs` checks that the files agree with each other and with their contracts. It cannot check that they are true; that is what the sources on this page are for. The format of every field is in [data-schema.md](data-schema.md).

## At a glance

| Data set | File | What it holds | Kind |
|---|---|---|---|
| Geological time scale | [`timeline.js`](../js/data/timeline.js) | 28 named intervals, 6 title-card eons and eras, period text, pacing weights | Recorded boundaries and colors; editorial pacing |
| Species | [`species.js`](../js/data/species.js) + [`species/*.js`](../js/data/species/) | 206 entries, each a species, a genus or a whole group | Recorded dates and sites; editorial prominence |
| Tree of life | [`phylogeny.js`](../js/data/phylogeny.js) | 174 clades with branching dates | Reconstructed from molecular clocks and fossils |
| Mass extinctions and crises | [`extinctions.js`](../js/data/extinctions.js) | The Big Five and 14 second-tier crises | Recorded dates; estimated tolls; editorial staging |
| Milestones | [`milestones.js`](../js/data/milestones.js) | 58 narrated moments | Summaries of the literature |
| Chapters | [`chapters.js`](../js/data/chapters.js) | 18 chapters of the story | Editorial |
| Air and climate | [`atmosphere.js`](../js/data/atmosphere.js) | Temperature, oxygen, carbon dioxide | Reconstructed and smoothed |
| Planet state | [`planet.js`](../js/data/planet.js) | Magma, oceans, plant cover, day length, the Sun, sea level, climate state | Mixed (see that section) |
| Ice | [`glaciation.js`](../js/data/glaciation.js) | Nine glacial intervals | Recorded timing; schematic extent |
| Tectonic activity | [`seismicActivity.js`](../js/data/seismicActivity.js) | A 0–1 index | Editorial |
| Species count | [`biodiversity.js`](../js/data/biodiversity.js) | Estimated living species | Illustrative |
| Continents | [`continents.js`](../js/data/continents.js) | Real coastlines on 31 rigid plates and blocks back to 540 Ma; schematic outlines at 11 older slices; no land before 4.4 Ga | Natural Earth plus published reconstructions |
| Plate boundaries | [`plateBoundaries.js`](../js/data/plateBoundaries.js) | 75 ridges, trenches, collision belts and transform faults that ride the plates, back to 3.2 Ga | PB2002 today; schematic history |
| Place names and events | [`paleogeography.js`](../js/data/paleogeography.js) | 27 ocean and 18 land names, 90 events (eruptions, impacts, mountain building, gateways), 21 migration routes | Recorded ages and sites; editorial placement |

## The geological time scale: `timeline.js`

**Boundaries.** These come from the ICS International Chronostratigraphic Chart v2026/06 (stratigraphy.org): Cohen, Harper, Gibbard & Car (2025), Episodes 48: 105–115. At the level of the app's rows it is identical to v2024/12. That revision moved the bases of the Ordovician (486.85 Ma), Silurian (443.1), Devonian (419.62), Carboniferous (358.86), Cretaceous (143.1) and Miocene (23.04). The base of the Triassic, 251.902 ± 0.024 Ma on the chart, is stored as 251.9. The chart itself marks 720 and 635 Ma as approximate.

**One departure.** The first row starts at 4540 Ma, the age of the Earth and the start of the story (`TIMING.startTimeMa` in [`config.js`](../js/config.js)). The ICS puts the base of the Hadean at 4567 Ma, the age of the oldest solids in the Solar System.

**Rows.** The rows mix ranks so that each depth of time gets the unit that tells its story best:

- the Hadean Eon;
- the four Archean eras;
- the Paleo- and Mesoproterozoic eras, then the three periods of the Neoproterozoic;
- the Paleozoic and Mesozoic periods;
- the Cenozoic epochs, with the Pleistocene split into its three sub-epochs (the Middle Pleistocene is the Chibanian).

**Colors.** Each row uses the CGMW (Commission for the Geological Map of the World) color code of its unit on the ICS chart, as RGB. The codes were taken from the chart's machine-readable data (`schema:color`, version 2026-06) and from the CGMW RGB sheet of the Geologic TimeScale Foundation, then cross-checked against the chart PDFs. The three Pleistocene sub-epochs have no code of their own, so they take the codes of their stages: Gelasian, Chibanian and Upper Pleistocene. The Oligocene follows the CGMW sheet (`#fdc07a`; the chart data has `#FEC07A`). The Holocene uses the current code (`#feebd2`).

**Text.** The one-line `description`, the `context` lines (life, climate, geography) and the era `tagline`s summarize mainstream literature for a general audience. Dates in them are rounded, and words such as "~", "by" and "probably" mark what is uncertain. The references the text follows:

- Hadean: Wilde et al. (2001) and Mojzsis et al. (2001) for the Jack Hills zircons; Valley et al. (2002); Bell et al. (2015) for carbon in a 4.1-billion-year-old zircon; Zahnle et al. (2007) for the post-impact atmosphere.
- Archean: Bowring & Williams (1999) for the Acasta gneiss; Rosing (1999) and Ohtomo et al. (2014) for the Isua graphite; Gough (1981) for the faint young Sun; Van Kranendonk et al. (2008) for the Dresser Formation; Allwood et al. (2006) for Strelley Pool; Cheney (1996) for Vaalbara; Young et al. (1998) for the Pongola glaciation; Crowe et al. (2013) and Planavsky et al. (2014) for early oxygen; Shirey & Richardson (2011) and Dhuime et al. (2012) for subduction from ~3 Ga; Anbar et al. (2007); Zerkle et al. (2012); Izon et al. (2017); Condie (1998); Bleeker (2003).
- Proterozoic: Lyons et al. (2014); Gumsley et al. (2017); Evans et al. (1997) for low-latitude ice; Kopp et al. (2005); Javaux & Lepot (2018) and Miao et al. (2019, 2024) for the earliest eukaryote fossils; Zhao et al. (2002) for Columbia; Butterfield (2000) and Gibson et al. (2018) for Bangiomorpha; Brocks et al. (2017); Li et al. (2008) for Rodinia; Porter & Knoll (2000); Loron et al. (2019); dos Reis et al. (2015); Hoffman et al. (1998, 2017); Rooney et al. (2015); Love et al. (2009); Matthews et al. (2021); Bobrovskiy et al. (2018); Pu et al. (2016).
- Paleozoic: Erwin et al. (2011); Torsvik & Cocks (2017) for paleogeography throughout; Droser & Finnegan (2003); Rubinstein et al. (2010); Haq & Schutter (2008); Zhu et al. (2022); Brookfield, Catlos & Suarez (2021) for Kampecaris; Stein et al. (2007, 2020) for the Gilboa and Cairo forests; Algeo & Scheckler (1998); Berner (2006); Montañez & Poulsen (2013); Domeier & Torsvik (2014).
- Mesozoic: Sun et al. (2012) for the Early Triassic heat; Chen & Benton (2012); Scotese et al. (2021); Lloyd et al. (2008).
- Cenozoic: Lyson et al. (2019); Carvalho et al. (2021); McInerney & Wing (2011) for the PETM; Westerhold et al. (2020); CenCO2PIP Consortium (2023); Strömberg (2011); Stevens et al. (2013); Brunet et al. (2002); Harmand et al. (2015); O'Dea et al. (2016); IPCC AR6 WG1 (2021) for the mid-Pliocene.
- Quaternary: Lisiecki & Raymo (2005); Hublin et al. (2017); Higham et al. (2014); Tierney et al. (2020) for the Last Glacial Maximum; Lambeck et al. (2014) for sea level; Walker et al. (2009) for the base of the Holocene; NOAA Global Monitoring Laboratory for CO₂ above 420 ppm.

The author of the text recalled most of these from the literature rather than re-reading them for this revision. A handful of facts were checked against secondary summaries: Bangiomorpha's age, the Sturtian dates, Kampecaris and the Last Glacial Maximum. The time-scale boundaries and colors were checked against the primary ICS files.

**Pacing (editorial).** `temporalWeight` sets how long each row stays on screen, and it is pure storytelling. Each weight comes from a target number of seconds at 1× (`weight = seconds × 15 / duration in Myr`). The whole story plays in 5 min 52 s at 1×. Each mass extinction adds a 6-second hold and a slow crawl through the event, so an uninterrupted 1× run takes about 6 min 28 s (simulated with the app's own clock). The warp is strong:

- The Precambrian, 88% of Earth's history, gets a third of the screen time (117 s).
- The last 66 million years, 1.5% of the history, get a quarter (89 s).
- The last 129,000 years get 23 s, more than the whole Cambrian (20 s).

The row-by-row table is in [data-schema.md](data-schema.md#timeline-rows-and-eras).

## Species: `species.js` and `species/*.js`

There are 206 entries in four files, split by first appearance:

| File | Entries |
|---|---|
| [`precambrian.js`](../js/data/species/precambrian.js) | 25 |
| [`paleozoic.js`](../js/data/species/paleozoic.js) | 71 |
| [`mesozoic.js`](../js/data/species/mesozoic.js) | 52 |
| [`cenozoic.js`](../js/data/species/cenozoic.js) | 58 |

An entry may be a single species, a genus or a whole group. 76 of them are still alive today.

**Recorded: dates.**

- `appearanceMa` and `extinctMa` are first and last appearances in the fossil record, not molecular-clock estimates. A group starts at its oldest accepted fossil.
- Precambrian entries start at the oldest physical evidence they rest on, whether a body fossil, a trace fossil or a chemical fossil. Contested evidence is flagged in the entry's text.
- Animals known from a single fossil bed are shown for a few million years from the age of that bed, so that they stay on screen long enough to see. For Chengjiang that age is ~518 Ma (Yang et al. 2018, J. Geol. Soc. 175: 659); for the Burgess Shale it is ~508 Ma.

**Recorded: pinned victims.** Victims of the Big Five end exactly at the event's date: 444.2, 372, 251.9, 201.4 or 66 Ma. Casualties of the Hangenberg crisis end at 358.86 Ma. This is a convention, so that the map, the Life panel and the extinction card agree; real last appearances scatter around those dates. A few victims are pinned upper bounds rather than proven casualties, for example Coelophysis at 201.4 Ma and Quetzalcoatlus at 66 Ma.

**Recorded: recent extinctions.**

- Historical extinctions are counted back from 2026, so the thylacine (died 1936) ends at 0.00009 Ma.
- Late Pleistocene megafauna end at their own best-dated last appearance. The base of the Holocene (11,700 years ago) is used only where no sharper date exists.

**Recorded: places.**

- `location` is the modern position of the fossil locality named in `fossilSite`, usually the type locality or the best-known site. The app carries it back in time on its tectonic plate (see "Fossil-site positions" below).
- Coordinates are good to about 0.5°. The authors flagged a few as approximate.
- Some sites are shared: eight Burgess Shale animals, two fossils from the Ediacara Hills and two from the Maastricht Formation.
- Three historical extinctions have no single fossil site: the thylacine, the passenger pigeon and the aurochs. Their markers sit where the last known animal died.

**Recorded: text.** `size`, `diet`, `description` and `descriptionLong` summarize the references listed for each entry below.

**Editorial: `abundanceProfile`.** This is a hand-drawn prominence curve from 0 to 1 for each entry. It is not a census of individuals or species. It does three jobs in the app:

- It ranks the "Dominant life" list and fills the life-group share bar in the Life panel.
- It sets the size of each marker on the Map, the Globe and the Tree.
- It is drawn in the species dialog as "Prominence over time", with the peak it implies.

Each profile rises after the entry's origin, dips at the extinctions that hit the group, and ends near 0.01 when the entry dies out.

**About the references.** They are listed as the data authors recorded them. Some were checked against the papers during the 2026 revision. Some come from the independent science audit of the earlier catalogue. A few were cited from the authors' knowledge without being re-read. A handful of small facts, such as a size or the range of a genus, rest on general references like Wikipedia; those are named where they are used. Corrections are welcome.

<details>
<summary><strong>Precambrian</strong>: <code>species/precambrian.js</code>, 25 entries</summary>

- **Prokaryotes** (`prokaryotes`, 3.7 Ga → present): isotopically light graphite at Isua, Greenland, from Rosing (1999), Science 283: 674, and Ohtomo et al. (2014), Nat. Geosci. 7: 25. Their dominance "by numbers, diversity and chemistry" follows Bar-On, Phillips & Milo (2018), PNAS 115: 6506.
- **Stromatolites** (`stromatolites`, 3.48 Ga → present): the oldest widely accepted examples are in the Dresser Formation, Pilbara. Sources: Walter, Buick & Dunlop (1980); Allwood et al. (2006), Nature 441: 714; Bosak, Knoll & Petroff (2013). The peak and later decline follow Awramik & Sprinkle (1999) and Riding (2006). The marker sits at the living stromatolites of Hamelin Pool, Shark Bay.
- **Methanogens** (`methanogens`, 3.46 Ga → present): methane in Dresser Formation fluid inclusions, from Ueno et al. (2006), Nature 440: 516. Its biological origin is disputed by Sherwood Lollar & McCollom (2006), Nature 444: E18. The faint young Sun follows Gough (1981).
- **Sulfur microbes** (`sulfur_microbes`, 3.43 Ga → present): Strelley Pool microfossils, from Wacey et al. (2011), Nat. Geosci. 4: 698. The Apex chert debate follows Schopf (1993) and Brasier et al. (2002). Later sulfur-bacteria biomarkers are from Brocks et al. (2005).
- **Cyanobacteria** (`cyanobacteria`, 2.7 Ga → present): Tumbiana Formation stromatolites. Sources: Buick (1992), Science 255: 74; Flannery & Walter (2012); Lepot et al. (2008), Nat. Geosci. 1: 118. The 1.75-Ga thylakoids are from Demoulin et al. (2024), Nature 625: 529.
- **Francevillian biota** (`gabonionta`, 2.1 Ga → 2 Ga): El Albani et al. (2010), Nature 466: 100; El Albani et al. (2014), PLoS ONE 9: e99438. The end date is editorial; the fossils come from one interval.
- **Eukaryotes (complex cells)** (`eukaryotes`, 1.87 Ga → present): Grypania from the Negaunee Iron Formation, described by Han & Runnegar (1992) and re-dated by Schneider et al. (2002), Can. J. Earth Sci. 39: 999. Reviews: Javaux & Lepot (2018), Earth-Sci. Rev. 176: 68; Miao et al. (2019), Precambrian Res. 321: 172.
- **Acritarchs** (`acritarchs`, 1.65 Ga → present): Roper Group, from Javaux, Knoll & Walter (2001), Nature 412: 66, and Miao et al. (2019).
- **Gaoyuzhuang fronds** (`gaoyuzhuang_fronds`, 1.56 Ga → 1.5 Ga): Zhu et al. (2016), Nat. Commun. 7: 11500. The end date is editorial.
- **Red algae** (`red_algae`, 1.05 Ga → present): Bangiomorpha, from Butterfield (2000), Paleobiology 26: 386. Its age is from Gibson et al. (2018), Geology 46: 135.
- **Green algae** (`green_algae`, 1 Ga → present): Proterocladus, from Tang et al. (2020), Nat. Ecol. Evol. 4: 543. The Cryogenian rise of algae in the profile follows Brocks et al. (2017), Nature 548: 578.
- **Fungi** (`fungi_divergence`, 1 Ga → present): Ourasphaira, from Loron et al. (2019), Nature 570: 232.
- **Testate amoebae** (`testate_amoebae`, 750 Ma → present): Chuar Group vase-shaped microfossils. Sources: Porter & Knoll (2000), Paleobiology 26: 360; Porter, Meisterfeld & Knoll (2003); Porter (2016), Proc. R. Soc. B 283: 20160221. The age is from Rooney et al. (2018), GSA Bull. 130: 1085.
- **Sponges** (`first_sponges`, 650 Ma → present): sponge biomarkers in the Huqf Supergroup, Oman, from Love et al. (2009), Nature 457: 718, and Zumberge et al. (2018), Nat. Ecol. Evol. 2: 1709. Arguments against them: Nettersheim et al. (2019); Bobrovskiy et al. (2021), Nat. Ecol. Evol. 5: 165. Comb jellies as the first branch of animals: Schultz et al. (2023).
- **Doushantuo embryo-like fossils** (`doushantuo_embryos`, 632 Ma → 580 Ma): Weng'an phosphorite. Sources: Yin et al. (2007), Nature 446: 661; Xiao et al. (2014), Natl Sci. Rev. 1: 498; Cunningham et al. (2017), J. Geol. Soc. 174: 793. The age (at least 609 Ma) is from Zhou et al. (2017).
- **Ediacaran biota** (`ediacaran_biota`, 574 Ma → 539 Ma): Mistaken Point, from Matthews et al. (2021), GSA Bull. 133: 612, and Pu et al. (2016), Geology 44: 955.
- **Charnia** (`charnia`, 570 Ma → 550 Ma): Ford (1958). The age of Charnwood Forest is from Noble et al. (2015), GSA Bull. 127: 250.
- **Fractofusus** (`fractofusus`, 570 Ma → 560 Ma): Gehling & Narbonne (2007), Can. J. Earth Sci. 44: 367. Its reproduction is from Mitchell et al. (2015), Nature 524: 343.
- **Cnidarians** (`cnidarians`, 560 Ma → present): Haootia, from Liu et al. (2014), Proc. R. Soc. B 281: 20141202, and Auroralumina, from Dunn et al. (2022), Nat. Ecol. Evol. 6: 1095. Both are debated fossils.
- **Ikaria** (`ikaria`, 560 Ma → 550 Ma): Evans et al. (2020), PNAS 117: 7845.
- **Dickinsonia** (`dickinsonia_sp`, 560 Ma → 545 Ma): Sprigg (1947). Animal cholesterol in White Sea specimens is from Bobrovskiy et al. (2018), Science 361: 1246. Ages: Wang et al. (2021), Palaeoworld 30: 602; Ovtcharova et al. (2023, conference abstract).
- **Tribrachidium** (`tribrachidium`, 558 Ma → 550 Ma): Glaessner & Daily (1959); Rahman et al. (2015), Sci. Adv. 1: e1500800.
- **Kimberella** (`kimberella`, 558 Ma → 550 Ma): Fedonkin & Waggoner (1997); Martin et al. (2000), Science 288: 841; Grazhdankin (2004); Gehling, Runnegar & Droser (2014).
- **Spriggina** (`spriggina`, 555 Ma → 550 Ma): Glaessner (1958).
- **Cloudina** (`cloudina`, 550 Ma → 539 Ma): Germs (1972); Bengtson & Zhao (1992); Hua, Pratt & Zhang (2003). Whether it built reefs is argued between Penny et al. (2014) and Mehra & Maloof (2018).

The coordinates of Strelley Pool, Lyamtsa, Back Cove, Qianxi, the South Oman Salt Basin and the Chuar Group are approximate, to about 0.5°.

</details>

<details>
<summary><strong>Paleozoic</strong>: <code>species/paleozoic.js</code>, 71 entries</summary>

Where no reference is named, the entry rests on the independent science audit of the earlier catalogue.

- **Archaeocyaths** (`archaeocyatha`, 525 Ma → 510 Ma): the reefs of the Flinders Ranges (Ajax Mine, Wilkawillina). Archaeocyaths as calcified sponges follows Rowland (2001) and Debrenne, Zhuravlev & Kruse. They declined in the Sinsk and end-Botomian crisis.
- **Trilobites** (`trilobite`, 521 Ma → 252 Ma): from Profallotaspis (~521 Ma) to the end-Permian, with about 22,000 described species. The marker is at Alnif, Anti-Atlas, Morocco.
- **Brachiopods** (`brachiopods`, 520 Ma → present): rhynchonelliforms from Cambrian Stage 2–3, with about 12,000 fossil and ~400 living species. The marker is in the Cincinnatian Series of Ohio. The end-Permian collapse and the takeover by bivalves follow Gould & Calloway (1980).
- **Bivalves** (`bivalves`, 520 Ma → present): Fordilla and Pojetaia, from Jell (1980) and Runnegar & Bentley (1983), in the Parara Limestone, Yorke Peninsula. The Fordilloidea's 520–513 Ma range is from Wikipedia. About 9,000 living species.
- **Lingulid brachiopods** (`lingula`, 520 Ma → present): Chengjiang, from Emig (2003) and Luo et al. (2015), Nat. Commun. 6: 8301.
- **Myllokunmingia** (`myllokunmingia`, 518 Ma → 515 Ma): Shu et al. (1999), Nature; Chengjiang.
- **Hallucigenia** (`hallucigenia`, 518 Ma → 505 Ma): H. sparsa from the Burgess Shale, by Smith & Caron (2015), Nature 523: 75. The ~505 Ma end is from Caron, Smith & Harvey (2013). H. fortis from Chengjiang is from Hou & Bergström (1995).
- **Anomalocaris** (`anomalocaris`, 518 Ma → 499 Ma): the youngest material (~499 Ma, Weeks Formation) is from Lerosey-Aubril et al. (2014). The 34–38 cm body length is from Lerosey-Aubril & Pates (2018), Nat. Commun. 9: 3774. The history of its discovery follows Whiteaves (1892) and Whittington & Briggs (1985).
- **Crustaceans** (`crustaceans`, 515 Ma → present): Yicaris, from Zhang, Siveter, Waloszek & Maas (2007), Nature 449: 595. The marker is on the late Cambrian "Orsten" nodules of Kinnekulle, Sweden.
- **Agnostids** (`agnostids`, 515 Ma → 444 Ma): Wheeler Shale, Utah. Agnostid species define the bases of the Drumian, Guzhangian, Paibian and Jiangshanian stages. They died out at the end of the Ordovician.
- **Wiwaxia** (`wiwaxia`, 514 Ma → 503 Ma): W. corrugata from the Burgess Shale. W. foliosa from Xiaoshiba is from Yang et al. (2014), and the Chengjiang sclerites from Zhao et al. (2015), Geol. Mag. The youngest record is from Fatka, Kraft & Szabad (2011). The unmineralized sclerites follow Butterfield (1990) and Smith (2014).
- **Marrella** (`marrella`, 510 Ma → 500 Ma): Walcott (1912). More than 25,000 specimens are known, and it was the first Burgess fossil collected, in 1909 (from Wikipedia).
- **Aysheaia** (`aysheaia`, 508 Ma → 500 Ma): Walcott (1911); Whittington (1978).
- **Ottoia** (`ottoia`, 508 Ma → 500 Ma): gut contents and cannibalism from Conway Morris (1977). The Spence Shale and Marjum Formation records are from Conway Morris & Robison (1986) and the University of Kansas "Cambrian Life" pages.
- **Opabinia** (`opabinia`, 508 Ma → 500 Ma): Whittington (1975). The 1972 meeting where the audience laughed is from Gould (1989).
- **Pikaia** (`pikaia`, 508 Ma → 500 Ma): Conway Morris & Caron (2012); Mussini et al. (2024), Curr. Biol. 34: 2980.
- **Conodonts** (`conodonts`, 505 Ma → 201 Ma): soft-bodied fossils from the Granton Shrimp Bed, from Briggs, Clarkson & Aldridge (1983). Also Dong & Zhang (2017) and Murdock et al. (2013).
- **Spiny trilobites** (`odontopleurids`, 497 Ma → 372 Ma): the Late Cambrian to Frasnian range is from Bruton (1983) and Feist & McNamara (2007). The loss of three of five trilobite orders at the Kellwasser crisis is from Feist (1991), Hist. Biol. Dicranurus from the Haragan Formation is from Wikipedia.
- **Snails and slugs** (`gastropods`, 495 Ma → present): a late Cambrian origin. The marker is at the Chazy Reef (Maclurites). The oldest land snails are Dawson's Dendropupa from Joggins. 65,000–80,000 living species.
- **Nautiloids** (`nautiloid`, 492 Ma → present): Plectronoceras, Fengshan Formation, ~492 Ma. The stem cephalopod Eoceras (~520 Ma) is from Song et al. (2026), Nature, doi:10.1038/s41586-026-10868-y. The marker is on the Orthoceratite Limestone, Öland.
- **Graptolites** (`graptolites`, 485 Ma → 407 Ma): Graptoloidea from the Tremadocian to the lower Emsian, following the Treatise on Invertebrate Paleontology. Rhabdopleura as a living graptolite is from Mitchell et al. (2013), Lethaia 46: 34. The marker is at Abereiddi Bay.
- **Crinoids** (`crinoids`, 485 Ma → present): Early Ordovician origin; the Crawfordsville beds. About 600 living species, all descended from end-Permian survivors.
- **Tabulate corals** (`tabulate_corals`, 485 Ma → 252 Ma): Fossil Hill Formation, Manitoulin Island. Their reefs collapsed at the Kellwasser crisis.
- **Endoceras** (`cameroceras`, 470 Ma → 444 Ma): E. giganteum, Trenton Group. A 3-m shell reconstructed at 5.73 m is from Klug et al. (2015), Lethaia 48: 267.
- **Mosses and liverworts** (`land_plants_early`, 470 Ma → present): cryptospores from the Zanjón Formation, Argentina, from Rubinstein et al. (2010), New Phytol. 188: 365. About 20,000 living bryophytes.
- **Sea scorpions** (`sea_scorpion`, 467 Ma → 252 Ma): Pentecopterus, from Lamsdell et al. (2015). Jaekelopterus at 2.3–2.6 m is from Braddy, Poschmann & Tetlie (2008).
- **Isotelus** (`isotelus`, 465 Ma → 444 Ma): the 72-cm I. rex is from Rudkin et al. (2003), J. Paleontol.
- **Horn corals** (`rugose_corals`, 460 Ma → 252 Ma): Middle–Late Ordovician to the end-Permian. The marker is on the Petoskey Hexagonaria. About 400 days a year in the Devonian is from Wells (1963), Nature 197: 948.
- **Astraspis** (`astraspis`, 455 Ma → 444 Ma): Walcott (1892), Harding Sandstone. Older vertebrate hard tissue: Anatolepis, from Smith, Sansom & Repetski (1996), and Arandaspis.
- **Horseshoe crabs** (`horseshoe_crabs`, 454 Ma → present): Lunataspis borealis (2022, Gull River Formation, ~454 Ma) and L. aurora, from Rudkin, Young & Nowlan (2008), Palaeontology 51: 1; Wikipedia. Four living species.
- **Spiny sharks** (`jawed_fish`, 439 Ma → 252 Ma): Fanjingshania and Qianodus, from Andreev et al. (2022), Nature 609: 964 and 969. Acanthodians as stem cartilaginous fishes follow Zhu et al. (2013) and Brazeau & Friedman (2015).
- **Placoderms** (`placoderms`, 436 Ma → 359 Ma): Xiushanosteus, from Zhu et al. (2022), Nature 609: 954. Gogo's Materpiscis with an embryo is from Long et al. (2008), Nature. Their extinction at the Hangenberg event is from Sallan & Coates (2010), PNAS.
- **Arachnids** (`arachnids`, 435 Ma → present): Dolichophonus, from Laurie (1899). It is the oldest scorpion since Parioscorpio was reinterpreted (Anderson et al. 2021, Palaeontology; Wikipedia). Palaeotarbus (~420 Ma) is from Dunlop (1996).
- **Osteostracans** (`osteostracans`, 433 Ma → 372 Ma): Tremataspis (Saaremaa) and Cephalaspis (Old Red Sandstone). Last known in the Frasnian.
- **Cooksonia** (`cooksonia`, 433 Ma → 393 Ma): Lang (1937), Perton Lane. The Wenlock Cooksonia from Ireland is from Edwards & Feehan (1980), Nature, and its water-conducting cells from Edwards et al. (1992), Nature.
- **Vascular plants** (`vascular_plants`, 433 Ma → present): the Baragwanathia flora of Yea, Victoria. About 390,000 species (Kew).
- **Millipedes and centipedes** (`land_arthropods`, 425 Ma → present): Kampecaris, from Brookfield, Catlos & Suarez (2021). Pneumodesmus was re-dated to ~414 Ma by Suarez et al. (2017).
- **Prototaxites** (`prototaxites`, 420 Ma → 370 Ma): Dawson (1859). The fungal reading follows Hueber (2001) and Boyce et al. (2007), Geology. The extinct-lineage reading is from Loron et al. (2026), Sci. Adv., doi:10.1126/sciadv.aec6277.
- **Ray-finned fish** (`ray_finned_fish`, 415 Ma → present): Meemannia, from Lu et al. (2016), Curr. Biol. The marker is on Cheirolepis from Achanarras Quarry. Their takeover after the Hangenberg event follows Sallan & Coates (2010).
- **Lungfish** (`lungfish`, 415 Ma → present): Diabolepis. Lungfish as the sister group of tetrapods is from Meyer et al. (2021), Nature 590: 284.
- **Lichens** (`lichens`, 415 Ma → present): Honegger, Edwards & Axe (2013), New Phytol. 197: 264; Yuan, Xiao & Taylor (2005); Nelsen et al. (2020).
- **Sharks and kin** (`sharks`, 410 Ma → present): Doliodus, from Miller, Cloutier & Turner (2003). Also Bear Gulch (~324 Ma) and Leonodus teeth (~415 Ma).
- **Coelacanths** (`coelacanth`, 410 Ma → present): Euporosteus, from Zhu et al. (2012), Nat. Commun. Latimeria was caught off East London on 22 December 1938.
- **Insects** (`insects_first`, 407 Ma → present): Rhyniella, Rhynie chert. Rhyniognatha was reinterpreted as a myriapod by Haug & Haug (2017), PeerJ 5: e3402. Wings appear by ~325 Ma (Delitzschala). Insects' share of biomass is from Bar-On et al. (2018).
- **Cladoxylopsid trees** (`first_forests`, 390 Ma → 350 Ma): the Hangman Sandstone (~390 Ma), from Davies, McMahon & Berry (2024). Gilboa and Cairo (~385 Ma) are from Stein et al. (2007, 2012, 2020).
- **Goniatites** (`goniatites`, 390 Ma → 252 Ma): the Kellwasser and Hangenberg bottlenecks. Ceratites descend from prolecanitids, following Shigeta et al. (2001) and Korn et al. (2003), Palaeontology 46: 1123.
- **Archaeopteris** (`archaeopteris`, 385 Ma → 359 Ma): A. hibernica, Kiltorcan. "The first modern tree" follows Meyer-Berthaud et al. (1999).
- **Eusthenopteron** (`eusthenopteron`, 385 Ma → 372 Ma): Miguasha. More than 2,000 specimens and lengths over 1.5 m are from Wikipedia.
- **Dunkleosteus** (`dunkleosteus`, 382 Ma → 359 Ma): Cleveland Shale. The 3.4–4.1 m length is from Engelman (2023), Diversity 15: 318, and the bite from Anderson & Westneat (2007), Biol. Lett.
- **Tiktaalik** (`tiktaalik`, 375 Ma → 372 Ma): Daeschler, Shubin & Jenkins (2006), Nature. The Zachełmie trackways are from Niedźwiedzki et al. (2010).
- **Amphibians** (`first_amphibians`, 365 Ma → present): Ichthyostega, from Coates & Clack (1990), Blom, Clack & Ahlberg (2005) and Pierce, Clack & Hutchinson (2012). About 8,700 living amphibians (AmphibiaWeb).
- **Acanthostega** (`acanthostega`, 365 Ma → 359 Ma): Coates & Clack (1990, 1991); Clack (2012).
- **Horsetails** (`horsetails`, 365 Ma → present): the Chemnitz Petrified Forest (291 ± 2 Ma), from Rößler et al. (2012). About 18 living Equisetum species.
- **Ferns** (`ferns`, 360 Ma → present): fern-like plants in the Late Devonian and true ferns by the Tournaisian (a review in Proc. R. Soc. Edinb. B). About 10,500 living species, per the Pteridophyte Phylogeny Group (PPG I, 2016). The K–Pg fern spike is from Tschudy et al. (1984) and Vajda et al. (2001).
- **Lepidodendron** (`lepidodendron`, 358 Ma → 252 Ma): up to 50 m tall (Wikipedia). A lifespan of 10–15 years is from Phillips & DiMichele (1992); later work argues for centuries. Coal formation follows Nelsen, DiMichele, Peters & Boyce (2016), PNAS 113: 2442. Permian survivors in Cathaysia are from Wang & Chen (2001).
- **Arthropleura** (`arthropleura`, 345 Ma → 290 Ma): the 2.6-m specimen from Howick Bay, from Davies et al. (2021), J. Geol. Soc. The head with stalked eyes is from Lhéritier et al. (2024), Sci. Adv.
- **Giant griffinflies** (`giant_insects`, 325 Ma → 283 Ma): Meganeura, from Brongniart (1884), Commentry. Also Meganeuropsis from the Wellington Formation.
- **Reptiles** (`first_reptiles`, 318 Ma → present): Hylonomus, from Dawson (1860), Joggins, ~318 Ma (Carpenter et al. 2015, Palaeontology 58: 661). Amniote tracks from Victoria, Australia (~355 Ma) were published in Nature in 2025.
- **Conifers** (`conifers`, 310 Ma → present): Swillingtonia, from Scott & Chaloner (1983), Proc. R. Soc. B. Also the walchian conifers of Garnett, Kansas.
- **Edaphosaurus** (`edaphosaurus`, 303 Ma → 272 Ma): E. pogonias, Texas Red Beds.
- **Glossopteris** (`glossopteris`, 299 Ma → 252 Ma): Raniganj. Suess (1885) named Gondwana, and the plant was part of Wegener's evidence and of Scott's Beardmore specimens. Its collapse (~252.3–252.1 Ma) is from Fielding et al. (2019) and Mays et al. (2020). Trees reached ~30 m (Wikipedia).
- **Beetles** (`beetles`, 295 Ma → present): Coleopsis, from Kirejtshuk et al. (2014).
- **Dimetrodon** (`dimetrodon`, 295 Ma → 272 Ma): D. grandis, Clear Fork Group, Seymour, Texas.
- **Eryops** (`eryops`, 295 Ma → 272 Ma): the genus range and a body mass of 102–222 kg are from Wikipedia.
- **Mesosaurus** (`mesosaurus`, 280 Ma → 270 Ma): the Irati Formation (278.4 ± 2.2 Ma), from Santos et al. (2006), Gondwana Res. Its hypersaline basin is from Piñeiro et al. (2012).
- **Cycads** (`cycads`, 280 Ma → present): Crossozamia, from Gao & Thomas (1989). The recent diversification of living species is from Nagalingum et al. (2011), Science.
- **Therapsids** (`therapsids`, 275 Ma → 120 Ma): Ocher (Ezhovo). The last tritylodontid, Fossiomanus (~120 Ma), is from Mao et al. (2021), Nature 592: 577.
- **Ceratites** (`ceratites`, 270 Ma → 201 Ma): Ceratites nodosus, Upper Muschelkalk. Their rapid Early Triassic rebound is from Brayard et al. (2009), Science.
- **Gorgonopsians** (`gorgonopsid`, 266 Ma → 252 Ma): Kammerer & Rubidge (2022), J. Afr. Earth Sci. 194: 104631. The end-Capitanian loss of dinocephalians is from Day et al. (2015).
- **Scutosaurus** (`scutosaurus`, 257 Ma → 252 Ma): Amalitskii's excavations at Sokolki.
- **Lystrosaurus** (`lystrosaurus`, 255 Ma → 248 Ma): the Karoo boundary sections at Bethulie, from Botha & Smith (2006, 2007).

Web pages the author consulted for this file:

- [Sci.News on Eoceras](https://www.sci.news/paleontology/eoceras-shaanxiense-14958.html)
- [Diamond Light Source on Prototaxites](https://www.diamond.ac.uk/default/Home/News/LatestNews/2026/Diamond-helps-uncover-a-lost-branch-of-life-.html)
- [ESRF on Arthropleura](https://www.esrf.fr/home/news/general/content-news/general/scientists-unveil-the-head-of-a-prehistoric-giant-arthropod.html)
- [KU Cambrian Life: Utah priapulans](https://kumip.ku.edu/cambrianlife/Utah-Priapulans.html)
- [Diversification of early ferns](https://www.cambridge.org/core/journals/proceedings-of-the-royal-society-of-edinburgh-section-b-biological-sciences/article/diversification-of-early-ferns/623E151093DA597865E49FA96396E4B6)
- [Wiwaxia from Chengjiang](https://resolve.cambridge.org/core/journals/geological-magazine/article/abs/first-report-of-wiwaxia-from-the-cambrian-chengjiang-lagerstatte/83DC14A2A651CBE61F511978F970D153)
- [Kammerer & Rubidge (2022)](https://ui.adsabs.harvard.edu/abs/2022JAfES.19404631K)
- [PMC3982170](https://pmc.ncbi.nlm.nih.gov/articles/PMC3982170)
- [PMC2373817](https://pmc.ncbi.nlm.nih.gov/articles/PMC2373817)
- [Scilit record](https://scilit.com/publications/9b05786f798272fc410bf3dbf1c25f12)
- [Biodiversity Heritage Library part 173677](https://biodiversitylibrary.org/part/173677)
- Wikipedia articles: [Lunataspis](https://en.wikipedia.org/wiki/Lunataspis), [Dolichophonus](https://en.wikipedia.org/wiki/Dolichophonus), [Eryops](https://en.wikipedia.org/wiki/Eryops), [Lepidodendron](https://en.wikipedia.org/wiki/Lepidodendron), [Glossopteris](https://en.wikipedia.org/wiki/Glossopteris), [Yicaris](https://en.wikipedia.org/wiki/Yicaris), [Fordilloidea](https://en.wikipedia.org/wiki/Fordilloidea), [Eusthenopteron](https://en.wikipedia.org/wiki/Eusthenopteron), [Marrella](https://en.wikipedia.org/wiki/Marrella), [Odontopleurida](https://en.wikipedia.org/wiki/Odontopleurida)

</details>

<details>
<summary><strong>Mesozoic</strong>: <code>species/mesozoic.js</code>, 52 entries</summary>

- **Frogs and salamanders** (`first_frogs`, 250 Ma → present): Triadobatrachus, Middle Sakamena Formation, Madagascar, from Piveteau (1936), Rage & Roček (1989) and Ascarrunz et al. (2016). The stem salamander Triassurus (~230 Ma) is from Schoch et al. (2020), and Prosalirus (~190 Ma) from Shubin & Jenkins (1995). Living species: AmphibiaWeb.
- **Ichthyosaurs** (`ichthyosaur`, 250 Ma → 93.9 Ma): ichthyosaurs on Spitsbergen by ~250 Ma, from Kear et al. (2023), Curr. Biol. Shonisaurus is from Camp (1976). The end-Triassic bottleneck follows Thorne, Ruta & Benton (2011), PNAS. Their last appearance at the Cenomanian–Turonian is from Fischer et al. (2016), Nat. Commun. 7: 10825.
- **Cynognathus** (`cynognathus`, 247 Ma → 237 Ma): Burgersdorp Formation, from Seeley (1895). Also known from Argentina and Antarctica.
- **Rauisuchians** (`rauisuchians`, 245 Ma → 201 Ma): Postosuchus, from Chatterjee (1985) and Weinbaum (2011). The grade's Anisian–Rhaetian range is from Nesbitt (2011).
- **Placodonts** (`placodonts`, 245 Ma → 201 Ma): the Muschelkalk around Bayreuth, from Agassiz (1833) and Rieppel (2000). Palatodonta is from Neenan et al. (2013). The last is the Rhaetian Psephoderma.
- **Dinosaurs (non-avian)** (`first_dinosaurs`, 243 Ma → 66 Ma): Nyasasaurus, a candidate only, from Nesbitt et al. (2013), Biol. Lett. Undisputed dinosaurs come from the Santa Maria Formation (233.2 Ma, Langer et al. 2018) and Ischigualasto (231.4 Ma, Martínez et al. 2011). Their dominance until the K–Pg follows Brusatte et al. (2015) and Chiarenza et al. (2019).
- **Stony corals** (`reef_corals`, 240 Ma → present): Middle Triassic Scleractinia, from Stanley & Fautin (2001), Science, and Stanley (2003). The marker is on the Cassian reefs of the Dolomites. Triassic photosymbiosis is from Frankowiak et al. (2016), Sci. Adv.
- **Phytosaurs** (`phytosaurs`, 240 Ma → 201 Ma): Diandongosuchus, from Stocker et al. (2017), Sci. Rep. The marker is in the Chinle Formation. A claimed Jurassic record is disputed by Maisch & Kapitzke (2010).
- **Teleost fishes** (`teleosts`, 237 Ma → present): Prohalecites, from Arratia (2015), Copeia 103: 999. The marker is on the Lebanese fish beds. Teleosts' ~96% share of living fishes is from Nelson et al. (2016).
- **Belemnites** (`belemnites`, 234 Ma → 66 Ma): Carnian Sinobelemnites, from Iba et al. (2012), Geology 40: 911, and a 2023 paper in Frontiers. The Peedee belemnite as the PDB isotope standard is from Craig (1957). An Eocene survivor is disputed.
- **Crocodiles and their kin** (`crocodylomorphs`, 231 Ma → present): Trialestes and Carnufex, from Zanno et al. (2015), Sci. Rep. Sarcosuchus at Gadoufaoua is from Sereno et al. (2001) and O'Brien et al. (2019).
- **Mammals** (`first_mammals`, 225 Ma → present): Adelobasileus, from Lucas & Luo (1993), and Brasilodon, from Cabreira et al. (2022). Morganucodon is from Kermack, Mussett & Rigney (1973, 1981) and Luo (2011). Also Repenomamus (Hu et al. 2005) and Castorocauda and Volaticotherium (Luo 2007).
- **Pterosaurs** (`pterosaur`, 220 Ma → 66 Ma): the oldest pterosaurs, from Ezcurra et al. (2020), Nature 588: 445. Eudimorphodon is from Zambelli (1973). Their latest-Maastrichtian diversity is from Longrich, Martill & Andres (2018), PLoS Biol.
- **Turtles** (`first_turtles`, 233 Ma → present): Odontochelys, from Li et al. (2008), Nature 456: 497, and the earlier-branching, shell-less Eorhynchochelys (Li et al. 2018, Nature). Both come from the early Carnian Xiaowa Formation at Guanling, Guizhou (~234 Ma, the time of the Carnian Pluvial Episode), hence 233 Ma rather than the 220 Ma of the first reports. Proganochelys, with the full shell by ~210 Ma, is from Gaffney (1990).
- **Coelophysis** (`coelophysis`, 216 Ma → 201 Ma): Ghost Ranch, from Colbert (1989) and Schwartz & Gillette (1994). The cannibalism story was refuted by Nesbitt et al. (2006).
- **Coccolithophores** (`coccolithophores`, 215 Ma → present): the first coccoliths, from Bown (1987, 1998). Their losses at the K–Pg are from Bown (2005).
- **Plateosaurus** (`plateosaurus`, 214 Ma → 204 Ma): Trossingen Formation. Its mud-trap bonebeds are from Sander (1992).
- **Plesiosaurs** (`plesiosaur`, 203 Ma → 66 Ma): Rhaeticosaurus, from Wintrich et al. (2017). Anning's 1823 skeleton was described by Conybeare (1824). Underwater flight follows Robinson (1975) and Muscutt et al. (2017), and live birth O'Keefe & Chiappe (2011). The latest Maastrichtian record is from Vincent et al. (2011).
- **Ammonites** (`ammonites`, 201 Ma → 66 Ma): Psiloceras at the base-Jurassic GSSP, from Hillebrandt et al. (2013). The marker is on the Whitby Mudstone.
- **Moths and butterflies** (`lepidoptera`, 201 Ma → present): wing scales from the Schandelah-1 core, from van Eldijk et al. (2018), Sci. Adv. Butterflies by ~100 Ma follow Kawahara et al. (2023).
- **Squid and octopuses** (`squid_octopus`, 183 Ma → present): the Posidonia Shale. Proteroctopus is from Kruta et al. (2016), and squid beaks of ~100 Ma from Ikegami et al. (2025), Science 388: 1406.
- **Lizards and snakes** (`squamates`, 168 Ma → present): the Kilmaluag Formation, Skye, from Evans & Waldman (1996) and Evans (2003). Megachirella is from Simões et al. (2018).
- **Multituberculates** (`multituberculates`, 166 Ma → 35 Ma): Kielan-Jaworowska, Cifelli & Luo (2004).
- **Rudists** (`rudists`, 160 Ma → 66 Ma): Skelton (2003); Steuber et al. (2002).
- **Stegosaurus** (`stegosaurus`, 155 Ma → 150 Ma): Marsh (1887). A spike-punctured Allosaurus is from Carpenter et al. (2005).
- **Allosaurus** (`allosaurus`, 155 Ma → 150 Ma): Cleveland-Lloyd Quarry, from Madsen (1976). Morrison Formation dates are from Trujillo & Kowallis (2015).
- **Brachiosaurus** (`brachiosaurus`, 154 Ma → 150 Ma): Riggs (1903); Taylor (2009). Giraffatitan is from Paul (1988).
- **Diplodocus** (`diplodocus`, 154 Ma → 150 Ma): Hatcher (1901). Tooth replacement every ~35 days is from D'Emic et al. (2013).
- **Pterodactylus** (`pterodactylus`, 151 Ma → 149 Ma): Solnhofen, from Collini (1784) and Cuvier (1809).
- **Archaeopteryx** (`archaeopteryx`, 150 Ma → 148 Ma): the Painten, Altmühltal and Mörnsheim formations (150.8–148.5 Ma), from Rauhut, Foth & Tischlinger (2018), PeerJ.
- **Flowering plants** (`flowering_plants`, 135 Ma → present): ~135 Ma pollen, from Friis, Crane & Pedersen (2011). Montsechia is from Gomez et al. (2015), PNAS.
- **Opposite birds** (`enantiornithes`, 131 Ma → 66 Ma): Protopteryx, from Zhang & Zhou (2000). Enantiornis is from Walker (1981).
- **Iguanodon** (`iguanodon`, 126 Ma → 122 Ma): Bernissart, from Norman (1980, 2010).
- **Sinosauropteryx** (`sinosauropteryx`, 125 Ma → 122 Ma): Ji & Ji (1996). Its color pattern is from Zhang et al. (2010) and Smithwick et al. (2017).
- **Placental mammal lineage** (`placental_mammals`, 125 Ma → present): Eomaia, from Ji et al. (2002), Nature 416: 816. Juramaia is debated (Luo et al. 2011). Crown placentals appear after the K–Pg (O'Leary et al. 2013).
- **Monotremes** (`monotremes`, 125 Ma → present): Teinolophos, from Rich et al. (2005). Six species from Lightning Ridge are from Flannery et al. (2024), Alcheringa 48: 319.
- **Diatoms** (`diatoms`, 120 Ma → present): the Aptian of Queensland, from Nikolaev et al. (2001) and Haig & Barnbaum (1978). The Albian of the Weddell Sea is from Gersonde & Harwood (1990).
- **Ants** (`ants`, 113 Ma → present): Vulcanidris, from Lepeco et al. (2025), Curr. Biol. Global ant numbers are from Schultheiss et al. (2022), PNAS.
- **Marsupials and kin** (`marsupial_lineage`, 110 Ma → present): Atokatheridium and Oklatheridium, from Kielan-Jaworowska & Cifelli (2001). Sinodelphys was re-identified as a eutherian by Bi et al. (2018), Nature 558: 390.
- **Magnolias** (`magnolia`, 100 Ma → present): Archaeanthus, from Dilcher & Crane (1984). Also Massoni, Doyle & Sauquet (2015).
- **Bees** (`bees`, 100 Ma → present): Cellicalichnus nests (100.14 Ma), from Genise et al. (2020), PLOS ONE. Kachin amber bees are from Poinar & Danforth (2006) and Poinar (2020).
- **Spinosaurus** (`spinosaurus`, 100 Ma → 94 Ma): Stromer (1915). The Kem Kem neotype is from Ibrahim et al. (2014, 2020). Also Sereno et al. (2022).
- **Argentinosaurus** (`argentinosaurus`, 96 Ma → 93 Ma): Bonaparte & Coria (1993). Size estimates are from Mazzetta et al. (2004) and Paul (2019).
- **Hesperornis** (`hesperornis`, 84 Ma → 78 Ma): Marsh (1872, 1880). Also Darwin's 1880 letter to Marsh.
- **Mosasaurus** (`mosasaurus`, 82 Ma → 66 Ma): Cuvier (1808). The holotype is described by Polcyn et al. (2014).
- **Parasaurolophus** (`parasaurolophus`, 76.5 Ma → 73 Ma): Parks (1922). Crest acoustics follow Weishampel (1981) and Diegert & Williamson (1998). Its neighbors in the fauna are from Mallon et al. (2012).
- **Velociraptor** (`velociraptor`, 75 Ma → 71 Ma): Osborn (1924). Quill knobs are from Turner et al. (2007), Science.
- **Quetzalcoatlus** (`quetzalcoatlus`, 70 Ma → 66 Ma): Lawson (1975); Andres & Langston (2021). The take-off debate is between Habib (2008) and Padian et al. (2021). Ground stalking is from Witton & Naish (2008).
- **Modern birds** (`modern_birds`, 69 Ma → present): Vegavis, from Clarke et al. (2005) and Torres et al. (2025), Nature 638: 146. Asteriornis (66.7 Ma) is from Field et al. (2020), Nature 579: 397. Survivor ecology follows Field et al. (2018) and Larson et al. (2016).
- **Triceratops** (`triceratops`, 68 Ma → 66 Ma): Marsh (1889). Frill wounds are from Farke et al. (2009), and the Hell Creek census from Horner et al. (2011).
- **Tyrannosaurus rex** (`tyrannosaurus`, 68 Ma → 66 Ma): Osborn (1905). Bite force is from Bates & Falkingham (2012), and growth from Erickson et al. (2004).
- **Ankylosaurus** (`ankylosaurus`, 68 Ma → 66 Ma): Brown (1908). Size and tail club are from Arbour (2009) and Arbour & Mallon (2017).

</details>

<details>
<summary><strong>Cenozoic</strong>: <code>species/cenozoic.js</code>, 58 entries</summary>

- **Grasses** (`grasslands`, 67 Ma → present): phytoliths in titanosaur coprolites from the Lameta Formation, India, from Prasad et al. (2005), Science 310: 1177, and Prasad et al. (2011), Nat. Commun. 2: 480. Grassland history follows Strömberg (2011), Annu. Rev. Earth Planet. Sci. 39: 517. The C4 expansion is from Cerling et al. (1997), Nature 389: 153, and Edwards et al. (2010), Science 328: 587. This entry stays in the Cenozoic file on purpose, because the rise of grasses is a Cenozoic story.
- **Purgatorius** (`purgatorius`, 65.9 Ma → 63 Ma): fossils 105–139 thousand years after the K–Pg, from Wilson Mantilla et al. (2021), R. Soc. Open Sci. 8: 210050. Its ankle bones are from Chester et al. (2015), Proc. R. Soc. B 282: 20141764.
- **Carnivorans** (`carnivorans`, 63 Ma → present): Torrejonian viverravids. Ravenictis, possibly older, is from Fox & Youzwyshyn (1994). About 280–300 living species.
- **Penguins** (`penguins`, 61 Ma → present): Waimanu, from Slack et al. (2006), Mol. Biol. Evol. Kumimanu fordycei is from Ksepka et al. (2023), J. Paleontol.
- **Titanoboa** (`titanoboa`, 60 Ma → 58 Ma): Head et al. (2009), Nature 457: 715. The rainforest is from Wing et al. (2009), PNAS. The temperature inference was criticized by Makarieva et al., Denny et al. and Sniderman (all 2009). Vasuki is from Datta & Bajpai (2024), Sci. Rep.
- **Elephants & kin** (`elephants`, 60 Ma → present): Eritherium, from Gheerbrant (2009), PNAS 106: 10717. The 185 proboscidean species are from Cantalapiedra et al. (2021), Nat. Ecol. Evol.
- **Rodents** (`rodents`, 57 Ma → present): Acritoparamys, from Jepsen (1937). Mammal species counts are from Burgin et al. (2018), J. Mammal.
- **Primates** (`first_primates`, 56 Ma → present): Teilhardina at Dormaal, from Smith, Rose & Gingerich (2006), PNAS 103: 11223. Nails are from Rose et al. (2011).
- **Horses** (`horses`, 56 Ma → present): Sifrhippus, from Secord et al. (2012), Science 335: 959. The domestic horse (~4,200 years ago) is from Librado et al. (2021), Nature 598: 634.
- **Bats** (`bats`, 55 Ma → present): earliest Eocene teeth from Silveirinha, from Tabuce, Antunes & Sigé (2009), J. Vertebr. Paleontol. 29: 627. Onychonycteris is from Simmons et al. (2008), Nature 451: 818. Also Icaronycteris (~52.5 Ma).
- **Songbirds & kin** (`songbirds`, 54.6 Ma → present): Murgon, from Boles (1995), Nature 374: 21, with the age from Godthelp et al. (1992). Oligocene European passerines are from Mayr & Manegold (2004). The Australian origin of songbirds follows Barker et al. (2004) and Oliveros et al. (2019), PNAS.
- **Whales & dolphins** (`first_whales`, 50 Ma → present): Pakicetus, from Gingerich et al. (1983), Thewissen et al. (2001), Nature 413: 277, and Gingerich et al. (2001), Science 293: 2239. Himalayacetus at 53.5 Ma, from Bajpai & Gingerich (1998), PNAS 95: 15464, is disputed.
- **Indohyus** (`indohyus`, 48 Ma → 45 Ma): Ranga Rao (1971); Thewissen et al. (2007), Nature 450: 1190.
- **Andrewsarchus** (`andrewsarchus`, 45 Ma → 38 Ma): Osborn (1924). Its affinities are from Spaulding, O'Leary & Gatesy (2009), PLoS ONE.
- **Terror birds** (`phorusrhacid`, 43 Ma → 1.8 Ma): the oldest psilopterine, from Acosta Hospitaleche & Jones (2024), Hist. Biol. Kelenken is from Bertelli, Chiappe & Tambussi (2007), J. Vertebr. Paleontol. 27: 409, and Titanis from MacFadden et al. (2007), Geology 35: 123. Strike mechanics are from Degrange et al. (2010), PLoS ONE.
- **Basilosaurus** (`basilosaurus`, 41 Ma → 33.9 Ma): B. cetoides was named by Harlan (1834). Hind limbs are from Gingerich, Smith & Simons (1990), Science 249: 154, and Dorudon bite marks from Fahlke (2012).
- **Baleen whales** (`baleen_whales`, 36.4 Ma → present): Mystacodon, from Lambert et al. (2017), Curr. Biol. 27: 1535. Gigantism is from Slater, Goldbogen & Pyenson (2017), Proc. R. Soc. B 284: 20170546.
- **Old World monkeys & apes** (`first_monkeys`, 34 Ma → present): the Fayum primates, from Simons and Seiffert (2006). Monkeys rafting to South America follows Bond et al. (2015), Nature 520: 538, and Seiffert et al. (2020), Science 368: 194.
- **Paraceratherium** (`paraceratherium`, 33 Ma → 23 Ma): Bugti Hills. Mass estimates are from Fortelius & Kappelman (1993).
- **Apes** (`great_apes`, 25.2 Ma → present): Rukwapithecus, from Stevens et al. (2013), Nature 497: 611.
- **Megalodon** (`megalodon`, 23 Ma → 3.6 Ma): its extinction is from Boessenecker et al. (2019), PeerJ 7: e6088. Nurseries are from Pimiento et al. (2010). Size follows Cooper et al. (2022) and Shimada et al. (2025). Competition with great whites is from McCormack et al. (2022), Nat. Commun.
- **Gomphotheres** (`gomphothere`, 20 Ma → 11 ka): Sansan, from Tassy (2014). The last American gomphotheres are from Sanchez et al. (2014), PNAS 111: 10972.
- **Moa** (`moa`, 19 Ma → 600 yr): the St Bathans fauna, from Tennyson et al. (2010). Their extinction around 1440–1445 CE is from Perry et al. (2014), Quat. Sci. Rev. 105: 126.
- **Sahelanthropus** (`sahelanthropus`, 7.2 Ma → 6.8 Ma): Brunet et al. (2002), Nature 418: 145. The age is from Lebatard et al. (2008), PNAS. The femur debate is between Daver et al. (2022), Nature 609: 94, and Macchiarelli et al. (2020).
- **Ardipithecus** (`ardipithecus`, 5.8 Ma → 4.3 Ma): White et al. (2009), Science 326: 64; Haile-Selassie (2001), Nature 412: 178. The habitat debate is from Cerling et al. (2010), Science 328: 1105.
- **Australopithecus** (`australopithecus`, 4.2 Ma → 1.98 Ma): A. anamensis at Kanapoi, Lucy at Hadar, and A. sediba. The Laetoli footprints are from Leakey & Hay (1979). Homo by 2.8 Ma is from Villmoare et al. (2015), Science 347: 1352.
- **Woolly rhinoceros** (`woolly_rhino`, 3.7 Ma → 14 ka): Coelodonta thibetana, from Deng et al. (2011), Science 333: 1285. Its extinction is from Lord et al. (2020), Curr. Biol. 30: 3871.
- **Giant ground sloth** (`megatherium`, 3.6 Ma → 12.6 ka): M. altiplanicum, from Saint-André & De Iuliis (2001), Geodiversitas 23. The Luján skeleton was described by Cuvier (1796). Butchery at Campo Laborde is from Politis et al. (2019), Sci. Adv.
- **Paranthropus** (`paranthropus`, 2.7 Ma → 1 Ma): Broom's finds at Swartkrans and Kromdraai. The diet of P. boisei is from Cerling et al. (2011), PNAS 108: 9337.
- **Saber-toothed cat** (`saber_tooth`, 2.5 Ma → 13 ka): Rancho La Brea. Its extinction is from Hemphill et al. (2023), Quat. Sci. Rev. 307: 108045.
- **Homo habilis** (`homo_habilis`, 2.3 Ma → 1.44 Ma): Leakey, Tobias & Napier (1964); Kimbel et al. (1997); Spoor et al. (2007), Nature 448: 688. The Lomekwi tools are from Harmand et al. (2015), Nature 521: 310.
- **Gigantopithecus** (`gigantopithecus`, 2 Ma → 250 ka): its extinction is from Zhang et al. (2024), Nature 625: 535. The enamel proteome is from Welker et al. (2019), Nature 576: 262.
- **Homo erectus** (`homo_erectus`, 2 Ma → 108 ka): Dubois (1891). DNH 134 is from Herries et al. (2020), Science 368. Also Dmanisi. Ngandong is from Rizal et al. (2020), Nature 577: 381.
- **Marsupial lion** (`thylacoleo`, 2 Ma → 40 ka): Naracoorte. Bite force is from Wroe, McHenry & Thomason (2005), Proc. R. Soc. B 272: 619.
- **Thylacine** (`thylacine`, 1.8 Ma → 90 yr): its extinction on the mainland is from White, Mitchell & Austin (2018), and body mass from Rovinsky et al. (2020), Proc. R. Soc. B 287: 20201537. The last known animal died at Beaumaris Zoo, Hobart, on 7 September 1936.
- **Glyptodon** (`glyptodon`, 1.8 Ma → 11.7 ka): Tarija Valley. Armor follows Alexander et al. (1999) and Blanco et al. (2009). Glyptotherium is from Gillette & Ray (1981).
- **Diprotodon** (`diprotodon`, 1.77 Ma → 40 ka): Lake Callabonna. The single species is from Price (2008), Zool. J. Linn. Soc. 153: 369, and migration from Price et al. (2017), Proc. R. Soc. B. Its extinction follows Roberts et al. (2001), Science 292: 1888, and Hocknull et al. (2020), Nat. Commun. 11: 2250.
- **Megalania** (`megalania`, 1.5 Ma → 50 ka): Owen (1859). The youngest record is from Price et al. (2015), Quat. Sci. Rev.
- **Steller's sea cow** (`stellers_sea_cow`, 1.3 Ma → 260 yr): Steller (1751). The Komae skeleton is from Kohno et al. (2007). The last report was in 1768.
- **Woolly mammoth** (`mammoth`, 700 ka → 4 ka): its origin is from Lister & Sher (2015), Science 350: 805. The marker is at Berelekh. The Wrangel Island survivors are from Vartanyan et al. (1993), Nature 362: 337.
- **Aurochs** (`aurochs`, 700 ka → 400 yr): Wadi Sarrat, from Martínez-Navarro et al. The ~80 founders of domestic cattle are from Bollongino et al. (2012), Mol. Biol. Evol. 29: 2101. The last cow died at Jaktorów in 1627.
- **Homo floresiensis** (`homo_floresiensis`, 700 ka → 50 ka): Brown et al. (2004), Nature 431: 1055; Sutikna et al. (2016), Nature 532: 366. Mata Menge is from van den Bergh et al. (2016), Nature 534: 245, and Kaifu et al. (2024).
- **Homo heidelbergensis** (`homo_heidelbergensis`, 610 ka → 300 ka): the Mauer mandible, from Wagner et al. (2010), PNAS 107: 19726. Lineage split dates are from Meyer et al. (2016), Nature 531: 504. A renaming proposal is from Roksandic et al. (2021).
- **Neanderthals** (`neanderthals`, 430 ka → 40 ka): Sima de los Huesos, from Arsuaga et al. (2014), Science 344: 1358. Their extinction is from Higham et al. (2014), Nature 512: 306, and admixture from Green et al. (2010).
- **Irish elk** (`megaloceros`, 400 ka → 7.7 ka): Stuart et al. (2004), Nature 431: 684.
- **Homo sapiens** (`homo_sapiens`, 300 ka → present): Jebel Irhoud, from Hublin et al. (2017), Nature 546: 289, and Richter et al. (2017), Nature 546: 293. Dispersal and admixture follow Iasi et al. (2024) and Sümer et al. (2025).
- **Cave lion** (`cave_lion`, 300 ka → 13 ka): Goldfuss (1810). Its split from the living lion is from de Manuel et al. (2020), PNAS, and its last dates from Stuart & Lister (2011), Quat. Sci. Rev.
- **Cave bear** (`cave_bear`, 250 ka → 24 ka): its last record is from Terlato et al. (2019), Hist. Biol. 31: 474 (compare Pacher & Stuart 2009, Boreas). Brown-bear admixture is from Barlow et al. (2018), Nat. Ecol. Evol.
- **Dire wolf** (`dire_wolf`, 250 ka → 13 ka): Leidy (1858). Size is from Anyonge & Roman (2006). Ancient DNA is from Perri et al. (2021), Nature 591: 87, and Gedman et al. (2025, bioRxiv preprint).
- **Denisovans** (`denisovans`, 200 ka → 40 ka): Krause et al. (2010), Nature 464: 894; Reich et al. (2010), Nature 468: 1053. The Xiahe jaw is from Chen et al. (2019), Nature 569: 409, and the Harbin skull from Fu et al. (2025).
- **Passenger pigeon** (`passenger_pigeon`, 100 ka → 110 yr): a population of 3–5 billion, from Schorger (1955). Martha died at the Cincinnati Zoo on 1 September 1914.
- **Domestic dog** (`dog`, 14.2 ka → present): Bonn-Oberkassel, from Janssens et al. (2018), J. Archaeol. Sci. 92: 126. The wolf–dog split is from Botigué et al. (2017), Nat. Commun. 8: 16082. An extinct source population follows Freedman et al. (2014) and Bergström et al. (2022).
- **Wheat** (`wheat`, 10.5 ka → present): Karacadağ einkorn, from Heun et al. (1997), Science 278: 1312.
- **Cattle** (`cattle`, 10.5 ka → present): Dja'de el-Mughara, from Helmer et al. (2005). Founders are from Bollongino et al. (2012). Biomass is from Bar-On et al. (2018), PNAS 115: 6506, and Greenspoon et al. (2023), PNAS.
- **Elephant birds** (`elephant_bird`, 10.5 ka → 1 ka): Christmas River, from Hansford et al. (2018), Sci. Adv. 4: eaat6925. Vorombe is from Hansford & Turvey (2018), R. Soc. Open Sci. 5: 181295. The kiwi relationship is from Mitchell et al. (2014), Science 344: 898. Their extinction is from Hansford et al. (2021), Quat. Sci. Rev.
- **Rice** (`rice`, 9 ka → present): Shangshan, from Zuo et al. (2017), PNAS. Tianluoshan is from Fuller et al. (2009), Science 323: 1607.
- **Maize** (`maize`, 8.7 ka → present): Xihuatoxtla, from Piperno et al. (2009), PNAS 106: 5019. The Guilá Naquitz cobs are from Piperno & Flannery (2001), PNAS.
- **Dodo** (`dodo`, 4.2 ka → 340 yr): Mare aux Songes, from Rijsdijk et al. (2009), Quat. Sci. Rev. 28: 14. Mass is from Brassey et al. (2016), PeerJ. Extinction around 1690 is from Roberts & Solow (2003), Nature 426: 245.

</details>

## The tree of life: `phylogeny.js`

The tree has 174 clades, from LUCA to Homo. Each clade is a lineage that branches off its parent's line at `originMa`. A species hangs from the most specific clade it belongs to. The tree drives the Tree view and the lineage and "closest relatives" sections of the species dialog. The data file's header explains how to read it; the sources and choices are summarized here.

**Dates.** Expect errors of several per cent in the Phanerozoic and of 10–20% before 1000 Ma.

- **Living groups:** splits default to the median of the TimeTree of Life, Kumar et al. (2022), Mol. Biol. Evol. 39: msac174 (timetree.org pairwise medians, fetched in November 2026). 95% intervals are noted in the file where they matter.
- **Fossil-led nodes:** where a fossil below a node is older than the clock median, the node is moved to just before that fossil. This applies to crown archosaurs, lungfish, conifers, grasses, snakes, horses and hominins.
- **Extinct groups:** they have no clock. Each split is set a little before the oldest fossils on either side.
- **Before about 1000 Ma:** published clocks disagree by hundreds of millions of years. The tree uses the older family of estimates (Moody et al. 2024; Mahendrarajah et al. 2023; Fournier et al. 2021; Wolfe & Fournier 2018; Parfrey et al. 2011), which lets the catalogue's 3.46-Ga methanogens hang below their node. The younger family is Betts et al. (2018) and TimeTree, which puts the eukaryotes at ~1.5 Ga. The Asgard archaea date (3000 Ma) is an interpolation with no published estimate behind it.
- **Rocks versus clocks:** clock dates are used for the animal phyla (splits at 750–570 Ma, body fossils from ~575 Ma), the flowering plants (~160 Ma for the monocot–eudicot split, clear fossils from ~135 Ma) and the placental orders (97–75 Ma, undisputed fossils after 66 Ma), because a lineage must exist before its first fossil. Modern birds take a middle course: a root at 100 Ma, between TimeTree (108 Ma) and genome studies with tight priors (under 95 Ma).

**Mainstream choices where specialists disagree** (doubt is flagged in the clade descriptions):

- Eukaryotes are drawn on the archaeal (Asgard) line, although the mitochondrion came from a bacterium. Their first splits are drawn as a tie, because the order is unresolved.
- Comb jellies are not drawn; genomes now favor them as the first branch of animals (Schultz et al. 2023). Sponges are therefore the oldest animal branch shown, tied with the Ediacaran biota, whose position is unresolved.
- Some grades are kept although they are not natural groups, because that is how the fossils are known: Ediacaran biota, lobopodians, crustaceans, nautiloids, armored jawless fish and seed ferns.
- Other placements:
  - conodonts sit with the cyclostomes;
  - trilobites are tied with chelicerates and mandibulates;
  - modern amphibians sit inside the temnospondyls;
  - turtles sit beside the archosaurs (Chiari et al. 2012);
  - ichthyosaurs and sauropterygians are tied with the lepidosaurs;
  - mosasaurs sit somewhere among lizards and snakes;
  - multituberculates are closer to therians than monotremes are;
  - the base of the placentals and the laurasiatherian orders are drawn as ties.
- A fossil of contested position goes where most specialists now put it. Failing a majority, it goes on the deepest node that covers all candidates; for example, Wiwaxia sits on "Spiralians".

**Sources** (as listed in the file header):

- Kumar et al. (2022), Mol. Biol. Evol. 39: msac174: TimeTree of Life.
- Moody et al. (2024), Nat. Ecol. Evol. 8: 1654: LUCA at ~4.2 Ga (4.09–4.33).
- Mahendrarajah et al. (2023), Nat. Commun. 14: 7456: crown Archaea, the eukaryote stem and the last eukaryotic common ancestor.
- Fournier et al. (2021), Proc. R. Soc. B 288: 20210675: cyanobacteria.
- Wolfe & Fournier (2018), Nat. Ecol. Evol. 2: 897: methanogens by 3.51 Ga.
- Betts et al. (2018), Nat. Ecol. Evol. 2: 1556: the younger deep-time alternative.
- Parfrey et al. (2011), PNAS 108: 13624: the last eukaryotic common ancestor and the major eukaryote clades.
- Strassert et al. (2021), Nat. Commun. 12: 1879: eukaryote supergroups.
- Morris et al. (2018), PNAS 115: E2274: land plants and vascular plants.
- dos Reis et al. (2015), Curr. Biol. 25: 2939: animals, eumetazoans and bilaterians.
- Misof et al. (2014), Science 346: 763: insects.
- Benton et al. (2015), Palaeontol. Electron. 18.1.1FC: fossil minimum and maximum ages for animal nodes.
- Schultz et al. (2023), Nature 618: 110: comb jellies as the sister group of all other animals.
- Caldwell et al. (2015), Nat. Commun. 6: 5996: the oldest snakes.
- Nesbitt (2011), Bull. Am. Mus. Nat. Hist. 352, and Brusatte et al. (2010), Earth-Sci. Rev. 101: 68: archosaurs and dinosaurs.
- Stiller et al. (2024), Nature 629: 851: Neoaves radiating at the K–Pg boundary.
- Chiari et al. (2012), BMC Biol. 10: 65: turtles as the sister group of archosaurs.
- Benton (2015), Vertebrate Palaeontology, 4th ed.: fossil ranges and vertebrate relationships.

## Mass extinctions and crises: `extinctions.js`

**Dates.** The dates follow the same ICS chart as the time scale. The five `timeMa` values are fixed project-wide, so that victims can end exactly on them: 444.2, 372, 251.9, 201.4 and 66 Ma.

**Staging (editorial).** `durationMa` is the on-screen window (`timeMa ± durationMa / 2`), not how long the dying took. Each window is sized to span the crisis interval and to take 1.5–2 s to cross at 1×. When playback reaches a window, the clock:

1. holds on its leading edge for 6 s (`TIMING.extinctionPauseSeconds`, skippable);
2. crawls through the window at 0.3× speed;
3. fades the effects out over 3 s.

| Event | Date (Ma) | Window (Ma) | Crossing at 1× |
|---|---|---|---|
| End-Ordovician | 444.2 | 445.2–443.2 | 1.98 s |
| Late Devonian | 372 | 373–371 | 1.97 s |
| End-Permian | 251.9 | 252.75–251.05 | 1.57 s |
| End-Triassic | 201.4 | 202.2–200.6 | 1.56 s |
| End-Cretaceous | 66 | 66.45–65.55 | 1.56 s |

**Severity.** Nobody has counted species across a mass extinction. Every figure is extrapolated from the genera and families that fossils record, mostly in the sea. The meter shows the classic estimates of marine species lost. These were tabulated by Barnosky et al. (2011), Nature 471: 51–57, Table 1, after Jablonski (1994), as 86 / 75 / 96 / 80 / 76%. Where published figures form a range, the card says so and the meter sits mid-range.

| Event | Meter | Label on the card | Basis |
|---|---|---|---|
| End-Ordovician | 85% | of marine species lost (estimate) | Sheehan (2001) gives 85%; Barnosky et al. 86% |
| Late Devonian | 75% | of marine species lost, in pulses (estimate) | Barnosky et al.; adds up several Late Devonian pulses |
| End-Permian | 90% | of marine species lost (estimates: 81–94%) | The middle of the 81–94% range of Dal Corso et al. (2022), Nat. Rev. Earth Environ. 3: 197–214. Barnosky's 96% lumped in the end-Capitanian crisis, 8 million years earlier. |
| End-Triassic | 78% | of marine species lost (estimates: 75–80%) | Barnosky et al. give 80%; the meter sits mid-range |
| End-Cretaceous | 76% | of species lost (estimate from marine fossils) | Barnosky et al. |

Re-analyses that subtract ordinary background extinction lower the figures they cover. Stanley (2016), PNAS 113: E6325, gives:

- 42–44% of genera for the end-Ordovician, instead of 57%;
- 16–20% for the Kellwasser crisis, instead of 35%;
- 38–40% for the end-Cretaceous;
- 62% of genera and ~81% of species for the end-Permian, which stays far in front.

Stanley leaves out the end-Triassic. The numbers are for comparing the five with one another, not for reading to the point.

**Causes, victims and epicenters.** The `cause`, `victims` and `survivors` lists summarize the following:

- **End-Ordovician:** Harper et al. (2014); the Hirnantian Age, 445.2–443.1 Ma, from the ICS. The epicenter is on the Hirnantian glacial pavements of the central Sahara.
- **Late Devonian:** the Kellwasser events; Sallan & Coates (2010), PNAS, for placoderms surviving until the Hangenberg crisis; Copper (2002) for the reefs. Ricci et al. (2013) date the Viluy Traps to 376.7 and 364.4 Ma, not to the boundary. No single place is defensible, so there is no epicenter.
- **End-Permian:** Burgess et al. (2014) for an extinction lasting 60 ± 48 thousand years; Burgess et al. (2017); Svensen et al. (2009) for the Tunguska coal and evaporites; Sun et al. (2012) and Joachimski et al. (2012) for 8–10 °C of warming; Viglietti et al. (2021) for a drawn-out loss on land.
- **End-Triassic:** Blackburn et al. (2013), Science, for the Central Atlantic Magmatic Province from 201.566 Ma, over ~600 thousand years; Marzoli et al. (1999) for its ~10 million km². The epicenter is on the CAMP basalts of the High Atlas, Morocco.
- **End-Cretaceous:** Renne et al. (2013) for the impact at 66.04 Ma; Artemieva et al. (2017) for anhydrite sulfate; Senel et al. (2023) for dust; Hull et al. (2020); Sprain et al. (2019) for the Deccan Traps. Chicxulub is centred at 21.3° N, 89.5° W, on the coast; the staged impact is drawn at 20.8° N, still inside the 180 km crater, so that it falls on land on the simplified coastline.

Epicenters are given in modern coordinates on a named plate; the engine carries them back in time.

**Second-tier crises** never stop the clock; the timeline marks them. Their sources:

- **White Sea–Nama, 550 Ma:** Evans et al. (2022), PNAS 119: e2207475119; Darroch et al. (2018), Trends Ecol. Evol.
- **End-Ediacaran, 538.8 Ma:** Darroch et al. (2018); Linnemann et al. (2019), Terra Nova.
- **End-Botomian, 511 Ma:** Zhuravlev & Wood (1996), Geology, for the Sinsk anoxia; Jourdan et al. (2014) for the Kalkarindji basalts at 510.7 Ma. The severity figures come from secondary sources.
- **Hangenberg, 358.86 Ma:** Sallan & Coates (2010); Kaiser et al. (2016).
- **Carboniferous rainforest collapse, 305 Ma:** Sahney, Benton & Falcon-Lang (2010), Geology; Dunne et al. (2018) for the debate.
- **Olson's Extinction, 273 Ma:** Sahney & Benton (2008), Proc. R. Soc. B; Brocklehurst et al. (2017), Proc. R. Soc. B. Whether it was a real event is still contested.
- **End-Capitanian, 259.5 Ma:** Stanley & Yang (1994); Stanley (2016); Day et al. (2015), Proc. R. Soc. B.
- **Carnian Pluvial Episode, 233 Ma:** Dal Corso et al. (2020), Sci. Adv.; Bernardi et al. (2018), Nat. Commun.
- **Toarcian anoxic event, 183 Ma:** Burgess et al. (2015), EPSL, for the Karoo–Ferrar basalts at 183.2–182.8 Ma.
- **Cenomanian–Turonian anoxic event (OAE 2), 93.9 Ma:** Turgeon & Creaser (2008); Fischer et al. (2016), Nat. Commun.; Forster et al. (2007).
- **PETM, 56 Ma:** Röhl et al. (2007); Sluijs et al. (2006), Nature; Tierney et al. (2022); Zeebe et al. (2016); Thomas (2007) for the benthic foraminifera.
- **Eocene–Oligocene, 33.9 Ma:** Coxall et al. (2005), Nature; DeConto & Pollard (2003); Hooker et al. (2004) for the Grande Coupure; CenCO2PIP Consortium (2023).
- **Late Quaternary megafauna, 30 ka:** Barnosky et al. (2004), Science, for the loss of large-mammal genera by continent; Sandom et al. (2014).
- **The Sixth Extinction?, the last few centuries:** the IUCN Red List; Ceballos et al. (2015), Sci. Adv.; WWF Living Planet Report 2024; IPBES (2019); Barnosky et al. (2011).

## Milestones: `milestones.js`

The 58 milestones are the beats of the story that are not mass extinctions. Each appears as a toast at the top of the stage and a dot on the timeline. 38 of them also have a place on the map, given in modern coordinates on a named plate. `timeMa` is the date shown; for an interval it is the midpoint. `durationMa` is a trigger window sized for pacing, not the length of the event.

The colors are shades of six category hues from the same palette as the life groups, and the category icon always accompanies the color. The text summarizes the literature below, and contested claims are hedged in the text. Four milestones narrate a second-tier crisis and share its sources above: `rainforest_collapse`, `oae2`, `petm` and `megafauna_extinction`.

<details>
<summary><strong>Sources for each milestone</strong></summary>

- **Earth forms** (`earth_forms`, 4.54 Ga): the age of the Earth used throughout the project (`TIMING.startTimeMa`). No separate reference is recorded.
- **The Moon is born** (`moon_forming_impact`, 4.5 Ga): Barboni et al. (2017), Sci. Adv. 3: e1602365. Published estimates of the impact run from ~4.51 to ~4.43 Ga.
- **First crust, first oceans** (`first_crust_and_oceans`, 4.4 Ga, Jack Hills): Wilde et al. (2001), Nature 409: 175; Mojzsis et al. (2001); Valley et al. (2014).
- **A battered young planet** (`late_heavy_bombardment`, 4.1 Ga): Boehnke & Harrison (2016), who question the sudden "cataclysm".
- **Life begins** (`earliest_traces_of_life`, 3.7 Ga, Isua): Rosing (1999); Ohtomo et al. (2014).
- **The first fossils** (`oldest_stromatolites`, 3.48 Ga, Pilbara): the Dresser Formation stromatolites (Van Kranendonk et al.).
- **The first oxygen-makers** (`oxygenic_photosynthesis`, 2.95 Ga, Pongola): Planavsky et al. (2014); Crowe et al. (2013); Anbar et al. (2007).
- **Continents grow** (`first_continents`, 2.7 Ga): no separate reference is recorded. The same crustal surge is sourced in the tectonic index (Condie & Aster 2010) and the time-scale text (Condie 1998; Bleeker 2003).
- **The Great Oxidation Event** (`great_oxygenation`, 2.4 Ga): Lyons, Reinhard & Planavsky (2014), Nature 506: 307.
- **The first deep freeze** (`huronian_glaciation`, 2.25 Ga, Lake Huron): Kopp et al. (2005).
- **Oxygen overshoots** (`lomagundi_excursion`, 2.1 Ga, Franceville): Karhu & Holland (1996); El Albani et al. (2010).
- **The supercontinent Nuna** (`nuna_supercontinent`, 1.8 Ga): Zhao et al. (2002).
- **Cells with a nucleus** (`first_eukaryotes_event`, 1.65 Ga, Yanshan): Miao et al. (2024) for Qingshania (1.63 Ga); Betts et al. (2018) for the clocks.
- **The "boring billion"** (`boring_billion`, 1.4 Ga): no separate reference is recorded. The calm it describes is the one in the oxygen, ocean-chemistry and tectonic curves (Lyons et al. 2014; Planavsky et al. 2011; Cawood & Hawkesworth 2014).
- **Many cells, and sex** (`sex_and_many_cells`, 1.05 Ga, Somerset Island): Gibson et al. (2018) for Bangiomorpha at 1.047 Ga.
- **The supercontinent Rodinia** (`rodinia_assembly`, 900 Ma, Grenville belt): Li et al. (2008).
- **The first animals?** (`first_animals`, 770 Ma): dos Reis et al. (2015); Love et al. (2009); Nettersheim et al. (2019); Schultz et al. (2023).
- **Snowball Earth** (`sturtian_snowball`, 689 Ma) and **A second snowball** (`marinoan_snowball`, 643 Ma): Hoffman et al. (2017), Sci. Adv. 3: e1600983.
- **The first large life** (`gaskiers_avalon`, 573 Ma, Mistaken Point): Pu et al. (2016); Matthews et al. (2021).
- **The Cambrian Explosion** (`cambrian_explosion`, 527 Ma, Chengjiang): Erwin et al. (2011).
- **The first fishes** (`first_vertebrates`, 518 Ma, Haikou): Shu et al. (1999).
- **First footprints on land** (`first_footprints`, 500 Ma, Blackberry Hill): MacNaughton et al. (2002); Collette et al. (2012).
- **The great diversification** (`ordovician_biodiversification`, 480 Ma): Servais & Harper (2018).
- **Plants reach the land** (`plants_on_land`, 470 Ma): Rubinstein et al. (2010).
- **Jaws** (`jaws`, 436 Ma, Chongqing): Zhu et al. (2022), Nature.
- **Animals move ashore** (`arthropods_on_land`, 410 Ma, Rhynie): the Rhynie chert (Trewin).
- **The first forests** (`first_forests_event`, 386 Ma, Gilboa and Cairo): Stein et al. (2007, 2020); Meyer-Berthaud et al. (1999).
- **Vertebrates step ashore** (`vertebrates_step_ashore`, 365 Ma, East Greenland): Niedźwiedzki et al. (2010); Clack (2012).
- **Pangaea assembles** (`pangaea_assembly`, 335 Ma): Domeier & Torsvik (2014).
- **Coal forests and giant insects** (`coal_age`, 325 Ma, Howick): Davies et al. (2021) for Arthropleura. The oxygen level is from the oxygen curve.
- **Eggs on dry land** (`amniote_egg`, 315 Ma, Joggins): Dawson; Carroll (1964). The toast shows 315 Ma; the species entry uses ~318 Ma.
- **The rainforests collapse** (`rainforest_collapse`, 305 Ma): see the crisis above.
- **Dinosaurs, and mammals** (`dinosaurs_and_mammals`, 230 Ma, Ischigualasto): Langer et al. (2010).
- **Pangaea breaks apart** (`pangaea_breakup`, 190 Ma, Newark Basin): Labails et al. (2010) for the first Atlantic crust.
- **Dinosaurs take wing** (`dinosaurs_take_wing`, 161 Ma, Liaoning): Hu et al. (2009) for Anchiornis.
- **The giants** (`jurassic_giants`, 152 Ma, Morrison Formation): Foster (2007).
- **The first flowers** (`first_flowers_event`, 132 Ma): Coiro, Doyle & Hilton (2019).
- **Life on land blossoms** (`cretaceous_terrestrial_revolution`, 105 Ma): Lloyd et al. (2008); Benton, Wilf & Sauquet (2022).
- **Hothouse seas run out of oxygen** (`oae2`, 93.9 Ma, Western Interior Seaway): see the crisis above.
- **Mammals inherit the Earth** (`mammal_radiation`, 61 Ma): Lyson et al. (2019).
- **A sudden global fever** (`petm`, 56 Ma, Bighorn Basin): see the crisis above.
- **India collides with Asia** (`india_asia_collision`, 50 Ma, Indus–Yarlung suture): Hu et al. (2016); van Hinsbergen et al. (2011).
- **Whales return to the sea** (`whales_return_to_sea`, 40 Ma, Wadi al-Hitan): Gingerich, Smith & Simons (1990).
- **Antarctica freezes over** (`antarctic_glaciation`, 33.9 Ma, East Antarctica): no separate reference is recorded. It shares the sources of the Eocene–Oligocene crisis (Coxall et al. 2005; DeConto & Pollard 2003), of the ice (Zachos et al. 2001) and of the sea-level curve (Miller et al. 2020).
- **Grasslands spread** (`grasslands_event`, 21 Ma): Strömberg (2011); Peppe et al. (2023).
- **The age of apes** (`age_of_apes`, 16.5 Ma, Rusinga Island): Rukwapithecus (Stevens et al. 2013) and the Proconsul fossils of Rusinga Island.
- **The Mediterranean dries up** (`messinian_salinity_crisis`, 5.6 Ma, Gibraltar): Krijgsman et al. (1999); Garcia-Castellanos et al. (2009).
- **Walking upright** (`upright_walking`, 3.7 Ma, Laetoli): Leakey & Hay (1979).
- **The first stone tools** (`first_stone_tools`, 3.3 Ma, Lomekwi): Harmand et al. (2015); Plummer et al. (2023) for the Oldowan.
- **Panama joins the Americas** (`great_american_interchange`, 2.7 Ma): O'Dea et al. (2016).
- **Fire tamed** (`fire_tamed`, 1 Ma, Wonderwerk Cave): Berna et al. (2012), PNAS.
- **Homo sapiens** (`homo_sapiens_emerges`, 300 ka, Jebel Irhoud): Hublin et al. (2017).
- **Out of Africa** (`out_of_africa`, 70 ka, Muna Island): Iasi et al. (2024) and Sümer et al. (2025) for dispersal and admixture. The Muna hand stencil (at least 67,800 years old) is from Oktaviana et al. (2026), Nature 650: 652. The marker is at the island's center, not the cave.
- **The giant animals vanish** (`megafauna_extinction`, 28.5 ka): see the crisis above.
- **Farming begins** (`agriculture`, 11 ka, Fertile Crescent): Larson et al. (2014).
- **Cities and writing** (`cities_and_writing`, 5.3 ka, Uruk): Algaze; Nissen.
- **The industrial age** (`industrial_anthropocene`, 300 yr): NOAA Global Monitoring Laboratory for CO₂; Forster et al. (2025), Earth Syst. Sci. Data 17: 2641, for the warming; CenCO2PIP Consortium (2023) for the highest CO₂ in some 14 million years.

</details>

## Chapters: `chapters.js`

The 18 chapters are an editorial table of contents (the Chapters panel and the `[` / `]` keys). Most chapter boundaries are row boundaries of the time scale. Six are not:

- 1800 Ma, where "The long quiet" (the "boring billion") begins;
- 251.0, 200.5 and 65.5 Ma, which end three chapters just past the end-Permian, end-Triassic and end-Cretaceous windows, so that jumping to the next chapter lands in the aftermath, not mid-catastrophe;
- 7 Ma, near the split of our line from the chimpanzees';
- 0.3 Ma, the first Homo sapiens.

Three chapters also choose the view that shows them best: the Map for the Hadean, the Globe for Snowball Earth and the Tree for the Cambrian explosion.

## Air and climate: `atmosphere.js`

The file holds three curves: global mean surface temperature, oxygen and carbon dioxide. Each is a list of `[Ma, value]` knots joined by straight lines. They are smoothed, order-of-magnitude reconstructions for animation, not data products. The file's comments name the reconstruction each stretch leans on and every liberty taken; they are summarized here.

Shared conventions:

- "Present" (0 Ma) means the mid-2020s, not the pre-industrial world. The last knots of the temperature and CO₂ curves are the modern rise.
- Abrupt events are drawn a little wider than they really were, so that playback cannot jump over them; peak values are kept.

### Temperature

- **486.85 Ma to today: one framework.** The knots follow the stage medians of PhanDA, the data-assimilation reconstruction of Judd et al. (2024), Science 385: eadk3705. They are smoothed where neighboring stages scatter, and averaged over each of PhanDA's 85 stages the curve stays inside its 16th–84th percentile band. One framework means every rise and fall is measured with the same ruler.
- **PhanDA runs warm.** In hothouse intervals it is 5–8 °C above Scotese et al. (2021), Earth-Sci. Rev. 215: 103503: about 36 °C here at the Cenomanian–Turonian maximum against 28 °C there. For the early Eocene it is 3–6 °C above the proxy syntheses: DeepMIP's 27.0 °C (range 23.2–29.7) in Inglis et al. (2020), Clim. Past 16: 1953. The same holds for the Miocene Climatic Optimum (Steinthorsdottir et al. 2021, Paleoceanogr. Paleoclimatol. 36: e2020PA004037). It agrees with them on the PETM, the Oligocene, the Pliocene and the ice ages.
- **Ice ages need not be colder than today.** In this framework the Hirnantian glaciation has a global mean near 19–20 °C, with the ice on a supercontinent parked over the pole. At 444.6 Ma the Life panel therefore reads "19.2 °C, +4.1 °C vs today" beside the climate word "Icehouse".
- **Events shorter than a stage,** from specialist work in the same proxy framework:
  - the Hirnantian glacial maximum, when tropical seas cooled ~5 °C (Finnegan et al. 2011, Science 331: 903);
  - end-Permian warming of 8–10 °C (Joachimski et al. 2012, Geology 40: 195; Sun et al. 2012, Science 338: 366);
  - end-Triassic warming of 3–4 °C (McElwain et al. 1999, Science 285: 1386);
  - ~2 °C of late-Maastrichtian warming, over before the impact (Barnet et al. 2018, Geology 46: 147; Hull et al. 2020, Science 367: 266);
  - the PETM, a ~34 °C peak after +5.6 °C in a few thousand years (Tierney et al. 2022, PNAS 119: e2205326119; compare 31.6 °C in Inglis et al. 2020), lasting ~170,000 years (Röhl et al. 2007, Geochem. Geophys. Geosyst. 8: Q12002);
  - the Eocene–Oligocene step (Hutchinson et al. 2021, Clim. Past 17: 269);
  - the Miocene Climatic Optimum (Steinthorsdottir et al. 2021);
  - the mid-Pliocene warm period (PlioMIP2: Haywood et al. 2020, Clim. Past 16: 2095).
- **The Pleistocene.** Glacial cycles are too fast to draw for 2.6 million years, since one 41,000-year cycle would last a fifth of a second. So 2.58–0.19 Ma shows the cycle mean from the PhanDA stage medians; real glacial maxima were ~4 °C colder and interglacials 2–3 °C warmer than the line. The last glacial cycle is drawn in full:
  - the Last Interglacial, 0.5–1.5 °C above pre-industrial (IPCC AR6 WG1 2021, ch. 2);
  - the Last Glacial Maximum, 6.1 ± 0.4 °C below pre-industrial (Tierney et al. 2020, Nature 584: 569);
  - the deglaciation, after Osman et al. (2021), Nature 599: 239, and Shakun et al. (2012), Nature 484: 49;
  - a mild mid-Holocene optimum (~6.5 ka, +0.3 °C), drawn between the proxy synthesis of Kaufman et al. (2020), Sci. Data 7: 201 (about +0.7 °C relative to the 19th century), and data assimilation (Osman et al. 2021), which finds none; IPCC AR6 (2021) assesses +0.2 to +1.0 °C.
- **Today.** Pre-industrial (1850–1900) is about 13.8 °C and the mid-2020s about 15.1 °C: +1.3 °C, the long-term warming level (Forster et al. 2025, Earth Syst. Sci. Data 17: 2641). Single years run warmer: 2024 was 1.55 ± 0.13 °C above 1850–1900 and 2025 1.44 ± 0.13 °C (WMO). Absolute global temperature is known only to a few tenths of a degree.
- **The Cambrian, 538.8–486.85 Ma,** is not covered by PhanDA. The curve is a greenhouse rising to meet PhanDA's ~32 °C in the earliest Ordovician, consistent with 20–25 °C seas at high southern latitudes ~514–509 Ma (Hearing et al. 2018, Sci. Adv. 4: eaar5690). Low confidence.
- **The Precambrian: states, not measurements.** There is no global temperature proxy, so the curve encodes the sequence of states the rock record requires: ice ages where there are glacial deposits, warmth where there are none.
  - The magma ocean and the Moon-forming impact (~4.51 Ga: Barboni et al. 2017, Sci. Adv. 3: e1602365).
  - A steam and CO₂ atmosphere raining out into a ~230 °C ocean under ~100 bar of CO₂ (Zahnle et al. 2007, Space Sci. Rev. 129: 35).
  - A magma ocean that probably froze over within a few million years (Elkins-Tanton 2008, EPSL 271: 181).
  - The ~230 °C ocean lasts as long as the CO₂ stays in the air; as the CO₂ is drawn down into the crust, the seas pass through ~100 °C in only 10⁵–10⁷ years (Sleep, Zahnle & Neuhoff 2001, PNAS 98: 3666).
  - Liquid water by 4.4–4.3 Ga (Wilde et al. 2001, Nature 409: 175; Valley et al. 2002, Geology 30: 351). 4.3–4.0 Ga is unconstrained.
  - An Archean of 0–50 °C in carbon-cycle models (Krissansen-Totton, Arney & Catling 2018, PNAS 115: 4105) and 0–40 °C in reviews (Catling & Zahnle 2020, Sci. Adv. 6: eaax1420). Disputed readings of 55–85 °C come from chert oxygen isotopes (Knauth & Lowe 2003, GSA Bull. 115: 566). The line runs 40 → 25 °C.
  - The Pongola glaciation, ~2.9 Ga (Young et al. 1998, J. Geol. 106: 523).
  - The Huronian glaciations, 2430–2220 Ma (Gumsley et al. 2017, PNAS 114: 1811; Rasmussen et al. 2013, EPSL 382: 173), drawn as one cold era at ~8 °C.
  - A flat ~24 °C through the "boring billion", which has no firmly known glacial deposits.
  - The two Cryogenian snowballs (Macdonald et al. 2010, Science 327: 1241; Rooney et al. 2015, Geology 43: 459; Prave et al. 2016, Geology 44: 631; compiled by Hoffman et al. 2017, Sci. Adv. 3: e1600983), drawn at −35 → −25 °C, the warm end of hard-snowball models (Pierrehumbert et al. 2011, Annu. Rev. Earth Planet. Sci. 39: 417).
  - A ~30 °C greenhouse after each thaw, the value one coupled model gives at 15,000 ppm CO₂ (Ramme & Marotzke 2022, Clim. Past 18: 759).
  - The brief Gaskiers glaciation, 579.9–579.6 Ma (Pu et al. 2016, Geology 44: 955).
- **Liberties.**
  - The Moon-impact vapor spike is drawn a few million years wide.
  - The magma ocean cools over ~100 million years.
  - The Pongola dip is widened to ~0.1 billion years.
  - Each snowball freeze is drawn ~5 million years long and each thaw ~6 million (really thousands of years).
  - The Gaskiers is widened to ~4 million years.
  - The Hadean seas take ~35 million years to cool from 110 to 60 °C (4374–4340 Ma), so that the stage can be seen.
  - End-Permian warming is drawn from 252.7 to 251.3 Ma; most of it happened within ~0.1 million years of 251.94 Ma.
  - The PETM peak is held ~0.2 million years and its recovery ends at 55.6 Ma.
  - The impact winter at the end of the Cretaceous, years to decades long, is not drawn at all.

### Oxygen

Oxygen is expressed as a percentage of the air by volume; today it is 20.95%.

- **Before the Great Oxidation: effectively zero.** Mass-independent sulfur isotopes require less than 0.001% of today's level (Farquhar et al. 2000, Science 289: 756; Pavlov & Kasting 2002, Astrobiology 2: 27). Brief Archean "whiffs" are not drawn.
- **Great Oxidation Event.** Oxygen first accumulates between 2.46 and 2.43 Ga (Gumsley et al. 2017), rises in oscillations, and is permanent by ~2.22 Ga (Poulton et al. 2021, Nature 592: 232). The Lomagundi "overshoot" is of unknown size (Bekker & Holland 2012, EPSL 317–318: 295) and is drawn at ~3%.
- **Mid-Proterozoic.** Somewhere between 0.1% and 10% of today's level (Lyons, Reinhard & Planavsky 2014, Nature 506: 307); Planavsky et al. (2014), Science 346: 635, argue for less than 0.1%. It is drawn at 0.8% of the air, inside the range but not a measurement.
- **A stepwise rise into the Paleozoic.** Oxygen reaches ~5–10% in the Cambrian, 15–20% by the Devonian and over 25% in the Permo-Carboniferous. Sources: Mills, Krause, Jarvis & Cramer (2023), Annu. Rev. Earth Planet. Sci. 51: 253; Krause et al. (2018), Nat. Commun. 9: 4081; Lenton et al. (2018), Earth-Sci. Rev. 178: 1. An Ordovician rise is supported by Edwards et al. (2017), Nat. Geosci. 10: 925.
- **Fossil charcoal** from ~420 Ma on needs at least ~15% (Glasspool & Scott 2010, Nat. Geosci. 3: 627; Belcher & McElwain 2008, Science 321: 1197).
- **The ~30% peak** at 300–285 Ma is held flat rather than spiked; models agree on 25–30% around 300 Ma (Krause et al. 2018; GEOCARBSULF, Berner 2009, Am. J. Sci. 309: 603).
- **Mesozoic and Cenozoic.** Models disagree by ±5 percentage points. The curve takes the middle of the model and charcoal estimates and declines gently to today. Ice-core air shows a 0.7% relative decline over the last 800,000 years (Stolper et al. 2016, Science 353: 1427).

### Carbon dioxide

CO₂ is given in parts per million. The Life panel draws it on a log axis, because it spans nearly four orders of magnitude.

- **66 to 3 Ma** follow the community proxy synthesis of the CenCO2PIP Consortium (2023), Science 382: eadi5177. The PETM rises from roughly 900 to 2,000 ppm (Gutjahr et al. 2017, Nature 548: 573; Tierney et al. 2022).
- **The last 800,000 years** come from Antarctic ice cores (Bereiter et al. 2015, Geophys. Res. Lett. 42: 542), with the deglacial rise after Marcott et al. (2014), Nature 514: 616. As with temperature, 2.58–0.19 Ma shows the cycle mean.
- **Today.** 280 ppm before industry; 427 ppm is the 2025 annual mean at Mauna Loa (Scripps/NOAA record).
- **420 to 66 Ma** follow the multi-proxy compilation of Foster, Royer & Lunt (2017), Nat. Commun. 8: 14845, as updated and averaged by stage in Judd et al. (2024). One plant-based estimate puts the Early Devonian far lower, at ~500–700 ppm (Dahl et al. 2022, Nat. Commun. 13: 7616). Eruptive spikes are added:
  - the end-Permian, ~430 → ~2,500 ppm (Wu et al. 2021, Nat. Commun. 12: 2137);
  - the end-Triassic, a doubling with each CAMP pulse (Schaller et al. 2011, Science 331: 1404; McElwain et al. 1999);
  - the Toarcian (McElwain, Wade-Murphy & Hesselbo 2005, Nature 435: 479).
- **539 to 420 Ma** have no reliable proxies. Carbon-cycle models give several thousand ppm (GEOCARBSULF, Berner 2006, Geochim. Cosmochim. Acta 70: 5653; COPSE, Lenton et al. 2018), while the few proxies are far lower. The curve is drawn as a decline from ~4,000 to ~1,500 ppm. Low confidence.
- **The Precambrian** is order of magnitude only.
  - Tens of thousands of ppm are needed to offset the faint young Sun (Krissansen-Totton et al. 2018).
  - Ancient soils give ~10,000–150,000 ppm at 2.7 Ga, falling to several thousand by 1.8 Ga (Kanzaki & Murakami 2015, Geochim. Cosmochim. Acta 159: 190).
  - Calcified cyanobacteria cap it at ~3,600 ppm at 1.2 Ga (Kah & Riding 2007, Geology 35: 799).
  - A snowball needs a few hundred ppm to start and 10,000–100,000 ppm to end (Abbot et al. 2012, Geophys. Res. Lett. 39: L20711; Hoffman et al. 2017). The curve rises to 20,000 ppm under the ice.
- **The Hadean** atmosphere after the magma ocean was probably dominated by CO₂, of order 100 bar (Zahnle et al. 2007). It is drawn as 900,000 ppm and drawn down into carbonate over a few hundred million years. Model-based.

## Planet state: `planet.js`

These slow, planet-wide variables give each moment its context. They deserve different amounts of trust:

- **Close to measurement:** sea level in the Phanerozoic, day length and the brightness of the Sun.
- **Editorial weights from 0 to 1:** magma, ocean chemistry, plant cover and grassland. They turn a well-dated sequence of events into something a renderer can blend. The timing comes from the literature; the weights are judgement calls.

### Magma and water

- **Magma** is the fraction of the surface that is molten. The Moon-forming impact (~4.51 Ga, Barboni et al. 2017) melts whatever crust existed. The magma ocean probably froze within a few million years (Elkins-Tanton 2008; Zahnle et al. 2007), but here it fades over ~100 million years so that it can be seen. It is gone before the oldest zircon (4404 Ma, Wilde et al. 2001), which needs solid crust. While more than 5% of the surface is molten, roughly the first 120 million years, the climate word reads "Magma ocean".
- **Water** is how much of the non-continental surface is liquid ocean. The oceans rain out once the surface cools below ~374 °C, above which water cannot be liquid at any pressure (Zahnle et al. 2007); in the temperature curve that happens at ~4423 Ma. Liquid water was interacting with crust by 4.4–4.3 Ga (Wilde et al. 2001; Valley et al. 2002, Geology 30: 351).

### Ocean chemistry

The file weights three ocean regimes: ferruginous (anoxic and iron-rich), euxinic (anoxic and sulfidic) and oxygenated. The weights order and date the regimes; they do not measure them.

- Iron-rich seas last until the Great Oxidation, and the deep ocean stays mostly iron-rich long after (Planavsky et al. 2011, Nature 477: 448; Lyons et al. 2014).
- Sulfidic water appears along continental margins by ~1.84 Ga (Canfield 1998, Nature 396: 450; Poulton, Fralick & Canfield 2004, Nature 431: 173).
- Iron-rich water dominates again in the later Neoproterozoic (Canfield et al. 2008, Science 321: 949).
- The deep ocean is lastingly oxygenated only in the Devonian (Sperling et al. 2015, Nature 523: 451; Dahl et al. 2010, PNAS 107: 17911).
- Small sulfidic bumps mark the best-documented anoxic events: the Kellwasser, Hangenberg, end-Permian (Grice et al. 2005, Science 307: 706), end-Triassic, Toarcian, OAE 1a and OAE 2 (Jenkyns 2010, Geochem. Geophys. Geosyst. 11: Q03004).

### Plants

- **Vegetation** is the share of ice-free land carrying plant cover; today it is about 0.78. The fractions between the dated steps are editorial. The dated steps are:
  - the first land-plant spores, ~470 Ma (Rubinstein et al. 2010), with molecular clocks allowing a Cambrian origin (Morris et al. 2018, PNAS 115: E2274);
  - Cooksonia-grade plants, ~430 Ma;
  - the Rhynie chert, 407 Ma;
  - the first forests in the Middle Devonian: the oldest known, ~390 Ma, in the Hangman Sandstone of SW England (Davies, McMahon & Berry 2024, J. Geol. Soc. 181: jgs2023-204), then Cairo and Gilboa, New York, ~386–385 Ma (Stein et al. 2020, Curr. Biol. 30: 421);
  - the coal forests;
  - the rainforest collapse, ~305 Ma (Sahney, Benton & Falcon-Lang 2010, Geology 38: 1079);
  - the end-Permian loss of forests and the Early Triassic "coal gap" (Retallack, Veevers & Morante 1996, GSA Bull. 108: 195);
  - flowering plants taking over between ~100 and 70 Ma;
  - forests at both poles in the Eocene;
  - deserts spreading in the Pleistocene glacials.
- **The K–Pg fern spike**, when the forest canopy was lost for years to millennia (Vajda, Raine & Hollis 2001, Science 294: 1700), is drawn ~0.3 million years wide so that it registers at all.
- **Grassland** is the share of vegetated land that is open grassland; today it is about 0.4. Grass-dominated habitats appear from the late Oligocene and early Miocene, and tropical C4 grasslands expand between ~8 and 3 Ma (Strömberg 2011; Cerling et al. 1997; Edwards et al. 2010).

### Day length

The Moon's tides slow Earth's spin. The curve passes through these anchors; between them it is a smooth guess, and before 3.2 Ga it rests on models only.

| Age | Day length | Source |
|---|---|---|
| Just after the Moon-forming impact | ~5 h | canonical impact models |
| 3.2 Ga | ~13 h | Eulenfeld & Heubeck (2023), J. Geophys. Res. Planets 128: e2022JE007466 |
| 2.46 Ga | ~17 h | Lantink et al. (2022), PNAS 119: e2117146119 |
| ~2–1 Ga | a stall near 19 h | Mitchell & Kirscher (2023), Nat. Geosci. 16: 567 |
| 1.4 Ga | 18.7 h | Meyers & Malinverno (2018), PNAS 115: 6363 |
| ~620 Ma | 21.9 ± 0.4 h | Williams (2000), Rev. Geophys. 38: 37 |
| Devonian | ~22 h (~400 days a year) | Wells (1963), Nature 197: 948 |
| Latest Cretaceous | 23.5 h | de Winter et al. (2020), Paleoceanogr. Paleoclimatol. 35: e2019PA003723 |

The Life panel turns hours into days per year, which is ~400 at 444.6 Ma.

### The Sun

The Sun's brightness follows standard solar evolution (Gough 1981, Solar Physics 74: 21): L = 1 / (1 + 0.4 · (1 − t / 4.57 Gyr)), where t is the Sun's age. That gives 71.6% of today's brightness at 4.54 Ga, 82% at 2.5 Ga and 95.5% at 540 Ma: the "faint young Sun".

### Sea level

Sea level is in meters relative to today, and is known only for the Phanerozoic. Before 538.8 Ma the curve is 0 by construction, which is a placeholder, not a measurement; the Life panel shows "no reliable record". The curve shows long-term, million-year trends. Magnitudes before the Cenozoic are uncertain by at least ±50 m, and the stratigraphic estimates used sit at the high end of the range.

- **Paleozoic:** Haq & Schutter (2008), Science 322: 64. The Hirnantian fall uses Brenchley et al. (2006), Geol. J. 41.
- **Triassic and Jurassic:** Haq (2018), GSA Today 28(12): 4 and 28(1): 4.
- **Cretaceous:** Haq (2014), Glob. Planet. Change 113: 44. Lower estimates for the Late Cretaceous come from Miller et al. (2005), Science 310: 1293, and Müller et al. (2008), Science 319: 1357. The descent from the Turonian peak partly reflects the change of method between sources.
- **Cenozoic:** the smoothed ice-volume record of Miller et al. (2020), Sci. Adv. 6: eaaz1346 (data: PANGAEA, doi:10.1594/PANGAEA.923139). Its Paleocene values are not followed.
- **Mid-Pliocene:** the warm peaks of ~+15 m are a liberty (+5 to +25 m: Dumitru et al. 2019, Nature 574: 233; Miller et al. 2012, Geology 40: 407).
- **The last glacial cycle:**
  - +5.5 to +9 m in the Last Interglacial (Dutton & Lambeck 2012, Science 337: 216);
  - −125 m at the Last Glacial Maximum (Clark et al. 2009, Science 325: 710; Lambeck et al. 2014, PNAS 111: 15296);
  - the deglacial rise after Lambeck et al. (2014).

### Climate state

The one-word climate state is read from the ice first and from the temperature second. Temperature alone cannot tell an icehouse from a greenhouse: with a supercontinent parked on the pole, ice sheets grew at global means well above today's. The thresholds follow the PhanDA climate states of Judd et al. (2024):

| State | Global mean |
|---|---|
| Coldhouse | below 18 °C |
| Coolhouse | 18–22 °C |
| Transitional and warmhouse | 22–28 °C |
| Hothouse | 28 °C and above |

The words shown are Magma ocean, Snowball, Icehouse, Cool, Greenhouse and Hothouse.

## Ice: `glaciation.js`

What is taken from the literature is when there was ice, in which hemisphere, and roughly how far it got. The extents themselves are schematic. One latitude per hemisphere cannot describe a real ice sheet; in the last ice age Canada was buried while Siberia at the same latitude was bare. Sea ice and ice sheets are kept apart, because they behave differently: at the Last Glacial Maximum the Laurentide sheet reached ~40° N while year-round sea ice stayed mostly north of ~60° N.

| Interval | Ice drawn | Sources | Liberty |
|---|---|---|---|
| Pongola, ~2.9 Ga | modest caps at both poles | Young et al. (1998), J. Geol. 106: 523 | extent and hemisphere unknown; widened to ~0.1 Gyr |
| Huronian, ~2.43–2.22 Ga | ice to middle latitudes, both hemispheres | Gumsley et al. (2017), PNAS 114: 1811; Rasmussen et al. (2013), EPSL 382: 173 | drawn as one continuous era |
| Sturtian snowball, ~717–659 Ma | ice sheets on all land; sea ice to within 10° of the equator | Macdonald et al. (2010), Science 327: 1241; Rooney et al. (2015), Geology 43: 459; Hoffman et al. (2017), Sci. Adv. 3: e1600983 | freeze and thaw each drawn over ~5 Myr |
| Marinoan snowball, ≤ 649.9–~635 Ma | as the Sturtian | Prave et al. (2016), Geology 44: 631; Condon et al. (2005), Science 308: 95; Hoffman et al. (2017) | as the Sturtian |
| Gaskiers, 579.9–579.6 Ma | middle- to high-latitude ice | Pu et al. (2016), Geology 44: 955 | widened to ~4 Myr |
| Late Ordovician (Hirnantian) | southern only: Gondwana lay over the South Pole | Finnegan et al. (2011), Science 331: 903; Le Heron & Craig (2008), J. Geol. Soc. 165: 19; Díaz-Martínez & Grahn (2007), Palaeogeogr. Palaeoclimatol. Palaeoecol. 245: 62 | — |
| Late Paleozoic Ice Age, ~360–255 Ma | southern only | Fielding, Frank & Isbell (2008), GSA Spec. Pap. 441; Isbell et al. (2012), Gondwana Res. 22: 1; Montañez & Poulsen (2013), Annu. Rev. Earth Planet. Sci. 41: 629 | — |
| Antarctic ice sheet, from 33.9 Ma | ice sheet and a ring of sea ice that widens in glacials | Zachos et al. (2001), Science 292: 686; Miller et al. (2020); Gersonde et al. (2005), Quat. Sci. Rev. 24: 869 | — |
| Northern Hemisphere ice, from the Miocene | sea ice, then lasting ice on Greenland from ~7 Ma (episodic glaciers there since the late Eocene), then large sheets from ~2.7 Ma | Larsen et al. (1994), Science 264: 952; Eldrett et al. (2007), Nature 446: 176; Haug et al. (2005), Nature 433: 821; Clark et al. (2009); Dyke (2004), Dev. Quat. Sci. 2: 373 | 2.58–0.19 Ma shows the cycle mean; the penultimate deglaciation is drawn ~18,000 years long (really ~7,000) |

On top of the named intervals, a small polar cap appears whenever the global mean falls below 18 °C; the same radius is applied to the sea-ice and the land-ice edge. The threshold follows Scotese et al. (2021) and the "coldhouse" state of Judd et al. (2024); in practice it only adds a northern cap, reaching up to 9° from the pole, during the Late Paleozoic Ice Age.

## Tectonic activity: `seismicActivity.js`

This is a qualitative, editorial index from 0 (quiet) to 1 (planet-wide upheaval). It has no unit, because nobody can count ancient earthquakes. It tracks how vigorously plates were colliding and rifting, as far as the rock record shows. The Life panel reads it in five bands: Low (< 0.2), Moderate, Active (today's 0.55), High and Extreme (≥ 0.8). The heights of the peaks relative to each other are a judgement call. What shapes it:

- A hotter early mantle and a waning rain of impacts. How Archean crust moved is debated.
- The surge of crust formation at ~2.7 Ga, the largest peak in the zircon age record (Condie & Aster 2010, Precambrian Res. 180: 227).
- A magmatic lull at ~2.45–2.2 Ga (Condie, O'Neill & Aster 2009, EPSL 282: 294; Spencer et al. 2018, Nat. Geosci. 11: 97).
- The supercontinent cycle (Mitchell et al. 2021, Nat. Rev. Earth Environ. 2: 358): Nuna (Zhao et al. 2002, Earth-Sci. Rev. 59: 125), Rodinia (Li et al. 2008, Precambrian Res. 160: 179), Gondwana and Pangaea.
- The mid-Proterozoic quiet (Tang et al. 2021, Science 371: 728; Cawood & Hawkesworth 2014, Geology 42: 503). It is the low point of the curve, which reads "Moderate".
- Flood basalts that erupted as continents split, drawn as short spikes. Their ages are from Ernst (2014), Large Igneous Provinces, Cambridge Univ. Press: Franklin, the Central Atlantic, Karoo–Ferrar, Paraná–Etendeka, Deccan and the North Atlantic. Flood basalts erupted inside a plate, such as the Siberian Traps and Emeishan, are not counted, because the index is about plates, not volcanism.

## Estimated species count: `biodiversity.js`

This is an illustrative, log-scale index of how many eukaryote species (animals, plants, fungi, protists) were alive. It is not a published reconstruction.

What is real:

- **The end point.** Mora et al. (2011), PLoS Biol. 9: e1001127, estimate about 8.7 million eukaryote species today, give or take 1.3 million. That is an estimate of the total, not a catalogue: about 2.2 million species are catalogued today (Catalogue of Life 2025; ~1.2 million when Mora et al. wrote). Bacteria and archaea are not counted.
- **The shape after 540 Ma.** It follows the marine genus curves of the fossil record (Sepkoski 2002, Bull. Am. Paleontol. 363; Alroy et al. 2008, Science 321: 97), with life on land added on top.
- **The falls at the Big Five.** Each is as deep as the toll on the extinction card, and each happens at the event's date.

What is not real is the absolute numbers before the present. Until the first communities of large organisms, about 574 million years ago, no count is offered at all: the Life panel prints "none", "microbes only" or "mostly microbes" instead of a number.

## Continents and plates: `continents.js`

The land comes from two regimes behind one function (`getPolygonsAtTime` in `js/engine/interpolator.js`).

**From today back to 540 Ma: rigid plates.** Real present-day coastlines are cut into 31 tectonic plates and smaller blocks (126 rings of coastline). Each piece is turned rigidly on the sphere between keyframes, so nothing wobbles while it drifts. The present-day map is simply every plate at rest, and the old supercontinents become jigsaws of recognizable pieces.

- **Coastlines.** They come from Natural Earth 1:110m "land", v5.1.2 (naturalearthdata.com), which is public domain. They were simplified with Douglas–Peucker and rounded to 0.1°. Mauritius and the Galápagos are too small for the source data, so they were drawn by hand, because famous island endemics need somewhere to stand.
- **Recent plate motions.** Those of the last 66 million years were tuned by hand against Scotese- and Blakey-style maps.
- **Older plate motions.** From 80 to 540 Ma they are sampled from the full-plate model of Merdith et al. (2021), "Extending full-plate tectonic models into deep time", Earth-Sci. Rev. 214: 103477 (model files: doi:10.5281/zenodo.10346399), in its paleomagnetic frame. Small adjustments make the hand-tuned and model eras join smoothly and close the gaps between sutured coastlines.
- **Cut lines.** The lines that cut modern landmasses into blocks follow sutures but are schematic. Some are deliberately generous where a plate really does continue beneath its neighbor: "Greater India" runs on under Tibet, so India stays in contact with Asia until ~50 Ma before pulling away.

**Before that: schematic outlines.** One outline per continent and time slice, morphed from one slice to the next; the first morph hands the 570 Ma outlines over to the plates at 540 Ma.

- The outlines at 570, 600, 750, 900, 1100, 1300 and 1600 Ma are traced from Cao et al. (2024), "Earth's tectonic and plate boundary evolution over 1.8 billion years" (doi:10.5281/zenodo.11536686).
- Those at 2200, 2700, 3100 and 4000 Ma are drawn by hand after published syntheses, such as Zhao et al. (2002) and Evans & Mitchell (2011) for Nuna. They are conjectural, and the names say so ("Kenorland (conjectural)").
- No land exists before 4.4 Ga, the age of the oldest Jack Hills zircons; the first crust then grows from nothing.
- Fossil sites, milestone places and extinction epicentres are given in present-day coordinates and ride their plates back in time. Through the deep-time morphs each keeps its place within its changing continent, so a site on land stays on land. Where continents merge, a site normally follows whichever parent's piece of the merged outline it sits in. That choice is geometric, not geological, so the three oldest named regions are pinned to the lineage the reconstructions give them (`cratonLineages` in `continents.js`): Kaapvaal (Pongola) rides Kalahari, Ur and Vaalbara; the Pilbara and Yilgarn sites ride Ur and Vaalbara; and Franceville rides the Congo craton. Kaapvaal and Pilbara forming one Archean craton, Vaalbara, follows Zegers, de Wit, Dann & White (1998), Terra Nova 10: 250.

## Plate boundaries: `plateBoundaries.js`

Ridges, trenches, collision belts and transform faults appear when the Plates layer is switched on (it is off by default). Each line is described once, attached to the plates of `continents.js`, with the interval in which it existed, and rides the continents: trenches stay on their margins and ridges in the middle of their oceans.

- **Present day.** Bird (2003), "An updated digital model of plate boundaries", Geochem. Geophys. Geosyst. 4(3): 1027 (PB2002), simplified to ~0.5° (ridges ~0.9°): the full Mid-Atlantic Ridge, the Indian Ocean ridges, the East Pacific Rise, the Ring of Fire, the Alpine–Himalayan collision belt and the great transform faults.
- **History.** Textbook tectonics (Scotese; Torsvik & Cocks 2017; Domeier & Torsvik 2014; Cawood 2005), checked against the continental model itself. A line's span follows when the model's blocks actually meet or part, not a book's date, so a line never contradicts the drawn geography. In this model, for example, Avalonia reaches Baltica only at ~330 Ma and Iberia never leaves Africa.
- **What is schematic.** Before ~180 Ma open-ocean ridges are placed along the widest open ocean, because no seafloor that old survives. The Philippine Sea and Caribbean plates are not in the continental model, so their trenches only approximate their Cenozoic migrations. Before ~540 Ma every line is drawn on the schematic continents and is conjectural; Archean and Paleoproterozoic lines say so in their names and are drawn fainter.
- **Before 3.2 Ga** no boundaries are drawn: plate tectonics in the modern sense is not evident before ~3.2–3.0 Ga, the oldest subduction-like signatures in the Kaapvaal and Pilbara cratons.

## Place names and events: `paleogeography.js`

The names of vanished oceans and continents, the great events that shaped the surface, and the routes by which people (and a few famous animal groups) spread. The content comes from a researched catalogue of 458 works that records an age, coordinates and a confidence for every entry.

- **Ocean names (27).** The superocean of each age hands over in place: the Hadean, Archean and Proterozoic oceans, then Mirovia, Panthalassa and the Pacific. Around them are the oceans that opened and closed: Mozambique, Iapetus, Tornquist, Proto-Tethys, Paleo-Asian, Rheic, Ural, Paleo-Tethys, Mongol–Okhotsk, Neo-Tethys and Tethys, then the Atlantic, Indian, Arctic and Southern Oceans and a few seas. Sources: Torsvik & Cocks (2017), *Earth History and Palaeogeography*; Metcalfe (2013) and Stampfli & Borel (2002) for the Tethyan oceans; Domeier (2016) and Nance et al. (2012) for Iapetus and Rheic.
- **Land names (18).** Names that are not one landmass's own: Vaalbara, Kenorland, Columbia, Rodinia, Gondwana, Laurussia, Pangaea, Laurasia, Cimmeria, Laramidia, Appalachia, Zealandia, and old names with a "future …" subtitle (Laurentia, "future North America").
- **Events (90).**
  - 25 large igneous provinces (Ernst 2014, *Large Igneous Provinces*), dated after Burgess & Bowring (2015) for the Siberian Traps, Blackburn et al. (2013) for the Central Atlantic province and Schoene et al. (2019) for the Deccan.
  - 22 impacts, aged after Schmieder & Kring (2020), Astrobiology 20, and Renne et al. (2013) for Chicxulub.
  - 18 mountain-building episodes, from the Trans-Hudson to the Himalaya.
  - 20 ocean gateways and land bridges: Drake Passage, Panama (O'Dea et al. 2016), the Messinian crisis (Krijgsman et al. 1999), Beringia and others.
  - 5 others: two ice sheets, the East African Rift, Yellowstone and Toba.
- **Routes (21).** Ten routes of our own species: out of Africa to Australia, across Asia, into Europe, into the Americas (Monte Verde at 14.5 ka), and the Austronesian and Polynesian voyages to Madagascar, Hawaiʻi, Rapa Nui and Aotearoa. Sources: Iasi et al. (2024), Clarkson et al. (2017), Higham et al. (2014), Waters et al. (2020), Dillehay et al. (2008), Wilmshurst et al. (2011), Anderson et al. (2018). Four routes of *Homo erectus*, after Lordkipanidze et al. (2013) and Zhu et al. (2008, 2018). Seven animal journeys, including the Great American Biotic Interchange (Woodburne 2010; Carrillo et al. 2020).

What is editorial is the placement. Each ocean name sits at the point of its water body farthest from any coast, follows the continents around it, and keeps clear of the other names. Land names sit near the middle of the assembled landmass. Older events ride the continent their site is carried to. A few lifespans are shortened so that no more than seven ocean names crowd the map at once.

What is not drawn: inland seas and ice-age shelf land, because the continent model does not draw them. So the Western Interior Seaway, the Turgai Strait, Beringia, Sundaland, Sahul and Doggerland appear as gateway events rather than as water or land. Hypothetical continents the model does not draw (Pannotia, Arctica, Atlantica) are not named. The Holocene voyages unfold in a fraction of a second at 1×: that is the time warp, not the data.

## From data to pictures

The planet's colors come from [`planetLook.js`](../js/util/planetLook.js). Art direction picks the colors; the data picks the timing:

- magma glows while `getMagmaFraction` says the surface is molten;
- seas shift from iron-rich green to oxygenated blue with the ocean-chemistry weights;
- land greens only with the vegetation curve, and grass only with the grassland curve;
- ice sits where `getGlaciation` puts it;
- climate belts slide with the temperature curve.

The colors are an artist's reading of the reconstructions, not what an observer would have seen.

## Known simplifications and uncertainties

### Contested dates

Many first appearances in the story are argued over. The data takes one defensible value and the text hedges it:

- **The oldest life.** Isua graphite at 3.7 Ga, with older claims only mentioned as disputed hints.
- **Oxygen-making photosynthesis.** The milestone sits at 2.95 Ga ("the timing is debated"). The cyanobacteria entry starts at a conservative, contested 2.7 Ga.
- **The oldest eukaryotes.** The entry is anchored on Grypania at 1.87 Ga, which may be a giant bacterium; unmistakable eukaryote fossils appear by ~1.65 Ga.
- **The Francevillian biota (2.1 Ga).** Their nature is disputed.
- **The first animals.** Molecular clocks put them at 800–650 Ma; the sponge biomarkers are disputed; body fossils appear from ~575 Ma.
- **Later firsts.** The first dinosaurs (Nyasasaurus, 243 Ma, a candidate only), the first mammals (225 Ma, debated), the oldest whales and the oldest songbirds are all argued over.
- **The Moon-forming impact.** It is shown as 4.5 Ga; estimates run from ~4.51 to ~4.43 Ga.
- **Plate tectonics.** When it began is a live debate; the text says "probably" by ~3 Ga.
- **The time scale itself.** The ICS chart marks 720 and 635 Ma as approximate.

### The Late Heavy Bombardment

Moon rocks once suggested a sudden storm of impacts about 3.9 billion years ago. Many scientists now see a long, slow decline of the impacts left over from planet building instead (Boehnke & Harrison 2016). The app says exactly that in the milestone "A battered young planet". No impact spike is drawn in any curve: the temperature and tectonic curves simply wane through the early Archean.

### Ediacaran affinities

What the first large organisms were is still unsettled.

- **Their place in the tree.** The Ediacaran biota is drawn as a stem branch of animals, tied with the sponges, with its position unresolved. That implies a long ghost lineage from 750 Ma to the first fossils at 574 Ma.
- **Dickinsonia** is read as an animal on the strength of its cholesterol (Bobrovskiy et al. 2018).
- **Kimberella** counts as the oldest well-documented bilaterian, possibly an early relative of the molluscs. It is placed on "bilaterians", not on the molluscs.
- **Spriggina and Tribrachidium** stay on the Ediacaran node.
- **The cnidarian entry** rests on two debated fossils.
- **Dates.** The Ediacara Member has no radiometric date, so its fossils are dated by correlation.
- **The White Sea–Nama loss** of ~80% of genera (Evans et al. 2022) is labeled "possibly the first mass extinction of animals".

### Snowball Earth: how long, and how frozen

- **How long.** The Sturtian lasted ~717–659 Ma, some 57 million years, and the Marinoan ~650–635 Ma.
- **How fast.** The real freezes and thaws took thousands of years. The app spreads each over ~5–6 million years so that the ice edge and the colors move across many animation frames.
- **How frozen.** Ice sheets cover all land and sea ice is drawn to within 10° of the equator. Whether a belt of open tropical water survived is still debated (Hoffman et al. 2017), and the app does not decide it. The −35 to −25 °C global means sit at the warm end of hard-snowball models, which span roughly −50 to −20 °C.
- **The thaw.** The 30 °C greenhouse after each thaw rests on one coupled model.
- **The Huronian.** It is drawn as one long cold era, although it was three or four glaciations, and whether one of them reached the tropics as a true snowball is not shown.

### Deep-time CO₂

Before the Devonian, CO₂ is the weakest curve in the app.

- The Hadean's 900,000 ppm and the Archean's tens of thousands of ppm come from models of what was needed to keep the oceans liquid under a faint Sun, checked against a few ancient soils and fossils. They are right to an order of magnitude at best.
- Between 539 and 420 Ma, models (several thousand ppm) and the few proxies (~500–1,000 ppm) differ about fivefold; the curve is a compromise.
- Even in the Early Devonian, estimates differ by a factor of three.

### Temperatures: one ruler, running warm

- The Phanerozoic curve uses one framework (PhanDA), which reads warm in hothouses. Treat its peaks as the warm end of current estimates.
- Precambrian temperatures encode states (frozen, temperate, hot), not measurements.
- Pleistocene ice-age cycles are averaged before 190,000 years ago.

### Schematic deep-time continents

Real coastlines on rigid plates reach back only as far as the plate model does, and even there the positions are one published model's reading of the paleomagnetic and geological record. Before that, the continents are simplified shapes, traced from or drawn after published reconstructions and morphed between key times. Their outlines, positions and the timing of splits and collisions are approximate. The oldest are informed conjecture: Kenorland and Ur, for two, may never have existed as single landmasses, and the data labels them "(conjectural)". Place names and labels in deep time are only as good as the shapes under them.

### Fossil-site positions

Each marker starts from a real fossil locality given in modern coordinates. It is carried back in time on the plate the locality sits on today: exactly within the rigid-plate reconstruction, and approximately further back, where the point rides the continents its plate descends from, keeping its place within each outline as the shapes change. Which ancestral continent a site rides is a matter of the slices' geometry, except for the three oldest named regions, which follow their cratons (Kaapvaal, Pilbara–Yilgarn and Congo; see "Continents and plates").

The marker is then settled on the right surface. Marine organisms are placed in the sea just off the nearest shore, since most marine fossil sites are on land today. Everything else is placed a little inland. Organisms that share a site are fanned into a small cluster. A marker therefore shows roughly where those rocks lay on the ancient world. It is not the organism's range, and one locality stands for a group that may have lived worldwide.

### Abundance profiles are editorial

Prominence (`abundanceProfile`) is a storytelling aid drawn by hand, not a count of individuals, biomass or species. It decides the "Dominant life" ranking, the life-group share bar and the size of the markers. A big marker means "important to the story at this moment", not "common".

### The pacing is editorial

Time does not run at a constant rate: eventful periods get more screen time.

- The whole Precambrian, 88% of Earth's history, gets a third of the story's six minutes.
- The extinction windows and milestone windows are sized for reading time, not for how long things took.
- The 6-second hold at each mass extinction is a pause for the viewer, not a feature of the rock record.

### Other placeholders

- Sea level before the Cambrian is unknown, and is shown as "no reliable record".
- The species count before ~574 Ma is shown in words.
- The tectonic index has no unit.
- "Today" in every curve is the mid-2020s: 427 ppm CO₂ and 15.1 °C.

## Attribution

### Natural Earth

The present-day coastlines of the plates are derived from [Natural Earth](https://www.naturalearthdata.com/) 1:110m land data (v5.1.2). Natural Earth is in the public domain: no permission is needed to use it and no credit is required. We credit it gladly: *Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.*

### Plate model and deep-time outlines

Two published datasets that the continents rely on are licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), which requires this credit. The app uses both in adapted form: sampled at intervals, adjusted to fit, and simplified.

- Older plate rotations are sampled from the model files of Merdith et al. (2021), "Extending full-plate tectonic models into deep time", Earth-Science Reviews 214: 103477 (doi:10.5281/zenodo.10346399).
- Deep-time continent outlines are traced from Cao et al. (2024), "Earth's tectonic and plate boundary evolution over 1.8 billion years" (doi:10.5281/zenodo.11536686).

## Corrections to earlier versions of this page

This page was rewritten in 2026 for the rebuilt app, and an independent science audit found two errors in the earlier version:

- **Extinction percentages.** They were attributed to Raup & Sepkoski (1982). That paper identified the Big Five from family-level extinction rates and contains none of the percentages. The numbers were the marine-species estimates tabulated by Barnosky et al. (2011), Table 1, after Jablonski (1994). The end-Permian figure has since changed from 96% to 90% (range 81–94%), as explained above.
- **Temperature.** The curve was attributed to "Scotese & Wright (2018), PALEOMAP Paleotemperature Summary". Scotese & Wright (2018) is an elevation dataset, the PALEOMAP Paleodigital Elevation Models. The curve now follows PhanDA (Judd et al. 2024) and is compared with Scotese et al. (2021).

## Changing a number

Edit the data file, and keep its comment block's source note in step with the change. Then run `node scripts/validate-data.mjs` and update this page. The validator checks shape, cross-references and the project-wide canonical numbers, but not scientific truth. The rules it applies to each field are listed in [data-schema.md](data-schema.md).
