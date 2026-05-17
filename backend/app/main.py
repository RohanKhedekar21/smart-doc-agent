from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .api import auth, routes
from .db import models
from .db.database import engine, init_pgvector

# Enable pgvector extension and create all tables
init_pgvector()
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Document Agent API")

# Session middleware is required by Authlib for OAuth state management
app.add_middleware(SessionMiddleware, secret_key="smart-agent-session-secret")

# Configure CORS — credentials=True is required for HttpOnly cookies
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
