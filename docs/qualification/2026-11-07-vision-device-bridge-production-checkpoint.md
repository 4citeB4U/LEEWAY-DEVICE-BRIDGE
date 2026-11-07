# Vision through LeeWay Device Bridge — production checkpoint

**Checkpoint time:** 2026-11-07 10:30:45 America/Chicago (2026-11-07 16:30:45 UTC)
**Agent identity:** Codex operating under Creator-authorized task instructions.
**Repositories:** `4citeB4U/Leeway-Agent-Lee-Vision` and `4citeB4U/LEEWAY-DEVICE-BRIDGE`.
**Scope:** Bind real Windows camera frames to the governed Vision connector and Device Bridge MCP image result.

## Gate result

The Windows physical-camera path is executed and verified through the live Device Bridge session. The complete cross-platform, active-MCP, Formula/Veritas, and autonomous-any-LLM production gate remains **NOT FULLY QUALIFIED** because those independent gates were not executed by this checkpoint.

## Accepted decisions

- Keep `VisionBridgeConnector` as the portable authority for source ownership, per-camera grants, session ownership, frame cursors, image validation, provenance, and physical STOP.
- Add the Windows DirectShow adapter as a platform producer behind that connector; it uses owner-controlled FFmpeg and never manufactures telemetry or frame bytes.
- Emit a verified Vision image as one native MCP image content block. Keep base64 out of text while retaining safe metadata and the existing receipt hash over the complete adapter result.
- Treat a live Windows frame as evidence for Windows only. Android and Apple adapters require their own executed producer, advancing frame, physical STOP, and independent verification.
- Preserve the existing Device Bridge admission, receipt, compliance-card, and trusted runtime-composition boundaries. Configuration and source tests do not substitute for an active runtime readback.

## Rejected claims

- No claim that every LLM, device, operating system, or active MCP server is production-ready from this evidence.
- No claim that USB/WPD or ADB enumeration alone proves a mobile camera stream.
- No claim of Formula evaluation, independent Veritas decision, Continuum admission, or Learning Ledger entry; the live Bridge receipts below are `CONTROLLER_OBSERVATION` with `formula: NOT_EVALUATED`.
- No claim that the currently connected external MCP surface has reloaded the trusted Vision provider composition; its live capability inventory was not refreshed to expose `vision.*` in this checkpoint.

## Implemented source

- Vision `main` commit: `59693f117a77061a237c940ced61dc661619ff21` (`feat(vision): bind verified Windows frames to Device Bridge`).
- Device Bridge source commit: `311dfa830afa1a6dd061cc831b50936b1ac09d3b` (`feat(vision): expose verified images through MCP`) rebased onto concurrent USB C3 `main` at `0a5268209d5b4aedc5f9ed3673bfaa7ec978f5ab`.
- Vision files: `service/directshow-frame-producer.mjs`, `service/vision-bridge-connector.mjs`, `scripts/qualify-directshow-live.mjs`, and `docs/DEVICE-BRIDGE-RUNTIME-BINDING.md`.
- Device Bridge files: `apps/desktop/mcp-server.mjs` and `tests/mcp/vision-image-content.test.mjs`.

## Executed evidence

### Source gates

- Vision: `node --test tests/*.test.cjs tests/*.test.mjs` — **20 passed, 0 failed**.
- Device Bridge integration gate before the concurrent USB C3 rebase: `npm run test:mcp` — **145 passed, 0 failed**. Post-rebase final source tree: **150 passed, 0 failed**.
- The native MCP test confirms one image block, no duplicated base64 in text, receipt result-hash preservation, and fail-closed rejection of a mismatched SHA-256.

### Live Device Bridge physical gate

The canonical live device was `pc-primary`. A relative Bridge workspace path was required; the first absolute-path attempt was rejected with `PATH_OUTSIDE_WORKSPACE` and was not treated as camera evidence.

The accepted session executed `node scripts/qualify-directshow-live.mjs` through `device.session.start` using the physical Windows camera `HD Webcam eMeet C960`:

