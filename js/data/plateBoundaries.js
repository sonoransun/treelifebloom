// Tectonic plate boundaries from the first subduction zones (~3.2 Ga) to today.
//
// Read by js/engine/plateBoundaryInterpolator.js → getBoundariesAtTime(timeMa). Every boundary is
// described ONCE, attached to the plates of js/data/continents.js, with the interval in which it
// existed; the engine carries it to where the continents stand at any moment, so trenches stay on
// their margins and ridges in the middle of their oceans without per-keyframe redrawing.
//
// SOURCES. Present-day lines: Bird (2003), "An updated digital model of plate boundaries", G³ 4(3)
// 1027 (PB2002), simplified to ~0.5° (ridges ~0.9°). History: textbook tectonics (Scotese, Torsvik &
// Cocks 2017, Domeier & Torsvik 2014, Cawood 2005) checked against the continental model itself —
// spans follow WHEN the model's blocks actually meet or part (e.g. Avalonia reaches Baltica only at
// ~330 Ma here, and Iberia never leaves Africa), so a line never contradicts the drawn geography.
// Older than ~540 Ma everything is schematic, drawn on the schematic continents, and says so.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// ENTRY FORMAT
// ─────────────────────────────────────────────────────────────────────────────────────────────
//   {
//     id:      'mid_atlantic'          unique; output pieces are '<id>', '<id>~1', …
//     type:    'divergent' | 'convergent' | 'transform'
//     name:    'Mid-Atlantic Ridge'    or a schedule [[untilMa, name], …, [null, name]]: the first row
//                                      whose untilMa ≥ t applies ('' = no name). Optional.
//     span:    [fromMa, toMa]          when it exists (default: always / until today)
//     fade:    [inMyr, outMyr]         birth and death ramps (default 6 Myr each). While being born a
//                                      line GROWS from `grow` ('start' | 'middle' | 'end' of its
//                                      vertex list; default 'middle') and while dying it retracts
//                                      towards `shrink`; output carries opacity = share drawn.
//     ride:    how it moves — see RIDES
//     v / vA / vB / keys               geometry, flat [lon, lat, lon, lat, …]
//     at, frame, w, off, opacity       optional, see below
//     parts:   [ { …same fields… } ]   stretches with their own ride/span/geometry; a part inherits
//                                      ride, at, frame, w, off and opacity from the entry. Parts that
//                                      are fully grown and meet (< 4°) are drawn as one line.
//   }
//
// RIDES
//   ride: 'india'            ONE PLATE. v is given in present-day coordinates on that plate and turns
//                            with it. A vertex on (or within 4° of) a block that hangs off the plate
//                            rides that block ('eurasia' near Japan rides 'japan'); a vertex with no
//                            land near it takes the block of its nearest neighbour along the line.
//                            NB: north_america hangs off eurasia and australia off antarctica, so name
//                            the most specific block (or pin with `at`) when that matters.
//   ride: ['a', 'b']         TWO PLATES. Each vertex is carried by both plates and drawn part-way
//                            between the two copies. With vA (on a's margin) and vB (on b's margin)
//                            the copies are those conjugate points; with only v both copies start at
//                            the same point (a suture or cut line between two blocks).
//                              w    share of the way from a's copy to b's (default 0.5: a ridge in the
//                                   middle of its ocean, a suture on the seam).
//                              off  degrees: stay this far from a's copy (but never past w), i.e. a
//                                   trench just off the overriding plate a of a closing ocean that
//                                   ends on the suture when the two collide.
//                            With v AND vA/vB (present-day ridges): each vertex keeps its present share
//                            of the way across and its offset from the coast-to-coast line, scaled with
//                            the width of the ocean — exact today, closing onto the seam back in time.
//   no ride                  FIXED map coordinates (open ocean with nothing to hold on to): v, or
//                            keys: [[Ma, flat], …] with the same vertex count, slerped per vertex.
//
//   at: [lon, lat]           pins the carrier: the whole line turns with the block under that
//   (pairs: [[a], [b]],      present-day point (null for one side keeps the default). The carrier's
//    null allowed)           pose is recovered from two probes 1.5° apart that plateToWorld carries:
//                            exact in the rigid-plate regime; before 540 Ma it is how that part of the
//                            schematic continent the point descends from turns as the continent
//                            changes shape — that is how a deep-time line follows "its" craton (pick
//                            `at` deep inside it; a point's lineage is plateToWorld's, see
//                            continents.js section 4, so re-check the `at` points when it changes).
//   frame: Ma                the coordinates are drawn on the map of that moment (on the schematic
//                            continents of a deep-time slice, say) and turned back to present-day
//                            coordinates once, through the carrier. Without `at` the plate's own
//                            default probes are used.
//   opacity: 0..1            a fainter line (conjectural Archean ones); multiplied into the output.
//
// CONVENTIONS
//   Convergent lines are drawn with the OVERRIDING plate on their LEFT (looking along the vertex order
//   on a north-up map) — renderers put the teeth on that side. Pairs used for trenches list the
//   overriding plate first. Longitudes may run past ±180 within a line (they are taken the short way).
//
// HOW TO ADD A BOUNDARY
//   1. Present-day: take the PB2002 trace, choose the plate(s) it rides and its span.
//   2. Older oceans: give the two facing margins as vA/vB (present-day coastline points of each plate,
//      in matching order) and a span from the moment the margins part (ridge) or until they meet
//      (trench with `off`, then suture). Check WHEN they meet in the continental model, not in a book.
//   3. Deep time: draw it on the map of a slice (`frame`) along the schematic outlines, and pin each
//      side with `at` to a present-day point whose plateToWorld lineage lands deep inside that
//      continent at that slice and stays nearly rigid over the span (two probes 1.5° apart should
//      keep their spacing to within ~0.5°).
//   4. Look at it: a geometry sheet every 20 Ma through its span (it must hug the right margin, stay
//      off land unless it is a rift or collision belt, and never streak), then the real map and globe.
//   Keep the total modest: at most ~45 lines and ~900 vertices on screen at any moment (the busiest
//   moment now, the late Cenozoic: 45 lines, ~690 vertices).
//
// The geometry below was generated by an offline script (coastline offsets, conjugate margins from the
// model, deep-time facing coasts) that is not part of the runtime; it can equally be edited by hand.
//
// Plate tectonics in the modern sense is not evident before ~3.2–3.0 Ga (the oldest subduction-like
// signatures in the Kaapvaal and Pilbara cratons); before TECTONICS_START_MA there are no boundaries.

export const TECTONICS_START_MA = 3200;

