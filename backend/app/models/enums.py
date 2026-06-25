"""
Enum definitions for the IssueDesk application.

Centralizes all enum types used across models and schemas
to avoid scattered string literals.
"""

import enum


class IssueStatus(str, enum.Enum):
    """
    Issue status workflow.

    Flow:
        open → in_progress → resolved → closed
          ↑                       |
          └────── reopened ←──────┘
    """
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"


class IssuePriority(str, enum.Enum):
    """Importance level of an issue."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssueType(str, enum.Enum):
    """Category of an issue."""
    BUG = "bug"
    FEATURE = "feature"
    TASK = "task"
    IMPROVEMENT = "improvement"

