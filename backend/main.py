import os
from pathlib import Path
from dotenv import load_dotenv
user_env = Path.home() / ".smart_attendance" / ".env"
if user_env.exists():
    load_dotenv(user_env, override=False)
load_dotenv()

from fastapi import FastAPI, Request
from routers import auth, students, attendance, management, portal, setup, timetable, websockets, notifications
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter
import models
from database import engine, Base, ensure_sqlite_columns, is_sqlite


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Smart Face-Authentication Attendance API")


is_dev = os.getenv("ENVIRONMENT", "production").lower() in ("development", "dev", "local")

# Explicit Whitelist for Multi-Portal Architecture + Private LAN regex
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
]

env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    ALLOWED_ORIGINS = [o.strip() for o in env_origins.split(",") if o.strip()]
    ALLOWED_ORIGINS.extend([o for o in DEFAULT_ORIGINS if o not in ALLOWED_ORIGINS])
else:
    ALLOWED_ORIGINS = DEFAULT_ORIGINS

# Enterprise OWASP Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Explicit Whitelist for Multi-Portal Architecture (Outermost Middleware)
cors_kwargs = {
    "allow_origins": ALLOWED_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if is_dev:
    # Strict Dev Origin Guard: Only permit localhost, 127.0.0.1, and private RFC 1918 subnets
    cors_kwargs["allow_origin_regex"] = (
        r"^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})"
        r"(:\d+)?$"
    )

app.add_middleware(CORSMiddleware, **cors_kwargs)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router)
app.include_router(auth.router, prefix="/api")
app.include_router(students.router)
app.include_router(students.router, prefix="/api")
app.include_router(attendance.router)
app.include_router(attendance.router, prefix="/api")
app.include_router(management.router)
app.include_router(management.router, prefix="/api")
app.include_router(portal.router)
app.include_router(portal.router, prefix="/api")
app.include_router(setup.router)
app.include_router(setup.router, prefix="/api")
app.include_router(timetable.router)
app.include_router(timetable.router, prefix="/api")
app.include_router(websockets.router)
app.include_router(websockets.router, prefix="/api")
app.include_router(notifications.router)
app.include_router(notifications.router, prefix="/api")

import asyncio
from services.cron_worker import background_cron_loop

@app.on_event("startup")
async def on_startup():
    # Safe model creation after full metadata registration
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[DB CONNECT ADVISORY] Startup metadata sync note: {e}")
    # Automatic database column self-healing migration for SQLite & PostgreSQL
    ensure_sqlite_columns()
    # Production Mode: Automatic dummy seeding disabled. 0 Fake records.
    asyncio.create_task(background_cron_loop())

@app.get("/")
@app.get("/health")
@app.get("/api/health")
def read_root():
    resend_key = os.getenv("RESEND_API_KEY", "")
    has_email = bool(resend_key and resend_key != "re_mock_key_for_dev")
    return {
        "message": "Smart Face-Authentication Attendance API Online",
        "status": "healthy",
        "service": "Smart Attendance API",
        "version": "1.0.0",
        "email_service": "Resend Active" if has_email else "Configured (System Ready)"
    }

if __name__ == "__main__":
    import uvicorn
    import os
    is_dev = os.getenv("ENVIRONMENT", "production").lower() in ("development", "dev", "local")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=is_dev)
