"""
Common schemas module.

Reusable Pydantic models used across multiple endpoints.
Includes pagination, standard response wrappers, and shared types.
"""

from typing import Generic, TypeVar, Optional

from pydantic import BaseModel, Field, field_validator


# ── Generic Type Variable ──────────────────────────────────
# Used to make PaginatedResponse work with any data type
T = TypeVar("T")


# ── Pagination ──────────────────────────────────────────────
class PaginationParams(BaseModel):
    """
    Query parameters for paginated list endpoints.
    
    Usage:
        GET /api/v1/issues/?page=1&page_size=20
        
    Attributes:
        page: Current page number (1-based)
        page_size: Number of records per page
    """
    page: int = Field(
        default=1,
        ge=1,
        description="Page number (1-based)"
    )
    
    page_size: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Number of records per page (max: 100)"
    )
    
    @property
    def skip(self) -> int:
        """Calculate offset for database query."""
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        """Alias for page_size, used by repository layer."""
        return self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Standard paginated response wrapper.
    
    Wraps a list of items with pagination metadata so the client
    can render pagination controls.
    
    Example response:
    {
        "items": [...],
        "total": 150,
        "page": 1,
        "page_size": 20,
        "total_pages": 8
    }
    """
    items: list[T]
    """List of items for the current page."""
    
    total: int
    """Total number of records matching the query (across all pages)."""
    
    page: int
    """Current page number (1-based)."""
    
    page_size: int
    """Number of records per page."""
    
    total_pages: int
    """Total number of pages available."""


# ── Standard API Response ───────────────────────────────────
class MessageResponse(BaseModel):
    """
    Simple message response for non-data operations.
    
    Used for: delete confirmations, status updates, etc.
    
    Example:
    {"message": "Issue deleted successfully", "detail": null}
    """
    message: str
    """Human-readable success or status message."""
    
    detail: Optional[str] = None
    """Optional additional information or error details."""


class ErrorResponse(BaseModel):
    """
    Standard error response format.
    
    All API errors use this structure for consistency.
    
    Example:
    {
        "detail": "Issue not found",
        "status_code": 404,
        "error_code": "NOT_FOUND"
    }
    """
    detail: str
    """Human-readable error description."""
    
    status_code: int
    """HTTP status code (echoed for client parsing convenience)."""
    
    error_code: Optional[str] = None
    """Machine-readable error code for programmatic handling."""