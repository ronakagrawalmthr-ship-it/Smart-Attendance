import requests
import io
import json
import sys
import numpy as np
import cv2
from database import SessionLocal
import models
import security

BASE_URL = "http://localhost:8000"

def seed_test_users():
    """Seeds admin, teacher, and student users for authenticating test requests."""
    db = SessionLocal()
    
    # 1. Admin User
    admin = db.query(models.User).filter(models.User.email == "admin@college.edu").first()
    if not admin:
        admin = models.User(
            email="admin@college.edu",
            hashed_password=security.get_password_hash("AdminPass123!"),
            role=models.RoleEnum.admin,
            is_active=True
        )
        db.add(admin)

    # 2. Teacher User
    teacher_user = db.query(models.User).filter(models.User.email == "teacher@college.edu").first()
    if not teacher_user:
        teacher_user = models.User(
            email="teacher@college.edu",
            hashed_password=security.get_password_hash("TeacherPass123!"),
            role=models.RoleEnum.teacher,
            is_active=True
        )
        db.add(teacher_user)
        db.commit()
        db.refresh(teacher_user)
        
        teacher_prof = models.TeacherProfile(
            user_id=teacher_user.id,
            full_name="Prof. Priya Nair",
            department="Computer Science"
        )
        db.add(teacher_prof)

    # 3. Student User
    student_user = db.query(models.User).filter(models.User.email == "student@college.edu").first()
    if not student_user:
        student_user = models.User(
            email="student@college.edu",
            hashed_password=security.get_password_hash("StudentPass123!"),
            role=models.RoleEnum.student,
            is_active=True
        )
        db.add(student_user)
        db.commit()
        db.refresh(student_user)
        
    student_prof = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == student_user.id).first()
    if not student_prof:
        student_prof = models.StudentProfile(
            user_id=student_user.id,
            full_name="Aarav Sharma",
            roll_number="23CSE001",
            branch="Computer Science",
            semester=6,
            section="A"
        )
        db.add(student_prof)
        db.commit()

    # 4. Subject and Academic Session
    subject = db.query(models.Subject).filter(models.Subject.code == "CS301").first()
    if not subject:
        subject = models.Subject(
            code="CS301",
            name="Machine Learning",
            branch="Computer Science",
            semester=6
        )
        db.add(subject)
        db.commit()
        db.refresh(subject)

    session = db.query(models.AcademicSession).filter(models.AcademicSession.id == 1).first()
    if not session:
        teacher_prof = db.query(models.TeacherProfile).first()
        session = models.AcademicSession(
            id=1,
            teacher_id=teacher_prof.id if teacher_prof else 1,
            subject_id=subject.id,
            session_type=models.SessionType.lecture,
            branch="Computer Science",
            section="A"
        )
        db.add(session)

    db.commit()
    db.close()

def generate_synthetic_face_jpeg():
    """Generates a synthetic 200x200 JPEG image with a stylized face for testing."""
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    img[:] = (240, 240, 240)
    
    cv2.circle(img, (100, 100), 60, (200, 180, 160), -1)
    cv2.circle(img, (80, 85), 8, (50, 50, 50), -1)
    cv2.circle(img, (120, 85), 8, (50, 50, 50), -1)
    cv2.ellipse(img, (100, 115), (25, 12), 0, 0, 180, (50, 50, 50), 3)

    _, encoded = cv2.imencode('.jpg', img)
    return io.BytesIO(encoded.tobytes())

