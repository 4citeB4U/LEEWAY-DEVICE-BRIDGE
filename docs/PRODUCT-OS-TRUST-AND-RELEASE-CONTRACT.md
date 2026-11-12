<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.PRODUCT_SECURITY
TAG: LEEWAY.DEVICE_BRIDGE.OS_TRUST.RELEASE_CONTRACT.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Enforce product identity, honest capabilities, OS security classification and release trust from development through production.
WHY = Prevent security-warning regressions and misrepresentation of a source checkout, build artifact or invasive capability as an OS-trusted product.
WHO = Creator/Human Authority, owning Device Bridge release team, independent security/release/Veritas owners.
WHERE = docs/PRODUCT-OS-TRUST-AND-RELEASE-CONTRACT.md in LEEWAY-DEVICE-BRIDGE.
WHEN = 2026-11-12 Creator-directed product acceptance amendment.
HOW = Exact artifact threat analysis, reproducible build, permissions inventory, signing, native platform assessments, warning triage, independent physical readback and production gate.
LICENSE: Existing repository terms remain unchanged.
-->
# LeeWay Device Bridge — Product Definition, OS Trust and Release Acceptance

**Authority:** Approved LeeWay Standards main and R01–R25, original engineering and device operator laws. This is a product-specific supplemental contract; it does not create an issuer, verifier, alternative Runtime, security scanner or separate receipt ledger. **Implementation status:** release acceptance specification under repository review; not proof any installer is safe, signed, trusted, deployed or correctly classified.

## What the complete product produces
A source-pinned, legitimately distributable, understandable, least-privileged native or web product which lets *authorized* LeeWay workers observe, communicate with and operate devices only through existing Runtime, Device Bridge, OS and Creator-approved permission boundaries. For every shipping platform provide:
1. A consistent product identity (publisher legal identity, app display name, package/bundle ID, version/build, support URL, privacy policy, update origin).
2. A source-to-artifact trace (commits, dependency lock, build provenance, SBOM, independent license/security review, signed package, cryptographic digest and release manifest).
3. Explicit feature and permission inventory with user-visible reason, runtime consent, OS-provided prompt, revocation path, stop indicator and state changes, including screen/camera/mic/Accessibility, files, install, remote access and device command execution.
4. Correct update/uninstall/rollback behavior; no covert persistence, privilege escalation, hidden recording, OS-protection disablement, self-modifying signed package or unsanctioned code downloads.
5. Native distribution and post-install operational evidence for each claimed platform; distinguish **SOURCE_ONLY**, **BUILT_UNSIGNED**, **SIGNED**, **PLATFORM_DISTRIBUTED**, **OWNER_INSTALLED**, **RUNNING_OBSERVED**, **INDEPENDENTLY_QUALIFIED**.
6. Authentic host identity, bounded worker/cognition/skill/grant binding, separate Formula/Veritas/Receipt/Continuum/Learning and Production decisions; legitimate OS restrictions remain absolute boundaries.

## What the product must never be presented as
- No claim of unrestricted, silent iOS control, installation, background recording, permission bypass or automatic entitlement gain.
- No description of an HTML page/PWA, simulated relay, local checkout, unsigned iPhone compile, APK download or passing CI as a verified native desktop/phone execution path.
- No claim that “signed”, “GitHub-hosted”, “SHA-256 matches” or “antivirus scan passed” means malware-free, universally trusted, independently Veritas-qualified or guaranteed warning-free.
- No “fully autonomous”, “conscious”, “production-ready”, “secure” or “certified” claim without applicable defined external and internal evidence. Machine Consciousness is a deterministic governance substrate; hidden model internals cannot be asserted as transferred.
- No removal, concealment, suppression, reputation gaming or social-engineering bypass of Windows Defender/SmartScreen/Smart App Control, Android Play Protect, Apple Gatekeeper/notarization/App Review, host EDR or user consent.
- No forced security exclusions/disablement, stealth persistence, clipboard/password extraction, opaque installer scripts or unconsented accessibility automation. On true threat classification: HOLD distribution, inspect artifacts and behaviors, repair and retest before requesting independent review.

