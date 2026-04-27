"use client";

import { useRef, useState } from "react";
import { Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EventTimeline } from "@/components/event-timeline";
import type { Application, ApplicationEvent } from "@/lib/db/schema";

type FieldKey = "jobDescription" | "coverLetterText";

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "jobDescription", label: "Job description" },
  { key: "coverLetterText", label: "Cover letter (paste)" },
];

export function ApplicationDetail({
  application,
  events,
  onSaveField,
  onClearCoverLetter,
  onSaveNote,
}: {
  application: Application;
  events: ApplicationEvent[];
  onSaveField: (key: FieldKey, value: string) => void;
  onClearCoverLetter: () => void;
  onSaveNote: (eventId: string, note: string | null) => void;
}) {
  function saveField(key: FieldKey, value: string) {
    const original = application[key] ?? "";
    if (value === original) return;
    onSaveField(key, value);
  }

  return (
    <div className="bg-muted/30 space-y-4 px-4 py-4">
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground font-medium">{label}</span>
            <Textarea
              defaultValue={application[key] ?? ""}
              onBlur={(e) => saveField(key, e.currentTarget.value)}
              rows={6}
              className="bg-background"
            />
          </label>
        ))}
      </div>
      <CoverLetterAttachment
        applicationId={application.id}
        objectKey={application.coverLetterObjectKey}
        sizeBytes={application.coverLetterSizeBytes}
        onClear={onClearCoverLetter}
      />
      <div className="flex flex-col gap-2">
        <h3 className="text-muted-foreground text-sm font-medium">Timeline</h3>
        <EventTimeline events={events} onSaveNote={onSaveNote} />
      </div>
    </div>
  );
}

const COVER_LETTER_LABEL = "Cover letter PDF";

function CoverLetterAttachment({
  applicationId,
  objectKey,
  sizeBytes,
  onClear,
}: {
  applicationId: string;
  objectKey: string | null;
  sizeBytes: number | null;
  onClear: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Must be a PDF");
      return;
    }
    setPending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/applications/${applicationId}/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? `Upload failed (${res.status})`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted-foreground font-medium">
        {COVER_LETTER_LABEL}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) uploadFile(file);
          e.currentTarget.value = "";
        }}
      />
      {objectKey ? (
        <div className="flex items-center gap-2">
          <a
            href={`/api/applications/${applicationId}/download`}
            target="_blank"
            rel="noopener"
            className="bg-background hover:bg-muted flex flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5"
          >
            <Paperclip className="size-4" />
            <span className="truncate">
              {COVER_LETTER_LABEL}
              {sizeBytes != null ? ` · ${formatSize(sizeBytes)}` : ""}
            </span>
          </a>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
          >
            Replace
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={pending}
            onClick={onClear}
            aria-label={`Remove ${COVER_LETTER_LABEL}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          className="self-start"
        >
          {pending ? "Uploading…" : "Upload PDF"}
        </Button>
      )}
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
