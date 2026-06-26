"""
Attachments endpoints module.

Upload, list, and delete file attachments for any entity (issues, projects, etc.)
using a polymorphic pattern: entity_type + entity_id.

Routes:
    GET  /api/v1/attachments/{entity_type}/{entity_id}  — List attachments
    POST /api/v1/attachments/{entity_type}/{entity_id}  — Upload attachment
    DELETE /api/v1/attachments/{attachment_id}          — Delete attachment
"""

import os
import uuid
import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.attachment import AttachmentResponse, AttachmentListItem
from app.schemas.common import MessageResponse
from app.repositories.attachment_repository import AttachmentRepository

router = APIRouter(prefix="/attachments", tags=["Attachments"])

# ── Upload directory (relative to backend root) ──────────────
UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ── Allowed entity types ─────────────────────────────────────
ALLOWED_ENTITY_TYPES = {"issue", "project", "comment"}

# ── File constraints ─────────────────────────────────────────
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024   # 10 MB


# ── List Attachments ─────────────────────────────────────────
@router.get(
    "/{entity_type}/{entity_id}",
    response_model=list[AttachmentListItem],
    summary="List attachments for an entity",
)
def list_attachments(
    entity_type: str,
    entity_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all attachments linked to a given entity (e.g. issue #5).
    """
    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity_type '{entity_type}'. Allowed: {sorted(ALLOWED_ENTITY_TYPES)}",
        )

    repo = AttachmentRepository(db)
    attachments, _ = repo.get_for_entity(entity_type, entity_id, skip=skip, limit=limit)

    return [
        AttachmentListItem(
            id=a.id,
            file_name=a.file_name,
            file_size=a.file_size,
            mime_type=a.mime_type,
            uploader_username=a.uploader.username if a.uploader else None,
            created_at=a.created_at,
        )
        for a in attachments
    ]


# ── Upload Attachment ─────────────────────────────────────────
@router.post(
    "/{entity_type}/{entity_id}",
    response_model=AttachmentResponse,
    status_code=201,
    summary="Upload a file attachment",
)
async def upload_attachment(
    entity_type: str,
    entity_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a file and link it to the given entity.
    Max file size: 10 MB.
    """
    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity_type '{entity_type}'. Allowed: {sorted(ALLOWED_ENTITY_TYPES)}",
        )

    # Read file content and check size
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size {file_size} bytes exceeds 10 MB limit",
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    # Determine MIME type
    mime_type = file.content_type or "application/octet-stream"
    original_name = file.filename or "upload"

    # Build a unique storage path: uploads/<entity_type>/<entity_id>/<uuid>_<original_name>
    safe_name = Path(original_name).name  # strip any path components
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    entity_dir = UPLOAD_DIR / entity_type / str(entity_id)
    entity_dir.mkdir(parents=True, exist_ok=True)
    file_path = entity_dir / unique_name

    # Save to disk
    with open(file_path, "wb") as f:
        f.write(content)

    # Relative path stored in DB (used to build download URL)
    relative_path = f"{entity_type}/{entity_id}/{unique_name}"

    # Persist record
    repo = AttachmentRepository(db)
    attachment = repo.create_attachment(
        entity_type=entity_type,
        entity_id=entity_id,
        uploader_id=current_user.id,
        file_name=original_name,
        file_size=file_size,
        file_path=relative_path,
        mime_type=mime_type,
    )

    # Reload with uploader info
    attachment = repo.get_with_uploader(attachment.id)

    return AttachmentResponse(
        id=attachment.id,
        file_name=attachment.file_name,
        file_size=attachment.file_size,
        mime_type=attachment.mime_type,
        file_path=attachment.file_path,
        entity_type=attachment.entity_type,
        entity_id=attachment.entity_id,
        uploaded_by=attachment.uploader_id,
        uploader_username=attachment.uploader.username if attachment.uploader else None,
        created_at=attachment.created_at,
        updated_at=attachment.updated_at,
    )


# ── Delete Attachment ─────────────────────────────────────────
@router.delete(
    "/{attachment_id}",
    response_model=MessageResponse,
    summary="Delete an attachment",
)
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete an attachment by ID. Only the uploader can delete their own attachments.
    """
    repo = AttachmentRepository(db)
    attachment = repo.get(attachment_id)

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attachment with ID {attachment_id} not found",
        )

    # Authorization: only the uploader can delete
    if attachment.uploader_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own attachments",
        )

    # Remove the file from disk
    file_path = UPLOAD_DIR / attachment.file_path
    if file_path.exists():
        file_path.unlink()

    repo.delete(attachment_id)
    return MessageResponse(message="Attachment deleted successfully")
