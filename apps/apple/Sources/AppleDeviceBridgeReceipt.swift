import CryptoKit
import Foundation

enum AppleReceiptVerificationState: String, Codable, Sendable {
    case pendingExternalVerification = "PENDING_EXTERNAL_VERIFICATION"
}

enum AppleReceiptResult: String, Codable, Sendable {
    case pass = "PASS"
    case fail = "FAIL"
    case blocked = "BLOCKED"
}

struct AppleDeviceBridgeReceipt: Identifiable, Codable, Sendable {
    let id: UUID
    let receiptId: UUID
    let schemaVersion: String
    let timestamp: Date
    let deviceId: String
    let capability: String
    let authority: String
    let preGate: String
    let result: AppleReceiptResult
    let postGate: String
    let verificationState: AppleReceiptVerificationState
    let evidence: AppleBridgeEvidence
    let evidenceHash: String
    let receiptHash: String

    static func issue(from evidence: AppleBridgeEvidence) -> AppleDeviceBridgeReceipt? {
        guard evidence.state != .unverified,
              let evidenceHash = sha256Hex(of: evidence) else {
            return nil
        }

        let receiptId = UUID()
        let timestamp = Date()
        let receipt = AppleDeviceBridgeReceipt(
            id: receiptId,
            receiptId: receiptId,
            schemaVersion: "1.0.0",
            timestamp: timestamp,
            deviceId: AppleReceiptDeviceBinding.identifier(),
            capability: "device.gpu.metal.probe",
            authority: "LOCAL_DEVICE_RUNTIME",
            preGate: "LOCAL_NATIVE_METAL_PROBE",
            result: result(for: evidence.state),
            postGate: "PENDING_EXTERNAL_VERIFICATION",
            verificationState: .pendingExternalVerification,
            evidence: evidence,
            evidenceHash: evidenceHash,
            receiptHash: ""
        )
        guard let receiptHash = sha256Hex(of: ReceiptPayload(receipt: receipt)) else {
            return nil
        }
        return AppleDeviceBridgeReceipt(
            id: receipt.id,
            receiptId: receipt.receiptId,
            schemaVersion: receipt.schemaVersion,
            timestamp: receipt.timestamp,
            deviceId: receipt.deviceId,
            capability: receipt.capability,
            authority: receipt.authority,
            preGate: receipt.preGate,
            result: receipt.result,
            postGate: receipt.postGate,
            verificationState: receipt.verificationState,
            evidence: receipt.evidence,
            evidenceHash: receipt.evidenceHash,
            receiptHash: receiptHash
        )
    }

    var exportText: String {
        guard let data = canonicalData(for: self),
              let text = String(data: data, encoding: .utf8) else {
            return "{\"receiptId\":\"\(receiptId.uuidString)\",\"exportState\":\"FAILED\"}"
        }
        return text
    }

    private struct ReceiptPayload: Codable, Sendable {
        let id: UUID
        let receiptId: UUID
        let schemaVersion: String
        let timestamp: Date
        let deviceId: String
        let capability: String
        let authority: String
        let preGate: String
        let result: AppleReceiptResult
        let postGate: String
        let verificationState: AppleReceiptVerificationState
        let evidence: AppleBridgeEvidence
        let evidenceHash: String

        init(receipt: AppleDeviceBridgeReceipt) {
            id = receipt.id
            receiptId = receipt.receiptId
            schemaVersion = receipt.schemaVersion
            timestamp = receipt.timestamp
            deviceId = receipt.deviceId
            capability = receipt.capability
            authority = receipt.authority
            preGate = receipt.preGate
            result = receipt.result
            postGate = receipt.postGate
            verificationState = receipt.verificationState
            evidence = receipt.evidence
            evidenceHash = receipt.evidenceHash
        }
    }

    private static func result(for state: AppleBridgeEvidenceState) -> AppleReceiptResult {
        switch state {
        case .localReadbackPassedPendingReceipt:
            return .pass
        case .failed:
            return .fail
        case .unverified:
            return .blocked
        }
    }

    private static func sha256Hex<Value: Encodable>(of value: Value) -> String? {
        guard let data = canonicalData(for: value) else {
            return nil
        }
        return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    private static func canonicalData<Value: Encodable>(for value: Value) -> Data? {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return try? encoder.encode(value)
    }
}

private enum AppleReceiptDeviceBinding {
    private static let storageKey = "leeway.device.bridge.apple.receipt.installation-id"

    static func identifier() -> String {
        let defaults = UserDefaults.standard
        let installationId: String
        if let stored = defaults.string(forKey: storageKey) {
            installationId = stored
        } else {
            installationId = UUID().uuidString.lowercased()
            defaults.set(installationId, forKey: storageKey)
        }
        let material = "\(Bundle.main.bundleIdentifier ?? "industries.leeway.devicebridge"):\(installationId)"
        return "ios-install-sha256:" + SHA256.hash(data: Data(material.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

enum AppleReceiptStore {
    private static let storageKey = "leeway.device.bridge.apple.receipts.v1"
    private static let maximumReceiptCount = 32

    static func latest() -> AppleDeviceBridgeReceipt? {
        receipts().last
    }

    static func append(_ receipt: AppleDeviceBridgeReceipt) {
        var records = receipts()
        records.append(receipt)
        if records.count > maximumReceiptCount {
            records.removeFirst(records.count - maximumReceiptCount)
        }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(records) else {
            return
        }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    private static func receipts() -> [AppleDeviceBridgeReceipt] {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else {
            return []
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode([AppleDeviceBridgeReceipt].self, from: data)) ?? []
    }
}
