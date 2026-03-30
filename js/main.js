// Main entry point — bootstraps clock, views, sidebar, controls, and runs the animation loop.

import { GeoClock } from './engine/clock.js';
import { getPolygonsAtTime } from './engine/interpolator.js';
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

  // 3. Render active view
  activeView.render(polygons, t);

  // 4. Update UI
  sidebar.update(t);
  controls.updateDisplay(t);
  extinctionOverlay.update(t);

  requestAnimationFrame(animate);
}

// Initial render
const initialPolygons = getPolygonsAtTime(clock.currentTimeMa);
activeView.render(initialPolygons, clock.currentTimeMa);
sidebar.update(clock.currentTimeMa);
controls.updateDisplay(clock.currentTimeMa);

// Start loop
requestAnimationFrame(animate);
