import { env } from "cloudflare:workers";
import { and, eq, gt, lte } from "drizzle-orm";
import { getDb } from "../db";
import { integrationNonces } from "../db/schema";

type IntegrationEnv = {
  HOSPITAL_API_SECRET?: string;
  HOSPITAL_API_CLIENT_ID?: string;
};

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export async function authenticateHospitalRequest(request: Request) {
  const bindings = env as unknown as IntegrationEnv;
  const secret = bindings.HOSPITAL_API_SECRET;
  if (!secret) return { error: Response.json({ error: { code: "INTEGRATION_NOT_CONFIGURED", message: "医院接口密钥尚未配置" } }, { status: 503 }) };

  const clientId = request.headers.get("x-fsj-client-id") ?? "";
  const timestamp = request.headers.get("x-fsj-timestamp") ?? "";
  const nonce = request.headers.get("x-fsj-nonce") ?? "";
  const signature = request.headers.get("x-fsj-signature")?.toLowerCase() ?? "";
  if (!clientId || !timestamp || !nonce || !signature) {
    return { error: Response.json({ error: { code: "SIGNATURE_HEADERS_REQUIRED", message: "缺少接口签名请求头" } }, { status: 401 }) };
  }
  if (bindings.HOSPITAL_API_CLIENT_ID && clientId !== bindings.HOSPITAL_API_CLIENT_ID) {
    return { error: Response.json({ error: { code: "INVALID_CLIENT", message: "接口客户端无效" } }, { status: 401 }) };
  }

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return { error: Response.json({ error: { code: "SIGNATURE_EXPIRED", message: "接口签名已过期" } }, { status: 401 }) };
  }

  const bodyText = await request.text();
  const bodyHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bodyText)));
  const url = new URL(request.url);
  const canonical = `${request.method.toUpperCase()}\n${url.pathname}${url.search}\n${timestamp}\n${nonce}\n${bodyHash}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical)));
  if (!constantTimeEqual(expected, signature)) {
    return { error: Response.json({ error: { code: "INVALID_SIGNATURE", message: "接口签名校验失败" } }, { status: 401 }) };
  }

  const db = getDb();
  const now = new Date().toISOString();
  await db.delete(integrationNonces).where(lte(integrationNonces.expiresAt, now));
  const activeNonce = await db.select({ id: integrationNonces.id }).from(integrationNonces).where(and(eq(integrationNonces.clientId, clientId), eq(integrationNonces.nonce, nonce), gt(integrationNonces.expiresAt, now))).limit(1);
  if (activeNonce[0]) return { error: Response.json({ error: { code: "REPLAY_DETECTED", message: "检测到重复请求" } }, { status: 409 }) };
  try {
    await db.insert(integrationNonces).values({ id: crypto.randomUUID(), clientId, nonce, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
  } catch {
    return { error: Response.json({ error: { code: "REPLAY_DETECTED", message: "检测到重复请求" } }, { status: 409 }) };
  }
  return { clientId, bodyText };
}
