import os

from dotenv import load_dotenv
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .api import auth, routes
from .api.routes import limiter
from .db import models
from .db.database import engine, init_pgvector

load_dotenv()

# Enable pgvector extension and create all tables
init_pgvector()
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Document Agent API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Request size limiter middleware (15MB) to protect server resources
class LimitRequestSizeMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_size: int = 15 * 1024 * 1024):
        super().__init__(app)
        self.max_size = max_size

    async def dispatch(self, request, call_next):
        if request.method in ("POST", "PUT", "PATCH"):
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    if int(content_length) > self.max_size:
                        return Response(
                            content='{"detail": "Request payload too large"}',
                            status_code=413,
                            media_type="application/json"
                        )
                except ValueError:
                    return Response(
                        content='{"detail": "Invalid content length"}',
                        status_code=400,
                        media_type="application/json"
                    )
        return await call_next(request)

app.add_middleware(LimitRequestSizeMiddleware, max_size=15 * 1024 * 1024)

# Session middleware is required by Authlib for OAuth state management
SESSION_SECRET = os.getenv("SESSION_SECRET", "smart-agent-session-default-dev-secret-key-change-me")
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)

# Configure CORS — credentials=True is required for HttpOnly cookies
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
# Support comma-separated list of origins
cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
if not cors_origins:
    cors_origins = [frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(routes.router)


@app.get("/")
def read_root():
    return {
        "message": "Smart Document Agent API is running. Check docs for the Swagger UI."
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "Smart Document Agent API"
    }

