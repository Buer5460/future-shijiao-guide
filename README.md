# 未来仕角 · 智慧导医

可公开演示的 Android/H5 智能导医系统，包含患者前台、独立用户体系、导诊记录和 PC 运营后台演示。

## 在线演示

- 公网地址：<https://future-shijiao-guide.zhuxiangbuer.workers.dev>
- 免费托管：Cloudflare Workers
- 免费数据库：Cloudflare D1

## 已实现

- 响应式 H5：首页、症状导诊、安全分流、科室建议、院内导航、科室/医生/医院/宣教模块。
- 医疗安全边界：明确非诊断、非处方；危险信号优先提示拨打 120，紧急记录不入库。
- 用户体系：邮箱注册/登录、PBKDF2 密码哈希、HttpOnly 会话、退出登录。
- 用户数据：导诊记录按用户隔离，包含审计日志表。
- PC 管理后台：总览、服务数据、问答、知识库、医院内容、设备和权限日志的可交互演示。
- Android：最低 Android 5（API 21），目标 Android 16（API 36），同时产出 APK 与 AAR SDK。

> PC 管理后台目前是汇报演示模块，页面中的运营数字为演示数据，不代表真实医院业务数据。真实上线前需再接医院账号权限、HIS/排班/地图等授权接口。

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

- 演示 APK：`android/outputs/FutureShijiao-Demo-1.0.0-debug.apk`
- AAR SDK：`android/outputs/FutureShijiao-Guide-SDK-1.0.0.aar`

演示 APK 为调试签名；医院正式发布版本需要使用企业自有签名证书。
