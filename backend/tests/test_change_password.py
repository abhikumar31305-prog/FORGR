"""Tests for the /auth/change-password endpoint."""

import os
import pytest
from fastapi.testclient import TestClient

from main import app
from database import SessionLocal
import models
import crud

TEST_PASSWORD = os.getenv("FORGR_TEST_PASSWORD", "forgr-test-password")


@pytest.fixture
def auth_user_client(client):
    """Logs in as admin@forgr.app and returns client, token, and email."""
    res = client.post("/auth/login", json={"email": "admin@forgr.app", "password": TEST_PASSWORD})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return client, token, "admin@forgr.app"


def test_change_password_success(auth_user_client):
    client, token, email = auth_user_client
    new_pw = "BrandNewSecret2026!"

    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "current_password": TEST_PASSWORD,
        "new_password": new_pw,
    }

    # 1. Change password
    res = client.post("/auth/change-password", json=payload, headers=headers)
    assert res.status_code == 200, f"Failed: {res.text}"
    assert res.json() == {"message": "Password updated successfully."}

    # 2. Old password should now fail
    old_login = client.post("/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert old_login.status_code != 200

    # 3. New password should succeed
    new_login = client.post("/auth/login", json={"email": email, "password": new_pw})
    assert new_login.status_code == 200
    new_token = new_login.json()["access_token"]

    # 4. Clean up: restore original TEST_PASSWORD so subsequent tests are unaffected
    restore_res = client.post(
        "/auth/change-password",
        json={"current_password": new_pw, "new_password": TEST_PASSWORD},
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert restore_res.status_code == 200


def test_change_password_wrong_current(auth_user_client):
    client, token, _ = auth_user_client
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "current_password": "this-is-definitely-wrong",
        "new_password": "ValidNewPassword123!",
    }

    res = client.post("/auth/change-password", json=payload, headers=headers)
    assert res.status_code == 400
    assert "Current password does not match" in res.json()["detail"]


def test_change_password_same_password(auth_user_client):
    client, token, _ = auth_user_client
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "current_password": TEST_PASSWORD,
        "new_password": TEST_PASSWORD,
    }

    res = client.post("/auth/change-password", json=payload, headers=headers)
    assert res.status_code == 400
    assert "different from current password" in res.json()["detail"]


def test_change_password_too_short(auth_user_client):
    client, token, _ = auth_user_client
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "current_password": TEST_PASSWORD,
        "new_password": "123",
    }

    res = client.post("/auth/change-password", json=payload, headers=headers)
    # Pydantic schema validation returns 422
    assert res.status_code in (400, 422)


def test_change_password_unauthorized(client):
    payload = {
        "current_password": TEST_PASSWORD,
        "new_password": "AnotherNewPassword123!",
    }

    res = client.post("/auth/change-password", json=payload)
    assert res.status_code == 401
