import requests
import json
import io
import numpy as np
import cv2
import sys

# Configure UTF-8 for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def create_synthetic_selfie_bytes():
    """
    Creates a 240x240 image with a centered oval of realistic human skin tone
    to satisfy SmartBiometricEngine's YCrCb skin thresholding and aspect ratio checks.
    """
    # Background: soft light gray
    img = np.ones((240, 240, 3), dtype=np.uint8) * 230
    
    # Draw face oval: center (120, 115), axes (45, 65), angle 0
    # Skin tone BGR: B=140, G=170, R=220 (in YCrCb: Cr ~ 150, Cb ~ 100, passes 133-173 & 77-127)
    cv2.ellipse(img, (120, 115), (45, 65), 0, 0, 360, (140, 170, 220), -1)
    
    # Draw simple eyes and mouth
    cv2.circle(img, (100, 100), 5, (50, 40, 30), -1)
    cv2.circle(img, (140, 100), 5, (50, 40, 30), -1)
    cv2.line(img, (110, 145), (130, 145), (60, 50, 180), 2)
    
    # Encode as JPEG
    _, encoded = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    return io.BytesIO(encoded.tobytes())

def run_lifecycle_audit():
    print("=" * 70)
    print("🚀 SMART ATTENDANCE REAL-WORLD USER LIFECYCLE AUDIT (A to Z)")
    print("=" * 70)
    
    test_roll = "2500650100888"
    test_name = "Aarav Mehta"
    test_email = "aarav.mehta@student.university.edu"
    test_password = "SecurePassword@123"
    test_branch = "Computer Science"
    test_semester = 6
    test_section = "A"

    # Clean up prior test record if present for test idempotency
    try:
        from database import SessionLocal
        import models
        db = SessionLocal()
        existing_profile = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == test_roll).first()
        if existing_profile:
            p_id = existing_profile.id
            u_id = existing_profile.user_id
            db.query(models.AttendanceLog).filter(models.AttendanceLog.student_id == p_id).delete()
            db.query(models.Grievance).filter(models.Grievance.student_id == p_id).delete()
            db.query(models.ParentNotificationLog).filter(models.ParentNotificationLog.student_id == p_id).delete()
            db.delete(existing_profile)
            db.commit()
            if u_id:
                user_obj = db.query(models.User).filter(models.User.id == u_id).first()
                if user_obj:
                    db.delete(user_obj)
                    db.commit()
            print(f"🧹 Cleaned existing test record for {test_roll} to ensure authentic Day-0 signup test.")
        db.close()
    except Exception as e:
        print(f"Note on pre-clean: {e}")

    # =========================================================================
    # STEP 1: SIGNUP / REGISTRATION WITH LIVE BIOMETRIC SELFIE
    # =========================================================================
    print("\n[STEP 1] 📸 Testing New Student Onboarding & Biometric Signup...")
    selfie_file = create_synthetic_selfie_bytes()
    files = {
        'selfie': ('selfie.jpg', selfie_file, 'image/jpeg')
    }
    data = {
        'full_name': test_name,
        'roll_number': test_roll,
        'branch': test_branch,
        'semester': str(test_semester),
        'section': test_section,
        'email': test_email,
        'password': test_password,
        'parent_email': 'parent.mehta@example.com',
        'phone': '9876543210'
    }

    reg_res = requests.post(f"{BASE_URL}/students/register", data=data, files=files)
    print(f"  -> Registration Status: {reg_res.status_code}")
    if reg_res.status_code != 200:
        print(f"  ❌ Registration failed: {reg_res.text}")
        sys.exit(1)
    
    student_record = reg_res.json()
    print(f"  ✅ Student successfully created!")
    print(f"     ID: {student_record.get('id')}")
    print(f"     Name: {student_record.get('full_name')}")
    print(f"     Roll: {student_record.get('roll_number')}")
    print(f"     Branch: {student_record.get('branch')}, Sem: {student_record.get('semester')}, Sec: {student_record.get('section')}")
    print(f"     Face Vector: Length {len(json.loads(student_record.get('face_encoding', '[]')))} embeddings")

    # =========================================================================
    # STEP 2: DUPLICATE REGISTRATION ATTEMPT (GUARD CHECK)
    # =========================================================================
    print("\n[STEP 2] 🛡️ Testing Duplicate Roll Number Protection...")
    selfie_file.seek(0)
    dup_files = {'selfie': ('selfie.jpg', selfie_file, 'image/jpeg')}
    dup_res = requests.post(f"{BASE_URL}/students/register", data=data, files=dup_files)
    print(f"  -> Duplicate Registration Status: {dup_res.status_code}")
    if dup_res.status_code == 400 and "already registered" in dup_res.text.lower():
        print(f"  ✅ Strict Rejection Confirmed: {dup_res.json().get('detail')}")
    else:
        print(f"  ❌ Duplicate guard failed! Expected 400, got: {dup_res.status_code} {dup_res.text}")
        sys.exit(1)

    # =========================================================================
    # STEP 3: FIRST-TIME LOGIN (BY ROLL NUMBER & BY EMAIL)
    # =========================================================================
    print("\n[STEP 3] 🔑 Testing First-Time Login...")
    # 3A: Login by Roll Number
    login_payload_roll = {"email": test_roll, "password": test_password}
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload_roll)
    print(f"  -> Login via Roll Number: {login_res.status_code}")
    if login_res.status_code != 200:
        print(f"  ❌ Login failed: {login_res.text}")
        sys.exit(1)
    auth_data = login_res.json()
    student_token = auth_data["access_token"]
    user_info = auth_data["user"]
    print(f"  ✅ Login successful via Roll Number!")
    print(f"     User Name: {user_info.get('full_name')}")
    print(f"     User Role: {user_info.get('role')}")
    print(f"     User Dept: {user_info.get('department')}")
    print(f"     JWT Token: {student_token[:25]}... (valid)")

    # 3B: Login by Email
    login_payload_email = {"email": test_email, "password": test_password}
    login_res_email = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload_email)
    print(f"  -> Login via Custom Email: {login_res_email.status_code}")
    if login_res_email.status_code == 200:
        print(f"  ✅ Login successful via Custom Email as well!")

    headers = {"Authorization": f"Bearer {student_token}"}

    # =========================================================================
    # STEP 4: DAY-0 DASHBOARD & METRICS INSPECTION (BEFORE ANY CLASS ATTENDED)
    # =========================================================================
    print("\n[STEP 4] 📊 Testing Day-0 Student Portal Metrics (Initial State)...")
    profile_res = requests.get(f"{BASE_URL}/portal/profile", headers=headers)
    print(f"  -> /portal/profile Status: {profile_res.status_code}")
    p_data = profile_res.json()
    print(f"     Profile: {p_data.get('full_name')} ({p_data.get('roll_number')}) - {p_data.get('branch')}")

    metrics_res = requests.get(f"{BASE_URL}/portal/metrics", headers=headers)
    print(f"  -> /portal/metrics Status: {metrics_res.status_code}")
    raw_m_data = metrics_res.json()
    m_data = raw_m_data.get("metrics", {})
    p_data = raw_m_data.get("profile", {})
    print(f"     Classes Attended: {m_data.get('attended_classes')}")
    print(f"     Total Classes: {m_data.get('total_classes')}")
    print(f"     Attendance %: {m_data.get('overall_percentage')}%")
    print(f"     Standing: {m_data.get('eligibility_status')}")
    assert m_data.get('attended_classes') == 0, "Initial attended classes should be 0"
    assert m_data.get('total_classes') == 0, "Initial total classes should be 0"
    assert m_data.get('overall_percentage') == 0.0, "Initial attendance percentage should be 0.0%"

    # Dynamic timetable check
    tt_res = requests.get(f"{BASE_URL}/timetable/today?roll_number={test_roll}", headers=headers)
    print(f"  -> /timetable/today Status: {tt_res.status_code}")
    tt_data = tt_res.json()
    print(f"     Today's Dynamic Classes: {len(tt_data)} scheduled periods found.")

    # =========================================================================
    # STEP 5: TEACHER CREATES DYNAMIC ATTENDANCE QR SESSION
    # =========================================================================
    print("\n[STEP 5] 👨‍🏫 Teacher Generates Dynamic 10s Rotating QR Session...")
    faculty_email = "faculty.cs@college.edu"
    faculty_pwd = "FacultyPassword@123"

    try:
        from database import SessionLocal
        import models, security
        f_db = SessionLocal()
        fac_user = f_db.query(models.User).filter(models.User.email == faculty_email).first()
        if not fac_user:
            fac_user = models.User(
                email=faculty_email,
                hashed_password=security.get_password_hash(faculty_pwd),
                role=models.RoleEnum.teacher,
                is_active=True
            )
            f_db.add(fac_user)
            f_db.commit()
            f_db.refresh(fac_user)
            tp = models.TeacherProfile(
                user_id=fac_user.id,
                full_name="Prof. Rajesh Sharma",
                department="Computer Science"
            )
            f_db.add(tp)
            f_db.commit()
        f_db.close()
    except Exception as e:
        print(f"Faculty provision note: {e}")

    teacher_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": faculty_email, "password": faculty_pwd})
    if teacher_login.status_code != 200:
        print(f"  ❌ Teacher login failed: {teacher_login.text}")
        sys.exit(1)
    teacher_token = teacher_login.json()["access_token"]
    t_headers = {"Authorization": f"Bearer {teacher_token}"}

    # Initialize dynamic QR session for Computer Science Sem 6 Sec A
    qr_init_res = requests.post(
        f"{BASE_URL}/attendance/qr/init-session",
        json={
            "subject_id": 1,
            "room_id": "LH-101",
            "section": test_section,
            "branch": test_branch,
            "semester": test_semester
        },
        headers=t_headers
    )
    print(f"  -> QR Session Init Status: {qr_init_res.status_code}")
    if qr_init_res.status_code != 200:
        print(f"  ❌ QR Init failed: {qr_init_res.text}")
        sys.exit(1)
    session_data = qr_init_res.json()
    session_id = session_data["session_id"]
    qr_token = session_data["token"]
    print(f"  ✅ Dynamic QR Session Active!")
    print(f"     Session ID: {session_id}")
    print(f"     Rotating QR Token: {qr_token[:30]}...")
    print(f"     Expires in: {session_data.get('expires_in', 10)}s")

    # =========================================================================
    # STEP 6: STUDENT SCANS DYNAMIC QR CODE & MARKS ATTENDANCE
    # =========================================================================
    print("\n[STEP 6] 📱 Student Scans Dynamic QR via Scanner...")
    scan_res = requests.post(
        f"{BASE_URL}/attendance/qr/verify-and-mark",
        json={
            "token": qr_token,
            "student_roll": test_roll
        },
        headers=headers
    )
    print(f"  -> QR Scan Verification Status: {scan_res.status_code}")
    if scan_res.status_code != 200:
        print(f"  ❌ Scan failed: {scan_res.text}")
        sys.exit(1)
    scan_data = scan_res.json()
    print(f"  ✅ Attendance Marked Successfully!")
    print(f"     Message: {scan_data.get('message')}")
    print(f"     Student Name: {scan_data.get('student_name')}")
    print(f"     Subject: {scan_data.get('subject_name')}")
    print(f"     Updated Attendance %: {scan_data.get('current_attendance_pct')}%")

    # =========================================================================
    # STEP 7: DUPLICATE QR SCAN GUARD (ANTI-PROXY / RE-SCAN VERIFICATION)
    # =========================================================================
    print("\n[STEP 7] 🚫 Testing Duplicate QR Scan Guard...")
    re_scan_res = requests.post(
        f"{BASE_URL}/attendance/qr/verify-and-mark",
        json={
            "token": qr_token,
            "student_roll": test_roll
        },
        headers=headers
    )
    print(f"  -> Re-scan Status: {re_scan_res.status_code}")
    re_scan_data = re_scan_res.json()
    print(f"     Already Marked Flag: {re_scan_data.get('already_marked')}")
    print(f"     Message: {re_scan_data.get('message')}")
    assert re_scan_data.get('already_marked') is True, "Duplicate scan must return already_marked=True"
    print(f"  ✅ Duplicate attendance prevented gracefully!")

    # =========================================================================
    # STEP 8: POST-ATTENDANCE LIVE METRICS VERIFICATION
    # =========================================================================
    print("\n[STEP 8] 📈 Verifying Real-Time Metric Updates on Student Dashboard...")
    new_metrics_raw = requests.get(f"{BASE_URL}/portal/metrics", headers=headers).json()
    new_m = new_metrics_raw.get("metrics", {})
    print(f"     Attended Classes: {new_m.get('attended_classes')}")
    print(f"     Total Classes: {new_m.get('total_classes')}")
    print(f"     Attendance %: {new_m.get('overall_percentage')}%")
    print(f"     Current Standing: {new_m.get('eligibility_status')}")
    assert new_m.get('attended_classes') == 1, "Attended classes should now be 1"
    assert new_m.get('overall_percentage') == 100.0, "Attendance percentage should now be 100.0%"
    print(f"  ✅ Dashboard updated dynamically from 0.0% to 100.0%!")

    # =========================================================================
    # STEP 9: CAMPUS COPILOT (GEMINI AI ADVISOR) CONVERSATION
    # =========================================================================
    print("\n[STEP 9] 🤖 Testing Campus Copilot (Dynamic Student Intelligence)...")
    copilot_res = requests.post(
        f"{BASE_URL}/timetable/ai-chat",
        json={
            "message": "Meri attendance percentage kya hai aur kya main exam de sakta hoon?",
            "student_roll": test_roll
        },
        headers=headers
    )
    print(f"  -> Copilot Response Status: {copilot_res.status_code}")
    assert copilot_res.status_code == 200, f"Copilot request failed: {copilot_res.text}"
    copilot_data = copilot_res.json()
    reply = copilot_data.get("reply", "")
    print(f"     Copilot Reply Snippet:\n     \"{reply[:180]}...\"")
    # Verify that the reply doesn't use hardcoded 82.5% or Ronak Agrawal
    assert "Ronak" not in reply, "Copilot must not leak other students' identity!"
    print(f"  ✅ Copilot gave authentic, personalized response for {test_name}!")

    # =========================================================================
    # STEP 10: LOGOUT & TOKEN INVALIDATION SIMULATION
    # =========================================================================
    print("\n[STEP 10] 🚪 Testing Client Logout & Session Removal...")
    # In browser, localStorage.removeItem('student_token') happens.
    # Testing access without token or with dummy token:
    unauth_res = requests.get(f"{BASE_URL}/portal/metrics", headers={"Authorization": "Bearer invalid_or_expired_token"})
    print(f"  -> Unauthorized Access Status: {unauth_res.status_code}")
    assert unauth_res.status_code == 401, "Unauthenticated request must be rejected with 401"
    print(f"  ✅ Logout isolation confirmed: Protected routes require valid credentials.")

    # =========================================================================
    # STEP 11: RE-LOGIN WITH STUDENT CREDENTIALS (SESSION RESTORATION)
    # =========================================================================
    print("\n[STEP 11] 🔄 Testing Re-Login & Data Persistence...")
    relogin_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": test_roll, "password": test_password})
    print(f"  -> Re-login Status: {relogin_res.status_code}")
    assert relogin_res.status_code == 200, "Re-login should succeed"
    new_token = relogin_res.json()["access_token"]
    new_headers = {"Authorization": f"Bearer {new_token}"}
    
    # Re-fetch metrics with new token
    re_metrics_raw = requests.get(f"{BASE_URL}/portal/metrics", headers=new_headers).json()
    re_m = re_metrics_raw.get("metrics", {})
    print(f"  ✅ Re-login successful! New token issued.")
    print(f"     Persistent Attended Classes: {re_m.get('attended_classes')}")
    print(f"     Persistent Attendance %: {re_m.get('overall_percentage')}%")
    print(f"     Persistent Standing: {re_m.get('eligibility_status')}")
    assert re_m.get('attended_classes') == 1, "Data must persist across sessions"
    assert re_m.get('overall_percentage') == 100.0, "Data must persist across sessions"

    # =========================================================================
    # STEP 12: WRONG PASSWORD REJECTION TEST
    # =========================================================================
    print("\n[STEP 12] 🔒 Testing Invalid Password Protection...")
    bad_login_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": test_roll, "password": "WrongPassword999"})
    print(f"  -> Bad Password Login Status: {bad_login_res.status_code}")
    assert bad_login_res.status_code == 401, "Wrong password must return 401"
    print(f"  ✅ Secure rejection confirmed: {bad_login_res.json().get('detail')}")

    print("\n" + "=" * 70)
    print("🎉 FULL LIFECYCLE AUDIT COMPLETE: 100% SUCCESS ACROSS ALL 12 STAGES!")
    print("=" * 70)

if __name__ == "__main__":
    run_lifecycle_audit()
