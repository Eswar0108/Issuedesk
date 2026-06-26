"""
Attachment schemas module.

Pydantic models for attachment-related API operations.
Attachments use a polymorphic pattern (entity_type + entity_id)
so they can be linked to any entity (issues, projects, etc.).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Attachment Response (What the API returns) ───────────────
class AttachmentResponse(BaseModel):
    """
    Full attachment data returned to clients.
    """
    id: int

    file_name: str = Field(description="Original filename as uploaded")
    file_size: int = Field(description="File size in bytes")
    mime_type: str = Field(description="MIME type, e.g. image/png")
    file_path: str = Field(description="Relative path used to construct download URL")

    entity_type: str = Field(description="Entity this attachment belongs to, e.g. 'issue'")
    entity_id: int = Field(description="ID of the entity this attachment belongs to")

    uploaded_by: int = Field(description="User ID of the uploader")
    uploader_username: Optional[str] = Field(
        None,
        description="Username of the uploader (populated by repository)"
    )

    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


# ── Attachment List Item (Compact for list views) ────────────
class AttachmentListItem(BaseModel):
    """
    Compact attachment info for listing attachments on an entity.
    """
    id: int
    file_name: str
    file_size: int
    mime_type: str
    uploader_username: Optional[str] = None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
