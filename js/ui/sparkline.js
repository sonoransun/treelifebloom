// Tiny canvas sparkline. Plots a [Ma, value] curve over a time window
// and highlights the current value with a dot.

export class Sparkline {
  constructor(parentEl, { curve, width = 60, height = 18, color = '#88aacc', windowMa = null }) {
    this.curve = curve;
    this.color = color;
    this.windowMa = windowMa; // null = full curve span
    this.width = width;
    this.height = height;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sparkline-canvas';
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    parentEl.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(this.dpr, this.dpr);

    // Cache curve range
    this._minVal = Infinity;
    this._maxVal = -Infinity;
    for (const [, v] of curve) {
      if (v < this._minVal) this._minVal = v;
      if (v > this._maxVal) this._maxVal = v;
    }
    if (this._minVal === this._maxVal) this._maxVal = this._minVal + 1;
  }

  draw(currentMa, currentValue) {
    const { ctx, width: w, height: h, curve } = this;
    ctx.clearRect(0, 0, w, h);

    // Plot the "past" portion of the curve: from oldest Ma down to currentMa.
    // x goes from 0 (oldest) to w (currentMa); y inverted, padded 1px.
    const oldestMa = curve[0][0];
    const range = oldestMa - currentMa;
    if (range <= 0) return;

    const yScale = (v) => h - 1 - ((v - this._minVal) / (this._maxVal - this._minVal)) * (h - 2);
    const xScale = (ma) => ((oldestMa - ma) / range) * w;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < curve.length; i++) {
      const [ma, v] = curve[i];
      if (ma < currentMa) break; // future relative to playback — not yet
      const x = xScale(ma);
      const y = yScale(v);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    if (started) {
      const curX = xScale(currentMa);
      const curY = yScale(currentValue);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(curX, curY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
