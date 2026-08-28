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
  assert.match(page, /院内地图/);
  assert.match(page, /PC 管理后台/);
  assert.match(layout, /成都市青白江区人民医院/);
  assert.match(page, /44 个科室/);
  assert.match(page, /181 位医生/);
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
  assert.match(triageApi, /matchedDepartment/);
});

test("ships hospital content without publishing stale insurance rates", async () => {
  const [catalog, migration, offline, offlineData, androidConfig] = await Promise.all([
    source("../data/qbj-hospital.json"),
    source("../drizzle/0001_qbj_hospital_content.sql"),
    source("../android/guide-sdk/src/main/assets/future_shijiao_offline.html"),
    source("../android/guide-sdk/src/main/assets/qbj-hospital-data.js"),
    source("../android/demo-app/src/main/java/com/futureshijiao/guide/demo/MainActivity.java"),
  ]);
  const data = JSON.parse(catalog);
  assert.equal(data.departments.length, 44);
  assert.equal(data.doctors.length, 181);
  assert.equal(data.maps.length, 9);
  assert.equal(data.processes.length, 5);
  assert.match(migration, /article-qbj-insurance-2023/);
  assert.match(migration, /'draft'/);
  assert.match(offline, /离线服务模式/);
  assert.match(offline, /成都市青白江区人民医院/);
  assert.match(offline, /qbj-hospital-data\.js/);
  assert.match(offlineData, /window\.HOSPITAL_DATA=/);
  assert.match(androidConfig, /offlineOnly\(true\)/);
});
