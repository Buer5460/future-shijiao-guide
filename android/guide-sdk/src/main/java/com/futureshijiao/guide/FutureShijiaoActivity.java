package com.futureshijiao.guide;

import android.app.Activity;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

public final class FutureShijiaoActivity extends Activity {
    private GuideWebView guideView;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window window = getWindow();
        window.setStatusBarColor(0xFFFBFCF9);
        window.setNavigationBarColor(0xFFFBFCF9);
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            window.setStatusBarColor(0x00000000);
            window.setNavigationBarColor(0x00000000);
            window.setDecorFitsSystemWindows(false);
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) controller.setSystemBarsAppearance(
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
            );
        }
        guideView = new GuideWebView(this, FutureShijiaoSdk.getConfig());
        guideView.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            }
            return insets;
        });
        setContentView(guideView);
    }

    @Override public void onBackPressed() {
        if (guideView != null && guideView.canGoBack()) guideView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (guideView != null) guideView.destroy();
        super.onDestroy();
    }
}
