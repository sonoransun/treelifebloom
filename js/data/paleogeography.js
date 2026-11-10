// Paleogeography — place names and event sites for the map and globe, positioned in the map frame
// of each moment: the oceans of the past, supercontinents and paleocontinents, large igneous
// provinces, impacts, mountain building, ocean gateways and land bridges, and the routes by which
// people (and a few famous animal groups) spread.
//
//   getOceanLabelsAt(timeMa) → [{ id, name, lon, lat, size: 1 | 2 | 3, opacity }]
//   getLandLabelsAt(timeMa)  → [{ id, name, subtitle?, lon, lat, size: 1 | 2 | 3, opacity }]
//   getFeaturesAt(timeMa)    → [{ id, type, kind?, name, lon, lat, radiusDeg, intensity, opacity,
//                                 phase, description, startMa, endMa, path?, ends? }]
//   getMigrationsAt(timeMa)  → [{ id, name, group, color, path, route, progress, opacity,
//                                 description, startMa, endMa, speciesIds? }]
//   paleoData                → the tables below and the generated tracks (read-only by
//                              convention), for tools and tests
//
// Every coordinate RETURNED is [lon, lat] in degrees in the map frame of that moment, ready to
// draw (no plateId on any item: nothing needs carrying again). Results are memoised per timeMa
// and frozen. NaN or negative times count as the present; nothing throws. Cost: ~15 µs per frame
// on average (a new timeMa every frame), under 1 ms at worst after the first call.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 1. WHAT THE ACCESSORS RETURN
// ─────────────────────────────────────────────────────────────────────────────────────────────
//   Ocean labels   size 3 = superocean, 2 = ocean, 1 = sea or strait. At most MAX_OCEANS at a
//                  time, never two within 12° of each other, always over open water while
//                  visible (checked against getPolygonsAtTime). opacity fades in and out.
//   Land labels    names that are NOT one polygon's own name: supercontinents, paleocontinents,
//                  terranes made of several blocks, and old names with a "future …" subtitle for a
//                  polygon whose old name is the better label. An item whose `id` (or name) equals
//                  a polygon's id (or name) stands in for that polygon's own label (the map painter
//                  then drops the polygon's). Always on land.
//   Features       type 'lip' (large igneous province, flood basalt), 'impact', 'orogeny'
//                  (mountain building), 'gateway' (an ocean gateway or land bridge; `kind`: opens |
//                  closes | bridge | floods | narrows | restricts | barrier | seaway) or 'other'
//                  (`kind`: ice sheet | rift | hot spot | super-eruption). At most MAX_FEATURES at
//                  a time. Features without `marine` sit on land whenever visible.
//                    intensity  0 → 1 → 0: how active the feature is now. It rises when the
//                               event starts, holds while it lasts and dies away afterwards.
//                               Impacts: 1 at the strike, then quickly down to a lasting scar.
//                    opacity    0..1 visibility (fades at the ends of the display window)
//                    phase      'active' while the event lasts, then 'waning';
//                               impacts: 'impact' for the first moments, then 'scar'
//                    path       mountain belts: the line of the range (map frame), ≥ 2 points;
//                               lon/lat is then a point on it (for the name)
//                    ends       gateways: the two shores, [[lon, lat], [lon, lat]]; lon/lat is
//                               their midpoint
//                    startMa, endMa  the event's own interval (an impact: its age ± error)
//   Migrations     path       the part of the route travelled by timeMa, [[lon, lat], …], long
//                             legs already broken into great-circle steps; the last point is the
//                             head. It is NOT to be cut again by progress.
//                  route      the whole route the same way (to draw what lies ahead faintly)
//                  progress   share of the route's length travelled, 0..1
//                  opacity    1 while under way and a few seconds after; then a route of our own
//                             species settles at SETTLED_OPACITY and stays to the present, any
//                             other route fades away
//                  group      'sapiens' | 'archaic' | 'fauna'; color: #rrggbb for that group
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 2. PLACES  (every position in the tables below)
// ─────────────────────────────────────────────────────────────────────────────────────────────
//   ['plate', lon, lat]   a PRESENT-DAY point on a plate of js/data/continents.js; it rides that
//                         plate back in time with plateToWorld() — exactly in the rigid-plate
//                         regime (0–540 Ma), approximately beyond (the plate's ancestors). A plate
//                         id also covers the blocks hanging off it ('eurasia' for a point in
//                         Siberia rides Siberia). Use this for anything on continental crust.
//   [lon, lat]            a fixed point on the map (the present-day sea floor, a sea crossing)
//   TRACK                 [[ma, lon, lat] | [ma, 'plate', lon, lat], …] oldest first: keyframes of
//                         a moving point. Each keyframe is evaluated at the current moment (a
//                         plate-tied one where its plate is now) and the point slides between the
//                         two keyframes around it along the great circle, at a steady pace in Ma;
//                         before the first and after the last keyframe it holds. Use tracks for
//                         things in the ocean and for anything in the schematic deep-time regime.
//   Where an item's position comes from: its `at` (a place) → else the generated TRACKS[id]
//   (section 5) → else its `site` carried on its plate. A mountain belt's line comes from
//   TRACKS['<id>/path'] (one track per point) if present, else from its `path`.
//   Carrying a point beyond 540 Ma is costly the first time (tens of ms, it builds the point's
//   lineage), so nothing here does it at runtime: deep-time positions are generated tracks.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 3. TIMING
// ─────────────────────────────────────────────────────────────────────────────────────────────
//   Times are Ma (millions of years ago; bigger = older; routes use ka = thousands of years).
//   Fades and minimum durations are in SCREEN SECONDS at 1× (js/engine/timeScale.js), not in Ma:
//   the warp gives 10 Myr of the Cambrian four seconds but 10,000 years of the Holocene nine,
//   and a fade must look the same in both. A label fades in over FADE_S after its `from` and out
//   over FADE_S before its `to` (shorter if its whole life on screen is short); `cut` removes the
//   fade at an end where a successor takes over at the same spot ('in', 'out' or 'both'). An item
//   is visible for to < t ≤ from (to ≤ t ≤ from when to = 0). A feature is shown from its start
//   (an impact: from its best age, `peak`) until FEATURE_MIN_S of screen time later or its end,
//   whichever is later (`until` overrides that end; it may be earlier than the end for very
//   long-lived features).
//   Nothing ever teleports: a track step faster than JUMP_DEG_PER_MA that covers more than
//   JUMP_MIN_DEG (a seaway closing under a label, a landmass re-forming in a deep-time morph) is a
//   jump, and the item fades out JUMP_FADE_S before it and back in after it.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 4. THE TABLES — how to add an entry
// ─────────────────────────────────────────────────────────────────────────────────────────────
//   OCEANS  { id, name, size, from, to, cut?, at? }
//     Add the entry, then a track for it in TRACKS (or an `at`). The track must keep the label
//     over open water — away from coasts, in the middle of its own water body — for every moment
//     between from and to: look at it on the geometry debug sheet at several times and run the
//     checks (open water, ≥ 12° from every other visible ocean label, ≤ MAX_OCEANS at once).
//     Array order is priority (a cap, should one ever be needed, drops the last ones).
//   LANDS   { id, name, subtitle?, phases?: [[fromMa, toMa, subtitle], …], size, from, to, at?, site? }
//     `phases` override the subtitle inside their window ('' = none). Give an `at` (usually a
//     plate-tied point near the middle of the assembled landmass) or a TRACKS entry; the label
//     must stay on land.
//   FEATURES { id, type, kind?, name, start, end, peak?, until?, r, site, at?, path?, ends?,
//              marine?, text }
//     start/end: the event's own interval (Ma); peak: its main pulse (an impact: its best age);
//     r: radius on the map (degrees); site: the present-day location ['plate', lon, lat]
//     ([null, lon, lat] for the ocean floor) — it is the position unless `at` or TRACKS[id] says
//     otherwise; path: places along a mountain belt or rift; ends: the two shores of a gateway
//     (places; the marker sits half-way); marine: the feature lies in the sea (oceanic plateaus,
//     straits, drowned land bridges) — all others must sit on land whenever visible; text: one
//     sentence, at most 160 characters, shown on hover. Keep at most MAX_FEATURES visible at once
//     (shorten `until` of long-lived ones); a runtime cap keeps the most intense ones if not.
//   ROUTES  { id, name, group, persist?, speciesIds?, points: [[ka, lon, lat] | [ka, 'plate', lon, lat], …], text }
//     Waypoints in travel order with their arrival ages (ka never increasing). The head moves
//     between two waypoints at a steady pace in time. Routes younger than ~1 Ma use fixed modern
//     coordinates (plates have moved by kilometres since); older ones ride their plates.
//     persist: true keeps the finished route on the map (faintly) until the present.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 5. GENERATED TRACKS  (block between the <generated:tracks> markers at the end of the file)
// ─────────────────────────────────────────────────────────────────────────────────────────────
//   Map-frame keyframes for every ocean label, for land labels whose landmass is not one rigid
//   plate (Gondwana, Pangaea …, and everything in the schematic deep-time regime; their last
//   keyframe may be plate-tied), for features that are in the open ocean or older than the
//   rigid-plate regime, and ('<id>/path') for the points of deep-time mountain belts. They were
//   fitted by a one-off script (not part of the runtime) against the polygons of
//   js/engine/interpolator.js: an ocean label goes to the point of its water body farthest from
//   any coast near a seed that follows the landmasses around it, moving no faster than the
//   continents and keeping 12° from the labels fitted before it (array order); a land label to
//   the most inland point near the middle of its landmass; a deep-time feature rides its site,
//   nudged onto the craton that carries it. Each was then repaired by bisection wherever it
//   touched the wrong surface between samples, thinned, and checked at every 0.25 Ma (0.05 Ma in
//   the 570–540 Ma hand-over). If the continents change, re-check them (debug sheet + the checks
//   listed under OCEANS); they are plain data, edit them by hand.
//
// SOURCES. Content from a researched catalogue (458 works; ages, coordinates and confidence for
// every entry). Main references: Torsvik & Cocks (2017) Earth History and Palaeogeography;
// Merdith et al. (2021) Earth-Sci. Rev. 214 and Cao et al. (2024) for the plate frame; Ernst
// (2014) Large Igneous Provinces; Schmieder & Kring (2020) Astrobiology 20 for impact ages;
// Burgess & Bowring (2015), Blackburn et al. (2013), Schoene et al. (2019), Renne et al. (2013)
// for the Siberian Traps, CAMP, Deccan and Chicxulub; Scotese (2021); Metcalfe (2013) and
// Stampfli & Borel (2002) for the Tethyan oceans; Domeier (2016) and Nance et al. (2012) for
// Iapetus and Rheic; O'Dea et al. (2016) for Panama; Krijgsman et al. (1999) for the Messinian;
// Iasi et al. (2024), Clarkson et al. (2017), Higham et al. (2014), Waters et al. (2020),
// Dillehay et al. (2008), Wilmshurst et al. (2011) and Anderson et al. (2018) for human dispersal;
// Lordkipanidze et al. (2013), Zhu et al. (2008, 2018) for Homo erectus; Woodburne (2010) and
// Carrillo et al. (2020) for the Great American Biotic Interchange.

import { plateToWorld } from '../engine/interpolator.js';
import { maToScreenSeconds } from '../engine/timeScale.js';

// ---------------------------------------------------------------------------------------------
// Tunables (screen seconds at 1× unless noted)
// ---------------------------------------------------------------------------------------------
const FADE_S = 1.2;             // labels and features fade in / out over this
const EVENT_FADE_IN_S = 0.3;    // an eruption, collision or gateway appears quickly …
const IMPACT_FADE_IN_S = 0.08;  // … an impact at once
const IMPACT_FLASH_S = 0.7;     // … flashes for about this long, then leaves a scar
const IMPACT_SCAR = 0.3;        // intensity of the scar
const FEATURE_MIN_S = 4;        // a feature stays on screen at least this long
const ROUTE_HOLD_S = 5;         // a finished route stays fully visible this long …
const SETTLED_OPACITY = 0.55;   // … then a persistent one settles at this opacity
const LEG_STEP_DEG = 4;         // route legs are drawn as great circles in steps of at most this
const JUMP_DEG_PER_MA = 6;      // a track step faster than this (and longer than JUMP_MIN_DEG) is a jump:
const JUMP_MIN_DEG = 3;         // … the item fades out before it and back in after it (never teleports)
const JUMP_FADE_S = 0.5;
const MAX_OCEANS = 7;
const MAX_FEATURES = 8;
const START_MA = 4540;

const GROUP_COLORS = { sapiens: '#ffd27a', archaic: '#f2a65a', fauna: '#b8e0a8' };

