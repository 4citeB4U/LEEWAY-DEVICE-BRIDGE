# Apple PWA Agent Lee Workstation

## Purpose

The installed Safari PWA is the LeeWay workstation surface for iPhone and iPad. It provides a device-aware user interface, browser diagnostics, browser WebGPU measurement where Safari exposes it, and an owner-paired route to an already authorized LeeWay runtime.

This is implemented in the canonical Device Bridge Pages app. It is not a second Apple project and it does not replace the Android or Windows runtime.

## Runtime path

1. The owner opens the installed LeeWay PWA on the Apple device.
2. The owner enters the Device ID and pairing token for an existing LeeWay runtime.
3. The PWA opens the TLS relay and requests `device.capabilities`.
4. The PWA enables Agent Lee chat only when that runtime actually advertises `agent.chat`.
5. A user-authored request is sent as `agent.chat` with `speak: false` and `creatorContext: "apple-pwa"`.
6. The PWA displays the actual returned model, authority, Formula, Veritas, and receipt fields without promoting missing fields to a pass.

The relay at `wss://agent-lee-x.vercel.app/api/device-relay` is transport only. It does not grant runtime capability, authorize a task, execute Formula, or verify a receipt.

## Apple boundary

| Capability | State in the Safari PWA |
| --- | --- |
| Installed Home Screen interface | Implemented |
| Browser diagnostics | Implemented |
| Browser WebGPU probe and readback | Implemented when Safari exposes WebGPU |
| Agent Lee request UI | Implemented; requires owner pairing and advertised capability |
| Runtime model execution | Reported only when the paired runtime returns it |
| Canonical Formula | `NOT_EXECUTED` unless an actual runtime response proves otherwise |
| Veritas | `NOT_EXECUTED` unless an actual runtime response proves otherwise |
| Native Apple Metal | Not available to Safari PWA; requires a separately qualified native adapter |
| Filesystem, shell, deployment, repository write | Not exposed by this static PWA |

## Credential handling

The Device ID and owner pairing token are entered in the PWA. The token remains in JavaScript page memory only after pairing, is removed from the visible input, and is discarded by **Clear Runtime Pairing** or when the app closes. The PWA does not write the token to localStorage, service-worker cache, browser diagnostics, or conversation output. Displayed remote evidence redacts fields whose names identify secrets or credentials.

## Evidence status

The Apple PWA has a physical iPhone browser observation and a measured WebGPU readback evidence record. This workstation console is source-qualified until an owner pairs a runtime and records the runtime’s own result. A successful browser WebGPU result does not prove Agent Lee model execution, direct Metal execution, canonical Formula evaluation, Veritas verification, or a receipt.
