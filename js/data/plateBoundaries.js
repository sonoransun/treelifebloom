// Tectonic plate boundary polylines at 12 key time slices.
// Each boundary is an open polyline of [lon, lat] vertices with a type:
//   'divergent'  — spreading ridges (plates moving apart)
//   'convergent' — subduction zones / collision belts (plates colliding)
//   'transform'  — strike-slip faults (plates sliding past)
// Historically approximate, matching the continental data's fidelity.

export const boundarySlices = {
  // ===== 4000 Ma: Proto-cratons forming, early mantle convection =====
  4000: {
    boundaries: [
      {
        id: 'proto_rift_1',
        type: 'divergent',
        vertices: [[10, -5], [18, -12], [25, -18], [30, -15], [35, -5]]
      },
      {
        id: 'proto_rift_2',
        type: 'divergent',
        vertices: [[-20, 5], [-15, -2], [-5, -10], [5, -15]]
      },
      {
        id: 'proto_subduction_1',
        type: 'convergent',
        vertices: [[-30, 10], [-20, 15], [-10, 12], [0, 5], [10, 2]]
      }
    ]
  },

  // ===== 2700 Ma: Kenorland supercontinent, greenstone belt tectonics =====
  2700: {
    boundaries: [
      {
        id: 'kenorland_rift_1',
        type: 'divergent',
        vertices: [[-40, 0], [-30, -8], [-15, -12], [0, -15], [15, -18]]
      },
      {
        id: 'kenorland_rift_2',
        type: 'divergent',
        vertices: [[50, 15], [55, 5], [52, -5], [45, -15], [35, -22]]
      },
      {
        id: 'kenorland_convergent_1',
        type: 'convergent',
        vertices: [[-40, 25], [-25, 35], [-10, 38], [5, 35], [20, 30], [35, 22]]
      },
      {
        id: 'kenorland_transform_1',
        type: 'transform',
        vertices: [[30, -20], [20, -25], [10, -28], [0, -30]]
      }
    ]
  },

  // ===== 1100 Ma: Rodinia assembled — Grenville orogeny =====
  1100: {
    boundaries: [
      {
        id: 'rodinia_convergent_1',
        type: 'convergent',
        vertices: [[-55, 20], [-58, 5], [-55, -12], [-48, -25], [-35, -35], [-20, -40]]
      },
      {
        id: 'rodinia_convergent_2',
        type: 'convergent',
        vertices: [[65, 15], [68, 5], [65, -8], [58, -18], [48, -28], [35, -35]]
      },
      {
        id: 'grenville_belt',
        type: 'convergent',
        vertices: [[-20, 42], [-5, 45], [15, 42], [30, 38], [42, 32]]
      },
      {
        id: 'rodinia_interior_rift',
        type: 'divergent',
        vertices: [[-10, 20], [5, 10], [15, 0], [20, -10], [18, -20]]
      },
      {
        id: 'panthalassa_ridge_1',
        type: 'divergent',
        vertices: [[-120, 10], [-110, 0], [-100, -10], [-90, -15], [-80, -10]]
      }
    ]
  },

  // ===== 750 Ma: Rodinia fragmenting — major rifting =====
  750: {
    boundaries: [
      {
        id: 'rodinia_rift_w',
        type: 'divergent',
        vertices: [[-35, 15], [-25, 5], [-18, -5], [-15, -15], [-20, -25]]
      },
      {
        id: 'rodinia_rift_e',
        type: 'divergent',
        vertices: [[20, 18], [28, 8], [32, -2], [38, -10], [42, -20]]
      },
      {
        id: 'rodinia_rift_central',
        type: 'divergent',
        vertices: [[-5, 22], [5, 12], [12, 2], [18, -8], [22, -18]]
      },
      {
        id: 'proto_pacific_ridge',
        type: 'divergent',
        vertices: [[-100, 15], [-90, 5], [-80, -5], [-75, -15], [-70, -25]]
      },
      {
        id: 'proto_iapetus_rift',
        type: 'divergent',
        vertices: [[-55, 5], [-50, -5], [-42, -12], [-35, -18]]
      },
      {
        id: 'subduction_panthalassa',
        type: 'convergent',
        vertices: [[90, 20], [95, 10], [98, 0], [95, -12], [88, -22]]
      }
    ]
  },

  // ===== 540 Ma: Gondwana + scattered northern continents =====
  540: {
    boundaries: [
      {
        id: 'iapetus_ridge',
        type: 'divergent',
        vertices: [[-30, -5], [-22, 2], [-12, 8], [0, 5], [10, 0]]
      },
      {
        id: 'gondwana_convergent_n',
        type: 'convergent',
        vertices: [[-45, -15], [-25, -5], [-5, -10], [15, -5], [35, -10], [55, -15]]
      },
      {
        id: 'rheic_rift',
        type: 'divergent',
        vertices: [[-15, -12], [-5, -18], [5, -22], [15, -20]]
      },
      {
        id: 'panthalassa_subduction',
        type: 'convergent',
        vertices: [[-80, 30], [-85, 15], [-88, 0], [-85, -15], [-80, -30]]
      },
      {
        id: 'siberia_transform',
        type: 'transform',
        vertices: [[55, 30], [62, 35], [70, 38], [78, 35]]
      },
      {
        id: 'proto_tethys_subduction',
        type: 'convergent',
        vertices: [[30, 15], [40, 18], [50, 22], [58, 28]]
      }
    ]
  },

  // ===== 430 Ma: Iapetus closing, Caledonian orogeny =====
  430: {
    boundaries: [
      {
        id: 'iapetus_closing',
        type: 'convergent',
        vertices: [[-20, 8], [-10, 12], [0, 10], [12, 8], [22, 10]]
      },
      {
        id: 'rheic_ocean_ridge',
        type: 'divergent',
        vertices: [[-25, -8], [-15, -12], [0, -15], [15, -12], [28, -8]]
      },
      {
        id: 'gondwana_subduction_w',
        type: 'convergent',
        vertices: [[-40, -25], [-35, -35], [-28, -42], [-18, -48], [-8, -52]]
      },
      {
        id: 'panthalassa_subduction_430',
        type: 'convergent',
        vertices: [[-75, 25], [-80, 10], [-82, -5], [-78, -20], [-72, -30]]
      },
      {
        id: 'paleo_tethys_ridge',
        type: 'divergent',
        vertices: [[35, 5], [42, 10], [50, 15], [58, 18]]
      },
      {
        id: 'transform_430',
        type: 'transform',
        vertices: [[55, 25], [60, 28], [68, 30], [75, 28]]
      }
    ]
  },

  // ===== 300 Ma: Pangaea assembling — Variscan/Appalachian orogeny =====
  300: {
    boundaries: [
      {
        id: 'variscan_collision',
        type: 'convergent',
        vertices: [[-50, 30], [-35, 35], [-15, 38], [5, 35], [20, 30], [35, 28]]
      },
      {
        id: 'appalachian_collision',
        type: 'convergent',
        vertices: [[-55, 25], [-52, 15], [-50, 5], [-48, -5], [-45, -15]]
      },
      {
        id: 'uralian_convergent',
        type: 'convergent',
        vertices: [[45, 50], [48, 42], [50, 35], [52, 28], [50, 20]]
      },
      {
        id: 'panthalassa_subduction_300',
        type: 'convergent',
        vertices: [[-70, 35], [-75, 20], [-78, 5], [-75, -10], [-70, -25],
                   [-65, -40], [-55, -50]]
      },
      {
        id: 'paleo_tethys_subduction',
        type: 'convergent',
        vertices: [[60, 20], [65, 12], [62, 2], [58, -8]]
      },
      {
        id: 'panthalassa_ridge',
        type: 'divergent',
        vertices: [[-120, 20], [-115, 5], [-110, -10], [-105, -25], [-100, -35]]
      },
      {
        id: 'pangaea_transform_1',
        type: 'transform',
        vertices: [[-45, -20], [-42, -28], [-38, -35]]
      }
    ]
  },

  // ===== 250 Ma: Pangaea complete — Panthalassa subduction ring =====
  250: {
    boundaries: [
      {
        id: 'panthalassa_subduction_w',
        type: 'convergent',
        vertices: [[-60, 50], [-65, 35], [-68, 20], [-65, 5], [-60, -10],
                   [-55, -25], [-48, -40]]
      },
      {
        id: 'panthalassa_subduction_e',
        type: 'convergent',
        vertices: [[75, 30], [80, 18], [78, 5], [72, -8], [65, -18]]
      },
      {
        id: 'tethys_subduction',
        type: 'convergent',
        vertices: [[25, 45], [40, 42], [55, 38], [65, 30]]
      },
      {
        id: 'panthalassa_ridge_250',
        type: 'divergent',
        vertices: [[-130, 25], [-125, 10], [-120, -5], [-115, -20], [-110, -30]]
      },
      {
        id: 'proto_atlantic_rift',
        type: 'divergent',
        vertices: [[-42, 20], [-45, 10], [-48, 0], [-50, -12]]
      },
      {
        id: 'transform_tethys',
        type: 'transform',
        vertices: [[20, 35], [10, 28], [0, 22], [-10, 18]]
      }
    ]
  },

  // ===== 150 Ma: Laurasia + Gondwana splitting — Atlantic opening =====
  150: {
    boundaries: [
      {
        id: 'central_atlantic_ridge',
        type: 'divergent',
        vertices: [[-40, 30], [-35, 22], [-30, 12], [-28, 2], [-30, -8]]
      },
      {
        id: 'proto_south_atlantic',
        type: 'divergent',
        vertices: [[-30, -10], [-28, -20], [-25, -30], [-22, -38]]
      },
      {
        id: 'tethys_subduction_150',
        type: 'convergent',
        vertices: [[20, 22], [35, 20], [50, 18], [65, 20], [78, 22]]
      },
      {
        id: 'pacific_subduction_w',
        type: 'convergent',
        vertices: [[-60, 32], [-62, 20], [-65, 8], [-62, -5], [-58, -18],
                   [-52, -30]]
      },
      {
        id: 'pacific_subduction_e',
        type: 'convergent',
        vertices: [[85, 28], [90, 18], [92, 8], [88, -5], [82, -15]]
      },
      {
        id: 'pacific_ridge_150',
        type: 'divergent',
        vertices: [[-120, 20], [-115, 8], [-110, -5], [-105, -18], [-100, -28]]
      },
      {
        id: 'transform_atlantic',
        type: 'transform',
        vertices: [[-32, 5], [-38, 8], [-42, 12]]
      },
      {
        id: 'indian_rift',
        type: 'divergent',
        vertices: [[55, -25], [60, -32], [65, -40], [68, -48]]
      }
    ]
  },

  // ===== 66 Ma: Late Cretaceous — Atlantic widening, India racing north =====
  66: {
    boundaries: [
      {
        id: 'mid_atlantic_ridge',
        type: 'divergent',
        vertices: [[-30, 55], [-32, 42], [-30, 30], [-25, 18], [-22, 5],
                   [-18, -8], [-15, -22], [-12, -35]]
      },
      {
        id: 'east_pacific_rise',
        type: 'divergent',
        vertices: [[-115, 30], [-112, 18], [-108, 5], [-105, -8], [-100, -22],
                   [-95, -35]]
      },
      {
        id: 'pacific_subduction_nw',
        type: 'convergent',
        vertices: [[-130, 52], [-135, 42], [-140, 32], [-145, 20],
                   [-148, 8], [-145, -5]]
      },
      {
        id: 'pacific_subduction_w_66',
        type: 'convergent',
        vertices: [[130, 45], [135, 35], [140, 25], [142, 15], [140, 5]]
      },
      {
        id: 'tethys_subduction_66',
        type: 'convergent',
        vertices: [[10, 38], [25, 35], [40, 32], [55, 30], [68, 25]]
      },
      {
        id: 'india_ridge',
        type: 'divergent',
        vertices: [[50, -15], [55, -25], [60, -35], [65, -45]]
      },
      {
        id: 'andean_subduction',
        type: 'convergent',
        vertices: [[-72, 5], [-70, -8], [-68, -22], [-70, -35], [-75, -48]]
      },
      {
        id: 'indian_transform',
        type: 'transform',
        vertices: [[60, -5], [65, 0], [70, 5]]
      },
      {
        id: 'antarctic_ridge',
        type: 'divergent',
        vertices: [[-20, -48], [10, -52], [40, -55], [70, -55], [100, -52]]
      }
    ]
  },

  // ===== 20 Ma: Near-modern — Ring of Fire, Alpine-Himalayan belt =====
  20: {
    boundaries: [
      {
        id: 'mid_atlantic_ridge_20',
        type: 'divergent',
        vertices: [[-22, 65], [-25, 52], [-28, 38], [-25, 25], [-22, 12],
                   [-18, 0], [-15, -15], [-12, -30], [-14, -45]]
      },
      {
        id: 'east_pacific_rise_20',
        type: 'divergent',
        vertices: [[-110, 25], [-108, 12], [-105, 0], [-100, -12],
                   [-95, -25], [-90, -38]]
      },
      {
        id: 'pacific_nw_subduction',
        type: 'convergent',
        vertices: [[-125, 52], [-130, 42], [-140, 35], [-150, 28],
                   [-160, 18], [-170, 8]]
      },
      {
        id: 'pacific_w_subduction',
        type: 'convergent',
        vertices: [[125, 48], [130, 38], [135, 28], [138, 18],
                   [140, 8], [138, -2]]
      },
      {
        id: 'himalayan_collision',
        type: 'convergent',
        vertices: [[65, 35], [72, 32], [80, 30], [88, 28], [95, 30]]
      },
      {
        id: 'alpine_belt',
        type: 'convergent',
        vertices: [[-5, 42], [5, 45], [15, 42], [25, 38], [35, 36], [45, 35]]
      },
      {
        id: 'andean_subduction_20',
        type: 'convergent',
        vertices: [[-78, 8], [-76, -5], [-74, -18], [-72, -30],
                   [-74, -42], [-78, -50]]
      },
      {
        id: 'mid_indian_ridge',
        type: 'divergent',
        vertices: [[40, -10], [48, -18], [55, -28], [62, -38], [70, -45]]
      },
      {
        id: 'antarctic_ridge_20',
        type: 'divergent',
        vertices: [[-30, -50], [0, -52], [30, -55], [60, -55],
                   [90, -52], [120, -55], [150, -58]]
      },
      {
        id: 'san_andreas_proto',
        type: 'transform',
        vertices: [[-118, 38], [-120, 32], [-122, 28]]
      },
      {
        id: 'indonesia_subduction',
        type: 'convergent',
        vertices: [[95, 5], [100, -2], [108, -8], [118, -10], [128, -5]]
      }
    ]
  },

  // ===== 0 Ma: Present day — modern plate boundaries =====
  0: {
    boundaries: [
      {
        id: 'mid_atlantic_ridge_0',
        type: 'divergent',
        vertices: [[-18, 68], [-20, 55], [-25, 42], [-28, 30], [-25, 18],
                   [-22, 5], [-15, -8], [-12, -22], [-14, -38], [-15, -52]]
      },
      {
        id: 'east_pacific_rise_0',
        type: 'divergent',
        vertices: [[-108, 22], [-105, 10], [-102, 0], [-98, -12],
                   [-92, -25], [-88, -38], [-82, -50]]
      },
      {
        id: 'cascadia_subduction',
        type: 'convergent',
        vertices: [[-125, 50], [-126, 46], [-128, 42]]
      },
      {
        id: 'aleutian_subduction',
        type: 'convergent',
        vertices: [[-130, 52], [-145, 52], [-160, 54], [-172, 52], [178, 52]]
      },
      {
        id: 'japan_subduction',
        type: 'convergent',
        vertices: [[130, 48], [135, 40], [138, 32], [140, 25]]
      },
      {
        id: 'marianas_subduction',
        type: 'convergent',
        vertices: [[140, 22], [142, 15], [145, 10], [148, 5]]
      },
      {
        id: 'tonga_kermadec',
        type: 'convergent',
        vertices: [[172, -15], [175, -22], [178, -28], [-178, -35]]
      },
      {
        id: 'himalayan_collision_0',
        type: 'convergent',
        vertices: [[68, 35], [75, 32], [82, 30], [90, 28], [98, 30]]
      },
      {
        id: 'alpine_belt_0',
        type: 'convergent',
        vertices: [[-5, 38], [5, 42], [15, 40], [25, 38], [35, 38], [42, 36]]
      },
      {
        id: 'andean_subduction_0',
        type: 'convergent',
        vertices: [[-80, 8], [-78, -2], [-75, -15], [-72, -28],
                   [-74, -40], [-76, -52]]
      },
      {
        id: 'san_andreas',
        type: 'transform',
        vertices: [[-115, 32], [-118, 35], [-120, 38], [-122, 40]]
      },
      {
        id: 'indonesia_subduction_0',
        type: 'convergent',
        vertices: [[92, 8], [98, 0], [105, -6], [112, -8], [120, -8], [130, -2]]
      },
      {
        id: 'mid_indian_ridge_0',
        type: 'divergent',
        vertices: [[38, -12], [45, -20], [52, -30], [60, -38], [68, -46]]
      },
      {
        id: 'antarctic_ridge_0',
        type: 'divergent',
        vertices: [[-30, -52], [0, -55], [30, -56], [60, -55],
                   [90, -52], [120, -55], [150, -60]]
      },
      {
        id: 'east_african_rift',
        type: 'divergent',
        vertices: [[36, 12], [35, 5], [33, -2], [30, -8], [32, -15]]
      },
      {
        id: 'philippine_subduction',
        type: 'convergent',
        vertices: [[122, 18], [124, 12], [126, 6], [128, 0]]
      },
      {
        id: 'caribbean_subduction',
        type: 'convergent',
        vertices: [[-62, 18], [-66, 16], [-72, 14], [-78, 12], [-82, 10]]
      }
    ]
  }
};
