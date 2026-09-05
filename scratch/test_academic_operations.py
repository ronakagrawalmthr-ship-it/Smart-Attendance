import requests
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_academic_operations():
    print("==================================================")
    print("TESTING HOD POWERS, HOLIDAYS & CLASS TEST ENGINE")
    print("==================================================")

    # 1. Login as Admin
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@college.edu", "password": "AdminPass123!"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Admin authenticated successfully.")

    # 2. Test Holiday / Class Suspension Declaration
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    holiday_payload = {
        "title": "College Annual Tech Symposium 2026",
        "date": today_str,
        "department": "Computer Science",
        "description": "Classes suspended for Department Hackathon and Coding Fest"
    }
    h_res = requests.post(f"{BASE_URL}/management/holidays", json=holiday_payload, headers=headers)
    assert h_res.status_code == 200, f"Holiday create failed: {h_res.text}"
    print(f"[PASS] Holiday / Class Suspension declared: {h_res.json()['message']}")

    # Check Holiday status API
    check_h = requests.get(f"{BASE_URL}/management/holidays/check?date={today_str}&branch=Computer%20Science")
    assert check_h.status_code == 200
    h_info = check_h.json()
    assert h_info["is_holiday"] is True
    print(f"[PASS] Holiday verification successful: {h_info['title']} for {h_info['department']}.")

    # 3. Test Proxy / Substitute Teacher Allocation
    # Fetch teachers and subjects
    teachers = requests.get(f"{BASE_URL}/management/crud/teachers", headers=headers).json().get("teachers", [])
    subjects = requests.get(f"{BASE_URL}/management/crud/subjects", headers=headers).json().get("subjects", [])
    assert len(teachers) >= 2, "Need at least 2 teachers"
    assert len(subjects) >= 1, "Need at least 1 subject"

    orig_t = teachers[0]
    proxy_t = teachers[1]
    subj = subjects[0]

    proxy_payload = {
        "original_teacher_id": orig_t["id"],
        "proxy_teacher_id": proxy_t["id"],
        "subject_id": subj["id"],
        "date": today_str,
        "reason": "Faculty attending AICTE FDP conference"
    }
    proxy_res = requests.post(f"{BASE_URL}/management/hod/proxy/assign", json=proxy_payload, headers=headers)
    assert proxy_res.status_code == 200, f"Proxy assign failed: {proxy_res.text}"
    print(f"[PASS] Substitute Teacher Allocated: {proxy_res.json()['message']}")

    # Verify proxy list
    proxy_list = requests.get(f"{BASE_URL}/management/hod/proxy/list", headers=headers).json().get("proxy_assignments", [])
    assert len(proxy_list) > 0
    print(f"[PASS] Active Proxy Assignments retrieved: {len(proxy_list)} record(s).")

    # 4. Test Duty Leave (OD) / Event Exemption
    students = requests.get(f"{BASE_URL}/management/crud/students", headers=headers).json().get("students", [])
    assert len(students) >= 1, "Need at least 1 student"
    od_student_ids = [students[0]["id"]]

    od_payload = {
        "student_ids": od_student_ids,
        "date": today_str,
        "event_name": "Smart India Hackathon Finalist",
        "remarks": "Exempted for 2-day national round participation"
    }
    od_res = requests.post(f"{BASE_URL}/management/hod/duty-leave/grant", json=od_payload, headers=headers)
    assert od_res.status_code == 200, f"Duty leave failed: {od_res.text}"
    print(f"[PASS] Duty Leave Granted: {od_res.json()['message']}")

    # Check Duty Leave audit logs
    od_records = requests.get(f"{BASE_URL}/management/hod/duty-leave/records", headers=headers).json().get("records", [])
    print(f"[PASS] Duty Leave Records logged in system: {len(od_records)} entries.")

    # 5. Test Class Test & Exam Attendance Tracker
    # Fetch test sessions
    test_records_res = requests.get(f"{BASE_URL}/management/attendance/test-records", headers=headers)
    assert test_records_res.status_code == 200
    test_records = test_records_res.json().get("test_records", [])
    print(f"[PASS] Class Test Records endpoint queried: {len(test_records)} exam session(s) active.")

    # Test absentee notification
    notify_payload = {
        "session_id": 1,
        "subject_name": "Data Structures & Algorithms Test",
        "absent_student_ids": [students[0]["id"]]
    }
    notify_res = requests.post(f"{BASE_URL}/management/attendance/test-absentees/notify-parents", json=notify_payload, headers=headers)
    assert notify_res.status_code == 200
    print(f"[PASS] Test Absentee Parent Alerts sent: {notify_res.json()['message']}")

    print("==================================================")
    print("ALL ACADEMIC OPERATIONS & HOD POWERS VERIFIED (100%)!")
    print("==================================================")

if __name__ == "__main__":
    test_academic_operations()
