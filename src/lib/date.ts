/**
 * Date utilities for converting day-of-year to ISO date string
 */

import { DateTime } from 'luxon';

/**
 * Convert a day-of-year (1-365/366) to an ISO date string (YYYY-MM-DD)
 * @param year - The year (e.g., 2025)
 * @param doy - Day of year (1-365 for non-leap years, 1-366 for leap years)
 * @returns ISO date string like "2025-06-21"
 */
export function dayOfYearToISO(year: number, doy: number): string {
  // Create date from year start and add (doy - 1) days
  // DateTime ordinal is 1-based (1 = Jan 1st)
  const dt = DateTime.fromObject({ year, ordinal: doy }, { zone: 'utc' });
  return dt.toISODate() || `${year}-01-01`;
}

/**
 * Get the number of days in a year
 * @param year - The year to check
 * @returns 365 or 366
 */
export function daysInYear(year: number): number {
  return DateTime.fromObject({ year, month: 12, day: 31 }).ordinal || 365;
}

/**
 * Format a date ISO string to a more readable format
 * @param dateISO - ISO date string
 * @returns Formatted date like "June 21, 2025"
 */
export function formatDateReadable(dateISO: string): string {
  const dt = DateTime.fromISO(dateISO, { zone: 'utc' });
  return dt.toFormat('LLLL d, yyyy');
}

