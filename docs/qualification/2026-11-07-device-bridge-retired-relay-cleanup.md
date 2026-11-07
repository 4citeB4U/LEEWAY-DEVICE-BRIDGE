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
