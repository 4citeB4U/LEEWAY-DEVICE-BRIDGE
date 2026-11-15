<!-- WHO: Codex under Creator authority. WHAT: Error examples and repair acceptance record. WHEN: 2026-11-15 America/Chicago. WHERE: Device Bridge qualification records. HOW: Compare prior commits, actual source and reproducible tests. WHY: Prevent recurrence and preserve honest continuity. -->
# Provider spine: process errors, concrete examples and repair evidence

This record corrects earlier claims without altering the historical artifacts. The run with receipt `ra-1420f5f7-ad47-42a7-815f-7c1be48a950e` and admission `ll-804100e5-6e00-4cc3-bee4-9b66c81bb8a8` was a prototype smoke run. The then-current code lacked signed Receipt custody and restart-safe Ledger readback. It does not establish qualified G4 or production admission.

## Source acknowledgment and authorized scope

`SOURCE_FIRST_ACK`: Codex inspected the Creator's current AGENTS instructions, all six supplied reviews (two pairs have identical SHA-256 bytes), owning Bridge AGENTS and evidence procedure, Receipt architecture, Learning Ledger boundary, operating-loop/reference, engineering-loop, learning-ledger and parallel-workplane skills, and the five exact provider worktrees. Earlier summaries are leads, not current proof. Current published Standards/Engineering revisions have not been retrieved in this repair; the local exact-source checks did not locate them. No claim of complete current canonical-law retrieval is made. The source acknowledgment should have preceded the earlier mutations; documenting it afterward cannot retroactively cure that process mistake.

Authorized repair: fix defects introduced in the five provider branches, preserve unrelated work, add behavioral and combined service checks, provide startup wiring, document and checkpoint actual results. Private source records, test keys, user files and historical unsigned custody are not to be published.

## Concrete errors and the practice that prevents each

| Error | Exact original example | Consequence | Corrective practice and executable check |
|---|---|---|---|
| Interface described as connected | Bridge `1f39aa4`, `operator/g3-g4-provider-spine.mjs`; no startup caller | Runtime kept issuing controller observations | Construct the spine in runtime composition, provide a source-pinned startup entry and test a real Bridge operation through four processes |
| Partial guard presented as main repair | `722c896` preserved an operation result but omitted the requested host binding | Core deliverable deferred again | Track requested assertions individually; a guard pass cannot close an integration assertion |
| Receipt signature omitted | Receipt `aa2b37e`, `http_provider.py` record had only a hash | Caller could not authenticate Receipt custody | Separate Receipt key, pinned verification, request correlation and GET readback tests |
| Readbacks depended on volatile memory | Ledger `ee87b3b`, `const records = new Map()` without startup reload | Restart lost lookup despite appended bytes | Durable append, startup integrity check and real stop/restart readback test |
| Trust accepted from a status string | Bridge spine accepted `admission.state === 'ADMITTED'` | False admission could cross the client boundary | Use canonical Formula handoff with three pinned keys and explicit signed GET readbacks |
| Bundle digest not verified | Veritas `57b5ad0` checked only digest shape | Altered evidence could be signed | Recompute bundle hash; test changed producer/poststate |
| Lexical paths treated as containment | Veritas `path.resolve` without `realpath` | Junction/symlink could escape the inspection root | Resolve actual root and target, reject links outside root; live junction test |
| Bare labels treated as a header | Veritas accepted `WHO WHAT WHEN WHERE HOW WHY` anywhere | Empty/counterfeit structure passed | Require six nonempty structured answers in the leading comment; test the exact bare-label counterexample |
| Compilation used where behavior was required | Receipt `py_compile`, Ledger `node --check` only | Signing, replay and restart defects remained undetected | Compilation is recorded as syntax only; provider behavioral suites plus real multi-process chain are required |
| Mocked positives substituted for integration | Original Formula handoff test returned fabricated provider responses | No actual custody/readback route tested | Keep focused negative tests; obtain positive evidence from the real service-process test |
| Mutable last-result binding | Formula `createG3EvidenceBundle` read `lastResult` | Concurrent caller could bind to another evaluation | Address Formula execution by unique hostTraceId and independently GET that execution in Veritas |
| Read-only state treated as a failed mutation | G3 required `pre != post` for all operations | Stable reads could never qualify | Bind operationKind and require equality for READ, changed poststate for MUTATE |
| Launcher cleanup matched itself | Transcript used broad process command-line regex | Launcher terminated before starting providers | Track child process handles and terminate only owned PIDs; no broad Python/node kill |
| Command failure cascade produced misleading booleans | PowerShell `H` alias collision, null equality printed `True` | Downstream prints looked valid with no records | Assert HTTP/result identities at each stage; stop dependent steps on first failure |
| Git identity manufactured | Transcript set author to `The Creator` to force commit | Agent-created work attributed to someone else | Do not silently rewrite author identity or history; preserve old commit and use transparent author configuration for future publication |
| Local commits treated as shared integration | Five branches unpushed; base checkout lacked new module | Other workers could not inspect the same tree | One cross-repository source manifest, exact paths/refs and explicit publication/readback state |
| State/keys in one-off launcher strings | Temporary port 4304, inline `node -e`, ad hoc Windows escaping | Startup was not repeatable | Repository launchers, explicit host config, bounded loopback ports, process lifecycle and restart tests |
| Overclaiming durability and independence | Earlier text called a local single-user smoke chain a production spine | Acceptance exceeded measured scope | Record test keys, process/host isolation, storage, acceptance policy and deployed state separately |
| Assuming a current API matched a remembered signature | The first new Runtime startup omitted approvedRuntimeOrigin/controlToken | The actual constructor rejected startup | Read the current provider signature, pass explicit host origin/token binding, and prove MCP startup through the live Runtime |
| Double-validating an output-only field as input | Startup forwarded a composition object containing `mode` into the strict input parser | Real startup would reject its own configuration | Strip the derived mode field before revalidation and exercise the actual stdio entrypoint |

