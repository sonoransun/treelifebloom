# Data schema

This is a field-by-field reference for every hand-curated data module under [`js/data/`](../js/data/). Each section gives the module's exports, the meaning, type and unit of each field, a real entry copied from the data, and the rules that [`scripts/validate-data.mjs`](../scripts/validate-data.mjs) enforces. Where the numbers come from is covered in [data-sources.md](data-sources.md).

The data files are plain ES modules with no build step. Edit one, reload the page, and run the validator.

## Conventions shared by every file

### Time and windows

- **Time is in Ma**, millions of years ago, so larger means older. 0 is the present, which every curve takes to be the mid-2020s. 0.0117 Ma is 11,700 years ago. The story runs from 4540 Ma (`TIMING.startTimeMa` in [`config.js`](../js/config.js)) to 0.
- **Spans own their start, not their end.** A timeline row or a chapter covers `[startMa, endMa)`. A time exactly on a boundary belongs to the row or chapter that begins there.
- **Windows are centered on the date.** Mass extinctions, crises and milestones are active over `timeMa ± durationMa / 2`, edges included. `progress` runs from 0 at the older (leading) edge to 1 at the younger edge.

### Curves

- A curve is `[[Ma, value], …]`, oldest first, with Ma strictly descending.
- It is read with straight-line interpolation (`interpolateFromCurve` in `atmosphere.js`). Values are held constant beyond both ends.
- The last knot should sit at 0 Ma.

### Places

- **Coordinates are degrees**, east and north positive. Species use `{ lat, lon }`; everything else uses `[lon, lat]` pairs or `{ lon, lat }`.
- **A place with a `plateId` is in modern coordinates.** The engine carries it back in time on that plate, or on the smaller block of that plate it actually lies on (`plateToWorld` in `js/engine/interpolator.js`).
- **Valid plate ids.** The validator accepts these anchor plates: `north_america`, `greenland`, `south_america`, `eurasia`, `india`, `arabia`, `africa`, `madagascar`, `australia`, `new_zealand`, `antarctica`.

### Colors and ids

- **Colors** are `#rrggbb` strings.
- **Ids are stable keys** that other files, deep links and saved URLs depend on. Never rename one casually.
  - Species, clade and milestone ids must be snake_case (`[a-z0-9_]+`).
  - Extinction and crisis ids are kebab-case by convention (`end-permian`).

### Canonical numbers

Several values are fixed project-wide so that the files agree. The validator holds them in `CANON_PERIODS`, `CANON_ERAS`, `CANON_EXTINCTIONS`, `CANON_CATEGORIES`, `PLATE_IDS` and `ERA_FILES`; change them there and in the data together, never in one place only. They are:

- the timeline boundaries;
- the six title-card eons and eras;
- the dates of the Big Five;
- the life-group category ids;
- the anchor plates;
- the split of the species files.

### Text lengths

Exceeding these limits is a warning, not an error:

| Text | Limit (characters) |
|---|---|
| species `description` | 70 |
| species `descriptionLong` | roughly 250–520 (warned below 225 or above 572) |
| clade `name` / `description` | 24 / 150 |
| timeline row `description` / each `context` line | 60 / 120 |
| timeline row `abbr` | 4 printable ASCII characters |
| ERAS `tagline` | 70 |
| extinction `description` / `causeShort` | 150 / 70 |
| crisis `description` | 200 |
| milestone `description` | 240 |
| chapter `title` / `blurb` | 32 / 110 |

## Running the validator

```sh
node scripts/validate-data.mjs                  # every check; exit code 1 if there is any ERROR
node scripts/validate-data.mjs --strict         # warnings count as errors, and the optional modules
                                                # (phylogeny, chapters, paleogeography, planetLook,
                                                # the capture catalogue) must exist
node scripts/validate-data.mjs --only=species,phylogeny
node scripts/validate-data.mjs --quiet          # only problems and the summary
```

The sections are `timeline`, `phylogeny`, `species`, `extinctions`, `milestones`, `chapters`, `curves`, `geometry`, `capture` (the capture catalogue, [`scripts/capture/sequences.js`](../scripts/capture/sequences.js)) and `imports` (every named import between app modules must exist). An unknown argument or section name is a usage error and exits with code 2. Naming a section with `--only` also prints its long tables, such as the milestone timetable.

Each line of output is one of three kinds:

- `ERROR`: the app would break, or the data contradicts a contract or a canonical number.
- `warn`: an authoring rule (text length, pacing, coverage) is not met.
- `·`: information.

A broken module fails only the checks that depend on it, and the rest still run.

At the time of writing the full run reports 0 errors and 1 warning. The warning is the deliberately short trigger window of the opening milestone, `earth_forms`, which the toast overlay shows at load anyway. The smoke test (`scripts/capture/smoke-test.js`, check `data.validator`) runs the validator too.

## Life groups and categories

Defined in `js/config.js` (`LIFE_GROUPS`), not in `js/data/`, but every species and clade refers to it through `category`.

There are eight hue families, listed in phylogenetic order. Each family has a marker glyph, so that color is never the only cue. Categories inside a family share the hue and differ by lightness. Do not reorder or re-color the families without re-running the palette check described in `config.js`.

| Family (`id`) | Glyph | Category ids |
|---|---|---|
| `microbes` | dot | `bacteria`, `archaea`, `protist` |
| `plants` | leaf | `alga`, `plant`, `fungus` |
| `invertebrates` | star | `invertebrate`, `mollusk` |
| `arthropods` | hex | `arthropod` |
| `fishes` | oval | `fish` |
| `reptiles` | triangle | `amphibian`, `reptile`, `marine_reptile`, `dinosaur`, `pterosaur`, `bird` |
| `mammals` | square | `synapsid`, `mammal` |
| `primates` | ring | `primate`, `hominin` |

`getCategoryInfo(id)` returns `{ id, label, color, group }`. Three legacy ids still render (`prokaryote` → bacteria, `eukaryote` and `event` → protist), but the validator warns on them. An unknown id falls back to a neutral gray "Other" group.

**Validator.**

- ERROR if any canonical category is missing from `LIFE_GROUPS`, or if a group lacks `id`, `label`, `glyph`, a hex `color` or `categories`.
- Warn if a group has a non-canonical category.
- Warn if no member of a life group is alive at 0 Ma.

## Species

File: [`js/data/species.js`](../js/data/species.js), aggregating [`js/data/species/`](../js/data/species/).

**Exports** (from `species.js`):

| Export | Meaning |
|---|---|
| `species` | the full array, in era-file order |
| `speciesById` | `Map` from id to entry |
| `isAlive(sp, ma)` | true when `sp.appearanceMa ≥ ma ≥ (sp.extinctMa ?? 0)`, both ends inclusive |
| `getSpeciesAtTime(ma)` | the entries alive at `ma`, each copied with a `currentAbundance`, sorted by abundance (descending) and then by id, so the ranking never flickers between frames |
| `interpolateAbundance(profile, ma)` | linear between knots; holds the first value before the profile and the last after it |

The views and components do not call `getSpeciesAtTime` themselves. They read `frame.alive`, which `js/main.js` builds once per frame.

**Era files.** Entries live in four files, split by first appearance:

| File | Export | First appearance |
|---|---|---|
| `precambrian.js` | `precambrianSpecies` | older than 538.8 Ma |
| `paleozoic.js` | `paleozoicSpecies` | 538.8–251.9 Ma |
| `mesozoic.js` | `mesozoicSpecies` | 251.9–66 Ma |
| `cenozoic.js` | `cenozoicSpecies` | 66 Ma or younger |

An entry exactly on a split belongs to the younger file. An entry may stay in its file when a corrected date moves it across a split; the validator only notes it. Grasses (`grasslands`, 67 Ma) stay in `cenozoic.js` on purpose. Within a file, entries are ordered oldest first.

**Fields.** Keep them in this order:

