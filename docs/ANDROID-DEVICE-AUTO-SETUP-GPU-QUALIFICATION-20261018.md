# Issue #37 — Android Device Bridge discovery, GPU qualification and setup contract (2026-10-18)

## Mission
When LeeWay Device Bridge detects an Android device, it should rapidly establish a **read-only capability passport**, explain what is supported, build a device-specific installation/compute plan, request authority for consequential changes, and then verify every completed operation. "Detected" must not be conflated with "configured," "GPU supported," "optimized," or "registered as a virtual GPU."

## Reuse existing authority
- Existing Device Bridge `DevicePassport`, `Diagnostics`, `PackageInstallBroker`, `RemoteCommandRouter` and local authority/receipt services are the primary Android integration points.
- Issue #37 and draft PR #38 contain the Android installer preflight and 7/7 passing JVM unit tests. No replacement installer, competing Runtime Fabric or second registry.
- LeeWay Edge GPU and Runtime Fabric Discovery are the authoritative owners of GPU provider qualification/registration and ecosystem update propagation respectively. Device Bridge should carry observations and approved requests, not impersonate the GPU driver.

## Engineering loop and milestones
1. **Investigate:** observe Android API/build, SoC/GPU vendor/model, Vulkan version, supported extensions/features, CPU/ABI, memory/storage, temperature and thermal status if available, power state, installed LeeWay packages/versions, relevant hardware accelerators, active provider identities, and current granted permissions. Record UNKNOWN when APIs do not expose facts.
2. **Diagnose:** classify compatibility separately for Vulkan compute, models/quantizations, memory/VRAM policy, device transport, APK upgrade, graphics registration, and optional GPU acceleration. Identify known-bad shader/pipeline configurations; never claim support from a GPU marketing name.
3. **Plan:** deterministic device passport + compatibility report + smallest reversible configuration or package action. Resource-aware selection must honor operating-system sandbox limits, thermal limits and model quality/correctness gates. CPU fallback is required.
4. **Implement (only after owner approval where required):** use Android's authorized installation flow and canonical package hash; select a qualified compute provider and models, without silently modifying device drivers, sideload/security policy, privileged services, firmware or unrelated apps.
5. **Test:** known-answer deterministic CPU control; identical settings on Vulkan/GPU; pipeline creation, output correctness, repeatability, basic throughput, thermal and memory stability. Distinguish shader validation from live GPU pipeline success.
6. **Validate / Repair / Retest:** on mismatch or instability, fail closed for GPU path, preserve CPU mode, report exact offending pipeline/feature. Never silently substitute unverified acceleration.
7. **Verify / Evidence:** observe installed package identity/version/signature, successful launch, actual GPU compute use, correctness and performance under comparable settings; link canonical Veritas receipts and Learning Ledger only when executed by authorized providers.

## Acceptance states (separate)
- DEVICE_DISCOVERED — observed presence only.
- CAPABILITIES_OBSERVED — valid hardware/OS capability report.
- INSTALL_PLAN_READY — package/transport/integrity requirements planned; no installation.
- INSTALLER_HANDOFF — Android installer opened; no installed-state claim.
- PACKAGE_VERIFIED — installed identity/version/signature validated.
- COMPUTE_PROVIDER_QUALIFIED — tested provider and workload combination with known-answer correctness.
- PERFORMANCE_BASELINE_RECORDED — actual comparative metrics measured under controlled conditions.
- OPTIMIZATION_ACCEPTED — only if correctness and thermal/stability criteria pass.
- GPU_OS_REGISTERED — only if an actual OS/graphics API enumeration demonstrates that registration; compute-through-Adreno alone does not satisfy it.

## Known present boundary
Existing Fold6 Adreno 750 Vulkan capability probes and SPIR-V static candidates have evidence, but Qwen3 Q4_K physical Vulkan pipeline creation/correctness remained BLOCKED at last recorded checkpoint. Android auto-setup must therefore **not** automatically enable this unqualified GPU path. No performance or smoothing improvement may be claimed before actual benchmarks.

## Safety
Read-only discovery may run on attachment with user-granted device access; all installs, upgrades, permission grants, provider changes and configuration writes require explicit relevant authority and a rollback plan. Never enable unknown sources, disable Auto Blocker, change USB/debug/security settings, or install graphics drivers just for auto setup. Redact serials, secrets and certificate material in shared contributor reports.

## Contributors' next slices
A. Read-only Android GPU/device passport tied to canonical Device Bridge observation IDs, with mocked UNKNOWN/failure tests.
B. Compatibility evaluator that joins passport observations to LeeWay Edge GPU provider qualification; CPU fallback and GPU blocked state for unknown/failed kernels.
C. Approved APK install/configuration orchestration using existing broker and PR #38 preflight (post-merge/qualification); independent installed-state verification.
D. Comparative performance acceptance matrix (correctness first, throughput/memory/thermals next); receipts and discovery broadcasts after verified state changes.

No phone or production app changes in this documentation-only checkpoint. No canonical Veritas receipt or Learning Ledger update.
