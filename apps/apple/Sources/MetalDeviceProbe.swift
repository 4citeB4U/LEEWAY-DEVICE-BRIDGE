import Foundation
import Metal

enum MetalDeviceProbe {
    private static let laneCount = 256

    static func run() -> AppleBridgeEvidence {
        guard let device = MTLCreateSystemDefaultDevice() else {
            return failure(deviceName: nil, detail: "Metal did not return a default device.")
        }
        guard let commandQueue = device.makeCommandQueue() else {
            return failure(deviceName: device.name, detail: "Metal did not create a command queue.")
        }
        guard let library = device.makeDefaultLibrary(),
              let function = library.makeFunction(name: "leewayDeviceBridgeAffine") else {
            return failure(deviceName: device.name, detail: "The bundled Device Bridge Metal kernel is unavailable.")
        }

        let input = (0 ..< laneCount).map(UInt32.init)
        let expected = input.enumerated().map { index, value in
            value &* 3 &+ UInt32(index)
        }
        let byteCount = laneCount * MemoryLayout<UInt32>.stride

        guard let inputBuffer = input.withUnsafeBytes({ bytes in
            device.makeBuffer(bytes: bytes.baseAddress!, length: byteCount, options: .storageModeShared)
        }),
        let outputBuffer = device.makeBuffer(length: byteCount, options: .storageModeShared),
        let pipeline = try? device.makeComputePipelineState(function: function),
        let commandBuffer = commandQueue.makeCommandBuffer(),
        let encoder = commandBuffer.makeComputeCommandEncoder() else {
            return failure(deviceName: device.name, detail: "Metal could not create the probe pipeline or command encoder.")
        }

        encoder.label = "LeeWay Device Bridge deterministic Metal probe"
        encoder.setComputePipelineState(pipeline)
        encoder.setBuffer(inputBuffer, offset: 0, index: 0)
        encoder.setBuffer(outputBuffer, offset: 0, index: 1)
        let width = min(pipeline.maxTotalThreadsPerThreadgroup, laneCount)
        encoder.dispatchThreads(
            MTLSize(width: laneCount, height: 1, depth: 1),
            threadsPerThreadgroup: MTLSize(width: width, height: 1, depth: 1)
        )
        encoder.endEncoding()

        commandBuffer.commit()
        commandBuffer.waitUntilCompleted()
        guard commandBuffer.status == .completed else {
            return failure(
                deviceName: device.name,
                detail: "Metal command buffer did not complete: \(commandBuffer.error?.localizedDescription ?? "unknown error")."
            )
        }

        let output = Array(
            UnsafeBufferPointer(
                start: outputBuffer.contents().bindMemory(to: UInt32.self, capacity: laneCount),
                count: laneCount
            )
        )
        let mismatches = zip(output, expected).filter { $0 != $1 }.count
        return AppleBridgeEvidence(
            id: UUID(),
            observedAt: Date(),
            adapterID: "leeway.operator.ios",
            physicalDeviceName: device.name,
            backend: "Metal",
            state: mismatches == 0 ? .localReadbackPassedPendingReceipt : .failed,
            laneCount: laneCount,
            mismatchCount: mismatches,
            detail: mismatches == 0
                ? "Direct Metal readback passed locally; Device Bridge receipt verification remains required."
                : "Direct Metal readback contained \(mismatches) mismatched lanes."
        )
    }

    private static func failure(deviceName: String?, detail: String) -> AppleBridgeEvidence {
        AppleBridgeEvidence(
            id: UUID(),
            observedAt: Date(),
            adapterID: "leeway.operator.ios",
            physicalDeviceName: deviceName,
            backend: "Metal",
            state: .failed,
            laneCount: laneCount,
            mismatchCount: nil,
            detail: detail
        )
    }
}
