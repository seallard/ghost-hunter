"use client";

import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_CLASSES, STATUS_LABELS } from "@/lib/applications-status";
import {
  INTERVIEW_FORMAT_EMOJIS,
  INTERVIEW_FORMAT_LABELS,
} from "@/lib/applications-interview-format";
import type { UpcomingInterview } from "@/lib/applications-interviews";
import { formatScheduledAt } from "@/lib/relative-time";

export function UpcomingInterviews({
  items,
  onSelect,
}: {
  items: UpcomingInterview[];
  onSelect: (appId: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="border-border bg-muted/30 rounded-md border">
      <div className="text-muted-foreground flex items-center gap-1.5 px-3 pt-2 text-xs font-medium tracking-wide uppercase">
        <Calendar className="size-3.5" />
        Upcoming interviews
      </div>
      <ul className="divide-border divide-y">
        {items.map(({ app, event }) => (
          <li key={event.id}>
            <button
              type="button"
              onClick={() => onSelect(app.id)}
              className="hover:bg-muted/60 flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm"
            >
              <Badge className={STATUS_CLASSES.interviewing}>
                {STATUS_LABELS.interviewing}
              </Badge>
              <span className="font-medium">{app.companyName}</span>
              <span className="text-muted-foreground">{app.role}</span>
              <span className="text-foreground ml-auto tabular-nums">
                {formatScheduledAt(event.scheduledAt!)}
              </span>
              {event.format ? (
                <span
                  className="text-muted-foreground text-xs"
                  title={INTERVIEW_FORMAT_LABELS[event.format]}
                >
                  {INTERVIEW_FORMAT_EMOJIS[event.format]}{" "}
                  {INTERVIEW_FORMAT_LABELS[event.format]}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
