# Google Play Yayına Alma — Hazırlık Notları

iOS'takinin Android karşılığı. Android Studio gerekmiyor — derleme EAS'in
bulut sunucularında yapılıyor, tek ihtiyacın `eas-cli` (zaten kurulu).
Google Play hesabı Apple'ın aksine onay beklemiyor, 25$ tek seferlik
ödemeyle anında aktif oluyor — istersen bunu en başta da açabiliriz, iOS'taki
gibi bir bekleme yok.

## 1. Uygulama kimliği

- Package name: `com.tresh.app` (`app.json` → `android.package`, zaten
  ayarlı, değiştirilemez bir kere yayınlanınca — şimdiden doğru olduğundan
  emin ol).
- Adaptive icon foreground: `assets/android-icon-foreground.png`, 512×512,
  RGBA — doğru boyutta, mevcut.

## 2. app.json / eas.json durumu

- `android.adaptiveIcon` ve `android.package` zaten tanımlı, ek bir şey
  gerekmiyor.
- `eas.json` → `build.production` zaten var, `autoIncrement: true` sayesinde
  `versionCode` otomatik artıyor (Play Store'un her yüklemede daha yüksek
  bir versionCode istemesi otomatik karşılanıyor).
- `eas.json` → `submit.production` şu an boş. Android'de `eas submit`
  otomasyonu için bir **Google Service Account JSON anahtarı** gerekiyor
  (`serviceAccountKeyPath`). Bu anahtar sadece Play Console hesabı açılıp
  uygulama kaydı oluşturulduktan SONRA, Google Cloud Console'da
  "Play Android Developer API" için bir servis hesabı oluşturup Play
  Console'da "Users and permissions"tan bu hesaba yetki vererek elde
  edilir — yani bu adım da hesap açılışına bağlı, ama Play tarafında bekleme
  yok, hesap aç aç bitsin.
- İmzalama (keystore): EAS "Managed Credentials" ile otomatik oluşturup
  kendi sunucusunda güvenli saklıyor — elle keystore oluşturmana,
  yedeklemene gerek yok.

## 3. Play Store Console listing metadata (taslak)

Web'deki mevcut çevirilerden (`packages/shared/src/i18n.ts`) türetildi,
App Store taslağıyla aynı kaynak.

### Türkçe (birincil dil olarak ayarlanabilir)
- **Uygulama adı**: Tresh
- **Kısa açıklama** (80 karakter sınırı):
  `Kur seviyeni belirle, geçtiğinde anında bildirim al.`
- **Tam açıklama**:
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

### İngilizce (ikincil dil)
- **Short description**: `Set your rate. Get notified the moment it crosses it.`
- **Full description**: App Store taslağıyla birebir aynı (bkz.
  `APP_STORE_SUBMISSION.md` madde 3).

### Kategori / diğer
- **Kategori**: Finans
- **İçerik derecelendirmesi**: Play Console'daki anket (IARC) doldurulacak
  — şiddet/hassas içerik yok, muhtemelen "3+ / Everyone" çıkar.
- **Gizlilik Politikası URL'i**: `https://treshapp.vercel.app/privacy`
  (canlı, doğrulandı).
- **İletişim e-postası**: Play Console zorunlu tutuyor, bir destek maili
  gerekiyor.

## 4. Görsel varlıklar — eksik olanlar

Play Store, App Store'dan farklı olarak birkaç ekstra grafik istiyor:

- [ ] **Feature graphic** (1024×500, zorunlu) — mağaza sayfasının en üstünde
      çıkan banner. Şu an yok, hazırlanması lazım (canvas-design ile
      oluşturabilirim, istersen şimdi yaparım).
- [ ] **Ekran görüntüleri** (en az 2, telefon için) — App Store için
      kullanacağımız 1320×2868 görüntüler Play Store'da da kabul ediliyor
      (min 320px – maks 3840px, 16:9–9:16 arası oran serbest).
- [ ] **Uygulama ikonu**: 512×512 PNG, 32-bit + alfa — `assets/icon.png`
      şu an 1024×1024 RGB (alfasız); Play Console yüklerken otomatik
      yeniden boyutlandırıyor ama Play'in kendi ikon şartı alfa kanallı
      512×512 istiyor, App Store'unkinden farklı bir dosya hazırlamak
      gerekebilir — yükleme sırasında Play Console hata verirse ayrıca
      512×512 RGBA bir kopya çıkarırım.

## 5. Eksik / kararlaştırılması gereken

- [x] ~~Privacy Policy URL canlı değil~~ — yanlış domain test edilmişti,
      doğrusu `treshapp.vercel.app/privacy`, canlı ve doğrulandı.
- [ ] Destek e-postası adresi.
- [ ] Feature graphic tasarımı (madde 4).

## 6. Başvuru öncesi elle test edilmesi gerekenler

- [ ] Android 13+ cihazda bildirim izni (runtime permission) doğru
      isteniyor mu, reddedilince çökme yok mu?
- [ ] Gerçek cihazda (veya Play Console'un "pre-launch report"unda) uçak
      modunda açılış çökmüyor mu?
- [ ] Widget/varsa ana ekrana ekleniyor mu?
- [ ] Fresh install'da boş durum ekranları doğru görünüyor mu?
- [ ] Geri tuşu (predictiveBackGestureEnabled: false ayarlı, davranışı
      test edilmeli) beklenmedik bir yerden çıkışa sebep olmuyor mu?

## 7. Hesap açıldıktan sonraki adımlar (sırayla)

1. play.google.com/console → Google Play Developer hesabı aç (25$, tek
   seferlik, kredi kartıyla anında).
2. Yeni uygulama oluştur, package name `com.tresh.app` gir.
3. Google Cloud Console'da servis hesabı oluştur, Play Console'da
   "Users and permissions" altında bu hesaba erişim ver, JSON anahtarını
   indir (repoya KESİNLİKLE commit edilmeyecek — `eas.json`'da
   `serviceAccountKeyPath` ile yerel bir dosya yoluna işaret edilecek).
4. `eas build --platform android --profile production` — `.aab` üretir.
5. `eas submit --platform android --profile production` — Play Console'a
   otomatik yükler, "Internal testing" kanalından başlaman önerilir.
6. Play Console'da mağaza metni, feature graphic, ekran görüntüleri,
   içerik derecelendirme anketi, gizlilik politikası linkini gir.
7. İç testten memnun kalınca "Production"a terfi ettir — Google'ın
   incelemesi genelde birkaç saat içinde sonuçlanır (Apple'dan çok daha
   hızlı).
