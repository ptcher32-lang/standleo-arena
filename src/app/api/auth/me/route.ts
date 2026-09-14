import { json } from "@/lib/http";
import { toPublicUser } from "@/lib/serialize";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return json({ user: null });
  return json({ user: { ...toPublicUser(user), email: user.email } });
}
