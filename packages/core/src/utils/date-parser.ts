import * as chrono from "chrono-node";

export interface ParsedDate {
  date: Date;
  hasTime: boolean;
  dstAdjusted?: boolean;
}

export class DateParseError extends Error {
  constructor(
    public input: string,
    public suggestion?: string,
  ) {
    super(`Unable to parse date: "${input}"${suggestion ? `. Did you mean: ${suggestion}?` : ""}`);
    this.name = "DateParseError";
  }
}

const DURATION_REGEX = /^(\d+w)?\s*(\d+d)?\s*(\d+h)?\s*(\d+m)?$/i;

export function parseDate(input: string, referenceDate?: Date): ParsedDate {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    throw new DateParseError(input);
  }

  if (/^-\d|in\s+-\d/i.test(trimmed)) {
    throw new DateParseError(input, "Negative values not supported. Use positive durations.");
  }

  const durationMatch = trimmed.match(DURATION_REGEX);
  if (durationMatch && (durationMatch[1] || durationMatch[2] || durationMatch[3] || durationMatch[4])) {
    const weeks = parseInt(durationMatch[1] || "0", 10);
    const days = parseInt(durationMatch[2] || "0", 10);
    const hours = parseInt(durationMatch[3] || "0", 10);
    const minutes = parseInt(durationMatch[4] || "0", 10);

    const ref = referenceDate ?? new Date();
    const result = new Date(ref);
    result.setDate(result.getDate() + weeks * 7 + days);
    result.setHours(result.getHours() + hours);
    result.setMinutes(result.getMinutes() + minutes);

    return { date: result, hasTime: hours > 0 || minutes > 0 };
  }

  const ref = referenceDate ?? new Date();
  const parsed = chrono.parseDate(input, ref, { forwardDate: true });

  if (!parsed) {
    const suggestions: Record<string, string> = {
      tmrw: "tomorrow",
      tom: "tomorrow",
      tomorow: "tomorrow",
      nxt: "next",
      wk: "week",
    };
    const words = trimmed.split(/\s+/);
    for (const word of words) {
      if (suggestions[word]) {
        throw new DateParseError(input, input.replace(word, suggestions[word]));
      }
    }
    throw new DateParseError(input);
  }

  const hasTime =
    /\d{1,2}:\d{2}|(\d{1,2})\s*(am|pm)/i.test(input) || /at\s+\d/i.test(input);

  return { date: parsed, hasTime };
}

export function parseDateOrNull(input: string | null | undefined, referenceDate?: Date): Date | null {
  if (!input?.trim()) return null;
  try {
    return parseDate(input, referenceDate).date;
  } catch {
    return null;
  }
}

export function formatRelativeDate(date: Date, now?: Date): string {
  const reference = now ?? new Date();
  const diffMs = date.getTime() - reference.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 0 && diffDays <= 7) return `in ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return date.toISOString().split("T")[0];
}
