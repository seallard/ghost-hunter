"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RelativeTime } from "@/components/relative-time";
import { STATUS_CLASSES, STATUS_LABELS } from "@/lib/applications-status";
import {
  INTERVIEW_FORMATS,
  INTERVIEW_FORMAT_EMOJIS,
  INTERVIEW_FORMAT_LABELS,
  type InterviewFormat,
} from "@/lib/applications-interview-format";
import { formatScheduledAt, toDatetimeLocalValue } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type { ApplicationEvent } from "@/lib/db/schema";

export type EventFieldsUpdate = Partial<
  Pick<ApplicationEvent, "note" | "scheduledAt" | "format">
>;

export function EventTimeline({
  events,
  onSaveEvent,
}: {
  events: ApplicationEvent[];
  onSaveEvent: (eventId: string, fields: EventFieldsUpdate) => void;
}) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">No events yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <EventItem key={event.id} event={event} onSave={onSaveEvent} />
      ))}
    </ol>
  );
}

function EventItem({
  event,
  onSave,
}: {
  event: ApplicationEvent;
  onSave: (eventId: string, fields: EventFieldsUpdate) => void;
}) {
  const [editing, setEditing] = useState(false);
  const isInterview = event.status === "interviewing";

  return (
    <li className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-center gap-3">
        <Badge className={STATUS_CLASSES[event.status]}>
          {STATUS_LABELS[event.status]}
        </Badge>
        <span className="text-muted-foreground">
          <RelativeTime date={event.occurredAt} />
        </span>
      </div>
      {isInterview ? (
        <InterviewEditor event={event} onSave={onSave} />
      ) : editing ? (
        <Textarea
          autoFocus
          defaultValue={event.note ?? ""}
          onBlur={(e) => {
            setEditing(false);
            const value = e.currentTarget.value.trim();
            const next = value === "" ? null : value;
            if (next === (event.note ?? null)) return;
            onSave(event.id, { note: next });
          }}
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

function InterviewEditor({
  event,
  onSave,
}: {
  event: ApplicationEvent;
  onSave: (eventId: string, fields: EventFieldsUpdate) => void;
}) {
  const [editingNote, setEditingNote] = useState(false);

  function handleScheduledChange(value: string) {
    const next = value === "" ? null : new Date(value);
    const current = event.scheduledAt ? event.scheduledAt.getTime() : null;
    if ((next?.getTime() ?? null) === current) return;
    onSave(event.id, { scheduledAt: next });
  }

  function handleFormatToggle(format: InterviewFormat) {
    const next = event.format === format ? null : format;
    onSave(event.id, { format: next });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="datetime-local"
          defaultValue={
            event.scheduledAt ? toDatetimeLocalValue(event.scheduledAt) : ""
          }
          onBlur={(e) => handleScheduledChange(e.currentTarget.value)}
          className="border-input bg-background text-foreground h-8 rounded-md border px-2 text-sm"
          aria-label="Scheduled time"
        />
        <div className="flex items-center gap-1">
          {INTERVIEW_FORMATS.map((f) => {
            const active = event.format === f;
            return (
              <button
                type="button"
                key={f}
                onClick={() => handleFormatToggle(f)}
                aria-pressed={active}
                className={cn(
                  "cursor-pointer rounded-md border px-2 py-0.5 text-xs transition-colors",
                  active
                    ? "border-foreground/40 bg-foreground/5 text-foreground"
                    : "border-input text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="mr-1">{INTERVIEW_FORMAT_EMOJIS[f]}</span>
                {INTERVIEW_FORMAT_LABELS[f]}
              </button>
            );
          })}
        </div>
        {event.scheduledAt ? (
          <span className="text-muted-foreground text-xs">
            {formatScheduledAt(event.scheduledAt)}
          </span>
        ) : null}
      </div>
      {editingNote ? (
        <Textarea
          autoFocus
          defaultValue={event.note ?? ""}
          onBlur={(e) => {
            setEditingNote(false);
            const value = e.currentTarget.value.trim();
            const next = value === "" ? null : value;
            if (next === (event.note ?? null)) return;
            onSave(event.id, { note: next });
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setEditingNote(false);
            }
          }}
          rows={2}
          placeholder="Zoom link, address, prep notes…"
          className="bg-background"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingNote(true)}
          className="text-muted-foreground hover:text-foreground rounded text-left text-sm"
        >
          {event.note ?? <span className="italic opacity-70">Add note…</span>}
        </button>
      )}
    </div>
  );
}
