/*
REGION: LEEWAY.DEVICES.COMMANDER.ANDROID
TAG: COMMANDER_DEVICE_LOCAL_CREDENTIAL_ADAPTER
WHO: Owner-authorized Agent Lee APK
WHAT: Store remote grants/tokens privately and reuse Device Bridge's Android identity key.
WHEN: Explicit pairing approval; WHERE: application-private device credential storage.
WHY: Pairing secrets must never be source assets, logs, URLs or shared consciousness memory.
HOW: Android Keystore AES-GCM, AtomicFile persistence, signed grant validation and explicit expiry.
LICENSE: MIT
*/
package industries.leeway.devices.commander

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import org.json.JSONObject
import org.json.JSONArray
import java.io.File
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.util.Base64
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class AndroidCommanderStore(context:Context){
    private val context=context.applicationContext
    private val dir=File(this.context.filesDir,"devices/commander/pairings").apply{mkdirs()}
    private val alias="leeway_commander_pairing_credentials_v1"
    fun identity():JSONObject=DeviceIdentity.ensure(context)
    fun signer(data:ByteArray):ByteArray {
        val identity=identity();val ks=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
        val key=ks.getKey(identity.getString("keyAlias"),null) as PrivateKey
        return Signature.getInstance("SHA256withECDSA").apply{initSign(key);update(data)}.sign()
    }
    @Synchronized private fun secretKey():SecretKey {
        val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
        if(!store.containsAlias(alias)){
            KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply{
                init(KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build())
            }.generateKey()
        }
        return store.getKey(alias,null) as SecretKey
    }
    private fun file(id:String)=AtomicFile(File(dir,CommanderProtocol.sha(id.toByteArray(Charsets.UTF_8))+".pairing"))
    @Synchronized private fun write(id:String,value:JSONObject){
        val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,secretKey());cipher.updateAAD(id.toByteArray(Charsets.UTF_8))
        val plain=value.toString().toByteArray(Charsets.UTF_8);require(plain.size<=65536){"COMMANDER_STORE_TOO_LARGE"}
        val payload=JSONObject().put("iv",Base64.getEncoder().encodeToString(cipher.iv)).put("ciphertext",Base64.getEncoder().encodeToString(cipher.doFinal(plain))).toString().toByteArray(Charsets.UTF_8)
        val atomic=file(id);val out=atomic.startWrite()
        try{out.write(payload);atomic.finishWrite(out)}catch(e:Exception){atomic.failWrite(out);throw e}
    }
    @Synchronized private fun read(id:String):JSONObject? {
        val f=file(id);if(!f.baseFile.exists())return null
        require(f.baseFile.length()<=100000){"COMMANDER_STORE_TOO_LARGE"}
        val wrapped=JSONObject(String(f.readFully(),Charsets.UTF_8));val cipher=Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE,secretKey(),GCMParameterSpec(128,CommanderProtocol.decode(wrapped.getString("iv"),32)));cipher.updateAAD(id.toByteArray(Charsets.UTF_8))
        return JSONObject(String(cipher.doFinal(CommanderProtocol.decode(wrapped.getString("ciphertext"),70000)),Charsets.UTF_8))
    }
    fun newPairingRequest():JSONObject {
        val i=identity();val request=JSONObject().put("schema","leeway.commander.pairing-request.v1").put("clientId",i.getString("deviceId"))
            .put("clientPublicKeyDerBase64",i.getString("publicKeyDerBase64")).put("clientPublicKeyFingerprintSha256",i.getString("publicKeyFingerprintSha256"))
            .put("nonce",UUID.randomUUID().toString()).put("requestedCapabilities",JSONArray(CommanderProtocol.readCapabilities.toList())).put("createdAtMs",System.currentTimeMillis())
        write("pending-request",request);return request
    }
    @Synchronized fun acceptOwnerResponse(response:JSONObject,expectedFingerprint:String):CommanderGrant {
        val pending=read("pending-request")?:throw IllegalStateException("COMMANDER_PAIRING_REQUEST_REQUIRED")
        val now=System.currentTimeMillis();require(now-pending.getLong("createdAtMs") in 0..900000){"COMMANDER_PAIRING_REQUEST_EXPIRED"}
        val i=identity();val bundle=response.getJSONObject("grant");val token=response.getString("token")
        require(token.length in 32..1024&&token.all{it.code in 33..126}){"COMMANDER_OWNER_TOKEN_REQUIRED"}
        val grant=CommanderGrant.parse(bundle,expectedFingerprint,i.getString("deviceId"),i.getString("publicKeyFingerprintSha256"),now,pending.getString("nonce"))
        val index=read("target-index")?:JSONObject().put("ids",JSONArray())
        val ids=index.getJSONArray("ids");val current=(0 until ids.length()).map{ids.getString(it)}
        require(grant.deviceId in current||current.size<32){"COMMANDER_TARGET_LIMIT"}
        write(grant.deviceId,JSONObject().put("deviceId",grant.deviceId).put("targetFingerprint",expectedFingerprint).put("grant",bundle).put("token",token))
        if(grant.deviceId !in current){ids.put(grant.deviceId);write("target-index",index)}
        file("pending-request").delete();return grant
    }
    fun targets():List<String> {val ids=read("target-index")?.optJSONArray("ids")?:return emptyList();return (0 until ids.length()).map{ids.getString(it)}}
    fun load(id:String):Pair<CommanderGrant,String> {
        val row=read(id)?:throw IllegalStateException("COMMANDER_TARGET_NOT_PAIRED")
        val i=identity();val grant=CommanderGrant.parse(row.getJSONObject("grant"),row.getString("targetFingerprint"),i.getString("deviceId"),i.getString("publicKeyFingerprintSha256"),System.currentTimeMillis())
        require(grant.deviceId==id){"COMMANDER_TARGET_IDENTITY_MISMATCH"};return Pair(grant,row.getString("token"))
    }
    @Synchronized fun forget(id:String){CommanderProtocol.identifier(id);file(id).delete();val remaining=targets().filter{it!=id};write("target-index",JSONObject().put("ids",JSONArray(remaining)))}
}
