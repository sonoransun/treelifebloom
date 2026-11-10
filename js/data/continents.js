// Continental data: where the land was, from the first crust (~4.4 Ga) to today.
//
// The engine that turns this file into polygons is js/engine/interpolator.js. It works in two
// regimes behind one function, getPolygonsAtTime(timeMa):
//
//   A. RIGID PLATES — 0 Ma … 540 Ma (the oldest plate keyframe; getKinematicRangeMa()).
//      Real coastlines cut into ~30 plates and blocks. A plate never changes shape: its position
//      at any time is its present-day outline turned rigidly on the sphere, so nothing wobbles
//      while it drifts, the present-day map is simply every plate at rest, and Pangaea, Gondwana
//      and Laurussia are jigsaws of recognisable pieces.
//   B. DEEP TIME — 540 Ma … 4400 Ma. Schematic palaeo-continents, one outline per continent and
//      time slice, morphed from slice to slice. Before 4400 Ma there is no land.
//   The hand-over between the two is an ordinary deep-time morph from the youngest slice (570 Ma)
//   to "the plates at 540 Ma".
//
// All coordinates are [longitude, latitude] in degrees, east and north positive. Time is in Ma
// (millions of years ago): bigger = older.
//
// SOURCES. Coastlines: Natural Earth 1:110m land (public domain). Plate motions: 0–66 Ma tuned by
// hand against Scotese/Blakey-style maps; 80–540 Ma sampled from the full-plate model of Merdith
// et al. (2021), "Extending full-plate tectonic models into deep time", Earth-Science Reviews 214:
// 103477 (model files: doi:10.5281/zenodo.10346399, CC BY 4.0), in its palaeomagnetic frame, with
// the adjustments described under "HOW THE OLD KEYFRAMES WERE MADE". Deep-time outlines 570–1600 Ma
// are traced from Cao et al. (2024), "Earth's tectonic and plate boundary evolution over 1.8 billion
// years" (doi:10.5281/zenodo.11536686, CC BY 4.0); older ones are drawn by hand and are
// conjectural, as their names say.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 0. LABEL GROUPS  (`labelGroups`)
// ─────────────────────────────────────────────────────────────────────────────────────────────
//   Asia, Europe, Great Britain, Ireland and North America are each cut into several blocks that
//   only part in deep time (Asia → Siberia, Tarim, North China …). A ring that carries
//   `group: 'asia'` reports the group's name while t ≤ `until` (Ma), and only the ring that holds
//   the group's `label` point shows a label, ranked by the area of the whole group — so the
//   present-day map says "Asia" once. Further back every ring is labelled under its own name.
//     asia: { name: 'Asia', label: [96, 47], until: 150 }
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 1. PLATES  (`plates`)
// ─────────────────────────────────────────────────────────────────────────────────────────────
//   {
//     id:     'india'            unique; the canonical plate ids used elsewhere in the project are
//                                north_america, greenland, south_america, eurasia, india, arabia,
//                                africa, madagascar, australia, new_zealand, antarctica (+ japan)
//     name:   'India'            (used for rings that have no name of their own)
//     color:  LAND               legacy per-polygon colour (renderers take land colours from
//                                planetLook; plates that touch MUST share a colour or the seam shows)
//     anchor: [79, 22]           a reference point on the plate, PRESENT-DAY coordinates (used by
//                                the [Ma, lon, lat, spin] keyframe form)
//     track:  [ … ]              where the plate was — see below
//     parent: 'africa'           optional. The track is then RELATIVE to that plate: it describes
//                                where this plate sat on a map on which the parent stands still in
//                                its present-day position. World pose = parent pose ∘ own pose; a
//                                child whose rows repeat one pose is welded to its parent. Parents
//                                may be chained (sibumasu → indochina → south_china → eurasia); no
//                                cycles. A parent's id also covers its children for plateToWorld():
//                                a point given as 'eurasia' that lies in Siberia rides Siberia.
//     from:   ['gondwana']       hint for the hand-over morph: the id(s) of the continent of the
//                                youngest deep-time slice (570 Ma) this plate breaks out of (the
//                                first id that exists there wins; no hint → the nearest continent).
//                                An id may instead name another PLATE ('africa'): the plate then
//                                gets no share of the old continent of its own but slides out of
//                                that plate's share, the way islands do.
//     rings:  OUTLINES.india     the coastlines — see section 3
//   }
//
//   TRACK KEYFRAMES — either form, freely mixed, in any order:
//     [Ma, lon, lat, spin]
//         "At <Ma> the anchor point was at <lon>, <lat>, and the plate was turned <spin> degrees
//          clockwise (as seen on a north-up map) compared with today." [0, anchorLon, anchorLat, 0]
//         is the present day. The form to tune by eye: move the anchor, then turn the plate.
//     [Ma, { pole: [lon, lat], angle }]
//         A finite (Euler) rotation: present-day plate → its place at <Ma>, by <angle> degrees
//         about the pole, counter-clockwise positive looking down on the pole. The form of
//         published reconstruction poles (GPlates rotation files list lat, lon: swap them).
//         { pole: [0, 90], angle: 0 } is "no rotation".
//   Between two keyframes the pose is interpolated by quaternion slerp — one steady rigid rotation
//   about a fixed stage pole — so shapes never deform and nothing jumps at a keyframe. Because
//   slerp(A·X, B·X) = slerp(A, B)·X, two plates that hold the same RELATIVE pose at two keyframes
//   that both of them have stay locked together between those keyframes: give plates that are
//   welded together (Gondwana, Pangaea) keyframes at the SAME times, or make one the parent of the
//   other with a repeated pose. The KINEMATIC RANGE is the oldest time for which every plate has a
//   keyframe. Anchors and keyframe positions must not sit exactly on a pole. If a plate has to turn
//   more than ~90° between two keyframes, add one in between.
//
//   ORDER. findPlateAt() tests plates in the order listed and returns the first one that contains
//   the point, so a plate whose outline runs on UNDER a neighbour (see "hidden margins") must be
//   listed after that neighbour: india after tibet and tarim, arabia after iran and anatolia.
//
//   HOW THE OLD KEYFRAMES WERE MADE (rows from 80 Ma on). For each plate a representative plate of
//   the Merdith et al. (2021) model was rotated at 80, 90 … 540 Ma (every absolute plate at the same
//   times, as above); rows of child plates hold the rotation relative to the parent and leave out
//   repeats. Two adjustments: (1) a global rotation that maps the model's 66 Ma world onto the
//   hand-tuned 66 Ma world, fading out between 80 and 160 Ma, so the hand-over from the Cenozoic
//   rows is smooth (it turns every plate alike, so fits are untouched); (2) "snug fits": the model
//   fits continent–ocean boundaries, which leaves the modern COASTLINES of sutured plates 1–4° apart
//   (drowned shelves). Small rotations, solved by least squares on the facing coasts, close those
//   gaps inside Gondwana (fully applied 540–~140 Ma, released as each piece rifts away), inside
//   Laurussia (~420–80 Ma) and between Laurasia and Gondwana in Pangaea (~330–185 Ma).
//   Indochina and Sibumasu are welded to South China / Indochina since ~250 / ~160 Ma; their
//   Cenozoic escape along the Red River fault, which the rigid outlines cannot follow, is left out.
//
//   ADDING A KEYFRAME INSIDE THE RANGE (say 45 Ma): add rows only to the plates that need it. If a
//   plate is welded to another (Gondwana!), add the same time to both, with poses that keep their
//   relative position, or the fit opens between the keyframes.
//
//   EXTENDING THE RIGID REGIME (say to 600 Ma):
//     1. Add a row at the new oldest time to the track of EVERY plate (a child welded to its
//        parent repeats its last relative pose).
//     2. The kinematic range grows to the new time by itself (getKinematicRangeMa). Deep-time
//        slices at or after it are ignored from then on (delete them); the hand-over morph starts
//        from the next older slice.
//     3. Point every plate's `from` hint at its ancestor in that slice. The hand-over reads best
//        when that slice roughly covers where the plates stand at the range.
//     4. `emerge` windows must start inside the rigid regime (section 3).
//     5. Look at it with a geometry debug sheet (many small maps at chosen times), then check
//        numerically that plates stay rigid, that motion has no jumps at keyframes or at the
//        hand-over, and that markers still land on the right surface.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 2. DEEP-TIME SLICES  (`deepSlices`)
// ─────────────────────────────────────────────────────────────────────────────────────────────
//   { ma: 900, continents: [ {
//       id:       'rodinia'      the SAME id in consecutive slices means the same landmass: it
//                                morphs straight from one outline to the next
//       name:     'Rodinia'      an honest name; conjectural landmasses say so
//                                ('Kenorland (conjectural)')
//       color:    LAND
//       vertices: [[lon, lat], …]  a simple closed outline, any number of vertices (20–40 is
//                                plenty: the engine rounds the corners, adds stable coastline
//                                detail — two levels below 24 vertices, one above — re-parametrises
//                                both outlines of a morph by arc length and aligns them). Either
//                                winding. Every edge is taken the short way round, so an outline may
//                                cross the antimeridian (… 170, -175 …) and one that surrounds a pole
//                                walks all the way round it (no vertex on the pole itself). Keep
//                                consecutive vertices less than 180° of longitude apart.
//       from:     'laurentia'    optional: this continent breaks out of that continent of the
//                                next OLDER slice
//       into:     'rodinia'      optional: this continent has no successor of its own and fuses
//                                into that continent of the next YOUNGER slice
//   } ] }
//
//   HOW CONTINENTS ARE MATCHED between an older slice A and the next younger slice B:
//     1. every continent of B looks for its source in A: same id → its `from` hint → the nearest
//        continent of A (fallback);
//     2. a continent of A that nothing descends from fuses into a continent of B: its `into`
//        hint → the nearest continent of B.
//   One source with several descendants is a SPLIT: the parent's outline is partitioned among its
//   children — each starts as the piece of the parent nearest to where it is heading, so at the
//   moment of the split the pieces tile the parent exactly, then drift apart; a child that would
//   get no piece starts hidden inside the parent and slides out. Several continents with one
//   destination are a MERGE: the same thing run backwards. Nothing ever collapses to a point.
//   Along the chain parent → largest (or same-id) child the name and id switch half-way through
//   the morph; side branches carry their own name and are labelled only while they are separate.
//
//   ADDING A SLICE: add `{ ma, continents }` anywhere in the array (it is sorted on load); it must
//   be older than the kinematic range. Re-use the ids of neighbouring slices wherever a landmass
//   persists, and add `from` / `into` where the nearest-continent fallback would pick the wrong
//   relative. Before FIRST_CRUST_MA there is no land at all; between FIRST_CRUST_MA and the oldest
//   slice that slice's continents grow from nothing.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 3. PLATE OUTLINES  (generated block at the end of this file)
// ─────────────────────────────────────────────────────────────────────────────────────────────
//   Natural Earth 1:110m "land", v5.1.2, simplified with Douglas–Peucker (≈0.24° on continents,
//   0.2° on islands; islands under ~0.45 square degrees dropped), rounded to 0.1°: about 3,000
//   vertices in ~130 rings. The block between the <generated:outlines> markers came out of a
//   one-off generator script that is not part of the runtime; it can equally be edited by hand.
//   Two islets too small for the source data were drawn by hand because famous island endemics
//   need somewhere to stand: Mauritius, Galápagos.
//
//   Each plate has a list of rings:
//     { id, name?, label: [lon, lat], v: [lon,lat, lon,lat, …], main?, group?, oldName?, emerge?, origin? }
//       v       flat coordinate list in PRESENT-DAY position, counter-clockwise (land on the left),
//               longitudes continuous (Chukotka runs on past 180 to 190.1). Not closed: the last
//               vertex joins the first.
//       name    rings without one are small islands that are never labelled
//       label   a point well inside the ring for its name (it rides with the plate)
//       main    true on an extra continent-sized ring of the same plate: it gets its own share of
//               its ancestor in the hand-over morph. The first ring of a plate is always main;
//               the other rings are islands that ride with the nearest main ring.
//       group   the label group the ring belongs to (section 0)
//       oldName [name | null, Ma]: older than Ma the ring is labelled with that name instead —
//               North America is Laurentia before 420 Ma; null = not labelled (Greenland then).
//               Rings that are not main (islands) lose their labels between 66 and 120 Ma anyway:
//               "Kodiak Island" means little on a map of Pangaea. Names stay on the polygons.
//       emerge  [fromMa, toMa]: land that did not exist (or not as land) earlier — volcanic arcs,
//               the Isthmus of Panama, Iceland, accreted terranes such as Kolyma or Japan. Absent
//               before fromMa, it grows out of `origin` (default: `label`) and is complete at toMa.
//               fromMa must not be older than the kinematic range.
//
//   CUT LINES. Afro-Eurasia and the Americas are single rings in the source data. They were cut
//   along sutures: Suez, Bitlis–Zagros, Indus–Tsangpo, both ends of the Isthmus of Panama, the
//   Urals and the Greater Caucasus (Europe | Asia); then Asia along the Yenisei – Sayan –
//   Mongol–Okhotsk line (Siberia), the Verkhoyansk (Kolyma), the Kazakh uplands (West Siberia),
//   the Kunlun – Longmen Shan (Tibet), the Shan scarp (Sibumasu), the Red River (Indochina), the
//   Qinling–Dabie (South China), the Solonker (North China), the South Tien Shan (Tarim), the
//   Altai (Amuria), the Syr Darya (Kazakhstania | Turan), the Kopet Dag – Hindu Kush (Iran) and the
//   Lesser Caucasus (Anatolia); Europe along the Pyrenees (Iberia) and the Trans-European Suture
//   Zone (Armorica | Baltica); Britain and Ireland along the Iapetus suture (Scotland was
//   Laurentian); North America at the Suwannee suture (Florida) and Tehuantepec (Yucatán). The cut
//   lines are schematic. Renderers draw coast strokes first and land fills on top, so rings that
//   overlap read as one landmass; every cut therefore OVERLAPS its neighbour a little, no sliver of
//   sea shows while the pieces are together, and the cut is roughened so it reads as a natural
//   shore once the pieces part.
//   HIDDEN MARGINS. Two overlaps are deliberately large, because those plates really do continue
//   beneath their neighbours: `india` runs on ~14° north of the Himalayan suture ("Greater India",
//   now under Tibet and Tarim) and `arabia` ~3° beyond the Zagros suture.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 4. CRATON LINEAGES  (`cratonLineages`)
// ─────────────────────────────────────────────────────────────────────────────────────────────
//   A site (fossil locality, milestone place, extinction epicentre) rides its plate back to the
//   kinematic range and then the deep-time morphs (plateToWorld). Where several older continents
//   merge into one younger continent, the site follows the parent whose piece of the merged
//   outline it lies in: a matter of geometry, not geology, so the oldest rocks the story names
//   could end up on the wrong craton (Kaapvaal on Karelia, Pilbara beside an empty "Vaalbara").
//   An entry here names the deep-time continents a region's sites belong to:
//     { id, name, centre: [lon, lat], radiusDeg, lineage: [deep-time continent ids, young → old] }
//       centre, radiusDeg  PRESENT-DAY circle; a site inside it (the nearest centre wins) uses the entry
//       lineage            wherever a morph offers a choice of parents, the site follows the one
//                          listed here (the oldest-listed if several are offered); elsewhere it
//                          follows the default. Ids must exist in `deepSlices`.
//   The circles are deliberately generous approximations of the cratons, not outlines.

/** No continental crust before this (magma ocean; cf. magmaCurve in planet.js and the Jack Hills zircons). */
export const FIRST_CRUST_MA = 4400;

const LAND = '#8b7355';

const OUTLINES = outlines();

// ---------------------------------------------------------------------------------------------
// 0. Label groups (see the header)
// ---------------------------------------------------------------------------------------------
export const labelGroups = {
  north_america: { name: 'North America', label: [-101, 46], until: 150 },
  europe: { name: 'Europe', label: [24, 51.5], until: 320 },
  asia: { name: 'Asia', label: [96, 47], until: 150 },
  great_britain: { name: 'Great Britain', label: [-1.6, 52.3], until: 420 },
  ireland: { name: 'Ireland', label: [-7.9, 53.6], until: 420 },
};

