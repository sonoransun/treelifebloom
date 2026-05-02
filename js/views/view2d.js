// 2D Canvas equirectangular map renderer.

import { COLORS, RENDER } from '../config.js';
import { getPeriodAtTime } from '../data/timeline.js';
import { getActiveExtinction } from '../data/extinctions.js';
import { getSpeciesAtTime } from '../data/species.js';
import { getGlaciation } from '../data/glaciation.js';
import { fractalSubdivide } from '../engine/fractal.js';
import { fbm3D, terrainProfileForAge } from '../engine/terrainNoise.js';
import { mixColors, hexToRgb } from '../util/colorMix.js';
import { computeHaze, continentColorAtLatitude } from '../util/atmoVisual.js';
import { cladeColor, hasRimRing } from '../util/taxonomy.js';
import { GLACIATION } from '../config.js';

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

    // Hover state — recorded per-frame so hit-test can find species under cursor.
    this._markerHits = []; // [{sp, x, y, r}]
    this._hoverCb = null;

    // Bound handlers for cleanup
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
  }

  onSpeciesHover(cb) {
    this._hoverCb = cb;
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

  render(polygons, timeMa, boundaries = null, atmo = null) {
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
    let oceanBase = extinction
      ? mixColors(COLORS.ocean, '#3a1010', extinction.progress * 0.4)
      : COLORS.ocean;
    let oceanEdge = extinction
      ? mixColors(COLORS.oceanDeep, '#2a0808', extinction.progress * 0.4)
      : COLORS.oceanDeep;
    // Atmospheric tint on the ocean too (subtle: half the haze magnitude)
    if (atmo) {
      const haze = computeHaze(atmo);
      if (haze) {
        const tintRgb = `rgb(${haze.rgb.r},${haze.rgb.g},${haze.rgb.b})`;
        oceanBase = mixColors(oceanBase, tintRgb, haze.alpha * 0.5);
        oceanEdge = mixColors(oceanEdge, tintRgb, haze.alpha * 0.5);
      }
    }
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    gradient.addColorStop(0, oceanBase);
    gradient.addColorStop(1, oceanEdge);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 1.5. Polar ice caps (drawn over ocean, under land — so coastlines win)
    const glaciation = getGlaciation(timeMa);
    if (glaciation.alpha > 0.02) {
      this._renderIceCaps(ctx, w, h, glaciation);
    }

    // 2. Graticule — base grid + emphasized equator + tropics & polar circles
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    for (let lon = -180; lon <= 180; lon += RENDER.gridSpacingDeg) {
      if (lon === 0) continue; // prime meridian drawn emphasized below
      const [x] = this._lonLatToXY(lon, 0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let lat = -90; lat <= 90; lat += RENDER.gridSpacingDeg) {
      if (lat === 0) continue;
      const [, y] = this._lonLatToXY(0, lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Tropics & polar circles — subtle dashed bands of climate zones
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255, 230, 180, 0.10)';
    for (const lat of [23.5, -23.5, 66.5, -66.5]) {
      const [, y] = this._lonLatToXY(0, lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Equator — slightly brighter solid
    {
      const [, y] = this._lonLatToXY(0, 0);
      ctx.strokeStyle = 'rgba(255, 240, 200, 0.18)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Prime meridian — same emphasis
    {
      const [x] = this._lonLatToXY(0, 0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.lineWidth = 0.5;

    // 2.5. Tectonic plate boundaries
    if (boundaries) {
      this._renderBoundaries(ctx, boundaries);
    }

    // 3. Continental polygons — smooth Bezier coastlines with hillshaded relief
    //    and elevation-threshold contour bands (highland + snow caps).
    const terrainProfile = terrainProfileForAge(timeMa);
    for (const continent of polygons) {
      if (continent.vertices.length < 3) continue;

      const fractalVerts = fractalSubdivide(continent.vertices);
      const pixelPts = fractalVerts.map(([lon, lat]) => this._lonLatToXY(lon, lat));

      const buildPath = () => {
        ctx.beginPath();
        this._tracePath(ctx, pixelPts);
      };

      // Fill — blend with latitude palette for tropical green / polar grey
      const center = this._polygonCentroid(continent.vertices);
      let baseColor = continentColorAtLatitude(continent.color, center[1]);
      if (extinction) {
        baseColor = mixColors(baseColor, '#4a2020', extinction.progress * 0.3);
      }
      buildPath();
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = RENDER.continentFillAlpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Hillshade + contour bands — clipped to the polygon path so blobs can't spill.
      ctx.save();
      buildPath();
      ctx.clip();
      this._renderHillshade(ctx, pixelPts, terrainProfile, w, h);
      ctx.restore();

      // Outer glow
      buildPath();
      ctx.strokeStyle = COLORS.landStroke;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Stroke
      buildPath();
      ctx.strokeStyle = COLORS.landStroke;
      ctx.lineWidth = RENDER.landStrokeWidth;
      ctx.stroke();

      // Label (only at sufficient zoom)
      if (this.zoom >= 1) {
        const [cx, cy] = this._lonLatToXY(center[0], center[1]);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(continent.name, cx, cy);
      }
    }

    // 3.5. Atmospheric haze overlay (after land, so it tints the whole scene cohesively)
    if (atmo) {
      const haze = computeHaze(atmo);
      if (haze) {
        ctx.fillStyle = haze.color;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // 4. Species markers — soft halo + inner highlight, with rim ring for advanced clades
    const aliveSpecies = getSpeciesAtTime(timeMa);
    const now = performance.now() / 1000;
    this._markerHits = [];
    for (const sp of aliveSpecies) {
      if (!sp.taxonomy) continue;
      const [x, y] = this._lonLatToXY(sp.location.lon, sp.location.lat);
      const categoryColor = cladeColor(sp);
      const rgb = hexToRgb(categoryColor);
      const pulse = Math.sin(now * 2 + sp.location.lon) * RENDER.speciesMarkerPulseAmplitude;
      const radius = Math.max(2, RENDER.speciesMarkerRadius + pulse);
      const haloR = radius * 4.5;
      this._markerHits.push({ sp, x, y, r: radius + 4 });

      // Halo — radial gradient, additive feel
      const haloGrad = ctx.createRadialGradient(x, y, 0, x, y, haloR);
      haloGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.55)`);
      haloGrad.addColorStop(0.35, `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`);
      haloGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Rim ring for mammalian/avian clades resolved to order or deeper
      if (hasRimRing(sp)) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Marker body
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = categoryColor;
      ctx.globalAlpha = 0.92;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Inner highlight — tiny offset spec dot
      ctx.beginPath();
      ctx.arc(x - radius * 0.3, y - radius * 0.3, Math.max(0.6, radius * 0.35), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fill();
    }

    // 5. Extinction flash — per-event color, with K-Pg asteroid streak at entry
    if (extinction) {
      const flashRgb = hexToRgb(extinction.color);
      const flashIntensity = Math.sin(extinction.progress * Math.PI) * 0.22 * (extinction.severityPercent / 100);
      ctx.fillStyle = `rgba(${flashRgb.r}, ${flashRgb.g}, ${flashRgb.b}, ${flashIntensity})`;
      ctx.fillRect(0, 0, w, h);

      // K-Pg asteroid streak — bright diagonal flash during the first slice of the event
      if (extinction.id === 'end-cretaceous' && extinction.progress < 0.18) {
        const streakAlpha = (1 - extinction.progress / 0.18) * 0.9;
        const streakGrad = ctx.createLinearGradient(w * 0.05, h * 0.0, w * 0.6, h * 0.85);
        streakGrad.addColorStop(0, `rgba(255, 255, 255, 0)`);
        streakGrad.addColorStop(0.5, `rgba(255, 240, 200, ${streakAlpha})`);
        streakGrad.addColorStop(0.85, `rgba(255, 140, 60, ${streakAlpha * 0.7})`);
        streakGrad.addColorStop(1, `rgba(255, 60, 20, 0)`);
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = streakGrad;
        ctx.shadowColor = `rgba(255, 200, 120, ${streakAlpha})`;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(w * 0.05, h * 0.0);
        ctx.lineTo(w * 0.62, h * 0.85);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // Hillshaded relief inside a polygon. Caller is responsible for clipping
  // to the polygon path. Reuses the same fbm3D field used by the 3D globe so
  // peaks/valleys appear in matching lat/lon when toggling views.
  _renderHillshade(ctx, pixelPts, profile, w, h) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of pixelPts) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const spacing = RENDER.view2dHillshadeSpacing;
    const blobR   = RENDER.view2dHillshadeBlobRadius;
    const baseA   = RENDER.view2dHillshadeAlpha;
    const highT   = RENDER.view2dHighlandThreshold;
    const highR   = RENDER.view2dHighlandBlobRadius;
    const highA   = RENDER.view2dHighlandAlpha;
    const snowT   = RENDER.view2dSnowThreshold;
    const snowR   = RENDER.view2dSnowBlobRadius;
    const snowA   = RENDER.view2dSnowAlpha;

    const snow      = RENDER.terrainSnowColor;
    const highland  = RENDER.terrainHighlandColor;
    const hotPeak   = RENDER.view2dHotPeakColor;
    const hot       = profile.hotTint;
    const freq      = profile.freq;
    const jaggExp   = 1 + profile.jaggedness;
    const octaves   = profile.octaves;

    // Precompute hot-tinted band/peak colors once per polygon.
    const peakColor = hot > 0 ? mixColors(snow, hotPeak, Math.min(1, hot * 1.6)) : snow;
    const bandColor = hot > 0 ? mixColors(highland, hotPeak, hot) : highland;
    const snowColor = hot > 0 ? mixColors(snow, hotPeak, hot * 1.2) : snow;

    let row = 0;
    for (let py = minY; py <= maxY; py += spacing) {
      const offX = (row & 1) ? spacing * 0.5 : 0;
      for (let px = minX + offX; px <= maxX; px += spacing) {
        // Pixel -> lon/lat -> unit-sphere xyz (matches 3D _lonLatToVector3).
        const lon = (px / w) * 360 - 180;
        const lat = 90 - (py / h) * 180;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const sinPhi = Math.sin(phi);
        const ux = -sinPhi * Math.cos(theta);
        const uy = Math.cos(phi);
        const uz = sinPhi * Math.sin(theta);

        let n = fbm3D(ux * freq, uy * freq, uz * freq, octaves);
        if (n > 1) n = 1; else if (n < -1) n = -1;
        const sign = n >= 0 ? 1 : -1;
        const relAlt = sign * Math.pow(Math.abs(n), jaggExp);

        // Hillshade base: light on positive relAlt, dark on negative.
        if (relAlt >= 0) {
          ctx.fillStyle = peakColor;
          ctx.globalAlpha = baseA * Math.min(1, relAlt + 0.15);
        } else {
          ctx.fillStyle = '#000000';
          ctx.globalAlpha = baseA * Math.min(1, -relAlt + 0.10);
        }
        ctx.beginPath();
        ctx.arc(px, py, blobR, 0, Math.PI * 2);
        ctx.fill();

        // Highland contour band.
        if (relAlt > highT) {
          const t = (relAlt - highT) / Math.max(0.001, snowT - highT);
          ctx.fillStyle = bandColor;
          ctx.globalAlpha = highA * Math.min(1, t + 0.3);
          ctx.beginPath();
          ctx.arc(px, py, highR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Snow-cap peak band.
        if (relAlt > snowT) {
          ctx.fillStyle = snowColor;
          ctx.globalAlpha = snowA * Math.min(1, (relAlt - snowT) / 0.4 + 0.5);
          ctx.beginPath();
          ctx.arc(px, py, snowR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      row++;
    }
    ctx.globalAlpha = 1;
  }

  _renderBoundaries(ctx, boundaries) {
    for (const boundary of boundaries) {
      if (boundary.vertices.length < 2) continue;
      const segments = this._boundarySegments(boundary);
      if (segments.length === 0) continue;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = RENDER.view2dBoundaryAlpha;

      if (boundary.type === 'convergent') {
        this._renderConvergentBoundary(ctx, segments);
      } else if (boundary.type === 'divergent') {
        this._renderDivergentBoundary(ctx, segments);
      } else {
        this._renderTransformBoundary(ctx, segments);
      }

      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Pixel-space line segments, dropping any antimeridian-crossing segment.
  _boundarySegments(boundary) {
    const segs = [];
    for (let i = 0; i < boundary.vertices.length - 1; i++) {
      const lon1 = boundary.vertices[i][0];
      const lat1 = boundary.vertices[i][1];
      const lon2 = boundary.vertices[i + 1][0];
      const lat2 = boundary.vertices[i + 1][1];
      if (Math.abs(lon2 - lon1) > 180) continue;
      const [x1, y1] = this._lonLatToXY(lon1, lat1);
      const [x2, y2] = this._lonLatToXY(lon2, lat2);
      segs.push({ x1, y1, x2, y2 });
    }
    return segs;
  }

  _strokePolyline(ctx, segments) {
    ctx.beginPath();
    for (const { x1, y1, x2, y2 } of segments) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }

  // Stroke each segment shifted perpendicularly by `offset` pixels.
  // Adjacent segments don't perfectly miter at the offset, but at thin widths
  // the gaps are invisible and the round lineCap hides them further.
  _strokeOffsetPolyline(ctx, segments, offset) {
    ctx.beginPath();
    for (const { x1, y1, x2, y2 } of segments) {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.5) continue;
      const ox = (-dy / len) * offset;
      const oy = ( dx / len) * offset;
      ctx.moveTo(x1 + ox, y1 + oy);
      ctx.lineTo(x2 + ox, y2 + oy);
    }
    ctx.stroke();
  }

  _renderConvergentBoundary(ctx, segments) {
    // Layered ridge: dark drop shadow → mid-tone base body → bright snow centerline.
    // Then oversized teeth pointing perpendicular, suggesting overriding plate.
    ctx.shadowBlur = 0;

    // Drop shadow for depth illusion (offset DOWN-RIGHT).
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = RENDER.view2dConvergentShadowWidth;
    this._strokeOffsetPolyline(ctx, segments, 1.6);

    // Main ridge body with halo glow.
    ctx.shadowColor = RENDER.boundaryConvergentBaseColor;
    ctx.shadowBlur = RENDER.view2dBoundaryGlow;
    ctx.strokeStyle = RENDER.boundaryConvergentBaseColor;
    ctx.lineWidth = RENDER.view2dConvergentBaseWidth;
    this._strokePolyline(ctx, segments);

    // Snow-cap centerline.
    ctx.shadowColor = RENDER.boundaryConvergentApexColor;
    ctx.shadowBlur = RENDER.view2dBoundaryGlow * 0.6;
    ctx.strokeStyle = RENDER.boundaryConvergentApexColor;
    ctx.lineWidth = RENDER.view2dConvergentSnowWidth;
    this._strokePolyline(ctx, segments);

    ctx.shadowBlur = 0;

    // Big teeth.
    this._drawConvergentTeeth(
      ctx, segments,
      RENDER.view2dConvergentToothSize,
      RENDER.view2dConvergentToothSpacing,
      RENDER.boundaryConvergentBaseColor
    );
  }

  _renderDivergentBoundary(ctx, segments) {
    // Twin parallel ridge rails with a glowing red axial rift between them.
    const railOff = RENDER.view2dDivergentRailOffset;
    ctx.shadowBlur = 0;

    // Outer dark halo to suggest mass under the ridges.
    ctx.strokeStyle = 'rgba(20,28,42,0.7)';
    ctx.lineWidth = RENDER.view2dDivergentRailWidth + 4;
    this._strokePolyline(ctx, segments);

    // Twin ridge rails (one each side of the centerline).
    ctx.strokeStyle = RENDER.boundaryDivergentLipColor;
    ctx.lineWidth = RENDER.view2dDivergentRailWidth;
    this._strokeOffsetPolyline(ctx, segments,  railOff);
    this._strokeOffsetPolyline(ctx, segments, -railOff);

    // Glowing axial rift core.
    ctx.shadowColor = RENDER.boundaryDivergentInnerColor;
    ctx.shadowBlur = RENDER.view2dBoundaryGlow + 2;
    ctx.strokeStyle = RENDER.boundaryDivergentInnerColor;
    ctx.lineWidth = RENDER.view2dDivergentCoreWidth;
    this._strokePolyline(ctx, segments);

    ctx.shadowBlur = 0;
  }

  _renderTransformBoundary(ctx, segments) {
    // Twin offset cliff: upper rail bright, lower rail dark, suggesting strike-slip step.
    const off = RENDER.view2dTransformRailOffset;
    ctx.shadowBlur = 0;

    // Lower (shadow) rail.
    ctx.strokeStyle = RENDER.boundaryTransformLowerColor;
    ctx.lineWidth = RENDER.view2dTransformRailWidth;
    ctx.setLineDash([8, 5]);
    this._strokeOffsetPolyline(ctx, segments, -off);

    // Upper (lit) rail with halo glow.
    ctx.shadowColor = RENDER.boundaryTransformUpperColor;
    ctx.shadowBlur = RENDER.view2dBoundaryGlow * 0.7;
    ctx.strokeStyle = RENDER.boundaryTransformUpperColor;
    ctx.lineWidth = RENDER.view2dTransformRailWidth;
    this._strokeOffsetPolyline(ctx, segments,  off);

    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }

  _drawConvergentTeeth(ctx, segments, size, spacing, color) {
    ctx.fillStyle = color;
    for (const { x1, y1, x2, y2 } of segments) {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < spacing * 0.5) continue;
      const tx = dx / len, ty = dy / len;
      const px = -ty * size, py = tx * size;
      const nTeeth = Math.max(1, Math.floor(len / spacing));
      for (let k = 1; k <= nTeeth; k++) {
        const t = k / (nTeeth + 1);
        const mx = x1 + dx * t;
        const my = y1 + dy * t;
        ctx.beginPath();
        ctx.moveTo(mx - tx * size * 0.5, my - ty * size * 0.5);
        ctx.lineTo(mx + px, my + py);
        ctx.lineTo(mx + tx * size * 0.5, my + ty * size * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  _renderIceCaps(ctx, w, h, glaciation) {
    const { northCapLatRadius, southCapLatRadius, alpha } = glaciation;
    const capRgb = hexToRgb(GLACIATION.capColor);

    // North cap: lat 90 down to 90 - northCapLatRadius → y=0 to y at that lat
    if (northCapLatRadius > 0) {
      const [, yEdge] = this._lonLatToXY(0, 90 - northCapLatRadius);
      const grad = ctx.createLinearGradient(0, 0, 0, yEdge);
      grad.addColorStop(0, `rgba(${capRgb.r},${capRgb.g},${capRgb.b},${alpha.toFixed(3)})`);
      grad.addColorStop(1, `rgba(${capRgb.r},${capRgb.g},${capRgb.b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, yEdge);
    }

    // South cap: lat -90 up to -90 + southCapLatRadius
    if (southCapLatRadius > 0) {
      const [, yEdge] = this._lonLatToXY(0, -90 + southCapLatRadius);
      const grad = ctx.createLinearGradient(0, h, 0, yEdge);
      grad.addColorStop(0, `rgba(${capRgb.r},${capRgb.g},${capRgb.b},${alpha.toFixed(3)})`);
      grad.addColorStop(1, `rgba(${capRgb.r},${capRgb.g},${capRgb.b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, yEdge, w, h - yEdge);
    }
  }

  // Trace a closed smooth path through the given pixel points using
  // quadratic Beziers passing through midpoints — gives soft coastlines.
  _tracePath(ctx, points) {
    const n = points.length;
    if (n === 0) return;
    if (n < 3) {
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < n; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
      return;
    }
    const last = points[n - 1];
    const first = points[0];
    ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
    for (let i = 0; i < n; i++) {
      const cur = points[i];
      const next = points[(i + 1) % n];
      ctx.quadraticCurveTo(cur[0], cur[1], (cur[0] + next[0]) / 2, (cur[1] + next[1]) / 2);
    }
    ctx.closePath();
  }

  _polygonCentroid(vertices) {
    let sumLon = 0, sumLat = 0;
    for (const [lon, lat] of vertices) {
      sumLon += lon;
      sumLat += lat;
    }
    return [sumLon / vertices.length, sumLat / vertices.length];
  }

  // Pan/zoom interaction handlers
  _onMouseDown(e) {
    this._dragging = true;
    this._lastMouse = { x: e.clientX, y: e.clientY };
  }

  _onMouseMove(e) {
    if (this._dragging && this._lastMouse) {
      this.panX += (e.clientX - this._lastMouse.x) / this.zoom;
      this.panY += (e.clientY - this._lastMouse.y) / this.zoom;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }
    // Hover hit-test in canvas-local coords.
    if (!this._hoverCb) return;
    const rect = this.canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left);
    const cy = (e.clientY - rect.top);
    // Account for pan/zoom — markers are drawn in zoomed space.
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const localX = (cx - this.panX - halfW * (1 - this.zoom)) / this.zoom;
    const localY = (cy - this.panY - halfH * (1 - this.zoom)) / this.zoom;

    let best = null;
    let bestDist = Infinity;
    for (const hit of this._markerHits) {
      const dx = hit.x - localX;
      const dy = hit.y - localY;
      const d2 = dx * dx + dy * dy;
      const r = hit.r + 4; // generous hit area
      if (d2 <= r * r && d2 < bestDist) {
        bestDist = d2;
        best = hit;
      }
    }
    this.canvas.style.cursor = best ? 'pointer' : '';
    this._hoverCb(best ? best.sp : null, e.clientX, e.clientY);
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
