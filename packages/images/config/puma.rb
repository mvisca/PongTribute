workers 1
threads 2, 4

preload_app!

port ENV.fetch("IMAGE_SERVICE_PORT") { 3004 }
environment ENV.fetch("RAILS_ENV") { "production" }