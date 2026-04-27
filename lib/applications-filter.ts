import type { ApplicationWithActivity } from "@/lib/applications";
import { STATUSES, type Status } from "@/lib/applications-status";

export type SortKey = "companyName" | "role" | "status" | "lastActivityAt";
export type SortDir = "asc" | "desc";

export interface FilterOptions {
  search: string;
  statuses: ReadonlySet<Status>;
  sort: { key: SortKey; dir: SortDir };
}

const STATUS_INDEX: Record<Status, number> = Object.fromEntries(
  STATUSES.map((s, i) => [s, i]),
) as Record<Status, number>;

function compare(
  a: ApplicationWithActivity,
  b: ApplicationWithActivity,
  key: SortKey,
): number {
  switch (key) {
    case "companyName":
      return a.companyName.localeCompare(b.companyName, undefined, {
        sensitivity: "base",
      });
    case "role":
      return a.role.localeCompare(b.role, undefined, { sensitivity: "base" });
    case "status":
      return STATUS_INDEX[a.status] - STATUS_INDEX[b.status];
    case "lastActivityAt":
      return a.lastActivityAt.getTime() - b.lastActivityAt.getTime();
  }
}

export function applyFilter(
  apps: ApplicationWithActivity[],
  options: FilterOptions,
): ApplicationWithActivity[] {
  const needle = options.search.trim().toLowerCase();
  const { statuses, sort } = options;

  const filtered = apps.filter((app) => {
    if (statuses.size > 0 && !statuses.has(app.status)) return false;
    if (needle === "") return true;
    const haystack = `${app.companyName} ${app.role}`.toLowerCase();
    return haystack.includes(needle);
  });

  const sign = sort.dir === "desc" ? -1 : 1;
  return filtered.sort((a, b) => sign * compare(a, b, sort.key));
}