// ---------------------------------------------------------------------------------------------
// OCEANS — names of water bodies through time (positions: TRACKS)
// ---------------------------------------------------------------------------------------------
// The superocean of each age is one label at a time (handing over in place); older than ~1 Ga
// only that one, since nobody can name the seas between the scattered cratons.
const OCEANS = [
  // superoceans
  { id: 'hadean-ocean', name: 'Hadean ocean', size: 3, from: 4380, to: 4031, cut: 'out' },
  { id: 'archean-ocean', name: 'Archean ocean', size: 3, from: 4031, to: 2500, cut: 'both' },
  { id: 'proterozoic-ocean', name: 'Proterozoic ocean', size: 3, from: 2500, to: 1000, cut: 'in' },
  { id: 'mirovia', name: 'Mirovia', size: 3, from: 1000, to: 720, cut: 'out' },      // around Rodinia (hypothetical)
  { id: 'panthalassa', name: 'Panthalassa', size: 3, from: 720, to: 430, cut: 'in' },
  { id: 'panthalassa-west', name: 'Panthalassa', size: 3, from: 430, to: 180, cut: 'out' },
  { id: 'pacific-ocean', name: 'Pacific Ocean', size: 3, from: 180, to: 0, cut: 'in' },  // Pacific plate born ~190 Ma
  // Neoproterozoic – Paleozoic
  { id: 'mozambique-ocean', name: 'Mozambique Ocean', size: 2, from: 750, to: 640 },
  { id: 'iapetus-ocean', name: 'Iapetus Ocean', size: 2, from: 600, to: 420 },
  { id: 'tornquist-sea', name: 'Tornquist Sea', size: 1, from: 540, to: 450 },
  { id: 'proto-tethys-ocean', name: 'Proto-Tethys', size: 1, from: 540, to: 425 },
  { id: 'paleo-asian-ocean', name: 'Paleo-Asian Ocean', size: 2, from: 540, to: 290 },
  { id: 'rheic-ocean', name: 'Rheic Ocean', size: 2, from: 480, to: 320 },
  { id: 'ural-ocean', name: 'Ural Ocean', size: 1, from: 470, to: 310 },
  { id: 'paleo-tethys-ocean', name: 'Paleo-Tethys', size: 2, from: 410, to: 224 },
  { id: 'mongol-okhotsk-ocean', name: 'Mongol–Okhotsk Ocean', size: 1, from: 370, to: 155 },
  // Mesozoic – Cenozoic
  { id: 'neo-tethys-ocean', name: 'Neo-Tethys', size: 2, from: 270, to: 200, cut: 'out' },
  { id: 'tethys-ocean', name: 'Tethys Ocean', size: 2, from: 200, to: 20, cut: 'in' },
  { id: 'central-atlantic', name: 'Central Atlantic', size: 2, from: 180, to: 100, cut: 'out' },
  { id: 'north-atlantic', name: 'North Atlantic', size: 2, from: 100, to: 0, cut: 'in' },
  { id: 'gulf-of-mexico', name: 'Gulf of Mexico', size: 1, from: 150, to: 56 },
  { id: 'south-atlantic', name: 'South Atlantic', size: 2, from: 120, to: 0 },
  { id: 'indian-ocean', name: 'Indian Ocean', size: 2, from: 140, to: 0 },
  { id: 'tasman-sea', name: 'Tasman Sea', size: 1, from: 80, to: 34 },
  { id: 'arctic-ocean', name: 'Arctic Ocean', size: 2, from: 56, to: 0 },
  { id: 'southern-ocean', name: 'Southern Ocean', size: 2, from: 33.9, to: 0 },
  { id: 'mediterranean-sea', name: 'Mediterranean Sea', size: 1, from: 20, to: 0 },
];

// ---------------------------------------------------------------------------------------------
// LANDS — supercontinents, paleocontinents and old names
// ---------------------------------------------------------------------------------------------
const LANDS = [
  { id: 'vaalbara', name: 'Vaalbara', subtitle: 'Kaapvaal + Pilbara · contested', size: 2, from: 3300, to: 2700 },
  { id: 'kenorland', name: 'Kenorland', subtitle: 'conjectural', size: 3, from: 2720, to: 2450,
    phases: [[2500, 2450, 'conjectural · breaking up']] },
  { id: 'nuna', name: 'Columbia', subtitle: 'also called Nuna', size: 3, from: 1800, to: 1450,
    phases: [[1580, 1450, 'also called Nuna · breaking up']] },
  { id: 'rodinia', name: 'Rodinia', size: 3, from: 1100, to: 720,
    phases: [[1100, 900, 'assembling'], [825, 720, 'breaking up']] },
  { id: 'laurentia', name: 'Laurentia', subtitle: 'future North America', size: 2, from: 750, to: 425 },
  { id: 'baltica', name: 'Baltica', subtitle: 'future northern Europe', size: 2, from: 600, to: 425 },
  { id: 'siberia', name: 'Siberia', subtitle: 'future northern Asia', size: 2, from: 720, to: 280 },
  { id: 'gondwana', name: 'Gondwana', size: 3, from: 570, to: 160,
    phases: [[570, 520, 'last collisions'], [300, 180, 'southern Pangaea'], [180, 160, 'breaking up']] },
  { id: 'avalonia', name: 'Avalonia', subtitle: 'future Newfoundland, England and Belgium', size: 1, from: 480, to: 420 },
  { id: 'laurussia', name: 'Laurussia', subtitle: 'Euramerica, the Old Red Sandstone continent', size: 2, from: 425, to: 335 },
  { id: 'pangaea', name: 'Pangaea', size: 3, from: 335, to: 175,
    phases: [[335, 300, 'assembling'], [230, 201, 'rifting'], [201, 175, 'breaking up']] },
  { id: 'cimmeria', name: 'Cimmeria', subtitle: 'future Turkey, Iran and Tibet', size: 1, from: 280, to: 200 },
  { id: 'laurasia', name: 'Laurasia', size: 3, from: 200, to: 56 },
  { id: 'west-gondwana', name: 'West Gondwana', subtitle: 'South America + Africa', size: 2, from: 160, to: 105 },
  { id: 'east-gondwana', name: 'East Gondwana', subtitle: 'Antarctica, India, Australia', size: 2, from: 160, to: 130 },
  { id: 'laramidia', name: 'Laramidia', size: 1, from: 100, to: 66, at: ['north_america', -114, 45] },
  { id: 'appalachia', name: 'Appalachia', size: 1, from: 100, to: 66, at: ['north_america', -83, 39] },
  { id: 'zealandia', name: 'Zealandia', subtitle: 'a continent, 94% under water today', size: 1, from: 83, to: 20,
    at: ['new_zealand', 171.5, -43.5] },
];

