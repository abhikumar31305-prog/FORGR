"""Shared pytest fixtures for FORGR backend tests."""

import os
import sys

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
import crud

TEST_PASSWORD = os.getenv("FORGR_TEST_PASSWORD", "forgr-test-password")


@pytest.fixture(scope="session")
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def seed_test_users():
    """Ensure seed users exist and all have the test password."""
    db = SessionLocal()
    try:
        crud.seed_default_auth_users(db)
        for user in db.query(models.User).all():
            user.password_hash = crud.hash_password(TEST_PASSWORD)
        db.query(models.LoginAuditLog).delete()
        db.commit()
    finally:
        db.close()


@pytest.fixture(scope="session")
def admin_token(client):
    """Cached admin access token."""
    res = client.post("/auth/login", json={"email": "admin@forgr.app", "password": TEST_PASSWORD})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def faculty_token(client):
    """Cached faculty access token."""
    res = client.post("/auth/login", json={"email": "faculty@forgr.app", "password": TEST_PASSWORD})
    assert res.status_code == 200, f"Faculty login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def placement_token(client):
    """Cached placement_cell access token."""
    res = client.post("/auth/login", json={"email": "placement@forgr.app", "password": TEST_PASSWORD})
    assert res.status_code == 200, f"Placement login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture()
def db_session():
    """Scoped DB session that rolls back after each test."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
