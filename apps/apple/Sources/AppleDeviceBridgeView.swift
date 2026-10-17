import SwiftUI

@MainActor
final class AppleBridgeStore: ObservableObject {
    @Published private(set) var evidence = AppleBridgeEvidence.unverified(
        detail: "No Metal command has been submitted by this Device Bridge adapter."
    )

    func runProbe() {
        evidence = MetalDeviceProbe.run()
    }
}

struct AppleDeviceBridgeView: View {
    @StateObject private var store = AppleBridgeStore()

    var body: some View {
        NavigationStack {
            Form {
                Section("LeeWay Device Bridge adapter") {
                    LabeledContent("Adapter", value: store.evidence.adapterID)
                    LabeledContent("State", value: store.evidence.state.rawValue)
                    LabeledContent("Backend", value: store.evidence.backend)
                    LabeledContent("Physical Metal device", value: store.evidence.physicalDeviceName ?? "Not observed")
                }
                Section("Direct compute observation") {
                    LabeledContent("Lanes", value: "\(store.evidence.laneCount)")
                    LabeledContent("Mismatches", value: store.evidence.mismatchCount.map(String.init) ?? "Not measured")
                    Text(store.evidence.detail)
                }
                Section {
                    Button("Run Device Bridge Metal Probe") { store.runProbe() }
                } footer: {
                    Text("A passing readback is local observation. It does not authorize or claim model inference.")
                }
            }
            .navigationTitle("LeeWay Device")
        }
    }
}
