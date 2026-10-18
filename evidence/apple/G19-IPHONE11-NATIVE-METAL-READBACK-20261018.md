# G19 — iPhone 11 native Metal readback

**Observed date:** 2026-10-18  
**Scope:** physical-device qualification of the installed LeeWay Device Bridge iOS app

## Observation

The Creator installed the qualified `LeeWayDeviceBridge-unsigned.ipa` through the already authenticated iLoader USB path, then opened **LeeWay Device** on the physical iPhone 11 and selected **Run Device Bridge Metal Probe**.

The submitted photograph shows the native application's direct-compute observation screen with these values:

| Field | Observed value |
| --- | --- |
| Adapter | `leeway.operator.ios` |
| State | `LOCAL_READBACK_PASSED_PENDING_RECEIPT` |
| Backend | `Metal` |
| Physical Metal device | `Apple A13 GPU` |
| Lanes | `256` |
| Mismatches | `0` |
| Detail | `Direct Metal readback passed locally; Device Bridge receipt verification remains required.` |

## Capture integrity

The submitted capture is retained by the current task host at `C:\Users\Leona\AppData\Local\Temp\codex-clipboard-a86a74ba-fe4e-4f3e-988e-2a7dae48af53.png` at the time of recording.

```text
SHA-256: 4BB9DB5494D5DDF0067D54BB09A40B281FC068F5E4E02A3FFA4D24AFA44301C7
```

The delivered package was independently matched to its package manifest before the observed installation:

```text
source revision: 9da1baee43b5c1505c52f8b7ea8eb8678419d773
IPA SHA-256:     96c57945bf48fe2fccc1fe4b364313cfc8f1e66d5f9c7a6653d85ca032dff7a3
```

## Acceptance result

**PASS — physical native iOS Metal local readback.**

This is the native iOS application, not the Safari PWA. The screen's native `Metal` backend and `Apple A13 GPU` identity match the installed Device Bridge application's `MTLCreateSystemDefaultDevice`, compute command-buffer, and readback implementation. The PWA reports browser WebGPU separately and explicitly cannot report direct `MTLDevice` evidence.

## Boundaries retained

This evidence does not authorize or demonstrate:

- a Device Bridge receipt creation or independent receipt verification;
- Formula authorization;
- Veritas pre-gate or post-gate acceptance;
- Runtime Fabric consumption; or
- Agent Lee or any other model inference.

The next Apple-native gate is to bind this local observation to the canonical Device Bridge receipt contract, then submit that receipt for independent verification without changing the observed hardware identity or representing this probe as model execution.
