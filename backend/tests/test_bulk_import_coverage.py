"""
Test Suite for Bulk Import Execution, Atomic Rollback, Quotas, and RBAC Authorization.
Validates production requirements for SRS FR-AA-5, FR-RP-5.
"""

import io
import json
import os
import sys
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import SessionLocal
import models
import crud
from API.billing import get_or_create_subscription

TEST_PASSWORD = os.getenv("FORGR_TEST_PASSWORD", "forgr-test-password")


def _login(client: TestClient, email: str) -> str:
    res = client.post("/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestBulkImportCoverage:
    """Comprehensive test suite for bulk import execution, rollback, quotas, and authorization."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.client = TestClient(app)
        self.admin_token = _login(self.client, "admin@forgr.app")
        self.faculty_token = _login(self.client, "faculty@forgr.app")
        self.recruiter_token = _login(self.client, "recruiter@forgr.app")

        # Ensure admin has adequate profile capacity
        db = SessionLocal()
        try:
            sub = get_or_create_subscription(db, "admin@forgr.app")
            sub.profile_limit = 50000
            sub.status = "active"
            sub.current_period_end = datetime.utcnow() + timedelta(days=365)

            student_user = db.query(models.User).filter_by(email="student_cov@forgr.app").first()
            if not student_user:
                student_user = models.User(
                    email="student_cov@forgr.app",
                    password_hash=crud.hash_password(TEST_PASSWORD),
                    role="student",
                )
                db.add(student_user)
            db.commit()
        finally:
            db.close()

        self.student_token = _login(self.client, "student_cov@forgr.app")

    # ── 1. AUTHORIZATION TESTS ──────────────────────────────────────────

    def test_non_admin_cannot_execute_master_student_import(self):
        """Students and Recruiters must receive 403 Forbidden on master student import."""
        csv_data = b"student_id,name,email,department,year\nS_COV_01,Alice,alice@test.com,CSE,2\n"

        # Student attempt
        res_student = self.client.post(
            "/api/bulk-import/execute-import",
            data={"dataset_type": "students", "import_mode": "upsert"},
            files={"file": ("students.csv", csv_data, "text/csv")},
            headers=_auth(self.student_token),
        )
        assert res_student.status_code == 403

        # Recruiter attempt
        res_recruiter = self.client.post(
            "/api/bulk-import/execute-import",
            data={"dataset_type": "students", "import_mode": "upsert"},
            files={"file": ("students.csv", csv_data, "text/csv")},
            headers=_auth(self.recruiter_token),
        )
        assert res_recruiter.status_code == 403

    def test_faculty_forbidden_from_master_student_import(self):
        """Faculty can import academics/attendance, but cannot import master students or unified cohort."""
        csv_data = b"student_id,name,email,department,year\nS_COV_02,Bob,bob@test.com,CSE,2\n"

        res = self.client.post(
            "/api/bulk-import/execute-import",
            data={"dataset_type": "students", "import_mode": "upsert"},
            files={"file": ("students.csv", csv_data, "text/csv")},
            headers=_auth(self.faculty_token),
        )
        assert res.status_code == 403
        assert "Only ADMINS can perform Master Student" in res.json()["detail"]

    def test_replace_mode_forbidden_for_non_admin(self):
        """Replace mode is strictly restricted to Administrators."""
        csv_data = b"student_id,semester,cgpa\n1001,4,8.5\n"
        res = self.client.post(
            "/api/bulk-import/execute-import",
            data={"dataset_type": "academics", "import_mode": "replace", "replace_confirmed": True},
            files={"file": ("academics.csv", csv_data, "text/csv")},
            headers=_auth(self.faculty_token),
        )
        assert res.status_code == 403
        assert "Replace mode is strictly restricted to Administrators" in res.json()["detail"]

    def test_replace_mode_requires_explicit_confirmation(self):
        """Admin using replace mode without replace_confirmed=True must receive 400 Bad Request."""
        csv_data = b"student_id,semester,cgpa\n1001,4,8.5\n"
        res = self.client.post(
            "/api/bulk-import/execute-import",
            data={"dataset_type": "academics", "import_mode": "replace", "replace_confirmed": False},
            files={"file": ("academics.csv", csv_data, "text/csv")},
            headers=_auth(self.admin_token),
        )
        assert res.status_code == 400
        assert "Explicit confirmation is required" in res.json()["detail"]

    # ── 2. QUOTA & SUBSCRIPTION TESTS ───────────────────────────────────

    def test_quota_exceeded_returns_402_payment_required(self):
        """Importing rows that would exceed the administrator's profile limit must return 402."""
        db = SessionLocal()
        try:
            sub = get_or_create_subscription(db, "admin@forgr.app")
            original_limit = sub.profile_limit
            original_status = sub.status
            # Set a very low profile limit
            sub.profile_limit = 5
            sub.status = "active"
            sub.current_period_end = datetime.utcnow() + timedelta(days=30)
            db.commit()

            csv_rows = ["student_id,name,email,department,year"]
            for i in range(10):
                csv_rows.append(f"QUOTA_{i},Student {i},quota_{i}@test.com,CSE,1")
            csv_data = "\n".join(csv_rows).encode("utf-8")

            res = self.client.post(
                "/api/bulk-import/execute-import",
                data={"dataset_type": "students", "import_mode": "upsert"},
                files={"file": ("quota_test.csv", csv_data, "text/csv")},
                headers=_auth(self.admin_token),
            )
            assert res.status_code == 402
            assert "capacity" in res.json()["detail"].lower() or "quota" in res.json()["detail"].lower()

        finally:
            # Restore original subscription status
            sub = get_or_create_subscription(db, "admin@forgr.app")
            sub.profile_limit = 50000
            sub.status = "active"
            sub.current_period_end = datetime.utcnow() + timedelta(days=365)
            db.commit()
            db.close()

    def test_expired_subscription_returns_402_payment_required(self):
        """Admin with an expired subscription must be blocked from importing with 402."""
        db = SessionLocal()
        try:
            sub = get_or_create_subscription(db, "admin@forgr.app")
            sub.status = "expired"
            sub.current_period_end = datetime.utcnow() - timedelta(days=5)
            db.commit()

            csv_data = b"student_id,name,email,department,year\nEXP_01,Exp Student,exp@test.com,CSE,1\n"
            res = self.client.post(
                "/api/bulk-import/execute-import",
                data={"dataset_type": "students", "import_mode": "upsert"},
                files={"file": ("students.csv", csv_data, "text/csv")},
                headers=_auth(self.admin_token),
            )
            assert res.status_code == 402
            assert "subscription" in res.json()["detail"].lower()

        finally:
            # Restore active subscription
            sub = get_or_create_subscription(db, "admin@forgr.app")
            sub.status = "active"
            sub.current_period_end = datetime.utcnow() + timedelta(days=365)
            sub.profile_limit = 50000
            db.commit()
            db.close()

    # ── 3. EXECUTION TESTS ──────────────────────────────────────────────

    def test_successful_student_bulk_import_execution(self):
        """Admin successfully executes student bulk import and records are created."""
        uid = uuid.uuid4().hex[:6]
        sid1 = f"COV_{uid}_1"
        sid2 = f"COV_{uid}_2"
        csv_data = (
            f"student_id,name,email,department,year\n"
            f"{sid1},Alice Coverage,alice_{uid}@forgr.app,CSE,2\n"
            f"{sid2},Bob Coverage,bob_{uid}@forgr.app,ECE,3\n"
        ).encode("utf-8")

        res = self.client.post(
            "/api/bulk-import/execute-import",
            data={"dataset_type": "students", "import_mode": "upsert"},
            files={"file": (f"cohort_{uid}.csv", csv_data, "text/csv")},
            headers=_auth(self.admin_token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("success", "completed_with_warnings")
        assert data["inserted"] >= 2
        assert "batch_id" in data

        # Verify students exist in DB
        db = SessionLocal()
        try:
            s1 = db.query(models.Student).filter_by(student_id=sid1).first()
            s2 = db.query(models.Student).filter_by(student_id=sid2).first()
            assert s1 is not None, f"Student {sid1} was not inserted"
            assert s2 is not None, f"Student {sid2} was not inserted"
            assert s1.department == "CSE"
            assert s2.department == "ECE"

            # Verify audit log was recorded
            audit = db.query(models.EditAuditLog).filter(
                models.EditAuditLog.field_changed == "bulk_import_students_upsert"
            ).order_by(models.EditAuditLog.id.desc()).first()
            assert audit is not None
            assert audit.user_email == "admin@forgr.app"
        finally:
            db.close()

    def test_faculty_successful_academics_import(self):
        """Faculty can successfully import academic metrics for existing students."""
        db = SessionLocal()
        uid = uuid.uuid4().hex[:6]
        sid = f"ACAD_{uid}"
        try:
            db.add(models.Student(
                student_id=sid,
                name="Academic Test Student",
                email=f"acad_{uid}@forgr.app",
                department="CSE",
                year=2,
            ))
            db.commit()
        finally:
            db.close()

        csv_data = f"student_id,semester,cgpa,sgpa,backlogs\n{sid},3,8.75,8.90,0\n".encode("utf-8")
        res = self.client.post(
            "/api/bulk-import/execute-import",
            data={"dataset_type": "academics", "import_mode": "upsert"},
            files={"file": ("academics.csv", csv_data, "text/csv")},
            headers=_auth(self.faculty_token),
        )
        assert res.status_code == 200
        assert res.json()["inserted"] >= 1

        # Verify academic record in DB
        db = SessionLocal()
        try:
            acad = db.query(models.Academic).filter_by(student_id=sid, semester=3).first()
            assert acad is not None
            assert acad.cgpa == 8.75
        finally:
            db.close()

    # ── 4. ATOMIC ROLLBACK TESTS ────────────────────────────────────────

    def test_atomic_rollback_on_critical_failure(self):
        """
        When an unhandled database error occurs during import execution,
        db.rollback() must be called, a failed history record recorded, and HTTP 500 returned.
        """
        uid = uuid.uuid4().hex[:6]
        sid = f"ROLL_{uid}"
        csv_data = f"student_id,name,email,department,year\n{sid},Rollback Test,roll_{uid}@forgr.app,CSE,1\n".encode("utf-8")

        # Mock db.commit during row processing to simulate an unexpected DB crash
        with patch.object(models.Student, "__init__", side_effect=RuntimeError("Simulated DB Disk Crash")):
            res = self.client.post(
                "/api/bulk-import/execute-import",
                data={"dataset_type": "students", "import_mode": "upsert"},
                files={"file": ("rollback_test.csv", csv_data, "text/csv")},
                headers=_auth(self.admin_token),
            )
            assert res.status_code == 500
            assert "rolled back" in res.json()["detail"].lower()

        # Verify student was NOT inserted (atomic rollback preserved DB integrity)
        db = SessionLocal()
        try:
            student = db.query(models.Student).filter_by(student_id=sid).first()
            assert student is None, "Student record should have rolled back"

            # Verify failed import history record was logged
            history = db.query(models.ImportHistory).filter(
                models.ImportHistory.file_name == "rollback_test.csv"
            ).order_by(models.ImportHistory.id.desc()).first()
            assert history is not None
            assert history.status == "Failed"
        finally:
            db.close()
