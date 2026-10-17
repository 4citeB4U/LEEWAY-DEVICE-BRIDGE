# G19 physical iPhone WebGPU readback

**Recorded:** 2026-10-17  
**Source:** owner-provided output from the installed LeeWay PWA on the physical iPhone  
**Observation ID:** `2e15ffca-3a85-43b5-bc3c-fc3bfb7e1c2f`

## Measured browser-compute result

| Field | Result |
| --- | --- |
| PWA mode | standalone, online, secure, service-worker controlled |
| Browser compute state | `BROWSER_WEBGPU_READBACK_PASSED` |
| Browser adapter metadata | Apple reported by browser |
| Workload | `y = 3x + 1` over eight unsigned integer values |
| Readback values | 8 of 8 match expected output |
| Independent arithmetic check | pass |

The measured inputs were `[3, 8, 21, 34, 55, 89, 144, 233]`. The expected result and returned readback were both `[10, 25, 64, 103, 166, 268, 433, 700]`.

## What this establishes

The physical iPhone LeeWay PWA exposed a browser WebGPU adapter, completed the deterministic compute workload, and returned the expected storage-buffer output to the application. This is real browser-level compute-and-readback evidence for the Apple PWA lane.

## What it does not establish

The browser metadata identifies Apple generically; it does not identify a precise physical GPU model. Safari PWA WebGPU does not expose `MTLDevice` or provide direct native-Metal evidence. The observation also correctly reports Formula and Veritas as not executed and no receipt as created.

## Next governed gate

Preserve this deterministic WebGPU readback as a regression workload. The next implementation gate is an authorized request contract that can connect a governed Formula decision, supported Runtime Fabric execution request, Veritas checks, and an authentic receipt without relabeling this browser observation as any of those authorities.
