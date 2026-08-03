import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { userSessions } from "../../../../db/schema";
import { clearSessionCookie, safeReturnTo, SESSION_COOKIE } from "../../../auth";

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(userSessions).where(eq(userSessions.id, token));
  let returnTo = "/";
  try {
    const body = await request.json() as { returnTo?: string };
    returnTo = safeReturnTo(body.returnTo, "/");
  } catch {}
  return Response.json({ ok: true, returnTo }, { headers: { "set-cookie": clearSessionCookie() } });
}
