# LeeWay native compute adapter — Phase 3

The sovereign core now carries one bounded OS-mediated GPU adapter for the deterministic `LEEWAY_TENSOR_AFFINE_16X16_V1` contract. `wgpu` selects D3D12 on supported Windows hosts, Vulkan on supported Linux/Android hosts, or Metal on supported macOS hosts. The separately packaged iOS app retains its direct Metal implementation.

## Fixed execution boundary

- Input is exactly 256 normalized finite IEEE-754 `f32` lanes in `[0,1]`.
- LeeWay allocates one 1,024-byte input buffer, one 1,024-byte output buffer, and one 1,024-byte readback buffer.
- No caller supplies an address, register, PCIe endpoint, DMA range, shader, dispatch shape, or buffer size.
- The fixed shader computes `fma(input[i], 3.0, i / 255.0)` for every lane.
- Readback is compared with the Rust CPU reference. Both buffers receive domain-separated SHA-256 hashes, exact bit mismatches remain visible, and numerical acceptance uses an explicit absolute tolerance of `1e-6` to account for lawful floating-point contraction differences between CPU, D3D12, Vulkan, and Metal providers.
- Adapter name, graphics backend, and OS-reported device type are preserved in candidate evidence.
- Only `IntegratedGpu` and `DiscreteGpu` are labeled as physical hardware. CPU, virtual, or browser adapters remain software/virtual evidence.
- Candidate evidence never issues a Formula decision, Veritas verdict, canonical receipt, Learning Ledger admission, or production qualification.

## Command surface

`leeway-core compute-native-probe` reads one bounded JSON array from standard input and returns the candidate evidence document. A differential mismatch exits nonzero. Adapter absence and device/readback failures return their exact scoped compute errors.

## Explicit non-claims

This adapter does not read or write PCIe configuration space, negotiate Maximum Payload Size registers, expose MMIO, accept arbitrary DMA addresses, alter MSI-X behavior, modify kernel scheduling, establish zero-copy transport, or prove thermal/throughput improvement. Those claims require separate OS-authorized implementations and physical telemetry.

Source compilation and CI prove portability of the contract. A physical-compute claim requires execution on the named enrolled device, exact adapter readback, governance admission, and independent evidence custody.