// ---------------------------------------------------------------------------------------------
// 1. Plates
// ---------------------------------------------------------------------------------------------
// Rows up to 66 Ma (the twelve original plates) were tuned by eye; the reference frame there:
// Africa, India, South America, Antarctica and Eurasia are placed directly, North America turns
// about a pivot at the Bering Strait relative to Eurasia, Australia rides Antarctica, Arabia and
// Madagascar ride Africa. Rows from 80 Ma: Merdith et al. (2021), see the header.
//    0 Ma  today
//   20 Ma  Atlantic a little narrower; India docked; Australia ~10° south; the Red Sea a young rift
//   66 Ma  K–Pg: India an island continent; the South Atlantic two-thirds of today's width
//  100 Ma  the South Atlantic unzipping from the south; India and Madagascar off Africa
//  150 Ma  a narrow Central Atlantic and proto-Gulf of Mexico between Laurasia and Gondwana
//  200 Ma  Pangaea intact, rifting between North America and Africa
//  250 Ma  Pangaea complete, a C-shape around the Tethys; the Cimmerian blocks drifting north
//  300 Ma  Pangaea assembling along the Variscan–Appalachian belt; Siberia approaching
//  430 Ma  Laurentia and Baltica colliding (Laurussia); Gondwana over the South Pole
//  540 Ma  Gondwana assembled around the South Pole; Laurentia, Baltica, Siberia scattered
// <generated:plates>
export const plates = [
  {
    // Drifts west and a little north as the South Atlantic widens; nested against Africa until ~130 Ma.
    id: 'south_america', name: 'South America', color: LAND, from: ['gondwana'],
    anchor: [-58, -12],
    track: [
      [0, -58, -12, 0],
      [20, -55.5, -13.3, 0],
      [34, -53.5, -14.5, 0],
      [50, -50.5, -16, 0],
      [66, -48, -17, 0],
      // from 80 Ma: Merdith et al. (2021)
      [80, { pole: [-24.49, 87.81], angle: 21.71 }],
      [90, { pole: [-73.37, 82.63], angle: 26.03 }],
      [100, { pole: [-88.36, 81.33], angle: 30.46 }],
      [110, { pole: [-108.61, 82.57], angle: 35.1 }],
      [120, { pole: [-115.21, 83.67], angle: 40.01 }],
      [130, { pole: [-104.76, 87.29], angle: 42.24 }],
      [140, { pole: [45.63, 89.23], angle: 45.85 }],
      [150, { pole: [95.74, 85.26], angle: 46.23 }],
      [160, { pole: [10.73, 83.46], angle: 46.49 }],
      [170, { pole: [-1.3, 81.31], angle: 46.69 }],
      [180, { pole: [-8.64, 75.54], angle: 47.16 }],
      [190, { pole: [-7.94, 71.28], angle: 47.53 }],
      [200, { pole: [-4.03, 69.18], angle: 47.46 }],
      [210, { pole: [2.48, 67.09], angle: 47.15 }],
      [220, { pole: [10.72, 68.08], angle: 46.36 }],
      [230, { pole: [37.86, 71.03], angle: 44.88 }],
      [240, { pole: [61.34, 71.1], angle: 44.61 }],
      [250, { pole: [80.57, 70.12], angle: 44.97 }],
      [260, { pole: [90.11, 66.23], angle: 45.54 }],
      [270, { pole: [86.81, 65.07], angle: 45.44 }],
      [280, { pole: [86.67, 60.51], angle: 45.92 }],
      [290, { pole: [87.49, 54.54], angle: 47.03 }],
      [300, { pole: [82.31, 52.11], angle: 47.2 }],
      [310, { pole: [81.22, 50.32], angle: 47.57 }],
      [320, { pole: [85.02, 45.15], angle: 49.54 }],
      [330, { pole: [85.01, 42.01], angle: 50.79 }],
      [340, { pole: [76.38, 31.97], angle: 55.12 }],
      [350, { pole: [67.09, 20.35], angle: 63.66 }],
      [360, { pole: [62.89, 14.75], angle: 69.82 }],
      [370, { pole: [61.63, 13.15], angle: 71.9 }],
      [380, { pole: [61.37, 12.65], angle: 72.59 }],
      [390, { pole: [57.56, 14.99], angle: 69.37 }],
      [400, { pole: [55.61, 13.02], angle: 72.01 }],
      [410, { pole: [48.09, 20.83], angle: 65.31 }],
      [420, { pole: [48.78, 8.83], angle: 78.91 }],
      [430, { pole: [48.73, 0.66], angle: 95.88 }],
      [440, { pole: [48.69, -5.54], angle: 113.73 }],
      [450, { pole: [54.79, -5.73], angle: 113.6 }],
      [460, { pole: [58.58, -4.71], angle: 110.25 }],
      [470, { pole: [60.47, -4.31], angle: 109.06 }],
      [480, { pole: [62.31, -2.65], angle: 104.23 }],
      [490, { pole: [63.01, -1.44], angle: 100.92 }],
      [500, { pole: [63.96, 0.13], angle: 96.87 }],
      [510, { pole: [62.85, 0.59], angle: 95.61 }],
      [520, { pole: [56.62, -0.12], angle: 97.18 }],
      [530, { pole: [49.73, 0.27], angle: 96.69 }],
      [540, { pole: [47.1, 1.51], angle: 94.04 }],
    ],
    rings: OUTLINES.south_america,
  },
  {
    // Laurentia. Relative to Eurasia: closing the North Atlantic is a turn about the Bering Strait.
    id: 'north_america', name: 'North America', color: LAND, from: ['laurentia'], parent: 'eurasia',
    anchor: [-100, 45],
    track: [
      [0, -100, 45, 0],
      [20, { pole: [-169, 66], angle: 4 }],
      [34, { pole: [-169, 66], angle: 7 }],
      [50, { pole: [-169, 66], angle: 12 }],
      [66, { pole: [-169, 66], angle: 17.5 }],
      // from 80 Ma: Merdith et al. (2021)
      [80, { pole: [147.79, 59.15], angle: 22.6 }],
      [90, { pole: [149.91, 61.92], angle: 23.81 }],
      [100, { pole: [150.57, 62.19], angle: 24.1 }],
      [110, { pole: [151.22, 62.45], angle: 24.38 }],
      [120, { pole: [151.86, 62.71], angle: 24.67 }],
      [130, { pole: [151.84, 63.18], angle: 24.98 }],
      [140, { pole: [151.81, 63.63], angle: 25.29 }],
      [150, { pole: [151.78, 64.08], angle: 25.61 }],
      [160, { pole: [151.75, 64.51], angle: 25.93 }],
      [170, { pole: [151.72, 64.94], angle: 26.25 }],
      [180, { pole: [151.69, 65.35], angle: 26.57 }],
      [190, { pole: [151.69, 65.77], angle: 26.89 }],
      [200, { pole: [151.63, 66.16], angle: 27.21 }],
      [390, { pole: [151.63, 66.16], angle: 27.21 }],
      [400, { pole: [152.15, 65.77], angle: 27.31 }],
      [410, { pole: [153.03, 67.02], angle: 26.13 }],
      [420, { pole: [154.5, 69.44], angle: 24.29 }],
      [430, { pole: [155.36, 69.57], angle: 24.02 }],
      [440, { pole: [-102.29, 65.34], angle: 26.94 }],
      [450, { pole: [-37.21, 63.15], angle: 46.65 }],
      [460, { pole: [-17.98, 57.39], angle: 69.97 }],
      [470, { pole: [-8.31, 44.17], angle: 96.7 }],
      [480, { pole: [-7, 39.11], angle: 102.06 }],
      [490, { pole: [-11.51, 36.25], angle: 84.15 }],
      [500, { pole: [-18.47, 30.88], angle: 67.69 }],
      [510, { pole: [-26.94, 24.92], angle: 53.32 }],
      [520, { pole: [-40.11, 13.96], angle: 42.79 }],
      [530, { pole: [-46.26, -18.71], angle: 30.89 }],
      [540, { pole: [-80.33, -35], angle: 33.6 }],
    ],
    rings: OUTLINES.north_america,
  },
  {
    // The Suwannee terrane: a sliver of Gondwana (West Africa) left on North America when Pangaea broke up.
    id: 'florida', name: 'Florida', color: LAND, from: ['gondwana'], parent: 'north_america',
    anchor: [-81.6, 28.6],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [320, { pole: [0, 90], angle: 0 }],
      [330, { pole: [87.35, 35.08], angle: 4.5 }],
      [340, { pole: [87.33, 35.14], angle: 9 }],
      [350, { pole: [87.33, 35.14], angle: 13.51 }],
      [360, { pole: [87.33, 35.14], angle: 18.01 }],
      [370, { pole: [92.06, 28.77], angle: 21.27 }],
      [380, { pole: [95.15, 24.03], angle: 24.79 }],
      [390, { pole: [104.11, 26.13], angle: 27.97 }],
      [400, { pole: [111.37, 27.38], angle: 31.61 }],
      [410, { pole: [117.51, 27.62], angle: 35.57 }],
      [420, { pole: [93.6, 28.1], angle: 44.29 }],
      [430, { pole: [80.61, 22.43], angle: 59.45 }],
      [440, { pole: [71.41, 10.47], angle: 63.94 }],
      [450, { pole: [83.38, 4.77], angle: 63.55 }],
      [460, { pole: [95.33, 4.18], angle: 64.02 }],
      [470, { pole: [103.33, 4.18], angle: 65.59 }],
      [480, { pole: [113.44, 6.86], angle: 68.64 }],
      [490, { pole: [120.66, 9.35], angle: 72.39 }],
      [500, { pole: [127.84, 11.81], angle: 77.56 }],
      [510, { pole: [132.72, 12.75], angle: 78.58 }],
      [520, { pole: [132.2, 16.8], angle: 77.18 }],
      [530, { pole: [132.71, 22.87], angle: 78.72 }],
      [540, { pole: [125.93, 20.44], angle: 84.76 }],
    ],
    rings: OUTLINES.florida,
  },
  {
    // Yucatán and Central America: rotated out of the Gulf of Mexico 165–140 Ma.
    id: 'yucatan', name: 'Yucatán', color: LAND, from: ['gondwana'], parent: 'north_america',
    anchor: [-89.2, 18.6],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [60, { pole: [0, 90], angle: 0 }],
      [80, { pole: [-121.87, -58.28], angle: 4.68 }],
      [140, { pole: [-121.87, -58.28], angle: 4.68 }],
      [150, { pole: [99.61, -34.39], angle: 18.33 }],
      [160, { pole: [96.66, -27.39], angle: 36.22 }],
      [170, { pole: [95.91, -24.43], angle: 60.14 }],
      [180, { pole: [95.98, -25.13], angle: 66.46 }],
      [190, { pole: [96.16, -26.45], angle: 67.45 }],
      [200, { pole: [96.32, -27.75], angle: 68.43 }],
      [210, { pole: [96.32, -27.91], angle: 68.63 }],
      [220, { pole: [96.32, -28.06], angle: 68.84 }],
      [230, { pole: [96.32, -28.22], angle: 69.04 }],
      [240, { pole: [96.31, -28.37], angle: 69.25 }],
      [250, { pole: [96.55, -27.64], angle: 69.56 }],
      [310, { pole: [96.55, -27.64], angle: 69.56 }],
      [320, { pole: [96.55, -27.63], angle: 69.55 }],
      [330, { pole: [98.23, -24.53], angle: 71.64 }],
      [340, { pole: [99.75, -21.58], angle: 73.94 }],
      [350, { pole: [101.12, -18.78], angle: 76.41 }],
      [360, { pole: [102.38, -16.13], angle: 79.04 }],
      [370, { pole: [103.51, -15.82], angle: 82.91 }],
      [380, { pole: [104.54, -15.53], angle: 86.81 }],
      [390, { pole: [108.05, -15.25], angle: 88.44 }],
      [400, { pole: [111.44, -14.94], angle: 90.26 }],
      [410, { pole: [114.74, -14.79], angle: 92.41 }],
      [420, { pole: [108.92, -6.75], angle: 100.4 }],
      [430, { pole: [103.98, -0.72], angle: 114.52 }],
      [440, { pole: [95.99, -2.19], angle: 122.06 }],
      [450, { pole: [100.38, -8.27], angle: 126.27 }],
      [460, { pole: [106.39, -12], angle: 127.81 }],
      [470, { pole: [110.72, -14.24], angle: 129.06 }],
      [480, { pole: [117.35, -15.72], angle: 129.61 }],
      [490, { pole: [122.75, -16.3], angle: 130.38 }],
      [500, { pole: [128.68, -16.66], angle: 131.63 }],
      [510, { pole: [132.03, -17.57], angle: 130.22 }],
      [520, { pole: [132.32, -15.17], angle: 127.19 }],
      [530, { pole: [134.33, -11.45], angle: 124.96 }],
      [540, { pole: [131.47, -9.91], angle: 133.96 }],
    ],
    rings: OUTLINES.yucatan,
  },
  {
    // Fixed to North America since ~35 Ma; before that it swings back against Labrador and Baffin Island.
    id: 'greenland', name: 'Greenland', color: LAND, from: ['north_america'], parent: 'north_america',
    anchor: [-42, 72],
    track: [
      [0, -42, 72, 0],
      [20, -42, 72, 0],
      [34, -42, 72, 0],
      [50, -44.5, 71.2, 3],
      [66, -50, 68.8, 10],
      // from 80 Ma: Merdith et al. (2021)
      [80, { pole: [42.8, -59.92], angle: 8.37 }],
      [90, { pole: [47.93, -61.82], angle: 9.99 }],
      [100, { pole: [47.62, -61.8], angle: 10.32 }],
      [110, { pole: [47.32, -61.78], angle: 10.65 }],
      [120, { pole: [47.05, -61.76], angle: 10.98 }],
      [540, { pole: [47.05, -61.76], angle: 10.98 }],
    ],
    rings: OUTLINES.greenland,
  },
  {
    // The Eurasian plate proper. Its main ring is Baltica (Scandinavia and the East European platform); the other blocks of Europe and Asia hang off it.
    id: 'eurasia', name: 'Eurasia', color: LAND, from: ['baltica'],
    anchor: [60, 55],
    track: [
      [0, 60, 55, 0],
      [20, { pole: [60, 0], angle: 1.3 }],
      [34, { pole: [57, 0], angle: 2.2 }],
      [50, { pole: [68, 0], angle: 3.8 }],
      [66, { pole: [88, 0], angle: 4.5 }],
      // from 80 Ma: Merdith et al. (2021)
      [80, { pole: [63.19, 52.29], angle: 4.38 }],
      [90, { pole: [37.97, 73.71], angle: 7.78 }],
      [100, { pole: [54.33, 80.66], angle: 13.49 }],
      [110, { pole: [92.54, 78.55], angle: 19.64 }],
      [120, { pole: [83.94, 75.69], angle: 26.33 }],
      [130, { pole: [84.6, 69.22], angle: 30.39 }],
      [140, { pole: [88.62, 64.46], angle: 34.54 }],
      [150, { pole: [89.67, 59.5], angle: 38.38 }],
      [160, { pole: [64.42, 60.94], angle: 42.94 }],
      [170, { pole: [53.9, 60.29], angle: 46.42 }],
      [180, { pole: [42.82, 57.73], angle: 49.1 }],
      [190, { pole: [37.91, 53.58], angle: 52.06 }],
      [200, { pole: [37.84, 49.35], angle: 54.82 }],
      [210, { pole: [38.46, 46.81], angle: 55.97 }],
      [220, { pole: [42.14, 45.75], angle: 55.83 }],
      [230, { pole: [53.21, 43.86], angle: 54.63 }],
      [240, { pole: [61.3, 42.43], angle: 54.08 }],
      [250, { pole: [67.88, 41.57], angle: 52.63 }],
      [260, { pole: [72.77, 38.98], angle: 53.16 }],
      [270, { pole: [71.61, 37.91], angle: 53.74 }],
      [280, { pole: [72.58, 34.48], angle: 55.28 }],
      [290, { pole: [74.23, 30.16], angle: 57.54 }],
      [300, { pole: [71.74, 28.33], angle: 59.04 }],
      [310, { pole: [71.36, 27.08], angle: 59.97 }],
      [320, { pole: [74.77, 24.54], angle: 61.79 }],
      [330, { pole: [73.92, 22.07], angle: 59.06 }],
      [340, { pole: [67.87, 12.62], angle: 63.16 }],
      [350, { pole: [61.42, 2.05], angle: 72.72 }],
      [360, { pole: [58.18, -4.36], angle: 78.34 }],
      [370, { pole: [54.96, -7.29], angle: 80.55 }],
      [380, { pole: [52.36, -9.56], angle: 81.06 }],
      [390, { pole: [47.89, -10.81], angle: 81.77 }],
      [400, { pole: [46.61, -14.7], angle: 88.71 }],
      [410, { pole: [39.22, -11.47], angle: 86.78 }],
      [420, { pole: [40.25, -24.25], angle: 88.74 }],
      [430, { pole: [41.39, -36.29], angle: 93.39 }],
      [440, { pole: [48.85, -30.63], angle: 103.11 }],
      [450, { pole: [66.84, -33.42], angle: 109.41 }],
      [460, { pole: [83.68, -33.62], angle: 119.3 }],
      [470, { pole: [101.56, -25.47], angle: 122.91 }],
      [480, { pole: [103.15, -21.64], angle: 123.81 }],
      [490, { pole: [90.46, -22.64], angle: 120.19 }],
      [500, { pole: [77.36, -22.62], angle: 118.73 }],
      [510, { pole: [64.43, -21.36], angle: 120.66 }],
      [520, { pole: [52.34, -19.07], angle: 125.83 }],
      [530, { pole: [37.71, -19.94], angle: 122.93 }],
      [540, { pole: [22.83, -19.6], angle: 122.87 }],
    ],
    rings: OUTLINES.eurasia,
  },
  {
    // Northwest Britain and Ireland: part of Laurentia until the Iapetus Ocean closed (~420 Ma).
    id: 'scotland', name: 'Scotland', color: LAND, from: ['north_america'], parent: 'eurasia',
    anchor: [-4.3, 57],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [430, { pole: [0, 90], angle: 0 }],
      [440, { pole: [-58.5, 10.46], angle: 15.41 }],
      [450, { pole: [-19.59, 34.54], angle: 34.74 }],
      [460, { pole: [-4.41, 39.52], angle: 58.32 }],
      [470, { pole: [4.04, 31.79], angle: 88.85 }],
      [480, { pole: [5.07, 27.55], angle: 96.01 }],
      [490, { pole: [0.14, 21.3], angle: 80.17 }],
      [500, { pole: [-7.01, 11.9], angle: 67.06 }],
      [510, { pole: [-15.25, 1.44], angle: 56.36 }],
      [520, { pole: [-27.29, -11.91], angle: 50.87 }],
      [530, { pole: [-33.84, -39.46], angle: 49.23 }],
      [540, { pole: [-61.31, -48.42], angle: 53.15 }],
    ],
    rings: OUTLINES.scotland,
  },
  {
    // England, Wales and southeast Ireland: rifted off Gondwana ~480 Ma, docked with Baltica ~445 Ma.
    id: 'avalonia', name: 'Avalonia', color: LAND, from: ['gondwana'], parent: 'eurasia',
    anchor: [-1.6, 52.3],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [440, { pole: [0, 90], angle: 0 }],
      [450, { pole: [140.41, -23.99], angle: 14.67 }],
      [460, { pole: [135.72, 11.28], angle: 18.18 }],
      [470, { pole: [69.38, 55.42], angle: 30.76 }],
      [480, { pole: [60.79, 58.87], angle: 33.88 }],
      [490, { pole: [112.54, 44.98], angle: 19.37 }],
      [500, { pole: [161.34, -13.79], angle: 17.78 }],
      [510, { pole: [177.33, -37.87], angle: 33.05 }],
      [520, { pole: [179.32, -45.15], angle: 43.93 }],
      [530, { pole: [164.85, -44.37], angle: 58.3 }],
      [540, { pole: [159.88, -44.18], angle: 78.68 }],
    ],
    rings: OUTLINES.avalonia,
  },
  {
    // France, central Europe, Italy and the Balkans (the Armorican terranes, peri-Gondwanan until the Variscan collision ~330 Ma).
    id: 'west_europe', name: 'Armorica', color: LAND, from: ['gondwana'], parent: 'eurasia',
    anchor: [6.5, 47.5],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [320, { pole: [0, 90], angle: 0 }],
      [330, { pole: [113.56, 32.18], angle: 3.97 }],
      [340, { pole: [111.88, 30.77], angle: 8.19 }],
      [350, { pole: [110.5, 29.28], angle: 12.68 }],
      [360, { pole: [109.86, 28.56], angle: 17.17 }],
      [370, { pole: [115.12, 22.21], angle: 20.42 }],
      [380, { pole: [118.6, 17.55], angle: 23.94 }],
      [390, { pole: [126.8, 20.84], angle: 27.24 }],
      [400, { pole: [133.75, 22.98], angle: 31.11 }],
      [410, { pole: [139.27, 24.41], angle: 35.31 }],
      [420, { pole: [115.27, 22.8], angle: 43.65 }],
      [430, { pole: [102.81, 16.04], angle: 58.52 }],
      [440, { pole: [89.55, 11.19], angle: 49.99 }],
      [450, { pole: [94.24, 31.34], angle: 53.28 }],
      [460, { pole: [98.42, 53.95], angle: 62.56 }],
      [470, { pole: [63.9, 66.5], angle: 78.16 }],
      [480, { pole: [45.97, 71.11], angle: 76.44 }],
      [490, { pole: [70.08, 74.65], angle: 56.33 }],
      [500, { pole: [129.18, 70.42], angle: 38.94 }],
      [510, { pole: [155.44, 44.73], angle: 29.19 }],
      [520, { pole: [159.22, 20.6], angle: 27.01 }],
      [530, { pole: [143.25, -2.06], angle: 35.47 }],
      [540, { pole: [138.88, -19.13], angle: 51.8 }],
    ],
    rings: OUTLINES.west_europe,
  },
  {
    // Turned ~35° anticlockwise as the Bay of Biscay opened (~120–85 Ma); peri-Gondwanan in the early Paleozoic.
    id: 'iberia', name: 'Iberia', color: LAND, from: ['gondwana'], parent: 'eurasia',
    anchor: [-3.8, 40.2],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [10, { pole: [137.62, -2.49], angle: 0.03 }],
      [20, { pole: [30.24, 26.99], angle: 0.17 }],
      [30, { pole: [-10.65, 39.53], angle: 1.82 }],
      [40, { pole: [1.3, 47.34], angle: 0.42 }],
      [50, { pole: [165.79, -34.24], angle: 2.29 }],
      [60, { pole: [168.91, -35.09], angle: 4.42 }],
      [80, { pole: [169.36, -39.06], angle: 9.6 }],
      [90, { pole: [173.52, -42.01], angle: 14.25 }],
      [100, { pole: [175.31, -44.92], angle: 20.28 }],
      [110, { pole: [176.43, -46.53], angle: 26.34 }],
      [120, { pole: [179.15, -47.93], angle: 32.46 }],
      [130, { pole: [-176.52, -49.07], angle: 39.14 }],
      [140, { pole: [-177.43, -49.26], angle: 45.65 }],
      [150, { pole: [-177.76, -49.34], angle: 48.71 }],
      [320, { pole: [-177.76, -49.34], angle: 48.71 }],
      [330, { pole: [175.81, -44.31], angle: 72.31 }],
      [340, { pole: [173.5, -41.08], angle: 84.29 }],
      [350, { pole: [172.6, -37.79], angle: 84.36 }],
      [360, { pole: [171.78, -34.52], angle: 84.62 }],
      [370, { pole: [171.4, -32.48], angle: 87.67 }],
      [380, { pole: [171.06, -30.56], angle: 90.78 }],
      [390, { pole: [173.79, -28.37], angle: 92.59 }],
      [400, { pole: [176.42, -26.18], angle: 94.76 }],
      [410, { pole: [178.86, -24.01], angle: 97.11 }],
      [420, { pole: [169.29, -17.13], angle: 94.91 }],
      [430, { pole: [159.63, -9.51], angle: 99.93 }],
      [440, { pole: [153.49, -15.92], angle: 92.25 }],
      [450, { pole: [162.33, -8.29], angle: 83.59 }],
      [460, { pole: [175.53, 2.3], angle: 72.83 }],
      [470, { pole: [-178.69, 20.25], angle: 51.82 }],
      [480, { pole: [-170.59, 17.94], angle: 44.18 }],
      [490, { pole: [-172.13, -5.55], angle: 54.23 }],
      [500, { pole: [-172.23, -19.94], angle: 70.8 }],
      [510, { pole: [-173.93, -27.69], angle: 87.17 }],
      [520, { pole: [-176.49, -31.63], angle: 97.16 }],
      [530, { pole: [175.11, -29.85], angle: 109.33 }],
      [540, { pole: [168.87, -29.3], angle: 127.87 }],
    ],
    rings: OUTLINES.iberia,
  },
  {
    // The Siberian craton with its Arctic and Baikal margins; joined Baltica along the Urals ~300–250 Ma.
    id: 'siberia', name: 'Siberia', color: LAND, from: ['siberia'], parent: 'eurasia',
    anchor: [104, 63],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [180, { pole: [0, 90], angle: 0 }],
      [190, { pole: [-59.73, 12.36], angle: 0.02 }],
      [200, { pole: [-59.38, 13.2], angle: 0.04 }],
      [230, { pole: [-59.38, 13.2], angle: 0.04 }],
      [240, { pole: [144.6, 77], angle: 1 }],
      [250, { pole: [142.53, 75.81], angle: 2 }],
      [260, { pole: [140.46, 78.73], angle: 3 }],
      [270, { pole: [138.98, 80.18], angle: 4 }],
      [280, { pole: [137.86, 81.05], angle: 5 }],
      [290, { pole: [137.67, 80.95], angle: 6.25 }],
      [300, { pole: [137.55, 80.88], angle: 7.5 }],
      [310, { pole: [137.46, 80.84], angle: 8.75 }],
      [320, { pole: [139.7, 81.77], angle: 10 }],
      [330, { pole: [148.96, 25.76], angle: 6.02 }],
      [340, { pole: [149.6, -26], angle: 10.7 }],
      [350, { pole: [157.95, 3.76], angle: 19.26 }],
      [360, { pole: [149.29, 5.81], angle: 39.69 }],
      [370, { pole: [147.05, 10.81], angle: 54.07 }],
      [380, { pole: [140.3, 10.66], angle: 59.94 }],
      [390, { pole: [134.02, 8.69], angle: 69.81 }],
      [400, { pole: [128.44, 9.98], angle: 74.03 }],
      [410, { pole: [122.98, 6.31], angle: 82.25 }],
      [420, { pole: [120.49, 20.97], angle: 85.46 }],
      [430, { pole: [114.42, 32.48], angle: 94.44 }],
      [440, { pole: [121.71, 37.8], angle: 78.8 }],
      [450, { pole: [127.17, 52.79], angle: 79.09 }],
      [460, { pole: [131.37, 67.36], angle: 83.52 }],
      [470, { pole: [39.61, 76.27], angle: 93.9 }],
      [480, { pole: [19.3, 69.3], angle: 101.75 }],
      [490, { pole: [23.71, 68.15], angle: 91.36 }],
      [500, { pole: [26.03, 66.7], angle: 80.81 }],
      [510, { pole: [25.41, 66.2], angle: 70.3 }],
      [520, { pole: [-0.91, 63.44], angle: 47.9 }],
      [530, { pole: [-14.37, 42.38], angle: 24.55 }],
      [540, { pole: [-51.66, -28.58], angle: 16.7 }],
    ],
    rings: OUTLINES.siberia,
  },
  {
    // North-east Asia beyond the Verkhoyansk: accreted terranes that only arrive ~130 Ma (they emerge then).
    id: 'kolyma', name: 'Kolyma', color: LAND, from: ['siberia'], parent: 'siberia',
    anchor: [155, 66],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [540, { pole: [0, 90], angle: 0 }],
    ],
    rings: OUTLINES.kolyma,
  },
  {
    // The West Siberian Basin: floored by arcs welded between Baltica, Kazakhstania and Siberia (~330–300 Ma; it emerges then).
    id: 'west_siberia', name: 'West Siberia', color: LAND, from: ['siberia'], parent: 'eurasia',
    anchor: [72, 62],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [310, { pole: [0, 90], angle: 0 }],
      [320, { pole: [-123.11, -21.86], angle: 10.18 }],
      [330, { pole: [-175.49, -14.92], angle: 12.38 }],
      [340, { pole: [178.55, 11.63], angle: 18.01 }],
      [350, { pole: [-175.91, 3.14], angle: 27.36 }],
      [360, { pole: [-173.49, -0.57], angle: 46.32 }],
      [370, { pole: [-175.29, -2.87], angle: 56.19 }],
      [380, { pole: [-173.54, -7.67], angle: 60.64 }],
      [390, { pole: [178.12, -5.94], angle: 65.4 }],
      [400, { pole: [171.83, -3.48], angle: 65.23 }],
      [410, { pole: [164.34, 0.83], angle: 66.35 }],
      [420, { pole: [157.43, 14.46], angle: 70.56 }],
      [430, { pole: [157.43, 14.46], angle: 70.56 }],
      [440, { pole: [171.34, 14.39], angle: 64.97 }],
      [450, { pole: [-174.64, 35.04], angle: 62.51 }],
      [460, { pole: [-153.36, 52.17], angle: 69.04 }],
      [470, { pole: [-106.48, 64.03], angle: 71.86 }],
      [480, { pole: [-94.34, 61.36], angle: 70.67 }],
      [490, { pole: [-122.46, 53.53], angle: 60.2 }],
      [500, { pole: [-143.37, 37.97], angle: 55.3 }],
      [510, { pole: [-155.9, 18.94], angle: 58.13 }],
      [520, { pole: [-163.24, 2.46], angle: 67.74 }],
      [530, { pole: [-178.55, -7.16], angle: 79.62 }],
      [540, { pole: [169.66, -14.04], angle: 95.74 }],
    ],
    rings: OUTLINES.west_siberia,
  },
  {
    // An archipelago of arcs and microcontinents that welded into one block and joined Pangaea ~300 Ma.
    id: 'kazakhstania', name: 'Kazakhstania', color: LAND, from: ['gondwana'], parent: 'eurasia',
    anchor: [72, 47.5],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [310, { pole: [0, 90], angle: 0 }],
      [320, { pole: [77.03, 51.63], angle: 53.87 }],
      [330, { pole: [113.17, 48.29], angle: 24.92 }],
      [340, { pole: [171.32, 41.29], angle: 22.49 }],
      [350, { pole: [-155.11, 3.7], angle: 32.29 }],
      [360, { pole: [-155.99, -7.62], angle: 54.91 }],
      [370, { pole: [-163.4, -5.8], angle: 62.79 }],
      [380, { pole: [-161.96, -4.11], angle: 68.77 }],
      [390, { pole: [-163.26, 0.77], angle: 74.35 }],
      [400, { pole: [-166.52, 2.92], angle: 73.27 }],
      [410, { pole: [-170.86, 7.06], angle: 71.98 }],
      [420, { pole: [-149.89, 6.25], angle: 69.39 }],
      [430, { pole: [-134.27, -0.38], angle: 72.37 }],
      [440, { pole: [-126.91, -19.19], angle: 87.57 }],
      [450, { pole: [-119.34, -16.39], angle: 73.64 }],
      [460, { pole: [-103.42, -12.2], angle: 64.69 }],
      [470, { pole: [-66.41, -7.45], angle: 59.38 }],
      [480, { pole: [-62.64, -0.01], angle: 58.04 }],
      [490, { pole: [-83.67, -0.42], angle: 51.81 }],
      [500, { pole: [-111.72, -12.22], angle: 57.56 }],
      [510, { pole: [-132.28, -22.61], angle: 69.35 }],
      [520, { pole: [-146.24, -30.88], angle: 78.88 }],
      [530, { pole: [-166.99, -34.35], angle: 90.17 }],
      [540, { pole: [178.48, -36.21], angle: 112.86 }],
    ],
    rings: OUTLINES.kazakhstania,
  },
  {
    // Joined Kazakhstania along the Tien Shan ~300 Ma.
    id: 'tarim', name: 'Tarim', color: LAND, from: ['tarim'], parent: 'eurasia',
    anchor: [83, 39.3],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [300, { pole: [0, 90], angle: 0 }],
      [310, { pole: [-106.47, -53.43], angle: 27.94 }],
      [320, { pole: [-124.15, -40.47], angle: 28.89 }],
      [330, { pole: [-166.77, -22.82], angle: 25.37 }],
      [340, { pole: [176.89, 8.24], angle: 31.42 }],
      [350, { pole: [170.87, 11.06], angle: 44.67 }],
      [360, { pole: [167.84, 8.72], angle: 66.65 }],
      [370, { pole: [155.64, 5.32], angle: 73.28 }],
      [380, { pole: [150.36, 2.49], angle: 75.4 }],
      [390, { pole: [144.22, 1.79], angle: 81.34 }],
      [400, { pole: [150.61, 1.46], angle: 85.89 }],
      [410, { pole: [156.06, 3.23], angle: 91.54 }],
      [420, { pole: [156.4, 10.48], angle: 83.03 }],
      [430, { pole: [153.63, 15.75], angle: 77.45 }],
      [440, { pole: [145.94, 8.17], angle: 64.35 }],
      [450, { pole: [148.98, 15.39], angle: 58.58 }],
      [460, { pole: [157.42, 26.83], angle: 48.45 }],
      [470, { pole: [160.12, 70.41], angle: 38.55 }],
      [480, { pole: [-169.03, 71.85], angle: 35.03 }],
      [490, { pole: [-172.81, 27.21], angle: 31.33 }],
      [500, { pole: [-174.18, -6.62], angle: 45.21 }],
      [510, { pole: [-177.93, -21.65], angle: 63.44 }],
      [520, { pole: [177.23, -28.38], angle: 76.54 }],
      [530, { pole: [165.93, -28.31], angle: 93.51 }],
      [540, { pole: [158.62, -29.45], angle: 116.88 }],
    ],
    rings: OUTLINES.tarim,
  },
  {
    // Mongolia and Manchuria: joined North China ~250 Ma and Siberia when the Mongol–Okhotsk Ocean closed (~150 Ma).
    id: 'amuria', name: 'Amuria', color: LAND, from: ['siberia'], parent: 'eurasia',
    anchor: [104, 46.5],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [130, { pole: [0, 90], angle: 0 }],
      [140, { pole: [-177.56, 0.8], angle: 2.25 }],
      [150, { pole: [-177.56, 0.8], angle: 4.5 }],
      [160, { pole: [-142.78, -15.07], angle: 5.48 }],
      [170, { pole: [-122.28, -21.63], angle: 7.9 }],
      [180, { pole: [-111.49, -23.95], angle: 10.83 }],
      [190, { pole: [-108.11, -22.02], angle: 14.42 }],
      [200, { pole: [-107.49, -19.09], angle: 18.39 }],
      [210, { pole: [-97.8, -27.92], angle: 29.5 }],
      [220, { pole: [-95.77, -29.98], angle: 41.61 }],
      [230, { pole: [-96.61, -29.53], angle: 53.82 }],
      [240, { pole: [-98.56, -27.73], angle: 65.81 }],
      [250, { pole: [-102.08, -29.52], angle: 64.47 }],
      [260, { pole: [-104.91, -25.37], angle: 57.78 }],
      [270, { pole: [-108.2, -20.15], angle: 51.6 }],
      [280, { pole: [-112.28, -13.11], angle: 48.43 }],
      [290, { pole: [-116.57, -4.89], angle: 46.26 }],
      [300, { pole: [-121.05, 3.91], angle: 45.36 }],
      [310, { pole: [-125.67, 12.77], angle: 45.81 }],
      [320, { pole: [-129.86, 20.83], angle: 46.41 }],
      [330, { pole: [-143.29, 20.4], angle: 45.93 }],
      [340, { pole: [-156.73, 19.67], angle: 48.01 }],
      [350, { pole: [-165.58, 21.26], angle: 45.92 }],
      [360, { pole: [170.57, 17.04], angle: 51.39 }],
      [370, { pole: [161.75, 20.7], angle: 64.69 }],
      [380, { pole: [152.43, 20.57], angle: 69.05 }],
      [390, { pole: [142.86, 18.42], angle: 77.73 }],
      [400, { pole: [135.79, 19.15], angle: 81.67 }],
      [410, { pole: [128.14, 15.15], angle: 89.54 }],
      [420, { pole: [125.38, 27.2], angle: 88.12 }],
      [430, { pole: [116.9, 36.96], angle: 91.85 }],
      [440, { pole: [123.2, 41.51], angle: 72.28 }],
      [450, { pole: [123.03, 57.56], angle: 69.16 }],
      [460, { pole: [121.03, 73.29], angle: 75.61 }],
      [470, { pole: [22.63, 70.32], angle: 89.5 }],
      [480, { pole: [13.35, 62.28], angle: 98.61 }],
      [490, { pole: [15.03, 61.75], angle: 89.08 }],
      [500, { pole: [14.95, 60.76], angle: 79.48 }],
      [510, { pole: [10.36, 60.38], angle: 69.35 }],
      [520, { pole: [-17.52, 54.06], angle: 49.65 }],
      [530, { pole: [-35.37, 29.93], angle: 29.84 }],
      [540, { pole: [-67.92, -18.08], angle: 26.37 }],
    ],
    rings: OUTLINES.amuria,
  },
  {
    // An island continent on the Tethys until the Mongol–Okhotsk Ocean closed (~150 Ma).
    id: 'north_china', name: 'North China', color: LAND, from: ['north_china'], parent: 'eurasia',
    anchor: [113, 37],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [130, { pole: [0, 90], angle: 0 }],
      [140, { pole: [-177.56, 0.8], angle: 2.25 }],
      [150, { pole: [-177.56, 0.8], angle: 4.5 }],
      [160, { pole: [-142.78, -15.07], angle: 5.48 }],
      [170, { pole: [-122.28, -21.63], angle: 7.9 }],
      [180, { pole: [-111.49, -23.95], angle: 10.83 }],
      [190, { pole: [-108.11, -22.02], angle: 14.42 }],
      [200, { pole: [-107.49, -19.09], angle: 18.39 }],
      [210, { pole: [-97.8, -27.92], angle: 29.5 }],
      [220, { pole: [-95.77, -29.98], angle: 41.61 }],
      [230, { pole: [-96.61, -29.53], angle: 53.82 }],
      [240, { pole: [-98.56, -27.73], angle: 65.81 }],
      [250, { pole: [-102.08, -29.52], angle: 64.47 }],
      [260, { pole: [-99.53, -26.81], angle: 66.01 }],
      [270, { pole: [-100.28, -20.65], angle: 65.65 }],
      [280, { pole: [-103.56, -16.07], angle: 70.97 }],
      [290, { pole: [-102.94, -19.19], angle: 70.66 }],
      [300, { pole: [-104.12, -19.9], angle: 69.47 }],
      [310, { pole: [-107.84, -16.64], angle: 72.94 }],
      [320, { pole: [-111.88, -12.76], angle: 79.12 }],
      [330, { pole: [-113.68, -6.82], angle: 83.46 }],
      [340, { pole: [-115.29, -1.6], angle: 87.7 }],
      [350, { pole: [-120.03, 0.61], angle: 86.97 }],
      [360, { pole: [-127.08, 0.49], angle: 81.78 }],
      [370, { pole: [-136.54, -2.82], angle: 78.14 }],
      [380, { pole: [-147.5, -4.21], angle: 77.94 }],
      [390, { pole: [-151.41, -1.82], angle: 83.99 }],
      [400, { pole: [-154.7, 0.12], angle: 90.88 }],
      [410, { pole: [-157.43, 1.61], angle: 98.25 }],
      [420, { pole: [-129.49, 5.92], angle: 87.62 }],
      [430, { pole: [-104.77, 2.65], angle: 95.96 }],
      [440, { pole: [-101.09, -8.22], angle: 115.84 }],
      [450, { pole: [-101.64, -8.84], angle: 114.69 }],
      [460, { pole: [-85.62, -6.81], angle: 120.06 }],
      [470, { pole: [-70.44, -13.19], angle: 111.29 }],
      [480, { pole: [-66.5, -15.36], angle: 123.1 }],
      [490, { pole: [-73.89, -12.19], angle: 145.48 }],
      [500, { pole: [-83.14, -5.67], angle: 150.89 }],
      [510, { pole: [-92.86, 0.98], angle: 154.64 }],
      [520, { pole: [-100.04, 5.09], angle: 154.14 }],
      [530, { pole: [-111.31, 9], angle: 142.44 }],
      [540, { pole: [-126.21, 13.7], angle: 135.66 }],
    ],
    rings: OUTLINES.north_china,
  },
  {
    // Collided with North China along the Qinling–Dabie belt ~240–220 Ma.
    id: 'south_china', name: 'South China', color: LAND, from: ['south_china'], parent: 'eurasia',
    anchor: [111, 27],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [130, { pole: [0, 90], angle: 0 }],
      [140, { pole: [-177.56, 0.8], angle: 2.25 }],
      [150, { pole: [-177.56, 0.8], angle: 4.5 }],
      [160, { pole: [-142.78, -15.07], angle: 5.48 }],
      [170, { pole: [-122.28, -21.63], angle: 7.9 }],
      [180, { pole: [-111.49, -23.95], angle: 10.83 }],
      [190, { pole: [-108.11, -22.02], angle: 14.42 }],
      [200, { pole: [-107.49, -19.09], angle: 18.39 }],
      [210, { pole: [-133.12, -41.72], angle: 19.27 }],
      [220, { pole: [-163.17, -52.54], angle: 24.7 }],
      [230, { pole: [174.33, -54.27], angle: 32.48 }],
      [240, { pole: [160.67, -53.27], angle: 41.29 }],
      [250, { pole: [151.52, -50.76], angle: 50.28 }],
      [260, { pole: [179.4, -55.44], angle: 48.7 }],
      [270, { pole: [-149.41, -50.41], angle: 53.17 }],
      [280, { pole: [-134.65, -42.3], angle: 62.73 }],
      [290, { pole: [-134.8, -43.13], angle: 61.72 }],
      [300, { pole: [-135.04, -43.36], angle: 61.29 }],
      [310, { pole: [-134.1, -38.64], angle: 65.58 }],
      [320, { pole: [-133.04, -33.2], angle: 72.41 }],
      [330, { pole: [-131.41, -25.94], angle: 76.32 }],
      [340, { pole: [-130.43, -19.46], angle: 80.24 }],
      [350, { pole: [-134.48, -16.47], angle: 81.43 }],
      [360, { pole: [-142.05, -16.04], angle: 79.53 }],
      [370, { pole: [-152.15, -17.04], angle: 80.8 }],
      [380, { pole: [-161.74, -17.69], angle: 84.26 }],
      [390, { pole: [-163.01, -15.32], angle: 90.27 }],
      [400, { pole: [-163.9, -13.31], angle: 96.79 }],
      [410, { pole: [-164.51, -11.68], angle: 103.54 }],
      [420, { pole: [-170.11, -6.58], angle: 96.85 }],
      [430, { pole: [-178.08, -0.34], angle: 95.06 }],
      [440, { pole: [162.59, -20.18], angle: 100.04 }],
      [450, { pole: [169.74, -17.35], angle: 91.04 }],
      [460, { pole: [-179.68, -10.98], angle: 77.72 }],
      [470, { pole: [-178.47, 1.71], angle: 53.7 }],
      [480, { pole: [-175.49, -1.24], angle: 47.62 }],
      [490, { pole: [-178.06, -17.68], angle: 62.69 }],
      [500, { pole: [-179.35, -27.82], angle: 80.91 }],
      [510, { pole: [-176.17, -34.68], angle: 98.64 }],
      [520, { pole: [-174.78, -37.65], angle: 110.36 }],
      [530, { pole: [-179, -34.55], angle: 123.67 }],
      [540, { pole: [178.1, -31.96], angle: 142.65 }],
    ],
    rings: OUTLINES.south_china,
  },
  {
    // Relative to North China: the Sea of Japan opens between ~21 and ~14 Ma; before that the islands lie against the mainland coast.
    id: 'japan', name: 'Japan', color: LAND, from: ['north_china'], parent: 'north_china',
    anchor: [137.5, 36],
    track: [
      [0, 137.5, 36, 0],
      [14, 137.5, 36, 0],
      [20, 134.1, 38.1, -10.3],
      [21, 133.5, 38.5, -12],
      [34, 133.5, 38.5, -12],
      [50, 133.5, 38.5, -12],
      [66, 133.5, 38.5, -12],
      [540, 133.5, 38.5, -12],
    ],
    rings: OUTLINES.japan,
  },
  {
    // Relative to South China: welded to it since ~250 Ma (its Cenozoic escape along the Red River fault is not modelled).
    id: 'indochina', name: 'Indochina', color: LAND, from: ['south_china'], parent: 'south_china',
    anchor: [104.5, 16],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [250, { pole: [0, 90], angle: 0 }],
      [260, { pole: [1.41, -55.34], angle: 5.27 }],
      [270, { pole: [1.41, -55.34], angle: 10.55 }],
      [280, { pole: [1.41, -55.34], angle: 15.82 }],
      [290, { pole: [1.41, -55.34], angle: 21.09 }],
      [300, { pole: [1.41, -55.34], angle: 26.36 }],
      [310, { pole: [-9.46, -55.02], angle: 27.5 }],
      [320, { pole: [-20.41, -53.67], angle: 28.52 }],
      [330, { pole: [-29.71, -51.6], angle: 29.87 }],
      [340, { pole: [-37.34, -49.15], angle: 31.51 }],
      [350, { pole: [-43.53, -46.56], angle: 33.38 }],
      [360, { pole: [-48.53, -44], angle: 35.47 }],
      [370, { pole: [-52.62, -41.56], angle: 37.72 }],
      [380, { pole: [-55.99, -39.27], angle: 40.12 }],
      [390, { pole: [-58.8, -37.17], angle: 42.63 }],
      [410, { pole: [-58.8, -37.17], angle: 42.63 }],
      [420, { pole: [-59.5, -35.79], angle: 42.31 }],
      [430, { pole: [-60.19, -34.4], angle: 42.01 }],
      [440, { pole: [-60.86, -32.98], angle: 41.73 }],
      [450, { pole: [-61.52, -31.54], angle: 41.49 }],
      [460, { pole: [-63.5, -30.55], angle: 50.1 }],
      [470, { pole: [-64.9, -29.82], angle: 58.75 }],
      [480, { pole: [-65.96, -29.25], angle: 67.42 }],
      [490, { pole: [-66.79, -28.8], angle: 76.1 }],
      [500, { pole: [-67.47, -28.41], angle: 84.8 }],
      [510, { pole: [-68.04, -28.09], angle: 93.5 }],
      [520, { pole: [-68.53, -27.81], angle: 102.21 }],
      [530, { pole: [-68.97, -27.55], angle: 110.92 }],
      [540, { pole: [-69.36, -27.33], angle: 119.64 }],
    ],
    rings: OUTLINES.indochina,
  },
  {
    // Burma, western Thailand, Malaya, Sumatra: a Cimmerian ribbon that rifted off Gondwana ~290 Ma and docked with Indochina ~200 Ma.
    id: 'sibumasu', name: 'Sibumasu', color: LAND, from: ['gondwana'], parent: 'indochina',
    anchor: [97, 20.5],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [160, { pole: [0, 90], angle: 0 }],
      [170, { pole: [97.86, 11.28], angle: 14.85 }],
      [180, { pole: [97.25, 12.72], angle: 23.45 }],
      [190, { pole: [117.07, 4.99], angle: 37.78 }],
      [200, { pole: [120.76, -3.65], angle: 40.56 }],
      [210, { pole: [125.5, -10.26], angle: 37.4 }],
      [220, { pole: [129.3, -18.93], angle: 34.27 }],
      [230, { pole: [131.75, -29.99], angle: 31.51 }],
      [240, { pole: [140.53, -48.08], angle: 29.24 }],
      [250, { pole: [152.47, -68.65], angle: 30.54 }],
      [260, { pole: [135.63, -31.46], angle: 40.78 }],
      [270, { pole: [136.23, -17.42], angle: 60.45 }],
      [280, { pole: [138.98, -10.33], angle: 76.01 }],
      [290, { pole: [142.91, -9.55], angle: 78.17 }],
      [300, { pole: [146.12, -8.42], angle: 80.87 }],
      [310, { pole: [141.6, -5.25], angle: 87.72 }],
      [320, { pole: [135.73, -1.61], angle: 97.9 }],
      [330, { pole: [131.76, 0.46], angle: 111.31 }],
      [340, { pole: [128.76, 2.2], angle: 122.71 }],
      [350, { pole: [125.9, 4.66], angle: 125.97 }],
      [360, { pole: [123.82, 7.07], angle: 122.46 }],
      [370, { pole: [121.86, 9.47], angle: 116.48 }],
      [380, { pole: [119.62, 11.89], angle: 110.62 }],
      [390, { pole: [116.88, 13.88], angle: 111.52 }],
      [400, { pole: [114.8, 15.74], angle: 109.46 }],
      [410, { pole: [112.66, 17.65], angle: 107.52 }],
      [420, { pole: [112.55, 18.77], angle: 110.44 }],
      [430, { pole: [112.43, 19.89], angle: 113.35 }],
      [440, { pole: [117.53, 29.64], angle: 87.54 }],
      [450, { pole: [119.69, 31.36], angle: 84.94 }],
      [460, { pole: [119.04, 31.58], angle: 90.77 }],
      [470, { pole: [116.82, 30.44], angle: 96.23 }],
      [480, { pole: [114.95, 29.21], angle: 101.78 }],
      [490, { pole: [113.4, 27.93], angle: 107.41 }],
      [500, { pole: [112.15, 26.62], angle: 113.1 }],
      [510, { pole: [111.4, 26.85], angle: 126.28 }],
      [520, { pole: [110.56, 27.08], angle: 139.44 }],
      [530, { pole: [109.63, 27.31], angle: 152.58 }],
      [540, { pole: [108.58, 27.53], angle: 165.69 }],
    ],
    rings: OUTLINES.sibumasu,
  },
  {
    // Qiangtang and Lhasa: Cimmerian blocks that rifted off Gondwana in the Permian and Triassic.
    id: 'tibet', name: 'Tibet', color: LAND, from: ['gondwana'], parent: 'eurasia',
    anchor: [86, 32.5],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [130, { pole: [0, 90], angle: 0 }],
      [140, { pole: [-177.56, 0.8], angle: 2.25 }],
      [150, { pole: [-177.56, 0.8], angle: 4.5 }],
      [160, { pole: [-142.78, -15.07], angle: 5.48 }],
      [170, { pole: [-122.28, -21.63], angle: 7.9 }],
      [180, { pole: [-111.49, -23.95], angle: 10.83 }],
      [190, { pole: [-155.24, -32.36], angle: 27.03 }],
      [200, { pole: [-150.55, -30.74], angle: 36.55 }],
      [210, { pole: [-155.27, -33.91], angle: 46.47 }],
      [220, { pole: [-158.59, -35.91], angle: 56.59 }],
      [230, { pole: [-161.06, -37.28], angle: 66.84 }],
      [240, { pole: [-163.47, -38.52], angle: 79.99 }],
      [250, { pole: [-165.34, -39.42], angle: 93.19 }],
      [260, { pole: [-173.38, -40.95], angle: 91.72 }],
      [270, { pole: [-177.16, -41.08], angle: 95.52 }],
      [280, { pole: [-176.8, -40.67], angle: 99.84 }],
      [310, { pole: [-176.8, -40.67], angle: 99.84 }],
      [320, { pole: [-177.74, -40.89], angle: 99.33 }],
      [330, { pole: [-179.6, -38.23], angle: 98.38 }],
      [340, { pole: [179.75, -35.31], angle: 98.18 }],
      [350, { pole: [179.2, -32.36], angle: 98.16 }],
      [360, { pole: [178.68, -29.42], angle: 98.29 }],
      [370, { pole: [178.18, -27.56], angle: 101.22 }],
      [380, { pole: [177.72, -25.77], angle: 104.21 }],
      [390, { pole: [-179.95, -23.91], angle: 106.38 }],
      [400, { pole: [-177.68, -22.05], angle: 108.87 }],
      [410, { pole: [-175.55, -20.21], angle: 111.5 }],
      [420, { pole: [176.73, -13.41], angle: 107.32 }],
      [430, { pole: [168.12, -5.6], angle: 109.63 }],
      [440, { pole: [162.91, -11.67], angle: 101.34 }],
      [450, { pole: [172.2, -5.53], angle: 93.97 }],
      [460, { pole: [-174.16, 2.11], angle: 84.65 }],
      [470, { pole: [-164.72, 13.68], angle: 62.31 }],
      [480, { pole: [-157.82, 9.19], angle: 56.29 }],
      [490, { pole: [-162.79, -7.31], angle: 68.98 }],
      [500, { pole: [-165.66, -18.03], angle: 86.37 }],
      [510, { pole: [-168.98, -24.19], angle: 102.68 }],
      [520, { pole: [-172.22, -27.41], angle: 112.34 }],
      [530, { pole: [179.83, -25.08], angle: 123.25 }],
      [540, { pole: [173.1, -23.9], angle: 140.61 }],
    ],
    rings: OUTLINES.tibet,
  },
  {
    // Iran and Afghanistan: the western Cimmerian blocks, docked with Eurasia ~220–200 Ma.
    id: 'iran', name: 'Iran', color: LAND, from: ['gondwana'], parent: 'eurasia',
    anchor: [57, 32],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [180, { pole: [0, 90], angle: 0 }],
      [190, { pole: [-164.39, -26], angle: 2.62 }],
      [200, { pole: [-162.43, -20.58], angle: 5.77 }],
      [210, { pole: [-166.93, -38.7], angle: 15.85 }],
      [220, { pole: [-168.2, -42.61], angle: 26.29 }],
      [230, { pole: [-168.8, -44.31], angle: 36.79 }],
      [240, { pole: [-169.23, -45.47], angle: 50.18 }],
      [250, { pole: [-169.5, -46.17], angle: 63.58 }],
      [260, { pole: [-171.6, -46.83], angle: 65.65 }],
      [270, { pole: [-173.63, -47.43], angle: 67.76 }],
      [280, { pole: [-174.62, -47.7], angle: 68.82 }],
      [310, { pole: [-174.62, -47.7], angle: 68.82 }],
      [320, { pole: [-175.92, -48.31], angle: 68.44 }],
      [330, { pole: [179.8, -45.47], angle: 67.34 }],
      [340, { pole: [177.43, -41.8], angle: 66.94 }],
      [350, { pole: [175.37, -38.04], angle: 66.82 }],
      [360, { pole: [173.51, -34.24], angle: 66.97 }],
      [370, { pole: [172.5, -31.86], angle: 69.98 }],
      [380, { pole: [171.61, -29.64], angle: 73.09 }],
      [390, { pole: [174.28, -26.64], angle: 75.01 }],
      [400, { pole: [176.79, -23.69], angle: 77.35 }],
      [410, { pole: [179.06, -20.86], angle: 79.92 }],
      [420, { pole: [166.99, -14.32], angle: 77.85 }],
      [430, { pole: [154.88, -7.3], angle: 83.82 }],
      [440, { pole: [148.51, -15.09], angle: 75.74 }],
      [450, { pole: [157.37, -4.23], angle: 67.65 }],
      [460, { pole: [171.41, 11.8], angle: 59.06 }],
      [470, { pole: [176.83, 39.45], angle: 43.59 }],
      [480, { pole: [-169.57, 41.4], angle: 36.6 }],
      [490, { pole: [-170.27, 8.35], angle: 40.4 }],
      [500, { pole: [-169.83, -12.99], angle: 54.75 }],
      [510, { pole: [-171.55, -23.64], angle: 70.4 }],
      [520, { pole: [-174.15, -28.87], angle: 80.06 }],
      [530, { pole: [175.72, -28.32], angle: 91.77 }],
      [540, { pole: [168.6, -28.77], angle: 110.15 }],
    ],
    rings: OUTLINES.iran,
  },
  {
    // Turkey and Transcaucasia: peri-Gondwanan blocks closed against Eurasia in the Cretaceous–Eocene.
    id: 'anatolia', name: 'Anatolia', color: LAND, from: ['gondwana'], parent: 'eurasia',
    anchor: [34, 39],
    track: [
      [0, { pole: [0, 90], angle: 0 }],
      [10, { pole: [0, 90], angle: 0 }],
      [20, { pole: [109.46, -10.91], angle: 1.02 }],
      [30, { pole: [109.46, -10.91], angle: 2.15 }],
      [40, { pole: [109.46, -10.91], angle: 2.84 }],
      [50, { pole: [177.86, -44.22], angle: 9.47 }],
      [60, { pole: [-174.4, -44.65], angle: 14.85 }],
      [80, { pole: [-176.17, -41.6], angle: 22.94 }],
      [90, { pole: [-175.79, -41.25], angle: 29.73 }],
      [100, { pole: [-176.46, -41.86], angle: 38.1 }],
      [110, { pole: [-177.34, -43.17], angle: 44.71 }],
      [120, { pole: [-178.07, -43.79], angle: 52.09 }],
      [130, { pole: [-177.66, -44.01], angle: 55.83 }],
      [140, { pole: [-177.7, -44.76], angle: 59.1 }],
      [150, { pole: [-176.96, -45.82], angle: 61.68 }],
      [160, { pole: [-176.66, -46.61], angle: 66.52 }],
      [170, { pole: [-176.74, -46.81], angle: 70.19 }],
      [180, { pole: [-176.32, -46.91], angle: 71.62 }],
      [190, { pole: [-174.87, -46.55], angle: 73.39 }],
      [200, { pole: [-172.77, -45.88], angle: 75.44 }],
      [240, { pole: [-172.78, -45.87], angle: 75.43 }],
      [250, { pole: [-173.31, -45.27], angle: 75.1 }],
      [310, { pole: [-173.31, -45.27], angle: 75.1 }],
      [320, { pole: [-174.47, -45.8], angle: 74.67 }],
      [330, { pole: [-178.09, -43.06], angle: 73.51 }],
      [340, { pole: [179.94, -39.62], angle: 73.08 }],
      [350, { pole: [178.19, -36.09], angle: 72.91 }],
      [360, { pole: [176.6, -32.54], angle: 72.98 }],
      [370, { pole: [175.59, -30.3], angle: 75.93 }],
      [380, { pole: [174.68, -28.19], angle: 78.97 }],
      [390, { pole: [177.15, -25.43], angle: 80.99 }],
      [400, { pole: [179.49, -22.71], angle: 83.42 }],
      [410, { pole: [-178.37, -20.08], angle: 86.05 }],
      [420, { pole: [170.6, -13.58], angle: 83.08 }],
      [430, { pole: [159.02, -6.43], angle: 87.82 }],
      [440, { pole: [153.19, -14.02], angle: 79.57 }],
      [450, { pole: [162.32, -4.1], angle: 71.75 }],
      [460, { pole: [176.71, 10.01], angle: 63.23 }],
      [470, { pole: [-174.94, 33.78], angle: 45.83 }],
      [480, { pole: [-162.47, 33.16], angle: 39.2 }],
      [490, { pole: [-165.78, 4.24], angle: 45.78 }],
      [500, { pole: [-166.98, -13.78], angle: 61.14 }],
      [510, { pole: [-169.48, -23.12], angle: 76.97 }],
      [520, { pole: [-172.39, -27.83], angle: 86.58 }],
      [530, { pole: [177.85, -26.93], angle: 97.83 }],
      [540, { pole: [170.57, -27.05], angle: 115.81 }],
    ],
    rings: OUTLINES.anatolia,
  },
  {
    // Moves north-north-east and turns slightly anticlockwise, closing the Tethys.
    id: 'africa', name: 'Africa', color: LAND, from: ['gondwana'],
    anchor: [20, 5],
    track: [
      [0, 20, 5, 0],
      [20, 19, 2, 1],
      [34, 18, 0, 2.5],
      [50, 17, -3, 4],
      [66, 16, -6, 6],
      // from 80 Ma: Merdith et al. (2021)
      [80, { pole: [155.96, -24.99], angle: 15.27 }],
      [90, { pole: [165.78, -21.8], angle: 17.15 }],
      [100, { pole: [171.06, -16.07], angle: 21.15 }],
      [110, { pole: [172.78, -10.76], angle: 26.62 }],
      [120, { pole: [173.83, -6.94], angle: 31.19 }],
      [130, { pole: [171.18, -4.01], angle: 34.73 }],
      [140, { pole: [169.27, -1.81], angle: 38.74 }],
      [150, { pole: [166.8, -0.47], angle: 41.72 }],
      [160, { pole: [165.22, 0], angle: 35.73 }],
      [170, { pole: [164.81, 0], angle: 33.63 }],
      [180, { pole: [161.57, 0], angle: 29.21 }],
      [190, { pole: [156.99, 0], angle: 26.56 }],
      [200, { pole: [152.7, 0], angle: 26.13 }],
      [210, { pole: [147.26, 0], angle: 26.82 }],
      [220, { pole: [146.59, 0], angle: 29.53 }],
      [230, { pole: [148.46, 0], angle: 37.21 }],
      [240, { pole: [150.42, 0], angle: 42.82 }],
      [250, { pole: [152.87, 0], angle: 47.36 }],
      [260, { pole: [152.55, 0], angle: 51.43 }],
      [270, { pole: [150.95, 0], angle: 51.36 }],
      [280, { pole: [148.21, 0], angle: 53.97 }],
      [290, { pole: [145.23, 0], angle: 57.94 }],
      [300, { pole: [141.98, 0], angle: 57.87 }],
      [310, { pole: [140.57, 0], angle: 58.66 }],
      [320, { pole: [139.46, 0], angle: 63.67 }],
      [330, { pole: [137.91, 0], angle: 66.09 }],
      [340, { pole: [128.47, 0], angle: 70.9 }],
      [350, { pole: [116.38, 0], angle: 78.48 }],
      [360, { pole: [110.03, 0], angle: 83.68 }],
      [370, { pole: [108.08, 0], angle: 85.39 }],
      [380, { pole: [107.56, 0], angle: 86.03 }],
      [390, { pole: [106.38, 0], angle: 80.23 }],
      [400, { pole: [103.55, 0], angle: 82.08 }],
      [410, { pole: [102.89, 1.37], angle: 68.51 }],
      [420, { pole: [95.01, 0], angle: 85.4 }],
      [430, { pole: [88.62, 0], angle: 103.49 }],
      [440, { pole: [83.68, 0], angle: 122.11 }],
      [450, { pole: [89, 0], angle: 126 }],
      [460, { pole: [93.06, 0], angle: 124.89 }],
      [470, { pole: [94.96, 0], angle: 124.8 }],
      [480, { pole: [97.71, 0], angle: 120.83 }],
      [490, { pole: [99.15, 0], angle: 117.75 }],
      [500, { pole: [101.03, 0], angle: 114 }],
      [510, { pole: [100.46, 0], angle: 112.02 }],
      [520, { pole: [94.85, 0], angle: 109.96 }],
      [530, { pole: [89.22, 0], angle: 105.02 }],
      [540, { pole: [87.84, 0], angle: 100.45 }],
    ],
    rings: OUTLINES.africa,
  },
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
  {
    // Races north until ~50 Ma, then ploughs on into Asia. Its outline includes "Greater India" (see HIDDEN MARGINS).
    id: 'india', name: 'India', color: LAND, from: ['gondwana'],
    anchor: [79, 22],
    track: [
      [0, 79, 22, 0],
      [20, 75.9, 17.6, 0.5],
      [34, 73.2, 14.9, 1],
      [50, 71, 11.5, 3],
      [66, 66.5, -16.5, 22],
      // from 80 Ma: Merdith et al. (2021)
      [80, { pole: [-170.94, -20.5], angle: 62.44 }],
      [90, { pole: [-167.17, -19.73], angle: 71.29 }],
      [100, { pole: [-163.51, -18.33], angle: 77.75 }],
      [110, { pole: [-163.82, -16.01], angle: 82.34 }],
      [120, { pole: [-164.22, -14.46], angle: 85.57 }],
      [130, { pole: [-161.69, -11.03], angle: 90.26 }],
      [140, { pole: [-159.26, -8.79], angle: 93.2 }],
      [150, { pole: [-158.32, -7.28], angle: 94.35 }],
      [160, { pole: [-155.97, -9.77], angle: 89.09 }],
      [170, { pole: [-154.58, -11.71], angle: 87 }],
      [180, { pole: [-153.63, -14.23], angle: 82.63 }],
      [190, { pole: [-154.06, -15.26], angle: 79.5 }],
      [200, { pole: [-155.07, -15.37], angle: 77.93 }],
      [210, { pole: [-156.85, -14.98], angle: 76.58 }],
      [220, { pole: [-158.29, -13.62], angle: 77.83 }],
      [230, { pole: [-160.89, -10.04], angle: 83.11 }],
      [240, { pole: [-162.18, -7.7], angle: 87.62 }],
      [250, { pole: [-162.59, -6.05], angle: 91.9 }],
      [260, { pole: [-163.95, -4.48], angle: 94.66 }],
      [270, { pole: [-164.68, -4.37], angle: 93.79 }],
      [280, { pole: [-166.79, -3.17], angle: 94.18 }],
      [290, { pole: [-169.52, -1.47], angle: 95.29 }],
      [300, { pole: [-171.17, -1.27], angle: 93.29 }],
      [310, { pole: [-172.17, -0.89], angle: 92.97 }],
      [320, { pole: [-174.46, 1], angle: 95.7 }],
      [330, { pole: [-176.13, 1.94], angle: 96.34 }],
      [340, { pole: [176.57, 4.02], angle: 92.88 }],
      [350, { pole: [165.66, 6.5], angle: 88.29 }],
      [360, { pole: [158.81, 7.81], angle: 86.29 }],
      [370, { pole: [156.57, 8.18], angle: 85.72 }],
      [380, { pole: [155.87, 8.34], angle: 85.69 }],
      [390, { pole: [157.74, 6.25], angle: 80.96 }],
      [400, { pole: [154.69, 6.5], angle: 79.68 }],
      [410, { pole: [162.06, 2.32], angle: 70.63 }],
      [420, { pole: [146.13, 6.01], angle: 74.33 }],
      [430, { pole: [131.11, 9.85], angle: 81.03 }],
      [440, { pole: [118.21, 12.57], angle: 91.21 }],
      [450, { pole: [122.37, 14.91], angle: 98.71 }],
      [460, { pole: [126.91, 15.72], angle: 101.28 }],
      [470, { pole: [128.86, 16.12], angle: 102.86 }],
      [480, { pole: [133, 15.89], angle: 102.15 }],
      [490, { pole: [135.51, 15.52], angle: 101.04 }],
      [500, { pole: [138.69, 15.01], angle: 99.84 }],
      [510, { pole: [138.9, 14.49], angle: 97.82 }],
      [520, { pole: [134.37, 12.99], angle: 91.25 }],
      [530, { pole: [131, 10.42], angle: 82.67 }],
      [540, { pole: [131.79, 8.8], angle: 78.18 }],
    ],
    rings: OUTLINES.india,
  },
  {
    // Relative to Africa: the Red Sea and Gulf of Aden open after ~27 Ma.
    id: 'arabia', name: 'Arabia', color: LAND, from: ['africa'], parent: 'africa',
    anchor: [45, 24],
    track: [
      [0, 45, 24, 0],
      [20, 43.8, 21.8, 5.6],
      [27, 43.2, 21.3, 7.5],
      [34, 43.2, 21.3, 7.5],
      [50, 43.2, 21.3, 7.5],
      [66, 43.2, 21.3, 7.5],
      // from 80 Ma: Merdith et al. (2021)
      [80, { pole: [-170.82, -37.29], angle: 7.22 }],
      [540, { pole: [-170.82, -37.29], angle: 7.22 }],
    ],
    rings: OUTLINES.arabia,
  },
  {
    // Relative to Antarctica: slow rifting from ~95 Ma, then fast drift north after ~45 Ma.
    id: 'australia', name: 'Australia', color: LAND, from: ['gondwana'], parent: 'antarctica',
    anchor: [134, -25],
    track: [
      [0, 134, -25, 0],
      [20, 133.5, -35, 1],
      [34, 133, -45.5, 2],
      [50, 132.5, -53.5, 3],
      [66, 132.5, -56, 3],
      // from 80 Ma: Merdith et al. (2021)
      [80, { pole: [-139.16, -4.39], angle: 29.24 }],
      [90, { pole: [-139.23, -1.06], angle: 30.38 }],
      [100, { pole: [-139.71, 1.47], angle: 31.73 }],
      [110, { pole: [-139.51, 1.55], angle: 32.04 }],
      [120, { pole: [-139.32, 1.62], angle: 32.35 }],
      [130, { pole: [-139.14, 1.7], angle: 32.67 }],
      [140, { pole: [-138.96, 1.77], angle: 32.98 }],
      [150, { pole: [-138.78, 1.84], angle: 33.29 }],
      [160, { pole: [-138.6, 1.91], angle: 33.6 }],
      [170, { pole: [-138.68, 1.93], angle: 33.61 }],
      [180, { pole: [-140.33, 2.45], angle: 33.83 }],
      [190, { pole: [-140.78, 2.59], angle: 33.9 }],
      [540, { pole: [-140.78, 2.59], angle: 33.9 }],
    ],
    rings: OUTLINES.australia,
  },
  {
    // Zealandia: on the Gondwana margin until the Tasman Sea opened (~85–52 Ma).
    id: 'new_zealand', name: 'New Zealand', color: LAND, from: ['australia'], parent: 'australia',
    anchor: [172, -42],
    track: [
      [0, 172, -42, 0],
      [20, 172, -42, 0],
      [34, 172, -42, 0],
      [50, 172, -42, 0],
      [52, 172, -42, 0],
      [66, 163.5, -41.5, -8],
      // from 80 Ma: Merdith et al. (2021)
      [80, { pole: [-16.7, 43.5], angle: 56.6 }],
      [90, { pole: [-18.58, 40.92], angle: 57.45 }],
      [100, { pole: [-18.5, 38.55], angle: 57.19 }],
      [110, { pole: [-18.16, 38.34], angle: 57.23 }],
      [120, { pole: [-17.82, 38.13], angle: 57.27 }],
      [130, { pole: [-17.48, 37.91], angle: 57.31 }],
      [140, { pole: [-17.14, 37.7], angle: 57.36 }],
      [150, { pole: [-16.8, 37.48], angle: 57.4 }],
      [160, { pole: [-16.47, 37.27], angle: 57.45 }],
      [540, { pole: [-16.47, 37.27], angle: 57.45 }],
    ],
    rings: OUTLINES.new_zealand,
  },
  {
    // Over the South Pole since the Cretaceous; on Gondwana's Pacific flank before.
    id: 'antarctica', name: 'Antarctica', color: LAND, from: ['gondwana'],
    anchor: [90, -80],
    track: [
      [0, 90, -80, 0],
      [20, 90, -80, 0],
      [34, 90, -80, 0],
      [50, 90, -80, 0],
      [66, 90, -80, 0],
      // from 80 Ma: Merdith et al. (2021)
      [80, { pole: [-98.71, -48.77], angle: 8.53 }],
      [90, { pole: [-83.78, -30.34], angle: 11.43 }],
      [100, { pole: [-83.1, -21.79], angle: 13.81 }],
      [110, { pole: [-79.82, -21.96], angle: 16.3 }],
      [120, { pole: [-73.88, -20.76], angle: 18.98 }],
      [130, { pole: [-75.67, -11.3], angle: 19.44 }],
      [140, { pole: [-78.8, -5.46], angle: 19.13 }],
      [150, { pole: [-80.95, -0.38], angle: 18.46 }],
      [160, { pole: [-63.46, -3.25], angle: 22.76 }],
      [170, { pole: [-58.96, -4.19], angle: 26.2 }],
      [180, { pole: [-50.54, -6.45], angle: 31.15 }],
      [190, { pole: [-45.16, -8.53], angle: 32.86 }],
      [200, { pole: [-42.05, -10.3], angle: 32.74 }],
      [210, { pole: [-38.46, -12.78], angle: 31.77 }],
      [220, { pole: [-38.72, -14.11], angle: 29.14 }],
      [230, { pole: [-44.73, -16.73], angle: 21.9 }],
      [240, { pole: [-54.51, -18.28], angle: 17.08 }],
      [250, { pole: [-69.83, -16.95], angle: 14.17 }],
      [260, { pole: [-84.19, -19.97], angle: 11.51 }],
      [270, { pole: [-80.31, -25.1], angle: 10.85 }],
      [280, { pole: [-87.47, -40.62], angle: 8.63 }],
      [290, { pole: [-129.09, -65.57], angle: 7.49 }],
      [300, { pole: [-166.14, -86.99], angle: 8.35 }],
      [310, { pole: [106.56, -81.2], angle: 9.1 }],
      [320, { pole: [127.79, -56.37], angle: 11.52 }],
      [330, { pole: [123.1, -48.83], angle: 13.86 }],
      [340, { pole: [97.52, -41.44], angle: 23.79 }],
      [350, { pole: [84.42, -36.68], angle: 39.18 }],
      [360, { pole: [80.33, -35.12], angle: 48.55 }],
      [370, { pole: [79.18, -34.74], angle: 51.56 }],
      [380, { pole: [79.04, -34.6], angle: 52.5 }],
      [390, { pole: [71.8, -36.1], angle: 49.57 }],
      [400, { pole: [70.08, -35.59], angle: 53.48 }],
      [410, { pole: [53.46, -35.73], angle: 45.69 }],
      [420, { pole: [63.05, -34.68], angle: 63.9 }],
      [430, { pole: [67.8, -32.53], angle: 83.54 }],
      [440, { pole: [70.87, -31], angle: 103.41 }],
      [450, { pole: [78.26, -30.09], angle: 101.69 }],
      [460, { pole: [82.46, -29.61], angle: 97.02 }],
      [470, { pole: [84.63, -29.28], angle: 95.23 }],
      [480, { pole: [86.38, -29.29], angle: 89.38 }],
      [490, { pole: [86.89, -29.45], angle: 85.47 }],
      [500, { pole: [87.63, -29.66], angle: 80.63 }],
      [510, { pole: [86.04, -30.1], angle: 79.47 }],
      [520, { pole: [78.25, -31.31], angle: 82.87 }],
      [530, { pole: [73.74, -32.29], angle: 87.59 }],
      [540, { pole: [74.39, -32.77], angle: 88.61 }],
    ],
    rings: OUTLINES.antarctica,
  },
];
// </generated:plates>

