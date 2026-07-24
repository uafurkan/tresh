import ActivityKit
import Foundation

/// Dynamic Island / Live Activity için paylaşılan veri modeli.
/// Hem bu modül (Live Activity'yi başlatır/günceller) hem de targets/widget
/// altındaki widget extension (UI'ı çizer) AYNI dosyayı kullanır — Xcode'da
/// her iki target'a da üyelik verilmeli (dosyalar bilerek birebir aynı tutuluyor).
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
