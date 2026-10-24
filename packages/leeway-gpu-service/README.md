# LeeWay Edge GPU service

One standalone GPU product, `leeway.gpu.service`, for Windows, Linux,
Samsung/Android, macOS, iPhone and iPad. Device-specific execution APIs appear as
adapter details. Platform targets still require individual build, device and
complete governed qualification.

This package is the existing Device Bridge GPU service. Its governed model
routes consume the LeeWay Edge GPU SDK provider configured at trusted startup:

- `GET /v1/status`: product and provider state; discovery grants no execution.
- `GET /v1/manifest`: target platforms and application interfaces.
- `GET /v1/capabilities`: model capability contract used by existing Model Hub.
- `POST /v1/models/activate`: select an admitted model for a registered client.
- `POST /v1/generate`: execute the requested model through its Runtime binding.

The host passes `inferenceProvider` and `authenticateClient` to
`createGpuService` or `listenGpuService`. The provider implements `capabilities`,
`activateModel` and `generate`. The GPU SDK factory
`createLeeWayGpuInferenceProvider` implements this interface around the existing
LeeWay graph. The authentication adapter returns the verified `clientId`;
request JSON cannot provide its own identity, URLs, callbacks or authority.

This is a trusted deployment composition contract, not a claim that the generic
command-line launcher already binds production authorities. The current CLI
entrypoint wires only the explicitly labeled preview provider; it does not
construct the governed `inferenceProvider` or discover owner authorities from
an OS path, local port, container, or request. Governed generation therefore
remains unavailable through that launcher until an authorized Runtime Fabric
startup supplies the existing owner providers and authenticated-client adapter.
The cross-repository full-provider test uses diagnostic fixture providers and
does not certify ordinary launcher wiring or production enrollment.

```js
const server = await listenGpuService({
  port: deployment.port,
  platform: deployment.platform,
  preferenceFile: deployment.preferences,
  inferenceProvider: qualifiedLeeWayGpuProvider,
  authenticateClient: registeredApplicationAuthenticator
});
```

The service defaults to loopback for this Node host adapter. Android Messenger
and Apple native application transports implement the same product contract
through their respective adapters; this package does not assert Node execution
on a phone. Remote clients require the existing authorized device transport.

The existing owner switch controls requested use. OFF refuses new governed
requests and cancels active requests. ON does not replace request authorization.
Client disconnection also cancels the request. JSON, origins, IDs and body/token
budgets are checked before invoking the trusted provider.

The provider must verify signed qualification and the complete Runtime chain.
Generation returns text only with source identity, matching request/session,
POST, committed Continuum readback, final commit attestation and Receipt/Learning
Ledger evidence. Missing provider or authority fails closed. `/v1/execute` remains
the historical denied native-diagnostic interface until its own contract is
qualified. Legacy preview endpoints retain explicit `UNADMITTED_PREVIEW` scope;
they are never fallback for the governed model routes.

Agent Lee remains the machine-consciousness identity that requests GPU work.
Voice remains owned by the existing LeeWay Voice Fabric.

## Validation

```sh
node --test packages/leeway-gpu-service/*.test.mjs packages/gpu-inference/*.test.mjs
```

Tests use diagnostic providers and temporary local state. The full-provider test
also exercises the actual SDK, signed Runtime binding and original LDWMD with
synthetic GPU/model output. Set `LEEWAY_GPU_SOURCE_ROOT` and
`LEEWAY_RUNTIME_SOURCE_ROOT` to reviewed checkouts for that integration. It is
explicitly skipped without those sources. No test enrolls production signing
keys, runs a real language model or writes a live ledger.

The two GPU packages were recovered from the existing owner checkout with hash
comparison before editing. This change preserves their preview and diagnostic
tests while adding the governed application connection. Protected enrollment,
real model correctness, native adapter coverage, installation and performance
qualification remain separate release gates.

## LeeWay first-party software graphics — installed native diagnostic

LEEWAY HEADER — DO NOT REMOVE. REGION: LEEWAY.DEVICE_BRIDGE.GPU_SERVICE.NATIVE_GRAPHICS. WHO: Owner-authorized integration. WHAT: Native software engine service binding. WHY: Reuse LeeWay UMD and original renderer instead of exporting a downloadable patch. WHEN: 2026-10-24. WHERE: LeeWay GPU local service. HOW: Local opt-in, CSRF and origin, independent native readback. AUTHORITY: LAB_ONLY. LICENSE: Existing LeeWay terms.

The original `LeeWay-Edge-GPU/native/windows/d3d11-umd` opt-in lab build (merged GPU PR #19) can be invoked through this service. The executable and DLL must be built from reviewed LeeWay source; the companion original `leeway_swgraphics.dll` resides alongside them. No NVIDIA, Ollama, remote model runtime, or OS GPU adapter is involved in this CPU-executed diagnostic.

Set `LEEWAY_GPU_SOFTWARE_DIAG_RUNNER` to the absolute path of `leeway_umd_lab_bridge_test.exe`, and `LEEWAY_GPU_SOFTWARE_DIAG_DLL` to its sibling `leeway_d3d11_umd.dll`. Start `node packages/leeway-gpu-service/service.mjs` with `LEEWAY_GPU_PREVIEW_MODE=disabled`. The application binds to `127.0.0.1` only.

Visit the local app dashboard and use **Run LeeWay Software Engine**. Its actual native execution requires a same-origin POST and the CSRF token obtained from `/v1/control`:

- `GET /v1/diagnostics/software-graphics`: shows diagnostic availability without executing.
- `POST /v1/diagnostics/software-graphics/run`: executes the pinned LeeWay native DLL lab diagnostic and verifies exact output before reporting independent pixel readback, resource identity checks, a completed fence, and source binary SHA-256s. No body, no custom executable path, and no external origins are accepted.

**Production remains disabled.** This path carries `LAB_ONLY` and `UNADMITTED_DIAGNOSTIC` labels, cannot elevate `/v1/execute`, and never asserts a canonical Veritas or Learning Ledger receipt, a full model inference, WDDM driver installation, or Windows GPU enumeration. It does not persist a production authorization and must not be treated as protected memory/Formula/Continuum execution evidence.

On Agent-Lee, the source-restored service and native diagnostic binding were tested live at `127.0.0.1:4180`; the older services on ports 4178 and 4179 were left untouched. Native execution responded HTTP 200, 16 verified pixels, completed fence 1 and `osGpuRegistered:false`. The current boot process is a user session, not an authorized persistent production service.
