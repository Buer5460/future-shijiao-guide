package com.futureshijiao.guide;

import android.app.Activity;
import android.content.Intent;

public final class FutureShijiaoSdk {
    private static volatile FutureShijiaoConfig config = new FutureShijiaoConfig.Builder().build();

    private FutureShijiaoSdk() {}

    public static void initialize(FutureShijiaoConfig newConfig) {
        if (newConfig == null) throw new IllegalArgumentException("config must not be null");
        config = newConfig;
    }

    public static FutureShijiaoConfig getConfig() { return config; }

    public static void open(Activity activity) {
        activity.startActivity(new Intent(activity, FutureShijiaoActivity.class));
    }
}
