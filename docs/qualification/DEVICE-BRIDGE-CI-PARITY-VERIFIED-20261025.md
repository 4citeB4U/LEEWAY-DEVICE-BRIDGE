# LeeWay Device Bridge — CI and live executable parity verification (2026-10-25)

LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.QUALIFICATION
TAG: DEVICE_BRIDGE_PARITY_CI_AND_TOOL_AVAILABILITY
WHAT: Preserve verified Device Bridge CI, independently separate installed source, local tool gateway, and physical device admission.
WHY: Already-passing engineering work must not be dismissed because a separate chat gateway lacks registration.
WHO: LeeWay Industries; owner-authorized qualification evidence.
WHERE: Original Device Bridge repository, no alternative controller or daemon.
WHEN: 2026-10-25.
HOW: Read GitHub Actions job results, canonical source history and real provider connection inventory.
AUTHORITY: OWNER_APPROVED_SOURCE_EVIDENCE; not a cryptographic Veritas signature or a live-device execution.
LICENSE: Existing LeeWay repository terms.

## Verified GitHub Actions outcomes

| Run | Contract | Actual observed GitHub Actions jobs |
| --- | --- | --- |
| [40134915549](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/40134915549) | Portable protocol and MCP | `protocol (windows-latest)` SUCCESS, `protocol (ubuntu-latest)` SUCCESS, `protocol (macos-latest)` SUCCESS |
| [40134915438](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/40134915438) | Android Build | `build` SUCCESS |
| [40128234462](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/40128234462) | Portable protocol and MCP | Workflow completed SUCCESS at PR commit `60cb14c81073e282a7fc57e478c16e718673b6fe` |
| [40128234428](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/40128234428) | Android Build | Workflow completed SUCCESS at same PR commit |

These are actual GitHub Actions results retrieved through the GitHub integration. The first two run IDs were reported in the owner repository's SAF integration PR; the recorded latest source commit for that PR was `7ff306379e763e7dba519a18d592dfed13896fe5`.

**No claim is made that these historical runs executed against the newest `main` commit `c64411b63e8ad7175ad1bbe601daae9418ec81b9`.** The connector's commit-run lookup only exposes pull-request workflow runs, and returned no matched PR runs for this latest main SHA. The commit status endpoint returned no status contexts, which is NOT equivalent to an unsuccessful CI run. Exact latest-main run status remains UNRESOLVED.

## Confirmed source development

- The existing `apps/desktop/adapter.mjs` implements a governed Desktop Commander parity adapter; `apps/desktop/file-parity.mjs`, `search-sessions.mjs`, `process-sessions.mjs`, `transfer-parity.mjs` and `packages/protocol/index.mjs` provide existing bounded surfaces and schemas.
- Commit `01510e24b82ff714d7db2ad8ebbbdac016b15256` added trusted Runtime composition regression tests; most recent main commit `c64411b63e8ad7175ad1bbe601daae9418ec81b9` adds the independent startup regression to cross-platform MCP checks.
- Existing validation evidence must retain passing source and protocol tests as SOURCE_QUALIFIED instead of resetting all work to a generic CANDIDATE.

## Live executable boundary

The Device Bridge MCP server **is not exposed as an executable tool in the current ChatGPT connection**. GitHub source/CI cannot register a tool in a user session. A live MCP tool connection requires the original LeeWay Device Bridge server to be running, configured as an app/connector in the intended client, and successfully discovering real tools and their authorization contracts. Do not substitute Desktop Commander, GitHub, or a fake Device Bridge provider.

The local owner host is also inaccessible in this session because the connected Desktop Commander integration reported its monthly command allowance exceeded. Do not retry that host connection here.

## Remaining parity checks

1. Verify the exact latest-main cross-platform CI and Android build runs rather than inheriting prior successful results.
2. Register the **existing** governed Device Bridge MCP server with the intended ChatGPT/Agent-Lee Tool Gateway. Confirm successful `tools/list`, authenticated caller scope, and one bounded read-only command that returns correlated evidence.
3. Confirm restart/reconnect and physical Android/Windows/iOS admission where applicable. Distinguish fixture tests and platform compilation from on-device command execution.
4. Obtain actual independent Veritas and durable Receipt/Learning Ledger evidence before claiming fully qualified production actuation.

The official LeeWay architectural decision is that **Device Bridge owns primary device-control authority**; Formula, Runtime Fabric, Agent Lee, Veritas and the ledgers retain their original responsibilities. No Docker dependency is authorized.
