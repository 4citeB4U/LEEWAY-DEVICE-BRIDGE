import Foundation

enum AppleSystemHandoff {
    static func phoneURL(for rawNumber: String) -> URL? {
        let allowed = CharacterSet(charactersIn: "+0123456789*#")
        let normalized = rawNumber.unicodeScalars
            .filter { allowed.contains($0) }
            .map { String($0) }
            .joined()
        guard !normalized.isEmpty else { return nil }
        return URL(string: "tel:" + normalized)
    }

    static func emailURL(recipient: String, subject: String, body: String) -> URL? {
        let trimmedRecipient = recipient.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedRecipient.isEmpty else { return nil }

        var components = URLComponents()
        components.scheme = "mailto"
        components.path = trimmedRecipient
        components.queryItems = [
            URLQueryItem(name: "subject", value: subject),
            URLQueryItem(name: "body", value: body)
        ]
        return components.url
    }
}
