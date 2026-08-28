# 未来仕角 · 智慧导医

可公开演示的 Android/H5 智能导医系统，包含患者前台、独立用户体系、导诊记录、PC 运营后台和医院系统集成接口。

## 在线演示

- 公网地址：<https://future-shijiao-guide.zhuxiangbuer.workers.dev>
- 免费托管：Cloudflare Workers
- 免费数据库：Cloudflare D1

## 已实现

- 响应式 H5：首页、症状导诊、安全分流、科室建议、院内导航、科室/医生/医院/宣教模块。
- 医疗安全边界：明确非诊断、非处方；危险信号优先提示拨打 120，紧急记录不入库。
- 用户体系：邮箱注册/登录、PBKDF2 密码哈希、HttpOnly 会话、退出登录。
- 用户数据：导诊记录按用户隔离，包含审计日志表。
- 前后台联动：医院、科室、医生、位置、宣教、导诊规则、号源和运营指标统一从数据库/API 读取；管理员修改内容后患者端同步更新。
- 医院接口：主数据、排班号源、预约/取消、候诊队列、HMAC 鉴权、防重放、幂等与同步日志。
- Android：最低 Android 5（API 21），目标 Android 16（API 36），同时产出 APK 与 AAR SDK；RK3576 设备使用单 Activity 启动与软件渲染，断网自动进入 APK 内置离线演示页，WebView 缺失时显示原生恢复页。

> 当前公网数据库中的医院与运营数据是演示数据，不代表真实医院业务。接口和状态机已实现，但正式挂号仍需医院提供 HIS/预约/叫号测试地址、字段和授权凭据。

## 医院对接资料

- 对接说明：[`docs/HOSPITAL_INTEGRATION.md`](docs/HOSPITAL_INTEGRATION.md)
- OpenAPI 3.1：[`docs/openapi.yaml`](docs/openapi.yaml)
- 字段与行业模型映射：[`docs/FIELD_MAPPING.md`](docs/FIELD_MAPPING.md)

## 本地运行

需要 Node.js 22.13 或更高版本：

```bash
npm install
npm run dev
```

质量检查：

```bash
npm run lint
npm test
```

## Cloudflare 部署

配置见 `wrangler.deploy.jsonc`。数据库和站点已创建；更新时执行：

```bash
npm run db:deploy
npm run deploy
```

## Android

Android 源码与接入说明见 `android/README.md`。

- RK3576 / Android 14 安装包：`android/outputs/FutureShijiao-RK3576-Android14-1.2.0.apk`
- AAR SDK：`android/outputs/FutureShijiao-Guide-SDK-1.2.0.aar`
- 设备安装说明：`android/INSTALL-RK3576.md`

APK 使用与上一演示包相同的测试证书，可直接覆盖安装；医院正式发布版本需要使用企业自有签名证书。
