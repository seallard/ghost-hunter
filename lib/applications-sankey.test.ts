import { describe, expect, it } from "vitest";
import { buildSankey, type SankeyData } from "./applications-sankey";
import type { Application, ApplicationEvent } from "./db/schema";

function app(id: string, status: Application["status"]): Application {
  return {
    id,
    userId: "u",
    companyName: "Acme",
    role: "SWE",
    jobDescription: null,
    jobUrl: null,
    status,
    workMode: null,
    salary: null,
    contact: null,
    coverLetterText: null,
    coverLetterObjectKey: null,
    coverLetterSizeBytes: null,
    coverLetterMime: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function event(
  applicationId: string,
  status: Application["status"],
  occurredAt: Date,
): ApplicationEvent {
  return {
    id: `${applicationId}-${occurredAt.getTime()}`,
    applicationId,
    userId: "u",
    status,
    note: null,
    scheduledAt: null,
    format: null,
    occurredAt,
    createdAt: occurredAt,
  };
}

function findLink(
  data: SankeyData,
  source: string,
  target: string,
): number | undefined {
  return data.links.find((l) => l.source === source && l.target === target)
    ?.value;
}

describe("buildSankey", () => {
  it("returns empty data for no applications", () => {
    expect(buildSankey([], new Map())).toEqual({ nodes: [], links: [] });
  });

  it("returns empty data when no application has any transitions", () => {
    const data = buildSankey([app("1", "applied")], new Map());
    expect(data).toEqual({ nodes: [], links: [] });
  });

  it("walks a forward path through events", () => {
    const events = new Map<string, ApplicationEvent[]>([
      [
        "1",
        [
          event("1", "screening", new Date(2)),
          event("1", "interviewing", new Date(3)),
          event("1", "offer", new Date(4)),
        ],
      ],
    ]);
    const data = buildSankey([app("1", "offer")], events);
    expect(findLink(data, "applied", "screening")).toBe(1);
    expect(findLink(data, "screening", "interviewing")).toBe(1);
    expect(findLink(data, "interviewing", "offer")).toBe(1);
  });

  it("aggregates transitions across multiple applications", () => {
    const apps = [
      app("a", "interviewing"),
      app("b", "rejected"),
      app("c", "applied"),
    ];
    const events = new Map<string, ApplicationEvent[]>([
      [
        "a",
        [
          event("a", "screening", new Date(2)),
          event("a", "interviewing", new Date(3)),
        ],
      ],
      ["b", [event("b", "rejected", new Date(2))]],
    ]);
    const data = buildSankey(apps, events);
    expect(findLink(data, "applied", "screening")).toBe(1);
    expect(findLink(data, "screening", "interviewing")).toBe(1);
    expect(findLink(data, "applied", "rejected")).toBe(1);
  });

  it("records the contributing app IDs on each link", () => {
    const apps = [app("a", "screening"), app("b", "screening")];
    const events = new Map<string, ApplicationEvent[]>([
      ["a", [event("a", "screening", new Date(2))]],
      ["b", [event("b", "screening", new Date(2))]],
    ]);
    const data = buildSankey(apps, events);
    const link = data.links.find(
      (l) => l.source === "applied" && l.target === "screening",
    );
    expect(link?.value).toBe(2);
    expect(link?.appIds.sort()).toEqual(["a", "b"]);
  });

  it("drops backward transitions to keep the graph acyclic", () => {
    const events = new Map<string, ApplicationEvent[]>([
      [
        "1",
        [
          event("1", "screening", new Date(2)),
          event("1", "applied", new Date(3)),
          event("1", "interviewing", new Date(4)),
        ],
      ],
    ]);
    const data = buildSankey([app("1", "interviewing")], events);
    expect(findLink(data, "applied", "screening")).toBe(1);
    expect(findLink(data, "screening", "applied")).toBeUndefined();
    // Once we ignore the backward move, the next forward jump is screening -> interviewing.
    expect(findLink(data, "screening", "interviewing")).toBe(1);
  });

  it("ignores duplicate same-status events", () => {
    const events = new Map<string, ApplicationEvent[]>([
      [
        "1",
        [
          event("1", "screening", new Date(2)),
          event("1", "screening", new Date(3)),
        ],
      ],
    ]);
    const data = buildSankey([app("1", "screening")], events);
    expect(findLink(data, "applied", "screening")).toBe(1);
    expect(data.links.find((l) => l.source === "screening")).toBeUndefined();
  });

  it("sorts events ascending even when input order is descending", () => {
    const events = new Map<string, ApplicationEvent[]>([
      [
        "1",
        [
          event("1", "interviewing", new Date(3)),
          event("1", "screening", new Date(2)),
        ],
      ],
    ]);
    const data = buildSankey([app("1", "interviewing")], events);
    expect(findLink(data, "applied", "screening")).toBe(1);
    expect(findLink(data, "screening", "interviewing")).toBe(1);
  });
});
