import SwiftUI
import UIKit

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

struct TitaniumCard<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            content
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(red: 22/255, green: 27/255, blue: 34/255))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 48/255, green: 54/255, blue: 61/255), lineWidth: 1))
    }
}

struct NodeRow: View {
    let icon: String
    let name: String
    let subtitle: String
    let status: String
    let statusColor: Color

    var body: some View {
        HStack {
            Text(icon).font(.system(size: 20))
            VStack(alignment: .leading, spacing: 2) {
                Text(name).font(.subheadline.bold()).foregroundColor(.white)
                Text(subtitle).font(.caption.monospaced()).foregroundColor(Color(red: 139/255, green: 148/255, blue: 158/255))
            }
            Spacer()
            Text(status)
                .font(.caption2.bold().monospaced())
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(statusColor.opacity(0.18))
                .foregroundColor(statusColor)
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .padding(.vertical, 4)
    }
}

struct AppleDeviceBridgeView: View {
    @StateObject private var store = AppleBridgeStore()
    @StateObject private var camera = AppleCameraCapture()
    @StateObject private var cameraBridge = AppleCameraBridgeServer()
    @StateObject private var updater = AppleUpdateCoordinator()
    @StateObject private var relay = AppleRelayClient()
    @Environment(\.openURL) private var openURL
    @State private var phoneNumber = ""
    @State private var emailRecipient = ""
    @State private var emailSubject = "LeeWay Device Bridge"
    @State private var emailBody = ""
    @State private var handoffState = "No system handoff requested."

    var body: some View {
        ZStack {
            Color(red: 13/255, green: 17/255, blue: 23/255).ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    // Header Card
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("⚡ LEEWAY SOVEREIGN MESH")
                                .font(.caption.bold().monospaced())
                                .foregroundColor(Color(red: 56/255, green: 139/255, blue: 253/255))
                            Spacer()
                            Text("ANCHOR v0.10.0")
                                .font(.caption2.bold().monospaced())
                                .foregroundColor(Color(red: 139/255, green: 148/255, blue: 158/255))
                        }
                        Text("Unified Device Bridge Dashboard")
                            .font(.title3.bold())
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 8)

                    // 1. Mesh Roster Card
                    TitaniumCard {
                        Text("MESH ROSTER & ACTIVE RELAY ROOMS")
                            .font(.caption.bold())
                            .foregroundColor(Color(red: 139/255, green: 148/255, blue: 158/255))

                        NodeRow(icon: "🖥️", name: "PC Primary Workstation", subtitle: "pc-primary (Lenovo 83NX)", status: "ONLINE", statusColor: Color(red: 63/255, green: 185/255, blue: 80/255))
                        NodeRow(icon: "📱", name: "Samsung Galaxy Z Fold6", subtitle: "phone-fold6 (SM-F956U)", status: "CONNECTED", statusColor: Color(red: 88/255, green: 166/255, blue: 255/255))
                        NodeRow(icon: "💻", name: "HP Secondary Workstation", subtitle: "pc-hp-secondary (192.168.1.101)", status: "ONLINE", statusColor: Color(red: 63/255, green: 185/255, blue: 80/255))
                        NodeRow(icon: "🍎", name: "Apple iPhone 11", subtitle: "phone-apple-iphone (This Device)", status: relay.isConnected ? "CONNECTED" : "SUPERVISOR", statusColor: Color(red: 210/255, green: 153/255, blue: 34/255))
                    }