| Field | Type | Meaning | Validator |
|---|---|---|---|
| `id` | string | Unique slug. Other files, deep links and the capture catalogue use it. | ERROR unless snake_case and unique |
| `name` | string | Display name: the plain group name ("Insects", not "First insects"); the description carries the "first". | ERROR if empty; warn if it starts with "First" or duplicates another name |
| `scientificName` | string or `null` | Taxon, or representative genus or species. | ERROR unless a non-empty string or `null`; warn on duplicates |
| `category` | string | A category id from `LIFE_GROUPS`. Sets the color, the marker glyph and the life group. | ERROR if unknown (a legacy alias only warns) |
| `clade` | string | Id of the most specific clade in `phylogeny.js`. | ERROR if not a clade, or if `appearanceMa` is older than that clade's `originMa`; missing warns (ERROR with `--strict`) |
| `appearanceMa` | number | First appearance in the fossil record, in Ma. | ERROR unless 0 < value ≤ 4540 and older than the end |
| `extinctMa` | number or `null` | Last appearance in Ma; `null` if still alive. | ERROR if negative; warn if exactly 0 (use `null`) |
| `abundanceProfile` | `[[Ma, value], …]` | Editorial prominence from 0 to 1, oldest first. | ERROR unless ≥ 2 pairs, values in 0..1, Ma strictly descending. Warn if the first point is not at `appearanceMa` or the last not at `extinctMa` (or 0), if an extinct entry's last value is above 0.1, or if every value is 0 |
| `habitat` | string | `'marine'`, `'freshwater'`, `'land'`, `'aerial'` or `'amphibious'`. Markers of marine entries are kept at sea and all others on land. | ERROR on another value; missing warns (ERROR with `--strict`) |
| `location` | `{ lat, lon }` | Modern coordinates of the locality in `fossilSite`. | ERROR if out of range; warn at exactly 0, 0 |
| `fossilSite` | string | The locality, readable ("Burgess Shale (Walcott Quarry), British Columbia, Canada"). | ERROR if present but empty; missing warns (ERROR with `--strict`) |
| `size` | string, optional | "up to 12 m long, ~8 t". Leave it out rather than writing `null` where it would be silly. | ERROR if present and not a string |
| `diet` | string, optional | "filter feeder", "photosynthesis". | ERROR if present and not a string |
| `description` | string | One-line label for the Life panel, hover card and Tree. | ERROR if empty; warn above 70 characters |
| `descriptionLong` | string | Two or three sentences for the species dialog. | ERROR if empty; warn outside 225–572 characters |

`currentAbundance` is not stored; `getSpeciesAtTime` adds it at run time. The profile is used in several places:

- the "Dominant life" ranking and the life-group share bar;
- the size of each marker on the Map, the Globe and the Tree;
- the species dialog's "Prominence over time" curve.

**Mass extinctions must visibly kill.** A victim of one of the Big Five has `extinctMa` exactly equal to that event's `timeMa`: 444.2, 372, 251.9, 201.4 or 66.

- The validator warns if fewer than four entries end exactly at an event.
- It also warns if an entry ends inside an event's window but not on its date.
- Casualties of the Hangenberg crisis end at 358.86 by the same convention, but the validator does not check it.

**Information only.** The validator also prints:

- how many entries are alive at sample times;
- leaf clades without species;
- entries alive for under 2 s of 1× playback;
- entries that never reach the Life panel's top 12.

**Example** (from `species/paleozoic.js`; Tiktaalik is a Late Devonian victim, so it ends at 372):

```js
  {
    id: 'tiktaalik',
    name: 'Tiktaalik',
    scientificName: 'Tiktaalik roseae',
    category: 'fish',
    clade: 'tetrapodomorphs',
    appearanceMa: 375,
    extinctMa: 372,
    abundanceProfile: [[375, 0.01], [374, 0.5], [373.1, 0.45], [372, 0.01]],
    habitat: 'freshwater',
    location: { lat: 77.2, lon: -86.3 },
    fossilSite: 'Fram Formation, Bird Fiord, Ellesmere Island, Nunavut, Canada',
    size: '1.25–2.75 m long',
    diet: 'predator',
    description: 'Fish-tetrapod transitional form — fins becoming limbs',
    descriptionLong: 'A predicted transitional form discovered where and when paleontologists expected — in 375-million-year-old river deposits in the Canadian Arctic. It combined a flat crocodile-like skull and a mobile neck with fins built around shoulder, elbow and wrist joints, allowing it to prop itself up in shallow, oxygen-poor water. It is the textbook example of evolution moving vertebrates toward land, though footprints from Poland hint that four-legged animals were already about.'
  },
```

## Clades

File: [`js/data/phylogeny.js`](../js/data/phylogeny.js). It drives the Tree view and the species dialog's lineage and "closest relatives".

- The validator treats it as optional; it is required with `--strict`.
- The species dialog hides its lineage sections without it.
- The Tree view imports it directly, so that view needs it.

**Exports:**

| Export | Meaning |
|---|---|
| `clades` | the array, in pre-order |
| `cladeById` | `Map` from id to clade |
| `getLineage(id)` | `[root, …, clade]`, or `[]` for an unknown id |
| `getChildren(id)` | direct children in branching order (a new array) |
| `lowestCommonAncestor(a, b)` | the deepest shared clade, or `null` |
| `divergenceMa(a, b)` | the `originMa` of the first branch below their common ancestor that separates them: 0 for the same id, larger for more distant relatives, `Infinity` if either id is unknown |

**Fields** (all required):

| Field | Type | Meaning | Validator |
|---|---|---|---|
| `id` | string | Unique slug. | ERROR unless snake_case and unique |
| `name` | string | Display name, in plain English where one exists. | ERROR if empty; warn above 24 characters |
| `scientificName` | string or `null` | The formal taxon that best matches the branch as drawn; `null` if it is the same as `name`. | ERROR unless a string or `null` |
| `parent` | string or `null` | Parent clade id; `null` only for the root (`luca`). | ERROR unless the parent appears earlier in the array; exactly one root |
| `originMa` | number | Where the branch leaves its parent's lineage, in Ma. | ERROR unless 0 < value ≤ 4540 and no older than the parent's |
| `category` | string | Life-group category; colors the branch. | ERROR if not a `LIFE_GROUPS` category |
| `description` | string | One sentence. | ERROR if empty; warn above 150 characters |

**Order carries meaning.**

- The array is in pre-order: a parent always precedes its descendants. The validator checks this.
- Siblings are listed in branching order, oldest split first.
- An earlier sibling's `originMa` is its split from the line leading to the later siblings, so sister groups share a date and an unresolved radiation is written as a tie.
- The last child's date is its split from its nearest relatives.
- Read top to bottom, the tips keep relatives together and end with the line to humans.

Clade ids and species ids are separate namespaces. Many coincide (the species `cycads` hangs from the clade `cycads`). The species `great_apes` (Proconsul and other early apes) deliberately hangs from the clade `apes`.

**Example** (from `phylogeny.js`):

```js
  { id: 'lobe_finned_fish', name: 'Lobe-finned fish', scientificName: 'Sarcopterygii', parent: 'jawed_vertebrates', originMa: 435, category: 'fish',
    description: 'Bony fishes with fleshy fins built around a single stout bone, the forerunner of arms and legs; the tetrapods are their descendants.' },
  { id: 'coelacanths', name: 'Coelacanths', scientificName: 'Actinistia', parent: 'lobe_finned_fish', originMa: 420, category: 'fish',
    description: 'Lobe-finned fishes with a three-lobed tail, believed extinct for 66 million years until one was caught off South Africa in 1938.' }, // TT 412 (404–421); must predate the lungfish split
  { id: 'lungfish', name: 'Lungfish', scientificName: 'Dipnomorpha', parent: 'lobe_finned_fish', originMa: 415, category: 'fish',
    description: 'Air-breathing lobe-finned fishes with crushing tooth plates; the closest living relatives of the land vertebrates.' }, // fossil-led: lungfish-line fossils by ~415–410 Ma (Benton 2015 minimum 408); TT 402 is younger
  { id: 'tetrapodomorphs', name: 'Tetrapodomorphs', scientificName: 'Tetrapodomorpha', parent: 'lobe_finned_fish', originMa: 415, category: 'fish',
    description: 'Lobe-finned fishes on the line to land vertebrates, such as Eusthenopteron and Tiktaalik, whose fins were turning into limbs.' },
```

