"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { changeApplicationStatus, createApplication } from "@/lib/applications";
import { applicationStatus } from "@/lib/db/schema";

const NewApplicationSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
});

export type CreateApplicationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string[] | undefined> };

export async function createApplicationAction(
  formData: FormData,
): Promise<CreateApplicationResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");

  const parsed = NewApplicationSchema.safeParse({
    companyName: formData.get("companyName"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  await createApplication(userId, parsed.data);
  revalidatePath("/");
  return { ok: true };
}

const ChangeStatusSchema = z.object({
  applicationId: z.string().uuid(),
  newStatus: z.enum(applicationStatus.enumValues),
});

export type ChangeStatusResult = { ok: true } | { ok: false; error: string };

export async function changeApplicationStatusAction(
  applicationId: string,
  newStatus: string,
): Promise<ChangeStatusResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");

  const parsed = ChangeStatusSchema.safeParse({ applicationId, newStatus });
  if (!parsed.success) return { ok: false, error: "invalid input" };

  const updated = await changeApplicationStatus(
    userId,
    parsed.data.applicationId,
    parsed.data.newStatus,
  );
  if (!updated) return { ok: false, error: "not found" };

  revalidatePath("/");
  return { ok: true };
}
