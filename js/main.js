// Main entry point — bootstraps clock, views, sidebar, controls, and runs the animation loop.

import { GeoClock } from './engine/clock.js';
import { getPolygonsAtTime } from './engine/interpolator.js';
import { getBoundariesAtTime } from './engine/plateBoundaryInterpolator.js';
import { View2D } from './views/view2d.js';
import { Sidebar } from './ui/sidebar.js';
import { Controls } from './ui/controls.js';
import { ExtinctionOverlay } from './ui/extinctionOverlay.js';

// --- Initialize ---

const clock = new GeoClock();
const vizContainer = document.getElementById('viz-container');
const view2d = new View2D(vizContainer);
let view3d = null; // Lazy-loaded
let activeView = view2d;
let currentMode = '2d';
let showBoundaries = false;

const sidebar = new Sidebar();
const controls = new Controls(clock);
const extinctionOverlay = new ExtinctionOverlay();

// Initialize 2D view
view2d.init();

// Resize handling
const resizeObserver = new ResizeObserver(() => {
  activeView.resize();
});
resizeObserver.observe(vizContainer);

// --- View Switching ---

const btn2d = document.getElementById('btn-2d');
const btn3d = document.getElementById('btn-3d');

btn2d.addEventListener('click', () => switchView('2d'));
btn3d.addEventListener('click', () => switchView('3d'));

// --- Plate Boundary Toggle ---

const btnPlates = document.getElementById('btn-plates');
btnPlates.addEventListener('click', () => {
  showBoundaries = !showBoundaries;
  btnPlates.classList.toggle('active', showBoundaries);
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'p') {
    showBoundaries = !showBoundaries;
    btnPlates.classList.toggle('active', showBoundaries);
  }
});

async function switchView(mode) {
  if (mode === currentMode) return;

  if (mode === '3d') {
    // Lazy load 3D view
    if (!view3d) {
      try {
        const { View3D } = await import('./views/view3d.js');
        view3d = new View3D(vizContainer);
      } catch (err) {
        console.error('Failed to load 3D view:', err);
        alert('3D Globe requires WebGL support. Please use a modern browser.');
        return;
      }
    }

    activeView.destroy();
    activeView = view3d;
    activeView.init();

    document.getElementById('canvas2d').style.display = 'none';
    document.getElementById('globe-container').style.display = 'block';

    btn2d.classList.remove('active');
    btn3d.classList.add('active');
  } else {
    activeView.destroy();
    activeView = view2d;
    activeView.init();

    document.getElementById('globe-container').style.display = 'none';
    document.getElementById('canvas2d').style.display = 'block';

    btn3d.classList.remove('active');
    btn2d.classList.add('active');
  }

  activeView.resize();
  currentMode = mode;
}

// --- Animation Loop ---

let lastTimestamp = 0;

function animate(timestamp) {
  const delta = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0;
  lastTimestamp = timestamp;

  // Cap delta to prevent huge jumps when tab is backgrounded
  const clampedDelta = Math.min(delta, 0.1);

  // 1. Advance clock
  clock.tick(clampedDelta);
  const t = clock.currentTimeMa;

  // 2. Get interpolated continental polygons
  const polygons = getPolygonsAtTime(t);

  // 2.5. Get plate boundaries if toggled on
  const boundaries = showBoundaries ? getBoundariesAtTime(t) : null;

  // 3. Render active view
  activeView.render(polygons, t, boundaries);

  // 4. Update UI
  sidebar.update(t);
  controls.updateDisplay(t);
  extinctionOverlay.update(t);

  requestAnimationFrame(animate);
}

// Initial render
const initialPolygons = getPolygonsAtTime(clock.currentTimeMa);
const initialBoundaries = showBoundaries ? getBoundariesAtTime(clock.currentTimeMa) : null;
activeView.render(initialPolygons, clock.currentTimeMa, initialBoundaries);
sidebar.update(clock.currentTimeMa);
controls.updateDisplay(clock.currentTimeMa);

// Start loop
requestAnimationFrame(animate);
