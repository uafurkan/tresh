import ActivityKit
import Foundation

/// Dynamic Island / Live Activity için paylaşılan veri modeli.
/// Hem ana uygulama (Live Activity başlatır/günceller) hem de widget
/// extension (UI'ı çizer) bu dosyayı kullanır — ikisine de target üyeliği verin.
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
