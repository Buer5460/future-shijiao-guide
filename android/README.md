# 未来仕角 Android SDK

本目录同时产出：

- `guide-sdk-release.aar`：供医院或机器人现有 Android 工程集成。
- `demo-app-debug.apk`：可直接安装的演示应用。

## 兼容范围

- 最低 Android 5.0（API 21）。
- 目标 Android 16（API 36）。
- 支持手机、平板、1920×1080 机器人横屏/竖屏、分屏和系统字体缩放。
- 演示 APK 强制使用本机离线模式，不请求公网；内置 44 个科室、181 名医生、47 个位置、9 张院方楼层图和 5 类就医流程。
- WebView 缺失、初始化失败或渲染进程退出时显示原生恢复页，不让异常直接终止应用。
- RK3576 等 Rockchip 设备自动使用软件渲染，规避部分定制 GPU/WebView 的启动崩溃。

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
        .offlineOnly(true)
        .build()
);
FutureShijiaoSdk.open(this);
```

`offlineOnly(true)` 下不需要网络，导诊记录只写入设备 WebView 本机存储，不上传服务器。SDK 不申请相机、麦克风、定位或存储权限。若医院后续需要接入 HIS，可改为在线地址并由宿主应用声明 `android.permission.INTERNET`。

## 本地构建

准备 JDK 17、Android SDK API 36 和 Gradle 8.13 后执行：

```bash
gradle :guide-sdk:assembleRelease :demo-app:assembleRelease
```

RK3576 设备安装说明见 [`INSTALL-RK3576.md`](INSTALL-RK3576.md)。测试 APK 使用与上一演示包相同的测试证书，可覆盖安装；正式上架前应改用企业自有签名证书生成 release APK/AAB。

设备仍有异常时可用以下命令采集日志（不包含网页密码）：

```bash
adb logcat -c
adb logcat FutureShijiao:E AndroidRuntime:E '*:S'
```
