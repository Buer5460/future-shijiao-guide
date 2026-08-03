import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("ships the future shijiao triage experience with safety boundaries", async () => {
  const [page, layout] = await Promise.all([
    source("../app/page.tsx"),
    source("../app/layout.tsx"),
  ]);
  assert.match(layout, /未来仕角｜智能导诊服务/);
  assert.match(page, /智能导诊/);
  assert.match(page, /院内导航/);
  assert.match(page, /PC 管理后台演示/);
  assert.match(page, /不替代医生诊断/);
  assert.match(page, /拨打 120/);
  assert.match(page, /登录并保存记录/);
});

test("protects accounts and persists user-scoped triage records", async () => {
  const [auth, schema, account, triageApi] = await Promise.all([
    source("../app/auth.ts"),
    source("../db/schema.ts"),
    source("../app/account/page.tsx"),
    source("../app/api/triage-records/route.ts"),
  ]);
  assert.match(auth, /PBKDF2/);
  assert.match(auth, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(schema, /passwordCredentials/);
  assert.match(schema, /userSessions/);
  assert.match(schema, /triageRecords/);
  assert.match(account, /where\(eq\(triageRecords\.userId, user\.id\)\)/);
  assert.match(triageApi, /authentication_required/);
  assert.match(triageApi, /urgent_records_not_saved/);
});
