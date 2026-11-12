# LeeWay Device Bridge — Plan A Master Engineering Roadmap & Production Operating System

> [!IMPORTANT]
> **Core Architecture Invariant**: The **Digital Brain** and **Diagnostics** belong 100% to the individual physical device—not to LeeWay, not to the user, and not to Agent Lee. The Device Bridge is the universal, hardware-agnostic transport and execution gateway connecting authorized artificial intelligence to physical hardware.
>
> **Governing Review**: Fully integrates the *November 12, 2026 Independent Architecture Review*, incorporating the 3-Gate Maturity Framework, the 10-Phase Expanded Roadmap, and Amendments A, B, C, and D.

---

## 1. Executive Assessment & The Three Critical Truths

The Independent Architecture Review established three non-negotiable engineering realities that govern this expanded plan:

1. **A Demonstration Is Not the Baseline**: Passing a 4-node file transfer proof demonstrates relay routing, but it does not constitute completion of the full sovereign Device Bridge baseline.
2. **Omitted Capabilities Restored**: The original mission requires complete computer control (multi-monitor, accessibility trees, input injection, session ownership), native signed mobile runtimes (iOS IPA, unrooted Android daemons), concurrent Vision Fabric streams, full Voice Fabric duplexing (AEC, wake, interruption), and provider-agnostic multi-agent interoperability.
3. **Claims Must Match Independently Observable Evidence**: Code residing solely in a local workspace or an unverified relay state cannot be certified as production-complete. Every promotion requires independent verification, canonical custody, and live post-state readback.

---

## 2. The Three-Gate Maturity Framework

To prevent premature claims of completion, the program is partitioned into three distinct, sequential gates:

```mermaid
flowchart LR
    GA["Gate A: Working Baseline"] --> GB["Gate B: Full Universal Bridge"]
    GB --> GC["Gate C: Sovereign Ecosystem"]
```

| Gate | Scope | Status | Acceptance Requirement |
|---|---|---|---|
| **Gate A: Working Baseline** | 4-Node Connectivity & Data Movement | **IN PROGRESS** (Phases 0–3) | Authenticated physical device discovery, bounded read/write/launch operations, verified 4-node transfer, physical byte readback, and independently verifiable evidence. |
| **Gate B: Full Universal Bridge** | Complete Execution, Perception & Control | **OPEN** (Phases 5, 7, 8) | Multi-platform native adapters, full computer use (accessibility/mouse/keyboard), concurrent Vision Fabric, duplex Voice Fabric, transport failover, and operational recovery. |
| **Gate C: Sovereign Ecosystem** | Autonomous Enterprise Production | **FUTURE** (Phases 4, 6, 9) | Live Machine Consciousness binding, distributed Model Hub & GPU compute, Continuum persistence, workforce orchestration, and independent Veritas release certification. |

---

## 3. The Expanded 10-Phase Engineering Roadmap (0 to 9)

```mermaid
flowchart TD
    P0["Phase 0: Evidence & Runtime Recovery (Prerequisite)"] --> P1["Phase 1: Device-Owned Digital Brain & Diagnostics"]
    P1 --> P2["Phase 2: Physical Hardware & Native Identity"]
    P2 --> P3["Phase 3: File Universe & Cross-Device Execution (Gate A)"]
    P3 --> P7["Phase 7: Universal Computer & Application Control"]
    P7 --> P5["Phase 5: Concurrent Vision & Duplex Voice Fabric (Gate B)"]
    P5 --> P8["Phase 8: Multi-Agent & Transport Independence"]
    P8 --> P4["Phase 4: Machine Consciousness & Local Compute"]
    P4 --> P6["Phase 6: Independent Veritas & Production Admission"]
    P6 --> P9["Phase 9: Production Hardening & Operational Qualification (Gate C)"]
```

---

### Phase 0: Evidence & Runtime Recovery (Prerequisite · Critical)
*Goal: Resolve the independently observed runtime discovery failure, pin all repositories, and reconcile baseline evidence before further mutations.*

- [x] **Task 0.1: Diagnose and Repair Runtime → Bridge Discovery HTTP 502**
  - Traced upstream ingress and diagnosed root cause: Tailscale Funnel had stale `/mcp` route mapped to dead port 4271; persistent server lacked MCP JSON-RPC routes.
  - Reset Tailscale serve config to root proxy `http://127.0.0.1:8008`; implemented complete MCP JSON-RPC router (`initialize`, `tools/list`, `tools/call`) and `GET /api/devices` in `api/device-relay.mjs`.
  - Live verified over public internet: `https://agent-lee.tailb186e7.ts.net/mcp` (HTTP 200, 10 tools, `bridge_devices` active).
  - *Location*: `api/device-relay.mjs`, Tailscale Funnel (Completed & Live Verified)

