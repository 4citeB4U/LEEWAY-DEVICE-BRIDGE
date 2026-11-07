# Registered-device discovery portability — 2026-11-07

## Authority and objective

The Creator's existing portability rule governs: LeeWay device identity is neutral across operating systems, device classes, and model providers. A workstation name or adapter configuration is not a registration. This checkpoint records the repair to the existing Device Bridge discovery path and Runtime consumer; it does not introduce a new policy.

## Observed defect

The fresh read-only Runtime connector response still listed `pc-primary` with `CONFIGURED_NOT_PHYSICALLY_PROBED`. The current Receipt Authority source record describes that value as `REGISTRY_FALLBACK` with `identityVerified:false`. The listing was therefore a configuration fallback, not evidence of enrolled device identity or physical reachability.

## Repair published

- Device Bridge `b153c0d0f1d9b0ab82456bca3fd71d695a0bfc1d` changes `bridge_devices` to intersect configured adapters with the trusted Runtime registration registry. It returns registration authority/state and `reachability: NOT_PROBED`; configuration alone cannot create a device identity.
- Device Bridge `fae6dccecafb0fb0bc23e56ed49a36f46cffd7f3` labels CLI MCP output as `registeredDevices` and exposes its registration state. Config-only CLI setup returns an empty registered list.
- Device Bridge `65b4fdd4c2c15314e0124f760c8fdb34d9d40e86` adds CLI source and test paths to the existing portable MCP workflow, so this path is checked on future pushes.
- Runtime Fabric `141c3986601972393d97921db1dddd64eee42d6b` removes the static device roster and retired relay provider, requires a verified Bridge registration and capability before dispatch, and rejects legacy fallback discovery. No fixed device or preferred platform is added to the new registry or router.

## Verification evidence

Local source checks:

- Device Bridge `npm run test:mcp`: 156/156 passed.
- Device Bridge `npm run test:cli`: 7/7 passed.
- Runtime `npm run test:device-bridge-routing`: 10/10 passed.
- Runtime `node --test tests/runtime-device-bridge-discovery.test.mjs`: 19/19 passed.
- Runtime provider, source-binding, Vercel contract/acceptance, standard validation, portable compiler, and build checks passed; detailed commands/results are in the task session record and the Runtime source diff.
- `git diff --check`: passed for both source changes.

GitHub verification:

- Device Bridge Portable protocol and MCP run [42412656184](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/42412656184) passed on Linux, macOS, and Windows for the registered-discovery and CLI contract.
- Device Bridge Pages run [42412656004](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/42412656004) passed.
- Apple qualification run [42412296826](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/42412296826) and Android build run [42412296894](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/42412296894) passed on the implementation commit.
- Runtime Fabric source workflow [42412306567](https://github.com/4citeB4U/Leeway-Runtime-Fabric/actions/runs/42412306567) passed.
- The first Bridge workflow run [42412296825](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/42412296825) failed because its CLI assertions still expected config-only IDs. The CLI contract and workflow path filters were corrected; run 42412656184 is the passing retest.

## Production and physical boundary

Device Bridge Vercel production deployment `dpl_29iUWXKKLpqb4yq5BRyeqAK9Gddc` is `READY` on implementation commit `b153c0d0f1d9b0ab82456bca3fd71d695a0bfc1d`. The source and that deployment do not establish physical device registration.

Runtime source workflow passed, but its Vercel deployment status for `141c3986601972393d97921db1dddd64eee42d6b` is `failure` with the platform message **“Deployment rate limited — retry in 24 hours.”** No Vercel deployment exists for that Runtime commit. The latest visible Runtime production deployment remains `dpl_HFuRGw1kjTPnLezcVf8N4dQkxctT`, commit `6c46218d144bd031a8887c57d35ea98b32235903`.

After publication, the authenticated read-only connector still returned `devices: ["pc-primary"]` and `CONFIGURED_NOT_PHYSICALLY_PROBED`. This is evidence that the active Runtime/upstream path has not yet adopted the new registration contract. No current phone passport record was found in the searched Receipt Authority source. No phone registration or physical operation is inferred from prior device reports.

## Loop state

| Stage | State |
| --- | --- |
| Investigate | EVIDENCED — current connector and Receipt Authority source inspected |
| Diagnose | EVIDENCED — configuration fallback was presented as the device listing |
| Plan | EVIDENCED — reuse Bridge registry and existing Runtime consumer |
| Implement | PASS — changes pushed to both canonical `main` branches |
| Test | PASS — local suites and source checks above |
| Validate | PARTIAL — source CI passed; live Runtime remains on previous deployment |
| Repair / Retest | PASS — stale CLI fixture expectations were corrected and cross-platform retest passed |
| Verify | BLOCKED — Vercel Runtime deployment rate limit; no physical enrollment readback |
| Evidence | EVIDENCED — source commits, workflow runs, and deployment states above |
| Checkpoint | EVIDENCED — this record and machine-readable evidence are published with the source handoff |
| Continue | OPEN — retry the Runtime deployment when the reported 24-hour limit expires; then read the live trusted registry and test registered neutral IDs |

Formula task evaluation: `NOT_RUN`. Independent Veritas decision: `NOT_RUN`. Canonical Continuum receipt: `NOT_CREATED`. Learning Ledger: `NOT_UPDATED`. C3 and physical device registration: `NOT_QUALIFIED`.

## Next executable action

After Vercel's reported cooldown, retry deployment of the existing Runtime `main` commit, verify its exact deployment SHA and production alias, then repeat `bridge_devices` through the authenticated connector. A config-only fallback must be rejected; a device may appear only if the trusted Runtime registration contains it and the matching adapter is configured. Follow with physical health/info only for identities returned by that registry.
