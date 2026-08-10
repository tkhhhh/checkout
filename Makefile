COMPOSE ?= docker compose

.PHONY: help
help:
	@echo "Targets:"
	@echo "  make env         Copy .env.example -> .env if missing"
	@echo "  make build       Build all images"
	@echo "  make up          Start the full stack (db + backend + storefront + admin)"
	@echo "  make down        Stop the stack"
	@echo "  make restart     Restart the stack"
	@echo "  make reset       Wipe volumes and rebuild the stack"
	@echo "  make logs        Tail logs for all services"
	@echo "  make ps          Show running containers"
	@echo "  make backend-sh  Shell into the backend container"
	@echo "  make db-sh       psql shell into the db"
	@echo "  make backend-test  Run backend Go tests"
	@echo "  make clean       Stop stack and remove volumes"

.PHONY: env
env:
	@test -f .env || cp .env.example .env

.PHONY: build
build:
	$(COMPOSE) build

.PHONY: up
up: env
	$(COMPOSE) up -d --build

.PHONY: down
down:
	$(COMPOSE) down

.PHONY: restart
restart: down up

.PHONY: reset
reset:
	$(COMPOSE) down -v --remove-orphans
	$(COMPOSE) up -d --build

.PHONY: logs
logs:
	$(COMPOSE) logs -f --tail=200

.PHONY: ps
ps:
	$(COMPOSE) ps

.PHONY: backend-sh
backend-sh:
	$(COMPOSE) exec backend sh

.PHONY: db-sh
db-sh:
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-checkout} -d $${POSTGRES_DB:-checkout}

.PHONY: backend-test
backend-test:
	cd backend && go test ./...

.PHONY: clean
clean:
	$(COMPOSE) down -v --remove-orphans
