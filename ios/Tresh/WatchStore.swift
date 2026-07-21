import Foundation
import ActivityKit
import Combine
import UIKit

/// Uygulamanın kalbi: web köprüsünden gelen takipleri tutar, canlı kuru
/// düzenli çeker ve en üstteki takibi Dynamic Island'daki Live Activity'de
/// gösterir. Live Activity aç/kapa ayarı burada (UserDefaults'ta) tutulur.
@MainActor
final class WatchStore: ObservableObject {
    @Published var watches: [Watch] = []
    @Published var topWatch: TopWatch?
    /// Ayarlar ekranındaki "Dynamic Island'da göster" düğmesi.
    @Published var liveActivityEnabled: Bool {
        didSet {
            UserDefaults.standard.set(liveActivityEnabled, forKey: "liveActivityEnabled")
            if liveActivityEnabled { Task { await refreshAndUpdate() } }
            else { Task { await endActivity() } }
        }
    }

    private var activity: Activity<TreshActivityAttributes>?
    private var timer: Timer?
    private let apiBase = "https://treshapp.vercel.app"

    init() {
        liveActivityEnabled = UserDefaults.standard.object(forKey: "liveActivityEnabled") as? Bool ?? true
        if let data = UserDefaults.standard.data(forKey: "watches"),
           let saved = try? JSONDecoder().decode([Watch].self, from: data) {
            watches = saved
        }
    }

    func start() {
        // Ön planda her 15 sn'de bir kuru tazele; arka plan güncellemesi için
        // README'deki BGAppRefresh / APNs push adımlarına bakın.
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
            Task { await self?.refreshAndUpdate() }
        }
        Task { await refreshAndUpdate() }
    }

    // MARK: - Web köprüsünden gelen mesajlar

    func handleBridge(_ message: BridgeMessage) {
        switch message.type {
        case "watchList":
            if let w = message.watches {
                watches = w
                if let data = try? JSONEncoder().encode(w) {
                    UserDefaults.standard.set(data, forKey: "watches")
                }
            }
        case "topWatch":
            topWatch = message.watch
            Task { await updateActivity() }
        default:
            break
        }
    }

    // MARK: - Kur çekimi

    private func refreshAndUpdate() async {
        let active = watches.filter { !$0.paused }
        guard let top = active.first ?? watches.first else {
            topWatch = nil
            await endActivity()
            return
        }
        let rate = await fetchRate(pair: top.pair)
        topWatch = TopWatch(pair: top.pair, value: top.value, dir: top.dir,
                            decimals: top.decimals, rate: rate)
        await updateActivity()
    }

    private func fetchRate(pair: String) async -> Double? {
        guard let encoded = pair.addingPercentEncoding(withAllowedCharacters: .urlQueryValueAllowed),
              let url = URL(string: "\(apiBase)/api/rates?pairs=\(encoded)") else { return nil }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let decoded = try JSONDecoder().decode(RatesResponse.self, from: data)
            return decoded.quotes.first(where: { $0.pair == pair })?.rate
        } catch {
            return nil
        }
    }

    // MARK: - Live Activity (Dynamic Island)

    private func updateActivity() async {
        guard liveActivityEnabled,
              ActivityAuthorizationInfo().areActivitiesEnabled,
              let top = topWatch, let rate = top.rate else {
            return
        }

        let state = TreshActivityAttributes.ContentState(
            rate: rate, threshold: top.value, direction: top.dir,
            decimals: top.decimals, updatedAt: Date()
        )

        // Aktif aktivite parite değişmişse yeniden başlat.
        if let current = activity, current.attributes.pair != top.pair {
            await current.end(nil, dismissalPolicy: .immediate)
            activity = nil
        }

        if let current = activity {
            await current.update(ActivityContent(state: state, staleDate: nil))
        } else {
            do {
                activity = try Activity.request(
                    attributes: TreshActivityAttributes(pair: top.pair),
                    content: ActivityContent(state: state, staleDate: nil),
                    pushType: nil
                )
            } catch {
                // İzin yok / limit aşıldı — sessizce geç.
            }
        }
    }

    private func endActivity() async {
        if let current = activity {
            await current.end(nil, dismissalPolicy: .immediate)
            activity = nil
        }
    }
}

private struct RatesResponse: Codable {
    var ok: Bool
    var quotes: [Quote]
    struct Quote: Codable { var pair: String; var rate: Double }
}

private extension CharacterSet {
    static let urlQueryValueAllowed: CharacterSet = {
        var set = CharacterSet.urlQueryAllowed
        set.remove(charactersIn: "/&=?")
        return set
    }()
}