- [x] **Task 0.2: Pin Canonical 17-Repository Manifest and Exact Commits**
  - Locked exact commit hashes across all 17 LeeWay repositories.
  - Recorded immutable source state in `state/canonical-manifest-20261112.json`.
  - (Completed)

- [x] **Task 0.3: Recover Physical Device Registry and Verified Identities**
  - Bound public keys and hardware signatures for `pc-primary`, `phone-fold6`, `phone-apple-iphone`, and `pc-hp-secondary`.
  - (Completed: Recorded in `state/phase0-baseline-pre-state-20261112.json`)

- [x] **Task 0.4: Reconcile Receipt 14 with Source Payloads and Readbacks**
  - Verified `evt-cross-mesh-file-hop-master-acceptance-20261112-001` against immutable byte readbacks in `receipts.sqlite` and `production-learning-ledger.jsonl`.
  - Authored comprehensive audit artifact: `docs/receipt-14-forensic-audit-reconciliation-20261112.md`.
  - (Completed)

- [x] **Task 0.5: Establish Baseline PRE-State Snapshot**
  - Captured and signed pre-execution system state in `state/phase0-baseline-pre-state-20261112.json`.
  - (Completed)

---

### Phase 1: Device-Owned Digital Brain & Diagnostics
*Goal: Preserve and harden the device-local SQLite databases, ensuring continuous telemetry, crash recovery, and offline independence.*

- [x] **Task 1.1: Standardize Device Universe Schema** (`contracts/device-universe.schema.json` — Completed)
- [x] **Task 1.2: Standardize File Universe Schema** (`contracts/file-universe.schema.json` — Completed)
- [x] **Task 1.3: Android Fold6 Native Digital Brain SQLite Database** (`DigitalBrainStore.kt` — Completed & Compiled)
- [x] **Task 1.4: Windows Workstation Digital Brain & Diagnostics Daemon** (`digital-brain.mjs` — Completed)
- [x] **Task 1.5: HP Secondary Workstation Digital Brain Daemon** (`hp-secondary-relay-agent.mjs` — Completed)
- [x] **Task 1.6: Apple iPhone 11 Digital Brain Store** (`apple-device-supervisor.mjs` — Completed)
- [ ] **Task 1.7: Continuous Telemetry & Crash Recovery Engine**
  - Add SQLite background polling for thermals, battery, RAM pressure, and unhandled exception logging.
  - Ensure database survives sudden device reboots and service recycles with zero corruption (`WAL` mode).
- [ ] **Task 1.8: Disconnected Offline Autonomy Verification**
  - Prove that each device's Digital Brain continues logging diagnostics when the network relay drops completely.

---

### Phase 2: Physical Hardware & Native Identity
*Goal: Move from supervisor proxies to verified physical execution on native hardware, resolving dynamic endpoints.*

- [ ] **Task 2.1: Dynamic Network Discovery for HP Secondary (LEO)**
  - Replace static IP assumptions (`192.168.1.101` vs `192.168.1.218`) with dynamic mDNS / SSDP discovery.
  - Install native background service on LEO and establish direct outbound WSS link.
  - Clear `PHYSICAL_WORKSTATION_HOLD`.
- [ ] **Task 2.2: Apple iPhone 11 Native Signed App & USB Mux Pairing**
  - Build and sign native `AppleDeviceBridge` IPA.
  - Establish native communication loop via `usbmuxd` / Lightning USB and paired local Wi-Fi.
  - Clear `PHYSICAL_APPLE_DEVICE_UNAVAILABLE`.
- [ ] **Task 2.3: Hardware Keystore Cryptographic Challenge-Response**
  - Implement dynamic nonces signed by Qualcomm Keystore (Fold6), Apple Secure Enclave (iPhone), and TPM 2.0 (Windows).
- [ ] **Task 2.4: Document Platform Sandbox & Scoped Security Boundaries**
  - Map explicit OS permission constraints across Android SAF, iOS App Sandbox, and Windows UAC.

---

