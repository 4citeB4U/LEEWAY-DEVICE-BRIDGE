# Machine Consciousness ↔ Device Bridge host sovereignty

Canonical map: [Machine Consciousness cross-repository integration v1](https://github.com/4citeB4U/Machine-Consciousness/blob/main/docs/architecture/leeway-cross-repository-integration-v1.md).

Device Bridge is the authenticated, host-scoped adapter boundary. The host Digital Brain owns local state, diagnostics, hardware interrogation, grants, and capability facts. Central services request capabilities; they do not own host paths or hardware.

Bridge actions require host-policy preflight, abstract capability/modality vectors, device grants, execution identity, correlation ID, measured pre-state, and measured post-state. Raw OS paths cannot become universal identity. `NOT_PROBED`, `ADMISSION_DENIED`, `NOT_EXECUTED`, and transport failures remain visible. Browser emulation or configuration does not prove physical GPU, microphone, playback, or handset execution.
