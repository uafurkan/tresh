import ActivityKit
import WidgetKit
import SwiftUI

private let teal = Color(red: 0.20, green: 0.89, blue: 0.84)
private let amber = Color(red: 1.0, green: 0.59, blue: 0.29)

/// Eşiğe yakınlık (0..1) — renk canlılığı için.
private func tension(rate: Double, threshold: Double) -> Double {
    let span = max(abs(threshold) * 0.03, 0.0001)
    return max(0, min(1, 1 - abs(rate - threshold) / span))
}

private func distanceText(_ s: TreshActivityAttributes.ContentState) -> String {
    let diff = abs(s.rate - s.threshold)
    return TreshFormat.number(diff, decimals: s.decimals)
}

private func accent(_ s: TreshActivityAttributes.ContentState) -> Color {
    tension(rate: s.rate, threshold: s.threshold) > 0.7 ? amber : teal
}

struct TreshLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TreshActivityAttributes.self) { context in
            // Kilit ekranı / banner görünümü
            LockScreenView(attributes: context.attributes, state: context.state)
                .padding()
                .background(Color(red: 0.016, green: 0.035, blue: 0.055))
        } dynamicIsland: { context in
            let s = context.state
            let a = accent(s)
            return DynamicIsland {
                // Genişletilmiş görünüm (basılı tutunca)
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.attributes.pair)
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundStyle(.secondary)
                        Text(TreshFormat.number(s.rate, decimals: s.decimals))
                            .font(.system(size: 24, weight: .bold, design: .monospaced))
                            .foregroundStyle(.white)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Label {
                            Text(TreshFormat.number(s.threshold, decimals: s.decimals))
                                .font(.system(size: 15, weight: .semibold, design: .monospaced))
                        } icon: {
                            Image(systemName: s.direction == "above" ? "arrow.up" : "arrow.down")
                        }
                        .foregroundStyle(a)
                        Text(distanceText(s) + " kaldı")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundStyle(.secondary)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    WaveBar(tension: tension(rate: s.rate, threshold: s.threshold), accent: a)
                        .frame(height: 6)
                }
            } compactLeading: {
                Image(systemName: "drop.fill").foregroundStyle(a)
            } compactTrailing: {
                Text(TreshFormat.number(s.rate, decimals: min(s.decimals, 2)))
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .foregroundStyle(.white)
            } minimal: {
                Image(systemName: "drop.fill").foregroundStyle(a)
            }
            .keylineTint(a)
        }
    }
}

private struct LockScreenView: View {
    let attributes: TreshActivityAttributes
    let state: TreshActivityAttributes.ContentState

    var body: some View {
        let a = accent(state)
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 3) {
                Text(attributes.pair)
                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                    .foregroundStyle(.secondary)
                Text(TreshFormat.number(state.rate, decimals: state.decimals))
                    .font(.system(size: 30, weight: .bold, design: .monospaced))
                    .foregroundStyle(.white)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                HStack(spacing: 4) {
                    Image(systemName: state.direction == "above" ? "arrow.up" : "arrow.down")
                    Text(TreshFormat.number(state.threshold, decimals: state.decimals))
                        .font(.system(size: 16, weight: .semibold, design: .monospaced))
                }
                .foregroundStyle(a)
                Text(distanceText(state) + " kaldı")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
        }
    }
}

/// Eşiğe yaklaşınca dolan basit "su" göstergesi.
private struct WaveBar: View {
    let tension: Double
    let accent: Color
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.12))
                Capsule().fill(accent)
                    .frame(width: max(6, geo.size.width * tension))
            }
        }
    }
}
