# Agent Lee Vision — GitHub-hosted HTTPS candidate

Status: isolated source candidate. This is a capability UI subordinate to Agent Lee, not a new Runtime Fabric, a replacement Device Bridge, a qualified native camera provider, or an approved Golden Package.

Location after verified publishing: /LEEWAY-DEVICE-BRIDGE/docs/vision/.

## Reuse-first evidence review — October 10, 2026

| Existing LeeWay evidence and source | Maturity | Reuse and qualification limit |
| --- | --- | --- |
| LEEWAY-D-DRIVE-RECOVERY-20260925/evidence/2026-09-25/docker-containers.jsonl | Historical container EVIDENCE | Records agent-lee-vision-kernel invoking uvicorn vision-server:app on port 8093 in September. Full vision-server implementation was NOT recovered from default-branch GitHub code. Do not require that container to run this app. |
| Leeway-Runtime-Fabric/vision-os/ | PARTIALLY BUILT | Defines consent and camera source input validation, frame sample routing, and RTC track contracts. Manifest explicitly reports architecture-defined. Its Qwen-VL route is OPTIONAL and MUST NOT be a dependency for local vision. |
| Leeway-Runtime-Fabric/src/core/LeewayVisionRuntime.ts | ALREADY BUILT PIXEL MATH | Use actual sampled brightness and temporal pixel differences from camera frames where authorized. Estimated objectCount and depthConfidence are brightness-derived HEURISTICS. Faux object bounding boxes, thermal temperatures and semantic classes are NOT physical sensor claims. |
| LeeWay-Edge-RTC/src/rtc/store.ts | PARTIALLY BUILT | WebRTC media-track lifecycle, producer/consumer and cleanup patterns. Its real-time SFU requires an actual qualified service and authorization; README claims do not prove deployed SFU health. |
| LeeWay-Edge-RTC/src/components/VisionPerceptionLab.tsx | UI REFERENCE ONLY | React lab contains a mock agent-feed list and starts the camera on component mount. Do not copy those behaviors into consent-required production UI. |
| LEEWAY-DEVICE-BRIDGE camera and Wi-Fi provider adapters (working branches/older local checkout) | PARTIALLY BUILT | Contract camera.observe/capture/stream and network discovery. The provider marks camera physical qualification pending. The current published remote capability list does not qualify remote phone camera.stream. |
| The Optical Command Pad in this folder | ISOLATED HTML CANDIDATE | Uses actual MediaDevices enumeration, chosen device IDs, local video decoding checks, stop/release, independently movable controls, organic/crystal modes and non-LLM operation. Requires human permission and further physical browser acceptance. |

MISSING GLUE: authenticated Device Control camera media routing to the PC and validated frames for both distinct Fold front/rear sensors, sharing the existing LeeWay RTC transport and Device Bridge permissions. Bluetooth/USB pairing or Wi-Fi connectivity alone do not expose both sensors.

TRULY MISSING / NOT YET VERIFIED: independently authorized Fold front and Fold rear camera publishing with signed device identity and actual two-track readback on another device, plus canonical Formula/Veritas receipts and verified Learning Ledger admission.

## Production truth boundaries

- GitHub Pages is an HTTPS file host, not a live camera capture server or WebRTC TURN/SFU media bridge.
- The front/rear Fold cameras cannot be invented from the Windows virtual Fold6 camera. The virtual webcam is at most one reported video source.
- Camera stream available, decoded video frame advancing, offline non-LLM analysis available, and Agent Lee governed runtime acceptance are separate states.
- The legacy Vision OS frame-derived temperature/depth/object indicators are NOT imported as real detection. Live UI labels must not claim semantic recognition when the detector is absent.
- Do not publish camera frames, personally identifying camera metadata, enrollment vectors, tokens or secrets in this public repository.
- This static candidate uses neither Docker nor an LLM to open a directly attached browser camera. LLM-free face tracking requires an authorized local detector; source code alone does not qualify physical tracking.
- The installed Agent Lee Golden Package and active PC/Fold6 device authority are unchanged by this branch.
- Existing sensory/voice contributor PR paths are not modified.

## Qualification sequence

1. Confirm source SHA and 100% offline/no-LLM HTML source regression on Node 22.
2. Confirm HTTPS served page loads without JavaScript console errors and does not request a camera until the owner clicks.
3. In interactive Windows Chrome, list actual camera hardware labels and show frame advancement on each accessible device.
4. On the phone, separately qualify front/rear sensors in the mobile browser or authorized native Android camera provider.
5. Reuse the existing Device Control pairing and LeeWay Edge RTC interfaces for an independently verified dual-video session across Wi-Fi. No fake multi-stream clones.
6. Bind to the Golden UI only after actual Formula/Veritas pre/post execution and receipts. Ledger updates are separate from local hashes.

Rollback: Revert this isolated docs/vision path in GitHub and leave native Device Bridge / Runtime Fabric untouched.

References:
- https://github.com/4citeB4U/LEEWAY-D-DRIVE-RECOVERY-20260925/blob/main/evidence/2026-09-25/docker-containers.jsonl
- https://github.com/4citeB4U/Leeway-Runtime-Fabric/tree/main/vision-os
- https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/src/core/LeewayVisionRuntime.ts
- https://github.com/4citeB4U/LeeWay-Edge-RTC/blob/main/src/rtc/store.ts
- https://github.com/4citeB4U/LeeWay-Edge-RTC/blob/main/src/components/VisionPerceptionLab.tsx
## 2026-10-10 source adaptation added after browser proof
The published candidate now samples decoded local camera pixels at a bounded interval and calculates actual brightness and temporal pixel motion, adapted from LeewayVisionRuntime.ts. It distinguishes a live camera from missing face/model analysis. It does NOT claim semantic object recognition, depth, temperature, or facial identification. On Windows headless Chrome, an original isolated HTTP smoke produced 27 advancing video frames in 1.5 seconds while the separate face-tracking service was unavailable.
