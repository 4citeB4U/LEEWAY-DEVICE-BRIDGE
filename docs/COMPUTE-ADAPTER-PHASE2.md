# LeeWay Compute Adapter Phase 2

Phase 2 defines one shared 16×16 operation for native backend differential testing:

`LEEWAY_TENSOR_AFFINE_16X16_V1`

For lane `i` in `0..255`, both the Rust CPU reference and Apple Metal adapter compute:

`output[i] = input[i] × 3 + i ÷ 255`

The operation is not a new Formula authority and is not described as quantum computation, compression, inference, or a production GPU workload. It is a deterministic adapter-qualification workload.

The Rust CPU reference validates exactly 256 finite `f32` cells, hashes the input and output as little-endian IEEE-754 bit patterns with a domain-separated operation ID, and emits candidate evidence with `canonicalReceiptIssued: false`.

The Apple adapter executes the same operation in a user-space Metal compute kernel using shared Metal buffers. It computes the CPU expectation inside the native app, performs lane-by-lane readback, and attaches input/output hashes to `AppleBridgeEvidence`. A local match remains `LOCAL_READBACK_PASSED_PENDING_RECEIPT`; it does not issue or replace an independent Device Bridge receipt.

Windows D3D12 and Linux/Android Vulkan adapters remain unbound. Their first acceptance gate is byte-identical input hashes, lane-identical output bit patterns, device-loss and timeout handling, and independent receipt verification against the CPU reference.
