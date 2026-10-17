# Capability Matrix

| Capability | Browser bootstrap | Android native | Apple native |
|---|---|---|---|
| Platform discovery | observed/inferred | native observed | native observed |
| Exact model | client-hint dependent; otherwise native required | Build.MODEL | native platform APIs where exposed |
| Files | no privileged authority | Storage Access Framework / platform permission | document picker/security-scoped access |
| Diagnostics | browser-observable PWA state plus optional WebGPU readback; never direct-Metal proof | native diagnostics | platform-authorized diagnostics |
| Screen | no privileged cross-app authority | platform authorization required | platform authorization required |
| Pointer/guidance | UI-only | app/accessibility design required | platform-limited |
| Cross-app control | no | Android-authorized accessibility path only | unavailable unless Apple exposes an authorized route |
| Offline runtime | cached PWA shell; no privileged runtime | yes | yes |
| Receipt storage | local observation projection only; no canonical receipt issuer | local | local |

Unknown is a valid state. Never infer a stronger capability from device branding.
