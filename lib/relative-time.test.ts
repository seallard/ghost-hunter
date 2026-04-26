import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

describe("relativeTime", () => {
  const now = new Date("2026-04-26T12:00:00Z");

  it("renders seconds for very recent times", () => {
    const past = new Date(now.getTime() - 30 * 1000);
    expect(relativeTime(past, now)).toMatch(/30 seconds ago|now/);
  });

  it("renders minutes", () => {
    const past = new Date(now.getTime() - 5 * 60 * 1000);
    expect(relativeTime(past, now)).toBe("5 minutes ago");
  });

  it("renders hours", () => {
    const past = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(relativeTime(past, now)).toBe("2 hours ago");
  });

  it("renders days", () => {
    const past = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(relativeTime(past, now)).toBe("3 days ago");
  });

  it("renders months", () => {
    const past = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    expect(relativeTime(past, now)).toBe("2 months ago");
  });

  it("renders future as 'in N units'", () => {
    const future = new Date(now.getTime() + 5 * 60 * 1000);
    expect(relativeTime(future, now)).toBe("in 5 minutes");
  });

  it("accepts an ISO string", () => {
    const past = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(relativeTime(past.toISOString(), now)).toBe("2 hours ago");
  });
});
