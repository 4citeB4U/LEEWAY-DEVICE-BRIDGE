# LeeWay Device Bridge

Governed native-first device fabric for Agent Lee and model-independent LLM clients.

## Ecosystem portability contract

This bridge follows the shared [LeeWay ecosystem portability policy](https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/config/portability-contract.md). Canonical authority and logical capabilities remain independent of filesystem paths, operating systems, devices, browsers, and model providers. Deployment bindings select authorized native, transport, browser, and model adapters according to actual host capabilities; no particular vendor or model becomes LeeWay authority.

The current reference implementation targets Android/Samsung through the native device package. Device operations require the applicable installed runtime, pairing and authorization state, platform permissions, and a verified capability handshake. Other platforms require their own compatible adapters and qualification. An optional browser or model client cannot substitute for the native device authority and permission checks.

Keep source discovery, package availability, paired connectivity, authorized execution, and verified receipts distinct. Missing adapters or permissions must be reported explicitly. This shared policy does not claim universal device support or testing across operating systems, browser engines, model providers, or physical devices.

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

## Universal Device Operator

The Device Bridge now defines one portable Device Operator contract rather than separate competing control systems for each OS:

- portable kernel: `operator/device-operator.mjs`
- adapter registry: `operator/adapter-registry.json`
- platform-adapter contract: `contracts/platform-adapter.schema.json`
- platform architecture/authority map: `docs/DEVICE-OPERATOR.md`
- native reference implementation: `apps/android`

Registered targets are Android, iOS, iPadOS, Windows, macOS and Linux. Registration is not a claim of native implementation or physical qualification: Android is the active implementation target; the other adapters remain PROPOSED until their native code and acceptance campaigns pass.

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
