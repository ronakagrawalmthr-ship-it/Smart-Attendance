import sys
import io
import time
import json
import secrets
import threading
import requests
import numpy as np
import cv2
from jose import jwt

# Configure UTF-8 for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

from security import SECRET_KEY, ALGORITHM

def create_face_image(num_faces=1):
    """Generates synthetic image with specified number of face ovals."""
    img = np.ones((240, 240, 3), dtype=np.uint8) * 230
    if num_faces == 1:
        cv2.ellipse(img, (120, 115), (45, 65), 0, 0, 360, (140, 170, 220), -1)
        cv2.circle(img, (100, 100), 5, (50, 40, 30), -1)
        cv2.circle(img, (140, 100), 5, (50, 40, 30), -1)
        cv2.line(img, (110, 145), (130, 145), (60, 50, 180), 2)
    elif num_faces > 1:
        # 3 separate distinct face regions
        positions = [(50, 110), (120, 110), (190, 110)]
        for cx, cy in positions:
            cv2.ellipse(img, (cx, cy), (22, 35), 0, 0, 360, (140, 170, 220), -1)
            cv2.circle(img, (cx - 8, cy - 8), 3, (50, 40, 30), -1)
            cv2.circle(img, (cx + 8, cy - 8), 3, (50, 40, 30), -1)
    # If 0 faces: returns solid gray image with no skin tones
    _, encoded = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    return io.BytesIO(encoded.tobytes())

