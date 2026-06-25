"""
User schemas module.

Pydantic models for user-related API operations.
Defines what data is required (Create), optional (Update), and returned (Response).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Base User Schema ────────────────────────────────────────
class UserBase(BaseModel):
    """
    Shared user fields used across multiple schemas.
    
    DRY principle: Common fields defined once, inherited by others.
    """
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Unique username for login, 3-50 characters"
    )
    
    email: EmailStr = Field(
        ...,
        description="Valid email address"
    )
    
    full_name: Optional[str] = Field(
        None,
        max_length=100,
        description="Display name (optional)"
    )


# ── Create User (POST /users/) ──────────────────────────────
class UserCreate(UserBase):
    """
    Schema for user registration.
    
    Required fields: username, email, password
    Password is validated client-side before reaching the service.
    """
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password, 8-128 characters"
    )
    
    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        """
        Validate password meets minimum strength requirements.
        
        Args:
            value: The password to validate
            
        Returns:
            The validated password
            
        Raises:
            ValueError: If password doesn't meet requirements
        """
        if not any(char.isupper() for char in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must contain at least one number")
        return value


# ── Update User (PUT/PATCH /users/{id}) ─────────────────────
class UserUpdate(BaseModel):
    """
    Schema for updating user profile.
    
    All fields are optional — only send what needs to change.
    Partial updates allow clients to update single fields.
    """
    email: Optional[EmailStr] = Field(
        None,
        description="New email address"
    )
    
    full_name: Optional[str] = Field(
        None,
        max_length=100,
        description="New display name"
    )


# ── Login (POST /auth/login) ────────────────────────────────
class UserLogin(BaseModel):
    """
    Schema for user login.
    
    Accepts either username or email as identifier.
    """
    username_or_email: str = Field(
        ...,
        description="Username or email address for login"
    )
    
    password: str = Field(
        ...,
        description="User's password"
    )


# ── Token Response (POST /auth/login response) ──────────────
class TokenResponse(BaseModel):
    """
    Schema returned after successful authentication.
    
    The client stores this token and sends it with every request
    in the Authorization header.
    """
    access_token: str = Field(
        ...,
        description="JWT access token for authenticating requests"
    )
    
    token_type: str = Field(
        default="bearer",
        description="Token type (always 'bearer' for JWT)"
    )
    
    expires_in: int = Field(
        ...,
        description="Token expiry in seconds"
    )


# ── User Response (What the API returns) ────────────────────
class UserResponse(UserBase):
    """
    Schema for user data returned to clients.
    
    IMPORTANT: Never includes password_hash!
    This is the security boundary between the database and the API.
    """
    id: int = Field(..., description="Unique user identifier")
    
    role: str = Field(
        ...,
        description="User role for authorization (user or admin)"
    )
    
    is_active: bool = Field(
        ...,
        description="Whether the user account is active"
    )
    
    created_at: datetime = Field(
        ...,
        description="Account creation timestamp"
    )
    
    updated_at: datetime = Field(
        ...,
        description="Last profile update timestamp"
    )
    
    model_config = {
        "from_attributes": True
        # Tells Pydantic to read data from SQLAlchemy model attributes
        # Allows: UserResponse.model_validate(db_user_object)
    }


# ── User List Item (For paginated lists) ────────────────────
class UserListItem(BaseModel):
    """
    Compact user info for list views.
    
    Shows less detail than full UserResponse for performance
    when displaying many users (e.g., in assignee dropdowns).
    """
    id: int
    username: str
    full_name: Optional[str] = None
    
    model_config = {
        "from_attributes": True
    }