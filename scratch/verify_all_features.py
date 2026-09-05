import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def log_test(title, success, details=""):
    mark = "PASS" if success else "FAIL"
    print(f"[{mark}] {title}")
    if details:
        print(f"       {details}")
    if not success:
        sys.exit(1)

def main():
    print("==================================================")
    print("STARTING FULL END-TO-END VERIFICATION AUDIT")
    print("==================================================")

    # 1. Student Portal Profile & Settings Verification
    print("\n--- 1. STUDENT PORTAL PROFILE MANAGEMENT ---")
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "student@college.edu", "password": "StudentPass123!"})
    if login_res.status_code != 200:
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "student@college.edu", "password": "Pass123!"})
    
    log_test("Student Authentication", login_res.status_code == 200, f"Token obtained: {login_res.status_code}")
    student_token = login_res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Fetch initial profile
    prof_get = requests.get(f"{BASE_URL}/portal/profile", headers=student_headers)
    log_test("GET /portal/profile", prof_get.status_code == 200, f"Roll: {prof_get.json().get('roll_number')}, Name: {prof_get.json().get('name')}")

    # Update profile
    prof_update_payload = {
        "phone": "+91 99887 76655",
        "emergency_contact": "+91 88776 65544"
    }
    prof_put = requests.put(f"{BASE_URL}/portal/profile", json=prof_update_payload, headers=student_headers)
    log_test("PUT /portal/profile", prof_put.status_code == 200, f"Response: {prof_put.json().get('message')}")

    # Re-fetch profile to verify database persistence
    prof_verify = requests.get(f"{BASE_URL}/portal/profile", headers=student_headers)
    verified = (
        prof_verify.json().get("phone") == "+91 99887 76655" and
        prof_verify.json().get("emergency_contact") == "+91 88776 65544"
    )
    log_test("Student Profile Database Persistence Verified", verified, f"Stored DB Phone: {prof_verify.json().get('phone')}, Emergency: {prof_verify.json().get('emergency_contact')}")

    # 2. HOD Portal Profile & Academic Defaulter Thresholds
    print("\n--- 2. HOD PORTAL PROFILE & DEPARTMENT SETTINGS ---")
    hod_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "hod.cse@college.edu", "password": "AdminPass123!"})
    log_test("HOD Authentication", hod_login.status_code == 200, f"Token obtained: {hod_login.status_code}")
    hod_token = hod_login.json()["access_token"]
    hod_headers = {"Authorization": f"Bearer {hod_token}"}

    # Fetch HOD profile
    hod_get = requests.get(f"{BASE_URL}/management/hod/profile", headers=hod_headers)
    log_test("GET /management/hod/profile", hod_get.status_code == 200, f"HOD Name: {hod_get.json().get('full_name')}, Dept: {hod_get.json().get('department')}")

    # Update HOD profile & department rules
    hod_put_payload = {
        "phone": "+91 91234 56789",
        "office_room": "Academic Block A, Suite 305",
        "defaulter_threshold": 78.5,
        "notification_email": "hod.cse@college.edu"
    }
    hod_put = requests.put(f"{BASE_URL}/management/hod/profile", json=hod_put_payload, headers=hod_headers)
    log_test("PUT /management/hod/profile", hod_put.status_code == 200, f"Message: {hod_put.json().get('message')}")

    # Re-verify HOD settings
    hod_verify = requests.get(f"{BASE_URL}/management/hod/profile", headers=hod_headers)
    hod_ok = (
        hod_verify.json().get("office_room") == "Academic Block A, Suite 305" and
        hod_verify.json().get("defaulter_threshold") == 78.5
    )
    log_test("HOD Settings Persistence Verified", hod_ok, f"Office: {hod_verify.json().get('office_room')}, Threshold: {hod_verify.json().get('defaulter_threshold')}%")

    # 3. Admin Portal System Settings & Master Security
    print("\n--- 3. ADMIN PORTAL SYSTEM CONFIG & MASTER GOVERNANCE ---")
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@college.edu", "password": "AdminPass123!"})
    log_test("Admin Authentication", admin_login.status_code == 200, f"Token obtained: {admin_login.status_code}")
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch admin settings
    adm_get = requests.get(f"{BASE_URL}/management/admin/settings", headers=admin_headers)
    log_test("GET /management/admin/settings", adm_get.status_code == 200, f"Institution: {adm_get.json().get('institution_name')}")

    # Update admin settings
    adm_put_payload = {
        "institution_name": "Apex University of Science & Technology",
        "current_term": "Autumn 2026 Academic Session",
        "global_attendance_threshold": 76.0,
        "consecutive_absent_alert": 4
    }
    adm_put = requests.put(f"{BASE_URL}/management/admin/settings", json=adm_put_payload, headers=admin_headers)
    log_test("PUT /management/admin/settings", adm_put.status_code == 200, f"Message: {adm_put.json().get('message')}")

    # Re-verify admin settings
    adm_verify = requests.get(f"{BASE_URL}/management/admin/settings", headers=admin_headers)
    adm_ok = (
        adm_verify.json().get("institution_name") == "Apex University of Science & Technology" and
        adm_verify.json().get("global_attendance_threshold") == 76.0 and
        adm_verify.json().get("consecutive_absent_alert") == 4
    )
    log_test("Admin System Settings Persistence Verified", adm_ok, f"Institution: {adm_verify.json().get('institution_name')}, Global Cutoff: {adm_verify.json().get('global_attendance_threshold')}%")

    # 4. Teacher Mobile App Profile & Preferences
    print("\n--- 4. TEACHER MOBILE APP PROFILE & PREFERENCES ---")
    teach_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "teacher@college.edu", "password": "TeacherPass123!"})
    log_test("Teacher Authentication", teach_login.status_code == 200, f"Token obtained: {teach_login.status_code}")
    teach_token = teach_login.json()["access_token"]
    teach_headers = {"Authorization": f"Bearer {teach_token}"}

    # Fetch teacher profile
    teach_get = requests.get(f"{BASE_URL}/management/teacher/profile", headers=teach_headers)
    log_test("GET /management/teacher/profile", teach_get.status_code == 200, f"Employee: {teach_get.json().get('employee_id')}, Courses: {teach_get.json().get('assigned_subjects')}")

    # Update teacher profile
    teach_put_payload = {
        "phone": "+91 94444 33333"
    }
    teach_put = requests.put(f"{BASE_URL}/management/teacher/profile", json=teach_put_payload, headers=teach_headers)
    log_test("PUT /management/teacher/profile", teach_put.status_code == 200, f"Message: {teach_put.json().get('message')}")

    # Re-verify teacher profile
    teach_verify = requests.get(f"{BASE_URL}/management/teacher/profile", headers=teach_headers)
    teach_ok = teach_verify.json().get("phone") == "+91 94444 33333"
    log_test("Teacher Profile Persistence Verified", teach_ok, f"Phone: {teach_verify.json().get('phone')}")

    print("\n==================================================")
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY WITH 100% PASS RATE!")
    print("==================================================")

if __name__ == "__main__":
    main()
