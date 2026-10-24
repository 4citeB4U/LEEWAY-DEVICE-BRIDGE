/*
REGION: LEEWAY.DEVICES.COMMANDER.ANDROID
TAG: COMMANDER_SIGNED_OWNER_SESSION_CLIENT
WHO: Agent Lee / target-computer owner
WHAT: Android client projection of Device Bridge pairing and Commander signed-session contracts.
WHEN: Owner-approved remote reads; WHERE: internal Agent Lee APK module.
WHY: A relay acknowledgement must not grant device control or change target identity.
HOW: P-256 signatures, pinned target key, expiry/scope checks and request-bound results.
LICENSE: MIT
*/
package industries.leeway.devices.commander

import org.json.JSONObject
import org.json.JSONArray
import java.net.URI
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.PublicKey
import java.security.Signature
import java.security.interfaces.ECPublicKey
import java.security.spec.X509EncodedKeySpec
import java.util.Base64
import java.util.UUID

object CommanderProtocol {
    val readCapabilities = setOf("device.health", "device.info", "device.files.read", "device.directories.list", "device.process.list")
    private val idPattern=Regex("^[A-Za-z0-9._:-]{1,128}$")
    fun identifier(s:String):String { require(idPattern.matches(s)) { "COMMANDER_ID_INVALID" };return s }
    fun sha(bytes:ByteArray):String=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
    fun decode(text:String,max:Int=65536):ByteArray {
        require(text.length<=((max+2)/3)*4) { "COMMANDER_ENCODING_TOO_LARGE" }
        val bytes=try{Base64.getDecoder().decode(text)}catch(e:Exception){throw IllegalArgumentException("COMMANDER_ENCODING_INVALID")}
        require(bytes.size<=max&&Base64.getEncoder().encodeToString(bytes)==text){"COMMANDER_ENCODING_INVALID"};return bytes
    }
    fun key(derBase64:String):PublicKey {
        val key=KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(decode(derBase64,512)))
        require(key is ECPublicKey && key.params.curve.field.fieldSize==256 && key.params.order.bitLength()==256) { "COMMANDER_P256_KEY_REQUIRED" }
        return key
    }
    fun verify(envelope:JSONObject,publicKey:PublicKey):JSONObject {
        val raw=decode(envelope.getString("payloadBase64"));val sig=decode(envelope.getString("signatureBase64"),128)
        val verifier=Signature.getInstance("SHA256withECDSA");verifier.initVerify(publicKey);verifier.update(raw)
        require(verifier.verify(sig)) { "COMMANDER_SIGNATURE_INVALID" };return JSONObject(String(raw,Charsets.UTF_8))
    }
    fun sign(payload:JSONObject,signer:(ByteArray)->ByteArray):JSONObject {
        val bytes=payload.toString().toByteArray(Charsets.UTF_8);require(bytes.size<=65536){"COMMANDER_PAYLOAD_TOO_LARGE"}
        return JSONObject().put("payloadBase64",Base64.getEncoder().encodeToString(bytes)).put("signatureBase64",Base64.getEncoder().encodeToString(signer(bytes)))
    }
    fun endpoint(value:String):String {
        val uri=URI(value)
        require(uri.scheme=="wss" && !uri.host.isNullOrBlank() && uri.rawUserInfo==null && uri.rawQuery==null && uri.rawFragment==null && value.length<=2048 && (uri.port==-1||uri.port in 1..65535)) { "COMMANDER_WSS_ENDPOINT_REQUIRED" }
        require(uri.host.lowercase()!="agent-lee-x.vercel.app") { "SUPERSEDED_COMMANDER_ENDPOINT_REJECTED" }
        return value
    }
    fun time(value:JSONObject,name:String):Long {
        val n=value.get(name);require(n is Number && n.toDouble().isFinite() && n.toDouble()%1.0==0.0 && n.toDouble() in 0.0..9007199254740991.0) { "COMMANDER_TIME_INVALID" };return n.toLong()
    }
}

