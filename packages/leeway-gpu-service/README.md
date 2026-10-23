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
