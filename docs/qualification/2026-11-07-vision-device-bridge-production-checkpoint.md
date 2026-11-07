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

## Apple package and camera transport implementation checkpoint — 2026-11-07 13:51:13 America/Chicago (2026-11-07 19:51:13 UTC)

**Requested gate:** Update the Apple Device Bridge source and GitHub publication path so the owner can download the revised package, install it on the iPhone, pair the native camera provider to the Device Bridge, and then qualify a real camera session.

### Implemented source

- Added `apps/apple/Sources/AppleCameraCapture.swift`: owner-started AVFoundation front/back camera capture, bounded JPEG frames (8 MiB maximum), SHA-256 frame hashes, and local `vision.session.start`, `vision.frames.observe`, and `vision.session.stop` receipts.
- Added `apps/apple/Sources/AppleCameraBridgeServer.swift`: owner-started local TCP listener with Bonjour service `_leeway-camera._tcp`, per-installation pairing token, bounded newline-delimited JSON protocol, and only the four explicit `vision.*` operations.
- Added the Apple host client to `operator/physical-adapters.mjs`. `PhysicalAppleAdapter` advertises the four Vision routes only when an explicit `tcp://` endpoint and an environment-backed 32–128 character token are paired. No endpoint or credential is embedded as a default.
- Extended the owner configuration contract in `apps/desktop/mcp-server.mjs` with `cameraEndpoint` and `cameraTokenEnv`; added the `device.camera` partial capability state to `operator/adapter-registry.json`.
- Updated the Apple package manifest/schema, camera permission and local-network/Bonjour metadata, capability route documentation, and GitHub qualification/SideStore publication descriptions.

### Executed source evidence

- Apple source, transport, package, and checkpoint tests: **16 passed, 0 failed**.
- `npm run test:mcp`: **153 passed, 0 failed**.
- `npm run test:cli`: **7 passed, 0 failed**.
- `node --test tests/physical-apple-usb.test.mjs`: **3 passed, 0 failed**.
- Modified JSON manifests parsed successfully; `git diff --check` passed.
- The transport test performed a real localhost TCP request/response and verified the exact token-authenticated envelope. This is source/host transport evidence, not iPhone evidence.

### Capability and evidence state

| Boundary | Configured | Running | Executed | Verified | Production-ready |
|---|---:|---:|---:|---:|---:|
| Apple native camera source | yes | no physical iPhone readback | source tests | source-qualified | platform gate pending |
| Apple authenticated host transport | yes | localhost test only | localhost test | source-qualified | physical pairing pending |
| GitHub Apple IPA workflow | yes | not run on this Windows host | not yet | not yet | pending macOS workflow |
| Installed/trusted iPhone package | no readback | no readback | no | no | no |
| Live iPhone `vision.frames.observe` through active Bridge | route implemented | no | no | no | no |

### Accepted and rejected decisions

- Accepted: the download channel remains the existing `apple-latest` release, containing `LeeWayDeviceBridge-unsigned.ipa`, `LEEWAY-APPLE-PACKAGE-MANIFEST.json`, and `sidestore-source.json` after the successful macOS qualification workflow and publication workflow.
- Accepted: installation remains owner-controlled through the existing Apple signing path, including the owner’s SideStore/iLoader route; a GitHub download is not treated as an installed or trusted iPhone app.
- Rejected: USB/WPD presence, a local Swift source test, a passing GitHub source test, or a generated IPA will be treated as proof of a running iPhone camera, host pairing, advancing frame, physical stop, Formula approval, Veritas approval, or autonomous any-LLM production readiness.

### Next executable action

Push this change to Device Bridge `main`; wait for the GitHub macOS Apple qualification and SideStore publication workflows; download the published IPA and manifest; install/sign through the owner-controlled Apple route; open the app, grant Camera and Local Network permission, start **Host Camera Bridge**, enroll the displayed endpoint and token in the owner-controlled Bridge configuration, and execute `vision.sources.list` → `vision.session.start` → advancing `vision.frames.observe` → `vision.session.stop` with independent receipt verification. Until that physical readback exists, the Apple and three-platform production gates remain **NOT FULLY QUALIFIED**.

## Apple GitHub build and publication readback — 2026-11-07 13:57:17 America/Chicago (2026-11-07 19:57:17 UTC)

The source was pushed to Device Bridge `main` at `71ba32caab8368ee9f9b5e1e47319d40486cfc16`; local `HEAD` and `origin/main` match, and the worktree is clean.

- Initial qualification run `42408297213` failed during XcodeGen because the new generated Info.plist declaration lacked its required `info.path`. The failure was read from the GitHub job log, repaired in `apps/apple/project.yml`, and not treated as a successful build.
- The corrected Apple Device Bridge Qualification run `42408536653` passed: source/package tests, XcodeGen, macOS Swift compilation, unsigned iPhone build, IPA packaging, and artifact upload.
- The dependent Publish Apple SideStore Update Channel run `42408631944` passed.
- The `apple-latest` release assets are present and uploaded: `LeeWayDeviceBridge-unsigned.ipa`, `LEEWAY-APPLE-PACKAGE-MANIFEST.json`, and `sidestore-source.json`.
- The published manifest records version `0.1.48`, build `48`, `signingState: UNSIGNED_OWNER_CONTROLLED_SIGNING_REQUIRED`, `nativeCameraService: INCLUDED`, `nativeCameraTransport: INCLUDED`, and source revision `71ba32caab8368ee9f9b5e1e47319d40486cfc16`.
- Downloaded IPA SHA-256: `e7d2075ed6d8bbe71242e54f2ae011f03222fe37ecdbdcfcce0b5344f018339d`; it matches the published manifest and GitHub release asset digest.

