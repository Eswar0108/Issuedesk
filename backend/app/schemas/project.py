"""
Project schemas module.

Pydantic models for project-related API operations.
Includes schemas for project management and member management.
"""

from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, Field, field_validator, EmailStr


# ── Base Project Schema ─────────────────────────────────────
class ProjectBase(BaseModel):
    """
    Shared project fields used across multiple schemas.
    """
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Project display name"
    )
    
    description: Optional[str] = Field(
        None,
        description="Detailed description of the project's purpose"
    )


# ── Create Project (POST /projects/) ────────────────────────
class ProjectCreate(ProjectBase):
    """
    Schema for creating a new project.
    
    The key is a short unique identifier (e.g., "BD" for BugDesk).
    It's used as a prefix for issue IDs (BD-1001, BD-1002, etc.).
    """
    key: str = Field(
        ...,
        min_length=2,
        max_length=10,
        pattern=r"^[A-Z]+$",
        description="Unique project key (uppercase letters only, e.g., 'PROJ')"
    )

    @field_validator("key")
    @classmethod
    def validate_key_format(cls, value: str) -> str:
        import re
        if not re.match(r"^[A-Z]+$", value):
            raise ValueError("must contain uppercase letters only (A-Z) with no spaces, numbers, or special characters")
        return value

    start_date: Optional[date] = Field(
        None,
        description="Optional start date for the project timeline"
    )
    
    end_date: Optional[date] = Field(
        None,
        description="Optional end date for the project timeline"
    )

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v


# ── Update Project (PUT/PATCH /projects/{id}) ───────────────
class ProjectUpdate(BaseModel):
    """
    Schema for updating project details.
    All fields optional for partial updates.
    """
    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="New project name"
    )
    
    description: Optional[str] = Field(
        None,
        description="New project description"
    )
    
    start_date: Optional[date] = Field(
        None,
        description="Optional start date for the project timeline"
    )
    
    end_date: Optional[date] = Field(
        None,
        description="Optional end date for the project timeline"
    )

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v
    


# ── Project Member Schemas ──────────────────────────────────
class AddMemberRequest(BaseModel):
    """
    Schema for adding a user to a project.
    """
    email: str = Field(..., description="Email address or username of the user to add")
    
    role: str = Field(
        default="member",
        pattern=r"^(admin|member|viewer)$",
        description="Role: admin, member, or viewer"
    )



class MemberResponse(BaseModel):
    """
    Schema for project member data returned to clients.
    """
    id: int
    user_id: int
    username: str
    full_name: Optional[str] = None
    role: str
    joined_at: datetime
    
    model_config = {
        "from_attributes": True
    }


# ── Project Response (What the API returns) ─────────────────
class ProjectResponse(ProjectBase):
    """
    Schema for project data returned to clients.
    """
    id: int
    key: str
    owner_id: int
    
    # Member count (computed, not stored in database)
    member_count: int = Field(
        default=0,
        description="Number of members in this project"
    )
    
    issue_count: int = Field(
        default=0,
        description="Number of open issues in this project"
    )
    
    start_date: Optional[date] = Field(
        None,
        description="Start date for the project timeline"
    )
    
    end_date: Optional[date] = Field(
        None,
        description="End date for the project timeline"
    )
    
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class ProjectDetailResponse(ProjectResponse):
    """
    Detailed project response including members list.
    Used for the project detail view.
    """
    members: list[MemberResponse] = Field(
        default_factory=list,
        description="List of project members with their roles"
    )