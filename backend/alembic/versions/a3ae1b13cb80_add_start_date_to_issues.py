"""add_start_date_to_issues

Revision ID: a3ae1b13cb80
Revises: a76d239ccf5d
Create Date: 2026-06-26 15:19:08.440596

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3ae1b13cb80'
down_revision: Union[str, Sequence[str], None] = 'a76d239ccf5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('issues', sa.Column('start_date', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('issues', 'start_date')
    # ### end Alembic commands ###
