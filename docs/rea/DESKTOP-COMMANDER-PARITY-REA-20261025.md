# LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.REA
TAG: DESKTOP_COMMANDER_PARITY_REA_20261025
WHO: LeeWay Industries; authorized engineering review
WHAT: Source-backed REA capability reconciliation against connected Desktop Commander tool inventory
WHEN: 2026-10-25
WHERE: docs/rea/
WHY: Preserve existing parity implementations and isolate live connection/test gaps
HOW: LeeWay REA six-lens inventory, direct tool declarations, source contract comparison
AUTHORITY: READ_ONLY_SOURCE_AUDIT; no claim of production enrollment
LICENSE: MIT

# LeeWay REA — Desktop Commander vs Device Bridge

## Scope and provenance

- Target: Desktop Commander connected tool metadata available in ChatGPT, 29 exposed remote-tool methods. This is **interface comparison**, not examination of Desktop Commander proprietary binaries or internal implementation.
- LeeWay skill: `4citeB4U/LeeWay-Agent-Skills` branch `feat/rea-governed-skill-20261025`, `skills/leeway-rea-reverse-engineering/SKILL.md`, lifecycle CANDIDATE / runtime UNVERIFIED.
- LeeWay target: `4citeB4U/LEEWAY-DEVICE-BRIDGE`, `apps/desktop/adapter.mjs`, `apps/desktop/mcp-server.mjs`, `packages/protocol/index.mjs`, `apps/desktop/file-parity.mjs`, `process-sessions.mjs`, `search-sessions.mjs`.
- Method: read-only source inspection + connected remote tool *schema* observation. Actual REA CLI/MCP adapter was not registered/executed. No upstream binary downloaded; no Desktop Commander private code accessed.

## Reconstructed capability matrix

| Desktop Commander interface | Existing LeeWay interface | Classification |
| --- | --- | --- |
| list_devices | bridge_devices + bridge_capabilities discovery | PARTIAL — no cross-connection live parity test |
| who_am_i | device.info / configured identity | PARTIAL — provider identity/claims differ |
| get_tool_result | device.job.status / device.session.read | PARTIAL — no direct remote wrapper equivalence |
| list_remote_tool_calls | device.audit.recent | PARTIAL — semantics require live check |
| shutdown | device.session.stop / bridge host lifecycle | PARTIAL — no exact host shutdown contract established |
| get_config / set_config_value | owner-controlled Bridge config and trusted composition | NOT_EQUIVALENT — no mutable config MCP tool; deliberate authority boundary |
| read_file | device.files.read | IMPLEMENTED_CONTRACT |
| read_multiple_files | device.files.read_multiple | IMPLEMENTED_CONTRACT |
| write_file | device.files.write | IMPLEMENTED_CONTRACT |
| write_pdf | device.documents.write_pdf | IMPLEMENTED_CONTRACT |
| create_directory | device.directories.create | IMPLEMENTED_CONTRACT |
| list_directory | device.directories.list / page | IMPLEMENTED_CONTRACT |
| move_file | device.files.move | IMPLEMENTED_CONTRACT |
| start_search / get_more_search_results / stop_search / list_searches | device.search.start / next / stop / list | IMPLEMENTED_CONTRACT |
| get_file_info | device.files.info | IMPLEMENTED_CONTRACT |
| edit_block | device.files.edit | IMPLEMENTED_CONTRACT |
| start_process / read_process_output / interact_with_process / force_terminate / list_sessions | device.session.start / read / input / stop / list, device.job.start/status/stop | IMPLEMENTED_CONTRACT — allowlisted executables and bounded workspace |
| list_processes / kill_process | device.process.list / terminate | IMPLEMENTED_CONTRACT — restricted by expected command |
| get_usage_stats / get_recent_tool_calls | device.audit.usage / recent | IMPLEMENTED_CONTRACT |

## Existing LeeWay extensions beyond that inventory

- File hash, binary read/write/append, snapshot-pinned directory pagination.
- Skill list/read using expected SHA-256.
- Governed C3 Formula, independent Veritas PRE and signed consent / replay admission.
- Mobile device capabilities, voice and GPU sealed-preview contracts (different adapter families; not desktop-tested).
- Receipt hooks and owner-controlled trusted Runtime Fabric startup composition.
- Existing source modules are **ALREADY BUILT**; no new executor is justified.

## Six REA lenses and gaps

1. **Structure**: MCP stdio tool registration loops across protocol schemas, calls original Bridge and DesktopAdapter. Registered tool names use dots-to-underscores conversion. **OBSERVED SOURCE**.
2. **Security**: bounded workspace paths, strict schemas, explicit executable allowlist and C3 admissions. **OBSERVED SOURCE**. Independent production issuer enrolment and live Veritas evidence remain unverified.
3. **Failure breakpoints**: ChatGPT currently cannot call LeeWay's local stdio MCP directly; tool not connected here. **OBSERVED TOOL AVAILABILITY**. No reason to rebuild the tool handler.
4. **Distributed execution**: relay and authenticated owner trust composition exist; actual transport from THIS ChatGPT session to the workstation is unverified. **UNVERIFIED**.
5. **State/resources**: bounded process/job sessions and search resources present in source; machine-specific restart persistence, cleanup and load remain untested here. **NOT_ASSESSED**.
6. **Dynamic validation**: no REA CLI or host execution was available for this investigation; **NO TEST EXECUTED**. Do not turn source similarity into parity PASS.

## Readiness gates

- G0 TARGET: PASS (GitHub paths and exposed tool names observed).
- G1 STRUCTURE: PARTIAL (key contracts inspected, not every implementation).
- G2 SECURITY: PARTIAL (boundary design observed, no adversarial execution).
- G3 RESILIENCE: NOT_ASSESSED.
- G4 POST: NOT_VERIFIED (independent live Veritas POST receipt).
- G5 PRODUCTION: NOT_VERIFIED (registered ChatGPT LeeWay MCP endpoint and live device execution).

Overall: **CANDIDATE_HARDENING**, **not** FAILED_STRUCTURAL_GAP, because evidence already demonstrates extensive existing implementation.

## Next smallest executable acceptance

Use the existing `apps/desktop/mcp-server.mjs` with a trusted host composition. On the authorized workstation, enumerate `bridge_devices`, `bridge_capabilities`, then run same-workspace read/list/search/job/session operations with observed outputs, deny-path tests, restart/reconnect and receipt hashes. Compare tool argument/output shape to Desktop Commander for each pairing. Do not bypass Formula/Veritas gates, do not use Docker, do not install another bridge or REA engine automatically. Publish real outcomes in a separate signed evidence receipt when providers are available.
