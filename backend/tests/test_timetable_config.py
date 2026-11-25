from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

try:
    from .. import models, security
except ImportError:
    import models
    import security


def _create_hod_headers(db: Session, email: str = "timetable.hod@test.edu", branch: str = "Computer Science"):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            email=email,
            hashed_password=security.get_password_hash("Pass@123"),
            role=models.RoleEnum.hod,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.add(models.TeacherProfile(user_id=user.id, full_name="Prof. Scheduler", department=branch))
        db.commit()
    token = security.create_access_token({"sub": user.email, "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


def test_timetable_custom_duration_config_and_slot_auto_timing(client: TestClient, db_session: Session):
    headers = _create_hod_headers(db_session)

    # 1. Default config starts at 60 min
    res_default = client.get("/timetable/config?branch=Computer%20Science")
    assert res_default.status_code == 200
    assert res_default.json()["default_lecture_minutes"] == 60

    # 2. Update default duration to 50 min and lab to 100 min
    res_put = client.put(
        "/timetable/config",
        json={
            "branch": "Computer Science",
            "default_lecture_minutes": 50,
            "default_lab_minutes": 100,
            "default_tutorial_minutes": 45,
            "day_start_time": "09:00 AM",
            "break_minutes": 5,
            "apply_to_existing_slots": False,
        },
        headers=headers,
    )
    assert res_put.status_code == 200, res_put.text
    assert res_put.json()["default_lecture_minutes"] == 50

    res_get = client.get("/timetable/config?branch=Computer%20Science")
    assert res_get.status_code == 200
    assert res_get.json()["default_lecture_minutes"] == 50
    assert res_get.json()["default_lab_minutes"] == 100

    # 3. Create two lecture slots on Monday using 50 min & custom 40 min (auto end_time)
    s1 = client.post(
        "/timetable/slot",
        json={
            "branch": "Computer Science",
            "semester": 3,
            "section": "A",
            "day_of_week": "Monday",
            "slot_index": 1,
            "start_time": "09:00 AM",
            "duration_minutes": 50,
            "custom_subject_name": "Operating Systems",
            "custom_teacher_name": "Prof. A",
            "room_number": "LH-101",
            "session_type": "lecture",
        },
        headers=headers,
    )
    assert s1.status_code == 200, s1.text
    assert s1.json()["duration_minutes"] == 50
    assert s1.json()["end_time"] == "09:50 AM"

    s2 = client.post(
        "/timetable/slot",
        json={
            "branch": "Computer Science",
            "semester": 3,
            "section": "A",
            "day_of_week": "Monday",
            "slot_index": 2,
            "start_time": "09:55 AM",
            "end_time": "10:45 AM",
            "custom_subject_name": "Computer Networks",
            "custom_teacher_name": "Prof. B",
            "room_number": "LH-102",
            "session_type": "lecture",
        },
        headers=headers,
    )
    assert s2.status_code == 200, s2.text
    assert s2.json()["duration_minutes"] == 50

    # 4. Switch to 40-minute lectures + 5 min break and resequence existing slots
    res_reseq = client.put(
        "/timetable/config",
        json={
            "branch": "Computer Science",
            "default_lecture_minutes": 40,
            "default_lab_minutes": 80,
            "default_tutorial_minutes": 40,
            "day_start_time": "09:00 AM",
            "break_minutes": 5,
            "apply_to_existing_slots": True,
            "resequence_times": True,
            "semester": 3,
            "section": "A",
        },
        headers=headers,
    )
    assert res_reseq.status_code == 200, res_reseq.text
    assert res_reseq.json()["updated_slots"] == 2

    weekly = client.get("/timetable/weekly?branch=Computer%20Science&semester=3&section=A")
    assert weekly.status_code == 200
    monday = weekly.json()["schedule"]["Monday"]
    assert len(monday) == 2
    assert monday[0]["start_time"] == "09:00 AM"
    assert monday[0]["end_time"] == "09:40 AM"
    assert monday[0]["duration_minutes"] == 40
    assert monday[1]["start_time"] == "09:45 AM"
    assert monday[1]["end_time"] == "10:25 AM"
    assert monday[1]["duration_minutes"] == 40


def test_bulk_csv_computes_duration_from_times(client: TestClient, db_session: Session):
    headers = _create_hod_headers(db_session, email="csv.hod@test.edu", branch="IT")
    csv_body = (
        "day_of_week,slot_index,start_time,end_time,subject_name,teacher_name,room_number,session_type\n"
        "Tuesday,1,09:00 AM,09:50 AM,DBMS,Prof. Rao,LH-201,lecture\n"
        "Tuesday,2,10:00 AM,10:40 AM,Algorithms,Prof. Sen,LH-202,lecture\n"
    ).encode("utf-8")

    res = client.post(
        "/timetable/bulk-csv",
        data={"branch": "IT", "semester": "4", "section": "B"},
        files={"file": ("tt.csv", csv_body, "text/csv")},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["imported_count"] == 2

    weekly = client.get("/timetable/weekly?branch=IT&semester=4&section=B")
    tuesday = weekly.json()["schedule"]["Tuesday"]
    assert len(tuesday) == 2
    assert tuesday[0]["duration_minutes"] == 50
    assert tuesday[1]["duration_minutes"] == 40