// ---------------------------------------------------------------------------------------------
// FEATURES — eruptions, impacts, mountain building, gateways
// ---------------------------------------------------------------------------------------------
// Sites are present-day coordinates (a few nudged a fraction of a degree inland where the 1:110m
// coastline cuts through them: Chicxulub, Kara, Chesapeake Bay).
const FEATURES = [
  // ---- Archean and Proterozoic (deep time: positions from TRACKS, on the craton that carries
  //      the site) ----
  { id: 'barberton-s2', type: 'impact', name: 'Barberton S2 impact', start: 3262, end: 3255, peak: 3259, r: 1.5,
    site: ['africa', 31, -25.85],
    text: 'Glassy droplets in South Africa’s Barberton hills record an asteroid 37–58 km wide, 50–200 times the dinosaur-killer’s mass; its crater is lost.' },
  { id: 'fortescue-lip', type: 'lip', name: 'Fortescue flood basalts', start: 2780, end: 2690, peak: 2775, r: 5,
    site: ['australia', 117.8, -22],
    text: 'Lavas pour over the Pilbara craton from 2.78 billion years ago: one of the oldest flood-basalt provinces, with a near twin in South Africa.' },
  { id: 'matachewan-lip', type: 'lip', name: 'Matachewan dyke swarm', start: 2480, end: 2440, peak: 2446, r: 5,
    site: ['north_america', -81.5, 48.5],
    text: 'A fan of dykes splits the Superior craton as a mantle plume begins to tear the late-Archean landmass apart, just as oxygen starts to linger in the air.' },
  { id: 'yarrabubba', type: 'impact', name: 'Yarrabubba', start: 2234, end: 2224, peak: 2229, r: 0.6,
    site: ['australia', 118.83, -27.18],
    text: 'The oldest impact structure yet dated: an asteroid strikes the Yilgarn craton about when a Paleoproterozoic ice age ends.' },
  { id: 'bushveld-complex', type: 'lip', name: 'Bushveld Complex', start: 2061, end: 2054, peak: 2056, r: 2.5,
    site: ['africa', 28.7, -25],
    text: 'Earth’s largest layered intrusion: a sheet of magma nearly the size of Ireland that froze into most of the world’s platinum and chromium.' },
  { id: 'vredefort', type: 'impact', name: 'Vredefort', start: 2027, end: 2019, peak: 2023, r: 1.3,
    site: ['africa', 27.5, -27],
    text: 'A mountain-sized asteroid digs the largest crater known on Earth, 250–300 km wide; only its uplifted core, the Vredefort Dome, survives.' },
  { id: 'trans-hudson-orogeny', type: 'orogeny', name: 'Trans-Hudson Orogeny', start: 1900, end: 1800, peak: 1830, r: 8,
    site: ['north_america', -100.5, 55],
    path: [['north_america', -104, 55.5], ['north_america', -100.5, 55], ['north_america', -96, 57.5],
      ['north_america', -86, 60.5], ['north_america', -76, 61.5], ['north_america', -70, 64.5]],
    text: 'A Himalaya-scale collision welds the Superior, Hearne and Wyoming cratons into the core of North America as the supercontinent Nuna assembles.' },
  { id: 'sudbury', type: 'impact', name: 'Sudbury', start: 1850, end: 1849, peak: 1849.5, r: 1,
    site: ['north_america', -81.18, 46.6],
    text: 'An impact melts enough crust to pool into a sheet 2.5 km thick; its nickel and copper ores made Sudbury one of the world’s great mining districts.' },
  { id: 'mackenzie-lip', type: 'lip', name: 'Mackenzie dyke swarm', start: 1270, end: 1265, peak: 1267, r: 10,
    site: ['north_america', -115.5, 67.6],
    text: 'The largest dyke swarm on Earth fans out some 3,000 km across Canada from a mantle plume near the Coppermine River.' },
  { id: 'midcontinent-rift', type: 'lip', name: 'Midcontinent Rift', start: 1109, end: 1084, peak: 1097, r: 6,
    site: ['north_america', -88.5, 47.5],
    text: 'North America starts to split: a 2,000 km rift fills with 1.5 million km³ of lava, then fails. Its basalts and copper now ring Lake Superior.' },
  { id: 'grenville-orogeny', type: 'orogeny', name: 'Grenville Orogeny', start: 1090, end: 980, peak: 1050, r: 10,
    site: ['north_america', -75, 46.5],
    path: [['north_america', -98.7, 30.7], ['north_america', -84, 38], ['north_america', -74.2, 44],
      ['north_america', -72, 48], ['north_america', -60, 52.5]],
    text: 'Continents collide to assemble Rodinia, raising a range from Texas to Labrador whose deep roots now floor the Adirondacks and Quebec.' },
  { id: 'franklin-lip', type: 'lip', name: 'Franklin LIP', start: 720, end: 717, peak: 719, r: 10,
    site: ['north_america', -114, 71.5],
    text: 'Lavas and sills flood equatorial Arctic Canada; their rapid weathering may have drawn down enough CO₂ to tip Earth into the Sturtian snowball.' },
  { id: 'pan-african-orogeny', type: 'orogeny', name: 'Pan-African Orogeny', start: 650, end: 520, peak: 600, r: 15,
    site: ['africa', 37, -6],
    path: [['arabia', 43, 22], ['africa', 36.5, 20], ['africa', 38.5, 6], ['africa', 37, -3.5], ['africa', 36.5, -14]],
    text: 'Collisions weld a dozen cratons into Gondwana; the greatest range, the East African Orogen, runs 8,000 km from Arabia to Antarctica.' },
  { id: 'central-iapetus-magmatic-province', type: 'lip', name: 'Central Iapetus Magmatic Province', start: 620, end: 550, peak: 615, r: 8,
    site: ['north_america', -57.5, 51.5],
    text: 'Pulses of rift volcanism from Labrador to Virginia and Scandinavia as Laurentia and Baltica part and the Iapetus Ocean opens.' },
  { id: 'acraman', type: 'impact', name: 'Acraman', start: 590, end: 570, peak: 580, r: 0.6,
    site: ['australia', 135.45, -32.02],
    text: 'Debris from this strike in South Australia lies 300 km away in the Flinders Ranges, in rocks a little older than the Ediacara biota.' },

  // ---- Paleozoic ----
  { id: 'kalkarindji-lip', type: 'lip', name: 'Kalkarindji flood basalts', start: 512, end: 509, peak: 510.7, r: 9,
    site: ['australia', 130.5, -17.5],
    text: 'Flood basalts cover more than 2 million km² of northern Australia as olenellid and redlichiid trilobites vanish from early Cambrian seas.' },
  { id: 'caledonian-orogeny', type: 'orogeny', name: 'Caledonian Orogeny', start: 490, end: 390, peak: 425, r: 10,
    site: ['eurasia', 13.5, 64],
    path: [['eurasia', -4.8, 57.1], ['eurasia', 6.5, 61.5], ['eurasia', 13.5, 64], ['eurasia', 17.5, 68.4], ['eurasia', 24, 70.4]],
    text: 'Baltica rams Laurentia as the Iapetus Ocean closes, lifting a Himalaya-sized range whose stumps are the Scottish Highlands and Norway’s mountains.' },
  { id: 'taconic-orogeny', type: 'orogeny', name: 'Taconic Orogeny', start: 470, end: 440, peak: 455, r: 6,
    site: ['north_america', -73.3, 43],
    path: [['north_america', -78, 38.5], ['north_america', -75.5, 40.5], ['north_america', -73.3, 43],
      ['north_america', -71.5, 46.2], ['north_america', -57.8, 49.3]],
    text: 'Volcanic island arcs crash into Laurentia’s edge, raising the first Appalachian ranges and burying New York in mud shed from the peaks.' },
  { id: 'hirnantian-ice-sheet', type: 'other', kind: 'ice sheet', name: 'Hirnantian ice sheet', start: 445.2, end: 443.1, peak: 444.2, r: 20,
    site: ['africa', 8.5, 25.5],
    text: 'An ice sheet spreads from the South Pole across what is now the Sahara; glacial pavements in Algeria and Libya still carry its scratches.' },
  { id: 'acadian-orogeny', type: 'orogeny', name: 'Acadian Orogeny', start: 420, end: 380, peak: 400, r: 6,
    site: ['north_america', -69.3, 45.5],
    path: [['north_america', -72.5, 42.5], ['north_america', -71.3, 44], ['north_america', -69.3, 45.5],
      ['north_america', -66.5, 46.5], ['north_america', -61, 46.3]],
    text: 'Avalonia docks with Laurentia; rivers pouring off the new peaks build the Catskill Delta, where some of the first forests take root.' },
  { id: 'siljan', type: 'impact', name: 'Siljan', start: 385.5, end: 376.3, peak: 380.9, r: 0.5,
    site: ['eurasia', 14.87, 61.03],
    text: 'Europe’s largest impact structure, 52 km across, is punched into Devonian Sweden; a ring of lakes around Siljan marks it today.' },
  { id: 'kola-dnieper-lip', type: 'lip', name: 'Kola–Dnieper province', start: 380, end: 360, peak: 370, r: 7,
    site: ['eurasia', 33, 50.3],
    text: 'Rifts and plume magmas from Ukraine’s Dnieper–Donets basin to the Kola Peninsula stretch the East European craton in the Late Devonian.' },
  { id: 'viluy-traps', type: 'lip', name: 'Viluy Traps', start: 378, end: 362, peak: 374, r: 7,
    site: ['eurasia', 118, 63.5],
    text: 'Dyke swarms and lavas split eastern Siberia in two pulses, near 377 and 364 Ma, bracketing the Late Devonian crises: a leading volcanic suspect.' },
  { id: 'variscan-orogeny', type: 'orogeny', name: 'Variscan Orogeny', start: 380, end: 280, peak: 330, r: 10,
    site: ['eurasia', 7.5, 48],
    path: [['eurasia', -7, 38.5], ['eurasia', -7.5, 42.8], ['eurasia', -3, 48.2], ['eurasia', 2.8, 45.5],
      ['eurasia', 7.5, 48], ['eurasia', 10.6, 51.75], ['eurasia', 14.5, 49.8]],
    text: 'Gondwana ploughs into Laurussia to forge Pangaea, folding Europe from Iberia to Bohemia; coal swamps fill the basins at the mountains’ feet.' },
  { id: 'late-paleozoic-ice-age', type: 'other', kind: 'ice sheet', name: 'Late Paleozoic Ice Age', start: 340, end: 285, peak: 300, r: 20,
    site: ['africa', 22.5, -31.5],
    text: 'Ice sheets wax and wane over southern Gondwana for some 50 million years; the Dwyka tillites of South Africa are their best-known moraines.' },
  { id: 'alleghanian-orogeny', type: 'orogeny', name: 'Alleghanian Orogeny', start: 325, end: 260, peak: 295, r: 8,
    site: ['north_america', -81, 37],
    path: [['north_america', -86.8, 33.5], ['north_america', -84, 35.2], ['north_america', -81, 37],
      ['north_america', -79, 38.8], ['north_america', -77, 40.6]],
    text: 'Africa collides with North America, completing Pangaea and thrusting the Appalachians up to Alpine, perhaps Himalayan, heights.' },
  { id: 'uralian-orogeny', type: 'orogeny', name: 'Uralian Orogeny', start: 320, end: 250, peak: 290, r: 10,
    site: ['eurasia', 59.5, 57.5],
    path: [['eurasia', 58.5, 51.5], ['eurasia', 58.2, 54.5], ['eurasia', 59.5, 57.5], ['eurasia', 59.5, 61],
      ['eurasia', 62, 65], ['eurasia', 65.5, 67.5]],
    text: 'Kazakhstania and Siberia weld onto Laurussia along a 2,500 km seam, closing the Ural Ocean and adding the first pieces of Asia to Pangaea.' },
  { id: 'gondwanide-orogeny', type: 'orogeny', name: 'Gondwanide Orogeny', start: 280, end: 230, peak: 255, r: 5,
    site: ['africa', 22, -33.35],
    path: [['south_america', -62, -38.1], ['africa', 19.1, -32.4], ['africa', 22, -33.35], ['africa', 25.5, -33.8],
      ['antarctica', -58, -83.5]],
    text: 'Subduction under Gondwana’s Pacific rim crumples a chain from Argentina’s Sierra de la Ventana through South Africa’s Cape to Antarctica.' },
  { id: 'emeishan-traps', type: 'lip', name: 'Emeishan Traps', start: 260.3, end: 257.2, peak: 259.5, r: 4,
    site: ['eurasia', 102, 26.5],
    text: 'Lavas burst through a tropical carbonate platform on the South China block, timed to the end-Capitanian extinction that preceded the Great Dying.' },
  { id: 'araguainha', type: 'impact', name: 'Araguainha', start: 257.2, end: 252.2, peak: 254.7, r: 0.4,
    site: ['south_america', -52.98, -16.78],
    text: 'South America’s largest crater, 40 km wide, is blasted into the Paraná Basin within a few million years of the end-Permian extinction.' },
  { id: 'siberian-traps', type: 'lip', name: 'Siberian Traps', start: 252.3, end: 250.2, peak: 251.9, r: 12,
    site: ['eurasia', 100, 66],
    text: 'Millions of km³ of lava and sills bake Siberian coal, salt and carbonates, releasing the gases that drive the Great Dying.' },

  // ---- Mesozoic ----
  { id: 'wrangellia-lip', type: 'lip', name: 'Wrangellia flood basalts', start: 233, end: 226, peak: 230, r: 6, marine: true,
    site: ['north_america', -126, 49.8],
    text: 'A basalt plateau erupts onto the Panthalassa sea floor, a suspect for the rain-soaked Carnian Pluvial Episode; it later docks with Alaska and BC.' },
  { id: 'cimmerian-orogeny', type: 'orogeny', name: 'Cimmerian Orogeny', start: 230, end: 190, peak: 210, r: 10,
    site: ['eurasia', 59.5, 36.3],
    path: [['eurasia', 34, 41.3], ['eurasia', 51.5, 36.2], ['eurasia', 59.5, 36.3], ['eurasia', 70, 35.8], ['eurasia', 92, 34.5]],
    text: 'A ribbon of microcontinents, from Turkey and Iran to Tibet, drifts across the Tethys and slams into Asia, closing the Paleo-Tethys Ocean.' },
  { id: 'manicouagan', type: 'impact', name: 'Manicouagan', start: 215.6, end: 214.6, peak: 215.3, r: 0.6,
    site: ['north_america', -68.7, 51.38],
    text: 'The ‘Eye of Quebec’: a ring lake 70 km across marks a 100 km crater dug 14 million years before the end-Triassic extinction, too early to blame.' },
  { id: 'camp', type: 'lip', name: 'Central Atlantic Magmatic Province', start: 201.6, end: 200.9, peak: 201.5, r: 16,
    site: ['africa', -7.4, 31.1],
    text: 'Pangaea rips open: lavas and sills spread over 10 million km² of four future continents in under a million years, acidifying the oceans.' },
  { id: 'puchezh-katunki', type: 'impact', name: 'Puchezh-Katunki', start: 196.9, end: 194.9, peak: 195.9, r: 0.5,
    site: ['eurasia', 43.72, 56.97],
    text: 'A crater up to 80 km wide, buried under the Volga plains near Nizhny Novgorod, struck in the Early Jurassic with no mass extinction to show for it.' },
  { id: 'karoo-ferrar', type: 'lip', name: 'Karoo–Ferrar', start: 184, end: 180, peak: 183, r: 10,
    site: ['africa', 28.5, -29.5],
    text: 'Magma floods southern Gondwana from the Karoo to Antarctica and Tasmania as seas warm, acidify and lose oxygen in the Toarcian event.' },
  { id: 'morokweng', type: 'impact', name: 'Morokweng', start: 146.22, end: 145.9, peak: 146.06, r: 0.5,
    site: ['africa', 23.53, -26.47],
    text: 'Buried under Kalahari sand, a crater up to 80 km wide whose melt sheet still holds a 25 cm chunk of the asteroid itself.' },
  { id: 'mjolnir', type: 'impact', name: 'Mjølnir', start: 144.6, end: 139.4, peak: 142, r: 0.4, marine: true,
    site: ['eurasia', 29.67, 73.8],
    text: 'An asteroid 1.5–2 km wide hits the shallow Barents Sea, digging a 40 km crater and sending tsunamis across the Arctic shelf.' },
  { id: 'parana-etendeka', type: 'lip', name: 'Paraná–Etendeka Traps', start: 135, end: 131, peak: 134, r: 8,
    site: ['south_america', -52, -25.5],
    text: 'Lava up to 1.7 km deep buries southern Brazil and Namibia as South America and Africa begin to unzip: the South Atlantic is being born.' },
  { id: 'high-arctic-lip', type: 'lip', name: 'High Arctic LIP', start: 130, end: 80, peak: 122, r: 9,
    site: ['north_america', -91, 79.8],
    text: 'Sills and lavas spread around the opening Arctic Ocean, from Ellesmere Island to Svalbard and Franz Josef Land, in pulses over 50 Myr.' },
  { id: 'sevier-orogeny', type: 'orogeny', name: 'Sevier Orogeny', start: 125, end: 50, peak: 90, r: 8,
    site: ['north_america', -111.9, 40.8],
    path: [['north_america', -115.3, 36.2], ['north_america', -113.2, 38.5], ['north_america', -111.9, 40.8],
      ['north_america', -110.9, 43], ['north_america', -112.5, 47], ['north_america', -114.8, 50.5], ['north_america', -117.5, 53]],
    text: 'The Farallon plate dives under North America, stacking thin sheets of rock eastward from Nevada to Alberta and bowing down the Western Interior Seaway.' },
  { id: 'ontong-java-plateau', type: 'lip', name: 'Ontong Java Plateau', start: 122, end: 108, peak: 116, r: 9, marine: true,
    site: [null, 160, -3],
    text: 'The most voluminous volcanic province known: an undersea plateau the size of Alaska and over 30 km thick, built on the Pacific floor.' },
  { id: 'kerguelen-plateau', type: 'lip', name: 'Kerguelen Plateau', start: 119, end: 95, peak: 112, r: 9, marine: true,
    site: [null, 73, -55],
    text: 'A plateau three times the size of Japan wells up between India, Australia and Antarctica; parts stood above the waves and grew forests.' },
  { id: 'equatorial-atlantic-gateway', type: 'gateway', kind: 'opens', name: 'Equatorial Atlantic Gateway', start: 113, end: 100, peak: 107, r: 5, marine: true,
    site: [null, -14, 0], ends: [['south_america', -35.3, -5.2], ['africa', 7, 4.5]],
    text: 'The last land link between South America and Africa parts near the equator; Atlantic waters join end to end and West Gondwana is no more.' },
  { id: 'western-interior-seaway', type: 'gateway', kind: 'seaway', name: 'Western Interior Seaway', start: 100, end: 66, peak: 93, r: 6,
    site: ['north_america', -101, 45],
    text: 'A shallow sea up to 1,000 km wide floods the heart of North America from the Gulf to the Arctic, splitting it into Laramidia and Appalachia.' },
  { id: 'caribbean-lip', type: 'lip', name: 'Caribbean LIP', start: 95, end: 86, peak: 90, r: 8, marine: true,
    site: [null, -73, 15],
    text: 'An oceanic plateau thickens the Pacific floor, then is carried east to wedge between the Americas as the Caribbean plate.' },
  { id: 'madagascar-lip', type: 'lip', name: 'Madagascar flood basalts', start: 92, end: 84, peak: 88, r: 5,
    site: ['madagascar', 46.8, -19],
    text: 'Basalts flood Madagascar as India tears away above the Marion hot spot, leaving the island alone in the Indian Ocean ever since.' },
  { id: 'laramide-orogeny', type: 'orogeny', name: 'Laramide Orogeny', start: 80, end: 40, peak: 65, r: 8,
    site: ['north_america', -107.4, 43],
    path: [['north_america', -106.4, 35.2], ['north_america', -105.6, 39.6], ['north_america', -107.4, 42],
      ['north_america', -109.7, 43.2], ['north_america', -109.9, 45.1]],
    text: 'The subducting Farallon slab flattens and drags on the continent’s underside, punching up the Rocky Mountains 1,000 km from the coast.' },
  { id: 'kara', type: 'impact', name: 'Kara', start: 72.9, end: 68.5, peak: 70.7, r: 0.5,
    site: ['eurasia', 64.2, 68.7],   // crater centre 64.15 E 69.1 N, on the coast
    text: 'A 65 km crater on the Arctic coast beside the Urals, struck a few million years before the end of the Cretaceous.' },
  { id: 'deccan-traps', type: 'lip', name: 'Deccan Traps', start: 66.4, end: 65.4, peak: 66, r: 6,
    site: ['india', 75, 19.5],
    text: 'Stacked lava flows over 2 km thick bury western India, erupting from ~350,000 years before the Chicxulub impact to ~600,000 years after.' },
  { id: 'chicxulub', type: 'impact', name: 'Chicxulub', start: 66.1, end: 65.95, peak: 66.04, r: 0.9,
    site: ['north_america', -89.5, 20.8],   // crater centre 89.5 W 21.3 N, on the Yucatán coast
    text: 'A 10–15 km asteroid strikes the Yucatán shelf, excavating a 180 km crater; fire, darkness and years of cold end the reign of the non-avian dinosaurs.' },
  { id: 'boltysh', type: 'impact', name: 'Boltysh', start: 65.55, end: 65.23, peak: 65.39, r: 0.4,
    site: ['eurasia', 32.2, 48.85],
    text: 'A 24 km crater in central Ukraine, long suspected as Chicxulub’s twin; precise dating puts it about 650,000 years after the dinosaur-killer.' },

  // ---- Cenozoic ----
  { id: 'alpine-orogeny', type: 'orogeny', name: 'Alpine Orogeny', start: 65, end: 0, peak: 30, r: 5, until: 2.6,
    site: ['eurasia', 10.3, 46.6],
    path: [['eurasia', 7.3, 44.1], ['eurasia', 6.87, 45.83], ['eurasia', 8, 46.5], ['eurasia', 10.3, 46.6],
      ['eurasia', 12.7, 47.07], ['eurasia', 15.2, 47.5]],
    text: 'Africa’s northward push crumples Tethys sea floor into the Alps; the Matterhorn’s summit is a sliver of the African plate thrust over Europe.' },
  { id: 'north-atlantic-igneous-province', type: 'lip', name: 'North Atlantic Igneous Province', start: 62, end: 54, peak: 56, r: 9,
    site: ['greenland', -26, 69.5],
    text: 'Greenland and Europe tear apart over the Iceland plume; magma baking carbon-rich sea-floor muds is a prime suspect for the PETM heat spike.' },
  { id: 'hiawatha', type: 'impact', name: 'Hiawatha', start: 58.53, end: 57.45, peak: 57.99, r: 0.4,
    site: ['greenland', -66.2, 78.7],
    text: 'A 31 km crater hidden under a kilometre of Greenland ice, found by radar in 2015 and dated to the warm Late Paleocene.' },
  { id: 'north-atlantic-land-bridge', type: 'gateway', kind: 'bridge', name: 'North Atlantic land bridge', start: 57.5, end: 55, peak: 56, r: 6, marine: true,
    site: ['greenland', -32, 68.3], ends: [['greenland', -32, 68.3], ['eurasia', -7, 62]],
    text: 'A volcanic land bridge by way of Greenland lets early primates, horses and other mammals spread between Europe and North America at the PETM.' },
  { id: 'himalaya-tibet-orogeny', type: 'orogeny', name: 'Himalaya–Tibet Orogeny', start: 55, end: 0, r: 10,
    site: ['eurasia', 85.2, 29.6],
    path: [['eurasia', 75.5, 36.2], ['eurasia', 77.6, 34.6], ['eurasia', 80, 32], ['eurasia', 81.3, 31.1],
      ['eurasia', 85.2, 29.6], ['eurasia', 88, 29.6], ['eurasia', 91.1, 29.65], ['eurasia', 95, 29.7]],
    text: 'India, after racing north at up to 15 cm a year, ploughs into Asia; the crust doubles in thickness to build the Himalaya and the Tibetan Plateau.' },
  { id: 'drake-passage', type: 'gateway', kind: 'opens', name: 'Drake Passage', start: 41, end: 30, peak: 31, r: 4, marine: true,
    site: [null, -62, -59], ends: [['south_america', -67.3, -55.4], ['antarctica', -60.5, -63.6]],
    text: 'South America and the Antarctic Peninsula part; the Southern Ocean can now circle the globe unbroken, helping to lock Antarctica in the cold.' },
  { id: 'popigai', type: 'impact', name: 'Popigai', start: 37.55, end: 35.5, peak: 35.7, r: 0.6,
    site: ['eurasia', 111.18, 71.65],
    text: 'A 100 km crater in Arctic Siberia whose shock turned graphite in the target rock into vast deposits of tiny impact diamonds.' },
  { id: 'chesapeake-bay', type: 'impact', name: 'Chesapeake Bay', start: 35.8, end: 34.5, peak: 35.3, r: 0.5,
    site: ['north_america', -76.5, 37.3],   // crater centre 76.0 W 37.3 N, under the bay mouth
    text: 'The largest crater in the United States lies buried under the mouth of Chesapeake Bay; its rubble still shapes the bay’s rivers and groundwater.' },
  { id: 'tasmanian-gateway', type: 'gateway', kind: 'opens', name: 'Tasmanian Gateway', start: 35.5, end: 30.2, peak: 33.5, r: 4, marine: true,
    site: ['australia', 147.5, -47.5], ends: [['australia', 146.7, -43.3], ['antarctica', 160, -70]],
    text: 'Tasmania pulls clear of Antarctica and deep water flows between them: one of two doors that had to open for the Antarctic Circumpolar Current.' },
  { id: 'turgai-strait-closure', type: 'gateway', kind: 'closes', name: 'Turgai Strait closes', start: 34, end: 29, peak: 33.6, r: 5,
    site: ['eurasia', 64.5, 50.5],
    text: 'The seaway east of the Urals drains as sea level falls; Asian mammals walk into Europe and replace much of its fauna: the ‘Grande Coupure’.' },
  { id: 'ethiopian-yemen-traps', type: 'lip', name: 'Ethiopian–Yemen Traps', start: 31, end: 28, peak: 30, r: 6,
    site: ['africa', 38.5, 11],
    text: 'About 2 km of basalt builds the Ethiopian Highlands within a million years as the Afar plume arrives; the Red Sea and Gulf of Aden rifts follow.' },
  { id: 'east-african-rift', type: 'other', kind: 'rift', name: 'East African Rift', start: 30, end: 0, r: 8,
    site: ['africa', 36, 3.5],
    path: [['africa', 41, 11.5], ['africa', 38.5, 7.5], ['africa', 36, 3.5], ['africa', 36.2, -0.5], ['africa', 35.8, -3]],
    text: 'Africa begins to split: rift valleys, volcanoes and deep lakes open from Afar to Malawi, the shifting landscapes in which hominins evolve.' },
  { id: 'zagros-orogeny', type: 'orogeny', name: 'Zagros Orogeny', start: 30, end: 0, peak: 10, r: 8, until: 2.6,
    site: ['eurasia', 50.5, 31.5],
    path: [['eurasia', 46, 35.8], ['eurasia', 47.5, 33.5], ['eurasia', 50.5, 31.5], ['eurasia', 52.5, 29.8], ['eurasia', 55, 28], ['eurasia', 57, 27.3]],
    text: 'Arabia closes the last Tethys seaway and wrinkles its buried sediments into the Zagros folds, trapping some of the world’s largest oil fields.' },
  { id: 'kaikoura-orogeny', type: 'orogeny', name: 'Kaikōura Orogeny', start: 25, end: 0, peak: 5, r: 4, until: 2.6,
    site: ['new_zealand', 170.14, -43.6],
    path: [['new_zealand', 167.5, -45.2], ['new_zealand', 169, -44], ['new_zealand', 170.14, -43.6],
      ['new_zealand', 171.6, -42.9], ['new_zealand', 173.5, -42.1]],
    text: 'The Pacific–Australian plate boundary cuts through Zealandia; along the Alpine Fault the Southern Alps rise up to 10 mm a year and erode almost as fast.' },
  { id: 'tethys-seaway-closure', type: 'gateway', kind: 'closes', name: 'Tethys seaway closes', start: 20, end: 13.8, peak: 19, r: 4,
    site: ['arabia', 40.7, 37], ends: [['arabia', 40.7, 37], ['eurasia', 41.5, 38.7]],
    text: 'Arabia meets Eurasia: the Tethys seaway between the Mediterranean and the Indian Ocean shuts, and elephants and apes walk out of Africa.' },
  { id: 'andean-orogeny', type: 'orogeny', name: 'Andean Orogeny', start: 100, end: 0, peak: 10, r: 10, until: 2.6,
    site: ['south_america', -68, -17.5],
    path: [['south_america', -73.5, 10], ['south_america', -76, 5], ['south_america', -78.5, -1.5], ['south_america', -77, -9],
      ['south_america', -72, -14.5], ['south_america', -68, -17.5], ['south_america', -68.5, -24], ['south_america', -70, -32.7],
      ['south_america', -71.5, -40], ['south_america', -73.2, -49.5]],
    text: 'Ocean floor dives beneath South America, raising the longest mountain chain on land: 7,000 km of volcanoes and the 4 km-high Altiplano.' },
  { id: 'fram-strait', type: 'gateway', kind: 'opens', name: 'Fram Strait', start: 17.5, end: 13.7, peak: 17.5, r: 3, marine: true,
    site: [null, 0, 79], ends: [['greenland', -17, 79.5], ['eurasia', 11, 79]],
    text: 'The only deep-water door to the Arctic opens between Greenland and Svalbard, turning a stagnant, brackish polar sea into a ventilated ocean.' },
  { id: 'columbia-river-basalts', type: 'lip', name: 'Columbia River Basalts', start: 16.7, end: 15.9, peak: 16.4, r: 4,
    site: ['north_america', -119, 46],
    text: 'Fissures pour 210,000 km³ of basalt over Washington and Oregon, 95% of it in under a million years, at the peak of the Miocene Climatic Optimum.' },
  { id: 'isthmus-of-panama', type: 'gateway', kind: 'closes', name: 'Isthmus of Panama', start: 15, end: 2.8, peak: 2.8, r: 2.5, marine: true,
    site: ['north_america', -79.7, 9.1], ends: [['north_america', -84, 10], ['south_america', -76.8, 7.8]],
    text: 'A volcanic arc rises to join the Americas, parting Atlantic from Pacific. Final closure about 2.8 Ma; a rival view says 13–15 Ma.' },
  { id: 'ries', type: 'impact', name: 'Nördlinger Ries', start: 14.85, end: 14.77, peak: 14.81, r: 0.4,
    site: ['eurasia', 10.57, 48.88],
    text: 'A 1.5 km asteroid digs the 24 km Nördlinger Ries, flinging green glass (moldavite) up to 450 km into Bohemia; the town of Nördlingen sits inside it.' },
  { id: 'messinian-salinity-crisis', type: 'gateway', kind: 'closes', name: 'Messinian salinity crisis', start: 5.97, end: 5.33, peak: 5.6, r: 2, marine: true,
    site: ['eurasia', -5.6, 35.95], ends: [['eurasia', -5.6, 36.02], ['africa', -5.81, 35.77]],
    text: 'The Atlantic gateways close and the Mediterranean partly dries out, leaving over a million km³ of salt on its floor.' },
  { id: 'bering-strait-opens', type: 'gateway', kind: 'opens', name: 'Bering Strait opens', start: 5.5, end: 4.8, peak: 5.4, r: 2, marine: true,
    site: [null, -168.9, 65.8], ends: [['eurasia', -169.7, 66.1], ['north_america', -168.1, 65.6]],
    text: 'Sea first breaks through between Asia and Alaska, linking Pacific and Arctic; by 3.5 Ma Pacific shellfish are invading the North Atlantic.' },
  { id: 'zanclean-flood', type: 'gateway', kind: 'floods', name: 'Zanclean flood', start: 5.34, end: 5.32, peak: 5.333, r: 2, marine: true,
    site: ['eurasia', -5.6, 35.95], ends: [['eurasia', -5.6, 36.02], ['africa', -5.81, 35.77]],
    text: 'The Atlantic breaks through at Gibraltar and refills the Mediterranean: by one model in under two years, the sea rising up to 10 m a day.' },
  { id: 'indonesian-throughflow', type: 'gateway', kind: 'restricts', name: 'Indonesian Throughflow narrows', start: 5, end: 3, peak: 3.5, r: 6, marine: true,
    site: [null, 125, -2], ends: [['eurasia', 117.5, -0.5], ['australia', 131, -1.3]],
    text: 'New Guinea drifts north and Halmahera rises, pinching the flow of warm Pacific water into the Indian Ocean; East Africa may have dried as a result.' },
  { id: 'eltanin', type: 'impact', name: 'Eltanin', start: 2.58, end: 2.44, peak: 2.51, r: 1.5, marine: true,
    site: [null, -90.78, -57.78],
    text: 'The only known impact into deep ocean: an asteroid 1–4 km wide hits 5 km of water off Chile, leaving no crater, only debris on the sea bed.' },
  { id: 'wallacea', type: 'gateway', kind: 'barrier', name: 'Wallacea', start: 2.58, end: 0, r: 6, marine: true,
    site: [null, 121, -5], ends: [['eurasia', 115.2, -8.4], ['australia', 134.5, -6.2]],
    text: 'Deep straits that never ran dry part Sundaland from Sahul. Most of Asia’s land mammals stop here; people reach Australia only by boat.' },
  { id: 'yellowstone', type: 'other', kind: 'hot spot', name: 'Yellowstone hot spot', start: 2.08, end: 0.63, peak: 2.08, r: 1.5,
    site: ['north_america', -110.6, 44.5],
    text: 'Three caldera-forming super-eruptions, at 2.08, 1.30 and 0.63 Ma; the first throws out about 2,450 km³ of ash and pumice.' },
  { id: 'australasian-tektites', type: 'impact', name: 'Australasian tektite impact', start: 0.791, end: 0.785, peak: 0.788, r: 1,
    site: ['eurasia', 106.5, 15.2],
    text: 'Glassy tektites rain over a tenth of the planet, from China to Australia; the crater, perhaps buried under lava in Laos, is still unconfirmed.' },
  { id: 'dover-strait-breach', type: 'gateway', kind: 'opens', name: 'Dover Strait breached', start: 0.45, end: 0.16, peak: 0.45, r: 1, marine: true,
    site: ['eurasia', 1.5, 51], ends: [['eurasia', 1.35, 51.13], ['eurasia', 1.85, 50.95]],
    text: 'An ice-dammed lake in the North Sea spills over the chalk ridge joining Dover to Calais; megafloods carve the Channel, and Britain can become an island.' },
  { id: 'sahul-land-bridges', type: 'gateway', kind: 'bridge', name: 'Sahul land bridges', start: 0.115, end: 0.008, peak: 0.021, r: 6, marine: true,
    site: ['australia', 139, -11], ends: [['australia', 142.5, -10.7], ['australia', 142.2, -9.2]],
    text: 'Low seas join Australia, New Guinea and Tasmania into one continent, Sahul, with a huge lake where the Gulf of Carpentaria is today.' },
  { id: 'sunda-shelf', type: 'gateway', kind: 'bridge', name: 'Sundaland', start: 0.11, end: 0.01, peak: 0.021, r: 8, marine: true,
    site: ['eurasia', 108, 1], ends: [['eurasia', 103.5, 1.5], ['eurasia', 110, -1]],
    text: 'At low sea level Sumatra, Java and Borneo join mainland Asia in one subcontinent, drained by great rivers that now lie on the sea bed.' },
  { id: 'bab-el-mandeb', type: 'gateway', kind: 'narrows', name: 'Bab-el-Mandeb', start: 0.075, end: 0.012, peak: 0.065, r: 1.5, marine: true,
    site: ['arabia', 43.4, 12.6], ends: [['africa', 43.1, 12.45], ['arabia', 43.45, 12.7]],
    text: 'The mouth of the Red Sea, about 26 km wide today, shrinks to a few kilometres at low sea level: one possible way out of Africa, by raft or boat.' },
  { id: 'toba-eruption', type: 'other', kind: 'super-eruption', name: 'Toba super-eruption', start: 0.0745, end: 0.0733, peak: 0.0739, r: 1.5,
    site: ['eurasia', 98.83, 2.68],
    text: 'The largest eruption of the last two million years blasts out Sumatra’s Lake Toba and dusts India with ash; people there carry on regardless.' },
  { id: 'barringer', type: 'impact', name: 'Meteor Crater', start: 0.066, end: 0.046, peak: 0.05, r: 0.4,
    site: ['north_america', -111.022, 35.027],
    text: 'A 50 m iron meteorite blasts a 1.2 km bowl into the Arizona plateau: the first crater on Earth proven to be an impact scar.' },
  { id: 'bering-land-bridge', type: 'gateway', kind: 'bridge', name: 'Bering land bridge', start: 0.0357, end: 0.011, peak: 0.021, r: 5, marine: true,
    site: [null, -168.9, 65.8], ends: [['eurasia', -169.7, 66.1], ['north_america', -168.1, 65.6]],
    text: 'With sea level 120 m lower, a plain up to 1,600 km wide joins Siberia to Alaska. People cross, or live on it, before it drowns ~11,000 years ago.' },
  { id: 'doggerland', type: 'gateway', kind: 'floods', name: 'Doggerland drowns', start: 0.0115, end: 0.007, peak: 0.00815, r: 3, marine: true,
    site: ['eurasia', 2.5, 54.7], ends: [['eurasia', 0.3, 53.5], ['eurasia', 5, 53.3]],
    text: 'Rising seas drown the plains between Britain and Europe; the Storegga tsunami strikes the last low islands about 8,150 years ago.' },
  { id: 'tunguska', type: 'impact', name: 'Tunguska', start: 0.000119, end: 0.000117, peak: 0.000118, r: 0.6,
    site: ['eurasia', 101.9, 60.9],
    text: 'On 30 June 1908 a stony asteroid about 50 m wide explodes over Siberia, flattening 2,000 km² of forest and leaving no crater.' },
];

