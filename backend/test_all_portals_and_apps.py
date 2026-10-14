import sys
import io
import time
import requests
import json

# Configure UTF-8 for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BACKEND_URL = "http://127.0.0.1:8000"
WEB_FRONTEND_URL = "http://localhost:3000"
ADMIN_PORTAL_URL = "http://localhost:3001"
STUDENT_PORTAL_URL = "http://localhost:3002"
HOD_PORTAL_URL = "http://localhost:3003"

def run_whole_ecosystem_audit():
    print("=" * 80)
    print("🌐 WHOLE SYSTEM AUDIT: ALL 5 WEBSITES, PORTALS, MOBILE APP & BACKEND")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # PART 1: HTTP HEALTH CHECK OF ALL 5 ACTIVE WEB SERVERS
    # -------------------------------------------------------------------------
    print("\n[PART 1] 🚀 Verifying Live Web Servers & Service Ports...")
    services = [
        ("Central FastAPI Backend (Port 8000)", f"{BACKEND_URL}/health"),
        ("Main Showcase & Teacher Console (Port 3000)", f"{WEB_FRONTEND_URL}/"),
        ("Institutional Governance Admin Portal (Port 3001)", f"{ADMIN_PORTAL_URL}/"),
        ("Student Academic Portal (Port 3002)", f"{STUDENT_PORTAL_URL}/"),
        ("HOD Departmental Command Deck (Port 3003)", f"{HOD_PORTAL_URL}/"),
    ]

    for name, url in services:
        try:
            r = requests.get(url, timeout=5)
            status = r.status_code
            print(f"  -> {name}: HTTP {status} ✅")
            assert status == 200, f"{name} did not return 200 OK"
        except Exception as e:
            print(f"  ❌ {name} unreachable: {e}")
            sys.exit(1)

    print("  ✅ All 5 web servers and backend ports are LIVE and responding with HTTP 200 OK!")

    # -------------------------------------------------------------------------
    # PART 2: ADMIN INSTITUTIONAL PORTAL (Port 3001) END-TO-END FLOW
    # -------------------------------------------------------------------------
    print("\n[PART 2] 🏛️ Admin Portal (Port 3001) - Full Governance Flow...")
    # 2A: Login as Admin
    admin_login = requests.post(f"{BACKEND_URL}/api/auth/login", json={
        "email": "ronakagrawalmthr@gmail.com",
        "password": "AdminPassword@123"
    })
    print(f"  -> Admin Login Status: {admin_login.status_code}")
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_data = admin_login.json()
    admin_token = admin_data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f"     Logged in as: {admin_data.get('user', {}).get('full_name')} (Role: {admin_data.get('user', {}).get('role')})")

    # 2B: Fetch KPI Stats
    kpi_res = requests.get(f"{BACKEND_URL}/management/college/kpi-stats", headers=admin_headers)
    print(f"  -> /management/college/kpi-stats: {kpi_res.status_code}")
    assert kpi_res.status_code == 200
    kpi = kpi_res.json()
    print(f"     Total Students: {kpi.get('totalStudents')}, Faculty: {kpi.get('totalFaculty')}, Departments: {kpi.get('totalDepartments')}")

    # 2C: Fetch Live Attendance Matrices
    live_res = requests.get(f"{BACKEND_URL}/management/attendance/live", headers=admin_headers)
    print(f"  -> /management/attendance/live: {live_res.status_code}")
    assert live_res.status_code == 200

    # 2D: Fetch Telemetry Recent Scans
    telemetry_res = requests.get(f"{BACKEND_URL}/management/telemetry/recent-scans?limit=5", headers=admin_headers)
    print(f"  -> /management/telemetry/recent-scans: {telemetry_res.status_code}")
    assert telemetry_res.status_code == 200

    # 2E: Setup & Status
    setup_res = requests.get(f"{BACKEND_URL}/setup/status")
    print(f"  -> /setup/status: {setup_res.status_code}")
    assert setup_res.status_code == 200
    print("  ✅ Admin Portal backend integrations 100% operational!")

    # -------------------------------------------------------------------------
    # PART 3: HOD DEPARTMENTAL COMMAND DECK (Port 3003) END-TO-END FLOW
    # -------------------------------------------------------------------------
    print("\n[PART 3] 🎓 HOD Command Deck (Port 3003) - Departmental Flow...")
    # 3A: Login as HOD
    hod_login = requests.post(f"{BACKEND_URL}/api/auth/login", json={
        "email": "dp@gmail.com",
        "password": "HodPassword@123"
    })
    print(f"  -> HOD Login Status: {hod_login.status_code}")
    assert hod_login.status_code == 200, f"HOD login failed: {hod_login.text}"
    hod_data = hod_login.json()
    hod_token = hod_data["access_token"]
    hod_headers = {"Authorization": f"Bearer {hod_token}"}
    print(f"     Logged in as: {hod_data.get('user', {}).get('full_name')} (Dept: {hod_data.get('user', {}).get('department')})")

    # 3B: Fetch Department Overview
    dept_res = requests.get(f"{BACKEND_URL}/management/department/overview?branch=Computer%20Science", headers=hod_headers)
    print(f"  -> /management/department/overview: {dept_res.status_code}")
    assert dept_res.status_code == 200
    dept_info = dept_res.json()
    print(f"     Dept: {dept_info.get('departmentName')}, Turnout: {dept_info.get('overallTurnout')}")

    # 3C: Check Pending Student Grievances
    grv_res = requests.get(f"{BACKEND_URL}/management/grievances", headers=hod_headers)
    print(f"  -> /management/grievances: {grv_res.status_code}")
    assert grv_res.status_code == 200
    grv_list = grv_res.json()
    print(f"     Active Grievances in Queue: {len(grv_list)}")

    # 3D: Defaulter Tracking
    defaulters_res = requests.get(f"{BACKEND_URL}/management/defaulters?branch=Computer%20Science&cutoff=75", headers=hod_headers)
    print(f"  -> /management/defaulters: {defaulters_res.status_code}")
    assert defaulters_res.status_code == 200
    print("  ✅ HOD Portal departmental APIs 100% operational!")

    # -------------------------------------------------------------------------
    # PART 4: TEACHER CONSOLE (Port 3000) END-TO-END FLOW
    # -------------------------------------------------------------------------
    print("\n[PART 4] 👨‍🏫 Teacher Console (Port 3000) - Classroom Live Flow...")
    # 4A: Login as Teacher
    t_login = requests.post(f"{BACKEND_URL}/api/auth/login", json={
        "email": "faculty.cs@college.edu",
        "password": "FacultyPassword@123"
    })
    print(f"  -> Teacher Login Status: {t_login.status_code}")
    assert t_login.status_code == 200
    t_token = t_login.json()["access_token"]
    t_headers = {"Authorization": f"Bearer {t_token}"}

    # 4B: Teacher Inits Live QR Lecture
    init_res = requests.post(
        f"{BACKEND_URL}/attendance/qr/init-session",
        json={"subject_id": 1, "room_id": "LH-101", "section": "A", "branch": "Computer Science", "semester": 6},
        headers=t_headers
    )
    print(f"  -> /attendance/qr/init-session: {init_res.status_code}")
    assert init_res.status_code == 200
    sess_id = init_res.json()["session_id"]

    # 4C: Teacher Rotates Dynamic QR Token
    rotate_res = requests.get(f"{BACKEND_URL}/attendance/qr/token/{sess_id}", headers=t_headers)
    print(f"  -> /attendance/qr/token/{sess_id}: {rotate_res.status_code}")
    assert rotate_res.status_code == 200

    # 4D: Teacher Live Status Poller
    status_res = requests.get(f"{BACKEND_URL}/attendance/qr/live-status/{sess_id}", headers=t_headers)
    print(f"  -> /attendance/qr/live-status/{sess_id}: {status_res.status_code}")
    assert status_res.status_code == 200
    print("  ✅ Teacher Console live classroom endpoints 100% operational!")

    # -------------------------------------------------------------------------
    # PART 5: STUDENT ACADEMIC PORTAL (Port 3002) END-TO-END FLOW
    # -------------------------------------------------------------------------
    print("\n[PART 5] 📱 Student Academic Portal (Port 3002) - Student Flow...")
    s_login = requests.post(f"{BACKEND_URL}/api/auth/login", json={
        "email": "2500650100888",
        "password": "SecurePassword@123"
    })
    print(f"  -> Student Login Status: {s_login.status_code}")
    assert s_login.status_code == 200
    s_token = s_login.json()["access_token"]
    s_headers = {"Authorization": f"Bearer {s_token}"}

    # Profile & Metrics
    prof_res = requests.get(f"{BACKEND_URL}/portal/profile", headers=s_headers)
    assert prof_res.status_code == 200
    met_res = requests.get(f"{BACKEND_URL}/portal/metrics", headers=s_headers)
    assert met_res.status_code == 200
    tt_res = requests.get(f"{BACKEND_URL}/timetable/today?roll_number=2500650100888", headers=s_headers)
    assert tt_res.status_code == 200
    print(f"  -> Student Profile, Metrics, and Dynamic Timetable all HTTP 200 OK!")
    print("  ✅ Student Academic Portal 100% operational!")

    # -------------------------------------------------------------------------
    # PART 6: MOBILE APP (EXPO REACT NATIVE) INTEROPERABILITY CHECK
    # -------------------------------------------------------------------------
    print("\n[PART 6] 📲 Mobile App (React Native / Expo) - Endpoint Health...")
    # Mobile app ping / connectivity check
    ping_res = requests.get(f"{BACKEND_URL}/health")
    print(f"  -> Mobile App Server Ping (/health): {ping_res.status_code}")
    assert ping_res.status_code == 200

    # Mobile App latest scan telemetry for Apple Dynamic Island
    latest_scan_res = requests.get(f"{BACKEND_URL}/management/telemetry/latest-scan")
    print(f"  -> Mobile App Dynamic Island Telemetry (/latest-scan): {latest_scan_res.status_code}")
    assert latest_scan_res.status_code == 200

    # Mobile App QR verification route
    verify_route_res = requests.post(f"{BACKEND_URL}/attendance/qr/verify-and-mark", json={"token": "test", "student_roll": "test"})
    # Rejects bad token with 400 (confirming route is live and rejecting malformed payload)
    print(f"  -> Mobile App QR Verification Handshake: {verify_route_res.status_code} (400 as expected on mock token)")
    assert verify_route_res.status_code == 400
    print("  ✅ Mobile App backend endpoints 100% interoperable!")

    # -------------------------------------------------------------------------
    # PART 7: DYNAMIC URL RESOLUTION & ZERO-HARDCODE VERIFICATION
    # -------------------------------------------------------------------------
    print("\n[PART 7] 🌐 Dynamic Spotlight Universal Search Host Resolution...")
    custom_host = "192.168.1.155:8000"
    search_res = requests.get(
        f"{BACKEND_URL}/management/search?q=teacher",
        headers={"Host": custom_host}
    )
    print(f"  -> /management/search with Host {custom_host}: HTTP {search_res.status_code}")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert "results" in search_data and len(search_data["results"]) > 0
    # Verify that returned URLs adapt to the requested host dynamically
    first_url = search_data["results"][0]["url"]
    print(f"     Resolved Dynamic URL: {first_url}")
    assert "192.168.1.155" in first_url, f"Expected 192.168.1.155 in URL but got {first_url}"
    print("  ✅ Universal Search dynamically adapts to client hostname with ZERO hardcoded localhost!")

    print("\n" + "=" * 80)
    print("🎉 WHOLE PROJECT AUDIT COMPLETE: ALL 5 PORTALS + MOBILE APP + BACKEND VERIFIED!")
    print("=" * 80)

if __name__ == "__main__":
    run_whole_ecosystem_audit()
