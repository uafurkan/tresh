import SwiftUI
import ActivityKit

/// iOS uygulamasına özel ayarlar — web arayüzünden ayrı.
/// Dynamic Island / Live Activity buradan açılıp kapatılır.
struct SettingsView: View {
    @EnvironmentObject var store: WatchStore
    @Environment(\.dismiss) private var dismiss

    private var activitiesAllowed: Bool {
        ActivityAuthorizationInfo().areActivitiesEnabled
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("Dynamic Island'da göster", isOn: $store.liveActivityEnabled)
                        .disabled(!activitiesAllowed)
                } header: {
                    Text("Canlı Takip")
                } footer: {
                    if activitiesAllowed {
                        Text("En üstteki takip, kilit ekranı ve Dynamic Island'da canlı kur ve eşiğinle görünür. Yalnızca bu iOS uygulaması için geçerli.")
                    } else {
                        Text("Canlı Etkinlikler kapalı. Ayarlar › Tresh › Canlı Etkinlikler'den açman gerekir.")
                    }
                }

                if let top = store.topWatch {
                    Section("Şu an gösterilen") {
                        HStack {
                            Text(top.pair).font(.system(.body, design: .monospaced))
                            Spacer()
                            Text(top.dir == "above" ? "↑ \(TreshFormat.number(top.value, decimals: top.decimals))"
                                                    : "↓ \(TreshFormat.number(top.value, decimals: top.decimals))")
                                .foregroundStyle(.secondary)
                                .font(.system(.body, design: .monospaced))
                        }
                    }
                }
            }
            .navigationTitle("Ayarlar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Bitti") { dismiss() }
                }
            }
        }
    }
}
