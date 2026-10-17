# G19 Apple PWA Agent Lee workstation source qualification

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Scope:** installed Safari PWA workstation interface for an owner-paired LeeWay runtime

## Implemented source

- `docs/apple-agent-workstation.js` implements a TLS relay client for the existing token-room transport.
- The PWA first requests `device.capabilities` and enables the conversation interface only if the actual paired runtime advertises `agent.chat`.
- A user-authored request is sent through `agent.chat` with `speak: false` and `creatorContext: "apple-pwa"`.
- Returned authority, model, canonical Formula, Veritas, receipt, and runtime fields are displayed as returned. Missing fields remain `NOT_REPORTED`.
- The pairing token is held only in JavaScript page memory after pairing; the visible token input is cleared. Clear Runtime Pairing removes that memory value. Remote output redacts secret-shaped fields.
- Service-worker cache revision advanced to `leeway-device-bridge-v7` so the installed PWA can obtain the new module.

## Source verification

Command:

```text
node --test tests/apple-pwa-source.test.mjs tests/pages-contract.test.mjs
node --check docs/app.js
node --check docs/apple-agent-workstation.js
git diff --check
```

Result: both Node test files passed; both browser modules parsed; `git diff --check` reported no content errors.

## Acceptance boundary

This is source-qualified workstation plumbing. It does not record a live pairing, Agent Lee result, model execution, direct Metal command, canonical Formula evaluation, Veritas result, or receipt. A physical acceptance record is created only after the owner pairs an authorized runtime and captures its returned evidence in the PWA.
