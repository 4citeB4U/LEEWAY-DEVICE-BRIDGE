# Agent Lee Vision — Master Ecosystem Integration and Two-Contributor Handoff

**Date:** 2026-10-10  
**Document class:** scoped technical investigation / contributor handoff, NOT a new authority, device protocol, application, database, or verified runtime receipt  
**Owning product:** Agent Lee, via LeeWay Runtime Fabric / Golden Package C3  
**Existing web implementation:** `4citeB4U/LEEWAY-DEVICE-BRIDGE/docs/vision/index.html`, published at https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/vision/  
**Parent mission:** https://github.com/4citeB4U/Leeway-Runtime-Fabric/issues/21  
**Contributor hub:** https://github.com/4citeB4U/LeeWay-Agent-Skills/issues/22  
**Local/source implementation lane owner:** ChatGPT GPT-6 (GitHub source and test evidence only). **Native phone/RTC lane:** offered to another contributor, NOT claimed until that contributor posts an intent in the parent issue.  
**Hard product rules:** one Agent Lee; one governing Formula evaluator; one Device Bridge authority; one RTC transport selection; no LLM required for vision, tracking, nonverbal cognition or the camera path; no Docker required for end-user operation; user-authorized, consent-gated sensing; path and device agnosticism; no fake source names, cloned cameras, semantic detections, receipts or acceptance counts.

## 1. Executive finding

Vision is **not just a camera HTML**. Agent Lee must receive an authorized, named optical source with actual advancing frames; independently identify the capture device and sensor; run its deterministic/non-LLM perception according to actual local capabilities; pass measured observations through the already authoritative Formula and Veritas; optionally correlate them with the existing PerceptionBus/Agent Lee voice pathway; and retain only qualified knowledge through canonical memory/Continuum bindings when those bindings have been located and verified.

Recreating another vision kernel, RTC stack, bridge, formula, ledger, or memory database would create the fragmentation this project explicitly prohibits. The shortest viable route is **reuse + missing glue + physical qualification**.

GitHub Pages is a secure HTTPS *distribution and interaction origin*, not the camera's native OS owner, a TURN/SFU media relay, a persistent Continuum server, or the installed Agent Lee Golden Package.

## 2. Previous work — complete scoped chronology and the attempted repairs

