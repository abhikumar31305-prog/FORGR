"""Squash all migrations into a single correct initial schema matching models.py

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-09-06

This replaces the original broken 001/002/003 migrations which had:
- Table name mismatches (risk_prediction vs risk_predictions)
- Duplicate table creation (audit_log in both 001 and 002)
- Wrong column types vs actual models
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── students (must be created before users due to FK) ────────────
    op.create_table(
        'students',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('student_id', sa.String(), unique=True, index=True),
        sa.Column('roll_no', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('gender', sa.String(10), nullable=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('department', sa.String(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('semester', sa.Integer(), nullable=True),
        sa.Column('section', sa.String(5), nullable=True),
    )

    # ── users ────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('email', sa.String(), unique=True, index=True, nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('linked_profile_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_foreign_key(
        'fk_users_linked_profile_id', 'users', 'students', ['linked_profile_id'], ['id']
    )

    # ── academics ────────────────────────────────────────────────────
    op.create_table(
        'academics',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('student_id', sa.String(), index=True, nullable=False),
        sa.Column('semester', sa.Integer(), nullable=False),
        sa.Column('cgpa', sa.Float(), nullable=False),
        sa.Column('sgpa', sa.Float(), nullable=False),
        sa.Column('class_rank', sa.Integer(), nullable=True),
        sa.Column('backlogs', sa.Integer(), default=0),
        sa.Column('internal_avg', sa.Float(), nullable=True),
        sa.Column('external_avg', sa.Float(), nullable=True),
    )

    # ── attendance ───────────────────────────────────────────────────
    op.create_table(
        'attendance',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('student_id', sa.String(), index=True, nullable=False),
        sa.Column('semester', sa.Integer(), nullable=False),
        sa.Column('attendance_percentage', sa.Float(), nullable=False),
        sa.Column('classes_attended', sa.Integer(), nullable=True),
        sa.Column('classes_conducted', sa.Integer(), nullable=True),
        sa.Column('low_attendance', sa.Boolean(), default=False),
    )

    # ── skills ───────────────────────────────────────────────────────
    op.create_table(
        'skills',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('student_id', sa.String(), unique=True, index=True, nullable=False),
        sa.Column('python', sa.Integer(), default=0),
        sa.Column('java', sa.Integer(), default=0),
        sa.Column('sql', sa.Integer(), default=0),
        sa.Column('machine_learning', sa.Integer(), default=0),
        sa.Column('data_science', sa.Integer(), default=0),
        sa.Column('communication', sa.Integer(), default=0),
        sa.Column('coding_score', sa.Integer(), default=0),
    )

    # ── placements ───────────────────────────────────────────────────
    op.create_table(
        'placements',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('student_id', sa.String(), unique=True, index=True, nullable=False),
        sa.Column('aptitude_score', sa.Integer(), default=0),
        sa.Column('resume_score', sa.Integer(), default=0),
        sa.Column('communication_score', sa.Integer(), default=0),
        sa.Column('interview_readiness', sa.Integer(), default=0),
        sa.Column('employability_score', sa.Float(), default=0.0),
        sa.Column('placement_probability', sa.String(10), default='Low'),
        sa.Column('placed', sa.Boolean(), default=False),
        sa.Column('package_lpa', sa.Float(), default=0.0),
    )

    # ── portfolios ───────────────────────────────────────────────────
    op.create_table(
        'portfolios',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('student_id', sa.String(), unique=True, index=True, nullable=False),
        sa.Column('projects', sa.Integer(), default=0),
        sa.Column('certifications', sa.Integer(), default=0),
        sa.Column('github_repositories', sa.Integer(), default=0),
        sa.Column('github_score', sa.Integer(), default=0),
    )

    # ── risk_predictions ─────────────────────────────────────────────
    op.create_table(
        'risk_predictions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('student_id', sa.String(), unique=True, index=True, nullable=False),
        sa.Column('backlog_risk', sa.String(10), default='Low'),
        sa.Column('dropout_risk', sa.String(10), default='Low'),
        sa.Column('attendance_risk', sa.String(10), default='Low'),
        sa.Column('placement_risk', sa.String(10), default='Low'),
        sa.Column('overall_risk', sa.String(10), default='Low'),
        sa.Column('ai_suggestion', sa.Text(), nullable=True),
        sa.Column('model_version', sa.String(32), nullable=True),
        sa.Column('model_name', sa.String(64), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('predicted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ── student_profiles ─────────────────────────────────────────────
    op.create_table(
        'student_profiles',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('student_id', sa.String(), unique=True, index=True, nullable=False),
        sa.Column('profile_json', sa.Text(), nullable=False),
    )

    # ── auth_tokens ──────────────────────────────────────────────────
    op.create_table(
        'auth_tokens',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), index=True, nullable=False),
        sa.Column('token_hash', sa.String(128), unique=True, index=True, nullable=False),
        sa.Column('purpose', sa.String(32), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ── email_verifications ──────────────────────────────────────────
    op.create_table(
        'email_verifications',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), primary_key=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=False),
    )

    # ── login_audit_log ──────────────────────────────────────────────
    op.create_table(
        'login_audit_log',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('email', sa.String(), index=True, nullable=False),
        sa.Column('role', sa.String(32), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False, default=False),
        sa.Column('detail', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── edit_audit_log ───────────────────────────────────────────────
    op.create_table(
        'edit_audit_log',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('table_name', sa.String(64), nullable=False),
        sa.Column('student_id', sa.String(), nullable=True),
        sa.Column('user_email', sa.String(), nullable=False),
        sa.Column('action', sa.String(16), nullable=False),
        sa.Column('field_changed', sa.String(), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── import_history ───────────────────────────────────────────────
    op.create_table(
        'import_history',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('import_batch_id', sa.String(64), unique=True, index=True, nullable=False),
        sa.Column('admin_email', sa.String(), index=True, nullable=False),
        sa.Column('dataset_type', sa.String(32), nullable=False),
        sa.Column('import_mode', sa.String(32), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('total_rows', sa.Integer(), default=0),
        sa.Column('inserted_rows', sa.Integer(), default=0),
        sa.Column('updated_rows', sa.Integer(), default=0),
        sa.Column('skipped_rows', sa.Integer(), default=0),
        sa.Column('failed_rows', sa.Integer(), default=0),
        sa.Column('status', sa.String(32), default='Completed'),
        sa.Column('error_log_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── model_registry ───────────────────────────────────────────────
    op.create_table(
        'model_registry',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('model_name', sa.String(64), nullable=False),
        sa.Column('model_version', sa.String(32), nullable=False),
        sa.Column('model_type', sa.String(32), nullable=False, index=True),
        sa.Column('file_path', sa.String(512), nullable=False),
        sa.Column('metrics_json', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('promoted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('promoted_by', sa.String(), nullable=True),
    )

    # ── prediction_logs ──────────────────────────────────────────────
    op.create_table(
        'prediction_logs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('student_id', sa.String(), index=True, nullable=False),
        sa.Column('model_type', sa.String(32), nullable=False, index=True),
        sa.Column('model_version', sa.String(32), nullable=True),
        sa.Column('prediction', sa.String(32), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('input_features_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── drift_reports ────────────────────────────────────────────────
    op.create_table(
        'drift_reports',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('model_type', sa.String(32), nullable=False, index=True),
        sa.Column('model_version', sa.String(32), nullable=True),
        sa.Column('psi_score', sa.Float(), nullable=False),
        sa.Column('feature_drifts_json', sa.Text(), nullable=True),
        sa.Column('is_drifted', sa.Boolean(), default=False),
        sa.Column('window_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('window_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── audit_log ────────────────────────────────────────────────────
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
        sa.Column('actor_email', sa.String(), nullable=False, index=True),
        sa.Column('actor_role', sa.String(32), nullable=True),
        sa.Column('action_type', sa.String(32), nullable=False, index=True),
        sa.Column('resource_type', sa.String(64), nullable=False),
        sa.Column('resource_id', sa.String(), nullable=True),
        sa.Column('details_json', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('request_id', sa.String(64), nullable=True),
    )

    # ── consent_records ──────────────────────────────────────────────
    op.create_table(
        'consent_records',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), index=True, nullable=False),
        sa.Column('consent_type', sa.String(32), nullable=False, index=True),
        sa.Column('granted', sa.Boolean(), default=False, nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('policy_version', sa.String(16), default='1.0', nullable=False),
    )

    # ── subscriptions ────────────────────────────────────────────────
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('admin_email', sa.String(), unique=True, index=True, nullable=False),
        sa.Column('plan_id', sa.String(32), server_default='trial', nullable=False),
        sa.Column('billing_cycle', sa.String(16), server_default='monthly', nullable=False),
        sa.Column('profile_limit', sa.Integer(), server_default='100', nullable=False),
        sa.Column('status', sa.String(32), server_default='trialing', nullable=False, index=True),
        sa.Column('trial_start', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('trial_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('razorpay_subscription_id', sa.String(64), nullable=True),
        sa.Column('razorpay_customer_id', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── payment_transactions ─────────────────────────────────────────
    op.create_table(
        'payment_transactions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('admin_email', sa.String(), index=True, nullable=False),
        sa.Column('razorpay_order_id', sa.String(64), unique=True, index=True, nullable=False),
        sa.Column('razorpay_payment_id', sa.String(64), nullable=True, index=True),
        sa.Column('razorpay_signature', sa.String(128), nullable=True),
        sa.Column('amount_paise', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(8), server_default='INR', nullable=False),
        sa.Column('status', sa.String(32), server_default='created', nullable=False),
        sa.Column('plan_id', sa.String(32), nullable=False),
        sa.Column('billing_cycle', sa.String(16), nullable=False),
        sa.Column('profile_limit', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('payment_transactions')
    op.drop_table('subscriptions')
    op.drop_table('consent_records')
    op.drop_table('audit_log')
    op.drop_table('drift_reports')
    op.drop_table('prediction_logs')
    op.drop_table('model_registry')
    op.drop_table('import_history')
    op.drop_table('edit_audit_log')
    op.drop_table('login_audit_log')
    op.drop_table('email_verifications')
    op.drop_table('auth_tokens')
    op.drop_table('student_profiles')
    op.drop_table('risk_predictions')
    op.drop_table('portfolios')
    op.drop_table('placements')
    op.drop_table('skills')
    op.drop_table('attendance')
    op.drop_table('academics')
    op.drop_table('users')
    op.drop_table('students')
