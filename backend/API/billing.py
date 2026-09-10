"""
Razorpay Subscription & Profile-Based Billing API Router

Manages:
- Tiered student profile quotas (Starter 500, Growth 2,500, Enterprise 10,000, Custom)
- Monthly and annual billing cycles (with 20% annual discount)
- Razorpay order creation and HMAC-SHA256 signature verification
- Institutional trial period monitoring and validation quota checks
"""

import hashlib
import hmac
import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import audit
import crud
import models
from auth import get_db, require_role

logger = logging.getLogger("forgr.billing")

router = APIRouter(prefix="/api/billing", tags=["Billing & Subscriptions"])

APP_ENV = os.getenv("FORGR_ENV", "development").lower()


def get_razorpay_config() -> Dict[str, Any]:
    """Resolves Razorpay API credentials and detects gateway mode."""
    key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "").strip()

    # Determine mode:
    # - 'test': starts with rzp_test_ and is a real key (not placeholder / demo)
    # - 'live': starts with rzp_live_
    # - 'simulation': fallback simulated transactions when keys are not configured
    allow_sim = os.getenv("FORGR_ALLOW_BILLING_SIMULATION", "false").lower() in ("true", "1", "yes") or APP_ENV == "development"
    is_dummy_key = key_id in ("rzp_test_demo", "rzp_test_placeholder", "mock_key", "rzp_test_TZu3xxLwOagSjA")

    if not key_id or (is_dummy_key and allow_sim):
        mode = "test" if key_id.startswith("rzp_test_") else "simulation"
        is_simulation = True
    elif key_id.startswith("rzp_test_"):
        mode = "test"
        is_simulation = False
    elif key_id.startswith("rzp_live_"):
        mode = "live"
        is_simulation = False
    else:
        mode = "test" if "test" in key_id else "live"
        is_simulation = False

    return {
        "key_id": key_id or "rzp_test_forgr_demo",
        "key_secret": key_secret or "forgr_secret_test_key_123",
        "webhook_secret": webhook_secret or key_secret or "forgr_secret_test_key_123",
        "mode": mode,
        "is_simulation": is_simulation,
    }


def check_production_billing_safety():
    cfg = get_razorpay_config()
    allow_sim = os.getenv("FORGR_ALLOW_BILLING_SIMULATION", "false").lower() in ("true", "1", "yes")
    if APP_ENV == "production" and cfg["is_simulation"] and not allow_sim:
        raise RuntimeError(
            "Production billing requires real Razorpay credentials. "
            "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment, "
            "or set FORGR_ALLOW_BILLING_SIMULATION=true for sandbox/pilot deployments."
        )


check_production_billing_safety()

# ── Plan Specifications (in INR ₹) ───────────────────────────────────
USD_TO_INR = 83.0

# ── Plan Specifications (aligned with Landing Page pricing calculator) ─
PRICING_TIERS: Dict[str, Dict[str, Any]] = {
    "starter": {
        "id": "starter",
        "name": "Departmental Pilot",
        "description": "Ideal for single departments or pilot institutional deployments.",
        "profile_limit": 500,
        "base_rate_usd": 1.50,
        "monthly_price_usd": 750,
        "yearly_price_usd": 7200,
        "monthly_price_inr": int(round(750 * USD_TO_INR)),
        "yearly_price_inr": int(round(7200 * USD_TO_INR)),
        "features": [
            "Up to 500 Managed Student Profiles",
            "Master CSV Bulk Import & Validation",
            "Attendance & Academic Intelligence",
            "Standard Backlog & Placement ML Predictions",
            "Audit Trail (30 Days Retention)",
        ],
    },
    "growth": {
        "id": "growth",
        "name": "Campus Volume Tier",
        "description": "Campus volume tier for medium to large colleges scaling placement readiness.",
        "profile_limit": 2500,
        "popular": True,
        "base_rate_usd": 1.20,
        "monthly_price_usd": 3000,
        "yearly_price_usd": 28800,
        "monthly_price_inr": int(round(3000 * USD_TO_INR)),
        "yearly_price_inr": int(round(28800 * USD_TO_INR)),
        "features": [
            "Up to 2,500 Managed Student Profiles",
            "Unlimited Bulk Data Synchronizations",
            "Full Multi-Domain ML Pipeline & Drift Alerts",
            "Placement Readiness & Resume Scoring",
            "Full Compliance & Data Governance Trail",
            "Priority Pipeline Recalculations",
        ],
    },
    "enterprise": {
        "id": "enterprise",
        "name": "University Enterprise Tier",
        "description": "Full-scale university coverage with unlimited cohorts and custom SLAs.",
        "profile_limit": 10000,
        "base_rate_usd": 0.90,
        "monthly_price_usd": 9000,
        "yearly_price_usd": 86400,
        "monthly_price_inr": int(round(9000 * USD_TO_INR)),
        "yearly_price_inr": int(round(86400 * USD_TO_INR)),
        "features": [
            "Up to 10,000 Managed Student Profiles",
            "Multi-Department Federation & Custom Roles",
            "Real-Time ML Model Promotion & Custom Models",
            "Automated Institutional PDF Dossiers",
            "Dedicated Account Manager & 24/7 SLA",
            "Custom Data Retention & Encryption Policies",
        ],
    },
}