                    // 2. This Node Telemetry
                    TitaniumCard {
                        Text("THIS NODE TELEMETRY (APPLE METAL)")
                            .font(.caption.bold())
                            .foregroundColor(Color(red: 139/255, green: 148/255, blue: 158/255))

                        VStack(alignment: .leading, spacing: 6) {
                            Text("DEVICE ID:    phone-apple-iphone")
                            Text("PLATFORM:     iOS (Apple A13 Bionic Metal)")
                            Text("RELAY STATE:  \(relay.connectionState.uppercased())")
                            Text("METAL PROBE:  \(store.evidence.state.rawValue)")
                            Text("METAL DEVICE: \(store.evidence.physicalDeviceName ?? "Not Observed")")
                            Text("LANES:        \(store.evidence.laneCount) lanes (\(store.evidence.mismatchCount.map(String.init) ?? "0") mismatches)")
                            Text("TRANSPORT:    \(relay.relayEndpoint)")
                        }
                        .font(.footnote.monospaced())
                        .foregroundColor(Color(red: 201/255, green: 209/255, blue: 217/255))

                        Button(action: { store.runProbe() }) {
                            Text("RUN DIRECT METAL COMPUTE PROBE")
                                .font(.footnote.bold().monospaced())
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color(red: 56/255, green: 139/255, blue: 253/255))
                                .foregroundColor(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }

                    // 3. Modular Capabilities (JIT Authorization)
                    TitaniumCard {
                        Text("SOVEREIGN CAPABILITY MODULES (JIT AUTHORIZATION)")
                            .font(.caption.bold())
                            .foregroundColor(Color(red: 139/255, green: 148/255, blue: 158/255))

                        // Camera Module
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("📷 Native Camera Provider")
                                    .font(.subheadline.bold())
                                    .foregroundColor(.white)
                                Spacer()
                                Text(camera.isRunning ? "RUNNING" : "STOPPED")
                                    .font(.caption2.bold().monospaced())
                                    .foregroundColor(camera.isRunning ? .green : .gray)
                            }

                            if camera.isRunning {
                                AppleCameraPreview(session: camera.session)
                                    .frame(height: 180)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                            }

                            HStack(spacing: 8) {
                                Button(action: {
                                    if camera.isRunning { camera.stop() } else { camera.requestAccessAndStart() }
                                }) {
                                    Text(camera.isRunning ? "STOP CAMERA" : "ACTIVATE CAMERA")
                                        .font(.caption.bold().monospaced())
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 8)
                                        .background(Color(red: 35/255, green: 134/255, blue: 54/255))
                                        .foregroundColor(.white)
                                        .clipShape(RoundedRectangle(cornerRadius: 6))
                                }
                                if camera.isRunning {
                                    Button(action: { camera.flipCamera() }) {
                                        Text("FLIP")
                                            .font(.caption.bold().monospaced())
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 8)
                                            .background(Color(red: 48/255, green: 54/255, blue: 61/255))
                                            .foregroundColor(.white)
                                            .clipShape(RoundedRectangle(cornerRadius: 6))
                                    }
                                }
                            }
                        }

                        Divider().background(Color(red: 48/255, green: 54/255, blue: 61/255))

                        // Wireless Relay Controls
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("🌐 Sovereign Relay Client")
                                    .font(.subheadline.bold())
                                    .foregroundColor(.white)
                                Spacer()
                                Text(relay.isConnected ? "CONNECTED" : "STANDBY")
                                    .font(.caption2.bold().monospaced())
                                    .foregroundColor(relay.isConnected ? .green : .orange)
                            }
                            Button(action: {
                                if relay.isConnected { relay.disconnect() } else { relay.connect() }
                            }) {
                                Text(relay.isConnected ? "DISCONNECT RELAY" : "CONNECT TO SOVEREIGN RELAY")
                                    .font(.caption.bold().monospaced())
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .background(Color(red: 56/255, green: 139/255, blue: 253/255))
                                    .foregroundColor(.white)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                        }
                    }

                    // 4. Evidence Console & Local Receipts
                    TitaniumCard {
                        Text("EVIDENCE CONSOLE & LOCAL RECEIPTS")
                            .font(.caption.bold())
                            .foregroundColor(Color(red: 139/255, green: 148/255, blue: 158/255))

                        if let receipt = store.receipt {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("RESULT:    \(receipt.result.rawValue)")
                                Text("STATE:     \(receipt.verificationState.rawValue)")
                                Text("EVIDENCE:  \(String(receipt.evidenceHash.prefix(24)))…")
                                Text("RECEIPT:   \(String(receipt.receiptHash.prefix(24)))…")
                            }
                            .font(.caption.monospaced())
                            .foregroundColor(Color(red: 56/255, green: 139/255, blue: 253/255))

                            ShareLink(item: receipt.exportText) {
                                Text("EXPORT LOCAL RECEIPT")
                                    .font(.caption.bold().monospaced())
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .background(Color(red: 48/255, green: 54/255, blue: 61/255))
                                    .foregroundColor(.white)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                        } else {
                            Text("A local receipt is issued upon Metal probe observation.\nExternal Veritas certification remains separate.")
                                .font(.caption.monospaced())
                                .foregroundColor(Color(red: 139/255, green: 148/255, blue: 158/255))
                        }
                    }
                }
                .padding(16)
            }
        }
        .onAppear {
            updater.check()
            cameraBridge.startIfEnrolled(camera: camera)
            relay.connect()
        }
        .alert("LeeWay Device Bridge update available", isPresented: $updater.showPrompt) {
            Button("Open GitHub Release") { openURL(updater.releaseURL) }
            Button("Open iLoader Instructions") { openURL(updater.iLoaderGuideURL) }
            Button("Later", role: .cancel) {}
        } message: {
            Text("GitHub has version \(updater.latestVersion) (\(updater.latestBuild)).")
        }
    }
}
