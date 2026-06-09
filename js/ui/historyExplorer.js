// "Explore the History of Life" — left-docked chapter explorer panel.
// Chronological spine of narrative chapters (js/data/chapters.js), each with
// jump links to its milestones, mass extinctions, and species first
// appearances. Non-modal: opening it does NOT pause the clock — the current
// chapter highlights live as time plays beside the panel.

import { chapters, chapterIndexAtTime } from '../data/chapters.js';
import { cladeColor } from '../util/taxonomy.js';
import { EXPLORER } from '../config.js';
import { formatTimeMa } from './controls.js';

export class HistoryExplorer {
  constructor(clock, controls) {
    this.clock = clock;
    this.controls = controls;
    this.panel = document.getElementById('history-panel');
    this.backdrop = document.getElementById('history-backdrop');
    this.chaptersEl = document.getElementById('history-chapters');
    this.closeBtn = document.getElementById('history-close');
    this.btn = document.getElementById('btn-history');

    this.onJump = null; // main.js wires this to syncUrl()
    this._cards = [];
    this._currentIndex = -1;
    this._lastFocus = null;
    this._reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');

    this._buildChapters();

    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());

    // One delegated listener for every jump affordance in the panel.
    this.chaptersEl.addEventListener('click', (e) => {
      const target = e.target.closest('[data-jump-ma]');
      if (!target) return;
      this._jump(parseFloat(target.dataset.jumpMa), { play: target.dataset.play === '1' });
    });
  }

  isOpen() {
    return !this.panel.classList.contains('hidden');
  }

  open() {
    this.panel.classList.remove('hidden');
    this.backdrop.classList.remove('hidden');
    if (this.btn) {
      this.btn.classList.add('active');
      this.btn.setAttribute('aria-expanded', 'true');
    }
    // Clear any highlight left from the last session BEFORE resetting the
    // index, then re-resolve it for the current time.
    if (this._cards[this._currentIndex]) this._cards[this._currentIndex].classList.remove('current');
    this._currentIndex = -1;
    this.update(this.clock.currentTimeMa);
    // Take keyboard users into the panel (mirrors the help overlay).
    this._lastFocus = document.activeElement;
    this.closeBtn.focus();
  }

  close() {
    this.panel.classList.add('hidden');
    this.backdrop.classList.add('hidden');
    if (this.btn) {
      this.btn.classList.remove('active');
      this.btn.setAttribute('aria-expanded', 'false');
    }
    if (this._lastFocus && typeof this._lastFocus.focus === 'function') {
      this._lastFocus.focus();
      this._lastFocus = null;
    }
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  /** Called every frame from main.js — no-op while closed or within a chapter.
      Gated on the chapter index changing (≤13 comparisons per frame) rather
      than a time throttle, so the final frame of a paused scrub always lands. */
  update(timeMa) {
    if (!this.isOpen()) return;
    const idx = chapterIndexAtTime(timeMa);
    if (idx === this._currentIndex) return;
    if (this._cards[this._currentIndex]) this._cards[this._currentIndex].classList.remove('current');
    this._currentIndex = idx;
    const card = this._cards[idx];
    if (card) {
      card.classList.add('current');
      card.scrollIntoView({
        block: 'nearest',
        behavior: this._reduceMq.matches ? 'auto' : 'smooth',
      });
    }
  }

  _jump(ma, { play = false } = {}) {
    if (!Number.isFinite(ma)) return;
    // pause() before setTime(): pause() clears any pending extinction
    // auto-resume timer, which setTime() alone does not (engine/clock.js) —
    // otherwise a jump during the 2 s extinction hard-pause would self-resume
    // at the new time. Mirrors the original jump-dropdown semantics.
    this.clock.pause();
    this.clock.setTime(ma);
    if (play) this.clock.play();
    this.controls.syncPlayButton();
    if (this.onJump) this.onJump();
    // Full-screen on small viewports — close so the jump result is visible.
    if (window.matchMedia(`(max-width: ${EXPLORER.mobileBreakpointPx}px)`).matches) {
      this.close();
    }
  }

  // Cards are static data — built once, only the .current class changes.
  _buildChapters() {
    this.chaptersEl.innerHTML = '';
    this._cards = [];

    for (const ch of chapters) {
      const card = document.createElement('section');
      card.className = 'history-chapter';
      card.dataset.id = ch.id;
      card.style.setProperty('--ch-accent', ch.color);

      const head = document.createElement('header');
      head.className = 'history-chapter-head';

      const jumpBtn = document.createElement('button');
      jumpBtn.className = 'history-chapter-jump';
      jumpBtn.dataset.jumpMa = String(ch.timeMa);
      jumpBtn.title = `Jump to ${ch.title} (${formatTimeMa(ch.timeMa)})`;

      const title = document.createElement('span');
      title.className = 'history-chapter-title';
      title.textContent = ch.title;

      const nowBadge = document.createElement('span');
      nowBadge.className = 'history-now';
      nowBadge.textContent = '● now';

      const range = document.createElement('span');
      range.className = 'history-chapter-range';
      range.textContent = `${rangeMa(ch.spanStartMa)} – ${rangeMa(ch.spanEndMa)}`;

      jumpBtn.appendChild(title);
      jumpBtn.appendChild(nowBadge);
      jumpBtn.appendChild(range);

      const playBtn = document.createElement('button');
      playBtn.className = 'history-play-btn';
      playBtn.dataset.jumpMa = String(ch.timeMa);
      playBtn.dataset.play = '1';
      playBtn.innerHTML = '&#9654;';
      playBtn.title = `Play from ${ch.title}`;
      playBtn.setAttribute('aria-label', `Play from ${ch.title}`);

      head.appendChild(jumpBtn);
      head.appendChild(playBtn);
      card.appendChild(head);

      const body = document.createElement('p');
      body.className = 'history-chapter-body';
      body.textContent = ch.narrative;
      card.appendChild(body);

      const links = this._buildLinks(ch);
      if (links) card.appendChild(links);

      const chips = this._buildSpeciesChips(ch);
      if (chips) card.appendChild(chips);

      this.chaptersEl.appendChild(card);
      this._cards.push(card);
    }
  }

  _buildLinks(ch) {
    if (!ch.milestones.length && !ch.extinctions.length) return null;
    const ul = document.createElement('ul');
    ul.className = 'history-links';

    for (const m of ch.milestones) {
      ul.appendChild(this._linkRow('Milestone', m.name, m.timeMa));
    }
    for (const e of ch.extinctions) {
      const row = this._linkRow('Extinction', e.name, e.timeMa);
      row.firstChild.classList.add('history-link-extinction');
      const severity = document.createElement('span');
      severity.className = 'history-severity';
      severity.textContent = `−${e.severityPercent}%`;
      severity.style.color = e.color;
      // Insert before the trailing Ma label so the Ma stays right-aligned.
      row.firstChild.insertBefore(severity, row.firstChild.lastChild);
      ul.appendChild(row);
    }
    return ul;
  }

  _linkRow(kind, name, timeMa) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'history-link';
    btn.dataset.jumpMa = String(timeMa);
    btn.title = `Jump to ${name}`;

    const kindEl = document.createElement('span');
    kindEl.className = 'history-link-kind';
    kindEl.textContent = kind;

    const nameEl = document.createElement('span');
    nameEl.className = 'history-link-name';
    nameEl.textContent = name;

    const maEl = document.createElement('span');
    maEl.className = 'history-link-ma';
    maEl.textContent = formatTimeMa(timeMa);

    btn.appendChild(kindEl);
    btn.appendChild(nameEl);
    btn.appendChild(maEl);
    li.appendChild(btn);
    return li;
  }

  _buildSpeciesChips(ch) {
    const all = ch.speciesFirstSeen;
    if (!all.length) return null;

    const wrap = document.createElement('div');
    wrap.className = 'history-chips';

    const head = all.slice(0, EXPLORER.maxSpeciesChips);
    const rest = all.slice(EXPLORER.maxSpeciesChips);
    for (const sp of head) wrap.appendChild(this._chip(sp));

    if (rest.length) {
      const more = document.createElement('details');
      more.className = 'history-more';
      const summary = document.createElement('summary');
      summary.textContent = `+${rest.length} more`;
      more.appendChild(summary);
      const extra = document.createElement('div');
      extra.className = 'history-chips';
      for (const sp of rest) extra.appendChild(this._chip(sp));
      more.appendChild(extra);
      wrap.appendChild(more);
    }
    return wrap;
  }

  _chip(sp) {
    const btn = document.createElement('button');
    btn.className = 'history-chip';
    btn.dataset.jumpMa = String(sp.appearanceMa);
    btn.title = `Jump to the first appearance of ${sp.name}`;

    const dot = document.createElement('span');
    dot.className = 'history-dot';
    dot.style.background = cladeColor(sp);

    const ma = document.createElement('span');
    ma.className = 'history-link-ma';
    ma.textContent = formatTimeMa(sp.appearanceMa);

    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(sp.name));
    btn.appendChild(ma);
    return btn;
  }
}

// Span labels: keep sub-10 Ma boundaries exact ("7.5 Ma"), present as "Now".
function rangeMa(ma) {
  if (ma === 0) return 'Now';
  if (ma >= 1000) return trimZero((ma / 1000).toFixed(1)) + ' Ga';
  if (ma >= 10) return Math.round(ma) + ' Ma';
  return trimZero(ma.toFixed(1)) + ' Ma';
}

function trimZero(s) {
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
