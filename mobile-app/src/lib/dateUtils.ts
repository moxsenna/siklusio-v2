import { parse } from "date-fns";

/**
 * Safely parses a 'yyyy-MM-dd' string into a local Date object.
 * Avoids the timezone shift issue of `new Date('yyyy-MM-dd')` which
 * is parsed as UTC midnight and can result in the previous day in
 * timezones behind UTC.
 */
export function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes("T")) {
    return new Date(dateStr);
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(dateStr);
}