// ---------------------------------------------------------------------------------------------
// ROUTES — dispersals (waypoints: [ka, lon, lat] or [ka, 'plate', lon, lat]; arrival ages)
// ---------------------------------------------------------------------------------------------
const ROUTES = [
  // ---- Homo sapiens ----
  { id: 'out-of-africa', name: 'Out of Africa', group: 'sapiens', persist: true, speciesIds: ['homo_sapiens'],
    points: [[65, 38.5, 9], [63, 43.4, 12.6], [61, 54, 17.5], [58, 53, 30], [56, 67.5, 26], [54, 78.1, 15.3],
      [52, 98, 16.5], [51.5, 103.5, 2.5], [51.2, 119.63, -4.98], [50.5, 131, -1.5], [50, 132.88, -12.52],
      [42, 143.05, -33.72], [40, 146, -42.6]],
    text: 'The ancestors of all living non-Africans leave Africa 70,000–50,000 years ago, follow the coasts of southern Asia and reach Australia by boat.' },
  { id: 'across-asia', name: 'Across Asia', group: 'sapiens', persist: true, speciesIds: ['homo_sapiens'],
    points: [[55, 53, 30], [49, 69.5, 41.5], [47, 85.57, 50.72], [45, 102.9, 49.3], [40, 115.87, 39.66], [38, 130.7, 32.8]],
    text: 'A northern branch follows the foothills of Central Asia to the Altai, Mongolia and northern China by 45,000–40,000 years ago, then crosses to Japan.' },
  { id: 'into-europe', name: 'Into Europe', group: 'sapiens', persist: true, speciesIds: ['homo_sapiens'],
    points: [[50, 34.78, 30.84], [48, 29, 41], [45.8, 25.43, 42.95], [45.5, 11.56, 50.66], [42.5, 9.77, 48.4],
      [41.5, -3.5, 50.47], [40, -8.65, 39.53]],
    text: 'Modern humans spread from the Levant up the Danube and across Europe 47,000–42,000 years ago, overlapping with the last Neanderthals.' },
  { id: 'into-the-americas', name: 'Into the Americas', group: 'sapiens', persist: true, speciesIds: ['homo_sapiens'],
    points: [[32, 135.42, 70.72], [24, -170, 65], [17, -150, 60], [16.5, -132, 53], [16, -116.3, 45.9], [15.5, -97.7, 30.9],
      [15, -79.6, 9], [14.5, -73.2, -41.5], [12.8, -70.05, -52.03]],
    text: 'People wait out the last ice age in Beringia, then move down the Pacific coast as the ice retreats and reach southern Chile by 14,500 years ago.' },
  { id: 'austronesian-voyages', name: 'Austronesian voyages', group: 'sapiens', persist: true, speciesIds: ['homo_sapiens'],
    points: [[4.3, 121, 23.7], [4.1, 121.8, 18.3], [3.7, 124, 1.5], [3.4, 149.63, -1.42], [3.1, 166, -10.7],
      [3.05, 168.38, -17.78], [3, 177.3, -18.1], [2.91, -175.14, -21.14], [2.8, -172.03, -13.83]],
    text: 'Farmer-sailors with outrigger canoes spread from Taiwan through island south-east Asia and, as the Lapita people, reach Tonga and Samoa by 2,800 years ago.' },
  { id: 'madagascar-voyage', name: 'Borneo to Madagascar', group: 'sapiens', persist: true, speciesIds: ['homo_sapiens'],
    points: [[1.4, 114.6, -3.3], [1.25, 43.3, -11.7], [1.2, 48.3, -13.75]],
    text: 'Austronesian sailors from Borneo cross 7,000 km of the Indian Ocean and settle Madagascar about 1,300 years ago; Malagasy is still a Bornean language.' },
  { id: 'east-polynesia', name: 'Into East Polynesia', group: 'sapiens', persist: true, speciesIds: ['homo_sapiens'],
    points: [[1.2, -172.03, -13.83], [1.1, -158.1, -20], [0.96, -151.4, -16.8]],
    text: 'After nearly 2,000 years in Tonga and Samoa, voyagers push east about a thousand years ago into the Cook and Society Islands.' },
  { id: 'hawaii-voyage', name: 'North to Hawaiʻi', group: 'sapiens', persist: true, speciesIds: ['homo_sapiens'],
    points: [[0.96, -151.4, -16.8], [0.79, -140.1, -8.9], [0.78, -156.3, 20.8]],
    text: 'Voyagers from central East Polynesia find the Marquesas and then Hawaiʻi, 3,500 km to the north across the equator, about 800 years ago.' },
  { id: 'rapa-nui-voyage', name: 'East to Rapa Nui', group: 'sapiens', persist: true, speciesIds: ['homo_sapiens'],
    points: [[0.96, -151.4, -16.8], [0.83, -134.97, -23.12], [0.8, -109.37, -27.12]],
    text: 'One of the most isolated inhabited islands on Earth is reached about 800 years ago; around then Polynesians and Native Americans meet.' },
  { id: 'aotearoa-voyage', name: 'South-west to Aotearoa', group: 'sapiens', persist: true, speciesIds: ['homo_sapiens'],
    points: [[0.9, -159.8, -21.2], [0.77, 174.06, -41.51]],
    text: 'Canoes from the Cook or Society Islands settle New Zealand about 750 years ago, the last large habitable land on Earth; within two centuries the moa are gone.' },

  // ---- Homo erectus (and the first Europeans) ----
  { id: 'erectus-out-of-africa', name: 'Homo erectus leaves Africa', group: 'archaic', speciesIds: ['homo_erectus'],
    points: [[1900, 'africa', 36.2, 3.95], [1870, 'africa', 33.5, 29], [1800, 'eurasia', 44.34, 41.34]],
    text: 'Small-brained early Homo erectus walks out of Africa almost as soon as the species appears, and lives in the Caucasus by 1.8 million years ago.' },
  { id: 'erectus-to-china', name: 'Homo erectus reaches China', group: 'archaic', speciesIds: ['homo_erectus'],
    points: [[1800, 'eurasia', 44.34, 41.34], [1730, 'eurasia', 75, 38], [1660, 'eurasia', 114.66, 40.22]],
    text: 'By 1.7–1.6 million years ago toolmakers live at 40° N in northern China, with real winters; their descendants include ‘Peking Man’.' },
  { id: 'erectus-to-java', name: 'Homo erectus reaches Java', group: 'archaic', speciesIds: ['homo_erectus', 'homo_floresiensis'],
    points: [[1800, 'eurasia', 44.34, 41.34], [1700, 'eurasia', 60, 30], [1500, 'india', 79.89, 13.23], [1400, 'eurasia', 100, 14],
      [1300, 'eurasia', 110.83, -7.45], [1020, 'eurasia', 121.1, -8.69]],
    text: 'Another branch follows the tropics through India to Java, then joined to Asia; by a million years ago someone has crossed deep water to Flores.' },
  { id: 'first-europeans', name: 'The first Europeans', group: 'archaic', speciesIds: ['homo_erectus'],
    points: [[1800, 'eurasia', 44.34, 41.34], [1600, 'eurasia', 30, 39], [1400, 'eurasia', -2.47, 37.72], [1250, 'eurasia', -3.52, 42.35]],
    text: 'Europe is reached late and thinly: the oldest traces, in Spain, are about 1.4 million years old.' },

  // ---- animals ----
  { id: 'marsupials-to-australia', name: 'Marsupials reach Australia', group: 'fauna',
    points: [[60000, 'south_america', -68, -45], [57000, 'antarctica', -56.7, -64.2], [56000, 'antarctica', 110, -68],
      [54600, 'australia', 151.95, -26.25]],
    text: 'Marsupials cross a warm, forested Antarctica from South America to Australia while the three are still joined; kangaroos and koalas descend from them.' },
  { id: 'atlantic-rafters', name: 'Monkeys and rodents raft the Atlantic', group: 'fauna',
    points: [[42000, 'africa', 5, 5], [41000, 'south_america', -75, -7.3]],
    text: 'The ancestors of guinea pigs, capybaras and later all New World monkeys cross from Africa on mats of floating vegetation; there was never a land bridge.' },
  { id: 'elephants-leave-africa', name: 'Elephants leave Africa', group: 'fauna', speciesIds: ['gomphothere'],
    points: [[21000, 'africa', 34, 2], [19500, 'arabia', 40.7, 37], [17500, 'eurasia', 1.9, 48.1]],
    text: 'When Arabia docks with Eurasia, gomphotheres and deinotheres walk out of Africa, where the elephant order had been confined for 40 million years.' },
  { id: 'sloths-go-north', name: 'Ground sloths island-hop north', group: 'fauna',
    points: [[9500, 'south_america', -72, 6], [9000, 'north_america', -82.5, 29.6]],
    text: 'Six million years before the land bridge, ground sloths island-hop from South America to North America.' },
  { id: 'raccoons-go-south', name: 'Raccoon relatives go south', group: 'fauna',
    points: [[7500, 'north_america', -86, 13], [7300, 'south_america', -66.9, -27]],
    text: 'A relative of raccoons and coatis is the first North American land mammal to reach South America, about 7.3 million years ago.' },
  { id: 'interchange-south', name: 'Great American Interchange: south', group: 'fauna', speciesIds: ['gomphothere'],
    points: [[2800, 'north_america', -100.9, 21], [2700, 'north_america', -79.6, 9], [2650, 'south_america', -74, 4.5],
      [2500, 'south_america', -57.7, -38.2]],
    text: 'Over the new isthmus, horses, dogs, cats, bears, deer and elephant-like gomphotheres walk into South America; half its mammal genera descend from them.' },
  { id: 'interchange-north', name: 'Great American Interchange: north', group: 'fauna', speciesIds: ['megatherium', 'glyptodon'],
    points: [[2800, 'south_america', -70, -5], [2700, 'north_america', -79.6, 9], [2650, 'north_america', -100.9, 21],
      [2600, 'north_america', -105, 31.5], [2400, 'north_america', -82.3, 27.8]],
    text: 'Ground sloths, glyptodonts, armadillos, porcupines and capybaras move north; a giant flightless terror bird reaches Texas and Florida.' },
];

