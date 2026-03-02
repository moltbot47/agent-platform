.PHONY: help dev backend-run backend-test backend-lint backend-migrate frontend-dev frontend-test frontend-build sync-turbo sync-apex docker-build docker-up docker-down

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Backend ---
backend-install: ## Install backend dependencies
	cd backend && pip install -r requirements.txt

backend-migrate: ## Run Django migrations
	cd backend && python manage.py migrate

backend-run: ## Start Django dev server (port 8000)
	cd backend && python manage.py runserver 8000

backend-asgi: ## Start Daphne ASGI server (WebSocket support)
	cd backend && daphne -b 0.0.0.0 -p 8000 agent_platform.asgi:application

backend-test: ## Run backend tests
	cd backend && python manage.py test -v2

backend-lint: ## Lint backend with ruff
	cd backend && ruff check .

backend-seed: ## Seed initial agents
	cd backend && python manage.py seed_agents

# --- Frontend ---
frontend-install: ## Install frontend dependencies
	cd frontend && npm install

frontend-dev: ## Start Vite dev server (port 5173)
	cd frontend && npm run dev

frontend-test: ## Run frontend tests
	cd frontend && npm test

frontend-build: ## Build frontend for production
	cd frontend && npm run build

# --- Bridge ---
sync-turbo: ## Sync Polymarket turbo data from trading system
	cd backend && python manage.py sync_turbo

sync-apex: ## Import Apex historical trades
	cd backend && python manage.py sync_apex

build-pipelines: ## Group events into pipeline runs
	cd backend && python manage.py build_pipelines

recalc-reputation: ## Recalculate reputation scores for all agents
	cd backend && python manage.py recalculate_reputation

# --- Docker ---
docker-build: ## Build Docker images
	cd deploy && docker compose build

docker-up: ## Start all services (detached)
	cd deploy && docker compose up -d

docker-down: ## Stop all services
	cd deploy && docker compose down

docker-logs: ## Tail service logs
	cd deploy && docker compose logs -f

# --- Full stack ---
dev: ## Run backend + frontend concurrently
	@echo "Start backend: make backend-run (or make backend-asgi for WebSockets)"
	@echo "Start frontend: make frontend-dev"

test: ## Run all tests
	$(MAKE) backend-test

setup: ## Full setup (install + migrate + seed)
	$(MAKE) backend-install
	$(MAKE) backend-migrate
	$(MAKE) backend-seed
	$(MAKE) frontend-install
