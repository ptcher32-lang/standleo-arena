import { json } from "@/lib/http";
import { standleoLite } from "@/lib/standleo";

export async function GET() {
  const status = await standleoLite.getServerStatus();
  return json({ status });
}