1. **Visual design:** From initial rectangular HUD and four-sided/tessellated crystal concepts to the user-approved black/cyan **Organic Vision** shell and optional **Ocular Crystal Eye**. The center receives live video. When video is off, one transparent LeeWay emblem remains perfectly stationary and only breathes/changes color, never rotates or flashes through multiple simultaneous coins.
2. **Optical Command Pad:** Rebuilt to match the supplied references: independently movable and collapsible *left* Vision/AI controls and *right* cameras/source/stream controls, empty unobstructed center, bottom transport controls, internal Settings, phone/tablet responsive behavior. Existing source now has independent mouse and touch dragging.
3. **Gemini/AI Studio source reuse:** Inspected the supplied `octahedral-crystal-vision-hud` and dual-camera sample. Reused genuine `getUserMedia`, `enumerateDevices`, device ID, stream-to-video and track release techniques. **Rejected** hard-coded Galaxy camera labels, fabricated USB-phone detections and `track.clone()` used to masquerade one camera as four physical sensors.
4. **Local browser discovery repair:** Fixed dynamic browser camera inventory and misleading fourth `CAMERA NOT DETECTED` placeholder. Camera names come only from browser/OS `MediaDeviceInfo` or a confirmed authenticated remote track. Explicit SCAN can request permission where labels are hidden. Stop and exception outcomes must not claim a live feed.
5. **Native Windows evidence:** Independent earlier native camera tests: built-in and Windows Fold virtual webcam acquired frames; eMeet C960 DirectShow graph initially failed. A later direct *Chrome* test succeeded separately with **Integrated Camera (174f:11b5)**, **HD Webcam eMeet C960 (328f:006d)**, and **Galaxy Z Fold6 (Windows Virtual Camera)**, each reported by Chrome with 1280×720 video. They were not proven simultaneously. The Windows virtual webcam is **one source**; it does NOT prove phone-native front and rear lenses.
6. **Source/Chrome isolation limitation:** Chrome tests used a separate browser profile with `--use-fake-ui-for-media-stream` to bypass prompt clicks but NOT `--use-fake-device-for-media-stream`; actual enumerated OS sources and decoded frames were observed. **This is not qualification of the owner's regular browser profile, displayed GUI, or consent acceptance.** A later Chrome localhost test showed 27 additional advancing video frames over ~1.5 seconds from the integrated camera; no captured pictures were saved.
7. **Initial Wi-Fi video experiment:** Manual direct-peer WebRTC SDP offer/answer and two synthetic phone tracks were exercised. Test environment produced no usable ICE candidates and **no decoded remote frames**; handshake != connection != video. The client was made to fail closed. It was not automatic LeeWay Device Control and not production RTC.
8. **GitHub promotion:** Existing Device Bridge repository received Vision app via PR [#32](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/pull/32). Optical UI, prior source reuse, focused test and Actions workflow were promoted. Public HTTPS route was independently observed HTTP 200 after Pages deployment, with expected controls and pixel-analysis source. Do not infer physical phone integration from this.
9. **Non-LLM frame analysis:** Reused the source ideas in [LeewayVisionRuntime.ts](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/src/core/LeewayVisionRuntime.ts) for **actual brightness and interframe pixel differences**. In a Chrome test the UI had real 1280×720 frames, four observed analysis samples, ~55% sample brightness and ~3% sample motion. It truthfully reported `FACE MODEL OFF` when the independent face-tracking backend was unavailable. These values are *pixel statistics*, not semantic object detections.
10. **Historical Docker recovery:** [Sep 25 Docker inventory](https://github.com/4citeB4U/LEEWAY-D-DRIVE-RECOVERY-20260925/blob/main/evidence/2026-09-25/docker-containers.jsonl) records `agent-lee-vision-kernel` running `uvicorn vision-server:app` through port `8093`. Its complete old executable implementation was **not located in the examined GitHub default-branch sources**; recovering service provenance is separate from making Docker a production requirement.
11. **Live read-only Windows endpoint check, Oct 10:** Local Formula `127.0.0.1:4001/runtime/formula/v1/health` responded HTTP 200; existing Voice Studio `127.0.0.1:8877/studio.html` responded HTTP 200. Probes of historical Vision `8093`, RTC `3000` and media router `5301` did not establish listeners on that Windows host. This is **host- and instant-scoped**, not evidence of a global outage or absence of running services elsewhere.
12. **Current creator-reported blocker:** Even after prior browser test success, the owner's everyday interactive session reported one apparent camera active but no visible vision/“no camera available.” **That end-user failure remains open.** A video track may be live without advancing or visible frames; a camera stream may work while the face-analysis backend is off; neither state justifies a generic camera error.

## 3. Full relevant GitHub reuse inventory

These references were inspected in the GitHub estate. Each status is **source maturity**, never automatic deployed maturity.

| Authority / product | Inspected source | Reuse decision / exact boundary |
| --- | --- | --- |
| **LeeWay Standards / Agent Skills** | [Agent Skills AGENTS](https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/AGENTS.md), [Contributor Handoff](https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/docs/CONTRIBUTOR-HANDOFF-PROTOCOL.md), [Device Bridge skill](https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/skills/leeway-device-bridge/SKILL.md), [Veritas skill](https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/skills/leeway-veritas/SKILL.md) | **ALREADY BUILT governance.** Follow one owner, scoped claims, real pre/post, receipts and portable capabilities. Skill registration is not execution. |
| **LeeWay Live** | [README](https://github.com/4citeB4U/Leeway-live/blob/main/README.md), [UI `docs/index.html`](https://github.com/4citeB4U/Leeway-live/blob/main/docs/index.html), [`docs/app.js`](https://github.com/4citeB4U/Leeway-live/blob/main/docs/app.js), [`docs/media.js`](https://github.com/4citeB4U/Leeway-live/blob/main/docs/media.js) | **ALREADY BUILT browser interaction.** Has sphere, camera/SEE controls, owner-initiated browser capture, relay, and phone-first installer. New optical surface should reuse these ingress actions rather than become another Agent Lee. Existing SEE path may route to model-based inference; hard non-LLM vision path must function with that unavailable. |
| **Existing Device Bridge** | [Device Bridge README](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/blob/main/README.md), [remote relay contract](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/blob/main/docs/remote-relay.json), [phone runtime contract](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/blob/main/docs/PHONE-RUNTIME-CONTRACT.md) | **PARTIALLY BUILT camera transport.** Existing identity, pairing, agent STOP, native authority, device discovery/operations. In earlier adapter checkout `providers/camera/index.mjs` declared observe/capture/stream but marked physical qualification pending. The examined qualified relay list did not include independent phone `camera.stream`. Do not invent that capability on main. |
| **Device Bridge native sensory branch** | [Draft PR #10](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/pull/10), [`SensoryRuntime.kt`](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/blob/feature/leeway-live-sensory-harness-v1/apps/android/app/src/main/java/industries/leeway/devicebridge/SensoryRuntime.kt) | **PARTIALLY BUILT / UNMERGED.** Native Android code includes on-device ML Kit image labeling on a Bitmap, not an LLM. It does not establish continuous registered front+rear publishing to PC; source/camera acquisition, permission, concurrent sensor/ICE need physical tests. PR's scope is currently Stage 1 voice. Do not edit its files without owner coordination. |
| **Vision OS** | [Vision OS README](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/vision-os/README.md), [camera input router](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/vision-os/inputs/camera-input-router.mjs), [access policy](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/vision-os/authority/vision-access.policy.json), [video-track router](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/vision-os/webrtc/video-track-router.mjs), [signed receipt writer](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/vision-os/receipts/vision-receipt-writer.mjs) | **PARTIALLY BUILT / architecture-defined.** Reuse consent/source validation, frame/track contracts, signature form. Router currently returns a Qwen-VL route (vision language model): optional specialist, never required for non-LLM base. Receipt writer alone is not independent C3 Veritas. |
| **Original Vision pixel math** | [`LeewayVisionRuntime.ts`](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/src/core/LeewayVisionRuntime.ts), [`VisionPanel.tsx`](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/src/components/VisionPanel.tsx) | **ALREADY BUILT pixel math; PARTIAL perception.** Reuse real brightness, motion, temporal frames. Do **not** promote brightness-derived object counts, depth-confidence, thermal colors, or random boxes as true object detection, measured depth or temperature. Original panel reports six “feeds” where they are derived display windows, not six physical cameras. |
| **LeeWay Edge RTC** | [`src/rtc/store.ts`](https://github.com/4citeB4U/LeeWay-Edge-RTC/blob/main/src/rtc/store.ts), [RTC README](https://github.com/4citeB4U/LeeWay-Edge-RTC/blob/main/README.md), [`VisionPerceptionLab.tsx`](https://github.com/4citeB4U/LeeWay-Edge-RTC/blob/main/src/components/VisionPerceptionLab.tsx) | **PARTIALLY BUILT.** Reuse authenticated producer/consumer/DTLS-SRTP/ICE/track lifecycle and stats only under one governed RTC adapter. Existing VisionPerceptionLab has mock agent perspectives and auto-activation on mount: do not use those as device evidence. No healthy deployed SFU proved by docs. |
| **Edge RTC local monitoring** | [`vision-monitor.ts`](https://github.com/4citeB4U/LeeWay-Edge-RTC/blob/main/src/vision/vision-monitor.ts), [`vision-scanner.ts`](https://github.com/4citeB4U/LeeWay-Edge-RTC/blob/main/src/vision/vision-scanner.ts) | **PARTIALLY BUILT.** Brightness/motion/blur can be pixel-derived. Skin-pixel face guess and edge/text-region heuristics are NOT qualified face detection, OCR, semantic objects or presence proof. Calibrate independently; use verified specialized non-LLM detector when authorized. |
| **Legacy Agent Lee camera window** | [`AgentLeeCameraPopup.tsx`](https://github.com/4citeB4U/Mr-Android-Agent-Lee_OS/blob/main/components/AgentLeeCameraPopup.tsx), [`VisionPublisher.ts`](https://github.com/4citeB4U/Mr-Android-Agent-Lee_OS/blob/main/core/VisionPublisher.ts), [`PerceptionBus.ts`](https://github.com/4citeB4U/Mr-Android-Agent-Lee_OS/blob/main/core/PerceptionBus.ts) | **PARTIALLY BUILT lineage.** Camera popup already has dragging and uses RTC local MediaStream. PerceptionBus defines parallel voice+vision event envelopes. Reconcile canonical running owner before reusing API; do not add a competing event bus or an additional camera owner. |
| **Formula Live** | [Formula authority](https://github.com/4citeB4U/Leeway-formula-live/blob/main/authority/formula-authority.json), [HTTP consumer](https://github.com/4citeB4U/Leeway-formula-live/blob/main/scripts/formula-client.mjs), [Evidence status](https://github.com/4citeB4U/Leeway-formula-live/blob/main/docs/EVIDENCE-STATUS.md) | **ALREADY BUILT CENTRAL AUTHORITY.** `LEEWAY-FORMULA-v1.0` and 16×6 runtime-state adapter, via configured `LEEWAY_FORMULA_BASE_URL`. Do not fork equations into browser/Android. A health HTTP 200 is not an evaluation proof or a pre/post receipt. |
| **Memory OS / Vision stores** | [Vision visual memory](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/vision-os/memory/visual-memory-store.mjs), [scene state](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/vision-os/memory/scene-state-store.mjs), [frame store](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/vision-os/memory/frame-memory-store.mjs), [Edge RTC storage](https://github.com/4citeB4U/LeeWay-Edge-RTC/blob/main/src/vision/vision-storage.ts), [memory-os checkpointer](https://github.com/4citeB4U/Leeway-Runtime-Fabric/blob/main/memory-os/checkpointer.mjs) | **PARTIALLY BUILT storage.** Vision OS examples use arrays/maps in process; Edge RTC uses localStorage capped at 50 packets; checkpointer writes files. None of these establish the canonical Continuum durable, governed cross-device readback interface. |
| **Continuum / LDWMD and VRAM Database** | Source search across accessible GitHub repositories, runtime source tree, and known estate keywords as of this audit | **MISSING VERIFIED BINDING, NOT CLAIMED MISSING PRODUCT.** User-established Continuum/LDWMD concepts are real requirements. Exact current API, storage owner, deployed endpoint, schema, authority, auth and receipts were NOT located in the accessible default-branch source searched. Other contributor must produce canonical file/ref/commit before adapter wiring. Never substitute a new SQLite/Vector DB as the ecosystem's authority. |
| **Digital Brain** | [RapidWebDev Digital Brain ecosystem projection](https://github.com/4citeB4U/RapidWebDev/blob/main/brain/public/ecosystem-fabric.js), [public brain](https://github.com/4citeB4U/RapidWebDev/blob/main/brain/public/public-brain.js) | **PARTIALLY BUILT UI/projection.** Public Digital Brain uses GitHub contract retrieval and health projections; verified projection is not proof of persistent cognitive memory. Vision should add a qualified observation summary only through discovered canonical Brain identity/context interfaces, never by replacing the avatar or creating another Brain state engine. |
| **Compression / storage economics** | [Formula Storage/Media](https://github.com/4citeB4U/Leeway-formula-live/blob/main/docs/domains/STORAGE-MEDIA.md), [Formula evidence](https://github.com/4citeB4U/Leeway-formula-live/blob/main/docs/EVIDENCE-STATUS.md) | **EXPERIMENTALLY DEMONSTRATED, DOMAIN-SCOPED.** Codec-specific JPEG XL, Opus, HEVC/AV1 and exact-restoration evidence exists. No universal lossless vision-frame compression law. Apply Formula-governed bandwidth, sampling, dedupe and retention only after tested exactness/task quality, with originals preserved until authorized policy permits change. |
| **Non-LLM cognition** | [Machine consciousness mathematical work](https://github.com/4citeB4U/Leeway-formula-live/tree/main/experiments/machine-consciousness-v0), [awareness adapter](https://github.com/4citeB4U/Leeway-formula-live/blob/main/contracts/domain-adapters/machine-consciousness-awareness-v0.json) | **PARTIALLY BUILT experiments.** Cognitive observation/memory/prediction self-model may later consume qualified Vision observations. No subjective-experience claim; LLM language output is an optional interface only. Do not collapse C0–C6 experiment receipts into current Vision production acceptance. |
| **Golden Package C3 / Ledger** | [C3 mission #21](https://github.com/4citeB4U/Leeway-Runtime-Fabric/issues/21), [140-duty register](https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/docs/AGENT-LEE-140-DUTY-QUALIFICATION.md) | **GOVERNED END-TO-END NOT YET VERIFIED.** C3 independently tracks ingress→Formula/Veritas pre-gate→native execution/readback→Veritas post-gate→Receipt Authority→eligible Ledger admission. A Vision page, successful CI or auto-granted Chrome stream cannot increment 140/140. |

## 4. Desired single governed pipeline (not new infrastructure)

```text
CREATOR: owner requests SEE / camera action
  ↓
Existing Agent Lee Golden UI or LeeWay Live control
  ↓ consent + chosen action + source specification
Existing Runtime Fabric / Skill Orchestrator / Device Bridge discovery
  ↓ source passport + capability listing + allowed camera operation
Canonical Device Bridge (phone native owner OR host local browser media adapter)
  ↓ real sensor identity; platform consent; owner STOP
One qualified video path:
  - directly attached PC/browser camera getUserMedia
  - phone Camera2/CameraX → existing LeeWay RTC / Device Bridge Wi-Fi transport
  - known OS Fold virtual camera as ONE virtual video source
  ↓ track + DTLS/ICE/media status + actual timestamps/decoded-frame advancement
Existing Vision OS source/frame validator
  ↓ normalized timestamped observation, provenance and LLM-free sample analysis
Canonical Formula v1.0 evaluator (call, not clone)
  ↓ measured 16×6 governed domain input, real decision, failures retained
Actual authorized, budgeted perception capability:
  pixel telemetry; optionally ML Kit/YuNet/SFace/OpenCV/OCR as specialized non-LLM modules
  ↓ deterministic/qualified output with calibration and confidence
Existing PerceptionBus / Agent Lee human-visible UI + approved voice interface
  ↓ independently observed outcome; C3 Veritas PRE/POST + Receipt Authority
Canonical Memory Warden / Continuum / Digital Brain (only once real API established)
  ↓ durable privacy-bounded readback; Learning Ledger admission only if eligible
Agent Lee future governed behavior
```

The camera is **not** directly entitled to act, listen, command phones, or persist biometrics because it can view pixels. Remote activation must have a separately qualified owner authorization. RTC handles transport, not authority. GitHub handles source/deployment, not native capture.

## 5. State machine and required evidence

Separate source states: `NOT_REGISTERED → DISCOVERED → AUTHORIZED → OPENING → TRACK_ACTIVE → FRAMES_ADVANCING → PERCEPTION_AVAILABLE → OBSERVATION_VERIFIED → RECEIPT_ISSUED`. A session can be `DENIED`, `DEVICE_BUSY`, `TRACK_ENDED`, `DECODER_STALLED`, `NETWORK_FAILED` or `CAPABILITY_UNAVAILABLE` without implying the other states.

**Minimum case evidence**, using existing contract authorities rather than creating a new canonical schema: caseId, traceId, parentObjectiveId, devicePassportId or observed browser source ID, camera label as reported, sensor role only when independently established, consent time/scope, capture transport, source/renderer code SHA, track/settings ID, actual video dimensions, frame counter at two timestamps, measured delta, timeout/failure codes, perception module/version and non-LLM proof, decision/evaluator result ID, pre/post Veritas status, receipt location/hash, rollback/release evidence, retention/redaction policy and accepted output. No credentials, raw frame data or face embeddings in public GitHub issues/receipts.

**UI status law:** 
- `CAMERA LIVE` requires visible advancing decoded video with source label, not only a green indicator or `MediaStreamTrack.readyState==='live'`.
- `FACE TRACKING OFF` must not say `NO CAMERA`.
- `REMOTE DEVICE PAIRED` must not say `FOLD FRONT / REAR LIVE` absent distinct real video tracks.
- `MOTION 3%` is pixel difference, not named-object movement.
- `OBJECT DETECTED` requires an independently qualified detector and actual detections, not brightness-derived counts.

## 6. Primary handoff: explicit two-contributor division

### Lane A — Hosted Vision client, real camera truth and Golden UI ingress
**Owner:** ChatGPT GPT-6, this work lane. **Protected work boundary:** existing `LEEWAY-DEVICE-BRIDGE/docs/vision/` and isolated source/client test paths; coordinate with Live/Golden UI owners before edits.

**Existing work:** UI finalized; hosted HTTPS application published; dynamic camera labels; real Windows Chrome frame-readback under isolated auto-consent; actual non-LLM pixel metrics; source/CI; no fake four-camera result.

**Remaining full acceptance outcome:** Owner's ordinary interactive Chrome must render advancing frames with direct device ID and visibly show them; camera state/analysis state must remain separate; owner Stop fully releases. Then reuse the existing LeeWay Live SEE/Golden UI ingress, without changing native phone provider, C3 voice, avatar, current settings, Formula engine or Ledger. Build negative tests for permission deny, page-hidden stop, disconnected sensor, stale track, no model, browser restart, screen resize and multiple display placements. Prove no unprompted camera start.

**Definition of done:** PC native available cameras report actual names; video advances onscreen; no false camera errors; OBSERVED and VERIFIED separated; browser test and human GUI readback; source/CI hash and C3 case receipt; no claimed Fold dual transport from virtual webcam.

### Lane B — Android phone-native sensor authority and cross-device Wi-Fi transport
**Owner:** incoming helper / another authorized contributor, **unassigned until claimed** in Runtime C3 #21, with repo/paths/branch and dependency owner. **Protected work boundary:** existing Device Bridge Android provider/phone package, pairing and existing LeeWay Edge RTC interfaces; coordinate with active Device Bridge PR #10 (sensory), #21 (Fold), #29/#30 (provider/hardening) and any live RTC owner.

**Deliverable:** Distinct sensor identity from actual Galaxy Z Fold6 native camera APIs; enumerate confirmed front and back plus any extra lens only if physically exposed; owner-controlled capture permission; source registration under one Device Bridge authority; negotiate real phone video over Wi-Fi using the existing RTC transport/provider (no mandatory USB, Docker, subscription API, or LLM); deliver 2 separate video tracks with integrity; PC decodes both independently; STOP and reconnection verified; explicit camera unavailable/failure states; authorized replay protection and readback.

**Acceptance tests:** physical phone-open front proof; physical phone-open rear proof; phone local simultaneous front/rear only if hardware allows (otherwise truthful sequential fallback, never a clone); separate PC receiver proof for each; same network Wi-Fi with PC on Ethernet supported; ICE/DTLS/SDP validated end-to-end; denial, background, orientation/fold-state, network loss, duplicate track, stale pairing, unauthorized request, stop/restart; release when closed. Source identities and receipts must identify actual phone, not presumed model from UI text.

### Joint gate — Governed consumption, memory and Golden Package
After A+B provide physical proofs, relevant C3/Formula/Veritas/Continuum owners bind:
- Vision-OS consent/track/receipt adapter, true non-LLM offline perception, source provenance.
- Existing central Formula evaluator with measured 16×6 domain mapping and pre/post gates; **do not modify v1 canonical mathematics**.
- Existing PerceptionBus/Agent Lee SEE request/response and voice only via canonical routes.
- Existing Memory Warden and **discovered** Continuum durable adapter and Digital Brain context, with consent/purging/readback.
- Existing compression policy, exactly or quality-gated depending output.
- Independent Veritas receipt, eligible Learning Ledger admission, phone/PC regression and C3 parent acceptance.

**No lane can claim global PASS merely because another lane's source compiled, GitHub CI is green, or an SDK advertises media capabilities.**

## 7. Acceptance checklist: 0 production end-to-end Vision chains admitted by this document

Do not confuse this **Vision-specific 18-gate checklist** with the separate 140-duty register. Existing scoped source/CI and isolated Windows Chrome proofs remain preserved, but no gate is marked production PASS until the indicated specific evidence is attached.

| Gate | Owner | Required observable proof | Current state |
| --- | --- | --- | --- |
| V01 | A | GitHub HTTPS Vision page/source matches published SHA | OBSERVED HTTP 200 / source deployed |
| V02 | A | Exact approved UI, movable/collapsible left/right panels, stationary coin; preserved local source controls | SOURCE/REGRESSION PASS (not owner visual acceptance) |
| V03 | A | PC Integrated Camera real name, consent, advancing video in owner-visible Chrome | ISOLATED CHROME PASS; OWNER GUI UNVERIFIED |
| V04 | A | PC eMeet C960 real name, same criteria | ISOLATED CHROME PASS; OWNER GUI UNVERIFIED |
| V05 | A | Windows Fold6 virtual camera real name; distinguish it from two native Fold sensors | ISOLATED CHROME PASS as ONE source |
| V06 | B | Fold6 front physically acquired from phone native source | NOT VERIFIED |
| V07 | B | Fold6 rear physically acquired from phone native source | NOT VERIFIED |
| V08 | B | Dual/sequential sensor behavior detected honestly, no duplication | NOT VERIFIED |
| V09 | B | Device Bridge pairing/passport/owner camera authorization; unattended remote request denied | NOT VERIFIED |
| V10 | B + A | Two authenticated distinct phone RTC feeds decoded on PC; measured ICE/DTLS and frame advancement | NOT VERIFIED |
| V11 | B + A | Network loss, stop, reconnect, denial, background and stale-track safety | NOT VERIFIED |
| V12 | A + specialist | LLM-off nonverbal real-motion/brightness regression, physically grounded face/object/OCR when detector available | PIXEL SCOPE PASS; DETECTOR QUALIFICATION NOT VERIFIED |
| V13 | Formula owner + A | Canonical `formula_evaluate` receipt on Vision measured input, valid 16×6 mapping | NOT EXECUTED for Vision |
| V14 | Agent Lee owner + A | Owner says SEE; same camera result reaches Agent Lee/PerceptionBus without another agent | NOT VERIFIED |
| V15 | Memory owner | Continuum durable write/readback across process restart with provenance/retention/owner purge | BLOCKED: canonical adapter/source not identified |
| V16 | Storage/Formula owner | Measured compression, reconstruction or accepted visual quality, memory/network budget | NOT EXECUTED for Vision |
| V17 | C3 Veritas owner | Pre/post independently qualified real action, receipt, eligible Ledger readback and denied/duplicate tests | NOT VERIFIED; Learning Ledger not updated |
| V18 | C3 Golden Package owner | Stable native Golden UI/phone integration preserving voice, cursor, Digital Brain, avatar and existing Agent Lee C3 functionality | NOT VERIFIED |

Status is not a claim of 0/18 source tests: it is **0/18 fully production-admitted end-to-end Vision gates at this checkpoint**, with scoped partial evidence noted above. Main 140-duty register remains separately controlled by its source.

## 8. Required next synchronized executions

**A (current contributor)**: reproduce user-visible normal Chrome failure on deployed GitHub HTTPS, instrument precise visible frame/analysis states and prove camera release; determine Golden UI ingress callback/source ownership without modifying live native host. Source-level tests alone are insufficient.

**B (incoming helper)**: inspect and claim compatible Device Bridge native/RTC files, check overlapping PR ownership, implement and physically qualify front/rear capture and two separately received PC video streams; coordinate owner-granted camera activation rather than importing false “four cameras” scripts.

**C3/Formula/Memory joint contributors**: trace actual canonical Formula client, Veritas/Receipt Authority, Continuum memory, Digital Brain and Learning Ledger interfaces with source SHA plus isolated readback BEFORE writing integration glue. Open a dedicated BLOCKED finding if Continuum authority is not retrievable; do not guess a storage endpoint.

**Release discipline**: Existing `docs/vision` is public; reserve changes behind reviewed branches with CI, then verify Pages served SHA and owner physical acceptance. Shared work closes only with inspectable proof + C3 handoff + reusable repair/learning, not with a pretty interface or “next smallest action.”

## 9. Privacy, performance and architectural prohibitions

- No automatic remote phone camera activation; owner consent is explicit and revocable. Never transmit/store camera secrets in GitHub or public issue comments.
- No routine LLM calls for basic computer vision or cognition. Do not require Qwen-VL/Gemma/Gemini or remote model APIs for camera capture, color/motion measurements, specialized object/face detector or deterministic state. Any optional VLM functionality must be independently removable with all base tests still PASS.
- No duplication of LeeWay Formula, Device Bridge, RTC stack, Cognition, Digital Brain, Continuum, Memory Warden, Veritas, or Learning Ledger. “Build once. Verify once. Reuse many times.”
- No mandatory Docker. Historical containers are provenance; source promotion to native/HTTPS paths must be measured.
- No fake 40-stream benchmark or universal hardware usage claims. Per-device stream budgets are provisional until measured PC/Fold hardware throughput.
- Vision content and derived biometric identity are sensitive. Minimize stored frames; enforce legitimate retention, redaction, encryption and deletion/purge via the authority owner's policy.
- Source/repo presence != service health; CI != live device; stream != decoded frame; view != perception; receipt file != independent Veritas; retained data != Learning Ledger learning; Digital Brain UI != canonical Continuum storage.

## 10. Closing handoff and audit scope limits

**Completed this checkpoint:** inspected the relevant named GitHub products and their exact source components; inspected 84 accessible user repositories by name for adjacent owners; recovered old Docker evidence; independently probed one authorized Windows host for current local service health; made a current shared-work intent in C3; wrote a bounded ownership and acceptance map for two contributors. The hosted Vision app remained unchanged by this documentation task.

**Not completed:** exhaustive commit-by-commit historical estate audit; authoritative Continuum/LDWMD implementation provenance; physical dual phone camera receipts; independent Veritas execution and Ledger proof; final Golden Package merge. Do not infer those outcomes from this file.

**Contributor instruction:** before editing, read ``AGENTS.md``, canonical Skills [handoff protocol](https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/docs/CONTRIBUTOR-HANDOFF-PROTOCOL.md), the newest C3 #21 comments, then write a work-intent claim indicating owner, source branch SHA, exact affected files, proof plan, privacy/consent restrictions and rollback. Record every completed/blocked gate in C3 #21, cross-link from contributor hub #22. No uncoordinated edits to shared Android camera, RTC, Golden UI, Formula, Memory or Ledger owners.
