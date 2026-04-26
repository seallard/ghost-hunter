"use client";

import { useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { EventTimeline } from "@/components/event-timeline";
import { updateApplicationFieldsAction } from "@/app/actions/applications";
import type { Application, ApplicationEvent } from "@/lib/db/schema";

type FieldKey = "jobDescription" | "resumeText" | "coverLetterText";

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "jobDescription", label: "Job description" },
  { key: "resumeText", label: "Resume" },
  { key: "coverLetterText", label: "Cover letter" },
];

export function ApplicationDetail({
  application,
  events,
}: {
  application: Application;
  events: ApplicationEvent[];
}) {
  const [pending, startTransition] = useTransition();

  function saveField(key: FieldKey, value: string) {
    const original = application[key] ?? "";
    if (value === original) return;

    startTransition(async () => {
      const result = await updateApplicationFieldsAction({
        applicationId: application.id,
        [key]: value === "" ? null : value,
      });
      if (!result.ok) {
        console.error("update fields failed", result.error);
      }
    });
  }

  return (
    <div className="bg-muted/30 space-y-4 px-4 py-4">
      <div className="grid gap-4 md:grid-cols-3">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground font-medium">{label}</span>
            <Textarea
              defaultValue={application[key] ?? ""}
              disabled={pending}
              onBlur={(e) => saveField(key, e.currentTarget.value)}
              rows={6}
              className="bg-background"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-muted-foreground text-sm font-medium">Timeline</h3>
        <EventTimeline events={events} />
      </div>
    </div>
  );
}
