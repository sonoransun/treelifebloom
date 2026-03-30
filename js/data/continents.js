// Simplified continental polygon outlines at 12 key time slices.
// Each continent is an array of [lon, lat] vertices forming a closed polygon.
// All matched continent pairs across adjacent slices have the same vertex count
// to enable smooth interpolation.

export const timeSlices = [4000, 2700, 1100, 750, 540, 430, 300, 250, 150, 66, 20, 0];

export const slices = {
  // ===== 4000 Ma: Proto-cratons forming =====
  4000: {
    continents: [
      {
        id: 'protocraton_1',
        name: 'Vaalbara (proto)',
        color: '#7a6a50',
        vertices: [
          [-10, -10], [0, -5], [10, -8], [15, -15], [10, -25],
          [0, -28], [-10, -22], [-15, -15]
        ]
      },
      {
        id: 'protocraton_2',
        name: 'Ur (proto)',
        color: '#8a7a60',
        vertices: [
          [40, 5], [50, 10], [60, 8], [65, 0], [60, -8],
          [50, -10], [40, -5], [35, 2]
        ]
      }
    ]
  },

  // ===== 2700 Ma: Kenorland supercontinent =====
  2700: {
    continents: [
      {
        id: 'kenorland',
        name: 'Kenorland',
        color: '#7a6a50',
        vertices: [
          [-30, 20], [-10, 30], [10, 28], [30, 22], [45, 15],
          [50, 5], [45, -10], [30, -20], [10, -25], [-10, -22],
          [-25, -15], [-35, -5], [-35, 10]
        ]
      }
    ]
  },

  // ===== 1100 Ma: Rodinia assembled =====
  1100: {
    continents: [
      {
        id: 'rodinia',
        name: 'Rodinia',
        color: '#8B7355',
        vertices: [
          [-50, 30], [-30, 40], [-5, 42], [20, 38], [45, 30],
          [60, 18], [65, 5], [60, -10], [45, -25], [25, -35],
          [0, -38], [-25, -35], [-45, -25], [-55, -10], [-55, 15]
        ]
      }
    ]
  },

  // ===== 750 Ma: Rodinia fragmenting =====
  750: {
    continents: [
      {
        id: 'laurentia_proto',
        name: 'Laurentia',
        color: '#8B7355',
        vertices: [
          [-40, 15], [-25, 25], [-10, 28], [5, 22], [15, 12],
          [10, 0], [0, -8], [-15, -10], [-30, -5], [-38, 5]
        ]
      },
      {
        id: 'congo_proto',
        name: 'Congo-São Francisco',
        color: '#9a8365',
        vertices: [
          [30, -5], [40, 0], [50, -3], [52, -15], [45, -25],
          [35, -28], [25, -22], [22, -12], [25, -3]
        ]
      },
      {
        id: 'east_gondwana_proto',
        name: 'East Gondwana',
        color: '#7a6a50',
        vertices: [
          [55, 5], [65, 15], [80, 12], [90, 5], [88, -10],
          [78, -20], [65, -18], [55, -8]
        ]
      },
      {
        id: 'west_africa_proto',
        name: 'West Africa',
        color: '#8a7a60',
        vertices: [
          [-60, -5], [-50, 5], [-38, 8], [-30, 2], [-32, -10],
          [-40, -18], [-52, -15], [-58, -8]
        ]
      }
    ]
  },

  // ===== 540 Ma: Gondwana + scattered northern continents =====
  540: {
    continents: [
      {
        id: 'gondwana',
        name: 'Gondwana',
        color: '#8B7355',
        vertices: [
          [-40, -20], [-20, -10], [0, -15], [20, -10], [40, -15],
          [60, -20], [70, -35], [60, -50], [40, -60], [20, -65],
          [0, -60], [-20, -55], [-40, -45], [-50, -35]
        ]
      },
      {
        id: 'laurentia_540',
        name: 'Laurentia',
        color: '#9a8365',
        vertices: [
          [-40, 10], [-25, 20], [-10, 22], [5, 18], [10, 8],
          [5, 0], [-10, -5], [-25, -2], [-35, 3]
        ]
      },
      {
        id: 'baltica_540',
        name: 'Baltica',
        color: '#7a6a50',
        vertices: [
          [20, 25], [30, 30], [42, 28], [48, 20], [45, 12],
          [35, 8], [25, 12], [18, 18]
        ]
      },
      {
        id: 'siberia_540',
        name: 'Siberia',
        color: '#8a7a60',
        vertices: [
          [60, 35], [70, 42], [85, 40], [92, 32], [88, 22],
          [78, 18], [65, 22], [58, 28]
        ]
      }
    ]
  },

  // ===== 430 Ma: Ordovician arrangement =====
  430: {
    continents: [
      {
        id: 'gondwana_430',
        name: 'Gondwana',
        color: '#8B7355',
        vertices: [
          [-30, -25], [-10, -15], [10, -20], [30, -15], [50, -20],
          [65, -30], [60, -45], [45, -55], [25, -60], [5, -58],
          [-15, -52], [-30, -42], [-40, -35]
        ]
      },
      {
        id: 'laurentia_430',
        name: 'Laurentia',
        color: '#9a8365',
        vertices: [
          [-30, 5], [-15, 15], [0, 18], [15, 15], [20, 5],
          [15, -5], [0, -8], [-15, -5], [-25, 0]
        ]
      },
      {
        id: 'baltica_430',
        name: 'Baltica',
        color: '#7a6a50',
        vertices: [
          [25, 15], [35, 22], [48, 20], [52, 12], [48, 5],
          [38, 0], [28, 4], [22, 10]
        ]
      },
      {
        id: 'siberia_430',
        name: 'Siberia',
        color: '#8a7a60',
        vertices: [
          [65, 30], [75, 38], [90, 36], [95, 28], [90, 18],
          [80, 15], [68, 18], [62, 24]
        ]
      }
    ]
  },

  // ===== 300 Ma: Pangaea assembling =====
  300: {
    continents: [
      {
        id: 'pangaea_forming',
        name: 'Pangaea (forming)',
        color: '#8B7355',
        vertices: [
          [-50, 40], [-30, 50], [-5, 48], [20, 42], [40, 35],
          [55, 25], [60, 10], [55, -5], [45, -15], [35, -25],
          [25, -40], [15, -55], [0, -65], [-15, -60], [-30, -50],
          [-40, -35], [-50, -20], [-55, -5], [-55, 15], [-55, 30]
        ]
      },
      {
        id: 'siberia_300',
        name: 'Siberia',
        color: '#8a7a60',
        vertices: [
          [50, 50], [60, 58], [75, 56], [85, 48], [82, 38],
          [72, 32], [58, 35], [48, 42]
        ]
      }
    ]
  },

  // ===== 250 Ma: Pangaea complete =====
  250: {
    continents: [
      {
        id: 'pangaea',
        name: 'Pangaea',
        color: '#8B7355',
        vertices: [
          [-45, 55], [-25, 65], [0, 62], [25, 55], [45, 45],
          [60, 35], [70, 20], [65, 5], [55, -10], [45, -20],
          [35, -35], [20, -50], [5, -60], [-10, -65], [-25, -55],
          [-35, -40], [-45, -25], [-50, -10], [-55, 5], [-55, 20],
          [-52, 35], [-48, 48]
        ]
      }
    ]
  },

  // ===== 150 Ma: Laurasia + Gondwana =====
  150: {
    continents: [
      {
        id: 'laurasia',
        name: 'Laurasia',
        color: '#9a8365',
        vertices: [
          [-55, 35], [-35, 50], [-10, 52], [15, 48], [35, 42],
          [55, 38], [70, 32], [80, 25], [75, 18], [60, 15],
          [40, 18], [20, 20], [0, 22], [-20, 25], [-40, 28],
          [-55, 30]
        ]
      },
      {
        id: 'gondwana_150',
        name: 'Gondwana',
        color: '#8B7355',
        vertices: [
          [-40, -10], [-20, 0], [0, -5], [20, -8], [40, -15],
          [55, -25], [65, -35], [55, -50], [35, -60], [15, -62],
          [-5, -58], [-25, -48], [-40, -35], [-48, -22]
        ]
      }
    ]
  },

  // ===== 66 Ma: Late Cretaceous =====
  66: {
    continents: [
      {
        id: 'north_america',
        name: 'North America',
        color: '#9a8365',
        vertices: [
          [-130, 55], [-110, 65], [-80, 68], [-55, 60], [-50, 48],
          [-60, 35], [-80, 25], [-100, 28], [-115, 35], [-125, 42],
          [-132, 50]
        ]
      },
      {
        id: 'eurasia_66',
        name: 'Eurasia',
        color: '#8a7a60',
        vertices: [
          [-10, 55], [10, 62], [35, 60], [60, 55], [90, 52],
          [120, 55], [140, 50], [135, 40], [110, 35], [80, 30],
          [50, 28], [20, 32], [0, 38], [-15, 45]
        ]
      },
      {
        id: 'south_america_66',
        name: 'South America',
        color: '#8B7355',
        vertices: [
          [-65, 5], [-55, 10], [-40, 5], [-35, -5], [-35, -20],
          [-45, -35], [-55, -45], [-65, -50], [-72, -40], [-70, -25],
          [-68, -10]
        ]
      },
      {
        id: 'africa_66',
        name: 'Africa',
        color: '#7a6a50',
        vertices: [
          [-15, 25], [0, 30], [20, 28], [35, 20], [40, 8],
          [42, -5], [35, -20], [25, -32], [15, -35], [5, -30],
          [-5, -20], [-10, -5], [-15, 10]
        ]
      },
      {
        id: 'india_66',
        name: 'India',
        color: '#9a8365',
        vertices: [
          [65, 5], [72, 10], [80, 8], [82, 0], [78, -10],
          [72, -15], [65, -10], [62, -2]
        ]
      },
      {
        id: 'antarctica_66',
        name: 'Antarctica',
        color: '#b0a898',
        vertices: [
          [-60, -65], [-30, -62], [0, -65], [30, -68], [60, -70],
          [90, -68], [110, -72], [80, -78], [40, -80], [0, -78],
          [-40, -75], [-65, -72]
        ]
      },
      {
        id: 'australia_66',
        name: 'Australia',
        color: '#8a7a60',
        vertices: [
          [110, -35], [120, -28], [135, -25], [148, -30], [152, -38],
          [145, -45], [130, -48], [115, -45], [108, -40]
        ]
      }
    ]
  },

  // ===== 20 Ma: Near-modern =====
  20: {
    continents: [
      {
        id: 'north_america_20',
        name: 'North America',
        color: '#9a8365',
        vertices: [
          [-140, 58], [-120, 68], [-90, 72], [-60, 62], [-52, 48],
          [-65, 30], [-85, 22], [-105, 25], [-120, 32], [-130, 42],
          [-138, 52]
        ]
      },
      {
        id: 'eurasia_20',
        name: 'Eurasia',
        color: '#8a7a60',
        vertices: [
          [-10, 50], [10, 58], [35, 58], [60, 55], [90, 55],
          [120, 58], [145, 52], [140, 42], [115, 35], [85, 28],
          [60, 25], [30, 30], [5, 35], [-12, 42]
        ]
      },
      {
        id: 'south_america_20',
        name: 'South America',
        color: '#8B7355',
        vertices: [
          [-72, 8], [-60, 12], [-45, 5], [-35, -2], [-35, -18],
          [-48, -32], [-58, -42], [-68, -50], [-75, -42], [-73, -28],
          [-72, -12]
        ]
      },
      {
        id: 'africa_20',
        name: 'Africa',
        color: '#7a6a50',
        vertices: [
          [-15, 32], [0, 35], [20, 32], [38, 22], [45, 10],
          [48, -2], [38, -18], [28, -30], [18, -35], [8, -30],
          [-2, -18], [-8, -2], [-15, 15]
        ]
      },
      {
        id: 'india_20',
        name: 'India',
        color: '#9a8365',
        vertices: [
          [68, 28], [75, 32], [82, 28], [85, 20], [82, 10],
          [76, 5], [70, 10], [66, 18]
        ]
      },
      {
        id: 'antarctica_20',
        name: 'Antarctica',
        color: '#d0c8c0',
        vertices: [
          [-60, -65], [-30, -62], [0, -65], [30, -68], [60, -70],
          [90, -68], [120, -72], [90, -80], [45, -82], [0, -80],
          [-40, -76], [-65, -72]
        ]
      },
      {
        id: 'australia_20',
        name: 'Australia',
        color: '#8a7a60',
        vertices: [
          [115, -18], [125, -14], [140, -12], [150, -18], [153, -28],
          [148, -36], [135, -38], [120, -35], [113, -28]
        ]
      }
    ]
  },

  // ===== 0 Ma: Present day =====
  0: {
    continents: [
      {
        id: 'north_america_0',
        name: 'North America',
        color: '#9a8365',
        vertices: [
          [-145, 62], [-125, 70], [-95, 75], [-60, 65], [-52, 48],
          [-68, 28], [-88, 18], [-105, 22], [-120, 30], [-135, 40],
          [-142, 52]
        ]
      },
      {
        id: 'eurasia_0',
        name: 'Eurasia',
        color: '#8a7a60',
        vertices: [
          [-10, 50], [10, 58], [40, 60], [65, 58], [95, 58],
          [125, 60], [150, 55], [145, 42], [120, 32], [90, 25],
          [65, 22], [35, 28], [10, 35], [-12, 42]
        ]
      },
      {
        id: 'south_america_0',
        name: 'South America',
        color: '#8B7355',
        vertices: [
          [-78, 10], [-65, 12], [-50, 5], [-35, -2], [-35, -18],
          [-50, -30], [-60, -42], [-70, -52], [-76, -44], [-75, -30],
          [-78, -12]
        ]
      },
      {
        id: 'africa_0',
        name: 'Africa',
        color: '#7a6a50',
        vertices: [
          [-16, 35], [0, 38], [22, 35], [40, 25], [48, 12],
          [50, 0], [40, -15], [30, -28], [20, -35], [10, -30],
          [0, -18], [-8, 0], [-16, 18]
        ]
      },
      {
        id: 'india_0',
        name: 'India',
        color: '#9a8365',
        vertices: [
          [68, 32], [76, 35], [85, 30], [88, 22], [85, 12],
          [78, 8], [72, 12], [66, 22]
        ]
      },
      {
        id: 'antarctica_0',
        name: 'Antarctica',
        color: '#e0ddd8',
        vertices: [
          [-60, -65], [-30, -62], [0, -65], [30, -68], [60, -70],
          [90, -68], [130, -72], [100, -82], [50, -85], [0, -82],
          [-45, -78], [-65, -72]
        ]
      },
      {
        id: 'australia_0',
        name: 'Australia',
        color: '#8a7a60',
        vertices: [
          [115, -14], [128, -12], [142, -10], [152, -16], [154, -28],
          [150, -36], [138, -38], [122, -34], [114, -25]
        ]
      }
    ]
  }
};

/**
 * Find the two bracketing time slices for a given time.
 * Returns { before, after, alpha } where alpha is 0-1 interpolation factor.
 */
export function getBracketingSlices(timeMa) {
  // Clamp to range
  if (timeMa >= timeSlices[0]) {
    return { before: timeSlices[0], after: timeSlices[0], alpha: 0 };
  }
  if (timeMa <= timeSlices[timeSlices.length - 1]) {
    const last = timeSlices[timeSlices.length - 1];
    return { before: last, after: last, alpha: 0 };
  }

  for (let i = 0; i < timeSlices.length - 1; i++) {
    if (timeMa <= timeSlices[i] && timeMa >= timeSlices[i + 1]) {
      const before = timeSlices[i];
      const after = timeSlices[i + 1];
      const alpha = (before - timeMa) / (before - after);
      return { before, after, alpha };
    }
  }

  return { before: timeSlices[0], after: timeSlices[0], alpha: 0 };
}
