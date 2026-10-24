// Per-user daily limits (protect the AI budget / free-tier quota). Counters live in the reader store.
//   READER_DAILY_UPLOADS        default 30   (photo / screenshot / audio / text parses)
//   READER_DAILY_WORDS          default 150  (NEW AI word entries; cached words are free)
//   READER_ADMIN_DAILY_UPLOADS  default 300 ; READER_ADMIN_DAILY_WORDS default 1000
import { kvGet, kvIncr } from "@/lib/reader/store";
import { isAdmin } from "@/lib/reader/users";

export type LimitKind = "uploads" | "words";
const day = () => new Date().toISOString().slice(0, 10); // UTC day
const k = (kind: LimitKind, user: string) => `reader:lim:${kind}:${user}:${day()}`;

export function maxFor(kind: LimitKind, user: string): number {
  const adm = isAdmin(user);
  const v = kind === "uploads"
    ? (adm ? process.env.READER_ADMIN_DAILY_UPLOADS : process.env.READER_DAILY_UPLOADS) || (adm ? 300 : 30)
    : (adm ? process.env.READER_ADMIN_DAILY_WORDS : process.env.READER_DAILY_WORDS) || (adm ? 1000 : 150);
  return Number(v);
}
export async function used(kind: LimitKind, user: string) { return Number((await kvGet(k(kind, user))) || 0); }
export async function remaining(kind: LimitKind, user: string) { return Math.max(0, maxFor(kind, user) - (await used(kind, user))); }
export async function consume(kind: LimitKind, user: string, n = 1) { if (n > 0) await kvIncr(k(kind, user), n, 2 * 86400); }

export function limitResponse(kind: LimitKind, max: number) {
  const detail = kind === "uploads"
    ? `今天的上传次数（${max} 次）已经用完了，明天再来吧！`
    : `今天新生成的 AI 单词内容（${max} 个）已经用完了，明天再来吧！已经生成过的单词仍然可以学习。`;
  return Response.json({ error: "daily_limit", kind, detail }, { status: 429, headers: { "Cache-Control": "no-store" } });
}
