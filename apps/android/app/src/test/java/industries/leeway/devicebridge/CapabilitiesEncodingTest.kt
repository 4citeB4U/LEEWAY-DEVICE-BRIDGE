package industries.leeway.devicebridge

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class CapabilitiesEncodingTest {
    @Test fun discoveryWireValueIsAnArrayOfCapabilityNames() {
        val wire = JSONObject().put("remoteQualified", RemoteCommandRouter.qualifiedCapabilities()).toString()
        val decoded = JSONObject(wire)
        assertTrue(decoded.get("remoteQualified") is JSONArray)
        val values = decoded.getJSONArray("remoteQualified")
        val names = (0 until values.length()).map { values.getString(it) }
        assertTrue(names.contains("device.screen.capture"))
        assertTrue(names.contains("device.ui.tap"))
        val fileOperations = setOf(
            "device.files.read", "device.files.read_multiple", "device.files.info", "device.files.write",
            "device.files.hash", "device.files.read_binary", "device.files.write_binary",
            "device.files.append_binary", "device.files.move", "device.files.edit",
            "device.directories.list", "device.directories.page", "device.directories.create"
        )
        assertTrue(names.containsAll(fileOperations))
        assertTrue(names.contains("agent.chat"))
        assertEquals(names.size, names.toSet().size)
    }
}

