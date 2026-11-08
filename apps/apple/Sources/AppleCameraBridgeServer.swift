import Foundation
import Network
import Combine

/// Owner-started, token-authenticated local-network transport for the native
/// camera provider. It does not open a public listener or invent a relay URL.
final class AppleCameraBridgeServer: ObservableObject {
    @Published private(set) var isRunning = false
    @Published private(set) var endpointLabel = "Not started"
    @Published private(set) var pairingToken: String
    @Published private(set) var errorMessage: String?

    private static let tokenKey = "leeway.device.bridge.apple.camera.pairing-token.v1"
    private static let serviceType = "_leeway-camera._tcp"
    private static let maximumRequestBytes = 64 * 1024
    private static let maximumResponseBytes = 16 * 1024 * 1024

    private let networkQueue = DispatchQueue(label: "industries.leeway.devicebridge.camera.transport")
    private var listener: NWListener?
    private weak var camera: AppleCameraCapture?

    init() {
        let defaults = UserDefaults.standard
        if let stored = defaults.string(forKey: Self.tokenKey), !stored.isEmpty {
            pairingToken = stored
        } else {
            let generated = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
            defaults.set(generated, forKey: Self.tokenKey)
            pairingToken = generated
        }
    }

    func start(camera: AppleCameraCapture) {
        guard listener == nil else { return }
        self.camera = camera
        errorMessage = nil
        do {
            let newListener = try NWListener(using: .tcp, on: .any)
            newListener.service = NWListener.Service(name: "LeeWay Camera", type: Self.serviceType)
            newListener.stateUpdateHandler = { [weak self, weak newListener] state in
                DispatchQueue.main.async {
                    guard let self else { return }
                    switch state {
                    case .ready:
                        self.isRunning = true
                        let port = newListener?.port?.rawValue ?? 0
                        self.endpointLabel = "tcp://<iPhone-local-address>:\(port)"
                    case .failed:
                        self.isRunning = false
                        self.errorMessage = "Camera transport failed."
                        self.listener = nil
                    case .cancelled:
                        self.isRunning = false
                        self.endpointLabel = "Not started"
                        self.listener = nil
                    default:
                        break
                    }
                }
            }
            newListener.newConnectionHandler = { [weak self] connection in
                self?.accept(connection)
            }
            listener = newListener
            newListener.start(queue: networkQueue)
        } catch {
            errorMessage = "Camera transport could not start."
        }
    }

    func stop() {
        listener?.cancel()
        listener = nil
        isRunning = false
        endpointLabel = "Not started"
    }

    private func accept(_ connection: NWConnection) {
        connection.stateUpdateHandler = { [weak self, weak connection] state in
            guard let self, let connection else { return }
            if case .ready = state {
                self.receive(on: connection, buffer: Data())
            } else if case .failed = state {
                connection.cancel()
            }
        }
        connection.start(queue: networkQueue)
    }

