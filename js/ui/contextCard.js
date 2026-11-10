// Context card — "where and when am I?"
//
// Floats over the lower-left of the visualization and answers, top to bottom:
//   · which eon / era / period this is (kicker + the period name in the display serif),
//   · how long ago, in plain words, with the compact geological notation beside it,
//   · the same moment on the 24-hour "Earth clock" (Earth's whole history as one day),
//   · the single most memorable thing about the period,
//   · and — when js/data/timeline.js carries `context` — three short lines on its life, climate
//     and geography. Those unfold while paused and for a few seconds after each period change
//     during playback, then fold away so the map stays clear.
//
// The card never blocks the map: only the unit chip and the Earth-clock row take pointer events.
// Layout, the scrim and the yielding rules (it bows out under the extinction and finale cards)
// are in css/overlays.css.

import { TIMING } from '../config.js';
import { timeline } from '../data/timeline.js';
import { formatMa, formatYearsAgo, formatDuration, earthClock } from '../util/format.js';

const CONTEXT_ROWS = [
  { key: 'life', label: 'Life' },
  { key: 'climate', label: 'Climate' },
  { key: 'geography', label: 'Land & sea' },
];
const CONTEXT_LINGER_SEC = 6;       // the context lines stay open this long after a period change
const CONTEXT_MIN_HEIGHT_PX = 620;  // …and need at least this much visualization height
const CLOCK_REFRESH_SEC = 0.1;      // Earth-clock digits refresh at most this often during playback
const DAY_SECONDS = 86400;
const DIAL_RADIUS = 9;
const DIAL_LENGTH = 2 * Math.PI * DIAL_RADIUS;
const DIAL_STEPS = 720;             // the dial arc moves in two-minute steps

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
const EON_ORDER = [...new Set(timeline.map((row) => row.eon))];

/**
 * The two most specific units above the period, e.g. "Phanerozoic Eon · Paleozoic Era" or
 * "Cenozoic Era · Quaternary Period". A unit that would only repeat the title is dropped.
 */
function unitPath(period) {
  const title = period.label || period.period;
  const parts = [];
  if (period.eon && period.eon !== title) parts.push(`${period.eon} Eon`);
  if (period.era && period.era !== period.eon && period.era !== title) parts.push(`${period.era} Era`);
  if (period.parentPeriod && period.parentPeriod !== title) parts.push(`${period.parentPeriod} Period`);
  if (parts.length) return parts.slice(-2).join(' · ');
  // The row is itself an eon (the Hadean): say which one rather than echoing its name.
  const index = EON_ORDER.indexOf(period.eon);
  return index >= 0 && index < ORDINALS.length ? `Earth’s ${ORDINALS[index]} eon` : 'Eon';
}

/**
 * "21:18:14" from the shared earthClock(); in the final minute of the day (the last ~3 million
 * years) hundredths are added, or the whole human story would read 23:59:59.
 */
function earthClockText(timeMa) {
  if (timeMa <= TIMING.endTimeMa) return '24:00:00';
  const clock = earthClock(timeMa);
  const seconds = clock.fraction * DAY_SECONDS;
  if (seconds < DAY_SECONDS - 60) return clock.text;
  const hundredths = Math.min(99, Math.floor((seconds % 1) * 100));
  return `${clock.text}.${String(hundredths).padStart(2, '0')}`;
}

