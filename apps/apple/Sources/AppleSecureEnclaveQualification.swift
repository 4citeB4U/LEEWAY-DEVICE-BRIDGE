/*
LEEWAY HEADER - DO NOT REMOVE
REGION: LEEWAY.UNIVERSAL.APPLE
TAG: LEEWAY.APPLE.SECURE.ENCLAVE
DISCOVERY_PIPELINE: Voice > Intent > Location > Vertical > Ranking > Render
5WH:
WHAT = Native protected signing qualification.
WHY = Qualify portable device trust.
WHO = LeeWay engineering.
WHERE = Existing Apple Device Bridge adapter.
WHEN = Universal commissioning.
HOW = CryptoKit Secure Enclave P-256.
LICENSE = Existing repository terms unchanged.
*/

import CryptoKit
import Foundation

enum AppleSecureEnclaveQualification {

    struct Evidence: Codable, Sendable {

        let schema: String
        let classification: String

        let platform: String
        let algorithm: String
        let signatureEncoding: String

        let challengeBase64: String
        let publicKeyX963Base64: String
        let publicKeyX963SHA256: String
        let signatureBase64: String

        let secureEnclaveAvailable: Bool
        let signatureVerified: Bool
        let tamperingRejected: Bool

        let signingMilliseconds: Double

        let applicationBundleIdentifier: String
        let observedAt: String

        let hardwareAttestationVerified: Bool
        let independentCustodyVerified: Bool
        let productionAuthorized: Bool
    }

    enum QualificationError: Error {

        case secureEnclaveUnavailable
        case invalidChallenge
        case signatureVerificationFailed
        case tamperingAccepted
    }

    static func run(
        challengeBase64: String
    ) throws -> Evidence {

        guard SecureEnclave.isAvailable else {
            throw QualificationError
                .secureEnclaveUnavailable
        }

        guard let challenge = Data(
            base64Encoded: challengeBase64
        ), challenge.count == 32 else {

            throw QualificationError.invalidChallenge
        }

        // Temporary hardware qualification key.
        // Do not persist or export its protected representation.
        // Do not modify any existing application identity.

        let privateKey =
            try SecureEnclave.P256.Signing.PrivateKey()

        let publicKey = privateKey.publicKey

        let start = DispatchTime.now().uptimeNanoseconds

        let signature = try privateKey.signature(
            for: challenge
        )

        let elapsed =
            DispatchTime.now().uptimeNanoseconds - start

        let verified = publicKey.isValidSignature(
            signature,
            for: challenge
        )

        guard verified else {

            throw QualificationError
                .signatureVerificationFailed
        }

        var changed = challenge
        changed[changed.startIndex] ^= 1

        let tamperingRejected =
            !publicKey.isValidSignature(
                signature,
                for: changed
            )

        guard tamperingRejected else {

            throw QualificationError.tamperingAccepted
        }

        let publicBytes =
            publicKey.x963Representation

        let fingerprint = SHA256.hash(
            data: publicBytes
        ).map {
            String(format: "%02x", $0)
        }.joined()

        return Evidence(

            schema:
                "leeway.apple.secure-enclave-proof.v1",

            classification:
                "HARDWARE_TEST_ONLY",

            platform:
                "Apple",

            algorithm:
                "ECDSA-P256-SHA256",

            signatureEncoding:
                "ASN1_DER",

            challengeBase64:
                challenge.base64EncodedString(),

            publicKeyX963Base64:
                publicBytes.base64EncodedString(),

            publicKeyX963SHA256:
                fingerprint,

            signatureBase64:
                signature.derRepresentation
                    .base64EncodedString(),

            secureEnclaveAvailable:
                true,

            signatureVerified:
                verified,

            tamperingRejected:
                tamperingRejected,

            signingMilliseconds:
                Double(elapsed) / 1_000_000.0,

            applicationBundleIdentifier:
                Bundle.main.bundleIdentifier
                ?? "UNKNOWN",

            observedAt:
                ISO8601DateFormatter()
                    .string(from: Date()),

            hardwareAttestationVerified:
                false,

            independentCustodyVerified:
                false,

            productionAuthorized:
                false
        )
    }

    static func exportJSON(
        challengeBase64: String
    ) throws -> String {

        let evidence = try run(
            challengeBase64: challengeBase64
        )

        let encoder = JSONEncoder()

        encoder.outputFormatting = [
            .prettyPrinted,
            .sortedKeys
        ]

        let bytes = try encoder.encode(evidence)

        return String(
            decoding: bytes,
            as: UTF8.self
        )
    }
}