class CommanderGrant private constructor(val body:JSONObject,val targetKey:PublicKey) {
    val deviceId:String get()=body.getString("deviceId")
    val clientId:String get()=body.getString("clientId")
    val sessionId:String get()=body.getString("sessionId")
    val relayUrl:String get()=body.getString("relayUrl")
    val expiresAtMs:Long get()=body.getLong("expiresAtMs")
    val capabilities:Set<String> get()=body.getJSONArray("capabilities").let{a->(0 until a.length()).map{a.getString(it)}.toSet()}
    fun command(capability:String,arguments:JSONObject,nowMs:Long,signer:(ByteArray)->ByteArray):CommanderPending {
        require(nowMs<expiresAtMs){"COMMANDER_GRANT_EXPIRED"}
        require(capability in capabilities && capability in CommanderProtocol.readCapabilities){"COMMANDER_CAPABILITY_NOT_GRANTED"}
        val body=JSONObject().put("schema","leeway.commander.command.v1").put("sessionId",sessionId).put("deviceId",deviceId).put("clientId",clientId)
            .put("commandId",UUID.randomUUID().toString()).put("nonce",UUID.randomUUID().toString()).put("issuedAtMs",nowMs).put("expiresAtMs",minOf(expiresAtMs,nowMs+15000))
            .put("capability",capability).put("arguments",arguments)
        return CommanderPending(body,CommanderProtocol.sign(body,signer),targetKey)
    }
    companion object {
        fun parse(bundle:JSONObject,expectedTargetFingerprint:String,clientId:String,clientFingerprint:String,nowMs:Long,expectedRequestNonce:String?=null):CommanderGrant {
            require(Regex("^[a-fA-F0-9]{64}$").matches(expectedTargetFingerprint)){"COMMANDER_OWNER_FINGERPRINT_REQUIRED"}
            val key=CommanderProtocol.key(bundle.getString("targetPublicKeyDerBase64"))
            require(CommanderProtocol.sha(key.encoded).equals(expectedTargetFingerprint,true)){"COMMANDER_TARGET_IDENTITY_MISMATCH"}
            val b=CommanderProtocol.verify(bundle,key)
            require(b.getString("schema")=="leeway.commander.grant.v1" && b.getString("state")=="PAIRED"){"COMMANDER_SIGNED_GRANT_REQUIRED"}
            listOf("deviceId","clientId","sessionId","pairingId","requestNonce","ownerApprovalEventId").forEach{CommanderProtocol.identifier(b.getString(it))}
            require(b.getString("clientId")==clientId && b.getString("clientPublicKeyFingerprintSha256")==clientFingerprint){"COMMANDER_WRONG_CLIENT"}
            val clientKey=CommanderProtocol.key(b.getString("clientPublicKeyDerBase64"))
            require(CommanderProtocol.sha(clientKey.encoded)==clientFingerprint){"COMMANDER_CLIENT_KEY_MISMATCH"}
            if(expectedRequestNonce!=null)require(b.getString("requestNonce")==expectedRequestNonce){"COMMANDER_PAIRING_CHALLENGE_MISMATCH"}
            val issued=CommanderProtocol.time(b,"issuedAtMs");val expiry=CommanderProtocol.time(b,"expiresAtMs")
            require(issued<=nowMs+1000 && expiry>nowMs && expiry>issued && expiry-issued<=86400000){"COMMANDER_GRANT_EXPIRED_OR_UNBOUNDED"}
            CommanderProtocol.endpoint(b.getString("relayUrl"))
            val a=b.getJSONArray("capabilities");require(a.length() in 1..5){"COMMANDER_GRANT_SCOPE_INVALID"}
            val caps=(0 until a.length()).map{a.getString(it)}
            require(caps.distinct().size==caps.size&&caps.all{it in CommanderProtocol.readCapabilities}){"COMMANDER_GRANT_SCOPE_INVALID"}
            return CommanderGrant(b,key)
        }
    }
}
class CommanderPending(val request:JSONObject,val signed:JSONObject,private val targetKey:PublicKey){
    @Volatile private var completed=false
    @Synchronized fun accept(envelope:JSONObject,nowMs:Long):JSONObject {
        require(!completed){"COMMANDER_RESULT_REPLAYED"}
        val b=CommanderProtocol.verify(envelope,targetKey)
        require(b.getString("schema")=="leeway.commander.result.v1"){"COMMANDER_RESULT_SCHEMA_INVALID"}
        for(k in listOf("sessionId","deviceId","clientId","commandId","nonce","capability"))require(b.optString(k)==request.optString(k)){"COMMANDER_RESULT_IDENTITY_MISMATCH"}
        val issued=CommanderProtocol.time(b,"issuedAtMs")
        require(nowMs<request.getLong("expiresAtMs")&&issued>=request.getLong("issuedAtMs")-1000&&issued<=nowMs+1000){"COMMANDER_RESULT_STALE"}
        completed=true
        require(b.optString("status")=="PASS"){"COMMANDER_TARGET_REJECTED_OR_FAILED"}
        require(b.has("value")){"COMMANDER_RESULT_MISSING"}
        return b
    }
}
