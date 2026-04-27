import type { Application } from "@/lib/db/schema";

export type Status = Application["status"];

export const STATUSES: readonly Status[] = [
  "applied",
  "screening",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
  "ghosted",
];

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

export const STATUS_CLASSES: Record<Status, string> = {
  applied: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  screening: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  interviewing:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  offer: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  accepted:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  withdrawn: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  ghosted: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};
