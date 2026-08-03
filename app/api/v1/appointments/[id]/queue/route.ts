import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../../chatgpt-auth";
import { getDb } from "../../../../../../db";
import { ensureUser } from "../../../../../../db/users";
import { appointmentOrders, queueSnapshots } from "../../../../../../db/schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "请先登录" } }, { status: 401 });
  const user = await ensureUser(identity);
  const { id } = await context.params;
  const db = getDb();
  const [order] = await db.select({ id: appointmentOrders.id }).from(appointmentOrders).where(and(eq(appointmentOrders.id, id), eq(appointmentOrders.userId, user.id))).limit(1);
  if (!order) return Response.json({ error: { code: "APPOINTMENT_NOT_FOUND", message: "预约记录不存在" } }, { status: 404 });
  const [queue] = await db.select().from(queueSnapshots).where(eq(queueSnapshots.appointmentId, id)).limit(1);
  if (!queue) return Response.json({ error: { code: "QUEUE_NOT_READY", message: "医院排队系统尚未返回候诊信息" } }, { status: 404 });
  return Response.json({ data: queue, meta: { source: "hospital-queue-adapter" } });
}
