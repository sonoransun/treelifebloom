# First Forests (Devonian)

**Time range:** 410 → 360 Ma  
**View:** 2D map (with sidebar)  
**Duration:** 10 seconds at 1× speed

<img src="../../assets/screenshots/05-forests.png" alt="First Forests poster" width="800">

<video src="../../assets/animations/05-forests.webm" autoplay loop muted playsinline width="800">
  <img src="../../assets/animations/05-forests.gif" alt="First Forests" width="800">
</video>

> Land turns green, fish crawl out, oxygen surges as the first forests take hold.

## Why it matters

The Devonian is "the Age of Fishes" — but it's also when life conquered the land in a serious way. Cooksonia and other early vascular plants from the Silurian had been small and creeping; by the Devonian, **Archaeopteris** is forming the first real forests, with deep roots that crack rock and pull CO₂ from the atmosphere on a global scale.

Underwater, jawed fish (placoderms like Dunkleosteus, lobe-fins like Eusthenopteron) diversify spectacularly — and one lineage of lobe-fins, including transitional forms like **Tiktaalik**, takes the decisive step onto land. Amphibians appear by the Late Devonian.

## Mechanism — the two linked stories

```mermaid
flowchart LR
    subgraph Carbon["Carbon cycle"]
        S[Sun]
        P["Archaeopteris forests<br/>photosynthesis<br/>6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂"]
        B["Woody tissue + deep roots<br/>bury carbon<br/>lignin not yet digestible"]
        S --> P --> B
        B --> C["CO₂ ↓ in atmosphere"]
        P --> O["O₂ ↑ in atmosphere"]
    end

    subgraph Tetrapod["Fish → tetrapod transition"]
        E["Eusthenopteron<br/>fully aquatic lobe-fin"] --> T["Tiktaalik<br/>wrists, mobile neck"]
        T --> A["Acanthostega<br/>8-fingered paddle-limb"]
        A --> I["Ichthyostega<br/>first walk on land"]
    end

    C --> Clim["Late Devonian cooling<br/>+ Hangenberg anoxic event"]
    O --> Clim
    Clim --> Ex["Late Devonian extinction<br/>372 Ma"]
```

## What to watch for

- **Sidebar** fills with new fish (Dunkleosteus, Eusthenopteron, lobe-fins) and the first plant entries (Archaeopteris, Cooksonia hold-overs). Two recent finds round out the lobe-fin story: **Qikiqtania** (named 2022 from Tiktaalik's Ellesmere Island sites) — a tetrapodomorph that *returned* to fully aquatic life — and **Hyneria udlezinye** (named 2022 from South Africa) — a 2.7 m apex predator showing that giant tristichopterids prowled high-latitude Gondwana too.
- **O₂ readout** ramps up — first forests draw down CO₂ and pump out oxygen. By the late Devonian, O₂ is well above modern levels heading into the Carboniferous spike.
- **CO₂ readout** drops correspondingly.
- **Marker halos** cluster around shallow-coastal locations as marine life diversifies.
- The clip ends right around the **Late Devonian extinction** (372 Ma) — you may see the start of its 2-second auto-pause toward the end.

### Time-anchored callouts (10 s clip)

| Clip time | Time-Ma window | UI detail to watch |
|---|---|---|
| 0 s – 3 s | 410 → 395 Ma | First Devonian fish markers (Acanthodii jaws, early placoderms) pulse along coastlines |
| 3 s – 6 s | 395 → 380 Ma | Archaeopteris (first forests) rises in the sidebar green band; O₂ sparkline inflects upward |
| 6 s – 8 s | 380 → 370 Ma | Dunkleosteus + Eusthenopteron visible in sidebar; Tiktaalik appears as a transitional leaf near the shore; Qikiqtania pulses on Ellesmere Island as the "return to water" cousin |
| 8 s – 10 s | 370 → 360 Ma | Ichthyostega / Acanthostega join the list; Hyneria udlezinye appears as a Gondwanan apex predator; end-window may include onset of Late Devonian extinction pause |

## Related data

- **Period:** Devonian (419.2 → 358.9 Ma), `temporalWeight: 5.00` — high weight, ~20 seconds of screen time.
- **Species added recently:** Archaeopteris, Eusthenopteron, Tiktaalik, Dunkleosteus, ammonoids, and more — see `js/data/species.js`.
- **Late Devonian extinction** (`extinctions.js#late-devonian`) sits at the end of this window.

## Regenerate

```bash
cd scripts/capture
node capture.js forests
```
