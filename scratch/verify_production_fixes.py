import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
sys.path.append(os.path.abspath("backend"))

from fastapi.testclient import TestClient
import main
import database
import models
import security

client = TestClient(main.app)

def run_tests():
    print("==================================================")
    print("RUNNING PRODUCTION FIXES VERIFICATION SUITE")
    print("==================================================")

    # 1. Backdoor OTP Elimination Test
    print("\n[TEST 1] Verifying Backdoor OTP '123456' is strictly REJECTED...")
    res = client.post("/api/auth/reset-password", json={
        "identifier": "ronakagrawalmthr@gmail.com",
        "otp": "123456",
        "new_password": "NewSecurePassword123"
    })
    assert res.status_code == 400, f"Expected 400 for backdoor OTP, got {res.status_code}: {res.text}"
    print(" -> PASSED: Backdoor OTP '123456' was rejected with 400!")

    # 2. No dev_otp Response Leakage
    print("\n[TEST 2] Verifying no dev_otp is leaked in /api/auth/forgot-password...")
    res = client.post("/api/auth/forgot-password", json={
        "identifier": "ronakagrawalmthr@gmail.com"
    })
    data = res.json()
    assert "dev_otp" not in data, f"dev_otp leaked in forgot-password: {data}"
    print(" -> PASSED: dev_otp is NOT leaked in forgot-password response!")

    # 3. Unauthenticated Attendance Submission Blocked
    print("\n[TEST 3] Verifying unauthenticated attendance submission is REJECTED...")
    res = client.post("/attendance/create-and-submit", json={
        "branch": "Computer Science",
        "semester": 6,
        "section": "A",
        "attendance": []
    })
    assert res.status_code in [401, 403], f"Expected 401 or 403, got {res.status_code}: {res.text}"
    print(f" -> PASSED: Unauthenticated submission rejected with HTTP {res.status_code}!")

    # 4. Authenticated Faculty Attendance Submission
    print("\n[TEST 4] Testing authenticated attendance submission...")
    db = database.SessionLocal()
    try:
        # Find or create a teacher
        teacher_user = db.query(models.User).filter(models.User.role == models.RoleEnum.teacher).first()
        if not teacher_user:
            teacher_user = db.query(models.User).filter(models.User.role == models.RoleEnum.admin).first()
        
        token = security.create_access_token(data={"sub": teacher_user.email, "role": teacher_user.role.value})
        headers = {"Authorization": f"Bearer {token}"}

        # Find a student
        student = db.query(models.StudentProfile).first()
        student_id = student.id if student else 1
        roll = student.roll_number if student else "CS-2023-001"

        res = client.post("/attendance/create-and-submit", json={
            "branch": student.branch if student else "Computer Science",
            "semester": student.semester if student else 6,
            "section": student.section if (student and student.section) else "A",
            "conducted_by_name": "Test Faculty",
            "attendance": [
                {
                    "student_id": student_id,
                    "roll_number": roll,
                    "is_present": True
                }
            ]
        }, headers=headers)

        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        sub_data = res.json()
        assert sub_data["success"] == True
        print(f" -> PASSED: Attendance successfully created & committed! Session ID: {sub_data.get('session_id')}")

        # 5. Defaulters endpoint fast SQL aggregation
        print("\n[TEST 5] Testing Defaulters SQL aggregation endpoint...")
        admin_user = db.query(models.User).filter(models.User.role == models.RoleEnum.admin).first()
        admin_token = security.create_access_token(data={"sub": admin_user.email, "role": admin_user.role.value})
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        res = client.get("/management/defaulters?threshold=75", headers=admin_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        defaulters_data = res.json()
        assert "defaulters" in defaulters_data
        # 6. Final submit idempotency & anti-duplicate
        print("\n[TEST 6] Testing submit_final idempotent update (no duplicate records)...")
        created_session_id = sub_data.get('session_id')
        res = client.post(f"/attendance/submit_final/{created_session_id}", json={
            "present": [{"id": student_id, "roll": roll}],
            "absent": []
        }, headers=headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        logs_count = db.query(models.AttendanceLog).filter(
            models.AttendanceLog.session_id == created_session_id,
            models.AttendanceLog.student_id == student_id
        ).count()
        assert logs_count == 1, f"Expected exactly 1 log for session and student, got {logs_count}"
        print(f" -> PASSED: Exactly 1 record exists in database for student {roll} in session {created_session_id} (No duplicates)!")

    finally:
        db.close()

    print("\n==================================================")
    print("ALL PRODUCTION VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
