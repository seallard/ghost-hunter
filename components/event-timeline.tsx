"use client";

import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/relative-time";
import { STATUS_LABELS, STATUS_VARIANTS } from "@/lib/applications-status";
import type { ApplicationEvent } from "@/lib/db/schema";

export function EventTimeline({ events }: { events: ApplicationEvent[] }) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">No events yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="flex items-start gap-3 text-sm">
          <Badge variant={STATUS_VARIANTS[event.status]}>
            {STATUS_LABELS[event.status]}
          </Badge>
          <span className="text-muted-foreground">
            <RelativeTime date={event.occurredAt} />
          </span>
          {event.note ? (
            <span className="text-muted-foreground">— {event.note}</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
