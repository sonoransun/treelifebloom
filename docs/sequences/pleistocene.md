# Ice Age & Megafauna

**Time range:** 2.5 → 0.012 Ma  
**View:** 2D map (with sidebar)  
**Duration:** 9 seconds at 1× speed

<video src="../../assets/animations/09-pleistocene.webm" autoplay loop muted playsinline width="800">
  <img src="../../assets/animations/09-pleistocene.gif" alt="Pleistocene ice age" width="800">
</video>

> Polar caps expand, mammoths and dire wolves spread across continents reshaped by ice.

## Why it matters

The Pleistocene is the recent ice age — over 40 cycles of glacial advance and retreat over the past 2.6 million years. Sea levels rose and fell by 100+ meters. North America and northern Europe were repeatedly buried under continental ice sheets. In the warm interglacials, life adapted; in the colds, it migrated, evolved cold-tolerance, or perished.

The megafauna of the Pleistocene — woolly mammoths, woolly rhinos, giant ground sloths, dire wolves, sabertooth cats, cave bears, short-faced bears — were the largest mammals to walk on land since the demise of the dinosaurs. Most of them disappear in a wave of late-Pleistocene extinctions correlated with the spread of *Homo sapiens* out of Africa.

## What to watch for

- **Polar ice caps** expand to their maximum extent of the post-K-Pg world — the equator-pole gradient on the 2D map's polar-circle dashed lines becomes filled with ice.
- **Sidebar** is dominated by megafauna: Woolly mammoth, Woolly rhino, Smilodon, Megatherium, Dire wolf, Cave bear, Andrewsarchus.
- **Hominin entries** appear in the bottom of the sidebar — Homo erectus, Neanderthals, and finally early Homo sapiens.
- **Pleistocene** has the highest `temporalWeight` (10.00) in the entire timeline — it gets the most screen-time-per-Ma of any period, deliberately, since this is where most viewers want to linger.
- **Continents** are essentially modern — but you can see Britain joined to Europe and the Bering land bridge open, since sea levels are low.

## Related data

- **Period:** Pleistocene (2.58 → 0.0117 Ma), `temporalWeight: 10.00` — the ceiling.
- **Megafauna species** all live in this narrow window in `js/data/species.js`.
- **Glaciation extent** scales with the temperature curve which dips repeatedly through the Pleistocene cycles.

## Regenerate

```bash
cd scripts/capture
node capture.js pleistocene
```
