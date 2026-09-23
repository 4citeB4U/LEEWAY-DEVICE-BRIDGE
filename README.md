# LeeWay Device Bridge

Governed native-first device fabric for Agent Lee and model-independent LLM clients.

## Canonical deployment law

**GitHub is the public source, discovery and distribution authority. The phone is the runtime. Docker is development/qualification only.**

The intended path is:

```
Authorized LLM
  -> GitHub/Pages LeeWay Device Bridge contract
  -> discover paired phone runtime
  -> authority + capability gate
  -> phone-local execution
  -> receipt
```

GitHub Pages must never be described as the execution runtime. It publishes the bootstrap surface, contracts, package manifest and verified download route. After installation, the device package owns native identity, local runtime, offline capability, pairing, reconnection, execution and receipts.

## Mission

Connect authorized Android/Samsung, Apple, and future devices to LeeWay through one capability-negotiated contract while preserving device-owner authority, platform rules, offline operation, Veritas boundaries, and receipt evidence.

## First reference target

Samsung Galaxy Z Fold / Android.

## LLM entrypoint

Machine-readable discovery begins at `docs/llm-entrypoint.json`.

LLMs are replaceable clients. They do not become device authority.

## Development-source promotion

Existing development containers are evidence sources, not production dependencies:

- `leeway_device_operator`: promote device/capability/session/receipt behavior into the phone-local runtime.
- `leeway_api_gateway`: promote approval and front-door contract patterns.
- `leeway-n8n-dev`: development orchestration only; exclude from the phone package.
- `leeway-gravitino`: development metadata/catalog only; exclude from the phone package.

See `docs/DOCKER-PROMOTION-MAP.md`.

## Compact-package rule

Target bootstrap/runtime package ceiling: **100 MiB**.

The LeeWay Formula/storage path must be used as a qualification gate where applicable, but no compression result is accepted without measured package bytes plus reconstruction/behavior evidence. A 1 GiB -> 100 MiB reduction is an engineering target, not a completed claim.

## Laws

- Native app first; network transport is replaceable.
- Offline local capabilities remain local.
- Available != authorized != active != verified.
- Screen observation never implies UI control.
- Platform permission is necessary but not sufficient; LeeWay may impose stricter controls.
- First success != completion.
- No runtime, Formula, Veritas, compression, or receipt claims without evidence.

## Build path

G00 repository authority -> G01 contracts -> G02 Pages/LLM discovery -> G03 Android package -> G04 phone-local runtime -> G05 pairing/transport -> G06 Fold physical qualification -> G07 airplane-mode proof -> Apple adapter.
