"use client";

import { useMemo } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import { STATUS_LABELS } from "@/lib/applications-status";
import { type SankeyData } from "@/lib/applications-sankey";

const NODE_LABELS: Record<string, string> = { ...STATUS_LABELS };

const NODE_COLORS: Record<string, string> = {
  applied: "#64748b", // slate-500
  screening: "#0ea5e9", // sky-500
  interviewing: "#6366f1", // indigo-500
  offer: "#f59e0b", // amber-500
  accepted: "#10b981", // emerald-500
  rejected: "#f43f5e", // rose-500
  withdrawn: "#71717a", // zinc-500
  ghosted: "#78716c", // stone-500
};

const MUTED_COLOR = "#94a3b8"; // slate-400

export function ApplicationsSankey({
  data,
  highlightAppIds,
}: {
  data: SankeyData;
  highlightAppIds?: ReadonlySet<string>;
}) {
  const renderedData = useMemo(() => {
    if (!highlightAppIds || highlightAppIds.size === 0) return data;
    const links = data.links.map((link) => {
      const matches = link.appIds.some((id) => highlightAppIds.has(id));
      if (matches) return link;
      return { ...link, startColor: MUTED_COLOR, endColor: MUTED_COLOR };
    });
    return { nodes: data.nodes, links };
  }, [data, highlightAppIds]);

  if (data.nodes.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Track a few applications and update their statuses to see your flow.
      </div>
    );
  }

  return (
    <div className="h-[360px]">
      <ResponsiveSankey
        data={renderedData}
        margin={{ top: 16, right: 110, bottom: 16, left: 110 }}
        align="justify"
        colors={(node) => NODE_COLORS[node.id] ?? "#94a3b8"}
        nodeOpacity={1}
        nodeBorderWidth={0}
        nodeThickness={14}
        nodeSpacing={16}
        nodeBorderRadius={2}
        linkOpacity={0.45}
        linkContract={3}
        enableLinkGradient
        labelPosition="outside"
        labelOrientation="horizontal"
        label={(node) => NODE_LABELS[node.id] ?? node.id}
        labelTextColor={{ from: "color", modifiers: [["darker", 1.2]] }}
        animate={false}
      />
    </div>
  );
}
