"""
Base repository module.

Provides a generic CRUD (Create, Read, Update, Delete) repository class.
All specific repositories inherit from this to avoid repeating common operations.
This is the "Don't Repeat Yourself" (DRY) approach to database access.
"""

from typing import Generic, TypeVar, Type, Optional, Any

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import Base

# Generic type for SQLAlchemy models
ModelType = TypeVar("ModelType", bound=Base)
# Generic type for Pydantic schemas
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Generic repository with common database operations.
    
    Usage:
        class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
            def __init__(self, db: Session):
                super().__init__(User, db)
    
    Type Parameters:
        ModelType: The SQLAlchemy model class
        CreateSchemaType: The Pydantic schema for creation
        UpdateSchemaType: The Pydantic schema for updates
    """
    
    def __init__(self, model: Type[ModelType], db: Session):
        """
        Initialize the repository.
        
        Args:
            model: The SQLAlchemy model class (e.g., User, Project)
            db: SQLAlchemy database session
        """
        self.model = model
        self.db = db
    
    def get(self, id: int) -> Optional[ModelType]:
        """
        Get a single record by its primary key.
        
        Args:
            id: The primary key value
            
        Returns:
            The model instance if found, None otherwise
        """
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        **filters: Any
    ) -> tuple[list[ModelType], int]:
        """
        Get paginated list of records with optional filtering.
        
        Args:
            skip: Number of records to skip (for pagination)
            limit: Maximum records to return
            **filters: Keyword arguments for exact match filtering
                       e.g., status="open", project_id=1
        
        Returns:
            Tuple of (list of model instances, total count)
        """
        query = self.db.query(self.model)
        
        # Apply filters dynamically
        # Example: status="open" becomes .filter(Model.status == "open")
        for field, value in filters.items():
            if value is not None:
                column = getattr(self.model, field, None)
                if column is not None:
                    query = query.filter(column == value)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination
        items = query.offset(skip).limit(limit).all()
        
        return items, total
    
    def create(self, schema: CreateSchemaType, **kwargs: Any) -> ModelType:
        """
        Create a new record from a Pydantic schema.
        
        Args:
            schema: Pydantic schema with validated data
            **kwargs: Extra fields to add to the model instance (e.g., owner_id)
            
        Returns:
            The newly created model instance
        """
        # Convert Pydantic schema to dict, excluding unset/null values
        data = schema.model_dump(exclude_unset=True)
        data.update(kwargs)
        
        # Create model instance
        db_obj = self.model(**data)
        
        # Add to session and commit
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        
        return db_obj
    
    def update(
        self,
        db_obj: ModelType,
        schema: UpdateSchemaType
    ) -> ModelType:
        """
        Update an existing record.
        
        Args:
            db_obj: The existing database object to update
            schema: Pydantic schema with the fields to update
            
        Returns:
            The updated model instance
        """
        # Get only the fields that were actually provided in the request
        update_data = schema.model_dump(exclude_unset=True)
        
        # Update each field on the database object
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        # Commit changes
        self.db.commit()
        self.db.refresh(db_obj)
        
        return db_obj
    
    def delete(self, id: int) -> bool:
        """
        Delete a record by its primary key.
        
        Args:
            id: The primary key of the record to delete
            
        Returns:
            True if deleted, False if not found
        """
        db_obj = self.get(id)
        if not db_obj:
            return False
        
        self.db.delete(db_obj)
        self.db.commit()
        
        return True
    
    def count(self, **filters: Any) -> int:
        """
        Count records matching the given filters.
        
        Args:
            **filters: Keyword arguments for exact match filtering
            
        Returns:
            Total count of matching records
        """
        query = self.db.query(self.model)
        
        for field, value in filters.items():
            if value is not None:
                column = getattr(self.model, field, None)
                if column is not None:
                    query = query.filter(column == value)
        
        return query.count()