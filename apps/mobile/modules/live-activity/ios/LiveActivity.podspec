require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'LiveActivity'
  s.version        = package['version']
  s.summary        = 'Tresh — Dynamic Island / Live Activity köprüsü (JS <-> ActivityKit).'
  s.author         = 'Tresh'
  s.homepage       = 'https://treshapp.vercel.app'
  # Ana uygulamayla aynı hedef (15.1) — ActivityKit 16.2+ çağrıları Swift
  # tarafında @available korumalarıyla runtime'da ayrılıyor. Pod'u 16.2'ye
  # sabitlemek eski iOS'larda framework yüklenmemesine yol açardı.
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '*.swift'
end
