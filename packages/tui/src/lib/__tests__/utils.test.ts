import { describe, expect, test } from "bun:test";
import { formatRelativeTime, truncate, truncateMiddle } from "../utils.js";

describe("truncate", () => {
  test("returns string unchanged if shorter than max", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  test("returns string unchanged if equal to max", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  test("truncates with ellipsis if longer than max", () => {
    expect(truncate("hello world", 8)).toBe("hello w…");
  });

  test("handles single character max", () => {
    expect(truncate("hello", 1)).toBe("…");
  });

  test("handles empty string", () => {
    expect(truncate("", 10)).toBe("");
  });
});

describe("truncateMiddle", () => {
  test("returns string unchanged if shorter than max", () => {
    expect(truncateMiddle("hello", 10)).toBe("hello");
  });

  test("returns string unchanged if equal to max", () => {
    expect(truncateMiddle("hello", 5)).toBe("hello");
  });

  test("truncates middle with ellipsis if longer than max", () => {
    expect(truncateMiddle("hello world", 8)).toBe("hel...ld");
  });

  test("handles maxLength <= 3", () => {
    expect(truncateMiddle("hello", 3)).toBe("hel");
  });

  test("handles empty string", () => {
    expect(truncateMiddle("", 10)).toBe("");
  });
});

describe("formatRelativeTime", () => {
  test("returns empty string for null", () => {
    expect(formatRelativeTime(null)).toBe("");
  });

  test("returns 'just now' for less than 60 seconds ago", () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  test("returns minutes ago for 1-59 minutes", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("5 min ago");
  });

  test("returns hours ago for 1-23 hours", () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("3h ago");
  });

  test("returns days ago for 1-6 days", () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("2d ago");
  });

  test("returns weeks ago for 7-29 days", () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("2w ago");
  });

  test("returns months ago for 30+ days", () => {
    const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("2mo ago");
  });
});
