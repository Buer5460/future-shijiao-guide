import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  authUserId: text("auth_user_id").notNull(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["patient", "staff", "admin"] }).notNull().default("patient"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_users_auth_user_id").on(table.authUserId),
  uniqueIndex("idx_users_email").on(table.email),
]);

export const triageRecords = sqliteTable("triage_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  symptom: text("symptom").notNull(),
  recommendedDepartment: text("recommended_department").notNull(),
  safetyStatus: text("safety_status", { enum: ["non_urgent", "urgent"] }).notNull(),
  disclaimerAccepted: integer("disclaimer_accepted", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_triage_records_user_created").on(table.userId, table.createdAt)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorUserId: integer("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_audit_logs_actor_created").on(table.actorUserId, table.createdAt)]);

export const passwordCredentials = sqliteTable("password_credentials", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  iterations: integer("iterations").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userSessions = sqliteTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_user_sessions_user_expires").on(table.userId, table.expiresAt)]);

export const hospitals = sqliteTable("hospitals", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  address: text("address").notNull(),
  emergencyPhone: text("emergency_phone").notNull().default("120"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_hospitals_code").on(table.code)]);

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  hospitalId: text("hospital_id").notNull().references(() => hospitals.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  aliases: text("aliases").notNull().default("[]"),
  floor: text("floor").notNull(),
  zone: text("zone").notNull().default(""),
  description: text("description").notNull(),
  specialty: text("specialty").notNull().default(""),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_departments_hospital_code").on(table.hospitalId, table.code),
  index("idx_departments_status_sort").on(table.status, table.sortOrder),
]);

export const doctors = sqliteTable("doctors", {
  id: text("id").primaryKey(),
  hospitalId: text("hospital_id").notNull().references(() => hospitals.id),
  departmentId: text("department_id").notNull().references(() => departments.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  specialty: text("specialty").notNull(),
  scheduleText: text("schedule_text").notNull().default(""),
  avatarColor: text("avatar_color").notNull().default("#3a7d74"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_doctors_hospital_code").on(table.hospitalId, table.code),
  index("idx_doctors_department_status").on(table.departmentId, table.status),
]);

export const hospitalLocations = sqliteTable("hospital_locations", {
  id: text("id").primaryKey(),
  hospitalId: text("hospital_id").notNull().references(() => hospitals.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  building: text("building").notNull(),
  floor: text("floor").notNull(),
  zone: text("zone").notNull().default(""),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_locations_hospital_code").on(table.hospitalId, table.code)]);

export const knowledgeArticles = sqliteTable("knowledge_articles", {
  id: text("id").primaryKey(),
  hospitalId: text("hospital_id").notNull().references(() => hospitals.id),
  category: text("category").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull().default(""),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_knowledge_status_sort").on(table.status, table.sortOrder)]);

export const triageRules = sqliteTable("triage_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyword: text("keyword").notNull(),
  departmentCode: text("department_code"),
  priority: integer("priority").notNull().default(0),
  urgent: integer("urgent", { mode: "boolean" }).notNull().default(false),
  guidance: text("guidance").notNull().default(""),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_triage_rules_keyword").on(table.keyword),
  index("idx_triage_rules_status_priority").on(table.status, table.priority),
]);

export const hospitalSchedules = sqliteTable("hospital_schedules", {
  id: text("id").primaryKey(),
  hospitalId: text("hospital_id").notNull().references(() => hospitals.id),
  departmentId: text("department_id").notNull().references(() => departments.id),
  doctorId: text("doctor_id").references(() => doctors.id),
  externalScheduleId: text("external_schedule_id").notNull(),
  serviceDate: text("service_date").notNull(),
  period: text("period").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  availableCount: integer("available_count").notNull().default(0),
  feeFen: integer("fee_fen").notNull().default(0),
  status: text("status", { enum: ["available", "full", "stopped"] }).notNull().default("available"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_schedules_external_id").on(table.externalScheduleId),
  index("idx_schedules_department_date").on(table.departmentId, table.serviceDate),
]);

export const dailyServiceMetrics = sqliteTable("daily_service_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  metricDate: text("metric_date").notNull(),
  serviceCount: integer("service_count").notNull().default(0),
  triageCount: integer("triage_count").notNull().default(0),
  navigationCount: integer("navigation_count").notNull().default(0),
  resolvedRate: integer("resolved_rate").notNull().default(0),
  transferCount: integer("transfer_count").notNull().default(0),
}, (table) => [uniqueIndex("idx_daily_metrics_date").on(table.metricDate)]);

export const integrationSyncLogs = sqliteTable("integration_sync_logs", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  resourceType: text("resource_type").notNull(),
  requestId: text("request_id").notNull(),
  itemCount: integer("item_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  status: text("status", { enum: ["processing", "success", "partial", "failed"] }).notNull(),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_integration_request_id").on(table.requestId),
  index("idx_integration_created").on(table.createdAt),
]);

export const integrationNonces = sqliteTable("integration_nonces", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  nonce: text("nonce").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_integration_client_nonce").on(table.clientId, table.nonce)]);

export const appointmentOrders = sqliteTable("appointment_orders", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  hospitalId: text("hospital_id").notNull().references(() => hospitals.id),
  scheduleId: text("schedule_id").notNull().references(() => hospitalSchedules.id),
  externalAppointmentId: text("external_appointment_id"),
  status: text("status", { enum: ["pending", "confirmed", "cancel_requested", "cancelled", "failed"] }).notNull().default("pending"),
  failureReason: text("failure_reason"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_appointment_request_id").on(table.requestId),
  index("idx_appointment_user_created").on(table.userId, table.createdAt),
  index("idx_appointment_external_id").on(table.externalAppointmentId),
]);

export const queueSnapshots = sqliteTable("queue_snapshots", {
  appointmentId: text("appointment_id").primaryKey().references(() => appointmentOrders.id, { onDelete: "cascade" }),
  queueNumber: text("queue_number").notNull(),
  peopleAhead: integer("people_ahead").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(0),
  roomName: text("room_name").notNull().default(""),
  status: text("status", { enum: ["waiting", "calling", "completed", "expired"] }).notNull().default("waiting"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
