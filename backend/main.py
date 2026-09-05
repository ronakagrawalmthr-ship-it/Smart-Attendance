from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from routers import auth, students, attendance, management, portal
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import engine, Base

Base.metadata.create_all(bind=engine)


from fastapi.middleware.cors import CORSMiddleware

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Smart Face-Authentication Attendance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router)
app.include_router(auth.router, prefix="/api")
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(management.router)
app.include_router(portal.router)

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
