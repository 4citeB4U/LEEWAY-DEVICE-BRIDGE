# Enrolled Windows workstation onboarding

This is the portable host path for a Windows test workstation. It does not make that workstation a required LeeWay node and does not grant authority from its hostname, hardware brand, drive letter, or a model provider name.

## Required enrollment bindings

The authorized owner/runtime must supply these values out of band. Do not commit them, paste them into logs, or put them in a shared script.

| Binding | Purpose |
| --- | --- |
| `DeviceId` | Enrollment-issued device identifier, unique to this physical workstation. |
| `MeshToken` | Owner-protected relay pairing secret. |
| `RelayUrl` | Canonical authenticated relay endpoint. |
| `Workspace` | Owner-approved local folder for bounded file operations. |
| signed Windows passport and trusted registry record | Required by the canonical ZITADEL/C3 host composition; relay connection alone is not identity admission. |
| Formula, independent Veritas, and Receipt Authority bindings | Required before a live command can be called production-governed. |

## Host preflight

1. Install supported Node.js 24 or later and validate `node --version`.
2. Clone the approved Device Bridge revision. Verify its commit and the source pins before execution.
3. Create or choose a dedicated workspace folder. The relay refuses absolute and traversal file paths.
4. Obtain a signed passport and registry admission through the canonical enrollment authority. Never fabricate one from a machine name or config file.
5. Confirm the target relay uses the matching pairing authority and is reachable over WSS.

## Start command

From the repository checkout, run the portable launcher with values supplied by the authorized enrollment flow:

```powershell
.\scripts\start-enrolled-workstation-relay.ps1 `
  -DeviceId '<enrollment-issued-id>' `
  -MeshToken '<owner-protected-token>' `
  -RelayUrl 'wss://<canonical-relay>/api/device-relay' `
  -Workspace 'D:\LeeWay\workspace'
```

The local status listener is diagnostic only. A successful listener or relay socket does not qualify identity, Formula, Veritas, receipts, file access, or UI control.

## Retired hardware-specific entry point

`operator/hp-secondary-relay-agent.mjs` is retained only as an import compatibility alias and refuses direct execution. It formerly embedded a specific HP identity and static hardware/capability claims, which is incompatible with portable enrollment. Use the launcher above for every Windows workstation, regardless of brand or role.

## Required acceptance sequence

1. Read-only bridge `device.health` and `device.info` both return a real result for the enrolled ID.
2. Compare the returned ID with the signed passport and trusted runtime registry record.
3. Confirm Formula and Veritas are evaluated by their real authorities, and confirm a canonical Receipt Authority readback.
4. Only after those gates, perform an owner-approved workspace write/readback test using a relative path and exact SHA-256 comparison.
5. Perform UI/app tests only through an explicitly granted Windows adapter; relay connectivity does not grant desktop control.

Any failure must retain the receipt and exact adapter error. Re-run only the failed gate after its specific repair.
