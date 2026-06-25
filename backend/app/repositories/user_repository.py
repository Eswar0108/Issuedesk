"""
User repository module.

Data access layer for User model.
Extends BaseRepository with user-specific query methods.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    """
    Repository for User database operations.
    
    Inherits generic CRUD (get, get_all, create, update, delete)
    from BaseRepository and adds user-specific queries.
    """
    
    def __init__(self, db: Session):
        """Initialize with User model."""
        super().__init__(User, db)
    
    def get_by_username(self, username: str) -> Optional[User]:
        """
        Find a user by their username (used for login).
        
        Args:
            username: The username to search for
            
        Returns:
            User if found, None otherwise
        """
        return (
            self.db.query(self.model)
            .filter(self.model.username == username)
            .first()
        )
    
    def get_by_email(self, email: str) -> Optional[User]:
        """
        Find a user by their email address.
        
        Args:
            email: The email to search for
            
        Returns:
            User if found, None otherwise
        """
        return (
            self.db.query(self.model)
            .filter(self.model.email == email)
            .first()
        )
    
    def get_by_username_or_email(self, identifier: str) -> Optional[User]:
        """
        Find a user by either username OR email.
        
        Used for login where the user can enter either.
        
        Args:
            identifier: Username or email address
            
        Returns:
            User if found, None otherwise
        """
        return (
            self.db.query(self.model)
            .filter(
                (self.model.username == identifier) |
                (self.model.email == identifier)
            )
            .first()
        )
    
    def is_username_taken(self, username: str, exclude_id: Optional[int] = None) -> bool:
        """
        Check if a username is already taken.
        
        Args:
            username: The username to check
            exclude_id: Optional user ID to exclude (used when updating)
            
        Returns:
            True if username exists, False otherwise
        """
        query = self.db.query(self.model).filter(self.model.username == username)
        if exclude_id:
            query = query.filter(self.model.id != exclude_id)
        return query.first() is not None
    
    def is_email_taken(self, email: str, exclude_id: Optional[int] = None) -> bool:
        """
        Check if an email is already registered.
        
        Args:
            email: The email to check
            exclude_id: Optional user ID to exclude (used when updating)
            
        Returns:
            True if email exists, False otherwise
        """
        query = self.db.query(self.model).filter(self.model.email == email)
        if exclude_id:
            query = query.filter(self.model.id != exclude_id)
        return query.first() is not None