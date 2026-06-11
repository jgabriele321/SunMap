/**
 * Date utilities for converting day-of-year to ISO date string
 *
 * The app is year-agnostic: sunset patterns repeat every year, so we anchor
 * all computation to a fixed non-leap reference year and never display it.
 */

import { DateTime } from 'luxon';

/** Fixed non-leap reference year used internally for all computation */
export const REFERENCE_YEAR = 2025;

export const DAYS_IN_YEAR = 365;

/**
 * Convert a day-of-year (1-365) to an ISO date string in the reference year
 */
export function dayOfYearToISO(doy: number): string {
  const dt = DateTime.fromObject({ year: REFERENCE_YEAR, ordinal: doy }, { zone: 'utc' });
  return dt.toISODate() || `${REFERENCE_YEAR}-01-01`;
}

/**
 * Format a date ISO string without the year, e.g. "June 21"
 */
export function formatDateReadable(dateISO: string): string {
  const dt = DateTime.fromISO(dateISO, { zone: 'utc' });
  return dt.toFormat('LLLL d');
}

/**
 * Today's day-of-year (1-365), clamping Dec 31 of leap years to 365
 */
export function todayDayOfYear(): number {
  return Math.min(DateTime.now().ordinal, DAYS_IN_YEAR);
}
