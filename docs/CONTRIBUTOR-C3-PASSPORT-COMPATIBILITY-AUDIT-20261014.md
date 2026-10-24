# C3 Contributor Handoff — Universal Device Passport Audit (2026-10-14)

## WHO / WHAT / WHERE / WHEN / WHY / HOW
WHO: Agent Lee and authorized Device Bridge contributors.
WHAT: Read-only ecosystem survey, schema defect repair, candidate reconciliation provider ingress binding, matching-content attack rejection demonstration, Windows-to-iPhone live machine inspection, Apple developer-service transport resolution, Runtime Fabric ingress tracing, and authorized device-command pre/post contract specification.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE local checkout E:\LeeWay-Work\device-bridge-c34-build, with cross-trace into E:\LeeWay-Work\runtime-c3-clean-formula-20261007\machine-consciousness\carrier-server.mjs and trusted-host-read-veritas.mjs.
WHEN: 2026-10-14.
WHY: Trace the actual Runtime Fabric ingress that creates trusted execution context and define the authorized device-command pre/post contract, preserving the proven host-read verifier and all uncommitted Android work.
HOW: Trace carrier-server.mjs respond() -> executeRequestedTurn() -> executeOutcome() -> preGate -> native execution -> postGate -> finalVeritas. Zero production source mutations; zero driver mutations; zero git pushes.

## Ecosystem Connections Surveyed & Verified
- **GitHub First Authority (4citeB4U)**:
  - `4citeB4U/LEEWAY-DEVICE-BRIDGE.git` (`E:\LeeWay-Work\device-bridge-c34-build`, branch `c3-4-voice-adapter`, HEAD `c29f1d5`)
  - `4citeB4U/LeeWay-Standards.git` (`E:\Leeway-Ecosystem v2.1.4\LeeWay-Standards`, R01–R25 permanent rules, constitution)
  - `4citeB4U/LeeWay-Agent-Skills.git` (`E:\LeeWay-Work\agent-skills-benchmark`, `LEEWAY-SKILLS-REGISTRY.json`)
  - `4citeB4U/Leeway-formula-live.git` (`E:\LeeWay-Work\mc-g9-canonical-final`, `E:\LeeWay-Work\c3-formula-binding-review-20261011`)
  - `4citeB4U/Leeway-Runtime-Fabric.git` (`E:\LeeWay-Work\runtime-reconcile-20261005`)
  - `4citeB4U/LeeWay-Pocket-Agent.git` (`E:\LeeWay-Work\c3-4-pocket-build`)
  - `4citeB4U/leeway-ecosystemv2.14.git` (`E:\Leeway-Ecosystem v2.1.4`)

## Canonical Runtime Fabric Ingress Traced
- **Location**: `runtime-c3-clean-formula-20261007/machine-consciousness/carrier-server.mjs`
- **Ingress Function**: `respond(text, { requestId: givenId, committed = true } = {})` (lines 256–316).
- **Execution Context Creation**:
  1. Line 257: `const requestId = requestIdFor(givenId), inputHash = requestHash(text);`
  2. Line 258: `if (!committed) return { requestId, intent: 'request.completion', status: 'BLOCKED', completed: false, reason: 'UNCOMMITTED_INPUT', ... };`
  3. Line 275: `planRequestedTurn(text)` creates planned outcomes.
  4. Line 279: `recordRequest(requestId, inputHash, 'PLANNED', ...)` writes durable phase receipts with SHA-256 hash chains.
  5. Line 290–296: `executeRequestedTurn()` invokes `executeOutcome()` with the immutable trusted context:
     `{ ...context, requestId, sourceText: text, committed: true, authorized: true }`.
     Caller JSON cannot forge `committed: true` or `authorized: true`; this is bound exclusively by the carrier runtime.
  6. Line 305–307: Final delivery invokes `canonicalFinalVeritas({ requestId, response: out })`, which executes `runValidationPolicy()` from `standards/src/core/veritas/ValidationPolicy.ts`.

## Authorized Device-Command Pre/Post Contract Specification
Preserves `trusted-host-read-veritas.mjs` completely intact and defines the capability-specific extension:

