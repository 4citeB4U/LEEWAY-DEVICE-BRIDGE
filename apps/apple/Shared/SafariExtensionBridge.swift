import Foundation

/// Shared App Group vocabulary for the Safari extension and the containing
/// Device Bridge app.  It stages a bounded owner-selected excerpt only; it
/// never grants Runtime authorization, executes a device operation, or emits
/// a Veritas/Receipt Authority result.
enum SafariExtensionBridge {
    static let appGroup = "group.industries.leeway.devicebridge"
    static let ownerSessionKey = "leeway.safari.ownerSession.v1"
    static let excerptInboxKey = "leeway.safari.excerptInbox.v1"
    static let allowedCapability = "page.excerpt.submit"
    static let authorizationState = "OWNER_AUTHENTICATED_RUNTIME_GRANTED"

    struct OwnerSession {
        let id: String
        let expiresAt: Date
    }

    struct Excerpt: Codable, Identifiable {
        let id: String
        let sessionId: String
        let href: String
        let title: String
        let selection: String
        let receivedAt: Date
        let state: String
    }

    static func qualifiedSession(now: Date = Date()) -> OwnerSession? {
        guard let values = UserDefaults(suiteName: appGroup)?.dictionary(forKey: ownerSessionKey),
              values["authorizationState"] as? String == authorizationState,
              let id = values["sessionId"] as? String,
              validId(id),
              let expiresAt = values["expiresAt"] as? Date,
              expiresAt > now else { return nil }
        return OwnerSession(id: id, expiresAt: expiresAt)
    }

    static func stage(requestId: String, sessionId: String, excerpt: [String: Any]) -> Bool {
        guard validId(requestId), validId(sessionId), validExcerpt(excerpt),
              let defaults = UserDefaults(suiteName: appGroup) else { return false }
        let entry = Excerpt(id: requestId, sessionId: sessionId,
                            href: excerpt["href"] as! String,
                            title: excerpt["title"] as! String,
                            selection: (excerpt["selection"] as! String).trimmingCharacters(in: .whitespacesAndNewlines),
                            receivedAt: Date(), state: "STAGED_NOT_EXECUTED")
        var current = inbox()
        guard !current.contains(where: { $0.id == entry.id }) else { return false }
        current.insert(entry, at: 0)
        guard let data = try? JSONEncoder().encode(Array(current.prefix(20))) else { return false }
        defaults.set(data, forKey: excerptInboxKey)
        return true
    }

    static func inbox() -> [Excerpt] {
        guard let data = UserDefaults(suiteName: appGroup)?.data(forKey: excerptInboxKey),
              let entries = try? JSONDecoder().decode([Excerpt].self, from: data) else { return [] }
        return entries
    }

    private static func validId(_ value: String) -> Bool {
        value.range(of: "^[A-Za-z0-9._:-]{8,128}$", options: .regularExpression) != nil
    }

    private static func validExcerpt(_ value: [String: Any]) -> Bool {
        guard let href = value["href"] as? String, let title = value["title"] as? String,
              let selection = value["selection"] as? String, let url = URL(string: href),
              ["http", "https"].contains(url.scheme?.lowercased() ?? "") else { return false }
        return href.count <= 2048 && title.count <= 256 && !selection.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && selection.count <= 8192
    }
}
