import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(72),
  nick: z
    .string()
    .min(3)
    .max(16)
    .regex(/^[a-zA-Z0-9_]+$/, "Nick may contain letters, numbers and underscore"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const recoverSchema = z.object({
  email: z.string().email(),
});

export const resetSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(72),
});

export const profilePatchSchema = z.object({
  nick: z
    .string()
    .min(3)
    .max(16)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  bio: z.string().max(280).optional(),
  playstyle: z.string().max(40).optional(),
  contact: z.string().max(120).optional(),
  removeAvatarFrame: z.boolean().optional(),
  removeRankFrame: z.boolean().optional(),
}).strict();

export const searchMatchSchema = z.object({
  mode: z.enum(["1v1", "2v2", "3v3", "5v5"]),
  platform: z.enum(["mobile", "pc"]),
  map: z.enum(["Sandstone", "Rust", "Province"]),
});

export const friendRequestSchema = z.object({
  toId: z.string().min(1),
});

export const friendActionSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["accept", "decline"]),
});

export const newsSchema = z.object({
  title: z.string().min(4).max(120),
  excerpt: z.string().min(8).max(240),
  content: z.string().min(16).max(8000),
  cover: z.string().max(240).optional(),
});

export const reportSchema = z.object({
  targetId: z.string().optional(),
  matchId: z.string().optional(),
  reason: z.string().min(8).max(400),
  evidenceUrl: z.string().max(4_000_000).optional(),
});

export const reportStatusSchema = z.object({
  status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
});

export const matchImportSchema = z.object({
  matchId: z.string().min(1),
  winner: z.enum(["A", "B"]),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  proofAttached: z.boolean().optional(),
  players: z.array(
    z.object({
      userId: z.string().min(1),
      kills: z.number().int().min(0),
      deaths: z.number().int().min(0),
      assists: z.number().int().min(0),
      ping: z.number().int().min(0).optional(),
      money: z.number().int().min(0).optional(),
    }),
  ).min(1),
}).strict().refine((value) => value.scoreA !== value.scoreB, {
  message: "A match score cannot be tied",
});

export const newsPatchSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(4).max(120).optional(),
  excerpt: z.string().min(8).max(240).optional(),
  content: z.string().min(16).max(8000).optional(),
}).strict().refine((value) => value.title !== undefined || value.excerpt !== undefined || value.content !== undefined, {
  message: "At least one field must be updated",
});

export const adminActionSchema = z.object({
  action: z.enum(["ban", "unban", "kick", "ban_device", "report", "complete_match", "analyze_match"]),
  userId: z.string().min(1).optional(),
  reportId: z.string().min(1).optional(),
  matchId: z.string().min(1).optional(),
  winner: z.enum(["A", "B"]).optional(),
  scoreA: z.number().int().min(0).optional(),
  scoreB: z.number().int().min(0).optional(),
  proofAttached: z.boolean().optional(),
  status: reportStatusSchema.shape.status.optional(),
}).strict();
