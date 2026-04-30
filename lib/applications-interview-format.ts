import type { ApplicationEvent } from "@/lib/db/schema";

export type InterviewFormat = NonNullable<ApplicationEvent["format"]>;

export const INTERVIEW_FORMATS: readonly InterviewFormat[] = [
  "phone",
  "video",
  "onsite",
];

export const INTERVIEW_FORMAT_LABELS: Record<InterviewFormat, string> = {
  phone: "Phone",
  video: "Video",
  onsite: "Onsite",
};

export const INTERVIEW_FORMAT_EMOJIS: Record<InterviewFormat, string> = {
  phone: "📞",
  video: "💻",
  onsite: "🏢",
};
