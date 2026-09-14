import { mkdir, readdir, readFile, rename, stat, writeFile } from "fs/promises";
import path from "path";
import { Pool } from "@neondatabase/serverless";
import { createSeed } from "./seed";
import type { StoreData } from "./types";
import { randomToken } from "./crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

let cache: StoreData | null = null;
let writeChain: Promise<void> = Promise.resolve();
let initialization: Promise<StoreData> | null = null;
let pool: Pool | null = null;

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_TABLE = "standleo_store";

function useDatabase(): boolean {
  return Boolean(DATABASE_URL);
}

function databasePool(): Pool {
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({ connectionString: DATABASE_URL });
  return pool;
}

function normalizeStore(store: StoreData): StoreData {
  store.deviceBans ??= [];
  store.sessions ??= [];
  return store;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function persistStore(store: StoreData): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const temporaryPath = `${STORE_PATH}.${process.pid}.${randomToken(6)}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(store, null, 2), "utf8");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rename(temporaryPath, STORE_PATH);
      return;
    } catch (err) {
      const code = err instanceof Error && "code" in err ? err.code : undefined;
      if (code !== "EPERM" && code !== "EACCES" && code !== "EBUSY") throw err;
      await delay(50 * (attempt + 1));
    }
  }
  throw new Error("Store file is temporarily locked");
}

function extensionForMime(mime: string): string {
  return ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/ogg": "ogv",
  } as Record<string, string>)[mime] ?? "bin";
}

async function externalizeProfileMedia(store: StoreData): Promise<void> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
  let changed = false;
  for (const user of store.users) {
    const fields = ["avatarUrl", "avatarFrameUrl", "rankFrameUrl"] as const;
    for (const field of fields) {
      const value = user[field];
      if (!value?.startsWith("data:")) continue;
      const match = value.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) continue;
      await mkdir(uploadDir, { recursive: true });
      const filename = `${user.id}-${field}-${randomToken(8)}.${extensionForMime(match[1])}`;
      await writeFile(path.join(uploadDir, filename), Buffer.from(match[2], "base64"));
      user[field] = `/uploads/profiles/${filename}`;
      changed = true;
    }

    if (user.stickers) {
      const stickers: string[] = [];
      for (const sticker of user.stickers) {
        if (!sticker.startsWith("data:")) {
          stickers.push(sticker);
          continue;
        }
        const match = sticker.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          stickers.push(sticker);
          continue;
        }
        await mkdir(uploadDir, { recursive: true });
        const filename = `${user.id}-sticker-${randomToken(8)}.${extensionForMime(match[1])}`;
        await writeFile(path.join(uploadDir, filename), Buffer.from(match[2], "base64"));
        stickers.push(`/uploads/profiles/${filename}`);
        changed = true;
      }
      user.stickers = stickers;
    }
  }
  if (changed) await persistStore(store);
}

async function restoreMissingProfileMedia(store: StoreData): Promise<void> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
  let files: string[];
  try {
    files = await readdir(uploadDir);
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") return;
    throw err;
  }
  let changed = false;
  for (const user of store.users) {
    const candidates = files.filter((file) => file.startsWith(`${user.id}-`));
    const latest = async (part: string) => {
      const matching = candidates.filter((file) => file.includes(part));
      const entries = await Promise.all(matching.map(async (file) => ({
        file,
        modified: (await stat(path.join(uploadDir, file))).mtimeMs,
      })));
      return entries.sort((a, b) => b.modified - a.modified)[0]?.file;
    };
    if (!user.avatarUrl) {
      const file = await latest("-avatar-");
      if (file) {
        user.avatarUrl = `/uploads/profiles/${file}`;
        changed = true;
      }
    }
    if (!user.rankFrameUrl) {
      const file = await latest("-rank-frame-");
      if (file) {
        user.rankFrameUrl = `/uploads/profiles/${file}`;
        changed = true;
      }
    }
    if (!user.avatarFrameUrl) {
      const file = await latest("-avatar-frame-");
      if (file) {
        user.avatarFrameUrl = `/uploads/profiles/${file}`;
        changed = true;
      }
    }
  }
  if (changed) await persistStore(store);
}

function removeSeedActivity(store: StoreData): StoreData {
  // User accounts are persistent data. Never remove them during startup migrations.
  return store;
}

function removeExtraLiveMatch(store: StoreData): StoreData {
  return store;
  /*
  const matches = store.matches.length === 2 && store.matches.some((match) => match.status === "live")
    ? store.matches.filter((match) => match.status === "live")
    : store.matches;
  const match = matches[0];
  if (
    match &&
    match.status === "live" &&
    match.teamA.length === 1 &&
    match.teamB.length === 1 &&
    match.teamA[0].userId === "u_000"
  ) {
    match.status = "completed";
    match.scoreA = 8;
    match.scoreB = 0;
    match.winner = "A";
    match.endedAt = new Date().toISOString();
    match.teamA[0] = { ...match.teamA[0], ping: 65, money: 10000, kills: 16, deaths: 0, assists: 0, mmrDelta: 24, mmrAfter: match.teamA[0].mmrBefore + 24 };
    match.teamB[0] = { ...match.teamB[0], ping: 58, money: 0, kills: 0, deaths: 8, assists: 0 };
    match.mvpId = match.teamA[0].userId;
    const admin = store.users.find((user) => user.id === "u_000");
    const opponent = store.users.find((user) => user.id === match.teamB[0].userId);
    if (admin) admin.nick = "eosinginfo";
    if (opponent) opponent.nick = "39393";
  }
  if (match && match.teamA.length === 1 && match.teamA[0].userId === "u_000" && match.teamA[0].kills === 16) {
    match.teamA[0].kills = 8;
  }
  if (match && match.teamA.length === 1 && match.teamB.length === 1 && match.teamA[0].userId === "u_000") {
    const admin = store.users.find((user) => user.id === "u_000");
    const opponent = store.users.find((user) => user.id === match.teamB[0].userId);
    if (admin) {
      admin.nick = "eosinginfo";
      admin.profileBadges ??= ["⚓", "♛", "💠", "▣", "🗡", "🎮"];
      admin.verified = true;
      admin.mmr = match.teamA[0].mmrAfter;
      admin.peakMmr = Math.max(admin.peakMmr, admin.mmr);
      admin.wins = 1;
      admin.losses = 0;
      admin.currentStreak = 1;
      admin.winStreak = Math.max(admin.winStreak, 1);
      const resultAt = match.endedAt ?? new Date().toISOString();
      admin.mmrHistory = [...admin.mmrHistory.filter((entry) => entry.at !== resultAt), { at: resultAt, mmr: admin.mmr }].slice(-40);
    }
    if (opponent) {
      opponent.nick = "39393";
      if (admin && !admin.rankFrameUrl && opponent.rankFrameUrl) admin.rankFrameUrl = opponent.rankFrameUrl;
      match.teamB[0].mmrDelta = -24;
      match.teamB[0].mmrAfter = Math.max(0, match.teamB[0].mmrBefore - 24);
      opponent.mmr = match.teamB[0].mmrAfter;
      opponent.peakMmr = Math.max(0, opponent.mmr);
      opponent.wins = 0;
      opponent.losses = 1;
      opponent.currentStreak = -1;
      opponent.winStreak = 0;
      const resultAt = match.endedAt ?? new Date().toISOString();
      opponent.mmrHistory = [...opponent.mmrHistory.filter((entry) => entry.at !== resultAt), { at: resultAt, mmr: opponent.mmr }].slice(-40);
    }
  }
  for (const request of store.friendRequests) {
    if (request.status !== "accepted") continue;
    const exists = store.friendships.some(
      (friendship) =>
        (friendship.a === request.fromId && friendship.b === request.toId) ||
        (friendship.a === request.toId && friendship.b === request.fromId),
    );
    if (!exists) store.friendships.push({ a: request.fromId, b: request.toId, since: request.createdAt });
  }
  return {
    ...store,
    matches,
  };
  */
}

async function ensureStore(): Promise<StoreData> {
  if (cache) return cache;
  if (initialization) return initialization;
  initialization = (async () => {
    if (useDatabase()) {
      const db = databasePool();
      await db.query(`
        CREATE TABLE IF NOT EXISTS ${DATABASE_TABLE} (
          id integer PRIMARY KEY CHECK (id = 1),
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      const existing = await db.query<{ data: StoreData }>(
        `SELECT data FROM ${DATABASE_TABLE} WHERE id = 1`,
      );
      if (existing.rows[0]) {
        cache = normalizeStore(existing.rows[0].data);
        return cache;
      }
      cache = removeSeedActivity(createSeed());
      await db.query(
        `INSERT INTO ${DATABASE_TABLE} (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING`,
        [JSON.stringify(cache)],
      );
      // Another process may have initialized the row while this process was
      // creating the schema, so always read the committed value back.
      const initialized = await db.query<{ data: StoreData }>(
        `SELECT data FROM ${DATABASE_TABLE} WHERE id = 1`,
      );
      cache = normalizeStore(initialized.rows[0]?.data ?? cache);
      return cache;
    }
    try {
      const raw = await readFile(STORE_PATH, "utf8");
      cache = normalizeStore(JSON.parse(raw.replace(/^\uFEFF/, "")) as StoreData);
      await externalizeProfileMedia(cache);
      await restoreMissingProfileMedia(cache);
      const migrated = removeExtraLiveMatch(removeSeedActivity(cache));
      cache = migrated;
      await persistStore(cache);
      return cache;
    } catch (err) {
      if (!(err instanceof Error && "code" in err && err.code === "ENOENT")) {
        throw err;
      }
      cache = removeSeedActivity(createSeed());
      await mkdir(DATA_DIR, { recursive: true });
      await persistStore(cache);
      return cache;
    }
  })();
  try {
    return await initialization;
  } finally {
    initialization = null;
  }
}

