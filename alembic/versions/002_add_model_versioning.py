"""Add model versioning, ML monitoring, and compliance tables

Revision ID: 002
Revises: 001
Create Date: 2026-09-05
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '002_model_versioning'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Add model versioning columns to risk_predictions ─────────────
    op.add_column('risk_predictions', sa.Column('model_version', sa.String(32), nullable=True))
    op.add_column('risk_predictions', sa.Column('model_name', sa.String(64), nullable=True))
    op.add_column('risk_predictions', sa.Column('confidence', sa.Float(), nullable=True))
    op.add_column('risk_predictions', sa.Column('predicted_at', sa.DateTime(timezone=True), nullable=True))

    # ── Create model_registry table ──────────────────────────────────
    op.create_table(
        'model_registry',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('model_name', sa.String(64), nullable=False),
        sa.Column('model_version', sa.String(32), nullable=False),
        sa.Column('model_type', sa.String(32), nullable=False),
        sa.Column('file_path', sa.String(512), nullable=False),
        sa.Column('metrics_json', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('promoted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('promoted_by', sa.String(), nullable=True),
    )
    op.create_index('ix_model_registry_model_type', 'model_registry', ['model_type'])
    op.create_index('ix_model_registry_is_active', 'model_registry', ['is_active'])

    # ── Create prediction_logs table ─────────────────────────────────
    op.create_table(
        'prediction_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('student_id', sa.String(), nullable=False),
        sa.Column('model_type', sa.String(32), nullable=False),
        sa.Column('model_version', sa.String(32), nullable=True),
        sa.Column('prediction', sa.String(32), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('input_features_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_prediction_logs_student_id', 'prediction_logs', ['student_id'])
    op.create_index('ix_prediction_logs_model_type', 'prediction_logs', ['model_type'])

    # ── Create drift_reports table ───────────────────────────────────
    op.create_table(
        'drift_reports',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('model_type', sa.String(32), nullable=False),
        sa.Column('model_version', sa.String(32), nullable=True),
        sa.Column('psi_score', sa.Float(), nullable=False),
        sa.Column('feature_drifts_json', sa.Text(), nullable=True),
        sa.Column('is_drifted', sa.Boolean(), default=False),
        sa.Column('window_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('window_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_drift_reports_model_type', 'drift_reports', ['model_type'])

    # ── Create audit_log table ───────────────────────────────────────
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('actor_email', sa.String(), nullable=False),
        sa.Column('actor_role', sa.String(32), nullable=True),
        sa.Column('action_type', sa.String(32), nullable=False),
        sa.Column('resource_type', sa.String(64), nullable=False),
        sa.Column('resource_id', sa.String(), nullable=True),
        sa.Column('details_json', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('request_id', sa.String(64), nullable=True),
    )
    op.create_index('ix_audit_log_timestamp', 'audit_log', ['timestamp'])
    op.create_index('ix_audit_log_actor_email', 'audit_log', ['actor_email'])
    op.create_index('ix_audit_log_action_type', 'audit_log', ['action_type'])

    # ── Create consent_records table ─────────────────────────────────
    op.create_table(
        'consent_records',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('consent_type', sa.String(32), nullable=False),
        sa.Column('granted', sa.Boolean(), default=False, nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('policy_version', sa.String(16), default='1.0', nullable=False),
    )
    op.create_index('ix_consent_records_user_id', 'consent_records', ['user_id'])
    op.create_index('ix_consent_records_consent_type', 'consent_records', ['consent_type'])


def downgrade() -> None:
    op.drop_table('consent_records')
    op.drop_table('audit_log')
    op.drop_table('drift_reports')
    op.drop_table('prediction_logs')
    op.drop_table('model_registry')

    op.drop_column('risk_predictions', 'predicted_at')
    op.drop_column('risk_predictions', 'confidence')
    op.drop_column('risk_predictions', 'model_name')
    op.drop_column('risk_predictions', 'model_version')