- Session-start receipt: `385c6dce-2712-4308-b284-a3e9715e42cb`.
- Session ID: `0dd0c15b-68cd-476c-8150-bfaa21260e53`.
- Session-read receipt: `e4c05d9f-0281-473c-822d-56e5aba949a8`.
- Session-stop receipt: `733caafa-d0d2-4f2d-b5e2-9d304dd903d9`.
- Process exit: code `0`; stderr empty.
- First real frame: frame `1`, SHA-256 `08b278f9a56acbc6bbf47797ab2dfcfe4c9581b3aadd50e682a4e5126129745f`.
- Observed advancing frame: frame `2`, 1920×1080 JPEG, 279538 bytes, SHA-256 `4a168cd581cb5449866899a842d7845a60c5e6bd7f1beb9d3add67b8132d8110`.
- Connector state: `VERIFIED`.
- Physical stop: `stopped: true`, `producerStopped: true`.

The host also exposed an Android/Samsung ADB device and Apple USB/WPD entries during prior read-only enumeration, but this checkpoint did not convert either observation into a mobile Vision frame qualification.

## Capability and evidence state

| Boundary | Configured | Running | Executed | Verified | Production-ready |
|---|---:|---:|---:|---:|---:|
| Vision connector image contract | yes | yes in tests | yes | yes | source-qualified |
| Windows DirectShow producer | yes | yes in live session | yes | yes for eMeet on `pc-primary` | platform-scoped |
| Device Bridge native MCP image result | yes | yes in source tests | yes | yes in source tests | active-server reload not verified |
| Android camera adapter | observed/configured | no | no | no | no |
| Apple camera adapter | observed/configured | no | no | no | no |
| Any-LLM autonomous cross-platform route | design exists | no active readback | no | no | no |

## Next executable action

Bind the Vision provider into the intended active Device Bridge runtime composition, positively identify that running MCP server, and execute a real `vision.frames.observe` call that returns the native image block with a fresh receipt chain. Then qualify Android and Apple producers independently. Keep this checkpoint and its source/physical evidence; do not repeat passing tests without a source or runtime change.

## Publication readback — 2026-11-07 10:35:07 America/Chicago (2026-11-07 16:35:07 UTC)

The post-push Android workflow `42391789821` built, tested, measured, hashed, and uploaded the APK successfully. Its only failure was the final generated-artifact push, which lost a concurrent `main` update and was rejected by GitHub as `fetch first`; no Android build defect was observed. The workflow now has three guarded push attempts with `git fetch`, `git rebase`, and retry in `.github/workflows/android-build.yml`.

The repair is published at Device Bridge `main` commit `345f3f9fa9784fae0659fa0a899738f3be91ae9f`, remote readback confirmed. Portable protocol/MCP passed on `f33763b7ba5d08179113bad8afa196475931c7f2`; Pages passed on `de32c5a02a645095ba71aebaf1388f1c368baeb3`. Android run `42392025661` passed with the guarded publication step and published the verified APK as `080d3a3eabdb1fdc5fe3f13658b406f8a2622524`; remote `main` readback is now `080d3a3eabdb1fdc5fe3f13658b406f8a2622524`.

## Final publication readback — 2026-11-07 10:37:33 America/Chicago (2026-11-07 16:37:33 UTC)

Device Bridge remote `main` is `080d3a3eabdb1fdc5fe3f13658b406f8a2622524`. The Android build and publication workflow passed after the guarded-push repair. Vision remote `main` remains `59693f117a77061a237c940ced61dc661619ff21`, whose Production Vision Bridge Qualification and Pages workflows passed. The live Windows evidence and the remaining active-MCP/mobile/independent-governance boundaries above are unchanged.

## Final live publication readback — 2026-11-07 10:49:57 America/Chicago (2026-11-07 16:49:57 UTC)

The secondary workstation verifier first exposed a stale PWA contract: the page omitted its required device-neutral workstation entrypoints, and its live test incorrectly demanded a Docker claim that the Apple PWA acceptance test forbids. The visible workstation panel and the live-test needle were corrected without claiming native Docker in the browser. Local UI acceptance passed 5/5.

Final workflow readback for the repair commit `e9cb0ae9cbffd5f129d9585794261285a537e0a7`:

- Device Console UI Acceptance `42393032707`: **success**.
- Secondary Workstation Live Pages Gate `42393032687`: **success**.
- Pages deployment `42393031941`: **success**.
- Android Build `42393032864`: **success**, including guarded APK publication.
- Android publication commit: `2539ec376b5a504ffbe726b5af6b300cf073ac8a`.
- Remote Device Bridge `main` readback: `2539ec376b5a504ffbe726b5af6b300cf073ac8a`.

