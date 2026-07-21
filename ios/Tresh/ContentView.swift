import SwiftUI
import WebKit

struct ContentView: View {
    @EnvironmentObject var store: WatchStore
    @State private var showSettings = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            WebView(store: store)
                .ignoresSafeArea()

            // Sağ üstte, web arayüzünü bozmayan küçük bir ayarlar düğmesi.
            Button {
                showSettings = true
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Color(red: 0.20, green: 0.89, blue: 0.84))
                    .padding(10)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .padding(.top, 8)
            .padding(.trailing, 12)
        }
        .sheet(isPresented: $showSettings) {
            SettingsView().environmentObject(store)
        }
    }
}

/// Siteyi yükleyen WKWebView + JS köprüsü.
struct WebView: UIViewRepresentable {
    let store: WatchStore

    func makeCoordinator() -> Coordinator { Coordinator(store: store) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        // window.webkit.messageHandlers.tresh.postMessage(...) buraya düşer.
        config.userContentController.add(context.coordinator, name: "tresh")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.bounces = false
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.016, green: 0.035, blue: 0.055, alpha: 1)
        if let url = URL(string: "https://treshapp.vercel.app/app") {
            webView.load(URLRequest(url: url))
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKScriptMessageHandler {
        let store: WatchStore
        init(store: WatchStore) { self.store = store }

        func userContentController(_ controller: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.name == "tresh",
                  let dict = message.body as? [String: Any],
                  let data = try? JSONSerialization.data(withJSONObject: dict),
                  let decoded = try? JSONDecoder().decode(BridgeMessage.self, from: data)
            else { return }
            Task { @MainActor in store.handleBridge(decoded) }
        }
    }
}