This closes the source, macOS build, package, and GitHub publication gates. It does not close owner signing/install, iPhone permission, local-network pairing, live advancing-frame, physical-stop, independent receipt verification, Formula/Veritas, or any-LLM production gates. The next exact action is owner installation from the published release, followed by the paired Bridge `vision.*` session readback described above.

## GitHub-managed package update channel checkpoint — 2026-11-07 14:25:44 America/Chicago (2026-11-07 20:25:44 UTC)

**Identity and authority:** Creator-directed LeeWay Device Bridge engineering work in 4citeB4U/LEEWAY-DEVICE-BRIDGE; canonical source authority is the repository main branch and its GitHub Actions qualification/publication workflows.

**Requested gate:** Native packages must discover GitHub updates from the phone, present an owner confirmation, and use the platform-native installation route without requiring iLoader or a computer for Android, and without claiming that ordinary iOS code can self-replace a signed application.

### Implemented

- Added the public contracts/package-manifest.schema.json and upgraded docs/package-manifest.json to schema 0.3.0.
- Added docs/PACKAGE-UPDATE-PROTOCOL.md documenting update states, platform boundaries, verification, and owner confirmation.
- Android now checks the GitHub Pages manifest on foreground and owner-authorized relay reconnect, compares versionCode, verifies HTTPS and SHA-256, notifies the owner, and opens Android's native installer only after the owner taps Update.
- Apple now checks the same manifest on app foreground and offers the existing SideStore source or GitHub release. The app explicitly reports that iOS cannot replace its own signed executable.
- The PWA service worker cache was advanced to v19-update-channel and explicitly calls registration.update() after registration.
- Android and Apple publication workflows now update the unified manifest from the actual qualified artifact, with a shared publication concurrency group.
- Windows, macOS, and Linux remain explicitly SOURCE_ONLY; no native package or native self-updater is claimed for them. The Read Aloud Android companion remains a separate package channel.

### Executed and independent evidence

- Full repository source tests: passed.
- npm run test:mcp: 153 passed, 0 failed.
- npm run test:cli: 7 passed, 0 failed after updating the stale pre-publication Apple assertion.
- Targeted package/update/page/source tests: passed.
- Local native Android build: not executed because this Windows host has neither Gradle nor a Gradle wrapper. This is a local capability boundary; it is not a build claim.
- GitHub Android Build 42410270094: success; Android package compiled, tests ran, and package publication completed.
- GitHub Apple Device Bridge Qualification 42410270027: success; Apple source/package tests, XcodeGen, macOS Swift compilation, unsigned iPhone build, IPA packaging, and upload completed.
- GitHub Publish Apple SideStore Update Channel 42410397138: success; release assets and unified manifest publication completed.
- GitHub Android Build 42410553049: success after repairing formula evidence generation.
- GitHub Pages deployment 42410687684: success.
- Fresh HTTPS readback of https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/package-manifest.json returned HTTP 200, schema 0.3.0, updatedAtUtc 2026-11-07T20:21:33Z, Android size/formula size 66445365, identical Android artifact/formula SHA-256 63d8f8b4ae9338f78b89ed677a3724f1ddb351b33d7eb3abe75a555c18c2ae73, and Apple version/build 0.1.49/49.
- Source commit 4206184, evidence-repair commit 40fa733, and generated publication commits are present on origin/main; the latest observed remote head is 0089dda.

### Capability and evidence state

| Boundary | Configured | Running | Executed | Verified | Production-ready |
|---|---:|---:|---:|---:|---:|
| GitHub Pages update manifest | yes | live | HTTPS readback | yes | distribution metadata ready |
| Android update checker and installer handoff | yes | only in qualified build artifact | GitHub compile/source tests | GitHub build qualified | physical install pending |
| Apple foreground checker and SideStore handoff | yes | only in qualified IPA | GitHub macOS build/source tests | GitHub package/publication qualified | owner signing/install pending |
| Web/PWA update route | yes | Pages deployment passed | source tests/live manifest | Pages deployment qualified | browser lifecycle remains device-dependent |
| Windows/macOS/Linux native self-update | no | no native package | source-only route documented | not applicable | BLOCKED — native packages are not published |
| Installed Android/Apple package and live phone runtime | owner-dependent | no new phone readback in this checkpoint | no physical update action | not verified | BLOCKED — owner install/reconnect/receipt evidence pending |

### Accepted and rejected decisions

