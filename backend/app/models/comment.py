"""
Comment model module.

Represents a comment on an issue.
Comments allow team members to discuss issues, share updates, and provide feedback.
"""

from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Comment(TimestampMixin, Base):
    """A discussion message attached to an issue."""
    
    __tablename__ = "comments"
    
    """
    Comment model.
    
    A single comment on an issue. Supports threaded discussions on issues.
    
    Relationships:
    - issue: The issue this comment belongs to (many-to-one)
    - author: The user who wrote this comment (many-to-one)
    """
    
    content = Column(
        Text,
        nullable=False
    )
    """The body of the comment. Supports markdown for formatting."""
    
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    """Foreign key to the user who wrote this comment."""
    
    issue_id = Column(
        Integer,
        ForeignKey("issues.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    """Foreign key to the issue this comment belongs to."""
    
    # ── Relationships ────────────────────────────────────────
    user = relationship("User", back_populates="comments")
    """The user who wrote this comment."""
    
    issue = relationship("Issue", back_populates="comments")
    """The issue this comment is attached to."""
    
    def __repr__(self):
        """String representation for debugging."""
        return (
            f"<Comment(id={self.id}, "
            f"issue_id={self.issue_id}, "
            f"user_id={self.user_id})>"
        )