require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'NetworkCache'
  s.version        = package['version']
  s.summary        = 'Expo module to clear HSTS and network cache on iOS'
  s.description    = 'Native module that clears URLSession HSTS cache and cookies'
  s.author         = 'Internxt'
  s.homepage       = 'https://internxt.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.swift'
end
