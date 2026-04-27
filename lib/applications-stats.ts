import type { Application } from "./db/schema";
import { STATUSES, type Status } from "./applications-status";

export interface AppStats {
  total: number;
  active: number;
  offer: number;
  byStatus: Record<Status, number>;
}

export function computeStats(apps: Pick<Application, "status">[]): AppStats {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    Status,
    number
  >;
  for (const app of apps) byStatus[app.status]++;
  return {
    total: apps.length,
    active: byStatus.screening + byStatus.interviewing,
    offer: byStatus.offer,
    byStatus,
  };
}
