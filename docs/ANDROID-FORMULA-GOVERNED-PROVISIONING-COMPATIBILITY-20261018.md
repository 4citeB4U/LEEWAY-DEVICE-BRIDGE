# Issue #37 — Formula-governed Android provisioning compatibility, 2026-10-18

## Investigate / diagnose
Reviewed canonical Android DevicePassport, Diagnostics, FormulaF8Gate, existing AndroidInstallPlan and Issue #37. DevicePassport reports OS/build, supported ABIs, memory/storage and capability claims, but does not prove Vulkan GPU compute acceptance. FormulaF8Gate is a **local Boolean eligibility mirror**, explicitly reporting centralized Formula `NOT_EXECUTED`. Do not falsely attribute this component to an executed Golden Formula.

## Implement
Added `AndroidProvisioningCompatibility.kt` as a **side-effect-free**, deterministic compatibility evaluator. Inputs: native-observed Android passport, LeeWay Edge GPU qualification observation, optional existing install plan. Outputs: Android compatibility, GPU qualification assessment, compute fallback, installer plan, provisioning state and canonical Formula state. Unobserved/spoofed passports and unknown/failed GPU qualification fail closed. Even a candidate reporting successful physical GPU tests is only `QUALIFIED_FOR_REVIEW` and cannot self-enable GPU, change settings or authorize installation. Distinct authority is required for each transition.

## Test → Validate → Verify
In isolated clean branch clone, using Gradle 8.9/JDK17/Android SDK:
`gradle -p apps/android :app:testDebugUnitTest --tests '*AndroidProvisioningCompatibilityTest' --tests '*AndroidInstallPlanTest' --no-daemon --console=plain`
Exited 0, `BUILD SUCCESSFUL in 20s`, 22 actionable tasks (5 executed, 17 up-to-date).
Generated JUnit XML individually checked:
- `AndroidProvisioningCompatibilityTest`: 6 tests, 0 failures, 0 errors, 0 skipped.
- `AndroidInstallPlanTest`: 7 tests, 0 failures, 0 errors, 0 skipped.
Total **13/13 PASS**.
Kotlin compiler noted two unnecessary non-null assertion warnings in evaluator; no failed checks. No APK install or device state mutation.

## Integration / authority caveat
The evaluator is **not yet wired to live DevicePassport or runtime ingress**. JSON fields labeled `authority` in a passed object are data and **not cryptographic or trusted origin evidence** on their own. The next slice must only pass server/runtime-derived passport observations and canonical GPU qualification receipts, refuse direct remote injection of 'verified' GPU data, and obtain a distinct authorized Formula/provisioning execution decision. Current `computeMode=CPU_SAFE_FALLBACK` is a planning response, not a host setting write. Don't claim auto-setup, performance uplift, or GPU OS registration from these tests.

## Engineering loop / ownership
Investigate → Diagnose → Plan → Implement → Test → Validate → Verify → Evidence completed for **pure compatibility evaluation only**. Execution/physical provisioning and canonical Formula were NOT EXECUTED, and therefore no canonical Veritas receipt or Learning Ledger update. No replacement PackageInstallBroker or new runtime/registry. Fold6 production, GPU kernels and Apple J-7 unchanged.