## OS warning triage — mandatory evidence record
Each warning is an incident, not a cosmetic inconvenience. Preserve exact original warning text, screen image when lawfully available, OS/version/browser/protection product and engine version, timestamp, package URL/channel, SHA-256 of **actual downloaded bytes**, exact build source/manifest, signer/identity and certificate chain, detection rule/name, host consent status, installer steps, runtime behaviors and evidence FOR and AGAINST. Protect personal data. Record classifier as:
- `LOW_REPUTATION_OR_UNKNOWN_PUBLISHER` (including unsigned, mismatched or new publisher)
- `MALWARE_OR_PUA_DETECTION` (including potentially unwanted app behavior)
- `INVALID_SIGNATURE_OR_NOTARIZATION`
- `MISSING_PERMISSION_OR_OS_POLICY`
- `TAMPERED_OR_UNKNOWN_ARTIFACT`
- `UNCLASSIFIED_REQUIRES_TRIAGE`

A hash alone cannot explain why the OS warned. Missing warning sample or release bytes = **ROOT_CAUSE_UNVERIFIED**. A claimed false positive needs an actual reviewed case and classification; never auto-label it false merely because the software was self-developed. Report case/result with original vendor reference and outcome.

## Platform-specific release gates

### Windows — Microsoft Defender, SmartScreen, Smart App Control
Current Device Bridge package-update protocol identifies Windows as `SOURCE_ONLY`, not a released native installer. When a Windows installer exists: inspect application and bootstrap behavior, generate verifiable binary/package identity, Authenticode-sign all distributable EXE/MSI/MSIX and relevant executables, timestamp, verify signer and exact hash *after final packaging*, run Defender/security scans and clean Windows install/uninstall/update with UAC/Smart App Control/SmartScreen observations. Preserve installer/OS screenshots. For Microsoft Store MSIX use its certified distribution path; for direct delivery use a verifiable code-signing identity and allow reputation to develop without manipulating protections. A legitimate signed new file may still trigger an unfamiliar-app warning. If Defender detects malware/PUA, submit the exact artifact via Microsoft Security Intelligence developer submission and track the verdict; that is distinct from automatic SmartScreen reputation building.

### Android — Play Protect, app permissions, APK
Validate release signing identity and continuity, package name/versionCode, signed APK/AAB integrity and source, declared AccessibilityService/camera/mic/files/notification/device-admin permissions, explicit user purpose and opt-in/opt-out controls. Verify behavior without granted permission remains blocked. Test Play Protect classification on representative devices, on-device install and update, owner stop, data deletion, network operations, reboot/reconnect, and uninstall. For actual misclassification after policy/security review, submit a Play Protect appeal. A debug-signed APK, a SHA match, user-chosen sideload or installer UI alone is not production qualification.

### Apple iPhone/iPad — iOS constraints and authorized signing
Source compilation with signing disabled is not a distributable signed iPhone application. Qualify actual Apple developer signing/provisioning, entitlements, deployment target, explicit privacy strings and user consent, Apple-authorized TestFlight/App Store or approved installation route (including documented iLoader limitations), physical device install and tested native capability. iOS sandbox and approved API limitations remain controlling; do not claim arbitrary cross-app device takeover, stealth recording or silent app replacement. Record TestFlight or App Review results and hardware probes separately. Apple's **macOS Gatekeeper notarization is not an iOS IPA validation substitute**.

### macOS and Linux — release profiles if/when packaged
Present source-only status honestly until native distributables exist. For direct macOS distribution require Developer ID signatures, hardened runtime, relevant notarization, stapled ticket verification, TCC/Accessibility/Screen Recording consent, installation and upgrade/uninstall. Linux packages require provenance checks, trusted repository/package metadata where distributed, correct dependencies and permissions, confinement/portal/polkit behavior, clean install, update and removal. Do not claim all platforms share the same permission model.

