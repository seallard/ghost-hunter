import { describe, expect, it } from "vitest";
import { computeStats } from "./applications-stats";
import type { Status } from "./applications-status";

const a = (status: Status) => ({ status });

describe("computeStats", () => {
  it("returns all zeros for empty input", () => {
    const s = computeStats([]);
    expect(s.total).toBe(0);
    expect(s.active).toBe(0);
    expect(s.offer).toBe(0);
    expect(s.byStatus.applied).toBe(0);
    expect(s.byStatus.screening).toBe(0);
    expect(s.byStatus.interviewing).toBe(0);
    expect(s.byStatus.offer).toBe(0);
    expect(s.byStatus.accepted).toBe(0);
    expect(s.byStatus.rejected).toBe(0);
    expect(s.byStatus.withdrawn).toBe(0);
    expect(s.byStatus.ghosted).toBe(0);
  });

  it("counts one of each status correctly", () => {
    const s = computeStats([
      a("applied"),
      a("screening"),
      a("interviewing"),
      a("offer"),
      a("accepted"),
      a("rejected"),
      a("withdrawn"),
      a("ghosted"),
    ]);
    expect(s.total).toBe(8);
    expect(s.active).toBe(2);
    expect(s.offer).toBe(1);
    for (const status of [
      "applied",
      "screening",
      "interviewing",
      "offer",
      "accepted",
      "rejected",
      "withdrawn",
      "ghosted",
    ] as Status[]) {
      expect(s.byStatus[status]).toBe(1);
    }
  });

  it("aggregates duplicates per status", () => {
    const s = computeStats([
      a("applied"),
      a("applied"),
      a("applied"),
      a("rejected"),
      a("rejected"),
    ]);
    expect(s.total).toBe(5);
    expect(s.byStatus.applied).toBe(3);
    expect(s.byStatus.rejected).toBe(2);
  });

  it("excludes applied and terminal states from active", () => {
    const s = computeStats([
      a("applied"),
      a("rejected"),
      a("accepted"),
      a("withdrawn"),
      a("ghosted"),
    ]);
    expect(s.active).toBe(0);
  });

  it("active includes screening + interviewing", () => {
    const s = computeStats([a("screening"), a("screening"), a("interviewing")]);
    expect(s.active).toBe(3);
  });

  it("offer count does not include accepted", () => {
    const s = computeStats([a("offer"), a("accepted"), a("accepted")]);
    expect(s.offer).toBe(1);
  });
});
