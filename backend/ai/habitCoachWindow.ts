const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && dateKeyPattern.test(value);
}

export function shouldReplaceActivePlan(value: unknown): boolean {
  return value === true;
}

export function isValidHabitCoachWindow(input: {
  weekStart: unknown;
  weekEnd: unknown;
  dateKeys: unknown[];
}) {
  if (
    !isDateKey(input.weekStart) ||
    !isDateKey(input.weekEnd) ||
    input.dateKeys.length !== 7 ||
    !input.dateKeys.every(isDateKey)
  ) {
    return false;
  }

  const startDate = parseDateKey(input.weekStart);
  if (!startDate) {
    return false;
  }

  return input.dateKeys.every((dateKey, index) => {
    const expected = formatDateKey(addUtcDays(startDate, index));
    return dateKey === expected && (index !== 6 || dateKey === input.weekEnd);
  });
}

function parseDateKey(value: string) {
  if (!dateKeyPattern.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date.getTime());
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function formatDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function hasDateRangeOverlap(input: {
  start: string;
  end: string;
  otherStart: string;
  otherEnd: string;
}) {
  return input.start <= input.otherEnd && input.otherStart <= input.end;
}
