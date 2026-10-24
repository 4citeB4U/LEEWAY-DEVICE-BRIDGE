# LeeWay Device Bridge — Desktop Commander parity acceptance
<!-- LEEWAY HEADER — DO NOT REMOVE -->
REGION: LEEWAY.DEVICE.BRIDGE.C3.DESKTOP_PARITY
TAG: LEEWAY.C3.DESKTOP_COMMANDER_FULL_PARITY_MATRIX
WHO: LeeWay Industries, creator-authorized maintainer.
WHAT: Map all 29 observed connected Remote Desktop Commander tool endpoints.
WHEN: 2026-10-24. WHERE: Device Bridge/docs.
WHY: Full Desktop Commander-equivalent service is mandatory, not satisfied by partial MCP registration.
HOW: Match function and boundaries; test each service against the real host and independent C3 chain.
AUTHORITY: REVIEW_ONLY. This matrix is not production certification.
LICENSE: MIT.

## Required release condition

No **FULL PARITY** claim until all functional rows have verified equivalent behavior,
or an explicit source-level explanation for safely different semantics accepted by
LeeWay owner. Tool names alone are not evidence. Host Desktop Commander supports remote
filesystem/process operations; LeeWay must additionally protect Formula, authenticated
owner intent, independent Veritas PRE/POST, receipts and Learning Ledger.

Current review branch: `review/c3-device-bridge-parity-batch3-20261024`
Source root: `E:/LeeWay-Work/evidence-staging/c3-device-bridge-parity-batch3-20261024`
Each capability is registered through the existing MCP `schemas` map and the guarded
`Bridge.call` authority, not a separately permissive endpoint.

## Observed reference-tool coverage (29 endpoint inventory)

| # | Desktop Commander endpoint | Existing LeeWay coverage | Qualification |
|---|---|---|---|
| 1 | list_devices | `bridge_devices` lists configured identities | PARTIAL: no live relay presence/online status |
| 2 | who_am_i | None | MISSING: authenticated user/tenant and usage |
| 3 | get_tool_result | `device.job.status` only | PARTIAL: no asynchronous remote tool-call result |
| 4 | list_remote_tool_calls | None | MISSING |
| 5 | shutdown | `device.job.stop` is not relay shutdown | MISSING: guarded disconnect |
| 6 | get_config | None | MISSING: protected configuration read |
| 7 | set_config_value | None | MISSING: governed configuration updates |
| 8 | read_file | `device.files.read`, `device.files.read_binary` | BOUNDED: 64 KiB text, binary range <=256 KiB; larger file read via offsets |
| 9 | read_multiple_files | `device.files.read_multiple` | BOUNDED: max 8 files / 128 KiB |
| 10 | write_file | `device.files.write`, `device.files.write_binary`, `device.files.append_binary`, `device.files.edit` | BATCH6: digest/offset-bound binary append permits reconnection; still no unlimited document authoring |
| 11 | write_pdf | `device.documents.write_pdf` | BATCH7: bounded plain-text PDF creation, offline stdlib renderer; rich PDF editing not yet equivalent |
| 12 | create_directory | `device.directories.create` | BOUNDED |
| 13 | list_directory | `device.directories.list`, `device.directories.page` | BATCH6: snapshot-SHA and offset pagination detects changes between pages |
| 14 | move_file | `device.files.move` | BATCH3: SHA-bound move, exclusive destination, 64 MiB maximum |
| 15 | start_search | `device.search.files`, `device.search.content`, `device.search.start` | BATCH5: bounded asynchronous workspace search with opaque ID |
| 16 | get_more_search_results | `device.search.next` | BATCH5: cursor-paged results, max 50 per page |
| 17 | stop_search | `device.search.stop` | BATCH5: cooperative cancellation and terminal state |
| 18 | list_searches | `device.search.list` | BATCH5: session inventory, scoped to desktop adapter |
| 19 | get_file_info | `device.files.info`, `device.files.hash` | BOUNDED |
| 20 | edit_block | `device.files.edit` | BATCH3: exact text replacement; no DOCX/PDF editing |
| 21 | start_process | `device.process.execute`, `device.job.start`, `device.session.start` | BATCH4: bounded allowlisted interactive session start; no arbitrary shell executable |
| 22 | read_process_output | `device.job.status`, `device.session.read` | BATCH4: cursor-paged stdout/stderr with 256 KiB retained ring |
| 23 | interact_with_process | `device.session.input` | BATCH4: bounded stdin, newline and close-input controls |
| 24 | force_terminate | `device.job.stop`, `device.session.stop` | BATCH4: job/session stop; forced kill completion needs live qualification |
| 25 | list_sessions | `device.session.list` | BATCH4: per-adapter opaque session IDs, state and output counters |
| 26 | list_processes | `device.process.list` | BOUNDED |
| 27 | kill_process | `device.process.terminate` | BOUNDED: identity matched, not arbitrary PID |
| 28 | get_usage_stats | `device.audit.usage` | BATCH7: protected local receipt outcome counts, explicitly not account billing or independent certification |
| 29 | get_recent_tool_calls | `device.audit.recent` | BATCH7: bounded sanitized local controller history, source unverified, not full provider-wide history |

