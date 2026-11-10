// Species dialog — where a curious viewer digs in: what is this, when and where did it live, how
// did it fare through the mass extinctions, where does it sit on the tree of life, and who are its
// closest relatives in this story. Opens on 'species:open', pauses the clock and stays paused on
// close (the viewer presses play when ready). Emits 'species:focus' { id } while a species is on
// show, and keeps that focus for a while after a "go to" action so the views can ring its marker.
//
// It is a native modal <dialog>: the rest of the page is inert while it is open, Escape and a
// click on the backdrop close it, Tab cycles inside it and focus returns to whatever opened it.
// ModalShell (exported) is that behaviour on its own; the Help dialog reuses it.

import { TIMING, getCategoryInfo } from '../config.js';
import { species as allSpecies, isAlive, interpolateAbundance } from '../data/species.js';
import * as extinctionData from '../data/extinctions.js';
import {
  getSegments, maToFraction, fractionToMa, maToScreenSeconds, screenSecondsToMa,
} from '../engine/timeScale.js';
import { formatMa, formatRange, formatDuration, formatYearsAgo } from '../util/format.js';
import { glyphSvg, closeButtonMarkup, safely, optionalModule } from './legend.js';

// Lineage data is optional: without js/data/phylogeny.js, or for an entry without a `clade`, the
// lineage and relatives sections stay hidden and everything else works.
const phylogeny = await optionalModule(() => import('../data/phylogeny.js'));

