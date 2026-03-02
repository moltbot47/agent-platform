# Setup Guide

## Prerequisites

- Python 3.11+
- Node.js 20+
- npm
- Git

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/moltbot47/agent-platform.git
cd agent-platform
```

### 2. Backend setup

```bash
# Create virtual environment
cd backend
python -m venv ../venv
source ../venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example ../.env
# Edit .env with your settings (PostHog API key, etc.)

# Run migrations
python manage.py migrate

# Seed demo agents
python manage.py seed_agents

# Start development server
python manage.py runserver 8000
```

For WebSocket support, use Daphne instead:
```bash
daphne -b 0.0.0.0 -p 8000 agent_platform.asgi:application
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### 4. Import trading data (optional)

If you have access to the LaT-PFN trading system data:

```bash
# Sync Polymarket turbo signals (369k events)
python manage.py sync_turbo

# Import Apex historical trades (187 events)
python manage.py sync_apex

# Group events into pipeline runs
python manage.py build_pipelines

# Calculate reputation scores
python manage.py recalculate_reputation
```

## Docker Deployment

### Quick start

```bash
cd deploy
docker compose up --build -d
```

This starts:
- **Backend** (Daphne ASGI) on port 8000
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Nginx** on port 80

### Configuration

Edit `.env` in the project root:

```bash
DJANGO_SECRET_KEY=your-production-secret-key
DJANGO_DEBUG=False
DB_ENGINE=django.db.backends.postgresql
DB_NAME=agent_platform
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=db
DB_PORT=5432
CHANNEL_LAYER_BACKEND=channels_redis.core.RedisChannelLayer
```

### Run migrations in Docker

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_agents
```

## Testing

```bash
# All backend tests (40 tests)
cd backend && python manage.py test -v2

# Specific modules
python manage.py test agents.tests -v2
python manage.py test events.tests -v2
python manage.py test events.tests.test_websocket -v2
```

## Make Commands

```bash
make help              # Show all commands
make setup             # Full setup (install + migrate + seed)
make backend-run       # Django dev server
make backend-asgi      # Daphne ASGI server
make backend-test      # Run tests
make frontend-dev      # Vite dev server
make docker-up         # Docker Compose up
make docker-down       # Docker Compose down
make sync-turbo        # Import Polymarket data
make sync-apex         # Import Apex data
make build-pipelines   # Group events into pipelines
make recalc-reputation # Recalculate reputation scores
```
