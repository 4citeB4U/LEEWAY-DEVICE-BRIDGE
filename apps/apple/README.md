# LeeWay Device Bridge — Apple adapter

This is the iOS implementation path of the canonical LeeWay Device Bridge, not a separate Apple product or bridge authority. It uses the registered adapter ID `leeway.operator.ios` and the Apple bundle identity `industries.leeway.devicebridge`.

The source provides a direct Metal device probe, an owner-started native AVFoundation camera provider, and an owner-started token-authenticated local TCP transport. Camera frames are bounded JPEG data with SHA-256-bound local receipts for `vision.session.start`, `vision.frames.observe`, and `vision.session.stop`. The transport is off by default and requires the owner to pair the displayed endpoint and token; USB/WPD alone is not treated as a camera stream.

The native camera provider requires the owner to open LeeWay Device Bridge and grant Camera permission. It does not control arbitrary third-party apps, inspect other app screens, or bypass iOS privacy controls.

The model-runtime interface rejects requests until a LeeWay Formula grant verifier, a Device Bridge-owned local model runtime, and independent receipt verification are connected. A passing Metal readback remains local observation only.

The canonical Apple app now embeds the **LeeWay Safari Extension** target. It
uses the same App Group as the containing app and stages only user-selected
browser excerpts after a separately authenticated Runtime session exists. A
staged excerpt is neither Device Bridge execution nor a Veritas/Receipt
Authority result. The app starts with no such session, so Safari remains
fail-closed until the authorized Runtime handoff is implemented and observed.

The direct package guide is [docs/APPLE-CAMERA-PROVIDER.md](../../docs/APPLE-CAMERA-PROVIDER.md). It describes the published GitHub download, owner-controlled signing, explicit host pairing, and the remaining live qualification gate.

`project.yml` is an XcodeGen specification used only to create the Xcode project during development and in GitHub Actions. It is not part of the iPhone runtime. The GitHub qualification workflow builds and packages the unsigned IPA plus its digest-bound manifest. The `apple-latest` GitHub release is the current direct download channel for the owner-controlled signing/install path. It does not install an app or create a TestFlight build by itself.

<!-- LEEWAY UNIVERSAL FORMULA GOVERNANCE BEGIN -->

# LeeWay Universal Formula Governance

Authority: Creator and LeeWay Standards.
Formula identity: LEEWAY-FORMULA-v1.0.

The canonical LeeWay Formula is mandatory throughout
the entire LeeWay ecosystem.

Every current and future application, capability,
agent, worker, employee, model, provider, adapter,
automation and integration inherits this requirement.

All applicable interactions, responses, decisions,
actions, revisions, executions, computations, model
inferences, resource allocations, information transfers,
memory operations, storage operations and deployments
must consume the canonical Formula through their
authorized and qualified domain contracts.

Formula availability, documentation, configuration,
health and historical results do not constitute actual
Formula consumption for a new operation.

Recover relevant authorized memory before substantive
work. Preserve identity, provenance, Formula integrity,
authorization, original receipts and verified learning.

Never invent observations, adapter mappings, mathematical
results, execution evidence or independent verification.

No application may bypass applicable Formula governance
by dispatching directly to a provider.

Every new application and capability must demonstrate
applicable Formula consumption before production admission.

Preserve the existing authority hierarchy:

Creator > Standards > Root of Trust > Runtime Fabric >
Agent Lee > Harness > Formula > skills/models/tools >
execution > Veritas > Receipt Authority > Learning Ledger.

Execute the complete engineering loop:

INVESTIGATE > DIAGNOSE > PLAN > IMPLEMENT > TEST >
VALIDATE > REPAIR > RETEST > VERIFY > EVIDENCE >
CHECKPOINT > CONTINUE.

Documentation compliance does not establish executable
enforcement or production admission.

<!-- LEEWAY UNIVERSAL FORMULA GOVERNANCE END -->
