<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.NOTEBOOK
TAG: LEEWAY.DEVICE.BRIDGE.NOTEBOOK.MIGRATION
5WH:
WHAT = Define source ownership and safe migration of the existing Chrome Notebook bridge into Device Bridge.
WHY = Reuse one governed device-facing capability instead of maintaining an unauthenticated standalone control plane.
WHO = Device Bridge owner, LeeWay Agent Skills consumers and authorized human.
WHERE = docs/integrations/NOTEBOOKLM-DEVICE-BRIDGE.md.
WHEN = 2026-10-27.
HOW = Preserve historical source, qualify adapter interfaces and separately cut over hosts.
LICENSE: MIT.
-->
# NotebookLM via LeeWay Device Bridge

**State: SOURCE ADAPTER ONLY — NO LIVE HOST ROUTE, NO CHROME INSTALLATION, NO VERIFIED NOTEBOOK WRITE.**

## Reuse and source
The existing Chrome MV3 extension, relay, artifact promotion and local Boot Fabric source remain at [LeeWay Intellectual Estate](https://github.com/4citeB4U/LEEWAY-INTELLECTUAL-ESTATE/tree/main/tools/notebook-direct-git-bridge). Do not destroy, copy secrets from or falsely claim migration of the live installation.

The existing general agent capability is [leeway-google-ecosystem-bridge](https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/skills/leeway-google-ecosystem-bridge/SKILL.md); do not create a competing NotebookLM skill. Notebook-specific device capabilities now have an additive host-neutral implementation contract in `operator/notebook/notebook-capability-adapter.mjs`.

## Ownership after qualification
- **Standards** governs permissions and lifecycle.
- **Device Bridge** owns device/Chrome session adapter binding and remote capability entry/host gate, but not Gemini/Google account credentials.
- **Agent Skills** owns capability selection, source-grounding and Agent Lee orchestration.
- **Existing Notebook Bridge** provides only historical implementation/source inputs until a migration and evidence-preserving retirement are approved.
- **GitHub evidence owner** stays canonical until an authorized transition is verified. Historical receipts and binary Studio artifacts must not be silently moved or overwritten.
- **Independent Veritas/Receipt/Learning** remain the existing authorities, never emulated by this adapter.

## Capability IDs
`notebook.status` is discovery/read-only. `notebook.prompt`, `notebook.studio.capture`, and `notebook.studio.generate` are potentially consequential operations requiring a trusted host authorization decision and explicit approved notebook scope. Client-provided approval booleans do not constitute authority: the injected `authorize` implementation must validate creator/owner identity and an authentic authorization lease or trusted session. Unsupported actions fail closed.

## Source-first migration order
1. Inventory running original extension and localhost relay state, source SHA, host binding and historical receipt target; do not infer from Chrome toolbar icon.
2. Inspect legacy open-CORS unauthenticated `/command`, `/next-command`, `/exchange`, `/ingest` surfaces. Do not call the legacy gateway from remote agent sessions until authentication, origin/session binding, replay and integrity are qualified.
3. Reuse the existing Device Bridge transport identity and authenticated Tool Gateway; bind a verified Chrome/NotebookLM adapter with only the approved notebook URL/ID. No external public tunnel or broad raw browser command interface.
4. Enroll an actual host-executing adapter implementing `sessionBinding`, `authorize`, and `execute`. Enrollment must be explicit and exact; source existence is not registration.
5. Run negative tests: no token, forged origin, wrong notebook ID, expired/replayed grant, wrong device, wrong user, malformed command, denied mutation, session absent, Studio DOM change, interrupted download and content checksum failure.
6. Run authorized real-session tests on the installed host, validate artifact ingestion and durable independent readback. Verify all outputs against the originating Notebook source.
7. Review independent evidence and perform reversible cutover to Device Bridge; retire old relay only after preserved data and real-path acceptance. Every retry returns to the original owner mission.
8. Verify skill discovery through Agent Skills, then model-to-tool routing through actual host MCP. A documentation or repository link alone is **not** tool availability.

## Platform statement
Portable core contract ≠ installed Chrome extension ≠ current PC/browser verified ≠ phone/iOS browser adapter. Windows DPAPI and GitHub CLI are previous implementation details, not a universal requirement.

## Test command (when checked out with Node.js)
`node --test operator/notebook/notebook-capability-adapter.test.mjs`

The tests use fake host providers. Their outcomes never qualify actual NotebookLM, GitHub write, Device Bridge remote dispatch, Veritas or receipt.
