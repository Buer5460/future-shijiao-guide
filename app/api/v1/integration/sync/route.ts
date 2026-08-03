import { eq } from "drizzle-orm";
import { authenticateHospitalRequest } from "../../../../integration-auth";
import { getDb } from "../../../../../db";
import { appointmentOrders, departments, doctors, hospitalLocations, hospitalSchedules, hospitals, integrationSyncLogs, knowledgeArticles, queueSnapshots } from "../../../../../db/schema";

type SyncItem = Record<string, unknown>;
type SyncPayload = { requestId?: string; resourceType?: string; items?: SyncItem[] };

function text(item: SyncItem, field: string, fallback = "") {
  const value = item[field];
  return typeof value === "string" ? value.trim() : fallback;
}

function numberValue(item: SyncItem, field: string, fallback = 0) {
  const value = Number(item[field]);
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function required(item: SyncItem, fields: string[]) {
  for (const field of fields) if (!text(item, field)) throw new Error(`missing_${field}`);
}

async function upsertItem(resourceType: string, item: SyncItem) {
  const db = getDb();
  const updatedAt = new Date().toISOString();
  if (resourceType === "hospital") {
    required(item, ["id", "code", "name", "shortName", "address"]);
    const values = { id: text(item, "id"), code: text(item, "code"), name: text(item, "name"), shortName: text(item, "shortName"), address: text(item, "address"), emergencyPhone: text(item, "emergencyPhone", "120"), status: text(item, "status") === "inactive" ? "inactive" as const : "active" as const, updatedAt };
    await db.insert(hospitals).values(values).onConflictDoUpdate({ target: hospitals.id, set: values });
    return;
  }
  if (resourceType === "department") {
    required(item, ["id", "hospitalId", "code", "name", "floor", "description"]);
    const aliases = Array.isArray(item.aliases) ? JSON.stringify(item.aliases.filter((value) => typeof value === "string")) : "[]";
    const values = { id: text(item, "id"), hospitalId: text(item, "hospitalId"), code: text(item, "code"), name: text(item, "name"), aliases, floor: text(item, "floor"), zone: text(item, "zone"), description: text(item, "description"), specialty: text(item, "specialty"), status: text(item, "status") === "inactive" ? "inactive" as const : "active" as const, sortOrder: numberValue(item, "sortOrder"), updatedAt };
    await db.insert(departments).values(values).onConflictDoUpdate({ target: departments.id, set: values });
    return;
  }
  if (resourceType === "doctor") {
    required(item, ["id", "hospitalId", "departmentId", "code", "name", "title", "specialty"]);
    const values = { id: text(item, "id"), hospitalId: text(item, "hospitalId"), departmentId: text(item, "departmentId"), code: text(item, "code"), name: text(item, "name"), title: text(item, "title"), specialty: text(item, "specialty"), scheduleText: text(item, "scheduleText"), avatarColor: text(item, "avatarColor", "#3a7d74"), status: text(item, "status") === "inactive" ? "inactive" as const : "active" as const, updatedAt };
    await db.insert(doctors).values(values).onConflictDoUpdate({ target: doctors.id, set: values });
    return;
  }
  if (resourceType === "location") {
    required(item, ["id", "hospitalId", "code", "name", "building", "floor"]);
    const values = { id: text(item, "id"), hospitalId: text(item, "hospitalId"), code: text(item, "code"), name: text(item, "name"), building: text(item, "building"), floor: text(item, "floor"), zone: text(item, "zone"), description: text(item, "description"), status: text(item, "status") === "inactive" ? "inactive" as const : "active" as const, updatedAt };
    await db.insert(hospitalLocations).values(values).onConflictDoUpdate({ target: hospitalLocations.id, set: values });
    return;
  }
  if (resourceType === "knowledge") {
    required(item, ["id", "hospitalId", "category", "title", "summary"]);
    const rawStatus = text(item, "status");
    const status = rawStatus === "archived" ? "archived" as const : rawStatus === "draft" ? "draft" as const : "published" as const;
    const values = { id: text(item, "id"), hospitalId: text(item, "hospitalId"), category: text(item, "category"), title: text(item, "title"), summary: text(item, "summary"), content: text(item, "content"), status, sortOrder: numberValue(item, "sortOrder"), updatedAt };
    await db.insert(knowledgeArticles).values(values).onConflictDoUpdate({ target: knowledgeArticles.id, set: values });
    return;
  }
  if (resourceType === "schedule") {
    required(item, ["id", "hospitalId", "departmentId", "externalScheduleId", "serviceDate", "period", "startTime", "endTime"]);
    const rawStatus = text(item, "status");
    const status = rawStatus === "full" ? "full" as const : rawStatus === "stopped" ? "stopped" as const : "available" as const;
    const values = { id: text(item, "id"), hospitalId: text(item, "hospitalId"), departmentId: text(item, "departmentId"), doctorId: text(item, "doctorId") || null, externalScheduleId: text(item, "externalScheduleId"), serviceDate: text(item, "serviceDate"), period: text(item, "period"), startTime: text(item, "startTime"), endTime: text(item, "endTime"), availableCount: numberValue(item, "availableCount"), feeFen: numberValue(item, "feeFen"), status, updatedAt };
    await db.insert(hospitalSchedules).values(values).onConflictDoUpdate({ target: hospitalSchedules.id, set: values });
    return;
  }
  if (resourceType === "appointment_status") {
    required(item, ["appointmentId", "status"]);
    const rawStatus = text(item, "status");
    if (!["confirmed", "cancelled", "failed"].includes(rawStatus)) throw new Error("invalid_status");
    const status = rawStatus as "confirmed" | "cancelled" | "failed";
    const appointmentId = text(item, "appointmentId");
    const [current] = await db.select({ id: appointmentOrders.id, externalAppointmentId: appointmentOrders.externalAppointmentId }).from(appointmentOrders).where(eq(appointmentOrders.id, appointmentId)).limit(1);
    if (!current) throw new Error("appointment_not_found");
    const [updated] = await db.update(appointmentOrders).set({ externalAppointmentId: text(item, "externalAppointmentId") || current.externalAppointmentId, status, failureReason: text(item, "failureReason") || null, updatedAt }).where(eq(appointmentOrders.id, appointmentId)).returning({ id: appointmentOrders.id });
    if (!updated) throw new Error("appointment_not_found");
    return;
  }
  if (resourceType === "queue") {
    required(item, ["appointmentId", "queueNumber", "status"]);
    const rawStatus = text(item, "status");
    if (!["waiting", "calling", "completed", "expired"].includes(rawStatus)) throw new Error("invalid_status");
    const values = { appointmentId: text(item, "appointmentId"), queueNumber: text(item, "queueNumber"), peopleAhead: numberValue(item, "peopleAhead"), estimatedMinutes: numberValue(item, "estimatedMinutes"), roomName: text(item, "roomName"), status: rawStatus as "waiting" | "calling" | "completed" | "expired", updatedAt };
    await db.insert(queueSnapshots).values(values).onConflictDoUpdate({ target: queueSnapshots.appointmentId, set: values });
    return;
  }
  throw new Error("unsupported_resource_type");
}

export async function POST(request: Request) {
  const auth = await authenticateHospitalRequest(request);
  if (auth.error) return auth.error;
  let payload: SyncPayload;
  try {
    payload = JSON.parse(auth.bodyText) as SyncPayload;
  } catch {
    return Response.json({ error: { code: "INVALID_JSON", message: "请求体不是有效 JSON" } }, { status: 400 });
  }
  const requestId = payload.requestId?.trim() ?? "";
  const resourceType = payload.resourceType?.trim() ?? "";
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!requestId || !resourceType || !items.length || items.length > 500) {
    return Response.json({ error: { code: "INVALID_SYNC_REQUEST", message: "requestId、resourceType 和 1–500 条 items 为必填" } }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db.select().from(integrationSyncLogs).where(eq(integrationSyncLogs.requestId, requestId)).limit(1);
  if (existing) return Response.json({ data: existing, meta: { idempotentReplay: true } });
  const logId = crypto.randomUUID();
  await db.insert(integrationSyncLogs).values({ id: logId, clientId: auth.clientId, resourceType, requestId, itemCount: items.length, status: "processing" });
  let successCount = 0;
  const failures: Array<{ index: number; code: string }> = [];
  for (let index = 0; index < items.length; index += 1) {
    try {
      await upsertItem(resourceType, items[index]);
      successCount += 1;
    } catch (error) {
      failures.push({ index, code: error instanceof Error ? error.message : "unknown_error" });
    }
  }
  const status = failures.length === 0 ? "success" as const : successCount === 0 ? "failed" as const : "partial" as const;
  const [updated] = await db.update(integrationSyncLogs).set({ successCount, failureCount: failures.length, status, errorMessage: failures.length ? JSON.stringify(failures.slice(0, 20)) : null }).where(eq(integrationSyncLogs.id, logId)).returning();
  return Response.json({ data: updated, errors: failures }, { status: status === "partial" ? 207 : status === "failed" ? 422 : 200 });
}
