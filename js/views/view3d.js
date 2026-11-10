// Globe view — the planet as one lit, textured sphere (three.js).
//
// The surface is not geometry. Whenever the moment changes, the shared planet painter
// (js/views/planetPainter.js) draws the same equirectangular planet the Map shows (oceans, shelf
// seas, land, ice, magma, plate boundaries, crisis effects) into an offscreen canvas that is the
// sphere's colour texture — so the two views always agree, the poles and the antimeridian need no
// special cases, and no mesh is ever rebuilt. Around the sphere: a key light fixed to the camera
// (the face you look at is always lit), an atmosphere in `look.atmosphere.rim`, a static
// starfield, species markers as pooled screen-size sprites of js/views/glyphs.js's family glyphs,
// an impact's bolide flown in from space, and names as an HTML overlay (crisp at any zoom, never
// stretched). Every animation is driven by elapsed time, never by frame count.
//
// Renderer interface (js/main.js): new View3D(vizContainer), init(), render(polygons, timeMa,
// boundaries, atmo, frame), resize(), destroy(), onSpeciesHover(cb), onSpeciesClick(cb).
// The constructor throws when WebGL is unavailable.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COLORS, FONTS, getCategoryInfo } from '../config.js';
import * as continentalEngine from '../engine/interpolator.js';
import * as geo from '../engine/geo.js';
import { paintPlanet, equirect } from './planetPainter.js';
import { glyphCanvas } from './glyphs.js';

// Optional data module (place names). The globe works without it.
let paleogeography = null;
import('../data/paleogeography.js').then((m) => { paleogeography = m; }, () => {});

// ---------------------------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------------------------

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const CAMERA_FOV = 30;             // degrees, vertical — a long lens keeps the limb undistorted
const PLANET_FILL = 0.8;           // planet diameter ÷ the container's smaller side at home zoom
const ZOOM_IN_LIMIT = 4;           // closest approach: the surface this many times nearer than home
const ZOOM_OUT_LIMIT = 0.62;
const ZOOM_STEP = 1.5;             // HUD buttons
const MAX_PIXEL_RATIO = 2;
// Where the camera looks when there is no land yet: a low tilt keeps the pole — where an
// equirectangular texture's features converge — out near the limb.
const DEFAULT_VIEW = { lon: 20, lat: 6 };

// The surface is an equirectangular texture (width; height is half). The painter always works in
// a TEXTURE_UNITS-wide coordinate space and `pixelRatio` scales it to the real canvas, so every
// size shows the same picture, only sharper.
const TEXTURE_UNITS = 2048;
const TEXTURE_SIZES = [1024, 2048, 4096];
const LIVE_TEXTURE_MAX = 2048;     // while time is moving (repainted every frame)
const LIVE_STRETCH = 1.6;          // screen pixels one texel may cover while moving …
const STILL_STRETCH = 1.25;        // … and once the picture stands still
const STILL_DELAY_SEC = 0.3;       // how long the picture must stand before the sharper repaint
const SLOW_FRAME_SEC = 0.034;      // governor: a frame under 30 fps strains the machine (a 30 Hz cap does not) …
const PAINT_BUDGET_MS = 10;        // … and so does texture painting that averages more than this per frame
const SLOW_FRAME_LIMIT = 90;       // strained painted frames (net) before quality steps down
const MASK_WIDTH = 512;            // water mask for the specular glint
const AMBIENT_REPAINT_SEC = 1 / 15; // repaint cadence of a magma ocean's flares while time stands still …
const SLOW_REPAINT_SEC = 0.2;      // … and of slower real-time motion (crisis stains and ash, ice edges)

const KEY_LIGHT = [-0.52, 0.5, 0.69]; // view space: over the viewer's left shoulder
const LIGHT_SWAY_DEG = 9;          // slow drift of the key light, driven by atmo.sunLon
const ATMOSPHERE_RADIUS = 1.22;    // shell that carries the limb glow
const SKY_GLOW = 0.85;             // its strength under today's clear sky …
const RIM_HAZE = 0.5;              // … and the haze laid over the surface toward the limb

const AUTO_ROTATE_DEG_PER_SEC = 1.6;
const AUTO_ROTATE_HURRY = 3.2;     // extra speed over open ocean when the land sits on one side
const AUTO_RESUME_SEC = 4;         // auto-rotation waits this long after the last interaction
const HOVER_HOLD_SEC = 1.2;        // … and this long after the pointer leaves a marker
const GLIDE_TIME_SEC = 0.55;       // smoothing time of camera glides
const DAMPING_RATE = 5.2;          // per second (≈ OrbitControls' 0.08 per frame at 60 Hz)
const NUDGE_DEG = 30;              // HUD rotate buttons
const EPICENTRE_LIFT_DEG = 16;     // an extinction's epicentre is framed this far above the disc's centre
const REVEAL_DWELL_SEC = 0.45;     // a species hovered elsewhere (sidebar, tree) is turned into view after this
const PING_PERIOD_SEC = 1.8;       // pulse of the ring that marks a milestone's place
const BOLIDE_SEC = 0.9;            // an impact's bolide flies in for this long (the painter's flash follows) …
const BOLIDE_FADE_SEC = 0.15;      // … and its trail fades over this

// Markers sit exactly on the surface (their sprites ignore depth): any altitude would shift them
// outward by parallax away from the disc's centre — enough to put a coastal species in the sea.
const MARKER_ALTITUDE = 1;
const MARKER_RADIUS_MIN = 4;       // glyph radius in px at abundance 0 …
const MARKER_RADIUS_GAIN = 4;      // … plus this at abundance 1 (abundance^0.7): 4–8 px, as on the map
const GLYPH_IN_SPRITE = 0.3;       // glyphCanvas draws the glyph at 0.3 × the sprite size; the rest is halo
const GLYPH_TEXTURE_CAP = 480;     // marker textures kept before the cache starts over
const PICK_RADIUS = 14;            // px
const PICK_RADIUS_TOUCH = 24;
const CLICK_SLOP = 5;              // px a press may travel and still count as a click
const BLOOM_SEC = 1.3;             // arrival rings
const BLOOM_LABEL_SEC = 2.6;       // "+ Name" stays this long
const EMBER_SEC = 1.6;             // departed markers linger as grey embers
const MAX_BLOOMS = 6;

const LABEL_SLOTS = 24;
const MAX_SPECIES_LABELS = 9;
const MAX_PLACE_LABELS = 11;
const PLACE_NUDGES = [0, -1, 1, -2, 2]; // lines a place name may move off its point to clear a species name
const LABEL_DISC_LIMIT = 0.97;     // a name's farthest corner stays this far out on the disc (× radius) …
const LABEL_LIMB_FADE = 1.02;      // … and, carried by a turning globe, has faded out by this far
const LABEL_LAYOUT_SEC = 0.25;
const LABEL_FADE_RATE = 7;         // per second

const STAR_COUNT = 1500;
const BAND_STAR_COUNT = 1100;
const BAND_TILT = [1.05, 0.0, 0.55]; // Euler XYZ of the milky band's plane

const ACCENT = '#f2b84b';          // mirrors --accent in css/styles.css
const EMBER = '#9aa3b5';           // departed species, as on the Map
const BACKDROP_INNER = '#0b1322';  // mirrors #viz-container's backdrop in css/styles.css

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

/** Longitude / latitude (degrees) → a point on a sphere, matching SphereGeometry's UVs (lon −180 at u = 0). */
function setFromLonLat(target, lon, lat, radius = 1) {
  const la = lat * D2R;
  const lo = lon * D2R;
  const c = Math.cos(la) * radius;
  return target.set(c * Math.cos(lo), Math.sin(la) * radius, -c * Math.sin(lo));
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Critically damped approach of `current` to 0 (after Unity's SmoothDamp). state.v carries the velocity. */
function smoothDampToZero(current, state, smoothTime, dt) {
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const temp = (state.v + omega * current) * dt;
  state.v = (state.v - omega * temp) * exp;
  return (current + temp) * exp;
}

/** Small deterministic PRNG so the sky is the same on every load (and in every capture). */
function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Value noise, periodic in x with the given period (so textures tile around the sphere). */
function valueNoise(x, y, period, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const wrap = (i) => ((i % period) + period) % period;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(wrap(xi), yi, seed);
  const b = hash2(wrap(xi + 1), yi, seed);
  const c = hash2(wrap(xi), yi + 1, seed);
  const d = hash2(wrap(xi + 1), yi + 1, seed);
  return a + (b - a) * u + (c + (d - c) * u - (a + (b - a) * u)) * v;
}

function fbm(x, y, octaves, basePeriod, seed) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq, y * freq, basePeriod * freq, seed + o * 17);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgIcon(pathData, circle = null) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', pathData);
  svg.appendChild(path);
  if (circle) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', '8');
    c.setAttribute('cy', '8');
    c.setAttribute('r', String(circle));
    svg.appendChild(c);
  }
  return svg;
}

// Scratch objects reused every frame (render() allocates nothing).
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _color = new THREE.Color();
const _point = { x: 0, y: 0 };
const UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------------------------

