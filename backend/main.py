from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from routers import auth, students, attendance, management, portal, setup, timetable
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import engine, Base

Base.metadata.create_all(bind=engine)


from fastapi.middleware.cors import CORSMiddleware

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Smart Face-Authentication Attendance API")

# Explicit Whitelist for Multi-Portal Architecture + Private LAN regex
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
]

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

# Explicit Whitelist for Multi-Portal Architecture + Private LAN regex (Outermost Middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

import asyncio
from services.cron_worker import background_cron_loop

@app.on_event("startup")
async def on_startup():
    asyncio.create_task(background_cron_loop())

@app.get("/")
@app.get("/health")
@app.get("/api/health")
def read_root():
    return {
        "message": "Smart Face-Authentication Attendance API Online",
        "status": "healthy",
        "service": "Smart Attendance API",
        "version": "1.0.0",
        "email_service": "Resend Active"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
