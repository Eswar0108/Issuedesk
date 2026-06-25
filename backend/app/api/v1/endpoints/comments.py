"""
Comments endpoints module.

CRUD operations for comments on issues.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse, CommentListItem
from app.schemas.common import MessageResponse
from app.repositories.comment_repository import CommentRepository
from app.repositories.issue_repository import IssueRepository

router = APIRouter(prefix="/issues/{issue_id}/comments", tags=["Comments"])


@router.post(
    "",
    response_model=CommentResponse,
    status_code=201,
    summary="Add comment to issue",
)
def create_comment(
    issue_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a comment to an issue.
    """
    # Verify issue exists
    issue_repo = IssueRepository(db)
    issue = issue_repo.get(issue_id)
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID {issue_id} not found"
        )
    
    # Create comment with issue_id and user_id directly
    repo = CommentRepository(db)
    comment = repo.create(
        comment_data,
        issue_id=issue_id,
        user_id=current_user.id
    )
    
    # Reload with author info
    comment = repo.get_by_id_with_author(comment.id)
    
    return CommentResponse(
        id=comment.id,
        content=comment.content,
        issue_id=comment.issue_id,
        user_id=comment.user_id,
        author_username=comment.user.username,
        author_full_name=comment.user.full_name,
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )


@router.get(
    "",
    response_model=list[CommentListItem],
    summary="List comments on issue",
)
def list_comments(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all comments for an issue, ordered by creation time.
    """
    # Verify issue exists
    issue_repo = IssueRepository(db)
    issue = issue_repo.get(issue_id)
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID {issue_id} not found"
        )
    
    repo = CommentRepository(db)
    comments, _ = repo.get_issue_comments(issue_id)
    
    return [
        CommentListItem(
            id=c.id,
            content=c.content,
            author_username=c.user.username,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in comments
    ]


@router.patch(
    "/{comment_id}",
    response_model=CommentResponse,
    summary="Update a comment",
)
def update_comment(
    issue_id: int,
    comment_id: int,
    update_data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a comment. Only the comment author can edit.
    """
    repo = CommentRepository(db)
    comment = repo.get(comment_id)
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check authorization
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own comments"
        )
    
    updated = repo.update(comment, update_data)
    updated = repo.get_by_id_with_author(updated.id)
    
    return CommentResponse(
        id=updated.id,
        content=updated.content,
        issue_id=updated.issue_id,
        user_id=updated.user_id,
        author_username=updated.user.username,
        author_full_name=updated.user.full_name,
        created_at=updated.created_at,
        updated_at=updated.updated_at
    )


@router.delete(
    "/{comment_id}",
    response_model=MessageResponse,
    summary="Delete a comment",
)
def delete_comment(
    issue_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a comment. Only the comment author can delete.
    """
    repo = CommentRepository(db)
    comment = repo.get(comment_id)
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check authorization
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments"
        )
    
    repo.delete(comment_id)
    return MessageResponse(message="Comment deleted successfully")