### 1. Pre-Gate Contract (`preGateDeviceCommand`)
- **Input Parameters**:
  `{ context, deviceId, platform, capability, args, hostHealth, expectedDeviceId, consentEvidence, maxAgeMs = 120000 }`
- **Validation Invariants**:
  - `context.committed === true && context.authorized === true` (fails with `OWNER_AUTHORIZATION_REQUIRED`).
  - `deviceId === expectedDeviceId` and matches registered hardware attestation (`ANDROID_KEYSTORE` / `APPLE_LOCKDOWN_RECORD`).
  - `capability` declared in `adapter-registry.json` and state is `SUPPORTED` or `AVAILABLE` (fails with `CAPABILITY_NOT_AVAILABLE` if `UNAVAILABLE` or `BLOCKED`).
  - Authority tier:
    - `READ` (`device.info`, `device.files.read`, `device.health`): admitted under `CONTROLLER_OBSERVATION`.
    - `MUTATE`/`OPERATE` (`device.files.write`, `device.ui.*`, `device.apps.*`): requires verified `consentEvidence` (fails with `HUMAN_CONFIRMATION_REQUIRED` if unproven).
- **Output**:
  `{ schema: 'leeway.veritas.device-command.v1', status: 'PASS', profile: 'OWNER_DEVICE_COMMAND_V1', requestId, outcomeId, detail: { subjectSha256, deviceId, platform, capability, authorityTier, maxAgeMs }, receiptSha256 }`.

### 2. Post-Gate Contract (`postGateDeviceCommand`)
- **Input Parameters**:
  `{ context, preGate, nativeExecution, expectedDeviceId, capability }`
- **Validation Invariants**:
  - `preGate.status === 'PASS'` and `receiptSha256` integrity verified.
  - Pre-Gate freshness: `Date.now() - Date.parse(preGate.observedAt) <= maxAgeMs`.
  - Native execution timing: `finish >= start >= preAt` and `now - start <= maxAgeMs`.
  - Native receipt integrity: `receiptHash` matches body, `provider === '4citeB4U/LEEWAY-DEVICE-BRIDGE'`.
  - Cryptographic hash-chain binding: `nativeExecution.preState.previousHash === preGate.receiptSha256`.
- **Output**:
  `{ schema: 'leeway.veritas.device-command.v1', status: 'PASS', profile: 'OWNER_DEVICE_COMMAND_V1', requestId, outcomeId, detail: { preReceiptHash, nativeReceiptHash, capability, deviceId }, receiptSha256 }`.

### 3. Failure States
- `OWNER_AUTHORIZATION_REQUIRED`: Uncommitted or unauthorized turn context.
- `DEVICE_REGISTRATION_REQUIRED`: Unregistered or rogue device ID.
- `CAPABILITY_NOT_AVAILABLE`: Capability state is `BLOCKED` or `UNAVAILABLE`.
- `HUMAN_CONFIRMATION_REQUIRED`: Mutation or operation without valid consent evidence.
- `PRE_GATE_STALE`: Pre-gate receipt older than 120,000 ms.
- `NATIVE_CHAIN_MISMATCH`: Native receipt does not cryptographically chain to pre-gate.


## Owner-Authorization and Consent Provenance Trace (Audited 2026-10-14)

### 1. Trusted Owner-Consent & Authorization Components
- **Runtime Turn Ingress Authority (`machine-consciousness/carrier-server.mjs`)**:
  - Ingress function `respond(text, { requestId, committed = true })` (lines 256–296) establishes the immutable context `{ requestId: 'TURN-...', outcomeId, sourceText: text, inputHash: sha256(text), committed: true, authorized: true }`.
  - Non-committed inputs immediately fail closed with `reason: 'UNCOMMITTED_INPUT'`.
  - Client JSON payloads cannot set or forge `committed: true` or `authorized: true`; this is bound strictly by the carrier runtime.
