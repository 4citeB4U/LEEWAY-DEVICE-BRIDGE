#include <metal_stdlib>
using namespace metal;

kernel void leewayDeviceBridgeAffine(
    const device float *input [[buffer(0)]],
    device float *output [[buffer(1)]],
    uint lane [[thread_position_in_grid]]
) {
    output[lane] = fma(input[lane], 3.0f, float(lane) / 255.0f);
}
