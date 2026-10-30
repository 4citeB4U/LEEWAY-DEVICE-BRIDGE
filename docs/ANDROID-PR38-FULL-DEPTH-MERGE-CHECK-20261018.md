# Issue #37 / PR #38 — Full-depth merge conflict verification (2026-10-18)

## Method
Ran read-only Git merge simulation on the isolated Windows evidence-staging checkout, after fetching complete history with `git fetch --unshallow origin`. No working tree merge, rebase or push was performed.

## Evidence
- Before unshallow: `git rev-parse --is-shallow-repository` = `true`.
- After unshallow: `false`.
- Verified common ancestor: `92047100ab3c2696ee2b3e48923c8dad14d53f99`.
- `git rev-list --left-right --count origin/main...origin/issue-37-android-install-preflight-20261018`: **13 58**.
- `git merge-tree --write-tree origin/main origin/issue-37-android-install-preflight-20261018`: **exit code 0**, merged tree `c7c4ee3072b74c86d8ffd0f4b781eb3ae4185c24`.
- `git status --short` returned empty, confirming the review checkout working tree remained clean.

## Conclusion
**PASS: structural three-way merge, no Git content conflicts at the observed branch tips.** This is not an actual merge commit, nor evidence that the merged application builds or passes Android runtime tests. PR #38 remains draft pending independent review and production release gates: physical Fold6 signing compatibility, physical GPU correctness, canonical Golden Formula execution, Veritas evidence and Learning Ledger updates. The Fold6 was not modified.