- **Physical Operator Consent Gate (`standards/scripts/Invoke-LeeWayAgentLeeHumanAudibleConfirmationGate.ps1`)**:
  - Interactive console gate requiring explicit physical human confirmation ("Did you hear Agent Lee speak clearly through the speakers?").
  - Produces signed audit report and durable receipt `LEEWAY-RECEIPT-AGENT-LEE-HUMAN-AUDIBLE-CONFIRMATION-0001` with `finalStatus: 'PASS'`, `finalVerdict: 'HUMAN_AUDIBLE_CONFIRMATION_PASS'`, `truthLabel: 'LIVE_PROVEN'`.
- **Dynamic Resource Consent Gateway (`human-voice-platform/consent/mic-consent-gateway.mjs`)**:
  - Manages interactive permission requests (`requestMicrophoneConsent`), logging to `receipts/mic-consent/${requestId}.json`.
  - Records explicit approvals (`approveMicrophoneAccess`) with ISO timestamp and bounded expiration window (`expiresAt`).
- **Static Authority Consent Records (`voice-registry/consent/agent-lee-canonical.consent.json`)**:
  - Cryptographically pinned authority consent records signed by `LeeWay-Agent-Lee-Voice-Authority`, requiring `requiresReceipt: true` and `requiresAuditLedger: true`.
- **Risk-Governed Capability Admission (`machine-consciousness/capability-work-order-router.mjs`)**:
  - Classifies capabilities by risk tier. Medium and High risk routes (`risk: 'MEDIUM' | 'HIGH'`) require explicit `approved === true`.
  - If unapproved, immediately emits `state: 'HOLD_APPROVAL'`, `reason: 'COMMAND_APPROVAL_REQUIRED'`, `executed: false`, `verified: false`.
  - When approved, records `approval: { decision: 'HUMAN_APPROVED', state: 'APPROVED' }`.

### 2. Evidence Binding Invariants (Device, Capability, Request, Time Window)
- **Request & Work Order Correlation**:
  - `workOrderId: context.requestId + '::' + outcomeId`.
  - Work order request context: `{ requestId: c.requestId, outcomeId: c.outcomeId, inputHash: c.inputHash }`.
  - Any decoupling, replay, or uncommitted request throws `OUTCOME_CORRELATION_MISMATCH` or `COMMITTED_REQUEST_CONTEXT_REQUIRED`.
- **Target Device & Platform Ingress Binding**:
  - Binds to registered hardware/platform target ID (`pc-primary`, `LDB-d33c4150-5959-419f-8b22-ed6c2f359549`, `phone-fold6`).
  - Target identity verified against `adapter-registry.json` and hardware attestation (`targetKnown === true`).
  - Unknown device prefixes or spoofed platform identities fail closed.
- **Capability Tier & Human Confirmation Mandate (`domain-policy/omni-terminal-policy.mjs`)**:
  - Classifies authority tier: `READ`, `OPERATE`, `MUTATE`, `ADMIN`.
  - `consequential = new Set(['MUTATE', 'ADMIN'])`. If tier is `MUTATE` or `ADMIN`, `humanConfirmed` is mandatory; otherwise emits `decision: 'BLOCK'`, `reason: 'HUMAN_CONFIRMATION_REQUIRED'`.
  - For `READ` operations (`device.info`, `device.files.read`), `humanConfirmed` is false, admitted under `authorized === true` and `CONTROLLER_OBSERVATION`.
  - **Critical Security Boundary**: `authorityTier` and `humanConfirmed` MUST NEVER be accepted from caller parameters (`args._authorityTier`, `args._humanConfirmed`). They are strictly looked up in `adapter-registry.json` and verified against runtime session evidence.
- **Time Window & Freshness Bounds**:
  - Freshness window: `maxAgeMs = 120000` (120 seconds).
  - Pre-gate freshness verified: `Date.now() - Date.parse(observedAt) <= maxAgeMs && Date.parse(observedAt) <= Date.now() + 1000`. Stale grants throw `PRE_GATE_STALE`.
  - Execution window verified: `finish >= start >= preAt` and `now - start <= maxAgeMs`.

