package com.futureshijiao.guide;

import android.net.Uri;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public final class FutureShijiaoConfig {
    private final String baseUrl;
    private final Set<String> allowedHosts;
    private final boolean openExternalLinks;

    private FutureShijiaoConfig(Builder builder) {
        Uri uri = Uri.parse(builder.baseUrl);
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
            throw new IllegalArgumentException("baseUrl must be a valid HTTPS URL");
        }
        this.baseUrl = builder.baseUrl;
        HashSet<String> hosts = new HashSet<>(builder.allowedHosts);
        hosts.add(uri.getHost().toLowerCase());
        this.allowedHosts = Collections.unmodifiableSet(hosts);
        this.openExternalLinks = builder.openExternalLinks;
    }

    public String getBaseUrl() { return baseUrl; }
    public Set<String> getAllowedHosts() { return allowedHosts; }
    public boolean shouldOpenExternalLinks() { return openExternalLinks; }

    public boolean isAllowed(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
            && allowedHosts.contains(uri.getHost().toLowerCase());
    }

    public static final class Builder {
        private String baseUrl = "https://future-shijiao-guide.zhuxiangbuer.workers.dev";
        private final Set<String> allowedHosts = new HashSet<>();
        private boolean openExternalLinks = true;

        public Builder baseUrl(String value) { this.baseUrl = value; return this; }
        public Builder allowHost(String value) { if (value != null) allowedHosts.add(value.toLowerCase()); return this; }
        public Builder openExternalLinks(boolean value) { this.openExternalLinks = value; return this; }
        public FutureShijiaoConfig build() { return new FutureShijiaoConfig(this); }
    }
}
