import { READER_COOKIE } from "@/lib/reader/session";
export const dynamic = "force-dynamic";
export async function POST() {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": `${READER_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax` },
  });
}
