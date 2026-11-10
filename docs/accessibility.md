# Accessibility

Life's Tree Blooms is 4.54 billion years told mostly in pictures that move. So every part of it has two jobs: to show something, and to say it in words to anyone who can't see it, can't use a pointer, or would rather the picture held still. This page describes what the app does for keyboard users, screen-reader users, people sensitive to motion, people who see colour differently, high-contrast modes and small touch screens. It is just as plain about what the app does not do yet.

Every statement here was checked against the code and in the running app. Keyboard paths were driven with Playwright, Chromium's accessibility tree was read directly, and motion and forced colours were emulated, all in headless Chromium. The checks were not repeated with real screen readers or in other browsers; see [Known gaps](#known-gaps).

## The short version

- **Keyboard:** the whole story can be played, steered and read from the keyboard. <kbd>Space</kbd> plays and pauses, the arrow keys step through time, and <kbd>?</kbd> opens Help, which lists the shortcuts. A skip link jumps straight to the timeline.
- **Screen readers:** a polite live region narrates the story: each new period, era, milestone and mass extinction, and the arrival at today. The Life panel and its Index are the text version of what the markers show.
- **Motion:** the app follows `prefers-reduced-motion`. **Help → Motion** overrides it (Follow system, Reduced or Full) and remembers the choice. Reduced motion stills the shakes, blooms, glides and pulses.
- **Colour:** eight life groups, each with its own hue *and* its own marker shape. The hues were checked for colour-vision deficiency, and colour is never the only cue.
- **Touch and high contrast:** the layout reflows down to 320 px wide, touch targets are enlarged, and forced-colours mode keeps selected states and data colours visible.

## Keyboard

### Global shortcuts

One handler ([`js/ui/shortcuts.js`](../js/ui/shortcuts.js)) owns these keys. Its `SHORTCUTS` table is also what Help → *Keyboard & mouse* shows.

| Keys | What they do |
|---|---|
| <kbd>Space</kbd> | Play / pause (also continues past an extinction hold) |
| <kbd>←</kbd> <kbd>→</kbd> | Step back / forward through time: two seconds of 1× playback (`TIMING.nudgeSeconds`) |
| <kbd>Shift</kbd> + <kbd>←</kbd>/<kbd>→</kbd> | Step five times further |
| <kbd>PgUp</kbd> <kbd>PgDn</kbd> | Next / previous period while the timeline is focused: Page Up goes to the start of the next (later) period, Page Down back to the start of this one or the one before |
| <kbd>[</kbd> <kbd>]</kbd> | Previous / next chapter |
| <kbd>-</kbd> <kbd>+</kbd> | Slower / faster through 0.25×, 0.5×, 1×, 2×, 4× (<kbd>_</kbd> and <kbd>=</kbd> work too) |
| <kbd>Home</kbd> <kbd>R</kbd> | Back to the beginning |
| <kbd>End</kbd> | Jump to the present |
| <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> | Map, Globe, Tree view |
| <kbd>P</kbd> | Plate boundaries (Map and Globe) |
| <kbd>L</kbd> | Place names & events (Map and Globe) |
| <kbd>C</kbd> | Chapters |
| <kbd>G</kbd> | Legend |
| <kbd>?</kbd> | This help |
| <kbd>Tab</kbd> | Reach the timeline: its event markers are one stop. <kbd>←</kbd> <kbd>→</kbd> move between them, <kbd>Enter</kbd> jumps |
| <kbd>Esc</kbd> | Close the open panel or dialog |

<!-- js/ui/shortcuts.js currently labels the PgUp/PgDn row "Previous / next period" (PgUp first); the keys work as described above. Reported; reconcile once the label is fixed. -->

A few rules decide when these keys act:

- **They are off** while a modal dialog is open (the intro, Help, a species) and while you type in a text field or a select.
- **<kbd>Esc</kbd> works from anywhere**, form controls included. The exception is a text field that still holds text: there the first <kbd>Esc</kbd> clears the field.
- **<kbd>Space</kbd> on a focused button presses that button.** Anywhere else, the title link included, it plays and pauses.
- **Only <kbd>←</kbd> and <kbd>→</kbd> repeat when held.** Every other key acts once per press.
- **<kbd>Ctrl</kbd>, <kbd>Alt</kbd> and <kbd>⌘</kbd> combinations belong to the browser.** The exception is <kbd>[</kbd> and <kbd>]</kbd>, on layouts that type them with AltGr or Option.
- **In the Tree view, <kbd>P</kbd> and <kbd>L</kbd> only explain themselves** ("Plates and labels belong to the Map and Globe views"). Their toolbar buttons are `aria-disabled` there but stay focusable.

