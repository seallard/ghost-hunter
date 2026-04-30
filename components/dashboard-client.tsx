"use client";

import { useMemo, useState } from "react";
import { ApplicationsSankey } from "@/components/applications-sankey";
import { ApplicationsTable } from "@/components/applications-table";
import { applyFilter } from "@/lib/applications-filter";
import type { ApplicationWithActivity } from "@/lib/applications";
import type { HeatmapWeek } from "@/lib/applications-heatmap";
import type { SankeyData } from "@/lib/applications-sankey";
import type { ApplicationEvent } from "@/lib/db/schema";

export function DashboardClient({
  applications,
  eventsByApp,
  heatmapWeeks,
  sankey,
}: {
  applications: ApplicationWithActivity[];
  eventsByApp: Map<string, ApplicationEvent[]>;
  heatmapWeeks: HeatmapWeek[];
  sankey: SankeyData;
}) {
  const [search, setSearch] = useState("");

  const highlightAppIds = useMemo<ReadonlySet<string> | undefined>(() => {
    const trimmed = search.trim();
    if (trimmed === "") return undefined;
    const matches = applyFilter(applications, {
      search: trimmed,
      statuses: new Set(),
      sort: { key: "lastActivityAt", dir: "desc" },
    });
    return new Set(matches.map((a) => a.id));
  }, [search, applications]);

  return (
    <>
      <section className="px-6 py-8">
        <ApplicationsTable
          applications={applications}
          eventsByApp={eventsByApp}
          heatmapWeeks={heatmapWeeks}
          search={search}
          onSearchChange={setSearch}
        />
      </section>
      <section className="flex-1 border-t px-6 py-6">
        <div className="mx-auto max-w-4xl">
          <ApplicationsSankey data={sankey} highlightAppIds={highlightAppIds} />
        </div>
      </section>
    </>
  );
}
