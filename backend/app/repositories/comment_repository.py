"""
Comment repository module.

Data access layer for Comment model.
Comments are always accessed within the context of an issue.
"""

from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentUpdate
from app.repositories.base import BaseRepository


class CommentRepository(BaseRepository[Comment, CommentCreate, CommentUpdate]):
    """
    Repository for Comment database operations.
    
    Comments are always retrieved in the context of a specific issue.
    They are ordered by creation time (oldest first).
    """
    
    def __init__(self, db: Session):
        """Initialize with Comment model."""
        super().__init__(Comment, db)
    
    def get_issue_comments(
        self,
        issue_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[list[Comment], int]:
        """
        Get all comments for a specific issue, ordered by creation time.
        
        Args:
            issue_id: The issue to get comments for
            skip: Records to skip (pagination)
            limit: Max records to return
            
        Returns:
            Tuple of (list of comments, total count)
        """
        query = (
            self.db.query(self.model)
            .options(joinedload(self.model.user))
            .filter(self.model.issue_id == issue_id)
            .order_by(self.model.created_at.asc())
        )
        
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        
        return items, total
    
    def get_by_id_with_author(self, comment_id: int) -> Optional[Comment]:
        """
        Get a single comment with author info loaded.
        
        Args:
            comment_id: The comment ID
            
        Returns:
            Comment with author loaded, or None
        """
        return (
            self.db.query(self.model)
            .options(joinedload(self.model.user))
            .filter(self.model.id == comment_id)
            .first()
        )
    
    def is_comment_author(self, comment_id: int, user_id: int) -> bool:
        """
        Check if a user is the author of a comment.
        Used for authorization (users can only edit their own comments).
        
        Args:
            comment_id: The comment ID
            user_id: The user ID to check
            
        Returns:
            True if the user is the author, False otherwise
        """
        comment = self.get(comment_id)
        return comment is not None and comment.user_id == user_id