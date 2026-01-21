class ApplicationController < ActionController::API
	before_action :verify_service_secret

	private

	def verify_service_secret
		secret = request.headers['X-Service-Secret']

		unless secret == ENV['SERVICE_SECRET']
			render json: { error: 'Unauthorized' }, status: :unauthorized
		
		end
	end
end