// Narration layer — milestone toasts (top-centre) and era title cards (centre).
//
// Toasts. A milestone's trigger window (js/data/milestones.js) can pass in a fraction of a second
// at some speeds, so on-screen time is decoupled from it: every toast is guaranteed a readable
// dwell in REAL seconds, lingering after its window has gone. Milestones that become active
// meanwhile wait in a short queue, in story order; a more important one (`priority`) that would
// otherwise go stale may jump ahead, and news the story has already left behind is dropped, so
// at high speeds the narration thins out to the headlines instead of trailing behind the picture.
// A hairline along the bottom of the toast shows the dwell remaining. Scrubbing flushes the queue
// and simply shows whatever is active at the new time.
//
// Era title cards. When playback crosses into a new eon or era (`getEraAtTime` / `ERAS` from
// js/data/timeline.js, or units derived from the period rows when those exports are missing) a
// centred title blooms for about three seconds. It never plays over a mass extinction — it waits
// for the extinction card to leave — and new toasts wait for the title, so one voice speaks at a
// time.
//
// A mass extinction silences the whole layer until its card has gone: a toast that was up is
// tucked away and comes back afterwards only if it had barely been read and is still news, and
// no new toast starts in the seconds before an extinction would sweep it away.
//
// While anything is being narrated (a toast is up or waiting) the layer flags <html
// data-ov-narrating>, so the finale (js/ui/intro.js) can let the last beats finish first; once the
// finale is up, the layer falls silent.

import { TIMING } from '../config.js';
import * as timelineData from '../data/timeline.js';
import * as milestoneData from '../data/milestones.js';
import { extinctions } from '../data/extinctions.js';
import { maToScreenSeconds } from '../engine/timeScale.js';
import { formatYearsAgo } from '../util/format.js';

const MIN_DWELL_SEC = 5;        // every toast is readable for at least this long…
const MIN_DWELL_BUSY_SEC = 3;   // …or this long when two or more are waiting behind it
const LINGER_CAP_SEC = 8;       // past its window a toast stays for its reading time, up to this
const MAX_DWELL_SEC = 12;       // even a long window does not hold a toast forever
const RESUME_SEC = 2.5;         // a toast cut short by an extinction hold gets at least this back
const QUEUE_LIMIT = 3;
const STALE_SCREEN_SEC = 6;     // a queued toast is dropped once the story has moved this far past
                                // its window (seconds of 1× playback): at 4× narration must not trail
const GAP_SEC = 0.4;            // breath between two toasts
const CRISIS_LOOKAHEAD_SEC = 1.5; // no new toast this close to a mass extinction: it would only flash
const TITLE_SEC = 3.2;          // at 1×; shorter at higher speeds so the story does not outrun it
const TITLE_MIN_SEC = 2.2;
const TITLE_STALE_SEC = 25;     // a title that could not play by then is no longer news
const OPENING_FRACTION = 0.004; // "playing from the very top" (about the first second)
const ANNOUNCE_DELAY_MS = 700;  // let main.js's period announcement finish first
const PROGRESS_STEPS = 240;     // the hairline moves in this many steps over a dwell
const PANEL_GAP_PX = 12;
const PANEL_SETTLE_MS = 360;
const SLOT_MARGIN_PX = 16;      // mirrors .ms-slot (--s-4) and .ms-toast (540px) in css/overlays.css
const TOAST_MAX_WIDTH_PX = 540;
const TOAST_MIN_WIDTH_PX = 300;

const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

