# C3 Independent Admission Binding Review — 2026-10-14

## Identity / scope
WHO: Agent Lee independent source reviewer. WHAT: audit contributor's claimed canonical admission replacement and Apple transport resolution. WHERE: E:\LeeWay-Work\device-bridge-c34-build. WHY: avoid promoting unit-test code as running C3 authority. HOW: read-only source inspection, call-site trace, unit test rerun, host socket check. No source changes or deployment.

## Verified evidence
- HEAD c29f1d5823a4fe7430ea331e5c76b53728301f31. operator/c3-admission-binding.mjs and tests/c3-admission-binding.test.mjs exist as untracked files; existing Android working changes intact.
- Executed node --test tests/c3-admission-binding.test.mjs: 9 logged invariants, Node reports 1 test file passed, 0 failed.
- CRITICAL: apps/desktop/mcp-server.mjs start() still configures Bridge with admission: async () => true. No import/use of createC3AdmissionBinding in this production entrypoint. Candidate is NOT installed as active gate.
- CRITICAL: candidate accepts caller-provided args._authorityTier and args._humanConfirmed as signals. Caller-controlled assertions are not durable human-consent or privileged tier evidence. Existing Bridge schemas may reject extraneous fields for some calls, but the candidate callback itself must not rely on these values.
- CRITICAL: candidate defaults unknown deviceId prefixes to windows platform. Verified identity or trusted platform registry binding required.
- CRITICAL: veritasPreGate defaults null and absent gate does not block. No verified canonical Formula execution or mandatory PRE attestation.
- Candidate names a C3 'canonical' binding but has no verified Root-of-Trust / Formula SHA / live Runtime Fabric hook. Source unit tests are not live governed execution.
- Windows host TCP listener on 127.0.0.1:27015 observed in latest check, PID 24320. This proves a loopback listener only. No Lockdown handshake, device identity proof, WSL authenticated tunnel, or native iPhone developer-service response was exercised in this review.

## Gate / disposition
UNIT TEST PASS, C3 LIVE ADMISSION INTEGRATION FAIL, APPLE TRANSPORT AUTH UNVERIFIED. Do not promote to canonical or deploy to physical devices.

## Required smallest repair / acceptance
1. Locate canonical runtime ingress, Formula hash, Veritas PRE and actual signed/verified consent records before editing. Preserve existing live Android and desktop behavior; prove backup/rollback.
2. Rewrite proposed admission inputs to receive authority and platform from trusted runtime/session state only; no user-supplied _humanConfirmed or _authorityTier. Unknown platforms fail closed.
3. Require verified canonical Veritas pre-gate; no optional null PASS, and no mock treated as real production authority.
4. Integration test must exercise apps/desktop/mcp-server.mjs start() wiring (not only unit provider) with denied forged consent, denied unknown platform, absent pre-gate, and real grant checks.
5. Apple Lockdown authentication and device.info read-only probe separately; 27015 TCP listen != connected iPhone developer service.
6. Validate pre/post gates, receipt provenance and Ledger provider through genuine runtime execution; do not invent PASS or ledger events.

RECEIPT NOT CREATED; LEARNING LEDGER NOT UPDATED.
