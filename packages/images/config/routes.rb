Rails.application.routes.draw do
  # ========================================
  # PUBLIC ROUTES (sin auth)
  # ========================================
	get '/health', to: 'health#show'

	# ========================================
	# INTERNAL ROUTES (X-Service-Secret)
	# ========================================
	scope '/internal' do
		post '/upload', to: 'images#upload'
		delete '/delete', to: 'images#delete'
	end
end