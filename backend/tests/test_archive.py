import os
from pathlib import Path
import pytest
from models import User, RoleEnum, AcademicSession, AttendanceLog, StudentProfile, SystemSetting
from security import get_password_hash, create_access_token

def test_archive_endpoint_requires_auth(client):
    res = client.post("/management/archive", json={"reason": "End of semester test"})
    assert res.status_code == 401

def test_archive_endpoint_creates_real_snapshot_and_audit(client, db_session):
    # 1. Create an admin user
    admin_user = User(
        email="superadmin@campus.edu",
        hashed_password=get_password_hash("SuperAdmin123!"),
        role=RoleEnum.admin,
        is_active=True
    )
    db_session.add(admin_user)
    db_session.flush()

    # 2. Create sample student and attendance session
    student = StudentProfile(
        user_id=admin_user.id,
        full_name="Archive Test Student",
        roll_number="ARCH001",
        branch="CSE",
        semester=6,
        section="A"
    )
    db_session.add(student)
    db_session.flush()

    session_rec = AcademicSession(
        branch="CSE",
        semester=6,
        section="A",
        conducted_by_name="Prof Test"
    )
    db_session.add(session_rec)
    db_session.flush()

    log_rec = AttendanceLog(
        session_id=session_rec.id,
        student_id=student.id,
        is_present=True,
        status_tag="PRESENT",
        confidence_score=98.5
    )
    db_session.add(log_rec)
    db_session.commit()

    token = create_access_token({
        "sub": admin_user.email,
        "role": admin_user.role.value,
        "id": admin_user.id
    })

    # Call /management/archive
    res = client.post(
        "/management/archive",
        json={"reason": "Testing semester transition archive creation"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "archive_file" in data
    assert data["archived_sessions_count"] >= 1
    assert data["archived_records_count"] >= 1

    # Verify physical file was created in backend/archives
    archive_path = Path(__file__).resolve().parent.parent / "archives" / data["archive_file"]
    assert archive_path.exists()
    assert archive_path.stat().st_size > 0

    # Clean up test archive file created during test
    try:
        archive_path.unlink()
    except Exception:
        pass
