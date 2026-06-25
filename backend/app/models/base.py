"""
Base model module.

Provides a common base class for all database models.
Each model defines its own __tablename__ explicitly.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, DateTime

from app.core.database import Base


class TimestampMixin:
    """
    Mixin class that adds common columns to every table.
    
    Every table gets:
    - id: Auto-incrementing primary key
    - created_at: Set automatically when a row is created
    - updated_at: Updated automatically when a row is modified
    """
    
    id = Column(Integer, primary_key=True, index=True)
    """Primary key. Auto-increments automatically."""
    
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    """Timestamp when the record was created."""
    
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    """Timestamp when the record was last updated."""