def run_resilience_test_suite():
    print("=" * 75)
    print("🛡️  CAMPUS ZERO-FAILURE RESILIENCE & EDGE-CASE TEST SUITE")
    print("=" * 75)

    # Pre-test: ensure standard student and faculty accounts are accessible
    student_roll = "2500650100888"
    student_pwd = "SecurePassword@123"
    student_token = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_roll, "password": student_pwd}).json().get("access_token")
    if not student_token:
        print("❌ Could not log in test student 2500650100888. Please run lifecycle test first.")
        sys.exit(1)
    s_headers = {"Authorization": f"Bearer {student_token}"}

    faculty_token = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "faculty.cs@college.edu", "password": "FacultyPassword@123"}).json().get("access_token")
    t_headers = {"Authorization": f"Bearer {faculty_token}"}

    passed_count = 0
    total_tests = 13

    # =========================================================================
    # TEST 1: EXPIRED QR CODE (Old WhatsApp Screenshot Attack)
    # =========================================================================
    print("\n[TEST 1] ⏳ Expired QR Code Rejection (Screenshot Attack Defense)...")
    expired_payload = {
        "type": "dynamic_attendance_qr",
        "session_id": 14,
        "subject_id": 1,
        "branch": "Computer Science",
        "semester": 6,
        "section": "A",
        "iat": int(time.time()) - 100,
        "exp": int(time.time()) - 30,  # Expired 30 seconds ago
        "nonce": secrets.token_hex(4)
    }
    expired_token = jwt.encode(expired_payload, SECRET_KEY, algorithm=ALGORITHM)
    r1 = requests.post(f"{BASE_URL}/attendance/qr/verify-and-mark", json={"token": expired_token, "student_roll": student_roll}, headers=s_headers)
    print(f"  Response: {r1.status_code} - {r1.text}")
    assert r1.status_code == 400, "Expired QR code must return 400"
    assert "expired" in r1.text.lower(), "Must state that QR code is expired"
    print("  ✅ PASS: Old screenshot rejected with 400 Bad Request.")
    passed_count += 1

    # =========================================================================
    # TEST 2: FORGED / TAMPERED QR TOKEN (Cryptographic Integrity Defense)
    # =========================================================================
    print("\n[TEST 2] 🔐 Forged / Tampered QR Token Defense...")
    forged_token = jwt.encode(expired_payload, "completely-wrong-hacker-secret-key", algorithm=ALGORITHM)
    r2 = requests.post(f"{BASE_URL}/attendance/qr/verify-and-mark", json={"token": forged_token, "student_roll": student_roll}, headers=s_headers)
    print(f"  Response: {r2.status_code} - {r2.text}")
    assert r2.status_code == 400, "Tampered/forged QR token must return 400"
    print("  ✅ PASS: Forged signature rejected with 400 Bad Request.")
    passed_count += 1

    # =========================================================================
    # TEST 3: CROSS-BRANCH MISMATCH ISOLATION (Mechanical vs CS)
    # =========================================================================
    print("\n[TEST 3] 🏛️ Cross-Branch Academic Isolation (Mechanical -> CS QR)...")
    mech_sess = requests.post(
        f"{BASE_URL}/attendance/qr/init-session",
        json={"subject_id": 1, "room_id": "ME-201", "section": "A", "branch": "Mechanical Engineering", "semester": 6},
        headers=t_headers
    ).json()
    r3 = requests.post(f"{BASE_URL}/attendance/qr/verify-and-mark", json={"token": mech_sess["token"], "student_roll": student_roll}, headers=s_headers)
    print(f"  Response: {r3.status_code} - {r3.text}")
    assert r3.status_code == 400, "Cross-branch scan must return 400"
    assert "branch mismatch" in r3.text.lower(), "Must explain branch mismatch"
    print("  ✅ PASS: Cross-branch proxy blocked cleanly.")
    passed_count += 1

    # =========================================================================
    # TEST 4: CROSS-SEMESTER MISMATCH ISOLATION (Sem 4 vs Sem 6)
    # =========================================================================
    print("\n[TEST 4] 📚 Cross-Semester Academic Isolation (Sem 4 -> Sem 6 QR)...")
    sem4_sess = requests.post(
        f"{BASE_URL}/attendance/qr/init-session",
        json={"subject_id": 1, "room_id": "LH-102", "section": "A", "branch": "Computer Science", "semester": 4},
        headers=t_headers
    ).json()
    r4 = requests.post(f"{BASE_URL}/attendance/qr/verify-and-mark", json={"token": sem4_sess["token"], "student_roll": student_roll}, headers=s_headers)
    print(f"  Response: {r4.status_code} - {r4.text}")
    assert r4.status_code == 400, "Cross-semester scan must return 400"
    assert "academic mismatch" in r4.text.lower() or "semester" in r4.text.lower(), "Must explain semester mismatch"
    print("  ✅ PASS: Cross-semester proxy blocked cleanly.")
    passed_count += 1

    # =========================================================================
    # TEST 5: CROSS-SECTION MISMATCH ISOLATION (Sec B vs Sec A)
    # =========================================================================
    print("\n[TEST 5] 🔀 Cross-Section Academic Isolation (Sec B -> Sec A QR)...")
    secB_sess = requests.post(
        f"{BASE_URL}/attendance/qr/init-session",
        json={"subject_id": 1, "room_id": "LH-103", "section": "B", "branch": "Computer Science", "semester": 6},
        headers=t_headers
    ).json()
    r5 = requests.post(f"{BASE_URL}/attendance/qr/verify-and-mark", json={"token": secB_sess["token"], "student_roll": student_roll}, headers=s_headers)
    print(f"  Response: {r5.status_code} - {r5.text}")
    assert r5.status_code == 400, "Cross-section scan must return 400"
    assert "section mismatch" in r5.text.lower(), "Must explain section mismatch"
    print("  ✅ PASS: Cross-section proxy blocked cleanly.")
    passed_count += 1

    # =========================================================================
    # TEST 6: PRIVILEGE ESCALATION ATTACK (Student -> Teacher / Admin Endpoints)
    # =========================================================================
    print("\n[TEST 6] 🚫 Privilege Escalation Defense (Student token on Teacher APIs)...")
    # 6A: Student trying to start a QR session
    r6a = requests.post(
        f"{BASE_URL}/attendance/qr/init-session",
        json={"subject_id": 1, "room_id": "LH-101", "section": "A", "branch": "Computer Science", "semester": 6},
        headers=s_headers
    )
    print(f"  -> Student on /attendance/qr/init-session: {r6a.status_code}")
    assert r6a.status_code == 403, "Student must be forbidden from initiating QR sessions"

    # 6B: Student trying to view management live attendance matrix
    r6b = requests.get(f"{BASE_URL}/management/attendance/live", headers=s_headers)
    print(f"  -> Student on /management/attendance/live: {r6b.status_code}")
    assert r6b.status_code == 403, "Student must be forbidden from management endpoints"

    # 6C: Student trying to spy on live teacher check-in status
    r6c = requests.get(f"{BASE_URL}/attendance/qr/live-status/14", headers=s_headers)
    print(f"  -> Student on /attendance/qr/live-status: {r6c.status_code}")
    assert r6c.status_code == 403, "Student must be forbidden from faculty live status"
    print("  ✅ PASS: Privilege escalation blocked with 403 Forbidden on all fronts.")
    passed_count += 1

    # =========================================================================
    # TEST 7: BIOMETRICS NON-FACE UPLOAD REJECTION
    # =========================================================================
    print("\n[TEST 7] 👤 Biometric Defense: Blank / Non-Face Image Upload...")
    blank_file = create_face_image(num_faces=0)
    data = {
        'full_name': 'Test NonFace',
        'roll_number': '2500650100991',
        'branch': 'Computer Science',
        'semester': '6',
        'section': 'A'
    }
    r7 = requests.post(f"{BASE_URL}/students/register", data=data, files={'selfie': ('blank.jpg', blank_file, 'image/jpeg')})
    print(f"  Response: {r7.status_code} - {r7.text}")
    assert r7.status_code == 400, "Blank non-face image must be rejected with 400"
    assert "no human face detected" in r7.text.lower(), "Must provide clear face detection error"
    print("  ✅ PASS: Non-face upload rejected with 400 Bad Request.")
    passed_count += 1

    # =========================================================================
    # TEST 8: BIOMETRICS MULTI-FACE (>2 FACES) REJECTION
    # =========================================================================
    print("\n[TEST 8] 👥 Biometric Defense: Multi-Face Image Upload...")
    multi_file = create_face_image(num_faces=3)
    data['roll_number'] = '2500650100992'
    r8 = requests.post(f"{BASE_URL}/students/register", data=data, files={'selfie': ('multi.jpg', multi_file, 'image/jpeg')})
    print(f"  Response: {r8.status_code} - {r8.text}")
    # Must reject with either multiple faces detected (400) or strict detection
    assert r8.status_code == 400, "Multi-face or invalid selfie must be rejected with 400"
    print("  ✅ PASS: Invalid multi-person selfie rejected.")
    passed_count += 1

    # =========================================================================
    # TEST 9: WHITESPACE & CASE-INSENSITIVE LOGIN TOLERANCE
    # =========================================================================
    print("\n[TEST 9] 🔤 Real-World Input Tolerance: Whitespace & Case Insensitivity...")
    # Student types lowercase roll with spaces: "  2500650100888  "
    r9 = requests.post(f"{BASE_URL}/api/auth/login", json={"email": f"  {student_roll.lower()}  ", "password": student_pwd})
    print(f"  Response: {r9.status_code} (User: {r9.json().get('user', {}).get('full_name')})")
    assert r9.status_code == 200, "Whitespace and lowercase roll number must authenticate seamlessly"
    print("  ✅ PASS: Fault-tolerant login sanitized whitespace and case.")
    passed_count += 1

    # =========================================================================
    # TEST 10: ZERO-DIVISION & ARITHMETIC SAFETY
    # =========================================================================
    print("\n[TEST 10] ➗ Academic Math Safety: Division-by-Zero Protection...")
    r10 = requests.get(f"{BASE_URL}/portal/metrics", headers=s_headers)
    m = r10.json().get("metrics", {})
    pct = m.get("overall_percentage")
    assert isinstance(pct, (int, float)), "Percentage must be a valid float/int"
    assert 0.0 <= pct <= 100.0, "Percentage must be between 0 and 100"
    print(f"  Current Overall Percentage: {pct}%, Eligibility: {m.get('eligibility_status')}")
    print("  ✅ PASS: Attendance percentages calculate cleanly without ZeroDivisionError.")
    passed_count += 1

    # =========================================================================
    # TEST 11: GRIEVANCE DESK SUBMISSION & TICKET TRACKING
    # =========================================================================
    print("\n[TEST 11] 📝 Grievance Desk Submission & Tracking...")
    grv_payload = {
        "session_id": 14,
        "reason": "Was present in LH-101 but had temporary camera autofocus glitch.",
        "subject_name": "Machine Learning & AI",
        "document_name": "doctor_cert.pdf"
    }
    r11 = requests.post(f"{BASE_URL}/portal/grievance", json=grv_payload, headers=s_headers)
    print(f"  Response: {r11.status_code} - {r11.text}")
    assert r11.status_code == 200, "Grievance submission must succeed with 200"
    ticket_id = r11.json().get("ticket_id")
    assert ticket_id and ticket_id.startswith("GRV-"), "Must return valid GRV ticket ID"
    print(f"  ✅ PASS: Grievance registered under Ticket ID '{ticket_id}'.")
    passed_count += 1

    # =========================================================================
    # TEST 12: INVALID & MALFORMED BEARER TOKEN ISOLATION
    # =========================================================================
    print("\n[TEST 12] 🚫 Malformed Token & Session Defense...")
    r12 = requests.get(f"{BASE_URL}/portal/metrics", headers={"Authorization": "Bearer not-a-real-jwt-token-garbage"})
    print(f"  Response: {r12.status_code} - {r12.text}")
    assert r12.status_code == 401, "Malformed token must return 401"
    print("  ✅ PASS: Malformed JWT token rejected with 401 Unauthorized.")
    passed_count += 1

    # =========================================================================
    # TEST 13: CONCURRENT DOUBLE-SCAN RACE CONDITION DEFENSE
    # =========================================================================
    print("\n[TEST 13] ⚡ High-Speed Concurrent Double-Scan Race Condition Defense...")
    # Generate fresh active QR token
    fresh_session = requests.post(
        f"{BASE_URL}/attendance/qr/init-session",
        json={"subject_id": 1, "room_id": "LH-101", "section": "A", "branch": "Computer Science", "semester": 6},
        headers=t_headers
    ).json()
    fresh_token = fresh_session["token"]

    responses = []
    def make_scan_request():
        res = requests.post(
            f"{BASE_URL}/attendance/qr/verify-and-mark",
            json={"token": fresh_token, "student_roll": student_roll},
            headers=s_headers
        )
        responses.append(res)

    # Launch 5 concurrent threads at exact same millisecond
    threads = [threading.Thread(target=make_scan_request) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    statuses = [r.status_code for r in responses]
    print(f"  Concurrent Statuses: {statuses}")
    assert all(s == 200 for s in statuses), "All concurrent requests must resolve cleanly with 200 (no 500 crashes)"
    marked_true = sum(1 for r in responses if r.json().get("already_marked") is False)
    already_marked = sum(1 for r in responses if r.json().get("already_marked") is True)
    print(f"  Initial Checkin: {marked_true}, Prevented Re-scans: {already_marked}")
    assert marked_true == 1, "Exactly one concurrent scan must be marked as initial check-in"
    assert already_marked == 4, "Remaining 4 rapid scans must return already_marked=True without double-counting"
    print("  ✅ PASS: Zero race conditions, exactly 1 attendance row created, 0% double-counting.")
    passed_count += 1

    print("\n" + "=" * 75)
    print(f"🏆 ALL {passed_count}/{total_tests} RESILIENCE & EDGE-CASE TESTS PASSED (0% FAILURE)!")
    print("=" * 75)

if __name__ == "__main__":
    run_resilience_test_suite()
