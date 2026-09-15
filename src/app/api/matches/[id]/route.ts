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
import { finishMatch } from "@/lib/matchmaking";

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
    const detected = await Promise.race([
      recognizeMatchScore(image, {
      A: currentMatch.teamA.map((slot) => current.users.find((item) => item.id === slot.userId)?.nick ?? ""),
      B: currentMatch.teamB.map((slot) => current.users.find((item) => item.id === slot.userId)?.nick ?? ""),
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 30_000)),
    ]);
    const uploaded = await (async () => {
      const { updateStore } = await import("@/lib/db");
      return updateStore(async (store) => {
        const match = store.matches.find((item) => item.id === id);
        if (!match) throw new Error("MATCH_NOT_FOUND");
        const uploadDir = path.join(process.cwd(), "public", "uploads", "matches");
        await mkdir(uploadDir, { recursive: true });
        const extension = proof.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
        const filename = `${id}-${randomToken(8)}.${extension}`;
        await writeFile(path.join(uploadDir, filename), image);
        match.proofUrl = `/uploads/matches/${filename}`;
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
      ? await finishMatch(
          id,
          uploaded.detectedWinner!,
          uploaded.detectedScoreA!,
          uploaded.detectedScoreB!,
          true,
        )
      : uploaded;
    return json({ match: completed });
  } catch (err) {
    if (err instanceof Error && err.message === "MATCH_NOT_FOUND") return error("Матч не найден", 404);
    return handleError(err);
  }
}
