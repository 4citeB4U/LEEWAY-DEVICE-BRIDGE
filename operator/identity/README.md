# LeeWay identity boundary

This directory contains provider-neutral identity verification and trusted-device registration components.

- `oidc-access.mjs` validates exact HTTPS issuer metadata, issuer-origin JWKS, RS256 signatures, owner subject, audience, expiry, and least-privilege LeeWay scopes or project roles.
- `trusted-device-registry.mjs` validates enrolled device records and mesh-token bindings.
- `qualify-public-mcp-endpoint.mjs` checks the public OAuth/OIDC discovery contract without credentials. It does not prove an authenticated call or device execution.
- `bind-canonical-continuum.mjs` composes an existing owner-admitted Continuum provider. It does not initialize storage or grant write authority.

The active Device Bridge does not host an identity provider. A configured issuer authenticates a caller only; Runtime admission, capability grants, physical availability, and receipts remain separate gates.

Pocket ID-specific deployment and host code was retired from the active repository on 2026-11-17 and preserved in `4citeB4U/LEEWAY-D-DRIVE-RECOVERY-20260925` under `quarantine/2026-11-17/LEEWAY-DEVICE-BRIDGE/`.
