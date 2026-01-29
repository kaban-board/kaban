import { describe, expect, test } from "bun:test";
import { DateParseError, formatRelativeDate, parseDate, parseDateOrNull } from "./date-parser";

describe("parseDate", () => {
  const ref = new Date("2024-01-15T12:00:00");

  describe("relative days", () => {
    test('parses "today"', () => {
      const result = parseDate("today", ref);
      expect(result.date.toDateString()).toBe(ref.toDateString());
      expect(result.hasTime).toBe(false);
    });

    test('parses "tomorrow"', () => {
      const result = parseDate("tomorrow", ref);
      expect(result.date.getDate()).toBe(16);
    });

    test('parses "yesterday"', () => {
      const result = parseDate("yesterday", ref);
      expect(result.date.getDate()).toBe(14);
    });

    test('parses "in 3 days"', () => {
      const result = parseDate("in 3 days", ref);
      expect(result.date.getDate()).toBe(18);
    });

    test('parses "in 0 days" as today', () => {
      const result = parseDate("in 0 days", ref);
      expect(result.date.toDateString()).toBe(ref.toDateString());
    });
  });

  describe("duration format", () => {
    test('parses "1d"', () => {
      const result = parseDate("1d", ref);
      expect(result.date.getDate()).toBe(16);
    });

    test('parses "2w"', () => {
      const result = parseDate("2w", ref);
      expect(result.date.getDate()).toBe(29);
    });

    test('parses "1w 2d"', () => {
      const result = parseDate("1w 2d", ref);
      expect(result.date.getDate()).toBe(24);
    });

    test('parses "2h" with hasTime=true', () => {
      const result = parseDate("2h", ref);
      expect(result.hasTime).toBe(true);
    });
  });

  describe("weekdays", () => {
    test('parses "next monday"', () => {
      const result = parseDate("next monday", ref);
      expect(result.date.getDay()).toBe(1);
      expect(result.date > ref).toBe(true);
    });

    test('parses "friday"', () => {
      const result = parseDate("friday", ref);
      expect(result.date.getDay()).toBe(5);
    });
  });

  describe("with time", () => {
    test('parses "tomorrow at 5pm"', () => {
      const result = parseDate("tomorrow at 5pm", ref);
      expect(result.date.getDate()).toBe(16);
      expect(result.hasTime).toBe(true);
    });

    test('parses "in 2 days at 14:30"', () => {
      const result = parseDate("in 2 days at 14:30", ref);
      expect(result.hasTime).toBe(true);
    });
  });

  describe("ISO format", () => {
    test('parses "2024-03-25"', () => {
      const result = parseDate("2024-03-25", ref);
      expect(result.date.getFullYear()).toBe(2024);
      expect(result.date.getMonth()).toBe(2);
      expect(result.date.getDate()).toBe(25);
    });
  });

  describe("error handling", () => {
    test("throws DateParseError on empty input", () => {
      expect(() => parseDate("", ref)).toThrow(DateParseError);
    });

    test("throws DateParseError on invalid input", () => {
      expect(() => parseDate("asdfghjkl", ref)).toThrow(DateParseError);
    });

    test("throws with suggestion for typos", () => {
      try {
        parseDate("tomorow", ref);
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DateParseError);
        expect((e as DateParseError).suggestion).toContain("tomorrow");
      }
    });

    test("throws on negative duration", () => {
      expect(() => parseDate("-3d", ref)).toThrow(DateParseError);
    });
  });
});

describe("parseDateOrNull", () => {
  const ref = new Date("2024-01-15T12:00:00");

  test("returns null for empty string", () => {
    expect(parseDateOrNull("", ref)).toBeNull();
  });

  test("returns null for null input", () => {
    expect(parseDateOrNull(null, ref)).toBeNull();
  });

  test("returns null for undefined input", () => {
    expect(parseDateOrNull(undefined, ref)).toBeNull();
  });

  test("returns null for invalid input", () => {
    expect(parseDateOrNull("asdfghjkl", ref)).toBeNull();
  });

  test("returns Date for valid input", () => {
    const result = parseDateOrNull("tomorrow", ref);
    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(16);
  });
});

describe("formatRelativeDate", () => {
  const now = new Date("2024-01-15T12:00:00");

  test('formats today as "today"', () => {
    expect(formatRelativeDate(now, now)).toBe("today");
  });

  test('formats tomorrow as "tomorrow"', () => {
    const tomorrow = new Date("2024-01-16T12:00:00");
    expect(formatRelativeDate(tomorrow, now)).toBe("tomorrow");
  });

  test('formats yesterday as "yesterday"', () => {
    const yesterday = new Date("2024-01-14T12:00:00");
    expect(formatRelativeDate(yesterday, now)).toBe("yesterday");
  });

  test('formats "in N days" for near future', () => {
    const future = new Date("2024-01-18T12:00:00");
    expect(formatRelativeDate(future, now)).toBe("in 3 days");
  });

  test("formats ISO date for distant dates", () => {
    const distant = new Date("2024-03-15T12:00:00");
    expect(formatRelativeDate(distant, now)).toBe("2024-03-15");
  });
});
