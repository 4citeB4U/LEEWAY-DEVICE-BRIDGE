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
    @Environment(\.openURL) private var openURL
    @State private var phoneNumber = ""
    @State private var emailRecipient = ""
    @State private var emailSubject = "LeeWay Device Bridge"
    @State private var emailBody = ""
    @State private var handoffState = "No system handoff requested."

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
                Section("Agent Lee system entry points") {
                    LabeledContent("LeeWay actions", value: "Siri and Shortcuts")
                    Text("The installed app exposes its Metal probe as a LeeWay App Intent. A shortcut may start the LeeWay action; it does not grant control of other apps.")
                }
                Section("Owner-visible communications") {
                    TextField("Phone number", text: $phoneNumber)
                        .keyboardType(.phonePad)
                    Button("Hand off to Phone") {
                        guard let url = AppleSystemHandoff.phoneURL(for: phoneNumber) else {
                            handoffState = "Enter a phone number before requesting a Phone handoff."
                            return
                        }
                        openURL(url)
                        handoffState = "Phone handoff requested. Complete or cancel the call in Apple’s Phone interface."
                    }

                    TextField("Email recipient", text: $emailRecipient)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                    TextField("Subject", text: $emailSubject)
                    TextField("Message", text: $emailBody, axis: .vertical)
                        .lineLimit(3...6)
                    Button("Hand off to Mail") {
                        guard let url = AppleSystemHandoff.emailURL(
                            recipient: emailRecipient,
                            subject: emailSubject,
                            body: emailBody
                        ) else {
                            handoffState = "Enter an email recipient before requesting a Mail handoff."
                            return
                        }
                        openURL(url)
                        handoffState = "Mail handoff requested. Review and send or cancel in Apple’s mail interface."
                    }
                    Text(handoffState)
                }
                Section("Apple capability boundary") {
                    ForEach(AppleCapabilityCatalog.iOS) { capability in
                        VStack(alignment: .leading, spacing: 4) {
                            LabeledContent(capability.id, value: capability.state.rawValue)
                            Text(capability.detail)
                                .font(.footnote)
                        }
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
