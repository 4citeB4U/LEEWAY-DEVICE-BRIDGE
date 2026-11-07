import Combine
import Foundation

@MainActor
final class AppleUpdateCoordinator: ObservableObject {
    @Published private(set) var state = "NOT_CHECKED"
    @Published private(set) var currentVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
    @Published private(set) var currentBuild = Int(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "0") ?? 0
    @Published private(set) var latestVersion = ""
    @Published private(set) var latestBuild = 0
    @Published private(set) var latestSizeBytes: Int64 = 0
    @Published private(set) var updateAvailable = false
    @Published private(set) var errorMessage: String?
    @Published var showPrompt = false

    let manifestURL = URL(string: "https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/package-manifest.json")!
    let sideStoreSourceURL = URL(string: "https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/download/apple-latest/sidestore-source.json")!
    let releaseURL = URL(string: "https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/tag/apple-latest")!

    var sideStoreURL: URL {
        var components = URLComponents(string: "sidestore://source")!
        components.queryItems = [URLQueryItem(name: "url", value: sideStoreSourceURL.absoluteString)]
        return components.url!
    }

    func check() {
        state = "CHECKING"
        errorMessage = nil
        var request = URLRequest(url: manifestURL)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            Task { @MainActor in
                guard let self else { return }
                if let error {
                    self.state = "CHECK_BLOCKED"
                    self.errorMessage = error.localizedDescription
                    return
                }
                guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode,
                      let data else {
                    self.state = "CHECK_BLOCKED"
                    self.errorMessage = "GitHub update manifest was not available."
                    return
                }
                do {
                    let root = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                    let packages = root?["packages"] as? [[String: Any]] ?? []
                    guard let entry = packages.first(where: { ($0["platform"] as? String) == "ios" }) else {
                        throw UpdateError.applePackageMissing
                    }
                    let build = (entry["versionCode"] as? NSNumber)?.intValue ?? 0
                    guard build > self.currentBuild else {
                        self.latestVersion = entry["versionName"] as? String ?? self.currentVersion
                        self.latestBuild = build
                        self.latestSizeBytes = (entry["sizeBytes"] as? NSNumber)?.int64Value ?? 0
                        self.updateAvailable = false
                        self.state = "CURRENT"
                        return
                    }
                    self.latestVersion = entry["versionName"] as? String ?? "new version"
                    self.latestBuild = build
                    self.latestSizeBytes = (entry["sizeBytes"] as? NSNumber)?.int64Value ?? 0
                    self.updateAvailable = true
                    self.state = "UPDATE_AVAILABLE"
                    self.showPrompt = true
                } catch {
                    self.state = "CHECK_BLOCKED"
                    self.errorMessage = error.localizedDescription
                }
            }
        }.resume()
    }

    private enum UpdateError: LocalizedError {
        case applePackageMissing

        var errorDescription: String? {
            switch self {
            case .applePackageMissing: return "Apple package was not present in the GitHub update manifest."
            }
        }
    }
}
