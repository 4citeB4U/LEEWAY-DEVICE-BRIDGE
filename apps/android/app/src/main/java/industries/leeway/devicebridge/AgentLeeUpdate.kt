/*
REGION: LeeWay Android runtime update surface
TAG: LEEWAY-AGENT-LEE-ONE-TAP-UPDATE
WHO: Owner-authorized LeeWay Device Bridge
WHAT: Resolve the next governed Agent Lee component update from the phone-local signing agent.
WHEN: Owner presses UPDATE AGENT LEE.
WHERE: Canonical LEEWAY-DEVICE-BRIDGE Android runtime.
WHY: One update control must advance Pocket + Device Bridge without manual APK accumulation.
HOW: Loopback prepare manifest -> package/version compare -> SHA-256 -> Android installer.
LICENSE: MIT
*/
package industries.leeway.devicebridge

import android.content.Context
import android.os.Build
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object AgentLeeUpdate {
    const val LOCAL_PREPARE_URL = "http://127.0.0.1:8791/prepare"
    const val PUBLIC_POCKET_METADATA =
        "https://4citeb4u.github.io/LeeWay-Pocket-Agent/download/LeeWay-Pocket-Agent-latest.json"
    const val PUBLIC_BRIDGE_METADATA =
        "https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/downloads/leeway-device-bridge-android-latest.json"

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(240, TimeUnit.SECONDS)
        .build()

    private data class Installed(val versionName:String,val versionCode:Long)

    fun current(context:Context):JSONObject = JSONObject().apply {
        put("ok",true)
        put("authority","LEEWAY_AGENT_UPDATE")
        put("updateAgent",LOCAL_PREPARE_URL)
        put("deviceBridge",componentState(context,context.packageName))
        put("pocketAgent",componentState(context,"industries.leeway.pocket"))
    }

    fun check(context:Context):JSONObject {
        return try {
            val manifest=fetchManifest(context)
            val components=manifest.optJSONArray("components") ?: return blocked("UPDATE_COMPONENTS_MISSING")
            val evaluated=JSONArray()
            var selected:JSONObject?=null
            val priority=listOf("pocket-agent","device-bridge")
            for(id in priority){
                val candidate=(0 until components.length())
                    .mapNotNull{components.optJSONObject(it)}
                    .firstOrNull{it.optString("componentId")==id} ?: continue
                val evaluatedCandidate=evaluateCandidate(context,candidate)
                evaluated.put(evaluatedCandidate)
                if(selected==null && evaluatedCandidate.optBoolean("updateAvailable")) selected=evaluatedCandidate
            }
            JSONObject().apply {
                put("ok",true)
                put("state",if(selected==null)"CURRENT_OR_NEWER" else "UPDATE_AVAILABLE")
                put("components",evaluated)
                put("selected",selected ?: JSONObject.NULL)
                put("runtime",manifest.optJSONObject("runtime") ?: JSONObject())
                put("manifestGeneratedAt",manifest.optString("generatedAt"))
            }
        }catch(error:Exception){
            blocked("UPDATE_AGENT_UNAVAILABLE:"+error.javaClass.simpleName)
        }
    }

    fun checkAndInstall(context:Context):JSONObject {
        val checked=check(context)
        if(!checked.optBoolean("ok")){
            ReceiptStore.record(context,"agent.update.check","BLOCKED",checked.optString("error"))
            return checked
        }
        val selected=checked.optJSONObject("selected")
            ?: return checked.put("installState","NO_UPDATE_REQUIRED")
        val install=PackageInstallBroker.installFromUrl(
            context,
            selected.getString("packageUrl"),
            selected.getString("sha256")
        )
        ReceiptStore.record(
            context,
            "agent.update.install",
            if(install.optBoolean("ok"))"PASS" else "BLOCKED",
            "component="+selected.optString("componentId")+
                " version="+selected.optString("availableVersionName")+
                " installer="+install.optString("state",install.optString("error"))
        )
        return checked.put("installer",install)
            .put("installState",install.optString("state",install.optString("error","UNKNOWN")))
    }

    private fun fetchManifest(context:Context):JSONObject {
        val pocketCode=installed(context,"industries.leeway.pocket")?.versionCode ?: 0
        val bridgeCode=installed(context,context.packageName)?.versionCode ?: 0
        val url="$LOCAL_PREPARE_URL?pocketCode=$pocketCode&bridgeCode=$bridgeCode"
        val request=Request.Builder().url(url).header("Cache-Control","no-store").build()
        return client.newCall(request).execute().use{response->
            if(!response.isSuccessful)throw IllegalStateException("UPDATE_AGENT_HTTP_"+response.code)
            val body=response.body?.string().orEmpty()
            if(body.isBlank())throw IllegalStateException("UPDATE_AGENT_EMPTY")
            JSONObject(body)
        }
    }

    private fun evaluateCandidate(context:Context,candidate:JSONObject):JSONObject {
        val packageName=candidate.optString("packageName").trim()
        val versionName=candidate.optString("versionName").trim()
        val versionCode=candidate.optLong("versionCode",-1L)
        val sha=candidate.optString("sha256").trim().lowercase()
        val packageUrl=candidate.optString("packageUrl").trim()
        require(packageName.isNotBlank() && versionName.isNotBlank() && versionCode>0)
        require(sha.matches(Regex("^[a-f0-9]{64}$")))
        require(packageUrl.startsWith("http://127.0.0.1:8791/") || packageUrl.startsWith("http://localhost:8791/"))
        val installed=installed(context,packageName)
        return JSONObject(candidate.toString()).apply{
            put("currentVersionName",installed?.versionName ?: JSONObject.NULL)
            put("currentVersionCode",installed?.versionCode ?: 0)
            put("availableVersionName",versionName)
            put("availableVersionCode",versionCode)
            put("updateAvailable",installed==null || versionCode>installed.versionCode)
        }
    }

    private fun componentState(context:Context,packageName:String):JSONObject {
        val installed=installed(context,packageName)
        return JSONObject().apply{
            put("packageName",packageName)
            put("installed",installed!=null)
            put("versionName",installed?.versionName ?: JSONObject.NULL)
            put("versionCode",installed?.versionCode ?: 0)
        }
    }

    @Suppress("DEPRECATION")
    private fun installed(context:Context,packageName:String):Installed? {
        if(packageName==context.packageName)return Installed(BuildConfig.VERSION_NAME,BuildConfig.VERSION_CODE.toLong())
        return runCatching{
            val info=context.packageManager.getPackageInfo(packageName,0)
            val code=if(Build.VERSION.SDK_INT>=28)info.longVersionCode else info.versionCode.toLong()
            Installed(info.versionName.orEmpty(),code)
        }.getOrNull()
    }

    private fun blocked(reason:String)=JSONObject().put("ok",false).put("error",reason)
}