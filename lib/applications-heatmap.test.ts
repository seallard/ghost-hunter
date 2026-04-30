import { describe, expect, it } from "vitest";
import {
  buildHeatmap,
  dateKey,
  intensity,
  type HeatmapCell,
} from "./applications-heatmap";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("buildHeatmap", () => {
  it("returns 13 weeks for days=90", () => {
    const weeks = buildHeatmap(new Map(), day("2026-04-22"), 90);
    expect(weeks).toHaveLength(13);
    for (const w of weeks) expect(w.cells).toHaveLength(7);
  });

  it("places today at the matching weekday in the last week", () => {
    // 2026-04-22 is a Wednesday (Sun=0, Wed=3)
    const today = day("2026-04-22");
    const weeks = buildHeatmap(new Map(), today, 90);
    const last = weeks[weeks.length - 1];
    const todayCell = last.cells[3] as HeatmapCell;
    expect(todayCell).not.toBeNull();
    expect(dateKey(todayCell.date)).toBe("2026-04-22");
    expect(todayCell.isFuture).toBe(false);
  });

  it("marks cells after today in the last week as isFuture", () => {
    // Wednesday today → Thu, Fri, Sat are future
    const weeks = buildHeatmap(new Map(), day("2026-04-22"), 90);
    const last = weeks[weeks.length - 1];
    expect((last.cells[4] as HeatmapCell).isFuture).toBe(true);
    expect((last.cells[5] as HeatmapCell).isFuture).toBe(true);
    expect((last.cells[6] as HeatmapCell).isFuture).toBe(true);
  });

  it("places today as the last cell when today is a Saturday", () => {
    const today = day("2026-04-25");
    const weeks = buildHeatmap(new Map(), today, 90);
    const last = weeks[weeks.length - 1];
    const todayCell = last.cells[6] as HeatmapCell;
    expect(dateKey(todayCell.date)).toBe("2026-04-25");
    expect(todayCell.isFuture).toBe(false);
  });

  it("marks cells before the 90-day window as null", () => {
    // today=Sat 2026-04-25, window starts Jan 26; grid starts Sun Jan 25
    const weeks = buildHeatmap(new Map(), day("2026-04-25"), 90);
    expect(weeks[0].cells[0]).toBeNull();
    expect(weeks[0].cells[1]).not.toBeNull();
  });

  it("attributes counts from the input map by date key", () => {
    const counts = new Map<string, number>([
      ["2026-04-20", 3],
      ["2026-04-15", 1],
    ]);
    const weeks = buildHeatmap(counts, day("2026-04-25"), 90);
    const flat = weeks
      .flatMap((w) => w.cells)
      .filter((c): c is HeatmapCell => c !== null);
    const apr20 = flat.find((c) => dateKey(c.date) === "2026-04-20");
    const apr15 = flat.find((c) => dateKey(c.date) === "2026-04-15");
    const apr14 = flat.find((c) => dateKey(c.date) === "2026-04-14");
    expect(apr20?.count).toBe(3);
    expect(apr15?.count).toBe(1);
    expect(apr14?.count).toBe(0);
  });

  it("sets monthLabel on the column where each new month begins", () => {
    const weeks = buildHeatmap(new Map(), day("2026-04-25"), 90);
    // First week starts Sun Jan 25 → "Jan"
    expect(weeks[0].monthLabel).toBe("Jan");
    // Subsequent weeks within a month → null until month rolls over
    const labels = weeks.map((w) => w.monthLabel);
    expect(labels).toContain("Feb");
    expect(labels).toContain("Mar");
    expect(labels).toContain("Apr");
    // No two adjacent labels equal (each label fires once at month boundary)
    for (let i = 1; i < labels.length; i++) {
      if (labels[i] !== null) expect(labels[i]).not.toBe(labels[i - 1]);
    }
  });
});

describe("intensity", () => {
  it("returns 0 for no activity regardless of max", () => {
    expect(intensity(0, 10)).toBe(0);
    expect(intensity(0, 0)).toBe(0);
  });

  it("buckets by quartiles of the busiest day", () => {
    const max = 12;
    expect(intensity(1, max)).toBe(1); // 8% → q1
    expect(intensity(3, max)).toBe(1); // 25% → q1
    expect(intensity(4, max)).toBe(2); // 33% → q2
    expect(intensity(6, max)).toBe(2); // 50% → q2
    expect(intensity(7, max)).toBe(3); // 58% → q3
    expect(intensity(9, max)).toBe(3); // 75% → q3
    expect(intensity(10, max)).toBe(4); // 83% → q4
    expect(intensity(12, max)).toBe(4); // 100% → q4
  });

  it("treats every active day as max color when max is 1", () => {
    expect(intensity(1, 1)).toBe(4);
  });
});
