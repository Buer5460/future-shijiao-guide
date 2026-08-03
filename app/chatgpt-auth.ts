import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../db";
import { users, userSessions } from "../db/schema";
import { SESSION_COOKIE, safeReturnTo } from "./auth";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get(USER_ID_HEADER);
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (userId && email) {
    const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
    const fullName =
      encodedFullName &&
      requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
        ? safeDecodeURIComponent(encodedFullName)
        : null;
    return { userId, displayName: fullName ?? email, email, fullName };
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const [session] = await db.select().from(userSessions).where(and(eq(userSessions.id, token), gt(userSessions.expiresAt, new Date().toISOString()))).limit(1);
  if (!session) return null;
  const [localUser] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!localUser) return null;
  return {
    userId: localUser.authUserId,
    displayName: localUser.displayName,
    email: localUser.email,
    fullName: localUser.displayName,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const destination = safeRelativeReturnPath(returnTo);
  return `/login?returnTo=${encodeURIComponent(destination)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const destination = safeRelativeReturnPath(returnTo);
  return `/api/auth/logout?returnTo=${encodeURIComponent(destination)}`;
}

function safeRelativeReturnPath(value: string): string {
  const safe = safeReturnTo(value, "/");
  const url = new URL(safe, "https://app.local");
  return isReservedAuthPath(url.pathname) ? "/" : safe;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
