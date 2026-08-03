package com.futureshijiao.guide.demo;

import android.app.Activity;
import android.os.Bundle;

import com.futureshijiao.guide.FutureShijiaoConfig;
import com.futureshijiao.guide.FutureShijiaoSdk;

public final class MainActivity extends Activity {
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        FutureShijiaoSdk.initialize(new FutureShijiaoConfig.Builder().build());
        FutureShijiaoSdk.open(this);
        finish();
    }
}
