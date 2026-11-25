<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.IDENTITY.OWNER_ISSUANCE_GUIDANCE
TAG: LEEWAY.DEVICE_BRIDGE.WINDOWS_PASSPORT_ISSUANCE_CANDIDATE.V1
5WH:
WHAT = Define native-only signing and verification for the existing LeeWay Windows device passport.
WHY = Recover missing owner-signed enrollment without static trusted flags or development credentials.
WHO = Creator-approved Windows signer custodian, Device Bridge code owner, independent Veritas reviewer.
WHERE = LEEWAY-DEVICE-BRIDGE/docs/qualification/OWNER-WINDOWS-PASSPORT-ISSUANCE-CANDIDATE.md
WHEN = 2026-11-22; continuation of Engineering issue #6 and Device Bridge issue #109.
HOW = Locate the existing passport first; otherwise sign through the existing trusted issuer after fresh CIM verification.
LICENSE = Existing repository terms; no new license asserted.
-->

# Owner-signed Windows device passport — native issuance candidate

STATUS: SOURCE-ONLY / NOT EXECUTED ON NATIVE OWNER HOST / NOT PRODUCTION-QUALIFIED.

## Original authorities and data ownership

The Windows source-bound adapter and verifier are in operator/windows-pc-primary.mjs. The public-key issuer registry is operator/trusted-issuers.json. The issued passport is private owner-controlled device-identifying evidence, never a GitHub source artifact. Private signing keys never belong in GitHub, an issue, an MCP response, a copy/paste handoff or a ChatGPT conversation.

Existing registry/trusted-device-registry.json contains only registration metadata and a digest: it does NOT prove a currently valid signed passport. Its historical digest must not be trusted or retained as a newly issued passport digest without proving which canonical hash function originally produced it.

WARNING: operator/identity/windows-passport-verifier.mjs uses a separate ownerId/hardwareUid document and calculates an unsigned-payload digest. The original CIM-bound Windows adapter requires ownerSubject, actual CIM/BIOS observation and a full signed-passport hash. Do not exchange those document formats or digests without owner-reviewed interoperability tests.

## Before issuance

Search the existing enrolled owner-controlled passport location or custody artifact ID and verify its signature and expiration. Copilot's previous bounded native search did not find an approved passport; some searches timed out, so absence is not fully proven.

The Creator or authenticated custodian must explicitly confirm the correct OIDC subject and the existing original issuer signing key. A development key, test fixture or self-created duplicate issuer is not approval. If no approved private signer exists, STOP as OWNER_APPROVED_SIGNER_FILE_NOT_FOUND and request custody/issuer authorization. The signing source does not generate keys or trust roots.

For native Windows issuance, create a private JSON request outside the source checkout (replace every placeholder with owner-verified values):

    {
      "deviceId": "<actual-approved-windows-device-id>",
      "ownerSubject": "<verified-owner-OIDC-subject>",
      "issuerId": "leeway.runtime.carrier.v1",
      "keyId": "carrier-ed25519-key-001",
      "ttlSeconds": 86400
    }

Run the existing repository's candidate issuer ONLY on the Windows device being enrolled:

    node operator/identity/owner-windows-passport-issuance.mjs ^
      --request "<secure-local-request-json>" ^
      --issuer-registry "operator/trusted-issuers.json" ^
      --signer-file "<existing-approved-local-signing-key-pem>" ^
      --output "<secure-local-signed-passport-json>"

The example uses Windows cmd.exe continuation syntax. In PowerShell, put the command on one line or use a PowerShell backtick for each continuation. The approved signing file path is a local owner-custody input, NOT a published repo or a universal system identity.

The issuer validates request identity, existing issuer/key ID, expiry and TTL. The Windows host identity is read through the original CIM observer. The private signer is read only in the native process, never printed, and the signing input Buffer is cleared. The newly signed document is verified immediately with the original Windows adapter, then written to a new owner-local path with exclusive creation and no overwrite. Production Windows ACL and signer custody require owner-side checks; posix mode 0600 is not Windows ACL proof.

A successful local tool response states SIGNED_PASSPORT_CREATED_LOCAL and productionQualified:false. It DOES NOT enroll a device into Runtime, activate a listener, change credentials, satisfy Formula/Veritas/Receipt, publish a passport or authorize production.

## Next existing acceptance gate

After native issuance or discovery, the custodian reads the passport back and independently verifies owner, device ID, signed-document hash, live CIM/BIOS host identity, active issuer, key status, current expiry, wrong-signature denial, wrong-owner denial and wrong-host denial. Only use createTrustedWindowsRegistryRecord(verifiedAdapterObservation) to create a registry entry. Never set identityVerified directly from a static hash, saved name or development passport.

The existing host must then bind the verified adapter record to its original Runtime-owned deviceRegistry, real Formula and independent Veritas providers, Receipt Authority, consent, and replay guard. Run native loopback and negative tests; only then attempt authenticated hosted bridge_devices, bridge_device_health and bridge_device_info, with actual device reachability and independent receipts. If any original authority is unavailable, keep that gate BLOCKED and continue independent Model Hub/Tablet/Voice/Vision work.

No deployed route change, issuer migration, new issuer, private key creation, production promotion or live hardware execution is claimed by this source candidate.
