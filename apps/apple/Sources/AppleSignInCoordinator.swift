/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE.IDENTITY
TAG: LEEWAY.APPLE.SIGN_IN_NATIVE_RUNTIME_BOUNDARY
5WH:
WHAT = Native Sign in with Apple and a strictly configured handoff to LeeWay's existing identity authority.
WHY = Give ordinary customers Apple authentication without collecting Apple passwords or fabricating Bridge sessions.
WHO = LeeWay Device Bridge owner-authorized contributors.
WHERE = apps/apple/Sources/AppleSignInCoordinator.swift.
WHEN = 2026-11-07.
HOW = AuthenticationServices, nonce-bound token, ephemeral HTTPS exchange, fail-closed session readback.
LICENSE = MIT.
*/
import AuthenticationServices
import Combine
import CryptoKit
import Foundation

@MainActor
final class AppleSignInCoordinator: ObservableObject {
    @Published private(set) var state = "NOT_SIGNED_IN"
    @Published private(set) var detail = "Sign in with Apple is optional. Device capabilities remain available without an account."
    @Published private(set) var sessionEstablished = false

    private var activeNonce: String?
    private var exchangeTask: Task<Void, Never>?

    private static let exchangePath = "/v1/device-bridge/apple/session"

    var exchangeConfigured: Bool {
        return Self.exchangeURL() != nil
    }

    func prepare(_ request: ASAuthorizationAppleIDRequest) {
        exchangeTask?.cancel()
        sessionEstablished = false
        // Apple receives the SHA-256 of this per-attempt nonce, not an unbound client assertion.
        let nonce = UUID().uuidString + UUID().uuidString
        activeNonce = nonce
        request.requestedScopes = [.email, .fullName]
        request.nonce = SHA256.hash(data: Data(nonce.utf8))
            .map { String(format: "%02x", $0) }.joined()
        state = "APPLE_PROMPT_OPEN"
        detail = "Apple controls account consent. LeeWay does not receive your Apple password."
    }

    func finish(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .failure:
            activeNonce = nil
            sessionEstablished = false
            state = "APPLE_AUTHORIZATION_NOT_COMPLETED"
            detail = "Apple did not complete the request. No LeeWay session was opened."
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let identityToken = credential.identityToken,
                  let nonce = activeNonce,
                  !identityToken.isEmpty else {
                activeNonce = nil
                state = "APPLE_CREDENTIAL_UNAVAILABLE"
                detail = "No Apple identity token or matching request was returned. LeeWay remains disconnected."
                return
            }
            activeNonce = nil
            guard let url = Self.exchangeURL() else {
                state = "LEEWAY_IDENTITY_PROVIDER_UNBOUND"
                detail = "Apple returned an identity credential, but a trusted LeeWay session exchange is not configured. No Bridge access was granted."
                return
            }
            let token = Data(identityToken)
            state = "LEEWAY_SESSION_VERIFYING"
            detail = "Checking this Apple credential with LeeWay's configured identity authority."
            exchangeTask = Task {
                await exchange(identityToken: token, nonce: nonce, endpoint: url)
            }
        }
    }

    private static func exchangeURL() -> URL? {
        guard let source = Bundle.main.object(forInfoDictionaryKey: "LEEWAY_APPLE_IDENTITY_EXCHANGE_ENDPOINT") as? String,
              let url = URL(string: source),
              url.scheme == "https",
              url.host != nil,
              url.user == nil, url.password == nil,
              url.query == nil, url.fragment == nil,
              url.path == exchangePath else { return nil }
        return url
    }

    private func exchange(identityToken: Data, nonce: String, endpoint: URL) async {
        defer { exchangeTask = nil }
        guard let tokenText = String(data: identityToken, encoding: .utf8), tokenText.count <= 16_384 else {
            state = "APPLE_TOKEN_INVALID"
            detail = "The Apple credential was not a supported identity-token payload."
            return
        }
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "identityToken": tokenText,
            "nonce": nonce,
            "client": "industries.leeway.devicebridge"
        ])
        guard request.httpBody != nil else {
            state = "LEEWAY_SESSION_REQUEST_INVALID"
            detail = "Unable to encode the identity verification request."
            return
        }
        do {
            let config = URLSessionConfiguration.ephemeral
            config.httpShouldSetCookies = false
            config.urlCache = nil
            let session = URLSession(configuration: config)
            defer { session.invalidateAndCancel() }
            let (bytes, response) = try await session.data(for: request)
            try Task.checkCancellation()
            guard let http = response as? HTTPURLResponse,
                  (200..<300).contains(http.statusCode),
                  bytes.count <= 8_192,
                  let parsed = try JSONSerialization.jsonObject(with: bytes) as? [String: Any],
                  parsed["state"] as? String == "AUTHENTICATED",
                  parsed["sessionVerified"] as? Bool == true,
                  parsed["issuer"] as? String == "LEEWAY_RUNTIME_FABRIC" else {
                state = "LEEWAY_IDENTITY_REJECTED"
                detail = "The LeeWay authority did not confirm an authenticated session. Device admission remains closed."
                return
            }
            // An authentication response is not a Device Bridge execution grant.
            // No bearer token or Apple credential is written to storage.
            state = "IDENTITY_AUTHENTICATED_BRIDGE_ADMISSION_REQUIRED"
            sessionEstablished = false
            detail = "LeeWay identity was verified. Separate Device Bridge registration and permission approval are still required."
        } catch {
            if Task.isCancelled { return }
            state = "LEEWAY_IDENTITY_EXCHANGE_UNAVAILABLE"
            detail = "The LeeWay identity service could not verify this Apple sign-in. No session was opened."
        }
    }
}
