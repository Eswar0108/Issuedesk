"""
Issue repository module.

Data access layer for Issue model.
Includes filtering, search, and status transition logic.
"""

from typing import Optional

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.models.issue import Issue
from app.schemas.issue import IssueCreate, IssueUpdate
from app.repositories.base import BaseRepository


# Valid status transitions
# Maps current_status -> list of allowed next statuses
VALID_TRANSITIONS = {
    "open": ["in_progress", "closed"],
    "in_progress": ["resolved", "open", "closed"],
    "resolved": ["closed", "reopened"],
    "closed": ["reopened"],
    "reopened": ["in_progress", "closed"],
}


class IssueRepository(BaseRepository[Issue, IssueCreate, IssueUpdate]):
    """
    Repository for Issue database operations.
    
    Handles:
    - Issue CRUD (inherited from BaseRepository)
    - Advanced filtering (status, priority, type, assignee)
    - Status transition validation
    - Sorting and search
    """
    
    def __init__(self, db: Session):
        """Initialize with Issue model."""
        super().__init__(Issue, db)
    
    def get_with_relations(self, id: int) -> Optional[Issue]:
        """
        Get an issue with all related data loaded in one query.
        
        Uses joinedload to eagerly load relationships,
        avoiding the N+1 query problem.
        
        Args:
            id: The issue ID
            
        Returns:
            Issue with reporter, assignee, comments, and project loaded
        """
        return (
            self.db.query(self.model)
            .options(
                joinedload(self.model.reporter),
                joinedload(self.model.assignee),
                joinedload(self.model.comments),
                joinedload(self.model.project),
            )
            .filter(self.model.id == id)
            .first()
        )
    
    def get_filtered(
        self,
        project_id: Optional[int] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        issue_type: Optional[str] = None,
        assignee_id: Optional[int] = None,
        reporter_id: Optional[int] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_desc: bool = True,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[list[Issue], int]:
        """
        Get issues with advanced filtering, search, and sorting.
        
        Args:
            project_id: Filter by project
            status: Filter by status
            priority: Filter by priority
            issue_type: Filter by type
            assignee_id: Filter by assignee
            reporter_id: Filter by reporter
            search: Search in title and description (case-insensitive)
            sort_by: Field to sort by
            sort_desc: True for descending, False for ascending
            skip: Records to skip (pagination)
            limit: Max records to return
            
        Returns:
            Tuple of (list of issues, total count)
        """
        query = self.db.query(self.model)
        
        # Apply filters
        if project_id is not None:
            query = query.filter(self.model.project_id == project_id)
        if status is not None:
            query = query.filter(self.model.status == status)
        if priority is not None:
            query = query.filter(self.model.priority == priority)
        if issue_type is not None:
            query = query.filter(self.model.issue_type == issue_type)
        if assignee_id is not None:
            query = query.filter(self.model.assignee_id == assignee_id)
        if reporter_id is not None:
            query = query.filter(self.model.reporter_id == reporter_id)
        
        # Text search in title and description
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    self.model.title.ilike(search_term),
                    self.model.description.ilike(search_term),
                )
            )
        
        # Get total count before sorting/pagination
        total = query.count()
        
        # Apply sorting
        sort_column = getattr(self.model, sort_by, self.model.created_at)
        if sort_desc:
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Apply pagination
        items = query.offset(skip).limit(limit).all()
        
        return items, total
    
    def validate_transition(self, current_status: str, new_status: str) -> bool:
        """
        Check if a status transition is valid.
        
        Status flow:
            open → in_progress → resolved → closed
              ↑                       |
              └────── reopened ←──────┘
        
        Args:
            current_status: The current status of the issue
            new_status: The desired new status
            
        Returns:
            True if the transition is valid, False otherwise
        """
        allowed = VALID_TRANSITIONS.get(current_status, [])
        return new_status in allowed
    
    def get_comment_count(self, issue_id: int) -> int:
        """
        Count comments on an issue.
        
        Args:
            issue_id: The issue ID
            
        Returns:
            Number of comments
        """
        from app.models.comment import Comment
        return (
            self.db.query(Comment)
            .filter(Comment.issue_id == issue_id)
            .count()
        )