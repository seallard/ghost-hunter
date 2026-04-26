"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RelativeTime } from "@/components/relative-time";
import { STATUS_LABELS, STATUS_VARIANTS } from "@/lib/applications-status";
import type { ApplicationEvent } from "@/lib/db/schema";
import { updateEventNoteAction } from "@/app/actions/applications";

export function EventTimeline({ events }: { events: ApplicationEvent[] }) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">No events yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <EventItem key={event.id} event={event} />
      ))}
    </ol>
  );
}

function EventItem({ event }: { event: ApplicationEvent }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(value: string) {
    setEditing(false);
    const trimmed = value.trim();
    const next = trimmed === "" ? null : trimmed;
    if (next === (event.note ?? null)) return;

    startTransition(async () => {
      const result = await updateEventNoteAction({
        eventId: event.id,
        note: next,
      });
      if (!result.ok) {
        console.error("update note failed", result.error);
      }
    });
  }

  return (
    <li className="flex flex-col gap-1 text-sm">
      <div className="flex items-center gap-3">
        <Badge variant={STATUS_VARIANTS[event.status]}>
          {STATUS_LABELS[event.status]}
        </Badge>
        <span className="text-muted-foreground">
          <RelativeTime date={event.occurredAt} />
        </span>
      </div>
      {editing ? (
        <Textarea
          autoFocus
          defaultValue={event.note ?? ""}
          disabled={pending}
          onBlur={(e) => save(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          rows={2}
          className="bg-background"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-foreground rounded text-left text-sm"
        >
          {event.note ?? <span className="italic opacity-70">Add note…</span>}
        </button>
      )}
    </li>
  );
}
