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
	@echo "  make / make all   - up_build (requires .env, no-op if stack already running)"
	@echo "  make build        - docker compose build (requires .env)"
	@echo "  make up           - up -d only if stack is not already running (requires .env)"
	@echo "  make up_build     - up -d --build only if stack is not already running (requires .env)"
	@echo "  make debug        - docker compose up --build (no -d, requires .env)"
	@echo "  make down         - docker compose down"
	@echo "  make clean        - down --rmi local "
	@echo "  make fclean       - down -v --rmi local "
	@echo "  make logs         - docker compose logs -f (requires .env)"
	@echo "  make ps           - docker compose ps (requires .env)"

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