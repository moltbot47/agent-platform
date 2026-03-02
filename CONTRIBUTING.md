# Contributing to Agent Platform

Thank you for your interest in contributing to Agent Platform.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/agent-platform.git`
3. Follow the [Setup Guide](docs/SETUP.md) to configure your development environment
4. Create a feature branch: `git checkout -b feature/your-feature`

## Development Workflow

### Backend (Django)

```bash
cd backend
source ../venv/bin/activate

# Run tests before and after changes
python manage.py test -v2

# Run linter
ruff check .
```

### Frontend (React + TypeScript)

```bash
cd frontend

# Start dev server
npm run dev

# Type check
npm run build  # includes tsc
```

### Full Stack

```bash
make setup      # First-time setup
make test       # Run all tests
make backend-run   # Django on :8000
make frontend-dev  # Vite on :5173
```

## Code Style

### Python
- Follow PEP 8 (enforced by ruff)
- Type hints for function signatures
- Docstrings for modules, classes, and public functions
- Django model conventions: `Meta` class, `__str__`, proper `related_name`

### TypeScript
- Strict mode enabled
- Interface definitions in `src/types/`
- React hooks in `src/hooks/`
- API functions in `src/api/`

### Naming
- Python: `snake_case` for functions/variables, `PascalCase` for classes
- TypeScript: `camelCase` for functions/variables, `PascalCase` for components/types
- URLs: kebab-case (`/pipeline-runs/`)
- Event types: `snake_case` (`edge_gate`, `price_fetch`)

## Adding a New Event Type

1. Add the choice to `AgentEvent.EventType` in `backend/events/models.py`
2. Create and run migration: `python manage.py makemigrations && python manage.py migrate`
3. Add the type to `EventType` in `frontend/src/types/event.ts`
4. Add an icon mapping in `frontend/src/components/LiveEventFeed.tsx`
5. Write tests

## Adding a New API Endpoint

1. Add the view in the appropriate `views.py`
2. Add the URL pattern in `urls.py`
3. Write serializers if needed
4. Write tests
5. Update `docs/API.md`

## Pull Request Process

1. Ensure all tests pass: `make test`
2. Update documentation if needed
3. Write a clear PR description explaining what changed and why
4. Reference any related issues

## Registering an Agent

You can register your own agent via the platform:

```bash
curl -X POST http://localhost:8000/api/v1/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "display_name": "My Agent",
    "agent_type": "trading",
    "creator_name": "Your Name",
    "creator_email": "you@example.com"
  }'
```

Or use the Python SDK:

```python
from agent_platform import AgentClient

client = AgentClient(api_key="ak_your_key")
client.emit("signal", instrument="BTC-USD", payload={"direction": "long"})
```

## Questions?

Open an issue or reach out to [@moltbot47](https://github.com/moltbot47).
