# LeeWay Device Bridge — verified CI and executable tool connection evidence

LEEWAY HEADER — DO NOT REMOVE  
REGION: LEEWAY.DEVICE_BRIDGE.QUALIFICATION  
TAG: DEVICE_BRIDGE_CI_TOOL_PARITY_20261025  
WHAT: Independently read back real GitHub CI and identify the existing MCP execution boundary.  
WHY: Recognize passing tests without misrepresenting unconnected live tools or newer commits.  
WHO: LeeWay Industries, owner-authorized evidence review.  
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE.  
WHEN: 2026-10-25.  
HOW: GitHub Actions run/job readbacks and source-indexed MCP entrypoint inspection.  
AUTHORITY: OWNER_APPROVED_ENGINEERING_EVIDENCE; NOT a production Veritas receipt.  
LICENSE: Existing LeeWay repository terms.

## Verified CI against exact PR-head SHA

SHA: `7ff306379e763e7dba519a18d592dfed13896fe5`

- Portable protocol and MCP: [GitHub Actions run 40134915549](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/40134915549) **completed, success**. Jobs `protocol (windows-latest)`, `protocol (ubuntu-latest)`, and `protocol (macos-latest)` each completed **success**; `npm ci --ignore-scripts` and `npm run test:mcp` steps each returned **success**.
- Android Build: [GitHub Actions run 40134915438](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/40134915438) **completed, success**. Source and contract qualification, Android SDK 35, compact build, package measurement/hash, and artifact upload steps **success**. GitHub Pages publication step was **skipped**, not passed.
- Earlier head `60cb14c81073e282a7fc57e478c16e718673b6fe`: [Android run 40128234428](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/40128234428) and [MCP run 40128234462](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/40128234462) each report completed success.

**Scope:** These CI passes are valid for the recorded heads. They do not retroactively certify later source changes. Newer commit `c64411b63e8ad7175ad1bbe601daae9418ec81b9` was examined through the available PR-triggered run lookup; no associated runs were returned. This API is PR-filtered and first-page-limited, so a no-result response does **not** prove no CI exists. Fresh later-head check-run verification remains unestablished.

## Existing executable Device Bridge interface (source established)

- `apps/desktop/mcp-server.mjs` — existing official MCP SDK stdio server, `createServer(bridge)`, named `leeway-device-bridge`.
- `operator/device-bridge-cli.mjs` — documented `probe --config FILE` opens an MCP session and enumerates live tools; `mcp --config FILE` runs existing local stdio MCP. No new controller required.
- `clients/remote-controller/device-mcp-gateway.mjs` — existing gateway, whose inspected ready message declares `mutationRoutesEnabled:false`.
- `tests/mcp/bridge.test.mjs` — official SDK roundtrip, fail-closed without qualified C3 admission.

## Live ChatGPT connection and production parity boundary

At evidence capture, the conversation exposed GitHub and Desktop Commander connectors, but **no `leeway-device-bridge` callable tool**. Plugin discovery did not return an installed LeeWay Device Bridge plugin. Desktop Commander had reached its monthly remote-command allowance and must not be retried. Consequently a live Device Bridge `tools/list` and authenticated `tools/call` was **NOT EXECUTED** through ChatGPT. This is a connection/registration limitation, not proof that the source MCP implementation is missing.

**Pass criteria for live executable connection:**
1. Register the **existing** LeeWay Device Bridge MCP server with the supported ChatGPT integration or Tool Gateway; user must explicitly connect any external plugin.
2. Authenticate the device/owner-controlled tool session and enumerate actual tool names and schemas via `tools/list`.
3. Exercise a bounded read-only device command, matching exact request/response, device identity and capability evidence.
4. Verify rejection of an unadmitted mutation and confirm no side effects.
5. Independently verify any privileged production operation and correlate Veritas, Continuum, Receipt Ledger and Learning Ledger receipts.
6. Do not treat GitHub CI fixture success, MCP server source existence or a separate Desktop Commander tool as evidence of live LeeWay Device Bridge execution.

## Status

- **Repository MCP implementation**: PRESENT.
- **Verified OS matrix and Android workflow at identified SHA**: PASS.
- **Later-head CI**: NOT VERIFIED BY AVAILABLE PR-FILTERED RUN LOOKUP.
- **Live LeeWay Device Bridge tool in this ChatGPT session**: NOT CONNECTED.
- **Full operational parity with Desktop Commander**: NOT ESTABLISHED.
- **Production privileged authorization and receipt chain**: NOT ESTABLISHED.

Retain all positive engineering evidence. These missing live proofs must be recorded without inventing test, identity, signature, or receipt outcomes.
