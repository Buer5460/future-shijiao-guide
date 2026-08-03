import { eq } from "drizzle-orm";
import { getChatGPTUser } from "./chatgpt-auth";
import { getDb } from "../db";
import { users } from "../db/schema";

export async function requireAdminUser() {
  const identity = await getChatGPTUser();
  if (!identity) return { error: Response.json({ error: { code: "AUTH_REQUIRED", message: "请先登录管理员账号" } }, { status: 401 }) };
  const [user] = await getDb().select().from(users).where(eq(users.authUserId, identity.userId)).limit(1);
  if (!user || user.role !== "admin") {
    return { error: Response.json({ error: { code: "ADMIN_REQUIRED", message: "当前账号没有管理员权限" } }, { status: 403 }) };
  }
  return { user };
}
