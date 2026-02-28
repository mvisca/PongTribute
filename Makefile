DC       = docker compose
ENV_FILE = .env

define check_running_and_up
	RUNNING=$$($(DC) ps -q 2>/dev/null | wc -l); \
	EXPECTED=$$($(DC) config --services 2>/dev/null | wc -l); \
	if [ "$$RUNNING" -ge "$$EXPECTED" ] && [ "$$EXPECTED" -gt 0 ]; then \
		echo "Stack is already running ($$RUNNING containers)."; \
	else \
		$(DC) $(1); \
	fi
endef

.PHONY: all help check-env build up up_build debug down clean fclean logs ps

all: up_build

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
	
check-env:
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) is missing. Create your .env before running Docker, You can use .env.example as a template." && exit 1)

build: check-env
	@$(DC) build

up: check-env
	@$(call check_running_and_up,up -d)

up_build: check-env
	@$(call check_running_and_up,up -d --build)

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