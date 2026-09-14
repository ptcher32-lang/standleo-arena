import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomToken } from "@/lib/crypto";
import { error, handleError, json, parseBody } from "@/lib/http";
import { toPublicUser } from "@/lib/serialize";
import { requireUser } from "@/lib/session";
import { updateStore } from "@/lib/db";
import { profilePatchSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

const MAX_ANIMATED_FRAME_BYTES = 50 * 1024 * 1024;

function fileExtension(type: string): string {
  return ({
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/ogg": "ogv",
  } as Record<string, string>)[type] ?? "bin";
}

export async function GET() {
  try {
    const user = await requireUser();
    return json({ user: { ...toPublicUser(user), email: user.email } }, 200);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!rateLimit(`profile:${user.id}`, 20, 60_000)) return error("Too many profile changes", 429);
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("avatar");
      const frame = form.get("rankFrame");
      const avatarFrame = form.get("avatarFrame");
      const sticker = form.get("sticker");
      if (frame !== null && !(frame instanceof File)) return error("Frame file is required", 400);
      if (avatarFrame !== null && !(avatarFrame instanceof File)) return error("Avatar frame file is required", 400);
      if (frame instanceof File) {
        const allowedFrameTypes = new Set(["image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime", "video/ogg"]);
        if (!allowedFrameTypes.has(frame.type)) return error("Use GIF, WebP, MP4, MOV or WebM for the frame", 422);
        if (frame.size > MAX_ANIMATED_FRAME_BYTES) return error("Animated frame must be 50 MB or smaller", 422);
      }
      if (file !== null && !(file instanceof File)) return error("Avatar file is required", 400);
      if (sticker !== null && !(sticker instanceof File)) return error("Sticker file is required", 400);
      if (file === null && frame === null && avatarFrame === null && sticker === null) return error("Avatar, frame or sticker file is required", 400);
      const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
      if (file instanceof File && (!allowedTypes.has(file.type) || file.size > 2 * 1024 * 1024)) {
        return error("Avatar must be JPG, PNG, WebP or GIF up to 2 MB", 422);
      }
      if (sticker instanceof File && (!allowedTypes.has(sticker.type) || sticker.size > 1 * 1024 * 1024)) {
        return error("Sticker must be PNG, WebP or GIF up to 1 MB", 422);
      }
      if (avatarFrame instanceof File && (!allowedTypes.has(avatarFrame.type) || avatarFrame.size > 2 * 1024 * 1024)) {
        return error("Avatar frame must be PNG, WebP or GIF up to 2 MB", 422);
      }
      const saveUpload = async (upload: File, label: string) => {
        if (process.env.DATABASE_URL) {
          const bytes = Buffer.from(await upload.arrayBuffer());
          return `data:${upload.type};base64,${bytes.toString("base64")}`;
        }
        const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
        await mkdir(uploadDir, { recursive: true });
        const filename = `${user.id}-${label}-${randomToken(8)}.${fileExtension(upload.type)}`;
        await writeFile(path.join(uploadDir, filename), Buffer.from(await upload.arrayBuffer()));
        return `/uploads/profiles/${filename}`;
      };
      const avatarContent = file instanceof File ? await saveUpload(file, "avatar") : undefined;
      let frameContent: string | undefined;
      if (frame instanceof File) {
        frameContent = await saveUpload(frame, "rank-frame");
      }
      const avatarFrameContent = avatarFrame instanceof File ? await saveUpload(avatarFrame, "avatar-frame") : undefined;
      const stickerContent = sticker instanceof File ? await saveUpload(sticker, "sticker") : undefined;
      const updated = await updateStore((store) => {
        const current = store.users.find((item) => item.id === user.id);
        if (!current) throw new Error("UNAUTHORIZED");
        if (avatarContent) current.avatarUrl = avatarContent;
        if (frameContent) current.rankFrameUrl = frameContent;
        if (avatarFrameContent) current.avatarFrameUrl = avatarFrameContent;
        if (stickerContent) current.stickers = [...(current.stickers ?? []), stickerContent].slice(-6);
        return current;
      });
      return json({ user: { ...toPublicUser(updated), email: updated.email } });
    }
    const body = parseBody(profilePatchSchema, await request.json());
    const updated = await updateStore((store) => {
      if (body.nick && store.users.some((u) => u.nick.toLowerCase() === body.nick!.toLowerCase() && u.id !== user.id)) {
        throw new Error("NICK_TAKEN");
      }
      const current = store.users.find((u) => u.id === user.id);
      if (!current) throw new Error("UNAUTHORIZED");
      if (body.nick) current.nick = body.nick;
      if (body.bio !== undefined) current.bio = body.bio.trim();
      if (body.playstyle !== undefined) current.playstyle = body.playstyle.trim();
      if (body.contact !== undefined) current.contact = body.contact.trim();
      if (body.removeAvatarFrame) current.avatarFrameUrl = undefined;
      if (body.removeRankFrame) current.rankFrameUrl = undefined;
      return current;
    });
    return json({ user: { ...toPublicUser(updated), email: updated.email } });
  } catch (err) {
    if (err instanceof Error && err.message === "NICK_TAKEN") return error("Nick is taken", 409);
    return handleError(err);
  }
}
