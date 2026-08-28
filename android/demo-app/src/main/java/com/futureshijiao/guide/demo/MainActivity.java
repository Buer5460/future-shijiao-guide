package com.futureshijiao.guide.demo;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.futureshijiao.guide.FutureShijiaoConfig;
import com.futureshijiao.guide.GuideWebView;

public final class MainActivity extends Activity {
    private static final String TAG = "FutureShijiao";
    private GuideWebView guideView;
    private Object predictiveBackCallback;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        enterKioskDisplayMode();
        try {
            FutureShijiaoConfig config = new FutureShijiaoConfig.Builder()
                .offlineOnly(true)
                .openExternalLinks(false)
                .build();
            guideView = new GuideWebView(this, config);
            setContentView(guideView);
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                predictiveBackCallback = BackApi33.register(this);
            }
        } catch (Throwable error) {
            Log.e(TAG, "Unable to start guide", error);
            showNativeFallback(error);
        }
    }

    @SuppressLint("GestureBackNavigation")
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() {
        handleBack();
    }

    @Override protected void onPause() {
        if (guideView != null) guideView.onHostPause();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        enterKioskDisplayMode();
        if (guideView != null) guideView.onHostResume();
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterKioskDisplayMode();
    }

    @Override protected void onDestroy() {
        if (android.os.Build.VERSION.SDK_INT >= 33 && predictiveBackCallback != null) {
            BackApi33.unregister(this, predictiveBackCallback);
            predictiveBackCallback = null;
        }
        if (guideView != null) guideView.destroy();
        super.onDestroy();
    }

    private void showNativeFallback(Throwable error) {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(32), dp(32), dp(32), dp(32));
        panel.setBackgroundColor(0xFFFBFCF9);

        TextView title = new TextView(this);
        title.setText("未来仕角已安全启动");
        title.setTextColor(0xFF173A36);
        title.setTextSize(24);
        title.setGravity(Gravity.CENTER);

        TextView message = new TextView(this);
        message.setText("当前设备的系统网页组件暂时不可用，应用没有退出。请启用或更新 Android System WebView 后点击重试。\n\n设备：" + android.os.Build.MODEL + " · Android " + android.os.Build.VERSION.RELEASE);
        message.setTextColor(0xFF667A76);
        message.setTextSize(15);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, dp(16), 0, dp(24));

        Button retry = new Button(this);
        retry.setText("重新加载");
        retry.setOnClickListener(view -> recreate());

        TextView diagnostic = new TextView(this);
        diagnostic.setText("诊断代码：START-" + error.getClass().getSimpleName());
        diagnostic.setTextColor(Color.GRAY);
        diagnostic.setTextSize(12);
        diagnostic.setGravity(Gravity.CENTER);
        diagnostic.setPadding(0, dp(18), 0, 0);

        panel.addView(title);
        panel.addView(message);
        panel.addView(retry, new LinearLayout.LayoutParams(dp(220), dp(52)));
        panel.addView(diagnostic);
        setContentView(panel);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @SuppressWarnings("deprecation")
    private void enterKioskDisplayMode() {
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            KioskApi30.enter(getWindow());
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }
    }

    @android.annotation.TargetApi(30)
    private static final class KioskApi30 {
        private static void enter(android.view.Window window) {
            window.setDecorFitsSystemWindows(false);
            android.view.WindowInsetsController controller = window.getInsetsController();
            if (controller == null) return;
            controller.hide(android.view.WindowInsets.Type.statusBars() | android.view.WindowInsets.Type.navigationBars());
            controller.setSystemBarsBehavior(android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }

    private void handleBack() {
        if (guideView != null && guideView.canGoBack()) guideView.goBack();
        else finishAfterTransition();
    }

    @android.annotation.TargetApi(33)
    private static final class BackApi33 {
        private static Object register(MainActivity activity) {
            android.window.OnBackInvokedCallback callback = activity::handleBack;
            activity.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                callback
            );
            return callback;
        }

        private static void unregister(MainActivity activity, Object callback) {
            activity.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(
                (android.window.OnBackInvokedCallback) callback
            );
        }
    }
}
