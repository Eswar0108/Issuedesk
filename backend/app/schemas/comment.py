"""
Comment schemas module.

Pydantic models for comment-related API operations.
Comments allow discussion and updates on issues.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Create Comment (POST /issues/{id}/comments/) ────────────
class CommentCreate(BaseModel):
    """
    Schema for creating a new comment on an issue.
    
    Only requires the content — issue_id comes from the URL path,
    user_id comes from the authenticated user's JWT token.
    """
    content: str = Field(
        ...,
        min_length=1,
        description="Comment text. Supports markdown for formatting."
    )


# ── Update Comment (PUT/PATCH /comments/{id}) ───────────────
class CommentUpdate(BaseModel):
    """
    Schema for editing an existing comment.
    """
    content: str = Field(
        ...,
        min_length=1,
        description="Updated comment text"
    )


# ── Comment Response (What the API returns) ─────────────────
class CommentResponse(BaseModel):
    """
    Schema for comment data returned to clients.
    """
    id: int
    content: str
    issue_id: int
    
    # Author info
    user_id: int
    author_username: str = Field(
        ...,
        description="Username of the comment author"
    )
    author_full_name: Optional[str] = Field(
        None,
        description="Full name of the comment author"
    )
    
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }


# ── Comment List Item (for issue detail view) ───────────────
class CommentListItem(BaseModel):
    """
    Compact comment info for issue detail view.
    Ordered by created_at ascending (oldest first).
    """
    id: int
    content: str
    author_username: str
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }