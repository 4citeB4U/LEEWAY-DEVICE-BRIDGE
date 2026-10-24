# LeeWay Device Bridge source-only GitHub synchronization

Date: 2026-10-23 (America/Chicago)
Branch: `review/device-bridge-source-sync-20261023`
Repository: `4citeB4U/LEEWAY-DEVICE-BRIDGE`

## Provenance and exclusions

Preserved the current source from `E:/LeeWay-Work/device-bridge-c34-build` into an isolated new Git worktree with the original branch head unchanged. The source selection inspected 228 changed/untracked paths: **75 eligible files selected** and **153 non-source paths excluded** (152 private-state, evidence or backup paths; one unsupported extension). No live nonce ledger, request transcript, authorization receipt, APK binary or local backup was intentionally staged.

The selected files include Android Kotlin router/permission work, desktop MCP/adapter source, shared protocol and GPU-service workspace source, operator/physical USB adapters, contracts, tests and explanatory documentation. The active Device Bridge installation was **not** modified, restarted, or re-enrolled during this GitHub sync.

## Locked restore

The initial clean `npm ci --ignore-scripts --no-audit --no-fund --offline` identified stale `package-lock.json`: the new `@leeway/device-bridge-gpu-service@0.1.0` workspace was missing from lockfile metadata. A source-preserving offline `npm install --ignore-scripts --no-audit --no-fund --offline` repaired the lockfile. A subsequent **clean `npm ci` succeeded**, installing 99 packages with scripts disabled. The corrected lockfile is part of this review branch.

## Qualification

- `npm run test:mcp`: **18/18 PASS** with default-denied protected calls.
- `npm run test:cli`: **7/7 PASS**.
- `node --test` over all 47 test files under `tests/`: **68/68 PASS**.
- Both Git diff and staged credential/path reviews required before publishing the review branch.
- Not performed: Android Gradle release compilation, phone installation, native device action, production owner authorization, independent Veritas PRE/POST, canonical ledger append, or end-to-end GPU production execution.

These results qualify source and test restoration only. They do not claim the protected command route, live permissions, visual/video feed, mobile enrollment or machine-consciousness carrier is fully operational.

**Restoration goal:** this branch can be fetched independently and restored with npm lockfile; no local-only `node_modules` is required.
