require_relative "boot"
require "rails/railtie"
require "action_controller/railtie"
require "active_support/railtie"

module Images
	class Application < Rails::Application
		config.load_defaults 7.1
		config.api_only = true
		config.eager_load = true
		config.cache_classes = true

		# Secret (Rails lo requiere aunque no lo usamos)
		config.secret_key_base = ENV.fetch("SECRET_KEY_BASE", "fake_secret_api_only_" + ("a" * 64))

		# Logger json
		config.logger = ActiveSupport::Logger.new(STDOUT)
		config.log_formatter = proc do |severity, time, progname, msg|
			JSON.dump({
				timestamp: time.iso8601,
				service: 'images',
				level: severity,
				message: msg
			})
		end

		# Limitar features no usadas
		config.action_controller.perform_caching = false
		config.active_support.report_deprecations = false
	end
end