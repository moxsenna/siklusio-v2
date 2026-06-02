const pad2 = (value: number): string => String(value).padStart(2, '0');

export function getLocalDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('-');
}

export function getMsUntilNextLocalDay(date = new Date()): number {
  const nextDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0,
    0,
    0,
    0
  );

  return Math.max(0, nextDay.getTime() - date.getTime());
}
