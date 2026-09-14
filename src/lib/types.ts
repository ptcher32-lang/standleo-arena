import type { RankName } from "./ranks";

export type UserRole = "user" | "admin";
export type MatchMode = "1v1" | "2v2" | "3v3" | "5v5";
export type MatchPlatform = "mobile" | "pc";
export type MatchMap = "Sandstone" | "Rust" | "Province";
export type MatchStatus = "searching" | "live" | "completed";
export type FriendRequestStatus = "pending" | "accepted" | "declined";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type NotificationType =
  | "friend_request"
  | "match_invite"
  | "match_result"
  | "mmr_change"
  | "rank_up"
  | "achievement";

export type MmrPoint = {
  at: string;
  mmr: number;
};

export type User = {
  id: string;
  publicId: string;
  email: string;
  passwordHash: string;
  nick: string;
  bio?: string;
  playstyle?: string;
  contact?: string;
  avatarHue: number;
  avatarUrl?: string;
  rankFrameUrl?: string;
  avatarFrameUrl?: string;
  stickers?: string[];
  profileBadges?: string[];
  verified?: boolean;
  createdAt: string;
  role: UserRole;
  banned: boolean;
  mmr: number;
  peakMmr: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  winStreak: number;
  currentStreak: number;
  mmrHistory: MmrPoint[];
  achievements: string[];
  online: boolean;
  lastSeen: string;
};

export type PublicUser = Omit<User, "email" | "passwordHash"> & {
  rank: RankName;
  winRate: number;
  kd: number;
  matchesPlayed: number;
};

export type MatchPlayer = {
  userId: string;
  ping?: number;
  money?: number;
  kills: number;
  deaths: number;
  assists: number;
  mmrBefore: number;
  mmrDelta: number;
  mmrAfter: number;
  rankBefore: RankName;
  rankAfter: RankName;
};

export type Match = {
  id: string;
  mode: MatchMode;
  platform: MatchPlatform;
  map?: MatchMap;
  status: MatchStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  teamA: MatchPlayer[];
  teamB: MatchPlayer[];
  scoreA: number;
  scoreB: number;
  winner: "A" | "B" | null;
  mvpId?: string;
  proofAttached?: boolean;
  proofUrl?: string;
  detectedScoreA?: number;
  detectedScoreB?: number;
  detectedWinner?: "A" | "B";
  detectedWinnerNick?: string;
};

export type SearchQueue = {
  id: string;
  userId: string;
  mode: MatchMode;
  platform: MatchPlatform;
  map: MatchMap;
  startedAt: string;
  found: number;
  needed: number;
  matchId?: string;
  cancelled: boolean;
};

export type FriendRequest = {
  id: string;
  fromId: string;
  toId: string;
  status: FriendRequestStatus;
  createdAt: string;
};

export type Friendship = {
  a: string;
  b: string;
  since: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
};

export type NewsArticle = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  cover: string;
  createdAt: string;
  author: string;
};

export type Report = {
  id: string;
  reporterId: string;
  targetId?: string;
  matchId?: string;
  reason: string;
  evidenceUrl?: string;
  riskScore?: number;
  status: ReportStatus;
  createdAt: string;
};

export type Session = {
  token: string;
  userId: string;
  deviceId?: string;
  createdAt: string;
  expiresAt: string;
};

export type DeviceBan = {
  deviceId: string;
  userId: string;
  createdAt: string;
};

export type PasswordReset = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
};

export type StoreData = {
  users: User[];
  matches: Match[];
  queues: SearchQueue[];
  friendRequests: FriendRequest[];
  friendships: Friendship[];
  notifications: AppNotification[];
  news: NewsArticle[];
  reports: Report[];
  sessions: Session[];
  deviceBans: DeviceBan[];
  resets: PasswordReset[];
  rateLimits: Record<string, number[]>;
};
