<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.SECURITY.MESH_CREDENTIAL_MIGRATION
TAG: LEEWAY.DEVICE_BRIDGE.SECURITY.RELAY_TOKEN_MIGRATION.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Stage safe migration from source-exposed global relay token to original owner-issued device-scoped pairing credentials.
WHY = Prevent public dashboard or source checkout from authorizing remote device commands.
WHO = Creator/Human and original Pocket-ID/ZITADEL, Runtime Fabric, Device Bridge and security incident owner.
WHERE = docs/security/RELAY-CREDENTIAL-MIGRATION-20261112.md.
WHEN = 2026-11-12.
HOW = Contain/rotate, prepare hosts, migrate clients, prove fail-closed and owner recovery, then remove legacy bypass.
LICENSE: Existing repository terms remain unchanged.
-->
# Security Hold: Source-Exposed Relay Token and Fleet Migration

**P0 security issue:** [Device Bridge #109](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/issues/109). Do not print current/old secrets in issues, receipts, logs, dashboards or release manifests. **Review stage only; actual host, Pocket-ID credentials, live client environment and production poststate were not inspected in this source change.**

## Actual source finding

The old shared mesh token literal was present in the relay, multiple native/proxy agent/gauntlet files and public dashboard HTML. The relay accepted the mesh token as an alternative to per-room pairing. This is a **potential unauthorized client credential** exposed by shipped source; not evidence that any malicious client used it. An in-source token is never a ZITADEL issuer-backed user/device/tenant grant. The public UI's synthetic success claims were separately corrected at merged PR #111.

## Required owner-authenticated migration, no blind restart

1. **Inventory and bound the blast radius:** exact production and local relay deployments, authentication path, exposed public dashboard revisions, current active WebSocket sessions, device pairs, tenant namespace, fallback usage, source Git history and original mission. Preserve access-gapped records. Do not assume the host has `LEEWAY_MESH_TOKEN` provisioned merely because a deployment is green.
2. **Human-approved containment:** original security/identity owner revokes or rotates all compromised public/shared tokens under protected custody, assesses existing sessions and cross-room scope, and prepares a tested rollback and device reconnect. Do not delete device-local Brain/Diagnostics or disrupt lawful receipts.
3. **Host composition:** rely on existing Pocket-ID/ZITADEL and Runtime verified issuer/audience/owner/tenant/device grants, with exact target, capability, nonce/operation digest, expiry and revocation. No new identity issuer or parallel control plane. Intermediate host environment secrets are temporary pairing material, **not** full production authorization.
4. **Client migration:** provision affected workstation, HP, Android, Apple supervisor and test operators with properly scoped, non-source secrets via authorized host/device-native storage. The old public dashboard may never ship tokens or print unexecuted work as PASS.
5. **Source repair:** this PR removes literal defaults. If no host pairing token is configured, the mesh override is disabled and client requests must fail through the existing per-room pairing rules; do not auto-reenable a public fallback. A missing credential should be distinguishable from runtime outage and visible as an owner-actionable block.
6. **Negative verification:** unknown/stale shared token cannot access other rooms, tenants or devices; missing host token cannot trigger a command; replay, user consent withdrawal, wrong device and expired grant are denied before a physical operation; prove on a clean real host.
7. **Physical acceptance:** actually connect primary workstation, Fold6, HP native daemon and iPhone native app as each can be lawfully tested. Record host-specific principal, role, exact capabilities and physical post-state, including USB removal/Wi-Fi reconnect and OS consent. A supervisor proxy does not prove iPhone native operation.
8. **Independent release:** original Veritas PRE/POST, Receipt Authority append/readback, Continuum and Production release may be claimed **only** after corresponding original custodian action and source/deployment alignment. No force-wipe of individual agent state or fake revocation receipt.

## Release and rollout blocker

Before merging or deploying code that removes a default token, confirm authenticated replacement credentials exist on every affected active host and client, verify pre/post availability on physical devices, observe denied old-token access and validate reconnect/rollback. Even if source CI passes, this branch remains `STAGED_NOT_LIVE_QUALIFIED`. The old secret exists in earlier Git history; removing current literals does not erase exposure or substitute for rotation.

**Open dependencies:** authenticated Bridge discovery HTTP 502 on 2026-11-12; original issuer/grant proof unavailable to outside contributor; public Tailscale Funnel host readback failed via the available browser inspection; no independent live device, cross-tenant or Veritas admission test performed.
