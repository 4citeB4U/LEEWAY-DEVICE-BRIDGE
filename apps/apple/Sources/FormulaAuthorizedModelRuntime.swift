import Foundation

struct FormulaAuthorizationGrant: Codable, Sendable {
    let requestID: String
    let decisionID: String
    let policyDigest: String
    let expiresAt: Date
    let signatureReference: String

    var isStructurallyUsable: Bool {
        !requestID.isEmpty && !decisionID.isEmpty && !policyDigest.isEmpty &&
        !signatureReference.isEmpty && expiresAt > Date()
    }
}

struct LocalModelRequest: Sendable {
    let prompt: String
    let modelDigest: String
    let authorization: FormulaAuthorizationGrant
}

struct LocalModelResult: Sendable {
    let text: String?
    let runtimeIdentity: String
    let state: AppleBridgeEvidenceState
    let detail: String
}

protocol FormulaAuthorizedModelRuntime: Sendable {
    var runtimeIdentity: String { get }
    func run(_ request: LocalModelRequest) async -> LocalModelResult
}

struct DeviceBridgeRuntimeNotInstalled: FormulaAuthorizedModelRuntime {
    let runtimeIdentity = "LeeWayDeviceBridge::iOS::RUNTIME_NOT_INSTALLED"

    func run(_ request: LocalModelRequest) async -> LocalModelResult {
        guard request.authorization.isStructurallyUsable else {
            return LocalModelResult(text: nil, runtimeIdentity: runtimeIdentity, state: .unverified,
                                    detail: "Device Bridge rejected the request because no usable Formula authorization grant was supplied.")
        }
        return LocalModelResult(text: nil, runtimeIdentity: runtimeIdentity, state: .unverified,
                                detail: "No LeeWay Device Bridge model runtime is installed. Model execution was not attempted.")
    }
}
