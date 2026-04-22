# Cambrian Explosion

**Time range:** 540 → 480 Ma  
**View:** 2D map (with sidebar)  
**Duration:** 12 seconds at 1× speed

<img src="../../assets/screenshots/04-cambrian.png" alt="Cambrian Explosion poster" width="800">

<video src="../../assets/animations/04-cambrian.webm" autoplay loop muted playsinline width="800">
  <img src="../../assets/animations/04-cambrian.gif" alt="Cambrian Explosion" width="800">
</video>

> Body plans burst onto the scene — the sidebar fills with new categories in seconds.

## Why it matters

In a geologically brief ~25 million years, virtually every animal phylum we still have today appears in the fossil record. Trilobites, brachiopods, mollusks, echinoderms, and the first chordates all show up — many with hard parts that fossilize easily, which is part of why the "explosion" looks so abrupt.

This is the moment evolution stops being chemistry-with-extra-steps and becomes recognizable life. From here onward, the sidebar is rarely empty.

## Mechanism — a simplified phylogeny of who appears

```mermaid
graph TD
    MS[Metazoa stem<br/>Ediacaran ancestors]
    MS --> Po[Porifera<br/>sponges]
    MS --> Cn[Cnidaria<br/>corals, anemones]
    MS --> Bi[Bilateria]
    Bi --> Pr[Protostomia]
    Bi --> De[Deuterostomia]
    Pr --> Mo[Mollusca]
    Pr --> Ar[Arthropoda<br/>trilobites,<br/>Anomalocaris]
    Pr --> An[Annelida]
    Pr --> Pp[Priapulida<br/>Ottoia]
    Pr --> Lo[Lobopodia<br/>Hallucigenia,<br/>Aysheaia]
    De --> Ec[Echinodermata<br/>crinoids]
    De --> He[Hemichordata]
    De --> Ch[Chordata<br/>Pikaia,<br/>Myllokunmingia]
```

Almost every one of those boxes lights up the sidebar within the 12-second clip.

## What to watch for

- **Sidebar** fills rapidly: trilobites, anomalocaris, hallucigenia, wiwaxia, marrella, ottoia, archaeocyatha, pikaia, and more — a cascade of new categories (arthropods, invertebrates, the first chordates).
- **Biodiversity readout** climbs sharply — this is the steepest single-period rise in the entire play-through.
- **Marker halos** of multiple colors crowd the map for the first time. Pulsing arthropod oranges and invertebrate teal-greys dominate.
- **Continents** are Gondwana + Laurentia, Baltica, Siberia — separated, with shallow tropical shelves where most of this evolution happens.
- **O₂ readout** continues climbing — the Cambrian benefits from Neoproterozoic oxygenation.

### Time-anchored callouts (12 s clip)

| Clip time | Time-Ma window | UI detail to watch |
|---|---|---|
| 0 s – 2 s | 540 → 530 Ma | Sidebar mostly microbial; Cambrian Explosion milestone fires top-center |
| 2 s – 5 s | 530 → 515 Ma | Trilobita, Anomalocaris, Archaeocyatha, Myllokunmingia appear — first wave of orange arthropod markers on the map |
| 5 s – 9 s | 515 → 495 Ma | Sidebar fills out: Opabinia, Hallucigenia, Wiwaxia, Pikaia, Marrella, Ottoia, Aysheaia — the weird Burgess Shale crowd |
| 9 s – 12 s | 495 → 480 Ma | Biodiversity sparkline at the steepest slope in the whole play-through; markers crowd the tropical shelves of Gondwana |

## Related data

- **Period:** Cambrian (538.8 → 485.4 Ma), `temporalWeight: 5.50` — near-peak weight, ~20 seconds of screen time.
- **Species:** the largest density of new entries in `js/data/species.js` covers this period.
- **Milestone overlay:** the Cambrian Explosion milestone fires at the start.

## Regenerate

```bash
cd scripts/capture
node capture.js cambrian
```
