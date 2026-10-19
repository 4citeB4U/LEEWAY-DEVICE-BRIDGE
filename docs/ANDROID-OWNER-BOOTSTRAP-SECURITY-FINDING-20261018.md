# PR #38 — Owner-bootstrap authorization security review (2026-10-18)

## Finding: BLOCKER — caller-controlled nonce on exported activity
`AndroidManifest.xml` declares `MainActivity` with `android:exported="true"`. `MainActivity.onCreate` handles the incoming extra `leeway_action="TERMUX_BOOTSTRAP"` with only a `leeway_nonce` format check delegated to `LocalBridgeServer.armOwnerBootstrap`. Unlike the sibling `POCKET_BOOTSTRAP` branch, it does not check `callingPackage`, caller signature, explicit owner UI approval, or trusted provenance of the intent.

`LocalBridgeServer.armOwnerBootstrap` accepts caller-supplied 32–128 URL-safe characters, calls `LocalAuthority.setAgentAccess(context, true)`, starts the local bridge, and arms the exact supplied nonce for 120 seconds. `LocalBridgeServer.consumeOwnerBootstrap` accepts the matching query nonce at unauthenticated loopback `GET /owner-bootstrap`, then returns `BridgeSecret.ensure(context)` as `pairingToken`. The loopback listener is local to Android, but other Android apps can ordinarily connect to 127.0.0.1 when they have network permission; loopback is not an app identity boundary.

**Risk:** A separate application capable of starting the exported activity with a chosen nonce may be able to arm the bootstrap and retrieve a persistent pairing secret over localhost, bypassing the intended owner's consent. This is a source-level potential privilege escalation/credential disclosure; no exploit against a device was executed.

## Recommended fail-closed remediation
1. Before arming, verify the caller's identity and authorize it using a protected, same-signer IPC surface or a cryptographically authenticated challenge; avoid trusting `callingPackage` alone for normal `startActivity` launches, where it may be null. Use explicit owner confirmation for cross-application bootstrap.
2. Make one-time nonce high-entropy and authority-generated/bound to the authorized request, not merely arbitrary caller-provided text; preserve short expiry and one-time consume.
3. Do not set agent access enabled until trusted authorization succeeds, and do not start a remote relay as a side effect of an untrusted intent.
4. Bind consumed response to the intended caller where feasible; avoid returning a long-lived pairing token to a channel any local application can use.
5. Add emulator-only negative instrumentation tests: third-party launch denied/no agent access; missing or malformed nonce denied; no token response; owner denial; expiry/replay; successful authorized flow with secrets redacted.

## Status
**SECURITY_REVIEW_BLOCKED**. This report is not a claim of exploit validation. No changes to production Android installation or the Fold6. Previously verified JVM 71/71 and native emulator 2/2 are not sufficient to clear this threat boundary. PR #38 stays draft.
