package industries.leeway.devicebridge

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import okhttp3.CacheControl
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.net.URLEncoder
import java.time.Instant
import java.util.Collections
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.min

class RemoteBridgeService : Service() {
    private val client=OkHttpClient.Builder()
        .pingInterval(20,TimeUnit.SECONDS)
        .build()
    private val scheduler=Executors.newSingleThreadScheduledExecutor()
    private val seenCommands=Collections.synchronizedSet(mutableSetOf<String>())
    @Volatile private var socket: WebSocket?=null
    @Volatile private var stopping=false
    @Volatile private var reconnectSeconds=1L

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(
            NOTIFICATION_ID,
            NotificationCompat.Builder(this,CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_upload_done)
                .setContentTitle("LeeWay Device Bridge")
                .setContentText("Remote bridge connecting")
                .setOngoing(true)
                .build()
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        stopping=false
        connect()
        return START_STICKY
    }

    override fun onDestroy() {
        stopping=true
        socket?.close(1000,"owner-stop")
        socket=null
        scheduler.shutdownNow()
        RemoteBridgePrefs.setState(this,"STOPPED",authenticated=false)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder?=null

    private fun connect() {
        if(stopping || !RemoteBridgePrefs.enabled(this)) return
        RemoteBridgePrefs.setState(this,"CONFIGURING",authenticated=false)
        scheduler.execute {
            try {
                val relayUrl=fetchRelayUrl()
                val identity=DeviceIdentity.ensure(this)
                val deviceId=identity.getString("deviceId")
                val delimiter=if(relayUrl.contains("?")) "&" else "?"
                val wsUrl=relayUrl + delimiter +
                    "role=device&id=" + URLEncoder.encode(deviceId,"UTF-8")
                RemoteBridgePrefs.setState(this,"CONNECTING",relayUrl,false)
                val request=Request.Builder().url(wsUrl).build()
                socket=client.newWebSocket(request,listener(deviceId,relayUrl))
            } catch(e: Exception) {
                ReceiptStore.record(this,"remote.transport","FAIL",e.message ?: e.javaClass.simpleName)
                scheduleReconnect()
            }
        }
    }

    private fun fetchRelayUrl(): String {
        val request=Request.Builder()
            .url(CONFIG_URL)
            .cacheControl(CacheControl.FORCE_NETWORK)
            .build()
        client.newCall(request).execute().use { response ->
            if(!response.isSuccessful) throw IllegalStateException("RELAY_CONFIG_HTTP_"+response.code)
            val json=JSONObject(response.body?.string() ?: "{}")
            val url=json.optString("websocketUrl")
            if(!url.startsWith("wss://")) throw IllegalStateException("RELAY_URL_NOT_READY")
            return url
        }
    }

    private fun listener(deviceId: String, relayUrl: String)=object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            reconnectSeconds=1L
            RemoteBridgePrefs.setState(this@RemoteBridgeService,"CHALLENGE_WAIT",relayUrl,false)
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            val message=runCatching { JSONObject(text) }.getOrNull() ?: return
            when(message.optString("type")) {
                "challenge" -> {
                    val nonce=message.optString("nonce")
                    if(nonce.isBlank()) return
                    val signature=DeviceIdentity.signBase64(this@RemoteBridgeService,nonce)
                    val identity=DeviceIdentity.ensure(this@RemoteBridgeService)
                    webSocket.send(
                        JSONObject().apply {
                            put("type","auth")
                            put("role","device")
                            put("id",deviceId)
                            put("signatureBase64",signature)
                            put("publicKeyFingerprintSha256",
                                identity.getString("publicKeyFingerprintSha256"))
                        }.toString()
                    )
                }
                "auth_ok" -> {
                    RemoteBridgePrefs.setState(
                        this@RemoteBridgeService,"CONNECTED",relayUrl,true
                    )
                    ReceiptStore.record(
                        this@RemoteBridgeService,
                        "remote.transport",
                        "PASS",
                        "authenticated outbound relay"
                    )
                }
                "command" -> Thread {
                    handleCommand(webSocket,message,deviceId)
                }.start()
                "ping" -> webSocket.send(
                    JSONObject().put("type","pong").put("at",Instant.now().toString()).toString()
                )
            }
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            RemoteBridgePrefs.setState(this@RemoteBridgeService,"DISCONNECTED",relayUrl,false)
            scheduleReconnect()
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            RemoteBridgePrefs.setState(this@RemoteBridgeService,"FAILED",relayUrl,false)
            ReceiptStore.record(
                this@RemoteBridgeService,
                "remote.transport",
                "FAIL",
                t.message ?: t.javaClass.simpleName
            )
            scheduleReconnect()
        }
    }

    private fun handleCommand(webSocket: WebSocket, command: JSONObject, deviceId: String) {
        val commandId=command.optString("commandId")
        val capability=command.optString("capability")
        val controllerId=command.optString("controllerId")
        val supported=capability in setOf(
            "device.health",
            "device.network.discover",
            "device.bluetooth.list-bonded",
            "model.inference"
        )
        val newCommand=commandId.isNotBlank() && seenCommands.add(commandId)
        val governance=LocalAuthority.agentAccessEnabled(this)
        val gate=FormulaF8Gate.evaluate(
            trigger=true,
            governance=governance,
            conditions=listOf(commandId.isNotBlank(),capability.isNotBlank(),supported,newCommand)
        )

        if(gate.optInt("qA") != 69) {
            sendReceipt(
                webSocket,controllerId,commandId,deviceId,"HOLD",
                JSONObject().put("gate",gate)
            )
            return
        }

        val payload=try {
            when(capability) {
                "device.health" -> Diagnostics.snapshot(this)
                "device.network.discover" -> NetworkDiscoveryProvider.discover(this)
                "device.bluetooth.list-bonded" -> BluetoothProvider.snapshot(this)
                "model.inference" -> {
                    val prompt=command.optJSONObject("arguments")?.optString("prompt")
                        ?.takeIf { it.isNotBlank() } ?: "Report LeeWay Device Bridge readiness."
                    ModelRuntime.generate(this,prompt)
                }
                else -> JSONObject().put("error","UNSUPPORTED_CAPABILITY")
            }
        } catch(e: Exception) {
            JSONObject().put("ok",false).put("error",e.message ?: e.javaClass.simpleName)
        }

        val result=if(payload.optBoolean("ok",true)) "PASS" else "FAIL"
        ReceiptStore.record(this,"remote.command."+capability,result,"commandId="+commandId)
        sendReceipt(webSocket,controllerId,commandId,deviceId,result,payload)
    }

    private fun sendReceipt(
        webSocket: WebSocket,
        controllerId: String,
        commandId: String,
        deviceId: String,
        result: String,
        payload: JSONObject
    ) {
        webSocket.send(
            JSONObject().apply {
                put("type","receipt")
                put("controllerId",controllerId)
                put("commandId",commandId)
                put("deviceId",deviceId)
                put("result",result)
                put("payload",payload)
                put("timestamp",Instant.now().toString())
            }.toString()
        )
    }

    private fun scheduleReconnect() {
        if(stopping || !RemoteBridgePrefs.enabled(this)) return
        val delay=reconnectSeconds
        reconnectSeconds=min(reconnectSeconds*2L,60L)
        scheduler.schedule({ connect() },delay,TimeUnit.SECONDS)
    }

    private fun createNotificationChannel() {
        if(android.os.Build.VERSION.SDK_INT >= 26) {
            val manager=getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "LeeWay Remote Bridge",
                    NotificationManager.IMPORTANCE_LOW
                )
            )
        }
    }

    companion object {
        private const val CHANNEL_ID="leeway_remote_bridge"
        private const val NOTIFICATION_ID=5323
        private const val CONFIG_URL=
            "https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/relay-config.json"

        fun start(context: Context) {
            RemoteBridgePrefs.setEnabled(context,true)
            ContextCompat.startForegroundService(
                context,
                Intent(context,RemoteBridgeService::class.java)
            )
        }

        fun stop(context: Context) {
            RemoteBridgePrefs.setEnabled(context,false)
            context.stopService(Intent(context,RemoteBridgeService::class.java))
            RemoteBridgePrefs.setState(context,"STOPPED",authenticated=false)
        }

        fun status(context: Context): JSONObject=RemoteBridgePrefs.status(context)
    }
}
