/**
 * @bacons/apple-targets hedef tanımı — bu klasörü, ana Expo projesine
 * `npx expo prebuild` sırasında ayrı bir Widget Extension target'ı olarak
 * ekler (ActivityKit / Dynamic Island / Live Activity için gerekli).
 *
 * NOT: Bu paketin alan adları sürüm sürüm değişebiliyor — macOS'ta ilk
 * `npx expo prebuild` denemesinde hata alırsan, @bacons/apple-targets'ın
 * güncel README'sindeki örnekle bu dosyayı karşılaştır.
 * @type {import('@bacons/apple-targets').Config}
 */
module.exports = {
  type: 'widget',
  name: 'TreshWidget',
  deploymentTarget: '16.2',
  colors: {
    $accent: '#34E3D6',
  },
  frameworks: ['ActivityKit', 'WidgetKit', 'SwiftUI'],
};
