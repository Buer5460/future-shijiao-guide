# RK3576 / Android 14 安装说明

安装文件：`outputs/FutureShijiao-RK3576-Android14-StartupSafe-1.4.2.apk`

设备要求：截图所示 `rk3576_u`、Android 14 可直接安装。该 APK 不包含 CPU 原生库，因此不区分 arm64、armeabi 或 x86，是通用安装包。

## 文件管理器安装

1. 将 APK 复制到 U 盘或设备“下载”目录。
2. 在设备文件管理器点击 APK。
3. 如出现安全提示，在“安装未知应用”中允许当前文件管理器安装。
4. 点击安装，完成后从桌面打开“未来仕角”。

新包版本号为 `1.4.2 (7)`，与已确认可安装的 1.2.0 使用相同包名、测试证书、SDK、Manifest、权限和系统栏启动流程，正常情况下可直接覆盖安装。已移除可能导致定制 RK3576 固件启动崩溃的强制沉浸式调用。

如果显示“应用未安装”或“签名不一致”，先卸载旧版“未来仕角”，再安装新包。卸载会清除保存在设备上的本机导诊记录。

## ADB 安装

```bash
adb install -r FutureShijiao-RK3576-Android14-StartupSafe-1.4.2.apk
```

如果旧包签名不是本项目生成的测试证书：

```bash
adb uninstall com.futureshijiao.guide
adb install FutureShijiao-RK3576-Android14-StartupSafe-1.4.2.apk
```

## 当前版本的启动保护

- 不再通过跳转 Activity 启动，避免定制桌面误判应用已退出。
- RK3576 使用 WebView 软件渲染，减少 GPU 渲染进程崩溃。
- 应用强制使用完全离线模式，44 个科室、181 名医生、47 个位置、9 张楼层图和 5 类流程全部包含在 APK 内，不需要 IP 地址或互联网。
- Android System WebView 完全缺失时显示原生说明页，不会直接退出。
- 1920×1080、平板和手机按屏幕宽高自动排版，旋转、分屏和字体缩放时不重启 Activity。

## 如果仍然退出

连接电脑执行以下命令后打开应用，将输出保存并交给开发人员：

```bash
adb logcat -c
adb logcat FutureShijiao:E AndroidRuntime:E chromium:E '*:S'
```

同时在设备“设置 → 应用”中确认 Android System WebView 或 Chrome 已启用。图片中的设备没有获取到 IP 地址，不影响 1.4.2 启动安全兼容版运行。
