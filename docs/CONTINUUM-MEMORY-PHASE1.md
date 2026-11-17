# LeeWay Continuum Memory Phase 1

## Scope

Phase 1 implements a portable application-level RAM staging contract. It does not program PCIe configuration space, issue physical DMA, replace an operating-system driver, execute Metal, prove zero-copy behavior, evaluate the LeeWay Formula, or establish thermal improvement.

The implemented paths are:

`source bytes → SHA-256 custody → deterministic 16×16 feature projection → capacity-bounded RAM source retention → explicit Continuum pointer state`

`source bytes → reversible 256-byte identity blocks → reconstruction manifest and SHA-256 → exact byte reconstruction`

## Projection semantics

`TensorProjection16` divides source byte positions deterministically across 256 cells. Each occupied cell stores the normalized mean of the bytes assigned to that cell. The projection includes the source length, source SHA-256, projection SHA-256, occupied-cell count, and a reproducible weight sum.

The projection is intentionally marked `losslessReconstruction: false`. Arbitrary source data cannot generally be reconstructed from 256 aggregate values. Exact custody uses `ReversibleBlockStream`, which divides bounded input into 256-byte blocks, preserves the final valid-byte count, and verifies both encoded and reconstructed SHA-256 values. The release CLI exposes both `continuum-block-encode` and `continuum-block-decode`, with bounded input/document/output sizes. It promises no compression ratio.

## RAM and Continuum custody

`ContinuumMemoryCache` enforces tracked payload capacity and maximum-entry size. It uses least-recently-used eviction and returns the exact IDs evicted by a stage operation. Each entry carries a `ContinuumPointer` whose state is either `PENDING_COMMIT` or `PERSISTED`.

The cache does not claim to bound total process memory: allocator metadata, task stacks, indexes, socket buffers, and operating-system allocations sit outside the tracked payload counter. Its health schema therefore reports `totalProcessMemoryBounded: false`.

The staging method performs no filesystem operation. A caller may stage against a pending pointer and later mark it persisted only when the expected capsule hash matches. The core daemon initialization path records its ordinary Sandbox/Continuum evidence first, then stages that exact event in RAM with the persisted capsule pointer.

## Platform profile boundary

`TransportProfile` selects a preferred user-space backend:

| Platform | Preferred backend | Current implementation state |
| --- | --- | --- |
| Windows | D3D12 user space | Contract only, adapter not bound |
| Linux / Android | Vulkan user space | Contract only, adapter not bound |
| macOS / iOS / iPadOS | Metal user space | Contract only, adapter not bound |
| Mesh-only node | Secure local mesh | Contract only, adapter not bound |
| Unknown | CPU fallback | Contract only, adapter not bound |

Every profile reports `directPcieConfiguration: false`, `directMmio: false`, `physicalDma: false`, `zeroCopyVerified: false`, and `kernelIntrusion: false`. Those states may change only inside a separately implemented and physically qualified platform adapter.

Apple documents that shared Metal storage allows CPU and GPU access to a resource, while also requiring synchronization. Apple also exposes MPSGraph tensor data backed by an `MTLBuffer`. These APIs support a future user-space Apple adapter; they do not prove that the current Rust contract has executed Metal or achieved zero-copy behavior. See [Apple shared storage](https://developer.apple.com/documentation/metal/mtlstoragemode/shared), [Apple resource storage modes](https://developer.apple.com/documentation/metal/setting-resource-storage-modes), and [MPSGraph tensor data](https://developer.apple.com/documentation/metalperformanceshadersgraph/mpsgraphtensordata).

Microsoft documents D3D12 upload heaps as the ordinary user-space resource lane for dynamic CPU-to-GPU data. That supports the selected Windows profile without claiming direct PCIe register control. See [D3D12 heap types](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ne-d3d12-d3d12_heap_type).

## Safety arbiter

`AllocationTable` authorizes only a nonzero range fully contained in a registered opaque allocation. It uses checked arithmetic, so integer overflow cannot create an accepted range. Any parity-error, dropped-credit, timeout, or policy-denial telemetry causes a valid range to select `RAW_FALLBACK` rather than structured transfer.

This is a software boundary contract. It does not claim that physical PCIe telemetry is currently connected.

## Acceptance evidence

Phase 1 requires all of the following:

1. Deterministic projection equality for repeated input.
2. Exactly 256 finite cells and explicit non-lossless status.
3. Exact reversible 256-byte block round-trips at 0, 1, 255, 256, 257, and 4096 bytes, plus tamper and declared-output-limit rejection.
4. Source hash and projection hash readback.
5. Tracked RAM payload capacity never exceeded during repeated staging and eviction.
6. At least 50,000 generated allocation ranges with no unauthorized range accepted.
7. Apple profiles never advertise PCIe, MMIO, physical DMA, kernel intrusion, or verified zero copy.
8. Current source passes Rust tests, Clippy with warnings denied, release build, and the release-binary projection/codec tests on Windows, Linux, and macOS CI.

Physical GPU execution, PCIe MPS telemetry, CPU utilization, memory-leak soak testing, thermal measurements, Metal execution, and independent Veritas remain later gates.
