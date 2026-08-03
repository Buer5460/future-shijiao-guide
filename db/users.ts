import { eq } from "drizzle-orm";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import { getDb } from ".";
import { users } from "./schema";

export async function ensureUser(identity: ChatGPTUser) {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.authUserId, identity.userId)).limit(1);
  if (existing[0]) {
    await db.update(users).set({ email: identity.email, displayName: identity.displayName, updatedAt: new Date().toISOString() }).where(eq(users.id, existing[0].id));
    return { ...existing[0], email: identity.email, displayName: identity.displayName };
  }
  const [created] = await db.insert(users).values({ authUserId: identity.userId, email: identity.email, displayName: identity.displayName }).returning();
  return created;
}