Here the coelacanths split first, from the line that leads to the other two (`divergenceMa('tetrapodomorphs', 'coelacanths')` is 420). Lungfish and tetrapodomorphs are sister groups and share 415. The trailing comments record the clock estimate (TT = TimeTree) or the fossil that sets each date.

## Timeline rows and ERAS

File: [`js/data/timeline.js`](../js/data/timeline.js).

**Exports:**

| Export | Meaning |
|---|---|
| `timeline` | the 28 rows, contiguous, oldest first |
| `ERAS` | six title-card units: the three Precambrian eons, then the Phanerozoic eras |
| `getPeriodAtTime(ma)` | the row containing `ma`. A boundary belongs to the row that starts there; times older than 4540 get the first row; 0, negative or non-numeric times get the last. |
| `getEraAtTime(ma)` | the `ERAS` entry, by the same rules |
| `getTemporalWeight(ma)` | the row's `temporalWeight` |

**Row fields:**

| Field | Type | Meaning | Validator |
|---|---|---|---|
| `eon`, `era` | string | ICS parents. `era` is `null` for the Hadean; an Archean or early Proterozoic row is itself an era, so it names itself. | ERROR if `eon` is empty, or `era` is neither a name nor `null` |
| `period` | string | Unique key and fallback display name. | ERROR if missing, duplicated, or not one of the canonical rows |
| `label` | string | Display name. | ERROR if empty; warn if it looks like an internal key |
| `abbr` | string | Short name for timeline blocks too narrow for the label. | ERROR if missing; warn unless 1–4 printable ASCII characters and unique |
| `parentPeriod` | string, optional | Cenozoic rows only: the ICS period an epoch or sub-epoch belongs to (Paleogene, Neogene, Quaternary). | ERROR if present and empty |
| `startMa`, `endMa` | number | Older and younger bound. | ERROR unless `startMa > endMa`, contiguous with the previous row, exactly the canonical bounds, first row not after 4540, last row ending at 0 |
| `color` | string | The unit's CGMW color on the ICS chart. | ERROR unless `#rrggbb` |
| `temporalWeight` | number | Pacing (see below). | ERROR unless > 0; warn if the row gets under 1.5 s at 1× |
| `description` | string | The single most memorable thing about the interval. | ERROR if empty; warn above 60 characters |
| `context` | `{ life, climate, geography }` | One line each for the context card. | Warn if missing or above 120 characters per line |

**`ERAS` fields:**

- `id`, `kind` (`'eon'` or `'era'`), `name`, `startMa`, `endMa` and `tagline` (at most 70 characters).
- The six entries must match the canonical list in order: `hadean`, `archean` and `proterozoic` (eons), then `paleozoic`, `mesozoic` and `cenozoic` (eras).
- They must be contiguous.
- Each must span exactly the rows whose `eon` (for an eon) or `era` (for an era) matches its id.

The validator also probes the accessors inside every row and round-trips the time-scale warp (`js/engine/timeScale.js`).

**Example** (the Cambrian row and its era):

```js
  {
    eon: 'Phanerozoic', era: 'Paleozoic', period: 'Cambrian', label: 'Cambrian', abbr: 'Cam',
    startMa: 538.8, endMa: 486.85, color: '#7fa056', temporalWeight: 5.77, // 20 s
    description: 'Explosion of animal body plans — shells, eyes, predators',
    context: {
      life: 'Within ~25 million years most major animal groups appear: trilobites, the hunter Anomalocaris, the first fish.',
      climate: 'A greenhouse with little or no polar ice; CO₂ is many times today’s level and high seas flood the continents.',
      geography: 'Gondwana spans the south; Laurentia, Siberia and Baltica are island continents; the north is almost all ocean.',
    },
  },
```

```js
  { id: 'paleozoic', kind: 'era', name: 'Paleozoic Era', startMa: 538.8, endMa: 251.9, tagline: 'Life fills the seas, greens the land — and nearly dies' },
```

**Pacing.** A row stays on screen for `(startMa − endMa) × temporalWeight / TIMING.baseSpeedMaPerSec` seconds at 1×, where the base speed is 15 Ma per second. `js/engine/timeScale.js` lays the rows end to end into one screen-time axis, along which playback is linear. To give a row a target number of seconds, set `temporalWeight = seconds × 15 / duration in Myr`, to three significant figures, and note the target in a comment beside it. The current values:

| Row | Span (Ma) | Duration | temporalWeight | Seconds at 1× |
|---|---|---|---|---|
| Hadean | 4540–4031 | 509 Myr | 0.413 | 14.0 |
| Eoarchean | 4031–3600 | 431 Myr | 0.278 | 8.0 |
| Paleoarchean | 3600–3200 | 400 Myr | 0.338 | 9.0 |
| Mesoarchean | 3200–2800 | 400 Myr | 0.263 | 7.0 |
| Neoarchean | 2800–2500 | 300 Myr | 0.4 | 8.0 |
| Paleoproterozoic | 2500–1600 | 900 Myr | 0.433 | 26.0 |
| Mesoproterozoic | 1600–1000 | 600 Myr | 0.325 | 13.0 |
| Tonian | 1000–720 | 280 Myr | 0.482 | 9.0 |
| Cryogenian | 720–635 | 85 Myr | 1.59 | 9.0 |
| Ediacaran | 635–538.8 | 96.2 Myr | 2.18 | 14.0 |
| Cambrian | 538.8–486.85 | 51.95 Myr | 5.77 | 20.0 |
| Ordovician | 486.85–443.1 | 43.75 Myr | 4.46 | 13.0 |
| Silurian | 443.1–419.62 | 23.48 Myr | 5.11 | 8.0 |
| Devonian | 419.62–358.86 | 60.76 Myr | 4.44 | 18.0 |
| Carboniferous | 358.86–298.9 | 59.96 Myr | 4 | 16.0 |
| Permian | 298.9–251.9 | 47 Myr | 4.15 | 13.0 |
| Triassic | 251.9–201.4 | 50.5 Myr | 4.16 | 14.0 |
| Jurassic | 201.4–143.1 | 58.3 Myr | 4.63 | 18.0 |
| Cretaceous | 143.1–66 | 77.1 Myr | 5.06 | 26.0 |
| Paleocene | 66–56 | 10 Myr | 10.5 | 7.0 |
| Eocene | 56–33.9 | 22.1 Myr | 8.14 | 12.0 |
| Oligocene | 33.9–23.04 | 10.86 Myr | 9.67 | 7.0 |
| Miocene | 23.04–5.333 | 17.707 Myr | 11.9 | 14.0 |
| Pliocene | 5.333–2.58 | 2.753 Myr | 49 | 9.0 |
| Early Pleistocene | 2.58–0.774 | 1.806 Myr | 74.8 | 9.0 |
| Middle Pleistocene | 0.774–0.129 | 645,000 years | 186 | 8.0 |
| Late Pleistocene | 0.129–0.0117 | 117,300 years | 1530 | 12.0 |
| Holocene | 0.0117–0 | 11,700 years | 14100 | 11.0 |
| **Total** | 4540–0 | 4,540 Myr | | **352.0** (5:52) |

The total excludes the extinction holds: 6 s each (`TIMING.extinctionPauseSeconds`) plus the 0.3× crawl through each window. Anything drawn against time uses this same axis: the timeline bar, the sparklines and the Tree.

## Mass extinctions and crises

File: [`js/data/extinctions.js`](../js/data/extinctions.js).

**Exports:**

| Export | Meaning |
|---|---|
| `extinctions` | the Big Five, oldest first |
| `crises` | second-tier extinctions and biotic crises, oldest first |
| `getActiveExtinction(ma)` | the Big Five event whose window contains `ma`, as `{ ...event, progress }`, or `null` |

The clock stages each Big Five event in three beats (`js/engine/clock.js`):

1. it holds on the leading edge for `TIMING.extinctionPauseSeconds` (6 s, skippable);
2. it crawls through the window at `TIMING.extinctionSlowdown` (0.3×);
3. it fades the effects over `TIMING.extinctionAftermathSeconds` (3 s).

