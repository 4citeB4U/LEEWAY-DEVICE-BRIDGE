import AVFoundation
import Combine
import CoreImage
import CryptoKit
import Foundation
import SwiftUI
import UIKit

struct AppleCameraFrame: Identifiable, Sendable {
    let id: UUID
    let frameNumber: Int
    let timestamp: Date
    let width: Int
    let height: Int
    let mimeType: String
    let jpegData: Data
    let sha256: String
}

/// Owner-started native iOS camera provider. The capture stays inside the
/// LeeWay app until a separately authenticated host transport is paired.
final class AppleCameraCapture: NSObject, ObservableObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    @Published private(set) var authorization = AVCaptureDevice.authorizationStatus(for: .video)
    @Published private(set) var isRunning = false
    @Published private(set) var activePosition: AVCaptureDevice.Position = .back
    @Published private(set) var latestFrame: AppleCameraFrame?
    @Published private(set) var latestReceipt: AppleCameraReceipt?
    @Published private(set) var errorMessage: String?
    @Published private(set) var currentSessionId: UUID?

    let session = AVCaptureSession()

    private let sessionQueue = DispatchQueue(label: "industries.leeway.devicebridge.camera.session")
    private let frameQueue = DispatchQueue(label: "industries.leeway.devicebridge.camera.frames")
    private let context = CIContext()
    private var activeInput: AVCaptureDeviceInput?
    private var configured = false
    private var frameNumber = 0
    private var activeSessionId: UUID?

    func requestAccessAndStart() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            start()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    guard let self else { return }
                    self.authorization = AVCaptureDevice.authorizationStatus(for: .video)
                    if granted { self.start() } else { self.errorMessage = "Camera permission was not granted." }
                }
            }
        case .denied, .restricted:
            errorMessage = "Camera permission is blocked. Enable Camera for LeeWay Device Bridge in Settings."
        @unknown default:
            errorMessage = "Camera permission state is unknown."
        }
    }

    func start() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            guard self.configureIfNeeded(position: self.activePosition) else { return }
            guard !self.session.isRunning else { return }
            self.frameNumber = 0
            self.activeSessionId = UUID()
            self.session.startRunning()
            let sessionId = self.activeSessionId
            DispatchQueue.main.async {
                self.isRunning = self.session.isRunning
                self.errorMessage = nil
                self.currentSessionId = sessionId
                if let sessionId {
                    self.publishReceipt(AppleCameraReceipt.issue(
                        operation: "vision.session.start",
                        sessionId: sessionId,
                        frame: nil,
                        result: .pass
                    ))
                }
            }
        }
    }

    func stop() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            let sessionId = self.activeSessionId
            if self.session.isRunning { self.session.stopRunning() }
            self.activeSessionId = nil
            DispatchQueue.main.async {
                self.isRunning = false
                self.currentSessionId = nil
                if let sessionId {
                    self.publishReceipt(AppleCameraReceipt.issue(
                        operation: "vision.session.stop",
                        sessionId: sessionId,
                        frame: nil,
                        result: .pass
                    ))
                }
            }
        }
    }

    func flipCamera() {
        sessionQueue.async { [weak self] in
            guard let self, self.configured else { return }
            let nextPosition: AVCaptureDevice.Position = self.activePosition == .back ? .front : .back
            guard let device = self.cameraDevice(position: nextPosition),
                  let input = try? AVCaptureDeviceInput(device: device),
                  self.session.canAddInput(input) else {
                DispatchQueue.main.async { self.errorMessage = "The requested iPhone camera is unavailable." }
                return
            }
            self.session.beginConfiguration()
            if let current = self.activeInput { self.session.removeInput(current) }
            self.session.addInput(input)
            self.activeInput = input
            self.activePosition = nextPosition
            self.session.commitConfiguration()
            DispatchQueue.main.async { self.activePosition = nextPosition }
        }
    }

    private func configureIfNeeded(position: AVCaptureDevice.Position) -> Bool {
        if configured { return true }
        guard let device = cameraDevice(position: position),
              let input = try? AVCaptureDeviceInput(device: device) else {
            DispatchQueue.main.async { self.errorMessage = "No compatible iPhone camera was found." }
            return false
        }

        session.beginConfiguration()
        session.sessionPreset = .high
        guard session.canAddInput(input) else {
            session.commitConfiguration()
            DispatchQueue.main.async { self.errorMessage = "LeeWay could not attach the iPhone camera input." }
            return false
        }
        let output = AVCaptureVideoDataOutput()
        output.alwaysDiscardsLateVideoFrames = true
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        guard session.canAddOutput(output) else {
            session.commitConfiguration()
            DispatchQueue.main.async { self.errorMessage = "LeeWay could not attach the iPhone camera output." }
            return false
        }
        session.addInput(input)
        session.addOutput(output)
        output.setSampleBufferDelegate(self, queue: frameQueue)
        activeInput = input
        configured = true
        session.commitConfiguration()
        return true
    }

    private func cameraDevice(position: AVCaptureDevice.Position) -> AVCaptureDevice? {
        AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position)
            ?? AVCaptureDevice.default(.builtInDualCamera, for: .video, position: position)
            ?? AVCaptureDevice.default(.builtInTrueDepthCamera, for: .video, position: position)
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer),
              let sessionId = activeSessionId else { return }
        let image = CIImage(cvPixelBuffer: imageBuffer)
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        guard let jpegData = context.jpegRepresentation(of: image, colorSpace: colorSpace, options: [:]),
              jpegData.count <= 8 * 1024 * 1024 else { return }

        frameNumber += 1
        let frame = AppleCameraFrame(
            id: UUID(),
            frameNumber: frameNumber,
            timestamp: Date(),
            width: CVPixelBufferGetWidth(imageBuffer),
            height: CVPixelBufferGetHeight(imageBuffer),
            mimeType: "image/jpeg",
            jpegData: jpegData,
            sha256: SHA256.hash(data: jpegData).map { String(format: "%02x", $0) }.joined()
        )
        let receipt = AppleCameraReceipt.issue(
            operation: "vision.frames.observe",
            sessionId: sessionId,
            frame: frame,
            result: .pass
        )
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.latestFrame = frame
            self.publishReceipt(receipt)
        }
    }

    private func publishReceipt(_ receipt: AppleCameraReceipt?) {
        guard let receipt else { return }
        latestReceipt = receipt
        AppleCameraReceiptStore.append(receipt)
    }
}

struct AppleCameraPreview: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        uiView.previewLayer.session = session
    }

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }
}
