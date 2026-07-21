import Foundation

/// Web tarafından köprü ile gelen tek takip kaydı.
struct Watch: Codable, Identifiable, Equatable {
    var id: String
    var pair: String
    var value: Double
    var dir: String       // "above" | "below"
    var decimals: Int
    var paused: Bool
}

/// window.webkit.messageHandlers.tresh.postMessage(...) ile gelen mesajlar.
/// { type: "watchList", watches: [...] }  veya
/// { type: "topWatch", watch: {...} | null }
struct BridgeMessage: Codable {
    var type: String
    var watches: [Watch]?
    var watch: TopWatch?
}

struct TopWatch: Codable, Equatable {
    var pair: String
    var value: Double
    var dir: String
    var decimals: Int
    var rate: Double?
}
