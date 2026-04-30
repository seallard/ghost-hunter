import { cn } from "@/lib/utils";
import {
  intensity,
  maxCount,
  type HeatmapCell,
  type HeatmapWeek,
} from "@/lib/applications-heatmap";

const INTENSITY_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted",
  1: "bg-green-200 dark:bg-green-900",
  2: "bg-green-300 dark:bg-green-700",
  3: "bg-green-400 dark:bg-green-600",
  4: "bg-green-500 dark:bg-green-500",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function tooltipFor(cell: HeatmapCell): string {
  const label = cell.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (cell.isFuture) return label;
  if (cell.count === 0) return `No activity · ${label}`;
  const noun = cell.count === 1 ? "application" : "applications";
  return `${cell.count} ${noun} · ${label}`;
}

export function ActivityHeatmap({
  weeks,
  compact = false,
}: {
  weeks: HeatmapWeek[];
  compact?: boolean;
}) {
  const max = maxCount(weeks);
  if (compact) {
    return (
      <div className="flex gap-[2px]" aria-label="90-day application activity">
        {weeks.map((week, i) => (
          <div key={i} className="flex flex-col gap-[2px]">
            {week.cells.map((cell, j) => (
              <div
                key={j}
                title={cell && !cell.isFuture ? tooltipFor(cell) : undefined}
                className={cn(
                  "size-2 rounded-[2px]",
                  cell === null || cell.isFuture
                    ? "bg-transparent"
                    : INTENSITY_CLASSES[intensity(cell.count, max)],
                )}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-[6px]">
        <div className="text-muted-foreground flex flex-col gap-[2px] pt-[14px] text-[10px] leading-3">
          {DAY_LABELS.map((d, i) => (
            <span key={d} className={cn("h-3", i % 2 === 0 ? "" : "invisible")}>
              {d}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-[2px]">
          <div className="text-muted-foreground flex gap-[2px] text-[10px] leading-3">
            {weeks.map((week, i) => (
              <span key={i} className="w-3">
                {week.monthLabel ?? ""}
              </span>
            ))}
          </div>
          <div className="flex gap-[2px]">
            {weeks.map((week, i) => (
              <div key={i} className="flex flex-col gap-[2px]">
                {week.cells.map((cell, j) => (
                  <div
                    key={j}
                    title={
                      cell && !cell.isFuture ? tooltipFor(cell) : undefined
                    }
                    className={cn(
                      "size-3 rounded-[3px]",
                      cell === null || cell.isFuture
                        ? "bg-transparent"
                        : INTENSITY_CLASSES[intensity(cell.count, max)],
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="text-muted-foreground flex items-center gap-1 pl-[44px] text-[10px]">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((lvl) => (
          <span
            key={lvl}
            className={cn("size-3 rounded-[3px]", INTENSITY_CLASSES[lvl])}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
