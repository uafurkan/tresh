import ActivityKit
import Foundation

/// Dynamic Island / Live Activity için paylaşılan veri modeli.
/// Hem bu modül (Live Activity'yi başlatır/günceller) hem de targets/widget
/// altındaki widget extension (UI'ı çizer) AYNI tipi kullanır — iki dosya
/// bilerek birebir aynı tutuluyor, aksi halde tipler eşleşmez.
///
/// @available şart: ActivityAttributes protokolü iOS 16.1+, ana uygulamanın
/// deployment target'ı ise 15.1 — annotation olmadan derleme hatası verir.
@available(iOS 16.1, *)
struct TreshActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// Canlı kur (ör. 47.19).
        var rate: Double
        /// Kullanıcının eşik değeri (ör. 47.20).
        var threshold: Double
        /// "above" ya da "below".
        var direction: String
        /// Gösterimde kullanılacak ondalık basamak sayısı.
        var decimals: Int
        /// Son güncelleme zamanı.
        var updatedAt: Date
    }

    /// Parite adı (ör. "USD/TRY") — aktivite ömrü boyunca sabit.
    var pair: String
}
