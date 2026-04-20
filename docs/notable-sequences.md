# Notable sequences

Ten moments worth pausing on. Each links to a detailed walkthrough with an embedded clip, an explainer, and a checklist of what to watch for.

The thumbnail PNGs and WebM/GIF clips are produced by `scripts/capture/capture.js` (see [docs/capture.md](capture.md)). On a fresh clone they may be absent — run `node scripts/capture/capture.js --all` from `scripts/capture/` to populate them.

| # | Time (Ma) | Sequence | Highlight |
|---|-----------|----------|-----------|
| 1 | 4540 → 4000 | [Earth's Origin & Hadean](sequences/hadean.md) | Molten newborn planet, no continents, no life |
| 2 | 2500 → 2200 | [Great Oxygenation Event](sequences/goe.md) | Cyanobacteria peak, methane haze clears |
| 3 | 720 → 635 | [Snowball Earth](sequences/snowball.md) | Polar ice caps reach the equator |
| 4 | 540 → 480 | [Cambrian Explosion](sequences/cambrian.md) | Body plans burst — sidebar fills with new clades |
| 5 | 410 → 360 | [First Forests (Devonian)](sequences/forests.md) | Land turns green, fish crawl out |
| 6 | 256 → 250 | [End-Permian "Great Dying"](sequences/permian.md) | 96% extinction; clock pauses on the overlay |
| 7 | 200 → 145 | [Jurassic Dinosaurs](sequences/jurassic.md) | Pangaea splits, peak dinosaur diversity |
| 8 | 67 → 64 | [K-Pg Asteroid Impact](sequences/kpg.md) | Asteroid streak, dinosaurs vanish |
| 9 | 2.5 → 0.012 | [Ice Age & Megafauna](sequences/pleistocene.md) | Ice caps advance, mammoths and dire wolves |
| 10 | 6 → 0 | [Hominin Emergence](sequences/hominin.md) | Ardipithecus → erectus → Neanderthal → sapiens |

## Reading order

The list above is in chronological order. To get the full arc in one sitting, walk the table top-to-bottom — the play-through at 1× takes about 4 minutes 27 seconds end to end.

To dip in, the three highest-impact picks are **Cambrian**, **K-Pg**, and **Pleistocene** — they're embedded as the hero clips in the [main README](../README.md).

## Capturing your own

Every walkthrough ends with the exact command to regenerate that clip. To re-capture them all:

```bash
cd scripts/capture
npm install                # one-time
node capture.js --all      # ~5 minutes
```

See [docs/capture.md](capture.md) for full details.