const SURFACE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vPositionV;
  void main() {
    vUv = uv;
    vNormalV = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vPositionV = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

// Lighting is done by hand so the lit face reproduces the painter's colours exactly (key light
// ≈ 1.0 × texture) and only the shadow side, the glint and the limb haze depart from the map.
// (The atmosphere's scene tint is already in the texture: the painter lays it on, as on the map.)
const SURFACE_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uMask;      // r: 1 = open water, 0 = land
  uniform vec3 uLight;          // unit vector toward the key light, view space
  uniform vec3 uKey;
  uniform vec3 uFill;
  uniform vec3 uRim;            // atmosphere colour
  uniform float uRimGain;
  uniform float uGloss;
  uniform float uMolten;        // 0..1: a magma ocean lights itself
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vPositionV;

  void main() {
    vec3 n = normalize(vNormalV);
    vec3 v = normalize(-vPositionV);
    float ndv = max(dot(n, v), 0.0);

    // An equirectangular texture pinches at the poles: fade to a coarse mip there.
    float pole = smoothstep(0.955, 1.0, abs(vUv.y * 2.0 - 1.0));
    vec3 albedo = texture2D(uMap, vUv, pole * 6.0).rgb;

    float ndl = dot(n, uLight);
    float day = smoothstep(-0.5, 0.75, ndl);
    vec3 light = mix(uFill, uKey, day);
    float hot = uMolten * smoothstep(0.08, 0.5, albedo.r - albedo.b);
    light = mix(light, vec3(1.0), hot);
    vec3 color = albedo * light;

    // Water catches the light: mostly a lift of its own colour (so green seas stay green), with
    // only a trace of the key light itself.
    float water = texture2D(uMask, vUv).r * uGloss;
    vec3 h = normalize(uLight + v);
    float ndh = max(dot(n, h), 0.0);
    color *= 1.0 + 0.38 * pow(ndh, 22.0) * water;
    color += uKey * (pow(ndh, 80.0) * 0.02 * water);

    // Aerial perspective: the surface dims into the atmosphere's colour toward the limb.
    float fresnel = pow(1.0 - ndv, 3.0);
    float haze = fresnel * uRimGain * (0.28 + 0.72 * day);
    color = color * (1.0 - 0.5 * fresnel) + uRim * haze;

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vPositionV;
  varying vec3 vCenterV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vPositionV = mv.xyz;
    vCenterV = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

// Drawn on the inside of a larger shell. Brightness depends on how close each view ray passes to
// the surface, so the glow is strongest at the limb and dissolves outward (no hard outer edge).
const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLight;
  uniform float uGain;
  uniform float uReach;         // shell radius − 1
  varying vec3 vPositionV;
  varying vec3 vCenterV;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 ray = normalize(vPositionV);
    vec3 nearest = ray * dot(vCenterV, ray) - vCenterV;   // centre → closest point of the ray
    float altitude = max(length(nearest) - 1.0, 0.0);
    float glow = exp(-altitude / 0.022) * 0.8 + exp(-altitude / 0.075) * 0.26;
    glow *= smoothstep(uReach, uReach * 0.45, altitude);
    float day = dot(normalize(nearest), uLight) * 0.5 + 0.5;
    glow *= mix(0.2, 1.0, smoothstep(0.08, 0.85, day));
    float alpha = glow * uGain + (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

const STAR_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uScale;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale;
  }
`;

const STAR_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.2, r);
    gl_FragColor = vec4(vColor, a);
    #include <colorspace_fragment>
  }
`;

// ---------------------------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------------------------

export class View3D {
  constructor(container) {
    this.container = container;
    this.el = container.querySelector('#globe-container');

    this._hoverCb = null;
    this._clickCb = null;
    this._active = false;
    this._w = 0;
    this._h = 0;
    this._dpr = 1;
    this._home = 5;               // camera distance at zoom 1 (set in resize)
    this._pxScale = 0;            // sprite scale that makes one unit = one CSS pixel
    this._frame = null;
    this._reduced = false;
    this._needsRender = true;
    this._needsAim = true;        // first frame: face the continents

    // Created here, not in init(): without WebGL the constructor throws and main.js reports it.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.canvas = this.renderer.domElement;
    this.el.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 400);
    setFromLonLat(this.camera.position, DEFAULT_VIEW.lon, DEFAULT_VIEW.lat, this._home);

    this._buildSky();
    this._buildPlanet();
    this._buildMarkers();
    this._buildBolide();
    this._buildLabels();
    this._buildHud();
    this._buildControls();

    // Compile every shader now — the sprites' too, though none is visible yet — so the first
    // marker or ring to appear (in the Hadean, a while into the story) does not stall a frame.
    this._pingRing.visible = true;
    this.renderer.compile(this.scene, this.camera);
    this._pingRing.visible = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onContextRestored = () => { this._surface.stamp = null; this._surface.stillStamp = null; this._needsRender = true; };
    this.canvas.addEventListener('webglcontextrestored', this._onContextRestored);
  }

  onSpeciesHover(cb) {
    this._hoverCb = cb;
  }

  onSpeciesClick(cb) {
    this._clickCb = cb;
  }

  init() {
    if (this._active) return;
    this._active = true;
    this.el.style.display = 'block';
    this.hud.classList.remove('hidden');
    this.controls.connect();
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerup', this._onPointerUp);
    this.canvas.addEventListener('pointercancel', this._onPointerUp);
    this.canvas.addEventListener('pointerleave', this._onPointerLeave);
    this._needsRender = true;
    this.resize();
  }

  destroy() {
    if (!this._active) return;
    this._active = false;
    this.controls.disconnect();
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('pointercancel', this._onPointerUp);
    this.canvas.removeEventListener('pointerleave', this._onPointerLeave);
    this._press = null;
    this._pointer.inside = false;
    this._hoverId = null;
    this._cam.dragging = false;
    this._cam.glide = null;
    this.el.classList.remove('is-pointing', 'is-dragging');
    this.hud.classList.add('hidden');
    this.el.style.display = 'none';
  }

  resize() {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    if (!w || !h) return;
    // devicePixelRatio changes when the window moves between displays, so it is read here.
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    if (w === this._w && h === this._h && dpr === this._dpr) return;

    const zoom = this._zoom();
    if (dpr !== this._dpr) this._dropGlyphTextures();
    this._w = w;
    this._h = h;
    this._dpr = dpr;

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // Fit the planet by the smaller side so portrait containers never crop it.
    const halfFov = Math.tan((CAMERA_FOV * D2R) / 2);
    const m = PLANET_FILL * halfFov * Math.min(1, this.camera.aspect);
    this._home = Math.sqrt(1 + 1 / (m * m));
    this.controls.minDistance = 1 + (this._home - 1) / ZOOM_IN_LIMIT;
    this.controls.maxDistance = 1 + (this._home - 1) / ZOOM_OUT_LIMIT;
    this.camera.position.setLength(1 + (this._home - 1) / zoom);
    this._cam.distanceTarget = null;

    this._pxScale = (2 * halfFov) / h;
    this.stars.material.uniforms.uScale.value = dpr;

    const liveSize = this._textureSizeFor(1, LIVE_STRETCH, Math.min(LIVE_TEXTURE_MAX, this._surface.liveCap));
    if (liveSize !== this._surface.liveSize) {
      this._surface.liveSize = liveSize;
      this._surface.stamp = null;
    }
    this._labels.nextLayout = 0;
    this._needsRender = true;
  }

  render(polygons, timeMa, boundaries, atmo, frame) {
    if (!this._active || !frame || !this._w) return;
    this._frame = frame;
    this._reduced = !!frame.reducedMotion;
    const dt = Math.min(frame.dtSec || 0, 0.1);

    this._updateLand(frame);
    this._directCamera(frame, dt);
    this._updateSurface(frame);
    this._updateAtmosphere(frame);
    this._updateBolide(frame);
    this._updateMarkers(frame, dt);
    this._updateLabels(frame, dt);
    this._repick(frame);
    this._updateHud();

    if (this._needsRender) {
      this._needsRender = false;
      this.renderer.render(this.scene, this.camera);
    }
  }

  // -------------------------------------------------------------------------------------------
  // Scene construction (all GPU resources are created once, here)
  // -------------------------------------------------------------------------------------------

  _buildSky() {
    const rand = mulberry32(4540);

    // Backdrop: the same soft radial lift the Map view floats on (#viz-container in styles.css).
    const size = 256;
    const backdrop = makeCanvas(size, size);
    const bctx = backdrop.getContext('2d');
    const img = bctx.createImageData(size, size);
    const inner = hexToRgb(BACKDROP_INNER);
    const outer = hexToRgb(COLORS.background);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x + 0.5) / size - 0.5;
        const v = (y + 0.5) / size - 0.45;
        const t = Math.min(1, Math.hypot(u / 1.2, v / 0.9) / 0.7);
        const dither = (rand() - 0.5) * 1.1;
        const i = (y * size + x) * 4;
        img.data[i] = inner[0] + (outer[0] - inner[0]) * t + dither;
        img.data[i + 1] = inner[1] + (outer[1] - inner[1]) * t + dither;
        img.data[i + 2] = inner[2] + (outer[2] - inner[2]) * t + dither;
        img.data[i + 3] = 255;
      }
    }
    bctx.putImageData(img, 0, 0);
    const backdropTexture = new THREE.CanvasTexture(backdrop);
    backdropTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = backdropTexture;

    // Stars: mostly faint and small, a few bright; a denser dusting along one great circle.
    const total = STAR_COUNT + BAND_STAR_COUNT;
    const positions = new Float32Array(total * 3);
    const sizes = new Float32Array(total);
    const colors = new Float32Array(total * 3);
    const bandRotation = new THREE.Euler(BAND_TILT[0], BAND_TILT[1], BAND_TILT[2]);
    for (let i = 0; i < total; i++) {
      const inBand = i >= STAR_COUNT;
      const lon = rand() * Math.PI * 2;
      let sinLat = rand() * 2 - 1;
      if (inBand) {
        // approximately Gaussian latitude about the band's plane (σ ≈ 9°)
        sinLat = Math.sin((rand() + rand() + rand() - 1.5) * 0.31);
      }
      const cosLat = Math.sqrt(1 - sinLat * sinLat);
      _v1.set(cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon));
      if (inBand) _v1.applyEuler(bandRotation);
      _v1.multiplyScalar(120);
      positions[i * 3] = _v1.x;
      positions[i * 3 + 1] = _v1.y;
      positions[i * 3 + 2] = _v1.z;

      const brightness = Math.pow(rand(), inBand ? 5 : 3);
      sizes[i] = (inBand ? 1.3 : 1.6) + brightness * 2.6;
      const warmth = rand();
      const level = (inBand ? 0.3 : 0.42) + 0.58 * brightness;
      colors[i * 3] = (0.74 + 0.26 * warmth) * level;
      colors[i * 3 + 1] = (0.82 + 0.06 * warmth) * level;
      colors[i * 3 + 2] = (1.0 - 0.3 * warmth) * level;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    starGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.stars = new THREE.Points(starGeometry, new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 } },
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -2;
    this.scene.add(this.stars);

    // The milky band's unresolved glow: a faint noisy stripe on the inside of a far sphere.
    const bw = 512;
    const bh = 256;
    const band = makeCanvas(bw, bh);
    const gctx = band.getContext('2d', { alpha: false });
    const bimg = gctx.createImageData(bw, bh);
    for (let y = 0; y < bh; y++) {
      const lat = (0.5 - (y + 0.5) / bh) * 180;
      const core = Math.exp(-((lat / 10) ** 2));
      for (let x = 0; x < bw; x++) {
        const clouds = fbm((x / bw) * 10, (y / bh) * 5, 4, 10, 7);
        const lanes = smoothstep(0.42, 0.62, fbm((x / bw) * 16 + 3, (y / bh) * 8, 3, 16, 23));
        const glow = core * (0.35 + 1.3 * clouds) * (1 - 0.55 * lanes * Math.exp(-((lat / 6) ** 2)));
        const d = rand() - 0.5;
        const i = (y * bw + x) * 4;
        bimg.data[i] = 17 * glow + d;
        bimg.data[i + 1] = 20 * glow + d;
        bimg.data[i + 2] = 30 * glow + d;
        bimg.data[i + 3] = 255;
      }
    }
    gctx.putImageData(bimg, 0, 0);
    const bandTexture = new THREE.CanvasTexture(band);
    bandTexture.colorSpace = THREE.SRGBColorSpace;
    bandTexture.wrapS = THREE.RepeatWrapping;
    this.band = new THREE.Mesh(
      new THREE.SphereGeometry(150, 48, 24),
      new THREE.MeshBasicMaterial({
        map: bandTexture,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.band.rotation.copy(bandRotation);
    this.band.renderOrder = -3;
    this.scene.add(this.band);
  }

  _buildPlanet() {
    const anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    // Colour textures, painted by the shared planet painter: `live` follows the clock frame by
    // frame; `still` is a sharper repaint of a standing picture, made only when the display can
    // show the difference (dense screens, zoomed-in views).
    const makeLayer = () => {
      const canvas = makeCanvas(2, 1);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.anisotropy = anisotropy;
      return { canvas, ctx: canvas.getContext('2d', { alpha: false }), texture, size: 0 };
    };
    // Water mask for the glint (data, not colour): white = open water, black = land.
    const maskCanvas = makeCanvas(MASK_WIDTH, MASK_WIDTH / 2);
    const maskTexture = new THREE.CanvasTexture(maskCanvas);
    maskTexture.wrapS = THREE.RepeatWrapping;

    const live = makeLayer();
    this._surface = {
      live,
      still: null,              // created on first use
      makeLayer,
      shown: live,
      maskCanvas,
      maskCtx: maskCanvas.getContext('2d', { alpha: false }),
      maskTexture,
      maxSize: Math.min(TEXTURE_SIZES[TEXTURE_SIZES.length - 1], this.renderer.capabilities.maxTextureSize),
      liveSize: LIVE_TEXTURE_MAX,
      liveCap: LIVE_TEXTURE_MAX, // lowered by the governor on machines that cannot keep up
      skip: 0,                  // governor: repaint only every (skip + 1)th frame
      skipped: 0,
      slowFrames: 0,
      paintAvg: 0,              // running mean of the live paint's cost (ms)
      stamp: null,              // what the live texture shows
      stillStamp: null,         // timeMa the still texture shows, when it is valid
      paintedAt: -1,            // frame.nowSec of the last live paint
      animated: false,          // the painter reported real-time motion on its last paint
      view: {
        projection: equirect,
        scale: TEXTURE_UNITS / (2 * equirect.bounds.xMax),
        cx: TEXTURE_UNITS / 2,
        cy: TEXTURE_UNITS / 4,
        width: TEXTURE_UNITS,
        height: TEXTURE_UNITS / 2,
        pixelRatio: 1,
        outline: false,
        layers: { graticule: true, labels: false, features: true, boundaries: false },
      },
      paints: 0,                // counters for diagnostics (see stats())
      stillPaints: 0,
      paintMs: 0,
    };

    this._lightBase = new THREE.Vector3(KEY_LIGHT[0], KEY_LIGHT[1], KEY_LIGHT[2]).normalize();
    const light = this._lightBase.clone();
    const rim = new THREE.Color('#6fa8ff');
    this._rimHex = '';
    this._rimBase = new THREE.Color('#6fa8ff');
    this._rimMix = 0;
    this._skyThickness = 1;

    this.planet = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 64),
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: live.texture },
          uMask: { value: maskTexture },
          uLight: { value: light },
          uKey: { value: new THREE.Vector3(1.0, 0.985, 0.95) },
          uFill: { value: new THREE.Vector3(0.14, 0.18, 0.28) },
          uRim: { value: rim },
          uRimGain: { value: RIM_HAZE },
          uGloss: { value: 1 },
          uMolten: { value: 0 },
        },
        vertexShader: SURFACE_VERTEX,
        fragmentShader: SURFACE_FRAGMENT,
      }),
    );
    this.scene.add(this.planet);

    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(ATMOSPHERE_RADIUS, 96, 48),
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: rim },
          uLight: { value: light },
          uGain: { value: SKY_GLOW },
          uReach: { value: ATMOSPHERE_RADIUS - 1 },
        },
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.atmosphere.renderOrder = 1;
    this.scene.add(this.atmosphere);
  }

  _buildMarkers() {
    this._markers = new Map();        // species id → marker record
    this._markerList = [];            // the same records, for allocation-free iteration
    this._spritePool = [];
    this._glyphTextures = new Map();
    this._stamp = 0;
    this._blooms = [];                // active arrival effects
    this._hoverId = null;
    this._pointer = { x: 0, y: 0, inside: false, touch: false };
    this._press = null;
    this._nextRepick = 0;

    // One soft white ring, tinted per use: arrival blooms and the hover / focus halos.
    const ring = makeCanvas(96, 96);
    const rctx = ring.getContext('2d');
    rctx.strokeStyle = 'rgba(255,255,255,0.28)';
    rctx.lineWidth = 9;
    rctx.beginPath();
    rctx.arc(48, 48, 38, 0, Math.PI * 2);
    rctx.stroke();
    rctx.strokeStyle = '#ffffff';
    rctx.lineWidth = 3.5;
    rctx.beginPath();
    rctx.arc(48, 48, 38, 0, Math.PI * 2);
    rctx.stroke();
    this._ringTexture = new THREE.CanvasTexture(ring);
    this._ringTexture.colorSpace = THREE.SRGBColorSpace;

    const makeRing = (order) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this._ringTexture,
        sizeAttenuation: false,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      }));
      sprite.visible = false;
      sprite.renderOrder = order;
      this.scene.add(sprite);
      return sprite;
    };
    this._bloomRings = [];
    for (let i = 0; i < MAX_BLOOMS * 2; i++) this._bloomRings.push(makeRing(2));
    this._hoverRing = makeRing(4);
    this._focusRing = makeRing(4);
    this._focusRing.material.color.set(ACCENT);
    this._pingRing = makeRing(2);
    this._ping = { name: '', id: '', lon: 0, lat: 0, color: '', timeMa: NaN, at: null };
    this._markerTimeMa = NaN;
  }

  /**
   * The bolide of an impact extinction (the Map's streak, flown in 3D): a trail and a white-hot
   * head that arrive from space at the epicentre in the event's first second. The flash, crater
   * glow and shock front that follow are in the surface texture.
   */
  _buildBolide() {
    // Trail: a horizontal gradient, tail (transparent) on the left, head on the right.
    const trail = makeCanvas(512, 64);
    const tctx = trail.getContext('2d');
    const gradient = tctx.createLinearGradient(0, 0, 512, 0);
    gradient.addColorStop(0, 'rgba(255,120,40,0)');
    gradient.addColorStop(0.6, 'rgba(255,170,80,0.55)');
    gradient.addColorStop(1, 'rgba(255,250,235,1)');
    tctx.strokeStyle = gradient;
    tctx.globalAlpha = 0.25;
    tctx.lineWidth = 36;            // the texture is 4× the on-screen size: a 9 px glow …
    tctx.beginPath();
    tctx.moveTo(0, 32);
    tctx.lineTo(512, 32);
    tctx.stroke();
    tctx.globalAlpha = 1;
    tctx.lineWidth = 12.8;          // … around a 3.2 px core, as on the Map
    tctx.stroke();

    const head = makeCanvas(64, 64);
    const hctx = head.getContext('2d');
    const glow = hctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.3, 'rgba(255,220,160,0.6)');
    glow.addColorStop(1, 'rgba(255,150,60,0)');
    hctx.fillStyle = glow;
    hctx.fillRect(0, 0, 64, 64);

    const sprite = (canvas, centerX) => {
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        sizeAttenuation: false,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        blending: THREE.AdditiveBlending,
      }));
      s.center.set(centerX, 0.5);
      s.visible = false;
      s.renderOrder = 2;
      this.scene.add(s);
      return s;
    };
    this._bolide = {
      trail: sprite(trail, 1),    // pivots on its head
      head: sprite(head, 0.5),
      id: null,                   // the event the approach was chosen for …
      dx: 0.88,                   // … and its horizontal heading on screen (the flight comes in from that side)
    };
  }

  _buildLabels() {
    const layer = document.createElement('div');
    layer.className = 'globe-labels';
    layer.setAttribute('aria-hidden', 'true');
    const slots = [];
    for (let i = 0; i < LABEL_SLOTS; i++) {
      const el = document.createElement('div');
      el.className = 'globe-label';
      layer.appendChild(el);
      slots.push({
        el, key: null, text: '', cls: '', alpha: 0, target: 0, shown: -1,
        marker: null, lon: 0, lat: 0, ox: 0, oy: 0, w: 0, h: 0, side: 0, dim: 1, hang: false, x: 0, y: 0, tf: '',
      });
    }
    this.el.appendChild(layer);
    this._labels = {
      layer,
      slots,
      byKey: new Map(),
      nextLayout: 0,
      measure: makeCanvas(1, 1).getContext('2d'),
      widths: new Map(),
      boxes: [],
      wanted: new Map(),
      seen: new Map(),            // key → consecutive layout passes a not-yet-shown name was wanted
      lastHover: null,
      lastFocus: null,
    };
  }

  _buildHud() {
    const hud = document.createElement('div');
    hud.className = 'globe-hud hidden';
    hud.setAttribute('role', 'group');
    hud.setAttribute('aria-label', 'Globe controls');
    const add = (label, icon, onClick) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'globe-hud-btn';
      button.title = label;
      button.setAttribute('aria-label', label);
      button.appendChild(icon);
      button.addEventListener('click', onClick);
      hud.appendChild(button);
      return button;
    };
    const rule = () => {
      const el = document.createElement('span');
      el.className = 'globe-hud-rule';
      hud.appendChild(el);
    };
    this._hudZoomIn = add('Zoom in', svgIcon('M8 3.5v9M3.5 8h9'), () => this._zoomBy(ZOOM_STEP));
    this._hudZoomOut = add('Zoom out', svgIcon('M3.5 8h9'), () => this._zoomBy(1 / ZOOM_STEP));
    rule();
    add('Rotate west', svgIcon('M9.8 3.6 5.4 8l4.4 4.4'), () => this._nudge(-NUDGE_DEG));
    add('Rotate east', svgIcon('M6.2 3.6 10.6 8l-4.4 4.4'), () => this._nudge(NUDGE_DEG));
    rule();
    this._hudReset = add('Re-centre on the continents', svgIcon('M8 1.8v2.4M8 11.8v2.4M1.8 8h2.4M11.8 8h2.4', 3.1),
      () => this._resetView());
    this._hudState = '';
    this.container.appendChild(hud);
    this.hud = hud;
  }

  _buildControls() {
    const controls = new OrbitControls(this.camera, this.canvas);
    controls.disconnect();          // listeners are attached in init()
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.zoomSpeed = 0.9;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI - 0.1;
    controls.autoRotate = false;
    this.controls = controls;

    this._cam = {
      dragging: false,
      quietUntil: 0,              // performance-clock seconds until which the camera is left alone
      glide: null,                // { dir: Vector3, v: number } while easing toward a direction
      glideDir: new THREE.Vector3(),
      glideState: { v: 0 },
      distanceTarget: null,       // HUD zoom in progress
      userAimed: false,           // the viewer has moved the camera since the last reset
      crisisId: null,             // extinction the camera has already reacted to
      crisisHeld: false,          // … and is holding on its epicentre
      revealHover: null,          // species hovered on another surface, and when to turn to it
      revealAt: -1,
      revealFocus: null,          // species the dialog last opened
    };
    this._land = {
      dir: new THREE.Vector3(),   // toward the area-weighted centre of the continents
      has: false,
      focus: 0,                   // 0 = land all around the planet, 1 = all on one side
      appeared: false,            // the first crust has just formed (consumed by the camera)
      timeMa: NaN,
      at: -1,
    };

    controls.addEventListener('start', () => {
      this._cam.dragging = true;
      this._cam.crisisHeld = false;
      this._cam.glide = null;
      this._cam.distanceTarget = null;
      this._cam.userAimed = true;
      this.el.classList.add('is-dragging');
    });
    controls.addEventListener('end', () => {
      this._cam.dragging = false;
      this._cam.quietUntil = performance.now() / 1000 + AUTO_RESUME_SEC;
      this.el.classList.remove('is-dragging');
    });
    controls.addEventListener('change', () => { this._needsRender = true; });
  }

  // -------------------------------------------------------------------------------------------
  // Camera
  // -------------------------------------------------------------------------------------------

  /** Current magnification relative to the home framing (1 = home, > 1 = closer). */
  _zoom() {
    const d = this.camera.position.length();
    return d > 1.001 ? (this._home - 1) / (d - 1) : 1;
  }

  /** Where the continents are, as one direction plus how one-sided they are. Throttled. */
  _updateLand(frame) {
    const land = this._land;
    if (frame.timeMa === land.timeMa) return;
    if (!frame.jumped && frame.nowSec - land.at < 0.2 && land.at >= 0) return;
    land.timeMa = frame.timeMa;
    land.at = frame.nowSec;

    let sx = 0;
    let sy = 0;
    let sz = 0;
    let total = 0;
    for (const polygon of frame.polygons) {
      const verts = polygon.vertices;
      const n = verts ? verts.length : 0;
      if (n < 3) continue;
      // Area by the shoelace formula in the equal-area cylindrical projection (lon, sin lat).
      let area = 0;
      let cx = 0;
      let cy = 0;
      let cz = 0;
      const step = Math.max(1, Math.floor(n / 96));
      let px = verts[0][0];
      let py = Math.sin(verts[0][1] * D2R);
      for (let i = step; i <= n; i += step) {
        const vert = verts[i >= n ? 0 : i];
        const x = vert[0];
        const y = Math.sin(vert[1] * D2R);
        area += px * y - x * py;
        setFromLonLat(_v1, vert[0], vert[1]);
        cx += _v1.x;
        cy += _v1.y;
        cz += _v1.z;
        px = x;
        py = y;
        if (i >= n) break;
      }
      area = Math.abs(area);
      const len = Math.hypot(cx, cy, cz);
      if (len < 1e-9 || area <= 0) continue;
      sx += (cx / len) * area;
      sy += (cy / len) * area;
      sz += (cz / len) * area;
      total += area;
    }
    const mag = Math.hypot(sx, sy, sz);
    const had = land.has;
    land.has = total > 0 && mag > 1e-9;
    if (land.has && !had) land.appeared = true;
    if (land.has) {
      land.dir.set(sx / mag, sy / mag, sz / mag);
      land.focus = clamp(mag / total, 0, 1);
    } else {
      land.focus = 0;
    }
  }

  /** The camera direction that shows the most land: the continents' centre, with a restrained tilt. */
  _landView(out) {
    const land = this._land;
    if (!land.has) return setFromLonLat(out, DEFAULT_VIEW.lon, DEFAULT_VIEW.lat);
    const lat = Math.asin(clamp(land.dir.y, -1, 1)) * R2D;
    const lon = Math.atan2(-land.dir.z, land.dir.x) * R2D;
    return setFromLonLat(out, lon, clamp(lat * 0.55, -22, 26));
  }

  /** Ease (or, with reduced motion, cut) the camera to look at a direction from the planet's centre. */
  _glideTo(dir) {
    const cam = this._cam;
    this._stopInertia();
    if (this._reduced) {
      const distance = this.camera.position.length();
      this.camera.position.copy(dir).setLength(distance);
      cam.glide = null;
    } else {
      cam.glideDir.copy(dir).normalize();
      if (!cam.glide) cam.glideState.v = 0;
      cam.glide = cam.glideDir;
    }
    this._needsRender = true;
  }

  _zoomBy(factor) {
    const cam = this._cam;
    const from = cam.distanceTarget ?? this.camera.position.length();
    const zoom = clamp(((this._home - 1) / (from - 1)) * factor, ZOOM_OUT_LIMIT, ZOOM_IN_LIMIT);
    cam.distanceTarget = 1 + (this._home - 1) / zoom;
    cam.userAimed = true;
    cam.quietUntil = performance.now() / 1000 + AUTO_RESUME_SEC;
    this._needsRender = true;
  }

  _nudge(deg) {
    const cam = this._cam;
    const from = cam.glide ? _v1.copy(cam.glide) : _v1.copy(this.camera.position).normalize();
    // In this frame a positive turn about +Y moves the camera east (toward increasing longitude).
    from.applyAxisAngle(UP, deg * D2R);
    cam.userAimed = true;
    cam.quietUntil = performance.now() / 1000 + AUTO_RESUME_SEC;
    this._glideTo(from);
  }

  _resetView() {
    const cam = this._cam;
    cam.distanceTarget = this._home;
    cam.userAimed = false;
    cam.quietUntil = performance.now() / 1000 + 1.5;
    this._glideTo(this._landView(_v1));
  }

  _directCamera(frame, dt) {
    const cam = this._cam;
    const controls = this.controls;
    const camera = this.camera;
    const now = frame.nowSec;
    const idle = !cam.dragging && now >= cam.quietUntil;

    if (this._needsAim) {
      // First frame after the view was created: open on the hemisphere that has the land.
      this._needsAim = false;
      const distance = camera.position.length();
      camera.position.copy(this._landView(_v1)).setLength(distance);
      this._needsRender = true;
    } else if (idle && this._land.has && (frame.jumped || this._land.appeared)) {
      // After a jump in time — or when the first crust forms — turn to the continents if they
      // are mostly out of view.
      _v1.copy(camera.position).normalize();
      if (_v1.dot(this._land.dir) < 0.35) this._glideTo(this._landView(_v2));
    }
    this._land.appeared = false;
    this._revealSpecies(frame, idle);

    // A mass extinction with a place to point at: turn to it once, as it begins, and stay with
    // it while the event plays. The epicentre is framed above the centre of the disc, clear of
    // the event card in the lower part of the view.
    const crisis = frame.crisis && frame.crisis.extinction ? frame.crisis : null;
    const crisisId = crisis ? crisis.extinction.id : null;
    if (crisisId !== cam.crisisId) {
      cam.crisisId = crisisId;
      cam.crisisHeld = false;
      if (crisis && crisis.phase !== 'aftermath' && !cam.dragging) {
        const at = this._epicentre(crisis.extinction, frame.timeMa);
        if (at) {
          this._glideTo(setFromLonLat(_v1, at[0], clamp(at[1] - EPICENTRE_LIFT_DEG, -50, 50)));
          cam.crisisHeld = true;
        }
      }
    }
    const holding = cam.crisisHeld && !!crisis && crisis.phase !== 'aftermath';

    if (cam.glide) {
      _v1.copy(camera.position).normalize();
      const angle = _v1.angleTo(cam.glide);
      if (angle < 0.002) {
        cam.glide = null;
      } else {
        const next = smoothDampToZero(angle, cam.glideState, GLIDE_TIME_SEC, dt);
        _q1.setFromUnitVectors(_v1, cam.glide);
        _q2.identity().slerp(_q1, clamp(1 - next / angle, 0, 1));
        camera.position.applyQuaternion(_q2);
        this._needsRender = true;
      }
    }
    if (cam.distanceTarget != null) {
      const d = camera.position.length();
      const next = this._reduced ? cam.distanceTarget : d + (cam.distanceTarget - d) * (1 - Math.exp(-9 * dt));
      camera.position.setLength(next);
      if (Math.abs(next - cam.distanceTarget) < 0.002) cam.distanceTarget = null;
      this._needsRender = true;
    }

    // Auto-rotation: slow over the continents, quicker across an empty ocean hemisphere.
    const auto = idle && !this._reduced && !cam.glide && !holding && !frame.focusId && !frame.hoverId && !this._hoverId;
    controls.autoRotate = auto;
    if (auto) {
      let hurry = 0;
      const land = this._land;
      if (land.has) {
        const cl = Math.hypot(camera.position.x, camera.position.z);
        const ll = Math.hypot(land.dir.x, land.dir.z);
        if (cl > 1e-6 && ll > 1e-6) {
          const cosAz = (camera.position.x * land.dir.x + camera.position.z * land.dir.z) / (cl * ll);
          hurry = smoothstep(0.2, 0.75, land.focus) * Math.pow(clamp(0.5 - 0.5 * cosAz, 0, 1), 1.5);
        }
      }
      controls.autoRotateSpeed = (AUTO_ROTATE_DEG_PER_SEC * (1 + AUTO_ROTATE_HURRY * hurry)) / 6;
    }

    // Dragging tracks the pointer 1:1 at the centre of the disc, at any zoom.
    const distance = camera.position.length();
    controls.rotateSpeed = ((distance - 1) * Math.tan((CAMERA_FOV * D2R) / 2)) / Math.PI;
    controls.dampingFactor = 1 - Math.exp(-DAMPING_RATE * dt);
    controls.update(dt);
    // Markers and names are projected before the scene is drawn: the matrices must be current,
    // or the HTML overlay would trail the picture by a frame during a drag.
    camera.updateMatrixWorld();
  }

  /**
   * A species picked somewhere else — hovered in the sidebar or tree, or opened in the dialog —
   * may be on the far side: turn it into view (after a short dwell for hovers, so sweeping the
   * pointer down a list does not spin the planet).
   */
  _revealSpecies(frame, idle) {
    const cam = this._cam;
    const now = frame.nowSec;
    const hoverId = frame.hoverId && frame.hoverId !== this._hoverId ? frame.hoverId : null;
    if (hoverId !== cam.revealHover) {
      cam.revealHover = hoverId;
      cam.revealAt = hoverId ? now + REVEAL_DWELL_SEC : -1;
    }
    let id = null;
    if (frame.focusId !== cam.revealFocus) {
      cam.revealFocus = frame.focusId;
      id = frame.focusId;
    } else if (cam.revealAt >= 0 && now >= cam.revealAt && !this._reduced) {
      cam.revealAt = -1;
      id = hoverId;
    }
    if (!id || !idle) return;
    const m = this._markers.get(id);
    if (!m || m.goneAt >= 0 || m.facing > 0.6) return;
    this._glideTo(_v1.copy(m.position).normalize());
  }

  /** [lon, lat] at timeMa of a place given in present-day coordinates on a plate (it rides along), or null. */
  _placeAt(place, timeMa) {
    if (!place || !Number.isFinite(place.lon) || !Number.isFinite(place.lat)) return null;
    let at = null;
    if (place.plateId && continentalEngine.plateToWorld) {
      try {
        at = continentalEngine.plateToWorld(place.plateId, place.lon, place.lat, timeMa);
      } catch {
        at = null;
      }
    }
    return at || [place.lon, place.lat];
  }

  _epicentre(extinction, timeMa) {
    return this._placeAt(extinction && extinction.epicenter, timeMa);
  }

  /** Stop any coasting left over from a drag or from auto-rotation (OrbitControls' damping). */
  _stopInertia() {
    const controls = this.controls;
    const auto = controls.autoRotate;
    controls.autoRotate = false;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    controls.autoRotate = auto;
  }

  // -------------------------------------------------------------------------------------------
  // Surface texture
  // -------------------------------------------------------------------------------------------

  /**
   * Smallest texture width that keeps a texel within `stretch` screen pixels at the centre of the
   * disc, at the given zoom.
   */
  _textureSizeFor(zoom, stretch, limit) {
    const distance = 1 + (this._home - 1) / zoom;
    const radiusPx = ((this._h / 2) / (Math.tan((CAMERA_FOV * D2R) / 2) * Math.sqrt(distance * distance - 1))) * this._dpr;
    const wanted = (2 * Math.PI * radiusPx) / stretch;
    const max = Math.min(limit, this._surface.maxSize);
    for (const size of TEXTURE_SIZES) {
      if (size >= wanted || size >= max) return Math.min(size, max);
    }
    return max;
  }

  _paintLayer(layer, size, frame) {
    const s = this._surface;
    if (layer.size !== size) {
      layer.size = size;
      layer.canvas.width = size;
      layer.canvas.height = size / 2;
      // The GPU texture is immutable storage: free it so the next upload allocates the new size.
      layer.texture.dispose();
    }
    s.view.pixelRatio = size / TEXTURE_UNITS;
    const info = paintPlanet(layer.ctx, frame, s.view);
    s.animated = !!(info && info.animated);
    layer.texture.needsUpdate = true;
    if (s.shown !== layer) {
      s.shown = layer;
      this.planet.material.uniforms.uMap.value = layer.texture;
    }
    this._needsRender = true;
  }

  /** Repaint and upload the surface only when what it shows has changed. */
  _updateSurface(frame) {
    const s = this._surface;
    const layers = frame.layers || {};
    const plates = !!(layers.plates && frame.boundaries);
    const labels = !!layers.labels;
    const now = frame.nowSec;
    const crisis = frame.crisis;
    // A crisis tints the surface by its intensity, which ramps in and fades out while time stands
    // still: in coarse steps, so that with reduced motion it still arrives as a stepped fade.
    const crisisLevel = crisis ? Math.round(clamp(crisis.intensity || 0, 0, 1) * 16) : -1;

    let dirty = s.stamp === null
      || s.stamp.timeMa !== frame.timeMa
      || s.stamp.plates !== plates
      || s.stamp.labels !== labels
      || s.stamp.crisis !== crisisLevel
      || s.stamp.reduced !== this._reduced;
    // Things that move while geological time stands still: the staged catastrophe (every frame
    // while its clock runs — a paused hold stands still too) and whatever the painter said moves
    // in real time on its last paint: a magma ocean's flares a dozen times a second, slow drifts
    // (stains, ash, ice edges) a few times.
    const staged = !this._reduced && !!crisis && crisis.elapsedSec != null
      && (s.stamp === null || crisis.elapsedSec !== s.stamp.elapsed);
    const pulsing = !this._reduced && s.animated;
    const cadence = frame.look && frame.look.magma > 0.01 ? AMBIENT_REPAINT_SEC : SLOW_REPAINT_SEC;
    if (!dirty && (staged || (pulsing && now - s.paintedAt >= cadence))) dirty = true;

    if (dirty && s.skip > 0 && s.stamp !== null && s.skipped < s.skip && !frame.jumped) {
      s.skipped++;              // governor: this machine repaints only every (skip + 1)th frame
      return;
    }

    if (dirty) {
      const t0 = performance.now();
      s.skipped = 0;
      s.view.layers.boundaries = plates;
      s.view.layers.features = labels;
      this._paintLayer(s.live, s.liveSize, frame);
      this._paintMask(frame);
      s.maskTexture.needsUpdate = true;
      const ms = performance.now() - t0;
      s.paintMs += ms;
      s.paints++;

      if (s.stamp === null) s.stamp = {};
      s.stamp.timeMa = frame.timeMa;
      s.stamp.plates = plates;
      s.stamp.labels = labels;
      s.stamp.crisis = crisisLevel;
      s.stamp.elapsed = crisis ? crisis.elapsedSec : null;
      s.stamp.reduced = this._reduced;
      s.stillStamp = null;
      s.paintedAt = now;
      this._govern(frame, ms);
      return;
    }

    // The picture is standing still: once, repaint it as sharp as this display and zoom can show.
    if (pulsing || now - s.paintedAt < STILL_DELAY_SEC || this._cam.dragging || this._cam.distanceTarget != null) return;
    const size = this._textureSizeFor(this._zoom(), STILL_STRETCH, s.maxSize);
    if (size <= s.live.size) {
      if (s.shown !== s.live) {
        s.shown = s.live;
        this.planet.material.uniforms.uMap.value = s.live.texture;
        this._needsRender = true;
      }
      return;
    }
    if (s.still && s.stillStamp === frame.timeMa && s.still.size === size) {
      if (s.shown !== s.still) {
        s.shown = s.still;
        this.planet.material.uniforms.uMap.value = s.still.texture;
        this._needsRender = true;
      }
      return;
    }
    if (!s.still) s.still = s.makeLayer();
    this._paintLayer(s.still, size, frame);
    s.stillStamp = frame.timeMa;
    s.stillPaints++;
  }

  /**
   * Keep playback smooth on machines that cannot repaint the texture every frame. The painter's
   * cost is mostly fixed (masks, paths), not per pixel, so the first remedy is to repaint every
   * other frame; when frames stay slow after that (texture upload or fill-bound), the live texture
   * drops to its smallest size, and as a last resort it repaints every third frame. Each step
   * needs a sustained run of strained frames; quality never steps back up within a session.
   */
  _govern(frame, paintMs) {
    const s = this._surface;
    if (!frame.playing || !(frame.dtSec > 0)) return;
    s.paintAvg += (paintMs - s.paintAvg) * 0.1;
    const strained = s.paintAvg / (s.skip + 1) > PAINT_BUDGET_MS || frame.dtSec > SLOW_FRAME_SEC;
    s.slowFrames = strained ? s.slowFrames + 1 : Math.max(0, s.slowFrames - 2);
    if (s.slowFrames < SLOW_FRAME_LIMIT) return;
    s.slowFrames = 0;
    if (s.skip === 0) {
      s.skip = 1;
    } else if (s.liveCap > TEXTURE_SIZES[0]) {
      s.liveCap = TEXTURE_SIZES[0];
      s.liveSize = Math.min(s.liveSize, s.liveCap);
    } else if (s.skip === 1) {
      s.skip = 2;
    }
  }

  /** Where sunlight may glint: open water yes, sea ice barely, land and molten rock no. */
  _paintMask(frame) {
    const s = this._surface;
    const ctx = s.maskCtx;
    const w = s.maskCanvas.width;
    const h = s.maskCanvas.height;
    const look = frame.look;
    const water = look ? clamp((look.water ?? 1) * (1 - (look.magma ?? 0)), 0, 1) : 1;
    const level = Math.round(255 * water);
    ctx.fillStyle = `rgb(${level},${level},${level})`;
    ctx.fillRect(0, 0, w, h);

    // Sea ice is matt. The edge is feathered: this is a mask for a soft highlight, not a picture.
    const ice = look && look.ice;
    if (ice && ice.alpha > 0.02 && water > 0.02) {
      const dull = 0.85 * clamp(ice.alpha * 1.4, 0, 1);
      const feather = (8 / 180) * h;
      const band = (y0, y1, towardPole) => {
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(towardPole ? 0 : 1, `rgba(0,0,0,${dull})`);
        g.addColorStop(towardPole ? 1 : 0, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, Math.min(y0, y1), w, Math.abs(y1 - y0));
      };
      // Sea-ice edges (an ice sheet on land reaching further does not dull the open sea beside it).
      const north = ice.seaNorth ?? ice.north;
      const south = ice.seaSouth ?? ice.south;
      if (north < 89.5) {
        const edge = ((90 - north) / 180) * h;
        ctx.fillStyle = `rgba(0,0,0,${dull})`;
        ctx.fillRect(0, 0, w, Math.max(0, edge - feather));
        band(Math.max(0, edge - feather), edge, true);
      }
      if (south > -89.5) {
        const edge = ((90 - south) / 180) * h;
        ctx.fillStyle = `rgba(0,0,0,${dull})`;
        ctx.fillRect(0, Math.min(h, edge + feather), w, h);
        band(Math.min(h, edge + feather), edge, true);
      }
    }

    ctx.fillStyle = '#000';
    ctx.beginPath();
    const kx = w / 360;
    const ky = h / 180;
    for (const polygon of frame.polygons) {
      const verts = polygon.vertices;
      const n = verts ? verts.length : 0;
      if (n < 3) continue;
      const step = n > 600 ? 2 : 1;
      ctx.moveTo((verts[0][0] + 180) * kx, (90 - verts[0][1]) * ky);
      for (let i = step; i < n; i += step) ctx.lineTo((verts[i][0] + 180) * kx, (90 - verts[i][1]) * ky);
      ctx.closePath();
    }
    ctx.fill();
  }

  // -------------------------------------------------------------------------------------------
  // Light and atmosphere
  // -------------------------------------------------------------------------------------------

  _updateAtmosphere(frame) {
    const look = frame.look;
    const uniforms = this.planet.material.uniforms;

    // Colours arrive as hex strings; parse them only when they change.
    const rimHex = (look && look.atmosphere && look.atmosphere.rim) || '#6fa8ff';
    if (rimHex !== this._rimHex) {
      this._rimHex = rimHex;
      this._rimBase.set(rimHex);
      this._needsRender = true;
    }
    // During a mass extinction the sky takes on the event's colour.
    const rim = uniforms.uRim.value;   // shared with the atmosphere shell
    rim.copy(this._rimBase);
    const crisis = frame.crisis;
    let mix = 0;
    if (crisis && crisis.extinction && crisis.extinction.color) {
      mix = 0.7 * clamp(crisis.intensity, 0, 1);
      rim.lerp(_color.set(crisis.extinction.color), mix);
    }
    if (mix !== this._rimMix) {
      this._rimMix = mix;
      this._needsRender = true;
    }
    // A thicker sky (the Hadean's rock vapour, the Archean haze) glows more at the limb, as the
    // Map's limb glow does with look.atmosphere.rimAlpha; today's clear sky (0.10) is the reference.
    const rimAlpha = (look && look.atmosphere && look.atmosphere.rimAlpha) ?? 0.1;
    const thickness = clamp(0.75 + 2.5 * rimAlpha, 0.85, 1.6);
    if (thickness !== this._skyThickness) {
      this._skyThickness = thickness;
      uniforms.uRimGain.value = RIM_HAZE * thickness;
      this.atmosphere.material.uniforms.uGain.value = SKY_GLOW * thickness;
      this._needsRender = true;
    }
    uniforms.uMolten.value = look ? clamp(look.magma || 0, 0, 1) : 0;

    // The key light rides with the camera; atmo.sunLon only lets it drift a few degrees.
    const light = uniforms.uLight.value;  // shared with the atmosphere shell
    light.copy(this._lightBase);
    if (!this._reduced && frame.atmo && Number.isFinite(frame.atmo.sunLon)) {
      light.applyAxisAngle(UP, Math.sin(frame.atmo.sunLon * D2R) * LIGHT_SWAY_DEG * D2R);
    }
  }

  /** An impact's bolide, during the event's first second (real time; none with reduced motion). */
  _updateBolide(frame) {
    const b = this._bolide;
    const crisis = frame.crisis;
    const ext = crisis && crisis.extinction;
    const e = crisis ? crisis.elapsedSec : null;
    const impact = !!ext && (ext.mechanism ? ext.mechanism === 'impact' : ext.id === 'end-cretaceous');
    const flying = impact && !this._reduced && e != null && e < BOLIDE_SEC + BOLIDE_FADE_SEC;
    const at = flying ? this._epicentre(ext, frame.timeMa) : null;
    if (!at) {
      if (b.trail.visible || b.head.visible) {
        b.trail.visible = false;
        b.head.visible = false;
        this._needsRender = true;
      }
      if (!ext) b.id = null;
      return;
    }
    const camera = this.camera;
    const w = this._w;
    const h = this._h;
    // The flight is laid out on screen, as on the Map: in from just beyond the edge of the view,
    // from above and from the side with more room, onto wherever the epicentre is now (the camera
    // is still turning toward it).
    const target = setFromLonLat(_v3, at[0], at[1], 1.004);
    const distance = camera.position.length();
    const cos = _v4.copy(target).normalize().dot(_v1.copy(camera.position).divideScalar(distance));
    const facing = smoothstep(1 / distance, 1 / distance + 0.15, cos);
    target.project(camera);
    const ex = (target.x * 0.5 + 0.5) * w;
    const ey = (0.5 - target.y * 0.5) * h;
    if (b.id !== ext.id) {
      b.id = ext.id;
      b.dx = ex < w / 2 ? 0.88 : -0.88;
    }
    const dx = b.dx;
    const dy = -0.47;
    const room = Math.min(dx > 0 ? (w + 40 - ex) / dx : (ex + 40) / -dx, (ey + 40) / -dy);
    const reach = clamp(room, 120, Math.max(w, h));
    const head = Math.pow(clamp(e / BOLIDE_SEC, 0, 1), 1.35);   // slightly accelerating
    const tail = Math.max(0, head - 0.34);
    const hx = ex + dx * reach * (1 - head);
    const hy = ey + dy * reach * (1 - head);
    const length = reach * (head - tail);
    // An impact on the far side is not seen arriving.
    const fade = (e < BOLIDE_SEC ? 1 : 1 - (e - BOLIDE_SEC) / BOLIDE_FADE_SEC) * clamp(crisis.intensity || 0, 0, 1);
    const alpha = fade * facing;

    // Sprites sit at a 3D point under that screen position (they ignore depth).
    _v1.set((hx / w) * 2 - 1, 1 - (hy / h) * 2, target.z).unproject(camera);
    b.trail.position.copy(_v1);
    b.head.position.copy(_v1);
    b.trail.material.rotation = Math.atan2(dy, -dx);   // screen y points down; the sprite's up
    b.trail.scale.set(Math.max(1, length) * this._pxScale, 16 * this._pxScale, 1);
    b.head.scale.set(52 * this._pxScale, 52 * this._pxScale, 1);
    b.trail.material.opacity = alpha;
    b.head.material.opacity = alpha;
    b.trail.visible = alpha > 0.01;
    b.head.visible = alpha > 0.01;
    this._needsRender = true;
  }

  // -------------------------------------------------------------------------------------------
  // Species markers
  // -------------------------------------------------------------------------------------------

  _glyphTexture(glyph, color, sizePx) {
    const key = `${glyph}|${color}|${sizePx}`;
    let texture = this._glyphTextures.get(key);
    if (!texture) {
      if (this._glyphTextures.size >= GLYPH_TEXTURE_CAP) this._dropGlyphTextures();
      texture = new THREE.CanvasTexture(glyphCanvas(glyph, color, sizePx, this._dpr));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      // Upload now rather than when a far-side marker first turns into view, so a globe that
      // only rotates creates no GPU resources.
      this.renderer.initTexture(texture);
      this._glyphTextures.set(key, texture);
    }
    return texture;
  }

  /**
   * Glyph sprites are rasterised for one pixel ratio: start over when it changes (or when the
   * cache has grown large). Live markers pick up fresh textures on the next frame; a fading ember
   * keeps its old one, which three.js simply uploads again if it is drawn.
   */
  _dropGlyphTextures() {
    if (!this._glyphTextures) return;
    for (const texture of this._glyphTextures.values()) texture.dispose();
    this._glyphTextures.clear();
    for (const m of this._markerList) m.texColor = '';
  }

  _acquireMarker(sp) {
    let sprite = this._spritePool.pop();
    if (!sprite) {
      sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        sizeAttenuation: false,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      }));
      sprite.renderOrder = 3;
      this.scene.add(sprite);
    }
    sprite.visible = true;
    const info = getCategoryInfo(sp.category);
    const m = {
      id: sp.id,
      sp,
      sprite,
      glyph: (info.group && info.group.glyph) || 'dot',
      color: info.color,
      position: sprite.position,
      sizePx: 0,                 // sprite size in CSS px (glyph + halo)
      radius: 0,                 // the glyph's own radius in CSS px
      texColor: '',              // colour of the texture on the sprite ('' = needs one)
      x: 0,
      y: 0,
      facing: 0,                 // 0 beyond the limb … 1 well inside the disc
      life: 1,                   // 0..1 scale-in after an arrival
      bornAt: -1,                // frame.nowSec of the arrival bloom, or -1
      goneAt: -1,                // frame.nowSec when it left, or -1 while alive
      labelled: false,
      stamp: 0,
    };
    this._markers.set(sp.id, m);
    this._markerList.push(m);
    return m;
  }

  _releaseMarker(index) {
    const list = this._markerList;
    const m = list[index];
    m.sprite.visible = false;
    m.sprite.material.map = null;
    this._spritePool.push(m.sprite);
    this._markers.delete(m.id);
    list[index] = list[list.length - 1];
    list.pop();
  }

  _updateMarkers(frame, dt) {
    const now = frame.nowSec;
    const stamp = ++this._stamp;
    const positions = frame.positions;
    const animate = !this._reduced;

    if (frame.jumped) {
      // A scrub or restart: no arrivals, no embers — just the new cast.
      for (const bloom of this._blooms) bloom.done = true;
      for (let i = this._markerList.length - 1; i >= 0; i--) {
        if (this._markerList[i].goneAt >= 0) this._releaseMarker(i);
      }
    }

    // Same marker sizes as the Map: 4–8 px by abundance, a little smaller on a small stage.
    const sizeK = Math.min(this._w, this._h) < 520 ? 0.86 : 1;
    for (const sp of frame.alive) {
      if (sp.category === 'event') continue;     // legacy pseudo-species: no marker (as on the Map)
      const at = (positions && positions.get(sp.id)) || sp.location;
      if (!at) continue;
      let m = this._markers.get(sp.id);
      if (!m) m = this._acquireMarker(sp);
      else if (m.goneAt >= 0) m.goneAt = -1;   // back from the dead (time ran backwards)
      m.sp = sp;
      m.stamp = stamp;
      setFromLonLat(m.position, at.lon, at.lat, MARKER_ALTITUDE);

      const abundance = clamp(sp.currentAbundance || 0, 0, 1);
      const radius = (MARKER_RADIUS_MIN + MARKER_RADIUS_GAIN * Math.pow(abundance, 0.7)) * sizeK;
      // Sprites come in even pixel sizes, so a slowly changing abundance reuses a few textures.
      const sizePx = 2 * Math.round(radius / (2 * GLYPH_IN_SPRITE));
      if (sizePx !== m.sizePx || m.texColor !== m.color) {
        m.sizePx = sizePx;
        m.radius = sizePx * GLYPH_IN_SPRITE;
        m.texColor = m.color;
        m.sprite.material.map = this._glyphTexture(m.glyph, m.color, sizePx);
        this._needsRender = true;
      }
    }

    if (animate) {
      for (const id of frame.arrivals) {
        const m = this._markers.get(id);
        if (!m) continue;
        m.life = 0;
        m.bornAt = now;
        if (this._blooms.length < MAX_BLOOMS) this._blooms.push({ marker: m, id, t0: now, done: false });
      }
    }

    // Camera-facing test shared by markers, labels and picking.
    const camera = this.camera;
    const distance = camera.position.length();
    const cx = camera.position.x / distance;
    const cy = camera.position.y / distance;
    const cz = camera.position.z / distance;
    const limb = 1 / distance;         // cosine of the angle from the sub-camera point to the limb
    const w = this._w;
    const h = this._h;

    for (let i = this._markerList.length - 1; i >= 0; i--) {
      const m = this._markerList[i];
      let fade = 1;
      if (m.stamp !== stamp) {
        // No longer alive: linger as a grey ember (playback only), then return to the pool.
        if (m.goneAt < 0) {
          const departed = animate && frame.departures.includes(m.id);
          if (!departed) {
            this._releaseMarker(i);
            this._needsRender = true;
            continue;
          }
          m.goneAt = now;
          m.texColor = EMBER;
          m.sprite.material.map = this._glyphTexture(m.glyph, EMBER, m.sizePx);
        }
        const age = (now - m.goneAt) / EMBER_SEC;
        if (age >= 1) {
          this._releaseMarker(i);
          this._needsRender = true;
          continue;
        }
        fade = 1 - age;
        this._needsRender = true;
      }
      if (m.life < 1) {
        m.life = animate ? Math.min(1, m.life + dt / 0.45) : 1;
        this._needsRender = true;
      }

      const p = m.position;
      const cos = (p.x * cx + p.y * cy + p.z * cz) / MARKER_ALTITUDE;
      m.facing = smoothstep(limb + 0.01, limb + 0.12, cos);
      _v1.copy(p).project(camera);
      m.x = (_v1.x * 0.5 + 0.5) * w;
      m.y = (0.5 - _v1.y * 0.5) * h;

      const sprite = m.sprite;
      const alpha = m.facing * fade * Math.min(1, m.life * 1.6);
      sprite.visible = alpha > 0.01;
      sprite.material.opacity = alpha;
      // Arrivals pop in with a small overshoot.
      const pop = m.life < 1 ? 0.4 + 0.6 * (1 + 2.2 * (m.life - 1) ** 3 + 1.2 * (m.life - 1) ** 2) : 1;
      const scale = m.sizePx * this._pxScale * pop;
      sprite.scale.set(scale, scale, 1);
    }

    if (frame.timeMa !== this._markerTimeMa) {
      this._markerTimeMa = frame.timeMa;
      this._needsRender = true;
    }
    this._updateBlooms(now);
    this._updateHalo(this._hoverRing, frame.hoverId, 0.95);
    this._updateHalo(this._focusRing, frame.focusId, 1);
    this._updatePing(frame);
  }

  /**
   * Where a milestone's site ({ plateId, lon, lat, name }) is at this moment: carried back in time
   * by its plate and — since deep-time coastlines are approximate and the carried point may fall
   * out at sea — settled on the nearest shore, where placeSpecies() puts the species found at the
   * same site. → [lon, lat] or null.
   */
  _sitePosition(milestone, frame) {
    const ping = this._ping;
    if (ping.id === milestone.id && ping.timeMa === frame.timeMa) return ping.at;
    let at = this._placeAt(milestone.location, frame.timeMa);
    const polygons = frame.polygons;
    const ashore = !at || !polygons || !polygons.length || geo.isLand(at[0], at[1], polygons);
    if (!ashore && typeof geo.nearestCoast === 'function') {
      const shore = geo.nearestCoast(at[0], at[1], polygons);
      if (shore) at = [shore.lon, shore.lat];
    }
    ping.timeMa = frame.timeMa;
    ping.at = at;
    return at;
  }

  /** A milestone that names a place gets a pulsing ring there. */
  _updatePing(frame) {
    const ring = this._pingRing;
    const milestone = frame.milestone;
    const ping = this._ping;
    const at = milestone && milestone.location ? this._sitePosition(milestone, frame) : null;
    if (!at) {
      ping.id = '';
      ping.name = '';
      if (ring.visible) {
        ring.visible = false;
        this._needsRender = true;
      }
      return;
    }
    ping.lon = at[0];
    ping.lat = at[1];
    ping.name = milestone.location.name || '';
    ping.id = milestone.id;
    setFromLonLat(ring.position, at[0], at[1], MARKER_ALTITUDE);
    const camera = this.camera;
    const distance = camera.position.length();
    const cos = ring.position.dot(camera.position) / (distance * MARKER_ALTITUDE);
    const facing = smoothstep(1 / distance + 0.01, 1 / distance + 0.12, cos);
    const t = this._reduced ? 0.45 : (frame.nowSec % PING_PERIOD_SEC) / PING_PERIOD_SEC;
    const size = (12 + 30 * (1 - (1 - t) ** 2)) * this._pxScale;
    ring.visible = facing > 0.01;
    ring.scale.set(size, size, 1);
    if (milestone.color !== ping.color) {
      ping.color = milestone.color;
      ring.material.color.set(milestone.color || ACCENT).lerp(_color.set('#ffffff'), 0.3);
    }
    ring.material.opacity = (this._reduced ? 0.8 : (1 - t) ** 1.5) * facing;
    if (ring.visible && !this._reduced) this._needsRender = true;
  }

  /** Two expanding rings per arrival, drawn from a fixed pool. */
  _updateBlooms(now) {
    const rings = this._bloomRings;
    let used = 0;
    for (let i = this._blooms.length - 1; i >= 0; i--) {
      const bloom = this._blooms[i];
      const age = (now - bloom.t0) / BLOOM_SEC;
      const m = bloom.marker;
      if (bloom.done || age >= 1 || this._markers.get(bloom.id) !== m) {
        this._blooms.splice(i, 1);
        continue;
      }
      for (let k = 0; k < 2; k++) {
        const t = clamp(age * 1.25 - k * 0.25, 0, 1);
        const ring = rings[used++];
        if (t <= 0 || t >= 1 || m.facing <= 0.01) {
          ring.visible = false;
          continue;
        }
        const eased = 1 - (1 - t) ** 3;
        const size = (2 * m.radius + 14 + 44 * eased) * this._pxScale;
        ring.visible = true;
        ring.position.copy(m.position);
        ring.scale.set(size, size, 1);
        if (ring.userData.color !== m.color) {
          ring.userData.color = m.color;
          ring.material.color.set(m.color).lerp(_color.set('#ffffff'), 0.35);
        }
        ring.material.opacity = (1 - t) * (1 - t) * 0.9 * m.facing;
      }
      this._needsRender = true;
    }
    for (let i = used; i < rings.length; i++) {
      if (rings[i].visible) {
        rings[i].visible = false;
        this._needsRender = true;
      }
    }
  }

  /** Halo ring around the hovered / focused species (whichever surface asked for it). */
  _updateHalo(ring, id, strength) {
    const m = id ? this._markers.get(id) : null;
    const show = !!m && m.goneAt < 0 && m.facing > 0.01;
    if (!show) {
      if (ring.visible) {
        ring.visible = false;
        this._needsRender = true;
      }
      ring.userData.id = null;
      return;
    }
    const size = (2 * m.radius + 19) * this._pxScale;
    if (ring.userData.id !== id || !ring.visible) this._needsRender = true;
    ring.userData.id = id;
    ring.visible = true;
    ring.position.copy(m.position);
    ring.scale.set(size, size, 1);
    ring.material.opacity = strength * m.facing;
  }

  // -------------------------------------------------------------------------------------------
  // Pointer: hover and click by screen-space proximity (front side only)
  // -------------------------------------------------------------------------------------------

  _pick(clientX, clientY, radius) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = null;
    let bestD = radius * radius;
    for (const m of this._markerList) {
      if (m.goneAt >= 0 || m.facing < 0.35) continue;
      const reach = Math.max(0, m.radius - PICK_RADIUS / 2);   // large markers are easier
      const d = Math.max(0, Math.hypot(m.x - x, m.y - y) - reach);
      if (d * d < bestD) {
        bestD = d * d;
        best = m;
      }
    }
    return best;
  }

  _setHover(m, clientX, clientY) {
    const id = m ? m.id : null;
    if (id !== this._hoverId) {
      this._hoverId = id;
      this.el.classList.toggle('is-pointing', !!id);
      this._needsRender = true;
      if (!id) this._cam.quietUntil = Math.max(this._cam.quietUntil, performance.now() / 1000 + HOVER_HOLD_SEC);
    } else if (!id) {
      return;
    }
    if (this._hoverCb) this._hoverCb(m ? m.sp : null, clientX, clientY);
  }

  _onPointerDown(e) {
    this._press = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    this._pointer.touch = e.pointerType === 'touch';
  }

  _onPointerMove(e) {
    const pointer = this._pointer;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.inside = true;
    pointer.touch = e.pointerType === 'touch';
    const press = this._press;
    if (press) {
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > CLICK_SLOP) press.moved = true;
      if (press.moved) this._setHover(null, e.clientX, e.clientY);
      return;
    }
    if (pointer.touch) return;
    this._setHover(this._pick(e.clientX, e.clientY, PICK_RADIUS), e.clientX, e.clientY);
  }

  _onPointerUp(e) {
    const press = this._press;
    this._press = null;
    if (!press || press.moved || e.type === 'pointercancel') return;
    // A press that did not travel is a click (an orbit drag never is).
    const touch = e.pointerType === 'touch';
    const m = this._pick(e.clientX, e.clientY, touch ? PICK_RADIUS_TOUCH : PICK_RADIUS);
    if (m && this._clickCb) this._clickCb(m.sp);
  }

  _onPointerLeave(e) {
    this._pointer.inside = false;
    if (!this._press) this._setHover(null, e.clientX, e.clientY);
  }

  /** The globe turns under a resting pointer: keep the hover honest a few times a second. */
  _repick(frame) {
    const pointer = this._pointer;
    if (!pointer.inside || pointer.touch || this._press || frame.nowSec < this._nextRepick) return;
    this._nextRepick = frame.nowSec + 0.12;
    const m = this._pick(pointer.x, pointer.y, PICK_RADIUS);
    if ((m ? m.id : null) !== this._hoverId) this._setHover(m, pointer.x, pointer.y);
  }

  _updateHud() {
    const zoom = this._zoom();
    const state = `${zoom >= ZOOM_IN_LIMIT * 0.985 ? 1 : 0}${zoom <= ZOOM_OUT_LIMIT * 1.015 ? 1 : 0}`
      + `${this._cam.userAimed || Math.abs(zoom - 1) > 0.02 ? 1 : 0}`;
    if (state === this._hudState) return;
    this._hudState = state;
    this._hudZoomIn.disabled = state[0] === '1';
    this._hudZoomOut.disabled = state[1] === '1';
    this._hudReset.disabled = state[2] === '0';
  }

  // -------------------------------------------------------------------------------------------
  // Labels (HTML overlay)
  // -------------------------------------------------------------------------------------------

  _textWidth(text, kind, size) {
    const L = this._labels;
    const key = `${kind}${size}|${text}`;
    let width = L.widths.get(key);
    if (width === undefined) {
      const ctx = L.measure;
      let spacing = 0;
      if (kind === 'ocean') {
        ctx.font = `italic 400 ${size}px ${FONTS.display}`;
        spacing = 0.14 * size;
      } else if (kind === 'land') {
        ctx.font = `600 ${size}px ${FONTS.ui}`;
        spacing = 0.16 * size;
      } else {
        ctx.font = `600 ${size}px ${FONTS.ui}`;
      }
      width = Math.ceil(ctx.measureText(text).width + spacing * text.length) + 2;
      if (L.widths.size > 600) L.widths.clear();
      L.widths.set(key, width);
    }
    return width;
  }

  /** Project a surface point; returns its facing (0 beyond the limb … 1) and writes x, y into `out`. */
  _projectSurface(lon, lat, out) {
    const camera = this.camera;
    setFromLonLat(_v1, lon, lat, 1.002);
    const distance = camera.position.length();
    const cos = _v1.dot(camera.position) / (distance * 1.002);
    const limb = 1 / distance;
    _v1.project(camera);
    out.x = (_v1.x * 0.5 + 0.5) * this._w;
    out.y = (0.5 - _v1.y * 0.5) * this._h;
    return smoothstep(limb + 0.1, limb + 0.32, cos);
  }

  _free(box) {
    const boxes = this._labels.boxes;
    if (box.x0 < 4 || box.y0 < 4 || box.x1 > this._w - 4 || box.y1 > this._h - 4) return false;
    for (const b of boxes) {
      if (box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0) return false;
    }
    return true;
  }

  /** How far beyond the planet's disc a screen box reaches: its farthest corner ÷ the disc radius. */
  _discReach(x0, y0, x1, y1, radius) {
    const cx = this._w / 2;
    const cy = this._h / 2;
    const fx = Math.max(Math.abs(x0 - cx), Math.abs(x1 - cx));
    const fy = Math.max(Math.abs(y0 - cy), Math.abs(y1 - cy));
    return Math.sqrt(fx * fx + fy * fy) / Math.max(1, radius);
  }

  /** Choose which names to show and on which side of their marker. Runs a few times a second. */
  _layoutLabels(frame) {
    const L = this._labels;
    const now = frame.nowSec;
    const wanted = L.wanted;
    wanted.clear();
    L.boxes.length = 0;
    const scratch = _point;
    const radius = this._planetRadiusPx();

    // A species name sits east of its marker by default, keeps the side it already has, and out
    // toward the limb turns to the middle of the disc: names stay on the planet. Only a name the
    // viewer asked for (hover, dialog, arrival, departure) may hang over the limb, and only when
    // no side on the planet is free.
    const order = [0, 0, 0, 1, 2, 3];
    const placeSpecies = (m, prefix, cls, force) => {
      if (!m || wanted.has(m.id) || m.facing < (force ? 0.2 : 0.6)) return false;
      const text = prefix + m.sp.name;
      const w = this._textWidth(text, 'species', 12);
      const h = 16;
      const r = m.radius + 5;
      const dx = m.x - this._w / 2;
      const dy = m.y - this._h / 2;
      const inward = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 0) : (dy > 0 ? 2 : 3);
      const prev = L.byKey.get(m.id);
      order[0] = prev ? prev.side : Math.hypot(dx, dy) > radius * 0.45 ? inward : 0;
      order[1] = inward;
      for (let pass = 0; pass < (force ? 2 : 1); pass++) {
        let tried = 0;
        for (const side of order) {
          if (tried & (1 << side)) continue;
          tried |= 1 << side;
          let ox;
          let oy;
          if (side === 0) { ox = r; oy = -h / 2; }                 // east
          else if (side === 1) { ox = -r - w; oy = -h / 2; }       // west
          else if (side === 2) { ox = -w / 2; oy = -r - h; }       // north
          else { ox = -w / 2; oy = r; }                            // south
          const box = { x0: m.x + ox - 3, y0: m.y + oy - 1, x1: m.x + ox + w + 3, y1: m.y + oy + h + 1 };
          const reach = this._discReach(box.x0, box.y0, box.x1, box.y1, radius);
          if (pass === 0 && reach > LABEL_DISC_LIMIT) continue;
          if (!this._free(box)) continue;
          L.boxes.push(box);
          wanted.set(m.id, { key: m.id, text, cls, marker: m, lon: 0, lat: 0, ox, oy, w, h, side, dim: 1, urgent: force });
          return true;
        }
      }
      return false;
    };

    // Names never cover a marker: every visible marker reserves its own disc first.
    for (const m of this._markerList) {
      if (m.facing < 0.3) continue;
      const r = m.radius + 1;
      L.boxes.push({ x0: m.x - r, y0: m.y - r, x1: m.x + r, y1: m.y + r });
    }

    // Species: the one under the pointer, the one in the dialog, fresh arrivals, then the most abundant.
    let count = 0;
    const hover = frame.hoverId ? this._markers.get(frame.hoverId) : null;
    const focus = frame.focusId ? this._markers.get(frame.focusId) : null;
    if (hover && hover.goneAt < 0 && placeSpecies(hover, '', 'globe-label--species is-active', true)) count++;
    if (focus && focus.goneAt < 0 && placeSpecies(focus, '', 'globe-label--species is-active', true)) count++;
    for (const m of this._markerList) {
      if (m.goneAt >= 0) {
        if (m.labelled && placeSpecies(m, '† ', 'globe-label--species is-gone', true)) count++;
      } else if (m.bornAt >= 0 && now - m.bornAt < BLOOM_LABEL_SEC) {
        if (placeSpecies(m, '+ ', 'globe-label--species is-new', true)) count++;
      }
    }
    // A small planet (phones) carries fewer names.
    const speciesBudget = clamp(Math.round(radius / 38), 3, MAX_SPECIES_LABELS);
    // Names already up stay while their species is still near the top, so the set does not
    // reshuffle every time two abundances cross …
    let rank = 0;
    for (const sp of frame.alive) {
      if (count >= speciesBudget || rank++ >= speciesBudget * 2) break;
      const m = this._markers.get(sp.id);
      if (m && m.labelled && placeSpecies(m, '', 'globe-label--species', false)) count++;
    }
    // … then the most abundant fill what room is left.
    for (const sp of frame.alive) {
      if (count >= speciesBudget) break;
      const m = this._markers.get(sp.id);
      if (m && placeSpecies(m, '', 'globe-label--species', false)) count++;
    }
    for (const m of this._markerList) m.labelled = wanted.has(m.id);

    // Places: few, large and quiet. Oceans first, then continents by importance.
    if (frame.layers && frame.layers.labels) {
      let places = 0;
      const zoom = this._zoom();
      const placeBudget = clamp(Math.round(radius / 30), 3, MAX_PLACE_LABELS);
      const used = new Set();
      const placeName = (key, text, kind, size, lon, lat, opacity, sub, beside = 0) => {
        if (places >= placeBudget || !text || wanted.has(key)) return;
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
        // The same name can arrive from two sources (a supercontinent and its polygon): once is enough.
        const name = text.toLowerCase();
        if (used.has(name)) return;
        if (kind === 'ocean' && geo.isLand(lon, lat, frame.polygons)) return;
        const facing = this._projectSurface(lon, lat, scratch);
        if (facing < 0.5) return;
        const shown = kind === 'land' ? text.toUpperCase() : text;
        const w = this._textWidth(shown, kind, size);
        const h = Math.round(size * 1.35);
        // Names stay on the planet: no corner may hang off the limb into space. Within that, a
        // name is centred on its point (a pinged site: beside its ring) or, near the limb, slid
        // toward the middle of the disc as long as the point stays under the text — ocean
        // anchors often lie halfway to the limb. When a species name is in the way, it may also
        // sit a line or two above or below its point.
        const limit = radius * 0.96;
        const lines = beside ? 1 : PLACE_NUDGES.length;
        for (let i = 0; i < lines; i++) {
          const oy = PLACE_NUDGES[i] * h - h / 2;
          const top = scratch.y + oy;
          const dy = Math.max(Math.abs(top - this._h / 2), Math.abs(top + h - this._h / 2));
          if (dy >= limit) continue;
          const half = Math.sqrt(limit * limit - dy * dy);   // the disc's half-width at the name's far edge
          const left = this._w / 2 - half;
          const right = this._w / 2 + half - w;
          let x0 = scratch.x + (beside || -w / 2);
          if (!beside) {
            const lo = Math.max(left, scratch.x - w + 8);
            const hi = Math.min(right, scratch.x - 8);
            if (lo > hi) continue;
            x0 = clamp(x0, lo, hi);
          } else if (x0 < left || x0 > right) {
            continue;
          }
          const box = { x0: x0 - 4, y0: top - 2, x1: x0 + w + 4, y1: top + h + 2 };
          if (!this._free(box)) continue;
          L.boxes.push(box);
          used.add(name);
          places++;
          wanted.set(key, {
            key, text: shown, cls: `globe-label--${kind} globe-label--s${sub}`, marker: null,
            lon, lat, ox: x0 - scratch.x, oy, w, h, side: 0, dim: clamp(opacity ?? 1, 0, 1), urgent: kind === 'site',
          });
          return;
        }
      };

      if (this._ping.name) placeName(`ping:${this._ping.id}`, this._ping.name, 'site', 12, this._ping.lon, this._ping.lat, 1, 2, 24);
      const oceans = this._placeList('getOceanLabelsAt', frame.timeMa);
      if (oceans) {
        for (let pass = 3; pass >= 1; pass--) {
          for (const o of oceans) {
            const size = clamp(Math.round(o.size || 2), 1, 3);
            if (size !== pass) continue;
            placeName(`ocean:${o.id || o.name}`, o.name, 'ocean', size === 3 ? 17 : size === 2 ? 14 : 12, o.lon, o.lat, o.opacity, size);
          }
        }
      }
      const lands = this._placeList('getLandLabelsAt', frame.timeMa);
      if (lands) {
        for (const l of lands) {
          const size = clamp(Math.round(l.size || 2), 1, 3);
          placeName(`land:${l.id || l.name}`, l.name, 'land', size === 3 ? 13 : size === 2 ? 12 : 11, l.lon, l.lat, l.opacity, size);
        }
      }
      // Continent names from the polygons themselves; small ones only when zoomed in.
      const minRank = 15 / zoom;
      for (const polygon of frame.polygons) {
        if (!polygon.name || polygon.label === false) continue;
        const at = polygon.labelAt;
        let rank = polygon.labelRank;
        let lon;
        let lat;
        if (Array.isArray(at)) {
          lon = at[0];
          lat = at[1];
        } else if (!at && polygon.vertices && polygon.vertices.length >= 3) {
          // Older engine without label hints: the vertex average is good enough for a blob.
          let sx = 0;
          let sy = 0;
          for (const v of polygon.vertices) { sx += v[0]; sy += v[1]; }
          lon = sx / polygon.vertices.length;
          lat = sy / polygon.vertices.length;
          if (rank === undefined) rank = 20;
        } else {
          continue;
        }
        if (!(rank >= minRank)) continue;
        placeName(`poly:${polygon.id}`, polygon.name, 'land', rank >= 30 ? 12 : 11, lon, lat, 1, rank >= 30 ? 2 : 1);
      }
    }

    // Reconcile with the DOM slots. A new name must be wanted on two passes running before it
    // is shown (unless it answers the viewer directly), so nothing flickers in for a moment.
    for (const slot of L.slots) {
      if (slot.key !== null && !wanted.has(slot.key)) slot.target = 0;
    }
    for (const key of L.seen.keys()) {
      if (!wanted.has(key)) L.seen.delete(key);
    }
    for (const spec of wanted.values()) {
      let slot = L.byKey.get(spec.key);
      if (!slot) {
        const passes = (L.seen.get(spec.key) || 0) + 1;
        L.seen.set(spec.key, passes);
        if (passes < 2 && !spec.urgent && !frame.jumped && !this._reduced) continue;
        slot = L.slots.find((s) => s.key === null);
        if (!slot) continue;
        slot.key = spec.key;
        slot.alpha = 0;
        L.byKey.set(spec.key, slot);
      }
      slot.target = 1;
      slot.marker = spec.marker;
      slot.lon = spec.lon;
      slot.lat = spec.lat;
      slot.ox = spec.ox;
      slot.oy = spec.oy;
      slot.w = spec.w;
      slot.h = spec.h;
      slot.side = spec.side;
      slot.dim = spec.dim;
      slot.hang = spec.urgent && !!spec.marker;
      if (slot.text !== spec.text) {
        slot.text = spec.text;
        slot.el.textContent = spec.text;
      }
      if (slot.cls !== spec.cls) {
        slot.cls = spec.cls;
        slot.el.className = `globe-label ${spec.cls}`;
      }
    }
  }

  /** Optional place-name lists from js/data/paleogeography.js; null when unavailable. */
  _placeList(fn, timeMa) {
    const get = paleogeography && paleogeography[fn];
    if (typeof get !== 'function') return null;
    try {
      const list = get(timeMa);
      return Array.isArray(list) ? list : null;
    } catch {
      return null;
    }
  }

  _planetRadiusPx() {
    const d = this.camera.position.length();
    return (this._h / 2) / (Math.tan((CAMERA_FOV * D2R) / 2) * Math.sqrt(Math.max(1e-6, d * d - 1)));
  }

  _updateLabels(frame, dt) {
    const L = this._labels;
    const now = frame.nowSec;
    const hoverChanged = frame.hoverId !== L.lastHover || frame.focusId !== L.lastFocus;
    if (now >= L.nextLayout || hoverChanged || frame.jumped) {
      L.nextLayout = now + LABEL_LAYOUT_SEC;
      L.lastHover = frame.hoverId;
      L.lastFocus = frame.focusId;
      this._layoutLabels(frame);
    }

    const scratch = _point;
    const step = this._reduced ? 1 : Math.min(1, dt * LABEL_FADE_RATE);
    const radius = this._planetRadiusPx();
    for (const slot of L.slots) {
      if (slot.key === null) continue;
      slot.alpha += clamp(slot.target - slot.alpha, -step, step);
      if (slot.target === 0 && slot.alpha <= 0.001) {
        L.byKey.delete(slot.key);
        slot.key = null;
        slot.marker = null;
        if (slot.shown !== 0) {
          slot.shown = 0;
          slot.el.style.opacity = '0';
        }
        continue;
      }
      let facing;
      const m = slot.marker;
      if (m) {
        // A marker that left the pool keeps its last screen position while its name fades.
        if (this._markers.get(m.id) === m) {
          slot.x = m.x;
          slot.y = m.y;
          facing = smoothstep(0.15, 0.7, m.facing);
        } else {
          slot.target = 0;
          facing = 1;
        }
      } else {
        facing = this._projectSurface(slot.lon, slot.lat, scratch);
        slot.x = scratch.x;
        slot.y = scratch.y;
      }
      if (!slot.hang && facing > 0) {
        // The globe turns between layout passes: a name carried toward the limb fades before it
        // can hang out into space.
        const x0 = slot.x + slot.ox;
        const y0 = slot.y + slot.oy;
        const reach = this._discReach(x0, y0, x0 + slot.w, y0 + slot.h, radius);
        facing *= smoothstep(LABEL_LIMB_FADE, LABEL_DISC_LIMIT, reach);
      }
      const opacity = Math.round(slot.alpha * facing * slot.dim * 50) / 50;
      if (opacity !== slot.shown) {
        slot.shown = opacity;
        slot.el.style.opacity = String(opacity);
      }
      if (opacity > 0) {
        const tf = `translate(${(slot.x + slot.ox).toFixed(1)}px,${(slot.y + slot.oy).toFixed(1)}px)`;
        if (tf !== slot.tf) {
          slot.tf = tf;
          slot.el.style.transform = tf;
        }
      }
    }
  }

  // -------------------------------------------------------------------------------------------
  // Diagnostics (used by the capture / test scripts; not part of the renderer interface)
  // -------------------------------------------------------------------------------------------

  /** Counters since the previous call: texture paints, mean paint time, GL resource totals. */
  stats() {
    const s = this._surface;
    const info = this.renderer.info;
    const out = {
      textureSize: s.live.size,
      shownSize: s.shown.size,
      stillPaints: s.stillPaints,
      liveCap: s.liveCap,
      skip: s.skip,
      paints: s.paints,
      paintMsAvg: s.paints ? s.paintMs / s.paints : 0,
      drawCalls: info.render.calls,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      markers: this._markerList.length,
      pooledSprites: this._spritePool.length,
    };
    s.paints = 0;
    s.stillPaints = 0;
    s.paintMs = 0;
    return out;
  }

  /**
   * Point the camera at a longitude / latitude (degrees) immediately. Optional zoom (1 = home)
   * and a number of seconds to keep auto-rotation off afterwards (capture scripts pin the view).
   */
  lookAt(lon, lat, zoom = null, holdSec = 0) {
    const distance = zoom ? 1 + (this._home - 1) / clamp(zoom, ZOOM_OUT_LIMIT, ZOOM_IN_LIMIT) : this.camera.position.length();
    this._stopInertia();
    setFromLonLat(this.camera.position, lon, lat, distance);
    this._cam.glide = null;
    this._cam.distanceTarget = null;
    this._cam.userAimed = true;
    this._cam.quietUntil = performance.now() / 1000 + holdSec;
    this._needsAim = false;
    this._needsRender = true;
  }
}