## Mandatory release assembly-line gates
| Gate | Owner / work | Expected decision | Required evidence |
| --- | --- | --- | --- |
| PT-00 product truth | Product/Creator and governing Standards | Definite supported vs prohibited claims per platform | Feature/capability matrix and owner-approved scope |
| PT-01 source supply chain | Engineering/security | No undisclosed executables, unsafe dependencies, hidden privilege requirements | Pinned source, lockfile, SBOM, license/secret/unsafe behavior scans |
| PT-02 build and package | Platform owner | Reproducible or explainably traceable artifact built under authorized CI | Exact commit/toolchain/dependency/build artifact identities |
| PT-03 code signing | Platform signing owner | Authentic verified publisher and package chain, no secrets in logs | Signing identity, cryptographic verification, timestamp where applicable |
| PT-04 static/dynamic threat review | Security team | Unresolved threats, suspicious behaviors and privacy deviations halt release | Defender/Play Protect/OS checks, sandbox/telemetry and negative evidence |
| PT-05 consent + accessibility + privacy | Device and OS owner | Scope is clear, bounded, revocable and uses declared OS permissions | Permission prompts, denial tests, audit/kill switch/revocation |
| PT-06 download and install reputation | Release/OS integration | Correct warning class handled; no high-severity unresolved classifications | Actual downloaded bytes SHA, URL, publisher, warning or clean install evidence |
| PT-07 device function truth | Device Bridge/Runtime | Claimed native capabilities work on real hardware | Platform/device version, actual post-state, negative and restart tests |
| PT-08 update/remove/recovery | Product operations | Package changes correctly without forced persistence/data loss | Update and downgrade/rollback decision, uninstall/reinstall, recovery proof |
| PT-09 independent governance | Veritas/Receipt/Continuum/Learning/Production originals | Qualified scope only, no self-certification | Authentic PRE/POST decisions, eligible receipt/readback, release decision |
| PT-10 release and monitoring | Release/operations owner | Product actually shipped and observed; incident/recall/withdrawal capability | Signed release manifest, public download verification, monitored classifications, release rollback |

**Fail closed:** Any actual malicious/PUA classification, invalid/tampered signature, unauthorized permission request, misleading shipped claim or unreviewed security-critical behavior blocks public release of that artifact. Unknown/low file reputation is not automatically equivalent to malware; it nevertheless requires truthful disclosure, evidence and owner-approved distribution decisions. No unconditional “zero OS warnings forever” claim is defensible.

## Owner acceptance record and release states
For every `product-platform-version-artifact` record: owner/mission, affected code/build source, package hash, signing identity, platform distribution route, OS tests, warnings and severity, security review, permission matrix, real native installed/running observations, known unsupported capabilities, required release gates, reviewer, correction status, vendor case IDs, rollback, independent production handoff. Missing = NOT_OBSERVED/NOT_EXECUTED; never replace with invented hashes or badges.

**Release states:** `SOURCE_ONLY` → `BUILD_VERIFIED` → `SIGNED_VERIFIED` → `OS_POLICY_REVIEWED` → `DEVICE_INSTALLED_OBSERVED` → `INDEPENDENTLY_QUALIFIED` → `AUTHORIZED_RELEASED`, conditional on all applicable gates. A label is not an issuer.

## Owner / vendor references
- Existing owner: [Device Bridge package update protocol](PACKAGE-UPDATE-PROTOCOL.md), [Device Operator](DEVICE-OPERATOR.md), [Apple adapter](APPLE-DEVICE-BRIDGE-ADAPTER.md), [installation adapter](../operator/installation-adapter.mjs).
- [Microsoft SmartScreen application reputation](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation)
- [Microsoft Security Intelligence false-positive submissions](https://www.microsoft.com/en-us/wdsi/filesubmission)
- [Google Play Protect warning guidance and appeals](https://developers.google.com/android/play-protect/warning-dev-guidance)
- [Android app signing](https://developer.android.com/studio/publish/app-signing)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple macOS notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
