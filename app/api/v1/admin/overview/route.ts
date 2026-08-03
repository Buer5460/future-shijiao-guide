import { count, desc, eq } from "drizzle-orm";
import { requireAdminUser } from "../../../../admin-auth";
import { getDb } from "../../../../../db";
import { dailyServiceMetrics, departments, doctors, integrationSyncLogs, knowledgeArticles } from "../../../../../db/schema";

export async function GET(request: Request) {
  const demo = new URL(request.url).searchParams.get("demo") === "1";
  if (!demo) {
    const auth = await requireAdminUser();
    if (auth.error) return auth.error;
  }
  const db = getDb();
  const [[departmentCount], [doctorCount], [articleCount], metrics, syncLogs] = await Promise.all([
    db.select({ value: count() }).from(departments).where(eq(departments.status, "active")),
    db.select({ value: count() }).from(doctors).where(eq(doctors.status, "active")),
    db.select({ value: count() }).from(knowledgeArticles).where(eq(knowledgeArticles.status, "published")),
    db.select().from(dailyServiceMetrics).orderBy(desc(dailyServiceMetrics.metricDate)).limit(7),
    db.select().from(integrationSyncLogs).orderBy(desc(integrationSyncLogs.createdAt)).limit(10),
  ]);
  const latest = metrics[0];
  return Response.json({ data: {
    demo,
    masterData: { departments: departmentCount.value, doctors: doctorCount.value, publishedArticles: articleCount.value },
    today: latest ? { serviceCount: latest.serviceCount, triageCount: latest.triageCount, navigationCount: latest.navigationCount, resolvedRate: latest.resolvedRate, transferCount: latest.transferCount } : null,
    trend: [...metrics].reverse(),
    integration: {
      recent: demo ? syncLogs.map((row) => ({ resourceType: row.resourceType, itemCount: row.itemCount, successCount: row.successCount, failureCount: row.failureCount, status: row.status, createdAt: row.createdAt })) : syncLogs,
      status: syncLogs[0]?.status ?? "not_connected",
    },
  }, meta: { updatedAt: new Date().toISOString(), demoData: demo } });
}
