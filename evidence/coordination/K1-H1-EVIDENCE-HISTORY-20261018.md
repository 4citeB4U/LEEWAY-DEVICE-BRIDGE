# K1-H1 Evidence History — 2026-10-18

**Work ID:** `K1-H1-20261018-HISTORY`  
**Role:** K1 evidence historian  
**Scope:** read-only reconciliation of the canonical `LEEWAY-DEVICE-BRIDGE` repository, its contributor ledger, Apple and installation evidence, and Issue #37.  
**Privacy rule:** this report intentionally excludes account addresses, certificate serials, machine identifiers, device identifiers, pairing material, credentials, tokens, and Anisette data.

## Method and classification

The audit followed the required loop: inspect repository state and history, compare source documents with Issue #37 and evidence artifacts, classify each finding, then record unresolved gates.  A source file, GitHub Actions build, screen capture, host observation, and external verification are separate evidence classes.

| Class | Meaning in this report |
| --- | --- |
| **SOURCE** | Versioned repository source or documentation exists at the cited commit/path. |
| **BUILD QUALIFIED** | A recorded macOS/CI build or package-integrity result passed. |
| **PHYSICAL OBSERVATION** | A device or host result was observed, without promoting it to independent verification. |
| **PENDING / UNVERIFIED** | An authority, install, launch, verification, or runtime claim lacks the required fresh evidence. |

## Canonical authority recovered

