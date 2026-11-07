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
    @StateObject private var camera = AppleCameraCapture()
    @StateObject private var cameraBridge = AppleCameraBridgeServer()
    @StateObject private var updater = AppleUpdateCoordinator()
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
                Section("Native camera provider") {
                    if camera.isRunning {
                        AppleCameraPreview(session: camera.session)
                            .frame(height: 240)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    LabeledContent("State", value: camera.isRunning ? "RUNNING" : "STOPPED")
                    LabeledContent("Position", value: camera.activePosition == .back ? "Back" : "Front")
                    if let frame = camera.latestFrame {
                        LabeledContent("Frame", value: "\(frame.frameNumber) · \(frame.width)x\(frame.height)")
                        Text("JPEG SHA-256: \(frame.sha256)")
                            .font(.footnote.monospaced())
                            .textSelection(.enabled)
                    }
                    if let receipt = camera.latestReceipt {
                        Text("Latest \(receipt.operation) receipt: \(receipt.receiptHash)")
                            .font(.footnote.monospaced())
                            .textSelection(.enabled)
                    }
                    if let errorMessage = camera.errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                    Button(camera.isRunning ? "Stop Camera" : "Open Camera") {
                        if camera.isRunning { camera.stop() } else { camera.requestAccessAndStart() }
                    }
                    if camera.isRunning {
                        Button("Flip Camera") { camera.flipCamera() }
                    }
                    Text("Capture is owner-started and local to this LeeWay app. Host streaming requires a separately paired Device Bridge transport.")
                        .font(.footnote)
                    Divider()
                    LabeledContent("Host transport", value: cameraBridge.isRunning ? "RUNNING" : "STOPPED")
                    if cameraBridge.isRunning {
                        Text(cameraBridge.endpointLabel)
                            .font(.footnote.monospaced())
                            .textSelection(.enabled)
                        Text("Pairing token: \(cameraBridge.pairingToken)")
                            .font(.footnote.monospaced())
                            .textSelection(.enabled)
                        Text("Use this exact endpoint and token in the owner-controlled Device Bridge configuration. Keep the token private.")
                            .font(.footnote)
                    }
                    if let transportError = cameraBridge.errorMessage {
                        Text(transportError).foregroundStyle(.red)
                    }
                    Button(cameraBridge.isRunning ? "Stop Host Camera Bridge" : "Start Host Camera Bridge") {
                        if cameraBridge.isRunning { cameraBridge.stop() } else { cameraBridge.start(camera: camera) }
                    }
                }
                Section("GitHub update channel") {
                    LabeledContent("Update state", value: updater.state)
                    LabeledContent("Installed", value: "\(updater.currentVersion) (\(updater.currentBuild))")
                    if updater.latestBuild > 0 {
                        LabeledContent("GitHub package", value: "\(updater.latestVersion) (\(updater.latestBuild))")
                    }
                    if updater.latestSizeBytes > 0 {
                        LabeledContent("Package size", value: "\(updater.latestSizeBytes / 1024 / 1024) MB")
                    }
                    if let errorMessage = updater.errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                    Button("Check GitHub for Updates") { updater.check() }
                    if updater.updateAvailable {
                        Button("Open SideStore Update Channel") {
                            openURL(updater.sideStoreURL)
                        }
                        Button("Open GitHub Release") {
                            openURL(updater.releaseURL)
                        }
                        Text("GitHub supplies the package and SideStore performs the owner-confirmed signed install. iOS cannot replace its own signed app.")
                            .font(.footnote)
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
            .onAppear { updater.check() }
            .alert("LeeWay Device Bridge update available", isPresented: $updater.showPrompt) {
                Button("Update") { openURL(updater.sideStoreURL) }
                Button("Later", role: .cancel) {}
            } message: {
                Text("GitHub has version \(updater.latestVersion) (\(updater.latestBuild)). Open SideStore to review and install it on this iPhone.")
            }
            .onDisappear {
                cameraBridge.stop()
                camera.stop()
            }
        }
    }
}
