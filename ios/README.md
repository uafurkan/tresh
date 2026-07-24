# Tresh — iOS Native Wrapper (Dynamic Island)

> **Not:** Bu klasördeki bağımsız WKWebView sarmalayıcı, artık aktif geliştirme
> hattı değil — `apps/mobile` (Expo/React Native) tam uygulamaya dönüştü ve
> aynı Dynamic Island/Live Activity özelliği oraya `apps/mobile/modules/
> live-activity` (JS↔ActivityKit köprüsü) ve `apps/mobile/targets/widget`
> (widget extension, bu klasördeki Swift dosyalarının aynısından üretildi)
> olarak taşındı. Bu klasör referans/yedek olarak duruyor, silinmedi.

Web/PWA'lar iOS'ta Dynamic Island'a **erişemez** — bu Apple'ın donanım-seviyesi
kısıtı, tarayıcıda hiçbir API'si yok. Dynamic Island / Live Activity yalnızca
**native (Swift) uygulamalara** açık.

Bu klasör, `treshapp.vercel.app`'i bir `WKWebView` içinde gösteren ince bir
native sarmalayıcı uygulamadır. Uygulama:

- Aynı web arayüzünü birebir gösterir (ayrı bir kod tabanı değil, aynı site).
- En üstteki takibi web'den JS köprüsüyle alır.
- Canlı kuru `/api/rates`'ten çeker.
- **En üstteki takibi Dynamic Island'da ve kilit ekranında Live Activity olarak**
  gösterir (canlı kur, eşik, yön, mesafe, eşiğe yaklaştıkça dolan gösterge).
- Ayarında bu özelliği aç/kapa düğmesi vardır (web arayüzünden ayrı, iOS'a özel).

> Bu uygulama Vercel'e deploy edilemez; Xcode'da derlenip bir Apple Developer
> hesabıyla telefona/TestFlight'a yüklenir.

---

## Gereksinimler

- Xcode 15+ (iOS 16.2+ SDK — Live Activities `ActivityContent` API'si için)
- iPhone 14 Pro veya sonrası (Dynamic Island donanımı) — kilit ekranı Live
  Activity daha eski modellerde de çalışır
- Apple Developer hesabı (ücretsiz hesap cihaza yüklemeye yeter; TestFlight için
  ücretli gerekir)

## Kurulum adımları

1. **Yeni Xcode projesi**: App → SwiftUI, isim `Tresh`, bundle id ör.
   `app.tresh`. iOS Deployment Target'ı **16.2** yapın.

2. **Ana uygulama dosyalarını ekleyin** (`ios/Tresh/*.swift` + `ios/Shared/*.swift`):
   - `TreshApp.swift`, `ContentView.swift`, `WatchStore.swift`, `Model.swift`,
     `SettingsView.swift`
   - `Shared/TreshActivityAttributes.swift`, `Shared/Formatting.swift`
   Xcode'un oluşturduğu varsayılan `ContentView.swift`/`App.swift` dosyalarını silin.

3. **Widget Extension ekleyin**: File → New → Target → **Widget Extension**,
   isim `TreshWidget`, "Include Live Activity" **işaretli**. Oluşan şablon
   dosyalarını silip şunları ekleyin:
   - `ios/TreshWidget/TreshLiveActivity.swift`
   - `ios/TreshWidget/TreshWidgetBundle.swift`

4. **Paylaşılan dosyaları iki target'a da üye yapın**: `Shared/` altındaki iki
   dosyayı seçip File Inspector › Target Membership'te hem **Tresh** hem
   **TreshWidget** kutularını işaretleyin. (Live Activity veri modeli ikisinde
   de derlenmeli.)

5. **Info.plist**: Ana uygulama target'ının Info'suna
   `ios/Tresh/Info-additions.plist` içindeki anahtarları ekleyin — özellikle
   `NSSupportsLiveActivities = YES`.

6. **Derleyin ve çalıştırın** (gerçek cihaz önerilir; Live Activity simülatörde
   sınırlı çalışır). Uygulama açılınca site yüklenir, bir takip ekleyin,
   Dynamic Island'da belirir. Sağ üstteki dişli simgesinden aç/kapayabilirsiniz.

## Nasıl çalışıyor

- Web tarafı (bu repodaki `src/lib/client/nativeBridge.ts`), `window.webkit.
  messageHandlers.tresh` varsa en üstteki takibi ve takip listesini native'e
  gönderir. Safari'de bu köprü yoktur, hiçbir şey olmaz.
- `WatchStore` gelen takibi saklar, 15 sn'de bir `/api/rates`'ten kuru çeker ve
  `TreshActivityAttributes` ile Live Activity'yi başlatır/günceller.
- `TreshLiveActivity` (widget extension) Dynamic Island'ın compact/expanded/
  minimal ve kilit ekranı görünümlerini çizer.

## Arka planda güncelleme (opsiyonel, ileri seviye)

Uygulama ön plandayken kur canlı güncellenir. Uygulama kapalıyken Live
Activity'nin de güncellenmesi için iki yol var:

- **APNs push-to-activity**: `Activity.request(..., pushType: .token)` ile her
  aktivite için bir push token alın, sunucudan (mevcut cron altyapınız)
  APNs'e `content-state` güncellemesi gönderin. En doğru yöntem.
- **BGAppRefreshTask**: `app.tresh.refresh` kimliğiyle periyodik arka plan
  görevi planlayıp kuru çekin. iOS zamanlamayı kısıtlar, "canlı" olmaz ama
  aralıklı tazeler.

v1 ön-plan güncellemesiyle gelir; yukarıdakiler isteğe bağlı sonraki adımlardır.