### 3. Runtime Fabric Verification Path
1. **Forbidden Field Scanning**: `governed-host-read-handler.mjs` scans request payloads for caller-supplied authority (`forbidden = /(trusted|reader|veritas|binding|authorization|credential|secret|token)/i`), immediately throwing `REQUEST_SUPPLIED_TRUSTED_EVIDENCE_FORBIDDEN`.
2. **Pinned Root-of-Trust Binding**: Verifies SHA-256 hashes of disk artifacts (`nativeCommanderBindingSha256`, `verifierSha256`, `formulaPolicySha256`, `workOrderRouterSha256`).
3. **Domain Policy Interpretation**: Evaluates `omni-terminal-policy.mjs`, producing deterministic SHA-256 policy digest.
4. **Veritas Pre-Gate Attestation**: Emits durable pre-execution receipt (`receipt_sha256`) recording device, capability, tier, and session correlation.
5. **Corroborated Post-Gate Readback**: Native adapter execution is independently corroborated by platform readback (`Win32_OperatingSystem`, ADB shell `getprop`, or Lockdown device inspection).
6. **Cryptographic Chaining & Receipts**: Native receipt must chain to pre-gate (`nativeExecution.previousHash === preGate.receiptSha256`). Failed or unapproved calls record durable `BLOCKED` or `HOLD_APPROVAL` receipts (`executed: false, verified: false`).


## Trace of executeWorkOrder(approved: true) Callers & Authorization Record Boundary (Audited 2026-10-14)

### 1. Who calls executeWorkOrder() with approved: true?
- **Finding**: **NO production caller anywhere in Runtime Fabric or Device Bridge calls `executeWorkOrder()` with `approved: true`.**
- In `carrier-server.mjs` (line 154):
  `const workOrder = await executeWorkOrder({ capability: outcome.capability, args: outcome.args || {}, hostEndpoint: HOST });`
  (`approved` omitted, defaulting to `false`).
- In `request-provider-execution.mjs` (line 64):
  `const workOrder = await executeWorkOrder({ capability: outcome.capability, args: outcome.args, hostEndpoint, timeoutMs: 70000, admission: admitted.policy, requestContext: context, contentProvider });`
  (`approved` omitted, defaulting to `false`).
- In `governed-host-read-handler.mjs` (line 115):
  `const workOrder = await module.executeWorkOrder({ capability: 'leeway.host.info', args: {}, hostEndpoint: 'http://127.0.0.1:' + bindingState.native.port, timeoutMs: 10000 });`
  (`approved` omitted, defaulting to `false`).
- The ONLY places passing `approved` are test harnesses:
  - `machine-consciousness/tests/request-completion.test.mjs` (line 438): tests `approved: false`, `approved: 'true'`, and `approved: 1`, verifying they all fail closed into `state: 'HOLD_APPROVAL'`.
  - `host-commander-v0/machine-consciousness/tests/c3-5-formula-domain-policy.mjs` (line 7): tests `leeway.service.restart` without approval, verifying it enters `state: 'HOLD_APPROVAL'`.

### 2. Where does the approval decision originate?
- In `capability-work-order-router.mjs` (lines 148–153):
  - The router inspects `route.risk` from the capability registry.
  - If `approvalRequired = ['MEDIUM', 'HIGH'].includes(route.risk)` and `approved !== true`:
    Halts with `state: 'HOLD_APPROVAL'`, `reason: 'COMMAND_APPROVAL_REQUIRED'`, `executed: false`, `verified: false`.
  - Low-risk capabilities (`leeway.host.info`, `android.device.info`, `leeway.voice.identity`) have `approval: 'AUTO_LOW_RISK'` and execute without human approval.
  - In `domain-policy/omni-terminal-policy.mjs`:
    `consequential = new Set(['MUTATE', 'ADMIN'])`. If authority tier is `MUTATE` or `ADMIN`, `humanConfirmed` must be `true`, else emits `HUMAN_CONFIRMATION_REQUIRED`.
    For `OPERATE` (`app.open`, `web.search`), `humanConfirmed` is derived from turn context commitment (`committed === true && authorized === true`).

