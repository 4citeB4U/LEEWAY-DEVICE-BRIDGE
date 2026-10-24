/*
REGION: LEEWAY.DEVICES.COMMANDER.ANDROID
TAG: COMMANDER_WSS_CLIENT
WHO: Agent Lee / owner-approved remote session
WHAT: Internal APK controller using the existing Device Bridge hello/command/result relay protocol.
WHEN: After signed owner-grant validation; WHERE: Device Bridge Android module.
WHY: No separate Commander APK, arbitrary URL default, plaintext transport or relay-granted authority.
HOW: TLS-only OkHttp socket, signed inner commands/results, bounded cancellation and required audit sink.
LICENSE: MIT
*/
package industries.leeway.devices.commander

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class CommanderWssClient(
    private val signer:(ByteArray)->ByteArray,
    private val receiptSink:(JSONObject)->Unit,
    private val client:OkHttpClient=OkHttpClient.Builder().followRedirects(false).followSslRedirects(false).connectTimeout(10,TimeUnit.SECONDS).build()
):AutoCloseable {
    private val timer=Executors.newSingleThreadScheduledExecutor()
    private val active=java.util.concurrent.ConcurrentHashMap<String,()->Unit>()
    private val closed=AtomicBoolean(false)
    fun execute(grant:CommanderGrant,ownerToken:String,capability:String,args:JSONObject,callback:(Result<JSONObject>)->Unit):()->Unit {
        check(!closed.get()){"COMMANDER_CLIENT_CLOSED"}
        require(ownerToken.length in 32..1024 && ownerToken.all{it.code in 33..126}){"COMMANDER_OWNER_TOKEN_REQUIRED"}
        CommanderProtocol.endpoint(grant.relayUrl)
        val pending=grant.command(capability,args,System.currentTimeMillis(),signer)
        val commandId=pending.request.getString("commandId")
        receiptSink(JSONObject().put("kind","commander.request.pre").put("commandId",commandId).put("deviceId",grant.deviceId).put("capability",capability)
            .put("argumentsHash",CommanderProtocol.sha(args.toString().toByteArray(Charsets.UTF_8))).put("state","REQUESTED_NOT_YET_TARGET_ADMITTED"))
        val done=AtomicBoolean(false);val authenticated=AtomicBoolean(false)
        var socket:WebSocket?=null
        var timeout:java.util.concurrent.ScheduledFuture<*>?=null
        fun finish(value:JSONObject?,error:String?){
            if(!done.compareAndSet(false,true))return
            timeout?.cancel(false);active.remove(commandId);socket?.cancel()
            try{
                receiptSink(JSONObject().put("kind","commander.request.post").put("commandId",commandId).put("deviceId",grant.deviceId).put("capability",capability)
                    .put("state",if(error==null)"SIGNED_TARGET_RESULT_VERIFIED" else "FAILED_OR_OUTCOME_UNKNOWN")
                    .put("error",error?:JSONObject.NULL).put("resultHash",value?.let{CommanderProtocol.sha(it.toString().toByteArray(Charsets.UTF_8))}?:JSONObject.NULL)
                    .put("formulaExecution","NOT_EVALUATED_BY_TRANSPORT"))
            }catch(e:Exception){callback(Result.failure(IllegalStateException("COMMANDER_RECEIPT_WRITE_FAILED")));return}
            if(error==null&&value!=null)callback(Result.success(value))else callback(Result.failure(IllegalStateException(error?:"COMMANDER_RESULT_MISSING")))
        }
        val cancel={finish(null,"COMMANDER_CANCELLED_OUTCOME_UNKNOWN");Unit}
        active[commandId]=cancel
        timeout=timer.schedule({finish(null,"COMMANDER_TIMEOUT_OUTCOME_UNKNOWN")},10,TimeUnit.SECONDS)
        val request=Request.Builder().url(grant.relayUrl).build()
        socket=client.newWebSocket(request,object:WebSocketListener(){
            override fun onOpen(ws:WebSocket,response:Response){
                if(done.get()){ws.cancel();return}
                ws.send(JSONObject().put("type","hello").put("role","client").put("deviceId",grant.deviceId).put("token",ownerToken).toString())
            }
            override fun onMessage(ws:WebSocket,text:String){
                if(done.get())return
                if(text.toByteArray(Charsets.UTF_8).size>262144){finish(null,"COMMANDER_MESSAGE_TOO_LARGE");return}
                try{
                    val msg=JSONObject(text)
                    when(msg.optString("type")){
                        "hello-ack"->{
                            if(!authenticated.compareAndSet(false,true)){finish(null,"COMMANDER_DUPLICATE_HANDSHAKE");return}
                            ws.send(JSONObject().put("type","command").put("id",commandId).put("capability","device.commander.execute")
                                .put("arguments",JSONObject().put("sessionId",grant.sessionId).put("signed",pending.signed)).toString())
                        }
                        "result"->{
                            if(!authenticated.get()||msg.optString("id")!=commandId||msg.optString("capability")!="device.commander.execute")throw IllegalArgumentException("COMMANDER_RESPONSE_CORRELATION_FAILED")
                            require(msg.optBoolean("ok")){"COMMANDER_REMOTE_EXECUTION_REJECTED"}
                            val verified=pending.accept(msg.getJSONObject("result"),System.currentTimeMillis())
                            finish(verified,null)
                        }
                        "error"->finish(null,"COMMANDER_RELAY_REJECTED")
                        "pong"->Unit
                        else->finish(null,"COMMANDER_UNEXPECTED_MESSAGE")
                    }
                }catch(e:Exception){val reason=e.message.orEmpty();finish(null,if(Regex("^[A-Z_]+$").matches(reason))reason else "COMMANDER_RESPONSE_INVALID")}
            }
            override fun onMessage(ws:WebSocket,bytes:ByteString){finish(null,"COMMANDER_BINARY_RESPONSE_REJECTED")}
            override fun onFailure(ws:WebSocket,t:Throwable,response:Response?){finish(null,"COMMANDER_TRANSPORT_FAILED")}
            override fun onClosed(ws:WebSocket,code:Int,reason:String){finish(null,"COMMANDER_CONNECTION_CLOSED")}
        })
        if(done.get())socket?.cancel()
        return cancel
    }
    override fun close(){if(closed.compareAndSet(false,true)){active.values.toList().forEach{it()};timer.shutdownNow();client.dispatcher.cancelAll();client.connectionPool.evictAll();client.dispatcher.executorService.shutdown()}}
}
