"""
API v1 router module.

Aggregates all endpoint routers under a single /api/v1 prefix.
This is imported by main.py to register all routes.
"""

from fastapi import APIRouter

# Create the main v1 router
api_router = APIRouter(prefix="/api/v1")


# ── Helper function to register endpoint routers ────────────
# Each endpoint file creates its own router with a specific prefix.
# We import them here and include them under the v1 router.

def register_routers():
    """Import and register all endpoint routers."""
    from app.api.v1.endpoints import auth, users, projects, issues, comments
    
    api_router.include_router(auth.router)
    api_router.include_router(users.router)
    api_router.include_router(projects.router)
    api_router.include_router(issues.router)
    api_router.include_router(comments.router)


# Register all routers when this module is imported
register_routers()