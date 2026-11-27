<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.BROWSER_EXTENSION
TAG: LEEWAY.EXTENSION.V2.README
5WH:
WHAT = Installation and qualification truth for the owner-initiated browser extension.
WHY = Differentiate Manifest V3 source from native host, production execution and store releases.
WHO = Creator-authorized Device Bridge contributors.
WHERE = apps/extension/README.md.
WHEN = 2026-11-16.
HOW = Describe native-host protocol, packaging, portability and acceptance boundaries.
LICENSE = Existing repository terms; no new license asserted.
-->
# LeeWay Sovereign Device Bridge — Extension Manifesto V2 adapter

This is a **browser client of the existing LeeWay Device Bridge**, not a second Runtime, Formula, identity issuer, Device Bridge, Digital Brain, Diagnostics, Veritas or receipt service. Source design is browser-agnostic where possible; installations and device execution are not yet qualified.

## Entry and consent

Click the browser toolbar action on an HTTP(S) tab. It injects the tablet **only into that user-selected tab** under `activeTab`. Click **Connect** to request the installed native messaging host `org.leeway.device_bridge`. The native host must authenticate the owner and the device using the existing LeeWay Runtime/Device Bridge path; it must return `leeway.extension.hello-ack` with `version:2`, `authenticated:true`, `sessionId`, and `capabilities:["page.excerpt.submit"]`. The extension cannot self-issue this reply.

Select text on a page, then click **Share selected text**. An 8192-character maximum excerpt (current HTTP(S) URL and bounded title) is submitted. The host must return a request-ID and session-ID-matched `leeway.extension.receipt` with `accepted:true`. This means native-host acknowledgement only, never Formula, execution, Veritas, custody or Learning success. Credentials are never passed to the content script or saved by the extension. No silent DOM collection, keyboard capture or automatic remote commands.

## Distribution

- Chromium desktop (Chrome/Edge): package `manifest.json` and the five `.js` files plus `README.md`. This is a **Manifest V3 extension**, implementing the product's **Manifesto V2** requirements.
- Firefox desktop: package the same JavaScript but rename `manifest.firefox.json` to `manifest.json` in the Firefox artifact; Firefox platform review and native-host registration are still required.
- Safari/iOS: WebExtension packaging requires a native Apple Xcode container, Apple entitlements, and applicable platform restrictions. A Chromium zip is not a signed IPA or Safari release. iPhone browser-wide native control is not asserted.
- Browsers that support only userscripts: `userscript-bridge.user.js` copies selected text after a direct click; it **does not** authenticate to or execute on Device Bridge.

`org.leeway.device_bridge` is a proposed native-host registration identifier. The host installer, platform manifests, signing, authority-bound hello-ack and native-host registration are **not included** here and must be integrated with the approved LeeWay Node installer rather than being faked in JavaScript. Service workers are event-driven; persistent background execution or local mesh sockets are **not** asserted. An authenticated, host-bound WebSocket adapter may be added when the real native host and original durable routing are qualified; avoid blindly using an unauthenticated `ws://127.0.0.1` port.

## Source and device gates

Run `node --test tests/extension-v2.test.mjs` at the repository root and validate package manifests. Then independently test Chrome/Edge and Firefox on enrolled desktop hosts and Safari through the approved native Apple app. A valid package is not a hosted installation; neither a native host handshake fixture nor a local test can claim real hardware execution or canonical Veritas approval.

<!-- LEEWAY UNIVERSAL FORMULA GOVERNANCE BEGIN -->

# LeeWay Universal Formula Governance

Authority: Creator and LeeWay Standards.
Formula identity: LEEWAY-FORMULA-v1.0.

The canonical LeeWay Formula is mandatory throughout
the entire LeeWay ecosystem.

Every current and future application, capability,
agent, worker, employee, model, provider, adapter,
automation and integration inherits this requirement.

All applicable interactions, responses, decisions,
actions, revisions, executions, computations, model
inferences, resource allocations, information transfers,
memory operations, storage operations and deployments
must consume the canonical Formula through their
authorized and qualified domain contracts.

Formula availability, documentation, configuration,
health and historical results do not constitute actual
Formula consumption for a new operation.

Recover relevant authorized memory before substantive
work. Preserve identity, provenance, Formula integrity,
authorization, original receipts and verified learning.

Never invent observations, adapter mappings, mathematical
results, execution evidence or independent verification.

No application may bypass applicable Formula governance
by dispatching directly to a provider.

Every new application and capability must demonstrate
applicable Formula consumption before production admission.

Preserve the existing authority hierarchy:

Creator > Standards > Root of Trust > Runtime Fabric >
Agent Lee > Harness > Formula > skills/models/tools >
execution > Veritas > Receipt Authority > Learning Ledger.

Execute the complete engineering loop:

INVESTIGATE > DIAGNOSE > PLAN > IMPLEMENT > TEST >
VALIDATE > REPAIR > RETEST > VERIFY > EVIDENCE >
CHECKPOINT > CONTINUE.

Documentation compliance does not establish executable
enforcement or production admission.

<!-- LEEWAY UNIVERSAL FORMULA GOVERNANCE END -->