// ---------------------------------------------------------------------------------------------
// 4. Craton lineages (see the header): which deep-time continents the oldest named sites ride.
// ---------------------------------------------------------------------------------------------
export const cratonLineages = [
  {
    // Pongola. Kaapvaal and Pilbara probably formed one Archean craton, Vaalbara (Zegers, de Wit,
    // Dann & White 1998, Terra Nova 10: 250); the slices then carry Kaapvaal in Ur, in Nuna at
    // 1600 Ma and in Kalahari from 1300 Ma.
    id: 'kaapvaal', name: 'Kaapvaal craton', centre: [28, -26.5], radiusDeg: 5.5,
    lineage: ['kalahari', 'ur', 'vaalbara'],
  },
  {
    // Pilbara (Dresser, Strelley Pool, Tumbiana) and the nearby Shark Bay and Jack Hills sites: the
    // slices draw one West Australian nucleus, Vaalbara's eastern half, then part of Ur.
    id: 'west_australia', name: 'Pilbara and Yilgarn cratons', centre: [118, -24], radiusDeg: 6.5,
    lineage: ['ur', 'vaalbara'],
  },
  {
    // Franceville. The Congo craton is its own continent in every slice from 2700 to 750 Ma and
    // part of West Gondwana at 600 Ma.
    id: 'congo', name: 'Congo craton', centre: [20, -3], radiusDeg: 12,
    lineage: ['west_gondwana', 'congo'],
  },
];

