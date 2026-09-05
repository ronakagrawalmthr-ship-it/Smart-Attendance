import os
import sys
import requests

backend_dir = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\backend"
sys.path.insert(0, backend_dir)

import database, models, security
from sort_utils import natural_sort_key

BASE_URL = "http://localhost:8000"
db = next(database.get_db())

print("=" * 70)
print("AUTOMATIC ROLL NUMBER SEQUENCING & DATABASE ORDERING VERIFICATION")
print("=" * 70)

# 1. Verify natural_sort_key unit tests
print("\n--- 1. Testing natural_sort_key logic ---")
test_rolls = ["CS2023102", "CS2023014", "CS2", "CS10", "CS1", "CS2023045", "CS2023001", "CS2023089"]
sorted_rolls = sorted(test_rolls, key=natural_sort_key)
expected_order = ["CS1", "CS2", "CS10", "CS2023001", "CS2023014", "CS2023045", "CS2023089", "CS2023102"]
print(f"Original: {test_rolls}")
print(f"Sorted:   {sorted_rolls}")
assert sorted_rolls == expected_order, f"Natural sort failed: {sorted_rolls} != {expected_order}"
print("PASS: natural_sort_key sorts numbers and strings in natural ascending order!")

# 2. Authenticate admin user
print("\n--- 2. Authenticating Management/Admin ---")
admin_user = db.query(models.User).filter(models.User.role == models.RoleEnum.admin).first()
if not admin_user:
    print("Creating admin user...")
    admin_user = models.User(email="admin@college.edu", hashed_password=security.get_password_hash("admin123"), role=models.RoleEnum.admin, is_active=True)
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

admin_token = security.create_access_token({"sub": admin_user.email})
auth_headers = {"Authorization": f"Bearer {admin_token}"}
print(f"Authenticated as Admin ({admin_user.email})")

# 3. Ensure we have test students with known roll numbers in Computer Science
print("\n--- 3. Checking/Creating Test Students in Computer Science ---")
known_rolls = ["CS2023102", "CS2023014", "CS2023089", "CS2023045", "CS2023056"]
created_students = []
for roll in known_rolls:
    st = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == roll).first()
    if not st:
        u = models.User(email=f"{roll.lower()}@student.edu", hashed_password=security.get_password_hash("student123"), role=models.RoleEnum.student, is_active=True)
        db.add(u)
        db.flush()
        st = models.StudentProfile(user_id=u.id, roll_number=roll, full_name=f"Student {roll}", branch="Computer Science", semester=6, section="A")
        db.add(st)
        db.flush()
    created_students.append(st)
db.commit()
print(f"Test students confirmed: {[s.roll_number for s in created_students]}")

# 4. Submit Attendance in intentionally JUMBLED / RANDOM order
print("\n--- 4. Submitting Attendance with Jumbled Roll Numbers ---")
jumbled_attendance = [
    {"roll_number": "CS2023102", "is_present": True},
    {"roll_number": "CS2023014", "is_present": False},
    {"roll_number": "CS2023089", "is_present": True},
    {"roll_number": "CS2023045", "is_present": True},
    {"roll_number": "CS2023056", "is_present": False}
]
print(f"Jumbled submission order: {[item['roll_number'] for item in jumbled_attendance]}")

submit_payload = {
    "branch": "Computer Science",
    "semester": 6,
    "section": "A",
    "session_type": "lecture",
    "custom_subject_name": "Distributed Cloud Systems",
    "conducted_by_name": "Dr. Robert Vance",
    "notes": "Testing Auto-Sequencing Pipeline",
    "attendance": jumbled_attendance
}

res = requests.post(f"{BASE_URL}/attendance/create-and-submit", json=submit_payload, headers=auth_headers)
assert res.status_code == 200, f"Submit failed: {res.text}"
sub_data = res.json()
session_id = sub_data["session_id"]
print(f"Attendance submitted successfully. Session ID: {session_id}")

# 5. Verify direct database storage ordering in AttendanceLog
print("\n--- 5. Verifying Database Table Insertion Order in sql_app.db ---")
saved_logs = db.query(models.AttendanceLog, models.StudentProfile).join(
    models.StudentProfile, models.AttendanceLog.student_id == models.StudentProfile.id
).filter(models.AttendanceLog.session_id == session_id).order_by(models.AttendanceLog.id.asc()).all()

db_rolls_in_insertion_order = [st.roll_number for log, st in saved_logs]
print(f"Actual database insertion order (by log.id): {db_rolls_in_insertion_order}")

expected_ascending = sorted(known_rolls, key=natural_sort_key)
print(f"Expected ascending roll number order:        {expected_ascending}")

