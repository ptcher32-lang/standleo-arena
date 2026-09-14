import { hashPassword, publicIdFromSeed } from "./crypto";
import { isoDaysAgo } from "./serialize";
import type { Match, MatchMode, MatchPlayer, NewsArticle, Report, StoreData, User } from "./types";
import { getRankName } from "./ranks";
import { calcMmrDelta } from "./mmr";

const NICKS = [
  "Nyx", "Vortex", "Kite", "Ashen", "Rogue", "Pulse", "Nova", "Drift",
  "Hex", "Sable", "Orbit", "Wraith", "Juno", "Cipher", "Echo", "Riven",
  "Stride", "Vesper", "Moth", "Quark", "Lumen", "Fable", "Knurl", "Ivy",
  "Onyx", "Zephyr", "Haze", "Bolt", "Mire", "Prowl", "Glint", "Nadir",
  "Solace", "Brisk", "Kestrel", "Dusk",
];

function hashForSeed(password: string): string {
  return hashPassword(password);
}

function makeUser(
  index: number,
  nick: string,
  mmr: number,
  email: string,
  password: string,
  role: User["role"] = "user",
  extra?: Partial<User>,
): User {
  const createdAt = isoDaysAgo(90 - index, index);
  const matches = 18 + ((index * 7) % 40);
  const winPct = 0.42 + ((index % 9) * 0.03);
  const wins = Math.round(matches * winPct);
  const losses = matches - wins;
  const kills = matches * (12 + (index % 8));
  const deaths = matches * (10 + (index % 6));
  const history: User["mmrHistory"] = [];
  let cursor = Math.max(200, mmr - 180);
  for (let i = 12; i >= 0; i--) {
    cursor += ((index + i) % 5) * 8 - 12;
    cursor = Math.max(80, cursor);
    history.push({ at: isoDaysAgo(i * 3, 2), mmr: i === 0 ? mmr : cursor });
  }
  history[history.length - 1].mmr = mmr;

  return {
    id: `u_${index.toString().padStart(3, "0")}`,
    publicId: publicIdFromSeed(`standleo-${nick}-${index}`),
    email,
    passwordHash: hashForSeed(password),
    nick,
    avatarHue: (index * 37) % 360,
    createdAt,
    role,
    banned: false,
    mmr,
    peakMmr: mmr + 40 + (index % 60),
    wins,
    losses,
    kills,
    deaths,
    winStreak: 2 + (index % 6),
    currentStreak: index % 4 === 0 ? -2 : 1 + (index % 5),
    mmrHistory: history,
    achievements: index % 3 === 0 ? ["first_blood", "ten_wins"] : ["first_blood"],
    online: index % 3 !== 0,
    lastSeen: isoDaysAgo(0, index % 5),
    ...extra,
  };
}

function slot(user: User, kills: number, deaths: number, assists: number, delta: number): MatchPlayer {
  const mmrAfter = Math.max(0, user.mmr + delta);
  return {
    userId: user.id,
    kills,
    deaths,
    assists,
    mmrBefore: user.mmr,
    mmrDelta: delta,
    mmrAfter,
    rankBefore: getRankName(user.mmr),
    rankAfter: getRankName(mmrAfter),
  };
}

export function createSeed(): StoreData {
  const mmrs = [
    180, 320, 430, 500, 640, 800, 880, 980, 1100, 1200, 1300, 1400,
    1480, 1560, 1640, 1700, 1900, 2200, 250, 360, 470, 540, 700, 760,
    900, 1000, 1120, 1180, 1288, 1420, 1500, 1588, 1660, 1740, 2000, 2300,
  ];

  const users: User[] = [
    makeUser(0, "eosinginfo", 0, "ptcher32@gmail.com", "Admin#2026", "admin", {
      achievements: ["founder", "first_blood", "ten_wins", "rank_climber", "hot_streak"],
      wins: 0,
      losses: 0,
      kills: 0,
      deaths: 0,
      winStreak: 0,
      currentStreak: 0,
      online: true,
    }),
    makeUser(1, "dfyz", 0, "toxa4912@gmail.com", "Dfyz#2026", "user", {
      achievements: ["founder", "first_blood"],
      verified: true,
      online: true,
    }),
  ];
  const matches: Match[] = [];

  const news: NewsArticle[] = [
    {
      id: "n_001",
      title: "STANDLEO LITE Season Zero is live",
      excerpt: "Ranked queues open for 1v1 through 5v5. Climb from Bronze 1 to The Legend.",
      content:
        "Season Zero of STANDLEO LITE Arena is officially open. Matchmaking covers 1v1, 2v2, 3v3 and 5v5. Your rank is derived strictly from MMR — the same table used in-game. Play, climb, and keep an eye on weekly boards.",
      cover: "linear-gradient(135deg,#0b1f16 0%,#163528 50%,#7dffb3 160%)",
      createdAt: isoDaysAgo(4, 2),
      author: "Arena Desk",
    },
    {
      id: "n_002",
      title: "How MMR and ranks work",
      excerpt: "One function. Eighteen ranks. No hidden titles.",
      content:
        "Every player’s visible rank is computed from current MMR. Bronze 1 starts at 0, The Legend begins at 2121. After each completed match the platform updates MMR, then re-evaluates rank automatically. Progress bars always point at the next title’s minimum.",
      cover: "linear-gradient(135deg,#1a1230 0%,#3b1d6e 50%,#a855f7 160%)",
      createdAt: isoDaysAgo(9, 5),
      author: "Competitive Ops",
    },
    {
      id: "n_003",
      title: "Weekly board resets every Monday",
      excerpt: "Global stays forever. Weekly and monthly reset on schedule.",
      content:
        "The Global board is career MMR. Weekly isolates results from the last seven days; Monthly uses the current calendar month. Filters and search work the same on every board.",
      cover: "linear-gradient(135deg,#1a1408 0%,#3d2e10 50%,#d4ff3f 160%)",
      createdAt: isoDaysAgo(14, 1),
      author: "Arena Desk",
    },
  ];

  const reports: Report[] = [
    {
      id: "r_001",
      reporterId: users[1].id,
      targetId: users[1].id,
      reason: "Toxic chat after pistol round",
      status: "open",
      createdAt: isoDaysAgo(1, 3),
    },
  ];

  return {
    users,
    matches,
    queues: [],
    friendRequests: [
      {
        id: "fr_001",
        fromId: users[1].id,
        toId: users[0].id,
        status: "pending",
        createdAt: isoDaysAgo(0, 2),
      },
    ],
    friendships: [
      { a: users[0].id, b: users[1].id, since: isoDaysAgo(30) },
    ],
    notifications: [
      {
        id: "nt_001",
        userId: users[1].id,
        type: "friend_request",
        title: "Friend request",
        body: `${users[0].nick} wants to add you`,
        read: false,
        createdAt: isoDaysAgo(0, 2),
        href: "/friends",
      },
      {
        id: "nt_002",
        userId: users[1].id,
        type: "match_result",
        title: "Match completed",
        body: "Your last ranked match is in history",
        read: false,
        createdAt: isoDaysAgo(1, 4),
        href: "/matches",
      },
    ],
    news,
    reports,
    sessions: [],
    deviceBans: [],
    resets: [],
    rateLimits: {},
  };
}
