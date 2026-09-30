package industries.leeway.readaloud;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = (int)(24 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("LeeWay Read Aloud Bridge\n\nSamsung TTS accessibility renderer\nLoopback: 127.0.0.1:54321\n\nThis is not Agent Lee Voice One.");
        title.setTextSize(18f);
        root.addView(title);

        Button start = new Button(this);
        start.setText("Start Read Aloud Bridge");
        start.setOnClickListener(v -> startBridge());
        root.addView(start);
        setContentView(root);
        startBridge();
    }

    private void startBridge() {
        Intent i = new Intent(this, ReadAloudService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(i);
        else startService(i);
    }
}