### Keys inside components

| Where | Keys |
|---|---|
| **Timeline position** (a range input, "Position in Earth history") | <kbd>←</kbd>/<kbd>↓</kbd> and <kbd>→</kbd>/<kbd>↑</kbd> step back and forward (<kbd>Shift</kbd> ×5), <kbd>PgUp</kbd>/<kbd>PgDn</kbd> next / previous period, <kbd>Home</kbd> the beginning, <kbd>End</kbd> the present. One slider step equals one arrow press, so a screen reader's increment moves time just as far. |
| **Event markers** (a toolbar just after the slider) | One Tab stop, which lands on the next event ahead of the playhead. <kbd>←</kbd>/<kbd>↑</kbd> and <kbd>→</kbd>/<kbd>↓</kbd> move to the previous / next marker, <kbd>Home</kbd>/<kbd>End</kbd> to the first / last. <kbd>Enter</kbd> or <kbd>Space</kbd> jumps to just before the event and plays. The focused marker's tooltip opens and becomes its description. |
| **Transport** | Previous chapter · Play/Pause · Next chapter · Back to the beginning. Each shows its shortcut in a tooltip when reached by keyboard. |
| **Speed** | A radio group: one Tab stop. <kbd>←</kbd>/<kbd>↓</kbd> slower, <kbd>→</kbd>/<kbd>↑</kbd> faster, <kbd>Home</kbd>/<kbd>End</kbd> slowest / fastest. The speed changes as focus moves. At 560 px and narrower it becomes a native select. |
| **Tabs in the Legend and Help** | <kbd>←</kbd> <kbd>→</kbd> (or <kbd>↑</kbd> <kbd>↓</kbd>) move and select, wrapping round; <kbd>Home</kbd>/<kbd>End</kbd> jump to the ends. <kbd>Tab</kbd> then enters the tab's panel, which can be scrolled from the keyboard. |
| **Tabs in the Life panel** | <kbd>←</kbd> <kbd>→</kbd> switch between *Now* and *Index*. |
| **Chapters list** | One Tab stop. <kbd>↑</kbd> <kbd>↓</kbd> <kbd>Home</kbd> <kbd>End</kbd> walk the list without moving time; <kbd>Enter</kbd> jumps to that chapter and plays. On screens 900 px wide or less the panel then closes. |
| **Life rows, Index entries, Arrived / Lost chips** | <kbd>↑</kbd> <kbd>↓</kbd> walk the rows; <kbd>Enter</kbd> or <kbd>Space</kbd> opens the species dialog. A row with keyboard focus also rings its species on the map, globe or tree and shows its hover card beside the panel. |
| **Index search** | Typing filters the list, and the match count is announced. <kbd>↓</kbd> moves to the first result; <kbd>Esc</kbd> clears the field. |
| **Planet vitals** | Each card is a Tab stop. Focus shows the card's explanation under the grid. |
| **Zoom buttons on the views** | Map and Tree: Zoom in, Zoom out, Reset. Globe: Zoom in, Zoom out, Rotate west, Rotate east, Re-centre on the continents. <!-- REVIEW after geometry lands --> A button that cannot act (fully zoomed in or out, already centred) is disabled and drops out of the Tab order. |
| **Extinction card** | *Continue* does what <kbd>Space</kbd> does. The *Hardest hit* / *Lost here* chips open those species, and *+N more* unfolds the list and moves focus into it. |
| **Earth-clock "i"** (context card) | Focus shows the explanation; <kbd>Esc</kbd> hides it without moving focus. |
| **⋯ menu** (720 px and narrower) | <kbd>Enter</kbd>/<kbd>Space</kbd> opens it. It is a disclosure, not an ARIA menu. <kbd>Tab</kbd> walks its four buttons; once you are inside, <kbd>↑</kbd> <kbd>↓</kbd> cycle among them. <kbd>Esc</kbd> closes it and returns focus to ⋯. Tabbing out, or opening a panel from it, folds it away. |
| **Dialogs** | <kbd>Tab</kbd> and <kbd>Shift</kbd>+<kbd>Tab</kbd> wrap inside; <kbd>Esc</kbd> closes; <kbd>?</kbd> also closes Help. |

