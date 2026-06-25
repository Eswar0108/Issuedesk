"""
Issue schemas module.

Pydantic models for issue-related API operations.
Issues are the core entity - bugs, features, tasks tracked in projects.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import IssueStatus, IssuePriority, IssueType



# ── Base Issue Schema ───────────────────────────────────────
class IssueBase(BaseModel):
    """
    Shared issue fields used across multiple schemas.
    """
    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Short descriptive title of the issue"
    )
    
    description: Optional[str] = Field(
        None,
        description="Detailed explanation. For bugs, include steps to reproduce."
    )
    
    priority: IssuePriority = Field(
        default=IssuePriority.MEDIUM,
        description="Priority level: low, medium, high, or critical"
    )
    
    issue_type: IssueType = Field(
        default=IssueType.BUG,
        description="Type: bug, feature, task, or improvement"
    )


# ── Create Issue (POST /issues/) ────────────────────────────
class IssueCreate(IssueBase):
    """
    Schema for creating a new issue.
    
    Requires: title, project_id
    Optional: description, priority, issue_type, assignee_id
    """
    project_id: int = Field(
        ...,
        description="ID of the project this issue belongs to"
    )
    
    assignee_id: Optional[int] = Field(
        None,
        description="ID of the user assigned to work on this issue"
    )


# ── Update Issue (PUT/PATCH /issues/{id}) ───────────────────
class IssueUpdate(BaseModel):
    """
    Schema for updating an issue.
    
    All fields optional for partial updates.
    Status transitions are validated in the service layer.
    """
    title: Optional[str] = Field(
        None,
        min_length=1,
        max_length=200,
        description="New title"
    )
    
    description: Optional[str] = Field(
        None,
        description="New description"
    )
    
    status: Optional[IssueStatus] = Field(
        None,
        description="New status: open, in_progress, resolved, closed, reopened"
    )
    
    priority: Optional[IssuePriority] = Field(
        None,
        description="New priority level"
    )
    
    issue_type: Optional[IssueType] = Field(
        None,
        description="New issue type"
    )
    
    assignee_id: Optional[int] = Field(
        None,
        description="New assignee user ID (set to null to unassign)"
    )


# ── Issue Status Transition ─────────────────────────────────
class IssueStatusUpdate(BaseModel):
    """
    Schema specifically for changing issue status.
    
    Separate from IssueUpdate to enforce valid status transitions
    in the service layer (e.g., can't go from closed back to open
    without going through reopened first).
    """
    status: IssueStatus = Field(
        ...,
        description="New status value"
    )


# ── Issue Response (What the API returns) ───────────────────
class IssueResponse(IssueBase):
    """
    Full issue data returned to clients.
    """
    id: int
    
    status: IssueStatus
    project_id: int
    
    reporter_id: Optional[int] = None
    assignee_id: Optional[int] = None
    
    # Computed display fields
    reporter_username: Optional[str] = Field(
        None,
        description="Username of the reporter (populated by service layer)"
    )
    assignee_username: Optional[str] = Field(
        None,
        description="Username of the assignee (populated by service layer)"
    )
    
    comment_count: int = Field(
        default=0,
        description="Number of comments on this issue"
    )
    
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }


# ── Issue List Item (Compact for list views) ────────────────
class IssueListItem(BaseModel):
    """
    Compact issue info for list/table views.
    Shows key fields at a glance without full details.
    """
    id: int
    title: str
    status: IssueStatus
    priority: IssuePriority
    issue_type: IssueType
    project_id: int
    project_key: Optional[str] = Field(
        None,
        description="Project key prefix (e.g., 'BD')"
    )
    reporter_username: Optional[str] = None
    assignee_username: Optional[str] = None
    comment_count: int = 0
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }