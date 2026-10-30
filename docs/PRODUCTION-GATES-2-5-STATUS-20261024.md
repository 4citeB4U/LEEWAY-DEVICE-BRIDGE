# LeeWay production gates 2–5 status

**Reviewed:** 2026-10-24  
**Authority:** Source and test review. This document is not a production receipt.

## Existing LeeWay work carried forward

- LeeWay Edge GPU PR #19 connects its original native software renderer to an
  opt-in Windows diagnostic UMD. Its 4×4 pixel readback is real software
  execution, but it is explicitly lab-only and does not install a graphics
  driver or authorize production Formula execution.
- Device Bridge PR #58 merged the existing native diagnostic into the local GPU
  service and dashboard. Its recorded port 4180 run returned diagnostic
  evidence; canonical /v1/execute remained denied. That run is historical and
  does not establish that the service is currently running.
- The production Formula evaluator provider and inference mapping are already
  qualified. The remaining execution question is whether the qualified
  authorities are bound to one live request and produce the complete protected
  evidence chain. This review does not reopen Formula qualification.
- Edge GPU PR #13, Runtime Fabric PR #80 carried into main by #81, Device Bridge
  PR #55 and Model Hub PR #2 already connect the portable service, GPU SDK,
  Runtime binding, original LDWMD, Continuum and ledger interfaces. Their
  cross-repository fixture runs passed. The production binding deliberately
  requires trusted providers; it does not generate owner keys or enroll itself.
  Runtime's binding retries failed cleanup in-process, while fresh-process
  cleanup recovery still needs durable owner records and qualification.
- The current Device Bridge source hardens startup, keeps voice routed only
  through LeeWay Voice Fabric, and adds compare-and-swap file editing, checked
  moves, journaled append recovery and bounded job input. PR #60 commit
  `94a7cb7703abe98ec82b87fbbcc338feadb405a7` passed the Android Build workflow
  (run `40134361817`) and protocol/MCP workflow (run `40134361826`) on Windows,
  Linux and macOS.
  Android unit tests and package assembly passed; its artifact is attached to
  the PR run and was not published to GitHub Pages.
- Device Bridge PR #56 now carries bounded binary range reads, create-only
  binary writes, resumable chunk append, exact text edits, hash-checked moves,
  directory paging, interactive jobs/sessions and paged search. The 39-test
  MCP suite passes on Windows, Linux and macOS. These fixture tests verify
  adapter contracts, not production authority or physical cross-device parity.
- Android source already contains the owner-granted Accessibility adapter,
  screen/UI routes, Voice Fabric boundary and local model/Agent Lee routes.
  This checkout now wires the owner-picked Storage Access Framework tree to
  bounded read/write/hash/transfer/move/edit/directory routes and reports current
  grants in the device passport. Append, move and edit persist recovery journals.
  The PR #60 Android build and unit tests pass;
  physical owner-tree/provider behavior and live relay execution remain
  unqualified. This is an additive change to the existing Android app, not a
  second bridge application.

## Manifest and source identity

Verified manifest evidence is present. The current release-train record pins
the merged GPU, Runtime, Device Bridge and Model Hub source revisions. The
latest C3 reconciliation also verifies 298 manifest entries for
`OWNER_GOVERNED_C3_GPU_DIAGNOSTIC_V1`. These are valid source/provenance records
within their stated scopes. The release-train evidence still marks protected
same-request model inference as unobserved; the C3 diagnostic manifest does not
enroll an inference Veritas provider or Learning Ledger admission provider.

## Windows driver integration already merged in LeeWay Edge GPU

The Windows work is a substantial platform adapter milestone and remains a
separate track from portable LeeWay GPU execution:

- Edge GPU PR #15 added request-bound, pointer-free software graphics commands,
  resource preflight, completion fences and verified readback. Native command
  tests passed; its release boundary says this is not a WDDM driver.
- PR #16 added WDK-typed kernel callback source and a reproducible compile
  check. The callbacks deliberately refuse admission; no driver package was
  installed or registered.
- PR #17 added a real PnP, graphics-kernel and DXGI identity probe. It verified
  the detection path and observed no LeeWay adapter on Agent-Lee.
- PR #18 added and loaded the genuine D3D11 UMD entry-point ABI. Adapter opening
  remains unsupported until a functioning kernel driver and device callbacks
  exist.
- PR #19 connected the original LeeWay software renderer to an explicit,
  default-off lab UMD build. Its 4×4 diagnostic readback passed 16/16 pixels;
  it did not create a D3D device or register an OS GPU.
- Device Bridge PR #58 exposed that renderer through the standalone service and
  dashboard for diagnostics. Its historical run returned
  `PASS_DIAGNOSTIC_ONLY`; canonical `/v1/execute` remained denied. The service
  current reachability is unknown; sandbox socket restrictions prevented a
  fresh local check.

These merged deliverables remain part of the product. The Windows UMD work is a
platform-specific adapter milestone. The portable LeeWay GPU service binds its
platform-neutral Runtime provider contract. A Windows-enumerated adapter has a
separate qualification, with WDDM lifecycle, deployment and readback acceptance
of its own.

## Gate results

### Gate 2 — Independent Veritas authorization

**Not passed.** The latest owner-presence repair qualification records source
patch and negative-test success, while `productionVeritasAuthorized` and
`independentCustodianQualified` remain false. Runtime readiness also records
`INDEPENDENT_VERITAS_PROVIDER_UNREGISTERED`. The LEO stage reviewer is
`SAMPLE_ONLY`; diagnostic signers remain scoped to their existing diagnostic
authority. Neither can stand in for independently enrolled production PRE/POST.

### Gate 3 — One complete live execution

**Not passed.** The merged Runtime binding and full pipeline fixture already
implement the intended request correlation across Formula, PRE, model source,
LDWMD, compute, Continuum readback/commit, POST and both ledgers. The production
Formula provider and inference mapping are already qualified. The remaining
proof is that production binds those authorities to the same protected request
and correlates the request through device observation, Veritas PRE/POST, and
both ledgers. Retained governed-run evidence stopped before protected inference
because production Veritas and canonical Learning Ledger admission providers
were unregistered. The native Windows run is diagnostic-only. Current Runtime
endpoint reachability is unknown because local socket inspection was denied by
the sandbox. No same-request protected production execution is evidenced by the
reviewed artifacts.

### Gate 4 — Production service activation

**Not passed.** Runtime port reachability remains unknown because local socket
inspection was denied by the sandbox. A live, read-only ADB check on 2026-10-24
found the existing LeeWay Device Bridge app installed as `0.9.8-pocket-rc8`
(version code 23). No app service was running; relay enablement, Agent Access,
and SAF read/write grants were unset. Android Accessibility is enabled at the
system level, but LeeWay's Device Operator service is not enabled. The governed
MCP production composition has not been observed running with its real
providers. No separate bridge app is needed; the existing app still needs its
owner-controlled setup.

### Gate 5 — Desktop Commander parity

**Desktop source and portable contract CI passed; cross-device parity remains
open.** PR #56 now implements and tests bounded binary transfer, hash-checked
moves and edits, interactive job/session I/O, directory paging and search on
Windows, Linux and macOS. Android screen/UI routes and model/Agent Lee routes
already exist behind the native relay and owner authority, but the live check
found LeeWay Accessibility and the relay inactive. These routes have not been
proven live end to end. The installed app predates PR #60 and has no persisted
SAF tree grants. Android SAF file routes are implemented in the PR #60
candidate; Android CI passed, but the routes remain unqualified on a real
owner-granted tree. This is an update to the existing app, not a second bridge
application. Desktop
screen/UI operations are not advertised. Interactive and search sessions are
process-local, so restart recovery is not qualified.

## Acceptance evidence still required

1. Enroll and independently verify the production Veritas owner/custodian
   provider, then prove its PRE/POST signing identity is distinct from the
   diagnostic signer.
2. Run one production request through the already-qualified Formula provider
   and inference mapping, the protected GPU route, physical observation,
   Veritas PRE/POST, Receipt Ledger and Learning Ledger. Correlate every record
   to that same request.
3. Activate the governed service with its real owner providers; verify startup,
   reconnect, STOP, restart recovery and failure handling. Use the installed
   Android app and have the device owner enable LeeWay Accessibility through
   Android settings.
4. Test the Android SAF-backed remote file routes on a real owner-granted
   document tree. PR #60 adds routes to the existing Device Bridge app; its
   source is not yet in the installed build. Update that app only to test these
   new routes; do not install a second bridge. The device owner must choose the
   folder, activate the phone relay and enable LeeWay Accessibility. Verify
   authenticated model/Agent Lee access with a live
   paired device. Qualify process restart recovery and implement desktop
   screen/UI operations before claiming those
   parity items.

No release or execution claim should advance from fixture tests or the
diagnostic service alone.


