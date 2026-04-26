import { sql } from "drizzle-orm";
import { afterEach } from "vitest";
import { db } from "@/lib/db";

afterEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE applications, application_events RESTART IDENTITY CASCADE`,
  );
});
