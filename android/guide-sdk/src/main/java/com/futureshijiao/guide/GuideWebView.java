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
    private static final String LOCAL_ASSET_URL = "file:///android_asset/future_shijiao_offline.html";

    private WebView webView;
    private final ProgressBar progress;
    private final LinearLayout errorPanel;
    private final TextView errorTitle;
    private final TextView errorMessage;
    private final FutureShijiaoConfig config;
    private boolean destroyed;
    private boolean offlineFallbackLoaded;

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
        if (!config.isOfflineOnly()) {
            errorPanel.addView(browser, new LinearLayout.LayoutParams(dp(220), dp(52)));
            errorPanel.addView(settings, new LinearLayout.LayoutParams(dp(220), dp(52)));
        }
        errorPanel.setVisibility(GONE);
        addView(errorPanel, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));

        createWebViewAndLoad();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void createWebViewAndLoad() {
        if (destroyed) return;
        disposeWebView();
        offlineFallbackLoaded = false;
        errorPanel.setVisibility(GONE);
        progress.setVisibility(VISIBLE);
        try {
            WebView next = new WebView(getContext());
            next.setBackgroundColor(0xFFFBFCF9);
            next.setOverScrollMode(View.OVER_SCROLL_NEVER);
            next.setVerticalScrollBarEnabled(false);
            next.setHorizontalScrollBarEnabled(false);
            if (isRockchipDevice()) next.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
            WebSettings settings = next.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setMediaPlaybackRequiresUserGesture(true);
            settings.setTextZoom(100);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(false);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setUserAgentString(settings.getUserAgentString() + " FutureShijiaoAndroid/1.4.2-startup-safe");
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
            if (config.isOfflineOnly()) loadOfflineFallback("设备本机模式");
            else next.loadUrl(config.getBaseUrl());
        } catch (Throwable error) {
            Log.e(TAG, "Unable to create Android WebView", error);
            disposeWebView();
            showError(
                "系统网页组件不可用",
                "请在系统设置中启用 Android System WebView 后，重新打开应用。"
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

    private void loadOfflineFallback(String reason) {
        if (destroyed || webView == null) return;
        if (offlineFallbackLoaded) return;
        Log.w(TAG, "Loading offline demo: " + reason);
        offlineFallbackLoaded = true;
        try {
            webView.loadUrl(LOCAL_ASSET_URL);
        } catch (Throwable error) {
            Log.e(TAG, "Offline fallback failed", error);
            showError("无法加载本机资料", "请检查系统 WebView，或重新安装完整 APK 后点击重新加载。");
        }
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

    private boolean isLocalAsset(Uri uri) {
        return uri != null && "file".equalsIgnoreCase(uri.getScheme())
            && uri.toString().startsWith("file:///android_asset/");
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

    private boolean isRockchipDevice() {
        String hardware = Build.HARDWARE == null ? "" : Build.HARDWARE.toLowerCase();
        String board = Build.BOARD == null ? "" : Build.BOARD.toLowerCase();
        String device = Build.DEVICE == null ? "" : Build.DEVICE.toLowerCase();
        return hardware.contains("rk") || board.contains("rk") || device.contains("rk");
    }

    private class SecureClient extends WebViewClient {
        @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
            errorPanel.setVisibility(GONE);
        }

        @Override public void onPageFinished(WebView view, String url) {
            errorPanel.setVisibility(GONE);
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isLocalAsset(uri) || config.isAllowed(uri)) return false;
            openExternal(uri);
            return true;
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            if (isLocalAsset(uri) || config.isAllowed(uri)) return false;
            openExternal(uri);
            return true;
        }

        @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (!request.isForMainFrame()) return;
            if (isLocalAsset(request.getUrl())) showError("本机资料加载失败", "请重新安装完整 APK，或联系设备管理员检查应用文件。");
            else loadOfflineFallback("网络错误 " + error.getErrorCode());
        }

        @SuppressWarnings("deprecation")
        @Override public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            if (failingUrl != null && failingUrl.startsWith(config.getBaseUrl())) {
                loadOfflineFallback("网络错误 " + errorCode);
            }
        }

        @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
            if (request.isForMainFrame() && !isLocalAsset(request.getUrl()) && response.getStatusCode() >= 500) {
                loadOfflineFallback("服务返回 " + response.getStatusCode());
            }
        }

        @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.cancel();
            loadOfflineFallback("安全连接校验失败");
        }
    }

    private final class SecureClientApi26 extends SecureClient {
        @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            recoverFromRendererCrash(detail.didCrash());
            return true;
        }
    }
}
