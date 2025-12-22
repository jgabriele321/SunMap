/**
 * Sunset computation utilities
 * 
 * This module computes local sunset times for each US state by:
 * 1. Using SunCalc to get the UTC instant of sunset at each state's centroid
 * 2. Converting that instant to the state's local timezone using Luxon
 * 3. Extracting the local clock time as "minutes after midnight"
 * 4. Computing the national average and each state's delta from average
 */

import SunCalc from 'suncalc';
import { DateTime } from 'luxon';
import type { CountyFeature } from './map';

export interface StateResult {
  minutes: number | null;      // Minutes after midnight in local time
  delta: number | null;        // Difference from national average
  tzid: string | null;         // IANA timezone identifier
  sunsetHHMM: string | null;   // Formatted local sunset time
}

export interface SunsetData {
  avgMinutes: number;
  maxAbsDelta: number;
  perState: Record<string, StateResult>;
}

// Simple in-memory cache for computed sunset data
const cache: Record<string, SunsetData> = {};

/**
 * Compute sunset data for all counties on a given date
 * Results are cached by dateISO
 * 
 * @param dateISO - ISO date string (YYYY-MM-DD)
 * @param features - Array of county features with centroids and timezones
 * @returns SunsetData with average, max delta, and per-county results
 */
export function computeStateSunsets(
  dateISO: string,
  features: CountyFeature[]
): SunsetData {
  // Cache key includes feature count to differentiate state vs county
  const cacheKey = `${dateISO}_${features.length}`;
  
  // Return cached result if available
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  // Create a Date object at UTC noon to avoid off-by-one issues across timezones
  // This ensures we're computing sunset for the correct local date everywhere
  const dateAtUtcNoon = DateTime.fromISO(dateISO, { zone: 'utc' })
    .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
    .toJSDate();

  const perState: Record<string, StateResult> = {};
  const validMinutes: number[] = [];

  for (const feat of features) {
    const { id, centroidLonLat, tzid } = feat;
    
    if (!centroidLonLat || !tzid) {
      perState[id] = {
        minutes: null,
        delta: null,
        tzid: null,
        sunsetHHMM: null,
      };
      continue;
    }

    const [lon, lat] = centroidLonLat;

    try {
      // Get sun times from SunCalc (returns UTC instants)
      const times = SunCalc.getTimes(dateAtUtcNoon, lat, lon);
      const sunsetInstant = times.sunset;

      // Check if sunset is valid (not NaN or invalid date)
      if (!sunsetInstant || isNaN(sunsetInstant.getTime())) {
        perState[id] = {
          minutes: null,
          delta: null,
          tzid,
          sunsetHHMM: null,
        };
        continue;
      }

      // Convert sunset instant to local timezone
      const dtLocal = DateTime.fromJSDate(sunsetInstant, { zone: 'utc' })
        .setZone(tzid);

      // CRITICAL: Check if sunset occurs on the expected date
      // In polar regions (Alaska in summer), sunset may occur on a different day
      // or not at all. We only want sunsets that occur on the requested date.
      const expectedDate = DateTime.fromISO(dateISO, { zone: tzid });
      if (dtLocal.day !== expectedDate.day || dtLocal.month !== expectedDate.month) {
        // Sunset is on a different day - likely polar day/night edge case
        perState[id] = {
          minutes: null,
          delta: null,
          tzid,
          sunsetHHMM: 'N/A (polar)',
        };
        continue;
      }

      // Calculate minutes after midnight in local time
      const minutes = dtLocal.hour * 60 + dtLocal.minute;
      
      // Format as HH:MM
      const sunsetHHMM = dtLocal.toFormat('HH:mm');

      perState[id] = {
        minutes,
        delta: 0, // Will be computed after we have the average
        tzid,
        sunsetHHMM,
      };

      validMinutes.push(minutes);
    } catch {
      perState[id] = {
        minutes: null,
        delta: null,
        tzid,
        sunsetHHMM: null,
      };
    }
  }

  // Calculate national average (simple arithmetic mean of local clock times)
  const avgMinutes = validMinutes.length > 0
    ? validMinutes.reduce((sum, m) => sum + m, 0) / validMinutes.length
    : 0;

  // Compute deltas and find max absolute delta
  let maxAbsDelta = 0;

  for (const id of Object.keys(perState)) {
    const state = perState[id];
    if (state.minutes !== null) {
      state.delta = state.minutes - avgMinutes;
      maxAbsDelta = Math.max(maxAbsDelta, Math.abs(state.delta));
    }
  }

  const result: SunsetData = {
    avgMinutes,
    maxAbsDelta,
    perState,
  };

  // Cache the result
  cache[cacheKey] = result;

  return result;
}

/**
 * Format minutes after midnight to HH:MM string
 * @param minutes - Minutes after midnight
 * @returns Formatted time string
 */
export function formatMinutesToHHMM(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Clear the sunset cache (useful for testing)
 */
export function clearSunsetCache(): void {
  for (const key of Object.keys(cache)) {
    delete cache[key];
  }
}

