// Timeline controls — scrubber, play/pause, speed, era strip.

import { timeline } from '../data/timeline.js';
import { getPeriodAtTime } from '../data/timeline.js';
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

    this._scrubbing = false;
    this._init();
  }

  _init() {
    // Build era strip
    this._buildEraStrip();

    // Scrubber
    this.scrubber.addEventListener('input', () => {
      this._scrubbing = true;
      this.clock.setTime(parseFloat(this.scrubber.value));
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
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.clock.togglePlay();
          this._updatePlayButton();
          break;
        case 'ArrowRight':
          this.clock.setTime(this.clock.currentTimeMa - 20);
          break;
        case 'ArrowLeft':
          this.clock.setTime(this.clock.currentTimeMa + 20);
          break;
        case 'r':
          this.clock.restart();
          this._updatePlayButton();
          break;
      }
    });
  }

  _buildEraStrip() {
    // Total duration
    const totalMa = TIMING.startTimeMa;
    this.eraStrip.innerHTML = '';

    for (const period of timeline) {
      const duration = period.startMa - period.endMa;
      const widthPercent = (duration / totalMa) * 100;
      const segment = document.createElement('div');
      segment.className = 'era-segment';
      segment.style.width = widthPercent + '%';
      segment.style.background = period.color;
      segment.title = `${period.period} (${period.startMa}–${period.endMa} Ma)`;
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

  updateDisplay(timeMa) {
    // Update scrubber position (unless user is dragging)
    if (!this._scrubbing) {
      this.scrubber.value = timeMa;
    }

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
  }
}

function formatTimeMa(ma) {
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
