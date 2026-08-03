import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { passwordCredentials, userSessions, users } from "../../../../db/schema";
import { hashPassword, newSession, safeReturnTo, sessionCookie } from "../../../auth";

export async function POST(request: Request) {
  const body = await request.json() as { displayName?: string; email?: string; password?: string; returnTo?: string };
  const displayName = body.displayName?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (displayName.length < 2 || displayName.length > 40) return Response.json({ error: "请输入 2–40 个字符的姓名或昵称" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) return Response.json({ error: "请输入有效邮箱" }, { status: 400 });
  if (password.length < 8 || password.length > 128) return Response.json({ error: "密码需为 8–128 个字符" }, { status: 400 });

  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return Response.json({ error: "该邮箱已注册" }, { status: 409 });

  const credential = await hashPassword(password);
  const [user] = await db.insert(users).values({ authUserId: `local:${crypto.randomUUID()}`, email, displayName }).returning();
  await db.insert(passwordCredentials).values({ userId: user.id, passwordHash: credential.hash, passwordSalt: credential.salt, iterations: credential.iterations });
  const session = newSession();
  await db.insert(userSessions).values({ id: session.token, userId: user.id, expiresAt: session.expiresAt.toISOString() });
  return Response.json(
    { ok: true, returnTo: safeReturnTo(body.returnTo) },
    { status: 201, headers: { "set-cookie": sessionCookie(session.token, session.expiresAt) } },
  );
}
