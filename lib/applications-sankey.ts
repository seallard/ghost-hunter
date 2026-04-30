import type { Application, ApplicationEvent } from "./db/schema";
import type { Status } from "./applications-status";

export interface SankeyNode {
  id: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  appIds: string[];
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// Rank enforces a DAG so Nivo Sankey doesn't choke on cycles. Backward moves
// (e.g. a manual correction from "rejected" back to "interviewing") are
// dropped — they're rare and would otherwise create cycles.
const RANK: Record<Status, number> = {
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

  const linkData = new Map<string, { value: number; appIds: string[] }>();
  const usedNodes = new Set<string>();

  const bump = (source: string, target: string, appId: string) => {
    const key = `${source}|${target}`;
    const existing = linkData.get(key);
    if (existing) {
      existing.value += 1;
      existing.appIds.push(appId);
    } else {
      linkData.set(key, { value: 1, appIds: [appId] });
    }
    usedNodes.add(source);
    usedNodes.add(target);
  };

  for (const app of applications) {
    const events = [...(eventsByApp.get(app.id) ?? [])].sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
    );
    let prev: Status = "applied";
    for (const ev of events) {
      if (RANK[ev.status] <= RANK[prev]) continue;
      bump(prev, ev.status, app.id);
      prev = ev.status;
    }
  }

  const nodes = Array.from(usedNodes)
    .sort((a, b) => RANK[a as Status] - RANK[b as Status])
    .map((id) => ({ id }));

  const links = Array.from(linkData.entries()).map(
    ([key, { value, appIds }]) => {
      const [source, target] = key.split("|");
      return { source, target, value, appIds };
    },
  );

  return { nodes, links };
}
