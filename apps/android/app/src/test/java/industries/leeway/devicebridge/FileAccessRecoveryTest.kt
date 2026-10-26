package industries.leeway.devicebridge

import org.junit.Assert.assertEquals
import org.junit.Test

class FileAccessRecoveryTest {
    @Test fun appendRecoveryRecognizesCompletedChunk() {
        assertEquals(
            FileAccess.AppendRecoveryState.APPLIED,
            FileAccess.classifyAppendRecovery(15, "new-hash", 10, "old-hash", 15, "new-hash")
        )
    }

    @Test fun appendRecoveryRecognizesUntouchedFile() {
        assertEquals(
            FileAccess.AppendRecoveryState.NOT_APPLIED,
            FileAccess.classifyAppendRecovery(10, "old-hash", 10, "old-hash", 15, "new-hash")
        )
    }

    @Test fun appendRecoveryHoldsOnUnexpectedState() {
        assertEquals(
            FileAccess.AppendRecoveryState.CONFLICT,
            FileAccess.classifyAppendRecovery(12, "other-hash", 10, "old-hash", 15, "new-hash")
        )
    }
}
