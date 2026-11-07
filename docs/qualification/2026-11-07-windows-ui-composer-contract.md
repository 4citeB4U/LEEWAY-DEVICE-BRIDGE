# Windows UI composer contract — 2026-11-07

## Identity and continuity

- Repository: `4citeB4U/LEEWAY-DEVICE-BRIDGE`
- Base: `main` at `c4717e97de150b438d87eb290fa5972ee93323eb`
- Candidate branch: `codex/windows-composer-contract-20261107`
- Scope: existing Device Bridge Windows UI adapter and its MCP protocol contract.
- Recovered qualification evidence: `E:/LeeWay-Work/pc-consciousness-live/runtime/receipts/machine-consciousness/MACHINE-CONSCIOUSNESS-TRAINING-ARCHITECTURE-CHECKPOINT-20261104.json`.
- Prior shared worktrees contain unrelated dirty edits and were not changed.

## Expected versus observed

Expected: a Bridge caller can select a composer only from a fresh observation of an allowlisted app/window, write through the target's writable UI Automation `ValuePattern`, verify exact readback, and submit only through a separately observed, explicitly selected action control.

Observed in the recovered Bridge qualification record:

- ChatGPT process `44840`, conversation title `Design LeeWay machine conscience`, exposed one enabled UIA Edit named `Work with Codex`. The old observation did not establish a writable `ValuePattern` or exact composer semantics.
- Antigravity process `45424`, settled window title `Connecting to MCP and Cod...`, exposed no Edit/input candidate. The recorded error was `WINDOW_INPUT_CONTROL_NOT_FOUND`.
- Historical November 4 visible relay is preserved in the source record. It used Codex browser/desktop controls and is not evidence of current Device Bridge-owned submission.
- No exact historical replay text is present in the recovered record; no replay was attempted.

## Smallest source repair

The clean `main` source did not contain the Windows UI adapter candidate, so this branch adds that capability to the existing `DesktopAdapter` and the existing strict protocol registry. It does not create another executor.

- UIA operations are limited to allowlisted process names and the selected process ID.
- `observe` binds a short-lived, random `observationId` to process start time, main-window handle, title, and exact observed element attributes. It returns opaque target IDs only for visible enabled writable Edit controls and visible enabled Invoke-capable buttons.
- `input` requires a still-live observation and one of its exact Edit target IDs. It revalidates the process, window, target uniqueness and writable `ValuePattern`, sets text, then compares the complete value readback and SHA-256.
- `submit` is a separate call. It requires the same observed Edit target, one explicitly selected observed button target, and the exact hash returned after successful text readback. It rechecks the current value before invoking that button.
- Observations expire after 30 seconds, are one-use for input/submission, and are capped at 20 retained entries. PowerShell execution is bounded to 15 seconds and output to 128 KiB.
- No keyboard injection, coordinate click, generic first-Edit selection, generic Send-name matching, or implicit submission is used.
- Health/info report `uiControlState: SOURCE_BOUND_NOT_LIVE_PROBED` when the Windows adapter is present. This is source binding only, not live or production qualification.

## Engineering loop evidence

| Stage | State | Evidence |
| --- | --- | --- |
| Investigate | EVIDENCED | Recovered UI qualification record, canonical Device Bridge `main`, `CONTRIBUTORS.md`, and engineering-loop evidence protocol inspected. |
| Diagnose | EVIDENCED | The original adapter selected the first enabled Edit and generic Send control without a fresh target identity; the Antigravity observation supplied no writable Edit. |
| Plan | EVIDENCED | Preserve UIA as the existing Windows adapter; add observation-bound target identity, exact readback, and separately bound submission. |
| Implement | EVIDENCED | `windows-ui-sessions.mjs`, protocol schemas, `DesktopAdapter` registration, tests, and this checkpoint. |
| Test | PASS | `node --test tests/mcp/windows-ui-composer-contract.test.mjs`: 5/5. `npm run test:mcp`: 125/125. `npm run test:cli`: 7/7. |
| Validate | PASS / SOURCE ONLY | `node --check` passed for the UI adapter, desktop adapter and protocol modules; `git diff --check` passed; PowerShell AST parser accepted all three generated observe/input/submit scripts. |
| Repair / Retest | PASS | The initial focused run could not load `zod` because the clean worktree had no dependencies. `npm ci --ignore-scripts --no-audit --no-fund` installed the lockfile-pinned packages in this worktree; the focused, full MCP, and CLI suites then passed. A first generated-script parser probe also had a bad synthetic hash fixture; the fixture was corrected and the three generated observe/input/submit scripts parsed successfully. |
| Verify | BLOCKED | No governed live Device Bridge invocation against the changed source, no current UIA observation from this adapter, no message submission, and no response readback occurred. |
| Evidence | EVIDENCED | Test logs are source-level only. Formula health responded with its golden-vector status; this task was not evaluated by Formula. Independent Veritas was not run. |

## Antigravity integration boundary

The new adapter will safely return no editable target when the app does not expose one. Google documents an official Antigravity Remote Control surface that drives desktop sessions from a browser, but it must be enabled in the app and accessed while signed in to the same Google Account. The docs describe a user-facing remote-control surface, not a public prompt-submission API: <https://antigravity.google/docs/remote-control/>.

That is the supported next route to investigate if a fresh Bridge observation still yields no writable UIA target: use an owner-authorized Device Bridge browser session bound to the official Remote Control surface. Do not attach to a personal browser profile or reuse cookies implicitly. Do not promote the Antigravity lane until the owner-bound browser session and real conversation readback are verified.

## Scope, rollback and remaining gates

- This candidate has not been installed into the active local Device Bridge, merged, or deployed. The active runtime and provider sessions were not changed.
- Runtime Fabric's currently available remote connector is read-only and does not publish Windows UI capabilities.
- `VERITAS: NOT_RUN`; canonical execution receipt not created; Learning Ledger not updated.
- Rollback after promotion: revert the source commit that introduces the Windows UI contract; no application data or provider state is modified by that rollback.
- Next action: after the source contract is promoted and the intended Bridge host is updated through its authorized lifecycle, run a governed read-only observation for the active Antigravity conversation. If it still exposes no writable control, qualify the owner-bound official Remote Control browser session as the input adapter. Only then can a Creator-provided exact message be entered and a live response read back.

**Current gate: SOURCE CONTRACT TESTED; ANTIGRAVITY LIVE COMPOSER AND FULL CONVERSATION EXCHANGE UNQUALIFIED.**

## Main publication readback

- Published to canonical `main`: commit `8d9bb5f23eb1bc042c7018394d7f313911d09373` (`Add observation-bound Windows composer controls`).
- GitHub readback on `main`: `apps/desktop/windows-ui-sessions.mjs` blob `285156c668bfaf21daa59bb5e4f56055f052c995`; this qualification record blob `e809f4a3623f6fbea1c6712113235f47f6977a57`; contributor note blob `a4e3cb119d1fa5682ab98e5a805681ee7be66bc7`.
- GitHub Actions `42351732680` (Portable protocol and MCP) passed on the exact source SHA; Windows, macOS, and Ubuntu jobs all passed the MCP, CLI, and trusted-composition checks.
- GitHub Pages build/deployment run `42351732316` passed.
- Unrelated Android Build workflow `42351732707` was canceled before artifact publication because its broad `tests/**` trigger would have rebuilt an unrelated APK.
- Secondary Workstation Live Pages Gate `42351732741` was still running at checkpoint time; it does not qualify Windows UI control.
- Main publication distributes source. No active Device Bridge host update, production route change, or live UI execution occurred.
