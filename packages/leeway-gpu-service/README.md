# LeeWay GPU service SDK

LeeWay GPU is the product identity. Its Windows execution backend is **LeeWay GPU — D3D12**. LDWMD owns the working-memory allocation and lease boundary. A service name or healthy process does not grant execution authority.

## Current Windows service contract

The Windows diagnostic service listens on loopback at `http://127.0.0.1:4178`:

- `GET /v1/status` reports identity, backend, authority bindings, and dispatch state.
- `GET /v1/manifest` reports the service contract and current availability.
- `POST /v1/execute` accepts a bounded, request-correlated SDK request only after production authority is connected. The current installed runtime deliberately returns HTTP 503 with `GPU_CANONICAL_EXECUTION_AUTHORITY_NOT_CONNECTED` and does not dispatch.

Use the SDK rather than constructing requests by hand:

```js
import { discoverLeeWayGpu, executeLeeWayGpu } from "@leeway/device-bridge-gpu-service/client";

const status = await discoverLeeWayGpu();
console.log(status.productName, status.backendName, status.productionReady);

// Execution is expected to reject while any canonical gate is unbound.
await executeLeeWayGpu({ request: {
  requestId: "application-generated-request-id",
  workloadHash: "64-lowercase-hex-characters",
  backend: "D3D12",
  deviceId: "registered-device-id",
  adapterId: "registered-adapter-id",
  memoryBytes: 4096
} });
```

The control panel records a user's requested preference. It cannot turn on dispatch or stand in for Runtime Fabric, Formula, LDWMD, Continuum, or Veritas authorization.

## Using a laptop GPU from a different PC

A no-GPU PC must send an inference request to the paired laptop that owns the physical GPU. The current Device Bridge preview uses an authenticated, encrypted private-LAN pairing and keeps each app's LeeWay service on `127.0.0.1:4178`. It is a preview transport; it does not authorize the production `/v1/execute` route.

The paired client exposes a limited OpenAI-compatible text API at `GET /v1/models` and `POST /v1/chat/completions` for desktop applications that let their users configure an OpenAI-compatible base URL, such as `http://127.0.0.1:4178/v1`. It accepts text-only `system`, `developer`, `user`, and `assistant` messages, a model from the paired allowlist, and up to 1,024 output tokens. Streaming, tool calls, multimodal input, and arbitrary D3D12/Vulkan application work are not supported. The API is loopback-only and rejects cross-origin browser requests. Successful responses expose the verified backend, device, model bytes, VRAM bytes, and full-residency state in `x-leeway-gpu-*` headers. The adapter performs an empty-prompt model load and requires the complete model allocation in VRAM before dispatching user text; partial CPU placement fails closed. Pairing authenticates the preview peer; it does not authorize production GPU dispatch.

The remote inference path is explicitly `UNADMITTED_PREVIEW`; it is not the canonical GPU dispatcher and does not create Veritas, Receipt Ledger, or Learning Ledger evidence. The laptop currently has one NVIDIA GeForce RTX 5060 Laptop GPU with 8,151 MiB total VRAM and a 4B-class allowlisted preview model. A 700B model's weights alone require about 350 GB decimal (326 GiB) at an idealized 4 bits per parameter, before quantization metadata, KV cache, and runtime memory. Therefore this single 8 GiB GPU cannot host a 700B model. Running one would require a sufficiently large remote or multi-device memory pool; CPU/NVMe offload is not equivalent to GPU residency or useful high-throughput execution.

## Port and API boundary

Use port **4178** for LeeWay GPU service requests and its `/v1/*` routes. The historic `127.0.0.1:4330/health`, `/metrics`, and `/invoke` addresses identify a separate legacy Qwen inference adapter. The OpenAI-compatible preview at `/v1/chat/completions` is an explicit opt-in text-inference bridge; it is not an OS-enumerated GPU, WDDM driver, or transparent GPU replacement. Windows applications that need Direct3D/Vulkan acceleration still require a real supported driver/backend or explicit app integration.

## Platform labels

- Windows: LeeWay GPU — D3D12.
- Apple: LeeWay GPU — Metal; implementation and qualification are not established by this Windows service.
- Android: LeeWay GPU — Vulkan; only qualified devices may be advertised as supported.
- Linux: LeeWay GPU — Vulkan; per-device qualification is required.

A local D3D12 diagnostic pass proves only the measured workload and machine. It does not prove remote transport, model inference, a virtual OS GPU adapter, other platforms, production admission, or capacity for a particular language model.
