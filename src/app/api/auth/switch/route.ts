import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { switchSession } from "@/lib/session";
import { toPublicUser } from "@/lib/serialize";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { userId?: string };
    if (!body.userId) return NextResponse.json({ error: "User is required" }, { status: 400 });
    const user = await switchSession(body.userId);
    return NextResponse.json({ user: toPublicUser(user) });
  } catch (error) {
    return handleError(error);
  }
}
