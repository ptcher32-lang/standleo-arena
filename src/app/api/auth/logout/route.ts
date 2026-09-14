import { json } from "@/lib/http";
import { destroySession, getSessionUser } from "@/lib/session";
import { updateStore } from "@/lib/db";

export async function POST() {
  const user = await getSessionUser();
  if (user) {
    await updateStore((store) => {
      const u = store.users.find((item) => item.id === user.id);
      if (u) {
        u.online = false;
        u.lastSeen = new Date().toISOString();
      }
    });
  }
  await destroySession();
  return json({ ok: true });
}
