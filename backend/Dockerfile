# ─────────────────────────────────────────────────────────────────────────────
# Cornea — FastAPI Backend
# Base image: Python 3.11 slim (matches the system interpreter used in dev).
# python-oracledb 2+ runs in "Thin" mode, so no Oracle Client libraries needed.
# ─────────────────────────────────────────────────────────────────────────────
# python:3.11-slim matches the system interpreter (3.11) used on the host.
# The old Windows venv (venv/) is excluded via .dockerignore.
FROM python:3.11-slim

# Keeps Python output unbuffered so logs stream directly to Docker.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install dependencies before copying source so the layer is cached on
# unchanged requirements.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source.
COPY . .

EXPOSE 8000

# Run with a single Uvicorn worker per container; horizontal scaling is
# handled by running multiple containers behind the Nginx upstream.
CMD ["uvicorn", "central_api.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--log-level", "info"]
