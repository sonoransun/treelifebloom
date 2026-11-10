// Help dialog — how to read the visualization, the keyboard and pointer controls, and an honest
// account of what in the data is measured, reconstructed or editorial. Also holds the viewer's
// motion preference (follow the system / reduced / full).
// Opened by 'panel:toggle' { name: 'help' } (the toolbar "?" button and the ? key); reports
// 'panel:changed'. A modal dialog: see ModalShell in speciesModal.js.

import { TIMING, LIFE_GROUPS } from '../config.js';
import * as interpolator from '../engine/interpolator.js';
import { maToFraction, totalScreenSeconds, formatClock } from '../engine/timeScale.js';
import { extinctions } from '../data/extinctions.js';
import { timeline } from '../data/timeline.js';
import { earthClock, formatDuration, formatYearsAgo } from '../util/format.js';
import { SHORTCUTS } from './shortcuts.js';
import { glyphSvg, wireTabs, closeButtonMarkup, safely } from './legend.js';
import { ModalShell } from './speciesModal.js';

// The landmark used in the worked examples: the start of the Cambrian explosion of animal life.
const CAMBRIAN_START_MA = timeline.find((row) => row.period === 'Cambrian')?.startMa ?? 538.8;
const HUMAN_ID = 'homo_sapiens';
// The chart's base of the Hadean (the Solar System's oldest solids); see js/data/timeline.js.
const CHART_BASE_MA = 4567;

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const MODIFIER_KEYS = new Set(['Shift', 'Ctrl', 'Alt', 'Cmd', 'Option']);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const pct = (fraction) => `${Math.round(fraction * 100)}%`;

/** "5 minutes 46 seconds" — the same running time the timeline's clock shows as 5:46. */
function minutesAndSeconds(seconds) {
  const [m, s] = formatClock(seconds).split(':').map(Number);
  const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  return s ? `${plural(m, 'minute')} ${plural(s, 'second')}` : plural(m, 'minute');
}

/**
 * How far back the rigid-plate model reaches, in Ma — or null when the engine has no such model
 * (js/engine/interpolator.js exports getKinematicRangeMa() only when it moves real coastlines
 * on plates; without it every continent is a hand-drawn outline).
 */
