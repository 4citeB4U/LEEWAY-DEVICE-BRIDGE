package industries.leeway.devicebridge

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest

object VoiceRuntime {
    const val VOICE_PACKAGE_ID = "agent-lee-voice-one"
    const val VOICE_FABRIC_URL = "https://4citeb4u.github.io/LeeWay-Voice-Fabric/"
    @Volatile private var player: MediaPlayer? = null

    fun initialize(context: Context): JSONObject = status(context)

    fun status(context: Context): JSONObject = JSONObject().apply {
        put("available", true)
        put("ready", true)
        put("synthesisAuthority", "4citeB4U/LeeWay-Voice-Fabric")
        put("playbackAdapter", "ANDROID_NATIVE_MEDIA_PLAYER")
        put("engine", "LEEWAY_VOICE_FABRIC")
        put("voicePackageId", VOICE_PACKAGE_ID)
        put("authority", "4citeB4U/LeeWay-Voice-Fabric")
        put("fallbackAllowed", false)
        put("state", "PLAYBACK_READY_SYNTHESIS_BODY_ROUTED")
        put("note", "Voice One synthesis is governed by LeeWay Voice Fabric. Android/system TTS is not an authorized Agent Lee fallback.")
    }

    fun openVoiceFabric(context: Context): JSONObject {
        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(VOICE_FABRIC_URL)).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
            context.startActivity(intent)
            ReceiptStore.record(context,"voice.fabric.open","PASS","Opened canonical Voice Fabric for " + VOICE_PACKAGE_ID)
            JSONObject().put("ok",true).put("opened",true).put("voicePackageId",VOICE_PACKAGE_ID)
                .put("voiceFabricUrl",VOICE_FABRIC_URL).put("authority","4citeB4U/LeeWay-Voice-Fabric")
        } catch (e: Exception) {
            ReceiptStore.record(context,"voice.fabric.open","FAIL",e.message ?: e.javaClass.simpleName)
            JSONObject().put("ok",false).put("opened",false).put("voicePackageId",VOICE_PACKAGE_ID)
                .put("error",e.message ?: e.javaClass.simpleName)
        }
    }

    fun speak(context: Context, text: String): JSONObject {
        val clean=text.trim()
        if(clean.isEmpty()) return JSONObject().put("ok",false).put("error","TEXT_REQUIRED")
        ReceiptStore.record(context,"voice.fabric.speak","BLOCKED","Voice One text requires governed synthesis body routing; chars=" + clean.length)
        return JSONObject().put("ok",false).put("spoken",false).put("chars",clean.length)
            .put("engine","LEEWAY_VOICE_FABRIC").put("voicePackageId",VOICE_PACKAGE_ID)
            .put("error","VOICE_SYNTHESIS_REQUIRES_BODY_ROUTER").put("fallbackAllowed",false)
    }

    private fun sha256(file: File): String {
        val d=MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buf=ByteArray(8192)
            while(true){val n=input.read(buf);if(n<=0)break;d.update(buf,0,n)}
        }
        return d.digest().joinToString(""){"%02x".format(it)}
    }

    fun playArtifact(context: Context, relativePath: String, expectedSha256: String, voicePackageId: String): JSONObject {
        if(voicePackageId!=VOICE_PACKAGE_ID) return JSONObject().put("ok",false).put("error","VOICE_PACKAGE_MISMATCH")
        if(!expectedSha256.matches(Regex("^[A-Fa-f0-9]{64}$"))) return JSONObject().put("ok",false).put("error","SHA256_REQUIRED")
        if(!relativePath.matches(Regex("^voice/[A-Za-z0-9._-]{1,120}\\.wav$"))) return JSONObject().put("ok",false).put("error","VOICE_ARTIFACT_PATH_BLOCKED")
        val root=File(context.filesDir,"voice").canonicalFile
        val target=File(context.filesDir,relativePath).canonicalFile
        if(!target.path.startsWith(root.path+File.separator)||!target.isFile) return JSONObject().put("ok",false).put("error","VOICE_ARTIFACT_NOT_FOUND")
        val actual=sha256(target)
        if(!actual.equals(expectedSha256,ignoreCase=true)) return JSONObject().put("ok",false).put("error","VOICE_ARTIFACT_HASH_MISMATCH").put("actualSha256",actual)
        val header=ByteArray(12);target.inputStream().use{if(it.read(header)!=12)return JSONObject().put("ok",false).put("error","VOICE_ARTIFACT_INVALID_WAV")}
        if(String(header,0,4)!="RIFF"||String(header,8,4)!="WAVE") return JSONObject().put("ok",false).put("error","VOICE_ARTIFACT_INVALID_WAV")
        stop()
        return try {
            val media=MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                setDataSource(target.absolutePath)
                prepare()
                setOnCompletionListener {
                    ReceiptStore.record(context,"voice.fabric.play","PASS","Voice One artifact completed sha256=" + actual)
                    it.release();if(player===it)player=null
                }
                start()
            }
            player=media
            ReceiptStore.record(context,"voice.fabric.play","PASS","Voice One artifact playback started sha256=" + actual)
            JSONObject().put("ok",true).put("spoken",true).put("state","PLAYING")
                .put("voicePackageId",VOICE_PACKAGE_ID).put("authority","4citeB4U/LeeWay-Voice-Fabric")
                .put("playbackAdapter","ANDROID_NATIVE_MEDIA_PLAYER").put("sha256",actual).put("fallbackUsed",false)
        } catch(e:Exception) {
            ReceiptStore.record(context,"voice.fabric.play","FAIL",e.message ?: e.javaClass.simpleName)
            JSONObject().put("ok",false).put("error",e.message ?: e.javaClass.simpleName)
        }
    }

    fun stop(context: Context): JSONObject {
        val had=player!=null
        stop()
        ReceiptStore.record(context,"voice.fabric.stop","PASS","Voice playback stop requested active=" + had)
        return JSONObject().put("ok",true).put("stopped",had).put("voicePackageId",VOICE_PACKAGE_ID)
    }

    fun stop() {
        val current=player;player=null
        if(current!=null){runCatching{if(current.isPlaying)current.stop()};runCatching{current.release()}}
    }

    fun shutdown(){stop()}
}