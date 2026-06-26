"""
Projects endpoints module.

CRUD operations for projects and member management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse,
    AddMemberRequest, MemberResponse
)
from app.schemas.common import MessageResponse
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=201,
    summary="Create a new project",
)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new project. The current user becomes the owner.
    """
    repo = ProjectRepository(db)
    
    # Check if project key is already taken
    if repo.get_by_key(project_data.key):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Project key '{project_data.key}' is already in use"
        )
    
    # Create project with current user as owner
    project = repo.create(project_data, owner_id=current_user.id)
    
    # Add the owner as a member with 'owner' role
    repo.add_member(project.id, current_user.id, role="owner")
    
    response = ProjectResponse.model_validate(project)
    response.member_count = 1
    response.issue_count = 0
    return response


@router.get(
    "",
    response_model=list[ProjectResponse],
    summary="List user's projects",
)
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all projects where the current user is a member or owner.
    """
    repo = ProjectRepository(db)
    projects = repo.get_user_projects(current_user.id)
    
    result = []
    for project in projects:
        response = ProjectResponse.model_validate(project)
        response.member_count = repo.get_member_count(project.id)
        response.issue_count = repo.get_issue_count(project.id)
        result.append(response)
    
    return result


@router.get(
    "/{project_id}",
    response_model=ProjectDetailResponse,
    summary="Get project details",
)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a project with full details including members list.
    """
    repo = ProjectRepository(db)
    project = repo.get(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    # Build response with member details
    response = ProjectDetailResponse.model_validate(project)
    response.member_count = repo.get_member_count(project.id)
    response.issue_count = repo.get_issue_count(project.id)
    
    return response


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update project",
)
def update_project(
    project_id: int,
    update_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a project's name, description, or archive status.
    """
    repo = ProjectRepository(db)
    project = repo.get(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    updated = repo.update(project, update_data)
    response = ProjectResponse.model_validate(updated)
    response.member_count = repo.get_member_count(project.id)
    response.issue_count = repo.get_issue_count(project.id)
    return response


@router.delete(
    "/{project_id}",
    response_model=MessageResponse,
    summary="Delete project",
)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a project and all its issues.
    """
    repo = ProjectRepository(db)
    project = repo.get(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    repo.delete(project_id)
    return MessageResponse(message="Project deleted successfully")


# ── Member Management Endpoints ─────────────────────────────

@router.post(
    "/{project_id}/members",
    response_model=MemberResponse,
    status_code=201,
    summary="Add member to project",
)
def add_member(
    project_id: int,
    member_data: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a user to the project with a specific role.
    """
    project_repo = ProjectRepository(db)
    user_repo = UserRepository(db)
    
    # Verify project exists
    project = project_repo.get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Verify user exists
    user = user_repo.get_by_username_or_email(member_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with username or email '{member_data.email}' not found"
        )
    
    # Add member
    try:
        member = project_repo.add_member(
            project_id, 
            user.id, 
            member_data.role
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    
    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        username=user.username,
        full_name=user.full_name,
        role=member.role,
        joined_at=member.joined_at
    )


@router.delete(
    "/{project_id}/members/{user_id}",
    response_model=MessageResponse,
    summary="Remove member from project",
)
def remove_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a user from the project.
    """
    repo = ProjectRepository(db)
    
    removed = repo.remove_member(project_id, user_id)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this project"
        )
    
    return MessageResponse(message="Member removed successfully")



@router.patch(
        "/projects/{project_id}",
        response_model=MessageResponse,
        status_code=201,
        summary="Update project status")

def update_project_status(
    project_id: int,
    update_data: ProjectUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    
    """
    Update the contents of a project.
    """

    project_repo =  ProjectRepository(db)
    user_repo = UserRepository(db)

    project = project_repo.get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    updated = project.update(project, update_data)
    response = ProjectResponse.model_validate(updated)
    response.member_count = project.get_member_count(project.id)
    response.issue_count = project.get_issue_count(project.id)
    return response