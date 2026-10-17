import Foundation

enum AppleBridgeEvidenceState: String, Codable, Sendable {
    case unverified = "UNVERIFIED"
    case localReadbackPassedPendingReceipt = "LOCAL_READBACK_PASSED_PENDING_RECEIPT"
    case failed = "FAILED"
}

struct AppleBridgeEvidence: Identifiable, Codable, Sendable {
    let id: UUID
    let observedAt: Date
    let adapterID: String
    let physicalDeviceName: String?
    let backend: String
    let state: AppleBridgeEvidenceState
    let laneCount: Int
    let mismatchCount: Int?
    let detail: String

    static func unverified(detail: String) -> AppleBridgeEvidence {
        AppleBridgeEvidence(
            id: UUID(),
            observedAt: Date(),
            adapterID: "leeway.operator.ios",
            physicalDeviceName: nil,
            backend: "Metal",
            state: .unverified,
            laneCount: 0,
            mismatchCount: nil,
            detail: detail
        )
    }
}
