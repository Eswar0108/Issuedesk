"""
Application configuration module.

Loads and validates environment variables using Pydantic Settings.
This is the single source of truth for all configuration values.
"""

from typing import Optional
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

    # ── Gemini API ────────────────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None
    """
    API key for Google Gemini model inference.
    Can be obtained for free from Google AI Studio.
    """

    # ── OpenAI API ────────────────────────────────────────────
    OPENAI_API_KEY: Optional[str] = None
    """
    API key for OpenAI model inference.
    Required if LLM_PROVIDER is set to 'openai'.
    """

    # ── Groq API ──────────────────────────────────────────────
    GROQ_API_KEY: Optional[str] = None
    """
    API key for Groq model inference.
    Required if LLM_PROVIDER is set to 'groq'.
    """

    GROQ_MODEL: str = "llama-3.1-8b-instant"
    """Model name for Groq chat/generation."""

    # ── LLM Settings ──────────────────────────────────────────
    LLM_PROVIDER: str = "gemini"
    """
    Active LLM provider.
    Supported values: 'gemini', 'openai', 'ollama'
    """

    AI_NAME: str = "IssueDesk AI"
    """The custom name of the AI assistant."""

    CORS_ORIGINS: Optional[str] = None
    """Comma-separated list of additional origins allowed for CORS in production."""

    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
    """Base URL for Ollama API endpoint."""

    OLLAMA_MODEL: str = "llama3.1:8b"
    """Model name for Ollama chat/generation."""

    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    """Model name for Ollama embeddings."""
    
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