"""
Dependencies module.

Reusable FastAPI dependencies for authentication and database access.
These are injected into route handlers using FastAPI's Depends().
"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.repositories.user_repository import UserRepository

# Security scheme for Swagger UI "Authorize" button
# Automatically adds an "Authorization: Bearer <token>" header
security_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency that extracts and validates the JWT token,
    then returns the authenticated user.
    
    Usage:
        @app.get("/users/me")
        def get_me(user: User = Depends(get_current_user)):
            return user
    
    Args:
        credentials: The Authorization header (Bearer token)
        db: Database session
        
    Returns:
        The authenticated User object
        
    Raises:
        HTTPException 401: If token is missing, invalid, or user not found
    """
    token = credentials.credentials
    
    # Decode and verify the JWT token
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract user ID from token payload
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    # Fetch the user from database
    user_repo = UserRepository(db)
    user = user_repo.get(int(user_id))
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)  # Don't raise error if no token
    ),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Dependency that returns the current user if authenticated,
    or None if no token is provided.
    
    Used for endpoints that work differently for logged-in vs anonymous users.
    
    Usage:
        @app.get("/public/issues")
        def list_issues(user: Optional[User] = Depends(get_optional_user)):
            ...
    """
    if credentials is None:
        return None
    
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that ensures the current user has admin role.
    
    Usage:
        @app.get("/admin/dashboard")
        def admin_dashboard(user: User = Depends(require_admin)):
            ...
    
    Raises:
        HTTPException 403: If user is not an admin
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user