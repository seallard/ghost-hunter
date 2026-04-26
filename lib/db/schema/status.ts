import { pgEnum } from "drizzle-orm/pg-core";

export const applicationStatus = pgEnum("application_status", [
  "applied",
  "screening",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
  "ghosted",
]);
