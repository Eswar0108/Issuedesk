"""
Security module.

Handles password hashing, JWT token creation and verification.
Uses bcrypt directly for password hashing and PyJWT for token management.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


# ── Password Hashing ────────────────────────────────────────
# Using bcrypt directly instead of passlib due to compatibility
# issues with Python 3.14


def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    
    Args:
        password: The plain-text password to hash
        
    Returns:
        The hashed password string as UTF-8 (safe to store in database)
    """
    # bcrypt requires bytes, hashpw returns bytes
    # A new salt is automatically generated each time
    password_bytes = password.encode('utf-8')
    hashed_bytes = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against a bcrypt hash.
    
    Args:
        plain_password: The password to check
        hashed_password: The stored hash to compare against
        
    Returns:
        True if the password matches, False otherwise
    """
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# ── JWT Token Management ────────────────────────────────────

def create_access_token(
    user_id: int,
    username: str,
    role: str = "user",
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token for a user.
    
    The token contains:
    - sub: The user ID (subject claim)
    - username: The username
    - role: The user's role
    - exp: Expiration timestamp
    - iat: Issued at timestamp
    
    Args:
        user_id: The user's database ID
        username: The user's username
        role: The user's role (default: "user")
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = {
        "sub": str(user_id),
        "username": username,
        "role": role,
    }
    
    # Set expiration
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode["exp"] = expire
    to_encode["iat"] = datetime.now(timezone.utc)
    
    # Encode the token
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT access token.
    
    Args:
        token: The JWT token to decode
        
    Returns:
        Dictionary with token payload if valid, None if invalid/expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def get_token_expiry_seconds() -> int:
    """
    Get the token expiry duration in seconds.
    
    Returns:
        Number of seconds until token expires
    """
    return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60