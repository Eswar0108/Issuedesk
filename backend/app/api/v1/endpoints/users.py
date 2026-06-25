"""
Users endpoints module.

CRUD operations for user management.
Most endpoints require authentication.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import (
    UserResponse, UserUpdate, UserListItem
)
from app.schemas.common import (
    MessageResponse, PaginatedResponse, PaginationParams
)
from app.repositories.user_repository import UserRepository
from app.core.security import hash_password

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Returns the profile of the currently authenticated user.",
)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get the currently authenticated user's profile.
    
    Args:
        current_user: The authenticated user (from JWT token)
        
    Returns:
        UserResponse with user profile data
    """
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
    description="Update your own profile information.",
)
def update_my_profile(
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the currently authenticated user's profile.
    
    Args:
        update_data: Fields to update (email, full_name)
        db: Database session
        current_user: The authenticated user
        
    Returns:
        Updated UserResponse
        
    Raises:
        409 Conflict: If email is already taken
    """
    repo = UserRepository(db)
    
    # Check email uniqueness if trying to change email
    if update_data.email and update_data.email != current_user.email:
        if repo.is_email_taken(update_data.email, exclude_id=current_user.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already in use"
            )
    
    # Update the user
    updated_user = repo.update(current_user, update_data)
    return UserResponse.model_validate(updated_user)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID",
    description="Get a specific user's public profile.",
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a user by their ID.
    
    Args:
        user_id: The user's ID
        db: Database session
        current_user: The authenticated user
        
    Returns:
        UserResponse with user data
        
    Raises:
        404 Not Found: If user doesn't exist
    """
    repo = UserRepository(db)
    user = repo.get(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    return UserResponse.model_validate(user)


@router.get(
    "",
    response_model=PaginatedResponse[UserListItem],
    summary="List users",
    description="Get a paginated list of all active users.",
)
def list_users(
    pagination: PaginationParams = Depends(),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get paginated list of users with optional search.
    
    Args:
        pagination: Page number and page size for pagination
        search: Optional search term for username/email
        db: Database session
        current_user: The authenticated user
        
    Returns:
        PaginatedResponse with user list items
    """
    repo = UserRepository(db)
    
    # Use search as a filter if provided
    # For simplicity, we pass is_active=True as a filter
    users, total = repo.get_all(
        skip=pagination.skip,
        limit=pagination.limit,
        is_active=True
    )
    
    items = [UserListItem.model_validate(u) for u in users]
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=(total + pagination.page_size - 1) // pagination.page_size
    )