// 3D Globe renderer using Three.js.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COLORS, RENDER, ATMOSPHERE, GLACIATION } from '../config.js';
import { getPeriodAtTime } from '../data/timeline.js';
import { getActiveExtinction } from '../data/extinctions.js';
import { getSpeciesAtTime } from '../data/species.js';
import { getGlaciation } from '../data/glaciation.js';
import { fractalSubdivide } from '../engine/fractal.js';
import { fbm3D, terrainProfileForAge } from '../engine/terrainNoise.js';
import { computeHaze, continentColorAtLatitude } from '../util/atmoVisual.js';
import { cladeColor } from '../util/taxonomy.js';

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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
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

    // Globe sphere (ocean) — wet, mirror-like specular for sun glint.
    const globeGeometry = new THREE.SphereGeometry(RENDER.globeRadius, 96, 96);
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(COLORS.ocean),
      shininess: 110,
      specular: new THREE.Color(0xbbddff),
    });
    this.globe = new THREE.Mesh(globeGeometry, globeMaterial);
    this.scene.add(this.globe);

    // Cloud sphere — procedural canvas texture, slow rotation.
    this._createCloudShell();

    // Atmosphere shell — Fresnel rim-glow shader, additively blended outside the globe.
    this.atmosphereShell = this._createAtmosphereShell();
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
      // Tint ocean toward a muted version of this event's signature color.
      const extColor = new THREE.Color(extinction.color).multiplyScalar(0.35);
      oceanColor.lerp(extColor, extinction.progress * 0.5);
    }
    this.globe.material.color.copy(oceanColor);

    // Drift the cloud shell slowly for living-planet feel.
    if (this.cloudShell) {
      this.cloudShell.rotation.y += 0.0006;
    }

    // Update atmosphere shell & sun position
    this._updateAtmosphereAndLighting(atmo);

    // Update polar ice caps
    this._updateIceCaps(timeMa);

    // Update continental meshes
    this._updateContinents(polygons, extinction, timeMa);

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

    // Atmosphere Fresnel shell — color tints by climate, intensity scales with haze.
    const haze = computeHaze(atmo);
    const uniforms = this.atmosphereShell.material.uniforms;
    if (haze) {
      uniforms.uColor.value.setRGB(haze.rgb.r / 255, haze.rgb.g / 255, haze.rgb.b / 255);
      const t = haze.alpha / ATMOSPHERE.hazeMaxAlpha;
      uniforms.uIntensity.value = 0.55 + t * 0.65;
    } else {
      uniforms.uColor.value.setRGB(0.45, 0.62, 1.0); // pale blue baseline
      uniforms.uIntensity.value = 0.55;
    }
  }

  _createAtmosphereShell() {
    const geo = new THREE.SphereGeometry(
      RENDER.globeRadius * ATMOSPHERE.shellRadiusFactor, 64, 64
    );
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0.45, 0.62, 1.0) },
        uIntensity: { value: 0.7 },
        uPower: { value: 2.6 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uPower;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vec3 viewDir = normalize(-vViewPos);
          float fres = pow(1.0 - abs(dot(vNormal, viewDir)), uPower);
          gl_FragColor = vec4(uColor, fres * uIntensity);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Mesh(geo, mat);
  }

  _createCloudShell() {
    const tex = this._buildCloudTexture(1024, 512);
    const geo = new THREE.SphereGeometry(RENDER.globeRadius * 1.012, 64, 64);
    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.cloudShell = new THREE.Mesh(geo, mat);
    this.scene.add(this.cloudShell);
  }

  _buildCloudTexture(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const cx = cv.getContext('2d');
    cx.clearRect(0, 0, w, h);
    // Random soft puffs, thinner near the poles.
    const puffs = 380;
    for (let i = 0; i < puffs; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const polarFalloff = Math.abs(y / h - 0.5) * 2; // 0 at equator, 1 at poles
      if (Math.random() < polarFalloff * 0.55) continue;
      const r = 22 + Math.random() * 80;
      const a = 0.06 + Math.random() * 0.22;
      const g = cx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255, 255, 255, ${a})`);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      cx.fillStyle = g;
      cx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
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

  _updateContinents(polygons, extinction, timeMa) {
    // Remove old continent meshes
    for (const mesh of this.continentMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.continentMeshes = [];

    const profile = terrainProfileForAge(timeMa);

    // Create new continent meshes from polygon data
    for (const continent of polygons) {
      if (continent.vertices.length < 3) continue;

      const mesh = this._createContinentMesh(continent, extinction, profile);
      if (mesh) {
        this.scene.add(mesh);
        this.continentMeshes.push(mesh);
      }
    }
  }

  _createContinentMesh(continent, extinction, profile) {
    const fractalVerts = fractalSubdivide(continent.vertices);
    const n = fractalVerts.length;

    // Unit-radial direction for each perimeter vertex (coastline; no displacement).
    const perimeterUnit = fractalVerts.map(([lon, lat]) =>
      this._lonLatToVector3(lon, lat, 1).normalize()
    );

    // Centroid direction (interior; full displacement) for fan triangulation.
    const centroidUnit = new THREE.Vector3();
    for (const u of perimeterUnit) centroidUnit.add(u);
    centroidUnit.normalize();

    // Vertex pool: index 0 = centroid (edgeWeight 1), 1..n = perimeter (edgeWeight 0).
    // Subdivision midpoints get average edgeWeight of their parents — taper smoothly toward coast.
    const vertDirs = [centroidUnit, ...perimeterUnit];
    const vertEdgeWeights = [1, ...new Array(n).fill(0)];

    // Shared-midpoint cache so adjacent fan triangles don't crack at edges.
    const midpointCache = new Map();
    const getMidpoint = (i, j) => {
      const lo = Math.min(i, j), hi = Math.max(i, j);
      const key = lo * 100000 + hi;
      const cached = midpointCache.get(key);
      if (cached !== undefined) return cached;
      const dir = new THREE.Vector3().addVectors(vertDirs[i], vertDirs[j]).normalize();
      const ew = (vertEdgeWeights[i] + vertEdgeWeights[j]) * 0.5;
      const idx = vertDirs.length;
      vertDirs.push(dir);
      vertEdgeWeights.push(ew);
      midpointCache.set(key, idx);
      return idx;
    };

    // 4-into-1 midpoint subdivision; preserves CCW winding.
    const triIndices = [];
    const subdivide = (a, b, c, depth) => {
      if (depth === 0) { triIndices.push(a, b, c); return; }
      const mab = getMidpoint(a, b);
      const mbc = getMidpoint(b, c);
      const mca = getMidpoint(c, a);
      subdivide(a, mab, mca, depth - 1);
      subdivide(mab, b, mbc, depth - 1);
      subdivide(mca, mbc, c, depth - 1);
      subdivide(mab, mbc, mca, depth - 1);
    };

    const subdivLevels = RENDER.terrainSubdivLevels;
    for (let i = 0; i < n; i++) {
      subdivide(0, 1 + i, 1 + ((i + 1) % n), subdivLevels);
    }

    // Apply elevation displacement and per-vertex colors.
    const baseElev = RENDER.continentElevation;
    const amp = profile.amplitude;
    const freq = profile.freq;
    const jaggExp = 1 + profile.jaggedness;
    const coastTaper = RENDER.terrainCoastTaper;
    const radius = RENDER.globeRadius;
    const minR = radius + 0.001;

    const snowColor = new THREE.Color(RENDER.terrainSnowColor);
    const highlandColor = new THREE.Color(RENDER.terrainHighlandColor);
    const lowlandColor = new THREE.Color(RENDER.terrainLowlandColor);
    const hotTintColor = new THREE.Color(RENDER.terrainHotTintColor);
    const extTint = new THREE.Color(0x4a2020);
    const sideColor = new THREE.Color(RENDER.continentSideColor);
    if (extinction) sideColor.lerp(new THREE.Color(0x2a1010), extinction.progress * 0.3);

    const positions = [];
    const colors = [];
    const indices = [];

    // Top face vertices: displaced positions + per-vertex elevation-driven color.
    for (let v = 0; v < vertDirs.length; v++) {
      const dir = vertDirs[v];
      const ew = vertEdgeWeights[v];

      let noise = fbm3D(dir.x * freq, dir.y * freq, dir.z * freq, profile.octaves);
      if (noise > 1) noise = 1; else if (noise < -1) noise = -1;
      const sign = noise >= 0 ? 1 : -1;
      const shaped = sign * Math.pow(Math.abs(noise), jaggExp);

      // Smoothstep taper: coast (ew=0) gets 0 displacement, interior ramps in by coastTaper.
      let taper;
      if (ew <= 0) {
        taper = 0;
      } else if (ew >= coastTaper) {
        taper = 1;
      } else {
        const t = ew / coastTaper;
        taper = t * t * (3 - 2 * t);
      }
      const displacement = amp * shaped * taper;
      const r = Math.max(minR, baseElev + displacement);

      positions.push(dir.x * r, dir.y * r, dir.z * r);

      // Latitude-driven base color (dir.y == sin(lat) on unit sphere).
      const latDeg = Math.asin(Math.max(-1, Math.min(1, dir.y))) * (180 / Math.PI);
      const c = new THREE.Color(continentColorAtLatitude(continent.color, latDeg));

      // Elevation-driven shading: snow on peaks, highland brown on slopes, green basins.
      const relAlt = (r - baseElev) / amp;
      if (relAlt > 0.5) {
        c.lerp(snowColor, Math.min(1, (relAlt - 0.5) * 2));
      } else if (relAlt > 0.1) {
        c.lerp(highlandColor, (relAlt - 0.1) / 0.4);
      } else if (relAlt < -0.3) {
        c.lerp(lowlandColor, Math.min(1, (-relAlt - 0.3) / 0.7));
      }

      // Hot crust on proto-era peaks.
      if (profile.hotTint > 0 && relAlt > 0) {
        c.lerp(hotTintColor, profile.hotTint * Math.min(1, relAlt));
      }

      if (extinction) c.lerp(extTint, extinction.progress * 0.3);

      colors.push(c.r, c.g, c.b);
    }

    for (const idx of triIndices) indices.push(idx);

    // Side walls: drop from each original perimeter vertex (still at baseElev — taper=0)
    // down to ocean radius. Same structure as before, separate vertices for distinct color.
    const sideOffset = positions.length / 3;
    for (let i = 0; i < n; i++) {
      const dir = perimeterUnit[i];
      positions.push(dir.x * baseElev, dir.y * baseElev, dir.z * baseElev);
      colors.push(sideColor.r, sideColor.g, sideColor.b);
      positions.push(dir.x * radius, dir.y * radius, dir.z * radius);
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
    for (const obj of this.boundaryLines) {
      this.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    }
    this.boundaryLines = [];

    if (!boundaries) return;

    for (const boundary of boundaries) {
      if (boundary.vertices.length < 2) continue;
      const mesh = this._buildBoundaryRibbon(boundary);
      if (mesh) {
        this.scene.add(mesh);
        this.boundaryLines.push(mesh);
      }
    }
  }

  _boundaryCrossSection(type) {
    // Each entry: [sideU in [-1,1], radialV (offset from globeRadius), color hex]
    if (type === 'convergent') {
      const apex = RENDER.boundaryConvergentApex - RENDER.globeRadius;
      const base = RENDER.boundaryConvergentBaseColor;
      const top = RENDER.boundaryConvergentApexColor;
      const mid = '#' + new THREE.Color(base).lerp(new THREE.Color(top), 0.5).getHexString();
      return [
        [-1.0, 0.0,        base],
        [-0.5, apex * 0.4, mid],
        [ 0.0, apex,       top],
        [ 0.5, apex * 0.4, mid],
        [ 1.0, 0.0,        base],
      ];
    }
    if (type === 'divergent') {
      const lip = RENDER.boundaryDivergentLip - RENDER.globeRadius;
      const trench = RENDER.boundaryDivergentTrench - RENDER.globeRadius;
      const lipColor = RENDER.boundaryDivergentLipColor;
      const innerColor = RENDER.boundaryDivergentInnerColor;
      // Twin raised ridges with a glowing axial canyon between them; all above ocean.
      return [
        [-1.0, 0.0,    lipColor],
        [-0.5, lip,    lipColor],
        [ 0.0, trench, innerColor],
        [ 0.5, lip,    lipColor],
        [ 1.0, 0.0,    lipColor],
      ];
    }
    // transform: stepped offset cliff
    const upper = RENDER.boundaryTransformUpper - RENDER.globeRadius;
    const lower = RENDER.boundaryTransformLower - RENDER.globeRadius;
    return [
      [-1.0, lower, RENDER.boundaryTransformLowerColor],
      [ 0.0, lower, RENDER.boundaryTransformLowerColor],
      [ 0.0, upper, RENDER.boundaryTransformUpperColor],
      [ 1.0, upper, RENDER.boundaryTransformUpperColor],
    ];
  }

  _buildBoundaryRibbon(boundary) {
    const cross = this._boundaryCrossSection(boundary.type);
    const cs = cross.length;
    const verts = boundary.vertices;
    const m = verts.length;
    const radius = RENDER.globeRadius;
    const halfWidth = (RENDER.boundaryRidgeWidthDeg * Math.PI) / 180; // arc radians ~= world units on unit sphere

    // Compute a tangent-plane frame at each polyline vertex.
    const frames = new Array(m);
    for (let i = 0; i < m; i++) {
      const [lon, lat] = verts[i];
      const N = this._lonLatToVector3(lon, lat, 1).normalize();
      let T;
      if (m === 1) {
        T = new THREE.Vector3(1, 0, 0);
      } else if (i === 0) {
        const [l2, la2] = verts[1];
        T = this._lonLatToVector3(l2, la2, 1).normalize().sub(N);
      } else if (i === m - 1) {
        const [l2, la2] = verts[i - 1];
        T = N.clone().sub(this._lonLatToVector3(l2, la2, 1).normalize());
      } else {
        const [lA, laA] = verts[i - 1];
        const [lB, laB] = verts[i + 1];
        const Na = this._lonLatToVector3(lA, laA, 1).normalize();
        const Nb = this._lonLatToVector3(lB, laB, 1).normalize();
        T = Nb.sub(Na);
      }
      // Project T into tangent plane at N
      T.addScaledVector(N, -T.dot(N));
      if (T.lengthSq() < 1e-12) {
        T.set(N.z, 0, -N.x);
        if (T.lengthSq() < 1e-12) T.set(0, 1, 0);
      }
      T.normalize();
      const S = new THREE.Vector3().crossVectors(N, T).normalize();
      frames[i] = { N, S };
    }

    const positions = [];
    const colors = [];
    const indices = [];

    for (let i = 0; i < m; i++) {
      const { N, S } = frames[i];
      for (let j = 0; j < cs; j++) {
        const [sideU, radialV, hex] = cross[j];
        const r = radius + radialV;
        const off = halfWidth * sideU * radius;
        positions.push(N.x * r + S.x * off, N.y * r + S.y * off, N.z * r + S.z * off);
        const c = new THREE.Color(hex);
        colors.push(c.r, c.g, c.b);
      }
    }

    for (let i = 0; i < m - 1; i++) {
      for (let j = 0; j < cs - 1; j++) {
        const a = i * cs + j;
        const b = a + 1;
        const c = (i + 1) * cs + j;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    if (indices.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 20,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });

    return new THREE.Mesh(geometry, material);
  }

  _updateSpeciesMarkers(timeMa) {
    // Remove old markers + halos
    for (const marker of this.speciesMarkers) {
      this.scene.remove(marker);
      marker.geometry.dispose();
      marker.material.dispose();
    }
    this.speciesMarkers = [];
    if (this.markerHalos) {
      for (const halo of this.markerHalos) {
        this.scene.remove(halo);
        halo.geometry.dispose();
        halo.material.dispose();
      }
    }
    this.markerHalos = [];

    const alive = getSpeciesAtTime(timeMa);
    for (const sp of alive) {
      if (!sp.taxonomy) continue;

      const pos = this._lonLatToVector3(
        sp.location.lon, sp.location.lat, RENDER.markerElevation
      );

      const color = cladeColor(sp);
      const size = 0.012 + sp.currentAbundance * 0.008;

      // Solid marker — kept in hover hit list.
      const geometry = new THREE.SphereGeometry(size, 12, 12);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.95,
      });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.copy(pos);
      marker.userData.species = sp;
      this.scene.add(marker);
      this.speciesMarkers.push(marker);

      // Additive glow halo — larger sphere, soft, not raycasted.
      const haloGeo = new THREE.SphereGeometry(size * 2.6, 12, 12);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(pos);
      this.scene.add(halo);
      this.markerHalos.push(halo);
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
