# Device Bridge relay cleanup and portable identity checkpoint

**Observed:** 2026-11-07 12:54 America/Chicago (UTC−06:00)
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`
**Base source:** `17182f84ac3ba35c63d7c59a0de988e06bc36c03`
**Scope:** active relay defaults, Android endpoint recovery, physical adapter identity defaults, and the obsolete phone workstation workflow.
**Authority:** Creator authorization already present in this conversation; canonical Device Bridge operating contract v1.2.0; sanitized source record only.

## Expected and observed

The Bridge must not identify itself with a development device, use an unowned remote relay as its default, or present a source declaration as a qualified phone connection. The live connected Device Bridge read on this date still returned only `pc-primary`, with `identitySource=REGISTRY_FALLBACK`, `identityVerified=false`, and `state=OBSERVED`. This is limited discovery, not a complete or passport-verified device roster.

The current Android source had a built-in relay address and reused it when the public manifest could not be read or had no relay address. The public relay manifest also declared a deployment and phone capability list as qualified. The phone workstation workflow targeted the retired deployment and persisted its result under the repository. Android and Apple USB adapters supplied physical serial defaults.

## Repair applied

- Removed default Android and Apple USB serials. Each native adapter now requires an explicit, validated device identity.
- Removed the default WSS address from `RelayAdapter`, remote-controller clients, the Termux qualification scripts and the phone workstation client. A remote URL must be provided by an owner-bound configuration, use WSS, and contain no embedded credentials.
- Changed the public phone relay manifest to `relayUrl: null`, `relayDeployment: NOT_BOUND`, and an empty remote capability list. Current entrypoint status no longer presents historical phone execution or model observations as current qualification.
- Changed the Android service to clear stale saved relay addresses when discovery is unavailable, invalid, or unbound. It does not fall back to an old address; the state reports `RELAY_ENDPOINT_UNBOUND` or the corresponding configuration failure.
- Changed the Termux qualification client to bind its source to the source commit in the published package manifest, and to use the current manifest version unless the owner explicitly requests a target version.
- Removed the obsolete GitHub phone-workstation command workflow. That workflow sent commands to a retired endpoint and committed execution records to the source repository; no replacement endpoint or receipt store was invented.
- Rewrote current pairing and qualification guidance in neutral terms. Dated evidence and Git history remain intact as historical records.

## Engineering loop

| Stage | State | Evidence |
| --- | --- | --- |
| Investigate | EVIDENCED | Canonical source at base commit, current repo state, current manifest, Android service/client path, adapter constructors, package workflow, and fresh Bridge device read inspected. |
| Diagnose | EVIDENCED | Stale defaults could resurrect an endpoint that returned HTTP 404; current live roster remains limited to one unverified registry fallback. |
| Plan | EVIDENCED | Remove defaults, clear persisted stale relay data, preserve a generic owner-bound adapter, stop obsolete workflow, and leave historical evidence unchanged. |
| Implement | PASS | Source, clients, manifest, current docs, focused tests and obsolete workflow updated in this worktree. |
| Test | PASS | `npm run test:mcp` 153/153; `npm run test:cli` 7/7; `node tests/remote-relay-source.test.mjs` PASS; `node tests/mcp/physical-usb-composition.test.mjs` 4/4; `node tests/physical-apple-usb.test.mjs` 3/3; `node tests/phone-workstation-desktop-commander-source.test.mjs` PASS; JSON parse PASS; normalized-line-ending `bash -n` PASS; `git diff --check` PASS. |
| Validate | OBSERVED | A fresh authenticated Bridge listing still returned only the unverified registry fallback device. Active source/documentation search returned no retired deployment identifiers outside preserved historical evidence and user-owned backups. |
| Repair | PASS | Stale address fallback, baked hardware identities, overclaimed manifest status, and the obsolete automatic workflow were removed. |
| Retest | PASS | The focused suites and checks above were run after the source changes. |
| Verify | PARTIAL | Source contract verified; Android package build and installation await the existing main-triggered Android build/publish workflow. No physical phone route was exercised. |
| Evidence | RECORDED | This sanitized checkpoint is source evidence, not a Receipt Authority execution receipt. |

## Boundaries and rollback

- Remote phone relay and remote phone capabilities are now **NOT BOUND** and **NOT QUALIFIED**. This is an accurate configuration state; it does not establish a working remote phone connection.
- C3 live conversation remains **NOT QUALIFIED**. No microphone, speaker, live phone command, Continuum receipt, independent Veritas decision, or Learning Ledger admission was produced by this repair.
- The local Gradle command is unavailable in this checkout. The existing Android Build GitHub workflow installs its own toolchain, runs Android unit tests, builds the APK, publishes the hashed package manifest, and triggers Pages verification after a `main` push.
- Current live device registration remains unresolved. The connector has not shown the creator's phones as passport-verified Bridge devices.
- Rollback is a scoped revert of this source commit. It does not require modifying device state, Git history, historical evidence, or runtime routing.

**Receipt Authority / Continuum:** no production receipt provider was invoked; `RECEIPT NOT CREATED`; `LEARNING LEDGER NOT UPDATED`.

**Next executable action:** publish the reviewed source directly to canonical `main`, then inspect the Android build/publish and Pages verification runs. Continue with the separate live device registration boundary after package publication; do not label the phone or full C3 path qualified from these source tests.

## Follow-up — bootstrap secret handling and mainline build gate

**Observed:** 2026-11-07 13:14 America/Chicago (UTC−06:00). Current source base is commit `1a0b37c9edabd8a54be3c27370f3c425c9679742` on `main`.

The first push-triggered Android Build run, [42403668977](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/42403668977), failed in `Qualify source and contracts` before Android SDK setup or Gradle. Its stale `tests/termux-one-pull-complete-source.test.mjs` assertion required the removed fixed `0.9.0` default, while the accepted client now uses the version from the verified package manifest unless an owner explicitly pins a version. The APK was not rebuilt or published by that run.

The follow-up source repair closes two related defects in the existing Termux owner-bootstrap path:

- Readiness probes validate the one-time response in process memory and discard it; they no longer save the response under the evidence directory.
- The main handoff no longer writes `owner-bootstrap.json` or evaluates response fields with shell `eval`. A strict Node parser validates status, token shape, logical device ID, and an optional owner-bound WSS URL; encoded fields travel through process stdin and are decoded in memory. The original JSON and intermediate encoded values are cleared after parsing.
- The final controller launch now exports the parsed device ID directly instead of replacing it with the unset `DEVICE_ID` variable.
- The active Termux adapter headers now name the Android capability lane without binding it to one phone model.
- The stale test now asserts manifest-sourced version selection. Parser regression cases cover valid and unbound relay responses, malformed status/JSON, invalid token and device fields, insecure URLs, and embedded credentials.

**Local evidence:** `node tests/remote-relay-source.test.mjs` passed; `npm run test:mcp` passed 153/153; `npm run test:cli` passed 7/7; the LF-normalized Bash syntax check and `git diff --check` passed. The focused parser test executes the embedded parser against positive and negative fixtures. A broader local PowerShell loop stopped abnormally after repeated child-process launches at the voice-registry test; that test and the remaining voice tests passed when rerun separately. The mainline workflow is the independent acceptance gate for the exact commit.

**Current gate:** follow-up main push and Android Build workflow are pending. No phone-side bootstrap files were inspected or removed: the fresh Bridge listing still exposes only `pc-primary` with `REGISTRY_FALLBACK` identity and `identityVerified=false`. The previous 404/phone path is not reachable through a verified phone registration in this session. Source changes prevent new copies; they do not prove historical phone artifacts are absent or erased.

**Authority boundary:** Receipt Authority main still classifies its implementation as `SOURCE CANDIDATE, NOT PRODUCTION QUALIFIED`; it directs public GitHub to hold sanitized reports only. No production receipt provider was invoked. `RECEIPT NOT CREATED`; `LEARNING LEDGER NOT UPDATED`. Formula task evaluation and independent Veritas admission were not run. Phone execution, production conversation and C3 remain unqualified.

**Next action:** commit and push the focused source/test repair directly to canonical `main`, inspect the resulting Android Build run and Pages package manifest by `sourceCommit`, then continue the separate active-repository portability cleanup. Do not infer phone registration from a successful source build.
