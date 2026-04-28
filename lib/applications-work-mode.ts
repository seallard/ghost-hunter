import type { Application } from "@/lib/db/schema";

export type WorkMode = NonNullable<Application["workMode"]>;

export const WORK_MODES: readonly WorkMode[] = [
  "in_office",
  "hybrid",
  "remote",
];

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  in_office: "In office",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const WORK_MODE_EMOJIS: Record<WorkMode, string> = {
  in_office: "🏢",
  hybrid: "🏠",
  remote: "🌐",
};