const RELATIVES_SHOWN = 6;
const HUMAN_ID = 'homo_sapiens';
// A species counts as lost "at" an event if its last appearance falls within the event's window
// plus a margin: up to this much, but never more than the event's own length (a 40,000-year
// crisis must not claim a species that died half a million years earlier).
const EXTINCTION_MARGIN_MA = 0.5;
// How long a "go to" action keeps the species in focus on the views.
const SPOTLIGHT_SECONDS = 45;
const SPOTLIGHT_LINGER_SECONDS = 3;
// "Last days" lands this much playback before the end, so pressing play shows the ending.
const LAST_DAYS_LEAD_SECONDS = 2.5;

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
// Short forms for era names under the lifespan bar when the full name does not fit.
const ERA_SHORT = { Hadean: 'Had.', Archean: 'Arch.', Proterozoic: 'Prot.', Paleozoic: 'Paleo.', Mesozoic: 'Meso.', Cenozoic: 'Ceno.' };
const HABITAT_TAGS = {
  marine: ['Lives in the sea', 'Lived in the sea'],
  freshwater: ['Lives in fresh water', 'Lived in fresh water'],
  land: ['Lives on land', 'Lived on land'],
  aerial: ['Takes to the air', 'Took to the air'],
  amphibious: ['Lives on land and in water', 'Lived on land and in water'],
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// First words of clade names that are proper names and keep their capital inside a sentence.
const PROPER_FIRST_WORDS = new Set(['Asgard', 'Ediacaran']);

/**
 * A clade's display name inside running text: "Amniotes" → "amniotes", "Great apes" → "great
 * apes"; acronyms ("LUCA"), names with another capitalised word ("Old World monkeys & apes") and
 * proper first words ("Asgard archaea") are kept as they are.
 */
function inProse(name) {
  const words = name.split(' ');
  const keep = /^[A-Z]{2}/.test(name) || words.slice(1).some((w) => /^[A-Z]/.test(w)) || PROPER_FIRST_WORDS.has(words[0]);
  return keep ? name : name.charAt(0).toLowerCase() + name.slice(1);
}

function joinList(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// ---------------------------------------------------------------------------------------------
// Modal behaviour (shared with the Help dialog)
// ---------------------------------------------------------------------------------------------

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export class ModalShell {
  /**
   * @param {HTMLDialogElement} dialog  a <dialog> with no padding whose single child is the card,
   *                                    so a click that lands on the dialog itself is on the backdrop
   * @param {Function} onDismiss        the viewer asked to close (Escape, backdrop, back gesture)
   */
  constructor(dialog, onDismiss) {
    this.dialog = dialog;
    this.isOpen = false;
    this._opener = null;
    this._start = null;   // where focus is parked on open (the title): Tab from it enters the controls

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Handled here (not left to the global shortcuts) so one press closes only this dialog.
        e.preventDefault();
        onDismiss();
      } else if (e.key === 'Tab') {
        this._wrapTab(e);
      }
    });
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      onDismiss();
    });
    // A press that starts and ends on the backdrop closes; dragging a text selection out of the
    // card must not.
    let pressedBackdrop = false;
    dialog.addEventListener('pointerdown', (e) => { pressedBackdrop = e.target === dialog; });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog && pressedBackdrop) onDismiss();
      pressedBackdrop = false;
    });
  }

  /** Show the dialog (if it is not already) and move focus to `focusTarget`. */
  open(focusTarget) {
    if (!this.isOpen) {
      const active = document.activeElement;
      this._opener = active && active !== document.body ? active : null;
      this.dialog.classList.remove('hidden');
      if (typeof this.dialog.showModal === 'function') {
        if (!this.dialog.open) this.dialog.showModal();
      } else {
        this.dialog.setAttribute('open', '');
      }
      this.isOpen = true;
    }
    this._start = focusTarget || this.dialog;
    this._start.focus({ preventScroll: true });
  }

  /** Hide the dialog and hand focus back to the opener, or to `fallback` if the opener is gone. */
  close(fallback = null) {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (typeof this.dialog.close === 'function') {
      if (this.dialog.open) this.dialog.close();
    } else {
      this.dialog.removeAttribute('open');
    }
    this.dialog.classList.add('hidden');
    // Focus goes back to a control only if a control had it before: a dialog opened from the
    // map (nothing focused) must not leave a button focused for the next press of Space.
    const shown = (node) => node && node.isConnected && node.getClientRects().length > 0;
    const opener = this._opener;
    this._opener = null;
    if (!opener) return;
    const target = shown(opener) ? opener : (shown(fallback) ? fallback : null);
    if (target) target.focus({ preventScroll: true });
  }

  _wrapTab(e) {
    const items = [...this.dialog.querySelectorAll(FOCUSABLE)].filter((n) => n.getClientRects().length > 0);
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    // The title is not a Tab stop itself: from there Tab starts at the first control.
    const atStart = active === this._start && !items.includes(active);
    if (e.shiftKey && (active === first || atStart || !this.dialog.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || atStart)) {
      e.preventDefault();
      first.focus();
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The tree of life, as far as the dataset knows it
// ---------------------------------------------------------------------------------------------

function buildTree(mod) {
  if (!mod || !Array.isArray(mod.clades) || !mod.clades.length) return null;
  const byId = new Map(mod.clades.map((c) => [c.id, c]));
  const lineages = new Map();

  /** Root-first chain of clades ending at `id`. */
  const lineage = (id) => {
    let chain = lineages.get(id);
    if (!chain) {
      chain = [];
      const seen = new Set();
      for (let c = byId.get(id); c && !seen.has(c.id); c = c.parent != null ? byId.get(c.parent) : null) {
        chain.unshift(c);
        seen.add(c.id);
      }
      lineages.set(id, chain);
    }
    return chain;
  };

  const ancestor = (a, b) => {
    const la = lineage(a);
    const lb = lineage(b);
    let common = null;
    for (let i = 0; i < la.length && i < lb.length && la[i] === lb[i]; i++) common = la[i];
    return common;
  };

  return {
    has: (id) => byId.has(id),
    lineage,
    ancestor,
    /** When two clades' lines parted, in Ma (the module's own answer when it has one). */
    divergence(a, b) {
      if (typeof mod.divergenceMa === 'function') {
        const d = mod.divergenceMa(a, b);
        if (Number.isFinite(d)) return d;
      }
      const common = ancestor(a, b);
      return common ? common.originMa : NaN;
    },
  };
}

const tree = buildTree(phylogeny);

// ---------------------------------------------------------------------------------------------
// Mass extinctions and a species' passage through them
// ---------------------------------------------------------------------------------------------

const bigFive = Array.isArray(extinctionData.extinctions)
  ? [...extinctionData.extinctions].sort((a, b) => b.timeMa - a.timeMa)
  : [];
const lesserCrises = Array.isArray(extinctionData.crises) ? extinctionData.crises : [];

/** Leading (older) edge of an event's window: where the clock begins its hold. */
const windowStart = (ext) => ext.timeMa + ext.durationMa / 2;

/**
 * How close a species' last appearance falls to an event: 0 at the event's date, 1 at the edge
 * of its window plus margin, more beyond (Infinity for a species that is still alive).
 */
function missBy(sp, event) {
  if (sp.extinctMa == null) return Infinity;
  const length = Number.isFinite(event.durationMa) ? event.durationMa : 0;
  const reach = length / 2 + Math.min(EXTINCTION_MARGIN_MA, length);
  const gap = Math.abs(sp.extinctMa - event.timeMa);
  return reach > 0 ? gap / reach : (gap === 0 ? 0 : Infinity);
}

/** Did this species' last appearance fall at the event (window ± margin)? */
const endsAt = (sp, event) => missBy(sp, event) <= 1;

/** "End-Permian Extinction" → "end-Permian"; null when the name does not follow that pattern. */
function shortEventName(ext) {
  const short = ext.name.replace(/\s+(mass\s+)?extinction(\s+event)?$/i, '');
  if (short === ext.name) return null;
  return short.replace(/^End-/, 'end-');
}

/** "the end-Ordovician and Late Devonian extinctions" */
function nameEvents(list) {
  const shorts = list.map(shortEventName);
  if (shorts.every(Boolean)) return `the ${joinList(shorts)} extinction${list.length > 1 ? 's' : ''}`;
  return joinList(list.map((ext) => (/^the\s/i.test(ext.name) ? ext.name : `the ${ext.name}`)));
}

/**
 * One or two sentences on how a species met the mass extinctions, computed from its range:
 * it "disappeared at" an event when its last appearance falls in the event's window (± a
 * margin), and it "lived through" every other event whose date lies inside its range.
 */
function extinctionStory(sp) {
  if (!bigFive.length) return '';
  const end = sp.extinctMa ?? TIMING.endTimeMa;
  const extinct = sp.extinctMa != null;
  let lostAt = null;
  const survived = [];
  for (const ext of bigFive) {
    if (endsAt(sp, ext)) lostAt = ext;
    else if (ext.timeMa < sp.appearanceMa && ext.timeMa > end) survived.push(ext);
  }
  const count = NUMBER_WORDS[bigFive.length] || String(bigFive.length);

  if (!extinct) {
    if (survived.length === bigFive.length) return `Has survived all ${count} mass extinctions.`;
    if (survived.length) return `Has survived ${nameEvents(survived)}.`;
    return 'Arose after the last mass extinction.';
  }

  if (lostAt) {
    return survived.length
      ? `Lived through ${nameEvents(survived)}; disappeared at ${nameEvents([lostAt])}.`
      : `Disappeared at ${nameEvents([lostAt])}.`;
  }

  // Not one of the Big Five — but perhaps one of the smaller crises the data also records.
  const crisis = lesserCrises
    .filter((c) => Number.isFinite(c.timeMa) && c.name && endsAt(sp, c))
    .sort((a, b) => missBy(sp, a) - missBy(sp, b))[0];
  // A name may carry its own punctuation ("The Sixth Extinction?"): no second full stop then.
  const coda = crisis
    ? ` Its end coincides with a smaller crisis: ${crisis.name}${/[.?!]$/.test(crisis.name) ? '' : '.'}`
    : '';
  if (survived.length) {
    const last = survived[survived.length - 1];
    return `Lived through ${nameEvents(survived)}, then died out ${formatDuration(last.timeMa - sp.extinctMa)} later.${coda}`;
  }
  const before = bigFive.filter((ext) => ext.timeMa >= sp.appearanceMa).pop();   // last event older than it
  const after = bigFive.find((ext) => ext.timeMa < sp.extinctMa);               // first event younger than it
  if (!before) return `Lived and died out before the first of the ${count} mass extinctions.${coda}`;
  if (!after) {
    return crisis
      ? `Arose after the last mass extinction.${coda}`
      : 'Arose after the last mass extinction; its own end was not part of one.';
  }
  return `Lived between ${nameEvents([before, after])}, and met neither.${coda}`;
}

// ---------------------------------------------------------------------------------------------
// Moments worth jumping to
// ---------------------------------------------------------------------------------------------

function lifeEnd(sp) {
  return sp.extinctMa ?? TIMING.endTimeMa;
}

/** A sliver of the species' own span — enough to be inside its range after a jump. */
function sliver(sp) {
  return Math.min((sp.appearanceMa - lifeEnd(sp)) * 0.02, 0.5);
}

function firstAppearanceMa(sp) {
  return sp.appearanceMa - sliver(sp);
}

/** The time of greatest prominence (middle of the plateau if the peak is flat). */
function heydayMa(sp) {
  const profile = sp.abundanceProfile || [];
  if (!profile.length) return (sp.appearanceMa + lifeEnd(sp)) / 2;
  let peak = -Infinity;
  for (const [, value] of profile) peak = Math.max(peak, value);
  const first = profile.findIndex(([, value]) => value >= peak - 1e-9);
  let last = first;
  while (last + 1 < profile.length && profile[last + 1][1] >= peak - 1e-9) last++;
  const ma = (profile[first][0] + profile[last][0]) / 2;
  return Math.max(lifeEnd(sp), Math.min(sp.appearanceMa - sliver(sp), ma));
}

/** Shortly before the end — and before the leading edge of a mass extinction that ends it. */
function lastDaysMa(sp) {
  const end = sp.extinctMa;
  let ma = screenSecondsToMa(maToScreenSeconds(end) - LAST_DAYS_LEAD_SECONDS);
  for (const ext of bigFive) {
    if (endsAt(sp, ext) && end <= windowStart(ext)) {
      ma = Math.max(ma, screenSecondsToMa(maToScreenSeconds(windowStart(ext)) - LAST_DAYS_LEAD_SECONDS));
    }
  }
  // Never before it existed: a short-lived species gets the middle of its span.
  return ma < sp.appearanceMa ? ma : (sp.appearanceMa + end) / 2;
}

/** Where a "go to" action lands and how to describe it: { ma, label }. */
function jumpTarget(sp, action) {
  if (action === 'first') {
    return { ma: firstAppearanceMa(sp), label: `first appearance, ${formatYearsAgo(sp.appearanceMa)}` };
  }
  if (action === 'last') {
    return { ma: lastDaysMa(sp), label: `last days, before it vanishes ${formatYearsAgo(sp.extinctMa)}` };
  }
  const ma = heydayMa(sp);
  return { ma, label: ma <= 0.00002 ? 'heyday, today' : `heyday, ${formatYearsAgo(ma)}` };
}

// ---------------------------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------------------------

const TEMPLATE = `
  <dialog id="species-modal" class="dlg sp-dialog hidden" role="dialog" aria-modal="true" aria-labelledby="species-modal-title">
    <div class="dlg-surface">
      <div class="dlg-bar">
        <button type="button" class="btn btn-ghost dlg-back" hidden>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="dlg-back-label"></span>
        </button>
        ${closeButtonMarkup('Close', 'species-modal-close')}
      </div>
      <div class="dlg-scroll">
        <header class="sp-head">
          <span class="sp-medallion" aria-hidden="true"></span>
          <div class="sp-head-text">
            <h2 id="species-modal-title" class="display" tabindex="-1"></h2>
            <p id="species-modal-sci" class="sci"></p>
            <ul class="sp-tags" aria-label="At a glance"></ul>
          </div>
        </header>

        <dl class="sp-facts"></dl>
        <p id="species-modal-body"></p>

        <section class="sp-section" aria-labelledby="sp-h-time">
          <div class="sp-section-head">
            <h3 id="sp-h-time" class="kicker">On the timeline</h3>
            <span class="sp-now-key"><span class="sp-now-swatch" aria-hidden="true"></span><span class="sp-now-text num"></span></span>
          </div>
          <div class="sp-life">
            <div class="sp-life-track">
              <div class="sp-life-periods" aria-hidden="true"></div>
              <span class="sp-life-span" aria-hidden="true"></span>
              <div class="sp-life-events"></div>
              <span class="sp-life-now" aria-hidden="true"></span>
            </div>
            <div class="sp-life-eras" aria-hidden="true"></div>
          </div>
          <p class="sp-life-story"></p>
        </section>

        <section class="sp-section" aria-labelledby="sp-h-spark">
          <div class="sp-section-head">
            <h3 id="sp-h-spark" class="kicker">Prominence over time</h3>
            <span class="sp-spark-readout num" aria-hidden="true"></span>
          </div>
          <div class="sp-spark" role="img">
            <svg class="sp-spark-svg" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path class="sp-spark-area"></path>
              <path class="sp-spark-line"></path>
            </svg>
            <div class="sp-spark-events" aria-hidden="true"></div>
            <span class="sp-spark-now" aria-hidden="true"></span>
            <span class="sp-spark-peak" aria-hidden="true"></span>
            <span class="sp-spark-cursor" aria-hidden="true"></span>
          </div>
          <div class="sp-spark-axis num" aria-hidden="true"><span class="sp-spark-from"></span><span class="sp-spark-to"></span></div>
          <p class="sp-caption">Relative prominence in this story — illustrative, not a measurement. <span class="sp-spark-peak-text"></span></p>
        </section>

        <section class="sp-section sp-lineage" aria-labelledby="sp-h-lineage">
          <h3 id="sp-h-lineage" class="kicker">Lineage</h3>
          <ol class="sp-crumbs"></ol>
          <div class="sp-clade" aria-live="polite"></div>
          <p class="sp-kin"></p>
        </section>

        <section class="sp-section sp-relatives" aria-labelledby="sp-h-relatives">
          <h3 id="sp-h-relatives" class="kicker">Closest relatives in this story</h3>
          <ul id="species-modal-relatives"></ul>
          <p class="sp-rel-note"></p>
        </section>
      </div>
      <div class="dlg-actions">
        <span class="kicker sp-actions-label" id="sp-goto-label">Go to its</span>
        <div class="sp-actions-group" role="group" aria-labelledby="sp-goto-label">
          <button type="button" class="btn" data-action="first">First appearance</button>
          <button type="button" class="btn" data-action="heyday">Heyday</button>
          <button type="button" class="btn" data-action="last">Last days</button>
        </div>
        <button type="button" class="btn btn-ghost sp-action-tree" data-action="tree">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M8 14V7.5M8 10C5.6 9.6 4.2 8 4.2 5.8M8 8.6c2.4-.4 3.8-2.2 3.8-4.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="4.2" cy="4.6" r="1.5" fill="currentColor"/><circle cx="11.8" cy="2.9" r="1.5" fill="currentColor"/></svg>
          Show on the tree
        </button>
      </div>
    </div>
  </dialog>`;

export class SpeciesModal {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('species-modal-root');
    this.root.innerHTML = TEMPLATE;
    const $ = (selector) => this.root.querySelector(selector);
    this.el = $('#species-modal');
    this.scrollEl = $('.dlg-scroll');
    this.backBtn = $('.dlg-back');
    this.backLabel = $('.dlg-back-label');
    this.closeBtn = $('#species-modal-close');
    this.medallionEl = $('.sp-medallion');
    this.titleEl = $('#species-modal-title');
    this.sciEl = $('#species-modal-sci');
    this.tagsEl = $('.sp-tags');
    this.factsEl = $('.sp-facts');
    this.bodyEl = $('#species-modal-body');
    this.nowTextEl = $('.sp-now-text');
    this.lifeTrackEl = $('.sp-life-track');
    this.lifeSpanEl = $('.sp-life-span');
    this.lifeNowEl = $('.sp-life-now');
    this.lifeErasEl = $('.sp-life-eras');
    this.lifeStoryEl = $('.sp-life-story');
    this.sparkEl = $('.sp-spark');
    this.sparkAreaEl = $('.sp-spark-area');
    this.sparkLineEl = $('.sp-spark-line');
    this.sparkEventsEl = $('.sp-spark-events');
    this.sparkNowEl = $('.sp-spark-now');
    this.sparkPeakEl = $('.sp-spark-peak');
    this.sparkCursorEl = $('.sp-spark-cursor');
    this.sparkReadoutEl = $('.sp-spark-readout');
    this.sparkFromEl = $('.sp-spark-from');
    this.sparkToEl = $('.sp-spark-to');
    this.sparkPeakTextEl = $('.sp-spark-peak-text');
    this.lineageEl = $('.sp-lineage');
    this.crumbsEl = $('.sp-crumbs');
    this.cladeEl = $('.sp-clade');
    this.kinEl = $('.sp-kin');
    this.relativesSection = $('.sp-relatives');
    this.relativesEl = $('#species-modal-relatives');
    this.relativesNoteEl = $('.sp-rel-note');
    this.actionsEl = $('.dlg-actions');
    this.lastBtn = $('[data-action="last"]');

    this._sp = null;              // species on show
    this._history = [];           // ids visited earlier in this session (for Back)
    this._nowMa = null;           // clock time the time-dependent parts were drawn for
    this._spotlight = null;       // { id, until, goneSince } after a "go to" action

    this.shell = new ModalShell(this.el, () => this.close());
    safely('Species dialog: timeline bar', () => this._buildTimeline());

    this.closeBtn.addEventListener('click', () => this.close());
    this.backBtn.addEventListener('click', () => this._back());
    this.actionsEl.addEventListener('click', (e) => {
      const button = e.target.closest('[data-action]');
      if (button) this._act(button.dataset.action);
    });
    this.relativesEl.addEventListener('click', (e) => {
      const row = e.target.closest('[data-id]');
      if (row) this.open(app.speciesById.get(row.dataset.id));
    });
    this.crumbsEl.addEventListener('click', (e) => {
      const crumb = e.target.closest('button');
      if (!crumb) return;
      if (crumb.dataset.more) this._renderCrumbs(true, true);
      else this._selectClade(crumb.dataset.clade);
    });
    this.scrollEl.addEventListener('scroll', () => {
      this.scrollEl.parentElement.classList.toggle('is-scrolled', this.scrollEl.scrollTop > 2);
    }, { passive: true });
    this.sparkEl.addEventListener('pointermove', (e) => this._sparkHover(e));
    this.sparkEl.addEventListener('pointerleave', () => this._sparkHover(null));
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(() => this._fitEraLabels()).observe(this.lifeErasEl);
    }

    app.bus.on('species:open', ({ id }) => this.open(app.speciesById.get(id)));
    app.bus.on('panel:close-all', () => {
      if (this.shell.isOpen) this.close();
      else this._endSpotlight();
    });
  }

  isOpen() {
    return this.shell.isOpen;
  }

  open(sp) {
    if (!sp) return;
    if (!this.shell.isOpen) {
      this._history = [];
      this._spotlight = null;
      this.app.pause();
    } else if (this._sp && this._sp.id !== sp.id) {
      this._history.push(this._sp.id);
    }
    this._show(sp);
    this.shell.open(this.titleEl);
    this._fitEraLabels();
    this.app.bus.emit('species:focus', { id: sp.id });
  }

  /** @param {{ keepFocus?: boolean }} options  keepFocus: leave 'species:focus' on (go-to actions) */
  close({ keepFocus = false } = {}) {
    if (!this.shell.isOpen) return;
    const id = this._sp ? this._sp.id : null;
    // If the opener is gone (the list changed), the species' own row is the next best place.
    const fallback = id ? document.querySelector(`#sidebar [data-id="${CSS.escape(id)}"]`) : null;
    this.shell.close(fallback);
    this._history = [];
    if (!keepFocus) this.app.bus.emit('species:focus', { id: null });
  }

  /** Keeps the "now" marks true if time moves under the open dialog, and times out the spotlight. */
  update(frame) {
    if (this.shell.isOpen && this._sp && frame.timeMa !== this._nowMa) this._renderNow(this._sp);
    const spot = this._spotlight;
    if (!spot || this.shell.isOpen) return;
    const sp = this.app.speciesById.get(spot.id);
    const alive = sp && isAlive(sp, frame.timeMa);
    if (alive) spot.goneSince = null;
    else if (spot.goneSince == null) spot.goneSince = frame.nowSec;
    if (frame.nowSec > spot.until || (!alive && frame.nowSec - spot.goneSince > SPOTLIGHT_LINGER_SECONDS)) {
      this._endSpotlight();
    }
  }

  // ---- navigation inside the dialog ------------------------------------------------------------

  _back() {
    const id = this._history.pop();
    const sp = id ? this.app.speciesById.get(id) : null;
    if (!sp) return;
    this._show(sp);
    this.titleEl.focus({ preventScroll: true });
    this.app.bus.emit('species:focus', { id: sp.id });
  }

  _act(action) {
    const sp = this._sp;
    if (!sp) return;
    const { app } = this;
    this.close({ keepFocus: true });
    this._spotlight = { id: sp.id, until: performance.now() / 1000 + SPOTLIGHT_SECONDS, goneSince: null };
    if (action === 'tree') {
      app.setView('tree');
      app.notice(`${sp.name} on the tree of life · Esc to let go`, 4200);
      return;
    }
    const moment = jumpTarget(sp, action);
    app.seek(moment.ma);
    app.notice(`${sp.name} · ${moment.label}`, 4200);
    app.announce(`${sp.name}: ${moment.label}.`);
  }

  _endSpotlight() {
    if (!this._spotlight) return;
    this._spotlight = null;
    if (!this.shell.isOpen) this.app.bus.emit('species:focus', { id: null });
  }

  // ---- rendering ---------------------------------------------------------------------------

  _show(sp) {
    this._sp = sp;
    const info = getCategoryInfo(sp.category);
    const extinct = sp.extinctMa != null;
    this.el.style.setProperty('--species-color', info.color);

    // Header
    this.medallionEl.innerHTML = glyphSvg(info.group.glyph, info.color, 30);
    this.titleEl.textContent = sp.name;
    const sci = sp.scientificName && sp.scientificName.toLowerCase() !== sp.name.toLowerCase() ? sp.scientificName : '';
    this.sciEl.textContent = sci;
    this.sciEl.hidden = !sci;

    this.tagsEl.replaceChildren();
    const groupTag = el('li', 'tag sp-tag-group');
    const groupGlyph = el('span', 'sp-tag-glyph');
    groupGlyph.innerHTML = glyphSvg(info.group.glyph, info.color, 11);
    groupTag.append(groupGlyph, el('span', null, info.label));
    if (info.group.label && info.group.label !== info.label) groupTag.title = `Life group: ${info.group.label}`;
    this.tagsEl.appendChild(groupTag);
    this.tagsEl.appendChild(extinct
      ? el('li', 'tag sp-tag-extinct', 'Extinct')
      : el('li', 'tag sp-tag-extant', 'Alive today'));
    const habitat = HABITAT_TAGS[sp.habitat];
    if (habitat) this.tagsEl.appendChild(el('li', 'tag', habitat[extinct ? 1 : 0]));

    // Facts — only the rows this entry has data for
    this.factsEl.replaceChildren();
    const span = sp.appearanceMa - lifeEnd(sp);
    this._fact('When', formatRange(sp), extinct ? `lasted ${formatDuration(span)}` : `${formatDuration(span)} and counting`);
    if (sp.fossilSite) this._fact('Key fossil site', sp.fossilSite, 'its map marker follows this spot');
    if (sp.size) this._fact('Size', sp.size);
    if (sp.diet) this._fact('Diet', sp.diet);

    this.bodyEl.textContent = sp.descriptionLong || sp.description || '';

    this._renderLife(sp, info.color);
    this._renderSpark(sp);
    this._renderLineage(sp);
    this._renderRelatives(sp);
    this._renderNow(sp);

    // Actions
    this.lastBtn.hidden = !extinct;
    for (const button of this.actionsEl.querySelectorAll('[data-action]')) {
      const action = button.dataset.action;
      if (action === 'tree' || (action === 'last' && !extinct)) continue;
      const moment = jumpTarget(sp, action);
      button.setAttribute('aria-label', `Go to its ${moment.label}`);
      button.title = moment.label.charAt(0).toUpperCase() + moment.label.slice(1);
    }

    // Back button
    const previous = this._history.length ? this.app.speciesById.get(this._history[this._history.length - 1]) : null;
    this.backBtn.hidden = !previous;
    if (previous) {
      this.backLabel.textContent = previous.name;
      this.backBtn.setAttribute('aria-label', `Back to ${previous.name}`);
    }

    this.scrollEl.scrollTop = 0;
  }

  _fact(label, value, note) {
    const wrap = el('div', 'sp-fact');
    wrap.appendChild(el('dt', 'kicker', label));
    const dd = el('dd');
    dd.appendChild(el('span', 'sp-fact-value num', value));
    if (note) dd.appendChild(el('span', 'sp-fact-note', note));
    wrap.appendChild(dd);
    this.factsEl.appendChild(wrap);
  }

  /** The parts of the timeline bar that never change: period blocks, era names, the Big Five. */
  _buildTimeline() {
    const periods = this.root.querySelector('.sp-life-periods');
    const groups = [];
    for (const seg of getSegments()) {
      const block = el('span', 'sp-life-period');
      block.style.left = `${seg.f0 * 100}%`;
      block.style.width = `${(seg.f1 - seg.f0) * 100}%`;
      block.style.background = seg.period.color;
      periods.appendChild(block);

      // Era names under the bar: eons before the Phanerozoic, eras within it.
      const name = seg.period.eon === 'Phanerozoic' && seg.period.era ? seg.period.era : seg.period.eon;
      const last = groups[groups.length - 1];
      if (last && last.name === name) last.f1 = seg.f1;
      else groups.push({ name, f0: seg.f0, f1: seg.f1 });
    }
    for (const group of groups) {
      const label = el('span', 'sp-life-era');
      label.style.width = `${(group.f1 - group.f0) * 100}%`;
      label.title = group.name;
      const text = el('span', null, group.name);
      text.dataset.full = group.name;
      text.dataset.short = ERA_SHORT[group.name] || `${group.name.slice(0, 4)}.`;
      label.appendChild(text);
      this.lifeErasEl.appendChild(label);
    }

    const events = this.root.querySelector('.sp-life-events');
    for (const ext of bigFive) {
      const mark = el('span', 'sp-life-event');
      mark.style.left = `${maToFraction(ext.timeMa) * 100}%`;
      mark.style.setProperty('--event-color', ext.color);
      mark.title = `${ext.name} · ${formatYearsAgo(ext.timeMa)}`;
      events.appendChild(mark);
    }
  }

  /** Era names under the bar: in full where they fit, else abbreviated, else left out. */
  _fitEraLabels() {
    for (const label of this.lifeErasEl.children) {
      const text = label.firstElementChild;
      const room = label.clientWidth - 8;
      text.textContent = text.dataset.full;
      text.style.visibility = '';
      if (text.offsetWidth <= room) continue;
      text.textContent = text.dataset.short;
      if (text.offsetWidth > room) text.style.visibility = 'hidden';
    }
  }

  _renderLife(sp, color) {
    const f0 = maToFraction(sp.appearanceMa);
    const f1 = maToFraction(lifeEnd(sp));
    this.lifeSpanEl.style.left = `${f0 * 100}%`;
    this.lifeSpanEl.style.setProperty('--span', `${Math.max(0, f1 - f0) * 100}%`);
    this.lifeSpanEl.style.background = color;
    const story = extinctionStory(sp);
    this.lifeStoryEl.textContent = story;
    this.lifeStoryEl.hidden = !story;
    this.lifeTrackEl.setAttribute('role', 'img');
    this.lifeTrackEl.setAttribute('aria-label',
      `${sp.name} on the timeline of Earth history: ${formatYearsAgo(sp.appearanceMa)} to ${sp.extinctMa == null ? 'today' : formatYearsAgo(sp.extinctMa)}.`);
  }

  _renderSpark(sp) {
    const profile = sp.abundanceProfile || [];
    const end = lifeEnd(sp);
    const f0 = maToFraction(sp.appearanceMa);
    const f1 = maToFraction(end);
    const width = f1 - f0;
    const section = this.sparkEl.closest('.sp-section');
    section.hidden = profile.length < 2 || width <= 0;
    if (section.hidden) return;

    // x runs along the species' own span on the story axis; y is prominence 0..1.
    const xOf = (ma) => (maToFraction(ma) - f0) / width;
    const TOP = 5;
    const BASE = 38;
    const yOf = (value) => BASE - Math.max(0, Math.min(1, value)) * (BASE - TOP);
    const points = [];
    const SAMPLES = 72;
    for (let i = 0; i <= SAMPLES; i++) {
      const ma = fractionToMa(f0 + (width * i) / SAMPLES);
      points.push([i / SAMPLES, interpolateAbundance(profile, Math.max(end, Math.min(sp.appearanceMa, ma)))]);
    }
    for (const [ma, value] of profile) points.push([Math.max(0, Math.min(1, xOf(ma))), value]); // keep every knot exact
    points.sort((a, b) => a[0] - b[0]);

    const line = points.map(([x, v], i) => `${i ? 'L' : 'M'}${(x * 100).toFixed(2)} ${yOf(v).toFixed(2)}`).join('');
    this.sparkLineEl.setAttribute('d', line);
    this.sparkAreaEl.setAttribute('d', `${line}L100 ${BASE}L0 ${BASE}Z`);

    const peakMa = heydayMa(sp);
    const peakValue = interpolateAbundance(profile, peakMa);
    this.sparkPeakEl.style.left = `${xOf(peakMa) * 100}%`;
    this.sparkPeakEl.style.top = `${(yOf(peakValue) / 40) * 100}%`;
    this.sparkPeakTextEl.textContent = peakMa <= 0.00002 ? 'Peak: today.' : `Peak: about ${formatYearsAgo(peakMa)}.`;

    this.sparkEventsEl.replaceChildren();
    for (const ext of bigFive) {
      if (ext.timeMa >= sp.appearanceMa || ext.timeMa <= end) continue;
      const mark = el('span', 'sp-spark-event');
      mark.style.left = `${xOf(ext.timeMa) * 100}%`;
      mark.style.setProperty('--event-color', ext.color);
      this.sparkEventsEl.appendChild(mark);
    }

    this.sparkFromEl.textContent = formatMa(sp.appearanceMa);
    this.sparkToEl.textContent = sp.extinctMa == null ? 'today' : formatMa(sp.extinctMa);
    this.sparkEl.setAttribute('aria-label',
      `Relative prominence of ${sp.name} from ${formatYearsAgo(sp.appearanceMa)} to ${sp.extinctMa == null ? 'today' : formatYearsAgo(sp.extinctMa)}; it peaks about ${formatYearsAgo(peakMa)}.`);
    this._sparkScale = { f0, width };
    this._sparkHover(null);
  }

  /** Crosshair: the age under the pointer (the vertical scale is editorial, so it shows no value). */
  _sparkHover(e) {
    const scale = this._sparkScale;
    if (!e || !scale) {
      this.sparkCursorEl.style.opacity = '0';
      this.sparkReadoutEl.textContent = '';
      return;
    }
    const rect = this.sparkEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    this.sparkCursorEl.style.left = `${x * 100}%`;
    this.sparkCursorEl.style.opacity = '1';
    this.sparkReadoutEl.textContent = formatYearsAgo(fractionToMa(scale.f0 + scale.width * x));
  }

  _renderLineage(sp) {
    const chain = tree && sp.clade && tree.has(sp.clade) ? tree.lineage(sp.clade) : [];
    this.lineageEl.hidden = chain.length === 0;
    this._chain = chain;
    this._cladeId = chain.length ? chain[chain.length - 1].id : null;
    if (!chain.length) {
      this.crumbsEl.replaceChildren();
      this.cladeEl.replaceChildren();
      this.kinEl.textContent = '';
      return;
    }
    this._renderCrumbs(false, false);
    this._selectClade(this._cladeId);

    // How the species relates to the viewer.
    const human = this.app.speciesById.get(HUMAN_ID);
    let kin = '';
    if (human && human.clade && tree.has(human.clade) && sp.id !== HUMAN_ID) {
      const common = tree.ancestor(sp.clade, human.clade);
      const split = tree.divergence(sp.clade, human.clade);
      const atRoot = common && common.parent == null;
      if (!common) {
        kin = '';
      } else if (common.id === human.clade) {
        const sci = common.scientificName && common.scientificName !== common.name ? ` (${common.scientificName})` : '';
        kin = `It shares our own twig of the tree: ${inProse(common.name)}${sci}.`;
      } else if (common.id === sp.clade) {
        // The entry stands for a branch that our own lineage passes through.
        kin = atRoot
          ? 'Everything alive today, humans included, descends from this root.'
          : `Our own line runs through this branch: humans descend from early ${inProse(common.name)}.`;
      } else if (Number.isFinite(split) && split > 0) {
        kin = atRoot
          ? `Its line and ours parted about ${formatYearsAgo(split)}, at the very root of the tree of life.`
          : `Its line and ours parted about ${formatYearsAgo(split)}; our last shared ancestor was among the earliest ${inProse(common.name)}.`;
      }
    }
    this.kinEl.textContent = kin;
    this.kinEl.hidden = !kin;
  }

  /** Long lineages start folded: the root end, a "more" crumb, then the most specific few. */
  _renderCrumbs(expanded, focusFirstRevealed) {
    const chain = this._chain;
    const HEAD = 2;
    const TAIL = 4;
    const fold = !expanded && chain.length > HEAD + TAIL + 1;
    this.crumbsEl.replaceChildren();
    let firstRevealed = null;
    chain.forEach((clade, i) => {
      if (fold && i >= HEAD && i < chain.length - TAIL) {
        if (i === HEAD) {
          const hidden = chain.length - HEAD - TAIL;
          const more = el('button', 'sp-crumb sp-crumb-more', '…');
          more.type = 'button';
          more.dataset.more = '1';
          more.setAttribute('aria-label', `Show ${hidden} more steps of the lineage`);
          more.title = `${hidden} more steps`;
          const item = el('li');
          item.appendChild(more);
          this.crumbsEl.appendChild(item);
        }
        return;
      }
      const crumb = el('button', 'sp-crumb', clade.name);
      crumb.type = 'button';
      crumb.dataset.clade = clade.id;
      crumb.title = `${clade.name} — arose about ${formatYearsAgo(clade.originMa)}`;
      crumb.setAttribute('aria-pressed', String(clade.id === this._cladeId));
      if (i >= chain.length - 3) crumb.classList.add('is-near');
      if (expanded && i >= HEAD && i < chain.length - TAIL && !firstRevealed) firstRevealed = crumb;
      const item = el('li');
      item.appendChild(crumb);
      this.crumbsEl.appendChild(item);
    });
    if (focusFirstRevealed && firstRevealed) firstRevealed.focus();
  }

  _selectClade(id) {
    const clade = this._chain.find((c) => c.id === id);
    if (!clade) return;
    this._cladeId = id;
    for (const crumb of this.crumbsEl.querySelectorAll('[data-clade]')) {
      crumb.setAttribute('aria-pressed', String(crumb.dataset.clade === id));
    }
    this.cladeEl.replaceChildren();
    const head = el('div', 'sp-clade-head');
    head.appendChild(el('span', 'sp-clade-name display', clade.name));
    if (clade.scientificName && clade.scientificName.toLowerCase() !== clade.name.toLowerCase()) {
      head.appendChild(el('span', 'sp-clade-sci sci', clade.scientificName));
    }
    head.appendChild(el('span', 'sp-clade-age num', `arose about ${formatYearsAgo(clade.originMa)}`));
    this.cladeEl.appendChild(head);
    if (clade.description) this.cladeEl.appendChild(el('p', 'sp-clade-text', clade.description));
  }

  _renderRelatives(sp) {
    const list = [];
    if (tree && sp.clade && tree.has(sp.clade)) {
      const end = lifeEnd(sp);
      for (const other of allSpecies) {
        if (other.id === sp.id || !other.clade || !tree.has(other.clade)) continue;
        const split = tree.divergence(sp.clade, other.clade);
        if (!Number.isFinite(split)) continue;
        const overlap = Math.min(sp.appearanceMa, other.appearanceMa) - Math.max(end, lifeEnd(other));
        list.push({ other, split, overlap });
      }
      // Closest kin first; among equals, the ones that shared the most time with it.
      list.sort((a, b) => (a.split - b.split) || (b.overlap - a.overlap) || a.other.name.localeCompare(b.other.name));
    }
    // A deep branch is equally related to everything on the far side of its split: say so
    // when the list has to cut such a tie short.
    let tied = 0;
    if (list.length > RELATIVES_SHOWN) {
      const cut = list[RELATIVES_SHOWN - 1].split;
      tied = list.filter((entry, i) => i >= RELATIVES_SHOWN && entry.split === cut).length;
      list.length = RELATIVES_SHOWN;
    }
    this.relativesNoteEl.hidden = tied === 0;
    if (tied) {
      const others = tied === 1 ? '1 more entry is' : `${tied} more entries are`;
      this.relativesNoteEl.textContent = `${others} just as distantly related as the last one shown. `
        + `Equal relatives are listed by how much time they shared with ${sp.name}.`;
    }
    this.relativesSection.hidden = list.length === 0;
    this.relativesEl.replaceChildren();
    for (const { other, split } of list) {
      const info = getCategoryInfo(other.category);
      const row = el('button', 'sp-rel');
      row.type = 'button';
      row.dataset.id = other.id;

      const glyph = el('span', 'sp-rel-glyph');
      glyph.innerHTML = glyphSvg(info.group.glyph, info.color, 16);
      glyph.setAttribute('aria-hidden', 'true');

      const common = tree.ancestor(sp.clade, other.clade);
      let kinship = '';
      let spoken = '';
      if (common && other.clade === sp.clade) {
        kinship = `same branch · ${common.name}`;
        spoken = `On the same branch: ${common.name}.`;
      } else if (common) {
        kinship = `shared ancestor ~${formatMa(split)} · ${common.name}`;
        spoken = common.parent == null
          ? `Shared ancestor about ${formatYearsAgo(split)}, at the root of the tree of life.`
          : `Shared ancestor about ${formatYearsAgo(split)}, among the ${inProse(common.name)}.`;
      }
      // Read out in words; "alive now" is added by _renderNow while it applies.
      row.dataset.label = `${other.name}. ${spoken} Lived from ${formatYearsAgo(other.appearanceMa)} to ${
        other.extinctMa == null ? 'today' : formatYearsAgo(other.extinctMa)}.`.replace(/\s+/g, ' ');
      const main = el('span', 'sp-rel-main');
      main.append(el('span', 'sp-rel-name', other.name), el('span', 'sp-rel-kin', kinship));

      const side = el('span', 'sp-rel-side');
      side.append(el('span', 'sp-rel-range num', formatRange(other)), el('span', 'sp-rel-live', 'alive now'));

      const chevron = el('span', 'sp-rel-go');
      chevron.setAttribute('aria-hidden', 'true');
      chevron.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12" focusable="false"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      row.append(glyph, main, side, chevron);
      const item = el('li');
      item.appendChild(row);
      this.relativesEl.appendChild(item);
    }
  }

  /** Everything that depends on the clock: the "now" marks and the "alive now" tags. */
  _renderNow(sp) {
    const now = this.app.clock.currentTimeMa;
    this._nowMa = now;
    const end = lifeEnd(sp);
    const inside = now <= sp.appearanceMa && now >= end;
    this.lifeNowEl.style.left = `${maToFraction(now) * 100}%`;
    const state = inside ? 'alive' : now > sp.appearanceMa ? 'not here yet' : 'already gone';
    this.nowTextEl.textContent = `now · ${formatMa(now)} · ${state}`;

    this.sparkNowEl.hidden = !inside;
    if (inside) {
      const f0 = maToFraction(sp.appearanceMa);
      const f1 = maToFraction(end);
      this.sparkNowEl.style.left = `${((maToFraction(now) - f0) / (f1 - f0)) * 100}%`;
    }

    for (const row of this.relativesEl.querySelectorAll('[data-id]')) {
      const other = this.app.speciesById.get(row.dataset.id);
      const alive = !!other && isAlive(other, now);
      row.classList.toggle('is-alive', alive);
      row.setAttribute('aria-label', alive ? `${row.dataset.label} Alive at this moment.` : row.dataset.label);
    }
  }
}
