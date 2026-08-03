import { and, asc, eq, gte } from "drizzle-orm";
import { getDb } from "../../../../db";
import { departments, doctors, hospitalSchedules } from "../../../../db/schema";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const departmentCode = url.searchParams.get("departmentCode");
  const fromDate = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const db = getDb();
  let departmentId: string | null = null;
  if (departmentCode) {
    const [department] = await db.select({ id: departments.id }).from(departments).where(eq(departments.code, departmentCode)).limit(1);
    if (!department) return Response.json({ error: { code: "DEPARTMENT_NOT_FOUND", message: "未找到科室" } }, { status: 404 });
    departmentId = department.id;
  }
  const rows = await db.select().from(hospitalSchedules).where(departmentId ? and(eq(hospitalSchedules.departmentId, departmentId), gte(hospitalSchedules.serviceDate, fromDate)) : gte(hospitalSchedules.serviceDate, fromDate)).orderBy(asc(hospitalSchedules.serviceDate), asc(hospitalSchedules.startTime)).limit(100);
  const doctorRows = await db.select({ id: doctors.id, name: doctors.name, title: doctors.title }).from(doctors);
  const doctorMap = new Map(doctorRows.map((doctor) => [doctor.id, doctor]));
  return Response.json({ data: rows.map((row) => ({ ...row, doctor: row.doctorId ? doctorMap.get(row.doctorId) ?? null : null })), meta: { source: "hospital-schedule-adapter", updatedAt: new Date().toISOString() } });
}
