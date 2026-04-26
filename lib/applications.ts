// Auth invariant: every helper in this file takes `userId` as a required
// parameter and filters on it. Never read userId from auth() here — that's
// the server action's job.

import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { applications, type Application } from "./db/schema";

export async function listApplications(userId: string): Promise<Application[]> {
  return db
    .select()
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
