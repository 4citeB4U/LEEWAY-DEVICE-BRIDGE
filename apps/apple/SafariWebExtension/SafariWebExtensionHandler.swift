/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.APPLE.SAFARI
TAG: LEEWAY.APPLE.SAFARI_EXTENSION_HANDLER.V2
WHAT: Embed the LeeWay Safari Web Extension in the canonical Apple Device Bridge app.
WHY: Safari on iPhone requires an Apple-signed containing app and extension target.
HOW: Correlate native messages, require a Runtime-granted App Group session, and stage only bounded owner-selected excerpts.
AUTHORITY: Transport and staging only; Runtime authorizes, Device Bridge executes, Veritas and Receipt Authority qualify evidence.
*/
import Foundation
import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        guard let item = context.inputItems.first as? NSExtensionItem,
              let message = item.userInfo?[SFExtensionMessageKey] as? [String: Any] else {
            respond(context, ["type": "leeway.extension.error", "code": "NATIVE_MESSAGE_INVALID"])
            return
        }
        switch message["type"] as? String {
        case "leeway.extension.hello": respond(context, hello(message))
        case "leeway.extension.page-excerpt": respond(context, stageExcerpt(message))
        default: respond(context, ["type": "leeway.extension.error", "code": "NATIVE_MESSAGE_TYPE_REJECTED"])
        }
    }

    private func hello(_ message: [String: Any]) -> [String: Any] {
        let helloId = message["helloId"] as? String ?? ""
        guard message["version"] as? Int == 3,
              validId(helloId),
              (message["requestedCapabilities"] as? [String]) == [SafariExtensionBridge.allowedCapability],
              let session = SafariExtensionBridge.qualifiedSession() else {
            return ["type": "leeway.extension.hello-ack", "version": 3, "helloId": helloId,
                    "authenticated": false, "capabilities": [], "code": "NATIVE_APP_AUTHENTICATION_REQUIRED"]
        }
        return ["type": "leeway.extension.hello-ack", "version": 3, "helloId": helloId,
                "authenticated": true, "sessionId": session.id,
                "capabilities": [SafariExtensionBridge.allowedCapability]]
    }

    private func stageExcerpt(_ message: [String: Any]) -> [String: Any] {
        let requestId = message["requestId"] as? String ?? ""
        let requestedSessionId = message["sessionId"] as? String ?? ""
        guard let session = SafariExtensionBridge.qualifiedSession(),
              requestedSessionId == session.id, validId(requestId),
              let excerpt = message["excerpt"] as? [String: Any] else {
            return receipt(requestId, requestedSessionId, false, "NATIVE_APP_FORWARDING_NOT_QUALIFIED")
        }
        guard SafariExtensionBridge.stage(requestId: requestId, sessionId: session.id, excerpt: excerpt) else {
            return receipt(requestId, session.id, false, "NATIVE_APP_INBOX_REJECTED")
        }
        return receipt(requestId, session.id, true, "NATIVE_APP_INBOX_STAGED_NOT_EXECUTED")
    }

    private func receipt(_ requestId: String, _ sessionId: String, _ accepted: Bool, _ code: String) -> [String: Any] {
        ["type": "leeway.extension.receipt", "requestId": requestId, "sessionId": sessionId,
         "accepted": accepted, "code": code]
    }

    private func validId(_ value: String) -> Bool {
        value.range(of: "^[A-Za-z0-9._:-]{8,128}$", options: .regularExpression) != nil
    }

    private func respond(_ context: NSExtensionContext, _ message: [String: Any]) {
        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: message]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
