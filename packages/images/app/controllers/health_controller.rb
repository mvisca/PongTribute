class HealthController < ApplicationController
	skip_before_action :verify_service_secret

	def show
		render(
			status: :ok,
			json: {
				status: 'LA APP FUNCIONA OK!',
				service: 'IMAGES SERVICE',
				timestamp: Time.now.iso8601
			}
		) 
	end
end