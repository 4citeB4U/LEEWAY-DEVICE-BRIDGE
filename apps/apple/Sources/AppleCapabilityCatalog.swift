import Foundation

enum AppleCapabilityState: String, Sendable {
    case available = "AVAILABLE"
    case ownerHandoff = "OWNER_VISIBLE_SYSTEM_HANDOFF"
    case planned = "PLANNED_NATIVE_ADAPTER"
    case unavailable = "UNAVAILABLE_BY_PLATFORM"
}

struct AppleCapability: Identifiable, Sendable {
    let id: String
    let state: AppleCapabilityState
    let detail: String
}

enum AppleCapabilityCatalog {
    static let iOS: [AppleCapability] = [
        AppleCapability(
            id: "device.gpu.metal.probe",
            state: .available,
            detail: "Native Metal dispatch and readback are locally implemented. Formula, model runtime, and external receipt verification remain separate gates."
        ),
        AppleCapability(
            id: "device.apps.leeway.action",
            state: .available,
            detail: "LeeWay actions can be exposed to Siri and Shortcuts through App Intents."
        ),
        AppleCapability(
            id: "device.communications.call",
            state: .ownerHandoff,
            detail: "The app can hand a supplied phone number to the system Phone handler. The owner completes the call in Apple’s interface."
        ),
        AppleCapability(
            id: "device.communications.email",
            state: .ownerHandoff,
            detail: "The app can hand a drafted message to the configured system mail handler. The owner reviews and sends it."
        ),
        AppleCapability(
            id: "device.ui.pointer.cross-app",
            state: .unavailable,
            detail: "iOS does not expose arbitrary cross-app pointer or UI control to an ordinary app."
        ),
        AppleCapability(
            id: "device.apps.control.cross-app",
            state: .unavailable,
            detail: "iOS does not permit arbitrary app switching, closing, reading, or controlling from this adapter."
        ),
        AppleCapability(
            id: "device.screen.observe.cross-app",
            state: .unavailable,
            detail: "No cross-app screen observation implementation is present in this adapter."
        ),
        AppleCapability(
            id: "device.macos.accessibility.control",
            state: .planned,
            detail: "A separate macOS adapter can use owner-approved Accessibility and Screen Recording permission. It is not present in this iPhone IPA."
        )
    ]
}
