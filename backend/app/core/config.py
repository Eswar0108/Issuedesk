"""
Application configuration module.

Loads and validates environment variables using Pydantic Settings.
This is the single source of truth for all configuration values.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All values can be overridden via .env file (for local development)
    or actual environment variables (for production/docker).
    
    Pydantic automatically:
    - Reads from .env file (specified in Config class)
    - Validates types (e.g., int for ACCESS_TOKEN_EXPIRE_MINUTES)
    - Provides default values where specified
    - Raises clear errors if required fields are missing
    """
    
    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str
    """
    PostgreSQL connection string.
    Format: postgresql://user:password@host:port/database
    """
    
    # ── Security ──────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production"
    """
    Secret key for JWT token signing.
    In production, generate with: openssl rand -hex 32
    """
    
    ALGORITHM: str = "HS256"
    """JWT encryption algorithm. HS256 is the industry standard."""
    
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    """How long JWT tokens remain valid (in minutes)."""
    
    class Config:
        """
        Pydantic settings configuration.
        
        env_file: Path to .env file relative to the project root.
                  When running from backend/, this reads backend/.env
        """
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton instance - import this everywhere instead of creating new instances
settings = Settings()