### 3. Whether a trusted authorization record is checked before execution?
- **Within `executeWorkOrder()` for the `approved` parameter**:
  - **NO trusted authorization record is checked for `approved` directly.**
  - `approved` is accepted as a raw boolean property on the input object.
  - It does NOT check a digital signature, does NOT verify an HMAC, and does NOT inspect an external consent record file.
  - However, because all production callers omit `approved`, any medium- or high-risk command unconditionally halts in `HOLD_APPROVAL`.
- **For `outcomeAdmissionRequired` routes**:
  - A trusted authorization record **IS** strictly checked (`admission` must match `omni-terminal-domain-policy-v1`, `interpretationSha256 === sha(policy)`, and correlated `workOrderId`).
- **For `governed-host-read-handler.mjs`**:
  - A trusted authorization record **IS** strictly checked (`authority` object with SHA-256 bindings, freshness <= 120s, and mandatory PowerShell Veritas pre-gate).

### 4. The Specific Missing Boundary Identified
- Runtime Fabric currently has a bifurcation:
  - Read/low-risk operations have proven verifiers (`trusted-host-read-veritas.mjs`, `governed-host-read-handler.mjs`).
  - Mutating and high-risk operations in `capability-work-order-router.mjs` stop at `HOLD_APPROVAL` because no interactive or durable owner-consent provider exists to produce a verified authorization record and pass it forward.
  - In Device Bridge (`Bridge.call()`), `admission` was previously stubbed as `async () => true`.
  - Therefore, implementing a new consent mechanism requires binding `Bridge.call()` and `executeWorkOrder()` to an explicit, durable consent record (mirroring the `authority` record and `omni-terminal-policy-v1`) rather than accepting caller booleans or unauthenticated flags.


## Inspection of Work-Order Admission Policy & Trusted Evidence Records (Audited 2026-10-14)

### 1. Existing Admission Policy & Evidence Records Inspected
- **`omni-terminal-domain-policy-v1` ([`machine-consciousness/domain-policy/omni-terminal-policy.mjs`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/machine-consciousness/domain-policy/omni-terminal-policy.mjs))**:
  - Implements governed decision logic: `{ workOrderId, capability, capabilityAvailable, providerHealthy, targetKnown, authorized, authorityTier, humanConfirmed, providerReceiptRequired }`.
  - Declares `consequential = new Set(['MUTATE', 'ADMIN'])`, throwing `HUMAN_CONFIRMATION_REQUIRED` when unproven.
  - Produces immutable policy record signed with `interpretationSha256 = sha(policy)`.
