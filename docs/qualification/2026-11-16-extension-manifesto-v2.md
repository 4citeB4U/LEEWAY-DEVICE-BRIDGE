<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.QUALIFICATION
TAG: LEEWAY.EXTENSION.MANIFESTO.V2.CHECKPOINT
5WH:
WHAT = Scope and evidence boundary for the continuing Codex-to-ChatGPT extension task.
WHY = Preserve local unpublished relay work and avoid promoting an unqualified browser adapter.
WHO = Creator and outside support contributor GPT-6.
WHERE = docs/qualification/2026-11-16-extension-manifesto-v2.md.
WHEN = 2026-11-16.
HOW = Source-first governance, code review, unit tests and bounded continuation.
LICENSE = Existing repository terms; no new license asserted.
-->
# Extension Manifesto V2 — bounded engineering checkpoint

**MISSION:** Continue existing universal Device Bridge / relay and Rust Sovereign Core work; add only the missing browser extension front door. Do not overwrite Codex's reported uncommitted 32-file workspace. Source baseline from GitHub `main` at `f334980a4a3c05378eefd2060900d8c6f2c20f43`, verified at investigation time; branch publication, CI and actual file hashes are separate evidence.

**Source classification:** relay/router source exists; on main the `apps/extension/` directory did not exist (verified by GitHub Contents 404). The provided `The symbolic engine..txt` contains a six-path proposed extension layout and a truncated manifest excerpt, not a complete usable manifest or code for this adapter. A separate older launcher extension in `Agent-Lee-The-Sum-of-All-Systems` exists but is not an authenticated Device Bridge courier; no replacement authority introduced.

**Expected:** browser toolbar opens a bounded tablet; explicit user selection goes through authenticated native messaging to the existing Bridge; no fixed `pc-primary`/`pc-hp-secondary` lock; no host credentials in page scripts; fail closed without host; keep platform variants separate.

**Observed before repair:** no packaged extension; existing `api/device-relay.mjs` main has `OWNER_ENROLLED_PC_IDS` and `volatileRoomState`, so the *existing relay production acceptance remains blocked*, independent of the extension source.

**Security:** `activeTab`, `scripting`, `nativeMessaging`; no `<all_urls>` content script injection, no background network listener, no raw device command capability, no secrets, no universal paths; HTTP(S) selection-only, max 8192 chars; native handshake explicitly indicates owner authentication but is **not independently confirmed here**. Avoid a hardcoded loopback mesh token or copied OIDC credential. The native messaging host is an external existing-provider integration requirement.

**Engineering stages:** INVESTIGATE (source and live read-only bridge inspected); DIAGNOSE (extension missing, native-host boundary); PLAN (on-demand MV3, Firefox variant); IMPLEMENT (files in `apps/extension/`); TEST (run exact local commands and record separately); VALIDATE (source/static only until native host); REPAIR/RETEST (only if tests show defect); VERIFY (source readback and CI to be measured); EVIDENCE (this file and test outputs); CHECKPOINT (GitHub branch after scope check); CONTINUE (native host/real browser acceptance next). Neither this file nor its publication is a Receipt Authority record.

**Against claims of completion:** no live primary-PC write/tool execution from this ChatGPT read-only Device Bridge connector; PC directory read returned `LEEWAY_BRIDGE_UPSTREAM_ADMISSION_DENIED`; no production browser install, native messaging host callback, signed Chrome/Firefox/Safari package, Formula evaluator, independent Veritas, new Receipt Authority ID or Learning admission for this extension.

**Rollback:** remove this isolated extension branch/path; canonical main's relay, Rust local work, Runtime, running devices and existing receipts are not changed by source-only extension authoring.
