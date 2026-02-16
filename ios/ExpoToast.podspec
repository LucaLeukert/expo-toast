require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))
repository = package['repository']
repo_url = repository.is_a?(Hash) ? repository['url'] : repository
repo_url = repo_url.to_s.sub(/\Agit\+/, '').sub(/\.git\z/, '')

Pod::Spec.new do |s|
  s.name           = 'ExpoToast'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage'] || repo_url
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.swift_version  = '5.9'
  s.source         = { git: repo_url }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
