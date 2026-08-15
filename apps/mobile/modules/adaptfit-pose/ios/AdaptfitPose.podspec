require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AdaptfitPose'
  s.version        = package['version']
  s.summary        = 'On-device pose angle tracker for AdaptFit'
  s.description    = 'Android MediaPipe pose view; iOS is a stub until the same native path ships.'
  s.author         = 'PeddieHacks26'
  s.homepage       = 'https://github.com/DeviDeviDeviKanumilli/PeddieHacks26'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.{h,m,mm,swift}'
end
