require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'LiveActivity'
  s.version        = package['version']
  s.summary        = 'Tresh — Dynamic Island / Live Activity köprüsü (JS <-> ActivityKit).'
  s.author         = 'Tresh'
  s.homepage       = 'https://treshapp.vercel.app'
  s.platforms      = { :ios => '16.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '*.swift'
end
