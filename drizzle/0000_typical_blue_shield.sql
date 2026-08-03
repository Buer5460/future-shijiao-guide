CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_user_id` integer,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_logs_actor_created` ON `audit_logs` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `triage_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`symptom` text NOT NULL,
	`recommended_department` text NOT NULL,
	`safety_status` text NOT NULL,
	`disclaimer_accepted` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_triage_records_user_created` ON `triage_records` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`auth_user_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'patient' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_users_auth_user_id` ON `users` (`auth_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_users_email` ON `users` (`email`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `password_credentials` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`iterations` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_user_sessions_user_expires` ON `user_sessions` (`user_id`,`expires_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hospitals` (`id` text PRIMARY KEY NOT NULL,`code` text NOT NULL,`name` text NOT NULL,`short_name` text NOT NULL,`address` text NOT NULL,`emergency_phone` text DEFAULT '120' NOT NULL,`status` text DEFAULT 'active' NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_hospitals_code` ON `hospitals` (`code`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `departments` (`id` text PRIMARY KEY NOT NULL,`hospital_id` text NOT NULL,`code` text NOT NULL,`name` text NOT NULL,`aliases` text DEFAULT '[]' NOT NULL,`floor` text NOT NULL,`zone` text DEFAULT '' NOT NULL,`description` text NOT NULL,`specialty` text DEFAULT '' NOT NULL,`status` text DEFAULT 'active' NOT NULL,`sort_order` integer DEFAULT 0 NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_departments_hospital_code` ON `departments` (`hospital_id`,`code`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_departments_status_sort` ON `departments` (`status`,`sort_order`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `doctors` (`id` text PRIMARY KEY NOT NULL,`hospital_id` text NOT NULL,`department_id` text NOT NULL,`code` text NOT NULL,`name` text NOT NULL,`title` text NOT NULL,`specialty` text NOT NULL,`schedule_text` text DEFAULT '' NOT NULL,`avatar_color` text DEFAULT '#3a7d74' NOT NULL,`status` text DEFAULT 'active' NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`),FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_doctors_hospital_code` ON `doctors` (`hospital_id`,`code`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_doctors_department_status` ON `doctors` (`department_id`,`status`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hospital_locations` (`id` text PRIMARY KEY NOT NULL,`hospital_id` text NOT NULL,`code` text NOT NULL,`name` text NOT NULL,`building` text NOT NULL,`floor` text NOT NULL,`zone` text DEFAULT '' NOT NULL,`description` text DEFAULT '' NOT NULL,`status` text DEFAULT 'active' NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_locations_hospital_code` ON `hospital_locations` (`hospital_id`,`code`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `knowledge_articles` (`id` text PRIMARY KEY NOT NULL,`hospital_id` text NOT NULL,`category` text NOT NULL,`title` text NOT NULL,`summary` text NOT NULL,`content` text DEFAULT '' NOT NULL,`status` text DEFAULT 'draft' NOT NULL,`sort_order` integer DEFAULT 0 NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_knowledge_status_sort` ON `knowledge_articles` (`status`,`sort_order`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `triage_rules` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,`keyword` text NOT NULL,`department_code` text,`priority` integer DEFAULT 0 NOT NULL,`urgent` integer DEFAULT false NOT NULL,`guidance` text DEFAULT '' NOT NULL,`status` text DEFAULT 'active' NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_triage_rules_status_priority` ON `triage_rules` (`status`,`priority`);
--> statement-breakpoint
DELETE FROM `triage_rules` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `triage_rules` GROUP BY `keyword`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_triage_rules_keyword` ON `triage_rules` (`keyword`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hospital_schedules` (`id` text PRIMARY KEY NOT NULL,`hospital_id` text NOT NULL,`department_id` text NOT NULL,`doctor_id` text,`external_schedule_id` text NOT NULL,`service_date` text NOT NULL,`period` text NOT NULL,`start_time` text NOT NULL,`end_time` text NOT NULL,`available_count` integer DEFAULT 0 NOT NULL,`fee_fen` integer DEFAULT 0 NOT NULL,`status` text DEFAULT 'available' NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`),FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`),FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_schedules_external_id` ON `hospital_schedules` (`external_schedule_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_schedules_department_date` ON `hospital_schedules` (`department_id`,`service_date`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `daily_service_metrics` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,`metric_date` text NOT NULL,`service_count` integer DEFAULT 0 NOT NULL,`triage_count` integer DEFAULT 0 NOT NULL,`navigation_count` integer DEFAULT 0 NOT NULL,`resolved_rate` integer DEFAULT 0 NOT NULL,`transfer_count` integer DEFAULT 0 NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_daily_metrics_date` ON `daily_service_metrics` (`metric_date`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `integration_sync_logs` (`id` text PRIMARY KEY NOT NULL,`client_id` text NOT NULL,`resource_type` text NOT NULL,`request_id` text NOT NULL,`item_count` integer DEFAULT 0 NOT NULL,`success_count` integer DEFAULT 0 NOT NULL,`failure_count` integer DEFAULT 0 NOT NULL,`status` text NOT NULL,`error_message` text,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_integration_request_id` ON `integration_sync_logs` (`request_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_integration_created` ON `integration_sync_logs` (`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `integration_nonces` (`id` text PRIMARY KEY NOT NULL,`client_id` text NOT NULL,`nonce` text NOT NULL,`expires_at` text NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_integration_client_nonce` ON `integration_nonces` (`client_id`,`nonce`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `appointment_orders` (`id` text PRIMARY KEY NOT NULL,`request_id` text NOT NULL,`user_id` integer NOT NULL,`hospital_id` text NOT NULL,`schedule_id` text NOT NULL,`external_appointment_id` text,`status` text DEFAULT 'pending' NOT NULL,`failure_reason` text,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`),FOREIGN KEY (`schedule_id`) REFERENCES `hospital_schedules`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_appointment_request_id` ON `appointment_orders` (`request_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_appointment_user_created` ON `appointment_orders` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_appointment_external_id` ON `appointment_orders` (`external_appointment_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `queue_snapshots` (`appointment_id` text PRIMARY KEY NOT NULL,`queue_number` text NOT NULL,`people_ahead` integer DEFAULT 0 NOT NULL,`estimated_minutes` integer DEFAULT 0 NOT NULL,`room_name` text DEFAULT '' NOT NULL,`status` text DEFAULT 'waiting' NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`appointment_id`) REFERENCES `appointment_orders`(`id`) ON DELETE cascade);
--> statement-breakpoint
INSERT OR IGNORE INTO `hospitals` (`id`,`code`,`name`,`short_name`,`address`,`emergency_phone`) VALUES ('hospital-demo','AH001','安和市第一人民医院（演示）','安和一院','安和市健康路 1 号','120');
--> statement-breakpoint
INSERT OR IGNORE INTO `departments` (`id`,`hospital_id`,`code`,`name`,`aliases`,`floor`,`zone`,`description`,`specialty`,`sort_order`) VALUES
('dept-cardio','hospital-demo','CARD','心血管内科','["心内科","心脏内科"]','门诊楼 3F','A 区','胸闷、心悸、高血压等相关疾病','冠心病、高血压、心律失常',1),
('dept-ortho','hospital-demo','ORTHO','骨科','["骨外科"]','门诊楼 4F','B 区','骨关节、脊柱、运动损伤','关节、脊柱、创伤',2),
('dept-neuro','hospital-demo','NEURO','神经内科','["脑内科"]','门诊楼 3F','C 区','头痛、眩晕、肢体麻木','脑血管病、头痛、眩晕',3),
('dept-pediatrics','hospital-demo','PED','儿科','["儿童门诊"]','门诊楼 2F','A 区','儿童常见病与生长发育','儿童内科、保健',4),
('dept-general','hospital-demo','GENERAL','全科医学科','["全科门诊"]','门诊楼 2F','C 区','症状不明确时的首诊评估','常见症状综合评估',5);
--> statement-breakpoint
INSERT OR IGNORE INTO `doctors` (`id`,`hospital_id`,`department_id`,`code`,`name`,`title`,`specialty`,`schedule_text`,`avatar_color`) VALUES
('doctor-zhou','hospital-demo','dept-cardio','D001','周明远','主任医师','冠心病、高血压及心律失常','周一、周三上午','#3a7d74'),
('doctor-lin','hospital-demo','dept-neuro','D002','林悦','副主任医师','头痛、眩晕与脑血管病','周二、周四下午','#795c5c'),
('doctor-chen','hospital-demo','dept-ortho','D003','陈思齐','主任医师','关节损伤、脊柱与运动医学','周一、周五上午','#536b8c');
--> statement-breakpoint
INSERT OR IGNORE INTO `hospital_locations` (`id`,`hospital_id`,`code`,`name`,`building`,`floor`,`zone`,`description`) VALUES
('loc-lobby','hospital-demo','LOBBY','门诊大厅','门诊楼','1F','','办卡、咨询与自助服务'),
('loc-cardio','hospital-demo','CARD-A','心血管内科','门诊楼','3F','A 区','2 号电梯到 3F 后左转'),
('loc-lab','hospital-demo','LAB','检验科','医技楼','2F','','门诊采血与检验'),
('loc-pharmacy','hospital-demo','PHARMACY','药房','门诊楼','1F','西侧','门诊取药窗口');
--> statement-breakpoint
INSERT OR IGNORE INTO `knowledge_articles` (`id`,`hospital_id`,`category`,`title`,`summary`,`content`,`status`,`sort_order`) VALUES
('article-heat','hospital-demo','季节健康','夏季防暑的 6 个要点','补充水分、避免高温时段外出，识别中暑信号。','演示健康教育内容，不替代医生诊断。','published',1),
('article-bp','hospital-demo','慢病管理','居家测量血压怎么做','测量前安静休息，规范姿势并记录趋势。','演示健康教育内容，不替代医生诊断。','published',2),
('article-wound','hospital-demo','术后护理','出院后伤口观察指南','保持清洁干燥，关注红肿、渗液与发热。','演示健康教育内容，不替代医生诊断。','published',3),
('article-child-fever','hospital-demo','儿童健康','儿童发热家庭观察要点','关注精神状态、饮水和呼吸情况。','演示健康教育内容，不替代医生诊断。','published',4);
--> statement-breakpoint
INSERT OR IGNORE INTO `triage_rules` (`keyword`,`department_code`,`priority`,`urgent`,`guidance`) VALUES
('严重胸痛',NULL,100,1,'立即拨打 120 或前往最近急诊科'),('呼吸困难',NULL,100,1,'立即拨打 120 或前往最近急诊科'),('意识不清',NULL,100,1,'立即拨打 120'),('大量出血',NULL,100,1,'立即拨打 120'),
('胸闷','CARD',50,0,'建议优先咨询心血管内科'),('心慌','CARD',50,0,'建议优先咨询心血管内科'),('头痛','NEURO',50,0,'建议优先咨询神经内科'),('头晕','NEURO',50,0,'建议优先咨询神经内科'),('关节','ORTHO',50,0,'建议优先咨询骨科'),('腰背','ORTHO',50,0,'建议优先咨询骨科'),('儿童','PED',50,0,'建议优先咨询儿科');
--> statement-breakpoint
INSERT OR IGNORE INTO `daily_service_metrics` (`metric_date`,`service_count`,`triage_count`,`navigation_count`,`resolved_rate`,`transfer_count`) VALUES
('2026-07-29',932,302,241,89,41),('2026-07-30',1048,344,278,90,39),('2026-07-31',998,331,257,90,40),('2026-08-01',1186,398,316,91,38),('2026-08-02',1124,376,301,92,37),('2026-08-03',1286,438,360,93,36);