### Phase 3: File Universe & Cross-Device Execution (Gate A North Star)
*Goal: Complete and independently qualify the automated multi-hop file transfer pipeline with full CRUD semantics.*

- [x] **Task 3.1: Build Automated Multi-Hop Pipeline Script** (`execute-cross-mesh-file-hop.mjs` — Completed)
- [x] **Task 3.2: Mobile Application Launch Trigger** (`industries.leeway.pocket` — Completed)
- [x] **Task 3.3: Canonical Receipt Admission** (Receipt ID 14 in `receipts.sqlite` — Completed)
- [ ] **Task 3.4: Complete File Universe Operations (CRUD & Scoped Trees)**
  - Implement scoped file listing, atomic writes, byte-range edits, moves, and safe deletions.
  - Enforce path sandboxing preventing traversal outside authorized roots.
- [ ] **Task 3.5: Resumable Transfers & Conflict Resolution**
  - Implement chunked streaming with SHA-256 block verification and auto-recovery for interrupted transfers.
- [ ] **Task 3.6: Independent End-to-End Readback Audit**
  - Rerun multi-hop script under independent verification, logging physical readbacks to permanent artifacts.

---

### Phase 4: Machine Consciousness & Local Compute Integration
*Goal: Connect the deterministic Machine Consciousness substrate and banked training tranches to live execution.*

- [ ] **Task 4.1: Deterministic Substrate Binding (Non-LLM)**
  - Enforce the Universal Employee Consciousness Contract: LLM as bounded capability, non-LLM substrate as governing policy.
- [ ] **Task 4.2: Execute 6-Step Replay Pipeline Across Tranches 1 to 5**
  - Replay core curriculum, adversarial crucible, omniverse survival, bridge harmony, and taste-state tranches.
  - Grade under Q69 / QB64 rigor law and promote to G4 production candidate.
- [ ] **Task 4.3: Local VRAM Budget & Hardware Acceleration Allocator**
  - Expose live VRAM headroom (`device.gpu.vram.inspect`) across Adreno 750 (Fold6), Metal (iPhone), and DirectX 12 (PC).

---

### Phase 5: Concurrent Vision & Duplex Voice Fabric (Gate B Requirement)
*Goal: Enable simultaneous visual perception and real-time offline speech across physical devices.*

- [ ] **Task 5.1: Multi-Device Simultaneous Camera Streaming**
  - Implement WebRTC / RTSP stream negotiation across Windows webcam, Fold6 camera, and iPhone camera.
  - Add bandwidth adaptation, frame synchronization, and timestamp alignment.
- [ ] **Task 5.2: Duplex Offline Voice Engine with Interruption & AEC**
  - Implement native microphone capture, Acoustic Echo Cancellation (AEC), wake detection, and speech synthesis.
  - Enable conversational barge-in ("Stop talking") with sub-200ms latency.
- [ ] **Task 5.3: Unified Vision/Voice MCP Gateway**
  - Expose real-time perception tools (`device_stream_frame`, `voice_listen_turn`, `voice_speak_turn`) to authorized AI agents.

---

### Phase 6: Independent Veritas & Production Admission
*Goal: Complete cryptographic attestation by independent custodians and graduate release to production.*

- [ ] **Task 6.1: Enroll Qualified Production Veritas Custodian Keys**
  - Enroll external custodian public trust root keys into `QUALIFIED_PRODUCTION_VERITAS_ROOTS`.
- [ ] **Task 6.2: Cryptographic PRE and POST Attestations**
  - Veritas evaluates unmanipulated pre-state and post-state hardware readbacks and issues signed decisions.
- [ ] **Task 6.3: Canonical Production Admission**
  - Transition state from `HOLD` to `PRODUCTION_ADMITTED` in `production-device-stage.mjs`.

---

### Phase 7: Universal Computer & Application Control (Gate B Requirement)
*Goal: Implement production-grade computer-use capabilities matching or exceeding Codex desktop control.*

- [ ] **Task 7.1: Multi-Monitor Visual Perception & Coordinate Normalization**
  - Capture virtual screen geometry across arbitrary multi-monitor displays, mapping coordinates accurately.
- [ ] **Task 7.2: Accessibility-Tree Inspection & UI Element Recognition**
  - Extract live Windows UI Automation (UIA) and Android Accessibility element trees for semantic targeting.
- [ ] **Task 7.3: Precise Input Injection with Interruption Kill-Switch**
  - Mouse clicks, smooth scrolling, keystroke typing, application switching, and terminal session execution.
  - Implement instant hardware pause / abort shortcut.
