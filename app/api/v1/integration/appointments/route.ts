import { asc, inArray } from "drizzle-orm";
import { authenticateHospitalRequest } from "../../../../integration-auth";
import { getDb } from "../../../../../db";
import { appointmentOrders, hospitalSchedules } from "../../../../../db/schema";

export async function GET(request: Request) {
  const auth = await authenticateHospitalRequest(request);
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  const requestedStatus = url.searchParams.get("status");
  const statuses = requestedStatus === "cancel_requested" ? ["cancel_requested" as const] : requestedStatus === "pending" ? ["pending" as const] : ["pending" as const, "cancel_requested" as const];
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 500);
  const db = getDb();
  const orders = await db.select().from(appointmentOrders).where(inArray(appointmentOrders.status, statuses)).orderBy(asc(appointmentOrders.createdAt)).limit(limit);
  const schedules = await db.select().from(hospitalSchedules);
  const scheduleMap = new Map(schedules.map((row) => [row.id, row]));
  return Response.json({
    data: orders.map((order) => ({ ...order, userId: undefined, schedule: scheduleMap.get(order.scheduleId) ?? null })),
    meta: { clientId: auth.clientId, count: orders.length, nextAction: "通过 /api/v1/integration/sync 回传 appointment_status" },
  });
}
