<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.NOTEBOOK
TAG: LEEWAY.DEVICE.BRIDGE.NOTEBOOK.MIGRATION
5WH:
WHAT = Define source ownership and safe migration of the existing Chromium Notebook bridge into Device Bridge.
WHY = Reuse one governed device-facing capability instead of maintaining an unauthenticated standalone control plane.
WHO = Device Bridge owner, LeeWay Agent Skills consumers and authorized human.
WHERE = docs/integrations/NOTEBOOKLM-DEVICE-BRIDGE.md.
WHEN = 2026-10-27.
HOW = Preserve historical source, qualify adapter interfaces and separately cut over hosts.
LICENSE: MIT.
-->
# NotebookLM via LeeWay Device Bridge

**State: SOURCE ADAPTER ONLY — NO LIVE HOST ROUTE, NO CHROME/EDGE INSTALLATION, NO VERIFIED NOTEBOOK WRITE.**

## Reuse and source
The existing Chromium MV3 extension, relay, artifact promotion and local Boot Fabric source remain at [LeeWay Intellectual Estate](https://github.com/4citeB4U/LEEWAY-INTELLECTUAL-ESTATE/tree/main/tools/notebook-direct-git-bridge). Do not destroy, copy secrets from or falsely claim migration of the live installation.

The existing general agent capability is [leeway-google-ecosystem-bridge](https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/skills/leeway-google-ecosystem-bridge/SKILL.md); do not create a competing NotebookLM skill. Notebook-specific device capabilities now have an additive host-neutral implementation contract in `operator/notebook/notebook-capability-adapter.mjs`.

## Ownership after qualification
- **Standards** governs permissions and lifecycle.
- **Device Bridge** owns device/browser-profile session adapter binding and remote capability entry/host gate, but not Gemini/Google account credentials.
- **Agent Skills** owns capability selection, source-grounding and Agent Lee orchestration.
- **Existing Notebook Bridge** provides only historical implementation/source inputs until a migration and evidence-preserving retirement are approved.
- **GitHub evidence owner** stays canonical until an authorized transition is verified. Historical receipts and binary Studio artifacts must not be silently moved or overwritten.
- **Independent Veritas/Receipt/Learning** remain the existing authorities, never emulated by this adapter.

## Capability IDs
`notebook.status` is discovery/read-only. `notebook.prompt`, `notebook.studio.capture`, and `notebook.studio.generate` are potentially consequential operations requiring a trusted host authorization decision and explicit approved notebook scope. Client-provided approval booleans do not constitute authority: the injected `authorize` implementation must validate creator/owner identity and an authentic authorization lease or trusted session. Unsupported actions fail closed.

## Source-first migration order
1. Inventory running original extension and localhost relay state, source SHA, host binding and historical receipt target; do not infer from Chrome toolbar icon.
2. Inspect legacy open-CORS unauthenticated `/command`, `/next-command`, `/exchange`, `/ingest` surfaces. Do not call the legacy gateway from remote agent sessions until authentication, origin/session binding, replay and integrity are qualified.
3. Reuse the existing Device Bridge transport identity and authenticated Tool Gateway; bind a verified Chrome or Microsoft Edge NotebookLM adapter with only the approved notebook URL/ID. No external public tunnel or broad raw browser command interface.
4. Enroll an actual host-executing adapter implementing `sessionBinding`, `authorize`, and `execute`. Enrollment must be explicit and exact; source existence is not registration.
5. Run negative tests: no token, forged origin, wrong notebook ID, expired/replayed grant, wrong device, wrong user, malformed command, denied mutation, session absent, Studio DOM change, interrupted download and content checksum failure.
6. Run authorized real-session tests on the installed host, validate artifact ingestion and durable independent readback. Verify all outputs against the originating Notebook source.
7. Review independent evidence and perform reversible cutover to Device Bridge; retire old relay only after preserved data and real-path acceptance. Every retry returns to the original owner mission.
8. Verify skill discovery through Agent Skills, then model-to-tool routing through actual host MCP. A documentation or repository link alone is **not** tool availability.

## Browser parity — Chrome and Microsoft Edge

**Single extension codebase, separate verified installations.** The historical Manifest V3 extension relies on Chromium-compatible `chrome.*` APIs, which Microsoft Edge supports in its extension environment; do not fork a second service merely to change browser branding. Chrome and Edge installations have independent extension identity, profile data, sign-in cookies, and allowed local host bindings. Confirm the real ID in each browser rather than copying the previously observed Chrome ID to Edge.

**Existing legacy source** (review before copying or installing): `4citeB4U/LEEWAY-INTELLECTUAL-ESTATE/tools/notebook-direct-git-bridge/extension/` and `manifest.json` version 0.1.5. Source remains there until code plus historical evidence is deliberately and reversibly migrated into this owner; the file is **not** a production-safe Device Bridge extension because the companion 43117 relay has unauthenticated commands and broad CORS.

**Installation inspection (local operator action; not completed from this chat):**
- Chrome: open `chrome://extensions`; choose the authenticated profile; find the LeeWay extension and inspect enabled status, errors and ID.
- Edge: open `edge://extensions`; choose the authenticated profile; find the LeeWay extension and inspect enabled status, errors and ID.
- If missing, inspect the previously approved extension source, validate its manifest and provenance, and use each browser's Developer mode → Load unpacked **only after** the local relay/security review. Do not accept a warning by blindly bypassing protections.
- In **both** browsers open `https://notebook.google.com/`, validate actual account and notebook identity, and ensure the signed-in profile has authorized access.

**Qualified session scope:** `browser = chrome | edge`, `profileId` non-empty, `origin = https://notebook.google.com`, verified `notebookId` and `requestId`. The adapter rejects other browser IDs, origins and unbound profiles. A host must derive these from trusted browser/session telemetry; untrusted page JSON or client claims alone do not establish verified identity. Operator grants bind device, browser, profile, notebook, requested action and expiration/replay controls before live mutation.

**Parity acceptance:** run the same request/response, screenshot-visible interface, Studio generation, artifact hash/readback and denial scenarios in both Chrome and Edge **separately**. File download behavior, service-worker lifecycle, current NotebookLM DOM and account login should be tested with the installed browser versions. One browser passing does not qualify the other.

**References:** [Microsoft's Chrome-to-Edge port guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/developer-guide/port-chrome-extension) and [unpacked extension deployment](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/hosting-and-updating).

## Platform statement
Portable core contract ≠ installed Chrome/Edge extension ≠ current PC/browser verified ≠ phone/iOS browser adapter. Windows DPAPI and GitHub CLI are previous implementation details, not a universal requirement.

## Test command (when checked out with Node.js)
`node --test operator/notebook/notebook-capability-adapter.test.mjs`

The tests use fake host providers. Their outcomes never qualify actual NotebookLM, GitHub write, Device Bridge remote dispatch, Veritas or receipt.
