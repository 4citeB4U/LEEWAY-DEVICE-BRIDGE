package industries.leeway.readaloud;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class ReadAloudService extends Service {
    public static final int PORT = 54321;
    public static final String ENGINE_PACKAGE = "com.samsung.SMT";
    public static final String AUTHORITY = "LEEWAY_ACCESSIBILITY_READ_ALOUD_NOT_AGENT_LEE_VOICE_ONE";
    private static final String CHANNEL = "leeway-read-aloud";
    private static final int NOTIFICATION_ID = 54321;

    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile boolean ready = false;
    private volatile boolean speaking = false;
    private volatile String lastError = "INITIALIZING";
    private volatile int lastChars = 0;
    private TextToSpeech tts;
    private ServerSocket server;
    private Thread serverThread;

    @Override
    public void onCreate() {
        super.onCreate();
        startInForeground();
        initTts();
        startLoopbackServer();
    }

    private void startInForeground() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel(CHANNEL, "LeeWay Read Aloud", NotificationManager.IMPORTANCE_LOW);
            c.setDescription("Keeps the owner-authorized Samsung TTS read-aloud bridge available on localhost");
            nm.createNotificationChannel(c);
        }
        Notification n = new Notification.Builder(this, CHANNEL)
                .setContentTitle("LeeWay Read Aloud Bridge")
                .setContentText("Samsung TTS accessibility renderer on 127.0.0.1:" + PORT)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setOngoing(true)
                .build();
        startForeground(NOTIFICATION_ID, n);
    }

    private void initTts() {
        main.post(() -> {
            try {
                tts = new TextToSpeech(getApplicationContext(), status -> {
                    ready = status == TextToSpeech.SUCCESS;
                    lastError = ready ? "" : "SAMSUNG_TTS_INIT_FAILED_" + status;
                    if (!ready) return;
                    tts.setLanguage(Locale.US);
                    tts.setPitch(1.0f);
                    tts.setSpeechRate(1.0f);
                    tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override public void onStart(String utteranceId) { speaking = true; }
                        @Override public void onDone(String utteranceId) { if (utteranceId.endsWith("-last")) speaking = false; }
                        @Override public void onError(String utteranceId) { speaking = false; lastError = "TTS_UTTERANCE_ERROR"; }
                    });
                }, ENGINE_PACKAGE);
            } catch (Throwable t) {
                ready = false;
                lastError = t.getClass().getSimpleName() + ":" + String.valueOf(t.getMessage());
            }
        });
    }

    private void startLoopbackServer() {
        serverThread = new Thread(() -> {
            try {
                server = new ServerSocket();
                server.setReuseAddress(true);
                server.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), PORT));
                while (!server.isClosed()) {
                    Socket socket = server.accept();
                    Thread worker = new Thread(() -> handle(socket), "leeway-read-aloud-request");
                    worker.setDaemon(true);
                    worker.start();
                }
            } catch (Throwable t) {
                lastError = "SERVER:" + t.getClass().getSimpleName() + ":" + String.valueOf(t.getMessage());
            }
        }, "leeway-read-aloud-loopback");
        serverThread.setDaemon(true);
        serverThread.start();
    }

    private void handle(Socket socket) {
        try (Socket s = socket; InputStream in = s.getInputStream(); OutputStream out = s.getOutputStream()) {
            String request = readLine(in);
            if (request == null || request.isEmpty()) { respond(out, 400, "{\"ok\":false,\"error\":\"BAD_REQUEST\"}"); return; }
            String[] first = request.split(" ");
            if (first.length < 2) { respond(out, 400, "{\"ok\":false,\"error\":\"BAD_REQUEST\"}"); return; }
            String method = first[0];
            String path = first[1];
            int contentLength = 0;
            String line;
            while ((line = readLine(in)) != null && !line.isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0 && line.substring(0, colon).trim().equalsIgnoreCase("Content-Length")) {
                    try { contentLength = Integer.parseInt(line.substring(colon + 1).trim()); } catch (NumberFormatException ignored) {}
                }
            }

            if ("GET".equals(method) && "/health".equals(path)) {
                respond(out, 200, healthJson());
                return;
            }
            if ("POST".equals(method) && "/stop".equals(path)) {
                stopSpeech();
                respond(out, 200, "{\"ok\":true,\"stopped\":true,\"authority\":\"" + AUTHORITY + "\"}");
                return;
            }
            if ("POST".equals(method) && "/speak".equals(path)) {
                if (contentLength <= 0 || contentLength > 250000) {
                    respond(out, 400, "{\"ok\":false,\"error\":\"TEXT_REQUIRED_OR_TOO_LARGE\"}");
                    return;
                }
                String text = new String(readBody(in, contentLength), StandardCharsets.UTF_8).trim();
                if (text.isEmpty()) { respond(out, 400, "{\"ok\":false,\"error\":\"TEXT_REQUIRED\"}"); return; }
                if (!ready) { respond(out, 503, healthJson()); return; }
                lastChars = text.length();
                speakPrepared(text);
                respond(out, 202, "{\"ok\":true,\"accepted\":true,\"chars\":" + text.length() + ",\"engine\":\"" + ENGINE_PACKAGE + "\",\"authority\":\"" + AUTHORITY + "\"}");
                return;
            }
            respond(out, 404, "{\"ok\":false,\"error\":\"NOT_FOUND\"}");
        } catch (Throwable t) {
            lastError = "REQUEST:" + t.getClass().getSimpleName() + ":" + String.valueOf(t.getMessage());
        }
    }

    private String healthJson() {
        return "{\"ok\":true,\"ready\":" + ready
                + ",\"speaking\":" + speaking
                + ",\"engine\":\"" + ENGINE_PACKAGE + "\""
                + ",\"lastChars\":" + lastChars
                + ",\"lastError\":\"" + json(lastError) + "\""
                + ",\"loopback\":\"127.0.0.1:" + PORT + "\""
                + ",\"authority\":\"" + AUTHORITY + "\"}";
    }

    private void speakPrepared(String text) {
        final List<String> chunks = chunk(text, 3500);
        main.post(() -> {
            if (tts == null || !ready) return;
            tts.stop();
            speaking = true;
            long stamp = System.currentTimeMillis();
            for (int i = 0; i < chunks.size(); i++) {
                boolean last = i == chunks.size() - 1;
                String id = "leeway-" + stamp + "-" + i + (last ? "-last" : "");
                int mode = i == 0 ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD;
                int rc = tts.speak(chunks.get(i), mode, null, id);
                if (rc == TextToSpeech.ERROR) {
                    speaking = false;
                    lastError = "TTS_SPEAK_REJECTED";
                    break;
                }
            }
        });
    }

    private void stopSpeech() {
        main.post(() -> {
            if (tts != null) tts.stop();
            speaking = false;
        });
    }

    private static List<String> chunk(String text, int max) {
        List<String> out = new ArrayList<>();
        String remaining = text.replace('\u0000', ' ').trim();
        while (remaining.length() > max) {
            int cut = remaining.lastIndexOf(' ', max);
            if (cut < max / 2) cut = max;
            out.add(remaining.substring(0, cut).trim());
            remaining = remaining.substring(cut).trim();
        }
        if (!remaining.isEmpty()) out.add(remaining);
        return out;
    }

    private static String readLine(InputStream in) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        int c;
        while ((c = in.read()) != -1) {
            if (c == '\n') break;
            if (c != '\r') b.write(c);
            if (b.size() > 8192) throw new IllegalArgumentException("HEADER_TOO_LARGE");
        }
        if (c == -1 && b.size() == 0) return null;
        return b.toString(StandardCharsets.UTF_8.name());
    }

    private static byte[] readBody(InputStream in, int size) throws Exception {
        byte[] body = new byte[size];
        int off = 0;
        while (off < size) {
            int n = in.read(body, off, size - off);
            if (n < 0) break;
            off += n;
        }
        if (off == size) return body;
        byte[] shortBody = new byte[off];
        System.arraycopy(body, 0, shortBody, 0, off);
        return shortBody;
    }

    private static String json(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }

    private static void respond(OutputStream out, int code, String body) throws Exception {
        byte[] payload = body.getBytes(StandardCharsets.UTF_8);
        String reason = code == 200 ? "OK" : code == 202 ? "Accepted" : code == 400 ? "Bad Request" : code == 404 ? "Not Found" : "Service Unavailable";
        String header = "HTTP/1.1 " + code + " " + reason + "\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: " + payload.length + "\r\nConnection: close\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.US_ASCII));
        out.write(payload);
        out.flush();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        try { if (server != null) server.close(); } catch (Exception ignored) {}
        if (tts != null) { tts.stop(); tts.shutdown(); }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
