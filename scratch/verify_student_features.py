import urllib.request
import json
import sys

BASE_URL = "http://localhost:8000"
sys.path.append(r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\backend")
from database import SessionLocal
import models
from security import create_access_token

def test_student_experience():
    print("=" * 70)
    print("TESTING STUDENT ATTENDANCE EXPERIENCE & DYNAMIC YEAR PROMOTION")
    print("=" * 70)

    db = SessionLocal()
    student_user = db.query(models.User).filter(models.User.role == models.RoleEnum.student).first()
    student_prof = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == student_user.id).first()
    
    print(f"Student: {student_prof.full_name} ({student_prof.roll_number})")
    print(f"Current Semester in DB: {student_prof.semester}")

    # Generate token
    token = create_access_token({"sub": student_user.email})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch Student Metrics from /portal/metrics
    print("\n[Step 1] Fetching live attendance metrics from /portal/metrics...")
    req = urllib.request.Request(f"{BASE_URL}/portal/metrics", headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())

    print("\n--- 1. Total Attendance & Turnout ---")
    print(f"-> Total Classes Held: {data['metrics']['total_classes']}")
    print(f"-> Attended Classes: {data['metrics']['attended_classes']}")
    print(f"-> Overall Percentage: {data['metrics']['overall_percentage']}%")
    print(f"-> Eligibility Status: {data['metrics']['eligibility_status']}")
    assert data["metrics"]["total_classes"] > 0
    assert data["metrics"]["overall_percentage"] >= 0.0

    print("\n--- 2. Subject-Wise Attendance ---")
    print(f"-> Total Subjects Tracked: {len(data['subjects'])}")
    for sub in data["subjects"]:
        print(f"   * [{sub['code']}] {sub['name']}: {sub['attended']}/{sub['total']} ({sub['pct']}%) | Safe: {sub['is_safe']} | Teachers: {sub['teachers']}")

    print("\n--- 3. Day-Wise Attendance (Daily Log) ---")
    print(f"-> Days Logged: {len(data['day_wise'])}")
    assert len(data["day_wise"]) > 0
    for day in data["day_wise"][:3]:
        print(f"   * {day['formatted_date']} ({day['day_name']}): {day['attended_lectures']}/{day['total_lectures']} ({day['turnout_pct']}%)")
        for s in day["sessions"]:
            print(f"     - [{s['time']}] {s['subject_name']} (By: {s['conducted_by']}) -> {s['status']}")

    print("\n--- 4. Profile Academic Year & Promotion Sync ---")
    print(f"-> Semester: {data['profile']['semester']}")
    print(f"-> Computed Academic Year: {data['profile']['academic_year']}")
    print(f"-> Year Label: {data['profile']['academic_year_label']}")
    print(f"-> Stage: {data['profile']['stage']}")

    # 2. Test Year Change / Promotion simulation
    print("\n[Step 2] Simulating Year Promotion: What happens when student advances semesters?")
    from routers.portal import get_year_details
    for sem in [1, 2, 3, 4, 5, 6, 7, 8]:
        info = get_year_details(sem)
        print(f"   * Semester {sem} -> {info['academic_year_label']} | Stage: {info['stage']}")
        expected_year = (sem + 1) // 2
        assert info["academic_year"] == expected_year

    db.close()
    print("\n" + "=" * 70)
    print(">>> ALL STUDENT ATTENDANCE & PROMOTION TESTS PASSED! <<<")
    print("=" * 70)

if __name__ == "__main__":
    test_student_experience()
