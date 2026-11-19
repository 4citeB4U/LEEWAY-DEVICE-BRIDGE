<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.RECOVERY.QUALIFICATION
TAG: LEEWAY.W01.PHOENIX.STAGING.CHECKPOINT.20261119
5WH:
WHAT = Record a non-production Genesis staging adapter toward one-onboarding, multi-device recovery.
WHY = Preserve evidence boundaries and block false claims of full disaster recovery.
WHO = Creator-approved W01 contributor; Device Bridge, Runtime, Continuum and original custodians.
WHERE = docs/qualification/2026-11-19-w01-phoenix-staging.md.
WHEN = 2026-11-19.
HOW = Source-bound restore staging, negative tests, owner/provider separation and remaining physical acceptance gates.
LICENSE = Existing repository terms; no new rights asserted.
-->
# W01 — One Setup, Many Devices / Genesis restore staging

**Mission:** Continue existing W01 / Device Bridge #109 / Extension Manifesto V2 / Genesis survival, NOT a new control plane. The original first-setup experience and all-devices-lost recovery requirement remain mandatory.

## Source boundary

Source branch: `creator/w01-phoenix-restore-staging-20261119`, based on existing unmerged `repair/extension-manifesto-v2-20261116`. Review existing extension PR #120 and competing PR #121 before any integration. Do not merge these branches independently without owner reconciliation.

**Added:**
- `operator/recovery/stage-genesis-snapshot.mjs`: a native-host integration adapter, not a new backup service. It consumes the already signed Genesis verifier, request-bound Runtime authorization callback, existing encrypted-replica provider, original Continuum decryption provider, and native per-device staging provider.
- `tests/stage-genesis-snapshot.test.mjs`: isolated fixtures for signed-owner and failure paths, **not** physical device proof.

**Safety:** Never accept browser-supplied second-factor booleans or client-supplied owner IDs as authority. Do not copy original device keys/passports, OAuth tokens or live diagnostics to replacement devices. Require distinct replacement device passport and owner grant in the original Runtime binding. A callback only counts as trusted when injected by a separately validated native composition. Only local **review staging** is requested; no automatic activation, application execution, backup-key escrow or user-data upload.

## User experience acceptance (all still required)

1. First enrolled device: complete owner onboarding, ZITADEL authentication, local capability consents, recovery key method and initial authorized backup scope.
2. New device: launch Universal Extension or trusted web recovery entry; authenticate existing owner; create **new** platform device key/passport; install signed Device Bridge; reuse prior authorized nonsecret configuration and only permissions appropriate for the new platform.
3. Recovery: the original device is unavailable. Obtain separately durable encrypted Continuum replica and independently recoverable key. Verify signed nonrollback Genesis manifest and every ciphertext chunk, decrypt inside trusted native host, stage locally, and show file/mission review **before** activation.
4. Restore: after explicit owner authorization, atomically activate scoped user data/configuration, rebuild fresh host-owned Digital Brain/Diagnostics, and resume Agent Lee from latest eligible durable checkpoint without replaying consequential actions.
5. Service independence: user retains local data and can select authorized self-owned/cloud storage adapters. No second auth/receipt/learning/Veritas authority; portable paths; account deletion or subscription exit must not silently destroy local files.

## Current classification / evidence

- Source stage adapter: **SOURCE_IMPLEMENTED** in draft PR #124, head `b2bf92077f738d094f5a842abd28eb5ff436e4b2`; GitHub readback confirmed module and test blobs. Candidate not merged.
- Automated source tests: **CI_PASS (source only)**. GitHub Actions workflow `W01 Genesis Restore Source Tests` run `44559007164`, job `135682810455`, checked out PR merge SHA `5837abffd350ba5e9644adbd0c68792fd846a033`: Node v22.23.4 syntax PASS; `node --test tests/sovereign-genesis-v1.test.mjs tests/stage-genesis-snapshot.test.mjs` **21 passed, 0 failed**, including 10 new staging tests. This is CI evidence, not physical restoration or independent Veritas. Workflow URL: https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/44559007164.
- Live native host and extension registration: **NOT_VERIFIED**.
- Off-device encrypted replica ACK and recovery key readback: **NOT_VERIFIED**.
- Replacement device authenticated enrollment; full-data restore; RPO/RTO; Agent Lee continuation: **NOT_EXECUTED**.
- Formula, independent Veritas, original Receipt Authority, Learning Ledger, production deployment: **NOT_EXECUTED**.

**Evidence FOR:** Existing signed Genesis manifest verifier and restored staging integration source; strict owner/sequence/merkle/ciphertext validation in canonical candidate source. **Evidence AGAINST:** no connected native provider, no physical cross-device restore, no independently durable replica demonstrated.

## Next acceptance gate

Owner binding: implement the real authenticated native Runtime/Device Bridge composition for `authorizeRestore`, Continuum replica/decrypt and native staging. Validate real owner/tenant isolation, grant replay denial, ciphertext corruption and lost-device revocation; then test backup readback and owner review on a second device. Do not report recovery completion until physical independent readback and Veritas/Receipt custody qualify it.

## Rollback / interruption

Candidate branch and PR can be closed without changing installed hosts or the main branch. No deployment, account changes, live key movement or service configuration are authorized by this source-only work.
