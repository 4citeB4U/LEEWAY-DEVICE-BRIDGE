package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject

internal object AgentLeeIdentityAuthority {
    private const val ASSET = "agent-lee-entity-authority.v1.json"
    fun load(context: Context): JSONObject =
        context.assets.open(ASSET).bufferedReader().use { JSONObject(it.readText()) }

    fun authorityId(context: Context): String = load(context).optString("authorityId")

    fun identityReply(context: Context): Pair<String,String> {
        val a=load(context)
        require(a.optString("authorityId")=="agent-lee-entity-identity-authority")
        require(a.optString("agentId")=="agent-lee")
        val name=a.optString("entityName","Agent Lee")
        return (name + ". LeeWay-governed sovereign operator, builder, strategist, and guardian. Same identity across every authorized body; models and transports are replaceable lanes, not who I am.") to "AGENT_LEE_ENTITY_AUTHORITY_V1"
    }
}