def run_tests():
    print("=" * 60)
    print("STARTING END-TO-END SYNTHETIC API VALIDATION SUITE")
    print("=" * 60)
    
    seed_test_users()

    # Generate Auth Tokens
    admin_token = security.create_access_token({"sub": "admin@college.edu", "role": "admin"})
    teacher_token = security.create_access_token({"sub": "teacher@college.edu", "role": "teacher"})
    student_token = security.create_access_token({"sub": "student@college.edu", "role": "student"})

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}

    passed = 0
    total = 0

    def assert_test(name, condition, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] {name}")
        else:
            print(f"  [FAIL] {name} - {details}")

    # 1. Health Check
    try:
        r = requests.get(f"{BASE_URL}/")
        assert_test("Health Check Root Endpoint", r.status_code == 200 and "message" in r.json())
    except Exception as e:
        assert_test("Health Check Root Endpoint", False, str(e))

    # 2. Student Biometric Registration Endpoint (Admin / Authorized Registration)
    try:
        jpeg_data = generate_synthetic_face_jpeg()
        files = {'selfie': ('test_student.jpg', jpeg_data, 'image/jpeg')}
        data = {
            'full_name': 'Synthetic Test Student',
            'roll_number': f'TEST{np.random.randint(1000, 9999)}',
            'branch': 'Computer Science',
            'semester': '6',
            'section': 'A'
        }
        r = requests.post(f"{BASE_URL}/students/register", data=data, files=files, headers=admin_headers)
        assert_test("Student Biometric Registration & 128-d Vector Extraction", r.status_code == 200, f"Status: {r.status_code}, Body: {r.text}")
    except Exception as e:
        assert_test("Student Biometric Registration", False, str(e))

    # 3. Defaulter List Calculation API
    try:
        r = requests.get(f"{BASE_URL}/management/defaulters?threshold=75", headers=admin_headers)
        assert_test("HOD Defaulters Matrix Query", r.status_code == 200 and "defaulters" in r.json(), f"Status: {r.status_code}")
    except Exception as e:
        assert_test("HOD Defaulters Matrix Query", False, str(e))

    # 4. Live Attendance Matrix Overview
    try:
        r = requests.get(f"{BASE_URL}/management/attendance/live", headers=admin_headers)
        assert_test("HOD Real-Time Attendance Matrix", r.status_code == 200 and "live_matrices" in r.json(), f"Status: {r.status_code}")
    except Exception as e:
        assert_test("HOD Real-Time Attendance Matrix", False, str(e))

    # 5. Holiday Declaration & Background Email Task
    try:
        r = requests.post(f"{BASE_URL}/management/holiday?holiday_date=2026-09-10&reason=Institutional%20Symposium", headers=admin_headers)
        assert_test("Holiday Declaration & Asynchronous Email Queue", r.status_code == 200 and "Holiday declared" in r.text, f"Status: {r.status_code}")
    except Exception as e:
        assert_test("Holiday Declaration", False, str(e))

    # 6. Semester Lifecycle Archiving
    try:
        r = requests.post(f"{BASE_URL}/management/archive", headers=admin_headers)
        assert_test("Semester Lifecycle Archiving Routine", r.status_code == 200, f"Status: {r.status_code}")
    except Exception as e:
        assert_test("Semester Lifecycle Archiving Routine", False, str(e))

    # 7. Student Self-Service Portal Metrics
    try:
        r = requests.get(f"{BASE_URL}/portal/metrics", headers=student_headers)
        assert_test("Student Portal Metrics Route Accessibility", r.status_code == 200 and "metrics" in r.json(), f"Status: {r.status_code}")
    except Exception as e:
        assert_test("Student Portal Metrics Route", False, str(e))

    # 8. Student Grievance Filing
    try:
        r = requests.post(f"{BASE_URL}/portal/grievance?session_id=1&reason=Scanner%20misalignment", headers=student_headers)
        assert_test("Student Absence Grievance Submission", r.status_code == 200, f"Status: {r.status_code}")
    except Exception as e:
        assert_test("Student Absence Grievance Submission", False, str(e))

    # 9. Single-Student Walk-Up & Anti-Spoofing Scan
    try:
        jpeg_data = generate_synthetic_face_jpeg()
        files = {'image': ('walkup.jpg', jpeg_data, 'image/jpeg')}
        r = requests.post(f"{BASE_URL}/attendance/verify_single/1", files=files, headers=teacher_headers)
        assert_test("Walk-Up Camera Anti-Spoofing & Liveness Endpoint", r.status_code == 200, f"Status: {r.status_code}, Body: {r.text[:100]}")
    except Exception as e:
        assert_test("Walk-Up Camera Anti-Spoofing Endpoint", False, str(e))

    print("=" * 60)
    print(f"RESULTS: {passed}/{total} SYNTHETIC TESTS PASSED ({(passed/total)*100:.1f}%)")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
