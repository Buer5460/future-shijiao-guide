import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { departments, triageRules } from "../../../../../db/schema";

export async function POST(request: Request) {
  const body = await request.json() as { symptom?: string };
  const symptom = body.symptom?.trim() ?? "";
  if (!symptom || symptom.length > 500) return Response.json({ error: { code: "INVALID_SYMPTOM", message: "症状描述需为 1–500 个字符" } }, { status: 400 });

  const db = getDb();
  const rules = await db.select().from(triageRules).where(eq(triageRules.status, "active")).orderBy(desc(triageRules.priority));
  const matched = rules.find((rule) => symptom.includes(rule.keyword));
  if (matched?.urgent) {
    return Response.json({
      data: { traceId: crypto.randomUUID(), urgency: "emergency", recommendedDepartment: null, guidance: matched.guidance || "立即拨打 120", matchedRule: matched.keyword },
      meta: { disclaimer: "本结果仅用于就医引导，不构成诊断或处方。" },
    });
  }

  const departmentCode = matched?.departmentCode ?? "GENERAL";
  const [department] = await db.select().from(departments).where(eq(departments.code, departmentCode)).limit(1);
  const [general] = department ? [department] : await db.select().from(departments).where(eq(departments.code, "GENERAL")).limit(1);
  return Response.json({
    data: {
      traceId: crypto.randomUUID(),
      urgency: "non_urgent",
      recommendedDepartment: general ? { id: general.id, code: general.code, name: general.name, floor: general.floor, zone: general.zone } : null,
      guidance: matched?.guidance || "症状方向暂不明确，建议先咨询全科医学科或现场分诊台。",
      matchedRule: matched?.keyword ?? null,
    },
    meta: { disclaimer: "本结果仅用于就医引导，不构成诊断或处方；症状加重时请立即就医。" },
  });
}