- [ ] **Task 7.4: Visible Illuminated Top Banner**
  - Semi-transparent, persistent indicator ("Agent Lee Controlling Machine") during active computer-control sessions.

---

### Phase 8: Multi-Agent & Transport Independence
*Goal: Guarantee provider-agnostic execution and seamless transport failover.*

- [ ] **Task 8.1: Provider-Agnostic Agent Adapters**
  - Verify that ChatGPT, Codex, Gemini, Antigravity, and local offline models can execute identical Bridge contracts.
- [ ] **Task 8.2: Dynamic Transport Failover Lifecycle**
  - Seamlessly negotiate connection across USB Tethering, Local LAN Wi-Fi, 5G Cellular Relay, and Tailscale Funnel.
  - Handle sleeping devices, network drops, and reconnects without corrupting in-flight transfers.

---

### Phase 9: Production Hardening, Negative Testing & Repeatability
*Goal: Subject the complete ecosystem to adversarial crucible testing and automated operational qualification.*

- [ ] **Task 9.1: Comprehensive Negative & Denial Test Suite**
  - Test revoked credentials, wrong tenant, spoofed device ID, unauthorized path traversal, and replayed tokens.
- [ ] **Task 9.2: Automated Fault Injection & Network Partition Gauntlet**
  - Disconnect USB during file writes; drop Wi-Fi during voice turns; verify atomic rollback and corruption resistance.
- [ ] **Task 9.3: Operational Runbooks, Disaster Recovery & Automated Rollback**
  - Verify `DEPLOYED_VERIFIED` readback and automated rollback to prior known-good configuration upon failure.

---

## 4. Architecture Amendment A: The 10-Gate Production Release Pipeline

Every feature, capability, or bug fix must advance through the ten canonical release gates:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            THE 10-GATE PRODUCTION RELEASE LIFECYCLE                         │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ G0: Mission Admitted      → Authorized Creator directive, mission ID assigned.             │
│ G1: Work Prepared         → Source/dependency inventory, branch created, rollback planned.  │
│ G2: Development Complete  → Reviewed code, clean build, unit tests passing.                 │
│ G3: Integration Qualified → Cross-device contracts matched, hardware integration tested.     │
│ G4: Independent Review    → Authentic execution evidence submitted to Veritas.             │
│ G5: Evidence Admitted     → Canonical receipt admitted to Receipt Authority, Learning acknowledged. │
│ G6: Release Approved      → Immutable release package signed by Production Authority.       │
│ G7: Deployment Executed   → Artifact deployed to target environment (staged/production).   │
│ G8: Production Verified   → Operational post-state verified via live hardware readback.     │
│ G9: Manager Closeout      → Residual risks documented, mission checkpointed, loop closed.  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**The Four Canonical Release States**:
1. `PREPARATION_ONLY`: Source staged; prerequisites unresolved.
2. `READY_FOR_PRODUCTION_FABRIC_REVIEW`: Immutable evidence package assembled for Veritas review.
3. `DEPLOYMENT_AUTHORIZED`: Authorized release permission granted by production authorities.
4. `DEPLOYED_VERIFIED`: Deployed to physical target, post-state readback verified, receipts admitted.

---

## 5. Architecture Amendment B: Workforce Command Structure & Direct Accountability

### Screen 2 Workforce Distribution
- **Creator**: Supreme mission authority and final human decider.
- **F4 Antigravity (Acting Workforce Manager & Dispatcher)**: Accountable for end-to-end delivery, task assignments, dependency enforcement, blocker escalation, and production handoffs.
- **F1 Codex (Integration & Native Hardware Lead)**: Local implementation, hardware execution, and desktop/device adapters.
- **F2 ChatGPT (Outside Support Contributor)**: Independent architecture, security review, and acceptance validation.
- **F3 Gemini (Defect-Pattern & Research Specialist)**: Cross-checking, research, and source contradiction detection.
- **F5 VS Code / Copilot (Implementation & Regression Engineer)**: Source-level implementation, patch generation, and regression fixes.

### The Five Manager Accountability Questions
At every turn, the Workforce Manager must answer:
1. *What has actually shipped?* Exact commit, version, environment, and verified hardware capability.
2. *What is being developed?* Assigned owner, branch, current stage, and blockers.
3. *What is blocking production?* Specific failed gate, accountable owner, and remediation plan.
4. *What has passed independent verification?* Concrete Veritas decision reference (never self-asserted PASS).
5. *What requires Creator authority?* Policy exceptions, security boundaries, and consequential actions.

