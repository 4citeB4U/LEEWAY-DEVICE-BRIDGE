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
        title.setText(
                "LeeWay Agent Lee Voice One Bridge\n\n"
                + "Canonical cloned voice: agent-lee-voice-one\n"
                + "Authority: 4citeB4U/LeeWay-Voice-Fabric\n"
                + "Loopback: 127.0.0.1:54321\n\n"
                + "Prepared text and phrase streaming use the same Voice One fabric as LeeWay host adapters."
        );
        title.setTextSize(18f);
        root.addView(title);

        Button start = new Button(this);
        start.setText("Start / Prepare Agent Lee Voice One");
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
