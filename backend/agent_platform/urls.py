"""Agent Platform URL configuration."""

import os

from django.contrib import admin
from django.db import connection
from django.http import FileResponse, Http404, JsonResponse
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health_check(request):
    """Liveness + basic DB probe."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "ok"})
    except Exception as exc:
        return JsonResponse({"status": "error", "detail": str(exc)}, status=503)


def metrics_view(request):
    """In-process request metrics (Prometheus-compatible JSON)."""
    from core.middleware import request_metrics

    return JsonResponse(request_metrics.snapshot())


# --- SPA serving for production builds ---
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend_dist")


def serve_frontend(request, path=""):
    """Serve the React SPA. Falls back to index.html for client-side routing."""
    if path:
        file_path = os.path.join(FRONTEND_DIR, path)
        if os.path.isfile(file_path):
            return FileResponse(open(file_path, "rb"))
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(open(index_path, "rb"), content_type="text/html")
    raise Http404("Frontend not built. Run: cd frontend && npm run build")


urlpatterns = [
    path("health/", health_check, name="health"),
    path("metrics/", metrics_view, name="metrics"),
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/", include("agents.urls")),
    path("api/v1/", include("events.urls")),
    # OpenAPI docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # SPA catch-all (must be last)
    re_path(r"^(?P<path>.*)$", serve_frontend, name="frontend"),
]
