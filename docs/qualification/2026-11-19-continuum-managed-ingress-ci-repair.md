# Continuum managed-ingress CI repair

- **Authority:** Creator-approved W01 continuation
- **Repository / branch / starting SHA:** `4citeB4U/LEEWAY-DEVICE-BRIDGE` / `codex/w01-agent-device-access-20261119` / `91c169638055e26a21595fe573619d177608dc4d`
- **Timestamp:** 2026-11-19 America/Chicago
- **Classification:** `REGRESSED` source caller after Vercel retirement

## Failure and repair

The `Three-part Continuum source qualification` workflow called
`qualify-three-part-sources.mjs --vercel bridge/vercel.json` after that
qualifier was converted to provider-neutral `--managed-ingress`. The obsolete
argument caused the observed CI failure before Continuum source validation.

The workflow now passes the checked-in
`operator/hosting/managed-ingress-contract.json` through `--managed-ingress`.
Its trigger paths now include that contract and the Apple source-test coverage
remains separate.

## Reproduction

```text
node operator/identity/qualify-three-part-sources.mjs --managed-ingress operator/hosting/managed-ingress-contract.json --topology <LeeWay-Continuum>/config/storage-topology.candidate.json
```

Result: `sourceContract: PASS`; live integration, authenticated MCP, device
execution, Continuum readback, Veritas, receipts, and Learning are all still
unverified/not probed by this source-only gate.

## Boundary

This repairs the CI invocation. It does not repair the external ChatGPT
connector's saved endpoint, authorize Apple signing, install an IPA, or reach
an iPhone. Rollback is a source revert only.
