const REDACTED = "[redacted]";
const REDACTED_EMAIL = "[redacted-email]";
const REDACTED_PHONE = "[redacted-phone]";
const REDACTED_TOKEN = "[redacted-token]";
const REDACTED_URL = "[redacted-url]";
const MAX_DEPTH = 6;

const SENSITIVE_KEY_PATTERN =
  /(^|_|\b)(authorization|api[-_]?key|access[-_]?key|secret|token|password|email|phone|mobile|whatsapp|name|account[-_]?number|account[-_]?holder|bank|link|url|avatar|user[-_]?id|transaction[-_]?id|mayar[-_]?transaction[-_]?id)(_|$|\b)/i;

const redactText = (value: string): string =>
  value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, REDACTED_TOKEN)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REDACTED_EMAIL)
    .replace(/https?:\/\/[^\s"'<>)]*/gi, REDACTED_URL)
    .replace(/(?:\+?62|0)8\d{7,13}\b/g, REDACTED_PHONE);

const normalizeKey = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();

const shouldRedactKey = (key: string): boolean => SENSITIVE_KEY_PATTERN.test(normalizeKey(key));

export const redactLogValue = (
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown => {
  if (value == null) return value;

  if (typeof value === "string") {
    return redactText(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value;
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "function") {
    return "[function]";
  }

  if (depth >= MAX_DEPTH) {
    return "[redacted-depth]";
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactText(value.message),
      stack: value.stack ? redactText(value.stack) : undefined,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[circular]";
    }
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => redactLogValue(item, depth + 1, seen));
    }

    const view = ArrayBuffer.isView(value);
    if (view) {
      return `[binary ${(value as ArrayBufferView).byteLength} bytes]`;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        shouldRedactKey(key) ? REDACTED : redactLogValue(entry, depth + 1, seen),
      ]),
    );
  }

  return REDACTED;
};

const redactLogArgs = (args: unknown[]): unknown[] => args.map((arg) => redactLogValue(arg));

export const logInfo = (...args: unknown[]): void => {
  console.log(...redactLogArgs(args));
};

export const logWarn = (...args: unknown[]): void => {
  console.warn(...redactLogArgs(args));
};

export const logError = (...args: unknown[]): void => {
  console.error(...redactLogArgs(args));
};