// ---------------------------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------------------------
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const round2 = (x) => Math.round(x * 100) / 100;

function toVec(lon, lat) {
  const a = lon * D2R;
  const b = lat * D2R;
  const c = Math.cos(b);
  return [c * Math.cos(a), c * Math.sin(a), Math.sin(b)];
}

function toLonLat(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  const lat = Math.asin(Math.max(-1, Math.min(1, v[2] / l))) * R2D;
  const lon = Math.atan2(v[1], v[0]) * R2D;
  return [lon, lat];
}

/** Great-circle distance between two [lon, lat] points, in degrees. */
function arcDeg(a, b) {
  const u = toVec(a[0], a[1]);
  const v = toVec(b[0], b[1]);
  const cx = u[1] * v[2] - u[2] * v[1];
  const cy = u[2] * v[0] - u[0] * v[2];
  const cz = u[0] * v[1] - u[1] * v[0];
  return Math.atan2(Math.hypot(cx, cy, cz), u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) * R2D;
}

/** Point a fraction f of the way from a to b along the great circle. */
function slerp(a, b, f) {
  if (f <= 0) return a;
  if (f >= 1) return b;
  const u = toVec(a[0], a[1]);
  const v = toVec(b[0], b[1]);
  const d = Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]));
  const th = Math.acos(d);
  if (th < 1e-9) return a;
  if (Math.PI - th < 1e-6) return f < 0.5 ? a : b;   // antipodes: no unique path
  const s = Math.sin(th);
  const wa = Math.sin((1 - f) * th) / s;
  const wb = Math.sin(f * th) / s;
  return toLonLat([u[0] * wa + v[0] * wb, u[1] * wa + v[1] * wb, u[2] * wa + v[2] * wb]);
}

