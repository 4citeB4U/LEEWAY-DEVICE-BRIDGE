# LeeWay Device Bridge — canonical Agent Skills and file transfer boundary
<!-- LEEWAY HEADER — DO NOT REMOVE -->
REGION: LEEWAY.DEVICE.BRIDGE.C3.SKILLS_AND_FILE_PARITY
TAG: LEEWAY.C3.SKILLS_READONLY_AND_RECONNECTABLE_FILE_TRANSFER_V1
WHO: LeeWay Industries; WHAT: Reuse canonical Skills and extend Desktop Commander file parity.
WHEN: 2026-10-24; WHERE: docs/LEEWAY-SKILLS-TRANSFER-C3-BINDING-20261024.md.
WHY: Avoid duplicating Agent Skills and avoid treating local fixture tests as production verification.
HOW: Existing desktop adapter, strictly checked skill paths, standard Bridge receipt and admission.
AUTHORITY: SOURCE_REVIEW_ONLY; not independently approved Veritas or production deployment.
LICENSE: MIT.

## Reuse, do not rebuild

The existing `4citeB4U/LeeWay-Agent-Skills` repository already contains
the source `skills/leeway-device-bridge/SKILL.md`, the
`skills/leeway-continuity-authority/SKILL.md`, and an MCP server with
portable SKILL.md discovery. Do not copy those files into Device Bridge or
construct another workflow executor.

Configure only the existing **desktop** device in its MCP configuration,
under its already-required `workspace` key, with:

```json
{
  "id": "example-owner-desktop",
  "type": "desktop",
  "workspace": "./approved-workspace",
  "skillsRoot": "C:/Users/Leona/.codex/leeway/LeeWay-Agent-Skills/skills",
  "grants": ["skills.list", "skills.read"]
}
```

This is a **partial example device object** only, not a complete deployment
configuration or production permission. Paths are host-local and may differ
across PC, Android, iOS, macOS or Linux. `skillsRoot` remains optional.
For a configured desktop, `skills.list` and `skills.read` become
discoverable. `skills.list` supplies canonical path-derived skill IDs,
metadata, file SHA-256, source and a separate `executionAuthorized:false`
field. `skills.read` requires the exact current SHA-256 and returns
reference text; it cannot execute a skill. Both calls go through existing
`Bridge.call` grants, Formula/Veritas/owner admission and receipt boundaries.
Neither an MCP `listTools` response nor an instruction file authorizes
the use of sensitive device capabilities.

The separate canonical Skills MCP server remains the source of actual skill
execution/tool implementations. The future `skills.invoke` bridge operation
must delegate there **only** after independently authenticated production
preflight, strict skill/tool allowlisting, request-bound receipts, safe
cross-host transport and a verified Veritas POST.

## File transfer / directory lifecycle

- `device.files.read_binary`: 256 KiB SHA-256 chunk and byte offsets.
- `device.files.write_binary`: create-only base64 chunk with expected hash.
- `device.files.append_binary`: resume on a new adapter instance by
  supplying `expectedOffset`, entire current `expectedSha256`,
  chunk `expectedChunkSha256`, then one <=256 KiB payload. Data is written
  to the workspace file with an exclusive on-disk append lock and fsync.
  A stale replay fails on offset/hash mismatch. Current file cap: 128 MiB.
- `device.files.hash`: prove current length/hash before retrying a failed or
  interrupted transfer. Never blindly retry after unknown outcome.
- `device.directories.page`: stable sorted directory entries with
  `snapshotSha256`, next offset and rejection if a subsequent page supplies
  a stale snapshot.

These primitives do not yet replace a dedicated high-throughput multi-device
transfer protocol with per-device cryptographic transfer receipts. They are
bounded acceptance candidates, not a production certification.

## Outstanding production gates

1. The independent Veritas production signer root list is empty. LEO review
   signatures are candidate-only; they cannot be promoted via a boolean.
2. The protected runtime must load the exact reviewed Bridge/Runtime Fabric
   commits and prove independent PRE, native execution and POST for one
   owner-approved request.
3. Validate signed, recoverable receipts and Learning Ledger admission, with
   exact correlation. Existing healthy Receipt Ledger alone is insufficient.
4. Install/activate real Bridge services with authenticated pairing, platform
   permission controls, STOP/reconnect and a restart-safe session ledger.
5. Finish PDF/DOCX authoring through existing document tooling, configuration,
   user identity, call history, usage and verified device online status.
6. Treat Agent Skills workflow execution separately from reference discovery;
   never silently turn `SKILL_AVAILABLE` into `WORKFLOW_EXECUTED`.
