"""add_attachments_table

Revision ID: a76d239ccf5d
Revises: d74fbfcbbc32
Create Date: 2026-06-26 11:39:49.154808

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a76d239ccf5d'
down_revision: Union[str, Sequence[str], None] = 'd74fbfcbbc32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the attachments table with polymorphic entity columns."""
    op.create_table(
        'attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('file_name', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(length=200), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=20), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('uploader_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['uploader_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_attachments_entity', 'attachments', ['entity_type', 'entity_id'], unique=False)
    op.create_index(op.f('ix_attachments_id'), 'attachments', ['id'], unique=False)


def downgrade() -> None:
    """Drop the attachments table."""
    op.drop_index(op.f('ix_attachments_id'), table_name='attachments')
    op.drop_index('ix_attachments_entity', table_name='attachments')
    op.drop_table('attachments')
