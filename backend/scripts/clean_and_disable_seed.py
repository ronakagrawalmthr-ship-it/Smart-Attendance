import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import database
import models

db = next(database.get_db())

dummy_emails = [
    "admin@college.edu",
    "hod.cse@college.edu",
    "faculty@college.edu",
    "aarav.sharma@college.edu"
]

dummy_users = db.query(models.User).filter(models.User.email.in_(dummy_emails)).all()
dummy_user_ids = [u.id for u in dummy_users]
print(f"Found dummy user IDs: {dummy_user_ids}")

# 1. Wipe attendance logs
deleted_logs = db.query(models.AttendanceLog).delete()

# 2. Wipe academic sessions
deleted_sessions = db.query(models.AcademicSession).delete()

# 3. Wipe timetable slots FIRST (they reference teacher_profiles and subjects)
deleted_tt = db.query(models.TimetableSlot).delete()

# 4. Wipe subjects
deleted_subj = db.query(models.Subject).delete()

# 5. Delete dummy student profiles
deleted_sp = db.query(models.StudentProfile).filter(
    (models.StudentProfile.user_id.in_(dummy_user_ids)) | 
    (models.StudentProfile.roll_number == "CS2023001")
).delete(synchronize_session=False)

# 6. Delete dummy teacher profiles
deleted_tp = db.query(models.TeacherProfile).filter(
    models.TeacherProfile.user_id.in_(dummy_user_ids)
).delete(synchronize_session=False)

# 7. Delete dummy users
deleted_users = db.query(models.User).filter(models.User.id.in_(dummy_user_ids)).delete(synchronize_session=False)

db.commit()

print(f"\n[CLEANUP SUCCESSFUL]:")
print(f"  - Deleted {deleted_logs} Attendance Logs")
print(f"  - Deleted {deleted_sessions} Academic Sessions")
print(f"  - Deleted {deleted_tt} Timetable Slots")
print(f"  - Deleted {deleted_subj} Subjects")
print(f"  - Deleted {deleted_sp} Dummy Student Profiles")
print(f"  - Deleted {deleted_tp} Dummy Teacher Profiles")
print(f"  - Deleted {deleted_users} Dummy User Accounts")

remaining_users = db.query(models.User).all()
print("\n[ACTIVE USERS REMAINING IN SUPABASE DB]:")
for u in remaining_users:
    print(f"  - ID {u.id}: {u.email} | Role: {u.role}")

remaining_students = db.query(models.StudentProfile).all()
print("\n[ACTIVE STUDENTS REMAINING]:")
for s in remaining_students:
    print(f"  - ID {s.id}: {s.full_name} ({s.roll_number})")

remaining_teachers = db.query(models.TeacherProfile).all()
print("\n[ACTIVE TEACHERS REMAINING]:")
for t in remaining_teachers:
    print(f"  - ID {t.id}: {t.full_name}")

db.close()