| Item | Result | Evidence |
| --- | --- | --- |
| Repository identity | **VERIFIED** — `4citeB4U/LEEWAY-DEVICE-BRIDGE`; default branch is `main`. | GitHub repository metadata; local `origin/main`. |
| Reviewed head | **VERIFIED** — local history head and `origin/main` include `18839d5ee14838ea9d99d154189b0d8b288b9e61` (`Add K1 K2 contributor coordination ledger`). | `git log`; [CONTRIBUTORS.md](../../CONTRIBUTORS.md). |
| Coordination authority | **SOURCE** — K1 owns integration/evidence review; K2 owns native Apple preflight. K1-H1 is constrained to this new evidence file. | [CONTRIBUTORS.md](../../CONTRIBUTORS.md). |
| Installation design authority | **SOURCE** — Issue [#37](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/issues/37) defines the non-executing adapter contract and requires platform-native authorization. | Issue #37 body and comments; [docs/INSTALLATION-ADAPTER.md](../../docs/INSTALLATION-ADAPTER.md). |

## Chronological evidence record

### 2026-10-17 — Safari PWA lane

| State | What the record supports | Evidence |
| --- | --- | --- |
| SOURCE / BUILD PUBLICATION | The Device Bridge PWA was published through GitHub Pages and its Apple-browser diagnostics source was committed. | Commit `72799ef8b2846bff80184c8376fe3ec7d0845e4a`; [G19-APPLE-PWA-PUBLICATION-VERIFICATION-20261017.md](../apple/G19-APPLE-PWA-PUBLICATION-VERIFICATION-20261017.md); [docs/APPLE-PWA-DEVICE-BRIDGE.md](../../docs/APPLE-PWA-DEVICE-BRIDGE.md). |
| PHYSICAL OBSERVATION | The evidence set records a Safari PWA/browser readback observation on the physical iPhone. | [G19-PHYSICAL-IPHONE-WEBGPU-READBACK-20261017.md](../apple/G19-PHYSICAL-IPHONE-WEBGPU-READBACK-20261017.md) and its adjacent JSON artifact. |
| LIMIT | Browser/WebGPU evidence is not direct native Metal, Formula, Veritas, Runtime Fabric, or model-inference evidence. | [docs/APPLE-PWA-DEVICE-BRIDGE.md](../../docs/APPLE-PWA-DEVICE-BRIDGE.md). |

### 2026-10-18 — native Apple package and Metal evidence

| State | What the record supports | Evidence |
| --- | --- | --- |
| BUILD QUALIFIED | A LeeWay-owned unsigned iOS IPA layout and macOS build path passed in CI. This establishes source compilation and package layout only. | Commits `bbe5d780ec4e5385839435c2c643655e57ccdb20`, `9da1baee43b5c1505c52f8b7ea8eb8678419d773`; [G19-APPLE-NATIVE-IPA-DELIVERY-20261018.md](../apple/G19-APPLE-NATIVE-IPA-DELIVERY-20261018.md). |
| PHYSICAL OBSERVATION | A physical iPhone running the native Device Bridge displayed a local Metal readback with 256 lanes and zero mismatches. The record identifies `leeway.operator.ios` and retains its local-only state. | Commit `43b31b9538d1e2e605c62281d54f17c716baeb2d`; [G19-IPHONE11-NATIVE-METAL-READBACK-20261018.md](../apple/G19-IPHONE11-NATIVE-METAL-READBACK-20261018.md). |
| PHYSICAL OBSERVATION + LOCAL INTEGRITY | A local receipt artifact exists; its documented SHA-256 replay matched the locally generated evidence and receipt hashes. | Commits `5549166b11d7a49f4196b2b9ab60f9d3f903a7e1`, `5b82547ed0a9579f61f30f530550ab9444d14b9c`; [G19-IPHONE11-LOCAL-METAL-RECEIPT-OBSERVED-20261018.md](../apple/G19-IPHONE11-LOCAL-METAL-RECEIPT-OBSERVED-20261018.md); [G19-IPHONE11-LOCAL-RECEIPT-INTEGRITY-20261018.md](../apple/G19-IPHONE11-LOCAL-RECEIPT-INTEGRITY-20261018.md); [receipt artifact](../apple/artifacts/iphone11-metal-receipt-20261018.json). |
| PENDING / UNVERIFIED | The receipt itself remains `PENDING_EXTERNAL_VERIFICATION`. No canonical verifier decision, Formula evaluation, Runtime Fabric consumption, model inference, or Learning Ledger update is recorded. | [docs/APPLE-NATIVE-RECEIPT-PROTOCOL.md](../../docs/APPLE-NATIVE-RECEIPT-PROTOCOL.md); receipt artifact above. |
| BUILD QUALIFIED | A later `0.1.27` / build `27` Apple release candidate was built, published, and its IPA digest matched the release manifest. | Commits `231db31095fdef31c5066bf37e6757a92f2de4cf`, `17d5b11eb74d75b6e8919868b34f439fe99e079b`; [G19-DIRECT-ILOADER-ACCEPTANCE-20261018.md](../apple/G19-DIRECT-ILOADER-ACCEPTANCE-20261018.md); [docs/APPLE-DIRECT-ILOADER-DELIVERY.md](../../docs/APPLE-DIRECT-ILOADER-DELIVERY.md). |
| PENDING / UNVERIFIED | The later release candidate still requires a fresh owner-approved physical install, installed-version observation, launch, new native probe, and independent receipt verification. | [G19-DIRECT-ILOADER-ACCEPTANCE-20261018.md](../apple/G19-DIRECT-ILOADER-ACCEPTANCE-20261018.md). |

### 2026-10-18 — delivery, platform interface, and installation planning

| State | What the record supports | Evidence |
| --- | --- | --- |
| SOURCE | The PWA interface was reorganized into Apple, Android, Windows, and Linux lanes. Raw diagnostic JSON was moved behind a technical-evidence control. | Commit `92047100ab3c2696ee2b3e48923c8dad14d53f99`; [G19-DEVICE-BRIDGE-PLATFORM-CONSOLIDATION-20261018.md](../apple/G19-DEVICE-BRIDGE-PLATFORM-CONSOLIDATION-20261018.md). |
| SOURCE | The direct iLoader route is documented as a Windows USB delivery fallback while SideStore phone-side sign-in remains a separate problem. iLoader persisted setup is described without claiming perpetual Apple authorization. | Commits `40e5cc69e4da04386631f8aa27141d209f7a1bed`, `9f9eb7ac35047e146feb7bed8168ab98e0eb43b7`; [docs/APPLE-DIRECT-ILOADER-DELIVERY.md](../../docs/APPLE-DIRECT-ILOADER-DELIVERY.md); [docs/ILOADER-PERSISTENCE.md](../../docs/ILOADER-PERSISTENCE.md). |
| FAILED / BLOCKED | SideStore phone-side Apple-account sign-in remains blocked after the documented repair attempts. This does not invalidate direct iLoader package evidence or native Metal observation. | [G19-SIDESTORE-AUTH-RECOVERY-20261018.md](../apple/G19-SIDESTORE-AUTH-RECOVERY-20261018.md); [docs/APPLE-SIDESTORE-PREFLIGHT.md](../../docs/APPLE-SIDESTORE-PREFLIGHT.md). |
| SOURCE + TESTED DRY RUN | The Installation Adapter performs deterministic probe/classify/plan routing only. It has no install, verification, or rollback executor. Platform selectors for Apple, Android, Windows, macOS, and Linux are dry-run classification coverage. | Commits `c09a6cf980760c746a7030f14af10c04757244b4`, `3f5f19c6fcdfa1a058086e79f0d55bf20670a410`; [operator/installation-adapter.mjs](../../operator/installation-adapter.mjs); [docs/INSTALLATION-ADAPTER.md](../../docs/INSTALLATION-ADAPTER.md); [G19-INSTALLATION-ADAPTER-DISCOVERY-20261018.md](../installation/G19-INSTALLATION-ADAPTER-DISCOVERY-20261018.md). |
| PHYSICAL HOST OBSERVATION | The read-only Windows observer saw local iLoader-state markers, a USB Apple-device marker, and an iLoader process. It deliberately did not inspect credentials, certificates, provisioning, or account authorization. The plan correctly stopped at `APPLE_ACCOUNT_AUTH_NOT_OBSERVED`. | Commit `81b61bf5abcca8173cf95415f0c05e449151282f`; [operator/windows-iloader-observer.mjs](../../operator/windows-iloader-observer.mjs); [G19-WINDOWS-ILOADER-READONLY-OBSERVATION-20261018.json](../installation/G19-WINDOWS-ILOADER-READONLY-OBSERVATION-20261018.json). |
| PENDING / UNVERIFIED | Current Apple account authorization, signing identity validity, certificate state, profile/device/bundle/entitlement compatibility, target identity binding, and a fresh physical install are not observed by the committed observer. | [CONTRIBUTORS.md](../../CONTRIBUTORS.md); Issue #37; observer evidence above. |

## Issue #37 reconciliation

Issue #37 is an active architecture and coordination record. Its comments add useful work from other contributors, including a fail-closed candidate for an earlier untracked Apple physical-adapter source and a draft Android planning increment. Those comments are **not automatically canonical Device Bridge implementation**.

| Finding | Classification | Required treatment |
| --- | --- | --- |
| Earlier physical Apple adapter accepted a nonexistent requested target via a generic USB fallback. | FAILED negative identity test, reported in Issue #37. | Do not use it as an installation readiness signal. K2 must preserve exact-target fail-closed behavior in any tracked implementation. |
| A repaired candidate passed two negative tests in isolated staging. | OBSERVED isolated candidate only. | It needs reviewed source ownership, tracked implementation, and positive/negative tests before promotion. |
| Draft Android plan tests were later reported as passing in a separate PR. | OBSERVED PR-level/JVM evidence. | It is not proof of a governed runtime endpoint or physical Android installation. |
| Committed installation adapter and Windows observer. | VERIFIED as repository source and local test evidence. | They remain non-executing and cannot authorize a physical install without fresh supporting facts. |

## Discrepancies and evidence limits

1. **Physical package version binding is incomplete.** The observed native Metal readback is tied in its evidence file to an earlier package source revision, while the later `0.1.27` / build `27` release candidate has its own source revision and digest. The repository does not contain a fresh physical install/launch/probe record that binds the later release candidate to the physical receipt. Treat the Metal observation as proof of an earlier native package lane, not proof that the latest release candidate ran.
2. **Local receipt integrity is not external verification.** Recomputed local hashes establish internal consistency of the exported record only. They do not substitute for a signature, trusted issuer, Veritas decision, or authorized receipt endpoint.
3. **Observed iLoader markers are not signing authority.** Local state, selected server, account record, USB marker, and a running process do not establish current Apple authorization, usable signing identity, certificate acceptance, provisioning compatibility, or target trust.
4. **SideStore and iLoader are separate authentication surfaces.** The documented SideStore failure is a phone-side blocker. It must not be used to infer a broken LeeWay IPA, and a successful iLoader session must not be used to infer SideStore sign-in success.
5. **Desktop and Linux lanes remain planner-only.** The Installation Adapter selection tests do not qualify a native installer, package launch, rollback, or physical device state for Windows, macOS, or Linux.
6. **Issue comments can conflict with current tracked source.** Work described in Issue #37 may be in isolated directories, draft PRs, or other worktrees. K1 should only merge work after confirming its repository path, commit, tests, and compatibility with the current `main` implementation.

## Current gate table

| Gate | State | Evidence / reason |
| --- | --- | --- |
| Canonical repository and K1/K2 roles | VERIFIED | [CONTRIBUTORS.md](../../CONTRIBUTORS.md), commit `18839d5`. |
| PWA browser lane publication | VERIFIED as publication; physical browser behavior separately observed | Apple PWA evidence cited above. |
| Native iOS source build/package | VERIFIED for recorded artifacts | Apple build and package evidence cited above. |
| Native Metal local readback | PHYSICAL OBSERVATION | iPhone evidence and local receipt cited above. |
| Local receipt integrity replay | VERIFIED locally | Receipt integrity evidence cited above. |
| External receipt / Veritas | PENDING | No authorized verifier decision recorded. |
| Latest Apple release physical qualification | PENDING | Release package has no fresh linked install/launch/probe evidence. |
| Apple signing/profile authorization | NOT OBSERVED by committed observer | Read-only observer intentionally omits it. |
| Installation Adapter planner | VERIFIED source and fixture behavior | Commits `c09a6cf`, `3f5f19c`. |
| Physical installation through new adapter | NOT EXECUTED | Execution methods remain stubs. |
| Formula / Runtime Fabric / model inference | NOT EXECUTED | No qualifying evidence in this audit. |

## K1 handoff

K1 should use this report as the baseline when reviewing K2's preflight design. The next shared acceptance gate is not another planner: it is a supported, non-secret, read-only Apple preflight evidence source that can prove or fail closed on authorization and profile compatibility for one intended package and one owner-selected physical target. A physical install remains separate, owner-approved work after that gate.

**Receipt state:** no new runtime receipt was created by this history audit.  
**Learning Ledger state:** not updated by this history audit.
