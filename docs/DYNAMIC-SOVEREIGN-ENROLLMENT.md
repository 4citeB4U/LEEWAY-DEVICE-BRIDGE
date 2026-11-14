# Dynamic sovereign enrollment

LeeWay Device Bridge must be portable by lifecycle, not by a growing table of
hand-configured device IDs. A device name, hostname, IP address, BIOS serial,
relay socket, mesh token, or model provider is never device admission.

## Lifecycle

`install → verify package → create/load native device key → Runtime challenge → owner approval → device proof → canonical device record → local custody → capability negotiation → governed runtime start`

The portable coordinator is [dynamic-enrollment.mjs](../operator/dynamic-enrollment.mjs). It does not create another registry or issuer. It composes the owning platform and Runtime providers:

- `keyProvider`: hardware-backed key where available, software fallback only when explicitly reported by the provider.
- `enrollmentAuthority`: canonical Runtime authority that creates challenges and persists completed device records.
- `ownerApproval`: LeeWay owner/OIDC approval binding.
- `localCustody`: device-local record custody; never a substitute for Runtime authority.
- `capabilityProbe`: measured platform capability observation.
- `runtimeStarter`: authenticated native runtime start after enrollment.

The enrollment authority must reject expired or replayed challenges, mismatched key proofs, owner denials, revoked identities, and records that do not bind to the exact device key thumbprint. A mesh token may establish network reachability but cannot replace enrollment.

## Installation execution

`installation-adapter.mjs` still performs package integrity, platform routing,
provider health, and explicit owner-approval checks. Its execution function now
accepts only an injected native executor after a `DRY_RUN_READY` plan. Without
that provider it fails closed; with it, it returns `INSTALLATION_EXECUTED_PENDING_VERIFICATION` rather than claiming an installed package is qualified.

## Product boundary

This repository now contains the portable orchestration contract and tests. A
live installation additionally requires the canonical Runtime implementation of
the enrollment authority, owner authentication, durable anti-replay, canonical
registry persistence, Formula/Veritas gates, Receipt Authority custody, and an
authenticated execution route. Until those real providers are deployed and
bound, discovery-only/read-only access remains an honest current capability of
the live connector—not a permanent Device Bridge product limitation.
