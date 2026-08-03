package com.futureshijiao.guide;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public final class GuideWebView extends FrameLayout {
    private final WebView webView;
    private final ProgressBar progress;
    private final LinearLayout errorPanel;
    private final FutureShijiaoConfig config;

    @SuppressLint("SetJavaScriptEnabled")
    public GuideWebView(Context context, FutureShijiaoConfig config) {
        super(context);
        this.config = config;
        setBackgroundColor(0xFFFBFCF9);

        webView = new WebView(context);
        webView.setBackgroundColor(0xFFFBFCF9);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setTextZoom(100);
        settings.setUserAgentString(settings.getUserAgentString() + " FutureShijiaoAndroid/1.0");
        if (Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, false);

        addView(webView, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        progress = new ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal);
        progress.setIndeterminate(false);
        progress.setMax(100);
        LayoutParams progressParams = new LayoutParams(LayoutParams.MATCH_PARENT, dp(3));
        progressParams.gravity = Gravity.TOP;
        addView(progress, progressParams);

        errorPanel = buildErrorPanel(context);
        errorPanel.setVisibility(GONE);
        addView(errorPanel, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));

        webView.setWebChromeClient(new android.webkit.WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value);
                progress.setVisibility(value >= 100 ? GONE : VISIBLE);
            }
        });
        webView.setWebViewClient(new SecureClient());
        webView.loadUrl(config.getBaseUrl());
    }

    private LinearLayout buildErrorPanel(Context context) {
        LinearLayout panel = new LinearLayout(context);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(28), dp(28), dp(28), dp(28));
        panel.setBackgroundColor(0xFFFBFCF9);
        TextView title = new TextView(context);
        title.setText("页面暂时无法打开");
        title.setTextColor(0xFF173A36);
        title.setTextSize(22);
        title.setGravity(Gravity.CENTER);
        TextView message = new TextView(context);
        message.setText("请检查网络连接或更新 Android System WebView 后重试。");
        message.setTextColor(0xFF667A76);
        message.setTextSize(14);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, dp(12), 0, dp(22));
        Button retry = new Button(context);
        retry.setText("重新加载");
        retry.setOnClickListener(v -> { errorPanel.setVisibility(GONE); webView.reload(); });
        Button settings = new Button(context);
        settings.setText("网络设置");
        settings.setOnClickListener(v -> context.startActivity(new Intent(Settings.ACTION_WIRELESS_SETTINGS)));
        panel.addView(title);
        panel.addView(message);
        panel.addView(retry, new LinearLayout.LayoutParams(dp(220), dp(52)));
        panel.addView(settings, new LinearLayout.LayoutParams(dp(220), dp(52)));
        return panel;
    }

    public boolean canGoBack() { return webView.canGoBack(); }
    public void goBack() { webView.goBack(); }
    public void destroy() { removeView(webView); webView.stopLoading(); webView.clearHistory(); webView.destroy(); }

    private void openExternal(Uri uri) {
        if (!config.shouldOpenExternalLinks()) return;
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        if (intent.resolveActivity(getContext().getPackageManager()) != null) getContext().startActivity(intent);
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private final class SecureClient extends WebViewClient {
        @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
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
            if (request.isForMainFrame()) errorPanel.setVisibility(VISIBLE);
        }

        @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.cancel();
            errorPanel.setVisibility(VISIBLE);
        }
    }
}