Crises never stop the clock; the timeline marks them.

**Big Five fields:**

| Field | Type | Meaning | Validator |
|---|---|---|---|
| `id` | string | One of `end-ordovician`, `late-devonian`, `end-permian`, `end-triassic`, `end-cretaceous`. Deep links and species data key on it. | ERROR if another id, duplicated, or one of the five is missing |
| `name` | string | Formal name. | ERROR if empty |
| `subtitle` | string, optional | Familiar name; when present the card leads with it. | ERROR if present and not a string |
| `timeMa` | number | Date of the event; victims end exactly here. | ERROR unless the canonical date (444.2, 372, 251.9, 201.4, 66) |
| `durationMa` | number | The on-screen staging window, not how long the dying took. | ERROR unless > 0, inside the timeline and not overlapping another event; warn if crossed in under ~1.5 s at 1× after the slow-down |
| `severityPercent` | number | What the severity meter fills to. | ERROR unless 1–100 |
| `severityLabel` | string | What that number measures, always shown beside it. | ERROR if present and empty; warn if missing |
| `cause` | string | The full story in two or three sentences, for the dialogs and help. | ERROR if empty |
| `causeShort` | string | One line for the card and tooltips. | Warn above 70 characters |
| `mechanism` | string | `'glaciation'`, `'anoxia'`, `'volcanism'` or `'impact'`. Drives the map staging. | ERROR on another value |
| `epicenter` | `{ plateId, lon, lat, name }` or `null` | Modern coordinates, carried back on the plate; `null` when no single place is defensible. | ERROR on an unknown plate, out-of-range coordinates or no name; warn at 0, 0 |
| `victims` | string[] | Display names of groups that ended in, or were devastated by, the event. | Warn unless 4–8; warn if a name is also a survivor |
| `survivors` | string[] | Notable groups that came through. | Warn unless 3–5 |
| `color` | string | Event color: card rule, timeline diamond, map tint. | ERROR unless `#rrggbb` |
| `description` | string | One sentence, present tense, for the card. | ERROR if empty; warn above 150 characters |

A legacy `affectedGroups` array of species ids is still accepted; the validator warns if a listed species is unknown or was not alive during the event. The validator warns if any of the card fields (`severityLabel`, `causeShort`, `mechanism`, `epicenter`, `victims`, `survivors`) is missing. It checks `getActiveExtinction` at both edges and the middle of every window: progress must be 0, 0.5 and 1, and the result must be `null` just before the window opens.

**Example:**

```js
  {
    id: 'end-cretaceous',
    name: 'End-Cretaceous Extinction',
    subtitle: 'The Chicxulub Impact',
    timeMa: 66.0,
    // 66.45–65.55 Ma: the main phase of Deccan volcanism, the impact (66.04 Ma — effectively
    // instantaneous) and the first few hundred thousand years of the recovery.
    durationMa: 0.9,
    severityPercent: 76,
    severityLabel: 'of species lost (estimate from marine fossils)',
    cause: 'A ~10-km asteroid struck the Yucatán at Chicxulub, blasting sulfate- and carbonate-rich rock into a global veil of dust, soot and sulfur aerosols. Re-entering ejecta may have ignited wildfires across continents; then years of impact winter shut down photosynthesis. India’s Deccan Traps were erupting too — how much they stressed life beforehand is debated.',
    causeShort: 'A 10-km asteroid strikes Yucatán: darkness, cold, food chains collapse',
    mechanism: 'impact',
    epicenter: { plateId: 'north_america', lon: -89.5, lat: 20.8, name: 'Chicxulub crater, Yucatán' },
    victims: ['Non-avian dinosaurs', 'Pterosaurs', 'Mosasaurs', 'Plesiosaurs', 'Ammonites', 'Rudist clams', 'Toothed birds', 'Most chalk-forming plankton'],
    survivors: ['Birds, the last dinosaurs', 'Mammals', 'Crocodilians and turtles', 'Flowering plants', 'Sharks and ray-finned fishes'],
    color: '#ff8800',
    description: 'An asteroid some 10 km wide strikes Mexico’s Yucatán; in the dark, cold years that follow, every dinosaur except the birds dies out.',
  },
```

**Crisis fields:**

| Field | Type | Meaning | Validator |
|---|---|---|---|
| `id` | string | Unique key; may be shared with the milestone that narrates it. | ERROR if missing, duplicated or a Big Five id |
| `name` | string | Display name. | ERROR if empty |
| `timeMa`, `durationMa` | number | Date and window (`timeMa ± durationMa / 2`). | ERROR unless `durationMa > 0` and the window is inside the timeline |
| `severityNote` | string | How bad it was, and how sure we are. | ERROR if empty |
| `cause` | string | Cause, hedged where debated. | ERROR if empty |
| `description` | string | Present tense. | ERROR if empty; warn above 200 characters |
| `color` | string | Marker color. | ERROR unless `#rrggbb` |

**Example:**

```js
  {
    id: 'carnian-pluvial',
    name: 'Carnian Pluvial Episode',
    timeMa: 233,
    durationMa: 2,
    severityNote: 'About a third of marine genera lost (Dal Corso et al. 2020), with a major turnover on land. It matters most for what followed: dinosaurs, modern conifers, stony-coral reefs and chalk-shelled plankton all expand afterwards.',
    cause: 'Eruption of the Wrangellia flood basalts (now in Alaska and British Columbia): CO₂-driven warming and one to two million years of intense rainfall across arid Pangaea.',
    description: 'For more than a million years it rains on Pangaea’s deserts. Ammonoids, crinoids and conodonts suffer; on land rhynchosaurs and dicynodonts decline — and dinosaurs, until now rare, begin their rise.',
    color: '#c75c96',
  },
```

## Milestones

File: [`js/data/milestones.js`](../js/data/milestones.js).

**Exports:**

| Export | Meaning |
|---|---|
| `MILESTONE_CATEGORIES` | the six categories, in order, each `{ id, label, color }` |
| `milestones` | the entries, oldest first |
| `getActiveMilestone(ma)` | the milestone to show at `ma`, as `{ ...milestone, progress }`, or `null`. When windows overlap, the highest `priority` wins, then the one that started most recently. |

**Categories:**

| `id` | Label | Color |
|---|---|---|
| `cosmic` | Cosmos | `#9085e9` |
| `geological` | Earth | `#d95926` |
| `climatic` | Climate | `#3987e5` |
| `biological` | Life | `#199e70` |
| `cultural` | Humanity | `#c98500` |
| `crisis` | Crisis | `#d55181` |

The six hues are steps of the life-group palette. No six hues are safe for every kind of color vision, so the toast always shows the category icon and label with the color.

**Fields:**

| Field | Type | Meaning | Validator |
|---|---|---|---|
| `id` | string | Stable key. | ERROR unless snake_case and unique |
| `timeMa` | number | The date shown with the toast and marked on the timeline; the midpoint for an interval. | ERROR if not a number |
| `durationMa` | number | Trigger window, `timeMa ± durationMa / 2`. The milestone is active while the clock is inside it. Size it for pacing, not reading time; the toast keeps itself readable for longer. | ERROR unless > 0 and the window starts no earlier than 4540 Ma. Warn if it lasts under 0.4 s at 1×, if it ends after the present (cut off at 0), or if it opens before a mass-extinction window and is still open when the event starts. |
| `name` | string | Toast title. | ERROR if empty |
| `description` | string | One idea, present tense, contested claims hedged. | ERROR if empty; warn above 240 characters |
| `category` | string | One of the six category ids. | ERROR on another value |
| `color` | string | A shade of the category's hue. | ERROR unless `#rrggbb` |
| `priority` | number, optional | 2 = headline, 1 = notable, default 0. Breaks ties between overlapping windows and decides what a crowded toast queue keeps. | ERROR if present and not a number |
| `location` | `{ plateId, lon, lat, name }`, optional | Modern coordinates of the place the description points at, carried back on the plate. | ERROR on an unknown plate, out-of-range coordinates or no name |
| `crisisId` | string, optional | Id of the crisis in `extinctions.js` that this toast narrates; the two share one timeline marker. | ERROR unless a crisis id |