- Accepted: GitHub is the package-discovery and artifact-publication source for all available routes; owners can update Android directly from the phone through Android's installer after a prompt.
- Accepted: Apple updates remain GitHub-published and phone-directed through SideStore; iLoader is not required by the source contract when SideStore is healthy, but iOS signing/installation remains owner-controlled.
- Accepted: automatic checking and owner prompts do not equal automatic installation.
- Rejected: GitHub Actions success, a manifest digest, a live Pages response, or an IPA/APK download will be treated as proof that a phone installed, trusted, paired, or reconnected the new package.

### Exact next executable action

On Android, install the newly published APK from the Device Bridge update prompt and verify Android reports the replacement without uninstalling the existing package. On iPhone, open the app after the owner-controlled SideStore route is healthy, accept the GitHub update prompt, then grant permissions and execute the paired vision.sources.list → vision.session.start → advancing vision.frames.observe → vision.session.stop readback. Preserve the installer and runtime receipts. Until those physical steps are completed, the phone runtime and three-platform camera/production gates remain NOT FULLY QUALIFIED.

## Apple GitHub/iLoader route correction checkpoint — 2026-11-07 14:54:25 America/Chicago (2026-11-07 20:54:25 UTC)

**Identity and authority:** Creator-directed LeeWay Device Bridge engineering work in `4citeB4U/LEEWAY-DEVICE-BRIDGE`; source authority is the local canonical worktree and the repository `main` branch. Local correction commit after rebasing onto remote `main`: `71371552ff5226c3ee8a73194c126af4e87440ce`.

**Requested gate:** Apple package updates must originate from GitHub and use the already-qualified iLoader installation path. SideStore must not be an active dependency, installer handoff, or update manifest route.

### Diagnosis

- The previous native Swift updater had already been partly corrected, but the active manifest, publication workflow, protocol text, and tests still named SideStore as the Apple route.
- The repository's direct-delivery evidence identifies iLoader over USB as the currently verified Apple signing/install path and identifies Metal as the native local runtime after the app is installed.
- GitHub can publish and supply the unsigned IPA and its digest. An ordinary iOS app cannot replace its own signed executable; iLoader remains the owner-controlled signing/install authority.

### Implemented

- Renamed the publication workflow to `.github/workflows/apple-github-iloader-channel.yml` and removed SideStore source generation/upload.
- Changed iOS/iPadOS manifest routes to `CHECK_PROMPT_AND_ILOADER_GITHUB_IMPORT` and the Apple package action to `OPEN_GITHUB_IPA_AND_REQUEST_ILOADER_OWNER_CONFIRMATION`.
- Native Apple updater now reads the HTTPS GitHub IPA URL, exposes **Open GitHub Release / Download IPA**, **Copy GitHub IPA URL**, and **Open iLoader Delivery Instructions**, and no longer constructs a `sidestore://` URL.
- Updated active Apple delivery/update protocol and PWA copy to identify GitHub as package source and iLoader as the signing/install route. SideStore documents were reduced to archived historical notices.
- Renamed the focused publication test to `tests/apple-github-iloader-update-channel.test.mjs` and updated source contracts.

### Executed evidence

- Focused Apple/update/page/source tests: **5 passed, 0 failed**.
- Full repository source tests: **133 passed, 0 failed**.
- `npm run test:mcp`: **153 passed, 0 failed**.
- `npm run test:cli`: **7 passed, 0 failed**.
- JSON manifest parse check: **PASS**.
- `git diff --cached --check`: **PASS**.
- No native iOS/macOS compile was executed on this Windows host; GitHub macOS qualification remains the required build gate after push.

### Capability and evidence state

| Boundary | Configured | Running | Executed | Verified | Production-ready |
|---|---:|---:|---:|---:|---:|
| GitHub Apple package source | yes | existing release metadata | prior GitHub publication | source contract corrected locally | pending new GitHub workflow run |
| iLoader Apple signing/install route | documented and selected | not active in this session | prior route evidence | route documented; no new install readback | owner install pending |
| Native Apple Metal runtime | in package source | no new iPhone readback | prior source/receipt evidence | not a new-build verification | physical readback pending |
| SideStore update channel | archived | not used by active source | no new action | explicitly excluded from active route | not applicable |

### Accepted and rejected decisions

- Accepted: GitHub remains the package publication and discovery authority; the Apple app points the owner to the GitHub IPA and iLoader guide.
- Accepted: existing iLoader certificate, pairing, and saved session are preserved; the update path does not reset or replace them.
- Rejected: SideStore source URLs, SideStore release assets, or SideStore phone-side sign-in are required for LeeWay Apple updates.
- Rejected: passing source tests or a GitHub release will be treated as proof of a new physical iPhone install, launch, Metal readback, camera session, or autonomous any-LLM production qualification.

### Exact next executable action

Push commits `71371552ff5226c3ee8a73194c126af4e87440ce` and `40e1f6427a44cf2d7362d9e9a54425198a5644ae` to `origin/main`, then wait for the GitHub macOS Apple qualification/publication and Pages deployment workflows. Read back the published manifest and release, install the downloaded IPA through the existing iLoader USB session, launch LeeWay Device Bridge, and capture a fresh Metal/camera receipt before making any new physical-runtime claim.