### Tab order

On a desktop, Tab visits (checked at 1440 × 860):

1. **Skip to timeline controls**, a link that appears only when focused. Following it puts the next <kbd>Tab</kbd> on the timeline slider.
2. **Toolbar:** the title (a link back to the beginning), Map · Globe · Tree, Plates, Labels, Chapters, Legend, Help.
3. **Visualization:** the context card's Earth-clock button, then the extinction card's controls while one is showing, the Legend and Chapters panels while open, and the active view's zoom buttons.
4. **Life panel:** the *Now* / *Index* tab, the six vitals, the share-of-life disclosure, the ranked rows, *Show all*.
5. **Timeline:** position slider, event markers (one stop), previous chapter, play, next chapter, restart, speed (one stop).
6. **The finale card**, when the story has reached today.

At 900 px and narrower the Life panel becomes a drawer that stays out of the Tab order until it is opened. At 720 px and narrower, Plates, Labels, Chapters and Legend move into the ⋯ menu.

## Focus

The code follows two rules. Focus moves *into* a panel only when you opened it from the keyboard. And it returns *to* a control only if a control had it before, so a dialog opened from the map, with nothing focused, never leaves a button primed for your next <kbd>Space</kbd>.

| Surface | Kind | Focus on open | Closes with | Focus afterwards |
|---|---|---|---|---|
| **Intro card** (first visit) | Modal: `role="dialog"`, `aria-modal`; shortcuts off | *Begin at the beginning*; <kbd>Tab</kbd> cycles its two buttons | <kbd>Esc</kbd>, a click outside, either button | Back where it was. *Begin* moves it to the play button, *Browse chapters* to the Chapters panel. |
| **Help** | Native modal `<dialog>`; the page behind is inert | The dialog's title | <kbd>Esc</kbd>, <kbd>?</kbd>, ✕, a click on the backdrop | The control that opened it, or nothing |
| **Species dialog** | Native modal `<dialog>`; pauses the story, which stays paused afterwards | The species' name | <kbd>Esc</kbd>, ✕, the backdrop, or a *Go to* action | The control that opened it; if that has gone, the species' row in the Life panel |
| **Legend, Chapters** | Non-modal panels (`role="region"`) | From the keyboard: the current tab or the current chapter. From a pointer: focus stays put. | <kbd>Esc</kbd>, ✕, the toolbar button | If focus was inside: the control that opened it, or nothing if a shortcut did |
| **Life drawer** (≤ 900 px) | Slide-over panel, `inert` while closed | Stays on the *Life* button | <kbd>Esc</kbd>, ✕, the *Life* button | The *Life* button, if focus was inside |
| **⋯ menu** (≤ 720 px) | Disclosure | Stays on ⋯ | <kbd>Esc</kbd>, tabbing out, a press elsewhere | ⋯ |
| **Extinction card** | Status card | Never takes focus | Leaves when the event ends | — |
| **Finale card** | Non-modal `role="dialog"` | Never takes focus; it is the last Tab stop | <kbd>Esc</kbd> inside it, ✕, any seek or play | The play button, if focus was inside |

Inside the species dialog, opening a relative keeps focus on the new name, and a *Back to …* button retraces your steps.

Keyboard focus is always visible. Controls show a 2 px amber ring (`:focus-visible`), 11:1 against the page. Over the planet the ring sits on a 6 px dark halo, because amber on ice (1.6:1) or desert (1.3:1) would all but vanish. Timeline markers grow and wear a light ring of their own instead, and scrollable panes get a fine outline.

## Screen readers

### Landmarks and headings

- **Landmarks:** banner (the toolbar), main (the visualization), complementary *Planet vitals and dominant life* (the Life panel) and contentinfo *Timeline*. Regions: *Current moment* (the context card), *Planet vitals* and *Dominant life* inside the Life panel, and *Legend* and *Chapters* while they are open.
- **Headings:** one `h1`, the title. It stays the page's `h1` below 860 px, where it is visually hidden. Below it come `h2`s for the current period (in the context card), *Planet vitals* (visually hidden), *Dominant life*, and each panel and dialog title.
- The page declares `lang="en"`, and a `<noscript>` message explains that JavaScript is needed.

### What the controls say

