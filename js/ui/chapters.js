// Chapters — the table of contents of the story, laid out like a track list: number, title, age
// range, a one-line blurb and how long the chapter plays. The chapter that holds the current
// moment is highlighted and shows how far through it the story is.
// Toggled from the toolbar ('panel:toggle' { name: 'chapters' }); '[' and ']' (and the timeline's
// skip buttons) step through chapters with 'chapter:step' { dir }.
//
// Chapters come from js/data/chapters.js. If that module is missing or empty the list is built
// from the eras of the time scale, with the five mass extinctions as extra stops, so the panel
// is never empty.

import { TIMING } from '../config.js';
import * as timelineData from '../data/timeline.js';
import * as extinctionData from '../data/extinctions.js';
import { maToScreenSeconds, screenSecondsToMa, formatClock } from '../engine/timeScale.js';
import { formatMa } from '../util/format.js';
import { FloatingPanel, closeButtonMarkup, safely, optionalModule } from './legend.js';

const chapterData = await optionalModule(() => import('../data/chapters.js'));

// "Previous" restarts the current chapter when the story is at least this far into it.
const RESTART_AFTER_SECONDS = 2;
// An extinction stop lands this much playback before the event, so its opening is not missed.
const EVENT_LEAD_SECONDS = 1.5;
// At and below this width the panel covers most of the map, so choosing a chapter closes it.
const CLOSE_ON_PICK_MAX = 900;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/**
 * The stops of the story, oldest first:
 *   { id, title, startMa, endMa, blurb, view?, kind: 'chapter' | 'event', color? }
 * A 'chapter' owns the stretch of time up to the next chapter; an 'event' is a point to jump to.
 */
function buildStops() {
  const authored = Array.isArray(chapterData?.chapters) ? chapterData.chapters : [];
  const valid = authored
    .filter((c) => c && typeof c.title === 'string' && Number.isFinite(c.startMa))
    .sort((a, b) => b.startMa - a.startMa);
  if (valid.length) {
    return valid.map((c, i) => ({
      id: c.id || `chapter-${i}`,
      title: c.title,
      startMa: Math.min(c.startMa, TIMING.startTimeMa),
      endMa: Number.isFinite(c.endMa) ? c.endMa : (valid[i + 1] ? valid[i + 1].startMa : TIMING.endTimeMa),
      blurb: c.blurb || '',
      view: c.view || null,
      kind: 'chapter',
    }));
  }
  return fallbackStops();
}

/** Eras of the time scale plus the Big Five, when no chapters were authored. */
function fallbackStops() {
  const stops = [];
  const rows = Array.isArray(timelineData.timeline) ? timelineData.timeline : [];
  const eras = Array.isArray(timelineData.ERAS) ? timelineData.ERAS : null;
  if (eras && eras.length) {
    for (const era of eras) {
      stops.push({
        id: `era-${era.id}`, title: era.name, startMa: Math.min(era.startMa, TIMING.startTimeMa), endMa: era.endMa,
        blurb: era.tagline || '', view: null, kind: 'chapter',
      });
    }
  } else {
    // Group the period rows: eons before the Phanerozoic, eras within it.
    for (const row of rows) {
      const name = row.eon === 'Phanerozoic' && row.era ? row.era : row.eon;
      const last = stops[stops.length - 1];
      if (last && last.title === name) {
        last.endMa = row.endMa;
      } else {
        stops.push({
          id: `era-${name.toLowerCase()}`, title: name, startMa: Math.min(row.startMa, TIMING.startTimeMa), endMa: row.endMa,
          blurb: row.description || '', view: null, kind: 'chapter',
        });
      }
    }
  }
  const events = Array.isArray(extinctionData.extinctions) ? extinctionData.extinctions : [];
  for (const ext of events) {
    const leadingEdge = ext.timeMa + ext.durationMa / 2;
    stops.push({
      id: `event-${ext.id}`,
      title: ext.subtitle ? `${ext.name} — ${ext.subtitle}` : ext.name,
      startMa: screenSecondsToMa(Math.max(0, maToScreenSeconds(leadingEdge) - EVENT_LEAD_SECONDS)),
      endMa: ext.timeMa - ext.durationMa / 2,
      eventMa: ext.timeMa,
      blurb: ext.causeShort || ext.description || '',
      view: null, kind: 'event', color: ext.color,
    });
  }
  stops.sort((a, b) => b.startMa - a.startMa);
  return stops;
}

/**
 * Where a jump to a chapter lands. A chapter that begins inside a mass-extinction window (many
 * begin exactly on one) starts just after it instead: landing mid-window would open on a frozen
 * fragment of the event, which belongs to the chapter before.
 */
function landingMa(stop) {
  if (stop.kind !== 'chapter') return stop.startMa;
  const events = Array.isArray(extinctionData.extinctions) ? extinctionData.extinctions : [];
  for (const ext of events) {
    const edge = ext.timeMa - ext.durationMa / 2;
    if (stop.startMa <= ext.timeMa + ext.durationMa / 2 && stop.startMa >= edge) {
      return Math.max(stop.endMa, edge - Math.min(0.001, ext.durationMa / 100));
    }
  }
  return stop.startMa;
}

