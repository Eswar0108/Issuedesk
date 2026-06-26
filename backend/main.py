"""
IssueDesk API - Main Application Entry Point

A production-grade issue tracking API built with FastAPI.

Run with:
    uvicorn main:app --reload
    
Or:
    python main.py
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router


# ── Database Migrations ─────────────────────────────────────
# In development, run: alembic upgrade head
# This creates all tables defined in models/ if they don't exist.
# Base.metadata.create_all(bind=engine)  # Dev-only fallback


# ── Create FastAPI App ──────────────────────────────────────
app = FastAPI(
    title="IssueDesk API",
    description="""
    A production-grade issue tracking API.
    
    Features:
    - User authentication with JWT tokens
    - Project management with team members
    - Issue tracking with status workflow
    - Comments and discussions
    - Advanced filtering and search
    - Paginated responses
    """,
    version="1.0.0",
    docs_url="/docs",      # Swagger UI at /docs
    redoc_url="/redoc",    # ReDoc at /redoc
)


# ── CORS Middleware ──────────────────────────────────────────
# Allows frontend applications to access the API from different origins.
# In development, this allows your React/Vue frontend to call the API.
cors_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:5177",
    "http://127.0.0.1:8000",
]

if settings.CORS_ORIGINS:
    extra_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    cors_origins.extend(extra_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register API Routes ─────────────────────────────────────
app.include_router(api_router)


# ── Serve Uploaded Files as Static Assets ───────────────────
# Files accessible at: GET /uploads/<entity_type>/<entity_id>/<filename>
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ── Request Validation Error Handler ────────────────────────
logger = logging.getLogger("uvicorn.error")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    logger.error(f"Validation error for {request.method} {request.url}: {errors}")
    return JSONResponse(
        status_code=status_code if (status_code := getattr(exc, "status_code", 422)) else 422,
        content={"detail": errors}
    )


# ── Root Endpoint ───────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    """
    Root endpoint with API information.
    """
    return {
        "name": "IssueDesk API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/auth/health",
    }


# ── Run Directly (for development) ──────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8008,
        reload=True
    )