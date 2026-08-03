# 医院字段与行业模型映射

本项目内部使用稳定、去厂商化的统一字段；医院 HIS/集成平台字段在适配器中映射，前端不感知厂商差异。

| 未来仕角资源 | 关键字段 | 医院常见来源 | HL7 FHIR R4 对应 | WS/T 846.1—2024 对接方向 |
| --- | --- | --- | --- | --- |
| Hospital | `id, code, name, address` | 医院/院区主数据 | `Organization` | 机构与平台基础信息交互 |
| Department | `hospitalId, code, name, specialty` | 科室字典 | `HealthcareService` / `Organization` | 科室及医疗服务信息交互 |
| Doctor | `departmentId, code, name, title, specialty` | 职工/医生字典 | `Practitioner`, `PractitionerRole` | 医务人员及角色信息交互 |
| Location | `code, building, floor, zone` | 院内 GIS/后勤字典 | `Location` | 位置与就诊场所信息交互 |
| Schedule | `externalScheduleId, serviceDate, startTime, endTime` | 预约号源 | `Schedule`, `Slot` | 门诊排班、号源信息交互 |
| Appointment | `requestId, scheduleId, status` | 预约挂号平台 | `Appointment` | 预约、挂号、退号信息交互 |
| Queue | `queueNumber, peopleAhead, status` | 分诊叫号 | 可用 `Appointment` 扩展/厂商 profile | 候诊、叫号状态交互 |
| Knowledge | `category, title, content, status` | 宣教 CMS | `DocumentReference`（可选） | 医疗服务内容信息交互 |

## 编码原则

- `id` 是未来仕角内部稳定主键；医院编码放在 `code` 或 `external*Id`。
- 科室、医生、号源停用应同步 `status`，不可直接删除历史引用。
- 日期使用 `YYYY-MM-DD`，时间使用 `HH:mm:ss`，时间戳使用带时区 ISO 8601。
- 金额使用整数分 `feeFen`，禁止浮点元。
- 所有枚举先做映射表；未知值进入隔离队列，不静默映射为“正常”。
- 医院多院区时，新增 `campusId` 维度并确保科室/位置/号源都归属明确。

## 患者身份与医疗数据边界

- 当前演示用户 ID 仅用于本系统账号和数据隔离，不等同医院患者 ID。
- 正式对接使用医院签发的一次性授权码换取短期患者令牌；数据库仅保存令牌引用或经过医院认可的映射 ID。
- APP 不持有 HIS 数据库账号，不直接访问 EMR/LIS/PACS。
- 导诊一期不需要病历正文、影像、检验明细。二期如确有需求，逐接口做患者授权、用途限制、最小字段和审计。
