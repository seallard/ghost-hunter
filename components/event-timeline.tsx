"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RelativeTime } from "@/components/relative-time";
import { STATUS_CLASSES, STATUS_LABELS } from "@/lib/applications-status";
import type { ApplicationEvent } from "@/lib/db/schema";

export function EventTimeline({
  events,
  onSaveNote,
}: {
  events: ApplicationEvent[];
  onSaveNote: (eventId: string, note: string | null) => void;
}) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">No events yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <EventItem key={event.id} event={event} onSave={onSaveNote} />
      ))}
    </ol>
  );
}

function EventItem({
  event,
  onSave,
}: {
  event: ApplicationEvent;
  onSave: (eventId: string, note: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);

  function save(value: string) {
    setEditing(false);
    const trimmed = value.trim();
    const next = trimmed === "" ? null : trimmed;
    if (next === (event.note ?? null)) return;
    onSave(event.id, next);
  }

  return (
    <li className="flex flex-col gap-1 text-sm">
      <div className="flex items-center gap-3">
        <Badge className={STATUS_CLASSES[event.status]}>
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