    private func receive(on connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: Self.maximumRequestBytes) { [weak self] data, _, isComplete, error in
            guard let self else {
                connection.cancel()
                return
            }
            var next = buffer
            if let data { next.append(data) }
            guard next.count <= Self.maximumRequestBytes else {
                self.send(["ok": false, "error": "REQUEST_TOO_LARGE"], on: connection)
                return
            }
            if let newline = next.firstIndex(of: 10) {
                self.handle(line: Data(next.prefix(upTo: newline)), on: connection)
                return
            }
            if isComplete || error != nil {
                self.send(["ok": false, "error": "REQUEST_INCOMPLETE"], on: connection)
                return
            }
            self.receive(on: connection, buffer: next)
        }
    }

    private func handle(line: Data, on connection: NWConnection) {
        guard let object = try? JSONSerialization.jsonObject(with: line) as? [String: Any],
              let operation = object["operation"] as? String,
              let token = object["token"] as? String,
              token == pairingToken else {
            send(["ok": false, "error": "PAIRING_TOKEN_INVALID"], on: connection)
            return
        }
        let arguments = object["arguments"] as? [String: Any] ?? [:]
        Task { @MainActor [weak self] in
            guard let self else { return }
            let response = await self.execute(operation: operation, arguments: arguments)
            self.send(response, on: connection)
        }
    }

    @MainActor
    private func execute(operation: String, arguments: [String: Any]) async -> [String: Any] {
        guard let camera else { return ["ok": false, "error": "CAMERA_PROVIDER_UNAVAILABLE"] }
        switch operation {
        case "vision.sources.list":
            return [
                "ok": true,
                "protocol": "LEEWAY_APPLE_CAMERA_TCP_V1",
                "deviceId": AppleCameraReceipt.currentDeviceIdentifier(),
                "result": ["sources": [[
                    "physicalSensorId": camera.activePosition == .front ? "front" : "rear",
                    "capability": "device.camera",
                    "ownerStarted": true,
                    "transport": "AUTHENTICATED_LOCAL_TCP"
                ]]]
            ]

        case "vision.session.start":
            guard (arguments["physicalSensorId"] as? String)?.isEmpty == false else {
                return ["ok": false, "error": "PHYSICAL_SENSOR_REQUIRED"]
            }
            camera.requestAccessAndStart()
            try? await Task.sleep(nanoseconds: 500_000_000)
            guard let sessionId = camera.currentSessionId else {
                return ["ok": false, "error": "CAMERA_SESSION_NOT_RUNNING"]
            }
            return [
                "ok": true,
                "protocol": "LEEWAY_APPLE_CAMERA_TCP_V1",
                "deviceId": AppleCameraReceipt.currentDeviceIdentifier(),
                "result": ["sessionId": sessionId.uuidString, "running": true,
                            "receiptHash": camera.latestReceipt?.receiptHash ?? ""]
            ]

        case "vision.frames.observe":
            guard let requestedSession = arguments["sessionId"] as? String,
                  let sessionId = camera.currentSessionId?.uuidString,
                  requestedSession == sessionId else {
                return ["ok": false, "error": "CAMERA_SESSION_NOT_FOUND"]
            }
            for _ in 0..<20 {
                if let frame = camera.latestFrame {
                    return [
                        "ok": true,
                        "protocol": "LEEWAY_APPLE_CAMERA_TCP_V1",
                        "deviceId": AppleCameraReceipt.currentDeviceIdentifier(),
                        "result": ["frame": [
                            "frameNumber": frame.frameNumber,
                            "timestamp": ISO8601DateFormatter().string(from: frame.timestamp),
                            "image": ["mimeType": frame.mimeType,
                                       "base64": frame.jpegData.base64EncodedString(),
                                       "width": frame.width,
                                       "height": frame.height,
                                       "sha256": frame.sha256]
                        ], "receiptHash": camera.latestReceipt?.receiptHash ?? ""]
                    ]
                }
                try? await Task.sleep(nanoseconds: 100_000_000)
            }
            return ["ok": false, "error": "CAMERA_FRAME_NOT_READY"]

        case "vision.session.stop":
            let stoppedSession = camera.currentSessionId?.uuidString ?? ""
            camera.stop()
            try? await Task.sleep(nanoseconds: 150_000_000)
            return ["ok": true, "protocol": "LEEWAY_APPLE_CAMERA_TCP_V1",
                    "deviceId": AppleCameraReceipt.currentDeviceIdentifier(),
                    "result": ["stopped": true, "sessionId": stoppedSession]]

        default:
            return ["ok": false, "error": "CAPABILITY_UNAVAILABLE"]
        }
    }

    private func send(_ value: [String: Any], on connection: NWConnection) {
        guard JSONSerialization.isValidJSONObject(value),
              let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
              data.count <= Self.maximumResponseBytes else {
            connection.cancel()
            return
        }
        var response = data
        response.append(10)
        connection.send(content: response, completion: .contentProcessed { _ in connection.cancel() })
    }
}
