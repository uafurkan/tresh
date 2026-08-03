# App Store Yayına Alma — Hazırlık Notları

Bu dosya, App Store Connect'e girilecek metinleri ve teknik ayarları tek yerde
toplar. Hesap/ödeme adımı en sona bırakıldı; buradaki her şey o adımdan
önce hazırlanabilir.

## 1. Uygulama kimliği

- Bundle ID: `com.tresh.app` (widget extension: `com.tresh.app.widget`)
- Apple Developer portalında **Identifiers** altında bu iki App ID'nin
  kaydedilmesi gerekiyor (hesap açıldıktan sonra, EAS bunu `eas build`
  sırasında interaktif olarak da yapabilir).
- SKU (App Store Connect'in istediği, kullanıcıya görünmeyen iç kod): `tresh-ios-001` (öneri, istersen değiştir)

## 2. app.json / eas.json durumu

- `app.json` → `ios.bundleIdentifier`, ikon, Live Activities izin metni zaten
  tanımlı. Eksik olan tek alan `ios.appleTeamId` — bu değer sadece Apple
  Developer hesabı açıldıktan sonra developer.apple.com/account'ta
  **Membership Details** sayfasında görünür (10 karakterlik bir kod, örn.
  `AB12CD34EF`). Öğrenince tek satırlık bir ekleme.
- `eas.json` → `submit.production` şu an boş `{}`; `eas submit` ilk
  çalıştırıldığında Apple ID, App Store Connect App ID (ASC App ID) ve Team
  ID'yi interaktif soracak ve credentials.json'a (repoya girmez) kaydedecek.
  İstersen bu üçünü submit.production içine sabitleyip her seferinde
  sorulmasını engelleyebiliriz — hesap açılınca ekleriz.
- `eas.json` → `build.production.autoIncrement: true` zaten build number'ı
  otomatik artırıyor, elle takip gerekmiyor.

## 3. App Store Connect metadata (taslak)

### İngilizce (birincil dil)
- **App Name**: Tresh
- **Subtitle** (30 karakter sınırı): `Currency threshold alerts`
- **Promotional text** (170 karakter, istediğin zaman güncellenebilir):
  `Pick a pair and a limit — get a push notification the instant the rate crosses it, even with the app closed.`
- **Description**:
  ```
  Tell me when it hits my number — I don't want to babysit charts.

  Tresh watches a live exchange rate for you and sends a push notification
  the moment it crosses the level you care about, even when the app is
  closed.

  • Pick any currency or crypto pair
  • Drag a threshold to the level that matters to you
  • Get notified above or below — instantly, in the background
  • See the live rate as a simple water-level readout, not a wall of charts
  • Keep a history of every alert that fired
  • Quick built-in converter for one-off conversions

  No noise, no charts to babysit — just the one number you're waiting for.
  ```
- **Keywords** (100 karakter, virgülle ayrılmış, boşluksuz):
  `currency,exchange rate,alert,forex,crypto,price alert,usd,try,threshold,notification`
- **Support URL**: `https://treshapp.vercel.app/support` (böyle bir sayfa
  yoksa web app'e eklenmesi lazım — aşağıda not var)
- **Marketing URL** (opsiyonel): `https://treshapp.vercel.app`
- **Privacy Policy URL**: `https://treshapp.vercel.app/privacy` (canlı,
  doğrulandı — aşağıda TR karşılığı da var)

### Türkçe (yerelleştirme)
- **Subtitle**: `Döviz eşik alarmı`
- **Promotional text**: `Bir parite ve limit seç, kur o seviyeyi geçtiğinde — uygulama kapalıyken bile — anında bildirim al.`
- **Description**:
  ```
  Sayım tutunca haber ver — grafiğe dadanmak istemiyorum.

  Tresh, senin yerine canlı kuru izler ve önemsediğin seviyeyi geçtiği an
  — uygulama kapalı olsa bile — push bildirimi gönderir.

  • İstediğin döviz veya kripto paritesini seç
  • Şamandırayı önemsediğin seviyeye sürükle
  • Üstüne çıkınca veya altına düşünce anında haber al
  • Canlı kuru karmaşık grafikler yerine basit bir su seviyesi olarak gör
  • Tetiklenen her uyarının geçmişini tut
  • Hızlı dahili çevirici ile anlık hesaplama yap

  Gürültü yok, izlenecek grafik yok — sadece beklediğin o tek sayı.
  ```
- **Keywords**: `döviz,kur,alarm,parite,kripto,fiyat alarmi,usd,try,esik,bildirim`

### Kategori / yaş / diğer
- **Primary Category**: Finance
- **Secondary Category** (opsiyonel): Utilities
- **Age Rating**: 4+ (finansal veri gösterimi dışında hassas içerik yok —
  App Store Connect'teki yaş anketi doldurulurken "Unrestricted Web Access",
  "Gambling" vb. tüm sorulara "No" denebilir)
- **Copyright**: `2026 Furkan Halıkçı` (veya şirket adın neyse)

## 4. Ekran görüntüleri

Apple şu an zorunlu olarak **6.9" (iPhone 16 Pro Max, 1320×2868)** ve
**6.5" veya 6.3"** boy ekran görüntüsü istiyor (diğer boylar bunlardan
otomatik ölçeklenebiliyor, App Store Connect'te "Generate from largest
size" seçeneği var).

Daha önce paylaştığın IMG_1194/1195/1196/1197/1198 görüntüleri tam olarak
1320×2868 — yani 6.9" gereksinimine birebir uyuyor. Bunları doğrudan
kullanabiliriz, tek şart: içeriğin App Store'a yüklenecek SON sürümle
(bugünkü hairline çizgi + header düzeltmesiyle) çekilmiş olması. Yükleme
öncesi 3-5 ekran (ana ekran, eşik belirle, bildirimler, çevirici) taze
çekip birlikte seçelim.

## 5. Eksik / kararlaştırılması gereken

- [ ] Support URL için web app'te bir `/support` sayfası yok — basit bir
      iletişim/SSS sayfası mı ekleyelim, yoksa doğrudan mail adresi mi
      (örn. `mailto:destek@tresh.app`) kullanalım?
- [ ] Copyright satırındaki isim/şirket adı teyit edilmeli.
- [ ] SKU önerisi (`tresh-ios-001`) onaylanmalı veya değiştirilmeli.
- [ ] Taze ekran görüntüleri (madde 4).
- [x] ~~Privacy Policy URL canlı değil~~ — düzeltildi: yanlış domain test
      edilmişti (`tresh.vercel.app` diye boş bir adres). Doğru domain
      `treshapp.vercel.app`, `/privacy` ve `/tr/privacy` canlı ve 200
      dönüyor, doğrulandı.

## 6. Başvuru öncesi otomatik uygunluk kontrolleri (yapıldı)

- `npx expo-doctor` çalıştırıldı: 18 kontrolden 17'si geçti. Tek uyarı,
  monorepo (pnpm workspaces) için kasıtlı özelleştirilmiş
  `metro.config.js`'teki `watchFolders`/`unstable_enableSymlinks`
  ayarlarıyla ilgili — App Store reddiyle alakası yok, göz ardı edilebilir.
- `app.json` → `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` eklendi.
  Bu olmadan `eas submit` her seferinde "uygulaman şifreleme kullanıyor mu"
  sorusunu interaktif soruyor; uygulama sadece standart HTTPS kullandığı
  (özel/ek şifreleme yok) için `false` doğru cevap ve artık otomatik.
- App ikonu 1024×1024, alfa kanalsız (RGB) — Apple'ın icon şartına uygun.
  Not: ikon zaten köşeleri yuvarlatılmamış kare olmalı, öyle duruyor
  (Apple köşeleri kendi otomatik yuvarlıyor).
- Üçüncü parti analytics/reklam/tracking SDK'sı yok (Amplitude, Firebase,
  AdMob vb. aranmadı, bulunamadı) — App Tracking Transparency (ATT) izni
  gerekmiyor, `NSUserTrackingUsageDescription` eklemeye gerek yok.
- Kullanılan tek hassas API `expo-device` + `@react-native-async-storage`
  + `expo-notifications`; Expo SDK 54 (güncel) ile bu paketlerin kendi
  `PrivacyInfo.xcprivacy` dosyaları native build sırasında otomatik
  toplanıyor (Apple'ın 2024'ten beri zorunlu tuttuğu "required reason API"
  beyanı) — elle ekleme gerekmiyor.
- Uygulamada hesap oluşturma/giriş yok → Apple'ın "hesabını sildirmelisin"
  zorunluluğu (Guideline 5.1.1(v)) bu uygulama için geçerli değil.
- Guideline 4.2 ("sadece web sitesinin sarmalanmış hali") riski düşük:
  uygulamada native widget, Live Activity ve push bildirimleri gibi
  web'de olmayan gerçek native özellikler var.

### App Privacy anketi (App Store Connect'te doldurulacak) için rehber
Sunucuya giden tek veri: Expo push token + eşik listesi + dil tercihi
(`src/lib/push.ts`). Buna göre:
- **Veri türü**: Identifiers → "Device ID" (push token bu kapsama girer)
- **Kullanım amacı**: App Functionality (bildirim göndermek için)
- **Kullanıcıyla ilişkilendirme**: "Data Not Linked to You" seçilebilir —
  isim/e-posta/hesap yok, token tek başına kimliksiz.
- **Takip (Tracking)**: Hayır — reklam/analytics amaçlı üçüncü taraflarla
  paylaşım yok.

### Yükleme öncesi elle test edilmesi gerekenler (otomatik kontrol edilemez)
Bunlar App Store'un reddettiği en yaygın sebepler arasında ve gerçek
cihazda, gerçek bir build (Expo Go değil) ile test edilmeli:
- [ ] Push bildirim izni reddedilirse uygulama çökmüyor / anlamlı mesaj
      gösteriyor mu?
- [ ] İnternet olmadan (uçak modu) açılış çökme yok, anlamlı boş/hata
      durumu gösteriyor mu? (Apple incelemesi genelde bunu dener.)
- [ ] Live Activity / Dynamic Island gerçek cihazda (simülatörde tam
      çalışmaz) beklendiği gibi başlayıp bitiyor mu?
- [ ] Widget ana ekrana eklenip veri gösteriyor mu?
- [ ] Uygulama içinde yer tutucu ("lorem ipsum", "TODO", debug butonu vb.)
      metin kalmamış mı?
- [ ] İlk açılışta (fresh install, önceki veriler temizlenmiş) boş durum
      ekranları doğru görünüyor mu?
- [ ] Ekran görüntüleri gerçekten submit edilecek son build'den mi
      alınacak (madde 4)?

Bunların hepsi gerçek bir `eas build` çıktısı + fiziksel cihaz gerektiriyor;
şu an Expo Go preview ile test ediliyoruz, bu yüzden bu liste ilk
production build alındıktan hemen sonra çalıştırılmalı.

## 7. Hesap açıldıktan sonraki adımlar (sırayla)

1. developer.apple.com → Apple Developer Program'a kayıt (99$/yıl).
2. Onay genelde birkaç saat–1-2 gün sürer.
3. `appleTeamId`'yi `app.json`'a ekle.
4. `eas build --platform ios --profile production` — EAS ilk seferde Apple
   ID ile giriş isteyip sertifika/profil oluşturacak (interaktif, terminal
   üzerinden senin onayınla).
5. Build bitince `eas submit --platform ios --profile production` ile
   App Store Connect'e yükle.
6. App Store Connect'te yukarıdaki metadata + ekran görüntülerini gir,
   "Submit for Review" ile Apple incelemesine gönder.
