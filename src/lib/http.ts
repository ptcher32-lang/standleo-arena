import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function parseBody<T>(schema: ZodSchema<T>, raw: unknown): T {
  return schema.parse(raw);
}

export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return error(err.issues[0]?.message ?? "Invalid input", 422);
  }
  if (err instanceof SyntaxError) {
    return error("Invalid JSON body", 400);
  }
  if (err instanceof Error) {
    if (err.message === "UNAUTHORIZED") return error("Unauthorized", 401);
    if (err.message === "FORBIDDEN") return error("Forbidden", 403);
  }
  console.error(err);
  return error("Server error", 500);
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
