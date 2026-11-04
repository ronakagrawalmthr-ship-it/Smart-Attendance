import pytest
from models import User, RoleEnum
from security import get_password_hash, create_access_token

def test_health_check_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "Smart Face-Authentication Attendance API" in data["message"]

def test_departments_meta_sanitized_for_unauthenticated_visitors(client, db_session):
    res = client.get("/attendance/departments-meta")
    assert res.status_code == 200
    data = res.json()
    
    # Check that branches and semesters exist
    assert "branches" in data
    assert "semesters" in data
    assert "sections" in data
    # Ensure confidential teachers list is empty for unauthenticated public
    assert data.get("teachers") == []
    assert data.get("subjects") == []

def test_departments_meta_full_for_authenticated_user(client, db_session):
    from models import TeacherProfile, Subject
    # Create test user and teacher profile
    test_user = User(
        email="test_faculty@campus.edu",
        hashed_password=get_password_hash("ValidPass123!"),
        role=RoleEnum.teacher,
        is_active=True
    )
    db_session.add(test_user)
    db_session.flush()

    prof = TeacherProfile(
        user_id=test_user.id,
        full_name="Prof. Alan Turing",
        department="Computer Science & Engineering"
    )
    db_session.add(prof)

    subj = Subject(
        code="CS301",
        name="Operating Systems",
        branch="Computer Science & Engineering",
        semester=5
    )
    db_session.add(subj)
    db_session.commit()
    
    token = create_access_token({"sub": test_user.email, "role": test_user.role.value, "id": test_user.id})
    res = client.get(
        "/attendance/departments-meta",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["teachers"]) >= 1
    assert any(t["name"] == "Prof. Alan Turing" for t in data["teachers"])
    assert len(data["subjects"]) >= 1
    assert any(s["code"] == "CS301" for s in data["subjects"])

def test_setup_endpoints_locked_when_admin_exists(client, db_session):
    # Create admin user to simulate an already-initialized system
    admin = User(
        email="admin@campus.edu",
        hashed_password=get_password_hash("AdminPass123!"),
        role=RoleEnum.admin,
        is_active=True
    )
    db_session.add(admin)
    db_session.commit()
    
    # 1. /setup/status should report is_initialized: True
    res_status = client.get("/setup/status")
    assert res_status.status_code == 200
    assert res_status.json()["is_initialized"] is True
    
    # 2. /setup/send-otp should reject request with 403 Forbidden
    res_otp = client.post("/setup/send-otp", json={
        "institution_name": "MIT",
        "admin_name": "Hacker",
        "admin_email": "attacker@evil.com"
    })
    assert res_otp.status_code == 403
    assert "already initialized" in res_otp.json()["detail"].lower()
    assert "dev_otp" not in res_otp.text
    
    # 3. /setup/verify-otp should return 403 Forbidden
    res_verify = client.post("/setup/verify-otp", json={
        "admin_email": "attacker@evil.com",
        "otp": "123456"
    })
    assert res_verify.status_code == 403
    assert "already initialized" in res_verify.json()["detail"]

def test_refresh_token_lifecycle(client, db_session):
    # 1. Create active user
    user = User(
        email="refresh_tester@campus.edu",
        hashed_password=get_password_hash("TestPass123!"),
        role=RoleEnum.teacher,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    # 2. Login to obtain access and refresh tokens
    login_res = client.post("/auth/login", json={
        "email": "refresh_tester@campus.edu",
        "password": "TestPass123!"
    })
    assert login_res.status_code == 200
    tokens = login_res.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # 3. Call /auth/refresh with valid refresh token
    refresh_res = client.post("/auth/refresh", json={
        "refresh_token": tokens["refresh_token"]
    })
    assert refresh_res.status_code == 200
    refreshed = refresh_res.json()
    assert "access_token" in refreshed
    assert "refresh_token" in refreshed
    assert refreshed["token_type"] == "bearer"

    # 4. Attempting refresh with invalid token returns 401
    bad_res = client.post("/auth/refresh", json={
        "refresh_token": "invalid_bogus_token"
    })
    assert bad_res.status_code == 401
