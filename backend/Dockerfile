# ==============================================================================
# Production Dockerfile for Smart Attendance AI Backend
# Lightweight prebuilt OpenCV + FastAPI runtime (512MB-RAM & Fast Cold-Start Ready)
# ==============================================================================

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install minimal runtime shared libraries required by opencv-python-headless & healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root unprivileged service account
RUN useradd -m -u 1000 -s /bin/bash appuser

WORKDIR /app

# Install prebuilt cloud Python dependencies (avoids slow/OOM dlib C++ compilation)
COPY requirements-cloud.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-cloud.txt

# Copy backend application code
COPY --chown=appuser:appuser . .

# Create writable runtime data directory for SQLite/uploads if needed
RUN mkdir -p /app/archives /app/uploads && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 8000

# Dynamic port healthcheck (Render injects $PORT, defaults to 8000 locally)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD sh -c "curl -f http://localhost:${PORT:-8000}/health || exit 1"

# Launch uvicorn ASGI production server bound to dynamic cloud $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