This closes the repository’s tested source, publication, UI, Pages, Android, and Windows live-camera gates in scope for this task. It does not change the explicit NOT FULLY QUALIFIED cross-platform active-MCP/Formula/Veritas/any-LLM gate above.

## Checkpoint publication readback — 2026-11-07 10:50:42 America/Chicago (2026-11-07 16:50:42 UTC)

The Android artifact publication commit `2539ec376b5a504ffbe726b5af6b300cf073ac8a` is the latest generated release commit. The preceding qualification-record readback was published at Device Bridge `main` `91a6226a95ba54516367463bb9b55e1c45c0d585`; this final documentation correction records the same verified state without changing source or runtime behavior.

## Live camera open readback — 2026-11-07 11:52:01 America/Chicago (2026-11-07 17:52:01 UTC)

**Requested gate:** Open the computer camera, the connected Android camera, and the connected iPhone camera through the live LeeWay Device Bridge, and verify the actual resulting state.

**Authority and transport:** All device operations below were issued through the live `pc-primary` Device Bridge `device.session.start` / `device.session.read` capability. The live inventory still contains only the configured desktop passport `pc-primary`; its current capability discovery does not grant `vision.*`, `device.screen.capture`, `device.ui.*`, `device.apps.launch`, or a separate physical Android/iOS device ID. Bridge receipts remain `CONTROLLER_OBSERVATION` with `formula: NOT_EVALUATED`.

### Actual operation results

- **Windows laptop camera — OBSERVED open:** A Bridge-mediated `Start-Process 'microsoft.windows.camera:'` opened Windows Camera. Readback observed `WindowsCamera` PID `30916` and `ApplicationFrameHost` PID `8136` with window title `Camera`. Session-start receipt: `10dc37a0-8361-46b4-b465-f5e8efc75144`. Session-read receipt: `445d8d4c-e472-4b1a-81d3-da42f73a357d`. A separate Bridge-mediated DirectShow frame probe against `Integrated Camera` returned `FRAME_NOT_CREATED` with DirectShow I/O/encoder errors while Windows Camera held the device; this is not counted as a verified integrated-camera frame.
- **Android / Galaxy Z Fold6 native camera — VERIFIED foreground:** A Bridge-mediated ADB intent `android.media.action.IMAGE_CAPTURE` succeeded. Fresh activity readback showed `topResumedActivity` and `mFocusedApp` at `com.sec.android.app.camera/.Camera` for user `0`. Session-start receipt: `0873ed9d-9608-4847-9e92-e4b9185a34d3`. Initial read receipt: `5972b90b-0f0a-4143-a41a-f899fd854df6`; focused-activity read receipt: `395a4e50-be1f-4483-a41f-16ce19adf669`.
- **Android camera feed through the Windows virtual-camera adapter — VERIFIED platform-scoped:** With the Android Camera activity foreground, the existing governed DirectShow qualification ran through Bridge against `Galaxy Z Fold6 (Windows Virtual Camera)`. It produced advancing frame `2`, `1280x720`, JPEG, `11010` bytes, SHA-256 `52c4d8d3a60ec36440e28ef1d97367ec147b85d1cea1c468720190e9e102093c`, `verifiedStates: ["VERIFIED"]`, and `producerStopped: true`. Session-start receipt: `b023e0a7-43c4-4cd5-8211-a5d0a2a148f9`; session-read receipt: `d48bd6e3-c06e-489d-b482-caa822d63a43`. This proves the host virtual-camera path, not an independently qualified native Android Vision producer.
- **Apple iPhone — BLOCKED at the live Bridge capability boundary:** Bridge-mediated PnP readback observed `Apple Mobile Device USB Composite Device`, `Apple Mobile Device USB Device`, and `Apple iPhone` WPD entries, all `OK`. It did not open the iPhone Camera app and no iPhone frame was returned. The current Apple adapter is explicitly host-USB observation only (`nativeIosExecution: NOT_PERFORMED_HOST_USB_OBSERVATION_ONLY`); the active `pc-primary` Bridge does not grant Apple app launch, iOS screen observation, or an iOS camera producer. USB/WPD presence is therefore not camera-open evidence. Final readback session-start receipt: `73998de6-1506-4364-835c-4d6503667feb`; session-read receipt: `412a296e-bd19-48dc-8367-c9b9bd9e598f`.

