# Docker Promotion Map

Docker is a development and qualification surface only. Nothing in this file authorizes Docker as the production Device Bridge runtime.

## Observed development sources

| Development component | Observed role | Promotion into Device Bridge |
|---|---|---|
| `leeway_device_operator:device-layer-163b` | Device registry, capabilities, files, screen, camera, notifications, location, heartbeat, execution, approvals, receipts, casting/satellite/network discovery | **PROMOTE CONTRACTS/BEHAVIOR** into the phone-local runtime |
| `leeway_api_gateway:local` | Approval front door, capability reporting, receipt patterns, lane health | **PROMOTE AUTHORITY/APPROVAL PATTERNS**; do not ship the container |
| `n8nio/n8n:latest` | Development workflow orchestration | **DO NOT SHIP** in the phone package |
| `apache/gravitino:1.3.0` | Development metadata/catalog service | **DO NOT SHIP** in the phone package |

## Phone package law

The downloadable package must contain only device-local runtime code, native adapters, contracts, Formula/capsule support required on-device, and the evidence needed to verify the package.

The package must not require Docker, n8n, Gravitino, or the Windows LeeWay runtime to start.

## Size gate

Target package ceiling: **100 MiB** for the bootstrap/runtime package.

This is a target, not a claim. A package is not marked qualified until its real byte size and SHA-256 are measured. Any Formula/storage transformation must preserve its declared reconstruction/behavior contract and produce evidence; no compression ratio may be claimed from source intent alone.
