import type { Application } from "@/lib/db/schema";

type Status = Application["status"];

export const STATUS_LABELS: Record<Status, string> = {
  applied: "Applied",
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
};

export const STATUS_VARIANTS: Record<
  Status,
  "default" | "secondary" | "outline" | "destructive"
> = {
  applied: "secondary",
  screening: "secondary",
  interviewing: "default",
  offer: "default",
  accepted: "default",
  rejected: "destructive",
  withdrawn: "outline",
  ghosted: "destructive",
};