The timeline itself pairs a `crisis` toast with the crisis of the same id, or else with the overlapping crisis nearest in time (`crisisTwin` in `js/ui/controls.js`); no app code reads `crisisId`. Keep `crisisId` and the pairing consistent; at present they agree for all four crisis milestones.

**Pacing rules.**

- Warn if two milestones open within ~1 s of 1× playback of each other.
- Warn if there are more than ~20 s without a milestone or a mass extinction.
- Warn if `getActiveMilestone` never returns a milestone anywhere in its window, because a higher-priority neighbor masks it.
- Name the section (`--only=milestones`) to print the full timetable at 1×.

**Example:**

```js
  {
    id: 'petm',
    timeMa: 56.0,
    durationMa: 0.8,
    name: 'A sudden global fever',
    description: 'Thousands of gigatonnes of carbon pour into the air within a few thousand years. Global temperature jumps 5–6 °C, the oceans turn more acidic and Arctic seas reach 23 °C. The fever — the PETM — lasts about 170,000 years.',
    color: '#d55181',
    category: 'crisis',
    priority: 2,
    location: { plateId: 'north_america', lon: -108.0, lat: 44.5, name: 'Bighorn Basin, Wyoming' },
    crisisId: 'petm',
  },
```

## Chapters

File: [`js/data/chapters.js`](../js/data/chapters.js). It is the story's table of contents, used by the Chapters panel and the `[` / `]` keys, and it is optional: without it, the panel falls back to the eras and the Big Five.

**Exports:**

- `chapters`: the 18 chapters, contiguous, oldest first.
- `getChapterAt(ma)`: the chapter whose `[startMa, endMa)` contains `ma`. A boundary belongs to the chapter that starts there. Times older than the first chapter get the first; 0 Ma gets the last.

**Fields:**

| Field | Type | Meaning | Validator |
|---|---|---|---|
| `id` | string | Stable key. | ERROR if missing or duplicated |
| `title` | string | Chapter title. | ERROR if empty; warn above 32 characters |
| `startMa` | number | Where the chapter begins (older). | ERROR unless in 0–4540 and in oldest-first order; the first chapter starts at 4540 |
| `endMa` | number | Where it ends: always the next chapter's `startMa`; the last ends at 0. | ERROR unless younger than `startMa` and contiguous with the next chapter |
| `blurb` | string | Present tense. | ERROR if empty; warn above 110 characters |
| `view` | string, optional | `'map'`, `'globe'` or `'tree'`. Jumping to the chapter switches to this view, so set it only where one view clearly suits the chapter. | ERROR on another value |

The validator also checks `getChapterAt` at each chapter's start and middle and at 0 Ma, and warns if there are fewer than 14 or more than 18 chapters. Most boundaries are timeline row boundaries. The chapters that end with the end-Permian, end-Triassic and end-Cretaceous extinctions run to just past the event's window (251.0, 200.5 and 65.5 Ma), so that a jump to the next chapter lands in the aftermath. A chapter that does begin inside a window is landed just after it by the panel.

**Example:**

```js
  {
    id: 'snowball',
    title: 'Snowball Earth & first animals',
    startMa: 720,
    endMa: 538.8,
    blurb: 'Ice reaches the tropics twice; after the thaw the first large, soft-bodied creatures appear.',
    view: 'globe',
  },
```

## Curves and planet-state accessors

Five modules hold the slowly changing state of the planet. Each one exports accessors that take a time in Ma, plus its knot tables. Components read the air from `frame.atmo` (`{ tempC, o2Pct, co2Ppm, … }`) and the planet's colors from `frame.look` (`js/util/planetLook.js`). They call the other accessors directly.

### `atmosphere.js`

| Export | Returns |
|---|---|
| `getTemperatureAtTime(ma)` | global mean surface temperature, °C |
| `getOxygenAtTime(ma)` | O₂, % of the air by volume |
| `getCO2AtTime(ma)` | CO₂, ppm |
| `ATMOSPHERE_CURVES` | `{ temperature, oxygen, co2 }`, the knot tables. Plot CO₂ on a log axis. |
| `interpolateFromCurve(curve, ma)` | the shared linear interpolator (clamped at both ends) |
| `ATMOSPHERE_REFERENCE` | `{ present: { year: 2025, tempC, o2Pct, co2Ppm }, preIndustrial: { tempC, co2Ppm } }`, read off the curves: today 15.1 °C, 20.95 %, 427 ppm; pre-industrial 13.8 °C and 280 ppm |

