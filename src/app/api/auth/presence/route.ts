import { error, handleError, json } from "@/lib/http";
import { updateStore } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function POST() {
  try {
    const user = await requireUser();
    await updateStore((store) => {
      const current = store.users.find((item) => item.id === user.id);
      if (!current) throw new Error("UNAUTHORIZED");
      current.online = true;
      current.lastSeen = new Date().toISOString();
    });
    return json({ online: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return error("Unauthorized", 401);
    return handleError(err);
  }
}