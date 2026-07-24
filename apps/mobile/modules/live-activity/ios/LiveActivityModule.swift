import ActivityKit
import ExpoModulesCore

/// JS <-> ActivityKit köprüsü. Kur çekimi/zamanlama JS tarafında (useRates,
/// zaten 15 sn'de bir çalışıyor) kalıyor — bu modül yalnızca "en üstteki
/// takip" değiştikçe Live Activity'yi başlatır/günceller/kapatır.
public class LiveActivityModule: Module {
  /// Ana uygulamanın deployment target'ı 15.1, ActivityKit ise iOS 16.1+
  /// (kullandığımız ActivityContent API'si ise 16.2+). 16.x'e ait bir tip
  /// (Activity<...>), 15.1 hedefli bir sınıfta doğrudan stored property
  /// olamaz — derleme hatası verir. Bu yüzden Any? olarak saklanıp erişim
  /// anında availability korumalı bir computed property üzerinden cast edilir.
  private var activityStorage: Any?

  @available(iOS 16.2, *)
  private var activity: Activity<TreshActivityAttributes>? {
    get { activityStorage as? Activity<TreshActivityAttributes> }
    set { activityStorage = newValue }
  }

  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    AsyncFunction("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return true
      }
      return false
    }

    AsyncFunction("areActivitiesEnabled") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("startOrUpdate") { (pair: String, rate: Double, threshold: Double, direction: String, decimals: Int) in
      guard #available(iOS 16.2, *) else { return }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

      let state = TreshActivityAttributes.ContentState(
        rate: rate,
        threshold: threshold,
        direction: direction,
        decimals: decimals,
        updatedAt: Date()
      )

      // Parite değiştiyse mevcut aktiviteyi kapatıp yenisini başlat —
      // pair, aktivitenin sabit (attributes) kısmında olduğu için
      // güncellenemez.
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
      guard #available(iOS 16.2, *) else { return }
      if let current = self.activity {
        await current.end(nil, dismissalPolicy: .immediate)
        self.activity = nil
      }
    }
  }
}
