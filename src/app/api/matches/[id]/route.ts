import { NextRequest } from "next/server";
import { readStore } from "@/lib/db";
import { error, handleError, json } from "@/lib/http";
import { maybeAutoFinish } from "@/lib/matchmaking";
import { toPublicUser } from "@/lib/serialize";
import { requireUser } from "@/lib/session";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomToken } from "@/lib/crypto";
import { recognizeMatchScore } from "@/lib/proof-ocr";
import { updatePlayerStats } from "@/lib/matchmaking";
import { put } from "@vercel/blob";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = await readStore();
  const found = store.matches.find((m) => m.id === id);
  if (!found) return error("Match not found", 404);
  const match = await maybeAutoFinish(found);
  const fresh = await readStore();
  const users = Object.fromEntries(fresh.users.map((u) => [u.id, toPublicUser(u)]));
  return json({ match, users });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const user = await requireUser();
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json() as { action?: string };
      if (body.action !== "manual_confirm") return error("Unknown match action", 400);
      const current = await readStore();
      const match = current.matches.find((item) => item.id === id);
      if (!match) return error("Матч не найден", 404);
      const side = match.teamA.some((slot) => slot.userId === user.id)
        ? "A"
        : match.teamB.some((slot) => slot.userId === user.id) ? "B" : null;
      if (!side) return error("Forbidden", 403);
      if (!match.proofUrl) return error("Сначала загрузите скрин результата", 422);
      const completed = await updatePlayerStats(
        id,
        user.id,
        side === "A" ? 8 : 0,
        side === "B" ? 8 : 0,
        true,
      );
      return json({ match: completed });
    }
    const form = await request.formData();
    const proof = form.get("proof");
    if (!(proof instanceof File) || !proof.type.startsWith("image/")) return error("Нужен файл изображения", 422);
    if (proof.size > MAX_PROOF_BYTES) return error("Скриншот должен быть до 5 MB", 422);
    const image = Buffer.from(await proof.arrayBuffer());
    const current = await readStore();
    const currentMatch = current.matches.find((item) => item.id === id);
    if (!currentMatch) return error("Матч не найден", 404);
    const participant = [...currentMatch.teamA, ...currentMatch.teamB].some((slot) => slot.userId === user.id);
    if (!participant) return error("Forbidden", 403);
    const legacyNickAliases: Record<string, string[]> = {
      u_001: ["39393"],
    };
    const nickForSlot = (slot: { userId: string }) => {
      const matchedUser = current.users.find((item) => item.id === slot.userId);
      return [
        matchedUser?.nick ?? "",
        ...(legacyNickAliases[slot.userId] ?? []),
      ];
    };
    let detected: Awaited<ReturnType<typeof recognizeMatchScore>> = null;
    try {
      detected = await Promise.race([
        recognizeMatchScore(image, {
          A: currentMatch.teamA.flatMap(nickForSlot),
          B: currentMatch.teamB.flatMap(nickForSlot),
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 30_000)),
      ]);
    } catch (error) {
      console.error("Match proof OCR failed", error);
    }
    const uploaded = await (async () => {
      const { updateStore } = await import("@/lib/db");
      return updateStore(async (store) => {
        const match = store.matches.find((item) => item.id === id);
        if (!match) throw new Error("MATCH_NOT_FOUND");
        const extension = proof.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
        const filename = `${id}-${randomToken(8)}.${extension}`;
        if (process.env.DATABASE_URL && process.env.BLOB_READ_WRITE_TOKEN) {
          const blob = await put(`matches/${filename}`, image, {
            access: "public",
            contentType: proof.type,
            addRandomSuffix: false,
          });
          match.proofUrl = blob.url;
        } else {
          const uploadDir = path.join(process.cwd(), "public", "uploads", "matches");
          await mkdir(uploadDir, { recursive: true });
          await writeFile(path.join(uploadDir, filename), image);
          match.proofUrl = `/uploads/matches/${filename}`;
        }
        match.proofAttached = false;
        if (detected) {
          match.detectedScoreA = detected.scoreA;
          match.detectedScoreB = detected.scoreB;
          match.detectedWinner = detected.winner;
          match.detectedWinnerNick = detected.winnerNick;
        }
        return match;
      });
    })();
    const completed = uploaded.detectedWinner
      ? await updatePlayerStats(
          id,
          uploaded.detectedWinner!,
          uploaded.detectedScoreA!,
          uploaded.detectedScoreB!,
          true,
        )
      : uploaded;
    return json({ match: completed, needsManualConfirmation: !uploaded.detectedWinner });
  } catch (err) {
    if (err instanceof Error && err.message === "MATCH_NOT_FOUND") return error("Матч не найден", 404);
    if (err instanceof Error && err.message === "WINNER_NOT_IN_MATCH") return error("Победитель не является участником матча", 422);
    return handleError(err);
  }
}
