import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { attachUploadedFile, getApplicationOwner } from "@/lib/applications";
import { buildObjectKey, deleteObject, uploadObject } from "@/lib/storage";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id: applicationId } = await params;

  const owner = await getApplicationOwner(applicationId);
  if (owner !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  if (file.type !== "application/pdf")
    return NextResponse.json({ error: "must be PDF" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "too large" }, { status: 413 });

  const key = buildObjectKey(userId, applicationId);
  const buf = Buffer.from(await file.arrayBuffer());
  await uploadObject(key, buf, file.type);

  const result = await attachUploadedFile(
    userId,
    applicationId,
    key,
    file.size,
    file.type,
  );
  if (!result) {
    await deleteObject(key).catch(() => {});
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (result.previousKey) {
    await deleteObject(result.previousKey).catch(() => {});
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
