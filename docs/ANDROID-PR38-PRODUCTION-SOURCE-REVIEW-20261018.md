# PR #38 — Production-source review checkpoint — 2026-10-18

## Reviewed
Reviewed actual GitHub PR production patches for AndroidInstallPlan, AndroidProvisioningCompatibility, AndroidTrustedProvisioningObservation, LocalBridgeHttpHandler, LocalBridgeReadAuthorization, LocalBridgeServer, RemoteCommandRouter, and Android Gradle test-runner configuration. GitHub PR currently has **52 changed files** including reports and tests.

## Positive observations
- Android provisioning path remains observation-only; does not invoke PackageInstallBroker.installFromUrl.
- Trusted entrypoint captures a device passport at request time and deliberately passes null GPU evidence and null package plan.
- Native guarded /provisioning/plan route is subject to agent-access and bearer checks.
- Read-only plan reports NOT_EXECUTED, CPU_SAFE_FALLBACK, UNOBSERVED GPU and false automatic-install/automatic-GPU flags.
- Request handler imposes line/header bounds and rejects duplicate Authorization and unexpected body headers.
- New Android instrumentation separately checks real bearer-authenticated plan, 403/401 gates and server stop.

## Review caveats
1. GPU physical qualification and receipt verification are **not** in PR #38. A GPU qualification claim would be premature.
2. AndroidInstallPlan is a pure structural preflight; it validates HTTPS and digest **syntax**, not remote artifact authenticity, package signature, or hash match.
3. The separate /owner-bootstrap route remains nonce protected rather than bearer protected; confirm nonce generation/arm/consume threat model and permission boundary before production approval. This is a review request, not a demonstrated exploit.
4. The production HTTP server is synchronous in its accept loop with a 3-second socket read timeout; analyze local-client resource exhaustion separately if required.
5. A passing 71/71 JVM and 2/2 emulator test suite does not prove physical Fold6 signing compatibility or GPU correctness.
6. A single author-led source review is **not independent reviewer approval**; obtain a reviewer submission.

## GitHub review state
At this checkpoint GitHub returned no submitted reviews and no review threads on PR #38.

## Verdict
**SOURCE_REVIEW_COMPLETE_WITH_FOLLOWUPS; APPROVAL_NOT_GRANTED.**
Retain draft PR status and require explicit security/owner-bootstrap review, physical signer qualification, Formula and Veritas gates before production deployment. Fold6 unchanged.
