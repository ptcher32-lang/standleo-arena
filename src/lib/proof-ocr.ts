import { createWorker } from "tesseract.js";
import path from "path";

let workerPromise: ReturnType<typeof createWorker> | null = null;

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9а-яёіїєґ]/gi, "");
}

type ScoreCandidate = {
  left: number;
  right: number;
  text: string;
  rank: number;
};

function findScore(text: string, teams: { A: string[]; B: string[] }): [number, number] | null {
  const normalizedText = normalize(text);
  const participantText = [...teams.A, ...teams.B]
    .map(normalize)
    .filter((nick) => nick.length >= 3);
  const candidates: ScoreCandidate[] = [];
  for (const line of text.split(/\r?\n/)) {
    for (const match of line.matchAll(/(?:^|[^0-9])([0-9]{1,2})\s*([:–—-])\s*([0-9]{1,2})(?![0-9])/g)) {
      const left = Number(match[1]);
      const right = Number(match[3]);
      if (left !== right && left <= 99 && right <= 99) {
        candidates.push({ left, right, text: line, rank: 30 });
      }
    }
    for (const match of line.matchAll(/(?:^|[^0-9])([0-9]{1,2})\s+([0-9]{1,2})(?![0-9])/g)) {
      const left = Number(match[1]);
      const right = Number(match[2]);
      if (left !== right && left <= 99 && right <= 99) {
        const hasParticipant = participantText.some((nick) => normalizedText.includes(nick));
        candidates.push({ left, right, text: line, rank: hasParticipant ? 20 : 10 });
      }
    }
  }
  const best = candidates.sort((a, b) => b.rank - a.rank)[0];
  return best ? [best.left, best.right] : null;
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
  const scorePair = findScore(text, teams ?? { A: [], B: [] });
  if (!scorePair) return null;

  const scoreWinner = scorePair[0] > scorePair[1] ? "A" : "B";
  const normalizedText = normalize(text);
  const winnerNick = [...(teams?.A ?? []), ...(teams?.B ?? [])]
    .filter((nick) => normalize(nick).length >= 3)
    .sort((a, b) => normalize(b).length - normalize(a).length)
    .find((nick) => normalizedText.includes(normalize(nick)));
  const nickWinner = winnerNick && teams?.B.some((nick) => normalize(nick) === normalize(winnerNick))
    ? "B"
    : winnerNick && teams?.A.some((nick) => normalize(nick) === normalize(winnerNick))
      ? "A"
      : null;
  const winner = nickWinner ?? scoreWinner;
  const scoreA = nickWinner && nickWinner !== scoreWinner ? scorePair[1] : scorePair[0];
  const scoreB = nickWinner && nickWinner !== scoreWinner ? scorePair[0] : scorePair[1];
  return {
    scoreA,
    scoreB,
    winner,
    winnerNick,
    text,
  };
}
