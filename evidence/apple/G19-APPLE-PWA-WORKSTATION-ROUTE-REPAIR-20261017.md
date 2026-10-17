# G19 Apple PWA workstation route repair

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Scope:** installed Safari PWA route to the real shared cloud development workstation

## Diagnosis and repair

The former Apple PWA pairing panel was an incomplete transport UI, not an actual development workstation. It has been removed from the Apple path.

- **Open Apple Cloud Workstation** opens the canonical Device Bridge repository in GitHub Codespaces.
- The same `.devcontainer/devcontainer.json` used by the Android cloud lane supplies browser VS Code, a Linux terminal, Node, Git, GitHub CLI, and Docker.
- The PWA cache revision advanced to `leeway-device-bridge-v8` so installed Home Screen apps receive the repaired launcher.
- The PWA remains the Apple front door for browser diagnostics and WebGPU evidence, with GitHub Codespaces carrying actual development work.

## Source verification

```text
node --test tests/apple-pwa-source.test.mjs tests/pages-contract.test.mjs
node --check docs/app.js
git diff --check
```

## Acceptance boundary

This verifies the launcher source and its PWA boundary. It does not prove a Codespace was created, that a particular GitHub account has quota, or that a native Apple Metal/model/Formula/Veritas operation ran. A real developer-workstation acceptance record requires the owner to create or resume the Codespace and perform its first editor or terminal operation.
