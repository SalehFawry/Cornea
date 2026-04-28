"""FastAPI application entry-point.

Exposes all routes under the /api/v1 prefix, wires up CORS for the Nginx
reverse proxy, and instruments Prometheus metrics via
prometheus_fastapi_instrumentator.
"""

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from .config import get_settings
from .database import engine
from .routers import (
    alerts_router,
    attendance_router,
    branches_router,
    cash_door_router,
    customers_router,
    health_router,
    shutter_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

_settings = get_settings()

# ------------------------------------------------------------------ #
# Lifespan: verify DB reachability at startup; dispose engine at shutdown
# ------------------------------------------------------------------ #


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # NOTE: Table creation is intentionally disabled.
    # All tables already exist in the AIUSER Oracle schema and are managed
    # exclusively by the DBA.  Calling Base.metadata.create_all() here would
    # risk permission errors and unintended DDL locking on production.
    #
    #   ✗  DO NOT uncomment:
    #      async with engine.begin() as conn:
    #          await conn.run_sync(Base.metadata.create_all)

    # Lightweight connection test to surface misconfigurations early.
    try:
        from sqlalchemy import literal, select

        async with engine.connect() as conn:
            # select(literal(1)) compiles to "SELECT 1 FROM DUAL" on Oracle
            # and "SELECT 1" on every other dialect — no raw SQL needed.
            await conn.execute(select(literal(1)))
    except Exception as exc:  # noqa: BLE001
        import logging

        logging.getLogger(__name__).warning(
            "Database connectivity check failed at startup: %s", exc
        )
    yield
    await engine.dispose()


# ------------------------------------------------------------------ #
# Application factory
# ------------------------------------------------------------------ #

app = FastAPI(
    title="Cornea Central API",
    description=(
        "Computer-vision surveillance orchestration layer. "
        "Accepts data from CVPC nodes and serves the React dashboard."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
)

# ------------------------------------------------------------------ #
# CORS — allow the Nginx-fronted origin and localhost for dev
# ------------------------------------------------------------------ #

_raw_origins = _settings.cors_origins
_allow_origins: list[str] = (
    ["*"]
    if _raw_origins.strip() == "*"
    else [o.strip() for o in _raw_origins.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------ #
# Request logging middleware
# ------------------------------------------------------------------ #

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming HTTP requests and their responses."""
    start_time = time.time()
    client_host = request.client.host if request.client else "unknown"

    # Log incoming request
    logger.info(
        "→ INCOMING | %s %s | Client: %s",
        request.method,
        request.url.path,
        client_host,
    )

    response = await call_next(request)

    # Calculate duration
    duration = time.time() - start_time

    # Log outgoing response
    logger.info(
        "← OUTGOING | %s %s | Status: %d | Duration: %.3fs",
        request.method,
        request.url.path,
        response.status_code,
        duration,
    )

    return response

# ------------------------------------------------------------------ #
# Prometheus instrumentation — exposes /metrics
# ------------------------------------------------------------------ #

Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=False,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/health", "/ready", "/metrics"],
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

# ------------------------------------------------------------------ #
# Routers
# ------------------------------------------------------------------ #

_PREFIX = "/api/v1"

app.include_router(health_router)           # /health, /ready  (no versioned prefix)
app.include_router(branches_router, prefix=_PREFIX)
app.include_router(attendance_router, prefix=_PREFIX)
app.include_router(customers_router, prefix=_PREFIX)
app.include_router(shutter_router, prefix=_PREFIX)
app.include_router(cash_door_router, prefix=_PREFIX)
app.include_router(alerts_router, prefix=_PREFIX)