export async function readStore(): Promise<StoreData> {
  return ensureStore();
}

export async function reloadStore(): Promise<StoreData> {
  if (useDatabase()) {
    await ensureStore();
    const result = await databasePool().query<{ data: StoreData }>(
      `SELECT data FROM ${DATABASE_TABLE} WHERE id = 1`,
    );
    if (!result.rows[0]) return ensureStore();
    cache = normalizeStore(result.rows[0].data);
    return cache;
  }
  const raw = await readFile(STORE_PATH, "utf8");
  const store = normalizeStore(JSON.parse(raw.replace(/^\uFEFF/, "")) as StoreData);
  cache = store;
  return store;
}

export async function updateStore<T>(mutator: (store: StoreData) => T | Promise<T>): Promise<T> {
  const run = async () => {
    if (useDatabase()) {
      await ensureStore();
      const client = await databasePool().connect();
      try {
        await client.query("BEGIN");
        // Serialize writers across application instances, not just within
        // this process. The row lock also protects the read/modify/write.
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          DATABASE_TABLE,
        ]);
        const result = await client.query<{ data: StoreData }>(
          `SELECT data FROM ${DATABASE_TABLE} WHERE id = 1 FOR UPDATE`,
        );
        const store = normalizeStore(result.rows[0]?.data ?? removeSeedActivity(createSeed()));
        const value = await mutator(store);
        await client.query(
          `INSERT INTO ${DATABASE_TABLE} (id, data) VALUES (1, $1::jsonb)
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
          [JSON.stringify(store)],
        );
        await client.query("COMMIT");
        cache = store;
        return value;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    }
    const store = await ensureStore();
    const result = await mutator(store);
    cache = store;
    await persistStore(store);
    return result;
  };

  const next = writeChain.then(run, run);
  writeChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
