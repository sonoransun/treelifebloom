// 2D Canvas equirectangular map renderer.

import { COLORS, RENDER } from '../config.js';
import { getPeriodAtTime } from '../data/timeline.js';
import { getActiveExtinction } from '../data/extinctions.js';
import { getSpeciesAtTime } from '../data/species.js';
import { fractalSubdivide } from '../engine/fractal.js';

export class View2D {
  constructor(container) {
    this.container = container;
    this.canvas = container.querySelector('#canvas2d');
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    // Pan/zoom state
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this._dragging = false;
    this._lastMouse = null;

    // Bound handlers for cleanup
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
  }

  init() {
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.style.display = 'block';
    this.resize();

    // Interaction
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('mouseleave', this._onMouseUp);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
  }

  destroy() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('mouseleave', this._onMouseUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.style.display = 'none';
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // Convert lon/lat to canvas pixel coordinates
  _lonLatToXY(lon, lat) {
    const x = ((lon + 180) / 360) * this.width;
    const y = ((90 - lat) / 180) * this.height;
    return [x, y];
  }

  render(polygons, timeMa) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Apply pan/zoom transform
    ctx.save();
    ctx.setTransform(this.dpr * this.zoom, 0, 0, this.dpr * this.zoom,
      this.dpr * (this.panX + w * (1 - this.zoom) / 2),
      this.dpr * (this.panY + h * (1 - this.zoom) / 2));

    // Get current period for coloring
    const period = getPeriodAtTime(timeMa);
    const extinction = getActiveExtinction(timeMa);

    // 1. Ocean background with depth gradient
    const oceanBase = extinction
      ? this._mixColors(COLORS.ocean, '#3a1010', extinction.progress * 0.4)
      : COLORS.ocean;
    const oceanEdge = extinction
      ? this._mixColors(COLORS.oceanDeep, '#2a0808', extinction.progress * 0.4)
      : COLORS.oceanDeep;
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    gradient.addColorStop(0, oceanBase);
    gradient.addColorStop(1, oceanEdge);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 2. Grid lines
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;
    for (let lon = -180; lon <= 180; lon += RENDER.gridSpacingDeg) {
      const [x] = this._lonLatToXY(lon, 0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let lat = -90; lat <= 90; lat += RENDER.gridSpacingDeg) {
      const [, y] = this._lonLatToXY(0, lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 3. Continental polygons
    for (const continent of polygons) {
      if (continent.vertices.length < 3) continue;

      const fractalVerts = fractalSubdivide(continent.vertices);

      ctx.beginPath();
      const [x0, y0] = this._lonLatToXY(fractalVerts[0][0], fractalVerts[0][1]);
      ctx.moveTo(x0, y0);
      for (let i = 1; i < fractalVerts.length; i++) {
        const [x, y] = this._lonLatToXY(fractalVerts[i][0], fractalVerts[i][1]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Fill
      ctx.fillStyle = extinction
        ? this._mixColors(continent.color, '#4a2020', extinction.progress * 0.3)
        : continent.color;
      ctx.globalAlpha = RENDER.continentFillAlpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Outer glow
      ctx.strokeStyle = COLORS.landStroke;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Stroke
      ctx.strokeStyle = COLORS.landStroke;
      ctx.lineWidth = RENDER.landStrokeWidth;
      ctx.stroke();

      // Label (only at sufficient zoom)
      if (this.zoom >= 1) {
        const center = this._polygonCentroid(continent.vertices);
        const [cx, cy] = this._lonLatToXY(center[0], center[1]);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(continent.name, cx, cy);
      }
    }

    // 4. Species markers
    const aliveSpecies = getSpeciesAtTime(timeMa);
    const now = performance.now() / 1000;
    for (const sp of aliveSpecies) {
      if (sp.category === 'event') continue; // Don't draw markers for events
      const [x, y] = this._lonLatToXY(sp.location.lon, sp.location.lat);
      const categoryColor = COLORS.kingdom[sp.category] || '#aaa';
      const pulse = Math.sin(now * 2 + sp.location.lon) * RENDER.speciesMarkerPulseAmplitude;
      const radius = RENDER.speciesMarkerRadius + pulse;

      // Glow
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = categoryColor + '20';
      ctx.fill();

      // Marker
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, radius), 0, Math.PI * 2);
      ctx.fillStyle = categoryColor;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 5. Extinction flash effect
    if (extinction) {
      const flashIntensity = Math.sin(extinction.progress * Math.PI) * 0.15 * (extinction.severityPercent / 100);
      ctx.fillStyle = `rgba(255, 0, 0, ${flashIntensity})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  _polygonCentroid(vertices) {
    let sumLon = 0, sumLat = 0;
    for (const [lon, lat] of vertices) {
      sumLon += lon;
      sumLat += lat;
    }
    return [sumLon / vertices.length, sumLat / vertices.length];
  }

  _mixColors(color1, color2, t) {
    const c1 = this._hexToRgb(color1);
    const c2 = this._hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  // Pan/zoom interaction handlers
  _onMouseDown(e) {
    this._dragging = true;
    this._lastMouse = { x: e.clientX, y: e.clientY };
  }

  _onMouseMove(e) {
    if (!this._dragging || !this._lastMouse) return;
    this.panX += (e.clientX - this._lastMouse.x) / this.zoom;
    this.panY += (e.clientY - this._lastMouse.y) / this.zoom;
    this._lastMouse = { x: e.clientX, y: e.clientY };
  }

  _onMouseUp() {
    this._dragging = false;
    this._lastMouse = null;
  }

  _onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    this.zoom = Math.max(0.5, Math.min(5, this.zoom * zoomFactor));
  }
}
