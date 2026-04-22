# Hominin Emergence

**Time range:** 6 → 0 Ma  
**View:** 2D map (with sidebar)  
**Duration:** 8 seconds at 1× speed

<img src="../../assets/screenshots/10-hominin.png" alt="Hominin poster" width="800">

<video src="../../assets/animations/10-hominin.webm" autoplay loop muted playsinline width="800">
  <img src="../../assets/animations/10-hominin.gif" alt="Hominin emergence" width="800">
</video>

> Ardipithecus → Homo erectus → Neanderthals → Homo sapiens, on the heels of the megafauna.

## Why it matters

In a geological eyeblink — six million years, less than 0.2% of Earth's history — a single primate lineage evolves from chimp-like forest-edge apes into a globally dominant species that reshapes ecosystems on every continent.

The visualization tracks key hominin entries: **Ardipithecus** (early bipedal, ~4.4 Ma) → **Australopithecus** (e.g. Lucy, ~3 Ma) → **Homo habilis** → **Homo erectus** (the first long-distance global migrant, ~2 Ma) → **Homo neanderthalensis** (ice-age cousins, ~400 ka–40 ka) → **Homo sapiens** (us, ~300 ka onward). Each gets a distinct entry with its own appearance and (where applicable) extinction Ma.

Watch for the moment the sidebar shows multiple Homo species coexisting — there were periods, particularly in the Late Pleistocene, when at least four hominin species lived on Earth simultaneously.

## Mechanism — a simplified hominin phylogeny

```mermaid
graph TD
    CHLA["Chimp–human last<br/>common ancestor<br/>~7 Ma"]
    CHLA --> Sah["Sahelanthropus<br/>tchadensis<br/>7 → 6 Ma"]
    Sah --> Ard["Ardipithecus<br/>~4.4 Ma<br/>early bipedal"]
    Ard --> Aus["Australopithecus afarensis<br/>Lucy<br/>4.2 → 2.0 Ma"]
    Aus --> Hab["Homo habilis<br/>2.8 → 1.5 Ma<br/>Oldowan tools"]
    Hab --> Ere["Homo erectus<br/>1.9 Ma → 110 ka<br/>first out of Africa<br/>controlled fire"]
    Ere --> Nea["Homo neanderthalensis<br/>400 → 40 ka"]
    Ere --> Sap["Homo sapiens<br/>300 ka → present"]
    Sap -. "~1–2% DNA" .- Nea
```

Coexistence windows visible in the clip: Homo erectus overlaps with Neanderthals and early Homo sapiens (≈ 300 → 110 ka); late Pleistocene hosts four+ Homo species simultaneously across Eurasia and Africa.

## What to watch for

- **Sidebar** sees the full hominin sequence appear in order. The hominin category color (`#ee3333`) is distinctive.
- **Markers** appear concentrated in East Africa, then spread to Eurasia and beyond as Homo erectus migrates.
- **Megafauna entries** drop off the sidebar through the late Pleistocene — correlated in this dataset with hominin spread.
- **Holocene** (the very tail of the clip) lasts only 11,700 years — a single frame of "blink and miss it" agriculture and civilization.
- **Click any hominin entry** in the sidebar (in the live app) to open the modal and see close relatives — you'll get a clean walk through the lineage.

### Time-anchored callouts (8 s clip)

| Clip time | Time-Ma window | UI detail to watch |
|---|---|---|
| 0 s – 2 s | 6 → 4 Ma | Sahelanthropus marker pulses in central Africa; first_monkeys / great_apes still dominating the primate band |
| 2 s – 4 s | 4 → 2 Ma | Australopithecus appears; East African markers multiply; the Hominidae family color (red override) becomes visible |
| 4 s – 6 s | 2 → 0.4 Ma | Homo habilis then Homo erectus rise; erectus markers spread from Africa to Eurasia (Java, Georgia); mammoth megafauna dominate sidebar simultaneously |
| 6 s – 8 s | 0.4 Ma → 0 | Neanderthals peak then drop; Homo sapiens (deep red, `#ee3333`) takes the #1 slot; Agriculture & Civilization milestone fires in the final fraction of a second |

## Related data

- **Hominin entries** in `js/data/species.js`: Ardipithecus, Australopithecus, Homo habilis, Homo erectus, Homo neanderthalensis, Homo sapiens.
- **Period:** Pliocene + Pleistocene + Holocene cover this window.
- **Milestone overlay:** "Agriculture & Civilization" fires in the final fraction of a second.

## Regenerate

```bash
cd scripts/capture
node capture.js hominin
```
