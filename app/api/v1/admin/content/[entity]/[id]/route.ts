import { eq } from "drizzle-orm";
import { requireAdminUser } from "../../../../../../admin-auth";
import { getDb } from "../../../../../../../db";
import { departments, doctors, knowledgeArticles } from "../../../../../../../db/schema";

type RouteContext = { params: Promise<{ entity: string; id: string }> };

function pick(source: Record<string, unknown>, fields: string[]) {
  return Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;
  const { entity, id } = await context.params;
  const body = await request.json() as Record<string, unknown>;
  const updatedAt = new Date().toISOString();
  const db = getDb();
  if (entity === "departments") {
    const changes = { ...pick(body, ["name", "floor", "zone", "description", "specialty", "status", "sortOrder"]), updatedAt };
    const [row] = await db.update(departments).set(changes).where(eq(departments.id, id)).returning();
    return row ? Response.json({ data: row }) : Response.json({ error: { code: "NOT_FOUND", message: "科室不存在" } }, { status: 404 });
  }
  if (entity === "doctors") {
    const changes = { ...pick(body, ["name", "title", "specialty", "scheduleText", "avatarColor", "status"]), updatedAt };
    const [row] = await db.update(doctors).set(changes).where(eq(doctors.id, id)).returning();
    return row ? Response.json({ data: row }) : Response.json({ error: { code: "NOT_FOUND", message: "医生不存在" } }, { status: 404 });
  }
  if (entity === "knowledge") {
    const changes = { ...pick(body, ["category", "title", "summary", "content", "status", "sortOrder"]), updatedAt };
    const [row] = await db.update(knowledgeArticles).set(changes).where(eq(knowledgeArticles.id, id)).returning();
    return row ? Response.json({ data: row }) : Response.json({ error: { code: "NOT_FOUND", message: "文章不存在" } }, { status: 404 });
  }
  return Response.json({ error: { code: "INVALID_ENTITY", message: "不支持的内容类型" } }, { status: 400 });
}
