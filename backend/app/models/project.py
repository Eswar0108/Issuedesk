"""
Project model module.

Represents a project that contains issues.
Projects help organize issues into logical groups (e.g., "BugDesk", "Mobile App").
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import date

from app.core.database import Base
from app.models.base import TimestampMixin


class Project(TimestampMixin, Base):
    """A container for issues with a unique key."""
    
    __tablename__ = "projects"
    
    """
    Project model.
    
    A container for issues. Each project has:
    - A unique key used as a prefix for issue IDs (e.g., BD-1001)
    - An owner who manages the project
    - Members who can view and work on issues
    
    Relationships:
    - owner: The user who created/owns this project (many-to-one)
    - issues: All issues belonging to this project (one-to-many)
    - members: Project membership records (one-to-many)
    """
    
    name = Column(
        String(100),
        nullable=False,
        index=True
    )
    """Human-readable project name (e.g., "IssueDesk Backend")."""
    
    key = Column(
        String(10),
        unique=True,        # No two projects can have the same key
        nullable=False,
        index=True
    )
    """Short unique identifier for the project (e.g., "BD", "PROJ")."""
    
    description = Column(Text, nullable=True)
    """Optional detailed description of the project's purpose."""
    
    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    """Foreign key to the user who owns this project."""
    
    is_active = Column(Boolean, default=True, nullable=False)
    """Soft-delete / archive flag."""

    start_date = Column(Date, nullable=True)
    """Optional start date for the project timeline."""
    end_date = Column(Date, nullable=True)
    """Project end date."""
    
    
    # ── Relationships ────────────────────────────────────────
    owner = relationship(
        "User",
        back_populates="owned_projects",
        foreign_keys=[owner_id]
    )
    """The user who owns this project."""
    
    issues = relationship(
        "Issue",
        back_populates="project",
        cascade="all, delete-orphan"
    )
    """All issues in this project. Deleted if project is deleted."""
    
    members = relationship(
        "ProjectMember",
        back_populates="project",
        cascade="all, delete-orphan"
    )
    """Membership records for this project."""
    
    def __repr__(self):
        """String representation for debugging."""
        return f"<Project(id={self.id}, key='{self.key}', name='{self.name}')>"