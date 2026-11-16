<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.EXTENSION.CONTRACT
TAG: LEEWAY.EXTENSION.MANIFESTO.V2
5WH:
WHAT = Define a browser-native adapter for the existing sovereign Device Bridge.
WHY = Connect browser work to enrolled devices without creating a parallel command plane or ambient data capture.
WHO = Creator Leonard Jerome Lee and governed outside LeeWay extension contributors.
WHERE = docs/integrations/EXTENSION-MANIFESTO-V2.md
WHEN = 2026-11-16 continuation of the universal relay and symbolic engine checkpoint.
HOW = MV3 packages, owner gesture, bounded observations, native host admission, negative tests and physical gates.
LICENSE = Not asserted; repository license decision remains with owner.
-->
# Extension Manifesto V2 — LeeWay Sovereign Browser Courier

**Source authority:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`. **Design version:** V2. **Browser packaging standard:** WebExtensions Manifest V3 (MV3). These version numbers describe different things.

## Existing architecture, not replacement

The extension is a replaceable browser client. LeeWay Runtime Fabric owns authenticated workflow state and request correlations. Device Bridge owns enrolled device identity, grants, platform execution and raw browser observation transport. Device-local Digital Brain and Diagnostics remain on their physical host, never copied into a shared web profile as if they were fleet-owned. Continuum, Formula, independent Veritas, Receipt Authority and Learning Ledger retain separate existing authority. Neither the extension nor its userscript executes device commands, evaluates Formula, creates qualified receipts or promotes Learning.

## V2 modules

- `manifest.json`: small permissions (`activeTab`, `scripting`, `nativeMessaging`) and explicit toolbar activation; no all-sites ambient permission.
- `browser-polyfill.js`: browser messaging Promise/callback adapter only.
- `background.js`: per-request typed observation validation, trusted extension sender check and handoff to installed native host `com.leeway.devicebridge`. The host is an **integration contract placeholder** until an independently tested native messaging host is installed and enrolled. No assumption that a browser worker maintains a persistent WebSocket.
- `content-courier.js`: selected text only. Labels ChatGPT/Gemini/NotebookLM/Web by hostname; does not infer assistant authorship, role, conversation chronology or completion.
- `floating-tablet.js`: explicit selection submission and truthful local connection status, not autonomous tablet/device control.
- `userscript-bridge.user.js`: standalone selection-only mirror; **not** a remote transport or native-control surrogate.

## Transport and consent

`Owner toolbar click → active-tab injection → user selects text → panel Send click → sender + origin + size + recency checks → Native Messaging host → owner-qualified Device Bridge / Runtime → optional governed processing → independent outcome evidence`.

A Native Messaging host may later provide an authenticated short-lived loopback WebSocket ticket for `ws://127.0.0.1:4280` or an enrolled provider-agnostic endpoint. Do not connect to a raw localhost socket with an anonymous shared token. The Native Messaging host must verify installation/browser extension identity and owner-consent/grant at the receiving endpoint; JavaScript source validation alone is not security authority. The extension never stores private OIDC tokens, signing keys, or credentials in browser storage.

The current V2 package deliberately **does not implement** a persistent WebSocket session, tab automation, background scraping, five-agent transcript attribution or direct physical device execution. Those require separate, owner-admitted transport and live platform qualification. No browser page receives native execution privilege merely by installing an extension.

## Native host protocol V2 (proposed adapter contract)

Input envelope: `{type:"browser.observation.submit", version:2, requestId:<UUID>, tabId:<number>, snapshot:{protocolVersion:2,origin,category,pageTitle,selectedText,capturedAt,attribution:"USER_SELECTION_ONLY",interaction:"READ_ONLY"}}`.

A real host may return `{version:2,requestId:<same UUID>,ok:true,admission:"ACCEPTED"}` **only after authenticating and authorizing this exact observation**; this is still `NATIVE_ACCEPTED_NOT_VERITAS_VERIFIED`. The host must reject stale/replayed requests, wrong extension identity, untrusted origin, oversized inputs, expired/revoked owner grants, bad provenance and missing device passport. No forwarding to a device execute capability without the existing Runtime/C3 gates.

## Distribution / qualification

`node scripts/build-extension.mjs` creates deterministic unsigned ZIPs for Chromium (Chrome/Edge), Firefox and Safari source flavors, a separate userscript and SHA-256 manifest. ZIP packaging is not Chrome Web Store signing, Firefox signing or Safari native App Extension compilation/notarization. Safari and mobile browser integration must be tested against actual platform support and cannot be claimed from a ZIP. Store-specific identity and allowed Native Messaging origins must be generated by an authorized installer, not hardcoded as one global browser ID.

Required progression: source lint/syntax → negative message tests → deterministic ZIP checks → signed native host + browser-install binding → real browser click/capture/readback → Chrome and Edge separate profile tests → Firefox/Safari platform tests → real Runtime/Formula/Veritas/Receipt admission and recovery. Record missing gates as `NOT_EXECUTED`, and never use green tests as independent physical evidence.

## Existing failure boundaries retained

The previous symbolic engine transcript reports a completed 181/181 MCP suite and Android builds but also an unsigned Windows Rust binary quarantine after late receipt changes. That report is historical, not a fresh final Rust verification. Primary PC read-only Device Bridge discovery provides no write/desktop-control permission; local directory listing was denied. This extension source does not alter or declare the universal Rust Core production-ready, alter live relay state or override current C3 admission.
