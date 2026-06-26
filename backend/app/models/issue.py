"""
Issue model module.

Represents a bug, feature request, task, or improvement in a project.
This is the core entity of the IssueDesk application.
"""

from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, Date, JSON
from sqlalchemy.orm import relationship
from datetime import date

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.enums import IssueStatus, IssuePriority, IssueType


class Issue(TimestampMixin, Base):
    """A task, bug, or feature request inside a project."""
    
    __tablename__ = "issues"
    
    """
    Issue model.
    
    Tracks a single piece of work in a project. Can be a bug, feature, task, etc.
    
    Status flow:
        open → in_progress → resolved → closed
          ↑                       |
          └────── reopened ←──────┘
    
    Relationships:
    - project: The project this issue belongs to (many-to-one)
    - reporter: The user who created/reported this issue (many-to-one)
    - assignee: The user working on this issue (many-to-one)
    - comments: All comments on this issue (one-to-many)
    """
    
    title = Column(
        String(200),
        nullable=False,
        index=True
    )
    """Short, descriptive title of the issue."""

    issue_code = Column(
        String(50),
        nullable=True,
        index=True,
        unique=True
    )
    """Unique code for the issue."""
    
    description = Column(Text, nullable=True)
    """Detailed explanation of the issue including steps to reproduce if a bug."""
    
    embedding = Column(JSON, nullable=True)
    """JSON representation of the 768-dimensional text embedding vector."""
    
    status = Column(
        Enum(IssueStatus),
        default=IssueStatus.OPEN,
        nullable=False,
        index=True
    )
    """
    Current status in the workflow.
    Values: open, in_progress, resolved, closed, reopened
    """
    
    priority = Column(
        Enum(IssuePriority),
        default=IssuePriority.MEDIUM,
        nullable=False,
        index=True
    )
    """
    Importance level of the issue.
    Values: low, medium, high, critical
    """
    
    issue_type = Column(
        Enum(IssueType),
        default=IssueType.BUG,
        nullable=False,
        index=True
    )
    """
    Category of the issue.
    Values: bug, feature, task, improvement
    """
    
    start_date = Column(Date, default=date.today, nullable=True)
    """Start Date of the issue."""

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    """Foreign key to the project this issue belongs to."""
    
    reporter_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    """Foreign key to the user who reported this issue."""
    
    assignee_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    """Foreign key to the user assigned to fix this issue."""
    
    # ── Relationships ────────────────────────────────────────
    project = relationship("Project", back_populates="issues")
    """The project this issue belongs to."""
    
    reporter = relationship(
        "User",
        back_populates="reported_issues",
        foreign_keys=[reporter_id]
    )
    """The user who reported this issue."""
    
    assignee = relationship(
        "User",
        back_populates="assigned_issues",
        foreign_keys=[assignee_id]
    )
    """The user assigned to work on this issue."""
    
    comments = relationship(
        "Comment",
        back_populates="issue",
        cascade="all, delete-orphan",
        order_by="Comment.created_at"
    )
    """All comments on this issue, ordered by creation time."""

    attachments = relationship(
        "Attachment",
        primaryjoin="and_(Attachment.entity_id == Issue.id, Attachment.entity_type == 'issue')",
        foreign_keys="[Attachment.entity_id]",
        cascade="all, delete-orphan",
        order_by="Attachment.created_at"
    )
    
    def __repr__(self):
        """String representation for debugging."""
        return (
            f"<Issue(id={self.id}, "
            f"title='{self.title[:30]}...', "
            f"status='{self.status}')>"
        )