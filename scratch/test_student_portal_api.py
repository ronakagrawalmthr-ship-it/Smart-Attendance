import sys
import os

sys.path.append(r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\backend")
from database import SessionLocal
import models
from routers.portal import get_student_metrics, get_student_profile

db = SessionLocal()
try:
    student_user = db.query(models.User).filter(models.User.role == models.RoleEnum.student).first()
    print("Testing with student user:", student_user.email if student_user else "None")
    assert student_user is not None

    metrics = get_student_metrics(db=db, current_user=student_user)
    print("\n--- Student Profile & Academic Year ---")
    print("Name:", metrics["profile"]["name"])
    print("Roll Number:", metrics["profile"]["roll_number"])
    print("Semester:", metrics["profile"]["semester"])
    print("Academic Year:", metrics["profile"]["academic_year"])
    print("Academic Year Label:", metrics["profile"]["academic_year_label"])
    print("Stage:", metrics["profile"]["stage"])

    print("\n--- Overall Attendance Turnout ---")
    print("Total Classes Held:", metrics["metrics"]["total_classes"])
    print("Attended Classes:", metrics["metrics"]["attended_classes"])
    print("Absent Classes:", metrics["metrics"]["absent_classes"])
    print("Overall Percentage:", metrics["metrics"]["overall_percentage"], "%")
    print("Eligibility Status:", metrics["metrics"]["eligibility_status"])

    print("\n--- Subject-Wise Breakdown ---")
    print(f"Total Subjects: {len(metrics['subjects'])}")
    for s in metrics["subjects"][:3]:
        print(f" * [{s['code']}] {s['name']}: {s['attended']}/{s['total']} ({s['pct']}%) | Safe: {s['is_safe']} | Teachers: {s['teachers']}")

    print("\n--- Guest Lectures Summary ---")
    print("Guest Lectures Total:", metrics["guest_lectures"]["total"])
    print("Guest Lectures Attended:", metrics["guest_lectures"]["attended"])
    print("Guest Lectures %:", metrics["guest_lectures"]["pct"])
    print("Guest Topics Count:", len(metrics["guest_lectures"]["topics"]))

    print("\n--- Day-Wise Attendance ---")
    print(f"Days Logged: {len(metrics['day_wise'])}")
    for d in metrics["day_wise"][:3]:
        print(f" * Date: {d['formatted_date']} ({d['day_name']}): {d['attended_lectures']}/{d['total_lectures']} ({d['turnout_pct']}%)")
        for sess in d["sessions"][:2]:
            print(f"    - [{sess['time']}] {sess['subject_name']} (Conductor: {sess['conducted_by']}) -> {sess['status']}")

    print("\n--- Profile Endpoint Test ---")
    profile = get_student_profile(db=db, current_user=student_user)
    print("Profile Year Label:", profile["academic_year_label"])
    print("Profile Stage:", profile["stage"])

    assert "academic_year" in metrics["profile"]
    assert len(metrics["day_wise"]) > 0
    print("\n[ALL STUDENT PORTAL API CHECKS PASSED!]")
finally:
    db.close()