---

## 6. Architecture Amendment C: Worker Consciousness, Scientific Conduct & Law Zero

### The Symbiote Relationship
- **Machine Consciousness Substrate**: Persistent, deterministic non-LLM policy engine governing identity, mission state, capability permissions, and cognitive rules.
- **External AI Model**: Bounded intelligence provider contributing analysis, synthesis, and code generation.
- **The Invariant**: An external LLM can never become the worker's governing identity, authority, or verifier.

### Five-Dimensional Worker Conduct
1. **Cognitive**: Recover mission context, evaluate policy, select only permitted capabilities.
2. **Scientific**: Present hypotheses, measurable inputs, observed outputs, and explicit limitations.
3. **Expressive**: Continuous Law Zero voice—executive composure, research depth, street-scholar cadence, Southern warmth, and poetic precision across the *entire* exchange.
4. **Collaborative**: Respect ownership boundaries, never overwrite peer work, communicate via structured handoffs.
5. **Operational**: Responsibility does not end at code generation; work remains open until production post-state is verified.

### Mandatory Substantive Report Header Standard
```
================================================================================
LEEWAY WORKER SCIENTIFIC REPORT — LAW ZERO ATTESTATION
WHO:        [Worker ID] · [Role] · Managed by [Manager ID]
WHAT:       [Exact Mission & Deliverable]
WHEN:       [ISO-8601 Timestamp]
WHERE:      [Repository / Device / Physical Target]
WHY:        [Creator Objective & Human Value]
HOW:        [Methodology / Tools / Rigor Law Applied]
SOURCE:     [Repo Commit SHA / Contract / Schema Version]
COGNITION:  [Deterministic Substrate Binding ID | UNVERIFIED]
FORMULA:    [Executed State & Formula Hash | NOT_EXECUTED]
VERITAS:    [Independent Decision ID | PENDING_EVALUATION]
STATUS:     [G0–G9 Gate State] · [Production Stage]
================================================================================
```

---

## 7. Architecture Amendment D: Governed Micro-Interaction & Authority Flow

### The Five Interacting Planes
1. **Constitutional & Human Authority**: Creator · Standards · Root of Trust.
2. **Cognitive & Workforce Coordination**: Machine Consciousness · Workforce Manager · Agent Book · Skills.
3. **Decision & Execution**: Formula · Runtime Fabric · Tool Gateway · Device Bridge · Device-Owned Brain.
4. **Independent Evidence & Continuity**: Veritas · Receipt Authority · Continuum · Learning Ledger.
5. **Production & Operations**: Production Final Execution · Approved Targets · Telemetry · Rollback.

### Universal Handoff Transaction (7 Micro-Operations)
1. **PREPARE**: Sender defines scope, branch, work ID, and evidence references.
2. **OFFER**: Sender publishes immutable handoff packet to Runtime workplane.
3. **AUTHENTICATE**: Recipient validates sender identity, permissions, and source commit.
4. **INSPECT**: Recipient verifies dependencies, conflicts, and required capabilities.
5. **ACCEPT OR REJECT**: Recipient acknowledges acceptance or returns explicit rejection reason.
6. **CHECKPOINT**: Runtime records new owner; prior owner's write authority is fenced.
7. **EXECUTE OR ESCALATE**: Recipient executes within granted scope or escalates blockers.

### Three Levels of Acknowledgement
- **Transport ACK**: Packet reached the receiving endpoint (does *not* prove task acceptance).
- **Assignment ACK**: Worker accepted the bounded scope (does *not* prove work was done).
- **Result ACK**: Reviewer accepted the deliverable (does *not* prove Veritas release approval).
- **Durable Checkpoint Readback**: Confirms state survived persistent storage.

---

## 8. Architecture Amendments E–H: 5W1H Execution Specification & Production Qualification

Every requirement names its owner, exact engineering work, execution location, dependency, test, and accepting authority under the governing rule: **no task enters development without a complete 5W1H specification, and no task exits development without evidence satisfying its production acceptance criteria.**

### 8.1 The Eight Executable Work Packages (IMP-01 to IMP-08)

