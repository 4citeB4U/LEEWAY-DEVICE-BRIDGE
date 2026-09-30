package industries.leeway.readaloud;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.PowerManager;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public final class ReadAloudService extends Service {
    public static final int PORT = 54321;
    public static final String ENGINE = "agent-lee-voice-one";
    public static final String AUTHORITY = "4citeB4U/LeeWay-Voice-Fabric";
    private static final String CHANNEL = "leeway-read-aloud";
    private static final int NOTIFICATION_ID = 54321;

    private volatile boolean muted = false;
    private volatile String lastError = "";
    private ServerSocket server;
    private Thread serverThread;
    private VoiceOneHost voice;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        startInForeground();
        acquireWakeLock();
        voice = new VoiceOneHost(this);
        voice.start();
        voice.prepare();
        startLoopbackServer();
    }

    private void startInForeground() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel(
                    CHANNEL,
                    "LeeWay Agent Lee Voice One",
                    NotificationManager.IMPORTANCE_LOW
            );
            c.setDescription("Keeps the owner-authorized Agent Lee Voice One prepared-text bridge available on localhost");
            nm.createNotificationChannel(c);
        }
        Notification n = new Notification.Builder(this, CHANNEL)
                .setContentTitle("LeeWay Agent Lee Voice One")
                .setContentText("Prepared-text and streaming voice bridge on 127.0.0.1:" + PORT)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setOngoing(true)
                .build();
        startForeground(NOTIFICATION_ID, n);
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = getSystemService(PowerManager.class);
            if (pm == null) return;
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LeeWay:VoiceOneBridge");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire();
        } catch (Throwable ignored) {
        }
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
            if (request == null || request.isEmpty()) {
                respond(out, 400, jsonError("BAD_REQUEST"));
                return;
            }
            String[] first = request.split(" ");
            if (first.length < 2) {
                respond(out, 400, jsonError("BAD_REQUEST"));
                return;
            }
            String method = first[0];
            String path = first[1];
            int contentLength = 0;
            String line;
            while ((line = readLine(in)) != null && !line.isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0 && line.substring(0, colon).trim().equalsIgnoreCase("Content-Length")) {
                    try {
                        contentLength = Integer.parseInt(line.substring(colon + 1).trim());
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
            if (contentLength < 0 || contentLength > 250000) {
                respond(out, 400, jsonError("BODY_TOO_LARGE"));
                return;
            }
            String body = contentLength == 0
                    ? ""
                    : new String(readBody(in, contentLength), StandardCharsets.UTF_8);

            if ("GET".equals(method) && "/health".equals(path)) {
                respond(out, 200, healthJson());
                return;
            }
            if ("POST".equals(method) && "/prepare".equals(path)) {
                voice.prepare();
                respond(out, 202, new JSONObject()
                        .put("ok", true)
                        .put("accepted", true)
                        .put("operation", "prepare")
                        .put("voicePackageId", VoiceOneHost.VOICE_ID)
                        .put("authority", AUTHORITY)
                        .toString());
                return;
            }
            if ("POST".equals(method) && "/stop".equals(path)) {
                muted = true;
                voice.stop();
                respond(out, 200, new JSONObject()
                        .put("ok", true)
                        .put("stopped", true)
                        .put("muted", true)
                        .put("voicePackageId", VoiceOneHost.VOICE_ID)
                        .put("authority", AUTHORITY)
                        .toString());
                return;
            }
            if ("POST".equals(method) && "/resume".equals(path)) {
                muted = false;
                voice.prepare();
                respond(out, 200, new JSONObject()
                        .put("ok", true)
                        .put("resumed", true)
                        .put("muted", false)
                        .put("voicePackageId", VoiceOneHost.VOICE_ID)
                        .put("authority", AUTHORITY)
                        .toString());
                return;
            }
            if ("POST".equals(method) && "/speak".equals(path)) {
                if (muted) {
                    respond(out, 409, jsonError("READ_ALOUD_MUTED"));
                    return;
                }
                String text = extractText(body);
                if (text.isEmpty()) {
                    respond(out, 400, jsonError("TEXT_REQUIRED"));
                    return;
                }
                if (!voice.status().optBoolean("ready")) {
                    voice.prepare();
                    respond(out, 503, healthJson());
                    return;
                }
                boolean accepted = voice.speak(text);
                if (!accepted) {
                    respond(out, 503, healthJson());
                    return;
                }
                respond(out, 202, new JSONObject()
                        .put("ok", true)
                        .put("accepted", true)
                        .put("chars", text.length())
                        .put("voicePackageId", VoiceOneHost.VOICE_ID)
                        .put("engine", "LEEWAY_VOICE_FABRIC")
                        .put("authority", AUTHORITY)
                        .toString());
                return;
            }
            if ("POST".equals(method) && "/stream/start".equals(path)) {
                if (muted) {
                    respond(out, 409, jsonError("READ_ALOUD_MUTED"));
                    return;
                }
                JSONObject value = parseJson(body);
                String streamId = value.optString("streamId").trim();
                if (streamId.isEmpty()) {
                    respond(out, 400, jsonError("STREAM_ID_REQUIRED"));
                    return;
                }
                if (!voice.streamStart(streamId)) {
                    voice.prepare();
                    respond(out, 503, healthJson());
                    return;
                }
                respond(out, 202, new JSONObject()
                        .put("ok", true)
                        .put("accepted", true)
                        .put("streamId", streamId)
                        .put("voicePackageId", VoiceOneHost.VOICE_ID)
                        .put("authority", AUTHORITY)
                        .toString());
                return;
            }
            if ("POST".equals(method) && "/stream/chunk".equals(path)) {
                if (muted) {
                    respond(out, 409, jsonError("READ_ALOUD_MUTED"));
                    return;
                }
                JSONObject value = parseJson(body);
                String streamId = value.optString("streamId").trim();
                String text = value.optString("text");
                if (streamId.isEmpty() || text.isEmpty()) {
                    respond(out, 400, jsonError("STREAM_ID_AND_TEXT_REQUIRED"));
                    return;
                }
                if (!voice.streamChunk(streamId, text)) {
                    respond(out, 409, jsonError("STREAM_NOT_ACTIVE"));
                    return;
                }
                respond(out, 202, new JSONObject()
                        .put("ok", true)
                        .put("accepted", true)
                        .put("streamId", streamId)
                        .put("chars", text.length())
                        .toString());
                return;
            }
            if ("POST".equals(method) && "/stream/end".equals(path)) {
                JSONObject value = parseJson(body);
                String streamId = value.optString("streamId").trim();
                if (streamId.isEmpty()) {
                    respond(out, 400, jsonError("STREAM_ID_REQUIRED"));
                    return;
                }
                if (!voice.streamEnd(streamId)) {
                    respond(out, 409, jsonError("STREAM_NOT_ACTIVE"));
                    return;
                }
                respond(out, 202, new JSONObject()
                        .put("ok", true)
                        .put("accepted", true)
                        .put("streamId", streamId)
                        .toString());
                return;
            }
            respond(out, 404, jsonError("NOT_FOUND"));
        } catch (Throwable t) {
            lastError = "REQUEST:" + t.getClass().getSimpleName() + ":" + String.valueOf(t.getMessage());
        }
    }

    private String healthJson() {
        JSONObject status = voice == null ? new JSONObject() : voice.status();
        status.put("ok", true);
        status.put("muted", muted);
        status.put("loopback", "127.0.0.1:" + PORT);
        status.put("serviceError", lastError);
        status.put("engine", "LEEWAY_VOICE_FABRIC");
        status.put("voicePackageId", VoiceOneHost.VOICE_ID);
        status.put("authority", AUTHORITY);
        return status.toString();
    }

    private static String extractText(String body) {
        String clean = body == null ? "" : body.trim();
        if (clean.startsWith("{")) {
            try {
                return new JSONObject(clean).optString("text").trim();
            } catch (Throwable ignored) {
            }
        }
        return clean;
    }

    private static JSONObject parseJson(String body) {
        try {
            return new JSONObject(body == null ? "{}" : body);
        } catch (Throwable ignored) {
            return new JSONObject();
        }
    }

    private static String jsonError(String error) {
        return new JSONObject().put("ok", false).put("error", error).toString();
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

    private static void respond(OutputStream out, int code, String body) throws Exception {
        byte[] payload = body.getBytes(StandardCharsets.UTF_8);
        String reason;
        switch (code) {
            case 200: reason = "OK"; break;
            case 202: reason = "Accepted"; break;
            case 400: reason = "Bad Request"; break;
            case 404: reason = "Not Found"; break;
            case 409: reason = "Conflict"; break;
            default: reason = "Service Unavailable";
        }
        String header = "HTTP/1.1 " + code + " " + reason
                + "\r\nContent-Type: application/json; charset=utf-8"
                + "\r\nContent-Length: " + payload.length
                + "\r\nConnection: close\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.US_ASCII));
        out.write(payload);
        out.flush();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (voice != null) voice.prepare();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        try {
            if (server != null) server.close();
        } catch (Exception ignored) {
        }
        if (voice != null) voice.destroy();
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        } catch (Throwable ignored) {
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