| Control | Name and state |
|---|---|
| View buttons, Plates, Labels | `aria-pressed` |
| Chapters, Legend, *Life*, ⋯ | `aria-expanded`, `aria-controls` |
| Timeline position | "Position in Earth history", with value text such as "150 million years ago, Jurassic". It updates at once while paused or after a jump, and at most every 1.5 s during playback. |
| Event markers | Buttons such as "End-Permian Extinction, 252 million years ago — jump"; the focused marker is described by its tooltip |
| Play button | "Play", "Pause", "Continue — holding on the End-Permian Extinction", "Replay from the beginning" |
| Speed | Radio group "Playback speed", radios "0.25× speed" to "4× speed" with `aria-checked` |
| Life rows | Name, state and description in one sentence: "Ferns. Abundant, rising. Spore-bearing fronds, from coal-swamp tree ferns to bracken". New arrivals begin "Just appeared". |
| Index entries | "Trilobites, Trilobita. 521 Ma to 252 Ma. Alive now" |
| Planet vitals | Groups named by their label and described by their explanation |
| Share-of-life bar | An image named with every group's share ("Share of living lineages by group, weighted by abundance: Microbes 7 %, …"), plus a disclosure that lists the same shares as text |
| Chapters | "Chapter 1: A world of fire, 4.54 Ga – 4.03 Ga. Earth forms molten, …"; the chapter in progress has `aria-current` |
| Species dialog | The lifespan bar and the prominence chart are images described in sentences; lineage steps are toggle buttons; each relative reads as a sentence ("Coelophysis. Shared ancestor about 235 million years ago, among the dinosaurs. Lived from 216 million years ago to 201 million years ago."), plus "Alive at this moment" while that is true |
| Extinction card | `role="status"`, titled by the event; the severity meter is an image ("90% of marine species lost (estimates: 81–94%)"); *Continue* carries `aria-keyshortcuts="Space"` |

### What is announced

One polite, atomic live region (`#live-region`) carries the narration. Lines that arrive in the same moment are written together, one line each, so none cuts another off. The examples below were recorded from the running app.

| When | What is said |
|---|---|
| The period changes, whether by playing, stepping, scrubbing or jumping | The period's name: "Cambrian" |
| Playback crosses into a new eon or era (1.2 s after its title card appears) | "Paleozoic Era begins. Life fills the seas, greens the land — and nearly dies." |
| A milestone toast appears (0.7 s after it shows) | Title, date and text: "The Cambrian Explosion, 527 million years ago. The soft-bodied Ediacarans have all but vanished. …" |
| A mass-extinction card is revealed | "Mass extinction, 252 million years ago: The Great Dying. 90 percent of marine species lost (estimates: 81–94%). Press Space to continue." The last sentence is added only during a hold. |
| A chapter step (<kbd>[</kbd>, <kbd>]</kbd>, the skip buttons) or a pick in the Chapters list | "Chapter 11 · Rise of the dinosaurs" |
| A *Go to* action in the species dialog | "Dinosaurs (non-avian): heyday, 83 million years ago." |
| Playback arrives at today and the finale card rises | "You are here: the story has reached today. Press Space to watch again, or Tab to more options." |

Toasts and era titles speak one at a time: a newer one replaces any that is still waiting to be spoken. A toast's reading time stops counting while the story is paused.

A second, quieter channel is the status pill at the bottom of the map (`#view-notice-region`, `role="status"`). It carries short practical notes: "Loading the globe…", a one-time hint for each view ("Drag to pan · scroll or pinch to zoom · click a marker for its story"), "Speed 2×", the chapter name after a step, and "The present day — the end of the story". The motion note in Help and the Index's match count are polite live regions as well.

### The pictures

| View | Accessible name |
|---|---|
| Map | "World map of the current moment in Earth history" (fixed) |
| Globe <!-- REVIEW after geometry lands --> | "Globe of the current moment in Earth history" (fixed) |
| Tree | Rewritten as it grows, e.g. "Tree of life at 150 Ma: 63 living lineages, 63 extinct." It updates at most every 1.5 s during playback and promptly at rest. |

The markers and place names drawn on these canvases are not individually exposed. What they show is said in text around them: the Life panel ranks who is alive and how they are faring, the Index lists every entry in the story, the context card names the moment, and the vitals give the numbers. Purely decorative pieces (sparklines, the temperature stripe, the period bands) are hidden from assistive technology.

## Motion