assert db_rolls_in_insertion_order == expected_ascending, (
    f"DATABASE ORDERING FAILED! Actual: {db_rolls_in_insertion_order} != Expected: {expected_ascending}"
)
print("PASS: AttendanceLog rows are saved in strictly ascending Roll Number sequence in the database!")

# 6. Test GET /attendance/class-students
print("\n--- 6. Testing GET /attendance/class-students ---")
res_cs = requests.get(f"{BASE_URL}/attendance/class-students?branch=Computer%20Science&semester=6&section=A")
assert res_cs.status_code == 200
cs_data = res_cs.json()
cs_rolls = [s["roll_number"] for s in cs_data["students"]]
print(f"Class students count: {len(cs_rolls)}")
assert cs_rolls == sorted(cs_rolls, key=natural_sort_key), f"Roster not sorted: {cs_rolls}"
print("PASS: /attendance/class-students returns roster in natural ascending roll number order!")

# 7. Test GET /management/attendance/class-records
print("\n--- 7. Testing GET /management/attendance/class-records ---")
res_records = requests.get(f"{BASE_URL}/management/attendance/class-records?branch=Computer%20Science&target_date=all", headers=auth_headers)
assert res_records.status_code == 200
recs = res_records.json()["records"]
# Filter records for our created session
session_records = [r for r in recs if r["session_id"] == session_id]
session_recs_rolls = [r["roll_number"] for r in session_records]
print(f"Class records for session {session_id}: {session_recs_rolls}")
assert session_recs_rolls == expected_ascending, f"Records not sorted: {session_recs_rolls} != {expected_ascending}"
print("PASS: /management/attendance/class-records outputs records strictly arranged by roll number!")

# 8. Test GET /management/attendance/comprehensive-analytics
print("\n--- 8. Testing GET /management/attendance/comprehensive-analytics ---")
res_analytics = requests.get(f"{BASE_URL}/management/attendance/comprehensive-analytics?branch=Computer%20Science&semester=6", headers=auth_headers)
assert res_analytics.status_code == 200
ana_data = res_analytics.json()
matching_sess = next((s for s in ana_data["sessions_log"] if s["session_id"] == session_id), None)
assert matching_sess is not None, "Session not found in analytics log"
roster_rolls = [r["roll_number"] for r in matching_sess["roster"]]
print(f"Analytics session modal roster rolls: {roster_rolls}")
assert roster_rolls == expected_ascending, f"Roster not sorted: {roster_rolls} != {expected_ascending}"

ledger_rolls = [st["roll_number"] for st in ana_data["student_summary"]]
assert ledger_rolls == sorted(ledger_rolls, key=natural_sort_key), f"Ledger not sorted: {ledger_rolls}"
print("PASS: Comprehensive analytics session roster and cumulative ledger are strictly sorted by roll number!")

# 9. Test GET /management/defaulters
print("\n--- 9. Testing GET /management/defaulters ---")
res_def = requests.get(f"{BASE_URL}/management/defaulters?threshold=100&branch=Computer%20Science", headers=auth_headers)
assert res_def.status_code == 200
def_data = res_def.json()
def_rolls = [d["roll_number"] for d in def_data["defaulters"]]
print(f"Defaulters count: {len(def_rolls)}")
assert def_rolls == sorted(def_rolls, key=natural_sort_key), f"Defaulters not sorted: {def_rolls}"
print("PASS: /management/defaulters list is strictly sorted in ascending roll number order!")

# 10. Test submit_final with jumbled lists
print("\n--- 10. Testing /attendance/submit_final/{session_id} with jumbled lists ---")
final_payload = {
    "present": ["CS2023089", "CS2023014"],
    "absent": ["CS2023102", "CS2023045", "CS2023056"]
}
res_final = requests.post(f"{BASE_URL}/attendance/submit_final/{session_id}", json=final_payload, headers=auth_headers)
assert res_final.status_code == 200
print("submit_final successful. Verifying updated records order...")

updated_records = requests.get(f"{BASE_URL}/management/attendance/class-records?branch=Computer%20Science&target_date=all", headers=auth_headers).json()["records"]
updated_session_rolls = [r["roll_number"] for r in updated_records if r["session_id"] == session_id]
print(f"Updated session rolls: {updated_session_rolls}")
assert updated_session_rolls == expected_ascending, f"Updated records not sorted: {updated_session_rolls}"
print("PASS: Final submitted attendance records maintain perfect ascending roll number sequence!")

print("\n" + "=" * 70)
print("ALL 10 VERIFICATION TESTS PASSED WITH 100% SUCCESS!")
print("=" * 70)
