import ActivityKit
import ExpoModulesCore

/// JS <-> ActivityKit köprüsü. Kur çekimi/zamanlama JS tarafında (useRates,
/// zaten 15 sn'de bir çalışıyor) kalıyor — bu modül yalnızca "en üstteki
/// takip" değiştikçe Live Activity'yi başlatır/günceller/kapatır. Mantık
/// ios/Tresh/WatchStore.swift'teki (ayrı native sarmalayıcı) ile aynı.
public class LiveActivityModule: Module {
    private var activity: Activity<TreshActivityAttributes>?

    public func definition() -> ModuleDefinition {
        Name("LiveActivity")

        AsyncFunction("isSupported") { () -> Bool in
            if #available(iOS 16.1, *) {
                return true
            }
            return false
        }

        AsyncFunction("areActivitiesEnabled") { () -> Bool in
            if #available(iOS 16.1, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            }
            return false
        }

        AsyncFunction("startOrUpdate") { (pair: String, rate: Double, threshold: Double, direction: String, decimals: Int) in
            guard #available(iOS 16.1, *) else { return }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

            let state = TreshActivityAttributes.ContentState(
                rate: rate, threshold: threshold, direction: direction,
                decimals: decimals, updatedAt: Date()
            )

            if let current = self.activity, current.attributes.pair != pair {
                await current.end(nil, dismissalPolicy: .immediate)
                self.activity = nil
            }

            if let current = self.activity {
                await current.update(ActivityContent(state: state, staleDate: nil))
            } else {
                do {
                    self.activity = try Activity.request(
                        attributes: TreshActivityAttributes(pair: pair),
                        content: ActivityContent(state: state, staleDate: nil),
                        pushType: nil
                    )
                } catch {
                    // İzin yok / eşzamanlı aktivite limiti aşıldı — sessizce geç.
                }
            }
        }

        AsyncFunction("end") {
            guard #available(iOS 16.1, *) else { return }
            if let current = self.activity {
                await current.end(nil, dismissalPolicy: .immediate)
                self.activity = nil
            }
        }
    }
}
