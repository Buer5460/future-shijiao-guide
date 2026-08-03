package com.futureshijiao.guide;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public final class GuideWebView extends FrameLayout {
    private static final String TAG = "FutureShijiao";

    private WebView webView;
    private final ProgressBar progress;
    private final LinearLayout errorPanel;
    private final TextView errorTitle;
    private final TextView errorMessage;
    private final FutureShijiaoConfig config;
    private boolean destroyed;

    public GuideWebView(Context context, FutureShijiaoConfig config) {
        super(context);
        if (config == null) throw new IllegalArgumentException("config must not be null");
        this.config = config;
        setBackgroundColor(0xFFFBFCF9);

        progress = new ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal);
        progress.setIndeterminate(false);
        progress.setMax(100);
        LayoutParams progressParams = new LayoutParams(LayoutParams.MATCH_PARENT, dp(3));
        progressParams.gravity = Gravity.TOP;
        addView(progress, progressParams);

        errorPanel = new LinearLayout(context);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(28), dp(28), dp(28), dp(28));
        errorPanel.setBackgroundColor(0xFFFBFCF9);
        errorTitle = new TextView(context);
        errorTitle.setTextColor(0xFF173A36);
        errorTitle.setTextSize(22);
        errorTitle.setGravity(Gravity.CENTER);
        errorMessage = new TextView(context);
        errorMessage.setTextColor(0xFF667A76);
        errorMessage.setTextSize(14);
        errorMessage.setGravity(Gravity.CENTER);
        errorMessage.setPadding(0, dp(12), 0, dp(22));
        Button retry = new Button(context);
        retry.setText("重新加载");
        retry.setOnClickListener(v -> createWebViewAndLoad());
        Button browser = new Button(context);
        browser.setText("使用浏览器打开");
        browser.setOnClickListener(v -> startActivitySafely(new Intent(Intent.ACTION_VIEW, Uri.parse(config.getBaseUrl()))));
        Button settings = new Button(context);
        settings.setText("网络设置");
        settings.setOnClickListener(v -> startActivitySafely(new Intent(Settings.ACTION_WIRELESS_SETTINGS)));
        errorPanel.addView(errorTitle);
        errorPanel.addView(errorMessage);
        errorPanel.addView(retry, new LinearLayout.LayoutParams(dp(220), dp(52)));
        errorPanel.addView(browser, new LinearLayout.LayoutParams(dp(220), dp(52)));
        errorPanel.addView(settings, new LinearLayout.LayoutParams(dp(220), dp(52)));
        errorPanel.setVisibility(GONE);
        addView(errorPanel, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));

        createWebViewAndLoad();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void createWebViewAndLoad() {
        if (destroyed) return;
        disposeWebView();
        errorPanel.setVisibility(GONE);
        progress.setVisibility(VISIBLE);
        try {
            WebView next = new WebView(getContext());
            next.setBackgroundColor(0xFFFBFCF9);
            WebSettings settings = next.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setMediaPlaybackRequiresUserGesture(true);
            settings.setTextZoom(100);
            settings.setUserAgentString(settings.getUserAgentString() + " FutureShijiaoAndroid/1.1");
            if (Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);

            CookieManager cookies = CookieManager.getInstance();
            cookies.setAcceptCookie(true);
            cookies.setAcceptThirdPartyCookies(next, false);

            next.setWebChromeClient(new android.webkit.WebChromeClient() {
                @Override public void onProgressChanged(WebView view, int value) {
                    progress.setProgress(value);
                    progress.setVisibility(value >= 100 ? GONE : VISIBLE);
                }
            });
            next.setWebViewClient(Build.VERSION.SDK_INT >= 26 ? new SecureClientApi26() : new SecureClient());
            webView = next;
            addView(next, 0, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
            next.loadUrl(config.getBaseUrl());
        } catch (Throwable error) {
            Log.e(TAG, "Unable to create Android WebView", error);
            disposeWebView();
            showError(
                "系统网页组件不可用",
                "请更新或启用 Android System WebView；也可以使用系统浏览器继续演示。"
            );
        }
    }

    private void showError(String title, String message) {
        errorTitle.setText(title);
        errorMessage.setText(message);
        progress.setVisibility(GONE);
        errorPanel.setVisibility(VISIBLE);
        errorPanel.bringToFront();
    }

    public boolean canGoBack() { return webView != null && webView.canGoBack(); }
    public void goBack() { if (webView != null) webView.goBack(); }
    public void onHostPause() { if (webView != null) webView.onPause(); }
    public void onHostResume() { if (webView != null) webView.onResume(); }

    public void destroy() {
        destroyed = true;
        disposeWebView();
    }

    private void disposeWebView() {
        WebView current = webView;
        webView = null;
        if (current == null) return;
        try {
            current.stopLoading();
            current.setWebChromeClient(null);
            current.setWebViewClient(new WebViewClient());
            removeView(current);
            current.destroy();
        } catch (Throwable error) {
            Log.w(TAG, "WebView cleanup failed", error);
        }
    }

    private void recoverFromRendererCrash(boolean didCrash) {
        Log.e(TAG, "WebView renderer exited; didCrash=" + didCrash);
        disposeWebView();
        showError("页面组件已恢复", "系统网页进程刚刚异常退出，请点击重新加载继续使用。");
    }

    private void openExternal(Uri uri) {
        if (!config.shouldOpenExternalLinks() || uri == null) return;
        startActivitySafely(new Intent(Intent.ACTION_VIEW, uri));
    }

    private void startActivitySafely(Intent intent) {
        try {
            if (!(getContext() instanceof Activity)) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (intent.resolveActivity(getContext().getPackageManager()) != null) {
                getContext().startActivity(intent);
            } else {
                showError("无法打开外部应用", "设备没有可处理此操作的应用，请联系设备管理员。");
            }
        } catch (Throwable error) {
            Log.e(TAG, "External activity failed", error);
            showError("无法打开外部应用", "当前设备策略阻止了此操作，请联系设备管理员。");
        }
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private class SecureClient extends WebViewClient {
        @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
            errorPanel.setVisibility(GONE);
        }

        @Override public void onPageFinished(WebView view, String url) {
            errorPanel.setVisibility(GONE);
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (config.isAllowed(uri)) return false;
            openExternal(uri);
            return true;
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            if (config.isAllowed(uri)) return false;
            openExternal(uri);
            return true;
        }

        @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) showError("页面暂时无法打开", "请检查网络连接后重试；错误代码：" + error.getErrorCode());
        }

        @SuppressWarnings("deprecation")
        @Override public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            showError("页面暂时无法打开", "请检查网络连接后重试；错误代码：" + errorCode);
        }

        @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
            if (request.isForMainFrame() && response.getStatusCode() >= 500) {
                showError("服务暂时不可用", "服务器返回 " + response.getStatusCode() + "，请稍后重试。");
            }
        }

        @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.cancel();
            showError("安全连接失败", "证书校验未通过，为保护数据已停止加载。请检查设备时间或联系管理员。");
        }
    }

    private final class SecureClientApi26 extends SecureClient {
        @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            recoverFromRendererCrash(detail.didCrash());
            return true;
        }
    }
}
