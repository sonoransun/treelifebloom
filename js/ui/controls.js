// Timeline controls — scrubber, play/pause, speed, era strip.

import { timeline } from '../data/timeline.js';
import { getPeriodAtTime, timeMaToFraction, fractionToTimeMa, TOTAL_WEIGHTED_TIME } from '../data/timeline.js';
import { TIMING } from '../config.js';

export class Controls {
  constructor(clock) {
    this.clock = clock;
    this.scrubber = document.getElementById('scrubber');
    this.playBtn = document.getElementById('btn-play');
    this.restartBtn = document.getElementById('btn-restart');
    this.speedSelect = document.getElementById('speed-select');
    this.timeDisplay = document.getElementById('current-time-display');
    this.eraBadge = document.getElementById('era-badge');
    this.eraName = document.getElementById('era-name');
    this.periodLabel = document.getElementById('time-period-label');
    this.maLabel = document.getElementById('time-ma-label');
    this.eraStrip = document.getElementById('era-strip');
    this.timelineControls = document.getElementById('timeline-controls');

    this._scrubbing = false;
    this._lastAriaMs = 0;
    this.onTimeJump = null; // fired after an era-strip click jump (main.js syncs the URL)
    this._init();
  }

  _init() {
    // Build era strip
    this._buildEraStrip();

    // Scrubber — mapped via cumulative temporalWeight so periods get slider real
    // estate proportional to their playback duration (not raw Ma duration).
    // sliderValue 0 (left) = past, sliderValue max (right) = present.
    this.scrubber.addEventListener('input', () => {
      this._scrubbing = true;
      const fraction = Math.max(0, Math.min(1, 1 - parseFloat(this.scrubber.value) / parseFloat(this.scrubber.max)));
      this.clock.setTime(fractionToTimeMa(fraction));
    });
    this.scrubber.addEventListener('change', () => {
      this._scrubbing = false;
    });

    // Play/Pause
    this.playBtn.addEventListener('click', () => {
      this.clock.togglePlay();
      this._updatePlayButton();
    });

    // Restart
    this.restartBtn.addEventListener('click', () => {
      this.clock.restart();
      this._updatePlayButton();
    });

    // Speed
    this.speedSelect.addEventListener('change', () => {
      this.clock.setSpeed(parseFloat(this.speedSelect.value));
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // An element-level handler (species item, legend row, era segment) already
      // consumed this press — don't also treat it as a global shortcut (Space
      // would toggle play/pause on top of activating the focused button).
      if (e.defaultPrevented) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.clock.togglePlay();
          this._updatePlayButton();
          break;
        case 'ArrowRight': {
          // Step ~0.5% of weighted play-through time toward present —
          // proportional in both Hadean (~10 Ma) and Pleistocene (~0.013 Ma).
          const f = timeMaToFraction(this.clock.currentTimeMa);
          this.clock.setTime(fractionToTimeMa(Math.max(0, f - 0.005)));
          break;
        }
        case 'ArrowLeft': {
          const f = timeMaToFraction(this.clock.currentTimeMa);
          this.clock.setTime(fractionToTimeMa(Math.min(1, f + 0.005)));
          break;
        }
        case 'r':
          this.clock.restart();
          this._updatePlayButton();
          break;
      }
    });
  }

  _buildEraStrip() {
    // Widths are proportional to weighted screen-time so the strip aligns with
    // the (now also weighted) scrubber — total sums to exactly 100%, not 113.5%.
    this.eraStrip.innerHTML = '';

    for (const period of timeline) {
      const periodStart = Math.min(period.startMa, TIMING.startTimeMa);
      const periodEnd = Math.max(period.endMa, TIMING.endTimeMa);
      if (periodStart <= periodEnd) continue; // entirely outside playable window
      const widthPercent = ((periodStart - periodEnd) * period.temporalWeight / TOTAL_WEIGHTED_TIME) * 100;
      const segment = document.createElement('div');
      segment.className = 'era-segment';
      segment.style.width = widthPercent + '%';
      segment.style.background = period.color;
      segment.title = `${period.period} (${period.startMa}–${period.endMa} Ma)`;
      // Quick-jump: clicking a period lands at its start. Scrub semantics — the
      // play/pause state is left alone, matching the scrubber's input handler.
      segment.setAttribute('role', 'button');
      segment.tabIndex = 0;
      segment.setAttribute('aria-label', `Jump to ${period.period}, ${period.startMa} million years ago`);
      const jump = () => {
        this.clock.setTime(Math.min(period.startMa, TIMING.startTimeMa));
        if (this.onTimeJump) this.onTimeJump();
      };
      segment.addEventListener('click', jump);
      segment.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          jump();
        }
      });
      this.eraStrip.appendChild(segment);
    }
  }

  _updatePlayButton() {
    if (this.clock.playing) {
      this.playBtn.innerHTML = '&#9646;&#9646;'; // Pause icon
      this.playBtn.classList.add('playing');
    } else {
      this.playBtn.innerHTML = '&#9654;'; // Play icon
      this.playBtn.classList.remove('playing');
    }
  }

  /** Re-sync the play button icon after external code changed clock.playing. */
  syncPlayButton() {
    this._updatePlayButton();
  }

  updateDisplay(timeMa) {
    const fraction = timeMaToFraction(timeMa);

    // Update scrubber position (unless user is dragging)
    if (!this._scrubbing) {
      this.scrubber.value = (1 - fraction) * parseFloat(this.scrubber.max);
    }

    // Drive the era-strip playhead and the scrubber's progress fill (CSS var,
    // one cheap style write — both read var(--scrub-pos) from this container).
    this.timelineControls.style.setProperty('--scrub-pos', ((1 - fraction) * 100).toFixed(3) + '%');

    // Format time
    this.timeDisplay.textContent = formatTimeMa(timeMa);

    // Update period labels
    const period = getPeriodAtTime(timeMa);
    if (period) {
      this.periodLabel.textContent = period.period;
      this.maLabel.textContent = formatTimeMa(timeMa);
      this.eraName.textContent = period.period;
      this.eraBadge.style.background = period.color;
    }

    // Screen-reader value (throttled to ~4 Hz so AT isn't spammed at 60 fps).
    const now = performance.now();
    if (now - this._lastAriaMs > 250) {
      this._lastAriaMs = now;
      this.scrubber.setAttribute(
        'aria-valuetext',
        period ? `${formatTimeMa(timeMa)} — ${period.period}` : formatTimeMa(timeMa)
      );
    }
  }
}

export function formatTimeMa(ma) {
  if (ma >= 1000) {
    return (ma / 1000).toFixed(1) + ' Ga';
  } else if (ma >= 1) {
    return Math.round(ma).toLocaleString() + ' Ma';
  } else if (ma >= 0.001) {
    return Math.round(ma * 1000).toLocaleString() + ' Ka';
  } else {
    return 'Present';
  }
}
