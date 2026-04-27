import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCoverLetterKey } from "@/lib/applications";
import { getDownloadUrl } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id: applicationId } = await params;

  const key = await getCoverLetterKey(userId, applicationId);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const signed = await getDownloadUrl(key);
  return NextResponse.redirect(signed, 302);
}