How the setting is decided:

1. The system's `prefers-reduced-motion` setting, followed live.
2. Unless you choose otherwise in **Help → Motion**: *Follow system*, *Reduced* or *Full*. The choice is saved in `localStorage` as `ltb:motion` (`reduced` or `full`; *Follow system* removes it) and survives reloads.
3. The result goes to `<html data-motion="reduced|full">` for CSS, and to every view and component as `frame.reducedMotion`.

With `data-motion="reduced"`, every CSS transition and animation collapses to 0.01 ms, delays in the story overlays go too, and smooth scrolling is off. Beyond CSS:

| Where | With reduced motion |
|---|---|
| Map | Markers stop breathing. A newcomer gets one still ring instead of two rings blooming outward, and departing embers don't shrink. Zoom jumps instead of gliding. The planet's own motion (glowing magma, drifting ice, the staging of an extinction, the asteroid streak at the end of the Cretaceous) is painted still. <!-- REVIEW after geometry lands --> |
| Globe <!-- REVIEW after geometry lands --> | No auto-rotation and no turning towards a hovered marker. The camera cuts instead of gliding, and zoom snaps. The light no longer sways, milestone pings are a still ring, labels appear without fading, and an extinction's tint arrives in coarse steps. |
| Tree | Zoom and reset jump, and the view follows the growing tree without easing. There are no bursts for newcomers, labels appear without fading, and the extinction rings don't pulse. |
| Extinction card | The stage doesn't shake. The card is simply there with its final figure instead of counting up. |
| Life panel, Chapters | Rows re-rank without sliding, and lists jump instead of scrolling smoothly. |
| Timeline | No transitions on the playhead, markers or tooltip; the active marker's pulse becomes a still ring. |
| Context card, toasts, era titles, intro | The same content, without the entrances and exits. |