export class ContextCard {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('context-card');
    this.root.innerHTML = `
      <div class="cc-scrim" aria-hidden="true"></div>
      <div class="cc-body">
        <div class="cc-head">
          <div class="cc-kicker kicker" id="cc-path"></div>
          <div class="cc-titlewrap">
            <h2 class="cc-title display" id="time-period-label"></h2>
            <span class="cc-title-ghost display" aria-hidden="true"></span>
            <span class="cc-sweep" aria-hidden="true"></span>
          </div>
          <div class="cc-age">
            <span class="cc-years num" id="cc-years"></span>
            <abbr class="cc-ma num" id="time-ma-label"
                  title="Ga = billion years ago · Ma = million years ago · ka = thousand years ago"></abbr>
          </div>
        </div>
        <div class="cc-clock">
          <svg class="cc-dial" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="cc-dial-track" cx="12" cy="12" r="${DIAL_RADIUS}"/>
            <circle class="cc-dial-arc" cx="12" cy="12" r="${DIAL_RADIUS}" transform="rotate(-90 12 12)"
                    stroke-dasharray="${DIAL_LENGTH.toFixed(2)}" stroke-dashoffset="${DIAL_LENGTH.toFixed(2)}"/>
            <path class="cc-dial-tick" d="M12 1v3.6"/>
          </svg>
          <span><span class="cc-clock-time num" id="cc-clock"></span> on the 24-hour Earth clock</span>
          <button class="cc-info" type="button" aria-label="About the Earth clock" aria-describedby="cc-clock-tip">i</button>
          <div class="cc-tip" id="cc-clock-tip" role="tooltip"></div>
        </div>
        <p class="cc-desc" id="cc-desc"></p>
        <div class="cc-context" id="cc-context">
          <div class="cc-context-inner">
            <dl class="cc-lines">
              ${CONTEXT_ROWS.map((row) => `
              <div class="cc-line" data-key="${row.key}">
                <dt class="kicker">${row.label.replace('&', '&amp;')}</dt>
                <dd></dd>
              </div>`).join('')}
            </dl>
          </div>
        </div>
      </div>`;

    const q = (selector) => this.root.querySelector(selector);
    this.pathEl = q('#cc-path');
    this.titleWrap = q('.cc-titlewrap');
    this.titleEl = q('#time-period-label');
    this.ghostEl = q('.cc-title-ghost');
    this.yearsEl = q('#cc-years');
    this.maEl = q('#time-ma-label');
    this.clockRow = q('.cc-clock');
    this.clockEl = q('#cc-clock');
    this.dialArc = q('.cc-dial-arc');
    this.infoBtn = q('.cc-info');
    this.descEl = q('#cc-desc');
    this.lineEls = CONTEXT_ROWS.map((row) => {
      const line = q(`.cc-line[data-key="${row.key}"]`);
      return { key: row.key, line, text: line.querySelector('dd') };
    });

    // The analogy in numbers, straight from the story's own start date.
    const start = TIMING.startTimeMa;
    q('#cc-clock-tip').textContent =
      `Earth’s ${formatDuration(start)} squeezed into a single day: the planet forms at midnight, `
      + `and right now is the midnight that follows. Each hour is about ${formatDuration(start / 24)}; `
      + `each second, about ${formatDuration(start / DAY_SECONDS)}.`;

