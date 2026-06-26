"""
Attachment repository module.

Data access layer for Attachment model.
Attachments use a polymorphic pattern (entity_type + entity_id),
so they can be linked to any entity (issues, projects, etc.).
"""

from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.attachment import Attachment
from app.repositories.base import BaseRepository


# Sentinel used for BaseRepository generics (no dedicated Create/Update schemas)
class _AttachmentCreate:
    pass


class _AttachmentUpdate:
    pass


class AttachmentRepository(BaseRepository[Attachment, _AttachmentCreate, _AttachmentUpdate]):
    """
    Repository for Attachment database operations.

    Attachments are always queried within the context of an entity
    (entity_type + entity_id). Ordered by creation time (newest first).
    """

    def __init__(self, db: Session):
        """Initialize with Attachment model."""
        super().__init__(Attachment, db)

    # ── Query ─────────────────────────────────────────────────

    def get_for_entity(
        self,
        entity_type: str,
        entity_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Attachment], int]:
        """
        Get all attachments for a specific entity, ordered newest-first.

        Args:
            entity_type: e.g. "issue", "project"
            entity_id: The ID of the entity
            skip: Records to skip (pagination)
            limit: Max records to return

        Returns:
            Tuple of (list of attachments, total count)
        """
        query = (
            self.db.query(self.model)
            .options(joinedload(self.model.uploader))
            .filter(
                self.model.entity_type == entity_type,
                self.model.entity_id == entity_id,
            )
            .order_by(self.model.created_at.desc())
        )

        total = query.count()
        items = query.offset(skip).limit(limit).all()

        return items, total

    def get_with_uploader(self, attachment_id: int) -> Optional[Attachment]:
        """
        Get a single attachment with uploader info eagerly loaded.

        Args:
            attachment_id: The attachment ID

        Returns:
            Attachment with uploader loaded, or None
        """
        return (
            self.db.query(self.model)
            .options(joinedload(self.model.uploader))
            .filter(self.model.id == attachment_id)
            .first()
        )

    # ── Write ─────────────────────────────────────────────────

    def create_attachment(
        self,
        entity_type: str,
        entity_id: int,
        uploader_id: int,
        file_name: str,
        file_size: int,
        file_path: str,
        mime_type: str,
    ) -> Attachment:
        """
        Save a new attachment record.

        Args:
            entity_type: e.g. "issue"
            entity_id: ID of the owning entity
            uploader_id: User ID of the uploader
            file_name: Original filename
            file_size: File size in bytes
            file_path: Relative storage path (used to build download URL)
            mime_type: MIME type string

        Returns:
            The newly created Attachment instance
        """
        attachment = Attachment(
            entity_type=entity_type,
            entity_id=entity_id,
            uploader_id=uploader_id,
            file_name=file_name,
            file_size=file_size,
            file_path=file_path,
            mime_type=mime_type,
        )
        self.db.add(attachment)
        self.db.commit()
        self.db.refresh(attachment)
        return attachment

    def is_uploader(self, attachment_id: int, user_id: int) -> bool:
        """
        Check if a user is the original uploader of an attachment.
        Used for authorization (only uploader can delete).

        Args:
            attachment_id: The attachment ID
            user_id: The user ID to check

        Returns:
            True if the user is the uploader, False otherwise
        """
        attachment = self.get(attachment_id)
        return attachment is not None and attachment.uploader_id == user_id
