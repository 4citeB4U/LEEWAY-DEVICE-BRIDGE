# Issue #37 — Combined main + PR #38 Android acceptance — 2026-10-18

## Isolated merge exercise
Used isolated evidence-staging Git worktree `E:\LeeWay-Work\evidence-staging\issue37-combined-merge-review-20261018` based at `main` commit `94ad1a0beff33797b219b1f5a90c915516ba41d8`. Ran `git merge --no-commit --no-ff` against review branch, with invocation-scoped synthetic identity only after Git required a committer identity. Result: **Automatic merge went well; stopped before committing as requested**; **0 unmerged files**. No merge commit, rebase or push performed.

## Actual combined-source tests
From the isolated combined worktree:
- `:app:testDebugUnitTest :app:assembleDebugAndroidTest --no-daemon --console=plain` => **BUILD SUCCESSFUL in 39s**, 50/50 tasks executed.
- Parsed JVM test XML: **71 tests / 17 suites / 0 failures / 0 errors / 0 skipped**.
- Built actual combined-worktree app APK with `:app:assembleDebug` => **BUILD SUCCESSFUL in 17s**; 35 tasks (17 executed/18 up-to-date).
- `adb -s emulator-5580 install -r` the resulting **combined-worktree** app APK => **Success**.
- Installed the combined-worktree instrumentation APK and invoked `NativeProvisioningAuthorizationTest` with explicit emulator target; final retest => **OK (2 tests)**, 0.15 s.
- Emulator test app process force-stopped afterward.

One preliminary instrumentation attempt used the existing review-branch app APK because the combined app APK had not yet been built; its 2/2 result was not counted for combined-code acceptance. The missing APK was built and explicitly installed before the final valid 2/2 test. The optional Windows `Get-FileHash` command was unavailable in the remote shell, so **no new artifact hash is claimed**. Tests and install succeeded regardless.

## Acceptance boundary
PASS: conflict-free uncommitted combined tree; combined application assemble; combined JVM 71/71; combined emulator native instrumentation 2/2. Not verified: independent approval, production Fold6 installed signer compatibility, physical GPU correctness, owner-approved Formula provisioning, canonical Veritas receipt or Learning Ledger. Production Fold6 unchanged. Keep PR #38 draft.
