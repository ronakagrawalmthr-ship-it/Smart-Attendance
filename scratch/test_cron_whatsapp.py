import requests

BASE_URL = "http://127.0.0.1:8000"

def test_cron_and_whatsapp():
    print("========================================")
    print("TESTING CRON AUDIT & WHATSAPP ENGINE")
    print("========================================")

    # 1. Login
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@college.edu", "password": "AdminPass123!"})
    assert login_res.status_code == 200, f"Login failed: {login_res.status_code}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Admin Login successful")

    # 2. Trigger Midnight Cron Audit
    audit_res = requests.post(f"{BASE_URL}/management/cron/run-audit", headers=headers)
    assert audit_res.status_code == 200, f"Audit failed: {audit_res.status_code}"
    audit_data = audit_res.json()
    print(f"[PASS] Midnight Audit executed successfully:")
    print(f"       Total Audited Students: {audit_data.get('total_students_audited')}")
    print(f"       Unconducted Sessions: {audit_data.get('unconducted_sessions_flagged')}")
    print(f"       Defaulters Identified: {audit_data.get('defaulters_identified')}")
    print(f"       Message: {audit_data.get('message')}")

    # 3. Fetch Parent Notification Ledger
    logs_res = requests.get(f"{BASE_URL}/management/alerts/logs", headers=headers)
    assert logs_res.status_code == 200, f"Logs failed: {logs_res.status_code}"
    logs_data = logs_res.json()
    print(f"[PASS] Retrieved {logs_data.get('total_records')} Parent Alert records:")
    if logs_data.get("logs"):
        sample = logs_data["logs"][0]
        print(f"       Latest Log: Student {sample['student_name']} ({sample['student_roll']})")
        print(f"       Parent Phone: {sample['parent_phone']}, Channel: {sample['channel']}")
        print(f"       Trigger Reason: {sample['trigger_reason']}, Status: {sample['status']}")

    # 4. Generate 1-Click WhatsApp Link
    wa_payload = {
        "student_name": "Alex Morgan",
        "roll_number": "CS2023045",
        "parent_phone": "+91 98765 43210",
        "attendance_pct": 62.4,
        "consecutive": 3,
        "subject_code": "CS301 (Machine Learning)"
    }
    wa_res = requests.post(f"{BASE_URL}/management/alerts/whatsapp-link", json=wa_payload, headers=headers)
    assert wa_res.status_code == 200, f"WhatsApp link failed: {wa_res.status_code}"
    wa_data = wa_res.json()
    print(f"[PASS] 1-Click WhatsApp link generated successfully:")
    print(f"       Target: {wa_data.get('parent_phone')}")
    print(f"       URL: {wa_data.get('whatsapp_url')[:60]}...")

    print("\n========================================")
    print("ALL CRON & WHATSAPP TESTS PASSED (100%)!")
    print("========================================")

if __name__ == "__main__":
    test_cron_and_whatsapp()
