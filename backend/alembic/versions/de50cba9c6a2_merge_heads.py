"""merge heads

Revision ID: de50cba9c6a2
Revises: 9aa2f4b2b90d, a9b8c7d6e5f4, f92026072800
Create Date: 2026-08-03 14:43:16.115849

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'de50cba9c6a2'
down_revision: Union[str, Sequence[str], None] = ('9aa2f4b2b90d', 'a9b8c7d6e5f4', 'f92026072800')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
