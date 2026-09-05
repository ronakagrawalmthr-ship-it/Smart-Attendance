import urllib.request
import json
import sys

BASE_URL = "http://localhost:8000"

def run_e2e_verification():
    print("=" * 70)
    print("E2E COMPREHENSIVE ATTENDANCE & CONDUCTOR ATTRIBUTION VERIFICATION")
    print("=" * 70)

    # 1. Fetch Class Roster for Computer Science Sem 8 Sec A
    print("\n[Step 1] Teacher opens classroom terminal and selects Computer Science Sem 8 Sec A...")
    req = urllib.request.Request(f"{BASE_URL}/attendance/class-students?branch=Computer%20Science&semester=8&section=A")
    with urllib.request.urlopen(req) as resp:
        students_data = json.loads(resp.read().decode())
    
    students = students_data["students"]
    print(f"-> Enrolled students in class: {len(students)}")
    for s in students:
        print(f"   * {s['roll_number']} - {s['name']} (Biometrics: {s['has_face']})")
    assert len(students) > 0, "No students found!"

    # 2. Teacher takes 2nd lecture of the day (Machine Learning CS301)
    print("\n[Step 2] Regular teacher (Dr. Robert Vance) conducts 2nd Lecture of the Day...")
    lec2_payload = {
        "branch": "Computer Science",
        "semester": 8,
        "section": "A",
        "session_type": "lecture",
        "subject_id": 1,
        "conducted_by_name": "Dr. Robert Vance",
        "notes": "Lecture 2 of the day - Extra Machine Learning Afternoon Lab",
        "attendance": [
            {"student_id": students[0]["id"], "roll_number": students[0]["roll_number"], "is_present": True, "status_tag": "PRESENT"},
            {"student_id": students[1]["id"], "roll_number": students[1]["roll_number"], "is_present": True, "status_tag": "PRESENT"},
            {"student_id": students[2]["id"], "roll_number": students[2]["roll_number"], "is_present": False, "status_tag": "ABSENT"}
        ]
    }
    req2 = urllib.request.Request(
        f"{BASE_URL}/attendance/create-and-submit",
        data=json.dumps(lec2_payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req2) as resp2:
        lec2_res = json.loads(resp2.read().decode())
    print(f"-> Session #{lec2_res['session_id']} submitted: Conductor '{lec2_res['conducted_by']}', Present: {lec2_res['present_count']}, Absent: {lec2_res['absent_count']}")
    assert lec2_res["success"] == True
    assert lec2_res["conducted_by"] == "Dr. Robert Vance"

    # 3. Guest speaker / proxy teacher conducts Guest Lecture
    print("\n[Step 3] Guest Speaker conducts Industry Workshop / Guest Lecture...")
    guest_payload = {
        "branch": "Computer Science",
        "semester": 8,
        "section": "A",
        "session_type": "guest_lecture",
        "subject_id": None,
        "custom_subject_name": "Autonomous AI Agents & Multi-Modal Foundation Models",
        "conducted_by_name": "Dr. Sarah Lin (Principal AI Scientist, Google DeepMind)",
        "notes": "Departmental Guest Lecture on Autonomous Agents",
        "attendance": [
            {"student_id": students[0]["id"], "roll_number": students[0]["roll_number"], "is_present": True, "status_tag": "PRESENT"},
            {"student_id": students[1]["id"], "roll_number": students[1]["roll_number"], "is_present": True, "status_tag": "PRESENT"},
            {"student_id": students[2]["id"], "roll_number": students[2]["roll_number"], "is_present": True, "status_tag": "PRESENT"}
        ]
    }
    req3 = urllib.request.Request(
        f"{BASE_URL}/attendance/create-and-submit",
        data=json.dumps(guest_payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req3) as resp3:
        guest_res = json.loads(resp3.read().decode())
    print(f"-> Session #{guest_res['session_id']} submitted: Conductor '{guest_res['conducted_by']}', Topic: '{guest_res['custom_subject_name']}'")
    assert guest_res["success"] == True
    assert "Sarah Lin" in guest_res["conducted_by"]
    assert guest_res["session_type"] == "guest_lecture"

    # 4. HOD logs into HOD portal and calls /management/attendance/comprehensive-analytics
    print("\n[Step 4] HOD views Department Attendance Intelligence...")
    sys.path.append(r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\backend")
    from security import create_access_token
    from database import SessionLocal
    import models

    db = SessionLocal()
    hod = db.query(models.User).filter(models.User.role == models.RoleEnum.hod).first()
    hod_email = hod.email if hod else "hod@college.edu"
    db.close()

    token = create_access_token({"sub": hod_email})
    auth_headers = {"Authorization": f"Bearer {token}"}

    req4 = urllib.request.Request(
        f"{BASE_URL}/management/attendance/comprehensive-analytics?branch=Computer%20Science&semester=8&section=A",
        headers=auth_headers
    )
    with urllib.request.urlopen(req4) as resp4:
        analytics_data = json.loads(resp4.read().decode())

    print(f"-> Total lectures logged in HOD console: {analytics_data['summary']['total_lectures_conducted']}")
    print(f"-> Guest lectures logged: {analytics_data['summary']['guest_lectures_conducted']}")
    print(f"-> Average turnout: {analytics_data['summary']['average_turnout_percentage']}%")

    # 5. Check Conductor Attribution in Sessions Log
    print("\n[Step 5] Verifying HOD sees exactly who took each lecture...")
    sessions = analytics_data["sessions_log"]
    assert len(sessions) >= 2
    conductors = [s["conducted_by"] for s in sessions]
    print(f"-> Conductors appearing in HOD records: {conductors[:5]}")
    assert any("Sarah Lin" in c for c in conductors), "Guest speaker Dr. Sarah Lin must appear in HOD records!"
    assert any("Robert Vance" in c for c in conductors), "Dr. Robert Vance must appear in HOD records!"

    # 6. Check Total Cumulative Attendance across all lectures / any teacher
    print("\n[Step 6] Verifying Total Student Cumulative Attendance ledger...")
    student_ledger = analytics_data["student_summary"]
    for st in student_ledger:
        print(f"   * {st['roll_number']} - {st['name']}: Total Lectures: {st['total_lectures']}, Attended: {st['total_attended']}, Overall %: {st['overall_percentage']}% (Defaulter: {st['is_defaulter']})")
        print(f"     Guest Lectures Attended: {st['guest_lectures']['attended']}/{st['guest_lectures']['total']}")
        assert st["total_lectures"] > 0
        assert st["overall_percentage"] <= 100.0

    # 7. Check Subject-Specific filtering
    print("\n[Step 7] Verifying HOD Subject-Specific filtering (Guest Lectures only)...")
    req_guest = urllib.request.Request(
        f"{BASE_URL}/management/attendance/comprehensive-analytics?branch=Computer%20Science&semester=8&section=A&subject_code=GUEST",
        headers=auth_headers
    )
    with urllib.request.urlopen(req_guest) as resp_g:
        guest_only_data = json.loads(resp_g.read().decode())
    
    print(f"-> Guest-only sessions count: {len(guest_only_data['sessions_log'])}")
    assert len(guest_only_data["sessions_log"]) >= 1
    assert all(s["is_guest_lecture"] for s in guest_only_data["sessions_log"])
    for gs in guest_only_data["sessions_log"][:2]:
        print(f"   * Topic: '{gs['subject_name']}' | Speaker: '{gs['conducted_by']}' | Turnout: {gs['turnout_percentage']}%")

    print("\n" + "=" * 70)
    print(">>> ALL END-TO-END VERIFICATION CHECKS PASSED PERFECTLY! <<<")
    print("=" * 70)

if __name__ == "__main__":
    run_e2e_verification()
