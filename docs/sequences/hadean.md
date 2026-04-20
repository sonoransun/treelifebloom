# Earth's Origin & Hadean

**Time range:** 4540 → 4000 Ma  
**View:** 3D globe  
**Duration:** 6 seconds at 1× speed

<video src="../../assets/animations/01-hadean.webm" autoplay loop muted playsinline width="640">
  <img src="../../assets/animations/01-hadean.gif" alt="Hadean Earth" width="640">
</video>

> Molten newborn planet — no continents, no life, just a hot rock cooling under a young sun.

## Why it matters

The Hadean is the eon for which we have almost no rock record — it's defined more by what it lacked than what it contained. No continents to speak of, no stable oceans, no biosphere, no oxygen. The visualization compresses ~540 million years of magma-ocean cooling, late heavy bombardment, and the first appearance of continental crust into a brief opening sequence.

By the end of the Hadean (4000 Ma), the first cratons (Vaalbara and Ur) emerge as small grey dots on the globe — the seeds of every continent you'll watch drift over the next four minutes.

## What to watch for

- **No species in the sidebar.** Life hasn't appeared yet.
- **Atmosphere readout:** temperature is off the charts (~70 °C surface), CO₂ is enormous (≥ 50,000 ppm), O₂ is essentially zero.
- **Seismic indicator:** Extreme. Plate tectonics — if it exists at all — is hyperactive.
- **The 3D globe** has its sun-glint specular cranked up; you can see the bright highlight where the sun's directional light hits the ocean.
- **Cloud shell** is already present and slowly drifting — a hint that we have a (toxic) atmosphere even now.
- The sequence ends just as the first proto-cratons emerge from the magma ocean.

## Related data

- **Period:** Hadean (4540 → 4000 Ma), `temporalWeight: 0.10` — flies by deliberately.
- **Atmosphere curves:** see `js/data/atmosphere.js` extreme low-Ma values.
- **Continents:** the very first slice in `js/data/continents.js` (4000 Ma) shows the proto-cratons that appear at the end of this clip.

## Regenerate

```bash
cd scripts/capture
node capture.js hadean
```
