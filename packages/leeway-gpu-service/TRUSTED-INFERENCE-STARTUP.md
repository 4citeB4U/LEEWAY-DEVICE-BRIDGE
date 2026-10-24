# LeeWay GPU — production inference trusted-startup composition

LEEWAY HEADER — DO NOT REMOVE

**Scope:** `LEEWAY_GPU_INFERENCE_V1`, not the historical generic `compute.gpu` registry status.

**Implemented wiring:** `trusted-startup.mjs` imports the existing reviewed Runtime Fabric `createLeeWayInferenceBindingProvider` and LeeWay GPU SDK `createLeeWayGpuInferenceProvider`, verifies root-signed startup enrollment through Runtime, independently signed recovery readback through the existing Veritas key, GPU model qualification through the GPU SDK, then passes the qualified provider and authenticated-client callback to the original Device Bridge `listenGpuService`. The generic preview CLI is unchanged. No Device Bridge reinstallation or new GPU scheduler is required.

Trusted deployment is JavaScript controlled by the existing authorized owner supervisor. It must pass **in-memory owner provider methods** and verified source roots into:

```js
import {startTrustedLeeWayGpuInferenceService,inspectTrustedGpuStartup}
  from './packages/leeway-gpu-service/trusted-startup.mjs';

// Existing owner Runtime supervisor resolves these, never public HTTP request JSON:
const owner = await existingOwnerRuntimeStartup();
const args = {
  runtimeRoot: owner.reviewedRuntimeRoot,
  gpuRoot: owner.reviewedGpuSourceRoot,
  providers: owner.inferenceProviderMethods,
  trust: owner.inferenceTrust,
  deviceId: owner.deviceId,
  platform: owner.platform,
  models: owner.signedModelPlans,
  qualification: owner.independentGpuModelQualification,
  deviceProvider: owner.qualifiedDeviceProvider,
  authenticateClient: owner.authenticateApplication,
  recoveryProvider: owner.durableFreshProcessRecoveryProvider,
  preferenceFile: owner.preferenceFile,
  port: owner.localGpuPort
};
const check = inspectTrustedGpuStartup(args);
if (check.state !== 'PREFLIGHT_COMPLETE_NOT_AUTHORIZED') throw Error(check.missing.join(','));
const session = await startTrustedLeeWayGpuInferenceService(args);
```

The example is a composition contract, **not an implemented `existingOwnerRuntimeStartup` symbol**. It must be bound by the owner supervisor holding genuine credential and provider sources. No private keys are embedded in this repository or obtained from environment-variable discovery. The only accepted runtime source module is the existing `adapters/edge-gpu/inference-binding.mjs`; the only GPU provider source is `sdk/inference-provider.mjs`. Both are loaded from explicit reviewed paths.

## Required unbound methods

- authority: `authorize`, `consumeReplay`, `revalidate`, `release`
- Formula: `evaluate`, `replay` — existing qualified Formula source and inference mapping remain authoritative
- independent Veritas: `pre`, `post`, `commit`
- model source: `open`, `verifyRead`
- original LDWMD: `admit`, `revalidate`
- Continuum: `open`, `stage`, `readback`, `commit`, `rollback`, `close`
- Receipt Ledger: `append`, `readback`
- Learning Ledger: `admit`, `readback`

These are 23 methods, not 23 providers. All are required for the existing Runtime binding. The old `edge-gpu-provider` `compute.gpu` manifest does not replace any `LEEWAY_GPU_INFERENCE_V1` enrollment. Provider methods are supplied by existing reviewed owner authorities, never from an inference request.

**Reuse-before-build finding:** Runtime Fabric already has `automation-runtime/learning-ledger-provider.mjs` (`CanonicalLearningLedgerProvider.admitRecord`) and `scripts/c3-learning-ledger-admission.mjs`; they are **not yet compatible inference providers**. The older `admitRecord` implementation is tied to C3 task-runner identity, the literal carrier key `carrier-ed25519-key-001`, legacy default `E:` evidence directories and `RETAINED_CANDIDATE_OBSERVATION` when higher governance remains withheld. It does not implement the required inference `learningLedger.admit({idempotencyKey,event})` and `readback` or prove signed per-request `LEEWAY_GPU_INFERENCE_V1` Veritas POST/commit. Its C3 provider registry entries are scoped separately. **Do not pass off or wrap its candidate admission as verified production inference learning.** Adapt the existing canonical Ledger **only after** its carrier, request identity, independent Veritas signature and durable readback semantics qualify for the new scope; no parallel unsanctioned ledger store was created here.

**Hosted CI scope:** Device Bridge's GitHub Actions token cannot check out the owner-controlled Runtime Fabric repository (HTTP 404 with that token). Local integration tests use the reviewed Runtime and GPU checkouts and pass the genuine factories. Hosted Windows/Linux/macOS CI therefore exercises self-contained fail-closed contract tests while the source-dependent diagnostic integration test is explicitly **SKIPPED**. No repository access keys were added or faked.

## Fresh-process recovery gate

Runtime Fabric's `recoverPendingReleases()` map is process-local. The trusted startup now **fails before listening** unless an independently authenticated provider returns a Veritas-signed `leeway.gpu.fresh-process-recovery-attestation.v1` envelope. Its Ed25519 signature must verify against the same independently enrolled `veritasPublicKeySpki` used by the existing Runtime inference binding. The signed body must attest:

- Exact inference scope, `status:'PASS'`, `pending:0`, `freshProcessReadbackVerified:true`
- The exact root-signed Runtime enrollment receipt hash returned by `readiness()`
- `receiptLedgerReadbackSha256`, `learningLedgerReadbackSha256`, `continuumReadbackSha256` from **actual** durable original providers
- A future `expiresAtMs`

**A verifier callback returning an unsigned `VERIFIED` object is rejected.** The schema is a new *read-only startup attestation contract*, not an implementation of the durable recovery journal, owner ledger writer, or independent Veritas custodian. No user-side evidence or keys are generated. A genuinely separate authenticated Veritas authority must issue it only after performing the real fresh-process reconciliation; the startup adapter cannot verify independent ledger contents on its own.

## Stop conditions

Without verified owner keys/enrollment, a compatible general Learning Ledger, independent inference PRE/POST/COMMIT Veritas, a durable fresh-process reconciliation provider and a signed model qualification, the service is not started by this trusted path. If they are present, startup enables only a qualified **per-request inference route**; no output can bypass request-specific Formula, Replay, LDWMD, model-source readback, Continuum, Veritas or the two ledgers. The original user switch remains an independent prerequisite to dispatch. Never promote an unsigned diagnostic or sample keys.

**Current acceptance:** The integration and signature rejection tests pass using ephemeral **DIAGNOSTIC_FIXTURE_ONLY** enrollment, an in-memory synthetic model and simulated GPU device. They do not prove production provider enrollment, real neural inference, real device execution, full ledgers, or fresh-process recovery on the owner host. Voice Fabric remains untouched.