// ---------------------------------------------------------------------------------------------
// 2. Deep-time slices (schematic)
// ---------------------------------------------------------------------------------------------
// 570–1600 Ma traced from Cao et al. (2024): every craton group was rotated with the model,
// rasterised, merged (morphological closing), traced and simplified to 20–36 vertices, so the
// positions are the model's and the outlines schematic. 2200–4000 Ma are hand-placed.
// <generated:deep>
export const deepSlices = [
  // ===== 4000 Ma =====
  // The first continental crust: small, short-lived rafts (Acasta Gneiss 4.03 Ga; the Jack Hills zircons
  // are older still). No named craton existed yet — Vaalbara, Ur and the rest assembled hundreds of millions of years later.
  { ma: 4000, continents: [
    { id: 'protocrust_a', name: 'Proto-crust', color: LAND,
      vertices: [
          [-92.4, -7.9], [-93.8, -7.3], [-94.2, -6.6], [-93.1, -3.9], [-94.6, -2.7], [-96, -2.7], [-97.5, -3.5],
          [-99.8, -3], [-100.5, -4.3], [-102.5, -4.9], [-103.3, -6.4], [-102.9, -8.2], [-102.1, -9.1],
          [-100.9, -10.3], [-100.3, -11.5], [-98.9, -11.4], [-97.9, -12], [-96.5, -12.7], [-94, -12.9],
          [-92.4, -12.5], [-90.2, -11.6], [-89.4, -10],
      ] },
    { id: 'protocrust_b', name: 'Proto-crust', color: LAND,
      vertices: [
          [-120.5, -23], [-118.6, -20.9], [-118.2, -18.5], [-121.2, -17.2], [-124.3, -18], [-126.1, -18.4],
          [-127.9, -18.1], [-129.1, -19.1], [-131.1, -18.8], [-133.4, -19.4], [-134.3, -21.3], [-135.1, -22.6],
          [-135.9, -24.4], [-133.7, -26.3], [-131.4, -26.9], [-130.3, -27.9], [-128.6, -29.4], [-125.7, -28.9],
          [-124.5, -27.3], [-123.3, -26.6], [-121.3, -25.9], [-120.8, -24.4],
      ] },
    { id: 'protocrust_c', name: 'Proto-crust', color: LAND,
      vertices: [
          [-114.6, 21.5], [-113.9, 23.5], [-115.1, 25.7], [-118.4, 25.1], [-119.7, 26.2], [-121.1, 26.2],
          [-122.7, 26.5], [-124.8, 27], [-127.8, 26.8], [-129.1, 25.9], [-129.1, 23.5], [-128.6, 22.1],
          [-129.1, 20.4], [-127.5, 19], [-125.1, 19.3], [-124.3, 18.2], [-123, 17], [-120.8, 16.6], [-119.4, 16.5],
          [-117.9, 17.8], [-115.6, 18.7], [-114.9, 19.9],
      ] },
    { id: 'protocrust_d', name: 'Proto-crust', color: LAND,
      vertices: [
          [137.7, -24.8], [137.3, -23.6], [134.9, -23.1], [133, -23.1], [132.6, -22.4], [132.1, -20.4],
          [129.8, -20.2], [128.8, -21.1], [126.8, -21.2], [125.1, -22], [125.2, -23.6], [125.5, -24.8],
          [125.8, -26.1], [126.6, -27.2], [127.1, -28], [128.5, -29.1], [130.4, -29.1], [131.8, -28.5],
          [132.8, -28.3], [135.3, -28.8], [137.3, -28.3], [138.5, -26.5],
      ] },
  ] },
  // ===== 3100 Ma =====
  // Mesoarchean nuclei. Vaalbara (Kaapvaal + Pilbara, ~3.3–2.8 Ga) rests on matching rock sequences in
  // South Africa and Western Australia; Ur (~3.1 Ga; Rogers 1996) is far more conjectural and may itself have contained
  // Kaapvaal and Pilbara — here the two are drawn side by side.
  { ma: 3100, continents: [
    { id: 'vaalbara', name: 'Vaalbara', color: LAND, from: 'protocrust_a', into: 'ur',
      vertices: [
          [-78.6, 3.7], [-80.9, 3.9], [-82.9, 4.3], [-85.3, 3.8], [-86.7, 3.8], [-88.2, 4.3], [-89.6, 4.5],
          [-91.2, 4.6], [-93.8, 4.9], [-95.7, 4.5], [-97.5, 2.9], [-99.6, 2.1], [-103.3, 0.4], [-103.6, -2.1],
          [-102.2, -4.1], [-100.6, -5.5], [-101.3, -7.1], [-96.7, -6.8], [-98.5, -9.2], [-97.4, -10.3],
          [-97.3, -13.7], [-95.3, -13.9], [-91.9, -11], [-90.4, -9.2], [-89, -9.6], [-86.7, -10.4], [-84.5, -9.8],
          [-82.6, -9.6], [-80.4, -8.3], [-79.7, -6.1], [-77.8, -4.2], [-76.8, -1.8], [-77.2, 0.3], [-77.2, 2],
      ] },
    { id: 'ur', name: 'Ur (conjectural)', color: LAND, from: 'protocrust_b',
      vertices: [
          [-106.8, -25], [-104.8, -22.5], [-104.8, -20.8], [-107.2, -18.3], [-110.3, -16.9], [-115.1, -16.2],
          [-117.3, -15.5], [-119.2, -15], [-120.7, -14], [-122.2, -12.4], [-123.9, -11.2], [-126.4, -9.2],
          [-130.1, -7.5], [-132.3, -8.1], [-134.4, -10.2], [-134.4, -12.6], [-135.4, -13.5], [-138.8, -13.9],
          [-141.3, -15.5], [-137.5, -18.3], [-138, -20.6], [-137.8, -22.1], [-135.6, -24.1], [-133.6, -26],
          [-131.6, -27.4], [-128.1, -27.7], [-125.6, -26.3], [-124, -26.8], [-121.8, -27.8], [-118.6, -29.5],
          [-114.1, -30.7], [-112.3, -29.4], [-111.3, -27.4], [-108.8, -26.1],
      ] },
    { id: 'archean_nuclei', name: 'Archean nuclei', color: LAND, from: 'protocrust_c',
      vertices: [
          [-110.9, 25.6], [-110.2, 28.1], [-115, 28.5], [-116, 30], [-118.6, 30.2], [-120, 31], [-122, 31.3],
          [-123.5, 33.3], [-125.6, 36.4], [-128.4, 34.2], [-130.5, 32.3], [-131.8, 30.2], [-133.6, 29.2],
          [-134.8, 27.9], [-134.3, 26.2], [-133.9, 25], [-136, 23.1], [-137.1, 21.8], [-136.8, 19.9],
          [-135.2, 18.3], [-134.1, 17.4], [-132.7, 15.5], [-131.1, 13.8], [-128.8, 13.5], [-127.1, 13.7],
          [-124.3, 14.5], [-122.7, 16.4], [-121.7, 18.6], [-121.2, 19.7], [-119.5, 19.7], [-116.2, 19.2],
          [-115.4, 20.6], [-114.9, 22.2], [-114, 23.9],
      ] },
    { id: 'west_africa', name: 'West African craton', color: LAND, from: 'protocrust_d',
      vertices: [
          [137.5, -22.6], [137.1, -21.1], [135.9, -18.9], [132.2, -19.3], [129.9, -18.2], [127.8, -19.3],
          [125.5, -20.1], [124.4, -21.7], [121.8, -23.1], [121.8, -25.1], [121.9, -26.5], [121.3, -28.3],
          [120.9, -30.3], [122.6, -32.5], [125.4, -32.6], [128.1, -31.6], [130.8, -34.5], [132.9, -32.1],
          [133.8, -29.5], [134, -28.1], [133, -26.3], [136.3, -25.1],
      ] },
  ] },
  // ===== 2700 Ma =====
  // Kenorland (~2.7–2.5 Ga): the Superior, Slave, Wyoming, Karelia and Kola cratons, perhaps one landmass.
  // Conjectural — some argue for two separate "supercratons" (Superia and Sclavia) instead.
  { ma: 2700, continents: [
    { id: 'kenorland', name: 'Kenorland (conjectural)', color: LAND, from: 'archean_nuclei',
      vertices: [
          [-93.9, 29.3], [-91.3, 33.2], [-86.6, 36.9], [-86.8, 41.1], [-96.4, 43.2], [-102.6, 44.9], [-110, 46.8],
          [-117, 47.1], [-125.3, 47.8], [-133.3, 45.7], [-136.7, 42], [-139.1, 37.4], [-140.6, 33.6],
          [-142.2, 30.8], [-150.5, 26.1], [-153.4, 22.9], [-148.1, 19.9], [-142.1, 19.3], [-138.9, 17.5],
          [-137.1, 15], [-136.6, 11.5], [-135.7, 7.9], [-132.4, 4.6], [-129, 1.1], [-123.7, -1], [-117.8, 1.3],
          [-110.8, 6.1], [-104, 4.9], [-104.7, 14], [-108, 20], [-111.3, 23.2], [-100.1, 22.4], [-96.8, 24.1],
          [-94.1, 27.2],
      ] },
    { id: 'ur', name: 'Ur (conjectural)', color: LAND,
      vertices: [
          [-101.6, -23.9], [-99.4, -22.6], [-98.3, -21.3], [-97.7, -18.8], [-96.1, -15.5], [-96.4, -12.2],
          [-98.5, -9.7], [-101.4, -6.8], [-104.9, -5], [-107.3, -3.6], [-112, -8.2], [-114.5, -6.7],
          [-117.2, -6.2], [-120.5, -5], [-124.6, -3.1], [-125.5, -5.1], [-126.6, -8.1], [-128.1, -9.7],
          [-127.7, -12.5], [-128.7, -14], [-128.3, -16.4], [-127.8, -18.5], [-128.1, -20.6], [-129.4, -24.3],
          [-128.8, -28.4], [-125.6, -32.1], [-122.2, -33.4], [-117.2, -32.5], [-113.2, -30.3], [-110.3, -30.9],
          [-105, -32.7], [-101.8, -31.8], [-102.1, -28.8], [-102.1, -26],
      ] },
    { id: 'congo', name: 'Congo – Tanzania cratons', color: LAND, from: 'ur',
      vertices: [
          [-84.4, -29.7], [-83.5, -26.8], [-84, -24.9], [-85.5, -24.4], [-88.2, -25.7], [-89.9, -24.5],
          [-91.6, -25.1], [-93.4, -26.3], [-94.4, -27.6], [-95.8, -28.9], [-98.1, -29.3], [-101.1, -30.2],
          [-102.8, -32.1], [-103.4, -33.5], [-102, -35.9], [-98.9, -36.8], [-97, -37.4], [-96.7, -38.3],
          [-96.6, -39.9], [-97, -42], [-94.3, -41.3], [-92.3, -40.8], [-90.5, -41.9], [-88.4, -43.5],
          [-84.6, -43.6], [-82.3, -42.3], [-80.6, -40.8], [-79.6, -38.5], [-79.6, -36.3], [-82.7, -34.5],
          [-79.8, -32.9], [-80.8, -31.8], [-82.5, -31], [-84.4, -30.8],
      ] },
    { id: 'west_africa', name: 'West African craton', color: LAND,
      vertices: [
          [134.8, -22.3], [133.1, -22.1], [133.1, -20.3], [132.9, -18.5], [131.3, -16.6], [129.4, -17.1],
          [127.5, -18.1], [125.4, -18.8], [123.9, -20.2], [121, -19.3], [119.2, -21.4], [118.1, -23.2],
          [117.5, -24.6], [118.8, -26.8], [121, -27.7], [121.8, -28.7], [119.9, -30.1], [119.7, -31.9],
          [121.1, -32.7], [121.9, -33.3], [122.4, -35], [123.4, -37.4], [125.7, -38.4], [128.3, -37.6],
          [131.4, -36.2], [133, -35.2], [134.4, -32.6], [134.8, -31.1], [136.2, -30.1], [138.2, -28.7],
          [138.7, -26.9], [137.7, -25.4], [136.6, -24.4], [136.1, -22.8],
      ] },
  ] },
  // ===== 2200 Ma =====
  // Kenorland broken up (rifting ~2.5–2.1 Ga); its cratons drift towards their collision as Nuna.
  { ma: 2200, continents: [
    { id: 'superior', name: 'Superior craton', color: LAND, from: 'kenorland',
      vertices: [
          [-104.7, 18.9], [-110.3, 20.9], [-115.8, 21.7], [-114.7, 23], [-112.2, 25.9], [-112.7, 28.4],
          [-113.8, 30.2], [-116.4, 33.5], [-119.9, 33.9], [-123.4, 30], [-126.5, 31.3], [-129.8, 30.9],
          [-135, 30.5], [-140.8, 30.3], [-135.8, 25.6], [-138.8, 23.4], [-139.8, 21.3], [-139.2, 19.4],
          [-137, 17.7], [-135.9, 15.7], [-135.2, 13.9], [-132.2, 12.8], [-129.7, 12.5], [-127, 12.4],
          [-125.1, 12.5], [-123.5, 8.8], [-120.1, 7.7], [-117.8, 9.4], [-115.3, 9.4], [-110.3, 8.4], [-107.3, 8.6],
          [-103.2, 9.8], [-100, 12.4], [-101.6, 16.5],
      ] },
    { id: 'slave', name: 'Slave craton', color: LAND, from: 'kenorland', into: 'nuna',
      vertices: [
          [-133.8, 48.1], [-136.9, 48.1], [-139.1, 48.3], [-139.1, 49.7], [-140.4, 51.1], [-141.9, 52.1],
          [-144.7, 52.4], [-145.8, 49.1], [-148.1, 49.4], [-151.4, 49.2], [-153.3, 48], [-153.7, 46.6],
          [-154.1, 44.9], [-154.3, 43.8], [-155.7, 42.2], [-157.6, 39.6], [-156.5, 38.1], [-154.8, 37.4],
          [-153.3, 36.8], [-150.7, 37], [-148.3, 37.9], [-146.1, 39.7], [-145, 38], [-143.5, 38.9], [-142.1, 39.1],
          [-140.3, 39.1], [-138.9, 39.1], [-135, 39.1], [-133.8, 40.2], [-132.1, 41.9], [-130.3, 42.7],
          [-127.6, 44.3], [-127.9, 46.1], [-130.8, 47.6],
      ] },
    { id: 'karelia', name: 'Karelia – Kola craton', color: LAND, from: 'kenorland', into: 'nuna',
      vertices: [
          [-73, 33.5], [-71.2, 34.4], [-72.5, 37.8], [-74.2, 40.1], [-76, 42.2], [-79.7, 44.5], [-81.8, 46],
          [-85, 46.4], [-89.8, 44.7], [-90, 46.8], [-91.7, 49.5], [-95.2, 51.3], [-99.1, 52.6], [-107.1, 54.8],
          [-108, 52.4], [-109.4, 50.5], [-111.7, 48.4], [-111.9, 47], [-110.3, 44.8], [-109.1, 42.8],
          [-105.6, 41.2], [-104.7, 39.7], [-105.3, 38], [-100.6, 37.5], [-97.5, 38.1], [-96, 36.2], [-94.1, 35.8],
          [-92.9, 34.9], [-89.3, 31], [-87.5, 31.9], [-85.5, 32.9], [-83.3, 32.8], [-80.4, 33], [-77.4, 33.6],
      ] },
    { id: 'ur', name: 'Ur (conjectural)', color: LAND, into: 'nuna',
      vertices: [
          [-90.2, -17.1], [-89, -14.8], [-90, -12.1], [-88.3, -8.3], [-91.5, -6], [-93.2, -2.9], [-96.7, -1.6],
          [-101.7, -0.2], [-105.1, -1], [-108.7, -3.7], [-110.7, -4.7], [-112.2, -5.2], [-115.2, -4], [-120, -0.5],
          [-128.9, 3.3], [-127.8, -2.1], [-128.7, -5], [-125.1, -8.6], [-131.4, -9.6], [-132.3, -13],
          [-131.2, -15.8], [-122.1, -17.1], [-123.1, -19.6], [-121.1, -22.3], [-117.4, -23.2], [-115.4, -24.8],
          [-112.8, -26.6], [-108.5, -23.9], [-107.4, -21.2], [-104.5, -22.5], [-100.3, -23.9], [-93.7, -24.5],
          [-90.1, -23.6], [-89.6, -20.9],
      ] },
    { id: 'congo', name: 'Congo – Tanzania cratons', color: LAND,
      vertices: [
          [-78.8, -35.3], [-80.2, -33.7], [-83.2, -32.5], [-84.8, -31.9], [-86.8, -31.3], [-89, -30.5],
          [-91.8, -29], [-94.4, -28.4], [-98.8, -28.6], [-102.2, -28.6], [-105.2, -30.7], [-105.7, -33.8],
          [-106.4, -35.7], [-106.8, -37.7], [-107.8, -39.3], [-111.1, -40.8], [-110.2, -42.3], [-109.3, -44.1],
          [-108.8, -45.1], [-110.2, -47.9], [-110.8, -50.1], [-109.1, -51.9], [-106.9, -54.5], [-100.5, -55.4],
          [-94.3, -54], [-91.4, -52.9], [-88, -49.9], [-87.7, -46.8], [-88.3, -44.4], [-83.3, -44.4],
          [-76.1, -43.6], [-72.4, -40.2], [-72.7, -38], [-76.3, -36.7],
      ] },
    { id: 'west_africa', name: 'West African craton', color: LAND,
      vertices: [
          [135.6, -18.2], [135.1, -15.4], [133.7, -14.8], [131.4, -13.8], [128.8, -13.7], [126.8, -15.4],
          [125, -16.7], [122.9, -19.3], [118.9, -18], [118.4, -20.4], [119, -23.8], [121.5, -26.2], [121, -27.4],
          [117, -29.1], [113.3, -31.8], [114.5, -34.1], [114.4, -36.5], [116.1, -37.6], [119.9, -37.7],
          [121.4, -38.2], [124.2, -38.7], [126.8, -38.4], [129.4, -38], [131.9, -36.4], [134.3, -35.4],
          [137.8, -35.1], [140.3, -33.3], [140, -30.5], [140.1, -27.6], [140.6, -25.4], [140.1, -23.9],
          [138.9, -22.3], [137.1, -21.1], [135.6, -20.5],
      ] },
  ] },
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
    { id: 'congo', name: 'Congo – São Francisco', color: LAND,
      vertices: [
          [-110, -64.4], [-99.6, -64], [-91.1, -61], [-79.3, -62.6], [-75, -61.8], [-72.2, -58.9], [-79.2, -54.9],
          [-84.8, -54.1], [-89.3, -51.4], [-86.1, -47.1], [-86.3, -41.3], [-80.3, -37.4], [-80.1, -32],
          [-83.8, -29.6], [-86.9, -29.2], [-90.3, -32.6], [-93.1, -32], [-97.5, -25.8], [-99.7, -23.9],
          [-107, -25.5], [-106.6, -27.8], [-109.2, -30.9], [-111.7, -31.8], [-115.9, -30.9], [-121.7, -33.1],
          [-126.9, -37.9], [-128.6, -42.8], [-123.6, -49], [-118.5, -48.7], [-113.7, -50.7], [-104.8, -51],
          [-99.7, -53.1], [-97.7, -55.1], [-99.2, -57.4], [-105.8, -60], [-111.5, -59.9],
      ] },
    { id: 'amazonia', name: 'Amazonia – West Africa', color: LAND, from: 'west_africa',
      vertices: [
          [121.9, -51.6], [126.3, -50.7], [132.6, -52.3], [140, -50.3], [147.6, -45.7], [146.8, -43],
          [149.6, -33.8], [153.9, -32], [158.8, -33.5], [161.9, -33.1], [166.8, -30.2], [168.7, -23.5],
          [162.7, -19.9], [161.8, -18.2], [158.3, -18.8], [153.6, -18], [148.5, -15.3], [141.7, -15.9],
          [141.4, -24.6], [139.5, -28.2], [131.8, -29.7], [124.9, -28.3], [122.8, -29.6], [119.4, -35.1],
          [116.4, -46.2], [116.3, -49.5], [120.3, -50.3],
      ] },
  ] },
  // ===== 1300 Ma =====
  // Nuna breaking up (~1.4–1.3 Ga).
  // (positions and outlines traced from Cao et al. 2024)
  { ma: 1300, continents: [
    { id: 'laurentia', name: 'Laurentia', color: LAND, from: 'nuna',
      vertices: [
          [-123.9, -27.5], [-121, -24.5], [-119.4, -15.4], [-122.1, -11.6], [-121.8, -8.1], [-132.6, -3.7],
          [-135, 3.6], [-141.2, 11], [-138.6, 19.1], [-133.7, 20.6], [-135.1, 27.3], [-150.7, 33.7],
          [-163.1, 32.5], [-167.4, 33.9], [-169.7, 39.5], [-176.6, 41.4], [-178.8, 40.1], [172.7, 32.9],
          [174.3, 29], [173.1, 25], [176.2, 20.6], [175.3, 16.5], [-169.7, 8.2], [-165.3, -3.4], [-160.2, -6.3],
          [-152.7, -4.8], [-145.6, -6.9], [-143.2, -21.7], [-138.3, -26.2], [-128.8, -25.7],
      ] },
    { id: 'siberia', name: 'Siberia', color: LAND, from: 'nuna',
      vertices: [
          [-113, -7.9], [-107.3, -4.9], [-105.6, -1.5], [-103.5, -0.4], [-101.5, -1.4], [-100.2, -1.4],
          [-100.2, -0.6], [-98.2, 1.1], [-98.2, 3.3], [-97.7, 3.7], [-98.1, 5.8], [-96, 9.6], [-96.1, 10.9],
          [-96.9, 11], [-102.1, 15.5], [-103.8, 15], [-107.3, 16.6], [-109.5, 17.1], [-115.8, 13.9],
          [-114.7, 10.6], [-113.3, 10], [-111.7, 6.9], [-112.8, 4.6], [-116, 3.5], [-118.8, 5], [-119.7, 4.8],
          [-115.7, -2], [-116.2, -3.3], [-115.2, -6.3],
      ] },
    { id: 'mawson', name: 'Australia – Mawson', color: LAND, from: 'nuna',
      vertices: [
          [-66.7, 22.1], [-63, 28.9], [-62.6, 34.6], [-67.8, 35.2], [-71.6, 37.6], [-71.6, 42.1], [-75.9, 46.1],
          [-77, 50], [-73.3, 53.2], [-63.8, 54.2], [-63.7, 61.7], [-60.7, 64.6], [-69.7, 65.2], [-77.2, 67.7],
          [-86.3, 75.7], [-107.5, 74.2], [-128.9, 73.9], [-165.8, 76.7], [-175.1, 74.7], [-175.9, 73],
          [-130.6, 62.5], [-118.8, 57.8], [-119.2, 54.4], [-113.9, 51.5], [-114.1, 48.6], [-111.7, 48.4],
          [-108.3, 45.3], [-108.8, 42], [-105.3, 38.6], [-105.1, 34.9], [-100.5, 35.3], [-93.3, 31.7], [-90, 34.2],
          [-81.1, 36.1], [-76, 33.4], [-71.1, 24.3],
      ] },
    { id: 'india', name: 'India', color: LAND, from: 'nuna',
      vertices: [
          [-127.7, -50.8], [-119.2, -49.8], [-115.7, -48], [-116.1, -46.2], [-114.4, -44.2], [-111.6, -43.6],
          [-112.7, -40.5], [-111.8, -37.9], [-113, -36.5], [-112.6, -29.8], [-117.4, -27.9], [-118.2, -26.8],
          [-119.9, -27.1], [-123.4, -28.7], [-124.9, -28.5], [-127.7, -30.1], [-128.7, -31.8], [-131.1, -32],
          [-135.8, -36.6], [-129.8, -41.9],
      ] },
    { id: 'kalahari', name: 'Kalahari', color: LAND, from: 'nuna',
      vertices: [
          [-92, -10.3], [-91.5, -9.8], [-87.2, -9.8], [-86.1, -8.7], [-86.1, -7.9], [-84.6, -6.7], [-84.6, -5.9],
          [-82.5, -3.9], [-79.2, -2.3], [-78.6, -0.9], [-77.1, -0.2], [-79.7, 2.1], [-82.3, 3.2], [-84.2, 5.1],
          [-85.4, 5.2], [-85.9, 5.7], [-88, 4.6], [-88.2, 3.7], [-92.1, 2.1], [-91.6, 1.5], [-91.6, -1.1],
          [-90.6, -3], [-91.7, -5.7], [-93.2, -7.5], [-93.1, -9.2],
      ] },
    { id: 'congo', name: 'Congo – São Francisco', color: LAND,
      vertices: [
          [-59.9, -42.7], [-56.2, -40.2], [-53.4, -33.4], [-48, -31.8], [-46.9, -27.2], [-53.1, -25.3],
          [-56.6, -26.3], [-60.3, -24.7], [-65.5, -16.6], [-64.6, -13.8], [-62.7, -12.4], [-65.6, -5.9],
          [-69.3, -5.5], [-71.8, -6.6], [-70.9, -8.9], [-71.9, -11], [-75, -13.2], [-80.1, -10.1], [-84.7, -8.5],
          [-88.5, -12.3], [-89.2, -14.1], [-86.4, -18.2], [-91.5, -22.5], [-94.2, -29.5], [-88, -36.2],
          [-83.6, -37], [-75.2, -36.1], [-66.6, -30.4], [-60.6, -34.5], [-61.3, -37.8], [-64, -40.3],
          [-63.8, -41.5],
      ] },
    { id: 'amazonia', name: 'Amazonia – West Africa', color: LAND,
      vertices: [
          [153.1, -25], [155.6, -23.3], [158, -23.6], [160, -21.3], [158.3, -15.9], [159.1, -13.4], [156.7, -11.4],
          [155.3, -11.4], [152.4, -3.9], [149.2, -0.5], [145.9, 1.4], [144.3, -2], [140.5, -4.2], [140.3, -5.6],
          [136.7, -7.1], [130.5, -4.1], [126.4, 0.5], [124.1, 0.5], [121.5, -1.5], [117, -4.6], [109.5, -14.3],
          [111.8, -16.4], [111.8, -17.8], [115.2, -19.2], [116, -22.1], [129.1, -24.5], [130.6, -22.1],
          [135.8, -19.6], [136, -18.2], [139.9, -16.6], [143.7, -18.1], [146.8, -23.4],
      ] },
  ] },
  // ===== 1100 Ma =====
  // Rodinia assembling during the Grenville orogenies (~1.3–0.9 Ga).
  // (positions and outlines traced from Cao et al. 2024)
  { ma: 1100, continents: [
    { id: 'laurentia', name: 'Laurentia', color: LAND,
      vertices: [
          [170, 7.7], [176.7, 12.1], [-175.9, 12.5], [-173.1, 15.4], [-167.9, 16.3], [-166.6, 21.3],
          [-167.9, 25.2], [-173.3, 27.4], [-176.7, 30.6], [-177, 38.9], [-171.4, 41.4], [-175.7, 44.6],
          [-176.2, 47.6], [176.6, 49.6], [171.1, 47.6], [165.1, 48.9], [151.2, 43.7], [146.7, 41.3], [140.6, 43.1],
          [138.1, 45.6], [135.2, 43.6], [129.7, 43.9], [126.9, 38], [126.5, 32.8], [130.8, 25.6], [135.9, 25.5],
          [137.4, 23.7], [136.3, 21], [137.3, 19], [146.3, 17.7], [153, 14.3], [158.3, 14.5], [163.5, 9],
          [167.7, 9.3],
      ] },
    { id: 'baltica', name: 'Baltica', color: LAND, from: 'laurentia', into: 'rodinia',
      vertices: [
          [-165.7, -18.1], [-161.9, -16.5], [-160.3, -13.1], [-157.3, -10], [-156.4, -9.9], [-157.5, -7.2],
          [-156.5, -5.1], [-154.6, -3.9], [-154.1, -2.2], [-155.6, -0.4], [-156.6, 2.3], [-159.2, 4.4],
          [-162.4, 4.4], [-162.8, 4.9], [-163.4, 4.4], [-166.1, 5.5], [-175, 5.8], [-177, 3.8], [-177.6, -1.4],
          [-179.1, -3.9], [-177.6, -6.3], [-177.6, -9.5], [-175.1, -11.6], [-169.7, -13.7],
      ] },
    { id: 'siberia', name: 'Siberia', color: LAND,
      vertices: [
          [-135.4, 18.5], [-131.8, 20.5], [-129.3, 21], [-128.2, 22.1], [-127.5, 23.9], [-125.2, 24.8],
          [-121.8, 23.2], [-120.2, 25], [-118.7, 25.5], [-117.5, 30.1], [-114.8, 32.6], [-113.8, 34.3],
          [-115.9, 36.6], [-116.9, 36.8], [-119.2, 39.9], [-125.6, 42.4], [-130.4, 43], [-137.9, 40.3], [-137, 38],
          [-133.2, 33.3], [-134.4, 31], [-137.5, 29.9], [-141.5, 31.6], [-142.5, 31.5], [-141.1, 28.8],
          [-138.6, 26.1], [-137.7, 20.5],
      ] },
    { id: 'mawson', name: 'Australia – Mawson', color: LAND, into: 'rodinia',
      vertices: [
          [79.2, 23.3], [87.5, 33.9], [93.3, 41.3], [96.1, 46.4], [100.7, 47.6], [103.2, 50.7], [107.8, 52.1],
          [107.3, 54.5], [110.2, 56.2], [116.6, 57.1], [123.1, 60.2], [129.8, 60.7], [129.8, 67.9], [136.9, 70.9],
          [123, 74.8], [84.3, 80.3], [76.8, 80.6], [61.3, 76.9], [71.2, 72.9], [68.3, 67.2], [64.3, 65.5],
          [60, 65.9], [50, 62.7], [54.2, 58.4], [53.3, 53.3], [60.5, 53.4], [65.5, 51.3], [64.8, 48], [66.6, 42.4],
          [70.6, 42.2], [78.5, 36.6], [76.4, 27.8], [76.8, 25.1],
      ] },
    { id: 'north_china', name: 'North China', color: LAND, from: 'mawson', into: 'rodinia',
      vertices: [
          [129.6, 71.9], [134.4, 72.6], [147.5, 75.8], [164.5, 76], [179.1, 76.2], [-175.2, 75.1], [-167.8, 75.3],
          [-165.8, 75.9], [-156.7, 76.1], [-150.6, 75.6], [-155, 78.7], [-152.2, 81.3], [-153.6, 82.7],
          [-164.4, 83.9], [-178.1, 86.2], [134.8, 86.8], [141.6, 83.4], [135.3, 80.2], [136.7, 76.7],
          [130.5, 74.8], [122.5, 74], [125.2, 71.8],
      ] },
    { id: 'south_china', name: 'South China', color: LAND, from: 'mawson',
      vertices: [
          [-46.3, -2.3], [-45, -1.3], [-45.4, 0.8], [-43.7, 4], [-44, 6.7], [-45.3, 8], [-45.7, 9.8],
          [-47.6, 11.2], [-48.4, 13.4], [-48.3, 15.1], [-50.2, 17.3], [-53.1, 18.8], [-53.8, 19.7], [-55.2, 19.1],
          [-54.7, 18.6], [-55.1, 13.4], [-52.7, 11.5], [-51.8, 9.4], [-51.5, 5.7], [-48.7, 1.9], [-47.4, 1.1],
      ] },
    { id: 'india', name: 'India', color: LAND,
      vertices: [
          [-45.3, -52.1], [-42.2, -52.8], [-38.1, -52.6], [-35.2, -53.6], [-25.4, -52.3], [-27.1, -46.5],
          [-26.6, -45], [-24.9, -43.8], [-24.2, -41.2], [-21.5, -37.4], [-25.1, -35.5], [-27.3, -34.7],
          [-29.4, -34.9], [-29.7, -34.4], [-34.5, -36.1], [-36.8, -34.7], [-39.7, -37], [-42.5, -37.6],
          [-46.9, -40.8], [-51.8, -41.8], [-51.2, -47], [-52.6, -47.9], [-47.5, -49.9],
      ] },
    { id: 'kalahari', name: 'Kalahari', color: LAND, into: 'rodinia',
      vertices: [
          [39.6, -23.7], [44.1, -21], [43.5, -18.8], [44, -17.8], [41.9, -15.6], [41.8, -14.8], [40.8, -14.1],
          [39.7, -12.1], [39.7, -8.9], [40.2, -8.4], [39.6, -7.3], [37.8, -6.2], [35.9, -7.7], [34.2, -8.3],
          [33.1, -9.8], [32.5, -15], [30.8, -18.1], [29.8, -18.7], [29.7, -20], [28.6, -21.9], [29.8, -22.6],
          [35.9, -22.7], [36.3, -23.2], [39.1, -23.2],
      ] },
    { id: 'congo', name: 'Congo – São Francisco', color: LAND,
      vertices: [
          [12, -12], [17.2, -11], [16.3, -8.7], [17.4, -6.6], [20.5, -4.5], [26.9, -8], [30.7, -8], [34.3, -2.9],
          [30.8, 1.7], [32.9, 4.8], [34.8, 5.4], [37.2, 11.8], [35.3, 15.6], [31.8, 18.8], [25.9, 19.9],
          [23.1, 20], [18.3, 18], [14.5, 13.9], [12.3, 12.9], [8.4, 15.4], [7.2, 18.5], [10.6, 23.6], [8.2, 25.2],
          [6.3, 25.1], [3.7, 22.4], [1, 16.4], [-3.9, 15], [-5.3, 12.8], [-5, 10.2], [3.1, 7.6], [6.4, 2.4],
          [7.2, 2.8], [10.3, 0.8], [11.4, -1.4], [8.4, -5.4], [10.8, -11.4],
      ] },
    { id: 'amazonia', name: 'Amazonia – West Africa', color: LAND, into: 'rodinia',
      vertices: [
          [125, -49.4], [135.9, -48], [133.7, -44.3], [136.4, -39.6], [155.5, -34.2], [158, -29.6], [156.7, -20.7],
          [153.3, -16.4], [153.4, -13.7], [149.3, -7.8], [147.6, -7.4], [143.4, -10.3], [137.5, -11.1],
          [136.2, -10.6], [133.3, -12.7], [126.4, -19], [127.1, -24.3], [125.9, -26.7], [126.9, -28.3],
          [124.8, -31.8], [120.2, -32.9], [114, -30.2], [107.8, -31.6], [103.3, -35.3], [102.7, -38.4],
          [106.7, -41.4], [107.8, -44.6], [115.2, -44.9],
      ] },
  ] },
  // ===== 900 Ma =====
  // Rodinia (~1.0–0.75 Ga), with Laurentia at its heart (Li et al. 2008). Siberia, India, South China and
  // Congo – São Francisco lie off it in this model.
  // (positions and outlines traced from Cao et al. 2024)
  { ma: 900, continents: [
    { id: 'rodinia', name: 'Rodinia', color: LAND, from: 'laurentia',
      vertices: [
          [59, -73.4], [123.7, -68.9], [174.4, -69.9], [162.2, -52.7], [143.9, -42.8], [157.4, -32.6],
          [157.7, -27.9], [146.3, -1.7], [155.7, 6], [170.9, 4.6], [171.5, 9.4], [164, 15.9], [157, 16.5],
          [153, 24.1], [144.9, 25.2], [141.5, 34.3], [129.6, 37.1], [123.1, 31], [114.8, 31.1], [110.5, 23.5],
          [95.5, 21.2], [89, 12], [91.3, 3.5], [79, -4.4], [81.7, -15.3], [90.4, -17.9], [93, -25.1],
          [77.8, -36.2], [81.6, -55.5], [56, -60.6], [47.8, -64.2],
      ] },
    { id: 'siberia', name: 'Siberia', color: LAND,
      vertices: [
          [-174.1, -19.1], [-171.2, -19], [-166.6, -13.4], [-167.1, -11.1], [-166.1, -9], [-163.2, -7.4],
          [-163.7, -5.7], [-161.8, -2.9], [-161.8, -1.2], [-163.3, 1.2], [-163.4, 5.4], [-165.5, 6], [-170.6, 5.4],
          [-172.4, 6.4], [-176.9, 5.4], [-179, 5.4], [178.9, 4.4], [175.8, 1.4], [174.8, -1.3], [176.8, -3.5],
          [-179.4, -4.6], [-177.8, -7.2], [-178.9, -9.5], [177.9, -11], [176.2, -10.5], [176.1, -11.3],
          [-178, -14.6], [-177.4, -16.5],
      ] },
    { id: 'south_china', name: 'South China', color: LAND,
      vertices: [
          [-90.2, 51.1], [-85.8, 51.2], [-81.2, 54.4], [-79.4, 59.9], [-82.2, 63], [-87, 63.5], [-91, 64.7],
          [-99.5, 64.9], [-108.2, 62.4], [-108.3, 61.5], [-112.1, 60.1], [-117, 58.9], [-120.7, 55.1],
          [-121.4, 53.3], [-120.7, 52.1], [-117.1, 52.7], [-116.6, 53.3], [-110.7, 53.1], [-109.2, 53.8],
          [-103.8, 53.7], [-101.4, 54.8],
      ] },
    { id: 'india', name: 'India', color: LAND,
      vertices: [
          [-36.1, 49.5], [-30.4, 51.4], [-30.2, 51.9], [-26, 52.5], [-18.2, 56.3], [-22.2, 59.4], [-24.7, 62.2],
          [-25.2, 69.3], [-23.7, 70.3], [-27.8, 71.7], [-38.3, 71.4], [-45.1, 69.6], [-47.2, 69.6], [-45.8, 68.1],
          [-47.7, 66.1], [-54.3, 64.7], [-56.3, 59.5], [-59.7, 57.6], [-65.6, 56.5], [-65.9, 55.5], [-68.8, 54.1],
          [-68.4, 53.3], [-67.2, 53.5], [-63.8, 52.2], [-62.4, 49.2], [-61.4, 48.8], [-50.9, 51.1], [-46, 49.8],
          [-45.2, 48.3], [-43.9, 48.1], [-42, 48.3], [-40.4, 49.6],
      ] },
    { id: 'congo', name: 'Congo – São Francisco', color: LAND,
      vertices: [
          [0.1, -61.8], [1.7, -61.8], [3.1, -60.1], [7.3, -58.1], [18.2, -54.8], [18, -53.1], [16.1, -51.6],
          [18.9, -48.3], [21.7, -47.1], [25.5, -46.7], [34.7, -47.8], [38.9, -46.3], [38.4, -45.1], [39.9, -41],
          [39.3, -39.4], [36.6, -39.3], [33.1, -36.8], [33.5, -34], [35.9, -31.7], [34, -24.4], [30.7, -22.9],
          [25.6, -21.1], [17.4, -22.9], [13.7, -25.6], [11.4, -29], [6, -33.5], [3.8, -34], [-0.3, -37.3],
          [0.7, -39.5], [-0.1, -40.7], [2.2, -43.6], [-0.7, -48.5], [0.5, -50.5], [-0.3, -54.7], [2.6, -57.6],
          [-1.9, -60.4],
      ] },
  ] },
  // ===== 750 Ma =====
  // Rodinia breaking up: Australia–Mawson has left western Laurentia (~0.75 Ga); the rest follow.
  // (positions and outlines traced from Cao et al. 2024)
  { ma: 750, continents: [
    { id: 'laurentia', name: 'Laurentia', color: LAND, from: 'rodinia',
      vertices: [
          [127, -30.1], [131.4, -28.4], [134.5, -29.2], [138, -24.6], [146.9, -20.3], [148.2, -16.9],
          [152.3, -13.4], [152, -10.4], [149.6, -7.2], [146, -5.3], [144.7, -1.1], [139.4, 0.1], [136.8, 2.6],
          [135.8, 4.7], [137.8, 7.8], [133.9, 9.4], [132.8, 11.8], [128.6, 12.3], [123.8, 8.8], [121.1, 9.7],
          [117.4, 8.1], [107.8, 0.9], [103.1, 2.5], [102, 5.3], [99.4, 6.4], [96.1, 5.1], [92.5, -0.2],
          [90.7, -6.1], [92.7, -13.1], [97.7, -14.6], [98.2, -20.9], [107.4, -23], [114.1, -26.2], [120.9, -25.8],
      ] },
    { id: 'baltica', name: 'Baltica', color: LAND, from: 'rodinia',
      vertices: [
          [150.2, -55], [154.8, -54.3], [154.9, -53.3], [160.2, -50.8], [177.6, -48.1], [176.3, -45.5],
          [170.8, -41.4], [170, -39.3], [163.5, -31.8], [155.9, -31.6], [146.8, -27.5], [144.3, -26.1],
          [142.9, -28.5], [140.2, -29.4], [136.3, -32.1], [134.1, -32.4], [129.7, -35.6], [134.1, -39],
          [136.7, -43.7], [136.5, -45], [132.8, -48.7], [136.4, -48.2], [139.4, -49.4], [142.3, -52.6],
          [141.5, -53.3], [142.4, -54], [146.1, -54],
      ] },
    { id: 'amazonia', name: 'Amazonia – West Africa', color: LAND, from: 'rodinia', into: 'west_gondwana',
      vertices: [
          [120.2, -80], [150.6, -74.3], [145.7, -68.5], [153.2, -61.1], [149.1, -54.9], [138.7, -55.8],
          [133.3, -53.2], [134.2, -46.1], [133.5, -37], [129.3, -33.6], [125.8, -33.5], [125.2, -32.2],
          [121.9, -30.9], [116, -31], [107.9, -28.7], [104, -22.7], [98.4, -19.7], [94.2, -19.4], [95.3, -23.2],
          [92.1, -28.3], [95.1, -34.7], [92.8, -38.1], [90.9, -38.5], [89.8, -43.1], [86.5, -46.7], [94.7, -49.5],
          [96.7, -53.6], [104.8, -55.9], [106.2, -57.8], [111.8, -58.7], [116, -62.2], [114, -65.9],
          [104.4, -68.5], [101, -73], [110.2, -79.2],
      ] },
    { id: 'kalahari', name: 'Kalahari', color: LAND, from: 'rodinia',
      vertices: [
          [78.5, -26.8], [80.8, -26.9], [84.1, -25.4], [88.1, -25.4], [88.5, -25.9], [91.4, -25.3], [92.5, -25.8],
          [94.3, -25.1], [94.8, -24], [94.1, -20.9], [95.1, -19.5], [93.9, -17.5], [94.3, -15.9], [93.1, -14.8],
          [91.3, -14.3], [89.4, -12.4], [89, -11.4], [87.7, -11.4], [84.3, -12.9], [83, -12.9], [81.7, -11.9],
          [80.5, -12.4], [78.3, -14.4], [76.5, -18.6], [73.8, -19.7], [73.1, -21.9], [75.1, -22.7], [75.7, -24.1],
          [78.3, -25.9],
      ] },
    { id: 'mawson', name: 'Australia – Mawson', color: LAND, from: 'rodinia', into: 'east_gondwana',
      vertices: [
          [72, -18.3], [77.7, -17.3], [81.4, -12.3], [80.5, -9.9], [76.5, -9.8], [74.5, -6.6], [77.9, -0.8],
          [80.5, 0.1], [82.9, -1.5], [84.1, 1.6], [78.4, 7.9], [80.5, 12.3], [79.2, 18.5], [87.9, 27.1],
          [88.6, 31.4], [99.6, 38.5], [96, 45.6], [97.8, 48.8], [82.6, 53.2], [73.2, 55.2], [67.9, 53.5],
          [66.2, 43.5], [62.3, 41.1], [53.8, 41.5], [51.5, 31.3], [59.2, 27.6], [57.8, 18.7], [63.7, 15.6],
          [66.6, 11.3], [63.7, 0.4], [67.2, -6.4], [74.9, -8.8], [76.8, -12],
      ] },
    { id: 'north_china', name: 'North China', color: LAND, from: 'rodinia',
      vertices: [
          [92.3, 48.2], [95.1, 49.7], [96.4, 53.5], [99.6, 56.3], [101.4, 56.9], [101.9, 58.2], [106, 60.8],
          [108.2, 61.3], [110.5, 63.1], [109.3, 64.8], [111.1, 67.5], [106.5, 67.5], [100.6, 69.5], [96.6, 67.2],
          [94.1, 67], [92.5, 66.2], [83.5, 64.5], [80.5, 62.7], [82, 61.5], [86.3, 60], [89.5, 56.9], [87.7, 54.7],
          [84.3, 53.5], [82, 53.7], [82.6, 51.1], [83.6, 50.5], [86.5, 50.6],
      ] },
    { id: 'siberia', name: 'Siberia', color: LAND,
      vertices: [
          [162, -8.8], [165.8, -7.8], [167.4, -5.4], [169.3, -4.8], [170.4, -1.4], [173.8, 0.2], [175.4, 4.5],
          [176.9, 5.7], [176, 9.2], [176.6, 12.9], [169, 15.7], [168, 18], [169.5, 20.6], [167.2, 20.6],
          [164.8, 22.1], [163.1, 22.2], [160.7, 22], [161.7, 18.8], [160.7, 16.7], [158.8, 16.1], [153.7, 11.9],
          [154.8, 9.2], [158.8, 6.5], [159.8, 4.2], [158.8, 2.2], [156.8, 1.2], [152.8, 1.4], [154.4, -0.8],
          [157.8, -2.9], [159.9, -7.2],
      ] },
    { id: 'south_china', name: 'South China', color: LAND,
      vertices: [
          [17.1, 51.6], [23.1, 52.1], [25.3, 54.4], [31.3, 57.2], [32.1, 59.3], [31.3, 59.8], [33.6, 62.7],
          [31.4, 65.3], [34.6, 66.6], [36.8, 69.6], [32.5, 74.7], [27.6, 75], [26.7, 73.8], [16.7, 69],
          [12.6, 63.1], [10.7, 62.9], [7.9, 61.1], [8.1, 60.3], [3.9, 58.7], [3.3, 57.5], [4.3, 55.3], [8.1, 54],
          [9.5, 52.8], [13.1, 53],
      ] },
    { id: 'india', name: 'India', color: LAND,
      vertices: [
          [25, 20.5], [25.8, 21.1], [25.9, 22.8], [28.4, 27.3], [30, 27.8], [32.1, 29.6], [36.8, 31.2],
          [37.1, 32.6], [35.7, 35.2], [31.7, 38.1], [28.8, 37.3], [26.3, 38.5], [25.5, 39.9], [22, 39.6],
          [20.1, 40.1], [19.5, 39.6], [15.4, 41], [12.9, 44.3], [10.4, 45.7], [4.4, 47.7], [3.7, 47.1],
          [2.5, 47.5], [-0.3, 42.4], [0.7, 36.3], [6.9, 32.3], [8.3, 30.4], [8.6, 28.7], [11.4, 27.7],
          [12.2, 25.9], [14, 24.4], [18.2, 23], [19, 22.1],
      ] },
    { id: 'congo', name: 'Congo – São Francisco', color: LAND,
      vertices: [
          [29, -63.7], [38.2, -58.5], [32.5, -53.9], [23.1, -54.5], [17.8, -52.5], [11.5, -43.3], [13.2, -37.7],
          [18.3, -33.2], [23.4, -33], [31.1, -44.9], [40.2, -45.3], [64, -48.4], [56.5, -36.9], [49.7, -37.7],
          [46, -35.2], [52.4, -23.9], [51.5, -19.8], [47.2, -16.9], [44, -18.5], [30.4, -13], [17.4, -22.1],
          [13.3, -21.6], [13.6, -27], [6.9, -31.2], [-11.2, -32.8], [-11.3, -39.9], [-20, -50.5], [-11.2, -55.6],
          [9.5, -51.9], [21.2, -55.7],
      ] },
  ] },
  // ===== 600 Ma =====
  // Gondwana gathering: West Gondwana (Amazonia, West Africa, the Sahara, Congo, the Arabian–Nubian arcs) and
  // East Gondwana (India, Australia, East Antarctica) converge as the Mozambique Ocean closes.
  // (positions and outlines traced from Cao et al. 2024)
  { ma: 600, continents: [
    { id: 'laurentia', name: 'Laurentia', color: LAND,
      vertices: [
          [-152.6, -47], [-137.3, -44.9], [-135.8, -38.7], [-129.8, -33.7], [-125.6, -32.2], [-126.9, -26.3],
          [-131.9, -22], [-130.8, -19.3], [-136, -16.9], [-138.6, -13.2], [-137.9, -9.9], [-136, -8.8],
          [-139.2, -6.9], [-141, -2.8], [-146.2, -2.2], [-149.6, -3.9], [-152, -2.5], [-157, -2.6], [-161.8, -5.6],
          [-167.3, -6.1], [-169, -5.5], [-170.5, -2.8], [-169.5, 3], [-177.2, 1.4], [178.9, -0.3], [172.4, -6.5],
          [167.8, -14.2], [170.1, -15.9], [171.1, -19], [170.7, -24.6], [174.4, -24.3], [-173.7, -34.1],
          [-168.7, -34], [-163.2, -36.2], [-160.6, -41.6], [-156.2, -42.6],
      ] },
    { id: 'baltica', name: 'Baltica', color: LAND,
      vertices: [
          [-97, -69], [-95.6, -68.5], [-96.5, -67.3], [-107.7, -60.9], [-108.8, -59], [-110.1, -58.9],
          [-116.3, -51.6], [-125, -50.7], [-134, -46.8], [-138.4, -42.7], [-139.5, -43.8], [-145.8, -45.8],
          [-152.5, -46], [-158.6, -47.3], [-161.5, -48], [-162, -49.1], [-158.6, -57.8], [-161.5, -59.6],
          [-166, -60.4], [-158.8, -62.7], [-156.9, -66], [-160.6, -68], [-148.9, -71.8], [-142.2, -71.9],
          [-138.1, -70.8], [-129.3, -69.8], [-106.9, -70.4],
      ] },
    { id: 'siberia', name: 'Siberia', color: LAND,
      vertices: [
          [-108.4, -12.8], [-107.6, -12.7], [-107, -10.9], [-104.9, -9.8], [-101.2, -9.8], [-99.2, -10.8],
          [-98.9, -9.9], [-95.6, -8.8], [-92.1, -3.3], [-90, 3], [-87.1, 4.5], [-85.9, 6.6], [-86.8, 10.3],
          [-88.8, 12.4], [-92, 11], [-93.8, 11.1], [-95.9, 12.2], [-96.8, 16], [-97.9, 17.1], [-99.4, 17],
          [-103.9, 15.6], [-107.3, 13.2], [-110.1, 15.1], [-113.8, 11.1], [-120.6, 8], [-122.2, 6.3], [-121.5, 5],
          [-120.1, 4.4], [-119.5, 2.7], [-117.6, 1.5], [-116.5, -1.3], [-113.1, -2.4], [-112, -5.7],
          [-110.6, -6.4], [-109.6, -8.5], [-110.6, -10.2],
      ] },
    { id: 'west_gondwana', name: 'West Gondwana', color: LAND, from: 'congo',
      vertices: [
          [12.6, -64.4], [47.8, -61.2], [64.5, -64.6], [68.4, -61.9], [74.5, -60.2], [75.2, -57.1], [80.4, -54.6],
          [98.3, -53.5], [101.6, -51.5], [93.7, -43.8], [89.4, -40.5], [90.4, -31.8], [82, -28.9], [74.3, -19.6],
          [72.5, -14.1], [68.1, -9.9], [65.3, -8.9], [64.8, -11.4], [61.4, -13.2], [55.8, -10.9], [49.9, -12.7],
          [49.6, -14.2], [46, -15.4], [42.4, -14], [42.3, -18.8], [37.5, -25.7], [28.8, -28.3], [26.3, -26.6],
          [23.2, -26.3], [18.2, -32.1], [7, -37.7], [8.7, -41.1], [4.8, -52.9], [11.1, -59.2], [9.7, -60.4],
      ] },
    { id: 'east_gondwana', name: 'East Gondwana', color: LAND, from: 'india', into: 'gondwana',
      vertices: [
          [98.5, -30.9], [101.5, -30.3], [102.3, -26.1], [96.2, -24.9], [88.6, -16.3], [90.4, -12.7],
          [102.5, -5.1], [109.7, -4.1], [117.4, -10.5], [125.6, -8.1], [136.7, -17.5], [148.5, -16.6],
          [145.6, -6.4], [148.5, -2.2], [146.5, 0.4], [140.7, -1.2], [129.4, 5.7], [126.8, 16.4], [122.3, 19.4],
          [121.5, 26.3], [114.8, 32.5], [108.5, 29.4], [103.2, 30.2], [98.4, 19.7], [94.7, 17.9], [85.3, 21],
          [75.1, 20.2], [67.1, 17.5], [62.7, 13.1], [67.9, 1.3], [79.4, -10.6], [74.6, -15.4], [77.4, -21.7],
      ] },
    { id: 'kalahari', name: 'Kalahari', color: LAND, into: 'gondwana',
      vertices: [
          [129.6, -58.9], [133.7, -57.6], [134.3, -55.7], [137.3, -54.2], [137.7, -52.4], [139.6, -50.9],
          [138.2, -48.8], [136.4, -47.7], [135.7, -44.5], [128.7, -42.9], [127.8, -41.5], [126.3, -41],
          [123.5, -41], [119.8, -42], [119.6, -42.8], [116.7, -43.7], [114.9, -42.5], [113.3, -42.4],
          [110.8, -43.2], [111.6, -48.4], [110.3, -50.5], [111.7, -51.7], [114.4, -52], [119.2, -53.9],
          [122.8, -56.4], [124.3, -56.5],
      ] },
    { id: 'north_china', name: 'North China', color: LAND,
      vertices: [
          [101.6, 25], [102.4, 25], [103.2, 26.2], [106.3, 28], [106.7, 29.7], [108.3, 31.5], [111.8, 32],
          [112.1, 32.8], [106.6, 38.4], [99.1, 42.3], [95.7, 45], [91.4, 43.7], [88.3, 44.2], [88.1, 42.4],
          [86.8, 40.4], [85.6, 39.8], [86.8, 39.7], [89.4, 37.2], [91.8, 31.2], [96.1, 29.5], [99.4, 26.3],
      ] },
    { id: 'south_china', name: 'South China', color: LAND,
      vertices: [
          [71.7, 15.2], [76.1, 15.7], [77.8, 17.2], [81.9, 18.6], [85.6, 24.5], [85, 29.8], [83, 33.2],
          [83.8, 35.8], [79, 41.2], [77.3, 41.1], [77.2, 38.9], [75.3, 35.5], [75.2, 32.9], [73.5, 29.3],
          [69.6, 26.6], [69.1, 24.7], [68.1, 23.9], [67.7, 20.2], [66.7, 18.1], [64.7, 16.3], [68.7, 16.6],
      ] },
  ] },
  // ===== 570 Ma =====
  // Greater Gondwana nearly assembled (it is complete by ~530 Ma). Whether Laurentia, Baltica and Gondwana were
  // briefly one supercontinent, "Pannotia" (~600–550 Ma), is contested; in this model Laurentia and Baltica are
  // already far from Gondwana, so it is not drawn.
  // (positions and outlines traced from Cao et al. 2024)
  { ma: 570, continents: [
    { id: 'laurentia', name: 'Laurentia', color: LAND,
      vertices: [
          [-141.5, -38.6], [-129.9, -34.3], [-129.2, -26.9], [-127.2, -26], [-126.2, -22.5], [-122, -19.8],
          [-122.7, -15.8], [-129.2, -9.7], [-128.4, -7.8], [-134.5, -5.8], [-137.8, -1.5], [-135.4, 1.8],
          [-138.8, 3.2], [-140.5, 6], [-143.5, 7], [-146.7, 6.3], [-149.4, 3.8], [-153, 4.8], [-156, 3.7],
          [-159.7, 0.3], [-165.6, -2.3], [-169.5, -0.9], [-170.5, 6], [-177.2, 2.8], [178.7, -0.4], [173.5, -9],
          [173.3, -14.5], [172, -16.4], [175.4, -18], [177.5, -25.5], [-178.2, -24.1], [-164.5, -31.1],
          [-161, -29.7], [-155.6, -30.3], [-150, -35.1], [-144.1, -35.9],
      ] },
    { id: 'baltica', name: 'Baltica', color: LAND,
      vertices: [
          [-93.3, -53.6], [-92.1, -53.6], [-87.9, -51.1], [-84.9, -47.2], [-82.1, -46], [-77.1, -46.6],
          [-76.2, -47.5], [-75.5, -46.6], [-77.2, -45.5], [-77.5, -44.3], [-76.5, -42.1], [-71.8, -39.2],
          [-72.5, -33.6], [-76.5, -30.8], [-78, -28.9], [-77.5, -27.9], [-79.1, -17.4], [-82.8, -18.5],
          [-87.9, -21.1], [-89.8, -21.2], [-98.6, -24.9], [-101.4, -33.4], [-105.3, -38], [-108.4, -39.8],
          [-108.5, -40.6], [-106.3, -41.5], [-104.6, -43.3], [-104.7, -44.1], [-102.9, -45], [-100.1, -49.6],
      ] },
    { id: 'siberia', name: 'Siberia', color: LAND,
      vertices: [
          [-103.5, -7.4], [-102, -6.4], [-97.3, -6.4], [-90.1, 0.4], [-85.3, 1.3], [-83.1, 3.9], [-84, 9.1],
          [-87.3, 8.8], [-89.5, 10], [-90.4, 12.1], [-89.3, 14.5], [-89.8, 17.3], [-95.6, 18.5], [-98.2, 17.5],
          [-99.8, 18], [-101.1, 18.6], [-101.8, 20.5], [-103.6, 20.5], [-108.2, 18.5], [-115.1, 18.7],
          [-117.3, 17.5], [-114.8, 8.4], [-112.9, 7.9], [-111.7, 5.8], [-112.7, 3.2], [-111.6, 0.2],
          [-113.1, -2.2], [-112.1, -5.4], [-107.8, -4], [-104.8, -5.5],
      ] },
    { id: 'gondwana', name: 'Gondwana (assembling)', color: LAND, from: 'west_gondwana',
      vertices: [
          [-41.3, -70.4], [-84.7, -77.9], [122.5, -81.1], [159.4, -64.1], [-159.8, -61.6], [-151, -56.3],
          [-155, -40.7], [-170.7, -35.9], [-172.6, -25.4], [174, -15.6], [161.1, -27.4], [171.9, -35.5],
          [165.7, -48], [157.9, -47.8], [146.8, -37.8], [110.2, -34.2], [109.9, -24], [115.3, -18.2],
          [124.1, -14.3], [133.9, -20.3], [143.8, -19.5], [147.5, -16.4], [143.1, -1.8], [124.2, 1], [109.6, 19.7],
          [100.8, 23.2], [92.2, 17.2], [89.7, -3.3], [70, -13.9], [62.1, -24.4], [71, -33.9], [43.8, -43.4],
          [35.5, -56.7], [15.8, -54.8], [-16.2, -60.9],
      ] },
    { id: 'north_china', name: 'North China', color: LAND,
      vertices: [
          [91.2, 13], [93.1, 13.5], [94.9, 16.5], [95.2, 19.6], [97.1, 22.4], [98.1, 22.5], [98.3, 23.8],
          [90.7, 27], [85.6, 27.7], [80.2, 29.8], [79.3, 29.6], [78, 28.4], [74.3, 27.2], [75.4, 25.1],
          [74.4, 22.4], [78.1, 20.8], [81.9, 15.8], [83.2, 16.3], [84.5, 15.3], [86.8, 15.2],
      ] },
    { id: 'south_china', name: 'South China', color: LAND,
      vertices: [
          [67.2, -17], [69.3, -16.1], [73.6, -16.1], [76.3, -15], [81.9, -8.8], [81.7, -1.6], [81.1, -0.6],
          [79.8, 0], [79.2, 1.8], [77.3, 3], [75.2, 7.1], [74.2, 8.4], [70.2, 10.4], [68.8, 9.8], [69.8, 7.7],
          [69.8, 2.6], [70.8, -1.4], [67.7, -6.3], [67.2, -9.9], [68.1, -13.4], [67, -15.7],
      ] },
    { id: 'tarim', name: 'Tarim', color: LAND, from: 'south_china',
      vertices: [
          [57.7, -7.8], [58.9, -7.7], [59.1, -7.3], [59.9, -7.2], [60.5, -6.7], [60.5, -1.5], [57.5, 1.3],
          [57.5, 2.1], [55.8, 3.7], [55.1, 3.8], [54.8, 4.2], [53.5, 4], [53.5, 1.4], [54, 1], [54, -2.1],
          [54.5, -2.4], [54.5, -3.7], [56, -4.9], [56, -5.7], [57.5, -6.9],
      ] },
  ] },
];
// </generated:deep>
deepSlices.sort((a, b) => b.ma - a.ma);

