"""
Issues endpoints module.

CRUD operations for issues with filtering, search, and status management.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.issue import (
    IssueCreate, IssueUpdate, IssueResponse, IssueListItem,
    IssueStatusUpdate
)
from app.schemas.common import (
    PaginatedResponse, PaginationParams, MessageResponse
)
from app.repositories.issue_repository import IssueRepository

router = APIRouter(prefix="/issues", tags=["Issues"])


@router.post(
    "",
    response_model=IssueResponse,
    status_code=201,
    summary="Create a new issue",
)
def create_issue(
    issue_data: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new issue. The current user becomes the reporter.
    """
    repo = IssueRepository(db)
    
    # Create issue with current user as reporter
    issue = repo.create(issue_data, reporter_id=current_user.id)
    
    return build_issue_response(repo, issue)


@router.get(
    "",
    response_model=PaginatedResponse[IssueListItem],
    summary="List issues with filtering",
)
def list_issues(
    pagination: PaginationParams = Depends(),
    project_id: Optional[int] = Query(None, description="Filter by project"),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    issue_type: Optional[str] = Query(None, description="Filter by type"),
    assignee_id: Optional[int] = Query(None, description="Filter by assignee"),
    search: Optional[str] = Query(None, description="Search in title/description"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_desc: bool = Query(True, description="Sort descending"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get paginated list of issues with advanced filtering.
    """
    repo = IssueRepository(db)
    
    issues, total = repo.get_filtered(
        project_id=project_id,
        status=status,
        priority=priority,
        issue_type=issue_type,
        assignee_id=assignee_id,
        search=search,
        sort_by=sort_by,
        sort_desc=sort_desc,
        skip=pagination.skip,
        limit=pagination.limit
    )
    
    items = []
    for issue in issues:
        item = IssueListItem.model_validate(issue)
        item.comment_count = repo.get_comment_count(issue.id)
        if issue.project:
            item.project_key = issue.project.key
        if issue.reporter:
            item.reporter_username = issue.reporter.username
        if issue.assignee:
            item.assignee_username = issue.assignee.username
        items.append(item)
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=(total + pagination.page_size - 1) // pagination.page_size
    )


@router.get(
    "/{issue_id}",
    response_model=IssueResponse,
    summary="Get issue details",
)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single issue with full details.
    """
    repo = IssueRepository(db)
    issue = repo.get_with_relations(issue_id)
    
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID {issue_id} not found"
        )
    
    return build_issue_response(repo, issue)


@router.patch(
    "/{issue_id}",
    response_model=IssueResponse,
    summary="Update an issue",
)
def update_issue(
    issue_id: int,
    update_data: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update issue fields (title, description, status, priority, etc.)
    """
    repo = IssueRepository(db)
    issue = repo.get(issue_id)
    
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID {issue_id} not found"
        )
    
    # Validate status transition if status is being changed
    if update_data.status and update_data.status != issue.status:
        if not repo.validate_transition(issue.status, update_data.status):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition: '{issue.status}' → '{update_data.status}'"
            )
    
    updated = repo.update(issue, update_data)
    return build_issue_response(repo, updated)


@router.delete(
    "/{issue_id}",
    response_model=MessageResponse,
    summary="Delete an issue",
)
def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an issue permanently.
    """
    repo = IssueRepository(db)
    deleted = repo.delete(issue_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID {issue_id} not found"
        )
    
    return MessageResponse(message="Issue deleted successfully")


# ── Helper Functions ────────────────────────────────────────

def build_issue_response(repo: IssueRepository, issue) -> IssueResponse:
    """
    Build a complete IssueResponse with computed fields.
    
    Populates reporter/assignee usernames and comment count.
    """
    response = IssueResponse.model_validate(issue)
    response.comment_count = repo.get_comment_count(issue.id)
    
    if issue.reporter:
        response.reporter_username = issue.reporter.username
    if issue.assignee:
        response.assignee_username = issue.assignee.username
    
    return response