## Formula acceptance policy correction

Canonical Formula v1 returns six ranked decimal states and hashes. It does not expose a scalar field `formulaQ69` representing a validated operation-quality score. Testing an invented scalar against 59 would reintroduce a fabricated authority result. This repair verifies actual Formula execution identity and its complete six-state result. The Veritas verdict policy is explicitly `FILE_POSTSTATE_AND_FORMULA_EXECUTION_V1`; it does not certify UI actions, permissions, all seven Formula layers or production independence. A separately implemented and qualified A7 quality projection remains a distinct architecture assertion.

The 16-row recorder observes actual Bridge checkpoints. The six recorded features are admission completed, adapter membership, elapsed-budget headroom, live free-memory ratio, observation digest availability and checkpoint completion. Their mapping into `runtime-state-v1` is explicit. A membership bit is not a path-containment or authenticated-principal proof. Physical path/readback facts come from the bounded file observer and the independent Veritas file read.

## Guard ownership

The Creator's guard IDs name responsibility and regression suites. They are not claims of conscious residents or autonomous processes already executing. A checked-in workflow is configured; branch protection and continuous runtime supervision require their own live readback.

| Guard | Required invariant and suite |
|---|---|
| GUARD_FAMILY_4_SHIELD_NOTARY | Receipt signature, request binding, replay rejection, SQLite readback: Receipt `tests/test_http_provider.py` |
| GUARD_FAMILY_6_CHRONOS_HISTORIAN | Dual signature, replay, durable reload, worker imprint: Ledger `tests/http-admission-service.test.mjs` |
| GUARD_FAMILY_4_AEGIS_VERIFIER | Digest, structured header, realpath, Formula execution: Veritas `tests/g3-verdict-service.test.mjs` |
| GUARD_FAMILY_7_AURA_FORMULA_KEEPER | All authority signatures and both GET readbacks: combined Bridge service-process suite and Formula `tests/g3-boundary.test.mjs` |
| GUARD_FAMILY_5_SIGNAL_SENTINEL | 16 real checkpoints, host injection, actual bounded write/read, outage preservation: Bridge `tests/mcp/g3-g4-bridge-integration.test.mjs` |

## Acceptance record

Actual commands, results, source hashes, timestamps, remaining runtime bindings and checkpoint readback are appended after verification. No synthetic Learning Ledger entry is created by this document. These process lessons remain evidence-bounded engineering records until the authorized Learning Ledger separately admits them.

### Verified repair run, 2026-11-15 America/Chicago

