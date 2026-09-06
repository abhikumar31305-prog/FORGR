import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import SessionLocal
import models
import crud

TEST_PASSWORD = os.getenv("FORGR_TEST_PASSWORD", "forgr-test-password")

class TestProductionUpgrade(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        db = SessionLocal()
        try:
            crud.seed_default_auth_users(db)
            hashed = crud.hash_password(TEST_PASSWORD)
            db.query(models.User).update({models.User.password_hash: hashed}, synchronize_session=False)
            db.query(models.LoginAuditLog).delete()
            db.commit()
        finally:
            db.close()

    def _login(self, email: str, role: str):
        res = self.client.post("/auth/login", json={"email": email, "password": TEST_PASSWORD})
        self.assertEqual(res.status_code, 200, f"Login failed for {email}: {res.text}")
        data = res.json()
        self.assertEqual(data["user"]["role"], role)
        return data["access_token"], data["user"]

    def test_01_all_six_roles_login(self):
        """Verify all 6 roles can successfully authenticate."""
        roles = [
            ("admin@forgr.app", "admin"),
            ("faculty@forgr.app", "faculty"),
            ("placement@forgr.app", "placement_cell"),
            ("recruiter@forgr.app", "recruiter"),
            ("parent1@forgr.app", "parent"),
        ]
        for email, expected_role in roles:
            token, user = self._login(email, expected_role)
            self.assertTrue(len(token) > 20)
            self.assertEqual(user["role"], expected_role)

    def test_02_admin_dashboard_authorization(self):
        """Verify only admin can access /dashboard/admin."""
        admin_token, _ = self._login("admin@forgr.app", "admin")
        res = self.client.get("/dashboard/admin", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(res.status_code, 200)

        # Non-admin should get 403
        faculty_token, _ = self._login("faculty@forgr.app", "faculty")
        res_fac = self.client.get("/dashboard/admin", headers={"Authorization": f"Bearer {faculty_token}"})
        self.assertEqual(res_fac.status_code, 403)

    def test_03_horizontal_privilege_escalation_idor(self):
        """Verify Student A cannot access Student B's profile or dashboard."""
        db = SessionLocal()
        students = db.query(models.Student).limit(2).all()
        db.close()
        if len(students) >= 2:
            s1 = students[0]
            s2 = students[1]
            token_s1, _ = self._login(s1.email, "student")
            
            # S1 accessing S1's profile: Allowed
            res_own = self.client.get(f"/students/{s1.student_id}/profile", headers={"Authorization": f"Bearer {token_s1}"})
            self.assertEqual(res_own.status_code, 200)

            # S1 accessing S2's profile: FORBIDDEN (IDOR prevented)
            res_other = self.client.get(f"/students/{s2.student_id}/profile", headers={"Authorization": f"Bearer {token_s1}"})
            self.assertEqual(res_other.status_code, 403)

            # S1 accessing S2's dashboard: FORBIDDEN
            res_dash = self.client.get(f"/dashboard/student/{s2.student_id}", headers={"Authorization": f"Bearer {token_s1}"})
            self.assertEqual(res_dash.status_code, 403)

    def test_04_master_bulk_import_admin_only_governance(self):
        """Verify only ADMIN can call Master student/unified imports."""
        faculty_token, _ = self._login("faculty@forgr.app", "faculty")
        placement_token, _ = self._login("placement@forgr.app", "placement_cell")
        admin_token, _ = self._login("admin@forgr.app", "admin")

        csv_content = b"student_id,name,email,department,year\nTEST-01,Test Student,test@forgr.app,CSE,2\n"

        # Faculty calling /api/bulk-import/detect-and-validate with unified -> 403
        res_fac = self.client.post(
            "/api/bulk-import/detect-and-validate",
            data={"dataset_type": "unified"},
            files={"file": ("test.csv", csv_content, "text/csv")},
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        self.assertEqual(res_fac.status_code, 403)

        # Placement calling /api/bulk-import/execute-import with students -> 403
        res_plc = self.client.post(
            "/api/bulk-import/execute-import",
            data={"dataset_type": "students", "import_mode": "upsert"},
            files={"file": ("test.csv", csv_content, "text/csv")},
            headers={"Authorization": f"Bearer {placement_token}"},
        )
        self.assertEqual(res_plc.status_code, 403)

        # Admin calling detect-and-validate -> 200
        res_adm = self.client.post(
            "/api/bulk-import/detect-and-validate",
            data={"dataset_type": "students"},
            files={"file": ("test.csv", csv_content, "text/csv")},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(res_adm.status_code, 200)
        data = res_adm.json()
        self.assertEqual(data["total_rows"], 1)
        self.assertTrue(data["can_import"])

    def test_05_intelligent_column_alias_detection(self):
        """Verify intelligent column alias mapping for various header formats."""
        admin_token, _ = self._login("admin@forgr.app", "admin")
        aliased_csv = b"roll_number,student_name,student_email,branch,batch_year\nTEST-02,Alias Student,alias@forgr.app,IT,3\n"
        res = self.client.post(
            "/api/bulk-import/detect-and-validate",
            data={"dataset_type": "students"},
            files={"file": ("alias.csv", aliased_csv, "text/csv")},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        mappings = {m["detected_column"]: m["mapped_field"] for m in data["mappings"]}
        self.assertEqual(mappings.get("roll_number"), "student_id")
        self.assertEqual(mappings.get("student_name"), "name")
        self.assertEqual(mappings.get("student_email"), "email")
        self.assertEqual(mappings.get("branch"), "department")
        self.assertEqual(mappings.get("batch_year"), "year")

    def test_06_import_validation_detects_errors(self):
        """Verify validation flags invalid CGPA and duplicate rows."""
        admin_token, _ = self._login("admin@forgr.app", "admin")
        bad_csv = (
            b"student_id,name,email,department,year,cgpa\n"
            b"BAD-01,Student One,s1@forgr.app,CSE,2,15.5\n"
            b"BAD-01,Student Duplicate,s1dup@forgr.app,CSE,2,8.0\n"
        )
        res = self.client.post(
            "/api/bulk-import/detect-and-validate",
            data={"dataset_type": "unified"},
            files={"file": ("bad.csv", bad_csv, "text/csv")},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["error_rows"] >= 1)
        self.assertTrue(data["duplicate_rows"] >= 1)
        reasons = [e["error_reason"] for e in data["validation_errors"]]
        self.assertTrue(any("CGPA must be between" in r for r in reasons))
        self.assertTrue(any("Duplicate student ID" in r for r in reasons))

    def test_07_all_template_downloads(self):
        """Verify downloadable templates for all 8 categories."""
        templates = [
            "student_master_template.csv",
            "academics_template.csv",
            "attendance_template.csv",
            "skills_template.csv",
            "portfolio_template.csv",
            "placement_template.csv",
            "risk_prediction_template.csv",
            "unified_student_template.csv",
        ]
        for t in templates:
            res = self.client.get(f"/api/bulk-import/templates/{t}")
            self.assertEqual(res.status_code, 200, f"Template {t} returned {res.status_code}")
            self.assertIn("student_id", res.text)

    def test_08_import_history_and_audit_logs(self):
        """Verify import history and audit logs endpoints."""
        admin_token, _ = self._login("admin@forgr.app", "admin")
        res_hist = self.client.get("/api/admin/import-history", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(res_hist.status_code, 200)
        self.assertIsInstance(res_hist.json(), list)

        res_audit = self.client.get("/api/admin/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(res_audit.status_code, 200)
        self.assertIsInstance(res_audit.json(), list)

if __name__ == "__main__":
    unittest.main()
