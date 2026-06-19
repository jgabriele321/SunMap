/**
 * Temperature utilities
 *
 * Source data: WorldClim 2.1 monthly climate normals (average daily min/max
 * per month, 1970-2000), sampled per land point at build time into
 * src/data/tempgrid.json (tenths of °C, month-major: point i, month m → i*12+m).
 *
 * At runtime we interpolate the 12 monthly normals — each treated as occurring
 * at its mid-month day — to the selected day of the year. The result is the
 * "average high" and "average low" you'd expect on that calendar day, the same
 * every year. No global average is computed; colors use an absolute scale.
 */

import tempData from '../data/tempgrid.json';
import type { LandGrid } from './world';

interface RawTemp {
  tmin: number[]; // tenths °C, length n*12
  tmax: number[];
}

export interface TempData {
  /** Average daily high (°C) per point for the selected day */
  hi: Float32Array;
  /** Average daily low (°C) per point */
  lo: Float32Array;
  /** Mean of hi and lo (°C) — drives the color */
  avg: Float32Array;
}

// Mid-month day-of-year (non-leap), the day each monthly normal is centered on
const CENTERS = [15.5, 45, 74.5, 105, 135.5, 166, 196.5, 227.5, 258, 288.5, 319, 349.5];
const YEAR_DAYS = 365;

const raw = tempData as RawTemp;

const cache: Record<number, TempData> = {};

/** Linear interpolation of 12 monthly values (tenths °C) to day-of-year `d`, in °C */
function interpMonthly(base: number[], offset: number, d: number): number {
  let prev: number, next: number, t: number;

  if (d <= CENTERS[0]) {
    // Wrap below January's center: blend December → January
    prev = 11;
    next = 0;
    const start = CENTERS[11] - YEAR_DAYS; // December center shifted back a year
    t = (d - start) / (CENTERS[0] - start);
  } else if (d >= CENTERS[11]) {
    // Wrap above December's center: blend December → January
    prev = 11;
    next = 0;
    const end = CENTERS[0] + YEAR_DAYS;
    t = (d - CENTERS[11]) / (end - CENTERS[11]);
  } else {
    let m = 0;
    while (m < 11 && d >= CENTERS[m + 1]) m++;
    prev = m;
    next = m + 1;
    t = (d - CENTERS[m]) / (CENTERS[m + 1] - CENTERS[m]);
  }

  const a = base[offset + prev];
  const b = base[offset + next];
  return (a + (b - a) * t) / 10; // tenths → °C
}

/** Compute per-point high/low/avg temperature for a day of year */
export function computeTempDay(dayOfYear: number, grid: LandGrid): TempData {
  if (cache[dayOfYear]) return cache[dayOfYear];

  const hi = new Float32Array(grid.n);
  const lo = new Float32Array(grid.n);
  const avg = new Float32Array(grid.n);

  for (let i = 0; i < grid.n; i++) {
    const off = i * 12;
    const h = interpMonthly(raw.tmax, off, dayOfYear);
    const l = interpMonthly(raw.tmin, off, dayOfYear);
    hi[i] = h;
    lo[i] = l;
    avg[i] = (h + l) / 2;
  }

  const result = { hi, lo, avg };
  cache[dayOfYear] = result;
  return result;
}

/* ---------- absolute temperature color scale (blue → orange → red) ---------- */

interface Stop {
  t: number; // °C
  c: [number, number, number];
}

// Cold = blue, mild = pale, warm = orange, hot = red. No green, per the brief.
const STOPS: Stop[] = [
  { t: -40, c: [30, 27, 75] }, // deep indigo (extreme cold)
  { t: -25, c: [49, 46, 129] }, // indigo
  { t: -15, c: [59, 91, 219] }, // blue
  { t: -5, c: [77, 171, 247] }, // light blue
  { t: 5, c: [186, 225, 243] }, // very pale blue
  { t: 13, c: [253, 232, 200] }, // pale warm (neutral mild)
  { t: 21, c: [255, 192, 120] }, // light orange
  { t: 29, c: [255, 146, 43] }, // orange
  { t: 36, c: [240, 62, 62] }, // red
  { t: 45, c: [132, 32, 41] }, // dark red (extreme heat)
];

function toHex(c: [number, number, number]): string {
  return (
    '#' +
    c
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Map an average temperature (°C) to a color on the absolute scale */
export function colorForTemp(tempC: number): string {
  if (isNaN(tempC)) return '#3d4654';
  if (tempC <= STOPS[0].t) return toHex(STOPS[0].c);
  if (tempC >= STOPS[STOPS.length - 1].t) return toHex(STOPS[STOPS.length - 1].c);

  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (tempC >= a.t && tempC < b.t) {
      const f = (tempC - a.t) / (b.t - a.t);
      return toHex([
        a.c[0] + (b.c[0] - a.c[0]) * f,
        a.c[1] + (b.c[1] - a.c[1]) * f,
        a.c[2] + (b.c[2] - a.c[2]) * f,
      ]);
    }
  }
  return toHex(STOPS[STOPS.length - 1].c);
}

/** CSS gradient (cold → hot) for the legend bar */
export function tempLegendGradient(): string {
  const span = STOPS[STOPS.length - 1].t - STOPS[0].t;
  const stops = STOPS.map((s) => {
    const pct = ((s.t - STOPS[0].t) / span) * 100;
    return `${toHex(s.c)} ${pct.toFixed(1)}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

export const TEMP_RANGE = { min: STOPS[0].t, max: STOPS[STOPS.length - 1].t };

/** Format a °C value as "24°C / 75°F" */
export function formatTemp(c: number): string {
  if (isNaN(c)) return 'N/A';
  const f = c * 9 / 5 + 32;
  return `${Math.round(c)}°C / ${Math.round(f)}°F`;
}
