# Dual-Phone Device Bridge Recovery — 2026-11-21

LEEWAY HEADER — DO NOT REMOVE

REGION: LEEWAY.DEVICE_BRIDGE.PHYSICAL_QUALIFICATION
TAG: LEEWAY-DUAL-PHONE-BRIDGE-RECOVERY-20261121
MISSION ID: LEEWAY-DUAL-PHONE-BRIDGE-RECOVERY-20261121
BRANCH: repair/dual-phone-device-bridge-20261121
SOURCE COMMIT: 85791983c467653d75813aaa7669c7a40f666048
TARGETS: phone-fold6, phone-apple-iphone

## Authority and scope

This record preserves source and live physical observations only. It does not issue Veritas approval,
canonical Receipt Authority records, or Learning Ledger admission.

## Investigation

The local MCP host composition was starting against a stale pinned source checkout. It was repaired to
the attached canonical Device Bridge checkout and exact local source SHA-256 pins. Runtime Fabric
`/runtime/health` and `/runtime/enforcement/manifest` returned HTTP 200. The repaired host composition
completed startup when verified with local stdio close.

The VS Code MCP process remained blocked during tool enumeration by its cached
`DEVICE_BRIDGE_SOURCE_HASH_MISMATCH:apps/desktop/mcp-server.mjs` startup state. This is a local MCP
client/reload boundary, not evidence of physical device failure.

## Samsung Fold6

- USB/ADB serial: `RFCX70LNT7X`
- ADB state: `device`
- Manufacturer: `samsung`
- Model: `SM-F956U`
- Android: `17`
- Battery readback: level `100`, health `2`, status `5`
- LeeWay Device Bridge package: `industries.leeway.devicebridge`, version `0.10.0-agent-update-rc1`,
  installed and enabled for User 0
- LeeWay Pocket package: `industries.leeway.pocket`, version `1.0.0-original-eye-widget-rc59`,
  installed and enabled for User 0
- App lifecycle: `industries.leeway.devicebridge/.MainActivity` launched and appeared foregrounded
- P01/P02/P04/P05: source and native ADB evidence supported
- P06/P07: LeeWay apps are present; in-app service endpoints and Continuum readback were not proven
- P08/P09: NOT_EXECUTED, no Formula hardware-evaluation call performed
- P10: NOT_EXECUTED; physical reconnect was not performed
- P11: source tests passed for unsupported/capability-boundary refusal
- P12: BLOCKED by cached MCP client startup and upstream MCP qualification

## iPhone 11

- USB PnP identity: `Apple, Inc.`, status `OK`
- CoreDevice/lockdown UDID: `00008030-000C718C0E33402E`
- Product: `iPhone12,1`
- iOS: `27.2.1`
- Build: `24B156`
- Hardware model: `N104AP`
- CPU architecture: `arm64e`
- Native LeeWay app catalog entry:
  `industries.leeway.devicebridge.7K2LF3G25U`
- Native app bundle:
  `LeeWayDeviceBridge.app`
- Native lockdownd readback succeeded
- Native DVT screenshot succeeded with a PNG of 19617 bytes
- P01/P02/P04/P05: USB PnP and lockdown/DVT evidence supported
- P06/P07: LeeWay app is installed, but no authenticated in-app Digital Brain or Continuum readback was proven
- P08/P09: NOT_EXECUTED
- P10: NOT_EXECUTED
- P11: explicit host PnP fallback remains distinguished from native iOS execution
- P12: BLOCKED by cached MCP client startup and upstream MCP qualification

## Tests

Executed:

- `node --test tests/mcp/physical-usb-composition.test.mjs tests/mcp/physical-usb-c3-admission.test.mjs tests/mcp/registered-device-discovery.test.mjs`
- PASS: 10 tests, 0 failures
- `adb -s RFCX70LNT7X shell getprop` readbacks
- `adb ... dumpsys battery`
- `adb ... am start -n industries.leeway.devicebridge/.MainActivity`
- `python -m pymobiledevice3 lockdown info`
- `python -m pymobiledevice3 apps list`
- `python -m pymobiledevice3 developer dvt screenshot ...`
- Runtime Fabric health and enforcement manifest HTTP probes: 200

## Remaining blockers

1. VS Code MCP process cache must release and retest the corrected source hash registration.
2. Runtime/upstream bridge enrollment has no independently verified phone passport registry readback.
3. Android app and iPhone app service endpoints need authenticated remote readbacks for Digital Brain,
   Continuum, and native diagnostics.
4. Formula hardware evaluation needs real measurements and the canonical evaluator; synthetic or
   incomplete windows must not be filled.
5. Disconnect/reconnect and independent Veritas/Receipt Authority gates remain unexecuted.

## Rollback

- Repository branch: `repair/dual-phone-device-bridge-20261121`
- No repository commit or production deployment was created.
- Existing dirty worktree changes were preserved.
- External local MCP wrapper and VS Code MCP configuration were changed only to bind the attached
  canonical checkout and exact source hashes. Remove those host settings to restore the prior wiring.
- No phone was wiped, rooted, jailbroken, or broadly reconfigured.
