// Auth invariant: every queryable table carries `user_id`. All queries must
// filter on it — no joins-as-auth.

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

export * from "./applications";
export * from "./application-events";