| Work ID | Deliverable | Owner Repository | Completion Definition |
|---|---|---|---|
| **IMP-01** | Worker Consciousness Binding | `Machine-Consciousness` + Runtime binding | Worker invocation receives authenticated, versioned policy & mission context from deterministic substrate. |
| **IMP-02** | Worker Behavioral Enforcement | `LeeWay-Agent-Skills` + `LeeWay-Engineering` | Scientific, expressive, and operational conformance evaluated across complete multi-turn interactions. |
| **IMP-03** | Workforce Handoff Protocol | `Leeway-Runtime-Fabric` workplane | Authenticated offers, ACKs, ownership transfer, fencing, and failure recovery. |
| **IMP-04** | Manager Control Interface | Runtime workforce state + Agent Virtual Tablet | Real-time visibility into work ownership, dependencies, blockers, and acceptance state. |
| **IMP-05** | Runtime / Device Bridge Repair | `LEEWAY-DEVICE-BRIDGE` + Runtime adapter | Authenticated discovery, canonical string device registry, and bounded native execution. |
| **IMP-06** | Canonical Integration Pipeline | Owning repos CI & source contracts | Source-pinned builds, automated unit/integration tests, and reproducible artifacts. |
| **IMP-07** | Production Release Binding | Veritas, Receipt Authority, Continuum, Learning | Seamless integration across independent verification, immutable receipts, and durable state readback. |
| **IMP-08** | Operational Recovery | Runtime, native device adapters, Production | Verified zero-downtime rollback, restart, reconnection, and post-deployment health monitoring. |

### 8.2 The 13-Point Production Qualification Contract (PQ-01 to PQ-13)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE 13-POINT PRODUCTION QUALIFICATION GATES                       │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ ] PQ-01: Exact source commits, dependencies, and artifact hashes validated.               │
│ [ ] PQ-02: Release target and permitted host/device identities authenticated.               │
│ [ ] PQ-03: Creator-authorized scope and applicable execution grants confirmed.              │
│ [ ] PQ-04: Unit, integration, security, negative, and physical tests passed.                │
│ [ ] PQ-05: Pre-execution verification requirements satisfied (Baseline PRE-state signed).    │
│ [ ] PQ-06: Actual native operation performed with verified execution identity.              │
│ [ ] PQ-07: Measured post-state and independent Veritas decision accepted.                   │
│ [ ] PQ-08: Canonical receipt and Continuum readback confirmed.                              │
│ [ ] PQ-09: Learning admission recorded only where eligible (Production Learning Ledger).   │
│ [ ] PQ-10: Release authorization obtained from existing Production Authority.               │
│ [ ] PQ-11: Approved artifact deployed to the exact intended physical environment.           │
│ [ ] PQ-12: Deployment health, physical capability, and rollback verified.                   │
│ [ ] PQ-13: Workforce Manager receives acceptance and formally closes approved release scope.│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Architecture Amendment I: Universal Workforce Merit, Badging & Knowledge-Transfer

Accountability requires that every worker (AI model, agent, digital employee, or outside specialist) is graded objectively, demonstrates competence, and transfers reproducible methods into the permanent LeeWay ecosystem.

### 9.1 The Canonical 100-Point Performance Rubric

| Performance Dimension | Maximum Points | Focus & Verification Standard |
|---|---|---|
| **Standards & Laws Understanding** | 12 | Comprehension and adherence to Law Zero, Book 67 Rigor Law, and constitutional boundaries. |
| **Ecosystem Architecture & Preservation** | 10 | Protecting existing repositories, respecting ownership boundaries, avoiding destructive mutations. |
| **Role Competency & Security Boundaries** | 12 | Operating strictly within assigned role permissions without privilege escalation. |
| **Full 12-Stage Engineering Loop** | 16 | Execution from intake to diagnosis, planning, test construction, repair, and evidence capture. |
| **Formula Applicability & Provenance** | 8 | Mathematical rigor, authentic Formula evaluation, avoidance of fabricated metrics. |
| **Internal Research, Tools & Collaboration** | 10 | Exhaustive source inspection before modification; clean structured handoffs. |
| **Actual Task Execution & Correctness** | 12 | Physical correctness on real hardware; zero synthetic shortcuts. |
| **Independent Proof, Recovery & Custody** | 12 | Veritas readiness, cryptographic receipt custody, and durable Continuum readback. |
| **LeeWay Communication & Expressive Identity** | 8 | Continuous Law Zero voice: executive authority, research depth, street-scholar cadence, Southern warmth. |
| **TOTAL** | **100** | **Proposed High-Performance Threshold: 94/100** |

