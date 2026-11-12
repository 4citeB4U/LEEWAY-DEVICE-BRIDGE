import Combine
import Foundation
import Network
import Security
import UIKit

// MARK: - Secure Keychain Storage for Apple Relay Credentials
public final class AppleKeychainStore: @unchecked Sendable {
    public static let shared = AppleKeychainStore()
    private let service = "industries.leeway.devicebridge.relay"

    public func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
        var newAttributes = query
        newAttributes[kSecValueData as String] = data
        SecItemAdd(newAttributes as CFDictionary, nil)
    }

    public func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    public func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Native Apple WebSocket Relay Client
@MainActor
public final class AppleRelayClient: ObservableObject {
    @Published public private(set) var isConnected = false
    @Published public private(set) var connectionState = "DISCONNECTED"
    @Published public private(set) var lastReceipt: String?
    @Published public private(set) var lastCommandReceived: String?

    public var deviceId: String {
        get { AppleKeychainStore.shared.load(key: "deviceId") ?? "phone-apple-iphone" }
        set { AppleKeychainStore.shared.save(key: "deviceId", value: newValue) }
    }

    public var relayEndpoint: String {
        get { AppleKeychainStore.shared.load(key: "relayEndpoint") ?? "wss://agent-lee.tailb186e7.ts.net/api/device-relay" }
        set { AppleKeychainStore.shared.save(key: "relayEndpoint", value: newValue) }
    }

    public var pairingToken: String {
        get { AppleKeychainStore.shared.load(key: "pairingToken") ?? "" }
        set { AppleKeychainStore.shared.save(key: "pairingToken", value: newValue) }
    }

    private var webSocketTask: URLSessionWebSocketTask?
    private var session: URLSession
    private let pathMonitor = NWPathMonitor()
    private var reconnectAttempt = 0
    private var isReconnecting = false

