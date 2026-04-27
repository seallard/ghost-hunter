"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  changeApplicationStatus,
  createApplication,
  deleteApplication,
  setCoverLetterAttachment,
  updateApplicationFields,
  updateEventNote,
} from "@/lib/applications";
import { applicationStatus } from "@/lib/db/schema";
import { deleteObject } from "@/lib/storage";

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

const UpdateFieldsSchema = z.object({
  applicationId: z.string().uuid(),
  companyName: z.string().trim().min(1).max(200).optional(),
  role: z.string().trim().min(1).max(200).optional(),
  jobDescription: z.string().max(50_000).nullable().optional(),
  jobUrl: z.string().max(2_000).nullable().optional(),
  salary: z.string().max(200).nullable().optional(),
  contactName: z.string().max(200).nullable().optional(),
  contactEmail: z.string().max(320).nullable().optional(),
  contactUrl: z.string().max(2_000).nullable().optional(),
  coverLetterText: z.string().max(50_000).nullable().optional(),
});

export type UpdateFieldsResult = { ok: true } | { ok: false; error: string };

export async function updateApplicationFieldsAction(
  input: z.input<typeof UpdateFieldsSchema>,
): Promise<UpdateFieldsResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");

  const parsed = UpdateFieldsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid input" };

  const { applicationId, ...fields } = parsed.data;
  const updated = await updateApplicationFields(userId, applicationId, fields);
  if (!updated) return { ok: false, error: "not found" };

  revalidatePath("/");
  return { ok: true };
}

const UpdateNoteSchema = z.object({
  eventId: z.string().uuid(),
  note: z.string().max(2_000).nullable(),
});

export type UpdateNoteResult = { ok: true } | { ok: false; error: string };

export async function updateEventNoteAction(
  input: z.input<typeof UpdateNoteSchema>,
): Promise<UpdateNoteResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");

  const parsed = UpdateNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid input" };

  const updated = await updateEventNote(
    userId,
    parsed.data.eventId,
    parsed.data.note,
  );
  if (!updated) return { ok: false, error: "not found" };

  revalidatePath("/");
  return { ok: true };
}

const DeleteApplicationSchema = z.object({
  applicationId: z.string().uuid(),
});

export type DeleteApplicationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteApplicationAction(
  applicationId: string,
): Promise<DeleteApplicationResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");

  const parsed = DeleteApplicationSchema.safeParse({ applicationId });
  if (!parsed.success) return { ok: false, error: "invalid input" };

  const ok = await deleteApplication(userId, parsed.data.applicationId);
  if (!ok) return { ok: false, error: "not found" };

  revalidatePath("/");
  return { ok: true };
}

const ClearUploadSchema = z.object({
  applicationId: z.string().uuid(),
});

export type ClearUploadResult = { ok: true } | { ok: false; error: string };

export async function clearUploadedFileAction(
  input: z.input<typeof ClearUploadSchema>,
): Promise<ClearUploadResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");

  const parsed = ClearUploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid input" };

  const result = await setCoverLetterAttachment(
    userId,
    parsed.data.applicationId,
    null,
  );
  if (!result) return { ok: false, error: "not found" };
  if (result.previousKey) {
    await deleteObject(result.previousKey).catch(() => {});
  }

  revalidatePath("/");
  return { ok: true };
}
