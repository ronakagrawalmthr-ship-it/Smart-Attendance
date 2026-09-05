import sys
import os
from datetime import datetime

# Add backend to path
sys.path.append(r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\backend")

from database import SessionLocal, engine
import models
from routers.attendance import get_departments_meta, get_class_students, create_session_and_submit_attendance
from routers.management import get_comprehensive_attendance_analytics, get_class_attendance_records
from starlette.requests import Request

def test_flows():
    db = SessionLocal()
    try:
        print("1. Testing get_departments_meta...")
        meta = get_departments_meta(db=db)
        print("Meta branches:", meta["branches"])
        print("Meta subjects count:", len(meta["subjects"]))
        print("Meta teachers count:", len(meta["teachers"]))
        assert len(meta["branches"]) > 0
        assert len(meta["semesters"]) == 8

        print("\n2. Testing get_class_students for Computer Science Sem 8 Sec A...")
        students_res = get_class_students(branch="Computer Science", semester=8, section="A", db=db)
        print("Found students count:", students_res["count"])
        assert students_res["count"] > 0
        test_students = students_res["students"][:5]

        # Fake request object
        class MockClient:
            host = "127.0.0.1"
        class MockRequest:
            client = MockClient()
            headers = {"user-agent": "Synthetic PyTest Suite"}

        mock_req = MockRequest()

        print("\n3. Testing create_session_and_submit_attendance: Regular Subject 2nd Lecture of the Day...")
        # Find a subject
        ml_subj = db.query(models.Subject).filter(models.Subject.name.ilike("%Machine Learning%")).first()
        subj_id = ml_subj.id if ml_subj else 1

        reg_payload = {
            "branch": "Computer Science",
            "semester": 8,
            "section": "A",
            "session_type": "lecture",
            "subject_id": subj_id,
            "conducted_by_name": "Dr. Robert Vance",
            "notes": "Lecture 2 of the day - Extra Lab Practice",
            "attendance": [
                {"student_id": test_students[0]["id"], "roll_number": test_students[0]["roll_number"], "is_present": True, "status_tag": "PRESENT"},
                {"student_id": test_students[1]["id"], "roll_number": test_students[1]["roll_number"], "is_present": True, "status_tag": "PRESENT"},
                {"student_id": test_students[2]["id"], "roll_number": test_students[2]["roll_number"], "is_present": False, "status_tag": "ABSENT", "remarks": "Sick leave"}
            ]
        }
        reg_res = create_session_and_submit_attendance(payload=reg_payload, request=mock_req, db=db)
        print("Regular submission response:", reg_res)
        assert reg_res["success"] == True
        assert reg_res["conducted_by"] == "Dr. Robert Vance"
        assert reg_res["present_count"] == 2
        assert reg_res["absent_count"] == 1

        print("\n4. Testing create_session_and_submit_attendance: Guest Lecture by External Speaker...")
        guest_payload = {
            "branch": "Computer Science",
            "semester": 8,
            "section": "A",
            "session_type": "guest_lecture",
            "subject_id": None,
            "custom_subject_name": "Industry Guest Lecture: Autonomous AI Agents & LLMs",
            "conducted_by_name": "Dr. Sarah Lin (Principal AI Scientist, DeepMind)",
            "notes": "Invited Departmental Guest Lecture on Modern AI Infrastructure",
            "attendance": [
                {"student_id": test_students[0]["id"], "roll_number": test_students[0]["roll_number"], "is_present": True, "status_tag": "PRESENT"},
                {"student_id": test_students[1]["id"], "roll_number": test_students[1]["roll_number"], "is_present": True, "status_tag": "PRESENT"},
                {"student_id": test_students[2]["id"], "roll_number": test_students[2]["roll_number"], "is_present": True, "status_tag": "PRESENT"}
            ]
        }
        guest_res = create_session_and_submit_attendance(payload=guest_payload, request=mock_req, db=db)
        print("Guest lecture submission response:", guest_res)
        assert guest_res["success"] == True
        assert "Sarah Lin" in guest_res["conducted_by"]
        assert guest_res["session_type"] == "guest_lecture"
        assert guest_res["custom_subject_name"] == "Industry Guest Lecture: Autonomous AI Agents & LLMs"

        print("\n5. Testing get_comprehensive_attendance_analytics for HOD...")
        hod_user = db.query(models.User).filter(models.User.role == models.RoleEnum.hod).first()
        if not hod_user:
            hod_user = models.User(email="hod_test@college.edu", role=models.RoleEnum.hod)

        analytics = get_comprehensive_attendance_analytics(
            branch="Computer Science",
            semester=8,
            section="A",
            db=db,
            current_user=hod_user
        )

        print("Total sessions in history:", len(analytics["sessions_log"]))
        print("Total students in summary:", len(analytics["student_summary"]))
        print("Summary stats:", analytics["summary"])
        print("Filter options teachers:", analytics["available_filters"]["teachers"])

        # Check that Dr. Sarah Lin and Dr. Robert Vance appear in sessions_log
        conductors_in_log = [s["conducted_by"] for s in analytics["sessions_log"]]
        print("Conductors recorded in HOD sessions log:", conductors_in_log[:5])
        assert any("Sarah Lin" in c for c in conductors_in_log), "Guest speaker missing from log!"
        assert any("Robert Vance" in c for c in conductors_in_log), "Regular teacher missing from log!"

        # Check guest lecture recognition
        guest_sessions = [s for s in analytics["sessions_log"] if s["is_guest_lecture"]]
        print(f"Found {len(guest_sessions)} guest lecture sessions in HOD log.")
        assert len(guest_sessions) >= 1

        # Check student summary total attendance
        first_student = analytics["student_summary"][0]
        print("Sample student summary:", {
            "name": first_student["name"],
            "roll": first_student["roll_number"],
            "total_lectures": first_student["total_lectures"],
            "total_attended": first_student["total_attended"],
            "overall_percentage": first_student["overall_percentage"],
            "guest_lectures": first_student["guest_lectures"]
        })
        assert first_student["total_lectures"] > 0

        print("\n6. Testing subject-specific filter in comprehensive-analytics...")
        subj_filter_res = get_comprehensive_attendance_analytics(
            branch="Computer Science",
            semester=8,
            section="A",
            subject_code="GUEST",
            db=db,
            current_user=hod_user
        )
        print("Filtered GUEST sessions count:", len(subj_filter_res["sessions_log"]))
        assert all(s["is_guest_lecture"] for s in subj_filter_res["sessions_log"])

        print("\n[ALL TESTS PASSED SUCCESSFULLY!]")
    finally:
        db.close()

if __name__ == "__main__":
    test_flows()