// One mark per milestone category (24 × 24, stroked in the event's colour).
const CATEGORIES = {
  cosmic: {
    label: 'Cosmos',
    icon: svg('<path d="M10.5 3.5c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7z"/><path d="M18.5 15.5v5M16 18h5"/>'),
  },
  geological: {
    label: 'Earth',
    icon: svg('<path d="M2.5 19.5l6.3-10.8 3.7 6 2.5-3.7 6.5 8.5z"/><path d="M6.9 12l1.9 1.4 1.8-1.7"/>'),
  },
  climatic: {
    label: 'Climate',
    icon: svg('<path d="M10 5a2 2 0 0 1 4 0v8.3a4.2 4.2 0 1 1-4 0z"/><path d="M12 9.5v5"/><circle class="solid" cx="12" cy="16.8" r="1.7"/>'),
  },
  biological: {
    label: 'Life',
    icon: svg('<path d="M12 20.5v-9"/><path d="M12 14.5c-4.6 0-6.8-2.4-6.8-6.5 4.3 0 6.8 2.1 6.8 6.5z"/><path d="M12 11.5c0-3.8 2.2-5.8 6.3-5.8 0 4-2.1 5.8-6.3 5.8z"/>'),
  },
  cultural: {
    label: 'Humanity',
    icon: svg('<path d="M12 3.5c.4 3.3 4.8 5 4.8 9.9a4.8 4.8 0 0 1-9.6 0c0-1.9.8-3.2 1.9-4.3.2 1.5.9 2.3 1.7 2.7-.5-3 .3-5.8 1.2-8.3z"/><path d="M12 20.5a2.2 2.2 0 0 0 2.2-2.2c0-1.3-1-2-2.2-3.3-1.2 1.3-2.2 2-2.2 3.3a2.2 2.2 0 0 0 2.2 2.2z"/>'),
  },
  crisis: {
    label: 'Crisis',
    icon: svg('<path d="M12 4.5l8.7 15H3.3z"/><path d="M12 10.5v4.2"/><circle class="solid" cx="12" cy="17" r="1"/>'),
  },
};
const FALLBACK_CATEGORY = {
  label: 'Milestone',
  icon: svg('<path d="M12 4l8 8-8 8-8-8z"/>'),
};
// The data's own category names win when js/data/milestones.js exports them.
for (const entry of Array.isArray(milestoneData.MILESTONE_CATEGORIES) ? milestoneData.MILESTONE_CATEGORIES : []) {
  if (entry && CATEGORIES[entry.id] && entry.label) CATEGORIES[entry.id].label = entry.label;
}

function wordCount(text) {
  return text ? text.trim().split(/\s+/).length : 0;
}

/** Seconds a comfortable reader needs for a toast (title + description). */
function readingSeconds(milestone) {
  const words = wordCount(milestone.name) + wordCount(milestone.description);
  return Math.max(MIN_DWELL_SEC, Math.min(LINGER_CAP_SEC, 1.5 + words * 0.28));
}

/** "539 – 252 million years ago", "2.5 billion – 539 million years ago", "66 million years ago – today". */
function rangeYearsAgo(startMa, endMa) {
  const from = formatYearsAgo(startMa);
  const to = formatYearsAgo(endMa);
  if (!/\d/.test(to)) return `${from} – ${to.toLowerCase()}`;
  const unit = (text) => (text.match(/\s(billion|million)\s/) || [])[1] || '';
  const shared = unit(from) && unit(from) === unit(to);
  const lead = from.replace(shared ? /\s(billion|million) years ago$/ : /\syears ago$/, '');
  return `${lead} – ${to}`;
}

/**
 * The chapter-level units that get a title card: ERAS from the timeline data when it exports
 * them, otherwise one unit per eon, with the Phanerozoic split into its eras.
 */
function buildEraUnits() {
  const listed = timelineData.ERAS || timelineData.eras;
  if (Array.isArray(listed) && listed.length) {
    return listed.map((era) => {
      const kind = era.kind || (/\beon$/i.test(era.name) ? 'eon' : 'era');
      return {
        id: era.id || era.name,
        kind,
        name: String(era.name).replace(new RegExp(`\\s+${kind}$`, 'i'), ''),
        startMa: era.startMa,
        endMa: era.endMa,
        tagline: era.tagline || '',
      };
    });
  }
  const units = [];
  for (const row of timelineData.timeline || []) {
    const isEra = row.eon === 'Phanerozoic' && !!row.era;
    const name = isEra ? row.era : row.eon;
    const last = units[units.length - 1];
    if (last && last.name === name) last.endMa = row.endMa;
    else units.push({ id: name, kind: isEra ? 'era' : 'eon', name, startMa: row.startMa, endMa: row.endMa, tagline: row.description || '' });
  }
  return units;
}

