"""
Project repository module.

Data access layer for Project and ProjectMember models.
Includes member management operations.
"""

from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.project import Project
from app.models.project_member import ProjectMember
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project, ProjectCreate, ProjectUpdate]):
    """
    Repository for Project database operations.
    
    Handles:
    - Project CRUD (inherited from BaseRepository)
    - Member management (add/remove/update roles)
    - Count queries for dashboard
    """
    
    def __init__(self, db: Session):
        """Initialize with Project model."""
        super().__init__(Project, db)
    
    def get_by_key(self, key: str) -> Optional[Project]:
        """
        Find a project by its unique key.
        
        Args:
            key: Project key (e.g., "BD", "PROJ")
            
        Returns:
            Project if found, None otherwise
        """
        return (
            self.db.query(self.model)
            .filter(self.model.key == key)
            .first()
        )
    
    def get_member_count(self, project_id: int) -> int:
        """
        Count the number of members in a project.
        
        Args:
            project_id: The project ID
            
        Returns:
            Number of members
        """
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .count()
        )
    
    def get_issue_count(self, project_id: int) -> int:
        """
        Count the number of open issues in a project.
        
        Args:
            project_id: The project ID
            
        Returns:
            Number of issues that are not 'closed' or 'resolved'
        """
        from app.models.issue import Issue
        return (
            self.db.query(Issue)
            .filter(
                Issue.project_id == project_id,
                Issue.status.notin_(["closed", "resolved"])
            )
            .count()
        )
    
    # ── Member Management ────────────────────────────────────
    
    def add_member(
        self,
        project_id: int,
        user_id: int,
        role: str = "member"
    ) -> ProjectMember:
        """
        Add a user to a project with a specific role.
        
        Args:
            project_id: The project to add to
            user_id: The user to add
            role: The role (admin, member, or viewer)
            
        Returns:
            The created ProjectMember record
            
        Raises:
            ValueError: If user is already a member
        """
        # Check if already a member
        existing = (
            self.db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id
            )
            .first()
        )
        
        if existing:
            raise ValueError("User is already a member of this project")
        
        member = ProjectMember(
            project_id=project_id,
            user_id=user_id,
            role=role
        )
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member
    
    def remove_member(self, project_id: int, user_id: int) -> bool:
        """
        Remove a user from a project.
        
        Args:
            project_id: The project
            user_id: The user to remove
            
        Returns:
            True if removed, False if not found
        """
        member = (
            self.db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id
            )
            .first()
        )
        
        if not member:
            return False
        
        self.db.delete(member)
        self.db.commit()
        return True
    
    def get_members(self, project_id: int) -> list[ProjectMember]:
        """
        Get all members of a project with user info.
        
        Args:
            project_id: The project ID
            
        Returns:
            List of ProjectMember records with user relationship loaded
        """
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .all()
        )
    
    def get_user_projects(self, user_id: int) -> list[Project]:
        """
        Get all projects where a user is a member or owner.
        
        Args:
            user_id: The user ID
            
        Returns:
            List of projects
        """
        # Projects where user is owner OR member
        return (
            self.db.query(self.model)
            .outerjoin(
                ProjectMember,
                ProjectMember.project_id == self.model.id
            )
            .filter(
                (self.model.owner_id == user_id) |
                (ProjectMember.user_id == user_id)
            )
            .distinct()
            .all()
        )