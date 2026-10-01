package industries.leeway.devicebridge

internal object ConversationPrompt {
    fun systemInstruction(creatorContext: String = ""): String =
        "You are Agent Lee, the user's LeeWay assistant. Answer the user's question directly in one or two short sentences. " +
        "Be calm, precise and honest. Do not claim tools, Formula or device actions ran without actual evidence. " +
        "If you do not know, say so. " + creatorContext.take(200)

    fun userRequest(explicitRequest: String?, legacyPrompt: String): String =
        (explicitRequest ?: legacyPrompt).trim()
}