const finite = (p) => !!p && Number.isFinite(p[0]) && Number.isFinite(p[1]);

/** A place (section 2) at time t → [lon, lat] or null. */
function placeAt(place, t) {
  if (!Array.isArray(place) || !place.length) return null;
  if (Array.isArray(place[0])) return trackAt(place, t);
  if (typeof place[0] === 'string') return plateToWorld(place[0], place[1], place[2], t);
  if (place[0] === null) return [place[1], place[2]];
  return [place[0], place[1]];
}

/** One keyframe of a track, evaluated at time t. */
function keyAt(k, t) {
  return typeof k[1] === 'string' ? plateToWorld(k[1], k[2], k[3], t) : [k[1], k[2]];
}

function trackAt(track, t) {
  const n = track.length;
  if (t >= track[0][0]) return keyAt(track[0], t);
  if (t <= track[n - 1][0]) return keyAt(track[n - 1], t);
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track[mid][0] >= t) lo = mid;
    else hi = mid;
  }
  const a = track[lo];
  const b = track[hi];
  const pa = keyAt(a, t);
  const pb = keyAt(b, t);
  if (!finite(pa) || !finite(pb)) return finite(pa) ? pa : finite(pb) ? pb : null;
  return slerp(pa, pb, (a[0] - t) / (a[0] - b[0]));
}

function where(item, t) {
  if (item.at) return placeAt(item.at, t);
  const track = TRACKS[item.id];
  if (track) return trackAt(track, t);
  if (item.site) return placeAt(item.site, t);
  return null;
}

const outPoint = (p) => [round2(p[0]), round2(p[1])];

/** The track an item moves on (its own `at`, or its generated one), or null for a fixed site. */
function trackOf(item) {
  if (Array.isArray(item.at) && Array.isArray(item.at[0])) return item.at;
  if (!item.at && TRACKS[item.id]) return TRACKS[item.id];
  return null;
}

/** Screen times (s) of the jumps in an item's track: steps faster than plates can move. */
function jumpsOf(item) {
  const track = trackOf(item);
  const out = [];
  if (!track) return out;
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i];
    const b = track[i + 1];
    const pa = keyAt(a, a[0]);
    const pb = keyAt(b, b[0]);
    if (!finite(pa) || !finite(pb)) continue;
    const d = arcDeg(pa, pb);
    const dt = Math.max(1e-9, a[0] - b[0]);
    if (d > JUMP_MIN_DEG && d / dt > JUMP_DEG_PER_MA) out.push([screen(a[0]), screen(b[0])]);
  }
  return out;
}

/** Visibility dip around jumps: 0 during a jump step, back to 1 JUMP_FADE_S away from it. */
function jumpFade(jumps, t) {
  if (!jumps.length) return 1;
  const s = screen(t);
  let a = 1;
  for (const [s0, s1] of jumps) {
    const d = s < s0 ? s0 - s : s > s1 ? s - s1 : 0;
    if (d < JUMP_FADE_S) a = Math.min(a, smooth(d / JUMP_FADE_S));
  }
  return a;
}

// ---------------------------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------------------------
const screen = (ma) => maToScreenSeconds(ma);

/** Clean a time: NaN / negative → the present, older than the story → its start. */
function cleanTime(timeMa) {
  const t = Number(timeMa);
  if (!(t > 0)) return 0;
  return t > START_MA ? START_MA : t;
}

/** Visibility window of a label: screen-second bounds and fade lengths. */
function labelWindow(from, to, cut) {
  const s0 = screen(from);
  const s1 = screen(to);
  const span = Math.max(0, s1 - s0);
  const fade = Math.min(FADE_S, span * 0.3);
  return {
    from, to, s0, s1,
    fadeIn: cut === 'in' || cut === 'both' ? 0 : fade,
    fadeOut: to <= 0 || cut === 'out' || cut === 'both' ? 0 : fade,
  };
}

/** Opacity of a windowed item at time t (0 = not visible). */
function windowOpacity(w, t) {
  if (t > w.from) return 0;
  if (w.to > 0 ? t <= w.to : t < 0) return 0;
  const s = screen(t);
  let a = 1;
  if (w.fadeIn > 0) a = Math.min(a, (s - w.s0) / w.fadeIn);
  if (w.fadeOut > 0) a = Math.min(a, (w.s1 - s) / w.fadeOut);
  return a >= 1 ? 1 : smooth(a);
}

// ---------------------------------------------------------------------------------------------
// Preparation (once, at load)
// ---------------------------------------------------------------------------------------------
for (const o of OCEANS) o.win = labelWindow(o.from, o.to, o.cut);
for (const l of LANDS) l.win = labelWindow(l.from, l.to, l.cut);

for (const f of FEATURES) {
  // an impact happens at its best age (start–end is only its error bar); anything else begins
  // at its start and peaks at `peak` (or soon after it begins)
  const begin = f.type === 'impact' && f.peak != null ? f.peak : f.start;
  const s0 = screen(begin);
  const s1 = screen(f.end);
  const sPeak = f.type !== 'impact' && f.peak != null && f.peak < f.start ? screen(f.peak) : NaN;
  // shown until FEATURE_MIN_S after it begins or until its end, whichever is later (smaller Ma)
  const show = f.until != null ? f.until : Math.min(f.end, screenToMaAfter(s0 + FEATURE_MIN_S));
  const s2 = screen(show);
  f.win = {
    begin, show, s0, s1, s2,
    rise: Number.isFinite(sPeak) ? Math.max(0.1, sPeak - s0) : Math.max(0.25, Math.min(1.5, (s1 - s0) * 0.15)),
    fadeIn: f.type === 'impact' ? IMPACT_FADE_IN_S : Math.min(EVENT_FADE_IN_S, (s2 - s0) * 0.2),
    fadeOut: show <= 0 ? 0 : Math.min(FADE_S, (s2 - s0) * 0.25),
  };
}

for (const r of ROUTES) {
  r.keys = r.points.map((p) => (typeof p[1] === 'string'
    ? { ma: p[0] / 1000, plate: p[1], lon: p[2], lat: p[3] }
    : { ma: p[0] / 1000, plate: null, lon: p[1], lat: p[2] }));
  r.startMa = r.keys[0].ma;
  r.endMa = r.keys[r.keys.length - 1].ma;
  const s0 = screen(r.startMa);
  const s1 = screen(r.endMa);
  r.win = { s0, s1, sHold: s1 + ROUTE_HOLD_S };
  r.color = GROUP_COLORS[r.group] || GROUP_COLORS.sapiens;
}

/** The Ma at which `seconds` of screen time have elapsed (≥ 0: the present). */
function screenToMaAfter(seconds) {
  // invert maToScreenSeconds by bisection (monotone decreasing in Ma); runs only at load
  let lo = 0;
  let hi = START_MA;
  if (screen(0) <= seconds) return 0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (screen(mid) > seconds) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------------------------
let warned = false;
/** Data problems are reported once, on the console; the accessors then return nothing. */
function warnOnce(e) {
  if (warned) return;
  warned = true;
  console.warn('paleogeography:', e);
}

/** Memoise f(t) on the cleaned time; two slots, for a map and a globe asking alternately. */
function memo(compute) {
  let t1 = NaN;
  let v1 = null;
  let t2 = NaN;
  let v2 = null;
  return (timeMa) => {
    const t = cleanTime(timeMa);
    if (t === t1) return v1;
    if (t === t2) return v2;
    let v;
    try {
      v = Object.freeze(compute(t));
    } catch (e) {
      warnOnce(e);
      v = Object.freeze([]);
    }
    t2 = t1;
    v2 = v1;
    t1 = t;
    v1 = v;
    return v;
  };
}

let jumpsReady = false;
/** Jumps are found once, on first use (the generated tracks are declared at the end of the file). */
function prepareJumps() {
  if (jumpsReady) return;
  jumpsReady = true;
  for (const list of [OCEANS, LANDS, FEATURES]) for (const item of list) item.jumps = jumpsOf(item);
}

function subtitleAt(l, t) {
  if (l.phases) {
    for (const [from, to, sub] of l.phases) if (t <= from && t > to) return sub || null;
  }
  return l.subtitle || null;
}

export const getOceanLabelsAt = memo((t) => {
  prepareJumps();
  const out = [];
  for (const o of OCEANS) {
    const opacity = windowOpacity(o.win, t) * jumpFade(o.jumps, t);
    if (!(opacity > 0.01)) continue;
    const p = where(o, t);
    if (!finite(p)) continue;
    const q = outPoint(p);
    out.push(Object.freeze({ id: o.id, name: o.name, lon: q[0], lat: q[1], size: o.size, opacity: round2(opacity) }));
    if (out.length >= MAX_OCEANS) break;
  }
  return out;
});

export const getLandLabelsAt = memo((t) => {
  prepareJumps();
  const out = [];
  for (const l of LANDS) {
    const opacity = windowOpacity(l.win, t) * jumpFade(l.jumps, t);
    if (!(opacity > 0.01)) continue;
    const p = where(l, t);
    if (!finite(p)) continue;
    const q = outPoint(p);
    const item = { id: l.id, name: l.name, lon: q[0], lat: q[1], size: l.size, opacity: round2(opacity) };
    const sub = subtitleAt(l, t);
    if (sub) item.subtitle = sub;
    out.push(Object.freeze(item));
  }
  return out;
});

/** Activity, visibility and phase of a feature at t; null when it is not shown. */
function featureState(f, t) {
  const w = f.win;
  if (t > w.begin || (w.show > 0 && t < w.show)) return null;
  const s = screen(t);
  let opacity = 1;
  if (w.fadeIn > 0) opacity = Math.min(opacity, (s - w.s0) / w.fadeIn);
  if (w.fadeOut > 0) opacity = Math.min(opacity, (w.s2 - s) / w.fadeOut);
  opacity = opacity >= 1 ? 1 : smooth(opacity);
  let intensity;
  let phase;
  if (f.type === 'impact') {
    const since = s - w.s0;
    intensity = Math.max(IMPACT_SCAR, Math.exp(-since / (IMPACT_FLASH_S * 0.5)));
    phase = since < IMPACT_FLASH_S ? 'impact' : 'scar';
  } else {
    const grown = smooth((s - w.s0) / w.rise);
    if (s <= w.s1) {
      intensity = grown;
      phase = 'active';
    } else {
      intensity = grown * (1 - smooth((s - w.s1) / Math.max(0.5, w.s2 - w.s1)));
      phase = 'waning';
    }
  }
  return { opacity, intensity: clamp01(intensity), phase };
}

export const getFeaturesAt = memo((t) => {
  prepareJumps();
  const out = [];
  for (const f of FEATURES) {
    const st = featureState(f, t);
    if (st) st.opacity *= jumpFade(f.jumps, t);
    if (!st || !(st.opacity > 0.01)) continue;
    let ends = null;
    let p;
    if (f.ends) {
      const a = placeAt(f.ends[0], t);
      const b = placeAt(f.ends[1], t);
      if (finite(a) && finite(b)) {
        ends = [outPoint(a), outPoint(b)];
        p = f.at || TRACKS[f.id] ? where(f, t) : slerp(a, b, 0.5);
      }
    }
    if (!p) p = where(f, t);
    if (!finite(p)) continue;
    let path = null;
    const places = TRACKS[`${f.id}/path`] || f.path;
    if (places) {
      path = [];
      for (const place of places) {
        const q = placeAt(place, t);
        if (finite(q)) path.push(outPoint(q));
      }
      if (path.length < 2) path = null;
    }
    const q = outPoint(p);
    const item = {
      id: f.id, type: f.type, name: f.name, lon: q[0], lat: q[1], radiusDeg: f.r,
      intensity: round2(st.intensity), opacity: round2(st.opacity), phase: st.phase,
      description: f.text, startMa: f.start, endMa: f.end,
    };
    if (f.kind) item.kind = f.kind;
    if (path) item.path = Object.freeze(path);
    if (ends) item.ends = Object.freeze(ends);
    out.push(Object.freeze(item));
  }
  if (out.length > MAX_FEATURES) {
    out.sort((a, b) => b.opacity * (0.5 + b.intensity) - a.opacity * (0.5 + a.intensity));
    out.length = MAX_FEATURES;
  }
  return out;
});

/** Waypoints of a route carried to time t (fixed modern points for young routes). */
function routeKeys(r, t) {
  return r.keys.map((k) => (k.plate ? plateToWorld(k.plate, k.lon, k.lat, t) || [k.lon, k.lat] : [k.lon, k.lat]));
}

/** Append the great-circle leg a → b (without a) in steps of at most LEG_STEP_DEG. */
function pushLeg(out, a, b, upTo = 1) {
  const len = arcDeg(a, b);
  const n = Math.max(1, Math.ceil((len * upTo) / LEG_STEP_DEG));
  for (let i = 1; i <= n; i++) out.push(outPoint(slerp(a, b, (upTo * i) / n)));
  return len * upTo;
}

export const getMigrationsAt = memo((t) => {
  const out = [];
  for (const r of ROUTES) {
    if (t > r.startMa) continue;
    const s = screen(t);
    const w = r.win;
    let opacity = 1;
    if (s > w.sHold) {
      if (r.persist) opacity = SETTLED_OPACITY + (1 - SETTLED_OPACITY) * (1 - smooth((s - w.sHold) / FADE_S));
      else opacity = 1 - smooth((s - w.sHold) / FADE_S);
    }
    if (!(opacity > 0.01)) continue;
    const pts = routeKeys(r, t);
    if (!pts.every(finite)) continue;
    const route = [outPoint(pts[0])];
    const path = [outPoint(pts[0])];
    let total = 0;
    let done = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = r.keys[i];
      const b = r.keys[i + 1];
      total += pushLeg(route, pts[i], pts[i + 1]);
      if (t <= b.ma) {
        done += pushLeg(path, pts[i], pts[i + 1]);
      } else if (t < a.ma) {
        const f = (a.ma - t) / (a.ma - b.ma);
        done += pushLeg(path, pts[i], pts[i + 1], f);
      }
    }
    if (path.length < 2) {
      // just setting out: a stub so the head can be drawn
      path.push(outPoint(slerp(pts[0], pts[1], 0.002)));
    }
    const item = {
      id: r.id, name: r.name, group: r.group, color: r.color,
      path: Object.freeze(path), route: Object.freeze(route),
      progress: round2(total > 0 ? clamp01(done / total) : 1), opacity: round2(opacity),
      description: r.text, startMa: r.startMa, endMa: r.endMa,
    };
    if (r.speciesIds) item.speciesIds = Object.freeze(r.speciesIds.slice());
    out.push(Object.freeze(item));
  }
  return out;
});

