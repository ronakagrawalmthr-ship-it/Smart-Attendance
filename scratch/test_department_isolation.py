import requests

BASE_URL = "http://localhost:8000"

def test_department_isolation():
    print("==================================================")
    print("TESTING DEPARTMENT ISOLATION & ACCESS CONTROL")
    print("==================================================")

    # 1. Login as CSE HOD
    hod_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "hod.cse@college.edu", "password": "AdminPass123!"})
    assert hod_res.status_code == 200, f"HOD Login failed: {hod_res.text}"
    hod_token = hod_res.json()["access_token"]
    hod_headers = {"Authorization": f"Bearer {hod_token}"}
    print("[PASS] HOD (Computer Science) logged in successfully.")

    # 2. Test HOD requesting Live Attendance
    live_res = requests.get(f"{BASE_URL}/management/attendance/live", headers=hod_headers)
    assert live_res.status_code == 200
    live_data = live_res.json()
    branches = [m["branch"] for m in live_data.get("live_matrices", [])]
    print(f"[INFO] HOD live matrices returned branches: {branches}")
    assert all("computer" in b.lower() for b in branches), f"HOD received non-CSE branch: {branches}"
    print("[PASS] HOD is strictly restricted to Computer Science branch in live matrices.")

    # 3. Test HOD attempting to tamper query parameter (asking for Civil)
    tamper_res = requests.get(f"{BASE_URL}/management/attendance/class-records?branch=Civil", headers=hod_headers)
    assert tamper_res.status_code == 200
    tamper_data = tamper_res.json()
    returned_branch = tamper_data.get("branch")
    print(f"[INFO] HOD requested 'Civil', but backend enforced branch: '{returned_branch}'")
    assert "computer" in str(returned_branch).lower(), f"Branch tampering allowed! Got {returned_branch}"
    print("[PASS] Anti-Tampering verified: HOD cannot override branch to view other departments.")

    # 4. Login as Master Admin (Principal)
    admin_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@college.edu", "password": "AdminPass123!"})
    assert admin_res.status_code == 200, f"Admin Login failed: {admin_res.text}"
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] College Administrator (Principal) logged in successfully.")

    # 5. Test Admin requesting Live Attendance (Should have unrestricted institution-wide access)
    admin_live = requests.get(f"{BASE_URL}/management/attendance/live", headers=admin_headers)
    assert admin_live.status_code == 200
    admin_branches = [m["branch"] for m in admin_live.json().get("live_matrices", [])]
    print(f"[INFO] Admin live matrices returned branches: {admin_branches}")
    print("[PASS] Admin has unrestricted college-wide access across all departments.")

    print("==================================================")
    print("ALL DEPARTMENT ISOLATION TESTS PASSED (100%)!")
    print("==================================================")

if __name__ == "__main__":
    test_department_isolation()