def calculate_custom_pricing(profiles: int, billing_cycle: str = "monthly") -> Dict[str, Any]:
    """Calculates price for arbitrary profile volumes referencing the Landing Page pricing model:
    - profiles <= 500: $1.50 / profile / mo ('Departmental pilot')
    - profiles <= 2500: $1.20 / profile / mo ('Campus volume discount')
    - profiles > 2500: $0.90 / profile / mo ('University enterprise tier')
    - Annual / Yearly billing: 20% discount
    """
    profiles = max(10, profiles)
    if profiles <= 500:
        base_rate_usd = 1.50
        tier_tag = "Departmental pilot"
    elif profiles <= 2500:
        base_rate_usd = 1.20
        tier_tag = "Campus volume discount"
    else:
        base_rate_usd = 0.90
        tier_tag = "University enterprise tier"

    effective_rate_usd = base_rate_usd * 0.8 if billing_cycle == "yearly" else base_rate_usd
    monthly_usd = int(round(profiles * effective_rate_usd))
    total_usd = monthly_usd * 12 if billing_cycle == "yearly" else monthly_usd

    total_inr = int(round(total_usd * USD_TO_INR))
    effective_rate_inr = round(effective_rate_usd * USD_TO_INR, 2)

    return {
        "profiles": profiles,
        "billing_cycle": billing_cycle,
        "base_rate_usd": base_rate_usd,
        "effective_rate_usd": effective_rate_usd,
        "monthly_usd": monthly_usd,
        "total_usd": total_usd,
        "rate_per_profile_usd": effective_rate_usd,
        "rate_per_profile_inr": effective_rate_inr,
        "rate_per_profile": effective_rate_inr,
        "total_amount_inr": total_inr,
        "tier_tag": tier_tag,
    }


# ── Schemas ──────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    plan_id: str = Field(..., description="starter | growth | enterprise | custom")
    billing_cycle: str = Field("monthly", description="monthly | yearly")
    custom_profiles: Optional[int] = Field(None, description="Only for plan_id='custom'")


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class TestSubscriptionRequest(BaseModel):
    plan_id: str = "growth"
    billing_cycle: str = "yearly"
    profile_limit: int = 2500
    expire_now: bool = False


# ── Helper Functions ──────────────────────────────────────────────────

