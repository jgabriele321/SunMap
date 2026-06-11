/**
 * Sunset computation utilities (global dot-grid)
 *
 * For each land grid point:
 * 1. SunCalc gives the UTC instant of sunset at that lon/lat
 * 2. The point's IANA timezone offset (precomputed once per zone per date
 *    via Luxon) converts it to local clock time
 * 3. We keep "minutes after local midnight" and the delta vs the global mean
 *
 * Points with no sunset on the requested local date (polar day/night)
 * are stored as NaN.
 */

import SunCalc from 'suncalc';
import { DateTime } from 'luxon';
import type { LandGrid } from './world';

export interface SunsetData {
  avgMinutes: number;
  /** Normalization scale for colors: 95th percentile of |delta| */
  scaleMax: number;
  /** Minutes after local midnight, NaN = no sunset that day */
  minutes: Float32Array;
  /** Delta vs global average, NaN = no sunset */
  delta: Float32Array;
  validCount: number;
}

// In-memory cache keyed by ISO date
const cache: Record<string, SunsetData> = {};

export function computeGridSunsets(dateISO: string, grid: LandGrid): SunsetData {
  if (cache[dateISO]) return cache[dateISO];

  // UTC noon avoids off-by-one date issues when SunCalc picks the solar day
  const dateAtUtcNoon = DateTime.fromISO(dateISO, { zone: 'utc' })
    .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
    .toJSDate();

  const [y, m, d] = dateISO.split('-').map(Number);

  // One Luxon call per timezone instead of per point. Offset is sampled at
  // 18:00 local — close enough to sunset that DST edges (2-3am) never matter.
  const tzOffset = grid.tz.map(
    (tz) => DateTime.fromISO(dateISO, { zone: tz }).set({ hour: 18 }).offset
  );

  const minutes = new Float32Array(grid.n).fill(NaN);
  const delta = new Float32Array(grid.n).fill(NaN);

  let sum = 0;
  let validCount = 0;

  for (let i = 0; i < grid.n; i++) {
    const times = SunCalc.getTimes(dateAtUtcNoon, grid.lat[i], grid.lon[i]);
    const sunsetMs = times.sunset?.getTime();
    if (sunsetMs === undefined || isNaN(sunsetMs)) continue;

    const local = new Date(sunsetMs + tzOffset[grid.tzIdx[i]] * 60000);
    // Polar edge case: sunset falls on a different local date (or never)
    if (
      local.getUTCFullYear() !== y ||
      local.getUTCMonth() + 1 !== m ||
      local.getUTCDate() !== d
    ) {
      continue;
    }

    const mins =
      local.getUTCHours() * 60 + local.getUTCMinutes() + local.getUTCSeconds() / 60;
    minutes[i] = mins;
    sum += mins;
    validCount++;
  }

  const avgMinutes = validCount > 0 ? sum / validCount : 0;

  // Deltas + robust normalization (p95 so a few extreme zones don't wash
  // out the rest of the map)
  const absDeltas: number[] = [];
  for (let i = 0; i < grid.n; i++) {
    if (!isNaN(minutes[i])) {
      delta[i] = minutes[i] - avgMinutes;
      absDeltas.push(Math.abs(delta[i]));
    }
  }
  absDeltas.sort((a, b) => a - b);
  const p95 = absDeltas.length > 0 ? absDeltas[Math.floor(absDeltas.length * 0.95)] : 60;
  const scaleMax = Math.max(40, Math.round(p95));

  const result: SunsetData = { avgMinutes, scaleMax, minutes, delta, validCount };
  cache[dateISO] = result;
  return result;
}

/**
 * Format minutes after midnight as 12-hour time, e.g. "8:34pm"
 */
export function formatMinutesToHHMM(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  const period = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${mins.toString().padStart(2, '0')}${period}`;
}

/**
 * Format a delta in minutes, e.g. "+23 min" / "−41 min"
 */
export function formatDelta(delta: number): string {
  if (isNaN(delta)) return 'N/A';
  const rounded = Math.round(delta);
  return `${rounded >= 0 ? '+' : '−'}${Math.abs(rounded)} min`;
}