function plateModelReachMa() {
  try {
    const ma = interpolator.getKinematicRangeMa?.();
    return Number.isFinite(ma) && ma > 0 ? ma : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Illustrations for "How to read this" (ink follows the text colour via currentColor)
// ---------------------------------------------------------------------------------------------

function art(inner) {
  return `<svg viewBox="0 0 72 48" width="72" height="48" aria-hidden="true" focusable="false">${inner}</svg>`;
}

function viewsArt() {
  return art(`
    <g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
      <ellipse cx="13" cy="24" rx="10" ry="6.5"/><path d="M3.6 22h18.8M4.6 27h16.8M13 17.5v13"/>
      <circle cx="36" cy="24" r="8.5"/><path d="M27.5 24h17M36 15.5c-4 3-4 14 0 17M36 15.5c4 3 4 14 0 17"/>
      <path d="M59 34V24M59 28c-4-1-6.5-3.5-6.5-7M59 26c4-1 6.5-4 6.5-8M59 24c0-3 1-5.5 3-7.5"/>
    </g>
    <g fill="var(--accent)"><circle cx="52.5" cy="20" r="1.8"/><circle cx="65.5" cy="17" r="1.8"/><circle cx="62.3" cy="15.6" r="1.8"/></g>`);
}

function markersArt() {
  // Three families with clearly different shapes (by id, or by position if the ids ever change).
  const group = (id, fallback) => LIFE_GROUPS.find((g) => g.id === id) || LIFE_GROUPS[fallback % LIFE_GROUPS.length];
  const plants = group('plants', 1);
  const arthropods = group('arthropods', 3);
  const reptiles = group('reptiles', 5);
  const glyph = (family, x, y, size) => (family
    ? `<g transform="translate(${x - size / 2} ${y - size / 2})">${glyphSvg(family.glyph, family.color, size)}</g>`
    : '');
  return art(`
    ${glyph(plants, 12, 30, 9)}
    ${glyph(arthropods, 30, 22, 13)}
    ${glyph(reptiles, 54, 24, 17)}
    <circle cx="54" cy="24" r="13" fill="none" stroke="${reptiles ? reptiles.color : 'currentColor'}" stroke-width="1.2" opacity=".7"/>
    <circle cx="54" cy="24" r="17.5" fill="none" stroke="${reptiles ? reptiles.color : 'currentColor'}" stroke-width="1" opacity=".3"/>`);
}

/** Two bars of the same story: by years (top) and by screen time (bottom). */
function timelineArt(yearShare, screenShare) {
  const W = 64;
  const bar = (y, share) => `
    <rect x="4" y="${y}" width="${(W * share).toFixed(1)}" height="7" rx="1.5" fill="currentColor" opacity=".38"/>
    <rect x="${(4 + W * share + 1.5).toFixed(1)}" y="${y}" width="${Math.max(1, W * (1 - share) - 1.5).toFixed(1)}" height="7" rx="1.5" fill="var(--accent)"/>`;
  const x1 = 4 + W * yearShare + 0.75;
  const x2 = 4 + W * screenShare + 0.75;
  return art(`
    ${bar(10, yearShare)}
    ${bar(31, screenShare)}
    <path d="M${x1.toFixed(1)} 18.5L${x2.toFixed(1)} 30M68 18.5V30" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/>`);
}

function clockArt(fraction) {
  const r = 15;
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  const x = 36 + r * Math.cos(angle);
  const y = 24 + r * Math.sin(angle);
  return art(`
    <circle cx="36" cy="24" r="${r}" fill="none" stroke="currentColor" stroke-width="2" opacity=".28"/>
    <path d="M36 ${24 - r}A${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M36 24L${(36 + (r - 5) * Math.cos(angle)).toFixed(2)} ${(24 + (r - 5) * Math.sin(angle)).toFixed(2)}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="36" cy="24" r="1.8" fill="currentColor"/>`);
}

function vitalsArt() {
  return art(`
    <path d="M5 30c6-1 8-9 14-9s7 11 14 10 8-15 14-16 9 6 15 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
    <path d="M5 38h62" stroke="currentColor" stroke-width="1" opacity=".25"/>
    <circle cx="47" cy="15" r="4.6" fill="var(--bg-1)"/><circle cx="47" cy="15" r="3" fill="var(--accent)"/>`);
}

function holdArt() {
  const color = extinctions.length ? extinctions[Math.min(2, extinctions.length - 1)].color : 'currentColor';
  return art(`
    <path d="M6 24h60" stroke="currentColor" stroke-width="1.4" opacity=".3"/>
    <path d="M36 14l8 10-8 10-8-10z" fill="${color}"/>
    <path d="M33.4 20.5v7M38.6 20.5v7" stroke="var(--bg-1)" stroke-width="2" stroke-linecap="round"/>`);
}

// ---------------------------------------------------------------------------------------------

export class Help {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('help-root');
    this.root.innerHTML = `
      <dialog id="help-dialog" class="dlg hp-dialog hidden" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div class="dlg-surface">
          <header class="hp-head">
            <div class="hp-head-row">
              <h2 id="help-title" class="display" tabindex="-1">Help &amp; about</h2>
              ${closeButtonMarkup('Close help')}
            </div>
            <div class="segmented hp-tabs" role="tablist" aria-label="Help sections">
              <button type="button" class="seg-btn" role="tab" id="hp-tab-read" aria-controls="hp-pane-read" aria-selected="true">How to read this</button>
              <button type="button" class="seg-btn" role="tab" id="hp-tab-keys" aria-controls="hp-pane-keys" aria-selected="false">Keyboard &amp; mouse</button>
              <button type="button" class="seg-btn" role="tab" id="hp-tab-data" aria-controls="hp-pane-data" aria-selected="false">About the data</button>
            </div>
          </header>
          <div class="dlg-scroll">
            <div class="hp-pane" id="hp-pane-read" role="tabpanel" aria-labelledby="hp-tab-read" tabindex="0"></div>
            <div class="hp-pane" id="hp-pane-keys" role="tabpanel" aria-labelledby="hp-tab-keys" tabindex="0"></div>
            <div class="hp-pane" id="hp-pane-data" role="tabpanel" aria-labelledby="hp-tab-data" tabindex="0"></div>
          </div>
          <footer class="hp-foot">
            <span class="kicker" id="hp-motion-label">Motion</span>
            <div class="segmented hp-motion" role="group" aria-labelledby="hp-motion-label">
              <button type="button" class="seg-btn" data-motion-choice="system" aria-pressed="false">Follow system</button>
              <button type="button" class="seg-btn" data-motion-choice="reduced" aria-pressed="false">Reduced</button>
              <button type="button" class="seg-btn" data-motion-choice="full" aria-pressed="false">Full</button>
            </div>
            <span class="hp-motion-note" aria-live="polite"></span>
            <button type="button" class="btn btn-ghost hp-intro">Show the introduction</button>
          </footer>
        </div>
      </dialog>`;
    this.el = this.root.querySelector('#help-dialog');
    this.titleEl = this.root.querySelector('#help-title');
    this.scrollEl = this.root.querySelector('.dlg-scroll');
    this.motionNoteEl = this.root.querySelector('.hp-motion-note');
    this.motionButtons = [...this.root.querySelectorAll('[data-motion-choice]')];

    safely('Help: how to read this', () => this._buildRead(this.root.querySelector('#hp-pane-read')));
    safely('Help: keyboard and mouse', () => this._buildKeys(this.root.querySelector('#hp-pane-keys')));
    safely('Help: about the data', () => this._buildData(this.root.querySelector('#hp-pane-data')));
    this.tabs = wireTabs(this.root.querySelector('[role="tablist"]'), () => { this.scrollEl.scrollTop = 0; });

    this.shell = new ModalShell(this.el, () => this.close());
    this.root.querySelector('.dlg-close').addEventListener('click', () => this.close());
    // The intro card (js/ui/intro.js) reopens on request — handy for whoever skipped it.
    this.root.querySelector('.hp-intro').addEventListener('click', () => {
      this.close();
      app.bus.emit('panel:toggle', { name: 'intro', open: true });
    });
    // "?" toggles: the global shortcut is silent while a dialog is open, so answer it here.
    this.el.addEventListener('keydown', (e) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this.close();
      }
    });
    for (const button of this.motionButtons) {
      button.addEventListener('click', () => {
        const value = button.dataset.motionChoice;
        app.setMotionPreference?.(value === 'system' ? null : value);
        this._syncMotion();
      });
    }

    app.bus.on('panel:toggle', ({ name, open }) => {
      if (name === 'help') this.toggle(open);
    });
    app.bus.on('panel:close-all', () => this.close());
    app.bus.on('motion:changed', () => this._syncMotion());
    this._syncMotion();
  }

  toggle(force) {
    if (force ?? !this.shell.isOpen) this.open();
    else this.close();
  }

  open() {
    // Capture mode hides this dialog's root; a modal that cannot be seen would only lock the page.
    // In capture mode Help stays closed unless a capture script asked for it (__capture.openPanel
    // sets body.capture-show-help before emitting the toggle).
    if (this.shell.isOpen
      || (this.app.state.captureMode && !document.body.classList.contains('capture-show-help'))) return;
    this._syncMotion();
    this.scrollEl.scrollTop = 0;
    this.shell.open(this.titleEl);
    this.app.bus.emit('panel:changed', { name: 'help', open: true });
  }

  close() {
    if (!this.shell.isOpen) return;
    this.shell.close(document.getElementById('btn-help'));
    this.app.bus.emit('panel:changed', { name: 'help', open: false });
  }

  // ---- motion preference -----------------------------------------------------------------------

  _syncMotion() {
    const override = this.app.getMotionPreference ? this.app.getMotionPreference() : null;
    const chosen = override === 'reduced' || override === 'full' ? override : 'system';
    for (const button of this.motionButtons) {
      const on = button.dataset.motionChoice === chosen;
      button.classList.toggle('active', on);
      button.setAttribute('aria-pressed', String(on));
    }
    const reduced = !!this.app.state.reducedMotion;
    let note;
    if (chosen === 'system') {
      note = reduced
        ? 'Your system asks for less motion, so shakes, blooms and sweeps are toned down.'
        : 'Your system allows motion, so all animation is on.';
    } else if (chosen === 'reduced') {
      note = 'Shakes, blooms and sweeps are toned down.';
    } else {
      note = 'All animation is on, whatever your system prefers.';
    }
    if (note !== this.motionNoteEl.textContent) this.motionNoteEl.textContent = note;
  }

  // ---- How to read this ------------------------------------------------------------------------

  _buildRead(pane) {
    const yearShare = 1 - CAMBRIAN_START_MA / TIMING.startTimeMa;
    const screenShare = maToFraction(CAMBRIAN_START_MA);
    const cambrian = earthClock(CAMBRIAN_START_MA);
    const human = this.app.speciesById.get(HUMAN_ID);
    const humanSeconds = Math.max(1, Math.round(((human ? human.appearanceMa : 0.3) / TIMING.startTimeMa) * 86400));
    const holdSeconds = Math.round(TIMING.extinctionPauseSeconds);
    const count = NUMBER_WORDS[extinctions.length] || String(extinctions.length);
    const age = formatDuration(TIMING.startTimeMa);

    const items = [
      [viewsArt(), 'Three views of one moment',
        'The Map shows the whole planet at once, the Globe shows it as a world you can turn, and the Tree shows how everything alive is related. Switch with the buttons at the top, or press 1, 2 or 3.'],
      [markersArt(), 'Every marker is a living thing',
        'Shape and colour name its branch of life (the Legend has the key) and size shows how prominent it is right now. A ring blooming outward means it has just appeared; a grey ember means it has just died out.'],
      [timelineArt(yearShare, screenShare), 'The timeline is stretched',
        `The bar at the bottom is scaled by storytelling time, not by years. Everything before the Cambrian explosion of animal life is ${pct(yearShare)} of Earth's history but gets only ${pct(screenShare)} of the bar, so the crowded recent past has room to breathe.`],
      [clockArt(cambrian.fraction), 'The 24-hour Earth clock',
        `Squeeze all ${age} into a single day that starts at midnight. The Cambrian explosion does not begin until ${cambrian.text.slice(0, 5)}, and our own species arrives ${humanSeconds} seconds before the day ends.`],
      [vitalsArt(), 'Planet vitals',
        'The panel beside the map (the Life button on small screens) tracks the planet as the story plays: temperature, oxygen, carbon dioxide and more. Read the numbers as the big picture, not as exact measurements.'],
      [holdArt(), 'Mass extinctions stop the clock',
        `At each of the ${count} great extinctions the story holds for ${holdSeconds} seconds so you can read what happened and why. Press Space or Continue to move on.`],
    ];
    const list = el('ul', 'hp-read');
    for (const [svg, title, text] of items) {
      const item = el('li', 'hp-read-item');
      const figure = el('span', 'hp-art');
      figure.innerHTML = svg;
      const body = el('div', 'hp-read-text');
      body.append(el('h3', 'hp-read-title', title), el('p', null, text));
      item.append(figure, body);
      list.appendChild(item);
    }
    pane.appendChild(list);
  }

  // ---- Keyboard & mouse ------------------------------------------------------------------------

  _buildKeys(pane) {
    pane.appendChild(el('h3', 'kicker hp-kicker', 'Keyboard'));
    const keys = el('dl', 'hp-keys');
    for (const shortcut of SHORTCUTS) {
      const row = el('div', 'hp-key-row');
      const combo = el('dt');
      const chord = MODIFIER_KEYS.has(shortcut.keys[0]);
      shortcut.keys.forEach((key, i) => {
        if (i) combo.appendChild(el('span', 'hp-key-join', chord ? '+' : ''));
        combo.appendChild(el('kbd', null, key));
      });
      row.append(combo, el('dd', null, shortcut.label));
      keys.appendChild(row);
    }
    pane.appendChild(keys);

    pane.appendChild(el('h3', 'kicker hp-kicker', 'Mouse & touch'));
    const gestures = el('dl', 'hp-gestures');
    const gesture = (name, text) => {
      const row = el('div', 'hp-gesture');
      row.append(el('dt', null, name), el('dd', null, text));
      gestures.appendChild(row);
    };
    gesture('Drag', 'Move the map, turn the globe or slide the tree.');
    gesture('Scroll or pinch', 'Zoom in and out.');
    gesture('Hover a marker or a name', 'A quick card: what it is and when it lived.');
    gesture('Click or tap it', 'Its full story, its lineage and its closest relatives.');
    gesture('Click a period on the timeline', 'Jump to the start of that period.');
    gesture('Drag along the timeline', 'Scrub through time.');
    gesture('Click a mark above the timeline', 'Watch that event from just before it begins.');
    pane.appendChild(gestures);

    pane.appendChild(el('p', 'hp-tip',
      'While the story is paused, the address bar holds the exact moment and view you are looking at. Copy it to share or bookmark that scene.'));
  }

  // ---- About the data --------------------------------------------------------------------------

  _buildData(pane) {
    const reach = plateModelReachMa();
    const runtime = minutesAndSeconds(totalScreenSeconds());
    const count = NUMBER_WORDS[extinctions.length] || String(extinctions.length);

    pane.appendChild(el('p', 'hp-lead',
      'This is a visualization, not a research tool. Some of what you see comes straight from the rock record, some is reconstructed from it, and some is a storytelling choice. Here is which is which.'));

    const rows = [
      ['Continents', 'Reconstructed',
        reach
          ? `For the last ${formatDuration(reach)} the coastlines are today's real ones (Natural Earth, public domain), cut into tectonic plates that move as rigid pieces. Before that the plate model ends, and the continents are schematic shapes drawn by hand to follow published reconstructions. The further back you go, the less certain they are.`
          : 'The continents are simplified outlines drawn by hand to follow published reconstructions, and morphed from one time slice to the next. The further back you go, the less certain they are.'],
      ['Periods and dates', 'Standard',
        `Period names, dates and colours follow the geological time chart of the International Commission on Stratigraphy.${
          TIMING.startTimeMa < CHART_BASE_MA
            ? ` One departure: the story starts ${formatYearsAgo(TIMING.startTimeMa)}, when the Earth formed, not at the chart's ${formatYearsAgo(CHART_BASE_MA).replace(' ago', '')}, the age of the oldest solids in the Solar System.`
            : ''}`],
      ['Climate and air', 'Smoothed estimates',
        'Temperature, oxygen and carbon dioxide are smoothed curves that lean on published reconstructions: for oxygen, Lyons, Reinhard & Planavsky (2014); for carbon dioxide, Foster, Royer & Lunt (2017) and, further back, Krissansen-Totton and colleagues (2018). They show the great swings (snowball glaciations, hothouses, ice ages), not exact values, and before animals appear the numbers are rough. The data notes name the source behind each curve.'],
      ['Species and dates', 'From the fossil record',
        'First and last appearances follow the fossil record and are approximate: a group usually arose somewhat before its oldest known fossil. An entry may stand for a single species or for a whole group.'],
      ['Where the markers sit', 'Reconstructed',
        typeof interpolator.plateToWorld === 'function'
          ? 'Each marker starts from a real fossil site on today\'s map. It is carried back in time on its tectonic plate, then nudged onto land or sea to suit the organism; markers that share a site are fanned into a small cluster. A marker shows roughly where those rocks lay on the ancient world, not the full range of the living thing.'
          : 'Each marker sits at a real fossil site, plotted at its coordinates on today\'s map. The continents drawn around it are older, so treat its place on the ancient world as a rough guide, not as the full range of the living thing.'],
      ['The family tree', 'Simplified',
        'Lineages and “closest relatives” come from a simplified tree of life built for this project. Splits between living groups are dated by molecular clocks calibrated with fossils (mostly the TimeTree estimates); groups that died out are dated from their oldest fossils. Expect errors of several per cent over the last 540 million years and of 10–20% before a billion years ago. A fossil whose place is disputed sits where most specialists now put it.'],
      ['“Dominant life” and marker size', 'Editorial',
        'The ranking in the Life panel and the size of each marker come from a hand-drawn prominence curve for every entry. It is a storytelling aid, not a count of individuals or species.'],
      ['Pacing', 'Editorial',
        `Time does not run at a constant rate: eventful periods get more screen time. At 1× the whole story plays in ${runtime}, plus a ${Math.round(TIMING.extinctionPauseSeconds)}-second hold at each of the ${count} mass extinctions.`],
      ['Extinction tolls', 'Estimates',
        'The share of species lost in each mass extinction is an estimate worked out from the fossil record, mostly for life in the sea, where fossils survive best. Published figures differ from study to study.'],
    ];
    const list = el('dl', 'hp-data');
    for (const [title, kind, text] of rows) {
      const row = el('div', 'hp-data-row');
      const head = el('dt');
      head.append(el('span', 'hp-data-title', title), el('span', `tag hp-kind${kind === 'Editorial' ? ' is-editorial' : ''}`, kind));
      row.append(head, el('dd', null, text));
      list.appendChild(row);
    }
    pane.appendChild(list);

    const more = el('p', 'hp-links');
    more.append('Sources and known simplifications: ');
    const notes = el('a', null, 'data notes');
    notes.href = 'docs/data-sources.md';
    const readme = el('a', null, 'project README');
    readme.href = 'README.md';
    for (const link of [notes, readme]) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    more.append(notes, ' · ', readme, ' (both open in a new tab).');
    pane.appendChild(more);
  }
}