// ---------------------------------------------------------------------------------------------
// Generated tracks (section 5) — map-frame keyframes [ma, lon, lat] (or plate-tied
// [ma, 'plate', lon, lat]), oldest first. Plain data: edit by hand if needed.
// ---------------------------------------------------------------------------------------------
// <generated:tracks>
const TRACKS = {
  'hadean-ocean': [[4380, 25, 5], [4031, 42.8, 22.2]],
  'archean-ocean': [[4031, 42.8, 22.2], [3740, 58, 37], [3660, 54.8, 40.5], [3060, 54.2, 39],
    [2924, 50.1, 37.8], [2500, 39.9, 29]],
  'proterozoic-ocean': [[2500, 39.9, 29], [2468, 40, 28.6], [2364, 38.5, 28.3], [2220, 37, 29],
    [1764, 31.7, 25.3], [1596, 29.9, 24.2], [1348, 44.1, 34.6], [1292, 47, 35.4], [1244, 38.5, 31.8],
    [1172, 24.2, 29.4], [1156, 15.6, 32.8], [1140, 13.5, 31.5], [1132, 9.8, 32.5], [1108, -22, 35.7],
    [1092, -24.6, 35.9], [1044, -17.5, 33.3], [1020, -13.7, 29.5], [1004, -13.7, 27.5], [1000, -11, 25]],
  'mirovia': [[1000, -90, -20], [869, -95, -20.7], [785, -93.8, -19.5], [721, -84.8, -14.9],
    [720, -83.9, -14]],
  'panthalassa': [[720, -83.9, -14], [697, -79.3, -15.1], [645, -63.4, -6], [597, -48.9, 7.9],
    [580, -43.3, 6], [555.625, -23.7, 24.8], [555.563, -23.8, 14.6], [555.548, -23.8, -17.3],
    [555.532, -23.8, -6.8], [555.516, -23.9, -3.4], [555.5, -23.5, 18.1], [555, -22.5, 25.9],
    [539, -9, 38.8], [531, -7.1, 42.7], [488, -18.6, 34.1], [476, -16.4, 42.7], [466, -7.4, 45.2],
    [458, -0.8, 49.6], [448, 5.4, 51.6], [430, 30.9, 60]],
  'panthalassa-west': [[430, -148.9, 29], [383, -158.8, 20.6], [321, -158.2, 8.2], [295, -151.9, 3],
    [253, -158.8, -5.4], [181, -158.3, -19.5], [180, -157.8, -19]],
  'pacific-ocean': [[180, -157.8, -19], [173, -154, -19.4], [145, -158.4, -25], [125, -158.4, -25.5],
    [111, -150.2, -17.8], [83, -155.7, -22.9], [70, -155.8, -23], [52, -142.3, -8.6], [37, -144.8, 1.9],
    [1, -139.5, 4.2], [0, -137.2, 3]],
  'mozambique-ocean': [[750, 47.4, -2.7], [724, 49.9, -3.7], [656, 64.7, -11.5], [640, 62.5, -7.7]],
  'iapetus-ocean': [[600, -127.8, -42.6], [593, -119.4, -39], [579, -116.4, -32.8], [572, -118.1, -33.2],
    [571, -124, -36.4], [570, -136.6, -42.1], [569, -141.9, -45.5], [564, -137.1, -45.7],
    [557, -141.4, -41.6], [550, -150.8, -40.3], [546, -156.7, -40.3], [530, -159, -36.3],
    [522, -154.8, -33.1], [520, -155.8, -32], [518, -147, -33.8], [516, -127.3, -35.6], [514, -116.7, -35],
    [506, -112.6, -32.4], [496, -110.6, -31.6], [490, -108.2, -32.8], [482, -109.8, -32.7],
    [468, -99.1, -39], [456, -99.3, -40.4], [450, -96.9, -40.1], [448, -93.4, -38], [444, -84.6, -30.9],
    [438, -83.7, -30.8], [434, -83.5, -36.1], [428, -73.9, -36.1], [420, -55.2, -40.7]],
  'tornquist-sea': [[540, -53.3, -46.8], [530, -46.7, -54.1], [518, -37.9, -62.9], [494, -46.2, -64],
    [476, -62.1, -64.6], [464, -61.4, -56.7], [458, -62.7, -51.4], [450, -59.3, -45.8]],
  'proto-tethys-ocean': [[540, 64.7, -18], [537, 63, -22.6], [529, 65.6, -24.2], [511, 76.1, -28.5],
    [509, 77.7, -24.6], [507, 79.2, -17.5], [505, 78.5, -15.5], [497, 76.3, -20.9], [487, 76.5, -24.1],
    [455, 72.5, -25.5], [445, 64.1, -19.5], [437, 58.6, -7.1], [433, 60.6, 0.9], [431, 64.3, 5.2],
    [427, 68.3, 8.3], [425, 76.2, 11.9]],
  'paleo-asian-ocean': [[540, -18.6, 6.9], [530, -18.7, -1.7], [524, -17.8, -4.3], [514, -13.5, -14.3],
    [506, -10.2, -14.7], [496, -6.4, -8.9], [478, -7.7, -5.5], [458, -4.4, -13.3], [448, -2.9, -10.5],
    [438, 0.4, -1.3], [428, 14.4, 8.7], [412, 44, 14.5], [408, 50.1, 13.5], [400, 46.2, 9.6],
    [388, 50.2, 13.5], [376, 46.9, 17.8], [368, 50.3, 22.7], [360, 48.6, 36.1], [354, 45, 46.7],
    [348, 51.4, 55.5], [338, 55, 61.5], [330, 77.5, 61.7], [324, 81.1, 54.4], [316, 77.5, 56.1],
    [302, 82.5, 60.3], [290, 87.6, 58.9]],
  'rheic-ocean': [[480, -95.2, -53.6], [468, -98.8, -57], [456, -88.8, -60.7], [450, -71.2, -62.7],
    [438, -65.8, -58.1], [432, -77.5, -54.5], [428, -71.2, -54.6], [420, -48.8, -56.7], [412, -35.6, -43.2],
    [408, -36.6, -38.5], [398, -37.3, -40.3], [392, -40.5, -40], [382, -37, -39], [374, -23.9, -36.6],
    [362, -19.5, -34], [360, -23.6, -35], [358, -32.9, -36.7], [356, -36.9, -36.6], [346, -28.6, -28.9],
    [332.5, -19.1, -16], [332.016, -18, -15.7], [332, -24.3, -19.7], [328, -25.9, -15.5],
    [320, -23.7, -17.1]],
  'ural-ocean': [[470, -22.1, -20.8], [466, -18.6, -23.9], [460, -22.2, -25.8], [452, -25.6, -18.4],
    [430, -38.3, 13.9], [422, -28.7, 19.6], [414, -18.1, 21.1], [412.5, -20.6, 24.3], [412.016, -22.4, 26.6],
    [412, 0.5, 11], [404, 4.2, 8.4], [394, 10, 3.1], [384, 13.2, 2.9], [376, 18.1, -0.5], [362, 24.3, 1.7],
    [354, 25.5, 6.7], [352.5, 30, 5.4], [352.016, 33.6, 3], [352, 15.1, 17.1], [342, 22.2, 25.1],
    [328, 34.6, 34.3], [311, 29.2, 35.9], [310.813, 26.4, 37.6], [310.798, 18.8, 39.8], [310.25, 20.7, 41.1],
    [310, 28.5, 44.8]],
  'paleo-tethys-ocean': [[410, 98.2, -12.6], [394, 96.2, -13.1], [388, 94, -13], [380, 102.5, -12.1],
    [374, 106.2, -12.1], [356, 103.8, -14.7], [328, 108.6, -29.3], [322, 111.2, -30], [320, 104.8, -30.6],
    [318, 89.9, -30.7], [316, 82.2, -29.6], [302, 81, -25.4], [286, 81.4, -25.6], [280, 82.5, -23],
    [272, 88.7, -22.4], [264, 95.8, -20.2], [258, 105.2, -21.7], [248, 109.5, -17.7], [232, 117.2, -0.6],
    [224, 118.8, 9.8]],
  'mongol-okhotsk-ocean': [[370, 43.5, 46.3], [363, 38.3, 47], [353, 19.6, 56.2], [341.25, 28.2, 68.4],
    [341.016, 27.3, 69.3], [341, 91.6, 65.4], [335, 102.1, 62.5], [329, 116.1, 64.7], [313, 112.1, 66],
    [293, 123.7, 65.5], [285, 102.2, 65.9], [253, 106.6, 64.8], [231, 104.4, 66.4], [219, 117.4, 73.2],
    [205, 120.4, 76.2], [197, 111.3, 77.8], [187, 116.3, 75.1], [181, 125.5, 73.1], [165, 115.7, 65.2],
    [157, 125.3, 62.6], [155, 124.5, 61.2]],
  'neo-tethys-ocean': [[270, 71.7, -29], [267, 57.3, -24.9], [265, 52.9, -24.1], [247, 58.4, -17.5],
    [235, 64.4, -9.1], [211, 64.3, 7.1], [200, 63.4, 12.9]],
  'tethys-ocean': [[200, 63.4, 12.9], [185, 63.3, 23.9], [165, 65.5, 19.6], [147, 63.6, 13.3],
    [131, 67.4, 11.3], [95, 62.4, 12.9], [85, 63.4, 11.1], [83, 68.6, 7.7], [81, 79.6, 0.4],
    [79, 84.2, -2.1], [68, 77.4, 15.7], [62, 72.9, 20.5], [54, 55.6, 18.4], [49, 52.1, 21.2],
    [45.016, 48, 26.4], [45, 31, 26.5], [32, 29.5, 29.2], [20, 27.6, 31.5]],
  'central-atlantic': [[180, -12.3, 4.5], [163, -12.5, 7.1], [145, -12.3, 12.5], [125, -16.5, 19.7],
    [123, -13.1, 24.2], [121, -4.9, 31.6], [119, -0.8, 35.2], [100, -11.8, 37.4]],
  'north-atlantic': [[100, -11.8, 37.4], [81, -22.6, 33.6], [65, -24, 33.4], [53, -30.1, 31.7],
    [0, -43, 32.4]],
  'gulf-of-mexico': [[150, -26.8, 21.9], [117, -37.6, 30.3], [70, -69.5, 31.6], [56, -76.6, 29.1]],
  'south-atlantic': [[120, 2.1, -11.7], [103, -2.4, -11.1], [83, -6.8, -17.9], [73, -12.1, -33.4],
    [61, -14.1, -34.8], [0, -15.3, -25.7]],
  'indian-ocean': [[140, 33.2, -34.2], [121, 31.1, -33], [77, 37.9, -22], [62, 42.4, -23.9],
    [61.125, 42.2, -18.8], [61, 56, -32.4], [60, 62, -35.7], [52, 67.2, -30.8], [36, 75.3, -27.8],
    [15, 78.1, -19.2], [0, 78.1, -18]],
  'tasman-sea': [[80, 160.8, -71.1], [77, 163.8, -67], [69, 167.5, -64.9], [68.016, 167.4, -62.5],
    [68, 160.3, -50.3], [63, 157.7, -44.3], [48, 160.2, -43.6], [34, 160.4, -39.1]],
  'arctic-ocean': [[56, 110, 81], [0, 128.1, 80.8]],
  'southern-ocean': [[33.9, 26.3, -57], [0, 28.6, -56.7]],
  'mediterranean-sea': [[20, 10.2, 36.5], [17, 17.3, 32.9], [0, 17.4, 34.5]],
  'vaalbara': [[3300, -88.1, -4.8], [3028, -87.4, -5.1], [2844, -97.1, -12.8], [2700.063, -105.4, -13],
    [2700.032, -105.5, -12.8], [2700, -115.1, -18.8]],
  'kenorland': [[2720, -125.4, 26.2], [2450, -125.4, 24.2]],
  'nuna': [[1800, -121.9, 25], [1610, -121.9, 27], [1602, -124.7, 24.6], [1586, -133.2, 15.5],
    [1546, -135.5, 14.7], [1450, -145.9, 18]],
  'rodinia': [[1100, 163.8, 29.5], [1068, 162.5, 24.2], [1012, 151.4, 5.7], [960, 133.4, -3.5],
    [916, 119.6, -6.5], [888, 119.3, -5.3], [816, 123.4, -9.5], [740, 124.9, -9.3], [724, 132.5, -8.5],
    [720, 135.5, -8.5]],
  'laurentia': [[750, 123.8, -8.8], [733, 127.3, -8.3], [673, 164.3, -11.3], [649, 166.9, -12.3],
    [637, 175.6, -14.3], [629, -169.9, -15.3], [621, -161, -19], [605, -155.4, -20.3], [580, -150.9, -16.8],
    [561, -150.6, -12.3], [551, -151.5, -7.4], [546, -150.3, -4.6], [540, -149.1, -2.5],
    [540, 'north_america', -97, 55]],
  'baltica': [[600, -136.6, -59.3], [589, -112, -58.3], [579, -92.5, -46.8], [572, -88.2, -37.3],
    [560, -83.9, -31.3], [557.016, -81.3, -27.8], [557, -83.7, -31.8], [555, -83.4, -33.5],
    [548, -74.3, -27.4], [540, -64.1, -28], [540, 'eurasia', 36, 58]],
  'siberia': [[720, 176, 14], [709, -169.5, 16], [689, -158.5, 18.5], [645, -124.9, 14.5],
    [613, -105.4, 4.5], [589, -101.9, 3.5], [564, -99.4, 5.8], [550, -97, 3.1], [540, -91.8, 0.9],
    [540, 'eurasia', 104, 63]],
  'gondwana': [[570, 127.2, -51.8], [548, 119, -52], [528, 132, -51.8], [512, 155.9, -51.8],
    [498, 162.3, -51.8], [458, 142.1, -51.8], [444, 126, -49.8], [438, 119.8, -49], [428, 123.5, -51.8],
    [422.016, 116.6, -52.8], [422, 124.3, -48.8], [418, 123.9, -45.3], [410, 119.2, -51.8],
    [398, 134.1, -50.8], [388, 136.1, -51.1], [376, 145.4, -51.8], [350, 142.2, -52.3], [342, 146.6, -60.4],
    [341, 148.7, -59.3], [340, 28.1, -64.6], [338, 14.4, -52], [304, 10.7, -52], [274, 8.4, -47.8],
    [248, 10.5, -45], [208, 22.5, -32], [176, 19.9, -29.3], [160, 16.7, -32]],
  'avalonia': [[480, 'avalonia', -1.6, 52.3]],
  'laurussia': [[425, -101.7, -11.4], [419, -99.2, -12.6], [409, -82.6, -20.4], [391, -80, -20.4],
    [361, -66.6, -19.1], [345, -49.1, -10.4], [335, -37.3, -0.4]],
  'pangaea': [[335, -1.7, -31.5], [325, 0.8, -25.7], [297, 4.9, -19.2], [277, 8, -12.5], [227, 10.1, -1.5],
    [187, 9.1, 8.5], [175, 11.1, 8.5]],
  'cimmeria': [[280, 59.2, -23.4], [254, 63.2, -13.4], [246, 66.4, -6.4], [226, 73.8, 20.6],
    [214, 77.9, 35.6], [200, 82.3, 45.6]],
  'laurasia': [[200, 32.2, 54.7], [165, 53.2, 52], [147, 58.1, 44.2], [113, 59.6, 53], [79, 42.7, 54.5],
    [57, 38.6, 53.2], [56, 38.1, 53.7]],
  'west-gondwana': [[160, -8.3, -16.4], [137, -9.8, -14.1], [119, -11.9, -8.9], [109, -14.1, -8.1],
    [105, -13.9, -5.9]],
  'east-gondwana': [[160, 61.5, -40], [146, 58.7, -45], [130, 57.3, -43]],
  'barberton-s2': [[3259, -83.5, 0.8], [3072, -83.1, 2.1], [3047.688, -83.2, 0.8]],
  'fortescue-lip': [[2780, -98.1, -9.2], [2670, -99.9, -10.4], [2630, -99.6, -10.1]],
  'matachewan-lip': [[2480, -130, 22.2], [2341.432, -128.5, 23.3]],
  'yarrabubba': [[2229, -95.1, -4.6], [2090.432, -94.5, -3.3]],
  'bushveld-complex': [[2061, -90.5, -13.6], [1922.432, -89.1, -11.7]],
  'vredefort': [[2023, -90.1, -13.3], [1884.432, -88.9, -11.3]],
  'trans-hudson-orogeny': [[1900, -121.1, 13.1], [1761.432, -123.1, 12.2]],
  'trans-hudson-orogeny/path': [
    [[1900, -118.9, 14], [1761.432, -120.7, 13.5]],
    [[1900, -121.1, 13.1], [1761.432, -123.1, 12.2]],
    [[1900, -117.7, 5.8], [1858, -118.2, 5.6], [1850, -119.5, 5.1], [1802, -119.7, 4.8], [1778, -121.2, 4.1],
      [1761.432, -120.8, 4]],
    [[1900, -124.1, 4.4], [1874, -124.1, 4.1], [1761.432, -125.7, 2.5]],
    [[1900, -132.7, 9.2], [1761.432, -135.9, 5.8]],
    [[1900, -125, 4.1], [1802, -127.5, 2.4], [1794, -128.7, 1.9], [1761.432, -129.8, 1.3]],
  ],
  'sudbury': [[1849.5, -138.8, 25.1], [1710.932, -144.1, 23.5]],
  'mackenzie-lip': [[1270, -139.2, 24.3], [1118, -174.5, 42.5], [1085.385, -176.8, 42.3]],
  'midcontinent-rift': [[1109, 159.1, 28.5], [1082, 158.8, 26.9], [1034, 155.5, 13.8], [982, 146.2, 1.2],
    [968.25, 141.7, -1.2], [968.016, 141.8, -1.6], [968, 144.3, -1.6], [949.015, 137.8, -4.2]],
  'grenville-orogeny': [[1090, 156.9, 22.8], [1057, 155.1, 14.6], [1009, 147.1, 1], [961, 133.8, -8.2],
    [936.203, 125.4, -10.3]],
  'grenville-orogeny/path': [
    [[1090, 131.2, 28.5], [1033, 131.5, 23.1], [977, 127.7, 18.5], [936.203, 123.2, 17.2]],
    [[1090, 142.7, 24.6], [1065, 142.3, 20.8], [1025, 138.7, 12.8], [981, 131.2, 6.4], [937, 121.3, 3.8],
      [936.203, 121.1, 3.8]],
    [[1090, 151.8, 22.4], [1073, 151.3, 19.6], [1033, 146.9, 8.5], [993, 138.6, -0.4], [957, 128.4, -5.4],
      [936.203, 121.8, -6.5]],
    [[1090, 162, 20.6], [1073, 161.4, 17.1], [1041, 157.5, 6.2], [1009, 150.8, -3.6], [973, 140, -12.1],
      [936.203, 126.2, -16.6]],
    [[1090, 169.4, 19.3], [1073, 168.7, 15.5], [1033, 163.2, 0.9], [993, 153.5, -11.8], [953, 139.3, -20.8],
      [936.203, 132.2, -23]],
  ],
  'franklin-lip': [[720, 159.3, -8.7], [707, 166.7, -9.2], [682.264, -177, -12.8]],
  'pan-african-orogeny': [[650, 81.9, 3.2], [601, 87.4, 0.7], [597, 87.9, -2.3], [593, 89.9, -8.6],
    [585, 98.7, -23.7], [581, 104.2, -29.1], [579, 109.8, -32.9], [573, 124.2, -37.9], [569, 126.9, -38.4],
    [546, 108.7, -46.5], [540, 109, -47.7], [540, 'africa', 37, -6]],
  'pan-african-orogeny/path': [
    [[650, 93.7, -43.3], [613, 82.5, -40.6], [601, 81.4, -40.3], [597, 82.3, -40.8], [585, 95.5, -44.1],
      [573, 108, -42], [568, 108.1, -41.8], [562, 99.4, -42.9], [550, 80, -45.2], [544, 71.8, -46.8],
      [540, 71.1, -48], [540, 'arabia', 43, 22]],
    [[650, 80.2, -36], [613, 71, -32.2], [601, 70.1, -31.7], [597, 70.8, -32.3], [585, 79.7, -37],
      [573, 88.7, -37.8], [567, 88.7, -38], [553, 74.9, -44.4], [544, 68.1, -49.7], [540, 68.7, -51.8],
      [540, 'africa', 36.5, 20]],
    [[650, 55.8, 22.6], [617, 64.9, 14.9], [601, 66.2, 13.2], [597, 66.8, 10.6], [593, 69.7, 0.7],
      [589, 74, -9.6], [585, 79.6, -19.2], [578, 94.1, -33.2], [574, 105.3, -38.6], [571, 110.4, -40.1],
      [567, 109.7, -40.5], [551, 94.5, -45.7], [543, 89.8, -48.9], [540, 90.8, -49.5],
      [540, 'africa', 38.5, 6]],
    [[650, 73.6, 20.5], [621, 80.8, 8.1], [609, 82, 4.6], [601, 82.2, 3.8], [597, 82.7, 1.6],
      [593, 85, -6.7], [589, 88.9, -15.3], [585, 94.5, -23.2], [578, 108.8, -34], [573, 121.6, -38.1],
      [570, 124.4, -38.5], [565, 121.8, -39.6], [550, 107.9, -45.6], [543, 104.4, -48.2],
      [540, 105.5, -48.6], [540, 'africa', 37, -3.5]],
    [[650, 81, -0.6], [609, 85.1, -2.5], [601, 85.2, -2.6], [597, 85.8, -4.8], [593, 88.8, -13.1],
      [589, 93.8, -21.6], [585, 100.7, -29.1], [578, 118.3, -38.3], [573, 133.1, -40.4], [570, 136.2, -40.7],
      [565, 133.8, -41], [549, 121, -44.1], [542, 118.7, -44.7], [540, 119.6, -44.5],
      [540, 'africa', 36.5, -14]],
  ],
  'central-iapetus-magmatic-province': [[620, -164.5, -38.4], [597, -158.8, -39.4], [569, -149.4, -33],
    [557, -145.8, -27.2], [550, -145.9, -24.4]],
  'acraman': [[580, 123.2, 0.6], [570, 122.9, -4], [553, 119.8, -1.2], [552.477, 120.5, -0.7]],
  'wrangellia-lip': [[233, -54.2, 19.8], [218.577, -59.1, 17.1]],
  'ontong-java-plateau': [[122, -150, -25], [108, -150, -22]],
  'kerguelen-plateau': [[119, 53, -53.3], [95, 50.4, -55.8]],
  'caribbean-lip': [[95, -64.2, 6.1], [83.142, -67.5, 5.3]],
};
// </generated:tracks>

/** The tables of this file (read-only by convention), for tools and tests. */
export const paleoData = Object.freeze({
  oceans: OCEANS, lands: LANDS, features: FEATURES, routes: ROUTES, tracks: TRACKS,
  limits: Object.freeze({ MAX_OCEANS, MAX_FEATURES, FEATURE_MIN_S, FADE_S }),
});
