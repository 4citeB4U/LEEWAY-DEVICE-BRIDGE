const WEBGPU_INPUT = new Uint32Array([3, 8, 21, 34, 55, 89, 144, 233]);
const WEBGPU_EXPECTED = new Uint32Array(WEBGPU_INPUT.map(value => value * 3 + 1));

export const browserDiagnosticStates = Object.freeze({
  unavailable: "BROWSER_WEBGPU_UNAVAILABLE",
  adapterUnavailable: "BROWSER_WEBGPU_ADAPTER_UNAVAILABLE",
  passed: "BROWSER_WEBGPU_READBACK_PASSED",
  failed: "BROWSER_WEBGPU_READBACK_FAILED"
});

function observationId() {
  return globalThis.crypto?.randomUUID?.() || `pwa-observation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createApplePwaDiagnostics({ now = new Date(), standalone, serviceWorkerControlled } = {}) {
  const displayStandalone = standalone ?? Boolean(globalThis.matchMedia?.("(display-mode: standalone)")?.matches || globalThis.navigator?.standalone === true);
  return {
    observationId: observationId(),
    observedAt: now.toISOString(),
    adapter: "leeway.device.bridge.pwa",
    adapterState: "BROWSER_SURFACE_ACTIVE",
    digitalBrainProjection: "LOCAL_OBSERVATION_ONLY",
    runtime: {
      browser: globalThis.navigator?.userAgent || "UNOBSERVED",
      standalone: displayStandalone,
      online: globalThis.navigator?.onLine ?? null,
      secureContext: Boolean(globalThis.isSecureContext),
      serviceWorkerControlled: serviceWorkerControlled ?? Boolean(globalThis.navigator?.serviceWorker?.controller)
    },
    browserCompute: { state: "NOT_RUN" },
    nativeMetal: {
      state: "NOT_OBSERVED",
      reason: "A Safari PWA has no direct MTLDevice or Metal-command API. Only the separately installed LeeWay native adapter may report native Metal evidence."
    },
    formula: { canonicalState: "NOT_EXECUTED" },
    veritas: { state: "NOT_EXECUTED" },
    receipt: { state: "NOT_CREATED" }
  };
}

function equalUint32(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function adapterSummary(adapter) {
  try {
    const info = adapter.info || await adapter.requestAdapterInfo?.();
    if (!info) return { state: "BROWSER_ADAPTER_INFO_NOT_EXPOSED" };
    return {
      state: "BROWSER_ADAPTER_INFO_OBSERVED",
      vendor: info.vendor || "UNEXPOSED",
      architecture: info.architecture || "UNEXPOSED",
      description: info.description || "UNEXPOSED"
    };
  } catch {
    return { state: "BROWSER_ADAPTER_INFO_NOT_EXPOSED" };
  }
}

export async function runBrowserComputeProbe() {
  const gpu = globalThis.navigator?.gpu;
  if (!gpu) {
    return {
      state: browserDiagnosticStates.unavailable,
      nativeMetalState: "NOT_OBSERVED",
      formulaState: "NOT_EXECUTED",
      receiptState: "NOT_CREATED"
    };
  }

  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    return {
      state: browserDiagnosticStates.adapterUnavailable,
      nativeMetalState: "NOT_OBSERVED",
      formulaState: "NOT_EXECUTED",
      receiptState: "NOT_CREATED"
    };
  }

  let device;
  try {
    device = await adapter.requestDevice();
    const bytes = WEBGPU_INPUT.byteLength;
    const input = device.createBuffer({ size: bytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const output = device.createBuffer({ size: bytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const readback = device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const module = device.createShaderModule({
      code: `
        @group(0) @binding(0) var<storage, read> source: array<u32>;
        @group(0) @binding(1) var<storage, read_write> result: array<u32>;
        @compute @workgroup_size(4)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let index = id.x;
          result[index] = source[index] * 3u + 1u;
        }
      `
    });
    const pipeline = device.createComputePipeline({
      layout: "auto",
      compute: { module, entryPoint: "main" }
    });
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: input } },
        { binding: 1, resource: { buffer: output } }
      ]
    });
    device.queue.writeBuffer(input, 0, WEBGPU_INPUT);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(2);
    pass.end();
    encoder.copyBufferToBuffer(output, 0, readback, 0, bytes);
    device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const actual = new Uint32Array(readback.getMappedRange().slice(0));
    readback.unmap();
    const passed = equalUint32(actual, WEBGPU_EXPECTED);
    return {
      state: passed ? browserDiagnosticStates.passed : browserDiagnosticStates.failed,
      input: Array.from(WEBGPU_INPUT),
      expected: Array.from(WEBGPU_EXPECTED),
      actual: Array.from(actual),
      adapter: await adapterSummary(adapter),
      nativeMetalState: "NOT_OBSERVED",
      formulaState: "NOT_EXECUTED",
      receiptState: "NOT_CREATED"
    };
  } catch (error) {
    return {
      state: browserDiagnosticStates.failed,
      error: error instanceof Error ? error.message : String(error),
      nativeMetalState: "NOT_OBSERVED",
      formulaState: "NOT_EXECUTED",
      receiptState: "NOT_CREATED"
    };
  } finally {
    device?.destroy?.();
  }
}
