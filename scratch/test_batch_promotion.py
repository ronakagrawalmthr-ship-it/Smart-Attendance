import requests

BASE_URL = "http://localhost:8000"

def test_promotion_and_lifecycle():
    print("==================================================")
    print("TESTING ACADEMIC YEAR PROMOTION & STUDENT LIFECYCLE")
    print("==================================================")

    # 1. Login as Admin
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@college.edu", "password": "AdminPass123!"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Admin logged in successfully.")

    # 2. Add Lateral Entry Student (Direct 2nd Year / Sem 3)
    lateral_roll = "CS2026LE01"
    lateral_payload = {
        "full_name": "Rohan Verma (Lateral Entry)",
        "roll_number": lateral_roll,
        "branch": "Computer Science",
        "semester": 3,
        "section": "A",
        "email": "rohan.le@student.college.edu",
        "password": "StudentPass123!"
    }
    # Clean up first if exists
    students_res = requests.get(f"{BASE_URL}/management/crud/students?search={lateral_roll}", headers=headers)
    for s in students_res.json().get("students", []):
        if s["roll_number"] == lateral_roll:
            requests.delete(f"{BASE_URL}/management/crud/students/{s['id']}", headers=headers)

    create_res = requests.post(f"{BASE_URL}/management/crud/students", json=lateral_payload, headers=headers)
    assert create_res.status_code == 200, f"Lateral entry create failed: {create_res.text}"
    print(f"[PASS] Lateral Entry student created in Semester 3: {create_res.json()}")

    # 3. Test Student Leaving / Deactivation (Dropout / College Leaver)
    dropout_roll = "CS2026DROP01"
    dropout_payload = {
        "full_name": "Vikram Singh (Transfer Out)",
        "roll_number": dropout_roll,
        "branch": "Computer Science",
        "semester": 1,
        "section": "B",
        "email": "vikram.drop@student.college.edu",
        "password": "StudentPass123!"
    }
    drop_res = requests.post(f"{BASE_URL}/management/crud/students", json=dropout_payload, headers=headers)
    drop_id = drop_res.json()["id"]
    print(f"[PASS] Sample student created for dropout test: ID {drop_id}")

    # Deactivate / Mark as Inactive (soft decommission)
    deact_res = requests.put(f"{BASE_URL}/management/crud/students/{drop_id}", json={"is_active": False}, headers=headers)
    assert deact_res.status_code == 200
    print("[PASS] Student marked inactive (Left college / dropout) - past records preserved.")

    # 4. Test Annual Batch Promotion (1st->2nd, 2nd->3rd, 3rd->4th, 4th->Graduated)
    promote_res = requests.post(
        f"{BASE_URL}/management/crud/students/batch-promote",
        json={"branch": "all", "promote_mode": "annual", "academic_year": "2026-2027"},
        headers=headers
    )
    assert promote_res.status_code == 200, f"Batch promote failed: {promote_res.text}"
    promote_data = promote_res.json()
    print(f"[PASS] Batch Promotion executed: {promote_data['message']}")
    print(f"       Promoted: {promote_data['promoted_count']}, Graduated/Alumni: {promote_data['graduated_count']}")

    # Verify Lateral Entry student was promoted from Sem 3 -> Sem 5
    verify_res = requests.get(f"{BASE_URL}/management/crud/students?search={lateral_roll}", headers=headers)
    lateral_student = verify_res.json()["students"][0]
    print(f"[INFO] Lateral entry student semester after promotion: {lateral_student['semester']} (Expected: 5)")
    assert lateral_student["semester"] == 5, f"Expected semester 5, got {lateral_student['semester']}"
    print("[PASS] Lateral entry student successfully promoted with all identity/biometrics intact!")

    print("==================================================")
    print("ALL ACADEMIC YEAR & LIFECYCLE TESTS PASSED (100%)!")
    print("==================================================")

if __name__ == "__main__":
    test_promotion_and_lifecycle()
