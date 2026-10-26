# LeeWay GPU as a Service — Device Bridge platform and integration contract

Status: CANONICAL DESIGN REQUIREMENT; NOT YET FULLY IMPLEMENTED OR ACCEPTED.
Date: 2026-10-19
Owner: LeeWay ecosystem / Device Bridge and LeeWay Edge GPU integration.

## Platform scope
- PRIMARY: Microsoft Windows — native D3D12 backend, physical NVIDIA/Intel adapters where qualified.
- PRIMARY: Android — native Vulkan backend, including Qualcomm Adreno devices where qualified.
- ADDITIONAL: Linux — Vulkan-first backend, CONDITIONAL on platform/device-specific native qualification; do not report Linux support as verified yet.
- One LeeWay GPU service identity and cross-platform contract; independent backend implementation and device-local diagnostics for each OS. Hardware acceleration over existing physical GPUs is not by itself proof of an OS-enumerated LeeWay GPU adapter or a WDDM driver.

## Required GPU-as-a-Service integration (not optional)
1. Device Bridge discovers and provisions each supported device, records trustworthy OS/GPU capabilities, driver/backend availability, memory budgets, permissions, native backend version/digest, and lifecycle health. Do not infer support or grant execution from discovery.
2. Runtime Fabric owns request-correlated execution authorization and the trusted GPU-specific issuer/verifier. Require exact request ID, workload digest, adapter/device identity, operation, budget, expiry, cancellation, and durable replay protection. Refuse execution when unbound.
3. LeeWay Formula evaluates THAT workload under the verified request; preserve formula ID, mapping, decision and evidence identity. Golden fixture PASS is not workload authorization.
4. LDWMD is the authoritative working-memory / VRAM admission and physical-allocation lease owner. A real lease must cover the resources submitted to the GPU; accounting-only tests are not physical proof.
5. Continuum retains persistent state, tensors, lineage and lifecycle as its own authority. Continuum must not be substituted for LDWMD working memory; coordinate lease/retention using the request identity.
6. LeeWay GPU execution service routes to Windows D3D12, Android Vulkan, or verified Linux Vulkan. The command and buffer allocation must be traced to the same request and physical lease; verify actual readback independently, reject CPU fallback when forbidden.
7. Canonical Veritas independently validates authority chain, readback, receipt linkage and freshness before issuing an authentic receipt. Learning Ledger ingestion follows verified acceptance, never synthetic PASS.

## Device Bridge projection
Expose platform/backend status independently of governance status. Required states: DISCOVERED, BACKEND_UNQUALIFIED, BACKEND_PHYSICALLY_VERIFIED, GOVERNANCE_UNBOUND, GOVERNED_EXECUTION_VERIFIED, and BLOCKED; never collapse partial proofs into service completion. Publish discovery/updates to Runtime Fabric Discovery Registry and give diagnostics device-local backend and memory facts without secret-bearing grants or keys.

## Evidence boundary at authoring
- Windows native D3D12 NVIDIA + Intel 262144 elements each and zero mismatches qualified in isolated evidence; GPU service governance NOT VERIFIED.
- Fold6 Android Adreno Vulkan physical compute readback previously qualified, but model inference / governed GPU-service end-to-end is NOT QUALIFIED.
- Linux native LeeWay GPU execution NOT QUALIFIED.
- Canonical Runtime Fabric GPU issuer/verifier, request-specific Formula decision, physical LDWMD lease to governed dispatch, Continuum lineage binding and canonical Veritas receipt remain OPEN acceptance gates.

