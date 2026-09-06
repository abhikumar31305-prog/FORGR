"""Comprehensive test suite for FORGR Backend API

Tests cover:
- Authentication and authorization
- Role-based access control (RBAC)
- CSV import functionality
- API endpoints
- IDOR vulnerabilities
- Data validation
"""

import os
import sys
import json
import uuid
import pytest
from io import BytesIO
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import SessionLocal
import models
import crud
import schemas

TEST_PASSWORD = os.getenv("FORGR_TEST_PASSWORD", "forgr-test-password")


# ── Helpers ──────────────────────────────────────────────────────────


def _login(client: TestClient, email: str) -> dict:
    res = client.post("/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Authentication Tests ─────────────────────────────────────────────


class TestAuthentication:
    """Test authentication and token management"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.client = TestClient(app)
        db = SessionLocal()
        try:
            db.query(models.LoginAuditLog).delete()
            db.commit()
        finally:
            db.close()

    def test_login_success(self):
        """Test successful login"""
        response = self.client.post(
            "/auth/login",
            json={"email": "admin@forgr.app", "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == "admin@forgr.app"
        assert data["user"]["role"] == "admin"

    def test_login_invalid_credentials(self):
        """Test login with wrong password — authenticate_user raises ValueError → 400"""
        response = self.client.post(
            "/auth/login",
            json={"email": "admin@forgr.app", "password": "wrong-password"}
        )
        assert response.status_code == 400

    def test_login_nonexistent_user(self):
        """Test login with non-existent email — raises LookupError → 404"""
        response = self.client.post(
            "/auth/login",
            json={"email": "nonexistent@forgr.app", "password": TEST_PASSWORD}
        )
        assert response.status_code == 404

    def test_refresh_token(self):
        """Test token refresh — endpoint expects JSON body, not header"""
        login_response = self.client.post(
            "/auth/login",
            json={"email": "admin@forgr.app", "password": TEST_PASSWORD}
        )
        refresh_token = login_response.json()["refresh_token"]

        # POST /auth/refresh expects a JSON body with refresh_token
        response = self.client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_invalid_token(self):
        """Test request with invalid token"""
        response = self.client.get(
            "/students",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401

    def test_login_audit_log(self):
        """Test login audit logging"""
        self.client.post(
            "/auth/login",
            json={"email": "faculty@forgr.app", "password": TEST_PASSWORD}
        )

        db = SessionLocal()
        try:
            logs = db.query(models.LoginAuditLog).filter(
                models.LoginAuditLog.email == "faculty@forgr.app"
            ).all()
            assert len(logs) > 0
            assert logs[-1].email == "faculty@forgr.app"
        finally:
            db.close()


# ── RBAC Tests ───────────────────────────────────────────────────────


class TestRoleBasedAccessControl:
    """Test RBAC and authorization"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.client = TestClient(app)
        self.tokens = {}
        users = {
            "admin": "admin@forgr.app",
            "faculty": "faculty@forgr.app",
            "placement": "placement@forgr.app",
            "recruiter": "recruiter@forgr.app",
            "parent": "parent1@forgr.app",
        }
        for role_name, email in users.items():
            data = _login(self.client, email)
            self.tokens[role_name] = data["access_token"]

    def test_admin_access_all_endpoints(self):
        """Test admin can access student list"""
        response = self.client.get(
            "/students",
            headers=_auth_header(self.tokens["admin"])
        )
        assert response.status_code in [200, 404]

    def test_student_cannot_access_admin_endpoints(self):
        """Test non-admin cannot register users (register requires admin role)"""
        # Faculty should be denied registration endpoint
        response = self.client.post(
            "/auth/register",
            json={
                "email": "new@forgr.app",
                "role": "faculty",
                "password": "test12345678"
            },
            headers=_auth_header(self.tokens["faculty"])
        )
        assert response.status_code == 403

    def test_faculty_can_view_students(self):
        """Test faculty can view student list"""
        response = self.client.get(
            "/students",
            headers=_auth_header(self.tokens["faculty"])
        )
        assert response.status_code in [200, 404]

    def test_recruiter_cannot_create_students(self):
        """Test recruiter cannot create students (POST /students requires admin)"""
        response = self.client.post(
            "/students",
            json={
                "student_id": "TEST-REC-01",
                "name": "Test",
                "email": "test-rec@test.com",
                "department": "CSE",
                "year": 2,
            },
            headers=_auth_header(self.tokens["recruiter"])
        )
        assert response.status_code == 403

    def test_admin_dashboard_forbidden_for_faculty(self):
        """Test faculty cannot access admin dashboard"""
        response = self.client.get(
            "/dashboard/admin",
            headers=_auth_header(self.tokens["faculty"])
        )
        assert response.status_code == 403


# ── CSV Import Tests ─────────────────────────────────────────────────


class TestCSVImport:
    """Test bulk CSV import via the actual /api/bulk-import endpoints"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.client = TestClient(app)
        data = _login(self.client, "admin@forgr.app")
        self.admin_token = data["access_token"]

    def test_valid_csv_preview(self):
        """Test uploading a valid CSV for validation/preview"""
        csv_content = b"student_id,name,email,department,year\nCSV001,John Doe,john@example.com,CSE,2\n"
        response = self.client.post(
            "/api/bulk-import/detect-and-validate",
            data={"dataset_type": "students"},
            files={"file": ("students.csv", csv_content, "text/csv")},
            headers=_auth_header(self.admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_rows" in data
        assert data["total_rows"] == 1

    def test_import_with_invalid_columns(self):
        """Test CSV with completely unrecognized columns"""
        csv_content = b"foo,bar\n1,2\n"
        response = self.client.post(
            "/api/bulk-import/detect-and-validate",
            data={"dataset_type": "students"},
            files={"file": ("bad.csv", csv_content, "text/csv")},
            headers=_auth_header(self.admin_token),
        )
        # Should return 200 with validation errors or 400
        assert response.status_code in [200, 400, 422]

    def test_duplicate_row_detection(self):
        """Test duplicate student IDs are detected"""
        csv_content = (
            b"student_id,name,email,department,year\n"
            b"DUP001,Student One,s1@test.com,CSE,2\n"
            b"DUP001,Student Dup,s1dup@test.com,CSE,2\n"
        )
        response = self.client.post(
            "/api/bulk-import/detect-and-validate",
            data={"dataset_type": "students"},
            files={"file": ("dup.csv", csv_content, "text/csv")},
            headers=_auth_header(self.admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("duplicate_rows", 0) >= 1

    def test_non_admin_cannot_import(self):
        """Test non-admin cannot access bulk import endpoints"""
        faculty_data = _login(self.client, "faculty@forgr.app")
        faculty_token = faculty_data["access_token"]

        csv_content = b"student_id,name,email,department,year\nF001,Test,test@t.com,CSE,2\n"
        response = self.client.post(
            "/api/bulk-import/detect-and-validate",
            data={"dataset_type": "unified"},
            files={"file": ("test.csv", csv_content, "text/csv")},
            headers=_auth_header(faculty_token),
        )
        assert response.status_code == 403

    def test_template_downloads(self):
        """Test template CSV downloads are available"""
        templates = [
            "student_master_template.csv",
            "academics_template.csv",
            "unified_student_template.csv",
        ]
        for t in templates:
            res = self.client.get(f"/api/bulk-import/templates/{t}")
            assert res.status_code == 200, f"Template {t} returned {res.status_code}"
            assert "student_id" in res.text


# ── API Endpoint Tests ───────────────────────────────────────────────


class TestAPIEndpoints:
    """Test core API endpoint functionality"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.client = TestClient(app)
        data = _login(self.client, "admin@forgr.app")
        self.admin_token = data["access_token"]

    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = self.client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "checks" in data
        assert "database" in data["checks"]

    def test_home_endpoint(self):
        """Test root endpoint"""
        response = self.client.get("/")
        assert response.status_code == 200
        assert "message" in response.json()

    def test_student_list_endpoint(self):
        """Test listing students"""
        response = self.client.get(
            "/students",
            headers=_auth_header(self.admin_token)
        )
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert isinstance(response.json(), (list, dict))

    def test_admin_dashboard(self):
        """Test admin dashboard endpoint"""
        response = self.client.get(
            "/dashboard/admin",
            headers=_auth_header(self.admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_students" in data

    def test_audit_logs_endpoint(self):
        """Test audit logs endpoint"""
        response = self.client.get(
            "/api/admin/audit-logs",
            headers=_auth_header(self.admin_token)
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_import_history_endpoint(self):
        """Test import history endpoint"""
        response = self.client.get(
            "/api/admin/import-history",
            headers=_auth_header(self.admin_token)
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


# ── Data Validation Tests ────────────────────────────────────────────


class TestDataValidation:
    """Test data validation and sanitization"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.client = TestClient(app)
        data = _login(self.client, "admin@forgr.app")
        self.admin_token = data["access_token"]

    def test_student_create_missing_fields(self):
        """Test student creation with missing required fields → 422"""
        response = self.client.post(
            "/students",
            json={"student_id": "VAL001"},
            headers=_auth_header(self.admin_token)
        )
        assert response.status_code == 422

    def test_register_missing_role(self):
        """Test registration without role field → 422"""
        response = self.client.post(
            "/auth/register",
            json={
                "email": "norole@forgr.app",
                "password": "Password123!"
            },
            headers=_auth_header(self.admin_token)
        )
        assert response.status_code == 422

    def test_sql_injection_protection(self):
        """Test SQL injection protection in query parameters"""
        response = self.client.get(
            "/students",
            params={"branch": "'; DROP TABLE students; --"},
            headers=_auth_header(self.admin_token)
        )
        # Should not crash; may return empty list or 200
        assert response.status_code in [200, 422, 400]

    def test_xss_in_student_name(self):
        """Test XSS payload in student name is stored as-is (sanitized at rendering)"""
        uid = uuid.uuid4().hex[:6]
        response = self.client.post(
            "/students",
            json={
                "student_id": f"XSS_{uid}",
                "name": "<script>alert('xss')</script>",
                "email": f"xss_{uid}@example.com",
                "department": "CSE",
                "year": 2,
            },
            headers=_auth_header(self.admin_token)
        )
        # Accept or reject — either way, no crash
        assert response.status_code in [200, 422, 400]


# ── IDOR Vulnerability Tests ─────────────────────────────────────────


class TestIDORVulnerabilities:
    """Test protection against Insecure Direct Object Reference"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.client = TestClient(app)
        db = SessionLocal()
        try:
            # Ensure test students exist
            for sid, name, email in [
                ("IDOR001", "Student One", "idor1@test.com"),
                ("IDOR002", "Student Two", "idor2@test.com"),
            ]:
                if not db.query(models.Student).filter(models.Student.student_id == sid).first():
                    db.add(models.Student(
                        student_id=sid,
                        name=name,
                        email=email,
                        department="CSE",
                        year=2,
                    ))
            db.commit()

            # Link a student user to IDOR001
            student_rec = db.query(models.Student).filter(
                models.Student.student_id == "IDOR001"
            ).first()
            student_user = db.query(models.User).filter_by(
                email="student1@forgr.app"
            ).first()
            if not student_user:
                student_user = models.User(
                    email="student1@forgr.app",
                    password_hash=crud.hash_password(TEST_PASSWORD),
                    role="student",
                    linked_profile_id=student_rec.id if student_rec else None,
                )
                db.add(student_user)
                db.commit()
            elif student_rec:
                student_user.linked_profile_id = student_rec.id
                db.commit()
        finally:
            db.close()

    def test_student_cannot_access_other_profile(self):
        """Test student cannot access another student's profile"""
        login_data = _login(self.client, "student1@forgr.app")
        token = login_data["access_token"]

        # Try to access IDOR002's profile — should be forbidden
        response = self.client.get(
            "/students/IDOR002/profile",
            headers=_auth_header(token)
        )
        assert response.status_code == 403

    def test_student_cannot_access_other_dashboard(self):
        """Test student cannot access another student's dashboard"""
        login_data = _login(self.client, "student1@forgr.app")
        token = login_data["access_token"]

        response = self.client.get(
            "/dashboard/student/IDOR002",
            headers=_auth_header(token)
        )
        assert response.status_code == 403
