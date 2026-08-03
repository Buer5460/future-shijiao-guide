import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { passwordCredentials, userSessions, users } from "../../../../db/schema";
import { newSession, safeReturnTo, sessionCookie, verifyPassword } from "../../../auth";

export async function POST(request: Request) {
  const body = await request.json() as { email?: string; password?: string; returnTo?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return Response.json({ error: "邮箱或密码不正确" }, { status: 401 });
  const [credential] = await db.select().from(passwordCredentials).where(eq(passwordCredentials.userId, user.id)).limit(1);
  if (!credential || !(await verifyPassword(password, credential.passwordHash, credential.passwordSalt, credential.iterations))) {
    return Response.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }
  const session = newSession();
  await db.insert(userSessions).values({ id: session.token, userId: user.id, expiresAt: session.expiresAt.toISOString() });
  return Response.json(
    { ok: true, returnTo: safeReturnTo(body.returnTo) },
    { headers: { "set-cookie": sessionCookie(session.token, session.expiresAt) } },
  );
}