## Architecture law
LeeWay GPU as a Service = Device Bridge + Runtime Fabric authorization + LeeWay Formula + LDWMD working memory + Continuum persistent memory + physical platform GPU execution + canonical Veritas evidence. Completion may be claimed only when an end-to-end real workload satisfies the full chain on each claimed platform. Device/system/model agnostic; no mandatory LLM or paid third-party service.
## 2026-10-19 engineering evidence update
- Isolated native Windows D3D12 request-correlated diagnostic built and executed on the NVIDIA RTX 5060 Laptop GPU: request ID, adapter LUID and compiled deterministic workload hash matched; 262,144 verified results, zero mismatches; wrong hash and missing arguments returned rejection code 4. This is still UNQUALIFIED DIAGNOSTIC execution, not governed service dispatch.
- Sixteen real GPU dispatch observations with measured dispatch/fence latency between 393 and 605 microseconds were recorded under E:\LeeWay-Work\evidence-staging\gpu-integrated-audit-20261019\d3d12-correlated\gpu-16-observations.json.
- The installed canonical LEEWAY-FORMULA-v1.0 service executed successfully over the 16 observed runtime-state rows and issued a Formula calculation receipt, NOT an authorized GPU workload scheduling decision. Mapping of measured Q,V,H,R,S,L GPU attributes remains PROVISIONAL; there is no authenticated pre-dispatch GPU grant, no LDWMD physical lease linked to those D3D12 resources, no owner-authorized Continuum lineage write and no independent canonical Veritas execution receipt.
- The executable labels its own output runtimeFabricAuthorized=false, physicalLeaseBound=false, formulaWorkloadDecisionBound=false, canonicalVeritasReceiptIssued=false.
- Keep mandatory ecosystem-wide GPU execution activation disabled until complete production chain qualifies. No OS-wide GPU driver claim.

## 2026-10-19 same-resource D3D12 integration milestone (local diagnostic only)
The isolated ldwmd-d3d12-candidate connected the existing LeeWayDeviceWorkingMemoryDatabase hardware-adapter allocation/free interface to a native D3D12 compute process. A single ID3D12Resource DEFAULT-heap output buffer was retained through LDWMD register, admit, execute, and evict. The D3D12 compute pipeline consumed that same output resource instead of allocating its own output buffer.

Each physical GPU had a 1 MiB LDWMD-owned allocation, 262144 integer results verified against the reference, zero readback mismatches, a native release confirmation, and zero LDWMD activePhysicalBytes following release:
- NVIDIA GeForce RTX 5060 Laptop GPU, LUID 0-14204: PASS local same-resource diagnostic.
- Intel(R) Graphics, LUID 0-13D14: PASS local same-resource diagnostic.

A separate NVIDIA run also invoked the installed LEEWAY-FORMULA-v1.0 evaluator on 16 previous real physical GPU observations BEFORE allocating/dispatching a new LDWMD-owned D3D12 resource. The Formula receipt was verified to exist. The GPU metrics -> runtime-state-v1 mapping is PROVISIONAL and the evaluation is NOT an approved GPU scheduling decision.

Evidence files under E:\LeeWay-Work\evidence-staging\gpu-integrated-audit-20261019\ldwmd-d3d12-candidate:
- same-buffer-d3d12-evidence.json
- same-buffer-intel-d3d12-evidence.json
- formula-before-physical-d3d12.json

Remaining unqualified: canonical Runtime Fabric GPU grant issuer; approved workload-specific Formula scheduling policy; owner-authorized Continuum lineage; canonical Veritas execution receipt; controlled production activation and mandatory ecosystem application integration. These local diagnostics must never be promoted to a claim of governed production execution or an OS-recognized LeeWay GPU driver.

## 2026-10-19 GPU signed-admission and independent readback milestone (candidate only)
- Connected ephemeral Ed25519 candidate grant verification and durable nonce replay consumption ahead of any Formula evaluation or native LDWMD allocation in the isolated Windows GPU test pipeline.
- Verified one signed ephemeral candidate grant followed by actual installed LEEWAY-FORMULA-v1.0 evaluation, native LDWMD physical memory admission, D3D12 same-buffer compute/readback, and LDWMD release on NVIDIA physical GPU. Replayed, expired, forged request identity, memory-escalation and unknown-key submissions failed before hardware side effects. This is LOCAL TEST ONLY; the signer is NOT the canonical Runtime Fabric GPU grant issuer.
- The native D3D12 GPU host now hashes exactly 1,048,576 physical readback bytes using Windows CNG SHA-256. Independent JavaScript reference generation hashes expected uint32 values and compares digests. Same-buffer tests PASS with matching independently calculated SHA-256 on NVIDIA GeForce RTX 5060 Laptop GPU and Intel(R) Graphics; tampered hashes and adapter identity mismatches are rejected.
- Relevant evidence:
  E:\LeeWay-Work\evidence-staging\gpu-integrated-audit-20261019\ldwmd-d3d12-candidate\signed-grant-physical-evidence.json
  E:\LeeWay-Work\evidence-staging\gpu-integrated-audit-20261019\ldwmd-d3d12-candidate\same-buffer-d3d12-evidence.json
  E:\LeeWay-Work\evidence-staging\gpu-integrated-audit-20261019\ldwmd-d3d12-candidate\same-buffer-intel-d3d12-evidence.json
