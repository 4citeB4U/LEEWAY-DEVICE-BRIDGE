# Enrolled Windows workstation onboarding

This is the portable host path for a Windows test workstation. It does not make that workstation a required LeeWay node and does not grant authority from its hostname, hardware brand, drive letter, or a model provider name.

## Required enrollment bindings

The authorized owner/runtime must supply these values out of band. Do not commit them, paste them into logs, or put them in a shared script.

| Binding | Purpose |
| --- | --- |
| `DeviceId` | Enrollment-issued device identifier, unique to this physical workstation. |
| `MeshToken` | Owner-protected relay pairing secret. |
| verified relay binding | Enrollment-issued, signed, owner/device-scoped WSS endpoint. The runtime obtains and verifies it after login; users do not configure a relay URL. |
| `Workspace` | Owner-approved local folder for bounded file operations. |
| signed Windows passport and trusted registry record | Required by the canonical ZITADEL/C3 host composition; relay connection alone is not identity admission. |
| Formula, independent Veritas, and Receipt Authority bindings | Required before a live command can be called production-governed. |

## Host preflight

1. Install supported Node.js 24 or later and validate `node --version`.
2. Clone the approved Device Bridge revision. Verify its commit and the source pins before execution.
3. Create or choose a dedicated workspace folder. The relay refuses absolute and traversal file paths.
4. Obtain a signed passport and registry admission through the canonical enrollment authority. Never fabricate one from a machine name or config file.
5. The runtime verifies the enrollment-issued relay binding, then confirms the matching pairing authority and WSS reachability. Do not substitute a historical endpoint or an operator-supplied URL.

## Internal post-enrollment carrier

`scripts/start-enrolled-workstation-relay.ps1` remains an internal carrier for
the runtime after enrollment has verified its relay binding. It is not the
customer onboarding surface and must not ask a customer to choose or paste a
relay endpoint. The native/runtime enrollment implementation supplies the
verified endpoint, device ID, and pairing material from local custody.

The legacy carrier’s input boundary is deliberately narrow:

```powershell
.\scripts\start-enrolled-workstation-relay.ps1 `
  -DeviceId '<enrollment-issued-id>' `
  -MeshToken '<owner-protected-token>' `
  -RelayUrl '<verified-runtime-handoff-only>' `
  -Workspace 'D:\LeeWay\workspace'
```

The runtime receives the verified relay binding as part of completed enrollment;
it must not source `RelayUrl` from a user setting, static manifest, hostname,
or historical fallback. The local status listener is diagnostic only. A
successful listener or relay socket does not qualify identity, Formula,
Veritas, receipts, file access, or UI control.

## Retired hardware-specific entry point

`operator/hp-secondary-relay-agent.mjs` is retained only as an import compatibility alias and refuses direct execution. It formerly embedded a specific HP identity and static hardware/capability claims, which is incompatible with portable enrollment. Use the launcher above for every Windows workstation, regardless of brand or role.

## Required acceptance sequence

1. Read-only bridge `device.health` and `device.info` both return a real result for the enrolled ID.
2. Compare the returned ID with the signed passport and trusted runtime registry record.
3. Confirm Formula and Veritas are evaluated by their real authorities, and confirm a canonical Receipt Authority readback.
4. Only after those gates, perform an owner-approved workspace write/readback test using a relative path and exact SHA-256 comparison.
5. Perform UI/app tests only through an explicitly granted Windows adapter; relay connectivity does not grant desktop control.

Any failure must retain the receipt and exact adapter error. Re-run only the failed gate after its specific repair.
