import type { Application, ApplicationEvent } from "./db/schema";
import type { Status } from "./applications-status";

export const SUBMITTED_NODE_ID = "submitted";

export interface SankeyNode {
  id: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// Rank enforces a DAG so Nivo Sankey doesn't choke on cycles. Backward moves
// (e.g. a manual correction from "rejected" back to "interviewing") are
// dropped — they're rare and would otherwise create cycles.
const RANK: Record<Status | typeof SUBMITTED_NODE_ID, number> = {
  submitted: -1,
  applied: 0,
  screening: 1,
  interviewing: 2,
  offer: 3,
  accepted: 4,
  rejected: 5,
  withdrawn: 5,
  ghosted: 5,
};

export function buildSankey(
  applications: Pick<Application, "id" | "status">[],
  eventsByApp: Map<string, ApplicationEvent[]>,
): SankeyData {
  if (applications.length === 0) return { nodes: [], links: [] };

  const linkCounts = new Map<string, number>();
  const usedNodes = new Set<string>();

  const bump = (source: string, target: string) => {
    const key = `${source}|${target}`;
    linkCounts.set(key, (linkCounts.get(key) ?? 0) + 1);
    usedNodes.add(source);
    usedNodes.add(target);
  };

  bump(SUBMITTED_NODE_ID, "applied");
  // Synthetic edge weight: every app contributes 1, regardless of further
  // movement. linkCounts already has this baseline.
  linkCounts.set(`${SUBMITTED_NODE_ID}|applied`, applications.length);

  for (const app of applications) {
    const events = [...(eventsByApp.get(app.id) ?? [])].sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
    );
    let prev: Status = "applied";
    for (const ev of events) {
      if (RANK[ev.status] <= RANK[prev]) continue;
      bump(prev, ev.status);
      prev = ev.status;
    }
  }

  const nodes = Array.from(usedNodes)
    .sort((a, b) => RANK[a as Status] - RANK[b as Status])
    .map((id) => ({ id }));

  const links = Array.from(linkCounts.entries()).map(([key, value]) => {
    const [source, target] = key.split("|");
    return { source, target, value };
  });

  return { nodes, links };
}
