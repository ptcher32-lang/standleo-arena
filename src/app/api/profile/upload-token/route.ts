import { NextRequest, NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { requireUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  await requireUser();
  const body = await request.json();
  const response = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ["image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime", "video/ogg"],
      maximumSizeInBytes: 50 * 1024 * 1024,
      addRandomSuffix: true,
    }),
    onUploadCompleted: async () => undefined,
  });
  return NextResponse.json(response);
}