// ---------------------------------------------------------------------------------------------
// Keyframe list + bracketing (kept for older callers)
// ---------------------------------------------------------------------------------------------

/** Deep-time slices keyed by Ma: { 540: { ma, continents }, … }. */
export const slices = Object.fromEntries(deepSlices.map((s) => [s.ma, s]));

/** Every keyframe time of the continental model, oldest first (deep-time slices, then plate keyframes). */
export const timeSlices = [...new Set([
  ...deepSlices.map((s) => s.ma),
  ...plates.flatMap((p) => p.track.map((k) => k[0])),
])].sort((a, b) => b - a);

/**
 * The two keyframe times that bracket timeMa.
 * @returns {{before:number, after:number, alpha:number}} before ≥ timeMa ≥ after; alpha 0..1 from before to after
 */
export function getBracketingSlices(timeMa) {
  const first = timeSlices[0];
  const last = timeSlices[timeSlices.length - 1];
  if (!(timeMa < first)) return { before: first, after: first, alpha: 0 };
  if (timeMa <= last) return { before: last, after: last, alpha: 0 };
  for (let i = 0; i < timeSlices.length - 1; i++) {
    const before = timeSlices[i];
    const after = timeSlices[i + 1];
    if (timeMa <= before && timeMa >= after) {
      return { before, after, alpha: (before - timeMa) / (before - after) };
    }
  }
  return { before: last, after: last, alpha: 0 };
}

