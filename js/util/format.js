// Shared time / number formatting. One place so the toolbar, context card, timeline, popup and
// modal all speak the same language.
//
// Each unit takes over exactly where the unit below it would round up to 1000, so a value never
// reads "1000 Ma", "1000 ka" or "1000 million years" — it reads "1 Ga", "1 Ma", "1 billion years".
// Ages within the last 20 years read "Present" / "Today" in both formatMa and formatYearsAgo.

import { TIMING } from '../config.js';

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const PRESENT_YEARS = 20;

function trim(n, digits) {
  return Number(n.toFixed(digits)).toString();
}

/** Round a count of years for display — to 1 below 100, 10 below 1,000, 100 below 100,000, else
 *  1,000 (600, 1,400, 11,700, 129,000): never off by more than 5%. */
function roundYears(years) {
  const step = years >= 100000 ? 1000 : years >= 1000 ? 100 : years >= 100 ? 10 : 1;
  return Math.round(years / step) * step;
}

/**
 * Compact geological age: "4.54 Ga", "541 Ma", "66 Ma", "2.6 Ma", "300 ka", "11.7 ka", "Present".
 * Uses the stratigraphic units Ga / Ma / ka (giga-, mega-, kilo-annum before present).
 */
export function formatMa(ma) {
  if (ma >= 999.5) return `${trim(ma / 1000, 2)} Ga`;
  if (ma >= 100) return `${Math.round(ma)} Ma`;
  if (ma >= 10) return `${trim(ma, 1)} Ma`;
  if (ma >= 0.9995) return `${trim(ma, 2)} Ma`;
  if (ma >= 0.1) return `${Math.round(ma * 1000)} ka`;
  if (ma >= 0.000995) return `${trim(ma * 1000, 1)} ka`;
  const years = ma * 1e6;
  if (years >= PRESENT_YEARS) return `${nf0.format(Math.round(years / 10) * 10)} yr`;
  return 'Present';
}

/**
 * Human-scale age: "4.54 billion years ago", "541 million years ago", "300,000 years ago",
 * "11,700 years ago", "Today".
 */
export function formatYearsAgo(ma) {
  if (ma >= 999.5) return `${trim(ma / 1000, 2)} billion years ago`;
  if (ma >= 10) return `${Math.round(ma)} million years ago`;
  if (ma >= 0.9995) return `${trim(ma, 1)} million years ago`;
  const years = ma * 1e6;
  if (years >= 1000) return `${nf0.format(roundYears(years))} years ago`;
  if (years >= PRESENT_YEARS) return `${nf0.format(Math.round(years / 10) * 10)} years ago`;
  return 'Today';
}

/** "521 Ma → 252 Ma" / "300 ka → present" for a species or any {appearanceMa, extinctMa}. */
export function formatRange(sp) {
  const end = sp.extinctMa == null ? 'present' : formatMa(sp.extinctMa);
  return `${formatMa(sp.appearanceMa)} → ${end}`;
}

/** Duration in Ma as words: "269 million years", "38,000 years", "600 years", "1 year". */
export function formatDuration(ma) {
  if (ma >= 999.5) return `${trim(ma / 1000, 2)} billion years`;
  if (ma >= 0.9995) return `${trim(ma, ma >= 10 ? 0 : 1)} million years`;
  const years = roundYears(ma * 1e6);
  if (years < 1) return 'less than a year';
  return `${nf0.format(years)} ${years === 1 ? 'year' : 'years'}`;
}

/**
 * Earth's whole history compressed into one 24-hour day (midnight = formation at
 * TIMING.startTimeMa, the following midnight = now). Returns { h, m, s, text: "21:08:45" }.
 * The classic way to give deep time a human scale: all of recorded history is the last
 * tenth of a second.
 */
export function earthClock(ma) {
  const elapsed = Math.max(0, Math.min(1, 1 - ma / TIMING.startTimeMa));
  const totalSeconds = Math.min(86399.999, elapsed * 86400);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return { h, m, s, fraction: elapsed, text: `${pad(h)}:${pad(m)}:${pad(s)}` };
}

/** Multiplier vs a modern baseline: "18×", "1.4×", "0.6×", "0.048×", "<0.01×". */
export function formatRatio(value, baseline) {
  const r = value / baseline;
  if (!isFinite(r)) return '—';
  if (r >= 100) return `${Math.round(r)}×`;
  if (r >= 10) return `${trim(r, 0)}×`;
  if (r >= 1) return `${trim(r, 1)}×`;
  // Below 1 keep two significant digits, so a small but real amount never reads "0×".
  if (r >= 0.01) return `${Number(r.toPrecision(2))}×`;
  if (r > 0) return '<0.01×';
  return `${trim(r, 1)}×`; // exactly 0 (or a negative input, which is not a meaningful ratio)
}

/** Thousands-separated integer. */
export function formatInt(n) {
  return nf0.format(Math.round(n));
}

/** Title-case a snake/kebab id for fallback labels. */
export function titleCase(id) {
  return String(id).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
