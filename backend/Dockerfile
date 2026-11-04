# ==============================================================================
# Multi-Stage Production Dockerfile for Smart Attendance AI Backend
# DPDP 2023 & Enterprise Security Hardened
# ==============================================================================

# Stage 1: Build & Compilation Stage
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /install

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt


# Stage 2: Minimal Runtime Stage
FROM python:3.11-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install only minimal runtime shared libraries (no build-essential or compilers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root unprivileged service account
RUN useradd -m -u 1000 -s /bin/bash appuser

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy backend application code
COPY --chown=appuser:appuser . .

# Create writable runtime data directory for SQLite/uploads if needed
RUN mkdir -p /app/archives /app/uploads && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 8000

# Healthcheck to monitor backend availability
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Launch uvicorn ASGI production server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
