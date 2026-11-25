<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.GITHUB.REGISTRY.QUALIFICATION
TAG: LEEWAY.GITHUB_REGISTRY.BINDING.CHECKPOINT.20261125
5WH:
WHAT = Record the source-only binding of managed Device Bridge to a pinned GitHub registry.
WHY = Distinguish canonical GitHub source custody from verified device enrollment and execution.
WHO = Creator authority / outside support contributor (not Agent Lee).
WHERE = docs/qualification/GITHUB-MANAGED-REGISTRY-BINDING-20261125.md.
WHEN = 2026-11-25.
HOW = Immutable commit SHA, exact bytes digest, fail-closed source tests, no host mutation.
LICENSE = MIT
-->
# GitHub-backed managed registry — qualification checkpoint

## Mission and source
- Continuing LeeWay Engineering issue #6 and Device Bridge issue #109.
- Repository: `4citeB4U/LEEWAY-DEVICE-BRIDGE`.
- Copilot preservation base: `repair/fresh-managed-registry-20261124` at `87e14d07992174d5f854dcd0edd8b3bb66941d50`.
- Implementation PR: #143, `repair/approved-managed-registry-binding-20261125`.
- No work was performed on Runtime Fabric, Northflank, Render, or physical devices.

## Canonical source and binding
The managed startup entrypoint now invokes `loadApprovedRegistryResolver(process.env)` and injects the result into `startManagedDeviceMcp({resolveDeviceRegistry})`.

The source loader **only** accepts the pinned GitHub repository `4citeB4U/LEEWAY-DEVICE-BRIDGE` and file `registry/managed-device-registry.v1.json`.

For the explicit empty-registry source snapshot committed on the repair branch, the deployment bindings are:

```text
LEEWAY_DEVICE_REGISTRY_GITHUB_COMMIT=b20cde3b457abb37aba663c63ac7987975798d2f
LEEWAY_DEVICE_REGISTRY_GITHUB_SHA256=58badcda0e9dd1e01db4c6c98a50df7ab586119ec9bf571e4cfcff6ae54f1acc
```

These pins are non-secret public provenance. `LEEWAY_MCP_OWNER_SUB` remains a separate, previously approved Zitadel owner subject. **Do not infer or copy an owner subject from a GitHub username.** All existing managed configuration bindings remain required.

## Trust boundary
GitHub is the canonical **source custody and revision authority**, not a cryptographic signer for physical device identity.

- A valid empty registry source can yield `NO_REGISTERED_ADAPTERS`, `registeredDeviceCount=0`, and `/readyz=200` after the existing managed bindings are supplied.
- No device has been admitted or physically verified by this source repair.
- A nonempty GitHub registry must fail `MANAGED_BRIDGE_SIGNED_ENROLLMENT_NOT_QUALIFIED` until signed passport verification, owner/signer custody, current revocation and physical identity gates are integrated.
- A missing pin, missing GitHub source, incorrect digest, invalid JSON, or incorrect schema remains `REGISTRATION_AUTHORITY_UNBOUND` and cannot grant trusted discovery or command execution.
- `/healthz=200` means process liveness only; `/readyz=503` is the expected response if the provider cannot be qualified.
- No alternative, default, fake, or workstation-specific provider is used.

## Verification
- Proposed source tests: `node --test tests/mcp/github-managed-registry.test.mjs`.
- Full regression: `npm run test:mcp` after dependency installation.
- GitHub Actions CI must independently run and pass on PR #143 before promotion.
- Cloud `/mcp`, Runtime integration, managed resource binding, and real device enrollment: **NOT_EXECUTED** in this workstream.
- Independent Veritas, Receipt Authority, Learning Ledger: **NOT_EXECUTED**.
- Rollback: revert only the PR #143 commits to return to Copilot's previously reviewed base; do not delete the base branch.

## Remaining acceptance
1. Complete CI and fix any observed failures without weakening trust.
2. Verify a GitHub-pinned, signed registry schema for nonempty production enrollment in the owning identity mission (PR #134/#135), preserving exact issuer/owner and replay controls.
3. Configure the approved deployment environment with the public source pins and existing private Zitadel bindings; never print private values.
4. Verify `/healthz`, `/readyz`, owner-authenticated MCP discovery, denied unauthorized access, and independent source readback.
5. Only afterward perform the separately approved free Northflank migration and Render retirement. No paid plan is authorized.
