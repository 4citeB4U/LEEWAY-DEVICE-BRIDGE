import SwiftUI

@MainActor
final class AppleBridgeStore: ObservableObject {
    @Published private(set) var evidence = AppleBridgeEvidence.unverified(
        detail: "No Metal command has been submitted by this Device Bridge adapter."
    )
    @Published private(set) var receipt = AppleReceiptStore.latest()

    func runProbe() {
        evidence = MetalDeviceProbe.run()
        if let issuedReceipt = AppleDeviceBridgeReceipt.issue(from: evidence) {
            AppleReceiptStore.append(issuedReceipt)
            receipt = issuedReceipt
        }
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
                Section("Device Bridge receipt") {
                    if let receipt = store.receipt {
                        LabeledContent("Local result", value: receipt.result.rawValue)
                        LabeledContent("Verification", value: receipt.verificationState.rawValue)
                        LabeledContent("Evidence hash", value: String(receipt.evidenceHash.prefix(16)) + "…")
                        LabeledContent("Receipt hash", value: String(receipt.receiptHash.prefix(16)) + "…")
                        ShareLink(item: receipt.exportText) {
                            Label("Export local receipt", systemImage: "square.and.arrow.up")
                        }
                    } else {
                        LabeledContent("State", value: "NOT_CREATED")
                        Text("A receipt is issued only after this app observes a Metal probe result. External verification remains separate.")
                    }
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
