"""Initial schema creation - baseline for FORGR application

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-05

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the initial schema with all tables.
    
    This captures the baseline schema from the FORGR application
    as of 2026-09-05. All subsequent migrations should be incremental.
    """
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('linked_profile_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.Index('ix_users_email', 'email'),
        sa.Index('ix_users_role', 'role')
    )
    
    # Create login_audit_log table
    op.create_table(
        'login_audit_log',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('login_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.Index('ix_login_audit_log_user_id', 'user_id'),
        sa.Index('ix_login_audit_log_email', 'email')
    )
    
    # Create students table
    op.create_table(
        'students',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('student_id', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('date_of_birth', sa.String(), nullable=True),
        sa.Column('cgpa', sa.Float(), nullable=True),
        sa.Column('resume_link', sa.String(), nullable=True),
        sa.Column('portfolio_link', sa.String(), nullable=True),
        sa.Column('linkedin_link', sa.String(), nullable=True),
        sa.Column('status', sa.String(), default='active', nullable=False),
        sa.Column('batch_year', sa.Integer(), nullable=True),
        sa.Column('risk_level', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_students_student_id', 'student_id'),
        sa.Index('ix_students_email', 'email'),
        sa.Index('ix_students_status', 'status')
    )
    
    # Create academics table
    op.create_table(
        'academics',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('student_id', sa.String(), nullable=False),
        sa.Column('semester', sa.String(), nullable=False),
        sa.Column('gpa', sa.Float(), nullable=True),
        sa.Column('attempted_credits', sa.Float(), nullable=True),
        sa.Column('earned_credits', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.Index('ix_academics_student_id', 'student_id')
    )
    
    # Create attendance table
    op.create_table(
        'attendance',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('student_id', sa.String(), nullable=False),
        sa.Column('month', sa.String(), nullable=False),
        sa.Column('attendance_percent', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.Index('ix_attendance_student_id', 'student_id')
    )
    
    # Create skills table
    op.create_table(
        'skills',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('student_id', sa.String(), nullable=False),
        sa.Column('skill_name', sa.String(), nullable=False),
        sa.Column('proficiency', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.Index('ix_skills_student_id', 'student_id')
    )
    
    # Create portfolio table
    op.create_table(
        'portfolio',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('student_id', sa.String(), nullable=False),
        sa.Column('project_name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('technologies', sa.String(), nullable=True),
        sa.Column('link', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.Index('ix_portfolio_student_id', 'student_id')
    )
    
    # Create placement table
    op.create_table(
        'placement',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('student_id', sa.String(), nullable=False),
        sa.Column('company_name', sa.String(), nullable=True),
        sa.Column('position', sa.String(), nullable=True),
        sa.Column('salary', sa.Float(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('offer_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.Index('ix_placement_student_id', 'student_id')
    )
    
    # Create risk_prediction table
    op.create_table(
        'risk_prediction',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('student_id', sa.String(), nullable=False),
        sa.Column('risk_score', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.String(), nullable=True),
        sa.Column('model_version', sa.String(), nullable=True),
        sa.Column('prediction_date', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.Index('ix_risk_prediction_student_id', 'student_id')
    )
    
    # Create audit_log table
    op.create_table(
        'audit_log',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('table_name', sa.String(), nullable=False),
        sa.Column('record_id', sa.String(), nullable=False),
        sa.Column('user_email', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('old_values', sa.String(), nullable=True),
        sa.Column('new_values', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_audit_log_table_record', 'table_name', 'record_id'),
        sa.Index('ix_audit_log_timestamp', 'timestamp')
    )
    
    # Create bulk_import_batch table
    op.create_table(
        'bulk_import_batch',
        sa.Column('batch_id', sa.String(), nullable=False),
        sa.Column('imported_by', sa.String(), nullable=False),
        sa.Column('import_timestamp', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('row_count', sa.Integer(), nullable=False),
        sa.Column('success_count', sa.Integer(), nullable=False),
        sa.Column('error_count', sa.Integer(), nullable=False),
        sa.Column('table_name', sa.String(), nullable=False),
        sa.Column('mode', sa.String(), nullable=False),
        sa.Column('error_report_signed_url', sa.String(), nullable=True),
        sa.Column('rollback_executed', sa.Boolean(), default=False, nullable=False),
        sa.PrimaryKeyConstraint('batch_id'),
        sa.Index('ix_bulk_import_batch_timestamp', 'import_timestamp')
    )


def downgrade() -> None:
    """Drop all tables in reverse order to undo initial schema creation."""
    op.drop_table('bulk_import_batch')
    op.drop_table('audit_log')
    op.drop_table('risk_prediction')
    op.drop_table('placement')
    op.drop_table('portfolio')
    op.drop_table('skills')
    op.drop_table('attendance')
    op.drop_table('academics')
    op.drop_table('students')
    op.drop_table('login_audit_log')
    op.drop_table('users')
