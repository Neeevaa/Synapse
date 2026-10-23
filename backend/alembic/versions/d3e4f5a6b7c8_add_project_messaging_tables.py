"""add_project_messaging_tables

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-10-23 21:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, Sequence[str], None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create ConversationType Enum safely
    conversation_type_enum = postgresql.ENUM(
        'PROJECT_GROUP', 'DIRECT',
        name='conversationtype'
    )
    conversation_type_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create conversations table
    op.create_table(
        'conversations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column(
            'conversation_type',
            postgresql.ENUM('PROJECT_GROUP', 'DIRECT', name='conversationtype', create_type=False),
            server_default='PROJECT_GROUP',
            nullable=False
        ),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversations_project_id'), 'conversations', ['project_id'], unique=False)
    # Canonical project group partial unique index
    op.create_index(
        'uq_canonical_project_group',
        'conversations',
        ['project_id'],
        unique=True,
        postgresql_where=sa.text("conversation_type = 'PROJECT_GROUP'")
    )

    # 3. Create conversation_members table
    op.create_table(
        'conversation_members',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('conversation_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('conversation_id', 'user_id', name='uq_conversation_member')
    )
    op.create_index(op.f('ix_conversation_members_conversation_id'), 'conversation_members', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_conversation_members_user_id'), 'conversation_members', ['user_id'], unique=False)

    # 4. Create messages table
    op.create_table(
        'messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('conversation_id', sa.UUID(), nullable=False),
        sa.Column('sender_id', sa.UUID(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_messages_conversation_id'), 'messages', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_messages_sender_id'), 'messages', ['sender_id'], unique=False)
    op.create_index('ix_messages_conversation_created_at', 'messages', ['conversation_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_messages_conversation_created_at', table_name='messages')
    op.drop_index(op.f('ix_messages_sender_id'), table_name='messages')
    op.drop_index(op.f('ix_messages_conversation_id'), table_name='messages')
    op.drop_table('messages')

    op.drop_index(op.f('ix_conversation_members_user_id'), table_name='conversation_members')
    op.drop_index(op.f('ix_conversation_members_conversation_id'), table_name='conversation_members')
    op.drop_table('conversation_members')

    op.drop_index('uq_canonical_project_group', table_name='conversations')
    op.drop_index(op.f('ix_conversations_project_id'), table_name='conversations')
    op.drop_table('conversations')

    postgresql.ENUM(name='conversationtype').drop(op.get_bind(), checkfirst=True)