def get_or_create_subscription(db: Session, admin_email: str) -> models.Subscription:
    """Retrieves existing subscription or provisions initial 14-day free trial."""
    sub = db.query(models.Subscription).filter(models.Subscription.admin_email == admin_email).first()
    if not sub:
        now = datetime.utcnow()
        sub = models.Subscription(
            admin_email=admin_email,
            plan_id="trial",
            billing_cycle="monthly",
            profile_limit=100,
            status="trialing",
            trial_start=now,
            trial_end=now + timedelta(days=14),
            current_period_start=now,
            current_period_end=now + timedelta(days=14),
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verifies HMAC SHA-256 signature from Razorpay callback."""
    cfg = get_razorpay_config()
    allow_sim = os.getenv("FORGR_ALLOW_BILLING_SIMULATION", "false").lower() in ("true", "1", "yes") or APP_ENV == "development"
    is_sim_req = (
        signature.startswith("sim_sig_")
        or order_id.startswith("order_sim_")
        or payment_id.startswith("pay_sim_")
    )
    if (cfg["is_simulation"] or allow_sim) and is_sim_req:
        return True

    payload = f"{order_id}|{payment_id}".encode("utf-8")
    generated_sig = hmac.new(
        cfg["key_secret"].encode("utf-8"),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(generated_sig, signature)


# ── Endpoints ─────────────────────────────────────────────────────────

@router.get("/plans")
def get_billing_plans():
    """Returns available institutional subscription plans and pricing rules."""
    cfg = get_razorpay_config()
    return {
        "currency": "INR",
        "currency_symbol": "₹",
        "plans": list(PRICING_TIERS.values()),
        "annual_discount_percentage": 20,
        "is_simulation_mode": cfg["is_simulation"],
        "gateway_mode": cfg["mode"],
        "razorpay_key_id": cfg["key_id"],
    }


@router.get("/status")
def get_subscription_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin", "faculty", "placement_cell")),
):
    """
    Returns current subscription status, managed profile counts, and validity.
    """
    cfg = get_razorpay_config()
    sub = get_or_create_subscription(db, current_user.email)
    now = datetime.utcnow()

    # Total student profiles currently in the live database
    current_profiles = db.query(models.Student).count()

    is_valid = False
    days_remaining = 0

    if sub.status == "active":
        if sub.current_period_end and sub.current_period_end > now:
            is_valid = True
            days_remaining = max(0, (sub.current_period_end - now).days)
        else:
            sub.status = "expired"
            db.commit()
    elif sub.status == "trialing":
        if sub.trial_end and sub.trial_end > now:
            is_valid = True
            days_remaining = max(0, (sub.trial_end - now).days)
        else:
            sub.status = "expired"
            db.commit()

    quota_exceeded = current_profiles > sub.profile_limit

    return {
        "admin_email": sub.admin_email,
        "plan_id": sub.plan_id,
        "plan_name": PRICING_TIERS.get(sub.plan_id, {}).get("name", "14-Day Free Evaluation" if sub.plan_id == "trial" else "Custom Plan"),
        "billing_cycle": sub.billing_cycle,
        "status": sub.status,
        "is_valid": is_valid,
        "days_remaining": days_remaining,
        "trial_end": sub.trial_end.isoformat() if sub.trial_end else None,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "current_profiles": current_profiles,
        "profile_limit": sub.profile_limit,
        "quota_exceeded": quota_exceeded,
        "can_import": is_valid and not quota_exceeded,
        "is_simulation_mode": cfg["is_simulation"],
        "gateway_mode": cfg["mode"],
        "razorpay_key_id": cfg["key_id"],
    }


@router.post("/create-order")
async def create_razorpay_order(
    req: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    """
    Creates a Razorpay order in INR paise based on chosen profile quota and billing cycle.
    """
    cfg = get_razorpay_config()
    plan_key = req.plan_id.lower().strip()
    cycle = req.billing_cycle.lower().strip()
    if cycle not in ("monthly", "yearly"):
        cycle = "monthly"

    if plan_key in PRICING_TIERS:
        tier = PRICING_TIERS[plan_key]
        amount_inr = tier["yearly_price_inr"] if cycle == "yearly" else tier["monthly_price_inr"]
        profile_limit = tier["profile_limit"]
    elif plan_key == "custom" and req.custom_profiles:
        calc = calculate_custom_pricing(req.custom_profiles, cycle)
        amount_inr = calc["total_amount_inr"]
        profile_limit = req.custom_profiles
    else:
        raise HTTPException(status_code=400, detail="Invalid plan selected or missing custom profile count.")

    amount_paise = amount_inr * 100
    receipt_id = f"rcpt_{uuid.uuid4().hex[:10]}"

    # Execute Razorpay Order Creation via official API or Simulator
    razorpay_order_id = ""
    allow_sim = os.getenv("FORGR_ALLOW_BILLING_SIMULATION", "false").lower() in ("true", "1", "yes") or APP_ENV == "development"

    if not cfg["is_simulation"]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.post(
                    "https://api.razorpay.com/v1/orders",
                    auth=(cfg["key_id"], cfg["key_secret"]),
                    json={
                        "amount": amount_paise,
                        "currency": "INR",
                        "receipt": receipt_id,
                        "notes": {
                            "admin_email": current_user.email,
                            "plan_id": plan_key,
                            "cycle": cycle,
                            "profile_limit": str(profile_limit),
                        },
                    },
                )
                if res.status_code == 200:
                    razorpay_order_id = res.json().get("id", "")
                else:
                    err_desc = "Order creation failed"
                    try:
                        err_desc = res.json().get("error", {}).get("description") or res.text
                    except Exception:
                        err_desc = res.text
                    logger.warning("Razorpay order creation returned [%d]: %s", res.status_code, err_desc)
                    if allow_sim:
                        logger.info("Local environment active: seamlessly falling back to simulated order.")
                        razorpay_order_id = f"order_sim_{uuid.uuid4().hex[:14]}"
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST if res.status_code in (400, 401) else status.HTTP_502_BAD_GATEWAY,
                            detail=f"Razorpay error: {err_desc}",
                        )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            logger.exception("Razorpay order creation failed")
            if allow_sim:
                logger.info("Local environment active: seamlessly falling back to simulated order.")
                razorpay_order_id = f"order_sim_{uuid.uuid4().hex[:14]}"
            else:
                raise HTTPException(status_code=502, detail="Payment provider is unavailable.") from e

    # Fallback to simulated order ID if in dev/simulation
    if not razorpay_order_id:
        razorpay_order_id = f"order_sim_{uuid.uuid4().hex[:14]}"

    is_sim_order = cfg["is_simulation"] or razorpay_order_id.startswith("order_sim_")

    # Record pending transaction
    tx = models.PaymentTransaction(
        admin_email=current_user.email,
        razorpay_order_id=razorpay_order_id,
        amount_paise=amount_paise,
        currency="INR",
        status="created",
        plan_id=plan_key,
        billing_cycle=cycle,
        profile_limit=profile_limit,
    )
    db.add(tx)
    db.commit()

    return {
        "order_id": razorpay_order_id,
        "amount_paise": amount_paise,
        "amount_inr": amount_inr,
        "currency": "INR",
        "key_id": cfg["key_id"],
        "plan_id": plan_key,
        "billing_cycle": cycle,
        "profile_limit": profile_limit,
        "is_simulation": is_sim_order,
        "gateway_mode": "simulation" if is_sim_order else cfg["mode"],
    }


@router.post("/verify-payment")
def verify_payment_and_activate_subscription(
    req: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    """
    Validates Razorpay payment signature, captures transaction, and activates subscription.
    """
    tx = db.query(models.PaymentTransaction).filter(
        models.PaymentTransaction.razorpay_order_id == req.razorpay_order_id
    ).first()

    if not tx:
        raise HTTPException(status_code=404, detail="Order reference not found in database.")
    if tx.admin_email != current_user.email:
        raise HTTPException(status_code=404, detail="Order reference not found in database.")
    if tx.status == "captured":
        raise HTTPException(status_code=409, detail="Payment has already been verified.")
    if tx.status != "created":
        raise HTTPException(status_code=409, detail="Payment transaction is not pending verification.")

    # Validate signature
    is_valid = verify_razorpay_signature(req.razorpay_order_id, req.razorpay_payment_id, req.razorpay_signature)
    if not is_valid:
        tx.status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail="Razorpay signature verification failed.")

    # Update transaction
    tx.razorpay_payment_id = req.razorpay_payment_id
    tx.razorpay_signature = req.razorpay_signature
    tx.status = "captured"

    # Activate/Update Subscription
    sub = get_or_create_subscription(db, current_user.email)
    now = datetime.utcnow()
    duration_days = 365 if tx.billing_cycle == "yearly" else 30

    sub.plan_id = tx.plan_id
    sub.billing_cycle = tx.billing_cycle
    sub.profile_limit = tx.profile_limit
    sub.status = "active"
    sub.current_period_start = now
    sub.current_period_end = now + timedelta(days=duration_days)

    db.commit()
    db.refresh(sub)

    # Compliance audit log
    audit.log_audit_event(
        db=db,
        actor_email=current_user.email,
        action_type="subscription_change",
        resource_type="subscriptions",
        actor_role="admin",
        resource_id=str(sub.id),
        details={
            "plan_id": sub.plan_id,
            "billing_cycle": sub.billing_cycle,
            "profile_limit": sub.profile_limit,
            "amount_paid_inr": tx.amount_paise / 100,
            "razorpay_payment_id": req.razorpay_payment_id,
        },
    )

    return {
        "status": "success",
        "message": f"Successfully activated {sub.plan_id.upper()} subscription ({tx.billing_cycle.upper()}) for up to {sub.profile_limit} student profiles.",
        "subscription": {
            "plan_id": sub.plan_id,
            "billing_cycle": sub.billing_cycle,
            "profile_limit": sub.profile_limit,
            "status": sub.status,
            "current_period_end": sub.current_period_end.isoformat(),
        },
    }


@router.post("/simulate-test-subscription")
def simulate_test_subscription(
    req: TestSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    """
    Developer / evaluation helper to toggle subscription status for quick verification.
    """
    sub = get_or_create_subscription(db, current_user.email)
    now = datetime.utcnow()

    if req.expire_now:
        sub.status = "expired"
        sub.current_period_end = now - timedelta(days=1)
        sub.trial_end = now - timedelta(days=1)
    else:
        sub.status = "active"
        sub.plan_id = req.plan_id
        sub.billing_cycle = req.billing_cycle
        sub.profile_limit = req.profile_limit
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=365 if req.billing_cycle == "yearly" else 30)

    db.commit()
    db.refresh(sub)

    return {
        "status": "updated",
        "plan_id": sub.plan_id,
        "subscription_status": sub.status,
        "profile_limit": sub.profile_limit,
        "expires_at": sub.current_period_end.isoformat() if sub.current_period_end else None,
    }


@router.get("/transactions")
def get_payment_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    """Returns invoice & transaction history for the institution."""
    txs = db.query(models.PaymentTransaction).filter(
        models.PaymentTransaction.admin_email == current_user.email
    ).order_by(models.PaymentTransaction.created_at.desc()).limit(50).all()

    return [
        {
            "id": t.id,
            "order_id": t.razorpay_order_id,
            "payment_id": t.razorpay_payment_id or "—",
            "amount_inr": t.amount_paise / 100,
            "status": t.status,
            "plan_id": t.plan_id,
            "billing_cycle": t.billing_cycle,
            "profile_limit": t.profile_limit,
            "date": t.created_at.isoformat(),
        }
        for t in txs
    ]


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Handles Razorpay asynchronous webhooks (e.g. payment.captured, order.paid).
    Verifies X-Razorpay-Signature header against RAZORPAY_WEBHOOK_SECRET.
    """
    body_bytes = await request.body()
    signature = request.headers.get("X-Razorpay-Signature") or request.headers.get("x-razorpay-signature")

    cfg = get_razorpay_config()
    secret = cfg.get("webhook_secret") or cfg.get("key_secret")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing X-Razorpay-Signature header.")

    computed_signature = hmac.new(
        secret.encode("utf-8"),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed_signature, signature):
        logger.warning("Invalid Razorpay webhook signature received.")
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    try:
        event = json.loads(body_bytes.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.") from e

    event_type = event.get("event")
    logger.info("Received Razorpay webhook event: %s", event_type)

    if event_type in ("payment.captured", "order.paid"):
        payload_data = event.get("payload", {})
        payment_entity = payload_data.get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        payment_id = payment_entity.get("id")

        if not order_id and event_type == "order.paid":
            order_id = payload_data.get("order", {}).get("entity", {}).get("id")

        if order_id:
            tx = db.query(models.PaymentTransaction).filter(
                models.PaymentTransaction.razorpay_order_id == order_id
            ).first()

            if tx and tx.status != "captured":
                tx.status = "captured"
                if payment_id:
                    tx.razorpay_payment_id = payment_id
                tx.razorpay_signature = signature

                # Activate subscription
                sub = get_or_create_subscription(db, tx.admin_email)
                now = datetime.utcnow()
                duration_days = 365 if tx.billing_cycle == "yearly" else 30

                sub.plan_id = tx.plan_id
                sub.billing_cycle = tx.billing_cycle
                sub.profile_limit = tx.profile_limit
                sub.status = "active"
                sub.current_period_start = now
                sub.current_period_end = now + timedelta(days=duration_days)

                db.commit()
                logger.info("Activated subscription for %s via webhook", tx.admin_email)

    return {"status": "ok", "event": event_type}

