# Life's Tree Blooms!

An animated visualization of Earth's evolutionary history spanning 4 billion years — from the first prokaryotes to modern humans.

The animation progresses through geological time, showing:

- **Continental drift** with historically accurate plate positions morphing across 12 key time slices, from proto-cratons through Pangaea to the present-day configuration
- **60 prominent species and events** marking major transitions — the Cambrian Explosion, first land plants, dinosaurs, mammals, and the rise of Homo sapiens
- **5 mass extinction events** (End-Ordovician, Late Devonian, End-Permian, End-Triassic, End-Cretaceous) highlighted with dramatic visual effects
- **Temporal compression** so billions of years of single-celled life pass quickly while periods of rapid diversification like the Cambrian and human evolution linger
- **A species sidebar** showing the most dominant life forms at each moment, ranked by relative abundance

## Running

No build step or installation is required. Serve the project with any static HTTP server:

```
python3 -m http.server 8080
```

Then open http://localhost:8080 in a modern browser (Chrome, Firefox, Safari, or Edge).

Alternatively, use Node.js:

```
npx serve
```

## Viewing

### 2D Map View (default)

The animation opens in a flat equirectangular map projection. Continental outlines are drawn on an ocean background with a subtle coordinate grid. Species appear as color-coded markers at their geographic origins. Pan by clicking and dragging; zoom with the scroll wheel.

### 3D Globe View

Click the **3D Globe** button in the toolbar to switch to an interactive Three.js globe. Continental polygons are projected onto a rotating sphere with lighting and a starfield background. Click and drag to rotate the globe; scroll to zoom. The globe auto-rotates slowly when not being interacted with.

Both views share the same timeline state — switching between them preserves the current time position and playback.

## Controls

| Control | Action |
|---------|--------|
| **Play/Pause button** | Start or pause the animation |
| **Spacebar** | Toggle play/pause |
| **Timeline scrubber** | Drag to jump to any point in geological time |
| **Left/Right arrows** | Step backward/forward through time |
| **Speed selector** | Adjust playback speed (0.25x to 4x) |
| **Restart button** | Return to 4 billion years ago |
| **R key** | Restart the animation |
| **2D Map / 3D Globe** | Toggle between flat map and globe views |

The colored era strip above the scrubber shows geological periods at a glance, using standard International Commission on Stratigraphy colors.
