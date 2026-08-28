import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { departments, doctors, hospitalLocations, hospitals, knowledgeArticles } from "../../../../db/schema";
import hospitalContent from "../../../../data/qbj-hospital.json";

export async function GET() {
  const db = getDb();
  const [hospital] = await db.select().from(hospitals).where(eq(hospitals.status, "active")).limit(1);
  if (!hospital) return Response.json({ error: { code: "HOSPITAL_NOT_CONFIGURED", message: "医院主数据尚未配置" } }, { status: 503 });
  const [departmentRows, doctorRows, locationRows, articleRows] = await Promise.all([
    db.select().from(departments).where(eq(departments.status, "active")).orderBy(asc(departments.sortOrder)),
    db.select().from(doctors).where(eq(doctors.status, "active")).orderBy(asc(doctors.name)),
    db.select().from(hospitalLocations).where(eq(hospitalLocations.status, "active")).orderBy(asc(hospitalLocations.name)),
    db.select().from(knowledgeArticles).where(eq(knowledgeArticles.status, "published")).orderBy(asc(knowledgeArticles.sortOrder)),
  ]);
  const departmentNames = new Map(departmentRows.map((row) => [row.id, row.name]));
  return Response.json({
    data: {
      hospital,
      departments: departmentRows.map((row) => ({ ...row, aliases: JSON.parse(row.aliases) as string[] })),
      doctors: doctorRows.map((row) => ({ ...row, departmentName: departmentNames.get(row.departmentId) ?? "" })),
      locations: locationRows,
      knowledgeArticles: articleRows,
      profile: {
        description: hospitalContent.hospital.description,
        servicePhone: hospitalContent.hospital.servicePhone,
        stats: hospitalContent.hospital.stats,
        source: hospitalContent.hospital.source,
      },
      maps: hospitalContent.maps,
      processes: hospitalContent.processes,
    },
    meta: {
      version: "1.2",
      source: "hospital-master-data",
      sourcePackage: hospitalContent.metadata.sourcePackage,
      hospitalProfileDate: hospitalContent.metadata.hospitalProfileDate,
      doctorProfileDate: hospitalContent.metadata.doctorProfileDate,
      updatedAt: new Date().toISOString(),
    },
  }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