Note: `list_remote_tool_calls` is host/provider-specific; a truthful equivalent may
expose LeeWay pending jobs and receipts rather than reproduce provider account metrics.
The exact translation still requires tests. LeeWay Android/iOS UI and model functions
are additions; they do **not** compensate for missing reference commands.

## Batch 3 delivered, not activated in production

- `device.files.hash`: bounded digest for source preconditions.
- `device.files.read_binary`: 256 KiB base64 range with chunk SHA-256 and EOF.
- `device.files.write_binary`: exclusive create-only, 256 KiB, digest verified.
- `device.files.move`: digest-bound exact file move with no destination replacement.
- `device.files.edit`: exact SHA + replacement count, UTF-8, bounded file, staged rename.

## Batch 4 delivered, not activated in production

- `device.session.start`: interactive subprocess start, allowlisted executable,
  bounded working directory and maximum 30-minute lifetime.
- `device.session.input`: 32 KiB input bound, optional newline and stdin close.
- `device.session.read`: cursor-paged stdout/stderr with Base64 source fidelity,
  a 256 KiB retained ring and an explicit error for expired cursors.
- `device.session.stop`: session-specific termination.
- `device.session.list`: bounded opaque IDs and lifecycle state.
- At most eight active local sessions per desktop adapter; reconnect persistence
  and distributed lease ownership are **not** established.
- Focused MCP and CLI regression: 35/35 PASS on 2026-10-24.

## Batch 5 delivered, not activated in production

- `device.search.start`: asynchronous filename/content scans bounded to 5,000
  entries, 8 MiB of scanned content, 512 results and 15 seconds.
- `device.search.next`: paged, ordered results with explicit state and cursor.
- `device.search.stop`: cooperative cancellation without mutating user files.
- `device.search.list`: bounded search inventory.
- Symbolic links are excluded; at most four scans run per adapter.
- Focused search session acceptance: 4/4 PASS; comprehensive MCP/CLI
  regression must be rerun before publication.

## Batch 6 delivered, not activated in production

- `skills.list` and `skills.read` expose the existing canonical LeeWay Agent
  Skills SKILL.md files as reference-only, hash-bound capabilities. All actual
  Agent Skills workflows retain their original MCP owner/provider authority.
- `device.files.append_binary` permits 256 KiB chunks with mandatory current
  file offset, whole-file SHA-256 and chunk SHA-256, exclusive append locking,
  post-write flush and resumability after a new adapter instance.
- `device.directories.page` supplies bounded paginated metadata with a
  SHA-256 snapshot pin that detects changed directory listings.
- A real Agent Skills repository discovery/readback test and synthetic tamper,
  symlink/path, append-replay and directory-snapshot tests passed.
- Full MCP/CLI regression: 47/47 PASS on 2026-10-24.
- These changes do **not** prove production enrollment, native device operation
  or live independent Veritas execution.

## Batch 7 delivered, not activated in production

- `device.documents.write_pdf`: offline, bounded, create-only plain-text PDF
  documents using a self-contained Python standard-library renderer. ReportLab
  was present but Pillow missing, so no third-party installation was performed.
- `device.audit.recent`: sanitized controller receipt history with pagination
  and malformed-record denial. Does not expose raw command arguments/results.
- `device.audit.usage`: outcome counts for a bounded local receipt sample, not
  customer billing or independent cryptographic certification.
- Read-only local CLI probe of a real Node MCP stdio service discovered 54
  tools and canonical Agent Skills; connected/mobile/production claims withheld.
- Production Veritas signer roots still remain unqualified and unregistered.

Test boundary: disposable local workspace. Successful mock/fixture tests are not an
owner-approved production command. Every protected MCP call still needs authenticated
Formula, consent, and independent Veritas admission. No bypass fallback is permitted.

## Remaining required acceptance evidence

1. Source-pinned, user-approved launch of the installed LeeWay MCP service, with real
   device identities and reconnect/error recovery (no credential disclosure).
2. File parity completion: append and snapshot directory paging added in Batch 6.
   Verify 128 MiB file transfer under disconnects and simultaneous hosts, directory
   moves and rich DOCX/PDF authoring under appropriate document policies.
3. Process parity: complete remote persistence, detached-session restoration,
   reconnect/error recovery and no orphan jobs; current in-process sessions are
   bounded and cursor-paged, not yet proven across service restart.
4. Search parity: the session lifecycle, continuation and cancellation are now
   covered by bounded fixture tests; verify large real-world searches, restart
   recovery, search result integrity and remote cancellation semantics.
5. Device management, configuration, usage and audit/history equivalence.
6. Windows + Android + iOS interoperability, portable non-LLM execution, UI
   authorization, STOP/reconnect, physically observed device proof.
7. Single genuine production operation through owner Windows Hello, Formula,
   separate Veritas PRE, Device Bridge native action, Veritas POST, Receipt Ledger
   and Learning Ledger with same request identity.

Do not merge or enable broad computer control based on this matrix alone.
