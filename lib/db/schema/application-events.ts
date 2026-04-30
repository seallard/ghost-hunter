// Auth invariant: every query against `application_events` MUST filter by
// `user_id`. The column is denormalized from `applications` so the auth filter
// never requires a join.

import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { interviewFormat } from "./interview-format";
import { applicationStatus } from "./status";

export const applicationEvents = pgTable(
  "application_events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    status: applicationStatus("status").notNull(),
    note: text("note"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    format: interviewFormat("format"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("application_events_app_occurred_idx").on(
      table.applicationId,
      table.occurredAt.desc(),
    ),
    index("application_events_user_idx").on(table.userId),
  ],
);

export type ApplicationEvent = typeof applicationEvents.$inferSelect;
export type NewApplicationEvent = typeof applicationEvents.$inferInsert;
