DC       = docker compose
ENV_FILE = .env

.PHONY: all help check-env build up debug down clean fclean logs ps

all: up

help:
	@echo "Targets:"
	@echo "  make / make all   - up (requiere .env)"
	@echo "  make build        - docker compose build (requiere .env)"
	@echo "  make up           - docker compose up -d --build (requiere .env)"
	@echo "  make debug        - docker compose up --build (sin -d, requiere .env)"
	@echo "  make down         - docker compose down"
	@echo "  make clean        - down --rmi local "
	@echo "  make fclean       - down -v --rmi local "
	@echo "  make logs         - docker compose logs -f (requiere .env)"
	@echo "  make ps           - docker compose ps (requiere .env)"

check-env:
	@test -f "$(ENV_FILE)" || (echo "Error: falta $(ENV_FILE). Crea tu .env antes de ejecutar Docker." && exit 1)

build: check-env
	@$(DC) build

up: check-env
	@$(DC) up -d --build

debug: check-env
	@$(DC) up --build

down:
	@$(DC) down

clean: 
	@$(DC) down --rmi local

fclean: 
	@$(DC) down -v --rmi local

logs: check-env
	@$(DC) logs -f

ps: check-env
	@$(DC) ps