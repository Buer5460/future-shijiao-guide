import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureUser } from "../../../db/users";
import { getDb } from "../../../db";
import { auditLogs, departments, triageRecords } from "../../../db/schema";
import { and, eq } from "drizzle-orm";

function departmentFor(symptom: string) {
  if (symptom.includes("呼吸") || symptom.includes("咳") || symptom.includes("气短")) return "呼吸与危重症医学科";
  if (symptom.includes("腹") || symptom.includes("胃")) return "消化内科";
  if (symptom.includes("儿童") || symptom.includes("小孩")) return "儿科";
  if (symptom.includes("皮肤") || symptom.includes("皮疹")) return "皮肤科";
  if (symptom.includes("头")) return "神经内科";
  if (symptom.includes("胸")) return "心血管内科";
  if (symptom.includes("关节") || symptom.includes("腰背")) return "骨科";
  return "现场导诊台";
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "authentication_required", signIn: "/login?returnTo=%2F" }, { status: 401 });
  const body = await request.json() as { symptom?: string; safetyStatus?: "non_urgent" | "urgent"; recommendedDepartment?: string };
  const symptom = body.symptom?.trim() ?? "";
  if (!symptom || symptom.length > 500) return Response.json({ error: "invalid_symptom" }, { status: 400 });
  if (body.safetyStatus !== "non_urgent") return Response.json({ error: "urgent_records_not_saved", message: "紧急情况请立即联系 120。" }, { status: 400 });
  const user = await ensureUser(identity);
  const db = getDb();
  const candidate = body.recommendedDepartment?.trim().slice(0, 80);
  const [matchedDepartment] = candidate
    ? await db.select({ name: departments.name }).from(departments).where(and(eq(departments.name, candidate), eq(departments.active, true))).limit(1)
    : [];
  const recommendedDepartment = matchedDepartment?.name ?? departmentFor(symptom);
  const [record] = await db.insert(triageRecords).values({ userId: user.id, symptom, recommendedDepartment, safetyStatus: "non_urgent" }).returning();
  await db.insert(auditLogs).values({ actorUserId: user.id, action: "triage_record.created", targetType: "triage_record", targetId: String(record.id) });
  return Response.json({ record }, { status: 201 });
}
