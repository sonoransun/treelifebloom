// Mass-extinction card — explains the catastrophe the Map / Globe is staging.
//
// Driven by frame.crisis ({ extinction, intensity, elapsedSec, phase, progress }):
//   hold       the clock is frozen on the event's leading edge: the card fades in after the
//              opening visual beat and offers "Continue" with a ring that fills as the hold runs
//              out (Space and the transport button do the same);
//   window     the card stays while time creeps through the event;
//   aftermath  it fades away with crisis.intensity;
//   static     the viewer scrubbed into the window: the card is simply there, no countdown.
//
// The card sits low on the stage so the middle of the map stays visible, wears the event's colour
// only as a rule, a meter and an edge vignette (text stays in ink colours), and lists who suffered:
// the event's own `victims`, then dataset entries whose last appearance falls inside the window.
// A chip that corresponds to a dataset entry wears its family colour and opens its story.
//
// Reading takes longer than six seconds for many people. While the pointer is being moved over
// the card, or keyboard focus is inside it, the hold's countdown waits.
//
// The stage (never the card) shakes for the first two seconds — not under reduced motion, not
// while paused — and its transform is always reset when the crisis ends.

import { getCategoryInfo } from '../config.js';
import { species, speciesById } from '../data/species.js';
import { formatYearsAgo } from '../util/format.js';

const REVEAL_AFTER_SEC = 0.9;   // let the map's opening beat be seen before the text arrives
const MAX_CHIPS = 8;            // chips shown at most; the rest fold into an expandable "+N more"
const DATASET_CHIP_SLOTS = 3;   // of those, kept for dataset entries the viewer has just seen die
// Words that do not identify a group, so "Most giant amphibians" can find "Giant amphibians".
const NAME_STOPWORDS = new Set(['a', 'an', 'and', 'the', 'of', 'most', 'many', 'some', 'early', 'first', 'giant', 'other']);
const AFTERMATH_FULL_AT = 0.72; // in the aftermath the card is fully there above this intensity…
const AFTERMATH_GONE_AT = 0.3;  // …and gone below this one
const SHAKE_MAX_PX = 3;
const IMPACT_AT_SEC = 0.9;      // the map view lands the asteroid at this point of the staging
const COUNT_DELAY_SEC = 0.32;   // the number counts up in step with the bar (see .ext-meter-fill)
const COUNT_SEC = 1.2;
const RING_RADIUS = 9.5;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const RING_STEPS = 180;
const CHIP_NARROW_PX = 420;     // below this the chip row is on a phone sheet and may run to 3 lines

let speciesByName = null;
function findSpeciesByName(name) {
  if (!speciesByName) speciesByName = new Map(species.map((sp) => [sp.name.toLowerCase(), sp]));
  return speciesByName.get(name.toLowerCase()) || null;
}

function firstSentence(text) {
  const match = /^.*?[.!?](?=\s|$)/.exec(text || '');
  return match ? match[0] : text || '';
}

function isImpact(ext) {
  return ext.mechanism ? ext.mechanism === 'impact' : ext.id === 'end-cretaceous';
}

function nameWords(name) {
  return name.toLowerCase().split(/[^a-z]+/).filter((word) => word && !NAME_STOPWORDS.has(word));
}

/** The same word, or a close variant: "rudist"/"rudists", "gorgonopsians"/"gorgonopsids". */
function sameWord(a, b) {
  if (a === b) return true;
  let shared = 0;
  while (shared < a.length && shared < b.length && a[shared] === b[shared]) shared++;
  return shared >= 6 && Math.min(a.length, b.length) - shared <= 3;
}

/**
 * Two names for one group: every word of the shorter name has a counterpart in the longer one, so
 * "Glossopteris forests" finds "Glossopteris" but "Rugose corals" never finds "Tabulate corals".
 */
function sameGroup(a, b) {
  const wa = nameWords(a);
  const wb = nameWords(b);
  if (!wa.length || !wb.length) return false;
  const [shorter, longer] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  return shorter.every((word) => longer.some((other) => sameWord(word, other)));
}