- Canonical gaps remain: Runtime Fabric-owned trusted GPU issuer and protected native dispatch entrypoint, an approved GPU-specific Formula decision, owner-authorized Continuum lineage binding, independent canonical Veritas signer and receipts, production service activation, Android and Linux qualification, and mandatory ecosystem application enforcement.
- Reuse the existing GPU provider registry and LDWMD allocation authority; do not turn test keys, callback flags, independent diagnostic digest checks, or local readback evidence into production authority.

## 2026-10-19 isolated end-to-end signed GPU -> Formula -> LDWMD -> native D3D12 -> Continuum persistence
A fresh, single-request end-to-end laboratory execution was completed using the actual installed LEEWAY-FORMULA-v1.0 evaluator, existing LeeWayDeviceWorkingMemoryDatabase with native D3D12 hardware allocation/free, physical NVIDIA GPU dispatch/readback, independent reference-byte SHA-256 verification, and existing Runtime Fabric owner-retention Continuum SQLite storage with independent read connection and pinned receipt-writer. One requestId and workloadHash were retained from the ephemeral test-only Ed25519 grant through native output and stored evidence. The signed grant input hash now matches the Formula canonical matrix input hash and the actual Formula receipt traceId/inputHash/resultHash were read back and verified. The physical allocation was freed. Replay was rejected. Storage replays were idempotent; altered same-request storage content was rejected by Continuum owner admission.

E2E report: E:\LeeWay-Work\evidence-staging\gpu-integrated-audit-20261019\continuum-gpu-test\end-to-end-gpu-continuum-report.json
Actual SQLite storage and runtime receipts: see gpu-continuum-test-report.json in the same directory.
Signed physical source: end-to-end-signed-gpu-evidence.json (same directory).

CRITICAL SCOPE: ISOLATED_TEST_ONLY_END_TO_END. The grant signer is an ephemeral test signer and NOT Runtime Fabric's canonical issuer; Continuum uses synthetic TEST_ONLY owner/body binding and NOT the actual device owner body; GPU Formula mapping is provisional and NOT an approved scheduling policy; GPU compute host is a diagnostic endpoint and not hardened production dispatch; no canonical independent GPU Veritas signature; no mandatory LeeWay application enforcement; no Android/Linux governed execution. The Continuum owner-retention service's internal Formula status of NOT_EXECUTED reflects its own retention policy and must not be reinterpreted as a GPU scheduling decision.


## 2026-10-19 production authority resolution checkpoint
- The actual Windows device body manifest was resolved through E:\LeeWay-Work\pc-consciousness-live\host-commander.binding.v1.json -> E:\LeeWay-Work\Digital-Brains\pc-primary\body.v1.json (bodyId pc-primary, activation BLOCKED_UNTIL_MANDATORY_GATES_PASS).
- The body declares existing owner-scoped Continuum SQLite E:\LeeWay-Work\Digital-Brains\pc-primary\continuum\continuum.sqlite; the database file and creator task-authorization document both exist. The existing pc-continuum.mjs calls the real createOwnerRetention owner adapter. This is a resolved *configuration*, not proof of a live GPU evidence ingest or approved GPU lineage.
- An isolated additive live-owner diagnostic import command was written to E:\LeeWay-Work\evidence-staging\gpu-integrated-audit-20261019\continuum-gpu-test\gpu-live-owner-retention.mjs. It requires explicit execution, uses existing owner retention and separate SQLite readback, and always labels evidence as test-only. It has NOT been executed: the remote process execution operation was blocked by platform safety checks. Do not infer a live Continuum record or receipt from the file's existence.
- The available Runtime Fabric security/signing.mjs uses dev-key.pem under process.cwd/security/keys and can generate dev keys automatically. This does not establish an OS-protected trusted Runtime Fabric GPU issuer. The canonical issuer remains UNBOUND; do not promote dev or ephemeral signing keys.
- The existing Golden Formula evaluator is proven on real 16-row GPU telemetry, but the GPU runtime-state mapping and scheduling policy have no pinned approved authority. An approved workload scheduling decision remains NOT COMPLETE.
- Next execution requires a runtime-owner approved, non-development issuer trust anchor and protected issuer service; a signed/versioned workload-to-Formula scheduling policy; and an owner admitted live Continuum file ingest with independent receipt/readback verification, before production activation.
