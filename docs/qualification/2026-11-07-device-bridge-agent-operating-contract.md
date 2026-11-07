# Device Bridge Agent Operating Contract — Qualification Checkpoint

| Field | Value |
| --- | --- |
| Recorded | 2026-11-07 11:40 America/Chicago (UTC−06:00) |
| Executor identity | Codex; not Agent Lee |
| Human authority | Creator requested persistent LeeWay engineering behavior for Codex and every client using Device Bridge; direct publication to `main` was previously authorized. |
| Canonical repository | `4citeB4U/LEEWAY-DEVICE-BRIDGE` |
| Base | `1aceb2418805f4ce7ff411c4ee2e54e4e5a8bc19` (`origin/main` at investigation) |
| Working branch | `codex/windows-composer-contract-20261107` |
| Gate | Source implementation and local verification complete; publication/deployment pending. |
| Attached directive SHA-256 | `E8F3EE957A868A5AA147324178C01A731680A45CE58CE0826D5D30E6D5C627EA` (both supplied copies match) |

## Request and diagnosis

The Creator asked for the LeeWay Engineering Loop and its evidence behavior to travel with Device Bridge use, not live only in Codex profile instructions. The supplied permanent rules require authority recovery, preservation, inspectable command/test evidence, evidence labels, independent validation, canonical records, and this sequence:

`INVESTIGATE → DIAGNOSE → PLAN → IMPLEMENT → TEST → VALIDATE → REPAIR → RETEST → VERIFY → EVIDENCE → CHECKPOINT → CONTINUE`

**VERIFIED — source:** the installed MCP SDK is `@modelcontextprotocol/sdk` `1.32.2`; its server options and client expose initialization instructions. The canonical Device Bridge factory previously supplied only the server name/version. Local stdio, authenticated HTTP, and remote Streamable HTTP instantiate the shared `createServer`. The public Vercel `/mcp` function is a separate authenticated forwarder and did not instantiate that factory, so a shared `createServer` edit alone would not cover that path.

**INFERRED — architecture:** supplying one contract at the shared server and the public forwarder’s successful `initialize` response is the smallest way to deliver the same client guidance on those source paths without adding another executor or changing Runtime admission.

## Implementation

The patch adds one portable contract at `packages/protocol/operating-contract.mjs`, version `1.0.0`:

- The MCP server sends its full text in the standard `initialize` instructions field and exposes a read-only `leeway_operating_contract` tool for clients that want to retrieve it again.
- The Vercel `/mcp` forwarder appends that same contract to matching successful JSON or SSE `initialize` results. It retains existing upstream instructions, verifies the JSON-RPC response ID, and bounds the buffered response to the existing 1 MiB limit. Authentication, device-tool forwarding, authorization, and execution are unchanged.
- Existing exact tool-catalog tests now include the additional informational tool. Runtime admission remains fail-closed.
- The Codex profile has a discoverable `codex-engineering-loop` skill and a read-only `codex_engineering_loop.read_existing_checkpoint` MCP registered on disk. The profile’s standing instructions point to both. Their backups were created before edits and retained locally. Profile restart and in-session server discovery have not been verified.

The received instructions guide a client; they do not grant capabilities or let the Bridge control hidden reasoning, compel every model to comply, force voice input/output, or change a provider’s interface. Tool execution remains subject to the existing trusted Runtime path. This source change does not claim universal client compliance.

## Test and validation evidence

| Check | Result | Scope |
| --- | --- | --- |
| `node --check api/mcp.mjs` and changed JS modules/tests | PASS, exit 0 | Syntax only |
| `node --test tests/mcp/vercel-ingress.test.mjs tests/mcp/bridge.test.mjs tests/mcp/http-transport.test.mjs tests/mcp/remote-http.test.mjs` | PASS, 36/36 | MCP stdio, authenticated HTTP, remote HTTP, Vercel JSON/SSE injection and bounds |
| `npm run test:mcp` | PASS, 152/152 | Full Device Bridge MCP source suite |
| `npm run test:cli` | PASS, 7/7 | Device Bridge CLI source suite |
| `git diff --check` | PASS, exit 0 | Whitespace/conflict-marker check |
| Codex skill `quick_validate.py` | PASS, “Skill is valid!” | Local skill structure and frontmatter |
| Codex engineering-loop MCP `self-test.mjs` | PASS, 12/12 | Local read-only checkpoint protocol and path/digest checks |
| Python `tomllib` parse of Codex `config.toml` | PASS, `VALID` | On-disk local registration only |

An earlier full MCP run returned **148/150** because two existing exact catalog assertions did not account for the new contract tool. Those assertions were updated without relaxing device-operation restrictions; the complete retest passed **152/152** after two additional Vercel bounds/SSE cases were added.

## Evidence states and boundaries

- **VERIFIED:** source tests prove instructions reach the SDK client over local stdio and authenticated HTTP; raw remote HTTP tests prove the initialization field is present; Vercel tests prove the JSON and SSE forwarder preserves upstream instructions, appends the LeeWay contract, and rejects oversized initialization bodies.
- **VERIFIED:** the local Codex skill validated; the read-only checkpoint MCP passed its 12-check self-test; Codex TOML parsed and the profile guidance read back.
- **OBSERVED:** current active host composition is still pinned to a separate, dirty local controller checkout whose `mcp-server.mjs` hash differs from canonical `main`. Existing host/client restart and runtime source-pin reconciliation were not performed in this task.
- **BLOCKED / UNVERIFIED:** public production deployment of this revision, active Runtime upstream identity/source, and fresh authenticated `initialize` readbacks from ChatGPT web, Gemini, or Antigravity are not established by the local tests. A client may ignore MCP instructions even when they are delivered.
- **NOT EXECUTED:** no physical-device operation, voice call, camera access, live client prompt, Formula task evaluation, independent Veritas decision, Continuum receipt, production receipt, or Learning Ledger admission occurred.

## Preservation, rollback, and next action

Accepted decisions preserved: one existing Device Bridge execution authority; one shared contract source; no hardcoded device, OS, drive, model, or voice identity; no changes to camera or C3 evidence; no weakening of Runtime admission or receipt custody. Local user `work/` and `CONTRIBUTORS.md.bak-20261107-multiclient` remain untouched and unstaged.

Rollback for the Bridge source is a focused revert of the operating-contract commit after publication; it requires no data migration. The Codex profile files have separate byte-for-byte backups and the helper is read-only.

**Next executable action:** commit the reviewed source changes to the already-authorized canonical `main`, verify GitHub checks and the Vercel deployment for the exact commit, then read back the public MCP initialization and resolve the stale local host source binding without overwriting its dirty checkout. Do not treat source CI or a READY deployment as a live client handshake or as production operation qualification.

**RECEIPT NOT CREATED; FORMULA NOT EVALUATED; VERITAS NOT RUN; LEARNING LEDGER NOT UPDATED.**
