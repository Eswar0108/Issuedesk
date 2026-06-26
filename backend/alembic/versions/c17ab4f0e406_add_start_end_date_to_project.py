"""add_start_end_date_to_project

Revision ID: c17ab4f0e406
Revises: 5b9d55a4cf73
Create Date: 2026-06-25 16:27:41.862901

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c17ab4f0e406'
down_revision: Union[str, Sequence[str], None] = '5b9d55a4cf73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add start_date and end_date columns to projects table."""
    op.add_column('projects', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('projects', sa.Column('end_date', sa.Date(), nullable=True))


def downgrade() -> None:
    """Remove start_date and end_date columns from projects table."""
    op.drop_column('projects', 'end_date')
    op.drop_column('projects', 'start_date')
