"""Add subscriptions and payment_transactions tables

Revision ID: 003_subscriptions_and_billing
Revises: 002_model_versioning
Create Date: 2026-09-06
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_subscriptions_and_billing'
down_revision = '002_model_versioning'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Create subscriptions table ────────────────────────────────────
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('admin_email', sa.String(), nullable=False),
        sa.Column('plan_id', sa.String(32), server_default='trial', nullable=False),
        sa.Column('billing_cycle', sa.String(16), server_default='monthly', nullable=False),
        sa.Column('profile_limit', sa.Integer(), server_default='100', nullable=False),
        sa.Column('status', sa.String(32), server_default='trialing', nullable=False),
        sa.Column('trial_start', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('trial_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('razorpay_subscription_id', sa.String(64), nullable=True),
        sa.Column('razorpay_customer_id', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_subscriptions_id', 'subscriptions', ['id'])
    op.create_index('ix_subscriptions_admin_email', 'subscriptions', ['admin_email'], unique=True)
    op.create_index('ix_subscriptions_status', 'subscriptions', ['status'])

    # ── Create payment_transactions table ─────────────────────────────
    op.create_table(
        'payment_transactions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('admin_email', sa.String(), nullable=False),
        sa.Column('razorpay_order_id', sa.String(64), nullable=False),
        sa.Column('razorpay_payment_id', sa.String(64), nullable=True),
        sa.Column('razorpay_signature', sa.String(128), nullable=True),
        sa.Column('amount_paise', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(8), server_default='INR', nullable=False),
        sa.Column('status', sa.String(32), server_default='created', nullable=False),
        sa.Column('plan_id', sa.String(32), nullable=False),
        sa.Column('billing_cycle', sa.String(16), nullable=False),
        sa.Column('profile_limit', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_payment_transactions_id', 'payment_transactions', ['id'])
    op.create_index('ix_payment_transactions_admin_email', 'payment_transactions', ['admin_email'])
    op.create_index('ix_payment_transactions_razorpay_order_id', 'payment_transactions', ['razorpay_order_id'], unique=True)
    op.create_index('ix_payment_transactions_razorpay_payment_id', 'payment_transactions', ['razorpay_payment_id'])


def downgrade() -> None:
    op.drop_table('payment_transactions')
    op.drop_table('subscriptions')