export class MilestoneOverlay {
  constructor(app) {
    this.app = app;
    this.overlay = document.getElementById('milestone-overlay');
    // Order matters: the era veil lies over the toast, so a title dims everything else on stage.
    this.overlay.innerHTML = `
      <div class="ms-slot">
        <div class="ms-toast glass">
          <div class="ms-icon" aria-hidden="true"></div>
          <div class="ms-text">
            <div class="ms-kicker kicker"><span class="ms-cat"></span><span class="ms-when num"></span><span class="ms-place"></span></div>
            <div class="ms-title display" id="milestone-title"></div>
            <p class="ms-body" id="milestone-body"></p>
          </div>
          <div class="ms-progress" aria-hidden="true"><span class="ms-progress-bar"></span></div>
        </div>
      </div>
      <div class="era-veil" aria-hidden="true"></div>
      <div class="era-title" aria-hidden="true">
        <div class="era-kicker kicker"></div>
        <div class="era-name display"></div>
        <div class="era-range num"></div>
        <div class="era-tagline"></div>
      </div>`;
    // The layer itself is always present (and click-through); its two children fade in and out.
    this.overlay.classList.remove('hidden');

    const q = (selector) => this.overlay.querySelector(selector);
    this.veilEl = q('.era-veil');
    this.titleCard = q('.era-title');
    this.eraKickerEl = q('.era-kicker');
    this.eraNameEl = q('.era-name');
    this.eraRangeEl = q('.era-range');
    this.eraTaglineEl = q('.era-tagline');
    this.toastEl = q('.ms-toast');
    this.iconEl = q('.ms-icon');
    this.kickerEl = q('.ms-kicker');
    this.catEl = q('.ms-cat');
    this.whenEl = q('.ms-when');
    this.placeEl = q('.ms-place');
    this.titleEl = q('#milestone-title');
    this.bodyEl = q('#milestone-body');
    this.progressEl = q('.ms-progress-bar');

    // Toast state
    this.current = null;        // { m, elapsed, linger, suspended, resumeUntil }
    this.queue = [];            // milestones waiting their turn, oldest first
    this.shown = new Set();     // ids already shown in this continuous run (reset on scrubs)
    this._gapUntil = 0;
    this._progressStep = -1;
    this._ended = false;        // playback reached the present: let the last toast finish
    this._introOpen = false;
    this._started = false;
    this._sayTimer = null;

    // Era title state
    this._units = buildEraUnits();
    this._unitsById = new Map(this._units.map((unit) => [unit.id, unit]));
    this._unit = null;
    this._narrating = false;
    this._pendingTitle = null;  // { unit, at }
    this._titleUntil = 0;
    this._openingDone = false;

    app.bus.on('clock:end', () => { this._ended = true; });
    // The intro dialog owns the stage while it is open (js/ui/intro.js reports itself as a panel).
    app.bus.on('panel:changed', ({ name, open }) => {
      if (name === 'intro') {
        this._introOpen = !!open;
      } else if (name === 'legend' || name === 'chapters') {
        // Measure once the panel has been laid out, and again after any entrance transition.
        requestAnimationFrame(() => this._fitBetweenPanels());
        setTimeout(() => this._fitBetweenPanels(), PANEL_SETTLE_MS);
      }
    });
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(() => this._fitBetweenPanels()).observe(this.overlay);
    }
  }

  update(frame) {
    if (!this._started || frame.jumped) {
      this._started = true;
      this._restart(frame);
    } else {
      if (frame.playing) this._ended = false;
      this._watchEra(frame);
      this._watchMilestone(frame);
    }
    this._runTitle(frame);
    this._runToast(frame);
    this._flagNarrating(!!this.current || this.queue.length > 0);
  }

  /** <html data-ov-narrating>: a toast is up or waiting (read by the finale in js/ui/intro.js). */
  _flagNarrating(on) {
    if (on === this._narrating) return;
    this._narrating = on;
    if (on) document.documentElement.setAttribute('data-ov-narrating', '');
    else document.documentElement.removeAttribute('data-ov-narrating');
  }

  // ---- story position changed discontinuously (boot, scrub, chapter jump, restart) -----------

  _restart(frame) {
    this.queue.length = 0;
    this.shown.clear();
    this._ended = false;
    this._gapUntil = 0;
    this._pendingTitle = null;
    this._unit = this._unitAt(frame.timeMa);
    this._hideTitle();
    clearTimeout(this._sayTimer);

    // "Begin" and "Watch again" land here already playing from the top: open with the first
    // eon's title and let the first milestone follow it.
    const opening = frame.playing && frame.fraction < OPENING_FRACTION && !!this._unit;
    this._openingDone = opening;
    if (opening) this._pendingTitle = { unit: this._unit, at: frame.nowSec };

    const m = this._introOpen ? null : frame.milestone;
    if (m && !opening && this._stageIsFree(frame)) {
      // No queue, no ceremony: show whatever is active at the new moment.
      this._showToast(m);
    } else {
      // At the opening it follows the title; inside an extinction it waits for the card to go.
      this._clearToast();
      if (m) this.queue.push(m);
    }
  }

  // ---- era titles ----------------------------------------------------------------------------

  _unitAt(timeMa) {
    // The timeline's own lookup decides (eons before the Phanerozoic, eras within it).
    if (typeof timelineData.getEraAtTime === 'function') {
      const era = timelineData.getEraAtTime(timeMa);
      const unit = era && this._unitsById.get(era.id || era.name);
      if (unit) return unit;
    }
    const current = this._unit;
    if (current && timeMa <= current.startMa && timeMa > current.endMa) return current;
    // Same boundary convention as getPeriodAtTime(); of nested units the most specific wins.
    let best = null;
    for (const unit of this._units) {
      if (timeMa > unit.startMa || timeMa <= unit.endMa) continue;
      if (!best || unit.startMa - unit.endMa < best.startMa - best.endMa) best = unit;
    }
    if (best) return best;
    if (!this._units.length) return null;
    return timeMa > this._units[0].startMa ? this._units[0] : this._units[this._units.length - 1];
  }

  _watchEra(frame) {
    const unit = this._unitAt(frame.timeMa);
    if (unit !== this._unit) {
      this._unit = unit;
      if (unit && frame.playing) this._pendingTitle = { unit, at: frame.nowSec };
    }
    // Pressing play at the very beginning opens with the first eon's title; a toast that was
    // already resting on the paused opening frame steps back and follows it.
    if (!this._openingDone && frame.playing) {
      this._openingDone = true;
      if (unit && frame.fraction < OPENING_FRACTION) {
        this._pendingTitle = { unit, at: frame.nowSec };
        const cur = this.current;
        if (cur && cur.elapsed < 1) {
          this.shown.delete(cur.m.id);
          this.queue.unshift(cur.m);
          this._clearToast();
        }
      }
    }
  }

  _runTitle(frame) {
    const now = frame.nowSec;
    const pending = this._pendingTitle;
    if (pending) {
      if (now - pending.at > TITLE_STALE_SEC) this._pendingTitle = null;
      else if (frame.playing && !this._introOpen && this._stageIsFree(frame)) {
        this._pendingTitle = null;
        this._showTitle(pending.unit, frame);
      }
    }
    if (this._titleUntil && now >= this._titleUntil) this._hideTitle();
  }

  /**
   * Titles and toasts wait for a mass extinction to finish. The extinction card
   * (js/ui/extinctionOverlay.js) flags itself on <html data-ov-crisis>; once it has left during the
   * aftermath the stage is free, a moment before frame.crisis itself ends. The attribute is only
   * read during an aftermath.
   */
  _stageIsFree(frame) {
    if (!frame.crisis) return true;
    return frame.crisis.phase === 'aftermath' && !document.documentElement.hasAttribute('data-ov-crisis');
  }

  _showTitle(unit, frame) {
    this.eraKickerEl.textContent = unit.kind === 'eon' ? 'Eon' : 'Era';
    this.eraNameEl.textContent = unit.name;
    this.eraRangeEl.textContent = rangeYearsAgo(unit.startMa, unit.endMa);
    this.eraTaglineEl.textContent = unit.tagline;
    this.veilEl.classList.add('is-in');
    this.titleCard.classList.add('is-in');
    this._titleUntil = frame.nowSec + Math.max(TITLE_MIN_SEC, TITLE_SEC / Math.sqrt(Math.max(1, frame.speed)));
    const rank = unit.kind === 'eon' ? 'Eon' : 'Era';
    this._say(`${unit.name} ${rank} begins.${unit.tagline ? ` ${unit.tagline}.` : ''}`, 1200);
  }

  _hideTitle() {
    if (!this._titleUntil) return;
    this._titleUntil = 0;
    this.veilEl.classList.remove('is-in');
    this.titleCard.classList.remove('is-in');
  }

  // ---- milestone toasts ----------------------------------------------------------------------

  _watchMilestone(frame) {
    const m = frame.milestone;
    if (!m || this.shown.has(m.id)) return;
    if (this.current && this.current.m.id === m.id) return;
    if (this.queue.some((queued) => queued.id === m.id)) return;
    this.queue.push(m);
    if (this.queue.length > QUEUE_LIMIT) {
      // Too much news at once (high speeds): let go of the least important, oldest first.
      let drop = 0;
      for (let i = 1; i < this.queue.length; i++) {
        if ((this.queue[i].priority || 0) < (this.queue[drop].priority || 0)) drop = i;
      }
      this.queue.splice(drop, 1);
    }
  }

  _runToast(frame) {
    const now = frame.nowSec;
    // The finale (js/ui/intro.js, <html data-ov-finale>) has the last word: once it is up the
    // story is over, and nothing is left to narrate. (On a jump the finale is on its way out —
    // intro.js updates after this layer — and the toast belongs to the new moment.)
    if ((this.current || this.queue.length) && !frame.jumped
      && document.documentElement.hasAttribute('data-ov-finale')) {
      this.queue.length = 0;
      this._clearToast();
      return;
    }
    // The extinction card has the stage from the hold until it has faded in the aftermath.
    const blocked = this._introOpen || !this._stageIsFree(frame);
    const cur = this.current;

    if (!cur) {
      if (blocked || this._titleUntil || this._pendingTitle || now < this._gapUntil || !this.queue.length) return;
      // A toast that a mass extinction would sweep away within moments waits until it is over.
      if (frame.playing && this._secondsToNextCrisis(frame) < CRISIS_LOOKAHEAD_SEC) return;
      const next = this._nextFromQueue(frame);
      if (next) this._showToast(next);
      return;
    }

    if (blocked) {
      if (!cur.suspended) {
        cur.suspended = true;
        this.toastEl.classList.remove('is-in');
      }
      return;
    }
    if (cur.suspended) {
      cur.suspended = false;
      if (cur.elapsed >= MIN_DWELL_BUSY_SEC || this._isStale(cur.m, frame)) {
        // It was read before the interruption, or the story has moved on: no encore.
        this._clearToast();
        this._gapUntil = now + GAP_SEC;
        return;
      }
      cur.resumeUntil = cur.elapsed + RESUME_SEC;
      this.toastEl.classList.add('is-in');
    }

    // Dwell is counted in real seconds of playback; a pause freezes it so the toast can be read
    // at leisure. At the very end of the story the clock stops by itself — keep counting then.
    const ticking = frame.playing || this._ended;
    if (ticking) cur.elapsed += frame.dtSec;

    const waiting = this.queue.length;
    const windowActive = !!frame.milestone && frame.milestone.id === cur.m.id;
    const rank = cur.m.priority || 0;
    let life;
    if (waiting) {
      // While the story moves on, the current toast is shortened when the queue is busy, when a
      // more important beat is waiting, or when the next one would be stale by the time a full
      // dwell had passed. Once the story has stopped at the present, every toast gets its minimum.
      const fullWaitSec = (Math.max(0, MIN_DWELL_SEC - cur.elapsed) + GAP_SEC) * frame.speed;
      const urgent = frame.playing && (waiting >= 2
        || this.queue.some((m) => (m.priority || 0) > rank)
        || this._isStale(this.queue[0], frame, fullWaitSec));
      life = urgent ? MIN_DWELL_BUSY_SEC : MIN_DWELL_SEC;
    } else if (windowActive && frame.playing) {
      const windowEndMa = Math.max(TIMING.endTimeMa, cur.m.timeMa - cur.m.durationMa / 2);
      const windowLeft = (maToScreenSeconds(windowEndMa) - maToScreenSeconds(frame.timeMa)) / Math.max(0.01, frame.speed);
      life = Math.min(MAX_DWELL_SEC, Math.max(cur.linger, cur.elapsed + windowLeft));
    } else {
      life = cur.linger;
    }
    if (cur.resumeUntil) life = Math.max(life, cur.resumeUntil);

    if (ticking && cur.elapsed >= life) {
      this._clearToast();
      this._gapUntil = now + GAP_SEC;
      return;
    }
    const step = Math.round(Math.max(0, 1 - cur.elapsed / life) * PROGRESS_STEPS);
    if (step !== this._progressStep) {
      this._progressStep = step;
      this.progressEl.style.transform = `scaleX(${(step / PROGRESS_STEPS).toFixed(4)})`;
    }
  }

  /** Real seconds of playback, at the current speed, until the next mass-extinction window opens. */
  _secondsToNextCrisis(frame) {
    const here = maToScreenSeconds(frame.timeMa);
    let ahead = Infinity;
    for (const ext of extinctions) {
      const opensAt = maToScreenSeconds(ext.timeMa + ext.durationMa / 2) - here;
      if (opensAt > 0 && opensAt < ahead) ahead = opensAt;
    }
    return ahead / Math.max(0.25, frame.speed);
  }

  /**
   * The waiting milestone to show next. Toasts keep story order; the only exception is a more
   * important beat that would go stale if it waited behind the ones in front of it — then it
   * goes first, and those older, lesser ones are dropped rather than shown after it, so the
   * toasts never run backwards in time. At 1× that hardly ever happens; at 4× it is what lets
   * the headlines through.
   */
  _nextFromQueue(frame) {
    const fresh = this.queue.filter((m) => !this._isStale(m, frame));
    this.queue.length = 0;
    if (!fresh.length) return null;
    // Screen-seconds the story moves on per toast waited out (none once it has stopped).
    const perToast = frame.playing ? (MIN_DWELL_BUSY_SEC + GAP_SEC) * Math.max(0.25, frame.speed) : 0;
    const headRank = fresh[0].priority || 0;
    let pick = 0;
    for (let i = 1; i < fresh.length; i++) {
      if ((fresh[i].priority || 0) > headRank && this._isStale(fresh[i], frame, i * perToast)) {
        pick = i;
        break;
      }
    }
    this.queue.push(...fresh.slice(pick + 1));
    return fresh[pick];
  }

  /**
   * Has the story moved too far past this milestone's window for its toast to still make sense
   * (or will it have, `aheadSec` screen-seconds from now)?
   */
  _isStale(m, frame, aheadSec = 0) {
    const windowEndMa = Math.max(TIMING.endTimeMa, m.timeMa - m.durationMa / 2);
    const late = maToScreenSeconds(frame.timeMa) - maToScreenSeconds(windowEndMa) + aheadSec;
    // The story's headline moments (priority ≥ 1) are worth showing a little later still.
    return late > STALE_SCREEN_SEC * (1 + Math.max(0, m.priority || 0));
  }

  _showToast(m) {
    const category = CATEGORIES[m.category] || FALLBACK_CATEGORY;
    this.iconEl.innerHTML = category.icon;
    this.catEl.textContent = category.label;
    this.whenEl.textContent = ` · ${formatYearsAgo(m.timeMa)}`;
    const place = m.location && m.location.name ? String(m.location.name) : '';
    this.kickerEl.classList.remove('is-stacked');
    this.placeEl.textContent = place ? ` · ${place}` : '';
    if (place && this.placeEl.offsetParent) {
      // A place that does not fit beside the date would break mid-name: give it its own line.
      const rects = this.placeEl.getClientRects();
      const top = this.catEl.getBoundingClientRect().top;
      if (rects.length > 1 || (rects[0] && rects[0].top > top + 2)) {
        this.kickerEl.classList.add('is-stacked');
        this.placeEl.textContent = place;
      }
    }
    this.titleEl.textContent = m.name;
    this.bodyEl.textContent = m.description || '';
    if (m.color) this.toastEl.style.setProperty('--event-color', m.color);
    else this.toastEl.style.removeProperty('--event-color');
    this._progressStep = PROGRESS_STEPS;
    this.progressEl.style.transform = '';
    this.toastEl.classList.add('is-in');

    this.current = { m, elapsed: 0, linger: readingSeconds(m), suspended: false, resumeUntil: 0 };
    this.shown.add(m.id);
    this._say(`${m.name}, ${formatYearsAgo(m.timeMa)}. ${m.description || ''}`, ANNOUNCE_DELAY_MS);
  }

  _clearToast() {
    this.current = null;
    this.toastEl.classList.remove('is-in');
  }

  /** One polite announcement at a time; a newer one replaces a pending older one. */
  _say(text, delayMs) {
    clearTimeout(this._sayTimer);
    this._sayTimer = setTimeout(() => this.app.announce(text), delayMs);
  }

  /**
   * The legend (top-left) and chapters (top-right) panels share the top edge with the toast. When
   * an open panel would overlap it, the toast re-centres in the space that is left; if there is
   * no useful space it keeps the full width and the panel simply covers part of it.
   */
  _fitBetweenPanels() {
    const stage = this.overlay.getBoundingClientRect();
    if (!stage.width) return;
    const inset = (id, side) => {
      const panel = document.getElementById(id);
      if (!panel || panel.classList.contains('hidden')) return 0;
      const rect = panel.getBoundingClientRect();
      if (!rect.width || rect.width > stage.width * 0.6) return 0;
      return side === 'left' ? rect.right - stage.left + PANEL_GAP_PX : stage.right - rect.left + PANEL_GAP_PX;
    };
    let left = inset('legend-panel', 'left');
    let right = inset('chapters-panel', 'right');
    // Where the toast sits when nothing is in the way (see .ms-slot / .ms-toast).
    const restWidth = Math.min(TOAST_MAX_WIDTH_PX, stage.width - 2 * SLOT_MARGIN_PX);
    const restEdge = (stage.width - restWidth) / 2;
    const clear = left <= restEdge && right <= restEdge;
    if (clear || stage.width - left - right < TOAST_MIN_WIDTH_PX) { left = 0; right = 0; }
    const set = (name, px) => {
      if (px > 0) this.overlay.style.setProperty(name, `${Math.round(px)}px`);
      else this.overlay.style.removeProperty(name);
    };
    set('--ms-left', left);
    set('--ms-right', right);
  }
}
