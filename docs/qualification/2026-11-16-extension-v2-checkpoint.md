<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.EXTENSION.QUALIFICATION
TAG: LEEWAY.EXTENSION.V2.CHECKPOINT.20261116
5WH:
WHAT = Record exact Extension Manifesto V2 source status and missing physical gates.
WHY = Keep unsigned source tests separate from Device Bridge production acceptance.
WHO = Outside LeeWay contributor supporting Creator authority, not Agent Lee.
WHERE = docs/qualification/2026-11-16-extension-v2-checkpoint.md
WHEN = 2026-11-16.
HOW = GitHub source readback, Node tests, read-only Bridge probes, and negative evidence.
LICENSE = Not asserted; existing repository terms apply.
-->
# Extension Manifesto V2 — qualification checkpoint

**Continuity:** Original Codex universal-relay / Rust Sovereign Core mission continues; Extension Manifesto V2 added. Draft PR #120 is based on `repair/universal-relay-20261116` and does not overwrite its core changes.

**Evidence FOR:** The attachment reports historical 181/181 MCP tests and Android build, not freshly repeated for Codex's final Rust edit. Current read-only Runtime Fabric returned AVAILABLE and authenticated OIDC. Bridge listed five registered devices with reachability NOT_PROBED. Primary PC device.info and device.health returned PASS controller observations with Formula NOT_EVALUATED and physical probe EXECUTED_NOT_INDEPENDENTLY_VERIFIED. 10 new extension source files passed GitHub exact-content readback 10/10. Isolated Node 22.16.0 suite passed 10/10, node --check passed, deterministic three-browser ZIPs and userscript built, ZIP integrity checked.

**Evidence AGAINST:** Primary PC directory listing returned LEEWAY_BRIDGE_UPSTREAM_ADMISSION_DENIED. No PC write, process execution, browser install, native-host interaction, Formula or independent Veritas admission occurred. The native messaging host name is a proposed contract, not an installed and authorized provider. Safari and Firefox bundles are unsigned source archives; no mobile browser parity is implied. The latest Rust test executable was historically quarantined by Windows Application Control after receipt-chain changes. Vercel commit status was success but is not hardware qualification; Android workflow 43837847321 was in_progress when checked.

**Implementation:** `apps/extension/` holds manifest.json, browser-polyfill.js, background.js, content-courier.js, floating-tablet.js, userscript-bridge.user.js, and README.md. `scripts/build-extension.mjs` builds deterministic artifacts. `tests/extension.test.mjs` runs ten positive/negative checks. `docs/integrations/EXTENSION-MANIFESTO-V2.md` defines scope.

**Next:** Bind the real enrolled LeeWay Node Native Messaging host to existing Runtime/Device Bridge admission; reject replay/wrong device/origin/owner; qualify session transport, physical Chrome/Edge captures, Firefox/Safari distribution, full MCP/Android/Rust CI and signing; obtain independent Veritas/Receipt/Learning custody and Creator-approved promotion.

**States:** SOURCE_IMPLEMENTED; ISOLATED_TESTED; GITHUB_READBACK_VERIFIED; PC_WRITE_NOT_EXECUTED; NATIVE_HOST_UNBOUND; PRODUCTION_NOT_VERIFIED.