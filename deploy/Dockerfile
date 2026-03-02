# Multi-stage build for Agent Platform
# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend + static frontend
FROM python:3.12-slim AS production

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=agent_platform.settings
ENV STATIC_ROOT=/app/staticfiles

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy backend code
COPY backend/ ./

# Copy built frontend into Django static directory
COPY --from=frontend-build /app/frontend/dist ./frontend_dist

# Create staticfiles directory and collect static files
RUN mkdir -p /app/staticfiles \
    && python manage.py collectstatic --noinput

# Create non-root user and set ownership
RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app /app/staticfiles
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/')" || exit 1

# Start script: migrate, seed, then run Daphne
CMD ["sh", "-c", "echo 'Starting on port ${PORT:-8000}...' && python manage.py migrate --noinput && python manage.py seed_agents 2>/dev/null; exec daphne -b 0.0.0.0 -p ${PORT:-8000} agent_platform.asgi:application"]
