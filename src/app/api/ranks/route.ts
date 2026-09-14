import { json } from "@/lib/http";
import { RANKS } from "@/lib/ranks";

export async function GET() {
  return json({
    ranks: RANKS.map((r) => ({
      name: r.name,
      min: r.min,
      max: r.max === Number.POSITIVE_INFINITY ? null : r.max,
      tier: r.tier,
      color: r.color,
    })),
  });
}