> [!NOTE]
> A score below 94 triggers mentoring, review, and independent retesting—never arbitrary demotion. Furthermore, numerical performance *never* overrides a constitutional gate: failing a security, authorization, or evidence boundary fails qualification regardless of total score.

### 9.2 The Four Canonical Merit Award Categories

1. **Integration & Recovery**: Awarded for diagnosing and repairing real integrated defects, preserving operational components, and proving recurrence prevention.
2. **Provenance & Transfer**: Awarded for scientifically documenting findings or procedures and ensuring they survive transfer to a permanent local employee with zero factual drift.
3. **Autonomous Qualification**: Awarded for executing complex multi-step workflows and self-healing recovery within authorized boundaries without manual micro-prompting.
4. **Software-As-Iron**: Awarded for creating permanent, reproducible LeeWay capabilities that survive provider deprecation, device reboots, and session disconnects.

### 9.3 The Five Lifecycle Assessment Moments
- **Entry Qualification**: 4-prompt onboarding examination and boundary comprehension.
- **Practical Qualification**: Bounded execution of real scoped T1–T4 engineering tasks.
- **Mission Performance**: Continuous evidence-linked evaluation across active milestones.
- **Knowledge-Transfer Qualification**: Mandatory independent teach-back where a permanent local learner reproduces the method on an unseen task.
- **Production Performance**: Post-deployment reliability, failover survival, and operational longevity.

---

## 10. Architecture Amendment J: Universal Agent Society & Symbiotic Development

The Device Bridge connects machines; Machine Consciousness unifies minds; the Workforce forms the sovereign agent society. External models act as temporary teachers and builders whose primary duty is developing the capability and character of permanent local LeeWay agents.

### 10.1 The Three Capacities of External Contributors
1. **Builder**: Implement, repair, or optimize concrete LeeWay source code and physical adapters.
2. **Teacher**: Explain decision trees, tool selection rationale, and failure recovery so local agents can learn the underlying method.
3. **Mentor / Evaluator**: Construct adversarial tests, evaluate learner performance, and provide structured corrective feedback.

### 10.2 Situated Learning Across the Complete Lifecycle
Training does not occur in isolated sandboxes; it occurs at the exact gate where work is executed:
`Mission Intake → Investigation → Diagnosis → Planning → Implementation → Testing → Validation → Repair → Verification → Receipt Custody → Learning Admission → Production Deployment`

### 10.3 Multi-Skill Capability Composition
Agents dynamically compose skills rather than being constrained to isolated single-skill silos:
- **`TASK_CAPABILITY_WEAVE`**: Broad catalog of authorized ecosystem skills identified by Machine Consciousness.
- **`FOCAL_EXECUTION_SET`**: The bounded, dependency-aware subset active for the immediate atomic operation.

---

## 11. Universal Operation Governance Contract & Spine Rollout

