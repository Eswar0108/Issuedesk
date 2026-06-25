"""
Auth endpoints module.

Handles user registration and login.
These are public endpoints (no authentication required).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService

# Router with no prefix — will be mounted at /api/v1/auth
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
    summary="Register a new user",
    description="""
    Create a new user account.
    
    Requirements:
    - Username: 3-50 characters, unique
    - Email: Valid email format, unique
    - Password: 8+ characters, must contain uppercase, lowercase, and number
    
    Returns the created user data (without password).
    """,
)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user account.
    
    Args:
        user_data: Registration details (username, email, password)
        db: Database session
        
    Returns:
        UserResponse with user data (no password)
        
    Raises:
        409 Conflict: If username or email already exists
    """
    auth_service = AuthService(db)
    return auth_service.register(user_data)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get access token",
    description="""
    Authenticate with username/email and password.
    
    Returns a JWT token that must be sent in the Authorization header
    for all authenticated requests.
    
    Format: Authorization: Bearer <token>
    """,
)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login and receive a JWT access token.
    
    Args:
        login_data: Login credentials (username_or_email, password)
        db: Database session
        
    Returns:
        TokenResponse with JWT access token
        
    Raises:
        401 Unauthorized: Invalid credentials
        403 Forbidden: Account deactivated
    """
    auth_service = AuthService(db)
    return auth_service.login(login_data)


@router.get(
    "/health",
    response_model=MessageResponse,
    summary="Health check",
    description="Simple health check endpoint to verify the API is running.",
)
def health_check():
    """Simple health check to verify the API is running."""
    return MessageResponse(message="IssueDesk API is running", detail="v1.0.0")