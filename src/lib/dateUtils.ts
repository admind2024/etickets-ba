/**
 * Date utilities to prevent UTC timezone shift issues
 * 
 * When using new Date("YYYY-MM-DD"), JavaScript interprets the string as UTC midnight,
 * which can cause the date to shift back by one day in timezones east of UTC.
 * 
 * These utilities ensure dates are parsed as local time.
 */

/**
 * Parse an ISO date string (YYYY-MM-DD) as a local date without UTC shift.
 * This prevents the "off by one day" bug in Balkan timezones.
 * 
 * @param isoDateStr - Date string in format "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss"
 * @returns Date object representing local midnight of the given date
 * 
 * @example
 * // For user in CET timezone (UTC+1):
 * new Date("2025-03-07")         // -> March 6, 2025 23:00 (WRONG!)
 * parseLocalDate("2025-03-07")   // -> March 7, 2025 00:00 (CORRECT!)
 */
export function parseLocalDate(isoDateStr: string): Date {
  if (!isoDateStr) {
    return new Date();
  }
  
  // Extract just the date part (handles both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss")
  const datePart = isoDateStr.split("T")[0];
  const parts = datePart.split("-");
  
  if (parts.length !== 3) {
    // Fallback for non-ISO formats
    return new Date(isoDateStr);
  }
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(parts[2], 10);
  
  return new Date(year, month, day);
}

/**
 * Compare two ISO date strings for sorting without UTC shift issues.
 * 
 * @param dateA - First date string
 * @param dateB - Second date string  
 * @returns Negative if dateA < dateB, positive if dateA > dateB, 0 if equal
 */
export function compareDates(dateA: string, dateB: string): number {
  return parseLocalDate(dateA).getTime() - parseLocalDate(dateB).getTime();
}

/**
 * Format a date for display with localized month and day names.
 * Uses parseLocalDate internally to avoid UTC shift.
 * 
 * @param isoDateStr - Date string in ISO format
 * @param locale - Locale for formatting (default: "sr-Latn-ME")
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatLocalDate(
  isoDateStr: string,
  locale: string = "sr-Latn-ME",
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }
): string {
  if (!isoDateStr) return "";
  
  const date = parseLocalDate(isoDateStr);
  return date.toLocaleDateString(locale, options);
}

/**
 * Get day number from ISO date string without UTC shift.
 */
export function getDayNumber(isoDateStr: string): number {
  return parseLocalDate(isoDateStr).getDate();
}

/**
 * Get month (0-indexed) from ISO date string without UTC shift.
 */
export function getMonthIndex(isoDateStr: string): number {
  return parseLocalDate(isoDateStr).getMonth();
}

/**
 * Get year from ISO date string without UTC shift.
 */
export function getYear(isoDateStr: string): number {
  return parseLocalDate(isoDateStr).getFullYear();
}

/**
 * Get day of week (0=Sunday, 6=Saturday) from ISO date string without UTC shift.
 */
export function getDayOfWeek(isoDateStr: string): number {
  return parseLocalDate(isoDateStr).getDay();
}
