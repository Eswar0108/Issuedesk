"""
Auth service module.

Business logic for user authentication and registration.
Orchestrates between user repository and security utilities.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token, get_token_expiry_seconds


class AuthService:
    """
    Service handling authentication business logic.
    
    Responsibilities:
    - User registration with duplicate validation
    - Login with credential verification
    - JWT token generation
    """
    
    def __init__(self, db: Session):
        """Initialize with database session and repositories."""
        self.db = db
        self.user_repo = UserRepository(db)
    
    def register(self, user_data: UserCreate) -> UserResponse:
        """
        Register a new user.
        
        Validates that username and email are not taken,
        hashes the password, and creates the user.
        
        Args:
            user_data: Validated registration data
            
        Returns:
            UserResponse (without password)
            
        Raises:
            HTTPException 409: If username or email already exists
        """
        # Check if username is taken
        if self.user_repo.is_username_taken(user_data.username):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Username '{user_data.username}' is already registered"
            )
        
        # Check if email is taken
        if self.user_repo.is_email_taken(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists"
            )
        
        # Hash the password before storing (never store plain text!)
        hashed_password = hash_password(user_data.password)
        
        # Create user directly with pre-hashed password
        # We avoid using UserCreate schema here because its password validator
        # expects plain-text, but we already hashed it
        db_user = self.user_repo.model(
            username=user_data.username,
            email=user_data.email,
            password_hash=hashed_password,  # Store hash directly
            full_name=user_data.full_name
        )
        self.user_repo.db.add(db_user)
        self.user_repo.db.commit()
        self.user_repo.db.refresh(db_user)
        user = db_user
        
        # Return safe user data (no password_hash)
        return UserResponse.model_validate(user)
    
    def login(self, login_data: UserLogin) -> TokenResponse:
        """
        Authenticate a user and return a JWT token.
        
        Accepts either username or email as identifier.
        
        Args:
            login_data: Login credentials
            
        Returns:
            TokenResponse with JWT access token
            
        Raises:
            HTTPException 401: If credentials are invalid
            HTTPException 403: If account is deactivated
        """
        # Find user by username or email
        user = self.user_repo.get_by_username_or_email(
            login_data.username_or_email
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username/email or password"
            )
        
        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username/email or password"
            )
        
        # Check if account is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact administrator."
            )
        
        # Generate JWT token
        access_token = create_access_token(
            user_id=user.id,
            username=user.username,
            role=user.role
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=get_token_expiry_seconds()
        )