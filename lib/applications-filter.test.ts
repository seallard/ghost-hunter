import { describe, expect, it } from "vitest";
import { applyFilter, type FilterOptions } from "./applications-filter";
import type { ApplicationWithActivity } from "./applications";
import type { Status } from "./applications-status";

function app(
  overrides: Partial<ApplicationWithActivity> & {
    id: string;
    companyName: string;
    role: string;
    status: Status;
    lastActivityAt: Date;
  },
): ApplicationWithActivity {
  return {
    userId: "u",
    jobDescription: null,
    jobUrl: null,
    salary: null,
    contactName: null,
    contactEmail: null,
    contactUrl: null,
    coverLetterText: null,
    coverLetterObjectKey: null,
    coverLetterSizeBytes: null,
    coverLetterMime: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

const defaults: FilterOptions = {
  search: "",
  statuses: new Set(),
  sort: { key: "lastActivityAt", dir: "desc" },
};

describe("applyFilter", () => {
  it("passes everything when search empty and statuses empty", () => {
    const apps = [
      app({
        id: "1",
        companyName: "Acme",
        role: "SWE",
        status: "applied",
        lastActivityAt: new Date(2),
      }),
      app({
        id: "2",
        companyName: "Globex",
        role: "PM",
        status: "rejected",
        lastActivityAt: new Date(1),
      }),
    ];
    expect(applyFilter(apps, defaults).map((a) => a.id)).toEqual(["1", "2"]);
  });

  it("matches search against company name (case-insensitive)", () => {
    const apps = [
      app({
        id: "1",
        companyName: "Acme",
        role: "SWE",
        status: "applied",
        lastActivityAt: new Date(1),
      }),
      app({
        id: "2",
        companyName: "Globex",
        role: "PM",
        status: "applied",
        lastActivityAt: new Date(2),
      }),
    ];
    const result = applyFilter(apps, { ...defaults, search: "ACM" });
    expect(result.map((a) => a.id)).toEqual(["1"]);
  });

  it("matches search against role", () => {
    const apps = [
      app({
        id: "1",
        companyName: "Acme",
        role: "Backend Engineer",
        status: "applied",
        lastActivityAt: new Date(1),
      }),
      app({
        id: "2",
        companyName: "Globex",
        role: "Product Manager",
        status: "applied",
        lastActivityAt: new Date(2),
      }),
    ];
    expect(
      applyFilter(apps, { ...defaults, search: "engineer" }).map((a) => a.id),
    ).toEqual(["1"]);
  });

  it("filters by status set membership", () => {
    const apps = [
      app({
        id: "1",
        companyName: "A",
        role: "x",
        status: "applied",
        lastActivityAt: new Date(1),
      }),
      app({
        id: "2",
        companyName: "B",
        role: "x",
        status: "screening",
        lastActivityAt: new Date(2),
      }),
      app({
        id: "3",
        companyName: "C",
        role: "x",
        status: "rejected",
        lastActivityAt: new Date(3),
      }),
    ];
    const result = applyFilter(apps, {
      ...defaults,
      statuses: new Set(["applied", "screening"]),
    });
    expect(result.map((a) => a.id).sort()).toEqual(["1", "2"]);
  });

  it("sorts by companyName asc and desc (case-insensitive)", () => {
    const apps = [
      app({
        id: "1",
        companyName: "banana",
        role: "x",
        status: "applied",
        lastActivityAt: new Date(1),
      }),
      app({
        id: "2",
        companyName: "Apple",
        role: "x",
        status: "applied",
        lastActivityAt: new Date(2),
      }),
      app({
        id: "3",
        companyName: "Cherry",
        role: "x",
        status: "applied",
        lastActivityAt: new Date(3),
      }),
    ];
    expect(
      applyFilter(apps, {
        ...defaults,
        sort: { key: "companyName", dir: "asc" },
      }).map((a) => a.id),
    ).toEqual(["2", "1", "3"]);
    expect(
      applyFilter(apps, {
        ...defaults,
        sort: { key: "companyName", dir: "desc" },
      }).map((a) => a.id),
    ).toEqual(["3", "1", "2"]);
  });

  it("sorts by status using workflow order, not alphabetical", () => {
    const apps = [
      app({
        id: "rej",
        companyName: "x",
        role: "x",
        status: "rejected",
        lastActivityAt: new Date(1),
      }),
      app({
        id: "app",
        companyName: "x",
        role: "x",
        status: "applied",
        lastActivityAt: new Date(2),
      }),
      app({
        id: "int",
        companyName: "x",
        role: "x",
        status: "interviewing",
        lastActivityAt: new Date(3),
      }),
    ];
    expect(
      applyFilter(apps, {
        ...defaults,
        sort: { key: "status", dir: "asc" },
      }).map((a) => a.id),
    ).toEqual(["app", "int", "rej"]);
  });

  it("sorts by lastActivityAt", () => {
    const apps = [
      app({
        id: "1",
        companyName: "x",
        role: "x",
        status: "applied",
        lastActivityAt: new Date(100),
      }),
      app({
        id: "2",
        companyName: "x",
        role: "x",
        status: "applied",
        lastActivityAt: new Date(300),
      }),
      app({
        id: "3",
        companyName: "x",
        role: "x",
        status: "applied",
        lastActivityAt: new Date(200),
      }),
    ];
    expect(
      applyFilter(apps, {
        ...defaults,
        sort: { key: "lastActivityAt", dir: "desc" },
      }).map((a) => a.id),
    ).toEqual(["2", "3", "1"]);
  });

  it("composes search + status filter + sort", () => {
    const apps = [
      app({
        id: "1",
        companyName: "Acme Corp",
        role: "SWE",
        status: "applied",
        lastActivityAt: new Date(1),
      }),
      app({
        id: "2",
        companyName: "Acme Inc",
        role: "PM",
        status: "screening",
        lastActivityAt: new Date(2),
      }),
      app({
        id: "3",
        companyName: "Acme Ltd",
        role: "SWE",
        status: "rejected",
        lastActivityAt: new Date(3),
      }),
      app({
        id: "4",
        companyName: "Globex",
        role: "SWE",
        status: "applied",
        lastActivityAt: new Date(4),
      }),
    ];
    const result = applyFilter(apps, {
      search: "acme",
      statuses: new Set(["applied", "screening"]),
      sort: { key: "companyName", dir: "asc" },
    });
    expect(result.map((a) => a.id)).toEqual(["1", "2"]);
  });

  it("returns empty array when nothing matches", () => {
    const apps = [
      app({
        id: "1",
        companyName: "Acme",
        role: "SWE",
        status: "applied",
        lastActivityAt: new Date(1),
      }),
    ];
    expect(applyFilter(apps, { ...defaults, search: "missing" })).toHaveLength(
      0,
    );
  });
});
