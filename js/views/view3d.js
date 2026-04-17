// 3D Globe renderer using Three.js.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COLORS, RENDER, ATMOSPHERE, GLACIATION } from '../config.js';
import { getPeriodAtTime } from '../data/timeline.js';
import { getActiveExtinction } from '../data/extinctions.js';
import { getSpeciesAtTime } from '../data/species.js';
import { getGlaciation } from '../data/glaciation.js';
import { fractalSubdivide } from '../engine/fractal.js';
import { computeHaze, continentColorAtLatitude } from '../util/atmoVisual.js';

export class View3D {
  constructor(container) {
    this.containerEl = container.querySelector('#globe-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.globe = null;
    this.continentMeshes = [];
    this.speciesMarkers = [];
    this.boundaryLines = [];
    this.starfield = null;
    this._initialized = false;
    this._hoverCb = null;
    this._raycaster = null;
    this._pointerNdc = null;
    this._onPointerMove = null;
  }

  onSpeciesHover(cb) {
    this._hoverCb = cb;
  }

  init() {
    if (this._initialized) {
      this.containerEl.style.display = 'block';
      return;
    }

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0.5, 2.8);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x0a0e1a, 1);
    this.containerEl.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 5;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = RENDER.autoRotateSpeed;

    // Lighting — lower ambient lets the day/night terminator show on the globe.
    this.ambientLight = new THREE.AmbientLight(0x445577, ATMOSPHERE.ambientLow);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.4);
    this.sunLight.position.set(3, 1.5, 5);
    this.scene.add(this.sunLight);

    // Soft rim/back light so the night side isn't pitch black.
    this.rimLight = new THREE.DirectionalLight(0x6688aa, ATMOSPHERE.rimLightStrength);
    this.rimLight.position.set(-3, -0.5, -4);
    this.scene.add(this.rimLight);

    // Globe sphere (ocean)
    const globeGeometry = new THREE.SphereGeometry(RENDER.globeRadius, 64, 64);
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(COLORS.ocean),
      shininess: 40,
      specular: new THREE.Color(0x446688),
    });
    this.globe = new THREE.Mesh(globeGeometry, globeMaterial);
    this.scene.add(this.globe);

    // Atmosphere shell — thin translucent sphere that tints by climate.
    const shellGeometry = new THREE.SphereGeometry(
      RENDER.globeRadius * ATMOSPHERE.shellRadiusFactor, 48, 48
    );
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(ATMOSPHERE.hotColor),
      transparent: true,
      opacity: ATMOSPHERE.shellOpacityMin,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.atmosphereShell = new THREE.Mesh(shellGeometry, shellMaterial);
    this.scene.add(this.atmosphereShell);

    // Polar ice caps (created once, opacity/geometry rebuilt each frame).
    this._createIceCaps();

    // Starfield
    this._createStarfield();

    // Grid lines on globe
    this._createGlobeGrid();

    // Pointer-move handler for hover raycasting.
    this._raycaster = new THREE.Raycaster();
    this._pointerNdc = new THREE.Vector2();
    this._onPointerMove = (e) => this._handlePointerMove(e);
    this.renderer.domElement.addEventListener('pointermove', this._onPointerMove);

    this._initialized = true;
    this.containerEl.style.display = 'block';
    this.resize();
  }

  _handlePointerMove(e) {
    if (!this._hoverCb || !this.speciesMarkers.length) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._pointerNdc, this.camera);
    const hits = this._raycaster.intersectObjects(this.speciesMarkers, false);
    const sp = hits.length ? hits[0].object.userData.species : null;
    this.renderer.domElement.style.cursor = sp ? 'pointer' : '';
    this._hoverCb(sp || null, e.clientX, e.clientY);
  }

  destroy() {
    this.containerEl.style.display = 'none';
    // Don't actually dispose — keep for reuse when toggling back
  }

  resize() {
    if (!this.renderer) return;
    const rect = this.containerEl.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render(polygons, timeMa, boundaries = null, atmo = null) {
    if (!this._initialized) return;

    // Update controls
    this.controls.update();

    // Update ocean color during extinctions; layer in climate tint underneath.
    const extinction = getActiveExtinction(timeMa);
    const oceanColor = new THREE.Color(COLORS.ocean);
    if (atmo) {
      const haze = computeHaze(atmo);
      if (haze) {
        oceanColor.lerp(new THREE.Color(`rgb(${haze.rgb.r},${haze.rgb.g},${haze.rgb.b})`), haze.alpha * 0.4);
      }
    }
    if (extinction) {
      oceanColor.lerp(new THREE.Color(0x3a1010), extinction.progress * 0.4);
    }
    this.globe.material.color.copy(oceanColor);

    // Update atmosphere shell & sun position
    this._updateAtmosphereAndLighting(atmo);

    // Update polar ice caps
    this._updateIceCaps(timeMa);

    // Update continental meshes
    this._updateContinents(polygons, extinction);

    // Update plate boundaries
    this._updateBoundaries(boundaries);

    // Update species markers
    this._updateSpeciesMarkers(timeMa);

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  _updateAtmosphereAndLighting(atmo) {
    if (!atmo) return;
    // Sun position — terminator drift.
    const sunRad = (atmo.sunLon * Math.PI) / 180;
    const sunDist = 5;
    this.sunLight.position.set(
      Math.cos(sunRad) * sunDist,
      1.5,
      Math.sin(sunRad) * sunDist
    );

    // Atmosphere shell tint & opacity
    const haze = computeHaze(atmo);
    if (haze) {
      this.atmosphereShell.material.color.setRGB(haze.rgb.r / 255, haze.rgb.g / 255, haze.rgb.b / 255);
      const opacity = ATMOSPHERE.shellOpacityMin
        + haze.alpha * (ATMOSPHERE.shellOpacityMax - ATMOSPHERE.shellOpacityMin) / ATMOSPHERE.hazeMaxAlpha;
      this.atmosphereShell.material.opacity = Math.min(opacity, ATMOSPHERE.shellOpacityMax);
    } else {
      this.atmosphereShell.material.opacity = ATMOSPHERE.shellOpacityMin;
      this.atmosphereShell.material.color.set(0x88aaff);
    }
  }

  _createIceCaps() {
    // Two spherical caps (top + bottom) — geometry recreated when extent changes.
    const r = RENDER.globeRadius * 1.005;
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(GLACIATION.capColor),
      transparent: true,
      opacity: 0,
      shininess: 60,
      depthWrite: false,
    });
    // Initial small cap; will be rebuilt in _updateIceCaps
    const initialPhi = 0.001;
    this.northCap = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, initialPhi),
      material.clone()
    );
    this.scene.add(this.northCap);
    this.southCap = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, Math.PI - initialPhi, initialPhi),
      material.clone()
    );
    this.scene.add(this.southCap);
    this._currentCapNorth = -1;
    this._currentCapSouth = -1;
  }

  _updateIceCaps(timeMa) {
    const g = getGlaciation(timeMa);
    const r = RENDER.globeRadius * 1.005;

    // Rebuild geometry only when cap radius changes meaningfully (≥1° lat shift).
    const northPhi = Math.max(0.001, (g.northCapLatRadius * Math.PI) / 180);
    const southPhi = Math.max(0.001, (g.southCapLatRadius * Math.PI) / 180);

    if (Math.abs(g.northCapLatRadius - this._currentCapNorth) > 1) {
      this.northCap.geometry.dispose();
      this.northCap.geometry = new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, northPhi);
      this._currentCapNorth = g.northCapLatRadius;
    }
    if (Math.abs(g.southCapLatRadius - this._currentCapSouth) > 1) {
      this.southCap.geometry.dispose();
      this.southCap.geometry = new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, Math.PI - southPhi, southPhi);
      this._currentCapSouth = g.southCapLatRadius;
    }

    this.northCap.material.opacity = g.alpha;
    this.southCap.material.opacity = g.alpha;
  }

  _updateContinents(polygons, extinction) {
    // Remove old continent meshes
    for (const mesh of this.continentMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.continentMeshes = [];

    // Create new continent meshes from polygon data
    for (const continent of polygons) {
      if (continent.vertices.length < 3) continue;

      const mesh = this._createContinentMesh(continent, extinction);
      if (mesh) {
        this.scene.add(mesh);
        this.continentMeshes.push(mesh);
      }
    }
  }

  _createContinentMesh(continent, extinction) {
    const fractalVerts = fractalSubdivide(continent.vertices);
    const n = fractalVerts.length;

    // Top face vertices at elevated radius
    const topVerts = fractalVerts.map(([lon, lat]) =>
      this._lonLatToVector3(lon, lat, RENDER.continentElevation)
    );

    // Bottom edge vertices at ocean radius (for side walls)
    const botVerts = fractalVerts.map(([lon, lat]) =>
      this._lonLatToVector3(lon, lat, RENDER.globeRadius)
    );

    // Centroid for fan triangulation
    const centroid = new THREE.Vector3();
    for (const v of topVerts) centroid.add(v);
    centroid.divideScalar(n);
    centroid.normalize().multiplyScalar(RENDER.continentElevation);

    // Centroid latitude — drives latitude-palette blending of the top face.
    let sumLat = 0;
    for (const [, lat] of fractalVerts) sumLat += lat;
    const centroidLat = sumLat / n;
    const tinted = continentColorAtLatitude(continent.color, centroidLat);

    // Colors
    const topColor = new THREE.Color(tinted);
    if (extinction) topColor.lerp(new THREE.Color(0x4a2020), extinction.progress * 0.3);
    const sideColor = new THREE.Color(RENDER.continentSideColor);
    if (extinction) sideColor.lerp(new THREE.Color(0x2a1010), extinction.progress * 0.3);

    // Build arrays
    const positions = [];
    const colors = [];
    const indices = [];

    // --- Top face: centroid (index 0) + perimeter (indices 1..n) ---
    positions.push(centroid.x, centroid.y, centroid.z);
    colors.push(topColor.r, topColor.g, topColor.b);

    // Per-vertex latitude tinting along the perimeter.
    for (let i = 0; i < topVerts.length; i++) {
      const v = topVerts[i];
      const lat = fractalVerts[i][1];
      const vTinted = continentColorAtLatitude(continent.color, lat);
      const vc = new THREE.Color(vTinted);
      if (extinction) vc.lerp(new THREE.Color(0x4a2020), extinction.progress * 0.3);
      positions.push(v.x, v.y, v.z);
      colors.push(vc.r, vc.g, vc.b);
    }

    for (let i = 1; i <= n; i++) {
      indices.push(0, i, (i % n) + 1);
    }

    // --- Side walls: quads from top edge down to ocean level ---
    const sideOffset = n + 1;
    for (let i = 0; i < n; i++) {
      const t = topVerts[i];
      const b = botVerts[i];
      positions.push(t.x, t.y, t.z);
      colors.push(sideColor.r, sideColor.g, sideColor.b);
      positions.push(b.x, b.y, b.z);
      colors.push(sideColor.r, sideColor.g, sideColor.b);
    }

    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const topI = sideOffset + i * 2;
      const botI = sideOffset + i * 2 + 1;
      const topN = sideOffset + next * 2;
      const botN = sideOffset + next * 2 + 1;
      indices.push(topI, botI, topN);
      indices.push(topN, botI, botN);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 5,
    });

    return new THREE.Mesh(geometry, material);
  }

  _updateBoundaries(boundaries) {
    // Remove old boundary lines
    for (const line of this.boundaryLines) {
      this.scene.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    }
    this.boundaryLines = [];

    if (!boundaries) return;

    for (const boundary of boundaries) {
      if (boundary.vertices.length < 2) continue;

      const points = boundary.vertices.map(([lon, lat]) =>
        this._lonLatToVector3(lon, lat, RENDER.boundaryElevation)
      );

      const color = COLORS.boundary[boundary.type] || COLORS.boundary.divergent;
      const isDashed = boundary.type === 'divergent' || boundary.type === 'transform';

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      let material;

      if (isDashed) {
        material = new THREE.LineDashedMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.8,
          dashSize: boundary.type === 'divergent' ? 0.03 : 0.015,
          gapSize: boundary.type === 'divergent' ? 0.02 : 0.015,
        });
      } else {
        material = new THREE.LineBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.8,
        });
      }

      const line = new THREE.Line(geometry, material);
      if (isDashed) line.computeLineDistances();

      this.scene.add(line);
      this.boundaryLines.push(line);
    }
  }

  _updateSpeciesMarkers(timeMa) {
    // Remove old markers
    for (const marker of this.speciesMarkers) {
      this.scene.remove(marker);
      marker.geometry.dispose();
      marker.material.dispose();
    }
    this.speciesMarkers = [];

    const alive = getSpeciesAtTime(timeMa);
    for (const sp of alive) {
      if (sp.category === 'event') continue;

      const pos = this._lonLatToVector3(
        sp.location.lon, sp.location.lat, RENDER.markerElevation
      );

      const color = COLORS.kingdom[sp.category] || '#aaa';
      const size = 0.012 + sp.currentAbundance * 0.008;

      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.8
      });

      const marker = new THREE.Mesh(geometry, material);
      marker.position.copy(pos);
      marker.userData.species = sp;
      this.scene.add(marker);
      this.speciesMarkers.push(marker);
    }
  }

  _lonLatToVector3(lon, lat, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  _createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(RENDER.starCount * 3);

    for (let i = 0; i < RENDER.starCount; i++) {
      const r = 30 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6
    });

    this.starfield = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starfield);
  }

  _createGlobeGrid() {
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.05
    });

    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const points = [];
      for (let lon = -180; lon <= 180; lon += 5) {
        points.push(this._lonLatToVector3(lon, lat, RENDER.globeRadius + 0.001));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      this.scene.add(line);
    }

    // Longitude lines
    for (let lon = -180; lon < 180; lon += 30) {
      const points = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        points.push(this._lonLatToVector3(lon, lat, RENDER.globeRadius + 0.001));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      this.scene.add(line);
    }
  }
}
