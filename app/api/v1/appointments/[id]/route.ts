import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { ensureUser } from "../../../../../db/users";
import { appointmentOrders, queueSnapshots } from "../../../../../db/schema";

type RouteContext = { params: Promise<{ id: string }> };

async function ownedOrder(id: string) {
  const identity = await getChatGPTUser();
  if (!identity) return { error: Response.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "请先登录" } }, { status: 401 }) };
  const user = await ensureUser(identity);
  const db = getDb();
  const [order] = await db.select().from(appointmentOrders).where(and(eq(appointmentOrders.id, id), eq(appointmentOrders.userId, user.id))).limit(1);
  if (!order) return { error: Response.json({ error: { code: "APPOINTMENT_NOT_FOUND", message: "预约记录不存在" } }, { status: 404 }) };
  return { order, db };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await ownedOrder(id);
  if (result.error) return result.error;
  const [queue] = await result.db.select().from(queueSnapshots).where(eq(queueSnapshots.appointmentId, id)).limit(1);
  return Response.json({ data: { ...result.order, queue: queue ?? null } });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await ownedOrder(id);
  if (result.error) return result.error;
  if (result.order.status === "cancelled") return Response.json({ data: result.order, meta: { idempotentReplay: true } });
  if (result.order.status === "failed") return Response.json({ error: { code: "INVALID_APPOINTMENT_STATUS", message: "失败订单无需取消" } }, { status: 409 });
  const [updated] = await result.db.update(appointmentOrders).set({ status: "cancel_requested", updatedAt: new Date().toISOString() }).where(eq(appointmentOrders.id, id)).returning();
  return Response.json({ data: updated, meta: { hospitalAction: "pending", message: "取消申请已提交，须等待医院系统确认" } }, { status: 202 });
}
