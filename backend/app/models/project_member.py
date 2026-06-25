"""
ProjectMember model module.

Represents the many-to-many relationship between users and projects.
A user can be a member of many projects, and a project can have many members.
Each membership includes a role that defines what the user can do in that project.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional

from app.core.database import Base
from app.models.base import TimestampMixin


class ProjectMember(TimestampMixin, Base):
    """Links a user to a project with a role."""
    
    __tablename__ = "project_members"
    
    """
    ProjectMember model.
    
    Links a user to a project with a specific role.
    This is the "join table" for the many-to-many User-Project relationship.
    
    Roles determine permissions:
    - owner: Full access, can delete project
    - admin: Can manage members and issues
    - member: Can create and edit issues
    - viewer: Can only view issues
    
    Relationships:
    - user: The member user (many-to-one)
    - project: The project they belong to (many-to-one)
    """
    
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    """Foreign key to the user who is a member."""
    
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    """Foreign key to the project they belong to."""
    
    role = Column(
        String(20),
        default="member",
        nullable=False
    )
    """
    Role of the user in this project.
    Values: 'owner', 'admin', 'member', 'viewer'
    """
    
    joined_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    """Timestamp when the user joined the project."""
    
    # ── Constraints ──────────────────────────────────────────
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "project_id",
            name="uq_user_project"
        ),
    )
    """
    Ensures a user can only be added to a project once.
    Prevents duplicate membership records.
    """
    
    # ── Relationships ────────────────────────────────────────
    user = relationship("User", back_populates="project_memberships")
    """The user who is a member."""
    
    project = relationship("Project", back_populates="members")
    """The project they belong to."""
    
    @property
    def username(self) -> str:
        return self.user.username if self.user else ""

    @property
    def full_name(self) -> Optional[str]:
        return self.user.full_name if self.user else None
    
    def __repr__(self):
        """String representation for debugging."""
        return (
            f"<ProjectMember("
            f"user_id={self.user_id}, "
            f"project_id={self.project_id}, "
            f"role='{self.role}')>"
        )