/**
 * Who suffered: { label, chips: [{ name, sp|null }] }, the whole list in display order.
 *
 * `victims` entries may be display names, dataset ids or { label, speciesId } objects; the data
 * defines them as groups that ended in, OR were devastated by, the event (trilobites are a victim
 * of the end-Ordovician and still die out 190 million years later), so with them the row reads
 * "Hardest hit". Each is tied to a dataset entry when one exists — by id, by exact name, by its
 * name read as an id, or, among the entries that end in this event, by a variant of its name.
 * Dataset entries that end inside the window, give or take a little — the dates are only that
 * good — follow, most prominent first; a few places are kept for them, because they are the
 * markers the viewer has just watched disappear. Without `victims` only those entries are listed,
 * and the row reads "Lost here".
 */
function sufferersOf(ext) {
  const margin = Math.min(0.5, Math.max(0.25, ext.durationMa / 4));
  const from = ext.timeMa + ext.durationMa / 2 + margin;
  const to = ext.timeMa - ext.durationMa / 2 - margin;
  const peak = (sp) => Math.max(0, ...(sp.abundanceProfile || []).map((point) => point[1]));
  const ended = species
    .filter((sp) => sp.extinctMa != null && sp.extinctMa <= from && sp.extinctMa >= to)
    .sort((a, b) => peak(b) - peak(a));

  const named = [];
  const seenNames = new Set();
  const used = new Set();
  for (const victim of ext.victims || []) {
    const id = typeof victim === 'string' ? victim : victim && (victim.speciesId || victim.id);
    const label = typeof victim === 'string' ? victim : victim && (victim.label || victim.name);
    let sp = (id && speciesById.get(id)) || null;
    const name = String((sp && typeof victim === 'string' ? sp.name : label) || (sp && sp.name) || '').trim();
    const key = name.toLowerCase();
    if (!key || seenNames.has(key)) continue;
    if (!sp) sp = findSpeciesByName(name);
    // The name as an id: "Rugose corals" is the entry `rugose_corals`, whatever it is called.
    if (!sp) sp = speciesById.get(name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')) || null;
    if (!sp) sp = ended.find((entry) => !used.has(entry.id) && sameGroup(name, entry.name)) || null;
    if (sp && used.has(sp.id)) sp = null;
    if (sp) used.add(sp.id);
    seenNames.add(key);
    named.push({ name, sp });
  }

  const others = ended
    .filter((sp) => !used.has(sp.id) && !seenNames.has(sp.name.toLowerCase()))
    .map((sp) => ({ name: sp.name, sp }));
  const reserved = Math.min(DATASET_CHIP_SLOTS, others.length);
  const lead = Math.max(0, MAX_CHIPS - reserved);
  const chips = [
    ...named.slice(0, lead),
    ...others.slice(0, reserved),
    ...named.slice(lead),
    ...others.slice(reserved),
  ];
  return { label: named.length ? 'Hardest hit' : 'Lost here', chips };
}

function survivorsOf(ext) {
  const names = [];
  for (const survivor of ext.survivors || []) {
    const id = typeof survivor === 'string' ? survivor : survivor && (survivor.speciesId || survivor.id);
    const label = typeof survivor === 'string' ? survivor : survivor && (survivor.label || survivor.name);
    const byId = id ? speciesById.get(id) : null;
    const name = byId && typeof survivor === 'string' ? byId.name : label || (byId && byId.name);
    if (name) names.push(String(name).trim());
  }
  return names;
}

export class ExtinctionOverlay {
  constructor(app) {
    this.app = app;
    this.overlay = document.getElementById('extinction-overlay');
    this.overlay.innerHTML = `
      <div class="ext-vignette" aria-hidden="true"></div>
      <div class="ext-dock">
        <div class="ext-card glass" role="status" aria-labelledby="extinction-title">
          <div class="ext-head">
            <div class="ext-kicker kicker" id="extinction-kicker"></div>
            <button class="ext-continue" id="extinction-continue" type="button" hidden aria-keyshortcuts="Space"
                    title="Continue now. The countdown waits while you read the card.">
              <svg class="ext-ring" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="ext-ring-track" cx="12" cy="12" r="${RING_RADIUS}"/>
                <circle class="ext-ring-arc" cx="12" cy="12" r="${RING_RADIUS}" transform="rotate(-90 12 12)"
                        stroke-dasharray="${RING_LENGTH.toFixed(2)}" stroke-dashoffset="${RING_LENGTH.toFixed(2)}"/>
                <path class="ext-ring-glyph ext-ring-play" d="M10 8.2v7.6l6-3.8z"/>
                <path class="ext-ring-glyph ext-ring-pause" d="M9 8.4h2.2v7.2H9zM12.8 8.4H15v7.2h-2.2z"/>
              </svg>
              <span>Continue</span>
              <kbd aria-hidden="true">Space</kbd>
            </button>
          </div>
          <div class="ext-lede">
            <div class="ext-titles">
              <h2 class="ext-title display" id="extinction-title"></h2>
              <div class="ext-formal"></div>
            </div>
            <div class="ext-meter" role="img">
              <div class="ext-meter-figure" aria-hidden="true">
                <span class="ext-meter-value num"></span>
                <span class="ext-meter-label"></span>
              </div>
              <div class="ext-meter-track" aria-hidden="true"><div class="ext-meter-fill"></div></div>
            </div>
          </div>
          <p class="ext-desc"></p>
          <dl class="ext-facts">
            <dt class="kicker ext-cause-row">Cause</dt>
            <dd class="ext-cause ext-cause-row"></dd>
            <dt class="kicker ext-lost-row" id="extinction-lost-label">Lost here</dt>
            <dd class="ext-lost-row"><ul class="ext-chips" aria-labelledby="extinction-lost-label" tabindex="-1"></ul></dd>
            <dt class="kicker ext-survived-row">Survived</dt>
            <dd class="ext-survived ext-survived-row"></dd>
          </dl>
        </div>
      </div>`;

    const q = (selector) => this.overlay.querySelector(selector);
    this.vignetteEl = q('.ext-vignette');
    this.cardEl = q('.ext-card');
    this.kickerEl = q('#extinction-kicker');
    this.continueBtn = q('#extinction-continue');
    this.ringArc = q('.ext-ring-arc');
    this.titleEl = q('#extinction-title');
    this.formalEl = q('.ext-formal');
    this.meterEl = q('.ext-meter');
    this.meterValueEl = q('.ext-meter-value');
    this.meterLabelEl = q('.ext-meter-label');
    this.descEl = q('.ext-desc');
    this.causeEl = q('.ext-cause');
    this.lostLabelEl = q('#extinction-lost-label');
    this.chipsEl = q('.ext-chips');
    this.survivedEl = q('.ext-survived');
    this.rows = {
      cause: this.overlay.querySelectorAll('.ext-cause-row'),
      lost: this.overlay.querySelectorAll('.ext-lost-row'),
      survived: this.overlay.querySelectorAll('.ext-survived-row'),
    };
    this.stageEl = document.getElementById('viz-stage');

    this._activeId = null;
    this._revealed = false;
    this._lost = [];
    this._chipsExpanded = false;
    this._chipsWidth = 0;
    this._severity = 0;
    this._countFrom = null;     // nowSec at which the severity count-up starts (null = idle)
    this._countShown = -1;
    this._fadeStep = -1;
    this._vignetteStep = -1;
    this._ringStep = -1;
    this._shakeKey = '';
    this._continueShown = false;
    this._flagged = false;
    this._pointerReading = false;
    this._focusReading = false;
    this._readingShown = false;

    this.continueBtn.addEventListener('click', () => {
      app.clock.skipHold();
      if (!app.clock.playing) app.play();
    });
    this.chipsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('button.ext-chip');
      if (!chip) return;
      if (chip.classList.contains('ext-chip-more')) this._expandChips();
      else app.bus.emit('species:open', { id: chip.dataset.id });
    });

    // "Reading" = the pointer is being moved over the card (resting there by accident does not
    // count), or keyboard focus is inside it.
    this.cardEl.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch') this._pointerReading = true;
    });
    this.cardEl.addEventListener('pointerleave', () => { this._pointerReading = false; });
    this.cardEl.addEventListener('focusin', (e) => {
      this._focusReading = e.target.matches(':focus-visible');
    });
    this.cardEl.addEventListener('focusout', (e) => {
      if (!this.cardEl.contains(e.relatedTarget)) this._focusReading = false;
    });

    // The chip row is fitted to its width; fit it again when that width changes mid-event.
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(() => {
        if (this._activeId !== null && this.chipsEl.clientWidth !== this._chipsWidth) this._renderChips();
      }).observe(this.cardEl);
    }
  }

  update(frame) {
    const crisis = frame.crisis;
    if (!crisis) {
      if (this._activeId !== null) this._leave();
      return;
    }

    const ext = crisis.extinction;
    if (ext.id !== this._activeId) this._enter(ext);

    const isStatic = crisis.phase === 'static';
    if (!this._revealed && (isStatic || !frame.playing || crisis.elapsedSec >= REVEAL_AFTER_SEC)) {
      this._reveal(ext, frame);
    }

    // Aftermath: the card leaves with the event's intensity — gone while the map is still
    // settling, so it never crossfades through the context card that returns underneath it.
    const fade = crisis.phase === 'aftermath'
      ? Math.max(0, Math.min(1, (crisis.intensity - AFTERMATH_GONE_AT) / (AFTERMATH_FULL_AT - AFTERMATH_GONE_AT)))
      : 1;
    const fadeStep = Math.round(fade * 50);
    if (fadeStep !== this._fadeStep) {
      this._fadeStep = fadeStep;
      this.cardEl.style.opacity = fadeStep === 50 ? '' : (fadeStep / 50).toFixed(2);
      this._flag(this._revealed && fadeStep > 2);
    }
    const vignetteStep = Math.round(crisis.intensity * 50);
    if (vignetteStep !== this._vignetteStep) {
      this._vignetteStep = vignetteStep;
      this.vignetteEl.style.opacity = (vignetteStep / 50).toFixed(2);
    }

    this._updateHold(frame);
    this._updateCount(frame);
    this._updateShake(frame, crisis, ext);
  }

  // ---- lifecycle -----------------------------------------------------------------------------

  /** A new event: fill the card while it is still invisible. */
  _enter(ext) {
    this._activeId = ext.id;
    this._revealed = false;
    this._fadeStep = -1;
    this._vignetteStep = -1;
    this._ringStep = -1;
    this._countFrom = null;
    this._countShown = -1;
    this._severity = Math.round(ext.severityPercent);

    this.overlay.style.setProperty('--event-color', ext.color);
    this.cardEl.style.setProperty('--ext-severity', String(this._severity));
    this.cardEl.classList.remove('is-in');
    this.cardEl.style.opacity = '';

    this.kickerEl.textContent = `Mass extinction · ${formatYearsAgo(ext.timeMa)}`;
    this.titleEl.textContent = ext.subtitle || ext.name;
    this.formalEl.textContent = ext.subtitle ? ext.name : '';
    this.formalEl.hidden = !ext.subtitle;

    const label = ext.severityLabel || 'of species lost';
    this.meterLabelEl.textContent = label;
    this.meterValueEl.textContent = '0%';
    this.meterEl.setAttribute('aria-label', `${this._severity}% ${label}`);

    this.descEl.textContent = ext.description || '';
    this.descEl.hidden = !ext.description;

    const cause = ext.causeShort || firstSentence(ext.cause);
    this.causeEl.textContent = cause;
    this._showRow('cause', !!cause);

    const sufferers = sufferersOf(ext);
    this._lost = sufferers.chips;
    this._chipsExpanded = false;
    this.lostLabelEl.textContent = sufferers.label;
    this._showRow('lost', this._lost.length > 0);

    const survivors = survivorsOf(ext);
    this.survivedEl.textContent = survivors.join(' · ');
    this._showRow('survived', survivors.length > 0);

    this.overlay.classList.remove('hidden');
    // Laid out now (though still invisible), so the chips can be measured.
    this._renderChips();
  }

  _chipItem({ name, sp }) {
    const item = document.createElement('li');
    const chip = document.createElement(sp ? 'button' : 'span');
    chip.className = 'ext-chip';
    const dot = document.createElement('span');
    dot.className = 'ext-chip-dot';
    if (sp) {
      chip.type = 'button';
      chip.dataset.id = sp.id;
      chip.title = `${sp.name} — open its story`;
      dot.style.setProperty('--chip-color', getCategoryInfo(sp.category).color);
    }
    chip.append(dot, name);
    item.appendChild(chip);
    return item;
  }

  /**
   * Fill the chip row and keep it to two lines (three on a narrow sheet), MAX_CHIPS at most: the
   * rest fold into a final "+N more" button that names them in its tooltip and, pressed, unfolds
   * the whole list.
   */
  _renderChips() {
    const list = this.chipsEl;
    const all = this._lost;
    list.textContent = '';
    const shown = this._chipsExpanded ? all : all.slice(0, MAX_CHIPS);
    for (const entry of shown) list.appendChild(this._chipItem(entry));
    this._chipsWidth = list.clientWidth;
    if (this._chipsExpanded) return;

    const maxRows = list.clientWidth < CHIP_NARROW_PX ? 3 : 2;
    const rows = () => {
      let count = 0;
      let top = null;
      for (const item of list.children) {
        if (item.offsetTop !== top) { count++; top = item.offsetTop; }
      }
      return count;
    };
    if (shown.length === all.length && rows() <= maxRows) return;

    const more = document.createElement('li');
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'ext-chip ext-chip-more';
    moreBtn.setAttribute('aria-expanded', 'false');
    more.appendChild(moreBtn);
    list.appendChild(more);
    let visible = shown.length;
    const label = () => {
      const rest = all.slice(visible).map((entry) => entry.name);
      moreBtn.textContent = `+${rest.length} more`;
      moreBtn.title = rest.join(', ');
    };
    label();
    while (rows() > maxRows && visible > 1) {
      more.previousElementSibling.remove();
      visible--;
      label();
    }
  }

  /** "+N more" pressed: show every chip, and keep keyboard focus in the list it opened. */
  _expandChips() {
    const firstHidden = this.chipsEl.querySelectorAll('li').length - 1;
    this._chipsExpanded = true;
    this._renderChips();
    const revealed = this.chipsEl.children[firstHidden];
    const target = revealed && revealed.querySelector('button');
    (target || this.chipsEl).focus({ preventScroll: true });
  }

  _reveal(ext, frame) {
    this._revealed = true;
    // Scrubbed straight into the event (or reduced motion): the card is simply there, with its
    // final number and a full bar, instead of staging its entrance.
    const instant = frame.reducedMotion || frame.crisis.phase === 'static';
    this.cardEl.classList.toggle('is-instant', instant);
    this.cardEl.classList.add('is-in');
    this.cardEl.scrollTop = 0;
    if (instant) {
      this._setCount(this._severity);
    } else {
      this._countFrom = frame.nowSec + COUNT_DELAY_SEC;
    }
    this._flag(true);
    const label = ext.severityLabel || 'of species lost';
    this.app.announce(
      `Mass extinction, ${formatYearsAgo(ext.timeMa)}: ${ext.subtitle || ext.name}. `
      + `${this._severity} percent ${label}.${frame.hold ? ' Press Space to continue.' : ''}`,
    );
  }

  _leave() {
    this._activeId = null;
    this._revealed = false;
    this._countFrom = null;
    this._pointerReading = false;
    this._focusReading = false;
    this.overlay.classList.add('hidden');
    this.cardEl.classList.remove('is-in', 'is-reading');
    this._readingShown = false;
    this._setContinue(false);
    this._flag(false);
    this._setShake(0, 0);
  }

  // ---- pieces --------------------------------------------------------------------------------

  _showRow(name, show) {
    for (const el of this.rows[name]) el.hidden = !show;
  }

  /** <html data-ov-crisis> lets css/overlays.css move the context card out of the way. */
  _flag(on) {
    if (on === this._flagged) return;
    this._flagged = on;
    if (on) document.documentElement.setAttribute('data-ov-crisis', '');
    else document.documentElement.removeAttribute('data-ov-crisis');
  }

  _setContinue(show) {
    if (show === this._continueShown) return;
    this._continueShown = show;
    this.continueBtn.hidden = !show;
  }

  _updateHold(frame) {
    const hold = frame.hold;
    this._setContinue(!!hold && this._revealed);

    const reading = !!hold && this._revealed && frame.playing && (this._pointerReading || this._focusReading);
    if (reading !== this._readingShown) {
      this._readingShown = reading;
      this.cardEl.classList.toggle('is-reading', reading);
    }
    if (!hold) return;
    // Give back the time the clock just counted, so the hold waits for the reader.
    if (reading) hold.elapsed = Math.max(0, hold.elapsed - frame.dtSec);

    const step = Math.round(Math.min(1, hold.elapsed / hold.duration) * RING_STEPS);
    if (step !== this._ringStep) {
      this._ringStep = step;
      this.ringArc.setAttribute('stroke-dashoffset', (RING_LENGTH * (1 - step / RING_STEPS)).toFixed(2));
    }
  }

  _setCount(value) {
    if (value === this._countShown) return;
    this._countShown = value;
    this.meterValueEl.textContent = `${value}%`;
  }

  _updateCount(frame) {
    if (this._countFrom === null) return;
    const t = (frame.nowSec - this._countFrom) / COUNT_SEC;
    if (t <= 0) return;
    if (t >= 1) {
      this._countFrom = null;
      this._setCount(this._severity);
      return;
    }
    const eased = 1 - (1 - t) ** 3;
    this._setCount(Math.round(this._severity * eased));
  }

  _setShake(x, y) {
    const key = x || y ? `${x.toFixed(1)}px, ${y.toFixed(1)}px` : '';
    if (key === this._shakeKey) return;
    this._shakeKey = key;
    this.stageEl.style.transform = key ? `translate(${key})` : '';
  }

  _updateShake(frame, crisis, ext) {
    const t = crisis.elapsedSec;
    if (t == null || !frame.playing || frame.reducedMotion) {
      this._setShake(0, 0);
      return;
    }
    // An impact jolts when the asteroid lands and rings down fast; everything else swells into
    // a short rumble. Either way it is over within about two seconds.
    let envelope;
    if (isImpact(ext)) envelope = t < IMPACT_AT_SEC ? 0 : Math.exp(-(t - IMPACT_AT_SEC) / 0.6);
    else envelope = Math.min(1, t / 0.4) * Math.exp(-Math.max(0, t - 0.6) / 0.7);
    const amplitude = SHAKE_MAX_PX * (ext.severityPercent / 100) * crisis.intensity * envelope;
    if (amplitude < 0.06) {
      this._setShake(0, 0);
      return;
    }
    // Two detuned sines per axis: organic, deterministic, and smooth from frame to frame.
    const x = amplitude * (0.62 * Math.sin(t * 71) + 0.38 * Math.sin(t * 113 + 1.3));
    const y = amplitude * (0.62 * Math.sin(t * 83 + 0.7) + 0.38 * Math.sin(t * 47 + 2.1));
    this._setShake(x, y);
  }
}