export class Chapters extends FloatingPanel {
  constructor(app) {
    super(app, 'chapters', 'chapters-panel', 'btn-chapters');
    this.stops = safely('Chapters: authored list', buildStops)
      || safely('Chapters: fallback list', fallbackStops) || [];
    this.chapters = this.stops.filter((s) => s.kind === 'chapter');
    this._currentId = null;
    this._progressKey = -1;
    this._build();

    app.bus.on('chapter:step', ({ dir }) => this.step(dir < 0 ? -1 : 1));
  }

  onOpen(viaKeyboard) {
    this._sync(this.app.clock.currentTimeMa, true);
    const current = this._itemFor(this._currentId) || this.items[0];
    this._setRover(current);
    // Open with the current chapter in the middle of the list, its neighbours in view.
    if (current) {
      const box = this.body.getBoundingClientRect();
      const rect = current.getBoundingClientRect();
      this.body.scrollTop += rect.top + rect.height / 2 - (box.top + box.height / 2);
    }
    if (viaKeyboard && current) current.focus({ preventScroll: true });
  }

  /** Highlights the chapter that holds the current moment and its progress (panel open only). */
  update(frame) {
    super.update(frame);
    if (this.isOpen) this._sync(frame.timeMa, false);
  }

  /** Jump to the previous / next stop relative to the current time. */
  step(dir) {
    const { app, stops } = this;
    if (!stops.length) return;
    const now = app.clock.currentTimeMa;
    const pos = maToScreenSeconds(now);
    // Index of the stop the story is in: the last one that has already started.
    let index = -1;
    for (let i = 0; i < stops.length; i++) if (stops[i].startMa >= now) index = i;

    let target;
    if (dir > 0) {
      target = stops[index + 1];
      if (!target) {
        app.seek(TIMING.endTimeMa);
        if (this.isOpen) this._follow();
        app.notice('The present day — the end of the story');
        return;
      }
    } else {
      const here = stops[Math.max(0, index)];
      const into = pos - maToScreenSeconds(landingMa(here));
      target = into > RESTART_AFTER_SECONDS || index <= 0 ? here : stops[index - 1];
    }
    // Moves the clock synchronously: the timeline's skip buttons check clock.jumps right after
    // emitting 'chapter:step' to know that this component handled it.
    app.seek(landingMa(target));
    // With the panel open the highlight moving down the list says it already.
    if (this.isOpen) this._follow();
    else app.notice(this._label(target));
    app.announce(this._label(target));
  }

  /**
   * After an explicit step the list comes along: highlight, roving stop and scroll position — and
   * keyboard focus too if it was in the list, so focus and highlight never point at two chapters.
   */
  _follow() {
    this._sync(this.app.clock.currentTimeMa, false);
    const item = this._itemFor(this._currentId);
    if (!item) return;
    this._setRover(item);
    this._reveal(item, true);
    if (this.list.contains(document.activeElement)) item.focus({ preventScroll: true });
  }

  _label(stop) {
    if (stop.kind !== 'chapter') return stop.title;
    return `Chapter ${this.chapters.indexOf(stop) + 1} · ${stop.title}`;
  }

  // ---- DOM -----------------------------------------------------------------------------------

