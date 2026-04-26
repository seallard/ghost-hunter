import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAttachmentKey } from "@/lib/applications";
import { getDownloadUrl } from "@/lib/storage";

const KindSchema = z.enum(["resume", "cover-letter"]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id: applicationId } = await params;
  const url = new URL(req.url);
  const kindParse = KindSchema.safeParse(url.searchParams.get("kind"));
  if (!kindParse.success)
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });

  const key = await getAttachmentKey(userId, applicationId, kindParse.data);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const signed = await getDownloadUrl(key);
  return NextResponse.redirect(signed, 302);
}
