// Intro dialog and finale card — the story's front and back covers.
//
//   Intro   A modal welcome shown on 'app:ready' unless the page opened on a deep link or in
//           capture mode: what this is, how long it runs, what the three views show, and one
//           obvious way in. "Begin" restarts and plays; Escape or a click outside just closes it.
//           It reports itself with 'panel:changed' { name: 'intro', open } and 'intro:dismiss',
//           and can be reopened with 'panel:toggle' { name: 'intro', open: true }.
//
//   Finale  When playback reaches the present ('clock:end' — not when the viewer scrubs there) a
//           card rises over the lower part of the visualization: a few numbers computed from the
//           story's own data, and three ways onward. It lets the last milestone toasts finish
//           first (js/ui/milestoneOverlay.js flags <html data-ov-narrating>), within a limit. It
//           is not modal and leaves on any seek or play.
//
// Both live in #intro-root (page level). The finale is laid over the visualization's rectangle,
// so it behaves like the other map overlays while staying out of #viz-container.

import { TIMING } from '../config.js';
import { species, speciesById } from '../data/species.js';
import * as extinctionData from '../data/extinctions.js';
import { milestones } from '../data/milestones.js';
import { timeline } from '../data/timeline.js';
import { maToScreenSeconds, totalScreenSeconds } from '../engine/timeScale.js';
import { formatDuration, formatInt } from '../util/format.js';

const FINALE_DELAY_SEC = 1.2;      // the present-day planet is seen on its own first…
const FINALE_QUIET_SEC = 0.6;      // …and, if the last toasts are still up, a breath after they go…
const FINALE_MAX_WAIT_SEC = 14;    // …but never later than this after the story ends
const LEAVE_MS = 260;
const DAY_SECONDS = 86400;
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const ICON = {
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z"/></svg>',
  replay: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3v4h4"/><path d="M2.6 10a6 6 0 1 0 1.4-6.2L1.5 7"/></svg>',
  close: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c-3 2.3-3 14.7 0 17M12 3.5c3 2.3 3 14.7 0 17"/></svg>',
  tree: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-9.5M12 15c-3.2-.8-4.8-3.2-4.8-5.7M12 13.1c3.2-.8 4.8-3.3 4.8-6.4"/><circle cx="7.2" cy="8.2" r="1.7"/><circle cx="16.8" cy="5.6" r="1.7"/><circle cx="12" cy="9.4" r="1.9"/></svg>',
  timeline: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M8 9v6M11.5 9v6M17 9v6M14 5.5v13"/></svg>',
};

function numberWord(n) {
  return NUMBER_WORDS[n] || String(n);
}

/** Minutes a full viewing takes at 1×: the screen-time axis plus each extinction's hold and crawl. */
function playThroughMinutes() {
  let seconds = totalScreenSeconds();
  for (const ext of extinctionData.extinctions || []) {
    const from = Math.min(TIMING.startTimeMa, ext.timeMa + ext.durationMa / 2);
    const to = Math.max(TIMING.endTimeMa, ext.timeMa - ext.durationMa / 2);
    const windowSec = maToScreenSeconds(to) - maToScreenSeconds(from);
    seconds += TIMING.extinctionPauseSeconds + windowSec * (1 / TIMING.extinctionSlowdown - 1);
  }
  return Math.max(1, Math.round(seconds / 60));
}

/** Seconds before midnight on the 24-hour Earth clock, as "5.7 s" / "0.22 s" / "34 s". */
function clockSecondsBeforeMidnight(ma) {
  const seconds = (ma / TIMING.startTimeMa) * DAY_SECONDS;
  if (seconds >= 10) return `${Math.round(seconds)} s`;
  return `${seconds.toFixed(seconds >= 1 ? 1 : 2)} s`;
}

function focusables(container) {
  return [...container.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null);
}

export class Intro {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('intro-root');
    this.vizEl = document.getElementById('viz-container');

    this._introEl = null;
    this._introCard = null;
    this._returnFocus = null;

    this._finaleEl = null;
    this._finaleShown = false;
    this._finaleDue = false;     // 'clock:end' arrived; waiting FINALE_DELAY_SEC
    this._finaleAtSec = null;
    this._finaleLatestSec = null;
    this._quietSince = null;
    this._finaleObserver = null;

