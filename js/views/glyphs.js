// Marker glyphs — one shape per life group (LIFE_GROUPS[].glyph in js/config.js), so that colour
// is never the only cue: a colour-blind viewer can still tell a fish from a dinosaur.
//
//   'dot' microbes · 'leaf' plants, algae & fungi · 'star' invertebrates · 'hex' arthropods ·
//   'oval' fishes · 'triangle' amphibians, reptiles & birds · 'square' synapsids & mammals ·
//   'ring' primates & humans
//
// The shapes are drawn to share one visual weight and stay tellable apart at 8 px. All renderers
// and panels draw them from here:
//
//   drawGlyph(ctx, glyph, x, y, r, { fill, stroke, strokeWidth })   // canvas: bare shape
//   drawMarker(ctx, glyph, x, y, r, color, { ring, ringWidth, highlight, alpha })
//                                                                   // canvas: the full map marker
//   glyphSvg(glyph, color, size)                                    // inline SVG markup (legend, lists)
//   glyphCanvas(glyph, color, sizePx, pixelRatio)                   // cached sprite (globe textures)
//   GLYPHS                                                          // the list of glyph names

import { COLORS } from '../config.js';

// Shapes in a unit box (x right, y down); the glyph radius r maps to 1.
const TAU = Math.PI * 2;

function polygon(points) {
  return `M${points.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join('L')}Z`;
}

function circle(r) {
  return `M${r},0A${r},${r} 0 1,0 ${-r},0A${r},${r} 0 1,0 ${r},0Z`;
}

function starPoints(outer, inner, count) {
  const pts = [];
  for (let i = 0; i < count * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / count;
    pts.push([Math.cos(a) * radius, Math.sin(a) * radius + 0.04]);
  }
  return pts;
}

function hexPoints(radius) {
  const pts = [];
  for (let i = 0; i < 6; i++) pts.push([Math.cos((i * TAU) / 6) * radius, Math.sin((i * TAU) / 6) * radius]);
  return pts;
}

const SHAPES = {
  dot: { d: circle(0.84) },
  // a disc with a pierced centre
  ring: { d: `${circle(0.96)}${circle(0.4)}`, evenOdd: true },
  // a diagonal leaf: two arcs meeting at pointed tips
  leaf: { d: 'M-0.86,0.86Q0.84,0.84 0.86,-0.86Q-0.84,-0.84 -0.86,0.86Z' },
  star: { d: polygon(starPoints(1.08, 0.5, 5)) },
  hex: { d: polygon(hexPoints(0.96)) },
  oval: { d: 'M1.08,0A1.08,0.64 0 1,0 -1.08,0A1.08,0.64 0 1,0 1.08,0Z' },
  triangle: { d: polygon([[0, -0.98], [0.98, 0.72], [-0.98, 0.72]]) },
  square: { d: 'M-0.52,-0.76H0.52Q0.76,-0.76 0.76,-0.52V0.52Q0.76,0.76 0.52,0.76H-0.52Q-0.76,0.76 -0.76,0.52V-0.52Q-0.76,-0.76 -0.52,-0.76Z' },
};

/** Every glyph name, in LIFE_GROUPS order. */
export const GLYPHS = ['dot', 'leaf', 'star', 'hex', 'oval', 'triangle', 'square', 'ring'];

const shapeOf = (glyph) => SHAPES[glyph] || SHAPES.dot;

const paths = new Map();
function pathOf(glyph) {
  let p = paths.get(glyph);
  if (!p) {
    p = new Path2D(shapeOf(glyph).d);
    paths.set(glyph, p);
  }
  return p;
}

/**
 * Draw a bare glyph centred on (x, y) with radius r.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} glyph  one of GLYPHS (unknown names fall back to 'dot')
 * @param {{fill?: string, stroke?: string, strokeWidth?: number}} [style]
 *   stroke is drawn first and OUTSIDE the shape (an outline of strokeWidth px), then the fill.
 */
