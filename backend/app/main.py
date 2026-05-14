from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import routes
from .db import models
from .db.database import engine

# Create SQLite tables automatically on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Document Agent API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)


@app.get("/")
def read_root():
    return {
        "message": "Smart Document Agent API is running. Check docs for the Swagger UI."
    }