Each knot can carry a comment, and the block above each curve names its sources and liberties (see [data-sources.md](data-sources.md#air-and-climate-atmospherejs)). For example, the temperature knots around the PETM:

```js
  [56.6, 27],
  [56.03, 28],
  [55.995, 33.6],   // Paleocene–Eocene Thermal Maximum (widened: see above)
  [55.8, 33.6],
  [55.6, 30.2],
```

### `planet.js`

| Export | Returns |
|---|---|
| `getMagmaFraction(ma)` | molten fraction of the surface, 0..1 |
| `getOceanChemistry(ma)` | `{ water, ferruginous, euxinic, oxygenated }`, each 0..1. `water` is liquid-ocean coverage. The three regime weights need not sum to 1; consumers normalize them. |
| `getVegetation(ma)` | share of ice-free land with plant cover, 0..1 (today 0.78) |
| `getGrasslandFraction(ma)` | share of vegetated land that is open grassland, 0..1 (today 0.4) |
| `getDayLengthHours(ma)` | length of a day, hours |
| `getSolarLuminosity(ma)` | the Sun's brightness relative to today, from a formula rather than the table |
| `getSeaLevelM(ma)` | global mean sea level relative to today, meters. Meaningful only where `isSeaLevelKnown(ma)` is true. |
| `isSeaLevelKnown(ma)`, `SEA_LEVEL_KNOWN_FROM_MA` | true from 538.8 Ma; older values are a placeholder 0 |
| `getClimateState(ma, tempC)` | `{ id, label, blurb }` with `id` ∈ `magma`, `snowball`, `icehouse`, `coolhouse`, `greenhouse`, `hothouse` |
| `PLANET_CURVES` | `{ dayLength, luminosity, seaLevel, vegetation, grassland, magma, water, ferruginous, euxinic, oxygenated }` |

`getClimateState` decides in this order, using the ice from `getGlaciation`. The first rule that matches wins:

1. More than 5% of the surface is molten: magma ("Magma ocean").
2. The mean is 100 °C or more: hothouse (the steam world).
3. Ice sheets reach 70° from a pole, or the mean is −10 °C or less: snowball.
4. Ice sheets reach 15°: icehouse.
5. Any ice sheet or sea ice beyond 3°, or a mean below 22 °C: coolhouse ("Cool").
6. Below 28 °C: greenhouse.
7. Otherwise: hothouse.

For example, at 444.6 Ma (19.2 °C, with ice on Gondwana) it returns Icehouse.

**Example table** (day length, complete):

```js
const dayLengthCurve = [
  [4540, 5],
  [4500, 5],
  [4400, 6.5],
  [4000, 9.5],
  [3500, 12],
  [3200, 13],
  [2800, 15],
  [2460, 17],
  [2200, 18.3],
  [2000, 19],       // resonance stall
  [1000, 19.3],
  [800, 20.4],
  [620, 21.5],
  [400, 22],
  [300, 22.6],
  [200, 23],
  [70, 23.5],
  [0, 24],
];
```

### `glaciation.js`

**`getGlaciation(ma)`** returns:

- `seaNorth`, `seaSouth`: how far sea ice reaches from each pole, in degrees of latitude.
- `landNorth`, `landSouth`: how far ice sheets reach on any land there, in degrees of latitude.
- `northCapLatRadius`, `southCapLatRadius`: the larger of the two for each hemisphere (legacy).
- `alpha`: cap opacity (legacy), `0.88 × min(1, widest radius / 8)`.

A radius of 10 means ice poleward of 80°, and 90 means ice to the equator. Today it is `seaNorth` 16, `landNorth` 14, `seaSouth` 26 and `landSouth` 26.

Each value is the largest among the glacial intervals active at that moment and a small temperature-driven cap that appears whenever the global mean is below 18 °C. NaN and negative times are treated as the present.

**`getActiveGlaciations(ma)`** returns the names of the intervals with more than half a degree of ice.

**`GLACIAL_INTERVALS`** holds the intervals: `[{ name, keys: [[Ma, seaN, seaS, landN, landS], …] }]`. Every interval starts and ends at zero, and values are linear between keys. Example:

```js
  {
    // Gaskiers glaciation (Newfoundland), 579.9–579.6 Ma and under 340,000 years long (Pu et al.
    // 2016, Geology 44: 955): a middle- to high-latitude ice age, not a snowball. Widened to ~4 Myr.
    name: 'Gaskiers glaciation',
    keys: [
      [582.2, 0, 0, 0, 0],
      [580.4, 14, 20, 22, 32],
      [579.5, 14, 20, 22, 32],
      [577.7, 0, 0, 0, 0],
    ],
  },
```

### `seismicActivity.js`

- **`getSeismicActivityAtTime(ma)`** returns a unitless, editorial index of tectonic activity, 0..1.
- **`SEISMIC_CURVE`** holds its knots.

The Life panel shows a band word, `floor(index × 5)` → Low, Moderate, Active, High, Extreme. Today's 0.55 reads "Active". No app module reads `SEISMIC_CURVE` at present.

### `biodiversity.js`

| Export | Returns |
|---|---|
| `estimatedDiversityKilo(ma)` | estimated living eukaryote species, in thousands. Interpolation between knots is geometric (log-linear); the segment that leaves zero is linear. |
| `formatDiversity(kilo)` | `'none'` (≤ 0), `'microbes only'` (< 0.5), `'mostly microbes'` (< 1), otherwise two significant figures: `'260k'`, `'8.7M'` |
| `formatDiversityAt(ma)` | the same, straight from the time |
| `isDiversityCountable(ma)` | true from 574 Ma |
| `DIVERSITY_ERAS` | `{ lifeFromMa: 3700, eukaryotesFromMa: 1650, countableFromMa: 574 }` |
| `BIODIVERSITY_CURVE` | the knots. Values below 1 are placeholders, not estimates: plot on a log axis clamped to ≥ 1. |

### Validator rules for curves

**ERROR:**

- **Exports.** Missing or mistyped exports:
  - `atmosphere.js`: the three accessors, `ATMOSPHERE_CURVES` and `interpolateFromCurve`;
  - `planet.js`: every accessor above and `PLANET_CURVES` (`isSeaLevelKnown` only warns if absent);
  - `glaciation.js`: `getGlaciation`;
  - `seismicActivity.js`: `getSeismicActivityAtTime`;
  - `biodiversity.js`: `estimatedDiversityKilo` and `formatDiversity` (`BIODIVERSITY_CURVE` only warns if absent);
  - the optional `js/util/planetLook.js`: `getPlanetLook`, `mixHex` and `hexAlpha`.
- **Tables.** Every exported table, named or merely shaped like a curve, must have at least two numeric `[Ma, value]` pairs with Ma strictly descending. CO₂, oxygen, day length, luminosity, the species count and the tectonic index must not go below 0.
- **The accessor sweep.** Every accessor is sampled 30 times per second of 1× playback across the whole story, crawling through the extinction windows as the clock does. The values must stay in range: oxygen 0–100, fractions 0..1, ice radii 0–90°, the legacy radii equal to the wider of sea and land ice, and every planet-look color `#rrggbb`. `formatDiversity` must return a non-empty string.

**warn:**

- A table that does not end at 0 Ma, or starts after 4540 Ma.
- Ice drawn while the magma ocean covers more than a quarter of the surface.
- A planet-look color or ice edge that jumps between consecutive frames. The limit is 24 per color channel or 6° of ice edge per frame, unless the step is part of a ramp spread over at least three frames.

## Continents and plates

File: [`js/data/continents.js`](../js/data/continents.js), turned into polygons by `js/engine/interpolator.js`. The data file's header is the authoritative, step-by-step format description. Read it before editing, especially "Adding a keyframe inside the range" and "Extending the rigid regime". The model has two regimes behind one function:

- **Rigid plates:** real coastlines cut into plates and smaller blocks, each turned rigidly between keyframes. This regime reaches back as far as every plate has a keyframe (`getKinematicRangeMa()`).
- **Deep time (older):** schematic outlines, one per continent and time slice, morphed from slice to slice. The hand-over between the two is itself a morph, whose younger end is the plates at their oldest keyframe.

**Data exports** (`continents.js`):

- `plates`;
- `deepSlices` (sorted oldest first on load);
- `labelGroups`;
- `cratonLineages` (which deep-time continents the oldest named sites ride; see below);
- `FIRST_CRUST_MA` (4400: there is no land before it);
- `slices`, `timeSlices` and `getBracketingSlices`, kept for older callers.

**Engine exports** (from `interpolator.js`):

- **`getPolygonsAtTime(ma)`** returns render-ready land, `[{ id, name, color, vertices, labelAt, labelRank, bbox, plateId?, label? }]`.
  - `vertices` is `[[lon, lat], …]`. Rings never cross the antimeridian, and a ring around a pole is closed along the ±90 edge (`isSeamEdge` in `js/engine/geo.js` tells renderers not to stroke those edges).
  - `labelAt` is a point well inside the shape. `labelRank` is roughly √area in square degrees; 0 (with `label: false`) means "do not label".
  - `plateId` is set in the rigid regime and the hand-over.
  - The same `ma` returns the same array.
- **`plateToWorld(plateId, lon, lat, ma)`** returns where a modern point on that plate was at `ma`, or `null` for an unknown plate. A plate id also covers the plates that hang off it: a point given on `eurasia` that lies in Siberia rides Siberia. It is exact within the rigid regime. Further back the point rides the continents its plate descends from. Through each deep-time morph it keeps its place in the changing outline: its mean value coordinates with respect to the younger outline are applied to the older one, which shares its vertex list. A point that was on land therefore stays on land, and where the outline does not change the point does not move. Where several older continents merge into one, the point follows the parent whose piece of the merged outline it lies in, unless `cratonLineages` names another.
- **`findPlateAt(lon, lat, maxOffshoreDeg = 4)`** returns the plate a modern coordinate sits on. Points within `maxOffshoreDeg` of a coast go to the nearest plate.
- **`getKinematicRangeMa()`** returns the oldest time covered by the rigid regime.

**`plates` entries:**

| Field | Meaning |
|---|---|
| `id`, `name` | Unique id (also the id of the plate's first ring) and display name. |
| `color` | Legacy fill color. The renderers take land colors from `planetLook`; plates that touch must share a color. |
| `anchor` | `[lon, lat]`, a reference point on the plate in present-day coordinates. |
| `track` | Keyframes, in either form, freely mixed. `[Ma, lon, lat, spin]` means: at that time the anchor was at lon, lat, turned `spin` degrees clockwise from today. `[Ma, { pole: [lon, lat], angle }]` is a finite Euler rotation. Poses are interpolated by quaternion slerp, so shapes never deform. |
| `parent` | Optional. The track is then relative to the parent plate: world pose = parent pose ∘ own pose. A child whose rows repeat one pose is welded to its parent. Parents may be chained. |
| `from` | Optional hint for the hand-over: the continent of the youngest deep-time slice (or another plate) that this plate breaks out of. |
| `rings` | The coastlines, in present-day position (see below). |

**Rings:** `{ id, name?, label, v, main?, group?, oldName?, emerge?, origin? }`.

- `v` is a flat `[lon, lat, lon, lat, …]` list, counter-clockwise (land on the left) and not closed.
- `name`: rings without one are small islands that are never labeled.
- `label` is a point well inside the ring for its name; it rides with the plate.
- `main` marks a second continent-sized ring of the same plate.
- `group` puts the ring in a label group (below).
- `oldName: [name or null, Ma]` gives the label used before that age; for example, North America is labeled Laurentia in the deep past.
- `emerge: [fromMa, toMa]` is land that grows into existence: volcanic arcs, the Isthmus of Panama, Iceland, accreted terranes. It grows out of `origin` (default: `label`).

**`labelGroups`:** `{ [groupId]: { name, label: [lon, lat], until } }`. Some modern landmasses are cut into several blocks that only part in deep time, such as Asia into Siberia, Tarim, North China and others. While `ma ≤ until`, the rings of the group report the group's name. Only the ring holding the group's `label` point shows it, ranked by the whole group's area, so the present-day map says "Asia" once.

**`deepSlices` entries:**

- Each slice is `{ ma, continents: [{ id, name, color, vertices, from?, into? }] }`.
- Names are honest: a conjectural landmass says so ("Kenorland (conjectural)").
- The same id in consecutive slices is the same landmass and morphs straight from one outline to the next.
- `from` (this continent breaks out of that one in the next older slice) and `into` (it fuses into that one in the next younger slice) override the nearest-continent matching.
- Splits partition the parent among its children; merges run that backwards.
- `FIRST_CRUST_MA` (4400) is when land first appears.

**`cratonLineages` entries:** `{ id, name, centre: [lon, lat], radiusDeg, lineage: [ids] }`.

- `centre` and `radiusDeg` make a present-day circle. A site inside it (the nearest centre wins if circles overlap) uses the entry.
- `lineage` lists deep-time continent ids, young to old. Wherever a merge offers a site several parents, it follows the one listed here, the oldest-listed if several are offered. One stage earlier the site is already moved into that parent's piece of the merged outline, so it crosses on land. Elsewhere the default applies.
- The entries exist because the default is geometric, not geological: without them Pongola (Kaapvaal) ended on Karelia and the Pilbara sites beside an empty Vaalbara. There are three: `kaapvaal` (Kalahari → Ur → Vaalbara), `west_australia` (Pilbara and Yilgarn: Ur → Vaalbara) and `congo` (West Gondwana → Congo).

```js
  {
    id: 'kaapvaal', name: 'Kaapvaal craton', centre: [28, -26.5], radiusDeg: 5.5,
    lineage: ['kalahari', 'ur', 'vaalbara'],
  },
```

**Example plate.** Madagascar rides Africa. The recent rows use the `[Ma, lon, lat, spin]` form; the older rows are Euler rotations relative to Africa, sampled from a published model. Its outline ring follows.

```js
  {
    // Relative to Africa: fixed since ~120 Ma; before that it lay against Somalia and Kenya.
    id: 'madagascar', name: 'Madagascar', color: LAND, from: ['gondwana'], parent: 'africa',
    anchor: [46.5, -19.5],
    track: [
      [0, 46.5, -19.5, 0],
      [20, 46.5, -19.5, 0],
      [34, 46.5, -19.5, 0],
      [50, 46.5, -19.5, 0],
      [66, 46.5, -19.5, 0],
      // from 80 Ma: Merdith et al. (2021)
      [80, { pole: [0, 90], angle: 0 }],
      [90, { pole: [-98.06, -47.33], angle: 0.56 }],
      [100, { pole: [-98.06, -47.33], angle: 0.76 }],
      [120, { pole: [-98.06, -47.33], angle: 0.76 }],
      [130, { pole: [-66.56, -4.44], angle: 4.81 }],
      [140, { pole: [-59.02, -5.17], angle: 8.26 }],
      [150, { pole: [-59.34, -4.29], angle: 11.12 }],
      [160, { pole: [-57.85, -7.69], angle: 13.09 }],
      [170, { pole: [-56.73, -10.2], angle: 15.1 }],
      [180, { pole: [-56.1, -11.59], angle: 16.53 }],
      [540, { pole: [-56.1, -11.59], angle: 16.53 }],
    ],
    rings: OUTLINES.madagascar,
  },
```

```js
    madagascar: [
      { id: 'madagascar', name: 'Madagascar', label: [46.8, -18.1],
        v: [
          49.2,-12,48.3,-13.8,47.9,-13.7,48,-14.1,47.7,-14.6,46.3,-15.8,44.4,-16.2,44,-17.4,44.5,-19.4,43.9,-21.2,
          43.4,-21.3,43.3,-22.8,44,-25,45.4,-25.6,47.1,-24.9,49.8,-16.9,49.7,-15.7,49.9,-15.4,50.2,-16,50.4,-15.7,
          50.1,-13.6,
        ] },
    ],
```

**Example deep-time slice.** This is the start of the 1600 Ma slice; it continues with Congo – São Francisco and Amazonia – West Africa.

```js
  // ===== 1600 Ma =====
  // Nuna (Columbia): assembled ~2.0–1.8 Ga, broke up ~1.5–1.3 Ga (Zhao et al. 2002; Evans & Mitchell 2011).
  // Membership is debated; here it is the model's cluster of Laurentia, Baltica, Siberia, North China, India,
  // Kalahari and Australia–Mawson (Australia + East Antarctica). Congo and Amazonia–West Africa lie off it.
  // (positions and outlines traced from Cao et al. 2024)
  { ma: 1600, continents: [
    { id: 'nuna', name: 'Nuna (Columbia)', color: LAND, from: 'superior',
      vertices: [
          [-147.2, -33.9], [-136.7, -23.8], [-139, -17.6], [-137.5, -12.8], [-131.1, -7.5], [-109.6, -7.7],
          [-105.3, -14.4], [-107, -20.2], [-103.8, -23.1], [-87.9, -21.2], [-81.1, -16.2], [-81.8, -9.9],
          [-88.6, 2.5], [-80.5, 14.1], [-84.8, 22.1], [-82.1, 37], [-87.8, 46.5], [-80.1, 58.7], [-73, 61],
          [-73, 65.4], [-100.4, 68.6], [-125.5, 77.1], [-144.9, 71.3], [-162.8, 68.9], [-168.9, 55],
          [-163.9, 36.4], [-161.2, 21], [-148.8, 14.6], [-154.1, -0.3], [-151.7, -8], [-157.3, -16.6],
          [-156.5, -22.2], [-162, -31], [-157.4, -34],
      ] },
```

**Validator** (section `geometry`).

ERROR:

- `interpolator.js`, `geo.js` or `plateBoundaryInterpolator.js` lacks one of its exports.
- A canonical anchor plate is missing from `plates`.
- A `cratonLineages` entry lacks an id or name, has a centre that is not `[lon, lat]` or a `radiusDeg` outside (0, 30], or lists an id that is not a continent of any deep-time slice.
- Polygons are sampled every 3 Ma below 600 Ma and every 20 Ma above. Every frame must be an array of polygons, each with an id that is unique in that frame, at least three in-range vertices, a hex `color`, and a valid `labelAt`, `name` and `labelRank` when present.
- Markers are placed (`placeSpecies` in `geo.js`) for every species at its first appearance, its peak and its last moment. Each must get a finite position.

warn:

- A frame has more than 6,000 continent vertices; the renderers budget for about 4,500.
- A marker sits on the wrong surface for its habitat: marine at sea, everything else on land.
- A plate-anchored event site (an extinction `epicenter` or a milestone `location` with a `plateId`) lies more than 4° out to sea at its event time. The globe's ping settles on the nearest shore, which would then belong to another landmass. Times with no land yet are skipped.

## Plate boundaries

**Data.** [`js/data/plateBoundaries.js`](../js/data/plateBoundaries.js) exports `TECTONICS_START_MA` (3200: no boundaries are drawn before it) and `boundaries`, a list in which every ridge, trench, collision belt and transform fault is described once, attached to the plates of `continents.js`, with the interval in which it existed. The engine carries each line to where the continents stand at any moment, so trenches stay on their margins and ridges in their oceans without per-keyframe redrawing. The file header is the full reference; in brief:

| Field | Meaning |
|---|---|
| `id` | Unique. Output pieces are `<id>`, `<id>~1`, … (antimeridian cuts, parts still growing). |
| `type` | `'divergent'` (spreading ridges and rifts), `'convergent'` (subduction zones and collision belts) or `'transform'` (strike-slip faults). |
| `name` | Optional: a string, or a schedule `[[untilMa, name], …, [null, name]]` (the first row whose `untilMa` ≥ t applies), e.g. a trench that becomes an orogeny. |
| `span`, `fade` | `[fromMa, toMa]` when it exists; `[inMyr, outMyr]` birth and death ramps (default 6 Myr each). |
| `grow`, `shrink` | `'start'`, `'middle'` or `'end'`: where a line grows from while it is born and retracts to while it dies. |
| `ride` | How it moves. One plate (`'india'`: the line is given in present-day coordinates on that plate and turns with it); two plates (`['a', 'b']`: drawn part-way between both plates' copies, with `w` the share of the way from a to b, `off` a trench's distance from the overriding plate a, and `vA`/`vB` conjugate margins); or none (fixed map coordinates, optionally keyframed with `keys`). |
| `v`, `vA`, `vB`, `keys` | Geometry, flat `[lon, lat, lon, lat, …]`. |
| `at` | Pins the carrier: the line turns with the block under that present-day point (pairs `[[a], [b]]` for two plates; `null` keeps a side's default). In deep time this decides which ancestral continent carries the line, so it is chosen by the point's `plateToWorld` lineage, not its geology. |
| `frame` | The coordinates are drawn on the map of that moment (on a deep-time slice's schematic outlines, say) and turned back to present-day coordinates once, through the carrier. |
| `opacity` | A fainter line (conjectural Archean and Proterozoic ones). |
| `parts` | Stretches with their own ride, span and geometry; they inherit `ride`, `at`, `frame`, `w`, `off` and `opacity`. Fully grown parts that meet are drawn as one line. |

Convergent lines are given with the OVERRIDING plate on their left, looking along the vertex order on a north-up map: that is the side the painter draws the teeth on.

**Engine.** `js/engine/plateBoundaryInterpolator.js` exports `getBoundariesAtTime(ma)` → `[{ id, type, vertices, name?, opacity? }]`.

- `vertices` is an open polyline of `[lon, lat]`. No polyline crosses the antimeridian, and no edge is longer than 3° of arc.
- A plate's pose is recovered as the rotation that takes two probe points ~1.5° apart to where `plateToWorld` puts them: exact in the rigid-plate regime; in deep time it follows the part of the schematic continent the probes descend from.
- `name` sits only on the longest piece of a boundary. `opacity` is present only when below 1: while a line is born or dies (it is then also drawn shortened by the same share), and on conjectural lines.
- The same `ma` returns the same array. NaN or negative input means the present; anything older than `TECTONICS_START_MA` returns `[]`. The function never throws.
- `js/main.js` asks for boundaries only while the Plates layer is on.

**Example:**

```js
  {
    id: 'san_andreas', type: 'transform', name: 'San Andreas Fault', span: [28, 0], fade: [6, 0],
    grow: 'end', ride: 'north_america',
    v: [-124.7, 40.3, -119.3, 35, -115.8, 33.4],
  },
```

**Validator.** Boundaries are sampled every 5 Ma below 600 Ma and every 25 Ma above. It is an ERROR if the result is not an array, a `type` is not one of the three, or a vertex is out of range.

## Paleogeography

File: [`js/data/paleogeography.js`](../js/data/paleogeography.js): the oceans of the past, supercontinents and paleocontinents, large igneous provinces, impacts, mountain building, ocean gateways and land bridges, and the routes by which people and a few famous animal groups spread. The map painter and the Globe import it optionally. Its header is the full reference: the place formats, the timing rules, how the generated tracks were made, and how to add an entry. Today it holds 27 ocean labels, 18 land labels, 90 features (25 large igneous provinces, 22 impacts, 18 orogenies, 20 gateways and land bridges, 5 others) and 21 routes.

**Accessors.** Every coordinate they return is `[lon, lat]` in the map frame of that moment, ready to draw; no item carries a `plateId`. Results are memoised per `ma` and frozen. NaN or negative times count as the present, and nothing throws.

| Accessor | Returns |
|---|---|
| `getOceanLabelsAt(ma)` | `[{ id, name, lon, lat, size, opacity }]`. `size` 3 = superocean, 2 = ocean, 1 = sea or strait. At most 7 at once, never two within 12°, always over open water while visible. |
| `getLandLabelsAt(ma)` | `[{ id, name, subtitle?, lon, lat, size, opacity }]`: names that are not one polygon's own, such as supercontinents, paleocontinents and old names with a "future …" subtitle. An item whose `id` or name equals a polygon's stands in for that polygon's label, and the map painter drops the polygon's. Always on land. |
| `getFeaturesAt(ma)` | `[{ id, type, kind?, name, lon, lat, radiusDeg, intensity, opacity, phase, description, startMa, endMa, path?, ends? }]`. `type` is `'lip'`, `'impact'`, `'orogeny'`, `'gateway'` (`kind`: opens, closes, bridge, floods, narrows, restricts, barrier, seaway) or `'other'` (`kind`: ice sheet, rift, hot spot, super-eruption). `intensity` rises when the event starts, holds and dies away (an impact: 1 at the strike, then a lasting scar). `phase` is `'active'` or `'waning'` (impacts: `'impact'`, then `'scar'`). A mountain belt has its line in `path`; a gateway has its two shores in `ends` and sits half-way. At most 8 at once. |
| `getMigrationsAt(ma)` | `[{ id, name, group, color, path, route, progress, opacity, description, startMa, endMa, speciesIds? }]`. `path` is the part travelled so far, already cut (its last point is the head; do not cut it again by `progress`); `route` is the whole journey. `group` is `'sapiens'`, `'archaic'` or `'fauna'`, with a color per group. A route of our own species settles at a lower opacity and stays to the present; others fade away. |
| `paleoData` | The tables and generated tracks, read-only by convention, for tools and tests. |

**Tables.** Positions in the tables take three forms: `['plate', lon, lat]`, a present-day point that rides its plate through `plateToWorld`; `[lon, lat]`, a fixed point on the map; or a track of keyframes `[[ma, lon, lat] | [ma, 'plate', lon, lat], …]`, oldest first, slid along great circles. Fades and minimum durations are in screen seconds, not Ma, so they look the same in the Cambrian and the Holocene, and nothing ever jumps across the map (a fast step fades out and back in). Ocean labels and everything in the schematic deep-time regime use generated tracks, fitted offline against the continents; if the continents change, re-check them.

- `OCEANS`: `{ id, name, size, from, to, cut?, at? }`, plus a track.
- `LANDS`: `{ id, name, subtitle?, phases?, size, from, to, at?, site? }`.
- `FEATURES`: `{ id, type, kind?, name, start, end, peak?, until?, r, site, at?, path?, ends?, marine?, text }`. Features not marked `marine` must sit on land whenever visible; `text` is at most 160 characters.
- `ROUTES`: `{ id, name, group, persist?, speciesIds?, points: [[ka, lon, lat] | [ka, 'plate', lon, lat], …], text }`, waypoints in travel order with arrival ages in thousands of years.

**Example feature:**

```js
  { id: 'siberian-traps', type: 'lip', name: 'Siberian Traps', start: 252.3, end: 250.2, peak: 251.9, r: 12,
    site: ['eurasia', 100, 66],
    text: 'Millions of km³ of lava and sills bake Siberian coal, salt and carbonates, releasing the gases that drive the Great Dying.' },
```

**Validator** (section `geometry`).

ERROR:

- `getOceanLabelsAt` or `getFeaturesAt` is missing (`getLandLabelsAt` and `getMigrationsAt` only warn).
- Sampled every 4 Ma below 600 Ma and every 30 Ma above, an accessor returns something other than an array.
- An item breaks its shape:
  - every label and feature needs a `name`;
  - labels and point features need in-range coordinates;
  - paths need at least two in-range points;
  - `size`, if present, must be 1, 2 or 3;
  - `opacity`, `progress` and `intensity`, if present, must be within 0..1;
  - `plateId`, if present, must be a canonical anchor plate.

warn (sampled every 2 Ma back to 600 Ma, every 20 Ma before that, and at 600 moments spread evenly over the playback):

- An ocean name sits on land, or two ocean names are closer than 12°.
- A land name sits at sea.
- A feature that is not a gateway and not marked `marine` sits at sea.
- More than 7 ocean names or 8 features are visible at once.
