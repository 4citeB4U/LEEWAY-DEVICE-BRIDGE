#include <metal_stdlib>
using namespace metal;

kernel void leewayDeviceBridgeAffine(
    const device uint *input [[buffer(0)]],
    device uint *output [[buffer(1)]],
    uint lane [[thread_position_in_grid]]
) {
    output[lane] = input[lane] * 3u + lane;
}
