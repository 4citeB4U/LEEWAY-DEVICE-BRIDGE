package industries.leeway.devicebridge

/**
 * Pure access decision for the existing loopback server.
 * The caller supplies a locally computed access-state and the result of the canonical
 * BridgeSecret.matches check; this helper never handles or stores credentials.
 */
object LocalBridgeReadAuthorization {
    data class Decision(val status: Int, val error: String?)

    fun evaluate(agentAccessEnabled: Boolean, bearerMatches: Boolean): Decision = when {
        !agentAccessEnabled -> Decision(403, "AGENT_ACCESS_DISABLED")
        !bearerMatches -> Decision(401, "UNAUTHORIZED")
        else -> Decision(200, null)
    }
}
