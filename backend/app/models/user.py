"""
User model module.

Represents registered users of the IssueDesk system.
Each user can own projects, report issues, and leave comments.
"""

from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class User(TimestampMixin, Base):
    """Registered users of the IssueDesk system."""
    
    __tablename__ = "users"
    
    """
    User model.
    
    Stores user account information and authentication credentials.
    
    Relationships:
    - owned_projects: Projects where user is the owner (one-to-many)
    - reported_issues: Issues reported by this user (one-to-many)
    - assigned_issues: Issues assigned to this user (one-to-many)
    - comments: Comments written by this user (one-to-many)
    - project_memberships: Project memberships (one-to-many)
    """
    
    username = Column(
        String(50),
        unique=True,      # No two users can have the same username
        nullable=False,   # Username is required
        index=True        # Fast lookup by username (for login)
    )
    """Unique username used for login."""
    
    email = Column(
        String(100),
        unique=True,      # No two users can have the same email
        nullable=False,   # Email is required
        index=True        # Fast lookup by email
    )
    """User's email address. Used for notifications and login."""
    
    password_hash = Column(
        String(255),
        nullable=False
    )
    """Hashed password using bcrypt. Never stores plain-text passwords."""
    
    full_name = Column(String(100), nullable=True)
    """Optional display name for the user."""
    
    role = Column(
        String(20),
        default="user",
        nullable=False
    )
    """
    User role for authorization.
    Values: 'user', 'admin'
    'admin' has access to admin-only endpoints.
    """
    
    is_active = Column(Boolean, default=True, nullable=False)
    """
    Soft-delete flag.
    True: User can login and use the system
    False: User is deactivated (cannot login, but data is preserved)
    """
    
    # ── Relationships ────────────────────────────────────────
    owned_projects = relationship(
        "Project",
        back_populates="owner",
        foreign_keys="Project.owner_id"
    )
    """Projects where this user is the owner."""
    
    reported_issues = relationship(
        "Issue",
        back_populates="reporter",
        foreign_keys="Issue.reporter_id"
    )
    """Issues reported by this user."""
    
    assigned_issues = relationship(
        "Issue",
        back_populates="assignee",
        foreign_keys="Issue.assignee_id"
    )
    """Issues assigned to this user."""
    
    comments = relationship(
       "Comment",
       back_populates="user",
       foreign_keys="Comment.user_id"
   )
    """Comments written by this user."""
    
    project_memberships = relationship(
       "ProjectMember",
       back_populates="user",
       foreign_keys="ProjectMember.user_id"
   )
    """Project membership records for this user."""
    
    def __repr__(self):
        """String representation for debugging."""
        return f"<User(id={self.id}, username='{self.username}')>"