    // Hover and focus open the tip in CSS; Escape dismisses it without moving focus (WCAG 1.4.13).
    this.infoBtn.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      this.clockRow.classList.add('is-dismissed');
    });
    const undismiss = () => this.clockRow.classList.remove('is-dismissed');
    this.infoBtn.addEventListener('blur', undismiss);
    this.clockRow.addEventListener('pointerleave', undismiss);

    this._periodKey = null;
    this._hasContext = false;
    this._open = false;
    this._lingerUntil = 0;
    this._lastMa = null;
    this._years = null;
    this._ma = null;
    this._clockMa = null;
    this._clockText = null;
    this._clockAt = -Infinity;
    this._dialStep = -1;

    // The context lines need vertical room; track the stage height without measuring per frame.
    this._roomy = true;
    this._lift = 0;
    this.noticeEl = document.getElementById('view-notice');
    const stage = this.root.parentElement;
    if (stage && typeof ResizeObserver === 'function') {
      const measure = () => {
        this._roomy = stage.clientHeight >= CONTEXT_MIN_HEIGHT_PX;
        this._avoidNotice();
      };
      new ResizeObserver(measure).observe(stage);
      measure();
    }
    // main.js's status pill (#view-notice) is centred on the bottom edge and, on all but the
    // widest stages, lands on the card's last line: step up out of its way while it shows.
    if (this.noticeEl && typeof MutationObserver === 'function') {
      new MutationObserver(() => this._avoidNotice()).observe(this.noticeEl, {
        attributes: true, attributeFilter: ['class'], childList: true, characterData: true, subtree: true,
      });
    }
  }

  _avoidNotice() {
    const notice = this.noticeEl;
    const stage = this.root.offsetParent;
    let lift = 0;
    if (notice && stage && !notice.classList.contains('hidden')) {
      // offset* ignore the lift's own transform, so the answer does not chase itself.
      const origin = stage.getBoundingClientRect();
      const top = origin.top + this.root.offsetTop;
      const right = origin.left + this.root.offsetLeft + this.root.offsetWidth;
      const bottom = top + this.root.offsetHeight;
      const pill = notice.getBoundingClientRect();
      if (pill.width && pill.left < right + 12 && pill.top < bottom + 4 && pill.bottom > top) {
        lift = Math.ceil(bottom - pill.top + 10);
      }
    }
    if (lift === this._lift) return;
    this._lift = lift;
    if (lift) this.root.style.setProperty('--cc-lift', `${lift}px`);
    else this.root.style.removeProperty('--cc-lift');
  }

  update(frame) {
    const { period, timeMa, nowSec } = frame;

    if (period && period.period !== this._periodKey) {
      // Announce the change with motion only when playback carried us here.
      const animate = this._periodKey !== null && !frame.jumped && frame.playing;
      this._setPeriod(period, animate);
      this._lingerUntil = nowSec + CONTEXT_LINGER_SEC;
    } else if (frame.jumped) {
      this._lingerUntil = nowSec + CONTEXT_LINGER_SEC;
    }

    // Recorded clips keep the compact card; so does the frozen moment of an extinction hold.
    const open = this._hasContext && this._roomy && !this.app.state.captureMode && !frame.hold
      && (!frame.playing || nowSec < this._lingerUntil);
    if (open !== this._open) {
      this._open = open;
      this.root.classList.toggle('is-open', open);
    }

    if (timeMa !== this._lastMa) {
      this._lastMa = timeMa;
      const years = formatYearsAgo(timeMa);
      if (years !== this._years) {
        this._years = years;
        this.yearsEl.textContent = years;
      }
      const ma = formatMa(timeMa);
      if (ma !== this._ma) {
        this._ma = ma;
        this.maEl.textContent = ma;
        // "Today · Present" would say the same thing twice: the chip only shows real notation.
        this.maEl.hidden = !/\d/.test(ma);
      }
    }

    // The clock digits spin too fast to read at full frame rate: ten updates a second is plenty
    // during playback, and a pause or a scrub always lands on the exact value.
    if (timeMa === this._clockMa) return;
    if (frame.playing && !frame.jumped && nowSec - this._clockAt < CLOCK_REFRESH_SEC) return;
    this._clockMa = timeMa;
    this._clockAt = nowSec;
    const clockText = earthClockText(timeMa);
    if (clockText !== this._clockText) {
      this._clockText = clockText;
      this.clockEl.textContent = clockText;
    }
    const fraction = timeMa <= TIMING.endTimeMa ? 1 : earthClock(timeMa).fraction;
    const step = Math.round(fraction * DIAL_STEPS);
    if (step !== this._dialStep) {
      this._dialStep = step;
      this.dialArc.setAttribute('stroke-dashoffset', (DIAL_LENGTH * (1 - step / DIAL_STEPS)).toFixed(2));
    }
  }

  _setPeriod(period, animate) {
    const title = period.label || period.period;
    if (animate) {
      this.ghostEl.textContent = this.titleEl.textContent;
      // Restart the CSS animations (see .cc-titlewrap.is-changing).
      this.titleWrap.classList.remove('is-changing');
      void this.titleWrap.offsetWidth;
      this.titleWrap.classList.add('is-changing');
    } else {
      this.titleWrap.classList.remove('is-changing');
    }
    this._periodKey = period.period;
    this.pathEl.textContent = unitPath(period);
    this.titleEl.textContent = title;
    this.descEl.textContent = period.description || '';
    this.descEl.hidden = !period.description;
    if (period.color) this.root.style.setProperty('--cc-color', period.color);

    const context = period.context || null;
    let any = false;
    for (const { key, line, text } of this.lineEls) {
      const value = context && typeof context[key] === 'string' ? context[key].trim() : '';
      line.hidden = !value;
      text.textContent = value;
      if (value) any = true;
    }
    this._hasContext = any;
  }
}