    public init() {
        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)
        setupNetworkMonitoring()
        setupLifecycleObservers()
    }

    private func setupNetworkMonitoring() {
        pathMonitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if path.status == .satisfied && !self.isConnected {
                    self.connect()
                }
            }
        }
        let queue = DispatchQueue(label: "industries.leeway.apple.relay.network")
        pathMonitor.start(queue: queue)
    }

    private func setupLifecycleObservers() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, !self.isConnected else { return }
                self.connect()
            }
        }
    }

    public static let remoteConfigURL = URL(string: "https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/remote-relay.json")!

    public func syncRemoteConfig() async {
        guard let (data, response) = try? await URLSession.shared.data(from: Self.remoteConfigURL),
              let http = response as? HTTPURLResponse, http.statusCode == 200,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let urlString = json["relayUrl"] as? String,
              !urlString.isEmpty else { return }
        self.relayEndpoint = urlString
    }

    public func connect() {
        Task {
            await syncRemoteConfig()
            openWebSocket()
        }
    }

    private func openWebSocket() {
        guard let url = URL(string: relayEndpoint), url.scheme == "ws" || url.scheme == "wss" else {
            connectionState = "ERROR_INVALID_URL"
            return
        }

        disconnect()
        connectionState = "CONNECTING"

        let request = URLRequest(url: url, timeoutInterval: 15)
        let task = session.webSocketTask(with: request)
        self.webSocketTask = task
        task.resume()

        sendHello()
        listenForMessages()
    }

    public func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
        connectionState = "DISCONNECTED"
    }

    private func sendHello() {
        let helloMessage: [String: Any] = [
            "type": "hello",
            "role": "phone",
            "deviceId": deviceId,
            "token": pairingToken,
        ]
        sendMessage(helloMessage)
    }

    private func listenForMessages() {
        guard let task = webSocketTask else { return }
        task.receive { [weak self] result in
            Task { @MainActor [weak self] in
                guard let self else { return }
                switch result {
                case .success(let message):
                    switch message {
                    case .string(let text):
                        self.handleIncomingText(text)
                    case .data(let data):
                        if let text = String(data: data, encoding: .utf8) {
                            self.handleIncomingText(text)
                        }
                    @unknown default:
                        break
                    }
                    self.listenForMessages()

                case .failure(let error):
                    self.connectionState = "CONNECTION_LOST"
                    self.isConnected = false
                    self.scheduleReconnect()
                }
            }
        }
    }

    private func handleIncomingText(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }

        if type == "hello-ack" {
            isConnected = true
            connectionState = "CONNECTED"
            reconnectAttempt = 0
            return
        }

        if type == "command" {
            guard let id = json["id"] as? String,
                  let capability = json["capability"] as? String else { return }
            let args = json["arguments"] as? [String: Any] ?? [:]
            lastCommandReceived = "\(capability) [\(id)]"
            executeCapability(id: id, capability: capability, args: args)
        }
    }

    private func executeCapability(id: String, capability: String, args: [String: Any]) {
        var responseResult: [String: Any] = [:]
        var ok = true

        switch capability {
        case "device.health":
            UIDevice.current.isBatteryMonitoringEnabled = true
            let level = UIDevice.current.batteryLevel >= 0 ? Int(UIDevice.current.batteryLevel * 100) : 100
            responseResult = [
                "ok": true,
                "platform": "ios",
                "deviceId": deviceId,
                "status": "ONLINE",
                "transport": "WIRELESS_RELAY_WEBSOCKET",
                "batteryLevel": level,
                "timestamp": ISO8601DateFormatter().string(from: Date()),
            ]

        case "device.info":
            responseResult = [
                "ok": true,
                "platform": "ios",
                "deviceId": deviceId,
                "deviceName": UIDevice.current.name,
                "systemVersion": UIDevice.current.systemVersion,
                "model": UIDevice.current.model,
                "transport": "WIRELESS_RELAY_WEBSOCKET",
                "uiControl": true,
                "nativeVerification": true,
            ]

        case "device.directories.list":
            let fm = FileManager.default
            let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first?.path ?? ""
            let contents = (try? fm.contentsOfDirectory(atPath: docs)) ?? []
            responseResult = [
                "ok": true,
                "platform": "ios",
                "root": "Documents",
                "entries": contents,
                "count": contents.count,
            ]

        case "device.files.read":
            let filename = args["path"] as? String ?? ""
            let fm = FileManager.default
            if let docsURL = fm.urls(for: .documentDirectory, in: .userDomainMask).first {
                let target = docsURL.appendingPathComponent(filename)
                if let content = try? String(contentsOf: target, encoding: .utf8) {
                    responseResult = ["ok": true, "content": content, "path": filename]
                } else {
                    ok = false
                    responseResult = ["ok": false, "error": "FILE_NOT_FOUND_OR_INACCESSIBLE"]
                }
            }

        case "device.capabilities":
            responseResult = [
                "ok": true,
                "remoteQualified": [
                    "device.health",
                    "device.info",
                    "device.directories.list",
                    "device.files.read",
                    "device.camera",
                    "device.gpu.metal.probe",
                ],
            ]

        default:
            ok = false
            responseResult = ["ok": false, "error": "CAPABILITY_UNAVAILABLE: \(capability)"]
        }

        let reply: [String: Any] = [
            "type": "result",
            "id": id,
            "capability": capability,
            "ok": ok,
            "result": responseResult,
        ]
        sendMessage(reply)
    }

    private func sendMessage(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let string = String(data: data, encoding: .utf8) else { return }
        webSocketTask?.send(.string(string)) { _ in }
    }

    private func scheduleReconnect() {
        guard !isReconnecting else { return }
        isReconnecting = true
        reconnectAttempt += 1
        let backoff = min(pow(2.0, Double(min(reconnectAttempt, 5))), 30.0)
        let jitter = Double.random(in: 0.1...1.0)
        let delay = backoff + jitter

        connectionState = "RECONNECT_PENDING_IN_\(Int(delay))S"
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self else { return }
            self.isReconnecting = false
            self.connect()
        }
    }
}