export function drawGlyph(ctx, glyph, x, y, r, { fill, stroke, strokeWidth = 1.5 } = {}) {
  if (!(r > 0)) return;
  const shape = shapeOf(glyph);
  const path = pathOf(glyph);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  if (stroke && strokeWidth > 0) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = (strokeWidth * 2) / r;
    ctx.strokeStyle = stroke;
    ctx.stroke(path);
  }
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(path, shape.evenOdd ? 'evenodd' : 'nonzero');
  }
  ctx.restore();
}

/**
 * Draw a complete species marker: dark outline ring (separates it from any background), the
 * family glyph in its colour, and a small white-hot highlight.
 * @param {{ring?: string, ringWidth?: number, highlight?: boolean, alpha?: number}} [options]
 */
export function drawMarker(ctx, glyph, x, y, r, color, { ring = COLORS.background, ringWidth = 1.5, highlight = true, alpha = 1 } = {}) {
  if (!(r > 0) || !(alpha > 0)) return;
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * alpha;
  drawGlyph(ctx, glyph, x, y, r, { fill: color, stroke: ring, strokeWidth: ringWidth });
  if (highlight) {
    const hr = Math.max(0.9, r * 0.3);
    const hx = glyph === 'ring' ? x - r * 0.48 : x - r * 0.2;
    const hy = glyph === 'ring' ? y - r * 0.48 : y - r * 0.24;
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = previous;
}

/**
 * Inline SVG markup for a glyph (legend rows, sidebar rows, popup titles).
 * @param {string} glyph
 * @param {string} color  any CSS colour
 * @param {number} [size=14]  rendered width and height in px
 * @returns {string} `<svg …>…</svg>` (decorative: aria-hidden)
 */
export function glyphSvg(glyph, color, size = 14) {
  const shape = shapeOf(glyph);
  const rule = shape.evenOdd ? ' fill-rule="evenodd"' : '';
  return `<svg class="glyph glyph-${SHAPES[glyph] ? glyph : 'dot'}" width="${size}" height="${size}" viewBox="-1.3 -1.3 2.6 2.6" aria-hidden="true" focusable="false">`
    + `<path d="${shape.d}" fill="${color}"${rule} stroke="${COLORS.background}" stroke-width="0.22" stroke-linejoin="round" paint-order="stroke"/></svg>`;
}

const sprites = new Map();

/**
 * A cached sprite of the full marker (soft halo, dark ring, glyph, highlight), for renderers that
 * cannot draw vectors per frame (the globe's marker textures).
 * The glyph is centred and its radius is 0.3 × sizePx; the rest of the canvas holds the halo.
 * @param {string} glyph
 * @param {string} color        #rrggbb
 * @param {number} sizePx       width and height in CSS px
 * @param {number} [pixelRatio=1]
 * @returns {HTMLCanvasElement} shared — do not draw into it
 */
export function glyphCanvas(glyph, color, sizePx, pixelRatio = 1) {
  const key = `${glyph}|${color}|${sizePx}|${pixelRatio}`;
  let canvas = sprites.get(key);
  if (canvas) return canvas;
  const px = Math.max(2, Math.round(sizePx * pixelRatio));
  canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.scale(px / sizePx, px / sizePx);
  const c = sizePx / 2;
  const r = sizePx * 0.3;
  const halo = ctx.createRadialGradient(c, c, r * 0.6, c, c, sizePx / 2);
  halo.addColorStop(0, hexToRgba(color, 0.42));
  halo.addColorStop(0.5, hexToRgba(color, 0.14));
  halo.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, sizePx, sizePx);
  drawMarker(ctx, glyph, c, c, r, color, { ringWidth: Math.max(1.2, sizePx * 0.05) });
  if (sprites.size > 600) sprites.clear();
  sprites.set(key, canvas);
  return canvas;
}

function hexToRgba(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(154,163,181,${alpha})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}
