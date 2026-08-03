import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureUser } from "../../../db/users";
import { getDb } from "../../../db";
import { auditLogs, triageRecords } from "../../../db/schema";

function departmentFor(symptom: string) {
  if (symptom.includes("头")) return "神经内科";
  if (symptom.includes("胸")) return "心血管内科";
  if (symptom.includes("关节") || symptom.includes("腰背")) return "骨科";
  return "全科医学科";
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "authentication_required", signIn: "/signin-with-chatgpt?return_to=%2F" }, { status: 401 });
  const body = await request.json() as { symptom?: string; safetyStatus?: "non_urgent" | "urgent" };
  const symptom = body.symptom?.trim() ?? "";
  if (!symptom || symptom.length > 500) return Response.json({ error: "invalid_symptom" }, { status: 400 });
  if (body.safetyStatus !== "non_urgent") return Response.json({ error: "urgent_records_not_saved", message: "紧急情况请立即联系 120。" }, { status: 400 });
  const user = await ensureUser(identity);
  const db = getDb();
  const [record] = await db.insert(triageRecords).values({ userId: user.id, symptom, recommendedDepartment: departmentFor(symptom), safetyStatus: "non_urgent" }).returning();
  await db.insert(auditLogs).values({ actorUserId: user.id, action: "triage_record.created", targetType: "triage_record", targetId: String(record.id) });
  return Response.json({ record }, { status: 201 });
}
