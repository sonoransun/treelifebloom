// Deterministic fractal subdivision for polygon coastlines.
// Uses midpoint displacement with coordinate-based hashing for jitter-free animation.

import { RENDER } from '../config.js';

function hashCoords(x1, y1, x2, y2) {
  let h = ((x1 * 73856093) ^ (y1 * 19349663) ^ (x2 * 83492791) ^ (y2 * 67867979)) | 0;
  return ((h & 0x7fffffff) % 10000) / 5000 - 1; // range [-1, 1]
}

function subdivideEdge(ax, ay, bx, by, depth, amplitude) {
  if (depth === 0) return [[bx, by]];

  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;

  // Perpendicular direction
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-8) return [[bx, by]];

  const px = -dy / len;
  const py = dx / len;

  // Deterministic displacement from coordinate hash
  const displacement = hashCoords(
    Math.round(ax * 100), Math.round(ay * 100),
    Math.round(bx * 100), Math.round(by * 100)
  ) * amplitude * len;

  // Latitude correction: scale longitude displacement by cos(latitude)
  const avgLat = my * (Math.PI / 180);
  const cosLat = Math.max(0.3, Math.cos(avgLat));

  const nx = mx + px * displacement / cosLat;
  const ny = my + py * displacement;

  const nextAmp = amplitude * 0.5;
  const left = subdivideEdge(ax, ay, nx, ny, depth - 1, nextAmp);
  const right = subdivideEdge(nx, ny, bx, by, depth - 1, nextAmp);

  return [...left, ...right];
}

export function fractalSubdivide(
  vertices,
  depth = RENDER.fractalDepth,
  amplitude = RENDER.fractalAmplitude
) {
  if (!vertices || vertices.length < 3) return vertices;

  const result = [];
  for (let i = 0; i < vertices.length; i++) {
    const [ax, ay] = vertices[i];
    const [bx, by] = vertices[(i + 1) % vertices.length];
    result.push([ax, ay]);
    const subdivided = subdivideEdge(ax, ay, bx, by, depth, amplitude);
    // subdivideEdge returns points up to and including B; skip B since it's the next vertex's start
    for (let j = 0; j < subdivided.length - 1; j++) {
      result.push(subdivided[j]);
    }
  }

  return result;
}
