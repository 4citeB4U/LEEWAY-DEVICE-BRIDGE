package industries.leeway.devicebridge

import org.junit.Assert.assertEquals
import org.junit.Test

class ConsciousnessShadowRuntimeTest {
    @Test fun greetingPredictsDeterministicBehaviorWithoutModel() {
        assertEquals(
            "AGENT_LEE_DETERMINISTIC_BEHAVIOR",
            ConsciousnessShadowRuntime.predictResponder("Hello, Agent Lee.", false)
        )
    }

    @Test fun ordinaryQuestionPredictsPhoneModelWhenPackageIsPresent() {
        assertEquals(
            "PHONE_LOCAL_AGENT_CHAT",
            ConsciousnessShadowRuntime.predictResponder("What is 7 + 8?", true)
        )
    }

    @Test fun ordinaryQuestionFailsClosedWhenModelIsUnavailable() {
        assertEquals(
            "MODEL_UNAVAILABLE",
            ConsciousnessShadowRuntime.predictResponder("What is 7 + 8?", false)
        )
    }

    @Test fun routeAndOutcomePredictionErrorAreSeparatelyCounted() {
        assertEquals(
            0,
            ConsciousnessShadowRuntime.predictionError(
                "PHONE_LOCAL_AGENT_CHAT",
                "PHONE_LOCAL_AGENT_CHAT",
                true,
                true
            )
        )
        assertEquals(
            1,
            ConsciousnessShadowRuntime.predictionError(
                "PHONE_LOCAL_AGENT_CHAT",
                "PHONE_LOCAL_AGENT_CHAT",
                true,
                false
            )
        )
        assertEquals(
            2,
            ConsciousnessShadowRuntime.predictionError(
                "PHONE_LOCAL_AGENT_CHAT",
                "AGENT_LEE_DETERMINISTIC_BEHAVIOR",
                true,
                false
            )
        )
    }
}
