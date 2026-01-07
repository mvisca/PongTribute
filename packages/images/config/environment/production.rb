require "active_support/core_ext/integer/time"

Rails.application.configure do
	config.cache_classes = true
	config.eager_load = true
	config.consider_all_requests_local = false
	config.public_file_server.enabled = false
	config.log_level = :info
	config.i18n.fallbacks = true
	config.active_support.report_deprecations = false
end