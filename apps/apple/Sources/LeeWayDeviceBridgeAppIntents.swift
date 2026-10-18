import AppIntents
import Foundation

struct RunLeeWayMetalProbeIntent: AppIntent {
    static var title: LocalizedStringResource = "Run LeeWay Metal Probe"
    static var description = IntentDescription("Runs the LeeWay Device Bridge native Metal probe and records a local receipt.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let evidence = MetalDeviceProbe.run()
        if let receipt = AppleDeviceBridgeReceipt.issue(from: evidence) {
            AppleReceiptStore.append(receipt)
        }
        return .result(dialog: "LeeWay completed the local Metal probe. External verification remains separate.")
    }
}

struct LeeWayDeviceBridgeShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: RunLeeWayMetalProbeIntent(),
            phrases: [
                "Run \(.applicationName) Metal probe",
                "Check \(.applicationName) GPU"
            ],
            shortTitle: "Run Metal Probe",
            systemImageName: "cpu"
        )
    }
}
