<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE_DISTRIBUTION.QUALIFICATION
TAG: LEEWAY.APPLE_20261107_ENGINEERING_LOOP_CHECKPOINT
5WH:
WHAT = Preserve the whole Apple distribution and native installer engineering cycle with source, CI, blockers and negative evidence.
WHY = Prevent source-only builds being promoted as App Store delivery, live session or independent Veritas.
WHO = Outside LeeWay support contributor; not Agent Lee. Human authority: LeeWay Creator.
WHERE = docs/qualification/2026-11-07-apple-consumer-and-native-installation.md.
WHEN = 2026-11-07.
HOW = Canonical repository readback, GitHub Actions jobs, exact unqualified execution boundaries and original PR.
LICENSE = MIT; upstream MIT sources separately credited.
-->

# Apple Device Bridge consumer distribution and native installer — engineering checkpoint

The mission is the Creator's continuing original Apple Device Bridge operation: the native LeeWay app must install normally for public customers, use Apple account sign-in as an optional customer authentication route, retain native Metal and Device Bridge, and preserve a governed native signer for development/managed-device deployment. **The native installer is not the general customer distribution mechanism.**

The working branch is `creator/apple-iloader-native-delivery-20261107`, based on `4citeB4U/LEEWAY-DEVICE-BRIDGE:main` commit `467858146fdaae7cad1f63e346d3b5010b395803` at investigation. The draft review is [PR #95](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/pull/95). This checkpoint records a *source candidate*, not a production promotion.

## 12 stages, original mission retained

| Stage | Evidenced state | Evidence / counterevidence |
| --- | --- | --- |
| INVESTIGATE | EVIDENCED | Read canonical Device Bridge Apple Swift, Rust/C3 components, the existing REA Agent Skill and upstream `nab138/iloader` / `nab138/isideload` source/license. Source iLoader `src-tauri/src/sideload.rs` calls `isideload::Sideloader::install_app`. No new REA CLI call on owner host was performed. |
| DIAGNOSE | EVIDENCED | Apple download tile linked GitHub release landing page rather than IPA; Apple native update UI treated all users as development sideload users; `operator/installation-adapter.mjs` only performed dry-run; Apple sign-in and public App Store release were not integrated. |
| PLAN | EVIDENCED | Keep a single Runtime Fabric / Device Bridge; App Store for public consumers; user-controlled developer IPA route separately; native Sign in with Apple credential checked by Runtime; optional C3-gated host signing provider; no universal local path. |
| IMPLEMENT | SOURCE COMMITTED | Direct IPA + checked release manifest; split `consumerDistribution` and developer channels; native `AuthenticationServices` sign-in and entitlement; Apple token verifier/nonce replay gate with host callbacks; `device.apps.install.apple` MCP schema through existing C3/physical adapter; `isideload` Rust worker and host provider. No existing Metal implementation removed. |
| TEST | OBSERVED PASS ON LISTED SHAS | Native Rust+Node run [42420771417](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/42420771417) passed on Windows/macOS/Ubuntu at `81a7599dc35450d7af645c562a6fb5fbb0e593e5`; iOS unsigned build [42420757590](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/42420757590) passed at `03ed73c5b6530e3d8621495232bcda7a86bf12e1`; protocol 3-OS [42420757622](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/42420757622) passed at same source SHA; dashboard run [42421089348](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/42421089348) passed at `0570e230a82bb2da348d29f85f2de28d789f587e`. Later changes need matching SHA checks. |
| VALIDATE | PARTIAL | Existing GitHub `apple-latest` unsigned IPA release has a published digest equal to the manifest. Synthetic cryptographic tests check Apple JWT and replay and synthetic host tests cover hash/consent. Those are not live Apple credentials, real physical iPhone, or an Apple-accepted App Store app. |
| REPAIR | EVIDENCED | Initial Rust build failure E0283 generic type fixed by exact `MaxCertsCallbackBox` type, later Windows/macOS/Linux cargo builds succeeded. Linux missing `dbus-1` headers repaired in CI without dropping secure keyring. Apple old PWA copy assertion repaired and dashboard passed; Apple update legacy assertion triggered Android source gate, updated to dual customer/developer labels. |
| RETEST | PARTIAL | Rust cross-platform CI, Apple unsigned CI, three-OS protocol and dashboard tests have subsequent PASS on listed SHAs. Newest Apple identity+source CI and Android after update remain subject to exact fresh readback; do not infer a pass from a superseded run. |
| VERIFY | BLOCKED — PRODUCTION | No trusted host Apple session issuer has been configured/verified, no App Store listing, no paid Apple Developer Program enrollment evidence, no physical iPhone/iPad signed install and active session proof, no independent Veritas PRE/POST and canonical receipt readback. |
| EVIDENCE | EVIDENCED — CONTROLLER ONLY | This source checkpoint and companion `evidence/installation/2026-11-07-apple-consumer-native-delivery.json` record existing commit/CI evidence and negative observations. Neither file is a canonical Receipt Authority receipt. |
| CHECKPOINT | SOURCE-COMMITTED | Keep PR #95 draft, with remaining gates preserved; do not change production `main` or publish an unapproved App Store URL. |
| CONTINUE | BLOCKED AT EXTERNAL/PHYSICAL AUTHORITY | Once actual Apple enrollment, approved distribution profile and App Store listing, authenticated identity-to-Runtime service, and physical Device Bridge provider are available, continue this same mission with upload, sign-in test, device enrollment, Metal probe, independent Veritas and receipt custody. |

## Meaningful facts for and against

**FOR — actually inspected and executed in GitHub CI:** native Swift iOS IPA build succeeds; Rust worker and source gate compiled across three operating systems; Bridge protocol test matrix succeeds; direct-IPA App Store/customer routing source tests run and pass on the listed revisions. Source-level evidence confirms iLoader reuses the `isideload` MIT Rust library and LeeWay imports that crate rather than copying iLoader's trademarked desktop UI.

**AGAINST — not concealed:** unsigned IPA is **not** an App Store distributable; a SwiftUI Apple button and entitlement do **not** establish a real LeeWay user session; the new `operator/identity/apple-session-exchange.mjs` requires an actual Runtime-backed atomic nonce consumer and authoritative session issuer before it can be mounted; a library compiled in CI is not a host-installed native worker. The host-facing physical installer is not bound to a production Runtime composition, no live Apple credentials were accessed, and actual Apple App Review publication is not observed. A read-only live Device Bridge discovery probe returned `LEEWAY_BRIDGE_DISCOVERY_REGISTRATION_UNVERIFIED`; current connector did not grant installer execution. Simulated tests are never substituted for human-authorized native commands.

## Preserved source, dependencies and authorization

- Existing Apple app bundle identity `industries.leeway.devicebridge`, Metal probe and source receipt logic were **preserved**.
- Existing Runtime Fabric C3, compliance-card, grants, owner consent and receipts remain in `Bridge.call()`; the new native provider does not mint an issuer, credential, or grant.
- `AppleSignInCoordinator` only presents Sign in with Apple when the exact HTTPS identity exchange endpoint is configured; the backend verifier validates Apple's current RS256 JWKs, nonce, issuer and app audience before delegating to Runtime.
- The Rust worker imports `isideload=0.5.2` and `idevice=0.1.68` under MIT, preserving upstream [nab138/iloader](https://github.com/nab138/iloader), [nab138/isideload](https://github.com/nab138/isideload) license attribution. No iLoader logo is copied.
- Local credential secret material, physical USB UDID and worker path are host bindings; no password, signing key, private Apple account or real device serial was committed.
- The public customer lane stays `consumerDistribution.state=NOT_PUBLISHED`; no invented `apps.apple.com` listing.

## Verification gates before production claims

1. Apple Developer Program enrollment, App ID with Sign in with Apple capability, matching distribution certificate/profile, App Store Connect app and protected release credentials must be owner-authorized and physically evidenced.
2. Mount the existing-runtime-backed Apple identity exchange handler on an authenticated HTTPS host, bind nonce replay/state and real session issuance, test invalid issuer/audience/nonce/signature/replay and authenticated live Apple sign-in without publishing credentials.
3. Compile/export a release-signed customer IPA, upload to App Store Connect, verify Apple processing, submit for actual App Review and obtain the real published listing ID and URL.
4. Prove actual iPhone and iPad installation/launch, native Metal runtime readback, Runtime enrollment, least-privilege permissions, durable operation receipts and independent Veritas POST. For the optional sideload lane, prove exact USB mapping, owner consent and signed-bundle in-place upgrade without loss of existing data.
5. Execute real performance tests for the intended concurrent user scale; no 700-user or 15-million-user scaling acceptance has been run.

**Canonical Receipt Authority:** NOT_CREATED. **Independent Veritas:** NOT_EXECUTED. **Learning Ledger admission:** NOT_UPDATED. **REA CLI against iLoader in this session:** NOT_EXECUTED. **Production App Store publish:** NOT_EXECUTED. **Physical native Apple install and Metal probe for the new build:** NOT_EXECUTED.

Rollback is a reviewed revert of PR #95 source files; the original unsigned Apple channel and legacy USB installation remain on unchanged production `main`. No production rollback or live Apple install was executed.
