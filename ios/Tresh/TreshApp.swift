import SwiftUI

@main
struct TreshApp: App {
    @StateObject private var store = WatchStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .ignoresSafeArea()
                .onAppear { store.start() }
        }
    }
}
