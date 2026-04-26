"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createApplication } from "@/lib/applications";

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
