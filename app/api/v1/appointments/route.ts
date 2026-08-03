import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { ensureUser } from "../../../../db/users";
import { appointmentOrders, doctors, hospitalSchedules, queueSnapshots } from "../../../../db/schema";

function unauthorized() {
  return Response.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "请先登录" } }, { status: 401 });
}

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return unauthorized();
  const user = await ensureUser(identity);
  const db = getDb();
  const orders = await db.select().from(appointmentOrders).where(eq(appointmentOrders.userId, user.id)).orderBy(desc(appointmentOrders.createdAt)).limit(50);
  const schedules = await db.select().from(hospitalSchedules);
  const doctorRows = await db.select({ id: doctors.id, name: doctors.name, title: doctors.title }).from(doctors);
  const queues = await db.select().from(queueSnapshots);
  const scheduleMap = new Map(schedules.map((row) => [row.id, row]));
  const doctorMap = new Map(doctorRows.map((row) => [row.id, row]));
  const queueMap = new Map(queues.map((row) => [row.appointmentId, row]));
  return Response.json({
    data: orders.map((order) => {
      const schedule = scheduleMap.get(order.scheduleId) ?? null;
      return { ...order, schedule, doctor: schedule?.doctorId ? doctorMap.get(schedule.doctorId) ?? null : null, queue: queueMap.get(order.id) ?? null };
    }),
  });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return unauthorized();
  const body = await request.json() as { scheduleId?: string; requestId?: string };
  const scheduleId = body.scheduleId?.trim() ?? "";
  const requestId = body.requestId?.trim() || request.headers.get("idempotency-key")?.trim() || "";
  if (!scheduleId || !requestId || requestId.length > 100) {
    return Response.json({ error: { code: "INVALID_APPOINTMENT_REQUEST", message: "scheduleId 与 requestId/Idempotency-Key 为必填" } }, { status: 400 });
  }
  const user = await ensureUser(identity);
  const db = getDb();
  const [existing] = await db.select().from(appointmentOrders).where(eq(appointmentOrders.requestId, requestId)).limit(1);
  if (existing?.userId === user.id) return Response.json({ data: existing, meta: { idempotentReplay: true } });
  if (existing) return Response.json({ error: { code: "IDEMPOTENCY_KEY_CONFLICT", message: "requestId 已被使用，请生成新的唯一值" } }, { status: 409 });
  const [schedule] = await db.select().from(hospitalSchedules).where(eq(hospitalSchedules.id, scheduleId)).limit(1);
  if (!schedule) return Response.json({ error: { code: "SCHEDULE_NOT_FOUND", message: "号源不存在或尚未同步" } }, { status: 404 });
  if (schedule.status !== "available" || schedule.availableCount < 1) {
    return Response.json({ error: { code: "SCHEDULE_UNAVAILABLE", message: "当前号源不可预约，请刷新号源" } }, { status: 409 });
  }
  const now = new Date().toISOString();
  const [order] = await db.insert(appointmentOrders).values({ id: crypto.randomUUID(), requestId, userId: user.id, hospitalId: schedule.hospitalId, scheduleId: schedule.id, status: "pending", createdAt: now, updatedAt: now }).returning();
  return Response.json({ data: order, meta: { hospitalAction: "pending", message: "预约申请已创建，须由医院适配器确认后才算预约成功" } }, { status: 202 });
}
