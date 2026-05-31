export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isValidHabitCoachWindow(input: {
  weekStart: unknown;
  weekEnd: unknown;
  dateKeys: unknown[];
}) {
  if (!isDateKey(input.weekStart) || !isDateKey(input.weekEnd)) {
    return false;
  }

  if (
    input.dateKeys.length !== 7 ||
    !input.dateKeys.every(isDateKey) ||
    input.dateKeys[0] !== input.weekStart ||
    input.dateKeys[6] !== input.weekEnd
  ) {
    return false;
  }

  return input.weekStart <= input.weekEnd;
}

export function hasDateRangeOverlap(input: {
  start: string;
  end: string;
  otherStart: string;
  otherEnd: string;
}) {
  return input.start <= input.otherEnd && input.otherStart <= input.end;
}
