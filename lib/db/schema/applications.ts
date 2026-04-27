// Auth invariant: every query against `applications` MUST filter by `user_id`.

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { applicationStatus } from "./status";

export const applications = pgTable(
  "applications",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    companyName: text("company_name").notNull(),
    role: text("role").notNull(),
    jobDescription: text("job_description"),
    status: applicationStatus("status").notNull(),
    coverLetterText: text("cover_letter_text"),
    coverLetterObjectKey: text("cover_letter_object_key"),
    coverLetterSizeBytes: integer("cover_letter_size_bytes"),
    coverLetterMime: text("cover_letter_mime"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("applications_user_created_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
  ],
);

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