What stays: the story still plays, because time passing is the content. The extinction holds keep their length, and every toast still gets its reading time. <kbd>Space</kbd> pauses it all, except during an extinction hold (see [Known gaps](#known-gaps)).

## Colour and shape

Life is drawn in eight groups, each with a hue and a shape. Every marker on the map, globe and tree carries its group's shape, and so do the lists that name species: the legend, Life rows and Index entries, the hover card, the species dialog and its relatives. Where a group colour appears without its shape, the words come with it. The dots on the extinction card's chips sit beside each name. The share-of-life bar names its two leading groups underneath, unfolds into a list of all eight, and its accessible name gives every share.

| Group | Hue | Shape | Shades within the hue |
|---|---|---|---|
| Microbes | `#9085e9` violet | dot | bacteria, archaea, protists & early eukaryotes |
| Plants, algae & fungi | `#008300` green | leaf | algae, land plants, fungi & lichens |
| Invertebrates | `#d55181` magenta | five-pointed star | soft-bodied & shelly animals, molluscs |
| Arthropods | `#c98500` ochre | hexagon | arthropods |
| Fishes | `#199e70` sea green | oval | fishes & early chordates |
| Amphibians, reptiles & birds | `#d95926` orange | triangle | amphibians & early tetrapods, reptiles, marine reptiles, dinosaurs, pterosaurs, birds |
| Synapsids & mammals | `#3987e5` blue | rounded square | early synapsids, mammals |
| Primates & humans | `#e66767` coral | ring (a pierced disc) | primates, hominins |

The groups and shades are defined in `LIFE_GROUPS` in [`js/config.js`](../js/config.js); the shapes are drawn by [`js/views/glyphs.js`](../js/views/glyphs.js). Shades within a group share the hue and differ in lightness.

**How the hues were checked.** A categorical-palette validator was run on the eight hex values, in this order, against each chrome surface (`--bg-0` to `--bg-3`). It measures OKLab ΔE, using the Machado–Oliveira–Fernandes (2009) simulation for colour-vision deficiency.

- **Neighbours stay apart.** In the groups' own order (the order of the legend, the share bar and neighbouring tree branches), every adjacent pair stays distinct under protanopia and deuteranopia: the smallest ΔE is 8.4, fishes ↔ arthropods, against a target of 8. In normal vision the smallest is 19.3, against a floor of 15.
- **Lightness, chroma and contrast.** All eight share one lightness band and have enough chroma not to read as grey. Each has at least 3:1 contrast with each of those surfaces; the lowest is land plants at 3.1:1 on `--bg-3`.
- **Not every pair can be safe.** No set of eight hues stays distinct for every pair under every kind of colour vision. Fishes and invertebrates nearly merge for deuteranopes (ΔE 1.6), and primates and reptiles are close even in normal vision (ΔE 7.1). On a map any two markers can sit side by side, which is why the shapes exist.

**Other places where shape, words or numbers carry what colour shows:**

- **Trends:** a rising or falling row in the Life panel has a small triangle pointing up or down, and says "rising" or "falling" in its name.
- **Timeline marks:** a filled diamond is a mass extinction, a hollow diamond a smaller crisis, a dot a milestone, and each names itself on focus or hover.
- **Plate boundaries:** divergent lines are dashed, convergent lines are solid with teeth on the upper plate, and transform lines are finely dashed. <!-- REVIEW after geometry lands -->
- **Bands and stripe:** the temperature stripe and the period bands are backed by numbers and names in the vitals, the tooltips and the slider's value.
- **Text:** text is never coloured by data alone. Body text stays in ink colours. A milestone toast tints its category and title with the event's colour, but those words already say what the colour says.

**Contrast targets and measurements:**

| Ink | Target | Measured |
|---|---|---|
| Primary and secondary text (`--text-1`, `--text-2`) | 4.5:1 | 16.7:1 and 11.0:1 on the page; at least 8.4:1 and 5.5:1 on glass panels even with a white map behind them |
| Muted text (`--text-3`) | 4.5:1 | 4.9:1 or more on `--bg-0` to `--bg-3`. Glass panels switch to `--text-3-glass`, which keeps 4.8:1 over a white map. |
| `--text-4` | — | Decorative only (rules, disabled controls) |
| Life-group hues, as marks | 3:1 | 3.1:1 or more on `--bg-0` to `--bg-3` |
| Focus ring | 3:1 | 11:1 on the page and on its halo over the planet |

## Touch and small screens

| Width | What changes |
|---|---|
| < 1100 px | Only one corner panel (Legend or Chapters) is open at a time. |
| ≤ 900 px | The Life panel becomes a drawer behind the *Life* button, `inert` while closed. Choosing a chapter closes the Chapters panel. |
| ≤ 860 px | The title is visually hidden but stays the page's `h1`. |
| ≤ 720 px | The drawer becomes a bottom sheet. Plates, Labels, Chapters and Legend fold into ⋯. Legend and Chapters become full-width sheets, and dialogs become bottom sheets. |
| ≤ 560 px | The speed control is a native select. |
| 320 px | Everything still fits without horizontal scrolling (checked at 320 × 568). |

When the event rail is narrower than 520 px it keeps a single row of the most important markers. The rest are left off the rail, and the arrow keys skip them.

On touch screens (`pointer: coarse`) the targets grow:

- **Toolbar buttons:** invisible hit areas make them 46–50 px tall without making the bar any taller. The icon-only buttons stay 26–30 px wide.
- **Transport:** the buttons reach 46 × 46 px, and the speed select is at least 40 px tall.
- **Views and dialogs:** the map and tree zoom buttons and every dialog's ✕ are 44 × 44 px. The globe's buttons are 36 px; its gestures are the main way to steer it.
- **Inside dialogs:** each relative's row is at least 52 px tall, the *Go to* buttons 40 px, and the lineage steps 36 px.

Gestures:

- **Drag** pans the map, turns the globe or slides the tree; **pinch** zooms.
- **Tap a marker** for its story, or **tap a vital card** for its explanation (tap again to hide it).
- **The hover card** sits above your fingertip and leaves after 2.5 s.
- **On the timeline**, a touch on a period or a mark has to travel 10 px before it turns into scrubbing, so a tap stays a tap; marks answer within 18 px of a fingertip.
- **Touch-only devices** don't show keyboard hints (in the intro and the Chapters footer).

The viewport does not block browser zoom. At 200 % zoom in a 1280 × 800 window (checked as a 640 × 400 viewport), every control is still on screen with no horizontal scrolling.

## Forced colours

In Windows High Contrast and other forced-colour modes:

- the chrome takes the system colours. Selected and pressed buttons (views, layers, open panels, the chosen motion setting) are drawn in `Highlight` / `HighlightText`, and disabled ones in `GrayText`, so no state depends on a fill the mode removes;
- the chosen speed gets an outline;
- data colours are kept where they *are* the data: the timeline's period and eon bands, the temperature stripe and its key, tooltip swatches, the era swatch, and the Life panel's bars, meters and shapes;
- the map, globe and tree are canvases and keep their own colours;
- focus rings remain.

This was checked by emulation in Chromium only.

## Known gaps

- **Only headless Chromium.** Everything here was checked there, with Playwright and Chromium's accessibility tree. Nothing has been tried yet with VoiceOver, NVDA, JAWS or TalkBack, with Windows High Contrast itself, or in Firefox or Safari.
- **Canvas markers are not focusable.** Keyboard and screen-reader users meet the same species through the Life panel, the Index and the chips. The map and tree cannot be panned from the keyboard: their buttons zoom about the centre, while the globe can be turned with its own buttons.
- **No pause during an extinction hold.** While the story holds on an extinction, <kbd>Space</kbd> and the play button *continue* rather than pause. The six-second countdown waits while keyboard focus is inside the extinction card, or while the pointer moves over it. But on a desktop the card's *Continue* button is the twelfth Tab stop from the top of the page, and many more behind the play button. Opening a species from the Life panel pauses the story.
- **Some lines may be heard twice.** A chapter step and a species *Go to* put the same words in both the status pill and the live region. The extinction card is itself a status region whose text is also announced through the live region. Neither has been tried with real screen readers.
- **The Life drawer doesn't take focus.** On narrow screens, opening the drawer leaves focus on the *Life* button, and the drawer's first control is eight Tab stops further on. The drawer is not modal.
- **The finale card doesn't take focus.** It is the last Tab stop on the page: four presses after the play button, but about forty from the top. Its announcement says "Tab to more options", which is only quick from the transport controls.
- **The intro is an ARIA modal, not a native `<dialog>`.** <kbd>Tab</kbd> is trapped and the shortcuts are off, but the page behind is not made inert, so a screen reader's reading cursor can wander out of it.
- **Blocked storage disables the motion choice.** With browser storage blocked, choosing *Reduced* or *Full* in Help currently does nothing at all. It should still apply for the visit. The system setting is honoured either way. <!-- reported bug in js/main.js (the override is read back only from storage); drop this item once fixed -->
- **Help lists Page Up and Page Down the wrong way round.** The *Keyboard & mouse* tab reads "Previous / next period" for <kbd>PgUp</kbd> <kbd>PgDn</kbd>, but Page Up moves later in time and Page Down earlier. <!-- reported bug in js/ui/shortcuts.js; drop this item once fixed -->
- **Two shades miss 3:1 on raised panels.** Amphibians & early tetrapods (`#a8431a`) and early synapsids (`#2b6cc0`) fall under 3:1 on the raised panel colours `--bg-2` and `--bg-3`. Their names always sit beside them.
- **Sparklines are pointer-only.** Clicking a vital's sparkline travels to that moment; from the keyboard, the timeline slider is the way.
- **Vital names reach assistive technology in capitals.** The cards' names come through as "TEMPERATURE" or "CO₂" because their labels are uppercase in CSS, and some screen readers spell such words out.
- **One dark theme only.** Nothing changes for `prefers-color-scheme: light` or `prefers-contrast: more`.
- **High zoom crowds the map.** At high browser zoom the visualization gets small, and the toast and context card cover much of it.
- **The app has no sound,** so there is nothing to caption.

## Checking it yourself

The smoke test (see [`scripts/capture/smoke-test.js`](../scripts/capture/smoke-test.js)) holds these behaviours as contracts. It checks accessible names, the slider's value text, headings and live regions, text alternatives, keyboard paths, dialogs and focus return, and reduced motion.

```bash
python3 -m http.server 8080           # from the project root, in one shell
cd scripts/capture                    # in another
npm install && npx playwright install chromium   # once
node smoke-test.js --only=a11y,keyboard,motion,panels,species,boot
```

To look at the emulated modes in your own Playwright script:

```js
const context = await browser.newContext({ reducedMotion: 'reduce', forcedColors: 'active' });
// or, on a page that is already open:
await page.emulateMedia({ reducedMotion: 'no-preference' });
```

To forget a saved motion choice, run `localStorage.removeItem('ltb:motion')` in the console, or pick *Follow system* in Help.

How the pieces fit together in code (the live region, the motion preference, the dialog shell) is described in [architecture.md](architecture.md). The [README](../README.md) gives the tour.