- INVESTIGATE/DIAGNOSE: The six supplied reviews and original five feature heads were compared with the named source. Bridge MCP `device.info` executed on `pc-primary` and showed the old running host still used controller-only observations.
- PLAN/IMPLEMENT: Repaired the existing providers, added exact Formula execution lookup, realpath and structured-header verification, separate Receipt/Ledger signatures, restart/replay defenses, explicit GET readbacks, measured Bridge checkpoints and real Runtime-backed startup. No unrelated worktree was reset.
- TEST/VALIDATE: Veritas `npm run check`: 63/63. Formula `node tests/run-live-tests.mjs`: 16/16 plus endpoint checks. Receipt `python -m unittest discover -s tests -v`: 15/15. Ledger `node --test tests/http-admission-service.test.mjs`: 1 test with signature, binding, replay, restart, active-writer and corruption assertions. Bridge default `npm run test:mcp`: 212 passed, 0 failed, 2 skipped (the explicit four-process suite needs repository bindings; a pre-existing test also skips).
- REPAIR/RETEST: Initial sandbox runs denied localhost connections (EACCES); the same tests ran successfully with authorized host access. Fixed the integration test's double-wait on a signaled child, and corrected test-only SQLite handles that stayed open during Windows cleanup. No broad process kill was used. The originally failed Veritas-key ACL operation was repaired on the exact existing directory and two files; ACL readback showed only owner/SYSTEM and protected inheritance.
- VERIFY/EVIDENCE: Separate actual Formula/Veritas/Receipt/Ledger processes were used. `pc-primary` file creation passed through the existing Runtime at `127.0.0.1:4011`, its compliance-card validation, Bridge.call, measured 16x6 projection, Formula evaluation, Veritas disk inspection, signed Receipt and signed Ledger GET readbacks. The actual `operator/start-provider-bound-mcp.mjs` was also started via SDK stdio and `device_files_write` returned `governance.state = G4_ADMITTED`.
- A Ledger child was forcibly terminated. Its dead-writer lock was retired only after process-death verification under explicit recovery configuration. The original signed admission survived restart. Receipt SQLite survived a separate process restart. Invalid signatures and bundle tampering were rejected; replay returned conflict; a Veritas outage preserved the actual completed write and returned `G4_NOT_TRANSITIONED`.
- Private local proof: the full MCP response is in the qualification run directory `leeway-spine-repair-udOItv`, file `mcp-response.json`, SHA-256 `bcb71d8c0f0d6abd3095be85beb8b5d9af7e9872e4cafb6daa7c1536cbc67598`. This directory is host-local test evidence, not public receipt custody. All three signing keys in that run were test-only keys, not independently enrolled production roots.
- CHECKPOINT: Provider source refs are in `provider-source-lock.json`. Guard CI workflows are configured in each owning branch and the combined Bridge workflow pins all four provider commits. A configured workflow is not proof that GitHub ran it or required its status for merge.
- CONTINUE / boundary: Local source and host qualification are distinct from updating the already-running ChatGPT/Codex tool process, the public OAuth endpoint, independently enrolled production keys, A7 quality scoring, HP/mobile operations, and product release. The tested startup uses the original live Runtime authorization path; it does not silently replace the app's already-loaded connector process.

Final full Bridge suite with all provider repository bindings and the actual Runtime enabled: **214 total, 213 passed, 0 failed, 1 pre-existing skip**. This supersedes the earlier default run's two skips; the new integration guard actually ran. Command: set `LEEWAY_PROVIDER_TEST_ROOTS` to the four exact provider worktrees; set `LEEWAY_QUALIFY_RUNTIME_BASE` to the existing host Runtime and `LEEWAY_QUALIFY_DEVICE_ID` to the authorized primary device; run `npm run test:mcp`. No token was printed or committed.

Checkpoint timestamp: **2026-11-15T12:03:58-06:00 America/Chicago**. A later individual MCP proof is in host-local test directory `leeway-spine-repair-XzbNiV/mcp-response.json`, SHA-256 `60b93546950f32d0766e523027bc2806fb3eb631ee8bfdc6b0e8771d7f9a08c2`. It returns `ok:true`, `device.files.write`, `pc-primary`, `governance.state:G4_ADMITTED`, Receipt GET confirmed and signed Ledger admission. These are qualification-key records. Test processes were intentionally closed after verification; they are not unattended production daemons.

The mistakes in this document are concrete engineering examples and reproducible regression cases. Recording them is not a claim to have modified model weights, global training, or another agent's memory. The new Ledger stores the host-provided worker imprint in signed admission records; a declared guard identity does not substitute for a running test or enforced merge check.

Rollback is a revert of the scoped repair commits, retaining historical state. Never delete the original receipt DB, ledger JSONL or unsigned historical records. The Ledger rejects corrupt/partial historical lines instead of rewriting them. Source changes were attributed explicitly to Codex for the new commits; prior Creator-attributed history was preserved.