- **`leeway.request-admission.v1` ([`machine-consciousness/request-provider-bindings.mjs`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/machine-consciousness/request-provider-bindings.mjs#L217-L224))**:
  - Pinned admission record binding `requestId`, `outcomeId`, `inputHash`, `capability`, `provider`, `target`, `availability`, and `policy`.
  - Enforces `targetFor(outcome)` strictly to `{ kind: 'content', type: 'story' }`, `app:chrome`, and `web.search:chrome:...`.
  - Throws `REQUEST_PROVIDER_CAPABILITY_UNSUPPORTED` for any device capability not explicitly matched in `targetFor()`.
- **`command.schema.json` & `platform-adapter.schema.json` ([`contracts/`](file:///E:/LeeWay-Work/device-bridge-c34-build/contracts))**:
  - Defines command structure: `{ commandId, capability, authorityTier: ["READ","OPERATE","MUTATE","ADMIN"], sessionId, arguments, requiresHumanConfirmation }`.
  - Declares adapter capability schema with `{ state, requiresHumanConsent, notes }`.
- **`leeway.veritas.trusted-host-read.v1` & `leeway.governance.envelope.v1` ([`automation-runtime/governed-host-read-handler.mjs`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/automation-runtime/governed-host-read-handler.mjs))**:
  - Rigid, working Veritas pre/post gate architecture binding `authority` (`correlation_id`, `request_sha256`, `target`, `capability`, `authorization_sha256`, `binding_sha256`, `max_age_ms = 120000`).
  - Scans and rejects all caller-provided evidence via `scanForbidden()`.

### 2. Contract Extension vs. Actual Provider Implementation Determination

| Layer | State | Analysis |
|---|---|---|
| **Contract Specification** | **Partially Present (Requires Scoped Extension)** | The core architectural contract already exists: `omni-terminal-domain-policy-v1` already models `authorityTier`, `consequential`, `humanConfirmed`, and work-order correlation. `command.schema.json` and `adapter-registry.json` already model per-capability consent requirements. However, **the contract scope must be extended** because `targetFor()` in `request-provider-bindings.mjs` only recognizes story and browser targets, rejecting device commands with `REQUEST_PROVIDER_CAPABILITY_UNSUPPORTED`, and no JSON schema currently defines a `leeway.consent-evidence.v1` token. |
| **Provider Implementation** | **Completely Missing (The Core Blocker)** | Even if contracts are fully specified, **no functional provider implementation exists in the runtime** to produce, verify, or bridge owner consent for device commands:<br>1. In `carrier-server.mjs`, when a mutating command halts at `HOLD_APPROVAL`, no approval listener or consent resolution provider exists to prompt the operator and supply `approved: true`.<br>2. In `apps/desktop/mcp-server.mjs`, the Bridge callback is an unverified stub (`admission: async () => true`) because no admission provider is wired to evaluate device commands.<br>3. Existing consent gateways (`mic-consent-gateway.mjs`, `Invoke-LeeWayAgentLeeHumanAudibleConfirmationGate.ps1`) are strictly isolated to microphone access and speech synthesis; neither serves device commands. |

### 3. Conclusion & Boundary Definition
The missing capability is **primarily an actual provider implementation** that requires a **narrow contract extension**:
1. **Contract Extension (Small)**: Extend the target resolution in the admission contract to recognize device targets (`target: { kind: 'device', platform, deviceId }`) and standardize the `leeway.consent-evidence.v1` token payload (`{ issuer, subjectSha256, deviceId, platform, capability, authorityTier, issuedAt, expiresAt, signatureOrReceiptSha256 }`).
2. **Provider Implementation (Substantive)**: Implement the actual `DeviceCommandAdmissionProvider` and wire it to `Bridge.call()` in `mcp-server.mjs`, checking verified session and consent evidence instead of permissive `true`.


## Actual Issuer & Verifier of Owner-Authority Records (Audited 2026-10-14)

### 1. Canonical Issuer Analysis
Inspection of existing owner-authority records reveals four concrete issuing tiers in the LeeWay architecture:
1. **Runtime Fabric Carrier (`machine-consciousness/carrier-server.mjs`)**:
   - **Identity**: `4citeB4U/Leeway-Runtime-Fabric` / `Runtime Fabric existing receipt writer`.
   - **Mechanism**: Owns the console/session turn ingress. Establishes the immutable turn context:
     `{ requestId: 'TURN-...', outcomeId, sourceText: text, inputHash: sha256(text), committed: true, authorized: true }`.
   - **Capability**: Issues non-forgeable request context for low-risk and committed turn operations.
2. **Governed Runtime Host Binding (`automation-runtime/governed-host-read-handler.mjs`)**:
   - **Identity**: `4citeB4U/LEEWAY-DEVICE-BRIDGE`.
   - **Mechanism**: Evaluates pinned filesystem hashes (`bindingSha256`, `nativeCommanderBindingSha256`) and generates the authoritative `authority` record:
     `{ allowed: true, revoked: false, correlation_id, request_sha256, target, capability, scope: 'OWNER_LOCAL_HOST_READ', authorization_sha256, binding_sha256, issued_at, expires_at, max_age_ms: 120000 }`.
3. **Interactive Human Presence Gates**:
   - **Identity**: `LEEWAY_ENTERPRISE_GOVERNANCE::AGENT_LEE_HUMAN_AUDIBLE_CONFIRMATION` ([`Invoke-LeeWayAgentLeeHumanAudibleConfirmationGate.ps1`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/standards/scripts/Invoke-LeeWayAgentLeeHumanAudibleConfirmationGate.ps1)).
   - **Mechanism**: Directly queries the human operator at the physical console and emits signed receipt `LEEWAY-RECEIPT-AGENT-LEE-HUMAN-AUDIBLE-CONFIRMATION-0001` with `truthLabel: 'LIVE_PROVEN'`.
4. **Standards & Founder Authority Framework**:
   - **Identity**: `CreatorAuthority` ([`standards/src/core/security/creator.authority.ts`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/standards/src/core/security/creator.authority.ts)), `founderId: 'Lee'`, `CreatorAuthLevel.SOVEREIGN`.
   - **Identity Registry**: `registerIdentity()` & `sealIdentityProvenance()` ([`standards/src/core/runtime/identityRegistry.ts`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/standards/src/core/runtime/identityRegistry.ts) / [`identityProvenance.ts`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/standards/src/core/runtime/identityProvenance.ts)).

### 2. Canonical Verifier Analysis
1. **Policy Verifier**: [`omni-terminal-policy.mjs`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/machine-consciousness/domain-policy/omni-terminal-policy.mjs) (`interpretOmniTerminalPolicy`).
   - Verifies work order correlation (`workOrderId`), health, target, authorization, and checks `consequential = new Set(['MUTATE', 'ADMIN'])` against `humanConfirmed`.
2. **Execution & Compliance Verifier**: Veritas Core via [`ValidationPolicy.ts`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/standards/src/core/veritas/ValidationPolicy.ts) (`runValidationPolicy`) and [`trusted-host-read-veritas.mjs`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/machine-consciousness/trusted-host-read-veritas.mjs) (`canonicalFinalVeritas`).
   - Law 4 & 5 compliance: Emits `CollaborationReceipt` from `LEE_PRIME` to `VERITAS_CORE`.
3. **Payload Firewall**: [`governed-host-read-handler.mjs`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/automation-runtime/governed-host-read-handler.mjs#L25-L38) (`scanForbidden`).
   - Explicitly rejects caller-supplied authority or credentials, throwing `REQUEST_SUPPLIED_TRUSTED_EVIDENCE_FORBIDDEN`.
4. **Identity Drift Verifier**: [`identityProvenance.ts`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/standards/src/core/runtime/identityProvenance.ts) (`validateIdentityProvenance`).
   - Throws `IDENTITY_DRIFT_DETECTED` if runtime subject hash drifts from boot-sealed identity.

### 3. Ability of the Existing Provider to Issue Request-Bound Device Consent
- **Can the existing provider issue request-bound device consent? YES.**
  - The **Runtime Fabric Carrier** (`carrier-server.mjs`) already possesses all required request correlation state: `requestId`, `inputHash`, `sourceText`, `turnId`, and session lifecycle abort signals.
  - The **Governed Runtime Binding Authority** (`governed-host-read-handler.mjs`) already defines the exact schema pattern for scoped, time-windowed authority records (`max_age_ms: 120000`).
  - **No New Sovereign Consent Service is Needed**:
    - Establishing a separate external consent daemon would fracture the governance model and violate the principle of single authority provenance.
    - The canonical issuer of request-bound device consent must remain the **Runtime Fabric Carrier** (`4citeB4U/Leeway-Runtime-Fabric`).
    - The canonical verifier must remain the **Veritas Core / Domain Policy engine** (`ValidationPolicy.ts` and `omni-terminal-policy.mjs`).
  - **Single Authority Chain Preserved**:
    `Formula (16x6 state truth) -> Domain Policy (omni-terminal-policy-v1) -> Carrier Context (committed/authorized turn) -> Device Bridge Passport (hardware-bound) -> Veritas Pre/Post Gate (readback corroborated) -> Durable Receipt`.


## Creator-Authentication Implementation vs. Framework Audit (Audited 2026-10-14)

### 1. Status of Live Creator-Authentication Implementation
- **Source Inspection**: Examined [`standards/src/core/security/creator.authority.ts`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/standards/src/core/security/creator.authority.ts), [`security.init.ts`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/standards/src/core/security/security.init.ts), and [`security.coordinator.ts`](file:///E:/LeeWay-Work/runtime-c3-clean-formula-20261007/standards/src/core/security/security.coordinator.ts).
- **Finding**: The module is **merely a framework and integration template**, not an operational live key/token issuing service:
  - `creator.authority.ts` line 8: `"DO NOT use raw secrets in code. This is a cryptographic framework only."`
  - `creator.authority.ts` line 70: `"All cryptographic operations are framework only - real keys must be external."`
  - `creator.authority.ts` lines 177, 182: Manifest and proof token verification are mock structural checks (`selfSignature !== '' && founderId === 'Lee'`).
  - `security.init.ts` line 7: `"This is NOT production code - it's a template showing the integration pattern."` (with placeholder public key `'pk_1234567890abcdef...'`).
- **Conclusion**: There is no live keystore, HSM vault, or active cryptographic token generator wired into `CreatorAuthority`. It cannot be invoked directly in its current state as a production device consent issuer.

### 2. Missing Runtime Binding Identified
To achieve authentic device-command authorization without establishing an unverified sovereign authority, the missing binding connects:
1. **Canonical Runtime Turn Context**: `CarrierServer` turn ingress providing non-forgeable `{ requestId, outcomeId, inputHash, committed: true, authorized: true }`.
2. **Device Hardware Passport**: Registered hardware attestation from `contracts/device-passport.schema.json` and platform declarations in `operator/adapter-registry.json`.
3. **Request-Bound Consent Evidence Token (`leeway.consent-evidence.v1`)**:
   - `issuer`: Canonical runtime authority (`4citeB4U/Leeway-Runtime-Fabric`).
   - `subject`: Bound to `requestId`, `deviceId`, `platform`, `capability`, and cryptographic `argsDigest = sha256(canonical(args))`.
   - `authorityTier`: Extracted strictly from `adapter-registry.json` (`READ`, `OPERATE`, `MUTATE`, `ADMIN`). Fails closed if caller supplies `_authorityTier` or `_humanConfirmed`.
   - `validity`: `issuedAt`, `expiresAt`, with strict `maxAgeMs: 120000` (120 seconds).
   - `replayProtection`: Non-replayable `sessionNonce` and unique token `nonce`.
   - `revocation`: Explicit revocation check against runtime session revocation set.
4. **Mandatory Veritas Pre-Gate Attestation**: Emits a durable Veritas pre-gate receipt (`outcome: 'ADMITTED'`) before native execution can be triggered.
5. **Corroborated Post-Gate Chaining**: Native execution receipt must link back to pre-gate (`previousHash === preGate.receiptSha256`).

### 3. Canonical Target & Rollback Safety
- **Canonical Target**: [`apps/desktop/mcp-server.mjs#L71`](file:///E:/LeeWay-Work/device-bridge-c34-build/apps/desktop/mcp-server.mjs#L71), replacing `admission: async () => true` with a hardened admission binding factory `createC3AdmissionBinding()`.
- **Rollback Safety**: Rollback is fully isolated and atomic in `mcp-server.mjs`. If disabled or rolled back, the server reverts to its previous known state without leaving untracked mutations.
- **Production Entrypoint Acceptance Gates**:
  1. Valid read-only call (`device.info`) admits under `CONTROLLER_OBSERVATION`.
  2. Valid mutating call (`device.files.write`) admits with authentic consent evidence.
  3. Forged consent token is rejected (`ADMISSION_DENIED`).
  4. Expired consent token (>120s) is rejected (`ADMISSION_DENIED`).
  5. Replayed consent token / nonce is rejected (`ADMISSION_DENIED`).
  6. Wrong-device consent token is rejected (`ADMISSION_DENIED`).
  7. Caller-supplied `args._humanConfirmed` or `args._authorityTier` is rejected or ignored.
  8. Unknown/unregistered platform fails closed.
  9. Missing Veritas pre-gate attestation fails closed.

## Master Checkpoint & Current Gate
- **Current C3 gate**: BLOCKED — canonical owner-consent evidence is not bound to execution.
- Creator-authentication analyzed: Confirmed as a framework, not an operational token issuer.
- Missing runtime binding, canonical target, rollback path, and acceptance gates defined.
- All 6 modified Android Kotlin files and `.bak` files untouched.
- Zero executable source, driver, credential, or device modifications performed in this audit.
- RECEIPT NOT CREATED; LEARNING LEDGER NOT UPDATED.