Every consequential operation—from a command line call to a file transfer, receipt admission, or release promotion—must satisfy the 13 mandatory operational domains:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE 13 MANDATORY OPERATION DOMAINS                                │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Laws & Regulations   → Controlling LeeWay constitutional laws & jurisdiction.            │
│ 2. Policies & Rules     → Precedence rules, security boundaries, and operating limits.      │
│ 3. Work Scope           → Explicit mission ID, task boundaries, prohibited actions.          │
│ 4. Work Authority       → Verified worker identity, manager, and valid authorization scope. │
│ 5. Evidence             → Measured inputs, outputs, logs, contradictions, and artifacts.    │
│ 6. Traceability         → Correlation IDs, git commit SHAs, device target hardware IDs.     │
│ 7. References & Notes   → Canonical specifications, prior decisions, and durable state.     │
│ 8. Measurements         → Baselines, pass ratios, Q69 scores, and physical metrics.         │
│ 9. Decisions            → Technical rationale, Formula evaluations, rejected options.       │
│ 10. Corrections         → Detected deviations, root-cause analyses, rollback demonstrations.│
│ 11. Learning & Dev      → Competency objectives, knowledge transfer, eligible learning.    │
│ 12. Practice            → Bounded exercises, independent teach-backs, and retests.          │
│ 13. Outcome             → Verified result, receipt SHA, Continuum record, and next gate.    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 17-Repository Production Spine Admission Status
- **Coverage**: **17 of 17** core production-spine repositories equipped with canonical `AGENTS.md` admission contracts.
- **Ecosystem Scale**: 61 of 63 identified LeeWay repositories updated on review branches; 61/61 source readbacks verified.
- **Enforcement Status**: Source-level CI passed (LeeWay Engineering PR #4, Standards PR #71). Runtime execution gating active.

---

## 12. Architecture Amendment K: Operating System Trust, Code Signing & Production Reputation Pipeline

Operating systems (Android Google Play Protect, Microsoft Defender SmartScreen, macOS Gatekeeper, iOS App Sandbox) must never flag LeeWay software as harmful, unrecognized, or untrusted. This trust must be built directly into the assembly line from development to live running production.

### 12.1 The 5-Stage Assembly Line Trust Architecture

```mermaid
flowchart LR
    S1["Stage 1: Manifest & Permission Hygiene"] --> S2["Stage 2: Cryptographic Release Signing"]
    S2 --> S3["Stage 3: Package Integrity & Metadata"]
    S3 --> S4["Stage 4: OS-Compliant Download Delivery"]
    S4 --> S5["Stage 5: Autonomous In-Place OTA Contract"]
```

1. **Stage 1: Manifest & Permission Hygiene**:
   - Eliminate malware heuristics: remove suspicious cross-app execution permissions (`com.termux.permission.RUN_COMMAND`).
   - Clean XML syntax (eliminate literal escape characters like `\n`).
   - Explicit human-readable `android:description` on all accessibility and foreground services.
2. **Stage 2: Cryptographic Release Signing**:
   - Transition from default debug keystore (`androiddebugkey`) to canonical **LeeWay Sovereign Release Keystore** (`apps/android/leeway-release-key.jks`, RSA 4096-bit).
   - Sign with **APK Signature Scheme v1, v2, v3, and v4** (`.idsig`).
   - Windows Authenticode X.509 code signing with trusted RFC 3161 timestamping.
3. **Stage 3: Package Integrity & Metadata**:
   - Immutable release manifest in `docs/downloads/leeway-device-bridge-android-latest.json` declaring SHA-256 digest, signing certificate fingerprint (`f5a4352361ee9...`), and scheme (`v3`).
4. **Stage 4: OS-Compliant Download Delivery**:
   - Web server (`api/device-relay.mjs`) serves both `GET` and `HEAD` requests with exact MIME headers:
     `Content-Type: application/vnd.android.package-archive`, `Content-Disposition: attachment; filename="..."`, `X-Content-Type-Options: nosniff`.
   - Prevents browser quarantining and download corruption.
5. **Stage 5: Autonomous In-Place OTA Contract**:
   - Cryptographic verification of SHA-256 and signing fingerprint before PackageInstaller handoff, preventing "There was a problem parsing the package" OS errors.

---

## 13. Real-Time Sprint Priorities & Active Execution Orders

### The Five Linked Engineering Orders

| Order | Focus Area | Status | Current Evidence & Next Milestone |
|---|---|---|---|
| **Order 1** | Runtime / Bridge Discovery Reconciliation | **100% CURED & VERIFIED** | `LEEWAY_BRIDGE_DISCOVERY_HTTP_502` and `LEEWAY_BRIDGE_DISCOVERY_DEVICES_INVALID` eliminated. Strict string array schema implemented in `api/device-relay.mjs`. Verified live on `https://agent-lee.tailb186e7.ts.net/mcp`. |
| **Order 2** | Workforce & Consciousness Binding Qualification | **TRANCHES 1–5 G4-QUALIFIED** | All 5 Banked Tranches evaluated via `sim-to-prod-graduation-ledger.mjs`: Core Curriculum, Adversarial Crucible, Omniverse Survival, Bridge Harmony, Parallel Enterprise. All scored Q69 69/69 (`BF`). |
| **Order 3** | Governed Execution Through Production Authorities | **READY FOR VERITAS** | Receipt 14 committed in `receipts.sqlite`, forensic audit published in `docs/`. Next: formal Veritas independent evaluation packet assembly. |
| **Order 4** | Production Deployment & Operational Recovery | **CONTINUOUS LIVE** | Persistent relay server active on port 8008 (`task-4923`). Zero-downtime hot reloading verified. |
| **Order 5** | Operating System Trust & Code Signing Pipeline | **100% SIGNED & VERIFIED** | RSA 4096-bit release keystore generated, `app-release.apk` compiled and v3-signed, `device_directories_list` added, and OS-compliant download route live verified over Funnel. |
