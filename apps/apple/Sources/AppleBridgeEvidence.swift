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
    let operationID: String?
    let inputSHA256: String?
    let outputSHA256: String?
    let detail: String

    init(
        id: UUID,
        observedAt: Date,
        adapterID: String,
        physicalDeviceName: String?,
        backend: String,
        state: AppleBridgeEvidenceState,
        laneCount: Int,
        mismatchCount: Int?,
        operationID: String? = nil,
        inputSHA256: String? = nil,
        outputSHA256: String? = nil,
        detail: String
    ) {
        self.id = id
        self.observedAt = observedAt
        self.adapterID = adapterID
        self.physicalDeviceName = physicalDeviceName
        self.backend = backend
        self.state = state
        self.laneCount = laneCount
        self.mismatchCount = mismatchCount
        self.operationID = operationID
        self.inputSHA256 = inputSHA256
        self.outputSHA256 = outputSHA256
        self.detail = detail
    }

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
