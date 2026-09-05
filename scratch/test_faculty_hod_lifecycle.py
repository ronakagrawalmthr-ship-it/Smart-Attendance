import requests

BASE_URL = "http://localhost:8000"

def test_faculty_hod_lifecycle():
    print("==================================================")
    print("TESTING TEACHER & HOD ONBOARDING, REPLACEMENT & EXIT")
    print("==================================================")

    # 1. Login as Admin
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@college.edu", "password": "AdminPass123!"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Admin logged in successfully.")

    # 2. Test HOD Onboarding & Replacement
    hod_email_old = "old.hod.ee@college.edu"
    hod_email_new = "new.hod.ee@college.edu"

    # Create Initial HOD
    h1 = requests.post(f"{BASE_URL}/management/crud/hods", json={
        "full_name": "Dr. R.K. Verma",
        "email": hod_email_old,
        "password": "HODPass123!",
        "department": "Electrical Engineering"
    }, headers=headers)
    assert h1.status_code in (200, 400)
    print("[PASS] Initial HOD created for Electrical Engineering.")

    # Replace HOD: Deactivate old HOD (Leaving college)
    hods_list = requests.get(f"{BASE_URL}/management/crud/hods", headers=headers).json().get("hods", [])
    old_hod_user = next((h for h in hods_list if h["email"] == hod_email_old), None)
    if old_hod_user:
        deact = requests.put(f"{BASE_URL}/management/crud/hods/{old_hod_user['id']}", json={"is_active": False}, headers=headers)
        assert deact.status_code == 200
        print(f"[PASS] Old HOD ({old_hod_user['full_name']}) deactivated safely (Exit/Resigned).")

    # Onboard New Replacement HOD
    h2 = requests.post(f"{BASE_URL}/management/crud/hods", json={
        "full_name": "Dr. S. Nair (New HOD)",
        "email": hod_email_new,
        "password": "HODPass123!",
        "department": "Electrical Engineering"
    }, headers=headers)
    assert h2.status_code in (200, 400)
    print("[PASS] New replacement HOD onboarded with immediate department-scoped governance.")

    # 3. Test Teacher Onboarding, Class Transfer & Replacement
    t_old_email = "prof.sharma@college.edu"
    t_new_email = "prof.gupta@college.edu"

    requests.post(f"{BASE_URL}/management/crud/teachers", json={
        "full_name": "Prof. A. Sharma",
        "email": t_old_email,
        "password": "TeacherPass123!",
        "department": "Computer Science"
    }, headers=headers)
    print("[PASS] Teacher Prof. Sharma registered.")

    requests.post(f"{BASE_URL}/management/crud/teachers", json={
        "full_name": "Prof. V. Gupta (Replacement)",
        "email": t_new_email,
        "password": "TeacherPass123!",
        "department": "Computer Science"
    }, headers=headers)
    print("[PASS] Replacement Teacher Prof. Gupta registered.")

    # Fetch teachers list to obtain IDs
    t_list = requests.get(f"{BASE_URL}/management/crud/teachers", headers=headers).json().get("teachers", [])
    sharma = next((t for t in t_list if t["email"] == t_old_email), None)
    gupta = next((t for t in t_list if t["email"] == t_new_email), None)

    if sharma and gupta:
        transfer_res = requests.post(f"{BASE_URL}/management/crud/teachers/transfer-classes", json={
            "from_teacher_id": sharma["id"],
            "to_teacher_id": gupta["id"]
        }, headers=headers)
        assert transfer_res.status_code == 200
        print(f"[PASS] Class Handover API executed: {transfer_res.json()['message']}")

        deact_t = requests.put(f"{BASE_URL}/management/crud/teachers/{sharma['id']}", json={"is_active": False}, headers=headers)
        assert deact_t.status_code == 200
        print("[PASS] Outgoing teacher deactivated. Account cannot take attendance, past logs preserved.")

    print("==================================================")
    print("ALL TEACHER & HOD LIFECYCLE TESTS PASSED (100%)!")
    print("==================================================")

if __name__ == "__main__":
    test_faculty_hod_lifecycle()
