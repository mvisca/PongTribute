workers 1
threads 2, 4

preload_app!

port ENV.fetch("PORT") { 3004 } #TODO test con .env IMAGE_PORT y levantar
environment ENV.fetch("RAILS_ENV") { "production" }