### Gate disposition

The immediate operational request is **partially satisfied**: the laptop Camera app is open and the Android native Camera is foregrounded, with a fresh Android virtual-camera frame verified through Device Bridge. The iPhone camera remains **not qualified and not opened** because the live Bridge has no authorized iOS app-launch/screen/camera route, and the repository's Apple adapter does not claim one. No source adapter, camera frame, Formula result, Veritas decision, or production-ready status is fabricated from the USB observation.

**Next executable action:** qualify and bind a supported LeeWay-owned iOS runtime path (App Intent/Shortcuts or an installed native LeeWay camera provider with the required Apple permissions), then execute an iPhone camera open, advancing frame, physical STOP, and independent verification through the intended active Bridge. Until that exists and is read back, the three-platform camera gate remains NOT FULLY QUALIFIED.

## iPhone retry readback — 2026-11-07 13:17:54 America/Chicago (2026-11-07 19:17:54 UTC)

The Creator reported that the iPhone Camera app had been opened and requested one more Bridge-only attempt. The live `pc-primary` Bridge remained healthy (`device.health` receipt `24458b35-2ebb-4530-a4b8-af7cce8d8768`) and still advertised only the desktop device; no separate iOS device or Apple camera capability appeared.

- Bridge-mediated Apple tooling discovery found no `idevice_id`, `ideviceinfo`, `idevicescreenshot`, `idevicepair`, or `ifuse` command, and no Apple Mobile Device Service record. Session-start receipt: `dc22e04f-77ac-4a61-ada4-c607d3bbc2b6`; session-read receipt: `82c94a26-47da-4a54-9cb9-502cabbef352`.
- A fresh Bridge-mediated `Get-PnpDevice` and `Win32_PnPEntity` match for Apple VID `05AC`, the known iPhone hardware identifier, `Apple`, and `iPhone` returned no records. Session-start receipt: `88360f35-6273-4a4f-bb5b-ab6a27beab91`; session-read receipt: `20670498-cb8c-47d1-b4a8-a46dc46adcc3`.

**Retry outcome:** **BLOCKED — iPhone not present on the current Bridge host transport.** No iPhone app-launch operation or camera frame could be executed or verified. Opening the Camera app on the phone is not observable by this Bridge while the phone is absent from its USB/PnP transport, and the active adapter still has no iOS screen/camera route. The next executable action is to reconnect the iPhone, unlock it, accept the Trust prompt if shown, keep Camera open, and rerun this same Bridge-only readback. The earlier Android and Windows evidence is unchanged.

## iPhone retry readback — 2026-11-07 13:21:39 America/Chicago (2026-11-07 19:21:39 UTC)

The Creator reported that the iPhone Camera had been opened and requested one more Bridge-only attempt. The fresh live readback did not change the capability boundary:

- `bridge_devices` still returned only the configured desktop passport `pc-primary`; `bridge_capabilities` still granted no physical Apple device, `device.apps.launch`, `device.screen.capture`, `device.ui.*`, or `vision.*` route. Health remained PASS with receipt `734ec569-0303-4545-93c2-64ca75a2dd44`.
- Bridge-mediated Windows PnP readback still showed Apple USB Composite, Apple USB Device, and Apple iPhone WPD entries, all `OK`, but the Windows `Camera` class still contained only `Integrated Camera` and `HD Webcam eMeet C960`.
- Bridge-mediated DirectShow enumeration still contained only `HD Webcam eMeet C960`, `Integrated Camera`, and `Galaxy Z Fold6 (Windows Virtual Camera)`; no Apple/iPhone video source appeared.
- Bridge-mediated Apple tooling discovery returned `idevice_id`, `ideviceinfo`, `idevicescreenshot`, `ideviceinstaller`, and `ios-deploy` as `NOT_FOUND`.
- The complete retry enumeration executed through session-start receipt `27d52713-82fa-4eff-82c4-0fe08c7ad5b9` and session-read receipt `93ca4c56-17eb-44e0-baa5-c62b2bc530d1`.

**Retry outcome:** **BLOCKED — no Bridge-open or iPhone-frame evidence was produced.** The physical Camera app may be open on the phone, but the active LeeWay Device Bridge still has no authorized Apple app-launch, screen-observation, or iOS camera producer route. This retry does not change the three-platform gate.

