import { createWorker } from "tesseract.js";
import path from "path";

let workerPromise: ReturnType<typeof createWorker> | null = null;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9а-яё]/gi, "");
}

async function getWorker() {
  workerPromise ??= createWorker("eng", undefined, {
    workerPath: path.join(process.cwd(), "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js"),
  });
  return workerPromise;
}

export async function recognizeMatchScore(
  image: Buffer,
  teams?: { A: string[]; B: string[] },
): Promise<{ scoreA: number; scoreB: number; winner: "A" | "B"; winnerNick?: string; text: string } | null> {
  const worker = await getWorker();
  const result = await worker.recognize(image);
  const text = result.data.text;
  const pairs = [...text.matchAll(/(?:^|[^0-9])([0-9]{1,2})[^0-9]{0,3}([0-9]{1,2})(?![0-9])/g)]
    .map((match) => [Number(match[1]), Number(match[2])] as const)
    .filter(([left, right]) => left !== right && left <= 99 && right <= 99);
  const scorePair = pairs.find(([left, right]) => left === 8 && right === 0)
    ?? pairs.find(([left, right]) => left === 0 && right === 8);
  if (!scorePair) return null;

  const scoreWinner = scorePair[0] === 8 ? "A" : "B";
  const normalizedText = normalize(text);
  const winnerNick = teams?.A.find((nick) => normalizedText.includes(normalize(nick)))
    ?? teams?.B.find((nick) => normalizedText.includes(normalize(nick)));
  const winner = winnerNick && teams?.B.some((nick) => normalize(nick) === normalize(winnerNick))
    ? "B"
    : winnerNick && teams?.A.some((nick) => normalize(nick) === normalize(winnerNick))
        ? "A"
        : scoreWinner;
  return {
    scoreA: winner === "A" ? 8 : 0,
    scoreB: winner === "B" ? 8 : 0,
    winner,
    winnerNick,
    text,
  };
}
