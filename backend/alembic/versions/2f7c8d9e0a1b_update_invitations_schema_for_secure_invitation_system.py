"""update_invitations_schema_for_secure_invitation_system

Revision ID: 2f7c8d9e0a1b
Revises: 1cb5f320c206
Create Date: 2026-08-12 22:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '2f7c8d9e0a1b'
down_revision: Union[str, Sequence[str], None] = '1cb5f320c206'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create invitationstatus enum type if it does not exist
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitationstatus') THEN "
        "CREATE TYPE invitationstatus AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'); "
        "END IF; END $$;"
    )

    # 2. Add project_id UUID column with foreign key to projects.id (ondelete CASCADE)
    op.add_column('invitations', sa.Column('project_id', sa.UUID(), nullable=False))
    op.create_foreign_key(
        'invitations_project_id_fkey',
        'invitations',
        'projects',
        ['project_id'],
        ['id'],
        ondelete='CASCADE',
    )

    # 3. Rename role -> project_role
    op.alter_column('invitations', 'role', new_column_name='project_role')

    # 4. Rename token -> token_hash and ensure unique index
    op.execute("ALTER TABLE invitations RENAME COLUMN token TO token_hash")
    op.execute("ALTER TABLE invitations ALTER COLUMN token_hash TYPE VARCHAR(128)")
    op.execute("ALTER INDEX IF EXISTS invitations_token_key RENAME TO ix_invitations_token_hash")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_invitations_token_hash ON invitations(token_hash)")

    # 5. Replace accepted boolean column with status Enum(InvitationStatus)
    op.drop_column('invitations', 'accepted')
    invitation_status_enum = postgresql.ENUM(
        'PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED', name='invitationstatus', create_type=False
    )
    op.add_column(
        'invitations',
        sa.Column('status', invitation_status_enum, nullable=False, server_default='PENDING'),
    )

    # 6. Add personal_message, used_at, revoked_at, created_by columns
    op.add_column('invitations', sa.Column('personal_message', sa.Text(), nullable=True))
    op.add_column('invitations', sa.Column('used_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invitations', sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True))

    op.add_column('invitations', sa.Column('created_by', sa.UUID(), nullable=False))
    op.create_foreign_key(
        'invitations_created_by_fkey',
        'invitations',
        'users',
        ['created_by'],
        ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_constraint('invitations_created_by_fkey', 'invitations', type_='foreignkey')
    op.drop_column('invitations', 'created_by')
    op.drop_column('invitations', 'revoked_at')
    op.drop_column('invitations', 'used_at')
    op.drop_column('invitations', 'personal_message')
    op.drop_column('invitations', 'status')

    op.add_column('invitations', sa.Column('accepted', sa.Boolean(), nullable=False, server_default='false'))

    op.execute("ALTER INDEX IF EXISTS ix_invitations_token_hash RENAME TO invitations_token_key")
    op.execute("ALTER TABLE invitations RENAME COLUMN token_hash TO token")

    op.alter_column('invitations', 'project_role', new_column_name='role')

    op.drop_constraint('invitations_project_id_fkey', 'invitations', type_='foreignkey')
    op.drop_column('invitations', 'project_id')

    op.execute("DROP TYPE IF EXISTS invitationstatus")
