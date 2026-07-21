import Foundation

/// Web tarafındaki fmtNum ile aynı davranış: sabit ondalık + yerel binlik ayracı.
enum TreshFormat {
    static func number(_ value: Double, decimals: Int) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.minimumFractionDigits = decimals
        f.maximumFractionDigits = decimals
        f.locale = Locale.current
        return f.string(from: NSNumber(value: value)) ?? String(value)
    }
}
