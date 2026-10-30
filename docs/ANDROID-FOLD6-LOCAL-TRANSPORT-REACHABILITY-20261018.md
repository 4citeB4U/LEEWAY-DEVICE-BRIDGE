# Issue #37 — Fold6 installed Device Bridge live transport reachability — 2026-10-18

## Investigate
Read canonical `LocalBridgeServer.kt` from repository: binds `127.0.0.1:5323` when explicitly started; `GET /health` is unauthenticated, protected read-only endpoints `/passport`, `/capabilities`, `/receipts`, `/providers/bluetooth`, and `/bridge` require local agent access and existing Bearer identity. `/owner-bootstrap` consumes bootstrap authorization and is out of scope. The proposed `device.apps.install.plan` exists in PR #38's `RemoteCommandRouter`, NOT in the installed loopback server endpoint map.

## Diagnose / Test
Using connected Fold6 ADB read-only queries:
- Previous user-0 package inventory: `industries.leeway.devicebridge` versionCode 23 / `0.9.8-pocket-rc8`.
- `pidof industries.leeway.devicebridge` produced no process id.
- `toybox netstat -ltn` returned no listener on port 5323.
- `curl -sS -m 2 ... http://127.0.0.1:5323/health` reported connection refused/failed, HTTP_STATUS=000.
- `pm path --user 0 industries.leeway.devicebridge` confirmed APK package location.
- ADB forward inventory previously empty.

## Validate / Verify
**Installed local transport not active at observation.** There was no live command response, no native device passport through authenticated bridge, and no invocation of new provisioning route. A service not running is distinct from credentials rejected and from endpoint not implemented. Android OS/ABI/Adreno hardware observations are read-only and are not GPU correctness evidence.

## Next smallest authorized work
Add a **separately authenticated, read-only** provisioning-plan route to the canonical local transport OR an existing qualified command ingress, test denial behavior, and deploy only in an independently approved test build. Never reveal bridge pairing tokens, call owner-bootstrap, or enable agent access merely to run this check. Avoid production APK replacement. Do not claim physical route PASS without runtime proof.

## Safety
No service start, APK install/update/uninstall, authorization/pairing changes, graphics configuration, Secure Folder access, or J-7 Apple changes. No canonical Formula execution/Veritas receipt/Learning Ledger update.
