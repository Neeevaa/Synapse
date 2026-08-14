"""add_meeting_management_tables

Revision ID: 4b5c6d7e8f9a
Revises: 3a4b5c6d7e8f
Create Date: 2026-08-13 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '4b5c6d7e8f9a'
down_revision = '3a4b5c6d7e8f'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create Enum Types safely
    meeting_type_enum = postgresql.ENUM(
        'PLANNING', 'STANDUP', 'REVIEW', 'RETROSPECTIVE', 'REQUIREMENT_DISCUSSION', 'TECHNICAL', 'CLIENT', 'OTHER',
        name='meetingtype'
    )
    meeting_type_enum.create(op.get_bind(), checkfirst=True)

    meeting_status_enum = postgresql.ENUM(
        'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
        name='meetingstatus'
    )
    meeting_status_enum.create(op.get_bind(), checkfirst=True)

    attendance_status_enum = postgresql.ENUM(
        'INVITED', 'ATTENDED', 'ABSENT', 'DECLINED',
        name='attendancestatus'
    )
    attendance_status_enum.create(op.get_bind(), checkfirst=True)

    action_item_status_enum = postgresql.ENUM(
        'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
        name='actionitemstatus'
    )
    action_item_status_enum.create(op.get_bind(), checkfirst=True)

    action_item_priority_enum = postgresql.ENUM(
        'LOW', 'MEDIUM', 'HIGH', 'URGENT',
        name='actionitempriority'
    )
    action_item_priority_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create meetings table
    op.create_table(
        'meetings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('meeting_type', postgresql.ENUM('PLANNING', 'STANDUP', 'REVIEW', 'RETROSPECTIVE', 'REQUIREMENT_DISCUSSION', 'TECHNICAL', 'CLIENT', 'OTHER', name='meetingtype', create_type=False), nullable=False, server_default='PLANNING'),
        sa.Column('organizer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('status', postgresql.ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', name='meetingstatus', create_type=False), nullable=False, server_default='SCHEDULED'),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('decisions', sa.Text(), nullable=True),
        sa.Column('discussion_notes', sa.Text(), nullable=True),
        sa.Column('risks_concerns', sa.Text(), nullable=True),
        sa.Column('transcript', sa.Text(), nullable=True),
        sa.Column('transcript_updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('recording_url_or_reference', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_meetings_project_id'), 'meetings', ['project_id'], unique=False)
    op.create_index(op.f('ix_meetings_company_id'), 'meetings', ['company_id'], unique=False)

    # 3. Create meeting_participants table
    op.create_table(
        'meeting_participants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('meeting_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('meetings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('attendance_status', postgresql.ENUM('INVITED', 'ATTENDED', 'ABSENT', 'DECLINED', name='attendancestatus', create_type=False), nullable=False, server_default='INVITED'),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_meeting_participants_meeting_id'), 'meeting_participants', ['meeting_id'], unique=False)
    op.create_index(op.f('ix_meeting_participants_user_id'), 'meeting_participants', ['user_id'], unique=False)

    # 4. Create meeting_agenda_items table
    op.create_table(
        'meeting_agenda_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('meeting_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('meetings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(50), nullable=False, server_default='PLANNED'),
    )
    op.create_index(op.f('ix_meeting_agenda_items_meeting_id'), 'meeting_agenda_items', ['meeting_id'], unique=False)

    # 5. Create meeting_action_items table
    op.create_table(
        'meeting_action_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('meeting_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('meetings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', postgresql.ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', name='actionitemstatus', create_type=False), nullable=False, server_default='OPEN'),
        sa.Column('priority', postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT', name='actionitempriority', create_type=False), nullable=False, server_default='MEDIUM'),
        sa.Column('requirement_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('requirements.id', ondelete='SET NULL'), nullable=True),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_meeting_action_items_meeting_id'), 'meeting_action_items', ['meeting_id'], unique=False)


def downgrade():
    op.drop_table('meeting_action_items')
    op.drop_table('meeting_agenda_items')
    op.drop_table('meeting_participants')
    op.drop_table('meetings')

    op.execute('DROP TYPE IF EXISTS actionitempriority')
    op.execute('DROP TYPE IF EXISTS actionitemstatus')
    op.execute('DROP TYPE IF EXISTS attendancestatus')
    op.execute('DROP TYPE IF EXISTS meetingstatus')
    op.execute('DROP TYPE IF EXISTS meetingtype')
