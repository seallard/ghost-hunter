import { describe, expect, it } from "vitest";
import {
  buildSankey,
  SUBMITTED_NODE_ID,
  type SankeyData,
} from "./applications-sankey";
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

  it("represents an app stuck at applied as submitted -> applied only", () => {
    const data = buildSankey([app("1", "applied")], new Map());
    expect(findLink(data, SUBMITTED_NODE_ID, "applied")).toBe(1);
    expect(data.links).toHaveLength(1);
    expect(data.nodes.map((n) => n.id)).toEqual([SUBMITTED_NODE_ID, "applied"]);
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
    expect(findLink(data, SUBMITTED_NODE_ID, "applied")).toBe(1);
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
    expect(findLink(data, SUBMITTED_NODE_ID, "applied")).toBe(3);
    expect(findLink(data, "applied", "screening")).toBe(1);
    expect(findLink(data, "screening", "interviewing")).toBe(1);
    expect(findLink(data, "applied", "rejected")).toBe(1);
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
