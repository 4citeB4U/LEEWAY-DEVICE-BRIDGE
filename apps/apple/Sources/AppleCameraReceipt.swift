import CryptoKit
import Foundation

struct AppleCameraReceipt: Identifiable, Codable, Sendable {
    let id: UUID
    let receiptId: UUID
    let schemaVersion: String
    let timestamp: Date
    let operation: String
    let sessionId: UUID
    let deviceId: String
    let capability: String
    let authority: String
    let result: AppleReceiptResult
    let verificationState: AppleReceiptVerificationState
    let frameNumber: Int?
    let width: Int?
    let height: Int?
    let mimeType: String?
    let byteLength: Int?
    let frameSha256: String?
    let receiptHash: String

    static func currentDeviceIdentifier() -> String {
        AppleCameraDeviceBinding.identifier()
    }

    static func issue(operation: String, sessionId: UUID, frame: AppleCameraFrame?, result: AppleReceiptResult) -> AppleCameraReceipt? {
        let receiptId = UUID()
        let draft = AppleCameraReceipt(
            id: receiptId,
            receiptId: receiptId,
            schemaVersion: "1.0.0",
            timestamp: Date(),
            operation: operation,
            sessionId: sessionId,
            deviceId: AppleCameraDeviceBinding.identifier(),
            capability: "device.camera",
            authority: "LOCAL_DEVICE_RUNTIME",
            result: result,
            verificationState: .pendingExternalVerification,
            frameNumber: frame?.frameNumber,
            width: frame?.width,
            height: frame?.height,
            mimeType: frame?.mimeType,
            byteLength: frame?.jpegData.count,
            frameSha256: frame?.sha256,
            receiptHash: ""
        )
        guard let receiptHash = sha256Hex(of: Payload(receipt: draft)) else { return nil }
        return AppleCameraReceipt(
            id: draft.id,
            receiptId: draft.receiptId,
            schemaVersion: draft.schemaVersion,
            timestamp: draft.timestamp,
            operation: draft.operation,
            sessionId: draft.sessionId,
            deviceId: draft.deviceId,
            capability: draft.capability,
            authority: draft.authority,
            result: draft.result,
            verificationState: draft.verificationState,
            frameNumber: draft.frameNumber,
            width: draft.width,
            height: draft.height,
            mimeType: draft.mimeType,
            byteLength: draft.byteLength,
            frameSha256: draft.frameSha256,
            receiptHash: receiptHash
        )
    }

    var exportText: String {
        guard let data = canonicalData(for: self), let text = String(data: data, encoding: .utf8) else {
            return "{\"receiptId\":\"\(receiptId.uuidString)\",\"exportState\":\"FAILED\"}"
        }
        return text
    }

    private struct Payload: Codable, Sendable {
        let id: UUID
        let receiptId: UUID
        let schemaVersion: String
        let timestamp: Date
        let operation: String
        let sessionId: UUID
        let deviceId: String
        let capability: String
        let authority: String
        let result: AppleReceiptResult
        let verificationState: AppleReceiptVerificationState
        let frameNumber: Int?
        let width: Int?
        let height: Int?
        let mimeType: String?
        let byteLength: Int?
        let frameSha256: String?

        init(receipt: AppleCameraReceipt) {
            id = receipt.id
            receiptId = receipt.receiptId
            schemaVersion = receipt.schemaVersion
            timestamp = receipt.timestamp
            operation = receipt.operation
            sessionId = receipt.sessionId
            deviceId = receipt.deviceId
            capability = receipt.capability
            authority = receipt.authority
            result = receipt.result
            verificationState = receipt.verificationState
            frameNumber = receipt.frameNumber
            width = receipt.width
            height = receipt.height
            mimeType = receipt.mimeType
            byteLength = receipt.byteLength
            frameSha256 = receipt.frameSha256
        }
    }

    private static func sha256Hex<Value: Encodable>(of value: Value) -> String? {
        guard let data = canonicalData(for: value) else { return nil }
        return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    private static func canonicalData<Value: Encodable>(for value: Value) -> Data? {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return try? encoder.encode(value)
    }
}

enum AppleCameraReceiptStore {
    private static let storageKey = "leeway.device.bridge.apple.camera.receipts.v1"
    private static let maximumReceiptCount = 64

    static func append(_ receipt: AppleCameraReceipt) {
        var records = latestRecords()
        records.append(receipt)
        if records.count > maximumReceiptCount { records.removeFirst(records.count - maximumReceiptCount) }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(records) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    private static func latestRecords() -> [AppleCameraReceipt] {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return [] }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode([AppleCameraReceipt].self, from: data)) ?? []
    }
}

private enum AppleCameraDeviceBinding {
    private static let storageKey = "leeway.device.bridge.apple.camera.installation-id"

    static func identifier() -> String {
        let defaults = UserDefaults.standard
        let installationId = defaults.string(forKey: storageKey) ?? UUID().uuidString.lowercased()
        defaults.set(installationId, forKey: storageKey)
        let material = "\(Bundle.main.bundleIdentifier ?? "industries.leeway.devicebridge"):camera:\(installationId)"
        return "ios-camera-install-sha256:" + SHA256.hash(data: Data(material.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
