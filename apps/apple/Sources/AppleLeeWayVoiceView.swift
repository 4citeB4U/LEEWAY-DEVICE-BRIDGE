/*
 LEEWAY HEADER — DO NOT REMOVE
 REGION: DEVICE.BRIDGE.APPLE.VOICE.FABRIC
 TAG: EXISTING_NATIVE_IPHONE_LEEWAY_VOICE_ENTRY
 WHO: LeeWay Industries
 WHAT: Embed the hosted Voice Fabric client inside the existing iOS Device Bridge app.
 WHY: Use one LeeWay SDK on phones without Apple system text-to-speech.
 WHERE: apps/apple/Sources/AppleLeeWayVoiceView.swift
 WHEN: 2026-10-25
 HOW: WKWebView with the existing Voice Fabric Studio URL and in-webview device synthesis.
 AUTHORITY: voice-only UI; no Apple TTS, privileged bridge messages, or implicit owner login.
 LICENSE: MIT
*/
import SwiftUI
import WebKit

private enum LeeWayVoiceWebDestination {
    static let url = URL(string: "https://4citeb4u.github.io/LeeWay-Voice-Fabric/studio.html")!
}

/// Retains native Metal probe capabilities while opening only the LeeWay Voice
/// Fabric application. Voice engine loading, user approval and voice catalog
/// live in Voice Fabric; this view does NOT call AVSpeechSynthesizer.
struct AppleLeeWayVoiceView: View {
    var body: some View {
        VStack(spacing: 0) {
            Text("LeeWay Voice Fabric · voice-only playback")
                .font(.caption)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            AppleLeeWayVoiceWebView()
        }
        .navigationTitle("Agent Lee Voice")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct AppleLeeWayVoiceWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.load(URLRequest(url: LeeWayVoiceWebDestination.url,
                             cachePolicy: .reloadIgnoringLocalCacheData))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let destination = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            // First party LeeWay Studio only; external model downloads use WebKit
            // resource loading, not arbitrary top-level navigation.
            if destination.scheme == "https" &&
               destination.host == "4citeb4u.github.io" &&
               destination.path.hasPrefix("/LeeWay-Voice-Fabric/") {
                decisionHandler(.allow)
            } else {
                decisionHandler(.cancel)
            }
        }
    }
}
