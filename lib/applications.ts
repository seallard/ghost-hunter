// Auth invariant: every helper in this file takes `userId` as a required
// parameter and filters on it. Never read userId from auth() here — that's
// the server action's job.

import { and, desc, eq, getTableColumns, gte, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  applicationEvents,
  applications,
  type Application,
  type ApplicationEvent,
} from "./db/schema";

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

export async function getApplicationCountsByDay(
  userId: string,
  days: number = 90,
): Promise<Map<string, number>> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  const day = sql<string>`(date_trunc('day', ${applications.createdAt} AT TIME ZONE 'UTC'))::date`;
  const rows = await db
    .select({
      day: day.as("day"),
      count: sql<number>`COUNT(*)::int`.as("count"),
    })
    .from(applications)
    .where(
      and(eq(applications.userId, userId), gte(applications.createdAt, since)),
    )
    .groupBy(day);

  const byDay = new Map<string, number>();
  for (const row of rows) {
    const day: unknown = row.day;
    const key =
      day instanceof Date
        ? day.toISOString().slice(0, 10)
        : String(day).slice(0, 10);
    byDay.set(key, Number(row.count));
  }
  return byDay;
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

export async function getApplicationEvents(
  userId: string,
  applicationId: string,
): Promise<ApplicationEvent[]> {
  return db
    .select()
    .from(applicationEvents)
    .where(
      and(
        eq(applicationEvents.applicationId, applicationId),
        eq(applicationEvents.userId, userId),
      ),
    )
    .orderBy(desc(applicationEvents.occurredAt));
}

export async function getEventsForApplications(
  userId: string,
  applicationIds: string[],
): Promise<Map<string, ApplicationEvent[]>> {
  const byApp = new Map<string, ApplicationEvent[]>();
  if (applicationIds.length === 0) return byApp;
  const rows = await db
    .select()
    .from(applicationEvents)
    .where(
      and(
        eq(applicationEvents.userId, userId),
        inArray(applicationEvents.applicationId, applicationIds),
      ),
    )
    .orderBy(desc(applicationEvents.occurredAt));
  for (const ev of rows) {
    const list = byApp.get(ev.applicationId) ?? [];
    list.push(ev);
    byApp.set(ev.applicationId, list);
  }
  return byApp;
}

export async function updateApplicationFields(
  userId: string,
  applicationId: string,
  fields: {
    companyName?: string;
    role?: string;
    jobDescription?: string | null;
    jobUrl?: string | null;
    salary?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactUrl?: string | null;
    coverLetterText?: string | null;
  },
): Promise<Application | null> {
  const [updated] = await db
    .update(applications)
    .set({ ...fields, updatedAt: new Date() })
    .where(
      and(eq(applications.id, applicationId), eq(applications.userId, userId)),
    )
    .returning();
  return updated ?? null;
}

export async function deleteApplication(
  userId: string,
  applicationId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(applications)
    .where(
      and(eq(applications.id, applicationId), eq(applications.userId, userId)),
    )
    .returning({ id: applications.id });
  return deleted.length > 0;
}

export async function getApplicationOwner(
  applicationId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ userId: applications.userId })
    .from(applications)
    .where(eq(applications.id, applicationId));
  return row?.userId ?? null;
}

export async function getCoverLetterKey(
  userId: string,
  applicationId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ key: applications.coverLetterObjectKey })
    .from(applications)
    .where(
      and(eq(applications.id, applicationId), eq(applications.userId, userId)),
    );
  return row?.key ?? null;
}

export type CoverLetterAttachment = { key: string; size: number; mime: string };

export async function setCoverLetterAttachment(
  userId: string,
  applicationId: string,
  attachment: CoverLetterAttachment | null,
): Promise<{ previousKey: string | null } | null> {
  return db.transaction(async (tx) => {
    const owned = and(
      eq(applications.id, applicationId),
      eq(applications.userId, userId),
    );

    const [existing] = await tx
      .select({ key: applications.coverLetterObjectKey })
      .from(applications)
      .where(owned);
    if (!existing) return null;

    await tx
      .update(applications)
      .set({
        coverLetterObjectKey: attachment?.key ?? null,
        coverLetterSizeBytes: attachment?.size ?? null,
        coverLetterMime: attachment?.mime ?? null,
        updatedAt: new Date(),
      })
      .where(owned);

    return { previousKey: existing.key ?? null };
  });
}

export async function updateEventNote(
  userId: string,
  eventId: string,
  note: string | null,
): Promise<ApplicationEvent | null> {
  const [updated] = await db
    .update(applicationEvents)
    .set({ note })
    .where(
      and(
        eq(applicationEvents.id, eventId),
        eq(applicationEvents.userId, userId),
      ),
    )
    .returning();
  return updated ?? null;
}