  _build() {
    const total = formatClock(maToScreenSeconds(TIMING.endTimeMa));
    this.panel.innerHTML = `
      <header class="panel-head">
        <h2 class="panel-title display">Chapters</h2>
        <span class="panel-meta num" title="Playing time of the whole story at 1× speed">${this.chapters.length} chapters · ${total}</span>
        ${closeButtonMarkup('Close chapters')}
      </header>
      <div class="panel-body">
        <ol class="ch-list"></ol>
      </div>
      <footer class="panel-foot"><kbd>[</kbd> <kbd>]</kbd> <span>step through the chapters from anywhere</span></footer>`;
    this.body = this.panel.querySelector('.panel-body');
    this.watchScroll(this.body);
    this.list = this.panel.querySelector('.ch-list');
    this.panel.querySelector('.dlg-close').addEventListener('click', () => this.close());

    this.items = [];
    let number = 0;
    this.stops.forEach((stop, i) => {
      const item = el('button', `ch-item ch-${stop.kind}`);
      item.type = 'button';
      item.dataset.index = String(i);
      item.tabIndex = -1;

      const marker = el('span', 'ch-num num');
      if (stop.kind === 'chapter') {
        number += 1;
        marker.textContent = String(number).padStart(2, '0');
      } else {
        marker.classList.add('ch-diamond');
        marker.style.setProperty('--event-color', stop.color || 'currentColor');
      }
      marker.setAttribute('aria-hidden', 'true');

      const seconds = maToScreenSeconds(stop.endMa) - maToScreenSeconds(stop.startMa);
      const range = stop.kind === 'chapter'
        ? `${formatMa(stop.startMa)} – ${stop.endMa <= TIMING.endTimeMa ? 'today' : formatMa(stop.endMa)}`
        : formatMa(stop.eventMa);
      const text = el('span', 'ch-text');
      const top = el('span', 'ch-top');
      top.append(el('span', 'ch-title display', stop.title));
      if (stop.kind === 'chapter') {
        const length = el('span', 'ch-length num', formatClock(seconds));
        length.title = 'Playing time at 1× speed';
        top.append(length);
      }
      text.append(top, el('span', 'ch-range num', range));
      if (stop.blurb) text.append(el('span', 'ch-blurb', stop.blurb));

      const bar = el('span', 'ch-progress');
      bar.setAttribute('aria-hidden', 'true');
      item.append(marker, text, bar);
      item.setAttribute('aria-label',
        `${stop.kind === 'chapter' ? `Chapter ${number}: ` : ''}${stop.title}, ${range}.${stop.blurb ? ` ${stop.blurb}` : ''}`);

      const wrap = el('li');
      wrap.appendChild(item);
      this.list.appendChild(wrap);
      this.items.push(item);
    });
    if (this.items[0]) this.items[0].tabIndex = 0;

    this.list.addEventListener('click', (e) => {
      const item = e.target.closest('.ch-item');
      if (item) this._pick(this.stops[Number(item.dataset.index)]);
    });
    // One Tab stop for the whole list; the arrow keys walk it.
    this.list.addEventListener('keydown', (e) => {
      const i = this.items.indexOf(e.target.closest('.ch-item'));
      if (i < 0) return;
      let j = null;
      if (e.key === 'ArrowDown') j = Math.min(this.items.length - 1, i + 1);
      else if (e.key === 'ArrowUp') j = Math.max(0, i - 1);
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = this.items.length - 1;
      if (j == null) return;
      e.preventDefault(); // keep these keys away from the global time shortcuts
      this._setRover(this.items[j]);
      this.items[j].focus({ preventScroll: true });
      this._reveal(this.items[j], false);
    });
  }

  _pick(stop) {
    if (!stop) return;
    const { app } = this;
    if (stop.view && stop.view !== app.state.view) app.setView(stop.view);
    app.seek(landingMa(stop), { play: true });
    app.announce(this._label(stop));
    if (window.innerWidth <= CLOSE_ON_PICK_MAX) this.close();
  }

  _itemFor(id) {
    const i = this.stops.findIndex((s) => s.id === id);
    return i < 0 ? null : this.items[i];
  }

  _setRover(item) {
    if (!item) return;
    for (const other of this.items) other.tabIndex = other === item ? 0 : -1;
  }

  /** Scroll the list (never the page) so `item` is in view. */
  _reveal(item, smooth) {
    if (!item) return;
    const box = this.body.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    const margin = 12;
    let delta = 0;
    if (rect.top < box.top + margin) delta = rect.top - box.top - margin;
    else if (rect.bottom > box.bottom - margin) delta = rect.bottom - box.bottom + margin;
    if (!delta) return;
    const top = this.body.scrollTop + delta;
    if (smooth && !this.app.state.reducedMotion) this.body.scrollTo({ top, behavior: 'smooth' });
    else this.body.scrollTop = top;
  }

  _sync(timeMa, force) {
    // The chapter in progress, and (in the fallback list) an extinction whose window is open.
    let current = null;
    for (const stop of this.stops) {
      if (stop.startMa < timeMa) break;
      if (stop.kind === 'chapter' || timeMa >= stop.endMa) current = stop;
    }
    if (!current) current = this.stops[0] || null;
    const id = current ? current.id : null;

    if (id !== this._currentId || force) {
      const changed = id !== this._currentId;
      this._currentId = id;
      this._progressKey = -1;
      this.stops.forEach((stop, i) => {
        const item = this.items[i];
        const on = stop.id === id;
        if (on) item.setAttribute('aria-current', 'true');
        else item.removeAttribute('aria-current');
        item.classList.toggle('is-past', !on && stop.endMa >= timeMa && stop.kind === 'chapter');
      });
      const item = this._itemFor(id);
      // Follow the story, unless the viewer is walking the list with the keyboard.
      if (item && changed && !this.list.contains(document.activeElement)) {
        this._setRover(item);
        this._reveal(item, !force);
      }
    }

    if (!current) return;
    const start = maToScreenSeconds(current.startMa);
    const length = Math.max(1e-6, maToScreenSeconds(current.endMa) - start);
    const progress = Math.max(0, Math.min(1, (maToScreenSeconds(timeMa) - start) / length));
    const key = Math.round(progress * 200);
    if (key !== this._progressKey) {
      this._progressKey = key;
      const item = this._itemFor(id);
      if (item) item.style.setProperty('--progress', `${(key / 2).toFixed(1)}%`);
    }
  }
}
