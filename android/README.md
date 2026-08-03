# 未来仕角 Android SDK

本目录同时产出：

- `guide-sdk-release.aar`：供医院或机器人现有 Android 工程集成。
- `demo-app-debug.apk`：可直接安装的演示应用。

## 兼容范围

- 最低 Android 5.0（API 21）。
- 目标 Android 16（API 36）。
- 支持手机、平板、机器人横屏/竖屏和系统字体缩放。
- 需要设备安装并启用 Android System WebView，且能访问部署域名。
- WebView 缺失、初始化失败、渲染进程退出、断网、服务端 5xx 和 SSL 校验失败时显示原生恢复页，不让异常直接终止应用。

## AAR 集成

把 AAR 放入宿主工程 `app/libs/`，并在宿主模块加入：

```groovy
dependencies {
    implementation files("libs/guide-sdk-release.aar")
}
```

在任意 Activity 中启动：

```java
FutureShijiaoSdk.initialize(
    new FutureShijiaoConfig.Builder()
        .baseUrl("https://future-shijiao-guide.zhuxiangbuer.workers.dev")
        .build()
);
FutureShijiaoSdk.open(this);
```

宿主应用必须声明 `android.permission.INTERNET`。SDK 不申请相机、麦克风、定位或存储权限。

## 本地构建

准备 JDK 17、Android SDK API 36 和 Gradle 8.13 后执行：

```bash
gradle :guide-sdk:assembleRelease :demo-app:assembleDebug
```

演示 APK 使用 Android 调试证书签名，可直接安装测试；正式上架前应改用企业自有签名证书生成 release APK/AAB。

设备仍有异常时可用以下命令采集日志（不包含网页密码）：

```bash
adb logcat -c
adb logcat FutureShijiao:E AndroidRuntime:E '*:S'
```