export const boundaries = [

  // ==============================================================================================
  // PRESENT-DAY BOUNDARIES (and their Cenozoic–Mesozoic history)
  // ==============================================================================================
  // Opens in stages: the Central Atlantic first (~190 Ma), then the South Atlantic unzipping from
  // the south (~132–100 Ma), the North Atlantic off Iberia (~120 Ma) and finally between Greenland
  // and Europe (~56 Ma). Each stretch rides its two plates, midway between their conjugate margins.
  {
    id: 'mid_atlantic', type: 'divergent', name: 'Mid-Atlantic Ridge',
    parts: [
      // South Atlantic: South America | Africa.
      {
        span: [132, 0], fade: [32, 0], grow: 'start', ride: ['south_america', 'africa'],
        v: [-0.4, -54.9, -5.2, -50.2, -9.7, -49.2, -10.5, -47.1, -13.3, -47.6, -16.3, -43.4, -17.7, -35.7, -15.1, -35.2, -13.2, -32.1, -13.8, -22.8, -11.8, -22.2, -15, -11.9, -13, -11.4, -13.6, -7.4, -11.2, -6.8, -12.2, -1.9, -15.4, -1.5, -16.5, 0.3, -24.6, -1.1, -26.5, 1.2, -29.9, 0.8, -33.6, 6.6, -40.1, 8.2, -41.1, 10.8, -43.9, 10.9, -45.1, 15.3, -46.8, 15.5],
        vA: [-65.5, -55.2, -65.1, -54.8, -65, -54.7, -65, -54.7, -62.7, -50.6, -54.4, -38.8, -45.5, -26.9, -41.7, -22.7, -40.8, -21.2, -39.7, -18.9, -38.2, -15.7, -36.1, -11.2, -35, -8.6, -34.8, -7.7, -34.7, -7.3, -35.8, -10, -38.1, -15.3, -39.1, -16.7, -37.8, -12.9, -35.9, -8.2, -36.5, -5.1, -40.1, -3.1, -45, -1.1, -49, 1.5, -51.4, 3.9, -52.8, 5.2, -54, 5.8],
        vB: [19.6, -34.8, 18.7, -34.3, 18.3, -33.7, 18.1, -33.4, 18.3, -33.7, 18.3, -33.7, 18, -33, 17.9, -32.6, 16.2, -29, 13.2, -21.7, 11.8, -17.5, 11.8, -16.4, 11.8, -15.8, 8.3, -10.8, -0.2, -0.5, -7.7, 5.3, -11.7, 7, -13.8, 8.9, -15.7, 11.1, -16.6, 12.2, -16.8, 12.8, -17.2, 15.6, -17.2, 19.4, -17.1, 21, -17.1, 21.2, -17, 21.7, -17, 21.9],
      },
      // Central Atlantic: North America | Africa.
      {
        span: [192, 0], fade: [14, 0], ride: ['north_america', 'africa'],
        v: [-46.8, 15.5, -44.9, 23.6, -46.5, 23.9, -42.7, 30.1, -39.4, 33.8, -34.7, 35, -29.8, 39.4],
        vA: [-80.4, 25.2, -77, 33, -70.8, 38.7, -59.4, 44.4, -53.1, 46.7, -53, 46.9, -52.6, 47.5],
        vB: [-17.6, 14.7, -17.2, 19.4, -17.1, 21, -17.1, 21.2, -17, 21.7, -16.4, 23, -14.4, 26.3],
      },
      // North Atlantic south of the Charlie-Gibbs fracture zone: North America | Iberia and Europe.
      {
        span: [124, 0], fade: [34, 0], grow: 'start', ride: ['north_america', 'eurasia'],
        v: [-29.8, 39.4, -27.8, 48.6, -30, 52, -35.1, 52.7, -35.5, 54.3],
        vA: [-53.1, 46.7, -52.8, 47.6, -52.8, 48.1, -52.7, 47.8, -52.6, 47.5],
        vB: [-9.5, 38.7, -9.4, 49.6, -9.6, 53.6, -8.6, 55.1, -5, 58.6],
      },
      // Reykjanes, Kolbeinsey, Mohns and Knipovich ridges: Greenland | Europe.
      {
        span: [56, 0], fade: [8, 0], grow: 'start', ride: ['north_america', 'eurasia'],
        v: [-35.5, 54.3, -29.4, 60.1, -23.3, 63.7, -19.2, 63.9, -17.4, 64.7, -16.5, 66.2, -19.1, 67.1, -11.4, 71.8, -3.7, 71.4, 9, 73.8, 7.8, 78.2],
        vA: [-43.4, 60.1, -40.3, 63.5, -34.7, 66.4, -29.4, 68.1, -27.7, 68.5, -27.7, 68.5, -26.3, 69.8, -22.6, 72.5, -19.6, 74.8, -17.7, 77.4, -12.2, 81.3],
        vB: [-9.2, 52.8, -8.5, 54.8, -6.3, 57.4, -5, 58.6, -2.7, 59.5, -0.3, 60.4, 0.8, 61.1, 6.1, 63.2, 12.3, 65.9, 15.5, 70.4, 13.8, 77.4],
      },
    ],
  },
  // The slowest spreading ridge on Earth, opening the Eurasia Basin of the Arctic Ocean.
  {
    id: 'gakkel', type: 'divergent', name: 'Gakkel Ridge', span: [56, 0], fade: [10, 0],
    grow: 'start', ride: ['north_america', 'eurasia'],
    v: [7.8, 78.2, -2.3, 80.4, -7.2, 82.9, 4, 84.6, 21.3, 85.8, 61.5, 86.8, 98.6, 85, 115.3, 83.2, 125.7, 78.1],
    vA: [-18.5, 77, -18.1, 80.1, -20.9, 82.3, -35, 83.5, -60.4, 83.5, -79.5, 82.9, -98.8, 81.4, -130.6, 78.1, -161.9, 70.3],
    vB: [11.2, 78.9, 12.9, 79.8, 18.4, 80.4, 22.3, 80.7, 36.9, 80.4, 64.6, 79.9, 86.8, 80.4, 101, 80.2, 111.1, 76.7],
  },
  // Africa | Antarctica, since East Gondwana parted from West Gondwana.
  {
    id: 'sw_indian', type: 'divergent', name: 'Southwest Indian Ridge', span: [138, 0],
    fade: [22, 0], grow: 'start', ride: ['africa', 'antarctica'],
    v: [-0.4, -54.9, 3, -53.7, 7.8, -54.4, 12.9, -52, 28.1, -52.9, 35.2, -44.9, 41.6, -43.6, 46.2, -38.9, 52.3, -37.4, 54.3, -34.5, 57.1, -33.6, 57.2, -31.8, 60.8, -30.5, 60.8, -28.9, 70, -25.7],
    vA: [18.2, -31.7, 16.2, -27.5, 17.3, -31.1, 18.7, -34.3, 20.9, -34.4, 24.9, -33.9, 31.8, -31.3, 40.6, -27.3, 45.5, -25.3, 46.7, -25.1, 47.1, -24.9, 47.1, -24.9, 47.8, -22.9, 49.3, -18.6, 50.4, -15.7],
    vB: [7.7, -69.9, 7.7, -69.9, 10.3, -70, 19.7, -69.8, 35.7, -68.7, 49.8, -66.8, 55.7, -66, 56.4, -66, 64.1, -66.6, 80.2, -66.8, 88, -66.2, 88, -66.2, 88, -66.2, 88, -66.2, 88, -66.2],
  },
  // West of ~100°E it descends from the ridge that pushed India away from Antarctica (~130 Ma);
  // further east Australia parts from Antarctica, slowly from ~90 Ma and fast after ~45 Ma.
  {
    id: 'se_indian', type: 'divergent', name: 'Southeast Indian Ridge',
    parts: [
      {
        span: [130, 0], fade: [12, 0], ride: ['india', 'antarctica'],
        v: [70, -25.7, 74.4, -28.3, 78.1, -33.2, 79.2, -36.5, 77.8, -40.3, 80, -41.9, 80.9, -41.1, 83.4, -42.9, 85.9, -40.8, 99.6, -48],
        vA: [80.3, 6, 86.4, 14.2, 83.3, 10.1, 80.3, 6, 80.3, 6, 80.3, 6, 80.6, 6.1, 81.3, 6.4, 81.6, 6.5, 81.6, 6.5],
        vB: [53.6, -65.9, 56.8, -68.4, 77.8, -68, 88, -66.2, 88, -66.2, 88, -66.2, 82.3, -66.8, 74.9, -67.4, 83.5, -67.4, 102.8, -65.6],
      },
      {
        span: [90, 0], fade: [24, 0], grow: 'start', ride: ['australia', 'antarctica'],
        v: [99.6, -48, 111.7, -50.1, 120.3, -50, 120.8, -48.9, 125.9, -49.7, 126.4, -48.6, 130.6, -50.5, 139.6, -50.3, 140.7, -53.9, 146.9, -54.7, 151.3, -60.4, 153.6, -59.9, 156.5, -62.9, 161.2, -61.5],
        vA: [115, -34.2, 116.5, -34.8, 117.6, -35.1, 119.4, -34.8, 122.3, -34.2, 127.7, -35.1, 137.4, -38.7, 144.8, -42.2, 151.4, -44.5, 161.6, -45.9, 166.7, -46.2, 166.7, -46.2, 167.3, -46.3, 169.3, -46.6],
        vB: [102.8, -65.6, 110.9, -65.9, 116, -66.1, 120.8, -66.4, 123.2, -66.5, 123.2, -66.5, 126.3, -66.3, 132.2, -65.7, 135.1, -65.3, 137.6, -65.8, 142.8, -66.6, 147.6, -67.4, 152, -68.2, 154.3, -68.6],
      },
    ],
  },
  // Africa (Somalia, Madagascar) | India since India left Madagascar (~88 Ma).
  {
    id: 'central_indian', type: 'divergent', name: 'Carlsberg – Central Indian Ridge',
    span: [88, 0], fade: [12, 0], ride: ['africa', 'india'],
    v: [58.2, 12.7, 57, 9.9, 62.9, 3.9, 66.4, 2.8, 68.7, -3.8, 68, -8.5, 65.7, -12, 67.4, -16.7, 65, -18.1, 68.6, -20.7, 70, -25.7],
    vA: [51, 10.6, 49.4, 7.1, 48.1, 4.9, 48.1, 0.2, 49, -8.4, 49.9, -13.2, 50.2, -14.1, 50.2, -15.5, 50.1, -16.3, 49.5, -18.3, 47.1, -24.9],
    vB: [70.5, 20.9, 72.1, 17.9, 75.1, 11.9, 77.5, 8.2, 79.4, 6.7, 80.3, 6, 80.3, 6, 80.6, 6.1, 80.9, 6.3, 80.9, 6.3, 81.6, 6.5],
  },
  // Arabia tears away from Africa.
  {
    id: 'red_sea', type: 'divergent', name: 'Red Sea – Gulf of Aden', span: [30, 0], fade: [10, 0],
    grow: 'start', ride: ['africa', 'arabia'],
    v: [56.3, 14.6, 52.1, 14.7, 51.3, 13.1, 42, 11.6, 40.1, 13.2, 40.6, 13.7, 39.7, 15.8, 40.3, 17.3, 34.3, 27.9, 35, 30],
    vA: [49.2, -12, 50.6, 6.1, 50, 9.7, 46.8, 4.5, 35.9, 1.7, 25.4, 5.8, 31.8, 13, 38, 18.8, 35, 25.3, 32.4, 29.9],
    vB: [55.3, 17.2, 53, 16, 49.8, 15.5, 45, 15.3, 42.6, 15.2, 42.6, 15.6, 42.6, 16.4, 40.7, 19.6, 40, 25.9, 48, 30],
  },
  // Continental rifts inside Africa: the eastern (Ethiopian–Kenyan) branch from ~25 Ma, the western
  // branch from ~12 Ma.
  {
    id: 'east_african_rift', type: 'divergent', name: 'East African Rift', span: [25, 0],
    fade: [10, 0], grow: 'start', ride: 'africa',
    v: [41.8, 11.8, 40.5, 10, 39.5, 8.4, 38.4, 7, 37.2, 5.4, 36.2, 3.4, 36, 1, 36.1, -1.5, 35.9, -3.5, 35.6, -5.2],
  },
  {
    id: 'east_african_rift_west', type: 'divergent', span: [12, 0], fade: [6, 0], grow: 'start',
    ride: 'africa',
    v: [31, 2.2, 29.9, 0.3, 29.4, -1.5, 29.3, -3.6, 29.7, -6, 30.8, -8.1, 32.4, -8.8, 33.9, -10.2, 34.5, -12.2, 34.9, -14.4, 35.3, -16.5],
  },
  // Born when Zealandia parted from Marie Byrd Land (~83 Ma): its western half lies midway between
  // New Zealand and Antarctica, its eastern half is carried by Antarctica.
  {
    id: 'pacific_antarctic', type: 'divergent', name: 'Pacific–Antarctic Ridge',
    parts: [
      {
        span: [70, 0], fade: [20, 0], grow: 'end', ride: 'antarctica',
        v: [-110.8, -35.1, -111, -42.2, -113.9, -49.8, -116.4, -49.4, -118.6, -54.8, -120.7, -54.4, -121.9, -56, -137.9, -53.6, -140.3, -57.1, -144.9, -55.8, -156.7, -63.3],
      },
      {
        span: [82, 0], fade: [16, 0], grow: 'start', ride: ['new_zealand', 'antarctica'],
        v: [-156.7, -63.3, -166.6, -62.5, -170, -64.9, -178.8, -66.2, -198.8, -61.5],
      },
    ],
  },
  {
    id: 'chile_rise', type: 'divergent', name: 'Chile Rise', span: [20, 0], fade: [8, 0],
    v: [-109.3, -34.5, -94.1, -37, -91.4, -41.1, -83.8, -41.1, -81.9, -45, -78.2, -44.4, -76, -45.7],
  },
  // Splits the old Farallon plate into Cocos and Nazca (~23 Ma).
  {
    id: 'galapagos', type: 'divergent', name: 'Galápagos Rift', span: [23, 0], fade: [6, 0],
    v: [-101.5, 2.2, -85.4, 0.8, -84.5, 3.1, -82.8, 3.1, -82.9, 7.4],
  },
  // The last northern remnant of the Pacific–Farallon ridge; it stays off the Pacific Northwest.
  {
    id: 'juan_de_fuca', type: 'divergent', name: 'Juan de Fuca Ridge', span: [30, 0], fade: [8, 0],
    ride: 'north_america',
    v: [-124.7, 40.3, -127.6, 40.5, -126.6, 43, -130.5, 44.6, -128.9, 48.9, -130.5, 49.5, -130.8, 51.6],
  },
  // Subduction under western South America through the whole Phanerozoic: the Terra Australis
  // margin of Gondwana, then the Andes.
  {
    id: 'andes', type: 'convergent',
    name: [[80, 'Peru–Chile Trench'], [300, 'Andean margin'], [null, 'Terra Australis margin']],
    span: [548, 0], fade: [10, 0], ride: 'south_america',
    v: [-78, 6, -81.2, -0.3, -82, -6, -78.1, -13.4, -71.2, -21.3, -76.5, -52.1],
  },
  // Western North America: the Cordilleran margin (from the Antler arc, ~370 Ma), the Farallon
  // trench of the Mesozoic, and what is left of it today — Cascadia and the Middle America Trench.
  // The Californian stretch gives way to the San Andreas Fault from ~28 Ma, the British Columbian
  // one to the Queen Charlotte Fault.
  {
    id: 'cordillera', type: 'convergent',
    name: [[30, null], [200, 'Farallon Trench'], [null, 'Cordilleran margin']],
    ride: 'north_america',
    parts: [
      {
        span: [370, 38], fade: [20, 8], shrink: 'start',
        v: [-144.7, 58.5, -141.9, 59.5, -140.9, 59.5, -132.2, 51.2],
      },
      {
        name: [[30, 'Cascadia Subduction Zone'], [null, '']], span: [370, 0], fade: [20, 0],
        v: [-130.8, 51.6, -126.1, 47.4, -124.7, 40.3],
      },
      {
        span: [370, 20], fade: [20, 10], shrink: 'end',
        v: [-125.9, 39.6, -124.1, 37.4, -122.2, 35.3, -120.3, 33.3, -118.6, 31.5, -117.1, 29.6, -115.8, 27.6, -114.4, 25.7, -112.8, 23.8, -111.1, 22, -106.6, 20.2],
      },
      {
        name: [[30, 'Middle America Trench'], [null, '']], span: [130, 0], fade: [20, 0],
        at: [-100, 24],
        v: [-105.2, 18.8, -103.8, 17.3, -102, 16.6, -100.2, 15.8, -98.3, 15.2, -96.3, 14.9, -94.3, 14.8, -94, 14.9],
      },
      // Central America only reached its place after ~100 Ma; it rides the Yucatán block.
      {
        span: [100, 0], fade: [20, 0], grow: 'start',
        v: [-94, 14.9, -88.3, 11.7, -82.9, 7.4],
      },
    ],
  },
  // The Aleutian arc grows west from Alaska after ~55 Ma; under southern Alaska the Kula and
  // Pacific plates have been subducting since the Jurassic.
  {
    id: 'aleutian', type: 'convergent', name: 'Aleutian Trench', ride: 'north_america',
    parts: [
      {
        span: [55, 0], fade: [12, 0], grow: 'end',
        v: [164.1, 55.2, 173, 51.7, 182.9, 50.5, 203.9, 54.5],
      },
      {
        span: [180, 0], fade: [16, 0],
        v: [203.9, 54.5, 211.7, 57.3, 214.2, 59.3],
      },
    ],
  },
  // The Paleo-Pacific (Izanagi) and Pacific plates have dived under East Asia since the Permian;
  // the Kuril–Kamchatka arc is younger.
  {
    id: 'japan_kuril', type: 'convergent',
    name: [[25, 'Japan – Kuril Trench'], [null, 'Paleo-Pacific Trench']], ride: 'eurasia',
    parts: [
      {
        span: [250, 0], fade: [20, 0],
        v: [141.9, 34.2, 143.8, 37.7, 144.5, 40.8],
      },
      {
        span: [100, 0], fade: [20, 0], grow: 'start', ride: 'kolyma', at: [159, 56],
        v: [144.5, 40.8, 153.5, 45.9, 162.5, 53, 164.1, 55.2],
      },
    ],
  },
  // Subduction began here ~52 Ma. The Philippine Sea plate is not modelled, so the arc keeps its
  // place off Japan.
  {
    id: 'izu_bonin_mariana', type: 'convergent', name: 'Izu–Bonin–Mariana Trench', span: [52, 0],
    fade: [8, 0], ride: 'japan', at: [139.5, 36],
    v: [138.4, 9.4, 138.8, 11.1, 140.8, 10.9, 145.3, 12.3, 146.8, 13.4, 147.7, 15.7, 147.8, 18.6, 146.8, 21.3, 143.1, 24.9, 141.9, 34.2],
  },
  // The East Asian margin of the Paleo-Pacific: off South China (Ryukyu) and south-west Japan
  // (Nankai).
  {
    id: 'ryukyu_nankai', type: 'convergent',
    name: [[25, 'Ryukyu – Nankai Trench'], [null, 'Paleo-Pacific Trench']],
    parts: [
      {
        span: [200, 0], fade: [20, 0], ride: 'south_china', at: [111, 27],
        v: [125.6, 23.4, 129.4, 26.2, 133.5, 31.5],
      },
      {
        span: [200, 0], fade: [20, 0], ride: 'japan', at: [136, 35.3],
        v: [133.5, 31.5, 138.1, 33.7, 138.7, 35],
      },
    ],
  },
  {
    id: 'philippine', type: 'convergent', name: 'Philippine Trench', span: [10, 0], fade: [5, 0],
    ride: 'south_china', at: [118.5, 9.5],
    v: [129.2, 1.1, 129.2, 2.7, 127.5, 5.5, 126.1, 12.3, 124.9, 14.7],
  },
  {
    id: 'tonga_kermadec', type: 'convergent', name: 'Tonga–Kermadec Trench', span: [45, 0],
    fade: [10, 0], grow: 'start', ride: 'new_zealand',
    v: [175.5, -42.1, 177.6, -41.5, 178.8, -40.1, 183.8, -29.5, 184.9, -24.1, 187.6, -17.7, 187.6, -15.6, 186.6, -14.6],
  },
  {
    id: 'new_hebrides', type: 'convergent', name: 'New Hebrides Trench', span: [12, 0],
    fade: [5, 0], ride: 'australia', at: [145, -6],
    v: [156.3, -8.2, 161.2, -11.2, 165.3, -11.4, 166.3, -15.9, 168.7, -21, 170.1, -22.6, 172.4, -23.2],
  },
  // Ocean floor of the Tethys and then the Indian Ocean dives under Burma, Sumatra and Java; the
  // Banda arc east of Java is young.
  {
    id: 'sunda', type: 'convergent', name: [[50, 'Sunda Trench'], [null, 'Neo-Tethys Trench']],
    ride: 'sibumasu', at: [99.5, 15],
    parts: [
      {
        span: [200, 0], fade: [16, 0],
        v: [97.3, 28.1, 95.4, 26.6, 94.4, 24.6, 93.7, 22.2, 93.7, 19.6, 93, 16.6, 92.1, 13.7, 91.5, 9.6, 93.2, 3.7, 96.1, 1.5, 102.5, -7.2, 106.8, -9.7, 121.1, -11.5],
      },
      {
        span: [20, 0], fade: [10, 0], grow: 'start',
        v: [121.1, -11.5, 131.4, -8.3],
      },
    ],
  },
  // Before India arrived (~50 Ma) the Neo-Tethys dived here under the Lhasa block; since then India
  // ploughs under Tibet.
  {
    id: 'himalaya', type: 'convergent',
    name: [[45, 'Himalayan Front'], [null, 'Neo-Tethys Trench']], span: [200, 0], fade: [16, 0],
    ride: 'tibet',
    v: [72.5, 34.7, 79.2, 29.4, 86.5, 26.7, 93.6, 27.1, 95.5, 28.2, 97.3, 28.1],
  },
  // Neo-Tethys subduction under Iran; Arabia collided along the Zagros from ~30 Ma, the Makran is
  // still an ocean trench.
  {
    id: 'zagros_makran', type: 'convergent',
    name: [[25, 'Zagros – Makran'], [null, 'Neo-Tethys Trench']], span: [200, 0], fade: [16, 0],
    ride: 'iran', at: [55, 32],
    v: [41, 39.1, 44, 37.1, 45.9, 33.4, 48.5, 32.2, 51.3, 28.5, 53.9, 26.7, 56.9, 27.3, 57.8, 24.4, 65, 24.4],
  },
  // Africa dives under the Aegean; north-west of Greece the Adriatic microplate meets the
  // Dinarides.
  {
    id: 'hellenic', type: 'convergent', name: 'Hellenic Arc',
    parts: [
      {
        span: [60, 0], fade: [12, 0], ride: 'west_europe',
        v: [13.8, 45.6, 15.5, 44.8, 17.5, 43.5, 19.2, 42.4, 20, 41.5, 20.6, 40, 20.3, 37.8],
      },
      {
        span: [45, 0], fade: [10, 0], ride: 'west_europe',
        v: [20.3, 37.8, 24.6, 34.3, 27.2, 34.3, 29.7, 35.4],
      },
      {
        span: [45, 0], fade: [10, 0], ride: 'anatolia',
        v: [29.7, 35.4, 33.7, 34.3, 35.6, 36],
      },
    ],
  },
  // The Alpine Tethys closes from ~90 Ma; Adria collides with Europe from ~35 Ma.
  {
    id: 'alps', type: 'convergent', name: [[35, 'Alps'], [null, 'Alpine Tethys Trench']],
    span: [90, 0], fade: [12, 0], ride: 'west_europe',
    v: [16.2, 47.8, 14, 47.2, 12.5, 47.1, 11, 46.9, 9.5, 46.5, 8, 46.3, 6.9, 45.8, 6.5, 44.6, 7.3, 43.8],
  },
  {
    id: 'lesser_antilles', type: 'convergent', name: 'Lesser Antilles', span: [55, 0],
    fade: [10, 0], ride: 'south_america',
    v: [-58.2, 10.2, -57.4, 11.7, -57.9, 14.9, -59.1, 16.9, -61.6, 19],
  },
  {
    id: 'south_sandwich', type: 'convergent', name: 'South Sandwich Trench', span: [25, 0],
    fade: [8, 0], ride: 'south_america',
    v: [-26.1, -60.4, -24, -58.9, -24.2, -57.2, -26.4, -55.4, -29.5, -55],
  },
  {
    id: 'san_andreas', type: 'transform', name: 'San Andreas Fault', span: [28, 0], fade: [6, 0],
    grow: 'end', ride: 'north_america',
    v: [-124.7, 40.3, -119.3, 35, -115.8, 33.4],
  },
  {
    id: 'queen_charlotte', type: 'transform', name: 'Queen Charlotte Fault', span: [40, 0],
    fade: [6, 0], ride: 'north_america',
    v: [-130.8, 51.6, -139.4, 60.1, -142.4, 60.5, -145.8, 59.3],
  },
  {
    id: 'north_anatolian', type: 'transform', name: 'North Anatolian Fault', span: [12, 0],
    fade: [4, 0], ride: 'anatolia',
    v: [41, 39.1, 34.8, 41.1, 25.4, 40.2],
  },
  {
    id: 'dead_sea', type: 'transform', name: 'Dead Sea Transform', span: [18, 0], fade: [5, 0],
    ride: 'arabia',
    v: [35, 30, 35.5, 32.5, 36.4, 36],
  },
  {
    id: 'alpine_fault', type: 'transform', name: 'Alpine Fault', span: [25, 0], fade: [6, 0],
    ride: 'new_zealand',
    v: [161.2, -61.5, 157.6, -57.8, 159.2, -53.6, 163.2, -50.1, 165, -46.6, 167.1, -44.8, 171.5, -42.7, 175.5, -42.1],
  },
  {
    id: 'north_caribbean', type: 'transform', name: 'Cayman Trough', span: [45, 0], fade: [8, 0],
    ride: 'north_america',
    v: [-61.6, 19, -63.4, 19.7, -68.9, 19.6, -72.3, 20.3, -81.8, 18.9, -81.6, 17.8, -88.9, 15.6, -90.9, 12.6],
  },
  {
    id: 'chaman', type: 'transform', name: 'Chaman Fault', span: [30, 0], fade: [6, 0],
    ride: 'iran', at: [62, 33],
    v: [65, 24.4, 67.1, 25.5, 67.3, 29.8, 69.9, 29.3, 69.9, 31.9, 72.5, 34.7],
  },
  {
    id: 'owen', type: 'transform', name: 'Owen Fracture Zone', span: [20, 0], fade: [6, 0],
    ride: 'arabia',
    v: [56.3, 14.6, 59.4, 14.9, 62.1, 22.1, 65, 24.4],
  },
  {
    id: 'azores_gibraltar', type: 'transform', name: 'Azores–Gibraltar Fault', span: [60, 0],
    fade: [10, 0], ride: 'iberia',
    v: [-29.8, 39.4, -23.6, 36.6, -17.6, 37.5, -13.7, 37.4, -11.6, 35.9, -10, 36.7, -5.4, 34, -4.1, 34.2, -2.9, 36, -0.7, 35.8, 6.8, 37.3],
  },
  {
    id: 'scotia_north', type: 'transform', name: 'North Scotia Ridge', span: [30, 0], fade: [8, 0],
    grow: 'start', ride: 'south_america',
    v: [-64, -55.2, -58, -54.2, -50, -53.6, -42, -53.4, -36.5, -53.6, -32, -54.3, -29.5, -55],
  },
  {
    id: 'scotia_south', type: 'transform', name: 'South Scotia Ridge', span: [30, 0], fade: [8, 0],
    grow: 'start', ride: 'antarctica',
    v: [-57, -62.8, -50, -61.3, -45, -60.8, -38, -60.2, -32, -60.5, -26.1, -60.4],
  },
  // The spreading ridge of the eastern Pacific, born with the Pacific plate (~190 Ma). With no
  // continent of its own it is carried by the Americas, so it keeps its distance off their coast;
  // its northern tip opened the Gulf of California only in the last ~6 million years.
  {
    id: 'east_pacific', type: 'divergent',
    name: [[30, 'East Pacific Rise'], [null, 'Pacific–Farallon Ridge']],
    parts: [
      {
        span: [6, 0], fade: [3, 0], grow: 'end', ride: 'north_america', at: [-100, 40],
        v: [-115.8, 33.4, -108, 23],
      },
      {
        span: [180, 0], fade: [25, 0], ride: 'north_america', at: [-100, 40],
        v: [-108, 23, -109.4, 20, -105.4, 17.8, -102.1, 2.6],
      },
      {
        span: [180, 0], fade: [25, 0], ride: 'south_america', at: [-60, -12],
        v: [-102.1, 2.6, -102.7, -4.1, -106.3, -4.5, -108.3, -9.1, -109.8, -8.9, -111, -13.4, -112.4, -13.4, -114.6, -23, -116.5, -25.2, -113, -26.8, -111.7, -29.6, -112.6, -34.3, -110.8, -35.1],
      },
    ],
  },

  // ==============================================================================================
  // EXTINCT BOUNDARIES OF THE MESOZOIC AND CENOZOIC
  // ==============================================================================================
  // Greenland swings away from Labrador and Baffin Island, then stops when it welds to North
  // America (~35 Ma).
  {
    id: 'labrador_sea', type: 'divergent', name: 'Labrador Sea Ridge', span: [62, 33], fade: [6, 5],
    grow: 'start', ride: ['north_america', 'greenland'],
    vA: [-56, 52, -58, 54.5, -61, 56.5, -63.5, 59.5, -64.5, 61.5, -65.5, 64, -66.5, 66.5, -68, 68.5, -70, 70.5, -73, 72],
    vB: [-44.8, 60, -48.3, 60.9, -50.5, 62.5, -51.6, 63.6, -53, 66, -54, 67.2, -53.5, 69.3, -55, 71, -56.5, 73, -58.6, 75.5],
  },
  // The Yucatán block swings out of the Gulf of Mexico.
  {
    id: 'gulf_of_mexico', type: 'divergent', name: 'Gulf of Mexico Ridge', span: [166, 140],
    fade: [6, 6], ride: ['north_america', 'yucatan'],
    vA: [-97.4, 26.5, -96.6, 28.3, -93.8, 29.7, -91, 29.4, -88.5, 30.2],
    vB: [-91.4, 18.9, -90.8, 19.3, -90.3, 21, -88.5, 21.3, -87.1, 21.5],
  },
  // The seaway between the Americas as Pangaea splits; later consumed under the Caribbean arc.
  {
    id: 'proto_caribbean', type: 'divergent', name: 'Proto-Caribbean Ridge', span: [172, 95],
    fade: [10, 15], ride: ['north_america', 'south_america'],
    vA: [-87, 21.5, -84.5, 22.6, -81.2, 24.8, -79.3, 26.5],
    vB: [-75.5, 10.6, -71.4, 11.2, -66.2, 10.6, -61.9, 10.7],
  },
  // A volcanic arc that drifted in from the Pacific and jammed against the Bahamas (~55–45 Ma);
  // Cuba and Hispaniola grew on it.
  {
    id: 'greater_antilles', type: 'convergent', name: 'Great Arc of the Caribbean', span: [90, 45],
    fade: [10, 8], ride: 'north_america',
    v: [-66, 20.2, -70, 20.6, -73.5, 20.9, -77, 22.8, -80.5, 23.9, -84, 23.6, -86.2, 22.2],
  },
  // Madagascar (with India) slides south away from Somalia and Kenya.
  {
    id: 'somali_basin', type: 'divergent', name: 'Somali Basin Ridge', span: [165, 118],
    fade: [10, 6], ride: ['africa', 'madagascar'],
    vA: [45.3, 2, 42.5, -0.5, 40.3, -2.6, 39.2, -4.7, 39.4, -6.8, 39.4, -9.5],
    vB: [49.2, -12, 47.9, -13.7, 46.3, -15.8, 44.4, -16.2, 44, -17.4, 44.5, -19.4],
  },
  // India parts from Western Australia; spreading stops when India hits Asia.
  {
    id: 'wharton', type: 'divergent', name: 'Wharton Ridge', span: [132, 42], fade: [10, 6],
    ride: ['india', 'australia'],
    vA: [85.1, 19.5, 86.5, 20.2, 87, 21.5, 88.9, 21.7, 90.3, 21.8, 91.8, 22.2],
    vB: [115, -34.2, 115.7, -31.6, 115, -29.5, 113.4, -26, 113.8, -24, 114.2, -22.5],
  },
  // Zealandia leaves the Gondwana margin of eastern Australia.
  {
    id: 'tasman', type: 'divergent', name: 'Tasman Sea Ridge', span: [84, 52], fade: [8, 5],
    grow: 'start', ride: ['australia', 'new_zealand'],
    vA: [146.3, -39, 148.3, -37.8, 150, -37.4, 150.3, -35.7, 151.5, -33.5, 153.1, -30.9, 153.6, -28.1],
    vB: [166.7, -46.2, 167, -45.1, 168.3, -44.1, 170.5, -43, 172.1, -41, 172.8, -40.5, 173, -34.5],
  },
  // Iberia turns anticlockwise, opening the Bay of Biscay like a fan.
  {
    id: 'bay_of_biscay', type: 'divergent', name: 'Bay of Biscay Ridge', span: [118, 84],
    fade: [8, 6], grow: 'end', ride: ['west_europe', 'iberia'],
    vA: [-1.4, 43.6, -1.2, 45.5, -2, 46.8, -3.5, 47.6, -4.6, 48.3],
    vB: [-1.8, 43.4, -3.8, 43.5, -5.8, 43.6, -7.5, 43.8, -9, 43.3],
  },
  // Iberia jams into Europe once the Bay of Biscay stops opening.
  {
    id: 'pyrenees', type: 'convergent', name: 'Pyrenees', span: [84, 20], fade: [8, 8],
    ride: ['west_europe', 'iberia'],
    v: [-1.6, 43.3, -0.5, 43, 1, 42.7, 2, 42.5, 3.1, 42.4],
  },
  // From ~290 Ma the Cimmerian ribbon (Iran, Tibet, Sibumasu) peels off northern Gondwana and the
  // Neo-Tethys opens behind it. Each stretch lies midway between Gondwana and its block; the ridge
  // itself is later consumed in the trenches of southern Asia.
  {
    id: 'neo_tethys', type: 'divergent', name: 'Neo-Tethys Ridge',
    parts: [
      {
        span: [262, 165], fade: [12, 25], ride: ['arabia', 'iran'],
        v: [44.2, 38, 45.8, 35.6, 47.6, 32.8, 48.7, 30, 51.4, 28, 54.6, 26.5, 57.3, 26.4],
      },
      {
        span: [266, 150], fade: [12, 25], ride: ['india', 'tibet'],
        vA: [69.5, 35.8, 71.5, 39.2, 74, 42.2, 78.2, 43.9, 82, 44.5, 85.8, 43.1, 89.6, 41.9, 93, 41.4, 96.3, 39],
        vB: [74.1, 35.5, 77.4, 34.1, 78.9, 32.5, 80.7, 31, 83, 30.1, 85.3, 29.4, 87.7, 29.3, 90.9, 29.4, 95.2, 29.5],
      },
      {
        span: [290, 195], fade: [12, 20], ride: ['australia', 'sibumasu'],
        vA: [114.2, -22.5, 116.7, -20.7, 120.9, -19.7, 122.3, -17.3, 124.4, -15.6, 127.1, -13.8, 129.4, -14.4],
        vB: [92.4, 20.7, 94.3, 18.2, 94.2, 16, 97.6, 16.1, 98.8, 11.4, 98.2, 8.4, 100.1, 6.5],
      },
    ],
  },
  // The Paleo-Tethys closes northward under the southern margin of Eurasia while the Cimmerian
  // blocks and South China drift in; each stretch lies just off the Eurasian side of a block it
  // will meet and ends on the suture after the collision (~240–200 Ma).
  {
    id: 'paleo_tethys', type: 'convergent',
    name: [[215, 'Cimmerian suture'], [null, 'Paleo-Tethys Trench']], off: 1.2,
    parts: [
      {
        span: [320, 198], fade: [15, 10], ride: ['eurasia', 'iran'], at: [[62, 41], null],
        v: [53.8, 37.6, 56.2, 37.3, 58.5, 37.6, 60.7, 36.2, 62.4, 35.3, 65.2, 35.3, 67.8, 35.5, 70.3, 35.1, 71.5, 34.6],
      },
      {
        span: [320, 180], fade: [15, 12], ride: ['tarim', 'tibet'],
        v: [74.3, 37.5, 75.9, 37.2, 77.2, 36.4, 78.2, 36, 82.3, 35.5, 85.4, 35.6, 87.7, 35.7, 89.3, 36, 92, 35.7, 92.7, 35.5],
      },
      {
        name: [[212, 'Qinling–Dabie suture'], [null, '']], span: [320, 196], fade: [15, 10],
        ride: ['north_china', 'south_china'],
        v: [101.9, 33.2, 103, 33.3, 104.2, 33.6, 106.7, 33.6, 108.9, 33.4, 111.9, 32.9, 113.4, 32.3, 114.9, 31.7, 117.7, 31.6, 119.7, 34.6],
      },
    ],
  },
  // An ocean between Siberia and Mongolia–Amuria that closed like scissors, from the west (~250 Ma)
  // to the east (~150 Ma).
  {
    id: 'mongol_okhotsk', type: 'convergent', name: 'Mongol–Okhotsk Trench', span: [310, 150],
    fade: [12, 45], shrink: 'end', ride: ['siberia', 'amuria'], off: 1.2,
    v: [87.5, 51, 91, 50.2, 95.1, 50.3, 98, 50.9, 100.9, 50.8, 104.6, 50.3, 107.7, 50.4, 112, 50.1, 116.2, 50.3, 120.8, 52.3, 126.4, 53.1, 131.2, 53.5, 134.8, 54.4, 135.4, 54.9],
  },
  // The last of the Paleo-Asian Ocean closes between Mongolia and North China.
  {
    id: 'solonker', type: 'convergent', name: [[262, 'Solonker suture'], [null, 'Solonker Trench']],
    span: [310, 248], fade: [12, 10], ride: ['amuria', 'north_china'], off: 1,
    v: [95.8, 40.8, 97.9, 41.3, 100, 41.9, 104.2, 41.7, 109.2, 41.9, 112.5, 42.1, 115, 41.9, 117.5, 42.1, 119.8, 42.4, 122, 42.5, 124.1, 42.2, 127.5, 41.6, 130.1, 42.1],
  },

  // ==============================================================================================
  // THE PALEOZOIC: IAPETUS, RHEIC, URALIAN AND THE ASSEMBLY OF PANGAEA
  // ==============================================================================================
  // The Iapetus Ocean opened as Rodinia finished breaking up, between Laurentia and Baltica and
  // between Laurentia and Gondwana (Amazonia); it starts closing ~480 Ma.
  {
    id: 'iapetus_ridge', type: 'divergent', name: 'Iapetus Ridge',
    parts: [
      {
        span: [590, 470], fade: [40, 20], ride: ['north_america', 'eurasia'], at: [null, [30, 60]],
        vA: [-43.4, 60.1, -41.2, 63.5, -39.8, 65.5, -34.2, 66.7, -27.7, 68.5, -22.3, 70.1, -21.6, 74.2, -19.8, 76.1, -18.5, 77, -17.7, 80.1],
        vB: [5.7, 58.6, 5, 62, 8, 63.5, 10.5, 64.5, 12.5, 66.5, 14.5, 68, 16.5, 69, 19.2, 69.8, 23, 70.2, 25.5, 71],
      },
      {
        span: [562, 480], fade: [20, 20], ride: ['north_america', 'south_america'],
        vA: [-81.3, 31.5, -78.9, 33.5, -77.2, 35.5, -76.4, 37.2, -75.9, 38.3, -75, 39.2, -73.5, 40.4, -71.5, 41.8, -69.5, 43.3, -67.5, 44.4, -65.5, 44.7, -63.5, 44.9, -62.1, 45.4, -62.4, 46.3, -64.2, 47.3, -66.3, 48, -68, 48.3, -68.2, 48.6, -66, 49.5, -62.4, 50.5, -58.9, 51.7, -55.8, 53.3],
        vB: [-75.6, -46.6, -74.3, -44.6, -73.5, -43.4, -73.5, -42.7, -73.6, -41.3, -73.4, -39.1, -73.1, -36.7, -72.3, -34.4, -71.5, -32, -71.2, -29.6, -71, -27.2, -70.8, -24.7, -70.7, -22.3, -70.7, -19.9, -71.6, -17.9, -73.4, -16.4, -75.3, -14.8, -76.7, -12.9, -77.9, -10.7, -79.1, -8.6, -80.4, -6.7, -81.4, -4.7],
      },
    ],
  },
  // The Iapetus closes under Laurentia: island arcs and then Baltica and Avalonia collide with it
  // (Taconic and Caledonian orogenies), welding Laurussia together (~430–400 Ma).
  {
    id: 'caledonian', type: 'convergent',
    name: [[425, 'Caledonian orogeny'], [null, 'Iapetus Trench']], off: 1.5,
    parts: [
      {
        span: [490, 395], fade: [20, 15], ride: ['north_america', 'eurasia'], at: [null, [30, 60]],
        vA: [-43.4, 60.1, -41.2, 63.5, -39.8, 65.5, -34.2, 66.7, -27.7, 68.5, -22.3, 70.1, -21.6, 74.2, -19.8, 76.1, -18.5, 77, -17.7, 80.1],
        vB: [5.7, 58.6, 5, 62, 8, 63.5, 10.5, 64.5, 12.5, 66.5, 14.5, 68, 16.5, 69, 19.2, 69.8, 23, 70.2, 25.5, 71],
      },
      {
        name: [[425, 'Iapetus suture'], [null, '']], span: [470, 395], fade: [20, 15],
        ride: ['scotland', 'avalonia'],
        v: [-10, 52.9, -8, 53.5, -6.2, 54, -5, 54.8, -3.5, 55, -2, 55.6],
      },
      {
        name: [[440, 'Taconic arc'], [null, '']], span: [480, 405], fade: [20, 15],
        ride: ['north_america', 'south_america'],
        vA: [-81.3, 31.5, -78.9, 33.5, -77.2, 35.5, -76.4, 37.2, -75.9, 38.3, -75, 39.2, -73.5, 40.4, -71.5, 41.8, -69.5, 43.3, -67.5, 44.4, -65.5, 44.7, -63.5, 44.9, -62.1, 45.4, -62.4, 46.3, -64.2, 47.3, -66.3, 48, -68, 48.3, -68.2, 48.6, -66, 49.5, -62.4, 50.5, -58.9, 51.7, -55.8, 53.3],
        vB: [-75.6, -46.6, -74.3, -44.6, -73.5, -43.4, -73.5, -42.7, -73.6, -41.3, -73.4, -39.1, -73.1, -36.7, -72.3, -34.4, -71.5, -32, -71.2, -29.6, -71, -27.2, -70.8, -24.7, -70.7, -22.3, -70.7, -19.9, -71.6, -17.9, -73.4, -16.4, -75.3, -14.8, -76.7, -12.9, -77.9, -10.7, -79.1, -8.6, -80.4, -6.7, -81.4, -4.7],
      },
    ],
  },
  // Avalonia rifts off Gondwana (~490 Ma) and the Rheic Ocean opens behind it; by the Devonian it
  // is the ocean between Laurussia and Gondwana, until its ridge is swallowed (~370 Ma).
  {
    id: 'rheic_ridge', type: 'divergent', name: 'Rheic Ridge',
    parts: [
      {
        span: [488, 420], fade: [15, 15], ride: ['avalonia', 'africa'],
        vA: [-5.8, 50.2, -4.5, 50.3, -3, 50.7, -1, 50.6, 0.6, 50.8, 1.4, 51.3],
        vB: [-16, 23.7, -15.7, 24.2, -15.4, 24.7, -15, 25.3, -14.7, 25.8, -14.4, 26.3],
      },
      {
        span: [430, 392], fade: [12, 12], ride: ['north_america', 'africa'],
        vA: [-81.3, 31.5, -78.9, 33.5, -77.2, 35.5, -76.4, 37.2, -75.9, 38.3, -75, 39.2, -73.5, 40.4, -71.5, 41.8, -69.5, 43.3, -67.5, 44.4, -65.5, 44.7, -63.5, 44.9, -62.1, 45.4, -62.4, 46.3, -64.2, 47.3, -66.3, 48, -68, 48.3, -68.2, 48.6, -66, 49.5, -62.4, 50.5, -58.9, 51.7, -55.8, 53.3],
        vB: [-17.6, 14.7, -17.5, 15.8, -17.3, 16.9, -17.2, 18, -17.1, 19.1, -17.1, 20.1, -17, 21.2, -16.6, 22.2, -16.2, 23.3, -15.7, 24.3, -15.1, 25.2, -14.5, 26.2, -13.7, 27, -12.8, 27.8, -11.9, 28.5, -10.9, 29.1, -9.8, 29.8, -9.5, 30.7, -9.4, 31.8, -9, 32.8, -8, 33.5, -6.9, 34.1],
      },
    ],
  },
  // South China (with Indochina) leaves the Cimmerian margin of Gondwana and the Paleo-Tethys opens
  // behind it.
  {
    id: 'paleo_tethys_ridge', type: 'divergent', name: 'Paleo-Tethys Ridge', span: [420, 290],
    fade: [15, 25], ride: ['south_china', 'sibumasu'],
    vA: [106.7, 20.7, 108.3, 21.1, 109.8, 21.2, 111.2, 21.5, 112.9, 22, 114.9, 22.7, 116.8, 23.5, 118.7, 24.5],
    vB: [100.5, 13.4, 99.8, 11.6, 99.6, 9.8, 100.3, 8.2, 101.5, 6.7, 102.7, 5.1, 103.5, 3.3, 104.2, 1.3],
  },
  // The Rheic Ocean closes and Gondwana collides with Laurussia, building Pangaea: the Variscan
  // belt of Europe, the Alleghanian Appalachians and the Ouachita front.
  {
    id: 'variscan', type: 'convergent',
    name: [[325, 'Variscan–Alleghanian orogeny'], [null, 'Rheic Trench']], off: 1.5,
    parts: [
      {
        span: [400, 290], fade: [20, 12], ride: ['west_europe', 'eurasia'], at: [[2, 47], [30, 55]],
        v: [29.8, 45.2, 26.4, 45.7, 23.9, 47.4, 22, 48.8, 19.2, 50, 16.8, 51.6, 14.2, 52.8, 14.6, 53.9],
      },
      {
        span: [380, 285], fade: [20, 12], ride: ['north_america', 'africa'],
        vA: [-81.3, 31.5, -78.9, 33.5, -77.2, 35.5, -76.4, 37.2, -75.9, 38.3, -75, 39.2, -73.5, 40.4, -71.5, 41.8, -69.5, 43.3, -67.5, 44.4, -65.5, 44.7, -63.5, 44.9, -62.1, 45.4, -62.4, 46.3, -64.2, 47.3, -66.3, 48, -68, 48.3, -68.2, 48.6, -66, 49.5, -62.4, 50.5, -58.9, 51.7, -55.8, 53.3],
        vB: [-17.6, 14.7, -17.5, 15.8, -17.3, 16.9, -17.2, 18, -17.1, 19.1, -17.1, 20.1, -17, 21.2, -16.6, 22.2, -16.2, 23.3, -15.7, 24.3, -15.1, 25.2, -14.5, 26.2, -13.7, 27, -12.8, 27.8, -11.9, 28.5, -10.9, 29.1, -9.8, 29.8, -9.5, 30.7, -9.4, 31.8, -9, 32.8, -8, 33.5, -6.9, 34.1],
      },
      {
        name: [[330, 'Ouachita orogeny'], [null, '']], span: [360, 290], fade: [20, 12],
        ride: ['north_america', 'south_america'],
        vA: [-97.2, 20.6, -97.3, 23.2, -96.9, 25.6, -95.8, 27.6, -93.8, 29, -91.4, 29.7, -89.2, 30.3],
        vB: [-75.7, 9.4, -73.5, 10.9, -72, 11, -71, 10.7, -69.7, 11, -67.3, 10.9, -64.3, 10.6],
      },
    ],
  },
  // The Uralian Ocean closes eastward under the Kazakh and Siberian margins: Kazakhstania docks
  // with Baltica (~310 Ma) and Siberia arrives from the east (~340–280 Ma). West Siberia is welded
  // to Baltica in the continental model, so the northern Urals are drawn as a collision belt only.
  {
    id: 'uralian', type: 'convergent', name: [[300, 'Uralian orogeny'], [null, 'Uralian Trench']],
    off: 1.5,
    parts: [
      {
        span: [320, 250], fade: [12, 12], ride: ['west_siberia', 'eurasia'], at: [null, [45, 57]],
        v: [68.5, 68.1, 66.7, 67.1, 62.2, 64.4, 61.2, 62.2, 60.2, 60, 60.2, 57.5, 60.1, 54.9],
      },
      {
        span: [380, 255], fade: [20, 12], ride: ['kazakhstania', 'eurasia'], at: [null, [45, 57]],
        v: [60.1, 54.9, 60.8, 54.1, 60.6, 53.3, 60.9, 52, 60.6, 51.3, 60.9, 50, 60.4, 48.1, 61.3, 46.6],
      },
    ],
  },
  // Siberia closes in on Baltica from the east; the arcs caught between them become West Siberia,
  // which grows over this line (~330–295 Ma).
  {
    id: 'khanty_mansi', type: 'convergent', name: 'Khanty–Mansi Trench', span: [385, 305],
    fade: [15, 15], ride: 'siberia',
    v: [77.3, 73.4, 78.4, 71.8, 78.9, 70.5, 79.4, 69, 80.2, 67, 81.3, 64.6, 82.2, 62.6, 82.9, 60.9, 83.6, 58.8, 84.2, 56.8, 84.1, 55.5, 83, 54.5],
  },
  // Tarim closes against Kazakhstania.
  {
    id: 'tien_shan', type: 'convergent',
    name: [[305, 'Tien Shan suture'], [null, 'South Tien Shan Trench']], span: [345, 290],
    fade: [15, 10], ride: ['kazakhstania', 'tarim'], off: 1.2,
    v: [73.1, 39.4, 73.8, 40.1, 76.2, 41, 78.9, 41.6, 79.6, 41.9, 82.9, 42.2, 84.9, 42.6, 87, 42.5, 89, 42.7, 90.2, 42.6, 93.7, 41.2, 95.1, 39.5],
  },
  // The long Pacific margin of Gondwana: West Antarctica, the Transantarctic Mountains and eastern
  // Australia (the Ross, Delamerian, Lachlan and New England orogens). It falls silent as Zealandia
  // rifts away (~100 Ma), except along the Antarctic Peninsula.
  {
    id: 'terra_australis', type: 'convergent',
    name: [[300, 'Gondwanide margin'], [null, 'Terra Australis margin']], ride: 'antarctica',
    parts: [
      {
        span: [548, 12], fade: [10, 10],
        v: [-60, -62.2, -64, -63.8, -67.6, -65.8, -70.3, -68, -72.5, -70, -75.3, -71.6, -79.6, -72.8],
      },
      {
        span: [548, 95], fade: [10, 12],
        v: [-75.6, -72.5, -82.2, -72.3, -89.1, -72, -95.9, -72.1, -101.8, -72.4, -106.2, -72.9, -110.7, -73.1, -117.2, -73.2, -125.4, -73.3, -134.3, -73.6, -143, -74.2, -151.2, -74.9, -159.4, -75.4, -158.4, -76.9, -171, -75.5, -182, -74, -189.5, -71.4],
      },
      {
        span: [548, 95], fade: [10, 12], ride: 'australia',
        v: [147.6, -40.1, 149.9, -38.4, 151.8, -36.3, 153.2, -33.9, 154.2, -31.4, 154.5, -28.7, 154, -26, 152.9, -23.6, 151.4, -21.5, 149.8, -19.6, 148.4, -17.8, 147.1, -15.9, 146, -14, 144.9, -12, 143.9, -10],
      },
    ],
  },

  // ==============================================================================================
  // PANTHALASSA
  // ==============================================================================================
  // A spreading ridge in the open northern ocean of the early Paleozoic, when the continents
  // crowded the tropics and the south.
  {
    id: 'panthalassa_north', type: 'divergent', name: 'Panthalassic Ridge', span: [580, 445],
    fade: [30, 20],
    keys: [
      [560, [-12, 15, -11.8, 22, -11, 29, -10.5, 36, -10.9, 43, -12.1, 50, -13.8, 57, -16, 64]],
      [520, [-8, 15, -7.5, 22, -7.7, 29, -8, 36, -8, 43, -8.4, 50, -9.8, 57, -12, 64]],
      [500, [-10, 15, -9, 22, -7.8, 29, -6.5, 36, -5.6, 43, -4.1, 50, -1.8, 57, 2, 64]],
      [470, [38, 15, 39, 22, 40, 29, 41, 36, 41.7, 43, 42, 50, 41.6, 57, 40, 64]],
    ],
  },
  // The mid-ocean ridge of Panthalassa, the world ocean around Pangaea; none of its floor survives,
  // so its course is schematic.
  {
    id: 'panthalassa', type: 'divergent', name: 'Panthalassic Ridge', span: [450, 175],
    fade: [20, 20],
    keys: [
      [440, [-168, -50, -168, -38, -168, -25.8, -168, -13, -168.5, 0, -169.9, 13, -170.6, 25.8, -168.3, 38, -164, 50]],
      [420, [-148, -50, -154.5, -38.1, -159.8, -25.8, -162, -13, -160.5, 0, -158.1, 13, -157.4, 25.8, -160.1, 38.1, -166, 50]],
      [360, [-118, -50, -123.3, -38, -126.1, -25.8, -129.1, -13, -132.5, 0, -133.5, 13, -133.9, 25.8, -135.9, 38, -136, 50]],
      [300, [-114, -50, -113.4, -38, -111.9, -25.8, -110.5, -13, -110.5, 0, -111, 13, -110.1, 25.8, -108.2, 38, -106, 50]],
      [250, [-98, -50, -101.2, -38, -102.5, -25.8, -105.1, -13, -112.4, 0, -121.9, 13.1, -126.4, 25.8, -129.1, 38.1, -136, 50]],
      [200, [-98, -50, -101.3, -38, -108.5, -25.9, -116.7, -13.1, -119, 0, -116.6, 13, -113.2, 25.8, -109.7, 38, -108, 50]],
    ],
  },

  // ==============================================================================================
  // DEEP TIME (before 540 Ma): SPARSE AND SCHEMATIC, DRAWN ON THE SCHEMATIC CONTINENTS
  // ==============================================================================================
  // East and West Gondwana collide across the Mozambique Ocean (Pan-African orogeny), assembling
  // Gondwana. The pinned points ride East Gondwana (India) and West Gondwana (a point in Tunisia).
  {
    id: 'east_african_orogen', type: 'convergent',
    name: [[590, 'East African Orogen'], [null, 'Mozambique Ocean Trench']], span: [660, 540],
    fade: [30, 25], ride: ['india', 'africa'], off: 1.5, at: [[78, 22], [9, 37]], frame: 600,
    vA: [72.1, -0.9, 74.4, -6, 76.2, -10.7, 76.7, -15.5, 78.5, -20, 83, -23.6, 88.5, -26.2, 94.2, -28.4, 100, -30.6],
    vB: [65.1, -10.1, 68.8, -11.5, 71.8, -14.5, 74.3, -18.6, 76.8, -22.7, 79.9, -26.4, 84, -29.3, 87.8, -32.2, 89.9, -36.1],
  },
  // Amazonia–West Africa closes on the Congo–São Francisco craton, building West Gondwana. The
  // pinned points ride Amazonia–West Africa (a point in Sudan) and Congo–São Francisco (Iberia), whose
  // lineages run through those cratons.
  {
    id: 'brasiliano', type: 'convergent',
    name: [[630, 'Brasiliano–Pan-African orogeny'], [null, 'Pan-African Trench']], span: [720, 590],
    fade: [30, 20], ride: ['africa', 'iberia'], off: 1.5, at: [[33, 13], [-6, 37]], frame: 700,
    vA: [82.9, -24.6, 83.1, -28, 82.5, -31.3, 81.1, -34.5, 79.6, -37.6, 78.5, -40.7, 78.9, -43.9, 80.6, -46.9, 82.2, -50.2],
    vB: [56.8, -30.2, 59.1, -30.9, 61.2, -32, 62.4, -33.7, 62.4, -35.5, 61.2, -36.9, 59.1, -37.8, 56.5, -38.6, 53.8, -39.1],
  },
  // Rodinia breaks up: Australia and East Antarctica (Mawson) part from western Laurentia and the
  // Pacific is born. The pinned points ride Laurentia (Manitoba) and Australia–Mawson (Victoria
  // Land).
  {
    id: 'proto_pacific_rift', type: 'divergent', name: 'Proto-Pacific Rift', span: [825, 680],
    fade: [45, 30], ride: ['north_america', 'antarctica'], at: [[-99, 55], [159, -74]], frame: 750,
    vA: [99.3, 6.1, 96.4, 4.3, 94.1, 1.8, 92.3, -1.2, 91.2, -4.6, 91.3, -8.1, 92.6, -11.2, 95, -13.8, 97.6, -16.3],
    vB: [79.9, 11.3, 81, 6.6, 81.9, 2.6, 80.4, -0.3, 77.5, -3.1, 76.7, -6.7, 78.4, -10.3, 78.7, -13.8, 76.1, -17.2],
  },
  // Ocean floor of the Mirovoi Ocean dives under the outer margin of Rodinia. The pinned point
  // (Manitoba) rides Laurentia, the core of Rodinia.
  {
    id: 'rodinia_margin', type: 'convergent', name: 'Rodinia margin', span: [960, 845],
    fade: [40, 25], ride: 'north_america', at: [-99, 55], frame: 900, opacity: 0.9,
    v: [156.6, -19.3, 155.2, -16.7, 153.9, -14.1, 152.7, -11.6, 151.8, -9.1, 151.4, -6.6, 151.5, -4.2, 152.1, -1.9, 153.1, 0, 154.5, 1.4, 156.5, 2.1, 159, 2.5, 161.8, 2.8, 164.8, 3.3, 167.7, 4.1, 170.2, 5.8, 171.2, 8.6, 170.4, 11.6, 168.2, 14.1, 165.6, 15.9, 162.9, 17.2, 160.5, 18.5, 158.4, 20.1, 156.3, 22, 153.9, 24, 151.4, 25.8, 148.9, 27.4, 146.8, 29.2, 144.9, 31.1],
  },
  // Amazonia closes on Laurentia; their collision (~1.08–0.98 Ga) welds Rodinia together. The
  // pinned points ride Laurentia (Baffin Island) and Amazonia–West Africa (a point in Madagascar,
  // whose lineage passes through it).
  {
    id: 'grenville', type: 'convergent',
    name: [[1070, 'Grenville orogeny'], [null, 'Grenville Trench']], span: [1250, 955],
    fade: [40, 30], ride: ['north_america', 'madagascar'], off: 1.5, at: [[-72, 64], [48, -17]],
    frame: 1100, opacity: 0.9,
    vA: [136.5, 20.5, 141.2, 18.7, 146, 17.1, 150.8, 15.6, 155.4, 14.1, 159.8, 12.1, 164.1, 10, 168.7, 9.3, 173.4, 9.9],
    vB: [134.8, -11.6, 138.1, -10.9, 141.4, -10.1, 144.6, -9.2, 147.6, -8.7, 150.1, -9.9, 151.9, -12.5, 153.4, -15.5, 155, -18.5],
  },
  // The supercontinent Columbia (Nuna) breaks up: Australia–Mawson and Siberia rift off Laurentia.
  // The pinned points ride Laurentia (Nunavut), Australia–Mawson (Queensland) and Siberia.
  {
    id: 'columbia_rift', type: 'divergent', name: 'Columbia break-up rift', span: [1520, 1270],
    fade: [50, 40], frame: 1450, opacity: 0.85,
    parts: [
      {
        ride: ['north_america', 'australia'], at: [[-93, 70], [141, -29]],
        vA: [-125, 15.5, -125.9, 22.5, -129.2, 28.7, -135.4, 33.5, -143.1, 37.2, -151, 41, -159.6, 44.4, -169.5, 45.4, -179.4, 43.7],
        vB: [-103.2, 26.4, -109.7, 30.7, -115.2, 36, -120.7, 42, -127.1, 47.8, -135.2, 53.1, -145.8, 57.4, -156.9, 61.4, -167.1, 66.4],
      },
      {
        ride: ['north_america', 'siberia'], at: [[-93, 70], [117, 52]],
        vA: [-132.2, -3.2, -130.3, -0.2, -128.6, 2.8, -127.8, 6, -127.2, 9.4, -126.2, 12.8, -125, 16.1, -124.6, 19.5, -125.1, 23],
        vB: [-117.1, -6, -117.6, -2.6, -118.2, 0.8, -119, 4.2, -119.6, 7.6, -119.1, 10.2, -116.5, 11.4, -113.2, 12.3, -110.1, 13.9],
      },
    ],
  },
  // A long-lived subduction margin on the ocean side of Columbia, where arcs were added for 400
  // million years. The pinned point (Northwest Territories) rides Nuna.
  {
    id: 'columbia_margin', type: 'convergent', name: 'Columbia accretionary margin',
    span: [1760, 1400], fade: [40, 40], ride: 'north_america', at: [-120, 67], frame: 1600,
    opacity: 0.85,
    v: [-151.2, 52.6, -155.7, 54, -160.8, 54.8, -165.8, 54.4, -169.2, 52.2, -170.1, 49.3, -169.8, 46.2, -169.3, 43.2, -168.5, 40.3, -167.5, 37.4, -166.4, 34.6, -165.5, 31.8, -164.7, 28.9, -163.7, 25.9, -162.3, 23, -160.5, 20.4, -158.4, 18, -156.5, 15.9, -154.8, 13.8, -153.6, 11.8, -153.1, 9.7, -153.2, 7.3, -153.6, 4.6, -154.1, 1.8, -154.4, -1.1, -154.7, -4, -155, -6.6, -155.7, -9.3, -156.7, -11.9, -157.7, -14.8, -158.6, -17.7, -159.3, -20.5, -160.2, -23.3, -161.1, -26.2, -161.8, -29.1, -162.3, -32],
  },
  // The cratons of the north (Slave, Rae–Hearne, Karelia) collide with the Superior craton,
  // assembling Columbia (Nuna). The pinned points ride the Slave craton (Kentucky), Karelia–Kola
  // (the Malay Peninsula) and Superior/Nuna (Manitoba) — lineages of the schematic slices, not
  // geology.
  {
    id: 'trans_hudson', type: 'convergent',
    name: [[1850, 'Trans-Hudson orogeny'], [null, 'Manikewan Ocean Trench']], span: [2050, 1780],
    fade: [40, 30], off: 1.5, frame: 1900, opacity: 0.8,
    parts: [
      {
        ride: ['north_america', 'north_america'], at: [[-87, 37], [-96, 52]],
        vA: [-162.3, 31.1, -157.3, 32.1, -152.3, 33.5, -147.4, 35.1, -142.3, 36.6, -137.7, 38.6, -134.1, 41.8, -131.2, 45.6, -128.6, 49.7],
        vB: [-145.2, 20.6, -146.5, 24, -145.2, 27.1, -141.4, 29.4, -137, 31.2, -132.7, 33.2, -128.2, 35, -123.3, 35.4, -118.5, 34.5],
      },
      {
        ride: ['sibumasu', 'north_america'], at: [[99, 10], [-96, 52]],
        vA: [-119, 48.6, -116.9, 44.4, -114.7, 40.4, -111.6, 36.7, -107.7, 33.7, -103.7, 30.9, -99.6, 28.1, -95.4, 25.8, -91, 23.9],
        vB: [-130.1, 34.7, -124.6, 35.4, -119.8, 34.3, -116.8, 31, -114.5, 27.1, -111.1, 23.8, -107.4, 20.7, -104, 17.4, -101.2, 13.7],
      },
    ],
  },
  // The conjectural Neoarchean landmass Kenorland rifts apart into the Superior, Slave and Karelia
  // cratons. The pinned points ride Superior (Manitoba), Slave (Kentucky) and Karelia–Kola
  // (Thailand) — lineages of the schematic slices.
  {
    id: 'kenorland_rift', type: 'divergent', name: 'Kenorland break-up rift', span: [2520, 2180],
    fade: [60, 40], frame: 2450, opacity: 0.75,
    parts: [
      {
        ride: ['north_america', 'north_america'], at: [[-93, 52], [-87, 37]],
        vA: [-114.8, 30.8, -118.6, 33.3, -123.1, 33.2, -127.8, 31.6, -132.5, 29.9, -137.3, 28.3, -140.5, 26.1, -140.8, 23.1, -139.1, 19.5],
        vB: [-126.9, 46.2, -126.1, 42.4, -127.9, 38.7, -131.8, 35.8, -136.8, 33.9, -141.9, 32.2, -146.7, 30.1, -151.3, 29.4, -155.6, 31],
      },
      {
        ride: ['north_america', 'indochina'], at: [[-93, 52], [102, 16]],
        vA: [-104.1, 17.1, -107, 19.9, -110, 22.6, -112.4, 25.6, -114.2, 28.9, -116.6, 32, -120.1, 33.6, -124.2, 33, -128.1, 30.9],
        vB: [-95.7, 27.5, -99.5, 29, -103.2, 30.8, -106.9, 32.6, -110.4, 34.7, -113.6, 37.2, -116.2, 40.1, -117.3, 43.4, -116.7, 47],
      },
    ],
  },
  // Island arcs sweep together to build the Superior craton and Kenorland (~2.75–2.65 Ga). The
  // pinned point (Manitoba) rides Kenorland.
  {
    id: 'kenorland_arc', type: 'convergent', name: 'Neoarchean arc (Superior Province)',
    span: [2820, 2600], fade: [50, 40], ride: 'north_america', at: [-93, 52], frame: 2700,
    opacity: 0.7,
    v: [-139.8, 15.5, -138.9, 12.5, -137.8, 9.5, -136.3, 6.7, -134.4, 4.1, -132, 1.9, -129.3, 0.1, -126.2, -1.1, -122.9, -1.5, -119.7, -1.1, -116.7, 0, -114, 1.2, -111.3, 2.3, -108.6, 3.5, -106, 5, -103.9, 7.1, -102.5, 9.7],
  },
  // Whether plate tectonics ran this early is debated; greenstone belts of the Kaapvaal and Pilbara
  // cratons (Vaalbara) suggest short-lived subduction by ~3.2 Ga. The pinned point (Kolyma) rides
  // Vaalbara in the schematic slices.
  {
    id: 'archean_subduction', type: 'convergent', name: 'Earliest subduction (conjectural)',
    span: [3200, 2950], fade: [100, 60], ride: 'kolyma', at: [141, 61], frame: 3100, opacity: 0.6,
    v: [-98, 4.5, -100.6, 2.7, -102.5, 0.3, -103, -2.6, -102.3, -5.4, -100.9, -7.6, -99.8, -9.7, -98.9, -11.8],
  },
];
