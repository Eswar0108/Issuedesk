"""
Issue repository module.

Data access layer for Issue model.
Includes filtering, search, and status transition logic.
"""

from typing import Optional, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.models.issue import Issue
from app.models.project_member import ProjectMember
from app.schemas.issue import IssueCreate, IssueUpdate
from app.repositories.base import BaseRepository
from app.services.llm import get_llm_provider


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
        
    def create(self, schema: IssueCreate, **kwargs: Any) -> Issue:
        """Create a new issue with auto-generated issue_code and start_date validation."""
        # Get project to retrieve its key prefix
        from app.models.project import Project
        project = self.db.query(Project).filter(Project.id == schema.project_id).first()
        if not project:
            raise ValueError(f"Project with ID {schema.project_id} not found")
            
        # Validate that issue start date is not before project start date
        if schema.start_date and project.start_date and schema.start_date < project.start_date:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Issue start date ({schema.start_date}) cannot be before project start date ({project.start_date})"
            )
            
        # Count existing issues in this project to get the next suffix number
        issue_count = self.db.query(self.model).filter(self.model.project_id == schema.project_id).count()
        issue_code = f"{project.key}-{issue_count + 1}"
        
        # Add the generated issue_code to model kwargs
        kwargs["issue_code"] = issue_code
        
        # Generate embedding for title + description
        embedding_text = f"Title: {schema.title}\nDescription: {schema.description or ''}"
        kwargs["embedding"] = get_llm_provider().get_embedding(embedding_text)
        
        return super().create(schema, **kwargs)

    def update(self, db_obj: Issue, schema: IssueUpdate) -> Issue:
        """Update an issue with validation of start_date."""
        if schema.start_date is not None:
            from app.models.project import Project
            project = self.db.query(Project).filter(Project.id == db_obj.project_id).first()
            if project and project.start_date and schema.start_date < project.start_date:
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Issue start date ({schema.start_date}) cannot be before project start date ({project.start_date})"
                )
        
        # Check if title or description changes to recreate embedding
        title_changed = schema.title is not None and schema.title != db_obj.title
        desc_changed = schema.description is not None and schema.description != db_obj.description
        
        updated_obj = super().update(db_obj, schema)
        
        if title_changed or desc_changed:
            embedding_text = f"Title: {updated_obj.title}\nDescription: {updated_obj.description or ''}"
            updated_obj.embedding = get_llm_provider().get_embedding(embedding_text)
            self.db.add(updated_obj)
            self.db.commit()
            self.db.refresh(updated_obj)
            
        return updated_obj
    
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
        user_id: Optional[int] = None,
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
        
        Only returns issues from projects the user is a member of.
        
        Args:
            user_id: Restrict to issues in projects the user belongs to
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
        
        # Only show issues from projects the user is a member of
        if user_id is not None:
            query = query.join(
                ProjectMember,
                self.model.project_id == ProjectMember.project_id
            ).filter(ProjectMember.user_id == user_id)
        
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

    def search_semantic(
        self,
        query: str,
        project_id: Optional[int] = None,
        limit: int = 5
    ) -> list[tuple[Issue, float]]:
        """
        Perform semantic search using Gemini embeddings and Python-based cosine similarity.
        
        Args:
            query: The search query string
            project_id: Optional filter by project
            limit: Max results to return
            
        Returns:
            List of tuples (Issue, similarity_score)
        """
        # Get query embedding
        query_embedding = get_llm_provider().get_embedding(query)
        if not query_embedding:
            # Fallback: Perform standard case-insensitive text search if embeddings are unavailable
            from sqlalchemy import or_
            q = self.db.query(self.model)
            if project_id is not None:
                q = q.filter(self.model.project_id == project_id)
            
            search_term = f"%{query}%"
            candidates = q.filter(
                or_(
                    self.model.title.ilike(search_term),
                    self.model.description.ilike(search_term),
                )
            ).limit(limit).all()
            return [(issue, 1.0) for issue in candidates]
            
        # Get candidate issues that have embeddings
        q = self.db.query(self.model).filter(self.model.embedding != None)
        if project_id is not None:
            q = q.filter(self.model.project_id == project_id)
            
        candidates = q.all()
        
        # Calculate cosine similarity
        results = []
        for issue in candidates:
            if not issue.embedding:
                continue
            # Pure Python Cosine Similarity
            try:
                dot_product = sum(x * y for x, y in zip(query_embedding, issue.embedding))
                norm_q = sum(x * x for x in query_embedding) ** 0.5
                norm_i = sum(x * x for x in issue.embedding) ** 0.5
                if norm_q and norm_i:
                    similarity = dot_product / (norm_q * norm_i)
                    results.append((issue, similarity))
            except Exception:
                # Fallback if list sizing doesn't match
                continue
                
        # Sort by similarity in descending order
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:limit]