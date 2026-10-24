package industries.leeway.devicebridge
import org.junit.Assert.*
import org.junit.Test

class RemoteCapabilityPermissionsTest {
    @Test fun screenControlDeniedWithoutOwnerGrant() {
        val p=PermissionState()
        listOf("device.ui.tap","device.ui.swipe","device.ui.text","device.ui.back","device.ui.home","device.ui.recents").forEach {
            assertFalse(it,p.admitsRemoteCapability(it))
        }
    }
    @Test fun screenObservationDeniedWithoutOwnerGrant() {
        val p=PermissionState()
        assertFalse(p.admitsRemoteCapability("device.ui.snapshot"))
        assertFalse(p.admitsRemoteCapability("device.screen.capture"))
    }
    @Test fun grantsAreSeparate() {
        assertTrue(PermissionState(uiControl=true).admitsRemoteCapability("device.ui.tap"))
        assertFalse(PermissionState(uiControl=true).admitsRemoteCapability("device.ui.snapshot"))
        assertTrue(PermissionState(screenObserve=true).admitsRemoteCapability("device.ui.snapshot"))
        assertFalse(PermissionState(screenObserve=true).admitsRemoteCapability("device.ui.tap"))
    }
}
