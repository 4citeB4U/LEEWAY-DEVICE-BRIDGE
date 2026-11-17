import Foundation
import Metal
import CryptoKit

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

        let input = (0 ..< laneCount).map { Float($0) / 255.0 }
        let expected = input.enumerated().map { index, value in
            (Float(index) / 255.0).addingProduct(value, 3.0)
        }
        let byteCount = laneCount * MemoryLayout<Float>.stride

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
                start: outputBuffer.contents().bindMemory(to: Float.self, capacity: laneCount),
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
            operationID: "LEEWAY_TENSOR_AFFINE_16X16_V1",
            inputSHA256: tensorHash(input),
            outputSHA256: tensorHash(output),
            detail: mismatches == 0
                ? "16x16 Metal tensor readback matched the CPU reference locally; Device Bridge receipt verification remains required."
                : "16x16 Metal tensor readback contained \(mismatches) mismatched lanes."
        )
    }

    private static func tensorHash(_ values: [Float]) -> String {
        var hasher = SHA256()
        hasher.update(data: Data("LEEWAY_TENSOR_AFFINE_16X16_V1\0".utf8))
        for value in values {
            var bits = value.bitPattern.littleEndian
            withUnsafeBytes(of: &bits) { hasher.update(bufferPointer: $0) }
        }
        return hasher.finalize().map { String(format: "%02x", $0) }.joined()
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
            operationID: "LEEWAY_TENSOR_AFFINE_16X16_V1",
            detail: detail
        )
    }
}
