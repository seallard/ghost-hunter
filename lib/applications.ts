// Auth invariant: every helper in this file takes `userId` as a required
// parameter and filters on it. Never read userId from auth() here — that's
// the server action's job.

import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { db } from "./db";
import { applicationEvents, applications, type Application } from "./db/schema";

export type ApplicationWithActivity = Application & { lastActivityAt: Date };

export async function listApplications(
  userId: string,
): Promise<ApplicationWithActivity[]> {
  return db
    .select({
      ...getTableColumns(applications),
      lastActivityAt: sql<Date>`COALESCE(
        (SELECT MAX(application_events.occurred_at)
           FROM application_events
           WHERE application_events.application_id = applications.id),
        applications.created_at
      )`
        .mapWith((value) => new Date(value as string))
        .as("last_activity_at"),
    })
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt));
}

export async function createApplication(
  userId: string,
  input: { companyName: string; role: string },
): Promise<Application> {
  const [row] = await db
    .insert(applications)
    .values({
      userId,
      companyName: input.companyName,
      role: input.role,
      status: "applied",
    })
    .returning();
  return row;
}

export async function changeApplicationStatus(
  userId: string,
  applicationId: string,
  newStatus: Application["status"],
): Promise<Application | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(applications)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.userId, userId),
        ),
      )
      .returning();

    if (!updated) return null;

    await tx.insert(applicationEvents).values({
      applicationId,
      userId,
      status: newStatus,
    });

    return updated;
  });
}