    app.bus.on('app:ready', ({ direct }) => { if (!direct) this.open(); });
    app.bus.on('panel:toggle', ({ name, open }) => {
      if (name !== 'intro') return;
      if (open ?? !this._introEl) this.open();
      else this.dismiss();
    });
    app.bus.on('clock:end', () => {
      this._finaleDue = true;
      this._finaleAtSec = null;
    });
    // Escape from anywhere on the page (js/ui/shortcuts.js) also puts the finale away.
    app.bus.on('panel:close-all', () => this._hideFinale());
  }

  update(frame) {
    if (this._finaleDue) {
      const now = frame.nowSec;
      if (frame.jumped || frame.playing || !frame.atEnd) {
        this._finaleDue = false;
      } else if (this._finaleAtSec === null) {
        this._finaleAtSec = now + FINALE_DELAY_SEC;
        this._finaleLatestSec = now + FINALE_MAX_WAIT_SEC;
        this._quietSince = null;
      } else {
        const narrating = document.documentElement.hasAttribute('data-ov-narrating');
        if (narrating) this._quietSince = null;
        else if (this._quietSince === null) this._quietSince = now;
        const settled = !narrating && now - this._quietSince >= FINALE_QUIET_SEC;
        if (now >= this._finaleLatestSec || (now >= this._finaleAtSec && settled)) {
          this._finaleDue = false;
          this._showFinale();
        }
      }
    } else if (this._finaleShown && (frame.jumped || frame.playing || !frame.atEnd)) {
      this._hideFinale();
    }
  }

  // ---- intro -----------------------------------------------------------------------------------

  open() {
    if (this._introEl) return;
    const active = document.activeElement;
    this._returnFocus = active && active !== document.body ? active : null;

    const extinctionCount = (extinctionData.extinctions || []).length;
    const extinctionPhrase = extinctionCount
      ? `${numberWord(extinctionCount)} mass extinction${extinctionCount === 1 ? '' : 's'} `
      : '';
    const minutes = playThroughMinutes();

    const el = document.createElement('div');
    el.className = 'intro';
    el.innerHTML = `
      <div class="intro-backdrop"></div>
      <div class="intro-card" role="dialog" aria-modal="true" aria-labelledby="intro-title" aria-describedby="intro-promise">
        <div class="intro-mark-slot"></div>
        <h2 class="intro-title display" id="intro-title">Life’s Tree Blooms</h2>
        <p class="intro-promise" id="intro-promise">
          <strong>${formatDuration(TIMING.startTimeMa)}</strong> of Earth and life — drifting continents,
          changing skies, ${extinctionPhrase}and one growing family tree — in
          <strong>about ${minutes} minute${minutes === 1 ? '' : 's'}</strong>.
        </p>
        <ul class="intro-sees">
          <li class="intro-see">${ICON.globe}<div><strong>Map &amp; Globe</strong><span>The planet through time</span></div></li>
          <li class="intro-see">${ICON.tree}<div><strong>Tree</strong><span>How everything is related</span></div></li>
          <li class="intro-see">${ICON.timeline}<div><strong>Timeline</strong><span>Every period, scaled to the story</span></div></li>
        </ul>
        <div class="intro-actions">
          <button class="btn btn-primary" id="intro-begin" type="button">${ICON.play}Begin at the beginning</button>
          <button class="btn" id="intro-chapters" type="button">Browse chapters</button>
        </div>
        <p class="intro-hints">
          <span><kbd>Space</kbd> play / pause</span>
          <span><kbd>←</kbd> <kbd>→</kbd> step through time</span>
          <span><kbd>?</kbd> help</span>
        </p>
      </div>`;

    // The toolbar's brand mark, grown (its bloom colours come from css/styles.css).
    const brand = document.querySelector('#toolbar .brand-mark');
    if (brand) {
      const mark = brand.cloneNode(true);
      mark.classList.add('intro-mark');
      el.querySelector('.intro-mark-slot').appendChild(mark);
    }

    const card = el.querySelector('.intro-card');
    const begin = el.querySelector('#intro-begin');
    begin.addEventListener('click', () => {
      this.dismiss(document.getElementById('btn-play'));
      this.app.restart();
      this.app.play();
    });
    el.querySelector('#intro-chapters').addEventListener('click', () => {
      this.dismiss(document.getElementById('btn-chapters'));
      this.app.bus.emit('panel:toggle', { name: 'chapters', open: true });
    });
    el.querySelector('.intro-backdrop').addEventListener('click', () => this.dismiss());
    // The dialog owns the keyboard while it is open — wherever focus happens to be.
    this._onIntroKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.dismiss();
      } else if (e.key === 'Tab') {
        const items = focusables(card);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const inside = card.contains(document.activeElement);
        if (e.shiftKey && (!inside || document.activeElement === first)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', this._onIntroKey, true);
    // A click on the card's empty space must not drop focus out of the dialog.
    card.addEventListener('focusout', (e) => {
      if (this._introEl === el && !el.classList.contains('is-leaving') && !card.contains(e.relatedTarget)) {
        requestAnimationFrame(() => {
          if (this._introEl === el && !card.contains(document.activeElement)) begin.focus({ preventScroll: true });
        });
      }
    });

    this.root.appendChild(el);
    this._introEl = el;
    this._introCard = card;
    document.documentElement.setAttribute('data-ov-intro', '');
    this.app.bus.emit('panel:changed', { name: 'intro', open: true });
    begin.focus({ preventScroll: true });
  }

  /** Close the intro. `focusTarget` receives focus; by default it returns to where it was. */
  dismiss(focusTarget) {
    const el = this._introEl;
    if (!el) return;
    this._introEl = null;
    document.removeEventListener('keydown', this._onIntroKey, true);
    // Stop being modal at once (js/ui/shortcuts.js keys off aria-modal), then fade out.
    this._introCard.removeAttribute('aria-modal');
    el.classList.add('is-leaving');
    el.inert = true;
    document.documentElement.removeAttribute('data-ov-intro');
    setTimeout(() => el.remove(), this.app.state.reducedMotion ? 0 : LEAVE_MS);

    const target = focusTarget || this._returnFocus;
    if (target && target.isConnected && typeof target.focus === 'function') target.focus({ preventScroll: true });
    else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    this._returnFocus = null;

    this.app.bus.emit('panel:changed', { name: 'intro', open: false });
    this.app.bus.emit('intro:dismiss', {});
  }

  // ---- finale ----------------------------------------------------------------------------------

  _buildFinale() {
    const el = document.createElement('div');
    el.className = 'finale';
    el.innerHTML = `
      <section class="finale-card glass" role="dialog" aria-labelledby="finale-title">
        <div class="finale-head">
          <div class="finale-kicker kicker">Today · 24:00 on the Earth clock</div>
          <button class="finale-close" type="button" aria-label="Close">${ICON.close}</button>
        </div>
        <h2 class="finale-title display" id="finale-title">You are here.</h2>
        <p class="finale-lead"></p>
        <dl class="finale-stats"></dl>
        <p class="finale-crisis" hidden></p>
        <div class="finale-actions">
          <button class="btn btn-primary" data-action="replay" type="button">${ICON.replay}Watch again</button>
          <button class="btn" data-action="view" type="button"></button>
          <button class="btn btn-ghost" data-action="chapters" type="button">Browse chapters</button>
        </div>
      </section>`;

    el.querySelector('.finale-close').addEventListener('click', () => this._hideFinale());
    el.querySelector('.finale-actions').addEventListener('click', (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;
      const { app } = this;
      const action = button.dataset.action;
      this._hideFinale();
      if (action === 'replay') {
        app.restart();
        app.play();
      } else if (action === 'view') {
        app.setView(app.state.view === 'tree' ? 'map' : 'tree');
      } else if (action === 'chapters') {
        const opener = document.getElementById('btn-chapters');
        if (opener) opener.focus({ preventScroll: true });
        app.bus.emit('panel:toggle', { name: 'chapters', open: true });
      }
    });
    el.querySelector('.finale-card').addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      this._hideFinale();
    });
    return el;
  }

  /** Everything on the card is computed from the story's own data at the moment it is shown. */
  _fillFinale(el) {
    const extinctionCount = (extinctionData.extinctions || []).length;
    el.querySelector('.finale-lead').textContent = extinctionCount
      ? `Everything alive today — you included — descends from survivors of all ${numberWord(extinctionCount)} mass extinctions.`
      : 'Everything alive today — you included — is a twig on one family tree.';

    const stats = [];
    const total = species.length;
    const alive = species.filter((sp) => sp.extinctMa == null).length;
    stats.push({
      value: formatInt(alive),
      unit: `of ${formatInt(total)}`,
      label: 'lineages in this story are still alive',
    });
    const us = speciesById.get('homo_sapiens');
    if (us) {
      stats.push({
        value: clockSecondsBeforeMidnight(us.appearanceMa),
        label: 'before midnight, our own species appears',
      });
    }
    // The date the "first farms" toast itself shows; failing that, the start of the Holocene.
    const farming = milestones.find((m) => m.id === 'agriculture');
    const holocene = timeline.find((row) => row.period === 'Holocene');
    const farmingMa = farming ? farming.timeMa : holocene ? holocene.startMa : null;
    if (farmingMa) {
      stats.push({
        value: clockSecondsBeforeMidnight(farmingMa),
        label: 'before midnight, the first farms — then every city and book',
      });
    }
    const list = el.querySelector('.finale-stats');
    list.textContent = '';
    for (const stat of stats) {
      const item = document.createElement('div');
      item.className = 'finale-stat';
      const value = document.createElement('dt');
      value.textContent = stat.value;
      if (stat.unit) {
        const unit = document.createElement('small');
        unit.textContent = ` ${stat.unit}`;
        value.appendChild(unit);
      }
      const label = document.createElement('dd');
      label.textContent = stat.label;
      item.append(value, label);
      list.appendChild(item);
    }

    // One honest line on the present, when the data carries a Holocene / Anthropocene crisis.
    const crisis = (extinctionData.crises || [])
      .find((c) => /holocene|anthropocene|sixth|ongoing/i.test(`${c.id} ${c.name}`));
    const crisisEl = el.querySelector('.finale-crisis');
    crisisEl.hidden = !(crisis && crisis.description);
    if (crisis && crisis.description) {
      crisisEl.textContent = crisis.description;
      if (crisis.color) crisisEl.style.setProperty('--crisis-color', crisis.color);
    }

    const onTree = this.app.state.view === 'tree';
    el.querySelector('[data-action="view"]').textContent = onTree ? 'Back to the map' : 'Explore the tree';
  }

  _showFinale() {
    if (this._finaleShown || this.app.state.captureMode) return;
    if (!this._finaleEl) this._finaleEl = this._buildFinale();
    const el = this._finaleEl;
    this._fillFinale(el);
    this.root.appendChild(el);
    this._finaleShown = true;
    this._syncFinaleRect();
    if (typeof ResizeObserver === 'function') {
      this._finaleObserver = new ResizeObserver(() => this._syncFinaleRect());
      this._finaleObserver.observe(this.vizEl);
      this._finaleObserver.observe(document.documentElement);
    }
    document.documentElement.setAttribute('data-ov-finale', '');
    // Next frame, so the entrance transition has a starting state to move from.
    requestAnimationFrame(() => el.classList.add('is-in'));
    this.app.announce('You are here: the story has reached today. Press Space to watch again, or Tab to more options.');
  }

  _hideFinale() {
    this._finaleDue = false;
    if (!this._finaleShown) return;
    this._finaleShown = false;
    const el = this._finaleEl;
    const hadFocus = el.contains(document.activeElement);
    el.classList.remove('is-in');
    el.remove();
    if (this._finaleObserver) {
      this._finaleObserver.disconnect();
      this._finaleObserver = null;
    }
    document.documentElement.removeAttribute('data-ov-finale');
    if (hadFocus) {
      const play = document.getElementById('btn-play');
      if (play) play.focus({ preventScroll: true });
    }
  }

  /** Lay the finale layer exactly over the visualization. */
  _syncFinaleRect() {
    if (!this._finaleEl || !this.vizEl) return;
    const rect = this.vizEl.getBoundingClientRect();
    const style = this._finaleEl.style;
    style.setProperty('--viz-x', `${rect.left}px`);
    style.setProperty('--viz-y', `${rect.top}px`);
    style.setProperty('--viz-w', `${rect.width}px`);
    style.setProperty('--viz-h', `${rect.height}px`);
  }
}