// ---------------------------------------------------------------------------------------------
// 3. Plate outlines — Natural Earth 1:110m land (public domain), see the header for the format.
// ---------------------------------------------------------------------------------------------
// <generated:outlines>
function outlines() {
  return {
    south_america: [
      { id: 'south_america', name: 'South America', label: [-58, -11],
        v: [
          -78.2,7.5,-77.9,7.2,-77.3,5.8,-77.5,4.1,-77.1,3.8,-77.9,2.7,-78.4,2.6,-78.9,1.4,-80.1,0.8,-80.6,-0.9,-80.9,-1.1,
          -81,-2.2,-80.4,-2.7,-80,-2.2,-79.8,-2.7,-81.4,-4.7,-80.9,-5.7,-81.2,-6.1,-79.8,-7.2,-79,-8.4,-76.3,-13.5,
          -76,-14.6,-71.5,-17.4,-70.4,-18.3,-70.2,-19.8,-70.9,-27.6,-71.5,-28.9,-71.4,-32.4,-73.2,-37.1,-73.6,-37.2,
          -73.2,-39.3,-74.3,-43.2,-73.7,-43.4,-73.4,-42.1,-72.7,-42.4,-73.2,-44.5,-74.4,-44.1,-74.7,-45.8,-75.6,-46.6,
          -74.1,-46.9,-75.6,-48.7,-74.9,-52.3,-72.6,-53.5,-71,-53.8,-70.8,-52.9,-69.5,-52.3,-68.2,-52.3,-69.1,-50.7,
          -67.8,-49.9,-67.2,-48.7,-66,-48.1,-65.6,-47.2,-67.6,-46.3,-67.3,-45.6,-66.5,-45,-65.6,-45,-65.2,-43.5,
          -63.5,-42.6,-63.8,-42,-64.3,-42.4,-65,-42.1,-65.1,-41.1,-64.7,-40.8,-63.8,-41.2,-62.1,-40.7,-62.3,-38.8,
          -59.2,-38.7,-57.7,-38.2,-56.7,-36.4,-57.4,-36,-57.2,-35.3,-58.5,-34.4,-58.4,-33.9,-57.8,-34.5,-56.2,-34.9,
          -54.9,-35,-53.8,-34.4,-52.3,-32.2,-48.9,-28.7,-48.5,-25.9,-47.6,-24.9,-44.6,-23.4,-42,-23,-41.8,-22.4,
          -40.9,-21.9,-39.3,-17.9,-38.7,-13.1,-35.1,-9,-34.7,-7.3,-35.6,-5.1,-37.2,-4.8,-40,-2.9,-41.5,-2.9,-43.4,-2.4,
          -44.6,-2.7,-44.4,-2.1,-44.9,-1.6,-47.8,-0.6,-48.6,-1.2,-48.6,-0.2,-50.4,-0.1,-50.7,0.2,-49.9,1,-50,1.7,-50.5,1.9,
          -51.3,4.2,-51.7,4.2,-52.9,5.4,-54,5.8,-57.1,6,-58.5,6.8,-59.1,8,-60.7,8.6,-60.8,9.4,-62.4,9.9,-62.7,10.4,
          -61.9,10.7,-64.3,10.6,-64.9,10.1,-66.2,10.6,-68.2,10.6,-68.9,11.4,-69.6,11.5,-69.9,12.2,-70.3,11.8,-70.2,11.4,
          -71.4,11,-71,9.9,-71.3,9.1,-71.7,9.1,-72.1,9.9,-71.6,10.4,-71.9,11.4,-71.4,11.5,-71.1,12.1,-71.8,12.4,-73.4,11.2,
          -74.9,11.1,-75.5,10.6,-75.7,9.4,-76.8,8.6,-77.4,8.7,-77.7,8.9,
        ] },
      { id: 'tierra_del_fuego', name: 'Tierra del Fuego', label: [-69.3, -54.3],
        v: [
          -74.7,-52.8,-72.3,-54.5,-69.2,-55.5,-68.1,-55.6,-67,-54.9,-66.4,-55.2,-65.5,-55.2,-65,-54.7,-67.7,-53.8,
          -68.6,-52.6,-69.3,-52.5,-70.3,-52.9,-71.1,-54.1,
        ] },
      { id: 'falklands', name: 'Falkland Islands', label: [-60.6, -51.9],
        v: [-61.2,-51.8,-60.7,-52.3,-59.8,-51.8,-59.4,-52.2,-57.7,-51.5,-58.5,-51.1,-59.1,-51.5,-60,-51.2] },
      { id: 'trinidad', name: 'Trinidad', label: [-61.3, 10.5],
        v: [-60.9,10.9,-61.7,10.8,-61.7,10.4,-61.9,10.1,-60.9,10.1] },
      { id: 'galapagos', name: 'Galápagos', emerge: [4, 3], label: [-91.2, -0.6],
        v: [-91.4,-1,-90.9,-0.9,-90.8,-0.5,-91,-0.2,-91.2,0.1,-91.5,0,-91.6,-0.4,-91.5,-0.8] },
    ],
    north_america: [
      { id: 'north_america', name: 'North America', group: 'north_america', oldName: ['Laurentia', 420], label: [-101, 46],
        v: [
          -94.3,16.1,-94,17.2,-94.3,18,-94.5,18.2,-95.9,18.8,-97.2,20.6,-97.9,22.4,-97.1,25.9,-97.4,27.4,-96.6,28.3,
          -93.8,29.7,-91.6,29.7,-90.2,29.1,-89.2,29.3,-89.6,30.2,-89.2,30.3,-86.5,30.4,-86.1,30.9,-84.5,31.3,-82.9,31.4,
          -81.3,31.5,-79.1,33.5,-76.4,34.8,-75.7,35.6,-76.3,37.9,-77,38.2,-76.3,38.1,-76.3,39.2,-75.7,37.9,-75.9,37.2,
          -75.1,38.4,-75.5,39.5,-74.9,38.9,-74,40.8,-71.9,40.9,-73.7,40.9,-70,41.6,-70.8,42.3,-70.1,43.7,-67,44.8,
          -67.1,45.1,-64.4,45.3,-66.2,44.5,-66.1,43.6,-65.4,43.5,-59.8,45.9,-60.4,46.3,-60.5,47,-61.5,45.9,-63.2,45.7,
          -64.5,46.2,-65.1,48.1,-64.2,48.7,-65.1,49.2,-66.6,49.1,-71.1,46.8,-66.4,50.2,-60,50.2,-55.7,52.1,-55.8,53.3,
          -56.9,53.8,-57.3,54.6,-59.6,55.2,-61.8,56.3,-61.4,57,-64.6,60.3,-66.2,58.8,-67.6,58.2,-69.3,59,-69.6,61.1,
          -71.4,61.1,-73.8,62.4,-74.7,62.2,-77.4,62.6,-78.1,62.3,-77.3,59.9,-78.5,58.8,-77.3,58.1,-76.5,56.5,-78.2,55.1,
          -79.8,54.7,-78.6,52.6,-79.1,51.5,-79.9,51.2,-81.4,52.2,-82.1,53.3,-82.3,55.1,-85,55.3,-90.9,57.3,-92.3,57.1,
          -93.2,58.8,-94.7,58.9,-93.2,62,-91.9,62.8,-90.8,63,-89.9,64,-88.5,64.1,-85.8,66.6,-84.7,66.3,-83.3,66.4,
          -81.4,67.1,-81.3,69.2,-85.5,69.9,-85.6,68.8,-87.4,67.2,-89.2,69.3,-90.6,68.5,-90.5,69.5,-92.4,69.7,-91.5,70.2,
          -92.9,71.3,-95.2,71.9,-96.5,70.1,-94.2,69.1,-96.1,67.3,-96.1,68.2,-97.7,68.6,-98.6,68.4,-98.4,67.8,-101.5,67.6,
          -104.3,68,-106.2,68.8,-108.2,68.7,-108.8,68.3,-107.8,67.9,-108.9,67.4,-109.9,68,-113.5,67.7,-115.3,67.9,
          -113.9,68.4,-115.2,68.9,-122.7,69.9,-124.3,69.4,-124.4,70.2,-125.8,69.5,-128.1,70.5,-129.1,69.8,-129.8,70.2,
          -132.9,69.5,-134.4,69.6,-136.5,68.9,-143.6,70.2,-144.9,70,-150.7,70.4,-152.2,70.8,-154.3,70.7,-156.6,71.4,
          -161.9,70.3,-163.2,69.4,-166.2,68.9,-166.8,68.4,-161.7,66.1,-163.8,66.1,-163.7,66.6,-164.5,66.6,-168.1,65.7,
          -166.4,64.7,-165,64.4,-162.8,64.3,-160.8,64.8,-161.5,64.4,-160.8,63.8,-163.1,63.1,-164.6,63.1,-165.7,62.1,
          -166.1,61.5,-165.3,60.5,-163.8,59.8,-162.5,60,-161.9,59.6,-162,58.7,-160.4,59.1,-159.1,58.4,-157,58.9,
          -157.7,57.6,-158.7,57,-164.8,54.4,-158.4,56,-154.2,58.1,-153.3,58.9,-154,59.4,-150.6,61.3,-151.7,59.2,-148,60,
          -148.2,60.7,-147.1,60.9,-144,60,-139.9,59.5,-137.8,58.5,-134.1,58.1,-132,55.5,-130.5,54.8,-129.1,52.8,
          -127.9,52.3,-127.4,50.8,-122.8,49,-122.5,48.2,-122.6,47.1,-123.1,48,-124.7,48.2,-123.9,45.5,-124.5,42.8,
          -124.4,40.3,-123.7,39,-120.6,34.6,-118.5,34,-117.3,33,-115.5,29.6,-114.2,28.6,-114.6,27.7,-115.1,27.7,-112.3,26,
          -112.2,24.7,-110.3,23.4,-110,22.8,-109.4,23.2,-110.2,24.3,-110.7,24.3,-111.6,26.7,-114.7,30.2,-114.8,31.8,
          -113.1,31.2,-112.2,29,-109.3,26.4,-109.3,25.6,-106,22.8,-105.3,21.4,-105.4,20.5,-105.7,20.4,-105,19.3,
          -103.5,18.3,-98,16.1,-96.6,15.7,-94.7,16.2,
        ] },
      { id: 'baffin', name: 'Baffin Island', label: [-71, 65.1],
        v: [
          -88.4,73.5,-90.2,72.2,-89.9,71.2,-88.5,71.2,-89.5,70.8,-88.7,70.4,-81.3,69.7,-79,70.2,-76.2,69.1,-76.9,68.9,
          -73.3,68.1,-72.7,67.3,-74.3,65.8,-74,65.5,-77.9,65.3,-78.6,64.6,-77.7,64.2,-74.8,64.4,-74.8,64.7,-71.9,63.7,
          -72.2,63.4,-71,62.9,-66.2,61.9,-68.8,63.7,-65,62.7,-64.7,63.4,-65.3,64.4,-68.1,65.7,-68,66.3,-66.7,66.4,-63.9,65,
          -61.9,66.9,-63.4,66.9,-64.9,67.8,-68.8,68.7,-67,69.2,-67.9,70.1,-71.2,70.9,-72.2,71.6,-74.1,71.3,-74.2,71.8,
          -77.8,72.7,-80.7,72.1,-80.6,72.7,-82.3,73.8,-84.9,73.3,-85.8,72.5,-86.6,73.2,-85.8,73.8,
        ] },
      { id: 'victoria_island', name: 'Victoria Island', label: [-108.4, 70.4],
        v: [
          -117.9,72.7,-119.4,71.6,-116.1,71.3,-118.4,70.9,-117.9,70.5,-112.4,70.4,-117.3,70,-116.1,69.2,-113.9,69,
          -113.3,68.5,-106,69.2,-102.4,68.8,-102.7,69.5,-101.1,69.6,-101,70,-104.5,71,-106.5,73.1,-108.4,73.1,-108.2,71.7,
          -109.9,73,-111.1,72.5,-112.4,73,-114.7,72.7,-114.2,73.1,-115.2,73.3,
        ] },
      { id: 'ellesmere', name: 'Ellesmere Island', label: [-76, 81.5],
        v: [
          -89.5,76.5,-80.6,76.2,-77.9,76.8,-79.8,77.2,-75.4,78.5,-76.9,79.3,-71.2,79.8,-61.8,82.6,-65.8,83,-79.3,83.1,
          -83.2,82.3,-85.5,82.7,-91.6,81.9,-87.6,80.5,-81.8,80.5,-83.4,80.1,-86.9,80.3,-85.1,79.3,-88,78.4,-85,77.5,
          -88.3,77.9,-87.8,77.2,-89.6,77,
        ] },
      { id: 'panama', name: 'Isthmus of Panama', emerge: [13, 3], origin: [-85.3, 11.3], label: [-83.2, 9.6],
        v: [
          -86.5,11.8,-85.7,11.1,-85.9,10.9,-85.7,10.8,-85.7,9.9,-85.1,9.6,-85,10.1,-84.6,9.6,-83.6,9.1,-83.7,8.7,-83.5,8.4,
          -82.9,8.1,-82.8,8.3,-81.7,8.1,-81.5,7.7,-81.1,7.8,-80.9,7.2,-80.4,7.3,-80,7.5,-80.5,8.1,-80.4,8.3,-79.8,8.6,
          -79.6,8.9,-79.1,9,-78.2,8.3,-78.4,8.1,-77.9,7.2,-77.4,8.7,-78.1,9.2,-79.6,9.6,-80.9,8.9,-82.2,9,-82.2,9.2,
          -83.4,10.4,-83.7,10.9,-83.9,11.4,
        ] },
      { id: 'newfoundland', name: 'Newfoundland', label: [-56.9, 48.7],
        v: [
          -55.9,51.6,-56.7,51.3,-59.2,48.5,-58.8,48.3,-59.4,47.9,-59.3,47.6,-56.3,47.6,-55.3,47.4,-56,46.9,-55.4,46.9,
          -54.2,47.8,-54.2,46.8,-53.1,46.7,-52.6,47.5,-53.1,48.7,-53.8,48.5,-53.5,49.2,-55.8,49.6,-55.5,49.9,-56.1,50.2,
          -56.8,49.8,-55.4,51.6,
        ] },
      { id: 'cuba', name: 'Cuba', emerge: [90, 50], label: [-76.5, 20.6],
        v: [
          -85,21.9,-84.1,21.9,-82.8,22.7,-81.8,22.6,-82.2,22.4,-81.8,22.2,-78.7,21.6,-78.1,20.7,-77.1,20.4,-77.8,19.9,
          -74.3,20.1,-74.2,20.3,-75.7,20.7,-75.6,21,-76.5,21.2,-78.3,22.5,-79.3,22.4,-80.6,23.1,-83.3,23,
        ] },
      { id: 'hispaniola', name: 'Hispaniola', emerge: [90, 50], label: [-71.4, 19],
        v: [
          -74.5,18.3,-73.9,18,-72.4,18.2,-71.7,18,-71.4,17.6,-70.7,18.4,-70.5,18.2,-70,18.4,-68.7,18.2,-68.3,18.6,-69.3,19,
          -69.2,19.3,-69.8,19.3,-70,19.6,-70.8,19.9,-73.2,19.9,-73.4,19.6,-72.8,19.5,-72.3,18.7,-72.7,18.4,-74.4,18.7,
        ] },
      { id: 'banks', name: 'Banks Island', label: [-120.9, 73.3],
        v: [-124.9,74.3,-123.9,73.7,-125.9,71.9,-123.1,70.9,-120.5,71.4,-119.2,72.5,-115.5,73.5,-117.6,74.2] },
      { id: 'devon', name: 'Devon Island', label: [-88, 75],
        v: [-96.7,77.2,-97.1,76.8,-92.9,75.9,-92.4,74.8,-88.2,74.4,-80.5,74.7,-80.1,75.3,-81.1,75.7,-89.2,75.6,-91.6,76.8] },
      { id: 'melville', name: 'Melville Island', label: [-114.4, 75.7],
        v: [
          -117.7,75.2,-111.8,75.2,-113.9,74.7,-113.7,74.4,-112.2,74.4,-106.3,75,-105.7,75.5,-105.9,76,-107.8,75.8,
          -109.6,76.8,-110.5,76.4,-109.1,75.5,-115.4,76.5,
        ] },
      { id: 'axel_heiberg', name: 'Axel Heiberg Island', label: [-92.3, 80],
        v: [-92.4,81.3,-94.7,81.2,-96.7,80.2,-95,79.4,-93.1,79.4,-92.9,78.3,-89,78.3,-85.8,79.3] },
      { id: 'southampton', name: 'Southampton Island', label: [-84.6, 64.5],
        v: [
          -85.9,65.7,-86.4,64,-87.2,63.5,-85.9,63.6,-85.5,63.1,-83.1,64.1,-82.5,63.7,-81,63.4,-80.1,63.7,-81.6,64,
          -81.6,64.5,-84.5,65.4,-85,65.2,
        ] },
      { id: 'prince_of_wales', name: 'Prince of Wales Island', label: [-98.7, 72.3],
        v: [
          -98.4,71.3,-96.7,71.7,-96.5,72.6,-98.1,73,-97.1,73.5,-97.4,73.8,-100.4,73.8,-101.5,73.4,-100.4,72.7,-102.5,72.8,
          -102.5,72.5,
        ] },
      { id: 'vancouver_island', name: 'Vancouver Island', label: [-125.7, 49.5],
        v: [-128.4,50.8,-128.1,50,-127,49.8,-125.7,48.8,-124,48.4,-123.5,48.5,-125.8,50.3] },
      { id: 'somerset', name: 'Somerset Island', label: [-93.7, 73.5],
        v: [-94.5,74.1,-95.5,73.9,-96,72.9,-95.4,72.1,-94.3,72,-90.5,73.9] },
      { id: 'prince_patrick', name: 'Prince Patrick Island', label: [-118.9, 76.8],
        v: [-121.5,75.9,-117.1,76.5,-116.2,77.6,-119.1,77.5,-121.2,76.9,-122.9,76.1] },
      { id: 'bathurst', name: 'Bathurst Island', label: [-100.3, 76],
        v: [-99.8,74.9,-98.2,75,-98.5,76.7,-102.6,76.3,-102.5,75.6,-100.9,75.6,-100.9,75.1] },
      { id: 'bylot', name: 'Bylot Island', label: [-78.7, 73.2],
        v: [-80.4,73.8,-80.9,73.3,-79.5,72.7,-76.3,72.8,-76.3,73.1,-78.1,73.7] },
      { id: 'king_william', name: 'King William Island', label: [-98, 69.5],
        v: [-99.8,69.4,-98.4,69,-97.6,69.1,-96.3,68.8,-95.6,69.1,-96.6,69.7,-98.2,70.1] },
      { id: 'hawaii', name: 'Hawaii', emerge: [1, 0.4], label: [-155.5, 19.6],
        v: [-155.9,20.3,-156.1,19.7,-155.9,19.1,-155.7,18.9,-154.8,19.5,-155.2,20] },
      { id: 'jamaica', name: 'Jamaica', emerge: [90, 50], label: [-77.2, 18.1],
        v: [-76.2,17.9,-76.9,18.4,-77.8,18.5,-78.3,18.2,-77.2,17.7] },
      { id: 'haida_gwaii', name: 'Haida Gwaii', label: [-132.5, 53.8],
        v: [-133.2,54.2,-133.1,53.4,-131.2,52.2,-132,53,-131.7,54.1] },
      { id: 'kodiak', name: 'Kodiak Island', label: [-153.9, 57.3],
        v: [-152.1,57.6,-153.2,58,-154.7,57.5,-154.5,57,-154,56.7] },
      { id: 'ellef_ringnes', name: 'Ellef Ringnes Island', label: [-102.5, 78.6],
        v: [-105.5,79.3,-104.2,78.7,-105.2,78.4,-99.7,77.9,-100.8,78.8] },
      { id: 'puerto_rico', name: 'Puerto Rico', emerge: [90, 50], label: [-66.9, 18.2],
        v: [-67.2,17.9,-65.8,18,-65.6,18.2,-65.8,18.4,-67.1,18.5] },
      { id: 'cornwallis', name: 'Cornwallis Island', label: [-95.3, 75.1],
        v: [-94.9,75.6,-96.3,75.4,-96.8,74.9,-94.2,74.6,-93.6,75] },
      { id: 'anticosti', name: 'Anticosti Island', label: [-63, 49.5],
        v: [-64.5,49.9,-63.6,49.4,-61.8,49.1,-61.8,49.3,-62.9,49.7] },
      { id: 'prince_edward_island', name: 'Prince Edward Island', label: [-62.9, 46.3],
        v: [-64.4,46.7,-62.9,46,-62,46.4,-63.7,46.6,-64,47] },
      { id: 'st_lawrence_island', name: 'St. Lawrence Island', label: [-171.2, 63.5],
        v: [-168.7,63.3,-171.7,63.8,-171.6,63.3,-170.7,63.4,-169.5,63] },
    ],
    florida: [
      { id: 'florida', name: 'Florida', group: 'north_america', label: [-81.6, 28.6],
        v: [
          -81.3,31.5,-82.8,32,-84.7,31.9,-86.5,31.3,-86.5,30.4,-86.4,30.4,-85.1,29.6,-84.1,30.1,-82.9,29.1,-82.9,27.9,
          -81.7,25.9,-81.2,25.2,-80.4,25.2,-80.1,26.9,-81.3,30,-81.3,31.4,
        ] },
      { id: 'andros', name: 'Andros', label: [-78, 24.7],
        v: [-78.2,25.2,-78.4,24.6,-78,24.3,-77.8,23.7,-77.5,23.8,-77.5,24.3,-77.9,25.2] },
    ],
    yucatan: [
      { id: 'yucatan', name: 'Yucatán', group: 'north_america', label: [-89.2, 18.6],
        v: [
          -94.5,18.2,-94.9,17.8,-94.6,17.1,-94.3,16.1,-93.9,15.9,-91.2,13.9,-88.5,13.2,-87.5,13.3,-87.3,13,-87.7,12.9,
          -86.5,11.8,-85.7,11.1,-85,10.8,-84.3,11.2,-83.7,10.9,-83.9,11.4,-83.2,14.3,-83.4,15.3,-85,16,-88.9,15.9,
          -88.4,16.5,-88.3,18.5,-87.8,18.3,-87.6,19.6,-86.8,20.8,-87.1,21.5,-90.3,21,-90.8,19.3,-91.4,18.9,-94.4,18.1,
        ] },
    ],
    greenland: [
      { id: 'greenland', name: 'Greenland', oldName: [null, 420], label: [-41, 72],
        v: [
          -44.8,60,-43.4,60.1,-42.4,61.9,-42.8,62.7,-41.2,63.5,-39.8,65.5,-34.2,66.7,-31.8,68.1,-27.7,68.5,-22.3,70.1,
          -26.4,70.2,-25.2,70.8,-25.5,71.4,-23.5,70.5,-21.8,70.7,-22.1,71.5,-24.8,72.3,-24.3,72.6,-22.3,72.2,-23.6,73.3,
          -20.8,73.5,-21.6,74.2,-19.4,74.3,-20.7,75.2,-19.6,75.2,-19.8,76.1,-21.7,76.6,-18.5,77,-19.7,78.8,-17.7,80.1,
          -20,80.2,-16.8,80.4,-12.2,81.3,-15.8,81.9,-23.2,81.2,-22.9,82.1,-24.8,81.8,-31.4,82,-22.7,82.3,-20.8,82.7,
          -27.1,83.5,-43.4,83.2,-46.8,82.6,-44.5,81.7,-50.4,82.4,-53,81.9,-57.2,82.2,-62.7,81.8,-62.2,81.3,-68,80.1,
          -65.7,79.4,-73.2,78.4,-73.3,78,-66.8,77.4,-71.4,77,-68.5,76.1,-61.3,76.1,-58.6,75.5,-54.7,72.6,-55.8,71.7,
          -54,71.5,-51.4,70.6,-54.4,70.8,-54.7,69.6,-53.5,69.3,-50.9,69.9,-51.5,68.7,-53,68.4,-54,67.2,-51.6,63.6,
          -48.3,60.9,-46.3,60.9,
        ] },
    ],
    eurasia: [
      { id: 'baltica', name: 'Baltica', main: true, group: 'europe', label: [36, 57],
        v: [
          14.6,53.9,14.2,52.8,16.8,51.6,19.2,50,22,48.8,23.9,47.4,26.4,45.7,29.8,45.2,30.7,46.6,31.7,46.7,31.7,46.3,
          33.3,46.1,33.6,45.9,32.5,45.3,33.5,45,33.3,44.6,33.9,44.4,36.3,45.1,36.5,45.5,35,45.7,35,46.3,39.1,47.3,
          37.7,46.6,38.2,46.2,36.7,45.2,40.3,43.1,43.4,42.7,45.9,42,48.6,41.8,46.7,44.6,47.7,45.6,51.2,47,53.4,49.3,
          58,51.3,60.1,54.9,60.2,57.5,60.2,60,61.2,62.2,62.2,64.4,66.7,67.1,68.5,68.1,60.6,69.9,60,69.5,61.1,68.9,
          59.9,68.3,58.8,68.9,54.7,68.1,53.5,68.2,54.5,68.8,53.7,68.9,46.3,66.7,45.6,67,45.6,67.6,46.8,67.7,46.3,68.3,
          43.5,68.6,44.5,66.8,43.9,66.1,42.1,66.5,39.8,65.5,40.4,64.8,39.6,64.5,37.2,65.1,36.5,64.8,37,63.8,34.9,64.4,
          34.8,65.9,33.2,66.6,38.4,66,40,66.3,41.1,66.8,40.3,67.9,32.1,69.9,31.1,69.6,30,70.2,31.3,70.5,28.2,71.2,24.5,71,
          23,70.2,19.2,69.8,10.5,64.5,5,62,5.7,58.6,7,58.1,8.4,58.3,10.4,59.5,12.9,55.4,14.1,55.4,14.7,56.2,15.9,56.1,
          16.8,58.7,17.9,59,18.8,60.1,17.1,61.3,17.8,62.7,21.4,64.4,22.2,65.7,23.9,66,25.4,65.1,21.5,63.2,21.3,60.7,
          22.9,59.8,28.1,60.5,29.1,60,28,59.5,25.9,59.6,23.3,59.2,23.4,58.6,24.4,58.4,24.1,57,23.3,57,22.5,57.8,21.6,57.4,
          21.3,55.2,19.9,54.9,19.7,54.4,17.6,54.9,
        ] },
      { id: 'turan', name: 'Turan', group: 'asia', label: [62, 41.5],
        v: [
          53.8,37.6,56.2,37.3,58,37.7,58.5,37.6,60.7,36.2,61.9,35.7,62.4,35.3,65.2,35.3,66.3,35.5,67.8,35.5,68.6,35.7,
          68.9,35.6,70.3,35.1,71.2,34.2,71.5,34.6,72.8,35.2,74.1,35.5,74.7,36.7,75.3,37,75,37.8,73.9,39.6,73.3,40.1,
          71,41.4,69.4,41.7,65.2,43.8,64.3,44,63.1,44.7,61.9,45.2,61.3,46.6,60.4,48.1,60.6,49.3,60.9,50,60.6,51.3,60.9,52,
          60.6,53.3,60.8,54.1,59.8,55.1,58.9,55.1,57,51.7,52.6,49.7,51.2,47,53,46.9,53,45.3,51.3,45.2,51.3,44.5,50.3,44.6,
          50.3,44.3,51.3,43.1,52.5,42.8,52.8,41.1,52.9,41.9,53.7,42.1,54.7,41,53.9,40.6,52.9,40.9,52.7,40,53.4,40,
          53.1,39.3,53.9,39,
        ] },
      { id: 'sulawesi', name: 'Sulawesi', emerge: [50, 25], label: [120.1, -2],
        v: [
          125.1,1.6,124.1,0.9,120.9,1.3,120,0.6,118.8,-2.8,119.1,-3.5,119.5,-3.5,119.7,-4.5,119.4,-5.4,119.8,-5.7,
          120.4,-5.5,120.3,-2.9,121,-2.6,120.9,-3.6,121.6,-4.2,121.5,-4.6,121.7,-4.9,122.7,-4.5,122.2,-5.3,122.6,-5.6,
          123.2,-5.3,123.2,-4.7,122.3,-3.5,122.5,-3.2,121.5,-1.9,122.4,-1.5,122.8,-0.9,123.3,-1.1,123.3,-0.6,121.5,-1,
          120.9,-1.4,120,-0.5,120.2,0.2,124.4,0.4,125.2,1.4,
        ] },
      { id: 'luzon', name: 'Luzon', emerge: [50, 25], label: [121.5, 17.1],
        v: [
          120.7,18.5,120.3,16,119.9,16.4,120.1,15,120.6,14.4,120.7,14.8,121,14.5,120.6,13.9,122,13.8,122.7,13.2,122.9,13.6,
          124.1,12.5,124,13.8,122.7,14.3,121.7,14.3,121.7,15.9,122.3,16.3,122.5,17.1,122.2,18.5,121.9,18.2,
        ] },
      { id: 'iceland', name: 'Iceland', emerge: [17, 9], label: [-18.6, 64.9],
        v: [
          -22.8,64,-18.7,63.5,-14.9,64.4,-13.6,65.1,-14.7,65.8,-14.5,66.5,-16.2,66.5,-17.8,66,-19.1,66.3,-20.6,65.7,
          -22.1,66.4,-23.7,66.3,-24.3,65.6,-22.2,65.4,-22.2,65.1,-24,64.9,-21.8,64.4,
        ] },
      { id: 'mindanao', name: 'Mindanao', emerge: [50, 25], label: [125.4, 8.1],
        v: [
          126.2,9.3,125.4,9.8,125.5,9,124.8,9,124.6,8.5,123.8,8.2,123.5,8.7,122.3,8,121.9,7.2,122.1,6.9,123.6,7.8,
          124.2,7.4,123.9,6.9,124.2,6.2,125.4,5.6,125.7,6,125.4,6.8,125.8,7.3,126.2,6.3,126.5,7.2,
        ] },
      { id: 'novaya_zemlya', name: 'Novaya Zemlya', label: [53.5, 71.9],
        v: [
          68.2,76.9,55.6,75.1,55.9,74.6,53.5,73.7,54.4,73.6,51.5,72,51.6,71.5,53.4,71.2,53.7,70.8,57.5,70.7,55.6,71.5,
          55.4,72.4,58.5,74.3,68.2,76.2,
        ] },
      { id: 'spitsbergen', name: 'Spitsbergen', label: [15.6, 79],
        v: [17,80.1,15.1,79.7,13.2,80,10.4,79.7,11.2,78.9,14.7,77.7,13.8,77.4,15.9,76.8,17.1,76.8,19,78.6,21.5,79] },
      { id: 'negros', name: 'Negros', emerge: [50, 25], label: [123, 9.9],
        v: [124.1,11.2,123.3,10.3,123.5,10.9,122.9,10.9,122.4,9.7,123,9,124,10.3] },
      { id: 'halmahera', name: 'Halmahera', emerge: [30, 10], label: [128, 1],
        v: [127.9,2.2,127.4,1,128.1,-0.9,128.4,-0.8,128,-0.3,128.1,0.4,128.6,0.3,128.7,1.1,128.6,1.5,128,1.6] },
      { id: 'samar', name: 'Samar', emerge: [50, 25], label: [125.2, 11.6],
        v: [124.3,12.6,124.9,11.8,124.9,11.4,124.3,11.5,124.8,10.1,125.3,10.4,125,11.3,125.8,11,125.2,12.5] },
      { id: 'seram', name: 'Seram', emerge: [30, 10], label: [128.7, -3.1],
        v: [127.9,-3.4,130,-3.4,130.8,-3.9,130.5,-3.1,129.4,-2.8,128.1,-2.8] },
      { id: 'nordaustlandet', name: 'Nordaustlandet', label: [23.6, 80],
        v: [17.4,80.3,20.1,79.6,23,79.4,25.9,79.5,27.4,80.1,22.9,80.7,21.9,80.4,20.5,80.6] },
      { id: 'flores', name: 'Flores', emerge: [30, 10], label: [120.7, -8.5],
        v: [119.9,-8.8,122.8,-8.6,122.9,-8.1,121.3,-8.5,120.7,-8.2,119.9,-8.4] },
      { id: 'sumbawa', name: 'Sumbawa', emerge: [30, 10], label: [118, -8.5],
        v: [116.7,-9,119.1,-8.7,118.9,-8.3,117.9,-8.1,117.6,-8.4,117.1,-8.5] },
      { id: 'panay', name: 'Panay', emerge: [50, 25], label: [122.4, 11.2],
        v: [122,10.4,123.1,11.2,123.1,11.6,122.5,11.6,121.9,11.9] },
      { id: 'mindoro', name: 'Mindoro', emerge: [50, 25], label: [121.1, 13],
        v: [120.3,13.5,120.8,12.7,121.3,12.2,121.5,13.1,121.2,13.4] },
      { id: 'sumba', name: 'Sumba', emerge: [30, 10], label: [120, -9.8],
        v: [119,-9.6,120.3,-10.3,120.7,-10.2,120.8,-10,119.9,-9.4] },
      { id: 'edgeoya', name: 'Edgeøya', label: [22.5, 77.9],
        v: [22.9,78.5,20.8,78.3,20.7,77.7,22.5,77.4,24.7,77.9] },
      { id: 'buru', name: 'Buru', emerge: [30, 10], label: [126.8, -3.4],
        v: [126,-3.2,126.2,-3.6,126.9,-3.8,127.2,-3.5,127,-3.1] },
    ],
    scotland: [
      { id: 'scotland', name: 'Scotland', group: 'great_britain', label: [-4.3, 57],
        v: [-4.8,54.8,-1.7,55.4,-2.1,55.9,-3.1,56,-2,57.7,-4.1,57.6,-3,58.6,-5,58.6,-6.1,56.8,-5.6,55.3,-5,55.8] },
      { id: 'ireland_nw', name: 'Northwest Ireland', group: 'ireland', label: [-8, 54.4],
        v: [-9.2,52.8,-6,53.8,-5.7,54.6,-6.7,55.2,-7.6,55.1,-9.7,53.9,-9.2,52.9] },
    ],
    avalonia: [
      { id: 'avalonia', name: 'Avalonia', group: 'great_britain', label: [-1.6, 52.3],
        v: [
          -1.7,55.4,-4.8,54.8,-3.6,54.6,-2.9,54,-3.1,53.4,-4.6,53.5,-4.8,52.8,-4.2,52.3,-5.3,52,-5,51.6,-3.4,51.4,
          -5.8,50.2,-5.2,50,-4.5,50.3,-3.6,50.2,-3,50.7,-2.5,50.5,0.6,50.8,1.4,51.3,1.1,51.8,1.7,52.7,0.5,52.9,
        ] },
      { id: 'ireland_se', name: 'Southeast Ireland', group: 'ireland', label: [-7.6, 52.7],
        v: [-6,53.8,-9.2,52.8,-10,51.8,-8.6,51.7,-6.8,52.3] },
    ],
    west_europe: [
      { id: 'west_europe', name: 'Armorica', group: 'europe', label: [6.5, 47.5],
        v: [
          29.8,45.2,26.8,46.3,24.5,47.8,22.6,49.2,19.8,50.4,17.5,52,15,53.2,14.6,53.9,14.1,53.8,12.5,54.5,10.9,54,11,54.4,
          9.9,54.6,9.7,55.5,10.9,56.5,10.3,56.9,10.6,57.7,8.5,57.1,8.1,55.5,8.8,54,8.1,53.5,7.1,53.7,4.7,53.1,3.8,51.6,
          1.6,50.9,1.3,50.1,-1,49.3,-1.9,49.8,-1.6,48.6,-4.6,48.7,-4.5,48,-3,47.6,-1.2,46,-1.4,44,-1.5,43.8,-1.4,42.8,
          3.1,42.4,3.1,43.1,4.6,43.4,6.5,43.1,8.9,44.4,10.2,43.9,10.5,42.9,12.1,41.7,15.4,40,16.1,39,15.7,37.9,16.1,38,
          17.1,38.9,17.2,39.4,16.4,39.8,16.9,40.4,18.3,39.8,18.5,40.2,15.9,41.5,15.9,42,15.1,42,12.6,44.1,12.3,45.4,
          13.1,45.7,13.9,45.6,14,44.8,14.3,45.2,14.9,45.1,16,43.5,19.5,41.7,19.4,40.3,21.1,38.3,21.7,36.8,23.2,36.4,
          22.8,37.3,23.4,37.4,23.1,37.9,24,37.7,24,38.2,23,39,23.4,39.2,22.6,40.3,22.8,40.5,23.9,40,24.4,40.1,23.7,40.7,
          24.9,40.9,26.1,40.8,26.4,40.2,27.6,41,28.8,41.1,27.7,42.6,28.8,44.9,29.6,45,
        ] },
      { id: 'sardinia', name: 'Sardinia', label: [9, 40.3],
        v: [8.8,38.9,9.7,39.2,9.8,40.5,9.2,41.2,8.2,41,8.4,39.2] },
      { id: 'sicily', name: 'Sicily', label: [14.5, 37.5],
        v: [12.4,37.6,14.3,37,15.1,36.6,15.3,37.1,15.2,37.4,15.5,38.2,13.7,38,12.6,38.1] },
      { id: 'crete', name: 'Crete', label: [24.7, 35.1],
        v: [23.5,35.3,24.7,34.9,26.2,35,26.3,35.3,24.2,35.4,23.7,35.7] },
      { id: 'zealand', name: 'Zealand', label: [11.8, 55.5],
        v: [12.4,56.1,10.9,55.8,11,55.4,12.1,54.8,12.7,55.6] },
      { id: 'corsica', name: 'Corsica', label: [9.1, 42.3],
        v: [9.4,43,8.7,42.6,8.5,42.3,8.8,41.6,9.2,41.4,9.6,42.2] },
    ],
    iberia: [
      { id: 'iberia', name: 'Iberia', group: 'europe', label: [-3.8, 40.2],
        v: [
          3.1,42.4,-1,43.4,-1.5,43.8,-1.9,43.4,-8,43.7,-9.4,43,-8.8,40.8,-9.5,38.7,-8.8,38.3,-8.9,36.9,-6.5,36.9,-5.4,35.9,
          -4.4,36.7,-2.1,36.7,-0.7,37.6,0.1,38.7,-0.3,39.3,0.8,41,2.1,41.2,3,41.9,
        ] },
    ],
    siberia: [
      { id: 'siberia', name: 'Siberia', group: 'asia', label: [104, 63],
        v: [
          141.5,58.6,142.1,59.9,141,60.5,138.1,63.6,136.9,65.7,135.9,66.5,134.7,69.1,135.1,70,134.3,71,133.8,71.4,
          132.3,71.8,131.3,70.8,128.5,72,128.6,73,127,73.6,123.3,73.7,123.2,73,119,73.1,118.8,73.6,115.6,73.8,113.5,73.3,
          113,74,112.1,73.8,109.4,74.2,113.9,75.3,114.1,75.8,111.1,76.7,107.2,76.5,104.4,77.7,100.8,76.4,87.2,75.1,86,74.5,
          86.8,73.9,82.5,73.7,81.7,71.6,81.3,71,82.2,68.8,81.9,67.8,83.8,64.1,83.8,62.8,84.9,61.3,85.2,58.9,86.1,56.7,
          86.2,54.2,86.7,52.7,86.7,51.9,87.5,51,89.8,50,91,50.2,92.1,50.2,93,50.4,95.1,50.3,96.6,50.7,98,50.9,100.9,50.8,
          103.2,50.4,104.6,50.3,105.5,50.1,107.7,50.4,112,50.1,115,50.2,116.2,50.3,120.8,52.3,121.9,52.4,122.9,52.8,
          126.4,53.1,127.4,53.4,128.5,53.3,131.2,53.5,132.3,53.7,133.1,54.2,134.8,54.4,135.4,54.9,
        ] },
      { id: 'severnaya_zemlya', name: 'Severnaya Zemlya', label: [96.7, 79.7],
        v: [91.2,80.3,95,79,97.8,78.8,99.9,78.9,100.2,79.8,95.9,81.3] },
      { id: 'bolshevik', name: 'Bolshevik Island', label: [102.7, 78.6],
        v: [102.1,79.3,101.3,79.2,99.4,77.9,105.1,78.3,105.4,78.7] },
    ],
    kolyma: [
      { id: 'kolyma', name: 'Kolyma', group: 'asia', emerge: [170, 125], origin: [137.5, 64.5], label: [155, 66],
        v: [
          133.8,71.4,132.5,70.9,133.3,69.9,133.1,69,134.5,66.3,135.6,65.5,136.9,63.4,140,60.2,140.9,59.7,141.5,58.6,
          142.2,59,148.5,59.2,149.8,59.7,151.3,59.5,151.3,58.8,155,59.1,154.2,59.8,156.7,61.4,159.3,61.8,160.1,60.5,
          162.7,61.6,163.3,62.5,164.5,62.6,163.7,61.1,158.4,58.1,156.8,57.8,155.9,56.8,155.4,55.4,156.8,51,158.2,51.9,
          158.5,53,160,53.2,160.4,54.3,162.1,54.9,162.1,56.1,163.1,56.2,163.2,57.6,162.1,57.8,162,58.2,163.5,59.9,
          164.9,59.7,165.8,60.2,166.3,59.8,168.9,60.6,170.3,59.9,173.7,61.7,177.4,62.5,179.2,62.3,179.4,63,177.4,64.6,
          178.7,64.5,179.9,65,180.1,65.9,181.3,66.1,181.6,65.4,183.8,65.4,184,64.9,187,64.3,187.5,65.4,190.1,66,188.1,66.9,
          185.4,67.1,185.7,66.3,185.1,67.2,175.7,69.9,170.5,70.1,170.8,69,169.6,68.7,167.8,69.6,160.9,69.4,159.7,69.7,
          159,70.9,153,70.8,149.5,72.2,140.5,72.8,139.1,72.4,139.9,71.5,133.9,71.4,
        ] },
      { id: 'sakhalin', name: 'Sakhalin', emerge: [140, 100], label: [143.2, 49.9],
        v: [
          142.7,54.4,142.2,54.2,142.6,53.8,141.7,53.3,141.6,51.9,142.2,51,142.1,46,142.7,46.7,143.5,46.1,143.5,46.8,
          142.6,47.9,143.2,49.3,144.7,49,143.2,51.8,
        ] },
      { id: 'kotelny', name: 'Kotelny Island', emerge: [170, 125], label: [141, 75.4],
        v: [139,74.6,144.3,74.8,145.1,75.6,141.5,76.1,137.5,75.9,137,75.3] },
      { id: 'new_siberia', name: 'New Siberia Island', emerge: [170, 125], label: [148.5, 75],
        v: [146.4,75.5,146.1,75.2,148,74.8,149.6,74.7,150.7,75.1] },
      { id: 'lyakhovsky', name: 'Lyakhovsky Islands', emerge: [170, 125], label: [141.8, 73.6],
        v: [139.9,73.4,142.1,73.2,143.6,73.2,143.5,73.5,142.1,73.9,140.8,73.8] },
    ],
    west_siberia: [
      { id: 'west_siberia', name: 'West Siberia', group: 'asia', emerge: [330, 295], label: [72, 62],
        v: [
          58.9,55.1,63,54.5,65,54.7,65.9,54.5,69,54.3,71,54.3,71.9,54.1,72.9,54.1,75.4,53.7,78.9,53.4,82,53.3,82.8,53.5,
          85.2,53.7,87.2,54.9,87.1,56.8,86.4,59,86.1,61.4,85.1,62.9,85.2,64.2,83.4,67.9,83.8,68.8,83.1,71,83.6,71.6,
          82.5,73.7,80.5,73.6,81.5,71.8,79.7,72.3,77.6,72.3,75.9,71.9,76.4,71.2,75.3,71.3,74.7,72.8,74.9,72.1,73.1,71.4,
          74.4,70.6,73.8,69.1,74.9,69,75.1,67.8,73.9,66.8,72.4,66.2,71.3,66.3,73.7,68.4,72.6,69,71.8,71.4,72.6,72.8,
          69.9,73,66.7,71,66.9,69.5,69.2,68.6,68.5,68.1,65.3,67.5,60.8,64.6,59.8,62.3,58.8,60,58.8,57.5,
        ] },
    ],
    kazakhstania: [
      { id: 'kazakhstania', name: 'Kazakhstania', group: 'asia', label: [72, 47.5],
        v: [
          59.8,55.1,59.8,54,59.6,53.3,59.9,52,59.7,51.3,60,50,59.7,49.4,59.6,47.9,60.5,46.4,61.1,44.8,62.6,44.2,63.8,43.5,
          64.8,43.2,69,41.1,70.6,40.8,72.8,39.5,73.9,39.6,74.2,39.6,76.5,40.5,79.1,41,79.8,41.3,83.1,41.6,85,42,87,41.9,
          89,42.1,89.8,42,93.3,40.8,95.1,39.5,95.9,40,96.5,40.6,96.5,41,96.1,42.1,95.3,43.3,93.5,44.6,91.4,46.4,90.1,47.1,
          88.6,48.6,88.4,50.1,88.1,50.5,88,51.6,87.6,52.1,87.7,52.7,87.2,54.3,87.2,54.9,84.8,54.3,82.6,54.1,82,53.9,79,54,
          75.6,54.3,73.1,54.7,72.1,54.7,71.1,54.9,69,54.9,66.1,55.1,65,55.3,63,55.1,
        ] },
    ],
    tarim: [
      { id: 'tarim', name: 'Tarim', group: 'asia', label: [83, 39.3],
        v: [
          95.1,39.5,93.7,41.2,90.2,42.6,89,42.7,87,42.5,84.9,42.6,82.9,42.2,79.6,41.9,78.9,41.6,76.2,41,73.8,40.1,
          73.1,39.4,74.3,37.5,75.3,37,75.9,37.2,77.2,36.4,78.2,36,82.3,35.5,85.4,35.6,87.7,35.7,89.3,36,92,35.7,92.7,35.5,
          93.6,37.8,95,39.4,
        ] },
    ],
    amuria: [
      { id: 'amuria', name: 'Amuria', group: 'asia', label: [104, 46.5],
        v: [
          88,51.6,87.1,50.5,87.5,50,87.8,48.4,89.4,46.7,90.8,46,92.9,44.2,94.6,42.9,95.4,41.9,95.8,40.8,96.5,40.6,
          97.3,41.3,97.9,41.3,100,41.9,104.2,41.7,109.2,41.9,112.5,42.1,115,41.9,116,42.2,117.5,42.1,119.8,42.4,122,42.5,
          124.1,42.2,125.9,41.7,127.5,41.6,129.4,41.8,130.1,42.1,130.5,42.2,132.3,43.3,133.5,42.8,134.9,43.4,138.2,46.3,
          140.1,48.4,141.3,53.1,139.9,54.2,138.8,54.3,138.2,53.8,137.2,54,136.7,54.6,135.1,54.7,135.4,54.9,134.5,54.9,
          132.7,54.7,131.7,54.3,131.1,54.1,128.5,53.9,127.3,54,126.1,53.7,122.7,53.3,121.6,53,120.3,52.9,115.8,50.9,
          115,50.8,112,50.7,107.7,51,105.5,50.7,104.7,50.9,103.4,51,101.1,51.4,98,51.5,96.3,51.3,95,50.9,92.9,51,91.9,50.7,
          90.9,50.8,90.2,50.6,88.2,51.4,
        ] },
    ],
    north_china: [
      { id: 'north_china', name: 'North China', group: 'asia', label: [113, 37],
        v: [
          130.5,42.2,129.9,42.7,129.2,42.4,127.5,42.2,126.1,42.3,124.3,42.8,122,43.1,119.7,43,117.5,42.7,115.9,42.8,
          115,42.5,112.5,42.7,109.1,42.5,104.2,42.3,100,42.5,97.7,41.9,96.7,41.7,95.3,40.4,94.4,39.8,92.9,38,92.7,35.5,
          93.2,35.4,94.8,35.2,96.1,34.8,98.3,34.2,100.5,33.4,101.9,33.2,102.2,33.1,103,33.3,104.2,33.6,105.4,33.4,
          106.7,33.6,108.9,33.4,111.9,32.9,112.5,32.5,113.4,32.3,114.9,31.7,117.7,31.6,119.7,34.6,119.2,34.9,121.1,36.7,
          122.5,36.9,122.4,37.5,120.8,37.9,119.7,37.2,117.5,38.7,118,39.2,119,39.3,121.6,40.9,122.2,40.4,121.1,38.9,
          124.3,39.9,125.3,39.6,124.7,38.1,125.3,37.7,126.2,37.7,126.9,36.9,126.1,36.7,126.5,34.4,129.1,35.1,129.5,36.8,
          128.3,38.6,127.4,39.2,127.5,39.8,129.7,40.9,130,41.9,
        ] },
    ],
    south_china: [
      { id: 'south_china', name: 'South China', group: 'asia', label: [111, 27],
        v: [
          119.7,34.6,117.3,32,115.1,32.3,113.6,32.9,112.8,33,112.1,33.5,109.1,34,106.8,34.2,105.4,34,104.2,34.2,102.7,33.9,
          102.2,33.1,102.3,33,102.5,32.3,102.5,31.5,102.8,31.1,101,28.7,100,27.9,100.1,27.8,98.6,28,98.9,26,98.9,25.1,
          100.4,24.7,103,22.4,105.3,20.8,106.6,20.6,106.7,20.7,108.5,21.7,109.9,21.4,109.9,20.3,110.4,20.3,110.8,21.4,
          113.2,22.1,113.8,22.5,114.2,22.2,115.9,22.8,118.7,24.5,121.1,28.1,121.7,28.2,122.1,29.8,121.3,30.7,121.9,30.9,
          121.9,31.7,120.2,34.4,
        ] },
      { id: 'hainan', name: 'Hainan', label: [109.5, 19.1],
        v: [110.8,20.1,109.1,19.8,108.6,19.4,108.7,18.5,109.5,18.2,110.3,18.7,111,19.7] },
      { id: 'taiwan', name: 'Taiwan', label: [120.7, 23.5],
        v: [121.5,25.3,120.7,24.5,120.1,23.6,120.2,22.8,120.7,22,122,25] },
      { id: 'palawan', name: 'Palawan', label: [119.4, 10.7],
        v: [119.5,11.4,119,10.4,117.2,8.4,118.5,9.3,119.7,10.6] },
    ],
    japan: [
      { id: 'japan', name: 'Japan', emerge: [320, 250], label: [139.1, 36.2],
        v: [
          141.4,41.4,140.3,41.2,139.9,40.6,140.1,39.4,139.4,38.2,137.4,36.8,136.7,37.3,135.7,35.5,134.6,35.7,132.6,35.4,
          130.4,33.6,129.4,33.3,129.8,32.6,130.4,32.3,130.2,31.4,130.7,31,131.3,31.5,132,33.1,131,33.9,135.1,34.6,
          135.1,33.8,135.8,33.5,137.2,34.6,139,34.7,140.3,35.1,140.8,35.8,141,38.2,141.9,39.2,
        ] },
      { id: 'hokkaido', name: 'Hokkaido', emerge: [320, 250], label: [142.9, 43.5],
        v: [
          140,41.6,141.1,41.6,141.6,42.7,143.2,42,144.1,43,145.5,43.3,145.3,44.4,144.6,44,143.9,44.2,142,45.6,141.4,43.4,
          140.3,43.3,139.8,42.6,
        ] },
      { id: 'shikoku', name: 'Shikoku', emerge: [320, 250], label: [134.1, 33.8],
        v: [132.4,33,133,32.7,133.8,33.5,134.2,33.2,134.8,33.8,134.6,34.1,133.9,34.4,133.5,33.9,132.9,34.1] },
    ],
    indochina: [
      { id: 'indochina', name: 'Indochina', group: 'asia', label: [104.5, 16],
        v: [
          106.6,20.6,105.6,21.3,103.5,22.8,100.8,25.3,98.9,25.1,99.2,21.6,99.5,20.4,99.6,17.8,100,16.6,99.9,16,100.5,13.4,
          101,13.4,100.8,12.6,102.6,12.2,103.5,10.6,105.1,9.9,104.8,9.2,105.2,8.6,109.2,11.7,109.3,13.4,108.9,15.3,
          107.4,16.7,105.7,19.1,105.9,19.8,
        ] },
      { id: 'borneo', name: 'Borneo', label: [113.8, 0],
        v: [
          119.2,5.4,117.7,6,117.1,6.9,116.7,6.9,113,3.1,111.4,2.7,111.2,1.9,110.4,1.7,109.7,2,109.1,1.3,109,0.4,109.1,-0.5,
          110.1,-1.6,110.2,-2.9,111.7,-3,112.1,-3.5,113.3,-3.1,114.5,-3.5,114.9,-4.1,116,-3.7,116.1,-4,116.6,-1.5,
          117.5,-0.8,117.8,0.8,119,0.9,117.9,1.8,118,2.3,117.3,3.2,117.9,4.1,118.6,4.5,118.4,5,119.1,5,
        ] },
    ],
    sibumasu: [
      { id: 'sibumasu', name: 'Sibumasu', group: 'asia', label: [97, 20.5],
        v: [
          100.5,13.4,100.5,16,100.6,16.7,100.2,17.9,100.2,20.4,99.8,21.6,99.5,26,98.6,28,96.3,28.3,95.8,27.3,95.3,26.6,
          94.6,26,93.6,24.5,93.4,23.8,91.8,22.2,92.4,20.7,93.7,19.7,93.5,19.4,94.3,18.2,94.5,17.3,94.2,16,95.4,15.7,
          97.2,16.9,97.6,16.1,98.8,11.4,98.2,8.4,98.3,7.8,98.5,8.4,100.1,6.5,100.2,5.3,101.4,2.8,103.5,1.2,104.2,1.3,
          103.5,2.8,103.4,4.9,103,5.5,101.6,6.7,101,6.9,100.5,7.4,99.9,9.2,99.2,9.2,100.1,13.4,
        ] },
      { id: 'sumatra', name: 'Sumatra', label: [101.8, -0.3],
        v: [
          95.3,5.5,95.4,5,98.6,1.8,99.3,0.2,100.1,-0.7,102.6,-4.2,104.7,-5.9,105.8,-5.9,106.1,-3.1,105.6,-2.4,104.9,-2.3,
          104.4,-1.1,103.4,-0.7,103.8,0.1,101.7,2.1,100.6,2.1,97.5,5.2,
        ] },
      { id: 'java', name: 'Java', label: [111.2, -7.4],
        v: [
          105.4,-6.9,106.3,-6.9,106.5,-7.4,111.5,-8.3,113.5,-8.3,114.6,-8.8,115.7,-8.4,114.5,-7.8,113,-7.6,112.6,-6.9,
          110.8,-6.5,110.5,-6.9,108.6,-6.8,108.5,-6.4,107.3,-6,106.1,-5.9,
        ] },
    ],
    tibet: [
      { id: 'tibet', name: 'Tibet', group: 'asia', label: [86, 32.5],
        v: [
          96.3,28.3,99.9,27.2,100.5,27.4,101.6,28.4,103.4,30.9,103.2,31.6,103.2,32.4,102.9,33.4,102.1,33.8,100.7,34,
          98.6,34.8,96.3,35.3,95,35.8,93.4,35.9,92.1,36.3,89.3,36.6,87.6,36.3,85.3,36.2,82.4,36.1,78.4,36.6,77.6,36.9,
          76.1,37.8,74.9,37.6,74.1,36.9,74.1,35.5,74.5,35.6,75.3,34.9,77.4,34.1,78.9,32.5,80.7,31,83,30.1,84,29.4,
          85.3,29.4,86.5,29.1,87.7,29.3,89.6,29.3,90.9,29.4,93,29.2,94.4,29.2,95.2,29.5,95.8,29,96.5,28.7,
        ] },
    ],
    iran: [
      { id: 'iran', name: 'Iran', group: 'asia', label: [57, 32],
        v: [
          46.4,42.5,45.5,41.1,44.7,40.3,44.4,39.2,44,37.9,44.6,36.8,45.6,35.8,46.7,33.9,47.6,32.8,48.4,31.3,48.6,29.9,
          48.9,30.3,50.1,30.1,51.5,27.9,53.5,26.8,54.7,26.5,56.5,27.1,57,27,57.4,25.7,61.5,25.1,66.4,25.4,66.6,26.2,
          66.4,27,66.9,28,67.1,29.8,67.9,30.8,69.2,31.5,69.7,32.7,71.2,34.2,70.9,35.5,69.2,36.2,68.4,36.3,67.7,36.1,
          66.2,36.1,65.1,35.9,62.6,35.9,62.3,36.2,61.2,36.7,58.9,38.1,58,38.3,56.1,37.9,53.8,37.6,53.8,37,50.8,36.9,
          49.2,37.6,48.9,38.8,49.6,40.2,50.4,40.3,48.6,41.8,
        ] },
    ],
    anatolia: [
      { id: 'anatolia', name: 'Anatolia', group: 'asia', label: [34, 39],
        v: [
          44.6,36.8,44.8,37.8,45.1,39,45.4,40,46.3,40.9,46.4,42.5,46.1,42.6,43.6,43.3,40.3,43.1,41.5,42.6,41.7,42,40.4,41,
          38.3,40.9,35.2,42,33.5,42,31.1,41.1,29.2,41.2,28.8,40.5,27.3,40.4,26.2,39.5,26.8,39,26.3,38.2,27.6,36.7,
          28.7,36.7,29.7,36.1,30.6,36.7,31.7,36.6,32.5,36.1,34,36.2,34.7,36.8,36.2,36.7,36.6,37.3,37.7,37.8,39.5,38.1,
          40.5,38.4,42.5,38.1,43.2,37.5,44.2,37.3,
        ] },
      { id: 'cyprus', name: 'Cyprus', label: [33.1, 35],
        v: [32.3,35.1,33,34.6,34,35,33.9,35.2,34.6,35.7] },
    ],
    africa: [
      { id: 'africa', name: 'Africa', label: [21, 8],
        v: [
          32.2,31.3,32,30.9,31.7,31.4,30.1,31.5,28.9,30.9,26.5,31.6,25.2,31.6,21.5,32.8,20.1,32.2,20.1,31,19.1,30.3,
          15.7,31.4,15.2,32.3,11.5,33.1,10.3,33.8,10.1,34.3,10.8,34.8,10.6,36.4,11,37.1,10.2,36.7,10.2,37.2,9.5,37.4,
          7.7,36.9,6.3,37.1,5.3,36.7,1.5,36.6,-2.2,35.2,-5.9,35.8,-6.9,34.1,-9.3,32.6,-9.8,31.2,-9.6,29.9,-11.7,28.1,
          -12.6,28,-14.4,26.3,-15.1,24.5,-16,23.7,-17,21.9,-17.1,21,-16.3,20.1,-16.1,18.1,-16.5,16.1,-17.6,14.7,-16.7,13.6,
          -16.6,12.2,-14.8,10.9,-13.2,8.9,-12.9,7.8,-8,4.4,-4.6,5.2,-2,4.7,1.9,6.1,4.3,6.3,5.9,4.3,8.5,4.8,9.4,3.7,9.8,3.1,
          8.8,-1.1,11.9,-5,13.2,-8.6,12.9,-9.2,13.7,-10.7,13.6,-12,12.5,-13.5,11.8,-15.8,11.8,-18.1,14.3,-22.1,15.2,-27.1,
          18.2,-31.7,17.9,-32.6,18.4,-34.1,19.6,-34.8,22.6,-33.9,25.8,-33.9,28.2,-32.8,30.1,-31.1,32.5,-28.3,32.9,-26.2,
          32.6,-25.7,35.5,-24.1,35.6,-22.1,34.7,-20.5,34.8,-19.8,37.4,-17.6,40.1,-16.1,40.8,-14.7,40.5,-10.8,39.2,-8.5,
          39.4,-6.8,38.8,-6.5,38.7,-5.9,39.2,-4.7,40.3,-2.6,41.6,-1.7,43.1,0.3,46.6,2.9,47.7,4.2,49.5,6.8,51,10.6,51.1,12,
          44.6,10.4,44.1,10.4,42.7,11.7,43.3,12,43.3,12.4,39.3,15.9,38.4,18,37.5,18.6,36.9,22,35.5,23.1,35.7,23.9,
          34.1,26.1,32.3,29.8,32.4,29.9,32.7,30.6,
        ] },
      { id: 'mauritius', name: 'Mauritius', emerge: [8, 6.5], label: [57.6, -20.3],
        v: [57.3,-20.3,57.4,-20.5,57.7,-20.5,57.8,-20.3,57.7,-20,57.5,-20] },
    ],
    madagascar: [
      { id: 'madagascar', name: 'Madagascar', label: [46.8, -18.1],
        v: [
          49.2,-12,48.3,-13.8,47.9,-13.7,48,-14.1,47.7,-14.6,46.3,-15.8,44.4,-16.2,44,-17.4,44.5,-19.4,43.9,-21.2,
          43.4,-21.3,43.3,-22.8,44,-25,45.4,-25.6,47.1,-24.9,49.8,-16.9,49.7,-15.7,49.9,-15.4,50.2,-16,50.4,-15.7,
          50.1,-13.6,
        ] },
    ],
    india: [
      { id: 'india', name: 'India', label: [78.6, 21],
        v: [
          66.4,25.4,67.4,23.9,69.3,22.8,69.6,22.5,69.2,22.1,70.5,20.9,71.2,20.8,72.6,21.4,73.5,16,74.4,14.6,74.9,12.7,
          76.6,8.9,77.5,8,78.3,8.9,79.2,9.2,78.9,9.5,79.3,10.3,79.9,10.4,80.3,15.9,82.2,16.6,82.2,17,85.1,19.5,86.5,20.2,
          87,20.7,87,21.5,88.9,21.7,89,22.1,90.3,21.8,90.5,22.8,91.4,22.8,91.8,22.2,92.9,22.3,93.9,23.2,94.3,24.1,
          95.4,24.8,97.2,28.2,97.3,29.5,97,31.3,97.5,33,97.1,33.8,96.8,35.6,97,36.5,96.9,38.3,96.3,39,94,40.3,93,41.4,
          92,41.8,90.8,41.7,89.6,41.9,88,43.2,85.8,43.1,85,43.7,82,44.5,81.1,44.2,78.2,43.9,75.6,43.1,74,42.2,73.5,41.5,
          72.6,41,71.5,39.2,70.2,37.4,69.5,35.8,67.8,34,67.8,32.6,67.4,30.7,66,29.3,65.8,28.7,65.9,26.4,66.2,26,
        ] },
      { id: 'sri_lanka', name: 'Sri Lanka', label: [80.8, 7.3],
        v: [80.1,9.8,79.7,8.2,79.9,6.8,80.3,6,81.6,6.5,81.8,7.5,80.8,9.3] },
    ],
    arabia: [
      { id: 'arabia', name: 'Arabia', label: [45.5, 23.5],
        v: [
          36.2,36.7,35.8,36.3,36.1,35.8,36,34.6,34.6,31.5,33.8,31,33,31,32.2,31.3,32,30.6,32.4,29.9,33.9,27.6,34.9,29.5,
          34.6,28.1,35.1,28.1,37.5,24.3,38.5,23.7,39.1,22.6,39.1,21.3,40.9,19.5,42.6,16.8,42.6,15.2,43.5,12.6,44.2,12.6,
          48.7,14,49.6,14.7,52.2,15.6,52.4,16.4,55.3,17.2,55.3,17.6,56.3,17.9,56.6,18.6,57.7,18.9,57.8,20.2,58.5,20.4,
          59.8,22.3,58.7,23.6,56.8,24.2,56.4,24.9,56.4,26.4,54,24.1,51.8,24,51.4,24.6,51.6,25.8,51,26,50.8,24.8,50.1,25.9,
          50.2,26.7,48.8,27.7,48,30,48.6,29.9,49.7,30.4,49.9,31,50.6,31.8,51.2,32.7,51,34.1,50.6,35,49.9,35.7,49,36.2,
          47.3,37.6,47,38.2,45.9,38.8,44.5,39.9,42.5,40.4,41.3,40.1,40,40.3,38.9,40.1,37,39.1,36.4,37.9,
        ] },
    ],
    australia: [
      { id: 'australia', name: 'Australia', label: [134, -25],
        v: [
          142.5,-10.7,141.7,-12.4,141.7,-15,141.3,-16.4,140.9,-17.4,140.2,-17.7,135.5,-15,136,-13.3,137,-12.4,136.5,-11.9,
          135.3,-12.2,132.4,-11.1,131.8,-11.3,132.6,-11.6,132.6,-12.1,130.6,-12.5,129.4,-14.4,129.6,-15,128.4,-14.9,
          127.1,-13.8,125.7,-14.2,124.4,-15.6,124.3,-16.3,123.8,-16.1,123.5,-16.6,123.9,-17.1,123.4,-17.3,123,-16.4,
          122.3,-17.3,122.2,-18.2,120.9,-19.7,116.7,-20.7,114.6,-21.8,114.2,-22.5,114.1,-21.8,113.4,-24.4,114.2,-26.3,
          113.4,-25.6,113.8,-26.5,113.3,-26.1,115,-29.5,115.7,-31.6,115.7,-33.3,115,-33.6,115,-34.2,116.6,-35,118,-35.1,
          119.9,-34,123.7,-33.9,124.2,-33,126.1,-32.2,131.3,-31.5,134.3,-32.6,135.2,-34.5,136,-34.9,137.8,-32.9,
          137.9,-33.6,136.8,-35.3,137.7,-35.1,138.2,-34.4,138.4,-35.1,138.1,-35.6,139.6,-36.1,140.6,-38,143.6,-38.8,
          145,-37.9,144.9,-38.4,146.3,-39,148.3,-37.8,150,-37.4,150.3,-35.7,153.1,-30.9,153.6,-28.1,152.9,-25.3,
          150.9,-23.5,150.7,-22.4,150.1,-22.1,149.7,-22.3,148.8,-20.4,146.4,-19,145.4,-15,144.6,-14.2,143.9,-14.5,
        ] },
      { id: 'new_guinea', name: 'New Guinea', emerge: [30, 5], origin: [140.5, -8.6], label: [141.6, -5.9],
        v: [
          130.5,-0.9,130.9,-1.4,131.8,-1.6,132.2,-2.2,133.7,-2.2,133.8,-2.5,132,-2.8,132.8,-3.3,133,-4.1,133.7,-3.5,
          135.2,-4.5,137.9,-5.4,138.7,-7.3,138,-7.6,137.6,-8.4,139.1,-8.1,140.1,-8.3,141,-9.1,142.6,-9.3,143.4,-9,
          143.3,-8.2,144.7,-7.6,146,-8.1,147.9,-10.1,150.7,-10.6,150.8,-10.3,149.3,-9.5,149.3,-9.1,148.7,-9.1,147.2,-7.4,
          147,-6.7,147.9,-6.6,147.6,-6.1,146,-5.5,145.8,-4.9,144.6,-3.9,138.3,-1.7,137.4,-1.7,136.3,-2.3,135.5,-3.4,
          134.4,-2.8,134,-0.8,132.4,-0.4,
        ] },
      { id: 'tasmania', name: 'Tasmania', label: [146.7, -42.1],
        v: [144.7,-40.7,146,-43.5,146.9,-43.6,147.6,-42.9,147.9,-43.2,148.3,-40.9,146.4,-41.1] },
      { id: 'new_britain', name: 'New Britain', emerge: [30, 8], label: [150.2, -5.9],
        v: [
          152.3,-4.3,151.5,-4.2,151.6,-4.8,150.8,-5.5,150.2,-5.5,150.1,-5,149.8,-5.5,148.4,-5.4,148.3,-5.7,150.2,-6.3,
          152,-5.5,
        ] },
      { id: 'timor', name: 'Timor', emerge: [8, 3], label: [124.3, -9.6],
        v: [127.3,-8.4,125.1,-8.7,124,-9.3,123.5,-10.2,124.4,-10.1,125.1,-9.4] },
      { id: 'new_ireland', name: 'New Ireland', emerge: [30, 8], label: [152.8, -4.1],
        v: [150.7,-2.7,152.4,-3.8,152.8,-4.8,153.1,-4.5,153,-4,152.2,-3.2,150.9,-2.5] },
      { id: 'bougainville', name: 'Bougainville', emerge: [30, 8], label: [155.5, -6.4],
        v: [154.5,-5.1,154.7,-5.9,155.2,-6.5,155.6,-6.9,155.9,-6.8,156,-6.5,154.8,-5.3,154.7,-5] },
      { id: 'fiji', name: 'Fiji', emerge: [30, 8], label: [178.2, -17.8],
        v: [177.4,-18.2,178.6,-18.2,178.7,-17.6,178.4,-17.3,177.7,-17.4,177.3,-17.7] },
      { id: 'guadalcanal', name: 'Guadalcanal', emerge: [30, 8], label: [159.9, -9.5],
        v: [159.7,-9.2,159.6,-9.6,159.8,-9.8,160.9,-9.9,160.4,-9.4] },
      { id: 'malaita', name: 'Malaita', emerge: [30, 8], label: [161, -8.8],
        v: [160.6,-8.3,160.8,-8.9,161.5,-9.8,161.7,-9.6,160.9,-8.3] },
      { id: 'santa_isabel', name: 'Santa Isabel', emerge: [30, 8], label: [159.2, -8],
        v: [158.2,-7.4,159.1,-8.1,159.9,-8.5,159.6,-8,158.4,-7.3] },
    ],
    new_zealand: [
      { id: 'new_zealand', name: 'New Zealand', label: [169.2, -45.2],
        v: [
          166.7,-46.2,169.3,-46.6,170.6,-45.9,171.5,-44.2,173.1,-43.9,172.7,-43.4,174.2,-41.8,174,-40.9,173.2,-41.3,
          172.8,-40.5,172.1,-41,170.5,-43,168.3,-44.1,167,-45.1,
        ] },
      { id: 'north_island', name: 'North Island', label: [175.9, -38.7],
        v: [
          173,-34.5,172.6,-34.5,174.7,-37.4,174.6,-38.8,173.9,-39.1,173.8,-39.5,174.9,-39.9,175.2,-40.5,174.7,-41.3,
          175.2,-41.7,176,-41.3,177.2,-39.1,178,-39.2,178.5,-37.7,176.8,-37.9,176,-37.6,175.8,-36.8,175.4,-36.5,
          175.3,-37.2,174.3,-35.3,
        ] },
      { id: 'new_caledonia', name: 'New Caledonia', label: [165.4, -21.2],
        v: [164,-20.1,164.2,-20.4,165.5,-21.7,166.7,-22.4,167.1,-22.2,165,-20.5,164.5,-20.1] },
    ],
    antarctica: [
      { id: 'antarctica', name: 'Antarctica', label: [75, -79],
        v: [
          -63,-64.6,-67.3,-66.9,-68.5,-69.7,-67.1,-72,-68,-72.8,-76.2,-74,-80.3,-73.1,-81.5,-73.9,-88.4,-73,-89.2,-72.6,
          -90.1,-73.3,-92.4,-73.2,-96.3,-73.6,-99.1,-72.9,-103.7,-72.6,-102.5,-74.1,-100.1,-74.9,-100.6,-75.3,-104.9,-74.9,
          -107.6,-75.2,-111.3,-74.4,-112.3,-74.7,-113.9,-73.7,-119.7,-74.5,-135.2,-74.3,-144.3,-75.5,-144.9,-75.2,
          -146.2,-75.4,-146.1,-76.5,-151.3,-77.4,-152.9,-77.5,-153.7,-77.1,-157,-77.3,-158.4,-76.9,-155.3,-79.1,
          -149.5,-79.4,-146.8,-79.9,-150.6,-81.3,-152.1,-81,-156.8,-81.1,-152.9,-82,-153.6,-83.7,-142.9,-84.6,-148.5,-85.6,
          -155.2,-85.1,-158.1,-85.4,-161.9,-85.1,-170,-83.9,-174.4,-84.5,-179.1,-84.1,-179.9,-84.7,176,-84.2,173.2,-84.4,
          159.8,-80.9,161.8,-79.2,167,-78.8,163.5,-77.1,164.2,-75.5,166.1,-74.4,169.3,-73.7,171.1,-72.1,170.5,-71.4,
          167.3,-70.8,161.6,-70.6,159.2,-69.6,154.3,-68.6,152.5,-68.9,148.8,-68.4,146.6,-67.9,145.5,-66.9,136.6,-66.8,
          135.1,-65.3,134.8,-66.2,128.8,-66.8,123.2,-66.5,119.8,-67.3,115.6,-66.7,113.6,-65.9,110.2,-66.7,106.2,-66.9,
          102.8,-65.6,99.7,-67.2,89.7,-67.2,88,-66.2,86.8,-67.2,82.8,-67.2,79.1,-68.3,77.6,-69.5,73.9,-69.9,69.9,-72.3,
          67.9,-71.9,69.1,-70.7,67.9,-70.7,67.8,-70.3,69.7,-69.2,68.9,-67.9,64.1,-67.4,61.4,-68,56.4,-66,53.6,-65.9,
          42,-68.6,38.6,-69.8,33.9,-68.5,32,-69.7,27.1,-70.5,22.6,-70.7,21.5,-70.1,18.2,-69.9,15.1,-70.4,13.4,-70,
          10.8,-70.8,9.5,-70,7.7,-69.9,-0.2,-71.6,-0.7,-71.2,-5.5,-71.4,-6.9,-70.9,-7.4,-71.7,-10.3,-71.3,-11,-71.5,
          -16.1,-73.5,-15.7,-74.5,-17.5,-75.1,-28.9,-76.7,-35.8,-78.3,-35.6,-79.5,-29.7,-79.3,-28.5,-80.3,-40.8,-81.4,
          -42.8,-82.1,-49.8,-81.7,-58.2,-83.2,-63.3,-81.7,-75.4,-80.3,-78,-79.2,-77.9,-78.4,-73.7,-77.9,-77.2,-76.7,
          -70.6,-76.6,-60.8,-73.7,-61.8,-70.7,-65.5,-67.6,-63.7,-66.5,-62.1,-66.2,-62.6,-65.5,-62,-64.8,-57.6,-63.9,
          -57.8,-63.3,
        ] },
      { id: 'alexander_island', name: 'Alexander Island', label: [-70.6, -71.6],
        v: [
          -70.3,-68.9,-71.7,-69.5,-72.1,-71.2,-73.2,-71.2,-75,-71.7,-74.2,-72.4,-71.9,-72.1,-72.4,-72.5,-71.1,-72.5,
          -68.8,-72.2,-68.5,-71,
        ] },
      { id: 'berkner_island', name: 'Berkner Island', label: [-47.4, -79.7],
        v: [-46.7,-77.8,-48.7,-78,-51.9,-79.9,-54,-80.2,-52.9,-81,-50.5,-81,-43.3,-80,-43.9,-78.5] },
      { id: 'thurston_island', name: 'Thurston Island', label: [-100.5, -72.2],
        v: [-102.3,-71.9,-101.8,-72.3,-100.8,-72.5,-96.2,-72.5,-96.8,-72,-97.9,-72.1,-101.7,-71.7] },
      { id: 'kerguelen', name: 'Kerguelen', emerge: [34, 24], label: [69.4, -49.3],
        v: [70.5,-49.1,69.6,-48.9,68.9,-48.6,68.7,-49.8,70.3,-49.7] },
      { id: 'antarctic_isle_0', label: [-62.2, -80.7],
        v: [-60.6,-79.6,-61.9,-80.4,-66.3,-80.3,-64.5,-80.9,-60.2,-81] },
      { id: 'roosevelt_island', name: 'Roosevelt Island', label: [-161.1, -79.2],
        v: [-163.1,-78.2,-162.4,-79.3,-161.1,-79.6,-159.2,-79.5,-160.2,-78.7] },
    ],
  };
}
// </generated:outlines>
