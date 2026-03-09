DC       = docker compose
ENV_FILE = .env

# Export host user UID/GID so compose runs containers as you (DB files owned by you, no sudo to delete).
UID := $(shell id -u)
GID := $(shell id -g)
export UID GID

USER_SERVICE_DB_PATH := $(shell grep -E '^USER_SERVICE_DB_PATH=' .env 2>/dev/null | sed 's/^USER_SERVICE_DB_PATH=//')
GAME_SERVICE_DB_PATH := $(shell grep -E '^GAME_SERVICE_DB_PATH=' .env 2>/dev/null | sed 's/^GAME_SERVICE_DB_PATH=//')

define check_running_and_up
	RUNNING=$$($(DC) ps -q 2>/dev/null | wc -l); \
	EXPECTED=$$($(DC) config --services 2>/dev/null | wc -l); \
	if [ "$$RUNNING" -ge "$$EXPECTED" ] && [ "$$EXPECTED" -gt 0 ]; then \
		echo "Stack is already running ($$RUNNING containers)."; \
	else \
		$(DC) $(1); \
	fi
endef

.PHONY: all help check-env build up up_build debug down clean fclean logs ps stop nuke env-export ensure-db-dirs open-browser re

all: up_build open-browser

help:
	@echo "Targets:"
	@echo "  make / make all   - Start stack (build + up). No-op if already running. Requires .env"
	@echo "  make build        - Build images only. Requires .env"
	@echo "  make up           - Start containers only (no build). No-op if already running. Requires .env"
	@echo "  make up_build     - Build and start. No-op if already running. Requires .env"
	@echo "  make debug        - Build and start in foreground (logs in terminal). Requires .env"
	@echo "  make down         - Stop and remove containers and network. Keeps images and volumes"
	@echo "  make clean        - Down + remove locally built images. Keeps volumes (data)"
	@echo "  make fclean       - Down + remove local images + remove volumes (full reset, data lost)"
	@echo "  make logs         - Follow compose logs. Requires .env"
	@echo "  make ps           - List compose containers. Requires .env"
	@echo "  make stop         - Stop containers (no remove). Use 'make up' to start again"
	@echo "  make nuke         - Remove DB files (from .env paths), then docker system prune -a -f --volumes. Requires .env"
	@echo "  make env-export   - Exports GUI to the father env with eval <dollar>(make env-export)"
	@echo "  make open-browser - Open http://localhost in your default browser"
	@echo "  make rebuild      - Force docker compose up -d --build (rebuild stack). Requires .env"
	@echo "  make re           - Rebuild stack (docker compose up -d --build) and open http://localhost in your default browser"
	
check-env:
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) is missing. Create your .env before running Docker, You can use .env.example as a template." && exit 1)

build: check-env
	@$(DC) build

ensure-db-dirs:
	@mkdir -p $(USER_SERVICE_DB_PATH)
	@mkdir -p $(GAME_SERVICE_DB_PATH)
	@chmod 755 $(USER_SERVICE_DB_PATH)
	@chmod 755 $(GAME_SERVICE_DB_PATH)

up: check-env ensure-db-dirs
	@$(call check_running_and_up,up -d)

up_build: check-env ensure-db-dirs
	@$(call check_running_and_up,up -d --build)

rebuild: check-env ensure-db-dirs
	@$(DC) up -d --build

re: rebuild open-browser


debug: check-env ensure-db-dirs
	@$(DC) up --build

down: 
	@$(DC) down

stop: check-env
	@$(DC) stop

nuke: check-env
	@echo "WARNING: All images, volumes, and DB files (from .env paths) will be deleted."
	@echo -n "Continue? [y/N] "; read -r answer; \
	if [ "$$answer" = "y" ] || [ "$$answer" = "Y" ]; then \
		if [ -n "$(USER_SERVICE_DB_PATH)" ]; then rm -f $(USER_SERVICE_DB_PATH)/*.db; fi; \
		if [ -n "$(GAME_SERVICE_DB_PATH)" ]; then rm -f $(GAME_SERVICE_DB_PATH)/*.db; fi; \
		$(DC) down -v 2>/dev/null || true; \
		docker system prune -a -f --volumes; \
		echo "Done."; \
	else \
		echo "Aborted."; \
		exit 1; \
	fi
	
clean: 
	@$(DC) down --rmi local

fclean: 
	@$(DC) down -v --rmi local

logs: check-env
	@$(DC) logs -f

ps: check-env
	@$(DC) ps

env-export:
	@echo "export GID=$(shell id -g)"

open-browser:
	@nohup xdg-open http://localhost >/dev/null 2>&1 </dev/null &