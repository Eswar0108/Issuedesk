"""
Attachment schemas module.

Pydantic models for comment-related API operations.
Attachment allows adding the files to the issues.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.models.base import TimestampMixin
from app.core.database import Base


class Attachment(TimestampMixin, Base):
    __tablename__ = "attachments"
    __table_args__ = (
        Index("ix_attachments_entity", "entity_type", "entity_id"),
    )
    
    id = Column(Integer, primary_key = True, index=True, nullable=False)
    file_name = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_path = Column(String(200), nullable=False)
    mime_type = Column(String(100), nullable=False)

    # Foreign keys
    entity_type = Column(String(20), nullable=False)
    entity_id = Column(Integer, nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False)

    # Relationships
    uploader = relationship("User", back_populates="attachments")
